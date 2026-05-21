import { describe, expect, it } from 'vitest';
import { assetCatalog, assetSkillTypes, assertKnownAssetId } from '../assets';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  createTileInstance,
  getAllVisibleFrontProjectionCellContexts,
  getAllVisibleFrontPreviewContexts,
  getAllVisiblePreviewCellContexts,
  getBuildingLevelContexts,
  getCanvasCellContexts,
  getCellContext,
  getCurrentBuildingLevelContext,
  getCurrentLayerFrontPreviewContexts,
  getCurrentLayerPreviewCellContexts,
  getPreviewInspectorContext,
  getSelectedCellContext,
  getVisibleBuildingLevelContexts,
  getVisibleBuildingLevelContextsInRenderOrder,
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

  it('derives other layer instances at the same coordinate without hidden-layer state', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const sceneWithCrossLayerTiles = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-current',
          assetId: 'wooden-fencing',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-other-1',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
        createTileInstance({
          instanceId: 'tile-other-2',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-2',
        }),
      ],
    };
    const context = getCellContext(sceneWithCrossLayerTiles, { x: 2, y: 2 }, 'level-0');

    expect(context.tileInstances.map((instance) => instance.instanceId)).toEqual(['tile-current']);
    expect(context.otherVisibleLayerInstances.map((instance) => instance.instanceId)).toEqual([
      'tile-other-1',
      'tile-other-2',
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

  it('derives canvas cell and building level contexts', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const sceneWithTiles = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-1',
          assetId: 'wooden-fencing',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-2',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 3 },
          buildingLevelId: 'level-2',
        }),
      ],
    };
    const cells = getCanvasCellContexts(sceneWithTiles);
    const levels = getBuildingLevelContexts(sceneWithTiles);

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
    expect(levels.map((level) => level.displayId)).toEqual(['L2', 'L1', 'L0']);
    expect(levels.map((level) => level.instanceCount)).toEqual([1, 0, 1]);
    expect(levels.every((level) => !('visible' in level))).toBe(true);
    expect(levels.every((level) => !('locked' in level))).toBe(true);
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
      buildingLevels: [scene.buildingLevels[0], { ...scene.buildingLevels[0], name: 'Duplicate 0层' }],
    };
    const sceneWithOrphanTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-orphan',
          assetId: 'wooden-fencing',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-missing',
        }),
      ],
    };

    expect(() => getBuildingLevelContexts(sceneWithMissingCurrent)).toThrow(/Unknown building level/);
    expect(() => getBuildingLevelContexts(sceneWithDuplicateLevel)).toThrow(/Duplicate building level id/);
    expect(() => getBuildingLevelContexts(sceneWithOrphanTile)).toThrow(/references unknown building level/);
  });

  it('derives preview levels and tile instances with every building layer participating', () => {
    const scene = createPreviewScene();
    const visibleLevels = getVisibleBuildingLevelContexts(scene);
    const renderLevels = getVisibleBuildingLevelContextsInRenderOrder(scene);
    const previewContext = getPreviewInspectorContext(scene, 'level-0');
    const currentCells = getCurrentLayerPreviewCellContexts(scene, 'level-2');
    const allCells = getAllVisiblePreviewCellContexts(scene);
    const targetCurrentCell = currentCells.find((cell) => cell.id === '2-2');
    const targetAllCell = allCells.find((cell) => cell.id === '2-2');

    expect(visibleLevels.map((level) => level.id)).toEqual(['level-2', 'level-1', 'level-0']);
    expect(renderLevels.map((level) => level.id)).toEqual(['level-0', 'level-1', 'level-2']);
    expect(previewContext.visibleTileInstances.map((instance) => instance.instanceId)).toEqual([
      'tile-low',
      'tile-mid',
      'tile-high',
    ]);
    expect(previewContext.activeLayerInstances.map((instance) => instance.instanceId)).toEqual(['tile-low']);
    expect(targetCurrentCell?.hidden).toBe(false);
    expect(targetCurrentCell?.tileInstances.map((instance) => instance.instanceId)).toEqual(['tile-high']);
    expect(targetAllCell?.tileInstances.map((instance) => instance.instanceId)).toEqual([
      'tile-low',
      'tile-mid',
      'tile-high',
    ]);
    expect(targetAllCell?.instanceLayerContexts.map((level) => level.displayId)).toEqual(['L0', 'L1', 'L2']);
  });

  it('derives front preview structures and projection cells for all levels', () => {
    const scene = createPreviewScene();
    const currentFront = getCurrentLayerFrontPreviewContexts(scene, 'level-0');
    const allFront = getAllVisibleFrontPreviewContexts(scene);
    const projectionCells = getAllVisibleFrontProjectionCellContexts(scene);
    const levelTwoColumn = projectionCells.find((cell) => cell.buildingLevel.id === 'level-2' && cell.x === 2);

    expect(currentFront).toEqual([
      expect.objectContaining({
        displayId: 'L0',
        mainInstanceCount: 1,
        outerInstanceCount: 0,
        skillInstanceCount: 0,
        totalInstanceCount: 1,
      }),
    ]);
    expect(allFront.map((level) => level.displayId)).toEqual(['L0', 'L1', 'L2']);
    expect(allFront.map((level) => level.totalInstanceCount)).toEqual([1, 1, 1]);
    expect(projectionCells).toHaveLength(21);
    expect(projectionCells.slice(0, 7).every((cell) => cell.buildingLevel.id === 'level-2')).toBe(true);
    expect(levelTwoColumn?.projectedInstance?.instanceId).toBe('tile-high');
    expect(levelTwoColumn?.skillInstance?.instanceId).toBe('tile-high');
  });

  it('derives dense top and front previews within the preview performance budget', () => {
    const scene = createDensePreviewScene();
    const topCells = getAllVisiblePreviewCellContexts(scene);
    const frontLevels = getAllVisibleFrontPreviewContexts(scene);

    expect(topCells).toHaveLength(49);
    expect(topCells.flatMap((cell) => cell.tileInstances)).toHaveLength(490);
    expect(topCells.every((cell) => cell.instanceLayerContexts.length === 10)).toBe(true);
    expect(frontLevels).toHaveLength(10);
    expect(frontLevels.reduce((total, level) => total + level.totalInstanceCount, 0)).toBe(490);
    expect(frontLevels.every((level) => level.heightPercent >= 28 && level.heightPercent <= 100)).toBe(true);
  });
});

