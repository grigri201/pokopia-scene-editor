import {
  defaultSceneName,
  legacySceneDimensions,
  type GridCoordinate,
  type SceneDocument,
  type SceneDimensions,
} from '../domain/scene';
import { getAssetById, getPokemonThemeDefinition } from '../domain/assets';
import {
  parseSceneDocument,
  type SceneDocumentParseResult,
  type SceneDocumentV1,
  type SceneDocumentValidationError,
} from './scene-schema';

export type RecoveryError = SceneDocumentValidationError;
export type RecoveryAction = 'retry' | 'cancel' | 'view-details';
export type RecoverySource = 'startup' | 'confirmed-user';
export type RecoveryInteractionMode = 'edit' | 'readOnly';

export type SceneRecoveryResult =
  | { ok: true; scene: SceneDocument; payload: SceneDocumentV1 }
  | { ok: false; errors: SceneDocumentValidationError[] };

export interface SceneStringDroppedTileInstance {
  instanceId: string;
  assetId: string;
  assetName: string;
  buildingLevelId: string;
  buildingLevelName: string;
  buildingLevelNumber: number | null;
  coordinate: GridCoordinate;
  conflictType: NonNullable<SceneDocumentValidationError['conflictType']>;
  reason: string;
  coordinates: readonly GridCoordinate[];
  blockingInstanceId?: string;
  blockingAssetId?: string;
  blockingAssetName?: string;
  blockingBuildingLevelId?: string;
  blockingBuildingLevelName?: string;
  blockingBuildingLevelNumber?: number | null;
}

export type SceneRecoveryLossyResult =
  | {
      ok: true;
      scene: SceneDocument;
      payload: SceneDocumentV1;
      droppedTileInstances: readonly SceneStringDroppedTileInstance[];
    }
  | { ok: false; errors: SceneDocumentValidationError[] };

export type SceneRecoveryApplyResult =
  | {
      ok: true;
      status: 'success';
      scene: SceneDocument;
      previousScene: SceneDocument;
      payload: SceneDocumentV1;
    }
  | {
      ok: false;
      status: 'error';
      scene: SceneDocument;
      errors: RecoveryError[];
      availableActions: RecoveryAction[];
    };

export interface ApplyRecoveredSceneDocumentOptions {
  interactionMode: RecoveryInteractionMode;
  source: RecoverySource;
}

export function recoverSceneDocument(input: unknown): SceneRecoveryResult {
  const parsed = parseSceneDocument(input);

  if (!parsed.ok) {
    return { ok: false, errors: parsed.errors };
  }

  return {
    ok: true,
    payload: parsed.scene,
    scene: sceneFromPayload(parsed.scene),
  };
}

export function recoverSceneDocumentWithDroppedTileInstances(input: unknown): SceneRecoveryLossyResult {
  const initialRecovery = recoverSceneDocument(input);
  if (initialRecovery.ok) {
    return {
      ...initialRecovery,
      droppedTileInstances: [],
    };
  }

  if (!isTileInstanceRecoveryPayload(input)) {
    return initialRecovery;
  }

  const payload = input;
  let currentPayload = payload;
  const droppedById = new Map<string, SceneStringDroppedTileInstance>();
  const maxPasses = payload.tileInstances.length + 1;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const recovered = recoverSceneDocument(currentPayload);

    if (recovered.ok) {
      return {
        ...recovered,
        droppedTileInstances: [...droppedById.values()],
      };
    }

    const recoverableError = recovered.errors.find((error) =>
      isRecoverableTileInstanceConflict(error, currentPayload),
    );

    if (!recoverableError) {
      return recovered;
    }

    const instance = currentPayload.tileInstances.find((tileInstance) =>
      tileInstance.instanceId === recoverableError.instanceId,
    );

    if (!instance) {
      return recovered;
    }

    droppedById.set(
      recoverableError.instanceId,
      describeDroppedTileInstance(instance, recoverableError, currentPayload),
    );

    currentPayload = {
      ...currentPayload,
      tileInstances: currentPayload.tileInstances.filter((tileInstance) =>
        tileInstance.instanceId !== recoverableError.instanceId,
      ),
      workspaceState: { ...currentPayload.workspaceState },
      metadata: { ...currentPayload.metadata },
    };
  }

  const recovered = recoverSceneDocument(currentPayload);

  if (recovered.ok) {
    return {
      ...recovered,
      droppedTileInstances: [...droppedById.values()],
    };
  }

  return recovered;
}

