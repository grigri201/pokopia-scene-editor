import {
  calculateAreaType,
  createCanvasCells,
  isMainAreaBoundaryCell,
  isPlaceableArea,
  type AreaType,
  type GridCoordinate,
  type SceneDimensions,
} from './area';
import { sortBuildingLevelsForDisplay, sortBuildingLevelsForRender } from './levels';
import type { BuildingLevel, SceneDocument, TileInstance } from './types';

export interface CellContext {
  coordinate: GridCoordinate;
  areaType: AreaType;
  buildingLevel: BuildingLevel;
  placeable: boolean;
  empty: boolean;
  tileInstances: TileInstance[];
  otherVisibleLayerInstances: TileInstance[];
}

export interface CanvasCellContext extends CellContext {
  id: string;
  mainBoundary: boolean;
}

export interface BuildingLevelContext {
  id: string;
  displayId: string;
  levelNumber: number;
  name: string;
  instanceCount: number;
  visible: boolean;
  locked: boolean;
  current: boolean;
}

export interface PreviewLayerContext extends BuildingLevelContext {
  heightPercent: number;
}

export interface FrontPreviewLayerContext extends PreviewLayerContext {
  mainInstanceCount: number;
  outerInstanceCount: number;
  skillInstanceCount: number;
  totalInstanceCount: number;
}

export interface PreviewCanvasCellContext {
  id: string;
  coordinate: GridCoordinate;
  areaType: AreaType;
  placeable: boolean;
  mainBoundary: boolean;
  hidden: boolean;
  tileInstances: TileInstance[];
  instanceLayerContexts: BuildingLevelContext[];
}

export interface PreviewInspectorContext {
  activeLevel: BuildingLevel;
  activeCells: CanvasCellContext[];
  activeLayerInstances: TileInstance[];
  visibleLevels: PreviewLayerContext[];
  visibleTileInstances: TileInstance[];
}

export function getCurrentBuildingLevel(scene: SceneDocument, buildingLevelId = scene.workspaceState.currentBuildingLevelId): BuildingLevel {
  assertUniqueBuildingLevelIds(scene.buildingLevels);

  const level = scene.buildingLevels.find(
    (candidate) => candidate.id === buildingLevelId,
  );

  if (!level) {
    throw new RangeError(`Unknown building level: ${buildingLevelId}`);
  }

  return level;
}

export function getCellContext(
  scene: SceneDocument,
  coordinate: GridCoordinate,
  buildingLevelId = scene.workspaceState.currentBuildingLevelId,
): CellContext {
  const dimensions = getSceneDimensions(scene);
  const areaType = calculateAreaType(coordinate, dimensions);
  const buildingLevel = getCurrentBuildingLevel(scene, buildingLevelId);
  const tileInstances = scene.tileInstances.filter(
    (instance) =>
      instance.coordinate.x === coordinate.x &&
      instance.coordinate.y === coordinate.y &&
      instance.buildingLevelId === buildingLevel.id,
  );
  const otherVisibleLevelIds = new Set(
    scene.buildingLevels
      .filter((level) => level.id !== buildingLevel.id && level.visible)
      .map((level) => level.id),
  );
  const otherVisibleLayerInstances = scene.tileInstances.filter(
    (instance) =>
      instance.coordinate.x === coordinate.x &&
      instance.coordinate.y === coordinate.y &&
      otherVisibleLevelIds.has(instance.buildingLevelId),
  );

  return {
    coordinate: { x: coordinate.x, y: coordinate.y },
    areaType,
    buildingLevel,
    placeable: isPlaceableArea(areaType),
    empty: tileInstances.length === 0,
    tileInstances,
    otherVisibleLayerInstances,
  };
}

export function getCanvasCellContexts(
  scene: SceneDocument,
  buildingLevelId = scene.workspaceState.currentBuildingLevelId,
): CanvasCellContext[] {
  const dimensions = getSceneDimensions(scene);

  return createCanvasCells(dimensions).map((cell) => ({
    ...getCellContext(scene, cell, buildingLevelId),
    id: cell.id,
    mainBoundary: isMainAreaBoundaryCell(cell, dimensions),
  }));
}

