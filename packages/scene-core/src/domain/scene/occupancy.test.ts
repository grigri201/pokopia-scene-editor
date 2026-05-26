import { describe, expect, it } from 'vitest';
import { createBuildingLevel } from './levels';
import { createDefaultSceneDocument } from './default-scene';
import { createTileInstance } from './tile-instance';
import {
  buildSceneOccupancy,
  evaluateScenePlacementFootprint,
} from './occupancy';
import { getAssetById } from '../assets';

const now = '2026-05-27T00:00:00.000Z';

describe('scene occupancy rules', () => {
  it('builds occupied cells and height-derived blocking cells without mutating scene payload', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-occupancy', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-boulder',
          assetId: 'large-boulder',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const occupancy = buildSceneOccupancy(scene);

    expect(occupancy.conflicts).toEqual([]);
    expect(occupancy.instances[0]).toMatchObject({
      instanceId: 'tile-boulder',
      assetId: 'large-boulder',
      effectiveFootprint: { length: 2, width: 1, height: 2 },
      occupiedCells: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
    });
    expect(occupancy.blockingCells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          buildingLevelId: 'level-1',
          coordinate: { x: 2, y: 2 },
          blockedByInstanceId: 'tile-boulder',
        }),
        expect.objectContaining({
          buildingLevelId: 'level-1',
          coordinate: { x: 3, y: 2 },
          blockedByInstanceId: 'tile-boulder',
        }),
      ]),
    );
    expect(JSON.stringify(scene)).not.toContain('blockingCells');
  });

  it('detects same-layer footprint overlap and cross-layer height blocking conflicts', () => {
    const baseScene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-conflict', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
    };
    const sameLayer = buildSceneOccupancy({
      ...baseScene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-wide',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-overlap',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    });
    const crossLayer = buildSceneOccupancy({
      ...baseScene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-boulder',
          assetId: 'large-boulder',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-upper',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
    });

    expect(sameLayer.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'same-level-footprint-overlap',
          instanceId: 'tile-overlap',
          blockingInstanceId: 'tile-wide',
          coordinates: [{ x: 3, y: 2 }],
        }),
      ]),
    );
    expect(crossLayer.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'height-blocked-by-lower-footprint',
          instanceId: 'tile-upper',
          blockingInstanceId: 'tile-boulder',
          coordinates: [{ x: 3, y: 2 }],
        }),
      ]),
    );
  });

  it('evaluates placement replacement, bounds and lower-level blocking from the same occupancy rules', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-placement', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-boulder',
          assetId: 'large-boulder',
          coordinate: { x: 2, y: 4 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const woodenBench = getAssetById('wooden-bench')!;
    const leafyPlant = getAssetById('leafy-plant')!;

    expect(evaluateScenePlacementFootprint(scene, {
      asset: woodenBench,
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-0',
      rotationDegrees: 0,
    })).toMatchObject({
      status: 'will-replace',
      existingInstances: [expect.objectContaining({ instanceId: 'tile-existing' })],
    });
    expect(evaluateScenePlacementFootprint(scene, {
      asset: woodenBench,
      coordinate: { x: 6, y: 2 },
      buildingLevelId: 'level-0',
      rotationDegrees: 0,
    })).toMatchObject({
      status: 'blocked',
      conflicts: [expect.objectContaining({ conflictType: 'footprint-out-of-bounds' })],
    });
    expect(evaluateScenePlacementFootprint(scene, {
      asset: leafyPlant,
      coordinate: { x: 2, y: 4 },
      buildingLevelId: 'level-1',
      rotationDegrees: 0,
    })).toMatchObject({
      status: 'blocked',
      conflicts: [expect.objectContaining({ conflictType: 'height-blocked-by-lower-footprint' })],
    });
  });
});