export function applyRecoveredSceneDocument(
  currentScene: SceneDocument,
  input: unknown,
  _options: ApplyRecoveredSceneDocumentOptions,
): SceneRecoveryApplyResult {
  const recovered = recoverSceneDocument(input);
  if (!recovered.ok) {
    return {
      ok: false,
      status: 'error',
      scene: currentScene,
      errors: recovered.errors,
      availableActions: ['retry', 'cancel', 'view-details'],
    };
  }

  return {
    ok: true,
    status: 'success',
    scene: recovered.scene,
    previousScene: currentScene,
    payload: recovered.payload,
  };
}

export function sceneFromPayload(payload: SceneDocumentV1): SceneDocument {
  if (!isLegacyDefaultSceneName(payload)) {
    return payload;
  }

  return {
    ...payload,
    sceneName: isLegacySceneDimensions(payload) ? '5x5 布景' : defaultSceneName,
  };
}

function isRecoverableTileInstanceConflict(
  error: SceneDocumentValidationError,
  payload: SceneDocumentV1,
): error is SceneDocumentValidationError & {
  conflictType: NonNullable<SceneDocumentValidationError['conflictType']>;
  instanceId: string;
} {
  return Boolean(
    error.conflictType &&
      error.instanceId &&
      payload.tileInstances.some((instance) => instance.instanceId === error.instanceId),
  );
}

function isTileInstanceRecoveryPayload(input: unknown): input is SceneDocumentV1 {
  return Boolean(
    input &&
      typeof input === 'object' &&
      Array.isArray((input as Partial<SceneDocumentV1>).tileInstances) &&
      Array.isArray((input as Partial<SceneDocumentV1>).buildingLevels) &&
      typeof (input as Partial<SceneDocumentV1>).workspaceState === 'object' &&
      (input as Partial<SceneDocumentV1>).workspaceState !== null &&
      typeof (input as Partial<SceneDocumentV1>).metadata === 'object' &&
      (input as Partial<SceneDocumentV1>).metadata !== null,
  );
}

function describeDroppedTileInstance(
  instance: SceneDocumentV1['tileInstances'][number],
  error: SceneDocumentValidationError & {
    conflictType: NonNullable<SceneDocumentValidationError['conflictType']>;
    instanceId: string;
  },
  payload: SceneDocumentV1,
): SceneStringDroppedTileInstance {
  const level = payload.buildingLevels.find((candidate) => candidate.id === instance.buildingLevelId);
  const asset = getAssetById(instance.assetId);
  const blockingLevel = error.blockingBuildingLevelId
    ? payload.buildingLevels.find((candidate) => candidate.id === error.blockingBuildingLevelId)
    : null;
  const blockingAsset = error.blockingAssetId ? getAssetById(error.blockingAssetId) : null;

  return {
    instanceId: instance.instanceId,
    assetId: instance.assetId,
    assetName: asset?.name ?? instance.assetId,
    buildingLevelId: instance.buildingLevelId,
    buildingLevelName: level?.name ?? instance.buildingLevelId,
    buildingLevelNumber: level?.levelNumber ?? null,
    coordinate: { x: instance.coordinate.x, y: instance.coordinate.y },
    conflictType: error.conflictType,
    reason: error.reason,
    coordinates: (error.coordinates ?? [instance.coordinate]).map((coordinate) => ({
      x: coordinate.x,
      y: coordinate.y,
    })),
    blockingInstanceId: error.blockingInstanceId,
    blockingAssetId: error.blockingAssetId,
    blockingAssetName: blockingAsset?.name ?? error.blockingAssetId,
    blockingBuildingLevelId: error.blockingBuildingLevelId,
    blockingBuildingLevelName: blockingLevel?.name ?? error.blockingBuildingLevelId,
    blockingBuildingLevelNumber: blockingLevel?.levelNumber ?? null,
  };
}

const legacyDefaultSceneName = 'Ditto 5x5 布景草稿';

function isLegacyDefaultSceneName(payload: SceneDocumentV1): boolean {
  if (payload.sceneName === legacyDefaultSceneName) {
    return true;
  }

  return payload.sceneName === `${getPokemonThemeDefinition(payload.selectedPokemonKey).name}的布景`;
}

function isLegacySceneDimensions(dimensions: SceneDimensions): boolean {
  return (
    dimensions.sceneSize.width === legacySceneDimensions.sceneSize.width &&
    dimensions.sceneSize.height === legacySceneDimensions.sceneSize.height &&
    dimensions.canvasSize.width === legacySceneDimensions.canvasSize.width &&
    dimensions.canvasSize.height === legacySceneDimensions.canvasSize.height &&
    dimensions.outerPadding === legacySceneDimensions.outerPadding
  );
}

export function parseSceneDocumentForRecovery(input: unknown): SceneDocumentParseResult {
  return parseSceneDocument(input);
}
