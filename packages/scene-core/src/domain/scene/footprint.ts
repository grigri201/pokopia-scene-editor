import type { AssetFootprint, AssetStackingSurfaceKind } from '../assets';
import type { GridCoordinate, SceneDimensions } from './area';
import type { RotationDegrees } from './types';

export type FootprintConflictType =
  | 'footprint-out-of-bounds'
  | 'same-level-footprint-overlap'
  | 'height-blocked-by-lower-footprint'
  | 'unsupported-stack-surface'
  | 'surface-capacity-conflict';

export interface FootprintConflict {
  conflictType: FootprintConflictType;
  message: string;
  instanceId: string;
  assetId: string;
  buildingLevelId: string;
  coordinates: GridCoordinate[];
  blockingInstanceId?: string;
  blockingAssetId?: string;
  blockingBuildingLevelId?: string;
  surfaceKind?: AssetStackingSurfaceKind;
}

export interface FootprintBoundsConflictInput {
  instanceId: string;
  assetId: string;
  buildingLevelId: string;
  occupiedCells: readonly GridCoordinate[];
  dimensions: SceneDimensions;
}

export function getEffectiveAssetFootprint(
  footprint: AssetFootprint,
  rotationDegrees: RotationDegrees,
): AssetFootprint {
  if (rotationDegrees === 90 || rotationDegrees === 270) {
    return {
      length: footprint.width,
      width: footprint.length,
      height: footprint.height,
    };
  }

  return {
    length: footprint.length,
    width: footprint.width,
    height: footprint.height,
  };
}

export function getFootprintCells(anchor: GridCoordinate, footprint: Pick<AssetFootprint, 'length' | 'width'>): GridCoordinate[] {
  const cells: GridCoordinate[] = [];

  for (let yOffset = 0; yOffset < footprint.width; yOffset += 1) {
    for (let xOffset = 0; xOffset < footprint.length; xOffset += 1) {
      cells.push({
        x: anchor.x + xOffset,
        y: anchor.y + yOffset,
      });
    }
  }

  return cells;
}

export function getFootprintBoundsConflict(input: FootprintBoundsConflictInput): FootprintConflict | null {
  const outOfBoundsCells = input.occupiedCells.filter((cell) => !isCanvasCoordinate(cell, input.dimensions));

  if (outOfBoundsCells.length === 0) {
    return null;
  }

  return {
    conflictType: 'footprint-out-of-bounds',
    message: buildFootprintConflictMessage('footprint-out-of-bounds', input.instanceId, input.assetId, input.buildingLevelId, outOfBoundsCells),
    instanceId: input.instanceId,
    assetId: input.assetId,
    buildingLevelId: input.buildingLevelId,
    coordinates: cloneCoordinates(outOfBoundsCells),
  };
}

export function isCanvasCoordinate(coordinate: GridCoordinate, dimensions: SceneDimensions): boolean {
  return (
    Number.isInteger(coordinate.x) &&
    Number.isInteger(coordinate.y) &&
    coordinate.x >= 0 &&
    coordinate.y >= 0 &&
    coordinate.x < dimensions.canvasSize.width &&
    coordinate.y < dimensions.canvasSize.height
  );
}

export function buildFootprintConflictMessage(
  conflictType: FootprintConflictType,
  instanceId: string,
  assetId: string,
  buildingLevelId: string,
  coordinates: readonly GridCoordinate[],
  blockingInstanceId?: string,
): string {
  const coordinateList = formatCoordinates(coordinates);
  const blockingText = blockingInstanceId ? ` blockedBy=${blockingInstanceId}` : '';

  return `${conflictType}: instance=${instanceId} asset=${assetId} level=${buildingLevelId}${blockingText} coordinates=${coordinateList}`;
}

export function formatCoordinates(coordinates: readonly GridCoordinate[]): string {
  return coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`).join(' ');
}

export function cloneCoordinates(coordinates: readonly GridCoordinate[]): GridCoordinate[] {
  return coordinates.map((coordinate) => ({ x: coordinate.x, y: coordinate.y }));
}
