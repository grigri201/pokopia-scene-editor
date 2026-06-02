import {
  recoverSceneDocumentWithDroppedTileInstances,
  serializeSceneDocument,
  type SceneStringDroppedTileInstance,
  type SceneDocument,
  type SceneDocumentV1,
  type SceneDocumentValidationError,
} from '@pokopia-scene-editor/scene-core';

export type SceneStorageSlot = 'saved' | 'autosave';

export const savedSceneStorageKey = 'pokopia.sceneDocument.v1';
export const autosavedSceneStorageKey = 'pokopia.sceneDocument.autosave.v1';

export interface StoredSceneDocument {
  ok: true;
  slot: SceneStorageSlot;
  scene: SceneDocument;
  payload: SceneDocumentV1;
  droppedTileInstances: readonly SceneStringDroppedTileInstance[];
}

export interface StoredSceneDocumentFailure {
  ok: false;
  slot: SceneStorageSlot;
  errors: SceneDocumentValidationError[];
}

export type StoredSceneDocumentResult = StoredSceneDocument | StoredSceneDocumentFailure;

export function writeSceneDocumentToStorage(
  storage: Storage,
  scene: SceneDocument,
  slot: SceneStorageSlot,
): SceneDocumentV1 {
  const payload = serializeSceneDocument(scene);
  storage.setItem(getSceneStorageKey(slot), JSON.stringify(payload));

  return payload;
}

export function writeSceneDocumentToAllStorageSlots(
  storage: Storage,
  scene: SceneDocument,
): SceneDocumentV1 {
  const payload = serializeSceneDocument(scene);
  const serializedPayload = JSON.stringify(payload);

  storage.setItem(savedSceneStorageKey, serializedPayload);
  storage.setItem(autosavedSceneStorageKey, serializedPayload);

  return payload;
}

export function readSceneDocumentFromStorage(
  storage: Storage,
  slot: SceneStorageSlot,
): StoredSceneDocumentResult | null {
  const rawPayload = storage.getItem(getSceneStorageKey(slot));

  if (rawPayload === null) {
    return null;
  }

  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    return {
      ok: false,
      slot,
      errors: [
        {
          fieldPath: '$',
          expected: 'SceneDocument v1 JSON',
          actual: rawPayload.slice(0, 200),
          reason: 'Saved scene data is not valid JSON.',
          recoveryAction: 'Retry with valid SceneDocument v1 JSON.',
        },
      ],
    };
  }

  const recovered = recoverSceneDocumentWithDroppedTileInstances(parsedPayload);

  if (!recovered.ok) {
    return { ok: false, slot, errors: recovered.errors };
  }

  return {
    ok: true,
    slot,
    scene: recovered.scene,
    payload: recovered.payload,
    droppedTileInstances: recovered.droppedTileInstances,
  };
}

export function readLatestSceneDocumentFromStorage(storage: Storage): StoredSceneDocumentResult | null {
  const autosave = readSceneDocumentFromStorage(storage, 'autosave');
  if (autosave && !autosave.ok) {
    return autosave;
  }

  const saved = readSceneDocumentFromStorage(storage, 'saved');
  if (!autosave) {
    return saved;
  }

  if (!saved) {
    return autosave;
  }

  if (!saved.ok) {
    return autosave;
  }

  return getUpdatedAtMs(saved.payload) > getUpdatedAtMs(autosave.payload) ? saved : autosave;
}

function getUpdatedAtMs(payload: SceneDocumentV1): number {
  return Date.parse(payload.metadata.updatedAt);
}

export function getSceneStorageKey(slot: SceneStorageSlot): string {
  return slot === 'saved' ? savedSceneStorageKey : autosavedSceneStorageKey;
}
