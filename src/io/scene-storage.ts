import type { SceneDocument } from '../domain/scene';
import type { SceneDocumentV1, SceneDocumentValidationError } from './scene-schema';
import { recoverSceneDocument } from './scene-recovery';
import { serializeSceneDocument } from './scene-serializer';

export type SceneStorageSlot = 'saved' | 'autosave';

export const savedSceneStorageKey = 'pokopia.sceneDocument.v1';
export const autosavedSceneStorageKey = 'pokopia.sceneDocument.autosave.v1';

export interface StoredSceneDocument {
  ok: true;
  slot: SceneStorageSlot;
  scene: SceneDocument;
  payload: SceneDocumentV1;
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

  const recovered = recoverSceneDocument(parsedPayload);

  if (!recovered.ok) {
    return { ok: false, slot, errors: recovered.errors };
  }

  return {
    ok: true,
    slot,
    scene: recovered.scene,
    payload: recovered.payload,
  };
}

export function readLatestSceneDocumentFromStorage(storage: Storage): StoredSceneDocumentResult | null {
  const results = [
    readSceneDocumentFromStorage(storage, 'autosave'),
    readSceneDocumentFromStorage(storage, 'saved'),
  ].filter((result): result is StoredSceneDocumentResult => result !== null);

  if (results.length === 0) {
    return null;
  }

  const validResults = results.filter((result): result is StoredSceneDocument => result.ok);
  if (validResults.length === 0) {
    return results[0];
  }

  return validResults.sort((left, right) => getUpdatedAtMs(right.payload) - getUpdatedAtMs(left.payload))[0];
}

export function getSceneStorageKey(slot: SceneStorageSlot): string {
  return slot === 'saved' ? savedSceneStorageKey : autosavedSceneStorageKey;
}

function getUpdatedAtMs(payload: SceneDocumentV1): number {
  return Date.parse(payload.metadata.updatedAt);
}
