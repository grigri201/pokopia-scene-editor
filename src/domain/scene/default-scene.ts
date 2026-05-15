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
import type { SceneDocument } from './types';

export const defaultSelectedPokemonKey: PokemonKey = 'ditto';

export interface CreateDefaultSceneDocumentOptions {
  sceneId?: string;
  sceneName?: string;
  selectedPokemonKey?: string;
  selectedCoordinate?: GridCoordinate | null;
  now?: string;
}

export function createDefaultSceneDocument(
  options: CreateDefaultSceneDocumentOptions = {},
): SceneDocument {
  const now = options.now ?? new Date().toISOString();
  assertIsoDateTime(now);

  const sceneName = options.sceneName ?? 'Ditto 5x5 布景草稿';
  assertSceneNameLabelsSceneSize(sceneName);

  const selectedPokemonKey = options.selectedPokemonKey ?? defaultSelectedPokemonKey;
  assertKnownPokemonKey(selectedPokemonKey);

  if (options.selectedCoordinate) {
    assertCanvasCoordinate(options.selectedCoordinate, defaultSceneDimensions);
  }

  const buildingLevels = createDefaultBuildingLevels();

  return {
    schemaVersion: 1,
    sceneId: options.sceneId ?? createSceneId(),
    sceneName,
    selectedPokemonKey,
    sceneSize: { width: sceneSize, height: sceneSize },
    canvasSize: { width: canvasSize, height: canvasSize },
    outerPadding,
    buildingLevels,
    tileInstances: [],
    workspaceState: {
      currentBuildingLevelId: buildingLevels[0].id,
      selectedAssetId: null,
      selectedCoordinate: options.selectedCoordinate ?? null,
      saveStatus: 'saved',
      saveError: null,
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
  return /5\s*[x×]\s*5/i.test(sceneName.trim());
}

export function assertSceneNameLabelsSceneSize(sceneName: string): void {
  if (!sceneNameLabelsSceneSize(sceneName)) {
    throw new RangeError('Scene name must label the scene as 5x5.');
  }
}

function createSceneId(): string {
  return `scene-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function assertIsoDateTime(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    throw new RangeError('Scene metadata timestamp must be an ISO 8601 UTC string.');
  }
}
