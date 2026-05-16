import {
  areaLabels,
  assetCategoryLabels,
  assetSkillTypes,
  defaultAssetFilters,
  type AssetAreaFilter,
  type AssetCategoryFilter,
  type AssetFilterState,
  type AssetSkillFilter,
} from '../domain/assets';

export const uiPreferencesStorageKey = 'pokopia.uiPreferences.v1';

const uiPreferencesSchemaVersion = 1;

export type PreviewLayerScope = 'current-layer' | 'all-visible-layers';

export interface PreviewDisplayOptions {
  grid: boolean;
  mainBoundary: boolean;
  skillMarkers: boolean;
}

export interface PreviewUiPreferences {
  displayOptions: PreviewDisplayOptions;
  layerScope: PreviewLayerScope;
}

export interface UiPreferences {
  schemaVersion: typeof uiPreferencesSchemaVersion;
  assetFilters: AssetFilterState;
  preview: PreviewUiPreferences;
}

export function getDefaultUiPreferences(): UiPreferences {
  return {
    schemaVersion: uiPreferencesSchemaVersion,
    assetFilters: { ...defaultAssetFilters },
    preview: {
      displayOptions: {
        grid: true,
        mainBoundary: true,
        skillMarkers: true,
      },
      layerScope: 'current-layer',
    },
  };
}

export function getUiPreferencesStorage(): Storage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readUiPreferencesFromStorage(storage: Storage | null): UiPreferences {
  if (!storage) {
    return getDefaultUiPreferences();
  }

  let rawPreferences: string | null;
  try {
    rawPreferences = storage.getItem(uiPreferencesStorageKey);
  } catch {
    return getDefaultUiPreferences();
  }

  if (rawPreferences === null) {
    return getDefaultUiPreferences();
  }

  try {
    return normalizeUiPreferences(JSON.parse(rawPreferences));
  } catch {
    return getDefaultUiPreferences();
  }
}

export function writeAssetFilterPreferencesToStorage(
  storage: Storage | null,
  assetFilters: AssetFilterState,
): UiPreferences {
  const currentPreferences = readUiPreferencesFromStorage(storage);
  const nextPreferences = {
    ...currentPreferences,
    assetFilters: normalizeAssetFilters(assetFilters, currentPreferences.assetFilters),
  };

  writeUiPreferencesToStorage(storage, nextPreferences);

  return nextPreferences;
}

export function writePreviewDisplayOptionsToStorage(
  storage: Storage | null,
  displayOptions: PreviewDisplayOptions,
): UiPreferences {
  const currentPreferences = readUiPreferencesFromStorage(storage);
  const nextPreferences = {
    ...currentPreferences,
    preview: {
      ...currentPreferences.preview,
      displayOptions: normalizePreviewDisplayOptions(
        displayOptions,
        currentPreferences.preview.displayOptions,
      ),
    },
  };

  writeUiPreferencesToStorage(storage, nextPreferences);

  return nextPreferences;
}

export function writePreviewLayerScopePreferenceToStorage(
  storage: Storage | null,
  layerScope: PreviewLayerScope,
): UiPreferences {
  const currentPreferences = readUiPreferencesFromStorage(storage);
  const nextPreferences = {
    ...currentPreferences,
    preview: {
      ...currentPreferences.preview,
      layerScope: isPreviewLayerScope(layerScope) ? layerScope : currentPreferences.preview.layerScope,
    },
  };

  writeUiPreferencesToStorage(storage, nextPreferences);

  return nextPreferences;
}

function writeUiPreferencesToStorage(storage: Storage | null, preferences: UiPreferences): void {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(uiPreferencesStorageKey, JSON.stringify(preferences));
  } catch {
    // UI preferences are best-effort and must never block SceneDocument recovery.
  }
}

function normalizeUiPreferences(value: unknown): UiPreferences {
  const defaultPreferences = getDefaultUiPreferences();

  if (!isRecord(value) || value.schemaVersion !== uiPreferencesSchemaVersion) {
    return defaultPreferences;
  }

  return {
    schemaVersion: uiPreferencesSchemaVersion,
    assetFilters: normalizeAssetFilters(value.assetFilters, defaultPreferences.assetFilters),
    preview: normalizePreviewPreferences(value.preview, defaultPreferences.preview),
  };
}

function normalizeAssetFilters(
  value: unknown,
  fallback: AssetFilterState,
): AssetFilterState {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  return {
    query: typeof value.query === 'string' ? value.query : fallback.query,
    category: isAssetCategoryFilter(value.category) ? value.category : fallback.category,
    area: isAssetAreaFilter(value.area) ? value.area : fallback.area,
    favoriteOnly: typeof value.favoriteOnly === 'boolean' ? value.favoriteOnly : fallback.favoriteOnly,
    skill: isAssetSkillFilter(value.skill) ? value.skill : fallback.skill,
  };
}

function normalizePreviewPreferences(
  value: unknown,
  fallback: PreviewUiPreferences,
): PreviewUiPreferences {
  if (!isRecord(value)) {
    return {
      displayOptions: { ...fallback.displayOptions },
      layerScope: fallback.layerScope,
    };
  }

  return {
    displayOptions: normalizePreviewDisplayOptions(value.displayOptions, fallback.displayOptions),
    layerScope: isPreviewLayerScope(value.layerScope) ? value.layerScope : fallback.layerScope,
  };
}

function normalizePreviewDisplayOptions(
  value: unknown,
  fallback: PreviewDisplayOptions,
): PreviewDisplayOptions {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  return {
    grid: typeof value.grid === 'boolean' ? value.grid : fallback.grid,
    mainBoundary: typeof value.mainBoundary === 'boolean' ? value.mainBoundary : fallback.mainBoundary,
    skillMarkers: typeof value.skillMarkers === 'boolean' ? value.skillMarkers : fallback.skillMarkers,
  };
}

function isAssetCategoryFilter(value: unknown): value is AssetCategoryFilter {
  return value === 'all' || (typeof value === 'string' && hasOwnKey(assetCategoryLabels, value));
}

function isAssetAreaFilter(value: unknown): value is AssetAreaFilter {
  return value === 'all' || (typeof value === 'string' && hasOwnKey(areaLabels, value));
}

function isAssetSkillFilter(value: unknown): value is AssetSkillFilter {
  return (
    value === 'all' ||
    value === 'requires-skill' ||
    value === 'skill-candidate' ||
    (typeof value === 'string' && assetSkillTypes.includes(value as never))
  );
}

function isPreviewLayerScope(value: unknown): value is PreviewLayerScope {
  return value === 'current-layer' || value === 'all-visible-layers';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwnKey(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
