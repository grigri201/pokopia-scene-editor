import {
  buildImageExportSummary,
  createDefaultSceneDocument,
  decodeSceneDocumentString,
  encodeSceneDocumentString,
  recoverSceneDocument,
  validateSceneDocument,
  type SceneDocumentValidationError,
} from '@pokopia-scene-editor/scene-core';
import type { ApiError } from '../api-result';
import { ApiRequestError } from '../request';
import {
  summarizeSceneInputDimensions,
  summarizeSceneSourceDimensions,
  summarizeSceneStringInputDimensions,
  type SceneDimensionsSummary,
} from '../scene-dimensions';

export function generateScene(body: unknown) {
  const input = asRecord(body);
  const scene = createDefaultSceneDocument({
    sceneId: stringValue(input.sceneId) ?? undefined,
    sceneName: stringValue(input.sceneName) ?? undefined,
    selectedPokemonKey: stringValue(input.selectedPokemonKey) ?? undefined,
    now: stringValue(input.now) ?? undefined,
    includeOpenDesignDemo: booleanValue(input.includeOpenDesignDemo) ?? false,
  });

  return {
    scene,
    dimensions: summarizeSceneSourceDimensions(scene),
  };
}

export function validateScene(body: unknown) {
  const sceneInput = extractSceneInput(body);
  const errors = validateSceneDocument(sceneInput);

  return {
    valid: errors.length === 0,
    dimensions: summarizeSceneInputDimensions(sceneInput),
    errors: errors.map(toApiValidationError),
  };
}

export function recoverScene(body: unknown) {
  const sceneInput = extractSceneInput(body);
  const result = recoverSceneDocument(sceneInput);
  if (!result.ok) {
    throw validationError(result.errors, summarizeSceneInputDimensions(sceneInput));
  }

  return {
    ...result,
    dimensions: summarizeSceneSourceDimensions(result.scene),
  };
}

export function summarizeSceneExport(body: unknown) {
  const sceneInput = extractSceneInput(body);
  const result = recoverSceneDocument(sceneInput);
  if (!result.ok) {
    throw validationError(result.errors, summarizeSceneInputDimensions(sceneInput));
  }

  return {
    summary: buildImageExportSummary(result.scene),
    dimensions: summarizeSceneSourceDimensions(result.scene),
  };
}

export function encodeScene(body: unknown) {
  const sceneInput = extractSceneInput(body);
  const result = recoverSceneDocument(sceneInput);
  if (!result.ok) {
    throw validationError(result.errors, summarizeSceneInputDimensions(sceneInput));
  }

  const sceneString = encodeSceneDocumentString(result.scene);

  return {
    sceneString,
    codecRevision: getSceneStringRevision(sceneString),
    dimensions: summarizeSceneSourceDimensions(result.scene),
  };
}

export function decodeScene(body: unknown) {
  const input = asRecord(body);
  const sceneString = (stringValue(input.sceneString) ?? stringValue(input.value))?.trim();
  if (!sceneString) {
    throw new ApiRequestError(400, 'missing_scene_string', 'Request body must include sceneString.');
  }

  const result = decodeSceneDocumentString(sceneString);
  if (!result.ok) {
    throw validationError(result.errors, summarizeSceneStringInputDimensions(sceneString));
  }

  return {
    ...result,
    codecRevision: getSceneStringRevision(sceneString),
    dimensions: summarizeSceneSourceDimensions(result.scene),
  };
}

function extractSceneInput(body: unknown): unknown {
  const input = asRecord(body);
  return 'scene' in input ? input.scene : body;
}

function validationError(
  errors: SceneDocumentValidationError[],
  dimensions: SceneDimensionsSummary | null = null,
): ApiRequestError {
  return new ApiRequestError(
    422,
    'scene_validation_failed',
    'SceneDocument validation failed.',
    errors.map(toApiValidationError),
    dimensions ? { dimensions } : null,
  );
}

function getSceneStringRevision(sceneString: string): 'PSE1' | 'PSE2' {
  return sceneString.startsWith('PSE2~') ? 'PSE2' : 'PSE1';
}

function toApiValidationError(error: SceneDocumentValidationError): ApiError {
  return {
    code: 'scene_validation_failed',
    message: 'SceneDocument validation failed.',
    fieldPath: error.fieldPath,
    expected: error.expected,
    reason: error.reason,
    recoveryAction: error.recoveryAction,
    conflictType: error.conflictType,
    instanceId: error.instanceId,
    assetId: error.assetId,
    buildingLevelId: error.buildingLevelId,
    coordinates: error.coordinates?.map((coordinate) => ({ x: coordinate.x, y: coordinate.y })),
    blockingInstanceId: error.blockingInstanceId,
    blockingAssetId: error.blockingAssetId,
    blockingBuildingLevelId: error.blockingBuildingLevelId,
    surfaceKind: error.surfaceKind,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function booleanValue(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}
