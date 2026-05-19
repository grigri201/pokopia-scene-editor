import {
  assertCanvasCoordinate,
  canvasSize,
  defaultSceneDimensions,
  outerPadding,
  sceneSize,
  type GridCoordinate,
} from './area';
import { assertKnownPokemonKey, type PokemonKey } from '../assets';
import { createDefaultBuildingLevels } from './levels';
import { createTileInstance } from './tile-instance';
import type { SceneDocument } from './types';

export const defaultSelectedPokemonKey: PokemonKey = 'ditto';

export interface CreateDefaultSceneDocumentOptions {
  sceneId?: string;
  sceneName?: string;
  selectedPokemonKey?: string;
  selectedCoordinate?: GridCoordinate | null;
  now?: string;
  includeOpenDesignDemo?: boolean;
}

export function createDefaultSceneDocument(
  options: CreateDefaultSceneDocumentOptions = {},
): SceneDocument {
  const now = options.now ?? new Date().toISOString();
  assertIsoDateTime(now);

  const sceneName = options.sceneName ?? (options.includeOpenDesignDemo ? '星光庭院' : 'Ditto 5x5 布景草稿');
  assertSceneNameLabelsSceneSize(sceneName);

  const selectedPokemonKey =
    options.selectedPokemonKey ?? (options.includeOpenDesignDemo ? 'pikachu' : defaultSelectedPokemonKey);
  assertKnownPokemonKey(selectedPokemonKey);

  if (options.selectedCoordinate) {
    assertCanvasCoordinate(options.selectedCoordinate, defaultSceneDimensions);
  }

  const buildingLevels = createDefaultBuildingLevels().map((level) => {
    if (!options.includeOpenDesignDemo) {
      return level;
    }

    const namesByLevelNumber: Record<number, string> = {
      0: '地面基础',
      1: '主体道具',
      2: '屋顶与遮挡',
    };

    return {
      ...level,
      name: namesByLevelNumber[level.levelNumber] ?? level.name,
    };
  });
  const openDesignDemoInstances = options.includeOpenDesignDemo
    ? createOpenDesignDemoInstances()
    : [];
  const selectedCoordinate = options.selectedCoordinate ?? (options.includeOpenDesignDemo ? { x: 3, y: 2 } : null);

  return {
    schemaVersion: 1,
    sceneId: options.sceneId ?? createSceneId(),
    sceneName,
    selectedPokemonKey,
    sceneSize: { width: sceneSize, height: sceneSize },
    canvasSize: { width: canvasSize, height: canvasSize },
    outerPadding,
    buildingLevels,
    tileInstances: openDesignDemoInstances,
    workspaceState: {
      currentBuildingLevelId: options.includeOpenDesignDemo ? 'level-1' : buildingLevels[0].id,
      selectedAssetId: options.includeOpenDesignDemo ? 'wooden-floor' : null,
      selectedCoordinate,
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      lastAutosavedAt: null,
    },
  };
}

export function getDefaultSceneDimensions() {
  return {
    sceneSize: { ...defaultSceneDimensions.sceneSize },
    canvasSize: { ...defaultSceneDimensions.canvasSize },
    outerPadding: defaultSceneDimensions.outerPadding,
  };
}

export function sceneNameLabelsSceneSize(sceneName: string): boolean {
  return sceneName.trim().length > 0;
}

export function assertSceneNameLabelsSceneSize(sceneName: string): void {
  if (!sceneNameLabelsSceneSize(sceneName)) {
    throw new RangeError('Scene name must not be empty.');
  }
}

function createOpenDesignDemoInstances() {
  return [
    ...[
      ['demo-ground-0', 'outer-wall', 1, 1],
      ['demo-ground-1', 'outer-wall', 2, 1],
      ['demo-ground-2', 'outer-wall', 3, 1],
      ['demo-ground-3', 'outer-wall', 1, 2],
      ['demo-ground-4', 'outer-wall', 3, 3],
      ['demo-ground-5', 'outer-wall', 2, 5],
      ['demo-ground-6', 'outer-wall', 3, 5],
      ['demo-ground-7', 'outer-wall', 4, 5],
      ['demo-ground-8', 'ditto-doll', 4, 1],
      ['demo-ground-9', 'ditto-doll', 5, 1],
      ['demo-ground-10', 'ditto-doll', 0, 3],
      ['demo-ground-11', 'ditto-doll', 6, 3],
      ['demo-ground-12', 'garden-plant', 0, 6],
      ['demo-ground-13', 'garden-plant', 1, 6],
      ['demo-ground-14', 'garden-plant', 2, 6],
      ['demo-ground-15', 'garden-plant', 3, 6],
      ['demo-ground-16', 'garden-plant', 4, 6],
      ['demo-ground-17', 'garden-plant', 5, 6],
      ['demo-ground-18', 'garden-plant', 6, 6],
      ['demo-ground-19', 'outer-wall', 5, 5],
    ].map(([instanceId, assetId, x, y]) =>
      createTileInstance({
        instanceId: String(instanceId),
        assetId: String(assetId),
        coordinate: { x: Number(x), y: Number(y) },
        buildingLevelId: 'level-0',
      }),
    ),
    ...[
      ['demo-main-0', 'wooden-floor', 0, 2, 270, null, false],
      ['demo-main-1', 'wooden-floor', 3, 2, 90, null, true],
      ['demo-main-2', 'wooden-floor', 6, 2, 270, null, false],
      ['demo-main-3', 'garden-plant', 0, 3, 0, null, false],
      ['demo-main-4', 'garden-plant', 1, 3, 0, null, false],
      ['demo-main-5', 'garden-plant', 5, 3, 0, null, true],
      ['demo-main-6', 'garden-plant', 6, 3, 0, null, true],
      ['demo-main-7', 'water-barrel', 2, 2, 0, null, false],
      ['demo-main-8', 'water-barrel', 4, 2, 0, null, false],
      ['demo-main-9', 'ditto-doll', 3, 3, 0, null, false],
      ['demo-main-10', 'wooden-floor', 1, 4, 0, '#d59a61', false],
      ['demo-main-11', 'wooden-floor', 5, 4, 0, '#d59a61', false],
    ].map(([instanceId, assetId, x, y, rotationDegrees, dyeColor, requiresSkill]) =>
      createTileInstance({
        instanceId: String(instanceId),
        assetId: String(assetId),
        coordinate: { x: Number(x), y: Number(y) },
        buildingLevelId: 'level-1',
        rotationDegrees: Number(rotationDegrees) as 0 | 90 | 180 | 270,
        dyeColor: dyeColor ? String(dyeColor) : null,
        requiresSkill: Boolean(requiresSkill),
        skillType: requiresSkill ? '树叶' : null,
      }),
    ),
    ...[
      ['demo-roof-0', 'roof-tile', 2, 4, 90],
      ['demo-roof-1', 'roof-tile', 3, 4, 180],
      ['demo-roof-2', 'roof-tile', 4, 4, 270],
      ['demo-roof-3', 'roof-tile', 2, 5, 0],
      ['demo-roof-4', 'roof-tile', 4, 5, 0],
    ].map(([instanceId, assetId, x, y, rotationDegrees]) =>
      createTileInstance({
        instanceId: String(instanceId),
        assetId: String(assetId),
        coordinate: { x: Number(x), y: Number(y) },
        buildingLevelId: 'level-2',
        rotationDegrees: Number(rotationDegrees) as 0 | 90 | 180 | 270,
      }),
    ),
  ];
}

function createSceneId(): string {
  return `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertIsoDateTime(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new RangeError('Scene metadata timestamp must be an ISO 8601 UTC string.');
  }
}
