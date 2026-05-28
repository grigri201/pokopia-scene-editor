import type { AreaType, GridCoordinate, GridSize } from './area';
import type { AssetSkillType, ConcreteAssetSkillType, PokemonKey } from '../assets';

export type SceneSchemaVersion = 1;
export type RotationDegrees = 0 | 90 | 180 | 270;

export interface SceneMetadata {
  createdAt: string;
  updatedAt: string;
  lastSavedAt: string | null;
  lastAutosavedAt: string | null;
}

export interface BuildingLevel {
  id: string;
  levelNumber: number;
  name: string;
  notes: BuildingLevelNote[];
}

export interface BuildingLevelNote {
  id: string;
  text: string;
}

export interface WorkspaceState {
  currentBuildingLevelId: string;
  selectedAssetId: string | null;
  selectedCoordinate: GridCoordinate | null;
}

export interface TileInstance {
  instanceId: string;
  assetId: string;
  coordinate: GridCoordinate;
  areaType: AreaType;
  buildingLevelId: string;
  rotationDegrees: RotationDegrees;
  dyeColor: string | null;
  requiresSkill: boolean;
  skillType: AssetSkillType;
  skillNote: string;
}

export interface SkillMarker {
  coordinate: GridCoordinate;
  areaType: AreaType;
  buildingLevelId: string;
  skillType: ConcreteAssetSkillType;
  skillNote: string;
}

export interface SceneDocument {
  schemaVersion: SceneSchemaVersion;
  sceneId: string;
  sceneName: string;
  selectedPokemonKey: PokemonKey;
  sceneSize: GridSize;
  canvasSize: GridSize;
  outerPadding: number;
  buildingLevels: BuildingLevel[];
  tileInstances: TileInstance[];
  skillMarkers: SkillMarker[];
  workspaceState: WorkspaceState;
  metadata: SceneMetadata;
}
