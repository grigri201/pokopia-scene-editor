import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { moveCoordinate, selectCoordinate } from './scene-reducer';

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
    const selected = selectCoordinate(sceneWithTile, { x: 3, y: 4 });

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
    const selected = selectCoordinate(scene, richCoordinate);

    expect(selected.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
  });

  it('rejects invalid selected coordinates', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(() => selectCoordinate(scene, { x: 7, y: 0 })).toThrow(RangeError);
  });

  it('moves a keyboard coordinate within canvas bounds', () => {
    expect(moveCoordinate({ x: 3, y: 3 }, 'right')).toEqual({ x: 4, y: 3 });
    expect(moveCoordinate({ x: 0, y: 0 }, 'left')).toEqual({ x: 0, y: 0 });
    expect(moveCoordinate({ x: 6, y: 6 }, 'down')).toEqual({ x: 6, y: 6 });
  });
});
