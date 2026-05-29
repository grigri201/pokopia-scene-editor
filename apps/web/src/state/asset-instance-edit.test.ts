import { describe, expect, it } from 'vitest';
import { assetCatalog } from '@pokopia-scene-editor/scene-core';
import { createDefaultSceneDocument, createTileInstance, type SceneDocument } from '@pokopia-scene-editor/scene-core';
import { editAssetInstance } from './asset-instance-edit';

const now = '2026-05-16T08:00:00.000Z';

describe('asset instance edit command', () => {
  it('deletes an existing instance without exposing note or move commands', () => {
    const scene = createScene();
    const result = editAssetInstance(scene, {
      type: 'delete',
      instanceId: 'tile-plant',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected delete success.');
    }
    expect(result.scene.tileInstances.map((instance) => instance.instanceId)).toEqual(['tile-floor']);
    expect(result.scene.metadata.updatedAt).toBe(now);
  });

  it('allows every known asset to rotate through the common 0/90/180/270 rule', () => {
    for (const asset of assetCatalog) {
      for (const rotationDegrees of [0, 90, 180, 270] as const) {
        const scene = {
          ...createScene(),
          tileInstances: [
            createTileInstance({
              instanceId: `tile-${asset.assetId}`,
              assetId: asset.assetId,
              coordinate: { x: 2, y: 2 },
              buildingLevelId: 'level-0',
            }),
          ],
        };
        const result = editAssetInstance(scene, {
          type: 'rotate',
          instanceId: `tile-${asset.assetId}`,
          rotationDegrees,
          interactionMode: 'edit',
          now,
        });

        expect(result.ok, `${asset.assetId} should rotate to ${rotationDegrees}`).toBe(true);
        if (result.ok) {
          expect(result.instance?.rotationDegrees).toBe(rotationDegrees);
          expect(
            result.scene.tileInstances.find((instance) => instance.instanceId === `tile-${asset.assetId}`)
              ?.rotationDegrees,
          ).toBe(rotationDegrees);
        }
      }
    }
  });

  it('rotates an already placed wide asset when the next footprint is valid', () => {
    const scene = {
      ...createScene(),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-bench',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const result = editAssetInstance(scene, {
      type: 'rotate',
      instanceId: 'tile-bench',
      rotationDegrees: 90,
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.instance).toMatchObject({
        instanceId: 'tile-bench',
        rotationDegrees: 90,
      });
      expect(result.scene.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 2 });
    }
  });

  it('blocks placed-asset rotation when the rotated footprint would conflict', () => {
    const outOfBoundsScene = {
      ...createScene(),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-edge-bench',
          assetId: 'wooden-bench',
          coordinate: { x: 16, y: 15 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const overlapScene = {
      ...createScene(),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-bench',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-plant',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const outOfBounds = editAssetInstance(outOfBoundsScene, {
      type: 'rotate',
      instanceId: 'tile-edge-bench',
      rotationDegrees: 90,
      interactionMode: 'edit',
      now,
    });
    const overlap = editAssetInstance(overlapScene, {
      type: 'rotate',
      instanceId: 'tile-bench',
      rotationDegrees: 90,
      interactionMode: 'edit',
      now,
    });

    expect(outOfBounds.ok).toBe(false);
    if (!outOfBounds.ok) {
      expect(outOfBounds.reason).toBe('footprint-conflict');
      expect(outOfBounds.message).toContain('footprint-out-of-bounds');
    }
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) {
      expect(overlap.reason).toBe('footprint-conflict');
      expect(overlap.message).toContain('same-level-footprint-overlap');
    }
  });

  it('changes instance assets without applying applicable-area or stackable behavior branches', () => {
    const scene = createScene();
    const result = editAssetInstance(scene, {
      type: 'asset',
      instanceId: 'tile-floor',
      assetId: 'ditto-doll',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected asset change success.');
    }
    expect(result.instance).toMatchObject({
      instanceId: 'tile-floor',
      assetId: 'ditto-doll',
      areaType: 'outer',
      rotationDegrees: 270,
      dyeColor: null,
      requiresSkill: false,
      skillType: null,
      skillNote: '',
    });
  });

  it('preserves dye and skill safety boundaries', () => {
    const scene = createScene();
    const dyed = editAssetInstance(scene, {
      type: 'dye',
      instanceId: 'tile-floor',
      dyeColor: '#123abc',
      interactionMode: 'edit',
      now,
    });
    const nonDyeable = editAssetInstance(scene, {
      type: 'dye',
      instanceId: 'tile-plant',
      dyeColor: '#123abc',
      interactionMode: 'edit',
      now,
    });
    const skill = editAssetInstance(scene, {
      type: 'skill',
      instanceId: 'tile-plant',
      requiresSkill: true,
      skillType: '储水',
      skillNote: '<b>plain text only</b>',
      interactionMode: 'edit',
      now,
    });

    expect(dyed.ok).toBe(true);
    if (dyed.ok) {
      expect(dyed.instance?.dyeColor).toBe('#123abc');
    }
    expect(nonDyeable.ok).toBe(false);
    if (!nonDyeable.ok) {
      expect(nonDyeable.reason).toBe('not-dyeable');
    }
    expect(skill.ok).toBe(true);
    if (skill.ok) {
      expect(skill.instance).toMatchObject({
        requiresSkill: true,
        skillType: '储水',
        skillNote: '<b>plain text only</b>',
      });
    }
  });

  it('blocks read-only edits and unknown assets without mutating the scene', () => {
    const scene = createScene();
    const readOnly = editAssetInstance(scene, {
      type: 'rotate',
      instanceId: 'tile-plant',
      rotationDegrees: 180,
      interactionMode: 'readOnly',
      now,
    });
    const unknownAsset = editAssetInstance(scene, {
      type: 'asset',
      instanceId: 'tile-plant',
      assetId: 'missing-asset',
      interactionMode: 'edit',
      now,
    });

    expect(readOnly.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    expect(unknownAsset.ok).toBe(false);
    if (!unknownAsset.ok) {
      expect(unknownAsset.reason).toBe('unknown-asset');
    }
    expect(scene.tileInstances.find((instance) => instance.instanceId === 'tile-plant')?.rotationDegrees).toBe(0);
  });
});

function createScene(): SceneDocument {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-instance-edit',
    now: '2026-05-16T07:00:00.000Z',
  });

  return {
    ...scene,
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-floor',
        assetId: 'stone-brick-wall',
        coordinate: { x: 0, y: 2 },
        buildingLevelId: 'level-0',
        rotationDegrees: 270,
        dyeColor: '#bb6bd9',
      }),
      createTileInstance({
        instanceId: 'tile-plant',
        assetId: 'leafy-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: 'leaf marker note',
      }),
    ],
    workspaceState: {
      ...scene.workspaceState,
      selectedCoordinate: { x: 2, y: 2 },
    },
  };
}
