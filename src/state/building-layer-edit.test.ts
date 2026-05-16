import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { editBuildingLayer } from './building-layer-edit';

const now = '2026-05-16T08:25:00.000Z';

describe('building layer edit command', () => {
  it('creates a new current building layer with the next level number', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const result = editBuildingLayer(scene, { type: 'create', interactionMode: 'edit', now });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected create success.');
    }
    expect(result.scene.buildingLevels.at(-1)).toMatchObject({
      id: 'level-3',
      levelNumber: 3,
      name: '3 层',
      visible: true,
      locked: false,
    });
    expect(result.scene.workspaceState.currentBuildingLevelId).toBe('level-3');
    expect(result.scene.workspaceState.saveStatus).toBe('dirty');
  });

  it('renames, switches current layer, toggles visibility, and toggles lock state', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const renamed = editBuildingLayer(scene, {
      type: 'rename',
      levelId: 'level-1',
      name: '屋顶层',
      interactionMode: 'edit',
      now,
    });
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      throw new Error('Expected rename success.');
    }

    const current = editBuildingLayer(renamed.scene, {
      type: 'set-current',
      levelId: 'level-1',
      interactionMode: 'edit',
      now,
    });
    expect(current.ok).toBe(true);
    if (!current.ok) {
      throw new Error('Expected current switch success.');
    }

    const hidden = editBuildingLayer(current.scene, {
      type: 'set-visible',
      levelId: 'level-1',
      visible: false,
      interactionMode: 'edit',
      now,
    });
    expect(hidden.ok).toBe(true);
    if (!hidden.ok) {
      throw new Error('Expected hide success.');
    }

    const locked = editBuildingLayer(hidden.scene, {
      type: 'set-locked',
      levelId: 'level-1',
      locked: true,
      interactionMode: 'edit',
      now,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) {
      throw new Error('Expected lock success.');
    }

    expect(locked.scene.buildingLevels.find((level) => level.id === 'level-1')).toMatchObject({
      name: '屋顶层',
      visible: false,
      locked: true,
    });
    expect(locked.scene.workspaceState.currentBuildingLevelId).toBe('level-1');
  });

  it('blocks read-only writes, missing layers, invalid names, and hiding the last visible layer', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const readOnly = editBuildingLayer(scene, { type: 'create', interactionMode: 'readOnly', now });
    const readOnlyCopy = editBuildingLayer(scene, {
      type: 'copy',
      levelId: 'level-0',
      instanceIdPrefix: 'copy-read-only',
      interactionMode: 'readOnly',
      now,
    });
    const readOnlyDelete = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-0',
      interactionMode: 'readOnly',
      now,
    });
    const missing = editBuildingLayer(scene, {
      type: 'set-current',
      levelId: 'missing-level',
      interactionMode: 'edit',
      now,
    });
    const invalidName = editBuildingLayer(scene, {
      type: 'rename',
      levelId: 'level-0',
      name: '   ',
      interactionMode: 'edit',
      now,
    });
    const oneVisibleScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? level : { ...level, visible: false },
      ),
    };
    const lastVisible = editBuildingLayer(oneVisibleScene, {
      type: 'set-visible',
      levelId: 'level-0',
      visible: false,
      interactionMode: 'edit',
      now,
    });

    expect(readOnly.ok).toBe(false);
    expect(readOnlyCopy.ok).toBe(false);
    expect(readOnlyDelete.ok).toBe(false);
    expect(missing.ok).toBe(false);
    expect(invalidName.ok).toBe(false);
    expect(lastVisible.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    if (!readOnlyCopy.ok) {
      expect(readOnlyCopy.reason).toBe('read-only');
    }
    if (!readOnlyDelete.ok) {
      expect(readOnlyDelete.reason).toBe('read-only');
    }
    if (!missing.ok) {
      expect(missing.reason).toBe('missing-layer');
    }
    if (!invalidName.ok) {
      expect(invalidName.reason).toBe('invalid-name');
    }
    if (!lastVisible.ok) {
      expect(lastVisible.reason).toBe('last-visible-layer');
    }
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });

  it('does not mark no-op layer commands dirty', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const sameCurrent = editBuildingLayer(scene, {
      type: 'set-current',
      levelId: 'level-0',
      interactionMode: 'edit',
      now,
    });
    const sameVisible = editBuildingLayer(scene, {
      type: 'set-visible',
      levelId: 'level-0',
      visible: true,
      interactionMode: 'edit',
      now,
    });
    const sameLocked = editBuildingLayer(scene, {
      type: 'set-locked',
      levelId: 'level-0',
      locked: false,
      interactionMode: 'edit',
      now,
    });

    expect(sameCurrent.ok && sameCurrent.scene).toBe(scene);
    expect(sameVisible.ok && sameVisible.scene).toBe(scene);
    expect(sameLocked.ok && sameLocked.scene).toBe(scene);
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });

  it('copies a building layer with preserved instance fields and new ids', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'roof-tile',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
          rotationDegrees: 90,
          dyeColor: '#bb6bd9',
          requiresSkill: true,
          skillType: 'soil',
          skillNote: 'height',
          note: 'copy me',
        }),
      ],
    };
    const result = editBuildingLayer(scene, {
      type: 'copy',
      levelId: 'level-1',
      instanceIdPrefix: 'copy-level-1',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected copy success.');
    }
    expect(result.scene.buildingLevels.at(-1)).toMatchObject({
      id: 'level-3',
      levelNumber: 3,
      name: '1 层 copy',
      visible: true,
      locked: false,
    });
    expect(result.scene.workspaceState.currentBuildingLevelId).toBe('level-3');
    expect(result.scene.tileInstances).toHaveLength(2);
    expect(result.scene.tileInstances[1]).toMatchObject({
      instanceId: 'copy-level-1-1',
      assetId: 'roof-tile',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-3',
      rotationDegrees: 90,
      dyeColor: '#bb6bd9',
      requiresSkill: true,
      skillType: 'soil',
      skillNote: 'height',
      note: 'copy me',
    });
  });

  it('avoids copied instance id collisions with existing scene instances', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      tileInstances: [
        createTileInstance({
          instanceId: 'copy-level-1-1',
          assetId: 'wooden-floor',
          coordinate: { x: 1, y: 1 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'copy-level-1-1-2',
          assetId: 'wooden-floor',
          coordinate: { x: 1, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'roof-tile',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
    };
    const result = editBuildingLayer(scene, {
      type: 'copy',
      levelId: 'level-1',
      instanceIdPrefix: 'copy-level-1',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected copy success.');
    }
    expect(result.scene.tileInstances.at(-1)?.instanceId).toBe('copy-level-1-1-3');
    expect(new Set(result.scene.tileInstances.map((instance) => instance.instanceId)).size).toBe(
      result.scene.tileInstances.length,
    );
  });

  it('requires confirmation before deleting non-empty layers and deletes confirmed layers', () => {
    const baseScene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const scene = {
      ...baseScene,
      workspaceState: {
        ...baseScene.workspaceState,
        currentBuildingLevelId: 'level-1',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
    };
    const blocked = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-1',
      interactionMode: 'edit',
      now,
    });
    const deleted = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-1',
      confirmDelete: true,
      interactionMode: 'edit',
      now,
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('delete-confirmation-required');
    }
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      throw new Error('Expected delete success.');
    }
    expect(deleted.scene.buildingLevels.map((level) => level.id)).toEqual(['level-0', 'level-2']);
    expect(deleted.scene.tileInstances).toEqual([]);
    expect(deleted.scene.workspaceState.currentBuildingLevelId).toBe('level-2');
  });

  it('requires confirmation before deleting empty layers and blocks deleting the last remaining layer', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const blockedUntilConfirm = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-2',
      interactionMode: 'edit',
      now,
    });
    const deleted = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-2',
      confirmDelete: true,
      interactionMode: 'edit',
      now,
    });
    const oneLayerScene = {
      ...scene,
      buildingLevels: [scene.buildingLevels[0]],
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-0' },
    };
    const blocked = editBuildingLayer(oneLayerScene, {
      type: 'delete',
      levelId: 'level-0',
      interactionMode: 'edit',
      now,
    });

    expect(blockedUntilConfirm.ok).toBe(false);
    if (!blockedUntilConfirm.ok) {
      expect(blockedUntilConfirm.reason).toBe('delete-confirmation-required');
    }
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      throw new Error('Expected delete success.');
    }
    expect(deleted.scene.buildingLevels.map((level) => level.id)).toEqual(['level-0', 'level-1']);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('last-layer');
    }
  });

  it('blocks deleting locked layers and the last visible layer', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const lockedLayerScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-1' ? { ...level, locked: true } : level,
      ),
    };
    const oneVisibleScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? level : { ...level, visible: false },
      ),
    };
    const locked = editBuildingLayer(lockedLayerScene, {
      type: 'delete',
      levelId: 'level-1',
      confirmDelete: true,
      interactionMode: 'edit',
      now,
    });
    const lastVisible = editBuildingLayer(oneVisibleScene, {
      type: 'delete',
      levelId: 'level-0',
      confirmDelete: true,
      interactionMode: 'edit',
      now,
    });

    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.reason).toBe('locked-layer');
    }
    expect(lastVisible.ok).toBe(false);
    if (!lastVisible.ok) {
      expect(lastVisible.reason).toBe('last-visible-layer');
    }
    expect(lockedLayerScene.workspaceState.saveStatus).toBe('saved');
    expect(oneVisibleScene.workspaceState.saveStatus).toBe('saved');
  });
});