export function getSelectedCellContext(scene: SceneDocument): CellContext | null {
  if (!scene.workspaceState.selectedCoordinate) {
    return null;
  }

  return getCellContext(scene, scene.workspaceState.selectedCoordinate);
}

export function getBuildingLevelContexts(scene: SceneDocument): BuildingLevelContext[] {
  assertTileInstancesReferenceKnownLevels(scene);
  const currentLevel = getCurrentBuildingLevel(scene);

  return sortBuildingLevelsForDisplay(scene.buildingLevels).map((level) => ({
    id: level.id,
    displayId: `L${level.levelNumber}`,
    levelNumber: level.levelNumber,
    name: level.name,
    instanceCount: countTileInstancesForLevel(scene, level.id),
    visible: level.visible,
    locked: level.locked,
    current: level.id === currentLevel.id,
  }));
}

export function getCurrentBuildingLevelContext(scene: SceneDocument): BuildingLevelContext {
  const currentLevel = getBuildingLevelContexts(scene).find((level) => level.current);

  if (!currentLevel) {
    throw new RangeError(`Unknown building level: ${scene.workspaceState.currentBuildingLevelId}`);
  }

  return currentLevel;
}

export function getPreviewInspectorContext(
  scene: SceneDocument,
  activeBuildingLevelId = scene.workspaceState.currentBuildingLevelId,
): PreviewInspectorContext {
  const activeLevel = getCurrentBuildingLevel(scene, activeBuildingLevelId);
  const activeCells = getCanvasCellContexts(scene, activeBuildingLevelId);
  const activeLayerInstances = activeLevel.visible
    ? activeCells.flatMap((cell) => cell.tileInstances)
    : [];
  const visibleLevels = getVisibleBuildingLevelContexts(scene);
  const visibleLevelIds = new Set(visibleLevels.map((level) => level.id));
  const visibleTileInstances = scene.tileInstances.filter((instance) =>
    visibleLevelIds.has(instance.buildingLevelId),
  );

  return {
    activeLevel,
    activeCells,
    activeLayerInstances,
    visibleLevels,
    visibleTileInstances,
  };
}

export function getVisibleBuildingLevelContexts(scene: SceneDocument): PreviewLayerContext[] {
  const visibleLevels = getBuildingLevelContexts(scene).filter((level) => level.visible);
  const maxLevelNumber = getMaxBuildingLevelNumber(scene.buildingLevels);

  return visibleLevels.map((level) => ({
    ...level,
    heightPercent: getPreviewLevelHeightPercent(level.levelNumber, maxLevelNumber),
  }));
}

export function getVisibleBuildingLevelContextsInRenderOrder(scene: SceneDocument): PreviewLayerContext[] {
  return sortBuildingLevelsForRender(getVisibleBuildingLevelContexts(scene));
}

export function getCurrentLayerFrontPreviewContexts(
  scene: SceneDocument,
  activeBuildingLevelId = scene.workspaceState.currentBuildingLevelId,
): FrontPreviewLayerContext[] {
  const activeLevel = getVisibleBuildingLevelContexts(scene).find((level) => level.id === activeBuildingLevelId);

  return activeLevel ? buildFrontPreviewLayerContexts(scene, [activeLevel]) : [];
}

export function getAllVisibleFrontPreviewContexts(scene: SceneDocument): FrontPreviewLayerContext[] {
  return buildFrontPreviewLayerContexts(scene, getVisibleBuildingLevelContextsInRenderOrder(scene));
}

export function getCurrentLayerPreviewCellContexts(
  scene: SceneDocument,
  activeBuildingLevelId = scene.workspaceState.currentBuildingLevelId,
): PreviewCanvasCellContext[] {
  const activeLevelContext = getBuildingLevelContexts(scene).find((level) => level.id === activeBuildingLevelId);

  if (!activeLevelContext) {
    throw new RangeError(`Unknown building level: ${activeBuildingLevelId}`);
  }

  return getCanvasCellContexts(scene, activeBuildingLevelId).map((cell) => {
    const visibleTileInstances = cell.buildingLevel.visible ? cell.tileInstances : [];

    return {
      id: cell.id,
      coordinate: cell.coordinate,
      areaType: cell.areaType,
      placeable: cell.placeable,
      mainBoundary: cell.mainBoundary,
      hidden: !cell.buildingLevel.visible,
      tileInstances: visibleTileInstances,
      instanceLayerContexts: visibleTileInstances.length > 0 ? [activeLevelContext] : [],
    };
  });
}

