import {
  calculateAreaType,
  createCanvasCells,
  isMainAreaBoundaryCell,
  isPlaceableArea,
  type AreaType,
  type GridCoordinate,
  type SceneDimensions,
} from './area';
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

export function getCurrentBuildingLevel(scene: SceneDocument): BuildingLevel {
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

function getSceneDimensions(scene: SceneDocument): SceneDimensions {
  return {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  };
}
