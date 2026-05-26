import { getAssetById, type AssetDefinition } from '../assets';
import type { GridCoordinate, SceneDimensions } from './area';
import type { BuildingLevel, RotationDegrees, SceneDocument, TileInstance } from './types';
import {
  buildFootprintConflictMessage,
  cloneCoordinates,
  getEffectiveAssetFootprint,
  getFootprintBoundsConflict,
  getFootprintCells,
  type FootprintConflict,
} from './footprint';

export interface OccupancyInstance {
  instanceId: string;
  assetId: string;
  buildingLevelId: string;
  buildingLevelNumber: number;
  instance: TileInstance;
  asset: AssetDefinition;
  effectiveFootprint: AssetDefinition['footprint'];
  occupiedCells: GridCoordinate[];
}

export interface OccupancyCell {
  buildingLevelId: string;
  coordinate: GridCoordinate;
  instanceId: string;
  assetId: string;
  instance: TileInstance;
}

export interface BlockingCell {
  buildingLevelId: string;
  buildingLevelNumber: number;
  coordinate: GridCoordinate;
  blockedByInstanceId: string;
  blockedByAssetId: string;
  blockedByBuildingLevelId: string;
}

export interface SceneOccupancy {
  instances: OccupancyInstance[];
  occupiedCells: OccupancyCell[];
  blockingCells: BlockingCell[];
  conflicts: FootprintConflict[];
}

export type PlacementFootprintStatus = 'ready' | 'will-replace' | 'blocked';

export interface PlacementFootprintEvaluation {
  status: PlacementFootprintStatus;
  canPlace: boolean;
  asset: AssetDefinition;
  effectiveFootprint: AssetDefinition['footprint'];
  occupiedCells: GridCoordinate[];
  blockingCells: BlockingCell[];
  existingInstances: TileInstance[];
  conflicts: FootprintConflict[];
}

export interface EvaluateScenePlacementFootprintInput {
  asset: AssetDefinition;
  coordinate: GridCoordinate;
  buildingLevelId: string;
  rotationDegrees?: RotationDegrees;
  confirmReplace?: boolean;
}

export function buildSceneOccupancy(scene: SceneDocument): SceneOccupancy {
  const dimensions = getSceneDimensions(scene);
  const levelById = new Map(scene.buildingLevels.map((level) => [level.id, level]));
  const levelByNumber = new Map(scene.buildingLevels.map((level) => [level.levelNumber, level]));
  const instances: OccupancyInstance[] = [];
  const occupiedCells: OccupancyCell[] = [];
  const blockingCells: BlockingCell[] = [];
  const conflicts: FootprintConflict[] = [];
  const occupiedCellsByKey = new Map<string, OccupancyCell>();

  for (const instance of scene.tileInstances) {
    const asset = getAssetById(instance.assetId);
    const level = levelById.get(instance.buildingLevelId);

    if (!asset || !level) {
      continue;
    }

    const effectiveFootprint = getEffectiveAssetFootprint(asset.footprint, instance.rotationDegrees);
    const footprintCells = getFootprintCells(instance.coordinate, effectiveFootprint);
    const boundsConflict = getFootprintBoundsConflict({
      instanceId: instance.instanceId,
      assetId: instance.assetId,
      buildingLevelId: instance.buildingLevelId,
      occupiedCells: footprintCells,
      dimensions,
    });

    if (boundsConflict) {
      conflicts.push(boundsConflict);
    }

    const occupancyInstance: OccupancyInstance = {
      instanceId: instance.instanceId,
      assetId: instance.assetId,
      buildingLevelId: instance.buildingLevelId,
      buildingLevelNumber: level.levelNumber,
      instance,
      asset,
      effectiveFootprint,
      occupiedCells: cloneCoordinates(footprintCells),
    };
    instances.push(occupancyInstance);

    for (const coordinate of footprintCells) {
      const cell: OccupancyCell = {
        buildingLevelId: instance.buildingLevelId,
        coordinate: { x: coordinate.x, y: coordinate.y },
        instanceId: instance.instanceId,
        assetId: instance.assetId,
        instance,
      };
      const cellKey = getLevelCoordinateKey(instance.buildingLevelId, coordinate);
      const occupiedCell = occupiedCellsByKey.get(cellKey);

      if (occupiedCell) {
        conflicts.push(buildOverlapConflict(cell, occupiedCell));
      } else {
        occupiedCellsByKey.set(cellKey, cell);
      }

      occupiedCells.push(cell);
    }
  }

  for (const occupancyInstance of instances) {
    for (let offset = 1; offset < occupancyInstance.effectiveFootprint.height; offset += 1) {
      const blockedLevel = levelByNumber.get(occupancyInstance.buildingLevelNumber + offset);

      if (!blockedLevel) {
        continue;
      }

      for (const coordinate of occupancyInstance.occupiedCells) {
        blockingCells.push({
          buildingLevelId: blockedLevel.id,
          buildingLevelNumber: blockedLevel.levelNumber,
          coordinate: { x: coordinate.x, y: coordinate.y },
          blockedByInstanceId: occupancyInstance.instanceId,
          blockedByAssetId: occupancyInstance.assetId,
          blockedByBuildingLevelId: occupancyInstance.buildingLevelId,
        });
      }
    }
  }

  for (const blockingCell of blockingCells) {
    const occupiedCell = occupiedCellsByKey.get(getLevelCoordinateKey(blockingCell.buildingLevelId, blockingCell.coordinate));

    if (occupiedCell) {
      conflicts.push(buildHeightBlockingConflict(occupiedCell, blockingCell));
    }
  }

  return {
    instances,
    occupiedCells,
    blockingCells,
    conflicts,
  };
}

