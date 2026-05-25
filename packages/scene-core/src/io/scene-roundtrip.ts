import type { SceneDocument } from '../domain/scene';
import {
  parseSceneDocument,
  type SceneDocumentV1,
  type SceneDocumentValidationError,
} from './scene-schema';
import { recoverSceneDocument } from './scene-recovery';
import { createSceneDocumentV1PayloadInput, serializeSceneDocument } from './scene-serializer';

export type SceneDocumentRoundtripResult =
  | {
      ok: true;
      sourcePayload: SceneDocumentV1;
      recoveredScene: SceneDocument;
      roundtrippedPayload: SceneDocumentV1;
    }
  | {
      ok: false;
      errors: SceneDocumentValidationError[];
    };

export function roundtripSceneDocument(scene: SceneDocument): SceneDocumentRoundtripResult {
  const sourcePayloadInput = createSceneDocumentV1PayloadInput(scene);
  const parsedSourcePayload = parseSceneDocument(sourcePayloadInput);

  if (!parsedSourcePayload.ok) {
    return {
      ok: false,
      errors: parsedSourcePayload.errors,
    };
  }

  const sourcePayload = parsedSourcePayload.scene;
  const recovered = recoverSceneDocument(sourcePayload);
  if (!recovered.ok) {
    return {
      ok: false,
      errors: recovered.errors,
    };
  }

  try {
    return {
      ok: true,
      sourcePayload,
      recoveredScene: recovered.scene,
      roundtrippedPayload: serializeSceneDocument(recovered.scene),
    };
  } catch (error) {
    return {
      ok: false,
      errors: [createRoundtripError('reserialize', error)],
    };
  }
}

function createRoundtripError(stage: 'serialize' | 'reserialize', error: unknown): SceneDocumentValidationError {
  return {
    fieldPath: '$',
    expected: 'SceneDocument v1 roundtrip-compatible scene',
    actual: error instanceof Error ? error.message : String(error),
    reason: `Unable to ${stage} SceneDocument v1 payload.`,
    recoveryAction: 'Fix the scene document fields before running roundtrip validation.',
  };
}
