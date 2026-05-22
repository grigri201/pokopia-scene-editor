import { calculateAreaType, defaultSceneDimensions, type GridCoordinate } from './area';
import type { SkillMarker } from './types';
import type { ConcreteAssetSkillType } from '../assets';

export interface CreateSkillMarkerInput {
  coordinate: GridCoordinate;
  buildingLevelId: string;
  skillType: ConcreteAssetSkillType;
  skillNote?: string;
}

export function createSkillMarker(input: CreateSkillMarkerInput): SkillMarker {
  return {
    coordinate: { x: input.coordinate.x, y: input.coordinate.y },
    areaType: calculateAreaType(input.coordinate, defaultSceneDimensions),
    buildingLevelId: input.buildingLevelId,
    skillType: input.skillType,
    skillNote: input.skillNote ?? '',
  };
}
