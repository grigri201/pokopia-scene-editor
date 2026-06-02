import {
  buildImageExportSummary,
  type ImageExportSummary,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import {
  readLatestSceneDocumentFromStorage,
  type RecoveryError,
} from '../../io';
import type { Locale } from '../../i18n';

export type MobilePreviewState =
  | {
      status: 'empty';
      reason: 'no-stored-scene' | 'storage-unavailable';
    }
  | {
      status: 'remote-loading';
      sceneId: string;
    }
  | {
      status: 'remote-error';
      message: string;
      errors?: RecoveryError[];
    }
  | {
      status: 'remote-lossy';
      droppedTileDetails: string[];
    }
  | {
      status: 'preview-ready';
      scene: SceneDocument;
      summary: ImageExportSummary;
    }
  | {
      status: 'invalid';
      errors: RecoveryError[];
    };

export function resolveMobilePreviewState(
  storage: Storage | null,
  locale: Locale,
  currentDraftScene: SceneDocument | null = null,
): MobilePreviewState {
  if (!storage) {
    if (currentDraftScene) {
      return createPreviewReadyState(currentDraftScene, locale);
    }

    return {
      status: 'empty',
      reason: 'storage-unavailable',
    };
  }

  const storedScene = readLatestSceneDocumentFromStorage(storage);
  if (!storedScene) {
    if (currentDraftScene) {
      return createPreviewReadyState(currentDraftScene, locale);
    }

    return {
      status: 'empty',
      reason: 'no-stored-scene',
    };
  }

  if (!storedScene.ok) {
    return {
      status: 'invalid',
      errors: storedScene.errors,
    };
  }

  if (currentDraftScene && isSceneNewerThanPayload(currentDraftScene, storedScene.payload.metadata.updatedAt)) {
    return createPreviewReadyState(currentDraftScene, locale);
  }

  return createPreviewReadyState(storedScene.scene, locale);
}

function createPreviewReadyState(
  scene: SceneDocument,
  locale: Locale,
): MobilePreviewState {
  try {
    return {
      status: 'preview-ready',
      scene,
      summary: buildImageExportSummary(scene, locale),
    };
  } catch (error) {
    return {
      status: 'invalid',
      errors: [
        {
          fieldPath: '$',
          expected: 'ImageExportSummary',
          actual: error instanceof Error ? error.message : 'unknown export summary error',
          reason: 'Stored scene could not be prepared for mobile preview.',
          recoveryAction: 'Import a valid scene string to replace the stored scene.',
        },
      ],
    };
  }
}

function isSceneNewerThanPayload(scene: SceneDocument, payloadUpdatedAt: string): boolean {
  const sceneUpdatedAtMs = Date.parse(scene.metadata.updatedAt);
  const payloadUpdatedAtMs = Date.parse(payloadUpdatedAt);

  return Number.isFinite(sceneUpdatedAtMs) && (
    !Number.isFinite(payloadUpdatedAtMs) || sceneUpdatedAtMs > payloadUpdatedAtMs
  );
}
