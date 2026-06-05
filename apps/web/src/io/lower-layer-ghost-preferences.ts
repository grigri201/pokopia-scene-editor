export const lowerLayerGhostPreferencesStorageKey = 'pokopia.lowerLayerGhost.v1';

const lowerLayerGhostPreferencesSchemaVersion = 1;

export interface LowerLayerGhostPreferences {
  schemaVersion: typeof lowerLayerGhostPreferencesSchemaVersion;
  enabled: boolean;
}

export function getDefaultLowerLayerGhostPreferences(): LowerLayerGhostPreferences {
  return {
    schemaVersion: lowerLayerGhostPreferencesSchemaVersion,
    enabled: true,
  };
}

export function readLowerLayerGhostPreferencesFromStorage(storage: Storage | null): LowerLayerGhostPreferences {
  if (!storage) {
    return getDefaultLowerLayerGhostPreferences();
  }

  try {
    const rawPreferences = storage.getItem(lowerLayerGhostPreferencesStorageKey);
    if (rawPreferences === null) {
      return getDefaultLowerLayerGhostPreferences();
    }

    return normalizeLowerLayerGhostPreferences(JSON.parse(rawPreferences));
  } catch {
    return getDefaultLowerLayerGhostPreferences();
  }
}

export function writeLowerLayerGhostEnabledPreferenceToStorage(
  storage: Storage | null,
  enabled: boolean,
): LowerLayerGhostPreferences {
  const nextPreferences: LowerLayerGhostPreferences = {
    schemaVersion: lowerLayerGhostPreferencesSchemaVersion,
    enabled,
  };

  if (!storage) {
    return nextPreferences;
  }

  try {
    storage.setItem(lowerLayerGhostPreferencesStorageKey, JSON.stringify(nextPreferences));
  } catch {
    // Lower-layer ghost preferences are UI-only and must never block scene editing.
  }

  return nextPreferences;
}

function normalizeLowerLayerGhostPreferences(value: unknown): LowerLayerGhostPreferences {
  const defaultPreferences = getDefaultLowerLayerGhostPreferences();
  if (!isRecord(value) || value.schemaVersion !== lowerLayerGhostPreferencesSchemaVersion) {
    return defaultPreferences;
  }

  return {
    schemaVersion: lowerLayerGhostPreferencesSchemaVersion,
    enabled: typeof value.enabled === 'boolean' ? value.enabled : defaultPreferences.enabled,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
