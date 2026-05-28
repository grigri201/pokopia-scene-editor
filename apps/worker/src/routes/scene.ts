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

export function generateScene(body: unknown) {
  const input = asRecord(body);

  return {
    scene: createDefaultSceneDocument({
      sceneId: stringValue(input.sceneId) ?? undefined,
      sceneName: stringValue(input.sceneName) ?? undefined,
      selectedPokemonKey: stringValue(input.selectedPokemonKey) ?? undefined,
      now: stringValue(input.now) ?? undefined,
      includeOpenDesignDemo: booleanValue(input.includeOpenDesignDemo) ?? false,
    }),
  };
}

export function validateScene(body: unknown) {
  const errors = validateSceneDocument(extractSceneInput(body));

  return {
    valid: errors.length === 0,
    errors: errors.map(toApiValidationError),
  };
}

export function recoverScene(body: unknown) {
  const result = recoverSceneDocument(extractSceneInput(body));
  if (!result.ok) {
    throw validationError(result.errors);
  }

  return result;
}

export function summarizeSceneExport(body: unknown) {
  const result = recoverSceneDocument(extractSceneInput(body));
  if (!result.ok) {
    throw validationError(result.errors);
  }

  return {
    summary: buildImageExportSummary(result.scene),
  };
}

export function encodeScene(body: unknown) {
  const result = recoverSceneDocument(extractSceneInput(body));
  if (!result.ok) {
    throw validationError(result.errors);
  }

  return {
    sceneString: encodeSceneDocumentString(result.scene),
  };
}

export function decodeScene(body: unknown) {
  const input = asRecord(body);
  const sceneString = stringValue(input.sceneString) ?? stringValue(input.value);
  if (!sceneString) {
    throw new ApiRequestError(400, 'missing_scene_string', 'Request body must include sceneString.');
  }

  const result = decodeSceneDocumentString(sceneString);
  if (!result.ok) {
    throw validationError(result.errors);
  }

  return result;
}

function extractSceneInput(body: unknown): unknown {
  const input = asRecord(body);
  return 'scene' in input ? input.scene : body;
}

function validationError(errors: SceneDocumentValidationError[]): ApiRequestError {
  return new ApiRequestError(422, 'scene_validation_failed', 'SceneDocument validation failed.', errors.map(toApiValidationError));
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