function createPreviewScene() {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-preview',
    now: '2026-05-16T07:00:00.000Z',
  });

  return {
    ...scene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-low',
        assetId: 'wooden-fencing',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
      createTileInstance({
        instanceId: 'tile-mid',
        assetId: 'brick-roof-decoration',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-1',
      }),
      createTileInstance({
        instanceId: 'tile-high',
        assetId: 'leafy-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-2',
        requiresSkill: true,
        skillType: '树叶',
      }),
    ],
  };
}

function createDensePreviewScene() {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-dense-preview',
    now: '2026-05-16T10:32:30.000Z',
  });
  const buildingLevels = Array.from({ length: 10 }, (_, levelNumber) => ({
    id: `level-${levelNumber}`,
    levelNumber,
    name: `${levelNumber}层`,
  }));
  const assetIds = assetCatalog.map((asset) => asset.assetId);
  const skillTypes = assetSkillTypes;
  const tileInstances = buildingLevels.flatMap((level) =>
    Array.from({ length: 49 }, (_, index) => {
      const assetId = assetIds[index % assetIds.length];
      assertKnownAssetId(assetId);

      return createTileInstance({
        instanceId: `tile-${level.levelNumber}-${index}`,
        assetId,
        coordinate: { x: index % 7, y: Math.floor(index / 7) },
        buildingLevelId: level.id,
        requiresSkill: index % 3 === 0,
        skillType: skillTypes[index % skillTypes.length],
      });
    }),
  );

  return {
    ...baseScene,
    buildingLevels,
    tileInstances,
    workspaceState: {
      ...baseScene.workspaceState,
      currentBuildingLevelId: 'level-0',
      selectedCoordinate: { x: 2, y: 3 },
    },
  };
}
