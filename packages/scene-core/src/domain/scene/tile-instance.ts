import { calculateAreaType, defaultSceneDimensions, type GridCoordinate, type SceneDimensions } from './area';
import type { RotationDegrees, TileInstance } from './types';
import type { AssetSkillType } from '../assets';

export interface CreateTileInstanceInput {
  instanceId: string;
  assetId: string;
  coordinate: GridCoordinate;
  buildingLevelId: string;
  rotationDegrees?: RotationDegrees;
  dyeColor?: string | null;
  requiresSkill?: boolean;
  skillType?: AssetSkillType;
  skillNote?: string;
  dimensions?: SceneDimensions;
}

export function createTileInstance(input: CreateTileInstanceInput): TileInstance {
  const dimensions = input.dimensions ?? defaultSceneDimensions;

  return {
    instanceId: input.instanceId,
    assetId: input.assetId,
    coordinate: input.coordinate,
    areaType: calculateAreaType(input.coordinate, dimensions),
    buildingLevelId: input.buildingLevelId,
    rotationDegrees: input.rotationDegrees ?? 0,
    dyeColor: input.dyeColor ?? null,
    requiresSkill: input.requiresSkill ?? false,
    skillType: input.skillType ?? null,
    skillNote: input.skillNote ?? '',
  };
}
