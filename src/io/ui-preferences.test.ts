import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getDefaultUiPreferences,
  readUiPreferencesFromStorage,
  uiPreferencesStorageKey,
  writeAssetFilterPreferencesToStorage,
  writePreviewDisplayOptionsToStorage,
  writePreviewLayerScopePreferenceToStorage,
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
        category: 'wall',
        area: 'outer',
        favoriteOnly: true,
        skill: '耕地',
      }),
    ).not.toThrow();
  });

  it('writes and restores asset filter preferences from an isolated namespace', () => {
    const preferences = writeAssetFilterPreferencesToStorage(window.localStorage, {
      query: 'roof',
      category: 'wall',
      area: 'outer',
      favoriteOnly: true,
      skill: '耕地',
    });

    expect(preferences.assetFilters).toEqual({
      query: 'roof',
      category: 'wall',
      area: 'outer',
      favoriteOnly: true,
      skill: '耕地',
    });
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toBeNull();
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toEqual(preferences.assetFilters);
  });

  it('merges preview display options and layer scope without replacing asset filters', () => {
    writeAssetFilterPreferencesToStorage(window.localStorage, {
      query: 'plant',
      category: 'plant',
      area: 'main',
      favoriteOnly: false,
      skill: '树叶',
    });
    writePreviewDisplayOptionsToStorage(window.localStorage, {
      grid: false,
      mainBoundary: false,
      skillMarkers: true,
    });
    const preferences = writePreviewLayerScopePreferenceToStorage(window.localStorage, 'all-visible-layers');

    expect(preferences.assetFilters).toMatchObject({
      query: 'plant',
      category: 'plant',
      area: 'main',
      skill: '树叶',
    });
    expect(preferences.preview).toEqual({
      displayOptions: {
        grid: false,
        mainBoundary: false,
        skillMarkers: true,
      },
      layerScope: 'all-visible-layers',
    });
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

    expect(readUiPreferencesFromStorage(window.localStorage)).toMatchObject({
      assetFilters: {
        query: 'wall',
        category: 'all',
        area: 'outer',
        favoriteOnly: false,
        skill: 'all',
      },
      preview: {
        displayOptions: {
          grid: false,
          mainBoundary: true,
          skillMarkers: false,
        },
        layerScope: 'current-layer',
      },
    });
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
