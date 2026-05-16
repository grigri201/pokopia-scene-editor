import type { SceneDocument } from '../domain/scene';
import {
  parseSceneDocument,
  type SceneDocumentParseResult,
  type SceneDocumentV1,
  type SceneDocumentValidationError,
} from './scene-schema';

export type SceneRecoveryResult =
  | { ok: true; scene: SceneDocument; payload: SceneDocumentV1 }
  | { ok: false; errors: SceneDocumentValidationError[] };

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
