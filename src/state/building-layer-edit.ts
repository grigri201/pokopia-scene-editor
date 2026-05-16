import {
  createBuildingLevel,
  getNextBuildingLevelNumber,
  type SceneDocument,
} from '../domain/scene';
import type { InteractionMode } from './interaction-mode';

export type BuildingLayerEditFailureReason =
  | 'read-only'
  | 'missing-layer'
  | 'invalid-name'
  | 'last-visible-layer';

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
  | { type: 'create'; interactionMode: InteractionMode; now: string }
  | { type: 'rename'; levelId: string; name: string; interactionMode: InteractionMode; now: string }
  | { type: 'set-current'; levelId: string; interactionMode: InteractionMode; now: string }
  | { type: 'set-visible'; levelId: string; visible: boolean; interactionMode: InteractionMode; now: string }
  | { type: 'set-locked'; levelId: string; locked: boolean; interactionMode: InteractionMode; now: string };

export function editBuildingLayer(
  scene: SceneDocument,
  input: BuildingLayerEditInput,
): BuildingLayerEditResult {
  if (input.interactionMode === 'readOnly') {
    return failure('read-only', 'Read-only mode', 'Use desktop edit mode to change building layers.');
  }

  switch (input.type) {
    case 'create':
      return createLayer(scene, input.now);
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
    case 'set-visible':
      return setLayerVisible(scene, input.levelId, input.visible, input.now);
    case 'set-locked':
      return setLayerLocked(scene, input.levelId, input.locked, input.now);
  }
}

function setLayerLocked(
  scene: SceneDocument,
  levelId: string,
  locked: boolean,
  now: string,
): BuildingLayerEditResult {
  const targetLayer = scene.buildingLevels.find((level) => level.id === levelId);
  if (!targetLayer) {
    return failure('missing-layer', 'Unknown building layer', 'Choose an existing building layer.');
  }

  if (targetLayer.locked === locked) {
    return { ok: true, scene, message: locked ? 'Layer already locked' : 'Layer already unlocked' };
  }

  return updateLayer(scene, levelId, now, locked ? 'Layer locked' : 'Layer unlocked', (level) => ({
    ...level,
    locked,
  }));
}

function createLayer(scene: SceneDocument, now: string): BuildingLayerEditResult {
  const nextLevelNumber = getNextBuildingLevelNumber(scene.buildingLevels);
  const nextLevel = createBuildingLevel(nextLevelNumber);

  return markLayerSceneDirty(
    {
      ...scene,
      buildingLevels: [...scene.buildingLevels, nextLevel],
      workspaceState: {
        ...scene.workspaceState,
        currentBuildingLevelId: nextLevel.id,
      },
    },
    now,
    `Created ${nextLevel.name}`,
  );
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

function setLayerVisible(
  scene: SceneDocument,
  levelId: string,
  visible: boolean,
  now: string,
): BuildingLayerEditResult {
  if (!visible) {
    const visibleLayerCount = scene.buildingLevels.filter((level) => level.visible).length;
    const targetLayer = scene.buildingLevels.find((level) => level.id === levelId);
    if (targetLayer?.visible && visibleLayerCount <= 1) {
      return failure('last-visible-layer', 'Cannot hide the last visible layer', 'Show another layer before hiding this one.');
    }
  }

  const targetLayer = scene.buildingLevels.find((level) => level.id === levelId);
  if (targetLayer?.visible === visible) {
    return { ok: true, scene, message: visible ? 'Layer already shown' : 'Layer already hidden' };
  }

  return updateLayer(scene, levelId, now, visible ? 'Layer shown' : 'Layer hidden', (level) => ({
    ...level,
    visible,
  }));
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

function markLayerSceneDirty(scene: SceneDocument, now: string, message: string): BuildingLayerEditResult {
  return {
    ok: true,
    message,
    scene: {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
        saveStatus: 'dirty',
        saveError: null,
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
