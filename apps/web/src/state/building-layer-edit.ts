import {
  createBuildingLevel,
  resequenceBuildingLevels,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import type { InteractionMode } from './interaction-mode';

export type BuildingLayerEditFailureReason =
  | 'read-only'
  | 'missing-layer'
  | 'missing-note'
  | 'invalid-name'
  | 'invalid-note'
  | 'last-layer'
  | 'delete-confirmation-required';

export type BuildingLayerEditResult =
  | {
      ok: true;
      scene: SceneDocument;
      message: string;
    }
  | {
      ok: false;
      reason: BuildingLayerEditFailureReason;
      message: string;
      repairHint: string;
    };

export type BuildingLayerEditInput =
  | { type: 'create'; name?: string; interactionMode: InteractionMode; now: string }
  | { type: 'copy'; levelId: string; instanceIdPrefix: string; interactionMode: InteractionMode; now: string }
  | { type: 'delete'; levelId: string; confirmDelete?: boolean; interactionMode: InteractionMode; now: string }
  | { type: 'add-note'; levelId: string; noteId: string; text: string; interactionMode: InteractionMode; now: string }
  | { type: 'update-note'; levelId: string; noteId: string; text: string; interactionMode: InteractionMode; now: string }
  | { type: 'delete-note'; levelId: string; noteId: string; interactionMode: InteractionMode; now: string }
  | { type: 'rename'; levelId: string; name: string; interactionMode: InteractionMode; now: string }
  | { type: 'set-current'; levelId: string; interactionMode: InteractionMode; now: string };

export function editBuildingLayer(
  scene: SceneDocument,
  input: BuildingLayerEditInput,
): BuildingLayerEditResult {
  if (input.interactionMode === 'readOnly') {
    return failure('read-only', 'Read-only mode', 'Use desktop edit mode to change building layers.');
  }

  switch (input.type) {
    case 'create':
      return createLayer(scene, input.now, input.name);
    case 'copy':
      return copyLayer(scene, input.levelId, input.instanceIdPrefix, input.now);
    case 'delete':
      return deleteLayer(scene, input.levelId, Boolean(input.confirmDelete), input.now);
    case 'add-note':
      return addLayerNote(scene, input.levelId, input.noteId, input.text, input.now);
    case 'update-note':
      return updateLayerNote(scene, input.levelId, input.noteId, input.text, input.now);
    case 'delete-note':
      return deleteLayerNote(scene, input.levelId, input.noteId, input.now);
    case 'rename':
      return renameLayer(scene, input.levelId, input.name, input.now);
    case 'set-current':
      if (scene.workspaceState.currentBuildingLevelId === input.levelId) {
        return layerExists(scene, input.levelId)
          ? { ok: true, scene, message: 'Current layer unchanged' }
          : failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
      }
      return updateLayer(scene, input.levelId, input.now, 'Current layer changed', (level) => level, {
        currentBuildingLevelId: input.levelId,
      });
  }
}

function createLayer(scene: SceneDocument, now: string, name?: string): BuildingLayerEditResult {
  const buildingLevels = resequenceBuildingLevels(scene.buildingLevels);
  const nextLevel = createUniqueBuildingLevel(buildingLevels, buildingLevels.length, name);

  return markLayerSceneDirty(
    {
      ...scene,
      buildingLevels: [...buildingLevels, nextLevel],
      workspaceState: {
        ...scene.workspaceState,
        currentBuildingLevelId: nextLevel.id,
      },
    },
    now,
    `Created ${nextLevel.name}`,
  );
}

function copyLayer(
  scene: SceneDocument,
  levelId: string,
  instanceIdPrefix: string,
  now: string,
): BuildingLayerEditResult {
  const buildingLevels = resequenceBuildingLevels(scene.buildingLevels);
  const sourceLayer = buildingLevels.find((level) => level.id === levelId);
  if (!sourceLayer) {
    return failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
  }

  const baseNextLevel = createUniqueBuildingLevel(buildingLevels, buildingLevels.length);
  const nextLevel = {
    ...baseNextLevel,
    name: `${sourceLayer.name} copy`,
    notes: sourceLayer.notes.map((note, index) => ({
      id: createCopiedNoteId(baseNextLevel.id, index + 1),
      text: note.text,
    })),
  };
  const copiedInstances = scene.tileInstances
    .filter((instance) => instance.buildingLevelId === sourceLayer.id)
    .map((instance, index) => ({
      ...instance,
      instanceId: createUniqueCopiedInstanceId(instanceIdPrefix, index + 1, scene.tileInstances),
      buildingLevelId: nextLevel.id,
    }));

  return markLayerSceneDirty(
    {
      ...scene,
      buildingLevels: [...buildingLevels, nextLevel],
      tileInstances: [...scene.tileInstances, ...copiedInstances],
      workspaceState: {
        ...scene.workspaceState,
        currentBuildingLevelId: nextLevel.id,
      },
    },
    now,
    `Copied ${sourceLayer.name}`,
  );
}

function deleteLayer(
  scene: SceneDocument,
  levelId: string,
  confirmDelete: boolean,
  now: string,
): BuildingLayerEditResult {
  const targetLayer = scene.buildingLevels.find((level) => level.id === levelId);
  if (!targetLayer) {
    return failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
  }

  if (scene.buildingLevels.length <= 1) {
    return failure('last-layer', 'Cannot delete the last building layer', 'Create another building layer before deleting this one.');
  }

  const remainingLevels = scene.buildingLevels.filter((level) => level.id !== levelId);
  const buildingLevels = resequenceBuildingLevels(remainingLevels);
  const affectedInstances = scene.tileInstances.filter((instance) => instance.buildingLevelId === levelId);
  const affectedNotes = targetLayer.notes.length;
  if (!confirmDelete) {
    return failure(
      'delete-confirmation-required',
      `Delete ${targetLayer.name} with ${affectedInstances.length} item${affectedInstances.length === 1 ? '' : 's'} and ${affectedNotes} note${affectedNotes === 1 ? '' : 's'}`,
      'Confirm deletion to remove this layer, its instances, and its notes.',
    );
  }

  const nextCurrentLevelId =
    scene.workspaceState.currentBuildingLevelId === levelId
      ? getFallbackLevelId(buildingLevels)
      : scene.workspaceState.currentBuildingLevelId;

  return markLayerSceneDirty(
    {
      ...scene,
      buildingLevels,
      tileInstances: scene.tileInstances.filter((instance) => instance.buildingLevelId !== levelId),
      workspaceState: {
        ...scene.workspaceState,
        currentBuildingLevelId: nextCurrentLevelId,
      },
    },
    now,
    `Deleted ${targetLayer.name}`,
  );
}

function addLayerNote(
  scene: SceneDocument,
  levelId: string,
  noteId: string,
  text: string,
  now: string,
): BuildingLayerEditResult {
  if (!text.trim()) {
    return failure('invalid-note', 'Layer note is required', 'Enter a non-empty layer note.');
  }

  const stableNoteId = noteId.trim();
  if (!stableNoteId) {
    return failure('invalid-note', 'Layer note id is required', 'Create a stable note id before saving the note.');
  }

  const layer = scene.buildingLevels.find((currentLevel) => currentLevel.id === levelId);
  if (!layer) {
    return failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
  }

  if (layer.notes.some((note) => note.id === stableNoteId)) {
    return failure('invalid-note', 'Layer note id already exists', 'Create a unique note id before saving the note.');
  }

  return updateLayer(scene, levelId, now, 'Layer note added', (level) => ({
    ...level,
    notes: [...level.notes, { id: stableNoteId, text }],
  }));
}

function updateLayerNote(
  scene: SceneDocument,
  levelId: string,
  noteId: string,
  text: string,
  now: string,
): BuildingLayerEditResult {
  if (!text.trim()) {
    return failure('invalid-note', 'Layer note is required', 'Enter a non-empty layer note.');
  }

  const stableNoteId = noteId.trim();
  const layer = scene.buildingLevels.find((level) => level.id === levelId);
  if (!layer) {
    return failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
  }

  if (!layer.notes.some((note) => note.id === stableNoteId)) {
    return failure('missing-note', 'Unknown layer note', 'Choose an existing layer note.');
  }

  return updateLayer(scene, levelId, now, 'Layer note updated', (currentLayer) => ({
    ...currentLayer,
    notes: currentLayer.notes.map((note) => (note.id === stableNoteId ? { ...note, text } : note)),
  }));
}

function deleteLayerNote(
  scene: SceneDocument,
  levelId: string,
  noteId: string,
  now: string,
): BuildingLayerEditResult {
  const stableNoteId = noteId.trim();
  const layer = scene.buildingLevels.find((level) => level.id === levelId);
  if (!layer) {
    return failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
  }

  if (!layer.notes.some((note) => note.id === stableNoteId)) {
    return failure('missing-note', 'Unknown layer note', 'Choose an existing layer note.');
  }

  return updateLayer(scene, levelId, now, 'Layer note deleted', (currentLayer) => ({
    ...currentLayer,
    notes: currentLayer.notes.filter((note) => note.id !== stableNoteId),
  }));
}

function renameLayer(scene: SceneDocument, levelId: string, name: string, now: string): BuildingLayerEditResult {
  const nextName = name.trim();
  if (!nextName) {
    return failure('invalid-name', 'Layer name is required', 'Enter a non-empty building layer name.');
  }

  const currentLayer = scene.buildingLevels.find((level) => level.id === levelId);
  if (currentLayer?.name === nextName) {
    return { ok: true, scene, message: 'Layer name unchanged' };
  }

  return updateLayer(scene, levelId, now, 'Layer renamed', (level) => ({ ...level, name: nextName }));
}

function updateLayer(
  scene: SceneDocument,
  levelId: string,
  now: string,
  message: string,
  update: (level: SceneDocument['buildingLevels'][number]) => SceneDocument['buildingLevels'][number],
  workspaceOverride?: Partial<SceneDocument['workspaceState']>,
): BuildingLayerEditResult {
  if (!layerExists(scene, levelId)) {
    return failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
  }

  return markLayerSceneDirty(
    {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) => (level.id === levelId ? update(level) : level)),
      workspaceState: {
        ...scene.workspaceState,
        ...workspaceOverride,
      },
    },
    now,
    message,
  );
}

