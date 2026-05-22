import { describe, expect, it } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { editBuildingLayer } from './building-layer-edit';

const now = '2026-05-16T08:25:00.000Z';

describe('building layer edit command', () => {
  it('creates, renames, and switches current building layers', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const created = editBuildingLayer(scene, { type: 'create', interactionMode: 'edit', now });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error('Expected create success.');
    }
    expect(created.scene.buildingLevels.at(-1)).toEqual({
      id: 'level-1',
      levelNumber: 1,
      name: '1层',
    });
    expect(created.scene.workspaceState.currentBuildingLevelId).toBe('level-1');

    const renamed = editBuildingLayer(created.scene, {
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
    expect(renamed.scene.buildingLevels.at(-1)?.name).toBe('屋顶层');

    const current = editBuildingLayer(renamed.scene, {
      type: 'set-current',
      levelId: 'level-1',
      interactionMode: 'edit',
      now,
    });
    expect(current.ok).toBe(true);
    if (current.ok) {
      expect(current.scene.workspaceState.currentBuildingLevelId).toBe('level-1');
    }
  });

  it('blocks read-only writes, missing layers, and invalid names', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const readOnly = editBuildingLayer(scene, { type: 'create', interactionMode: 'readOnly', now });
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

    expect(readOnly.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.reason).toBe('missing-layer');
    }
    expect(invalidName.ok).toBe(false);
    if (!invalidName.ok) {
      expect(invalidName.reason).toBe('invalid-name');
    }
  });

  it('does not mark no-op current-layer commands dirty', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const sameCurrent = editBuildingLayer(scene, {
      type: 'set-current',
      levelId: 'level-0',
      interactionMode: 'edit',
      now,
    });

    expect(sameCurrent.ok && sameCurrent.scene).toBe(scene);
  });

  it('copies a building layer with preserved instance fields and new ids', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
          rotationDegrees: 90,
          dyeColor: '#bb6bd9',
          requiresSkill: true,
          skillType: '耕地',
          skillNote: 'height',
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
    expect(result.scene.buildingLevels.at(-1)).toEqual({
      id: 'level-3',
      levelNumber: 3,
      name: '1层 copy',
    });
    expect(result.scene.workspaceState.currentBuildingLevelId).toBe('level-3');
    expect(result.scene.tileInstances).toHaveLength(2);
    expect(result.scene.tileInstances[1]).toMatchObject({
      instanceId: 'copy-level-1-1',
      assetId: 'brick-roof-decoration',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-3',
      rotationDegrees: 90,
      dyeColor: '#bb6bd9',
      requiresSkill: true,
      skillType: '耕地',
      skillNote: 'height',
    });
  });

  it('avoids copied instance id collisions with existing scene instances', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      tileInstances: [
        createTileInstance({
          instanceId: 'copy-level-1-1',
          assetId: 'wooden-fencing',
          coordinate: { x: 1, y: 1 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'copy-level-1-1-2',
          assetId: 'wooden-fencing',
          coordinate: { x: 1, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'brick-roof-decoration',
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

  it('requires confirmation before deleting layers and blocks deleting the last layer', () => {
    const baseScene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const scene = {
      ...baseScene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      workspaceState: {
        ...baseScene.workspaceState,
        currentBuildingLevelId: 'level-1',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'leafy-plant',
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
    const oneLayerScene = {
      ...baseScene,
      buildingLevels: [baseScene.buildingLevels[0]],
      workspaceState: { ...baseScene.workspaceState, currentBuildingLevelId: 'level-0' },
    };
    const lastLayer = editBuildingLayer(oneLayerScene, {
      type: 'delete',
      levelId: 'level-0',
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
    expect(deleted.scene.buildingLevels.map((level) => level.levelNumber)).toEqual([0, 1]);
    expect(deleted.scene.buildingLevels.map((level) => level.name)).toEqual(['0层', '1层']);
    expect(deleted.scene.tileInstances).toEqual([]);
    expect(deleted.scene.workspaceState.currentBuildingLevelId).toBe('level-2');
    expect(lastLayer.ok).toBe(false);
    if (!lastLayer.ok) {
      expect(lastLayer.reason).toBe('last-layer');
    }
  });

  it('resequences level markers after deletion and creates the next visible marker without id collisions', () => {
    const baseScene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const scene = {
      ...baseScene,
      buildingLevels: [
        createBuildingLevel(0),
        createBuildingLevel(1),
        { ...createBuildingLevel(2), name: '屋顶层' },
      ],
      workspaceState: {
        ...baseScene.workspaceState,
        currentBuildingLevelId: 'level-2',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-roof',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-2',
        }),
      ],
    };
    const deleted = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-1',
      confirmDelete: true,
      interactionMode: 'edit',
      now,
    });

    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      throw new Error('Expected delete success.');
    }
    expect(deleted.scene.buildingLevels).toEqual([
      { id: 'level-0', levelNumber: 0, name: '0层' },
      { id: 'level-2', levelNumber: 1, name: '屋顶层' },
    ]);
    expect(deleted.scene.tileInstances[0]?.buildingLevelId).toBe('level-2');

    const created = editBuildingLayer(deleted.scene, {
      type: 'create',
      interactionMode: 'edit',
      now,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error('Expected create success.');
    }
    expect(created.scene.buildingLevels).toEqual([
      { id: 'level-0', levelNumber: 0, name: '0层' },
      { id: 'level-2', levelNumber: 1, name: '屋顶层' },
      { id: 'level-3', levelNumber: 2, name: '2层' },
    ]);
    expect(new Set(created.scene.buildingLevels.map((level) => level.id)).size).toBe(3);
    expect(created.scene.workspaceState.currentBuildingLevelId).toBe('level-3');
  });
});