export function getAllVisiblePreviewCellContexts(scene: SceneDocument): PreviewCanvasCellContext[] {
  const dimensions = getSceneDimensions(scene);
  const visibleLevels = getVisibleBuildingLevelContextsInRenderOrder(scene);

  return createCanvasCells(dimensions).map((cell) => {
    const tileInstances = visibleLevels.flatMap((level) =>
      scene.tileInstances.filter(
        (instance) =>
          instance.coordinate.x === cell.x &&
          instance.coordinate.y === cell.y &&
          instance.buildingLevelId === level.id,
      ),
    );
    const instanceLevelIds = new Set(tileInstances.map((instance) => instance.buildingLevelId));

    return {
      id: cell.id,
      coordinate: { x: cell.x, y: cell.y },
      areaType: cell.areaType,
      placeable: isPlaceableArea(cell.areaType),
      mainBoundary: isMainAreaBoundaryCell(cell, dimensions),
      hidden: false,
      tileInstances,
      instanceLayerContexts: visibleLevels.filter((level) => instanceLevelIds.has(level.id)),
    };
  });
}

function getSceneDimensions(scene: SceneDocument): SceneDimensions {
  return {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  };
}

function countTileInstancesForLevel(scene: SceneDocument, buildingLevelId: string): number {
  return scene.tileInstances.filter((instance) => instance.buildingLevelId === buildingLevelId).length;
}

function buildFrontPreviewLayerContexts(
  scene: SceneDocument,
  levels: readonly PreviewLayerContext[],
): FrontPreviewLayerContext[] {
  const dimensions = getSceneDimensions(scene);
  const statsByLevelId = new Map<string, Pick<FrontPreviewLayerContext, 'mainInstanceCount' | 'outerInstanceCount' | 'skillInstanceCount' | 'totalInstanceCount'>>();

  for (const level of levels) {
    statsByLevelId.set(level.id, {
      mainInstanceCount: 0,
      outerInstanceCount: 0,
      skillInstanceCount: 0,
      totalInstanceCount: 0,
    });
  }

  for (const instance of scene.tileInstances) {
    const stats = statsByLevelId.get(instance.buildingLevelId);

    if (!stats) {
      continue;
    }

    const areaType = calculateAreaType(instance.coordinate, dimensions);
    stats.totalInstanceCount += 1;
    stats.skillInstanceCount += instance.requiresSkill ? 1 : 0;

    if (areaType === 'main') {
      stats.mainInstanceCount += 1;
    } else {
      stats.outerInstanceCount += 1;
    }
  }

  return levels.map((level) => ({
    ...level,
    ...(statsByLevelId.get(level.id) ?? {
      mainInstanceCount: 0,
      outerInstanceCount: 0,
      skillInstanceCount: 0,
      totalInstanceCount: 0,
    }),
  }));
}

function getMaxBuildingLevelNumber(levels: readonly Pick<BuildingLevel, 'levelNumber'>[]): number {
  return Math.max(...levels.map((level) => level.levelNumber), 0);
}

function getPreviewLevelHeightPercent(levelNumber: number, maxLevelNumber: number): number {
  if (maxLevelNumber <= 0) {
    return 32;
  }

  return Math.min(100, Math.max(28, 28 + (levelNumber / maxLevelNumber) * 72));
}

function assertUniqueBuildingLevelIds(levels: readonly BuildingLevel[]): void {
  const seenIds = new Set<string>();

  for (const level of levels) {
    if (seenIds.has(level.id)) {
      throw new RangeError(`Duplicate building level id: ${level.id}`);
    }

    seenIds.add(level.id);
  }
}

function assertTileInstancesReferenceKnownLevels(scene: SceneDocument): void {
  const levelIds = new Set(scene.buildingLevels.map((level) => level.id));

  for (const instance of scene.tileInstances) {
    if (!levelIds.has(instance.buildingLevelId)) {
      throw new RangeError(`Tile instance ${instance.instanceId} references unknown building level: ${instance.buildingLevelId}`);
    }
  }
}
