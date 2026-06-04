import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  assetStagingPreferencesStorageKey,
  getDefaultAssetStagingPreferences,
  readAssetStagingPreferencesFromStorage,
  writeAssetStagingPreferencesToStorage,
} from './asset-staging-preferences';
import { autosavedSceneStorageKey, savedSceneStorageKey } from './scene-storage';

describe('Asset staging preferences storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('returns defaults when staging preferences are missing or storage is unavailable', () => {
    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual(
      getDefaultAssetStagingPreferences(),
    );
    expect(readAssetStagingPreferencesFromStorage(null)).toEqual(
      getDefaultAssetStagingPreferences(),
    );
  });

  it('writes and restores staging preferences in a scene-storage-isolated namespace', () => {
    const preferences = writeAssetStagingPreferencesToStorage(window.localStorage, {
      stagedAssetIds: ['wooden-bench', 'pecha-berry'],
      expanded: true,
    });

    expect(preferences).toEqual({
      schemaVersion: 1,
      stagedAssetIds: ['wooden-bench', 'pecha-berry'],
      expanded: true,
    });
    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual(preferences);
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).not.toBeNull();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
  });

  it('normalizes unknown and duplicate staged asset ids on read', () => {
    window.localStorage.setItem(
      assetStagingPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        stagedAssetIds: ['missing-asset', 'pecha-berry', 'wooden-bench', 'pecha-berry'],
        expanded: true,
      }),
    );

    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      stagedAssetIds: ['pecha-berry', 'wooden-bench'],
      expanded: true,
    });
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).toBe(
      JSON.stringify({
        schemaVersion: 1,
        stagedAssetIds: ['pecha-berry', 'wooden-bench'],
        expanded: true,
      }),
    );
  });

  it('can skip normalized writes for read-only startup paths', () => {
    const rawPreferences = JSON.stringify({
      schemaVersion: 1,
      stagedAssetIds: ['missing-asset', 'pecha-berry', 'pecha-berry'],
      expanded: 'yes',
    });
    window.localStorage.setItem(assetStagingPreferencesStorageKey, rawPreferences);

    expect(readAssetStagingPreferencesFromStorage(window.localStorage, { persistNormalized: false })).toEqual({
      schemaVersion: 1,
      stagedAssetIds: ['pecha-berry'],
      expanded: false,
    });
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).toBe(rawPreferences);
  });

  it('falls back to defaults for invalid JSON and expired schema versions', () => {
    window.localStorage.setItem(assetStagingPreferencesStorageKey, '{not-json');
    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual(
      getDefaultAssetStagingPreferences(),
    );

    window.localStorage.setItem(
      assetStagingPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 0,
        stagedAssetIds: ['pecha-berry'],
        expanded: true,
      }),
    );
    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual(
      getDefaultAssetStagingPreferences(),
    );
  });

  it('treats read and write failures as best-effort UI preference fallbacks', () => {
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

    expect(readAssetStagingPreferencesFromStorage(throwingReadStorage)).toEqual(
      getDefaultAssetStagingPreferences(),
    );
    expect(() =>
      writeAssetStagingPreferencesToStorage(throwingWriteStorage, {
        stagedAssetIds: ['pecha-berry'],
        expanded: true,
      }),
    ).not.toThrow();
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
