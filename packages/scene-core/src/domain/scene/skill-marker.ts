import { calculateAreaType, defaultSceneDimensions, type GridCoordinate, type SceneDimensions } from './area';
import type { SkillMarker } from './types';
import type { ConcreteAssetSkillType } from '../assets';

export interface CreateSkillMarkerInput {
  coordinate: GridCoordinate;
  buildingLevelId: string;
  skillType: ConcreteAssetSkillType;
  skillNote?: string;
  dimensions?: SceneDimensions;
}

export function createSkillMarker(input: CreateSkillMarkerInput): SkillMarker {
  const dimensions = input.dimensions ?? defaultSceneDimensions;

  return {
    coordinate: { x: input.coordinate.x, y: input.coordinate.y },
    areaType: calculateAreaType(input.coordinate, dimensions),
    buildingLevelId: input.buildingLevelId,
    skillType: input.skillType,
    skillNote: input.skillNote ?? '',
  };
}
