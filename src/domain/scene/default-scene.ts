import {
  assertCanvasCoordinate,
  canvasSize,
  defaultSceneDimensions,
  outerPadding,
  sceneSize,
  type GridCoordinate,
} from './area';
import { assertKnownPokemonKey, type PokemonKey } from '../assets';
import { createBuildingLevel, createDefaultBuildingLevels } from './levels';
import { createTileInstance } from './tile-instance';
import type { SceneDocument } from './types';

export const defaultSelectedPokemonKey: PokemonKey = 'ditto';
export const defaultSceneName = '5x5 布景';

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

  const selectedPokemonKey =
    options.selectedPokemonKey ?? (options.includeOpenDesignDemo ? 'pikachu' : defaultSelectedPokemonKey);
  assertKnownPokemonKey(selectedPokemonKey);
  const sceneName =
    options.sceneName ??
    (options.includeOpenDesignDemo ? '星光庭院' : defaultSceneName);
  assertSceneNameLabelsSceneSize(sceneName);

  if (options.selectedCoordinate) {
    assertCanvasCoordinate(options.selectedCoordinate, defaultSceneDimensions);
  }

  const baseBuildingLevels = options.includeOpenDesignDemo
    ? [0, 1, 2].map((levelNumber) => createBuildingLevel(levelNumber))
    : createDefaultBuildingLevels();
  const buildingLevels = baseBuildingLevels.map((level) => {
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
    skillMarkers: [],
    workspaceState: {
      currentBuildingLevelId: options.includeOpenDesignDemo ? 'level-1' : buildingLevels[0].id,
      selectedAssetId: options.includeOpenDesignDemo ? 'wooden-fencing' : null,
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
      ['demo-ground-0', 'stepping-stones', 1, 1],
      ['demo-ground-1', 'stepping-stones', 2, 1],
      ['demo-ground-2', 'stepping-stones', 3, 1],
      ['demo-ground-3', 'stepping-stones', 1, 2],
      ['demo-ground-4', 'stepping-stones', 3, 3],
      ['demo-ground-5', 'stepping-stones', 2, 5],
      ['demo-ground-6', 'stepping-stones', 3, 5],
      ['demo-ground-7', 'stepping-stones', 4, 5],
      ['demo-ground-8', 'wooden-bench', 4, 1],
      ['demo-ground-9', 'wooden-bench', 5, 1],
      ['demo-ground-10', 'wooden-bench', 0, 3],
      ['demo-ground-11', 'wooden-bench', 6, 3],
      ['demo-ground-12', 'leafy-plant', 0, 6],
      ['demo-ground-13', 'leafy-plant', 1, 6],
      ['demo-ground-14', 'leafy-plant', 2, 6],
      ['demo-ground-15', 'leafy-plant', 3, 6],
      ['demo-ground-16', 'leafy-plant', 4, 6],
      ['demo-ground-17', 'leafy-plant', 5, 6],
      ['demo-ground-18', 'leafy-plant', 6, 6],
      ['demo-ground-19', 'stepping-stones', 5, 5],
    ].map(([instanceId, assetId, x, y]) =>
      createTileInstance({
        instanceId: String(instanceId),
        assetId: String(assetId),
        coordinate: { x: Number(x), y: Number(y) },
        buildingLevelId: 'level-0',
      }),
    ),
    ...[
      ['demo-main-0', 'wooden-fencing', 0, 2, 270, null, false],
      ['demo-main-1', 'wooden-fencing', 3, 2, 90, null, true],
      ['demo-main-2', 'wooden-fencing', 6, 2, 270, null, false],
      ['demo-main-3', 'leafy-plant', 0, 3, 0, null, false],
      ['demo-main-4', 'leafy-plant', 1, 3, 0, null, false],
      ['demo-main-5', 'leafy-plant', 5, 3, 0, null, true],
      ['demo-main-6', 'leafy-plant', 6, 3, 0, null, true],
      ['demo-main-7', 'stone-brick-wall', 2, 2, 0, null, false],
      ['demo-main-8', 'stone-brick-wall', 4, 2, 0, null, false],
      ['demo-main-9', 'wooden-bench', 3, 3, 0, null, false],
      ['demo-main-10', 'wooden-fencing', 1, 4, 0, '#d59a61', false],
      ['demo-main-11', 'wooden-fencing', 5, 4, 0, '#d59a61', false],
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
      ['demo-roof-0', 'brick-roof-decoration', 2, 4, 90],
      ['demo-roof-1', 'brick-roof-decoration', 3, 4, 180],
      ['demo-roof-2', 'brick-roof-decoration', 4, 4, 270],
      ['demo-roof-3', 'brick-roof-decoration', 2, 5, 0],
      ['demo-roof-4', 'brick-roof-decoration', 4, 5, 0],
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
