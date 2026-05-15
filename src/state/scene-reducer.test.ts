import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import {
  moveCoordinate,
  saveScene,
  sceneReducer,
  selectAsset,
  selectCoordinate,
  selectPokemon,
  updateSceneName,
} from './scene-reducer';

describe('scene reducer selection rules', () => {
  it('selects a coordinate without dirtying scene content', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const tileInstances = [
      createTileInstance({
        instanceId: 'tile-1',
        assetId: 'wooden-floor',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ];
    const sceneWithTile = { ...scene, tileInstances };
    const selected = selectCoordinate(sceneWithTile, { x: 3, y: 4 }, 'edit');

    expect(selected.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 4 });
    expect(selected.workspaceState.saveStatus).toBe('saved');
    expect(selected.tileInstances).toBe(tileInstances);
    expect(selected.buildingLevels).toBe(scene.buildingLevels);
  });

  it('normalizes selected coordinates before writing workspace state', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const richCoordinate = { x: 2, y: 3, id: '2-3', areaType: 'main' };
    const selected = selectCoordinate(scene, richCoordinate, 'edit');

    expect(selected.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
  });

  it('guards scene selection writes in read-only mode', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const tileInstances = [
      createTileInstance({
        instanceId: 'tile-1',
        assetId: 'wooden-floor',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ];
    const sceneWithTile = { ...scene, tileInstances };

    const selected = selectCoordinate(sceneWithTile, { x: 3, y: 4 }, 'readOnly');
    const reduced = sceneReducer(sceneWithTile, {
      type: 'select-coordinate',
      coordinate: { x: 4, y: 4 },
      interactionMode: 'readOnly',
    });

    expect(selected).toBe(sceneWithTile);
    expect(reduced).toBe(sceneWithTile);
    expect(sceneWithTile.workspaceState.selectedCoordinate).toBeNull();
    expect(sceneWithTile.workspaceState.saveStatus).toBe('saved');
    expect(sceneWithTile.tileInstances).toBe(tileInstances);
    expect(sceneWithTile.buildingLevels).toBe(scene.buildingLevels);
  });

  it('rejects invalid selected coordinates', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(() => selectCoordinate(scene, { x: 7, y: 0 }, 'edit')).toThrow(RangeError);
    expect(selectCoordinate(scene, { x: 7, y: 0 }, 'readOnly')).toBe(scene);
  });

  it('moves a keyboard coordinate within canvas bounds', () => {
    expect(moveCoordinate({ x: 3, y: 3 }, 'right')).toEqual({ x: 4, y: 3 });
    expect(moveCoordinate({ x: 0, y: 0 }, 'left')).toEqual({ x: 0, y: 0 });
    expect(moveCoordinate({ x: 6, y: 6 }, 'down')).toEqual({ x: 6, y: 6 });
  });

  it('marks scene controls dirty and saved through guarded commands', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const renamed = updateSceneName(scene, 'Garden 5x5 Layout', 'edit', '2026-05-16T08:00:00.000Z');
    const themed = selectPokemon(renamed, 'eevee', 'edit', '2026-05-16T08:01:00.000Z');
    const saved = saveScene(themed, 'edit', '2026-05-16T08:02:00.000Z');

    expect(renamed.sceneName).toBe('Garden 5x5 Layout');
    expect(renamed.workspaceState.saveStatus).toBe('dirty');
    expect(renamed.workspaceState.saveError).toBeNull();
    expect(themed.selectedPokemonKey).toBe('eevee');
    expect(themed.workspaceState.saveStatus).toBe('dirty');
    expect(saved.workspaceState.saveStatus).toBe('saved');
    expect(saved.workspaceState.saveError).toBeNull();
    expect(saved.metadata.lastSavedAt).toBe('2026-05-16T08:02:00.000Z');
  });

  it('selects the current placement asset through guarded scene workspace state', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const selected = selectAsset(scene, 'garden-plant', 'edit', '2026-05-16T08:00:00.000Z');
    const reduced = sceneReducer(scene, {
      type: 'select-asset',
      assetId: 'wooden-floor',
      interactionMode: 'edit',
      now: '2026-05-16T08:01:00.000Z',
    });

    expect(selected.workspaceState.selectedAssetId).toBe('garden-plant');
    expect(selected.tileInstances).toEqual([]);
    expect(selected.workspaceState.saveStatus).toBe('dirty');
    expect(reduced.workspaceState.selectedAssetId).toBe('wooden-floor');
    expect(reduced.workspaceState.saveStatus).toBe('dirty');
  });

  it('guards selected asset writes in read-only mode and rejects unknown assets', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(selectAsset(scene, 'garden-plant', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(() => selectAsset(scene, 'missing-asset', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
      RangeError,
    );
  });

  it('tracks save failure and clears the failure on the next scene edit', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const failed = saveScene(
      scene,
      'edit',
      '2026-05-16T08:00:00.000Z',
      'failure',
      'Local storage unavailable.',
    );
    const recovered = selectPokemon(failed, 'pikachu', 'edit', '2026-05-16T08:01:00.000Z');

    expect(failed.workspaceState.saveStatus).toBe('saveError');
    expect(failed.workspaceState.saveError).toBe('Local storage unavailable.');
    expect(failed.metadata.lastSavedAt).toBe('2026-05-16T07:00:00.000Z');
    expect(recovered.workspaceState.saveStatus).toBe('dirty');
    expect(recovered.workspaceState.saveError).toBeNull();
  });

  it('rejects scene names that do not label the 5x5 scene size', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(() => updateSceneName(scene, 'Garden layout', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
      RangeError,
    );
  });

  it('blocks scene control writes in read-only mode', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(updateSceneName(scene, 'Blocked 5x5 Layout', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(selectPokemon(scene, 'pikachu', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(saveScene(scene, 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
  });
});
