import type { SceneDocument } from '../domain/scene';
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

export function applyRecoveredSceneDocument(
  currentScene: SceneDocument,
  input: unknown,
  options: ApplyRecoveredSceneDocumentOptions,
): SceneRecoveryApplyResult {
  if (options.interactionMode === 'readOnly') {
    return {
      ok: false,
      status: 'error',
      scene: currentScene,
      errors: [
        {
          fieldPath: '$',
          expected: 'desktop edit mode',
          actual: 'readOnly',
          reason: 'Read-only mode cannot replace the current scene.',
          recoveryAction: 'Use desktop edit mode to recover scene data.',
        },
      ],
      availableActions: ['cancel', 'view-details'],
    };
  }

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
  return {
    ...payload,
    workspaceState: {
      ...payload.workspaceState,
      saveError: null,
    },
  };
}

export function parseSceneDocumentForRecovery(input: unknown): SceneDocumentParseResult {
  return parseSceneDocument(input);
}
