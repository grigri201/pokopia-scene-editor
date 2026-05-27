import { createDefaultSceneDocument } from './default-scene';
import { createBuildingLevel } from './levels';
import { createTileInstance } from './tile-instance';
import type { GridCoordinate } from './area';
import type { SceneDocument } from './types';

export const footprintContractFixtureIds = {
  level0: 'level-0',
  level1: 'level-1',
  level2: 'level-2',
  plant: 'fixture-plant-1x1',
  bench: 'fixture-bench-1x2',
  rug: 'fixture-chair-2x1',
  rotatedBench: 'fixture-bench-rotated-2x1',
  rotatedRug: 'fixture-chair-rotated-1x2',
  boulder: 'fixture-strength-rock-1x1x2',
  overlap: 'fixture-overlap-plant',
  heightBlocked: 'fixture-height-blocked-plant',
} as const;

export const footprintContractExpected = {
  effectiveFootprints: {
    [footprintContractFixtureIds.plant]: { length: 1, width: 1, height: 1 },
    [footprintContractFixtureIds.bench]: { length: 1, width: 2, height: 1 },
    [footprintContractFixtureIds.rug]: { length: 2, width: 1, height: 1 },
    [footprintContractFixtureIds.rotatedBench]: { length: 2, width: 1, height: 1 },
    [footprintContractFixtureIds.rotatedRug]: { length: 1, width: 2, height: 1 },
    [footprintContractFixtureIds.boulder]: { length: 1, width: 1, height: 2 },
  },
  occupiedCells: {
    [footprintContractFixtureIds.plant]: [{ x: 1, y: 1 }],
    [footprintContractFixtureIds.bench]: [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
    [footprintContractFixtureIds.rug]: [
      { x: 4, y: 2 },
      { x: 5, y: 2 },
    ],
    [footprintContractFixtureIds.rotatedBench]: [
      { x: 4, y: 4 },
      { x: 5, y: 4 },
    ],
    [footprintContractFixtureIds.rotatedRug]: [
      { x: 6, y: 4 },
      { x: 6, y: 5 },
    ],
    [footprintContractFixtureIds.boulder]: [
      { x: 1, y: 4 },
    ],
  },
  blockingCells: {
    [footprintContractFixtureIds.boulder]: [
      { buildingLevelId: footprintContractFixtureIds.level1, coordinate: { x: 1, y: 4 } },
    ],
  },
} as const satisfies {
  effectiveFootprints: Record<string, { length: number; width: number; height: number }>;
  occupiedCells: Record<string, readonly GridCoordinate[]>;
  blockingCells: Record<string, readonly { buildingLevelId: string; coordinate: GridCoordinate }[]>;
};

export function createFootprintContractScene(): SceneDocument {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-footprint-contract',
    sceneName: 'Footprint Contract Scene',
    selectedPokemonKey: 'ditto',
    now: '2026-05-27T00:00:00.000Z',
  });

  return {
    ...scene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
    tileInstances: [
      createTileInstance({
        instanceId: footprintContractFixtureIds.plant,
        assetId: 'leafy-plant',
        coordinate: { x: 1, y: 1 },
        buildingLevelId: footprintContractFixtureIds.level0,
        requiresSkill: true,
        skillType: '树叶',
      }),
      createTileInstance({
        instanceId: footprintContractFixtureIds.bench,
        assetId: 'wooden-bench',
        coordinate: { x: 2, y: 1 },
        buildingLevelId: footprintContractFixtureIds.level0,
      }),
      createTileInstance({
        instanceId: footprintContractFixtureIds.rug,
        assetId: 'deck-chair',
        coordinate: { x: 4, y: 2 },
        buildingLevelId: footprintContractFixtureIds.level0,
      }),
      createTileInstance({
        instanceId: footprintContractFixtureIds.rotatedBench,
        assetId: 'wooden-bench',
        coordinate: { x: 4, y: 4 },
        buildingLevelId: footprintContractFixtureIds.level0,
        rotationDegrees: 90,
      }),
      createTileInstance({
        instanceId: footprintContractFixtureIds.rotatedRug,
        assetId: 'deck-chair',
        coordinate: { x: 6, y: 4 },
        buildingLevelId: footprintContractFixtureIds.level0,
        rotationDegrees: 90,
      }),
      createTileInstance({
        instanceId: footprintContractFixtureIds.boulder,
        assetId: 'strength-rock',
        coordinate: { x: 1, y: 4 },
        buildingLevelId: footprintContractFixtureIds.level0,
      }),
    ],
    skillMarkers: [],
    workspaceState: {
      currentBuildingLevelId: footprintContractFixtureIds.level0,
      selectedAssetId: null,
      selectedCoordinate: { x: 1, y: 1 },
    },
  };
}

export function createFootprintContractOverlapScene(): SceneDocument {
  const scene = createFootprintContractScene();

  return {
    ...scene,
    tileInstances: [
      ...scene.tileInstances,
      createTileInstance({
        instanceId: footprintContractFixtureIds.overlap,
        assetId: 'leafy-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: footprintContractFixtureIds.level0,
      }),
    ],
  };
}

export function createFootprintContractHeightBlockedScene(): SceneDocument {
  const scene = createFootprintContractScene();

  return {
    ...scene,
    tileInstances: [
      ...scene.tileInstances,
      createTileInstance({
        instanceId: footprintContractFixtureIds.heightBlocked,
        assetId: 'leafy-plant',
        coordinate: { x: 1, y: 4 },
        buildingLevelId: footprintContractFixtureIds.level1,
      }),
    ],
  };
}
