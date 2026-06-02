import { describe, expect, it } from 'vitest';
import { createBuildingLevel } from './levels';
import { createDefaultSceneDocument } from './default-scene';
import { createTileInstance } from './tile-instance';
import {
  buildSceneOccupancy,
  evaluateScenePlacementFootprint,
} from './occupancy';
import {
  createFootprintContractHeightBlockedScene,
  createFootprintContractOverlapScene,
  createFootprintContractScene,
  footprintContractExpected,
  footprintContractFixtureIds,
} from './footprint-contract-fixture';
import {
  createStackingFloorCoverScene,
  createStackingHeightBlockedScene,
  createStackingMultiSurfaceScene,
  createStackingPartialSurfaceScene,
  createStackingPlateFoodScene,
  createStackingPlateNonFoodScene,
  stackingContractFixtureIds,
} from './stacking-contract-fixture';
import { getAssetById } from '../assets';

const now = '2026-05-27T00:00:00.000Z';

describe('scene occupancy rules', () => {
  it('keeps the shared footprint contract fixture deterministic across occupied and blocking cells', () => {
    const occupancy = buildSceneOccupancy(createFootprintContractScene());

    expect(occupancy.conflicts).toEqual([]);
    for (const instanceId of Object.keys(footprintContractExpected.effectiveFootprints) as Array<keyof typeof footprintContractExpected.effectiveFootprints>) {
      expect(occupancy.instances.find((instance) => instance.instanceId === instanceId)).toMatchObject({
        instanceId,
        effectiveFootprint: footprintContractExpected.effectiveFootprints[instanceId],
        occupiedCells: footprintContractExpected.occupiedCells[instanceId],
      });
    }
    expect(occupancy.blockingCells).toEqual(
      expect.arrayContaining(
        footprintContractExpected.blockingCells[footprintContractFixtureIds.boulder].map((cell) =>
          expect.objectContaining({
            ...cell,
            blockedByInstanceId: footprintContractFixtureIds.boulder,
            blockedByAssetId: 'strength-rock',
            blockedByBuildingLevelId: footprintContractFixtureIds.level0,
          }),
        ),
      ),
    );
  });

  it('reports shared fixture overlap and height-blocking variants with structured conflict details', () => {
    expect(buildSceneOccupancy(createFootprintContractOverlapScene()).conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'same-level-footprint-overlap',
          instanceId: footprintContractFixtureIds.overlap,
          assetId: 'leafy-plant',
          buildingLevelId: footprintContractFixtureIds.level0,
          blockingInstanceId: footprintContractFixtureIds.bench,
          blockingAssetId: 'wooden-bench',
          blockingBuildingLevelId: footprintContractFixtureIds.level0,
          coordinates: [{ x: 2, y: 2 }],
        }),
      ]),
    );
    expect(buildSceneOccupancy(createFootprintContractHeightBlockedScene()).conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'height-blocked-by-lower-footprint',
          instanceId: footprintContractFixtureIds.heightBlocked,
          assetId: 'leafy-plant',
          buildingLevelId: footprintContractFixtureIds.level1,
          blockingInstanceId: footprintContractFixtureIds.boulder,
          blockingAssetId: 'strength-rock',
          blockingBuildingLevelId: footprintContractFixtureIds.level0,
          coordinates: [{ x: 1, y: 4 }],
        }),
      ]),
    );
  });

  it('builds occupied cells and height-derived blocking cells without mutating scene payload', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-occupancy', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-boulder',
          assetId: 'strength-rock',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const occupancy = buildSceneOccupancy(scene);

    expect(occupancy.conflicts).toEqual([]);
    expect(occupancy.instances[0]).toMatchObject({
      instanceId: 'tile-boulder',
      assetId: 'strength-rock',
      effectiveFootprint: { length: 1, width: 1, height: 2 },
      occupiedCells: [
        { x: 2, y: 2 },
      ],
    });
    expect(occupancy.blockingCells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          buildingLevelId: 'level-1',
          coordinate: { x: 2, y: 2 },
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
          rotationDegrees: 90,
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
          assetId: 'strength-rock',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-upper',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
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
          coordinates: [{ x: 2, y: 2 }],
        }),
      ]),
    );
  });

  it('allows audited stacking surfaces and derives base/top relations', () => {
    const plateFood = buildSceneOccupancy(createStackingPlateFoodScene());
    const reversedPlateFoodScene = {
      ...createStackingPlateFoodScene(),
      tileInstances: [...createStackingPlateFoodScene().tileInstances].reverse(),
    };
    const reversedPlateFood = buildSceneOccupancy(reversedPlateFoodScene);
    const floorCover = buildSceneOccupancy(createStackingFloorCoverScene());

    expect(plateFood.conflicts).toEqual([]);
    expect(plateFood.stackingRelations).toEqual([
      {
        topInstanceId: stackingContractFixtureIds.food,
        topAssetId: 'leppa-berry',
        baseInstanceId: stackingContractFixtureIds.plate,
        baseAssetId: 'plate',
        buildingLevelId: stackingContractFixtureIds.level0,
        surfaceKind: 'food-surface',
        coordinates: [{ x: 2, y: 2 }],
      },
    ]);
    expect(reversedPlateFood.conflicts).toEqual([]);
    expect(reversedPlateFood.stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: stackingContractFixtureIds.food,
        baseInstanceId: stackingContractFixtureIds.plate,
        surfaceKind: 'food-surface',
      }),
    ]);
    expect(floorCover.conflicts).toEqual([]);
    expect(floorCover.stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: stackingContractFixtureIds.rugTop,
        baseInstanceId: stackingContractFixtureIds.rug,
        surfaceKind: 'floor-cover',
        coordinates: [{ x: 2, y: 2 }],
      }),
    ]);
    const partialSurface = buildSceneOccupancy(createStackingPartialSurfaceScene());
    expect(partialSurface.conflicts).toEqual([]);
    expect(partialSurface.stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: stackingContractFixtureIds.partialTop,
        baseInstanceId: stackingContractFixtureIds.partialSurface,
        surfaceKind: 'floor-cover',
        coordinates: [{ x: 1, y: 1 }],
      }),
    ]);
  });

  it('reports unsupported and capacity stacking conflicts with structured details', () => {
    expect(buildSceneOccupancy(createStackingPlateNonFoodScene()).conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'unsupported-stack-surface',
          instanceId: stackingContractFixtureIds.nonFood,
          assetId: 'leafy-plant',
          blockingInstanceId: stackingContractFixtureIds.plate,
          blockingAssetId: 'plate',
          blockingBuildingLevelId: stackingContractFixtureIds.level0,
          surfaceKind: 'food-surface',
          coordinates: [{ x: 2, y: 2 }],
        }),
      ]),
    );
    expect(buildSceneOccupancy(createStackingMultiSurfaceScene()).conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'surface-capacity-conflict',
          instanceId: stackingContractFixtureIds.multiSurfaceTop,
          blockingInstanceId: stackingContractFixtureIds.multiSurfaceA,
          surfaceKind: 'floor-cover',
        }),
      ]),
    );
  });

  it('keeps height blocking ahead of stacking placement compatibility', () => {
    const scene = {
      ...createStackingHeightBlockedScene(),
      tileInstances: createStackingHeightBlockedScene().tileInstances.filter(
        (instance) => instance.instanceId !== stackingContractFixtureIds.food,
      ),
    };
    const leppaBerry = getAssetById('leppa-berry')!;

    expect(evaluateScenePlacementFootprint(scene, {
      asset: leppaBerry,
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level1,
    })).toMatchObject({
      status: 'blocked',
      stackingRelations: [],
      conflicts: [
        expect.objectContaining({
          conflictType: 'height-blocked-by-lower-footprint',
          blockingInstanceId: stackingContractFixtureIds.boulder,
        }),
      ],
    });
  });

  it('evaluates placement replacement, bounds and lower-level blocking from the same occupancy rules', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-placement', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-boulder',
          assetId: 'strength-rock',
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
      coordinate: { x: 2, y: 16 },
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

  it('evaluates legal and illegal stacking placement without breaking replacement flow', () => {
    const baseScene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-placement-stacking', now }),
      tileInstances: [
        createTileInstance({
          instanceId: stackingContractFixtureIds.plate,
          assetId: 'plate',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: stackingContractFixtureIds.level0,
        }),
      ],
    };
    const leppaBerry = getAssetById('leppa-berry')!;
    const leafyPlant = getAssetById('leafy-plant')!;

    expect(evaluateScenePlacementFootprint(baseScene, {
      asset: leppaBerry,
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    })).toMatchObject({
      status: 'ready',
      canPlace: true,
      stackingRelations: [
        expect.objectContaining({
          topInstanceId: 'placement-preview',
          baseInstanceId: stackingContractFixtureIds.plate,
          surfaceKind: 'food-surface',
        }),
      ],
    });
    expect(evaluateScenePlacementFootprint(baseScene, {
      asset: leafyPlant,
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
      confirmReplace: true,
    })).toMatchObject({
      status: 'blocked',
      conflicts: [
        expect.objectContaining({
          conflictType: 'unsupported-stack-surface',
          blockingInstanceId: stackingContractFixtureIds.plate,
        }),
      ],
    });
    expect(evaluateScenePlacementFootprint(baseScene, {
      asset: leafyPlant,
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    })).toMatchObject({
      status: 'blocked',
      conflicts: [
        expect.objectContaining({
          conflictType: 'unsupported-stack-surface',
          blockingInstanceId: stackingContractFixtureIds.plate,
        }),
      ],
    });
    const floorCoverScene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-placement-partial-stacking', now }),
      tileInstances: [
        createTileInstance({
          instanceId: stackingContractFixtureIds.partialSurface,
          assetId: 'small-narrow-rug',
          coordinate: { x: 1, y: 1 },
          buildingLevelId: stackingContractFixtureIds.level0,
        }),
      ],
    };
    const woodenBench = getAssetById('wooden-bench')!;

    expect(evaluateScenePlacementFootprint(floorCoverScene, {
      asset: woodenBench,
      coordinate: { x: 1, y: 1 },
      buildingLevelId: stackingContractFixtureIds.level0,
      rotationDegrees: 90,
    })).toMatchObject({
      status: 'ready',
      canPlace: true,
      stackingRelations: [
        expect.objectContaining({
          topInstanceId: 'placement-preview',
          baseInstanceId: stackingContractFixtureIds.partialSurface,
          surfaceKind: 'floor-cover',
          coordinates: [{ x: 1, y: 1 }],
        }),
      ],
    });
    const frame = getAssetById('frame')!;
    const frameScene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-placement-self-stacking', now }),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-frame',
          assetId: 'frame',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: stackingContractFixtureIds.level0,
        }),
      ],
    };

    expect(evaluateScenePlacementFootprint(frameScene, {
      asset: frame,
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    })).toMatchObject({
      status: 'will-replace',
      stackingRelations: [],
      existingInstances: [
        expect.objectContaining({
          instanceId: 'tile-frame',
          assetId: 'frame',
        }),
      ],
    });
    expect(evaluateScenePlacementFootprint({
      ...baseScene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 3 },
          buildingLevelId: stackingContractFixtureIds.level0,
        }),
      ],
    }, {
      asset: leafyPlant,
      coordinate: { x: 3, y: 3 },
      buildingLevelId: stackingContractFixtureIds.level0,
    })).toMatchObject({
      status: 'will-replace',
    });
    expect(evaluateScenePlacementFootprint({
      ...baseScene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 3 },
          buildingLevelId: stackingContractFixtureIds.level0,
        }),
      ],
    }, {
      asset: leafyPlant,
      coordinate: { x: 3, y: 3 },
      buildingLevelId: stackingContractFixtureIds.level0,
      confirmReplace: true,
    })).toMatchObject({
      status: 'ready',
    });
  });
});
