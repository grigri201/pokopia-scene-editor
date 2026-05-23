import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getDefaultUiPreferences,
  readUiPreferencesFromStorage,
  uiPreferencesStorageKey,
  writeAssetFilterPreferencesToStorage,
  writeLocalePreferenceToStorage,
} from './ui-preferences';

describe('UI preferences storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults when preferences are missing or storage is unavailable', () => {
    expect(readUiPreferencesFromStorage(window.localStorage)).toEqual(getDefaultUiPreferences());
    expect(readUiPreferencesFromStorage(null)).toEqual(getDefaultUiPreferences());
  });

  it('treats storage read and write failures as best-effort UI preference fallbacks', () => {
    const throwingReadStorage = createStorageDouble({
      getItem: () => {
        throw new Error('Storage read blocked.');
      },
    });
    const throwingWriteStorage = createStorageDouble({
      setItem: () => {
        throw new Error('Storage write blocked.');
      },
    });

    expect(readUiPreferencesFromStorage(throwingReadStorage)).toEqual(getDefaultUiPreferences());
    expect(() =>
      writeAssetFilterPreferencesToStorage(throwingWriteStorage, {
        query: 'roof',
        category: 'buildings',
        favoriteOnly: true,
      }),
    ).not.toThrow();
  });

  it('writes and restores asset filter preferences from an isolated namespace', () => {
    const preferences = writeAssetFilterPreferencesToStorage(window.localStorage, {
      query: 'roof',
      category: 'buildings',
      favoriteOnly: true,
    });

    expect(preferences.assetFilters).toEqual({
      query: 'roof',
      category: 'buildings',
      favoriteOnly: true,
    });
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toBeNull();
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toEqual(preferences.assetFilters);
  });

  it('stores only asset filters and omits preview display preferences', () => {
    const preferences = writeAssetFilterPreferencesToStorage(window.localStorage, {
      query: 'plant',
      category: 'misc',
      favoriteOnly: false,
    });
    const rawPreferences = window.localStorage.getItem(uiPreferencesStorageKey);

    expect(preferences.assetFilters).toEqual({
      query: 'plant',
      category: 'misc',
      favoriteOnly: false,
    });
    expect(rawPreferences).not.toBeNull();
    expect(rawPreferences).not.toContain('preview');
    expect(rawPreferences).not.toContain('displayOptions');
    expect(rawPreferences).not.toContain('grid');
    expect(rawPreferences).not.toContain('mainBoundary');
    expect(rawPreferences).not.toContain('skillMarkers');
    expect(rawPreferences).not.toContain('area');
    expect(rawPreferences).not.toContain('skill');
  });

  it('falls back to defaults for invalid JSON and expired schema versions', () => {
    window.localStorage.setItem(uiPreferencesStorageKey, '{not-json');
    expect(readUiPreferencesFromStorage(window.localStorage)).toEqual(getDefaultUiPreferences());

    window.localStorage.setItem(
      uiPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 0,
        assetFilters: { query: 'stale' },
      }),
    );
    expect(readUiPreferencesFromStorage(window.localStorage)).toEqual(getDefaultUiPreferences());
  });

  it('keeps valid fields while defaulting malformed preference fields', () => {
    window.localStorage.setItem(
      uiPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        assetFilters: {
          query: 'wall',
          category: 'unknown-category',
          area: 'outer',
          favoriteOnly: 'yes',
          skill: 'unknown-skill',
        },
        preview: {
          displayOptions: {
            grid: false,
            mainBoundary: 'yes',
            skillMarkers: false,
          },
          layerScope: 'unknown-scope',
        },
      }),
    );

    expect(readUiPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      assetFilters: {
        query: 'wall',
        category: 'all',
        favoriteOnly: false,
      },
      locale: 'zh-CN',
    });
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toContain('preview');
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toContain('displayOptions');
  });

  it('migrates legacy preview display preferences to asset-filter-only storage on read', () => {
    window.localStorage.setItem(
      uiPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        assetFilters: {
          query: 'bench',
          category: 'furniture',
          area: 'outer',
          favoriteOnly: false,
          skill: 'skill-candidate',
        },
        preview: {
          displayOptions: {
            grid: true,
            mainBoundary: true,
            skillMarkers: false,
          },
        },
      }),
    );

    expect(readUiPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      assetFilters: {
        query: 'bench',
        category: 'furniture',
        favoriteOnly: false,
      },
      locale: 'zh-CN',
    });
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBe(
      JSON.stringify({
        schemaVersion: 1,
        assetFilters: {
          query: 'bench',
          category: 'furniture',
          favoriteOnly: false,
        },
        locale: 'zh-CN',
      }),
    );
  });

  it('stores locale in UI preferences without disturbing asset filters', () => {
    writeAssetFilterPreferencesToStorage(window.localStorage, {
      query: 'roof',
      category: 'buildings',
      favoriteOnly: true,
    });

    const preferences = writeLocalePreferenceToStorage(window.localStorage, 'en-US');

    expect(preferences).toEqual({
      schemaVersion: 1,
      assetFilters: {
        query: 'roof',
        category: 'buildings',
        favoriteOnly: true,
      },
      locale: 'en-US',
    });
    expect(readUiPreferencesFromStorage(window.localStorage).locale).toBe('en-US');
  });
});

function createStorageDouble(overrides: Partial<Storage>): Storage {
  return {
    length: 0,
    clear: () => undefined,
    getItem: () => null,
    key: () => null,
    removeItem: () => undefined,
    setItem: () => undefined,
    ...overrides,
  };
}
