import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneDocument,
  defaultSelectedPokemonKey,
  getDefaultSceneDimensions,
} from './default-scene';
import { knownPokemonKeys } from '../assets';

describe('default scene document', () => {
  it('creates a complete SceneDocument for a 5x5 scene on a 7x7 canvas', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T06:20:00.000Z',
    });

    expect(scene.schemaVersion).toBe(1);
    expect(scene.sceneId).toBe('scene-test');
    expect(scene.sceneName).toContain('5x5');
    expect(scene.selectedPokemonKey).toBe(defaultSelectedPokemonKey);
    expect(scene.sceneSize).toEqual({ width: 5, height: 5 });
    expect(scene.canvasSize).toEqual({ width: 7, height: 7 });
    expect(scene.outerPadding).toBe(1);
    expect(scene.tileInstances).toEqual([]);
    expect(scene.buildingLevels.map((level) => level.levelNumber)).toEqual([0, 1, 2]);
    expect(scene.buildingLevels.map((level) => level.id)).toEqual(['level-0', 'level-1', 'level-2']);
  });

  it('initializes workspace state and metadata from a single timestamp', () => {
    const now = '2026-05-16T06:20:00.000Z';
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });

    expect(scene.workspaceState).toEqual({
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: null,
      saveStatus: 'saved',
      saveError: null,
    });
    expect(scene.metadata).toEqual({
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      lastAutosavedAt: null,
    });
  });

  it('allows deterministic test injection without changing default rules', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-custom',
      sceneName: 'Eevee 5x5 orchard',
      selectedPokemonKey: 'eevee',
      selectedCoordinate: { x: 3, y: 4 },
      now: '2026-05-16T06:20:00.000Z',
    });

    expect(scene.sceneId).toBe('scene-custom');
    expect(scene.sceneName).toBe('Eevee 5x5 orchard');
    expect(scene.selectedPokemonKey).toBe('eevee');
    expect(scene.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 4 });
  });

  it('keeps the default Pokemon key inside the known Decor Dex seed keys', () => {
    expect(knownPokemonKeys).toContain(defaultSelectedPokemonKey);
  });

  it('rejects invalid scene name, Pokemon key, coordinate, and timestamp overrides', () => {
    expect(() =>
      createDefaultSceneDocument({
        sceneId: 'scene-test',
        sceneName: '   ',
        now: '2026-05-16T06:20:00.000Z',
      }),
    ).toThrow(RangeError);

    expect(() =>
      createDefaultSceneDocument({
        sceneId: 'scene-test',
        selectedPokemonKey: 'missingno',
        now: '2026-05-16T06:20:00.000Z',
      }),
    ).toThrow(RangeError);

    expect(() =>
      createDefaultSceneDocument({
        sceneId: 'scene-test',
        selectedCoordinate: { x: 99, y: -1 },
        now: '2026-05-16T06:20:00.000Z',
      }),
    ).toThrow(RangeError);

    expect(() =>
      createDefaultSceneDocument({
        sceneId: 'scene-test',
        now: 'not-a-date',
      }),
    ).toThrow(RangeError);
  });

  it('returns a copy of default dimensions instead of a mutable singleton', () => {
    const dimensions = getDefaultSceneDimensions();
    dimensions.canvasSize.width = 99;

    expect(getDefaultSceneDimensions().canvasSize.width).toBe(7);
  });
});