function layerExists(scene: SceneDocument, levelId: string): boolean {
  return scene.buildingLevels.some((level) => level.id === levelId);
}

function createUniqueBuildingLevel(
  existingLevels: SceneDocument['buildingLevels'],
  levelNumber: number,
  name?: string,
): SceneDocument['buildingLevels'][number] {
  return {
    ...createBuildingLevel(levelNumber),
    id: createUniqueBuildingLevelId(existingLevels),
    ...(name ? { name } : {}),
  };
}

function createUniqueBuildingLevelId(existingLevels: SceneDocument['buildingLevels']): string {
  const existingIds = new Set(existingLevels.map((level) => level.id));
  let nextLevelIdNumber = getNextBuildingLevelIdNumber(existingLevels);

  while (existingIds.has(`level-${nextLevelIdNumber}`)) {
    nextLevelIdNumber += 1;
  }

  return `level-${nextLevelIdNumber}`;
}

function createCopiedNoteId(seed: string, copyIndex: number): string {
  return `${seed}-note-${copyIndex}`;
}

function getNextBuildingLevelIdNumber(existingLevels: SceneDocument['buildingLevels']): number {
  const levelIdNumbers = existingLevels
    .map((level) => /^level-(\d+)$/.exec(level.id)?.[1])
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value));

  if (levelIdNumbers.length === 0) {
    return existingLevels.length;
  }

  return Math.max(...levelIdNumbers) + 1;
}

