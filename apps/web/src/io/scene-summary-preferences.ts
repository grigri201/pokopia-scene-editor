export const sceneSummaryPreferencesStorageKey = 'pokopia.sceneSummary.v1';

const sceneSummaryPreferencesSchemaVersion = 1;

export interface SceneSummaryPreferences {
  schemaVersion: typeof sceneSummaryPreferencesSchemaVersion;
  expanded: boolean;
}

export function getDefaultSceneSummaryPreferences(): SceneSummaryPreferences {
  return {
    schemaVersion: sceneSummaryPreferencesSchemaVersion,
    expanded: false,
  };
}

export function readSceneSummaryPreferencesFromStorage(storage: Storage | null): SceneSummaryPreferences {
  if (!storage) {
    return getDefaultSceneSummaryPreferences();
  }

  try {
    const rawPreferences = storage.getItem(sceneSummaryPreferencesStorageKey);
    if (rawPreferences === null) {
      return getDefaultSceneSummaryPreferences();
    }

    return normalizeSceneSummaryPreferences(JSON.parse(rawPreferences));
  } catch {
    return getDefaultSceneSummaryPreferences();
  }
}

export function writeSceneSummaryExpandedPreferenceToStorage(
  storage: Storage | null,
  expanded: boolean,
): SceneSummaryPreferences {
  const nextPreferences: SceneSummaryPreferences = {
    schemaVersion: sceneSummaryPreferencesSchemaVersion,
    expanded,
  };

  if (!storage) {
    return nextPreferences;
  }

  try {
    storage.setItem(sceneSummaryPreferencesStorageKey, JSON.stringify(nextPreferences));
  } catch {
    // Scene summary preferences are UI-only and must never block scene editing.
  }

  return nextPreferences;
}

function normalizeSceneSummaryPreferences(value: unknown): SceneSummaryPreferences {
  const defaultPreferences = getDefaultSceneSummaryPreferences();
  if (!isRecord(value) || value.schemaVersion !== sceneSummaryPreferencesSchemaVersion) {
    return defaultPreferences;
  }

  return {
    schemaVersion: sceneSummaryPreferencesSchemaVersion,
    expanded: typeof value.expanded === 'boolean' ? value.expanded : defaultPreferences.expanded,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
