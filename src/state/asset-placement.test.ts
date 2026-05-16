import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { selectAsset } from './scene-reducer';
import { getAssetPlacementPreview, placeSelectedAsset } from './asset-placement';

const now = '2026-05-16T08:00:00.000Z';

describe('asset placement command', () => {
  it('places the selected asset on the current building layer and marks the scene dirty', () => {
    const scene = selectAsset(
      createDefaultSceneDocument({ sceneId: 'scene-test', now: '2026-05-16T07:00:00.000Z' }),
      'garden-plant',
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
      assetId: 'garden-plant',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: 'leaf',
    });
    expect(result.scene.workspaceState.saveStatus).toBe('dirty');
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
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });

  it('blocks read-only placement at the command boundary', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'garden-plant', 'edit', now);
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

  it('blocks incompatible areas and locked layers without mutating scene state', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'wooden-floor', 'edit', now);
    const lockedScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? { ...level, locked: true } : level,
      ),
    };

    const incompatible = placeSelectedAsset(scene, {
      coordinate: { x: 0, y: 0 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-incompatible',
      requiresSkill: false,
    });
    const locked = placeSelectedAsset(lockedScene, {
      coordinate: { x: 2, y: 2 },
      interactionMode: 'edit',
      now,
      instanceId: 'tile-locked',
      requiresSkill: false,
    });

    expect(incompatible.ok).toBe(false);
    if (!incompatible.ok) {
      expect(incompatible.reason).toBe('area-incompatible');
    }
    expect(locked.ok).toBe(false);
    if (!locked.ok) {
      expect(locked.reason).toBe('locked-layer');
    }
    expect(scene.tileInstances).toEqual([]);
    expect(scene.workspaceState.saveStatus).toBe('dirty');
  });

  it('requires confirmation before replacing a non-stackable target', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'outer-wall', 'edit', now);
    const sceneWithTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'outer-wall',
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

  it('stacks compatible assets without replacement confirmation', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'roof-tile', 'edit', now);
    const sceneWithTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'garden-plant',
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

    expect(preview?.status).toBe('will-stack');
    expect(preview?.message).toBe('Will stack with 1 item');
    expect(preview?.overwriteLabel).toBe('1 stackable item at target');
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected stack placement success.');
    }
    expect(result.scene.tileInstances.map((instance) => instance.instanceId)).toEqual([
      'tile-existing',
      'tile-stacked',
    ]);
  });

  it('ignores skill requirements for assets that are not placement skill candidates', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'wooden-floor', 'edit', now);
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
      requiresSkill: false,
      skillType: null,
    });
  });

  it('describes hover placement context before the user places an asset', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-test', now }), 'garden-plant', 'edit', now);
    const preview = getAssetPlacementPreview(scene, { x: 2, y: 2 }, 'edit', true);

    expect(preview?.message).toBe('Ready to place');
    expect(preview?.skillLabel).toBe('Skill required: leaf');
    expect(preview?.overwriteLabel).toBe('No overwrite');
  });
});