function createUniqueCopiedInstanceId(
  instanceIdPrefix: string,
  copyIndex: number,
  existingInstances: SceneDocument['tileInstances'],
): string {
  const existingIds = new Set(existingInstances.map((instance) => instance.instanceId));
  const baseId = `${instanceIdPrefix}-${copyIndex}`;
  let nextId = baseId;
  let suffix = 2;

  while (existingIds.has(nextId)) {
    nextId = `${baseId}-${suffix}`;
    suffix += 1;
  }

  existingIds.add(nextId);
  return nextId;
}

function getFallbackLevelId(levels: SceneDocument['buildingLevels']): string {
  const sortedLevels = [...levels].sort((left, right) => right.levelNumber - left.levelNumber);
  return (
    sortedLevels[0]
  ).id;
}

function markLayerSceneDirty(scene: SceneDocument, now: string, message: string): BuildingLayerEditResult {
  return {
    ok: true,
    message,
    scene: {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
      },
      metadata: {
        ...scene.metadata,
        updatedAt: now,
      },
    },
  };
}

function failure(
  reason: BuildingLayerEditFailureReason,
  message: string,
  repairHint: string,
): Extract<BuildingLayerEditResult, { ok: false }> {
  return {
    ok: false,
    reason,
    message,
    repairHint,
  };
}