export function validateSceneOccupancy(scene: SceneDocument): FootprintConflict[] {
  return buildSceneOccupancy(scene).conflicts;
}

export function evaluateScenePlacementFootprint(
  scene: SceneDocument,
  input: EvaluateScenePlacementFootprintInput,
): PlacementFootprintEvaluation {
  const dimensions = getSceneDimensions(scene);
  const levelById = new Map(scene.buildingLevels.map((level) => [level.id, level]));
  const level = levelById.get(input.buildingLevelId);

  if (!level) {
    throw new RangeError(`Unknown building level: ${input.buildingLevelId}`);
  }

  const effectiveFootprint = getEffectiveAssetFootprint(input.asset.footprint, input.rotationDegrees ?? 0);
  const occupiedCells = getFootprintCells(input.coordinate, effectiveFootprint);
  const occupancy = buildSceneOccupancy(scene);
  const conflicts: FootprintConflict[] = [];
  const boundsConflict = getFootprintBoundsConflict({
    instanceId: 'placement-preview',
    assetId: input.asset.assetId,
    buildingLevelId: input.buildingLevelId,
    occupiedCells,
    dimensions,
  });

  if (boundsConflict) {
    conflicts.push(boundsConflict);
  }

  const existingInstances = getUniqueInstances(
    occupiedCells.flatMap((coordinate) =>
      occupancy.occupiedCells
        .filter((cell) =>
          cell.buildingLevelId === input.buildingLevelId &&
          cell.coordinate.x === coordinate.x &&
          cell.coordinate.y === coordinate.y)
        .map((cell) => cell.instance),
    ),
  );

  const lowerBlockingCells = occupancy.blockingCells.filter((blockingCell) =>
    blockingCell.buildingLevelId === input.buildingLevelId &&
    occupiedCells.some((coordinate) => coordinatesEqual(coordinate, blockingCell.coordinate)),
  );

  for (const blockingCell of lowerBlockingCells) {
    conflicts.push({
      conflictType: 'height-blocked-by-lower-footprint',
      message: buildFootprintConflictMessage(
        'height-blocked-by-lower-footprint',
        'placement-preview',
        input.asset.assetId,
        input.buildingLevelId,
        [blockingCell.coordinate],
        blockingCell.blockedByInstanceId,
      ),
      instanceId: 'placement-preview',
      assetId: input.asset.assetId,
      buildingLevelId: input.buildingLevelId,
      coordinates: [{ x: blockingCell.coordinate.x, y: blockingCell.coordinate.y }],
      blockingInstanceId: blockingCell.blockedByInstanceId,
      blockingAssetId: blockingCell.blockedByAssetId,
      blockingBuildingLevelId: blockingCell.blockedByBuildingLevelId,
    });
  }

  const candidateBlockingCells = getCandidateBlockingCells(scene.buildingLevels, level, input.asset, occupiedCells);
  const upperBlockedInstances = getUniqueInstances(
    candidateBlockingCells.flatMap((blockingCell) =>
      occupancy.occupiedCells
        .filter((cell) =>
          cell.buildingLevelId === blockingCell.buildingLevelId &&
          cell.coordinate.x === blockingCell.coordinate.x &&
          cell.coordinate.y === blockingCell.coordinate.y)
        .map((cell) => cell.instance),
    ),
  );

  for (const upperInstance of upperBlockedInstances) {
    const upperInstanceCells = occupancy.occupiedCells.filter((cell) =>
      cell.instanceId === upperInstance.instanceId &&
      cell.buildingLevelId === upperInstance.buildingLevelId,
    );
    const overlap = candidateBlockingCells
      .filter((blockingCell) =>
        blockingCell.buildingLevelId === upperInstance.buildingLevelId &&
        upperInstanceCells.some((cell) => coordinatesEqual(cell.coordinate, blockingCell.coordinate)),
      )
      .map((blockingCell) => blockingCell.coordinate);

    conflicts.push({
      conflictType: 'height-blocked-by-lower-footprint',
      message: buildFootprintConflictMessage(
        'height-blocked-by-lower-footprint',
        upperInstance.instanceId,
        upperInstance.assetId,
        upperInstance.buildingLevelId,
        overlap,
        'placement-preview',
      ),
      instanceId: upperInstance.instanceId,
      assetId: upperInstance.assetId,
      buildingLevelId: upperInstance.buildingLevelId,
      coordinates: cloneCoordinates(overlap),
      blockingInstanceId: 'placement-preview',
      blockingAssetId: input.asset.assetId,
      blockingBuildingLevelId: input.buildingLevelId,
    });
  }

  if (conflicts.length > 0) {
    return buildPlacementEvaluation('blocked', input.asset, effectiveFootprint, occupiedCells, candidateBlockingCells, existingInstances, conflicts);
  }

  if (existingInstances.length > 0 && !input.confirmReplace) {
    return buildPlacementEvaluation('will-replace', input.asset, effectiveFootprint, occupiedCells, candidateBlockingCells, existingInstances, []);
  }

  return buildPlacementEvaluation('ready', input.asset, effectiveFootprint, occupiedCells, candidateBlockingCells, existingInstances, []);
}

