import { calculateAreaType, defaultSceneDimensions, type GridCoordinate } from './area';
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
  note?: string;
}

export function createTileInstance(input: CreateTileInstanceInput): TileInstance {
  return {
    instanceId: input.instanceId,
    assetId: input.assetId,
    coordinate: input.coordinate,
    areaType: calculateAreaType(input.coordinate, defaultSceneDimensions),
    buildingLevelId: input.buildingLevelId,
    rotationDegrees: input.rotationDegrees ?? 0,
    dyeColor: input.dyeColor ?? null,
    requiresSkill: input.requiresSkill ?? false,
    skillType: input.skillType ?? null,
    skillNote: input.skillNote ?? '',
    note: input.note ?? '',
  };
}
