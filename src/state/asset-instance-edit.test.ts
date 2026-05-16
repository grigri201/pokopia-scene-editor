import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { editAssetInstance } from './asset-instance-edit';

const now = '2026-05-16T08:10:00.000Z';

describe('asset instance edit command', () => {
  it('deletes a selected instance and marks the scene dirty', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-delete',
        assetId: 'garden-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ]);
    const result = editAssetInstance(scene, {
      type: 'delete',
      instanceId: 'tile-delete',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected delete success.');
    }
    expect(result.scene.tileInstances).toEqual([]);
    expect(result.scene.workspaceState.saveStatus).toBe('dirty');
  });

  it('moves an instance while preserving its editable fields', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-move',
        assetId: 'roof-tile',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        rotationDegrees: 90,
        dyeColor: '#56ccf2',
        requiresSkill: true,
        skillType: 'soil',
        skillNote: 'needs height',
        note: 'keep me',
      }),
    ]);
    const result = editAssetInstance(scene, {
      type: 'move',
      instanceId: 'tile-move',
      coordinate: { x: 3, y: 2 },
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected move success.');
    }
    expect(result.scene.tileInstances[0]).toMatchObject({
      assetId: 'roof-tile',
      coordinate: { x: 3, y: 2 },
      buildingLevelId: 'level-0',
      rotationDegrees: 90,
      dyeColor: '#56ccf2',
      requiresSkill: true,
      skillType: 'soil',
      skillNote: 'needs height',
      note: 'keep me',
    });
    expect(result.scene.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 2 });
  });

  it('moves an instance across building layers while preserving editable fields', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-move-layer',
        assetId: 'roof-tile',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        rotationDegrees: 90,
        dyeColor: '#56ccf2',
        requiresSkill: true,
        skillType: 'soil',
        skillNote: 'needs height',
        note: 'keep me',
      }),
    ]);
    const result = editAssetInstance(scene, {
      type: 'move',
      instanceId: 'tile-move-layer',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-1',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected cross-layer move success.');
    }
    expect(result.scene.tileInstances[0]).toMatchObject({
      instanceId: 'tile-move-layer',
      assetId: 'roof-tile',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-1',
      rotationDegrees: 90,
      dyeColor: '#56ccf2',
      requiresSkill: true,
      skillType: 'soil',
      skillNote: 'needs height',
      note: 'keep me',
    });
    expect(result.scene.workspaceState.currentBuildingLevelId).toBe('level-1');
  });

  it('does not dirty the scene when moving an instance to its current layer and coordinate', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-no-op',
        assetId: 'roof-tile',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ]);
    const result = editAssetInstance(scene, {
      type: 'move',
      instanceId: 'tile-no-op',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-0',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected no-op move success.');
    }
    expect(result.scene).toBe(scene);
    expect(result.message).toBe('Move target unchanged');
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });

  it('blocks incompatible or conflicting moves without mutating the scene', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-floor',
        assetId: 'wooden-floor',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
      createTileInstance({
        instanceId: 'tile-blocker',
        assetId: 'wooden-floor',
        coordinate: { x: 3, y: 3 },
        buildingLevelId: 'level-0',
      }),
    ]);
    const incompatible = editAssetInstance(scene, {
      type: 'move',
      instanceId: 'tile-floor',
      coordinate: { x: 0, y: 1 },
      interactionMode: 'edit',
      now,
    });
    const conflict = editAssetInstance(scene, {
      type: 'move',
      instanceId: 'tile-floor',
      coordinate: { x: 3, y: 3 },
      interactionMode: 'edit',
      now,
    });

    expect(incompatible.ok).toBe(false);
    if (!incompatible.ok) {
      expect(incompatible.reason).toBe('area-incompatible');
    }
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.reason).toBe('target-conflict');
    }
    expect(scene.tileInstances[0].coordinate).toEqual({ x: 2, y: 2 });
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });

  it('uses target building layer rules for cross-layer move conflicts and locks', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-floor',
        assetId: 'wooden-floor',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
      createTileInstance({
        instanceId: 'tile-target-blocker',
        assetId: 'wooden-floor',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-1',
      }),
    ]);
    const lockedTargetScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-1' ? { ...level, locked: true } : level,
      ),
    };
    const conflict = editAssetInstance(scene, {
      type: 'move',
      instanceId: 'tile-floor',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-1',
      interactionMode: 'edit',
      now,
    });
    const lockedTarget = editAssetInstance(lockedTargetScene, {
      type: 'move',
      instanceId: 'tile-floor',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-1',
      interactionMode: 'edit',
      now,
    });

    expect(conflict.ok).toBe(false);
    if (!conflict.ok) {
      expect(conflict.reason).toBe('target-conflict');
    }
    expect(lockedTarget.ok).toBe(false);
    if (!lockedTarget.ok) {
      expect(lockedTarget.reason).toBe('locked-layer');
    }
    expect(scene.tileInstances[0]).toMatchObject({
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-0',
    });
  });

  it('returns a typed failure for invalid move coordinates', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-move',
        assetId: 'garden-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ]);
    const result = editAssetInstance(scene, {
      type: 'move',
      instanceId: 'tile-move',
      coordinate: { x: Number.NaN, y: 2 },
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('invalid-coordinate');
    }
    expect(scene.tileInstances[0].coordinate).toEqual({ x: 2, y: 2 });
  });

  it('updates rotation, dye color, and note through instance-scoped commands', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-edit',
        assetId: 'roof-tile',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ]);
    const rotated = editAssetInstance(scene, {
      type: 'rotate',
      instanceId: 'tile-edit',
      rotationDegrees: 90,
      interactionMode: 'edit',
      now,
    });
    expect(rotated.ok).toBe(true);
    if (!rotated.ok) {
      throw new Error('Expected rotation success.');
    }

    const dyed = editAssetInstance(rotated.scene, {
      type: 'dye',
      instanceId: 'tile-edit',
      dyeColor: '#bb6bd9',
      interactionMode: 'edit',
      now,
    });
    expect(dyed.ok).toBe(true);
    if (!dyed.ok) {
      throw new Error('Expected dye success.');
    }

    const noted = editAssetInstance(dyed.scene, {
      type: 'note',
      instanceId: 'tile-edit',
      note: '<script>alert(1)</script><img onerror=alert(1)>',
      interactionMode: 'edit',
      now,
    });
    expect(noted.ok).toBe(true);
    if (!noted.ok) {
      throw new Error('Expected note success.');
    }
    expect(noted.scene.tileInstances[0]).toMatchObject({
      rotationDegrees: 90,
      dyeColor: '#bb6bd9',
      note: '<script>alert(1)</script><img onerror=alert(1)>',
    });
  });

  it('blocks read-only, locked-layer, and unsupported asset edits without mutating scene', () => {
    const scene = createSceneWithInstances([
      createTileInstance({
        instanceId: 'tile-static',
        assetId: 'garden-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ]);
    const lockedScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? { ...level, locked: true } : level,
      ),
    };

    const readOnly = editAssetInstance(scene, {
      type: 'delete',
      instanceId: 'tile-static',
      interactionMode: 'readOnly',
      now,
    });
    const locked = editAssetInstance(lockedScene, {
      type: 'note',
      instanceId: 'tile-static',
      note: 'blocked',
      interactionMode: 'edit',
      now,
    });
    const notRotatable = editAssetInstance(scene, {
      type: 'rotate',
      instanceId: 'tile-static',
      rotationDegrees: 90,
      interactionMode: 'edit',
      now,
    });
    const notDyeable = editAssetInstance(scene, {
      type: 'dye',
      instanceId: 'tile-static',
      dyeColor: '#56ccf2',
      interactionMode: 'edit',
      now,
    });

    expect(readOnly.ok).toBe(false);
    expect(locked.ok).toBe(false);
    expect(notRotatable.ok).toBe(false);
    expect(notDyeable.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    if (!locked.ok) {
      expect(locked.reason).toBe('locked-layer');
    }
    if (!notRotatable.ok) {
      expect(notRotatable.reason).toBe('not-rotatable');
    }
    if (!notDyeable.ok) {
      expect(notDyeable.reason).toBe('not-dyeable');
    }
    expect(scene.tileInstances[0].note).toBe('');
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });
});

function createSceneWithInstances(tileInstances: ReturnType<typeof createTileInstance>[]) {
  return {
    ...createDefaultSceneDocument({ sceneId: 'scene-test', now: '2026-05-16T07:00:00.000Z' }),
    tileInstances,
  };
}
