import {
  buildImageExportSummary,
  createDefaultSceneDocument,
  decodeSceneDocumentString,
  encodeSceneDocumentString,
  recoverSceneDocument,
  validateSceneDocument,
  type SceneDocumentValidationError,
} from '@pokopia-scene-editor/scene-core';
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
    errors,
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
  const firstError = errors[0];
  const error = new ApiRequestError(422, 'scene_validation_failed', 'SceneDocument validation failed.');
  error.apiError.fieldPath = firstError?.fieldPath;
  return error;
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