export function getLevelCoordinateKey(buildingLevelId: string, coordinate: GridCoordinate): string {
  return `${buildingLevelId}:${coordinate.x},${coordinate.y}`;
}

function getSceneDimensions(scene: SceneDocument): SceneDimensions {
  return {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  };
}

function buildOverlapConflict(cell: OccupancyCell, occupiedCell: OccupancyCell): FootprintConflict {
  return {
    conflictType: 'same-level-footprint-overlap',
    message: buildFootprintConflictMessage(
      'same-level-footprint-overlap',
      cell.instanceId,
      cell.assetId,
      cell.buildingLevelId,
      [cell.coordinate],
      occupiedCell.instanceId,
    ),
    instanceId: cell.instanceId,
    assetId: cell.assetId,
    buildingLevelId: cell.buildingLevelId,
    coordinates: [{ x: cell.coordinate.x, y: cell.coordinate.y }],
    blockingInstanceId: occupiedCell.instanceId,
    blockingAssetId: occupiedCell.assetId,
    blockingBuildingLevelId: occupiedCell.buildingLevelId,
  };
}

function buildHeightBlockingConflict(occupiedCell: OccupancyCell, blockingCell: BlockingCell): FootprintConflict {
  return {
    conflictType: 'height-blocked-by-lower-footprint',
    message: buildFootprintConflictMessage(
      'height-blocked-by-lower-footprint',
      occupiedCell.instanceId,
      occupiedCell.assetId,
      occupiedCell.buildingLevelId,
      [occupiedCell.coordinate],
      blockingCell.blockedByInstanceId,
    ),
    instanceId: occupiedCell.instanceId,
    assetId: occupiedCell.assetId,
    buildingLevelId: occupiedCell.buildingLevelId,
    coordinates: [{ x: occupiedCell.coordinate.x, y: occupiedCell.coordinate.y }],
    blockingInstanceId: blockingCell.blockedByInstanceId,
    blockingAssetId: blockingCell.blockedByAssetId,
    blockingBuildingLevelId: blockingCell.blockedByBuildingLevelId,
  };
}

function getCandidateBlockingCells(
  levels: readonly BuildingLevel[],
  level: BuildingLevel,
  asset: AssetDefinition,
  occupiedCells: readonly GridCoordinate[],
): BlockingCell[] {
  const levelByNumber = new Map(levels.map((candidate) => [candidate.levelNumber, candidate]));
  const blockingCells: BlockingCell[] = [];

  for (let offset = 1; offset < asset.footprint.height; offset += 1) {
    const blockedLevel = levelByNumber.get(level.levelNumber + offset);

    if (!blockedLevel) {
      continue;
    }

    for (const coordinate of occupiedCells) {
      blockingCells.push({
        buildingLevelId: blockedLevel.id,
        buildingLevelNumber: blockedLevel.levelNumber,
        coordinate: { x: coordinate.x, y: coordinate.y },
        blockedByInstanceId: 'placement-preview',
        blockedByAssetId: asset.assetId,
        blockedByBuildingLevelId: level.id,
      });
    }
  }

  return blockingCells;
}

function buildPlacementEvaluation(
  status: PlacementFootprintStatus,
  asset: AssetDefinition,
  effectiveFootprint: AssetDefinition['footprint'],
  occupiedCells: readonly GridCoordinate[],
  blockingCells: readonly BlockingCell[],
  existingInstances: readonly TileInstance[],
  conflicts: readonly FootprintConflict[],
): PlacementFootprintEvaluation {
  return {
    status,
    canPlace: status === 'ready',
    asset,
    effectiveFootprint,
    occupiedCells: cloneCoordinates(occupiedCells),
    blockingCells: blockingCells.map((cell) => ({
      ...cell,
      coordinate: { x: cell.coordinate.x, y: cell.coordinate.y },
    })),
    existingInstances: [...existingInstances],
    conflicts: conflicts.map((conflict) => ({
      ...conflict,
      coordinates: cloneCoordinates(conflict.coordinates),
    })),
  };
}

function getUniqueInstances(instances: readonly TileInstance[]): TileInstance[] {
  const seen = new Set<string>();
  const unique: TileInstance[] = [];

  for (const instance of instances) {
    if (seen.has(instance.instanceId)) {
      continue;
    }

    seen.add(instance.instanceId);
    unique.push(instance);
  }

  return unique;
}

function coordinatesEqual(left: GridCoordinate, right: GridCoordinate): boolean {
  return left.x === right.x && left.y === right.y;
}
