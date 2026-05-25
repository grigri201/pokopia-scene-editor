import { describe, expect, it } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance } from '@pokopia-scene-editor/scene-core';
import { selectAsset } from './scene-reducer';
import { getAssetPlacementPreview, placeSelectedAsset } from './asset-placement';

const now = '2026-05-16T08:00:00.000Z';

describe('asset placement command', () => {
  it('places the selected asset on the current building layer', () => {
    const scene = selectAsset(
      createDefaultSceneDocument({ sceneId: 'scene-test', now: '2026-05-16T07:00:00.000Z' }),
      'leafy-plant',
      'edit',
      now,
    );
    const result = placeSelectedAsset(scene, {
      coordinate: { x: 2, y: 2 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-placed',
      requiresSkill: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected placement success.');
    }
    expect(result.scene.tileInstances).toHaveLength(1);
    expect(result.scene.tileInstances[0]).toMatchObject({
      instanceId: 'tile-placed',
      assetId: 'leafy-plant',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: null,
    });
    expect(result.scene.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 2 });
  });

  it('returns typed failures without mutating the scene', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const result = placeSelectedAsset(scene, {
      coordinate: { x: 2, y: 2 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-failed',
      requiresSkill: false,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected placement failure.');
    }
    expect(result.reason).toBe('missing-asset');
    expect(result.preview.message).toBe('No current asset');
    expect(scene.tileInstances).toEqual([]);
  });

  it('blocks read-only placement at the command boundary', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'leafy-plant', 'edit', now);
    const result = placeSelectedAsset(scene, {
      coordinate: { x: 2, y: 2 },
      interactionMode: 'readOnly',
      now,
      instanceId: 'tile-readonly',
      requiresSkill: false,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('read-only');
    }
  });

  it('does not use applicable area metadata as placement permission', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'ditto-doll', 'edit', now);

    const result = placeSelectedAsset(scene, {
      coordinate: { x: 0, y: 0 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-outer-doll',
      requiresSkill: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected placement success.');
    }
    expect(result.scene.tileInstances[0]).toMatchObject({
      assetId: 'ditto-doll',
      areaType: 'outer',
    });
  });

  it('requires confirmation before replacing a non-stackable target', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'stepping-stones', 'edit', now);
    const sceneWithTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'stepping-stones',
          coordinate: { x: 0, y: 0 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const blocked = placeSelectedAsset(sceneWithTile, {
      coordinate: { x: 0, y: 0 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-replacement',
      requiresSkill: false,
    });
    const replaced = placeSelectedAsset(sceneWithTile, {
      coordinate: { x: 0, y: 0 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-replacement',
      requiresSkill: false,
      confirmReplace: true,
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('replace-confirmation-required');
    }
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) {
      throw new Error('Expected replacement success.');
    }
    expect(replaced.scene.tileInstances.map((instance) => instance.instanceId)).toEqual(['tile-replacement']);
  });

  it('allows the same coordinate to hold independent instances on different building layers', () => {
    const selectedScene = selectAsset(
      createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      'wooden-fencing',
      'edit',
      now,
    );
    const scene = {
      ...selectedScene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      workspaceState: { ...selectedScene.workspaceState, currentBuildingLevelId: 'level-1' },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-level-0',
          assetId: 'wooden-fencing',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const preview = getAssetPlacementPreview(scene, { x: 2, y: 2 }, 'edit', false);
    const result = placeSelectedAsset(scene, {
      coordinate: { x: 2, y: 2 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-level-1',
      requiresSkill: false,
    });

    expect(preview?.status).toBe('ready');
    expect(preview?.overwriteLabel).toBe('No overwrite');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected cross-layer placement success.');
    }
    expect(result.scene.tileInstances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: 'tile-level-0', buildingLevelId: 'level-0' }),
        expect.objectContaining({ instanceId: 'tile-level-1', buildingLevelId: 'level-1' }),
      ]),
    );
  });

  it('requires replacement confirmation instead of stacking compatible assets', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'brick-roof-decoration', 'edit', now);
    const sceneWithTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const preview = getAssetPlacementPreview(sceneWithTile, { x: 2, y: 2 }, 'edit', true);
    const result = placeSelectedAsset(sceneWithTile, {
      coordinate: { x: 2, y: 2 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-stacked',
      requiresSkill: true,
    });

    expect(preview?.status).toBe('will-replace');
    expect(preview?.message).toBe('Will replace 1 item');
    expect(preview?.overwriteLabel).toBe('Will replace 1 item');
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected replacement confirmation failure.');
    }
    expect(result.reason).toBe('replace-confirmation-required');
  });

  it('stores requested placement skill requirements as instance-only data', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'wooden-fencing', 'edit', now);
    const result = placeSelectedAsset(scene, {
      coordinate: { x: 2, y: 2 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-floor',
      requiresSkill: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected placement success.');
    }
    expect(result.scene.tileInstances[0]).toMatchObject({
      requiresSkill: true,
      skillType: null,
    });
  });

  it('describes hover placement context before the user places an asset', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'leafy-plant', 'edit', now);
    const preview = getAssetPlacementPreview(scene, { x: 2, y: 2 }, 'edit', true);

    expect(preview?.message).toBe('Ready to place');
    expect(preview?.skillLabel).toBe('Skill required');
    expect(preview?.overwriteLabel).toBe('No overwrite');
  });
});
