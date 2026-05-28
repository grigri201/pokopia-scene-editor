import { createDefaultSceneDocument } from './default-scene';
import { createBuildingLevel } from './levels';
import { createTileInstance } from './tile-instance';
import type { SceneDocument } from './types';

const now = '2026-05-28T00:00:00.000Z';

export const stackingContractFixtureIds = {
  level0: 'level-0',
  level1: 'level-1',
  plate: 'stacking-base-plate',
  food: 'stacking-top-food',
  nonFood: 'stacking-top-non-food',
  rug: 'stacking-base-rug',
  rugTop: 'stacking-top-rug-item',
  partialSurface: 'stacking-partial-surface',
  partialTop: 'stacking-partial-top',
  multiSurfaceA: 'stacking-surface-a',
  multiSurfaceB: 'stacking-surface-b',
  multiSurfaceTop: 'stacking-multi-surface-top',
  boulder: 'stacking-lower-boulder',
} as const;

export function createStackingPlateFoodScene(): SceneDocument {
  return createStackingScene([
    createTileInstance({
      instanceId: stackingContractFixtureIds.plate,
      assetId: 'plate',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
    createTileInstance({
      instanceId: stackingContractFixtureIds.food,
      assetId: 'leppa-berry',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
  ]);
}

export function createStackingPlateNonFoodScene(): SceneDocument {
  return createStackingScene([
    createTileInstance({
      instanceId: stackingContractFixtureIds.plate,
      assetId: 'plate',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
    createTileInstance({
      instanceId: stackingContractFixtureIds.nonFood,
      assetId: 'leafy-plant',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
  ]);
}

export function createStackingFloorCoverScene(): SceneDocument {
  return createStackingScene([
    createTileInstance({
      instanceId: stackingContractFixtureIds.rug,
      assetId: 'small-narrow-rug',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
    createTileInstance({
      instanceId: stackingContractFixtureIds.rugTop,
      assetId: 'leafy-plant',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
  ]);
}

export function createStackingPartialSurfaceScene(): SceneDocument {
  return createStackingScene([
    createTileInstance({
      instanceId: stackingContractFixtureIds.partialSurface,
      assetId: 'small-narrow-rug',
      coordinate: { x: 1, y: 1 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
    createTileInstance({
      instanceId: stackingContractFixtureIds.partialTop,
      assetId: 'wooden-bench',
      coordinate: { x: 1, y: 1 },
      buildingLevelId: stackingContractFixtureIds.level0,
      rotationDegrees: 90,
    }),
  ]);
}

export function createStackingMultiSurfaceScene(): SceneDocument {
  return createStackingScene([
    createTileInstance({
      instanceId: stackingContractFixtureIds.multiSurfaceA,
      assetId: 'small-narrow-rug',
      coordinate: { x: 1, y: 1 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
    createTileInstance({
      instanceId: stackingContractFixtureIds.multiSurfaceB,
      assetId: 'small-round-rug',
      coordinate: { x: 2, y: 1 },
      buildingLevelId: stackingContractFixtureIds.level0,
    }),
    createTileInstance({
      instanceId: stackingContractFixtureIds.multiSurfaceTop,
      assetId: 'wooden-bench',
      coordinate: { x: 1, y: 1 },
      buildingLevelId: stackingContractFixtureIds.level0,
      rotationDegrees: 90,
    }),
  ]);
}

export function createStackingHeightBlockedScene(): SceneDocument {
  const scene = createStackingPlateFoodScene();

  return {
    ...scene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
    tileInstances: [
      createTileInstance({
        instanceId: stackingContractFixtureIds.boulder,
        assetId: 'strength-rock',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: stackingContractFixtureIds.level0,
      }),
      createTileInstance({
        instanceId: stackingContractFixtureIds.plate,
        assetId: 'plate',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: stackingContractFixtureIds.level1,
      }),
      createTileInstance({
        instanceId: stackingContractFixtureIds.food,
        assetId: 'leppa-berry',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: stackingContractFixtureIds.level1,
      }),
    ],
  };
}

function createStackingScene(tileInstances: SceneDocument['tileInstances']): SceneDocument {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-stacking-contract',
    sceneName: 'Stacking Contract Scene',
    selectedPokemonKey: 'ditto',
    now,
  });

  return {
    ...scene,
    buildingLevels: [createBuildingLevel(0)],
    tileInstances,
    skillMarkers: [],
    workspaceState: {
      currentBuildingLevelId: stackingContractFixtureIds.level0,
      selectedAssetId: null,
      selectedCoordinate: { x: 2, y: 2 },
    },
  };
}
