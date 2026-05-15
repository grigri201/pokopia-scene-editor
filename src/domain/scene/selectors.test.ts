import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneDocument,
  getCanvasCellContexts,
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
});
