import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneDocument,
  createTileInstance,
  getBuildingLevelContexts,
  getCanvasCellContexts,
  getCurrentBuildingLevelContext,
  getCellContext,
  getPreviewInspectorContext,
  getSelectedCellContext,
  getVisibleBuildingLevelContexts,
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
    expect(context.otherVisibleLayerInstances).toEqual([]);
  });

  it('derives other visible layer instances at the same coordinate without mixing current layer occupancy', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const sceneWithCrossLayerTiles = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-2' ? { ...level, visible: false } : level,
      ),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-current',
          assetId: 'wooden-floor',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-other-visible',
          assetId: 'roof-tile',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
        createTileInstance({
          instanceId: 'tile-other-hidden',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-2',
        }),
      ],
    };
    const context = getCellContext(sceneWithCrossLayerTiles, { x: 2, y: 2 }, 'level-0');

    expect(context.tileInstances.map((instance) => instance.instanceId)).toEqual(['tile-current']);
    expect(context.otherVisibleLayerInstances.map((instance) => instance.instanceId)).toEqual([
      'tile-other-visible',
    ]);
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

  it('derives visible preview levels and tile instances without hidden layer data', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const sceneWithHiddenLevel = {
      ...scene,
      buildingLevels: [
        ...scene.buildingLevels,
        { id: 'level-3', levelNumber: 3, name: '3 层', visible: true, locked: false },
        { id: 'level-4', levelNumber: 4, name: '4 层', visible: true, locked: false },
      ].map((level) => (level.id === 'level-1' ? { ...level, visible: false } : level)),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-visible',
          assetId: 'wooden-floor',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-hidden',
          assetId: 'roof-tile',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
        createTileInstance({
          instanceId: 'tile-high',
          assetId: 'garden-plant',
          coordinate: { x: 3, y: 3 },
          buildingLevelId: 'level-4',
        }),
      ],
    };
    const visibleLevels = getVisibleBuildingLevelContexts(sceneWithHiddenLevel);
    const previewContext = getPreviewInspectorContext(sceneWithHiddenLevel, 'level-0');

    expect(visibleLevels.map((level) => level.id)).toEqual(['level-4', 'level-3', 'level-2', 'level-0']);
    expect(visibleLevels.every((level) => level.heightPercent <= 100)).toBe(true);
    expect(visibleLevels.every((level) => level.heightPercent >= 28)).toBe(true);
    expect(previewContext.visibleTileInstances.map((instance) => instance.instanceId)).toEqual([
      'tile-visible',
      'tile-high',
    ]);
    expect(previewContext.activeLayerInstances.map((instance) => instance.instanceId)).toEqual(['tile-visible']);
  });
});
