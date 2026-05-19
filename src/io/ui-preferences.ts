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

export interface UiPreferences {
  schemaVersion: typeof uiPreferencesSchemaVersion;
  assetFilters: AssetFilterState;
}

export function getDefaultUiPreferences(): UiPreferences {
  return {
    schemaVersion: uiPreferencesSchemaVersion,
    assetFilters: { ...defaultAssetFilters },
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

export function readUiPreferencesFromStorage(
  storage: Storage | null,
  options: { persistNormalized?: boolean } = {},
): UiPreferences {
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
    const parsedPreferences = JSON.parse(rawPreferences);
    const normalizedPreferences = normalizeUiPreferences(parsedPreferences);
    if (options.persistNormalized !== false && shouldPersistNormalizedPreferences(parsedPreferences, normalizedPreferences)) {
      writeUiPreferencesToStorage(storage, normalizedPreferences);
    }

    return normalizedPreferences;
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
  };
}

function shouldPersistNormalizedPreferences(value: unknown, normalizedPreferences: UiPreferences): boolean {
  if (!isRecord(value) || value.schemaVersion !== uiPreferencesSchemaVersion) {
    return false;
  }

  return JSON.stringify(value) !== JSON.stringify(normalizedPreferences);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwnKey(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}
