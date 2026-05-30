import {
  getAssetById,
  type GridCoordinate,
  type SceneStringDroppedTileInstance,
} from '@pokopia-scene-editor/scene-core';
import type { RecoveryError } from '../../io';
import {
  getAssetDisplay,
  getBuildingLevelDisplayName,
  t,
  type Locale,
} from '../../i18n';

export type RecoveryStatus = 'idle' | 'error' | 'success' | 'canceled';

export function formatDroppedTileInstance(instance: SceneStringDroppedTileInstance, locale: Locale): string {
  const asset = getAssetById(instance.assetId);
  const assetName = asset ? getAssetDisplay(asset, locale).name : instance.assetName;
  const levelName = formatDroppedLevelName(
    instance.buildingLevelName,
    instance.buildingLevelNumber,
    locale,
  );
  const conflictLabel = getDroppedTileConflictLabel(instance.conflictType, locale);
  const coordinateText = formatCoordinate(instance.coordinate);
  const conflictCoordinates = formatCoordinateList(instance.coordinates);
  const blockingAsset = instance.blockingAssetId ? getAssetById(instance.blockingAssetId) : null;
  const blockingAssetName = blockingAsset
    ? getAssetDisplay(blockingAsset, locale).name
    : instance.blockingAssetName;
  const blockingLevelName = instance.blockingBuildingLevelName
    ? formatDroppedLevelName(
        instance.blockingBuildingLevelName,
        instance.blockingBuildingLevelNumber ?? null,
        locale,
      )
    : null;

  if (locale === 'en-US') {
    const blockingText = blockingAssetName
      ? `, blocked by ${blockingLevelName ? `${blockingLevelName} ` : ''}${blockingAssetName}`
      : '';

    return `${levelName} (${coordinateText}) ${assetName}: ${conflictLabel} at ${conflictCoordinates}${blockingText}`;
  }

  const blockingText = blockingAssetName
    ? `，阻挡素材 ${blockingLevelName ? `${blockingLevelName} ` : ''}${blockingAssetName}`
    : '';

  return `${levelName}（${coordinateText}）${assetName}：${conflictLabel}，冲突坐标 ${conflictCoordinates}${blockingText}`;
}

function formatDroppedLevelName(name: string, levelNumber: number | null, locale: Locale): string {
  if (levelNumber === null) {
    return name;
  }

  return getBuildingLevelDisplayName(name, levelNumber, locale);
}

function formatCoordinate(coordinate: GridCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

function formatCoordinateList(coordinates: readonly GridCoordinate[]): string {
  return coordinates.map(formatCoordinate).join(' ');
}

function getDroppedTileConflictLabel(
  conflictType: SceneStringDroppedTileInstance['conflictType'],
  locale: Locale,
): string {
  if (locale === 'en-US') {
    switch (conflictType) {
      case 'footprint-out-of-bounds':
        return 'outside the canvas footprint bounds';
      case 'same-level-footprint-overlap':
        return 'same-layer footprint overlap';
      case 'height-blocked-by-lower-footprint':
        return 'blocked by a lower-layer footprint height';
      case 'unsupported-stack-surface':
        return 'unsupported stacking surface';
      case 'surface-capacity-conflict':
        return 'stacking surface capacity conflict';
    }
  }

  switch (conflictType) {
    case 'footprint-out-of-bounds':
      return '素材占地超出画布';
    case 'same-level-footprint-overlap':
      return '同层占地重叠';
    case 'height-blocked-by-lower-footprint':
      return '被低层素材高度阻挡';
    case 'unsupported-stack-surface':
      return '不能叠放在当前素材上';
    case 'surface-capacity-conflict':
      return '叠放表面容量冲突';
  }
}

export function markSelectionStart(counter: number): string {
  const measureId = `scene-selection-${counter}`;
  performance.mark(`${measureId}-start`);

  return measureId;
}

export function markSelectionVisible(measureId: string): void {
  const startMark = `${measureId}-start`;
  const visibleMark = `${measureId}-visible`;

  if (performance.getEntriesByName(startMark, 'mark').length === 0) {
    return;
  }

  performance.mark(visibleMark);
  performance.clearMeasures('scene-selection-duration');
  performance.clearMeasures(`${measureId}-duration`);
  performance.measure(`${measureId}-duration`, startMark, visibleMark);
  performance.measure('scene-selection-duration', startMark, visibleMark);
  performance.clearMarks(startMark);
  performance.clearMarks(visibleMark);
}

export function waitForPlaywrightImageExportDelay(): Promise<void> {
  const testWindow = window as unknown as { __pokopiaImageExportDelayMs?: number };
  const delayMs = navigator.webdriver && isLocalPreviewHost(window.location.hostname)
    ? testWindow.__pokopiaImageExportDelayMs
    : undefined;

  if (!delayMs || delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
}

export function isLocalPreviewHost(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1' || hostname === '[::1]';
}

export function isMobileReadOnlyApplicationKey(event: KeyboardEvent): boolean {
  const normalizedKey = event.key.toLowerCase();

  return (
    normalizedKey === 'arrowup' ||
    normalizedKey === 'arrowdown' ||
    normalizedKey === 'arrowleft' ||
    normalizedKey === 'arrowright' ||
    normalizedKey === 'enter' ||
    normalizedKey === ' ' ||
    normalizedKey === 'spacebar' ||
    normalizedKey === 'escape' ||
    normalizedKey === 'delete' ||
    normalizedKey === 'backspace' ||
    ((event.metaKey || event.ctrlKey) && normalizedKey === 's')
  );
}

export function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

export function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createStorageUnavailableRecoveryError(): RecoveryError {
  return {
    fieldPath: '$',
    expected: 'browser localStorage',
    actual: 'unavailable',
    reason: 'Saved scene storage is unavailable.',
    recoveryAction: 'Enable localStorage and retry recovery.',
  };
}

export function getRecoveryStatusTitle(status: RecoveryStatus, locale: Locale): string {
  if (status === 'success') {
    return t(locale, 'savedSceneRecovered');
  }

  if (status === 'canceled') {
    return t(locale, 'recoveryCanceled');
  }

  if (status === 'error') {
    return t(locale, 'savedSceneRejected');
  }

  return t(locale, 'recoveryIdle');
}

export function getRecoveryStatusMessage(status: RecoveryStatus, locale: Locale): string {
  if (status === 'success') {
    return t(locale, 'recoverySuccessMessage');
  }

  if (status === 'canceled') {
    return t(locale, 'recoveryCanceledMessage');
  }

  if (status === 'error') {
    return t(locale, 'recoveryErrorMessage');
  }

  return t(locale, 'recoveryIdleMessage');
}

export function createTileInstanceId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCopiedLayerInstancePrefix(): string {
  return `layer-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createLayerNoteId(levelId: string): string {
  return `${levelId}-note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
