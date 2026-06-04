import { getAssetById } from '@pokopia-scene-editor/scene-core';

export const assetStagingPreferencesStorageKey = 'pokopia.assetStaging.v1';

const assetStagingPreferencesSchemaVersion = 1;

export interface AssetStagingPreferences {
  schemaVersion: typeof assetStagingPreferencesSchemaVersion;
  stagedAssetIds: string[];
  expanded: boolean;
}

export function getDefaultAssetStagingPreferences(): AssetStagingPreferences {
  return {
    schemaVersion: assetStagingPreferencesSchemaVersion,
    stagedAssetIds: [],
    expanded: false,
  };
}

export function readAssetStagingPreferencesFromStorage(
  storage: Storage | null,
  options: { persistNormalized?: boolean } = {},
): AssetStagingPreferences {
  if (!storage) {
    return getDefaultAssetStagingPreferences();
  }

  let rawPreferences: string | null;
  try {
    rawPreferences = storage.getItem(assetStagingPreferencesStorageKey);
  } catch {
    return getDefaultAssetStagingPreferences();
  }

  if (rawPreferences === null) {
    return getDefaultAssetStagingPreferences();
  }

  try {
    const parsedPreferences = JSON.parse(rawPreferences);
    const normalizedPreferences = normalizeAssetStagingPreferences(parsedPreferences);
    if (
      options.persistNormalized !== false &&
      shouldPersistNormalizedPreferences(parsedPreferences, normalizedPreferences)
    ) {
      writeAssetStagingPreferencesToStorage(storage, normalizedPreferences);
    }

    return normalizedPreferences;
  } catch {
    return getDefaultAssetStagingPreferences();
  }
}

export function writeAssetStagingPreferencesToStorage(
  storage: Storage | null,
  preferences: Pick<AssetStagingPreferences, 'stagedAssetIds' | 'expanded'>,
): AssetStagingPreferences {
  const normalizedPreferences = normalizeAssetStagingPreferences({
    schemaVersion: assetStagingPreferencesSchemaVersion,
    ...preferences,
  });

  if (!storage) {
    return normalizedPreferences;
  }

  try {
    storage.setItem(assetStagingPreferencesStorageKey, JSON.stringify(normalizedPreferences));
  } catch {
    // Staging preferences are UI-only and must never block SceneDocument recovery or autosave.
  }

  return normalizedPreferences;
}

function normalizeAssetStagingPreferences(value: unknown): AssetStagingPreferences {
  const defaultPreferences = getDefaultAssetStagingPreferences();

  if (!isRecord(value) || value.schemaVersion !== assetStagingPreferencesSchemaVersion) {
    return defaultPreferences;
  }

  return {
    schemaVersion: assetStagingPreferencesSchemaVersion,
    stagedAssetIds: normalizeStagedAssetIds(value.stagedAssetIds, defaultPreferences.stagedAssetIds),
    expanded: typeof value.expanded === 'boolean' ? value.expanded : defaultPreferences.expanded,
  };
}

function normalizeStagedAssetIds(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalizedAssetIds: string[] = [];
  const seenAssetIds = new Set<string>();
  for (const assetId of value) {
    if (typeof assetId !== 'string' || seenAssetIds.has(assetId) || !getAssetById(assetId)) {
      continue;
    }

    seenAssetIds.add(assetId);
    normalizedAssetIds.push(assetId);
  }

  return normalizedAssetIds;
}

function shouldPersistNormalizedPreferences(
  value: unknown,
  normalizedPreferences: AssetStagingPreferences,
): boolean {
  if (!isRecord(value) || value.schemaVersion !== assetStagingPreferencesSchemaVersion) {
    return false;
  }

  return JSON.stringify(value) !== JSON.stringify(normalizedPreferences);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
