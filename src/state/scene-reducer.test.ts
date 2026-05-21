import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import {
  moveCoordinate,
  saveScene,
  sceneReducer,
  selectAsset,
  selectCoordinate,
  selectPokemon,
  setSelectedAsset,
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
        assetId: 'wooden-fencing',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ];
    const sceneWithTile = { ...scene, tileInstances };
    const selected = selectCoordinate(sceneWithTile, { x: 3, y: 4 }, 'edit');

    expect(selected.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 4 });
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

  it('clears the selected coordinate when the current coordinate is selected again', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      selectedCoordinate: { x: 2, y: 3 },
      now: '2026-05-16T07:00:00.000Z',
    });
    const cleared = selectCoordinate(scene, { x: 2, y: 3 }, 'edit');

    expect(cleared.workspaceState.selectedCoordinate).toBeNull();
    expect(cleared.tileInstances).toBe(scene.tileInstances);
    expect(cleared.buildingLevels).toBe(scene.buildingLevels);
  });

  it('guards scene selection writes in read-only mode', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const tileInstances = [
      createTileInstance({
        instanceId: 'tile-1',
        assetId: 'wooden-fencing',
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

  it('updates scene controls and saved metadata through guarded commands', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const renamed = updateSceneName(scene, 'Garden 5x5 Layout', 'edit', '2026-05-16T08:00:00.000Z');
    const themed = selectPokemon(renamed, 'eevee', 'edit', '2026-05-16T08:01:00.000Z');
    const saved = saveScene(themed, 'edit', '2026-05-16T08:02:00.000Z');

    expect(renamed.sceneName).toBe('Garden 5x5 Layout');
    expect(renamed.metadata.updatedAt).toBe('2026-05-16T08:00:00.000Z');
    expect(themed.selectedPokemonKey).toBe('eevee');
    expect(saved.metadata.lastSavedAt).toBe('2026-05-16T08:02:00.000Z');
  });

  it('selects the current placement asset through guarded scene workspace state', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const selected = selectAsset(scene, 'leafy-plant', 'edit', '2026-05-16T08:00:00.000Z');
    const reduced = sceneReducer(scene, {
      type: 'select-asset',
      assetId: 'wooden-fencing',
      interactionMode: 'edit',
      now: '2026-05-16T08:01:00.000Z',
    });

    expect(selected.workspaceState.selectedAssetId).toBe('leafy-plant');
    expect(selected.tileInstances).toEqual([]);
    expect(reduced.workspaceState.selectedAssetId).toBe('wooden-fencing');
  });

  it('clears the placement asset when the current asset is selected again', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const selected = selectAsset(scene, 'wooden-fencing', 'edit', '2026-05-16T08:00:00.000Z');
    const cleared = selectAsset(selected, 'wooden-fencing', 'edit', '2026-05-16T08:01:00.000Z');

    expect(cleared.workspaceState.selectedAssetId).toBeNull();
    expect(cleared.metadata.updatedAt).toBe('2026-05-16T08:01:00.000Z');
  });

  it('sets or clears the placement asset without toggle semantics', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const selected = setSelectedAsset(scene, 'wooden-fencing', 'edit', '2026-05-16T08:00:00.000Z');
    const repeated = setSelectedAsset(selected, 'wooden-fencing', 'edit', '2026-05-16T08:01:00.000Z');
    const cleared = setSelectedAsset(repeated, null, 'edit', '2026-05-16T08:02:00.000Z');

    expect(selected.workspaceState.selectedAssetId).toBe('wooden-fencing');
    expect(repeated).toBe(selected);
    expect(cleared.workspaceState.selectedAssetId).toBeNull();
    expect(cleared.metadata.updatedAt).toBe('2026-05-16T08:02:00.000Z');
  });

  it('guards selected asset writes in read-only mode and rejects unknown assets', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(selectAsset(scene, 'leafy-plant', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(setSelectedAsset(scene, 'leafy-plant', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(() => selectAsset(scene, 'missing-asset', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
      RangeError,
    );
    expect(() => setSelectedAsset(scene, 'missing-asset', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
      RangeError,
    );
  });

  it('rejects empty scene names', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(() => updateSceneName(scene, '   ', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
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
