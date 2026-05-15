import {
  calculateAreaType,
  createCanvasCells,
  isMainAreaBoundaryCell,
  isPlaceableArea,
  type AreaType,
  type GridCoordinate,
  type SceneDimensions,
} from './area';
import { sortBuildingLevelsForDisplay } from './levels';
import type { BuildingLevel, SceneDocument } from './types';

export interface CellContext {
  coordinate: GridCoordinate;
  areaType: AreaType;
  buildingLevel: BuildingLevel;
  placeable: boolean;
  empty: boolean;
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

export function getCurrentBuildingLevel(scene: SceneDocument): BuildingLevel {
  assertUniqueBuildingLevelIds(scene.buildingLevels);

  const level = scene.buildingLevels.find(
    (candidate) => candidate.id === scene.workspaceState.currentBuildingLevelId,
  );

  if (!level) {
    throw new RangeError(`Unknown building level: ${scene.workspaceState.currentBuildingLevelId}`);
  }

  return level;
}

export function getCellContext(scene: SceneDocument, coordinate: GridCoordinate): CellContext {
  const dimensions = getSceneDimensions(scene);
  const areaType = calculateAreaType(coordinate, dimensions);
  const buildingLevel = getCurrentBuildingLevel(scene);
  const hasInstance = scene.tileInstances.some(
    (instance) =>
      instance.coordinate.x === coordinate.x &&
      instance.coordinate.y === coordinate.y &&
      instance.buildingLevelId === buildingLevel.id,
  );

  return {
    coordinate: { x: coordinate.x, y: coordinate.y },
    areaType,
    buildingLevel,
    placeable: isPlaceableArea(areaType),
    empty: !hasInstance,
  };
}

export function getCanvasCellContexts(scene: SceneDocument): CanvasCellContext[] {
  const dimensions = getSceneDimensions(scene);

  return createCanvasCells(dimensions).map((cell) => ({
    ...getCellContext(scene, cell),
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
