import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneDocument,
  createTileInstance,
  getBuildingLevelContexts,
  getCanvasCellContexts,
  getCurrentBuildingLevelContext,
  getCellContext,
  getSelectedCellContext,
} from './index';

describe('scene selectors', () => {
  it('derives target cell context from SceneDocument fields', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const context = getCellContext(scene, { x: 0, y: 3 });

    expect(context.coordinate).toEqual({ x: 0, y: 3 });
    expect(context.areaType).toBe('outer');
    expect(context.buildingLevel.id).toBe('level-0');
    expect(context.placeable).toBe(true);
    expect(context.empty).toBe(true);
  });

  it('returns selected context only after the scene has a selected coordinate', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      selectedCoordinate: { x: 2, y: 2 },
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(getSelectedCellContext(createDefaultSceneDocument({ now: '2026-05-16T07:00:00.000Z' }))).toBeNull();
    expect(getSelectedCellContext(scene)?.areaType).toBe('main');
  });

  it('derives canvas cell contexts from the SceneDocument dimensions', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const cells = getCanvasCellContexts(scene);

    expect(cells).toHaveLength(scene.canvasSize.width * scene.canvasSize.height);
    expect(cells[0]).toMatchObject({
      id: '0-0',
      coordinate: { x: 0, y: 0 },
      areaType: 'outer',
      placeable: true,
      mainBoundary: false,
    });
    expect(cells.filter((cell) => cell.areaType === 'main')).toHaveLength(25);
    expect(cells.filter((cell) => cell.mainBoundary)).toHaveLength(16);
    expect(cells.every((cell) => cell.buildingLevel.id === scene.workspaceState.currentBuildingLevelId)).toBe(
      true,
    );
  });

  it('derives building level contexts in high-to-low display order', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const sceneWithTiles = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-1',
          assetId: 'wooden-floor',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-2',
          assetId: 'plant',
          coordinate: { x: 3, y: 3 },
          buildingLevelId: 'level-2',
        }),
      ],
    };
    const levels = getBuildingLevelContexts(sceneWithTiles);

    expect(levels.map((level) => level.displayId)).toEqual(['L2', 'L1', 'L0']);
    expect(levels.map((level) => level.levelNumber)).toEqual([2, 1, 0]);
    expect(levels.map((level) => level.instanceCount)).toEqual([1, 0, 1]);
    expect(levels.map((level) => level.visible)).toEqual([true, true, true]);
    expect(levels.map((level) => level.locked)).toEqual([false, false, false]);
    expect(getCurrentBuildingLevelContext(sceneWithTiles).displayId).toBe('L0');
  });

  it('rejects invalid building level references before deriving contexts', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const sceneWithMissingCurrent = {
      ...scene,
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-missing' },
    };
    const sceneWithDuplicateLevel = {
      ...scene,
      buildingLevels: [scene.buildingLevels[0], { ...scene.buildingLevels[0], name: 'Duplicate 0 层' }],
    };
    const sceneWithOrphanTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-orphan',
          assetId: 'wooden-floor',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-missing',
        }),
      ],
    };

    expect(() => getBuildingLevelContexts(sceneWithMissingCurrent)).toThrow(/Unknown building level/);
    expect(() => getBuildingLevelContexts(sceneWithDuplicateLevel)).toThrow(/Duplicate building level id/);
    expect(() => getBuildingLevelContexts(sceneWithOrphanTile)).toThrow(/references unknown building level/);
  });
});
