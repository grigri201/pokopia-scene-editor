import {
  assetSkillTypes,
  getAssetById,
  getAssetSkillMarkerIconUrl,
  getAssetSkillMarkerLabel,
  type AssetDefinition,
  type AssetSkillType,
  type ConcreteAssetSkillType,
} from '../assets';
import {
  getBuildingLevelContexts,
  getCanvasCellContexts,
  type BuildingLevelContext,
  type CanvasCellContext,
} from './selectors';
import { sortBuildingLevelsForRender } from './levels';
import type { AreaType, GridCoordinate } from './area';
import type { RotationDegrees, SceneDocument, SkillMarker, TileInstance } from './types';

export interface ImageExportSummary {
  sceneId: string;
  sceneName: string;
  selectedPokemonKey: SceneDocument['selectedPokemonKey'];
  sceneSize: SceneDocument['sceneSize'];
  canvasSize: SceneDocument['canvasSize'];
  outerPadding: number;
  overallMaterials: ExportMaterialSummary[];
  overallSkills: ExportSkillSummary[];
  layers: ImageExportLayerSummary[];
}

export interface ImageExportLayerSummary extends BuildingLevelContext {
  empty: boolean;
  materialCount: number;
  skillCount: number;
  materials: ExportLayerMaterialSummary[];
  skills: ExportLayerSkillSummary[];
  cells: ImageExportCellSummary[];
}

export interface ExportMaterialSummary {
  assetId: string;
  assetName: string;
  officialId: string | null;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  totalCount: number;
}

export interface ExportLayerMaterialSummary extends ExportMaterialSummary {
  count: number;
  instances: ExportTileInstanceSummary[];
}

export interface ExportSkillSummary {
  skillType: ConcreteAssetSkillType;
  skillLabel: string;
  iconUrl: string | null;
  iconAlt: string;
  totalCount: number;
}

export interface ExportLayerSkillSummary extends ExportSkillSummary {
  count: number;
}

export interface ImageExportCellSummary {
  id: string;
  coordinate: GridCoordinate;
  areaType: AreaType;
  placeable: boolean;
  mainBoundary: boolean;
  empty: boolean;
  tileInstances: ExportTileInstanceSummary[];
  skillMarkers: ExportSkillMarkerSummary[];
}

export interface ExportSkillMarkerSummary {
  coordinate: GridCoordinate;
  areaType: AreaType;
  buildingLevelId: string;
  skillType: ConcreteAssetSkillType;
  skillLabel: string;
  iconUrl: string | null;
  iconAlt: string;
  skillNote: string;
}

export interface ExportTileInstanceSummary {
  instanceId: string;
  assetId: string;
  assetName: string;
  officialId: string | null;
  thumbnailUrl: string | null;
  thumbnailAlt: string;
  coordinate: GridCoordinate;
  areaType: AreaType;
  buildingLevelId: string;
  rotationDegrees: RotationDegrees;
  dyeColor: string | null;
  requiresSkill: boolean;
  skillType: AssetSkillType;
  skillNote: string;
  reproductionNotes: string[];
}

export function buildImageExportSummary(scene: SceneDocument): ImageExportSummary {
  const layers = sortBuildingLevelsForRender(getBuildingLevelContexts(scene)).map((level) => buildLayerSummary(scene, level));
  assertAllInstancesExported(scene, layers);
  assertAllSkillMarkersExported(scene, layers);

  return {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    selectedPokemonKey: scene.selectedPokemonKey,
    sceneSize: { ...scene.sceneSize },
    canvasSize: { ...scene.canvasSize },
    outerPadding: scene.outerPadding,
    overallMaterials: aggregateMaterials(scene.tileInstances),
    overallSkills: aggregateSkills(scene.tileInstances, scene.skillMarkers),
    layers,
  };
}

function buildLayerSummary(scene: SceneDocument, level: BuildingLevelContext): ImageExportLayerSummary {
  const cells = getCanvasCellContexts(scene, level.id).map(toExportCellSummary);
  const layerInstances = cells.flatMap((cell) => cell.tileInstances);
  const layerSkillMarkers = cells.flatMap((cell) => cell.skillMarkers);
  const skills = aggregateLayerSkills(layerInstances, layerSkillMarkers);

  return {
    ...level,
    empty: layerInstances.length === 0 && layerSkillMarkers.length === 0,
    materialCount: layerInstances.length,
    skillCount: skills.reduce((total, skill) => total + skill.count, 0),
    materials: aggregateLayerMaterials(layerInstances),
    skills,
    cells,
  };
}

function toExportCellSummary(cell: CanvasCellContext): ImageExportCellSummary {
  const tileInstances = cell.tileInstances.map(toExportTileInstanceSummary);
  const skillMarkers = cell.skillMarkers.map(toExportSkillMarkerSummary);

  return {
    id: cell.id,
    coordinate: { ...cell.coordinate },
    areaType: cell.areaType,
    placeable: cell.placeable,
    mainBoundary: cell.mainBoundary,
    empty: tileInstances.length === 0 && skillMarkers.length === 0,
    tileInstances,
    skillMarkers,
  };
}

function aggregateMaterials(instances: readonly TileInstance[]): ExportMaterialSummary[] {
  const materialsByAssetId = new Map<string, ExportMaterialSummary>();

  for (const instance of instances) {
    const material = materialsByAssetId.get(instance.assetId) ?? createMaterialSummary(instance.assetId);
    material.totalCount += 1;
    materialsByAssetId.set(instance.assetId, material);
  }

  return sortMaterialSummaries(Array.from(materialsByAssetId.values()));
}

function aggregateSkills(
  instances: readonly TileInstance[],
  skillMarkers: readonly SkillMarker[],
): ExportSkillSummary[] {
  const skillsByType = new Map<ConcreteAssetSkillType, ExportSkillSummary>();

  for (const skillType of getSkillTypesFromInstances(instances)) {
    const skill = skillsByType.get(skillType) ?? createSkillSummary(skillType);
    skill.totalCount += 1;
    skillsByType.set(skillType, skill);
  }

  for (const marker of skillMarkers) {
    const skill = skillsByType.get(marker.skillType) ?? createSkillSummary(marker.skillType);
    skill.totalCount += 1;
    skillsByType.set(marker.skillType, skill);
  }

  return sortSkillSummaries(Array.from(skillsByType.values()));
}

function aggregateLayerMaterials(instances: readonly ExportTileInstanceSummary[]): ExportLayerMaterialSummary[] {
  const materialsByAssetId = new Map<string, ExportLayerMaterialSummary>();

  for (const instance of instances) {
    const material = materialsByAssetId.get(instance.assetId) ?? {
      ...createMaterialSummary(instance.assetId),
      count: 0,
      instances: [],
    };
    material.count += 1;
    material.totalCount = material.count;
    material.instances.push(cloneExportTileInstanceSummary(instance));
    materialsByAssetId.set(instance.assetId, material);
  }

  return sortMaterialSummaries(Array.from(materialsByAssetId.values()));
}

function aggregateLayerSkills(
  instances: readonly ExportTileInstanceSummary[],
  skillMarkers: readonly ExportSkillMarkerSummary[],
): ExportLayerSkillSummary[] {
  const skillsByType = new Map<ConcreteAssetSkillType, ExportLayerSkillSummary>();

  for (const skillType of getSkillTypesFromExportInstances(instances)) {
    const skill = skillsByType.get(skillType) ?? {
      ...createSkillSummary(skillType),
      count: 0,
    };
    skill.count += 1;
    skill.totalCount = skill.count;
    skillsByType.set(skillType, skill);
  }

  for (const marker of skillMarkers) {
    const skill = skillsByType.get(marker.skillType) ?? {
      ...createSkillSummary(marker.skillType),
      count: 0,
    };
    skill.count += 1;
    skill.totalCount = skill.count;
    skillsByType.set(marker.skillType, skill);
  }

  return sortSkillSummaries(Array.from(skillsByType.values()));
}

function toExportTileInstanceSummary(instance: TileInstance): ExportTileInstanceSummary {
  const asset = getAssetById(instance.assetId);

  return {
    instanceId: instance.instanceId,
    assetId: instance.assetId,
    assetName: getAssetName(instance.assetId, asset),
    officialId: asset?.officialId ?? null,
    thumbnailUrl: asset?.thumbnailUrl ?? null,
    thumbnailAlt: asset?.thumbnailAlt ?? instance.assetId,
    coordinate: { ...instance.coordinate },
    areaType: instance.areaType,
    buildingLevelId: instance.buildingLevelId,
    rotationDegrees: instance.rotationDegrees,
    dyeColor: instance.dyeColor,
    requiresSkill: instance.requiresSkill,
    skillType: instance.skillType,
    skillNote: instance.skillNote,
    reproductionNotes: buildReproductionNotes(instance),
  };
}

function toExportSkillMarkerSummary(marker: SkillMarker): ExportSkillMarkerSummary {
  return {
    coordinate: { ...marker.coordinate },
    areaType: marker.areaType,
    buildingLevelId: marker.buildingLevelId,
    skillType: marker.skillType,
    skillLabel: getAssetSkillMarkerLabel(marker.skillType),
    iconUrl: getAssetSkillMarkerIconUrl(marker.skillType),
    iconAlt: `${marker.skillType}技能图标`,
    skillNote: marker.skillNote,
  };
}

function assertAllInstancesExported(scene: SceneDocument, layers: readonly ImageExportLayerSummary[]): void {
  const exportedInstanceIds = new Set(
    layers.flatMap((layer) => layer.cells.flatMap((cell) => cell.tileInstances.map((instance) => instance.instanceId))),
  );
  const missingInstanceIds = scene.tileInstances
    .filter((instance) => !exportedInstanceIds.has(instance.instanceId))
    .map((instance) => instance.instanceId);

  if (missingInstanceIds.length > 0 || exportedInstanceIds.size !== scene.tileInstances.length) {
    throw new RangeError(
      `Unable to include tile instances in image export layer cells: ${missingInstanceIds.join(', ') || 'duplicate instance ids'}`,
    );
  }
}

function assertAllSkillMarkersExported(scene: SceneDocument, layers: readonly ImageExportLayerSummary[]): void {
  const exportedSkillMarkerKeys = new Set(
    layers.flatMap((layer) =>
      layer.cells.flatMap((cell) =>
        cell.skillMarkers.map((marker) => `${marker.buildingLevelId}:${marker.coordinate.x},${marker.coordinate.y}`),
      ),
    ),
  );
  const missingSkillMarkerKeys = scene.skillMarkers
    .map((marker) => `${marker.buildingLevelId}:${marker.coordinate.x},${marker.coordinate.y}`)
    .filter((key) => !exportedSkillMarkerKeys.has(key));

  if (missingSkillMarkerKeys.length > 0 || exportedSkillMarkerKeys.size !== scene.skillMarkers.length) {
    throw new RangeError(
      `Unable to include skill markers in image export layer cells: ${missingSkillMarkerKeys.join(', ') || 'duplicate skill marker coordinates'}`,
    );
  }
}

function cloneExportTileInstanceSummary(instance: ExportTileInstanceSummary): ExportTileInstanceSummary {
  return {
    ...instance,
    coordinate: { ...instance.coordinate },
    reproductionNotes: [...instance.reproductionNotes],
  };
}

function createSkillSummary(skillType: ConcreteAssetSkillType): ExportSkillSummary {
  return {
    skillType,
    skillLabel: getAssetSkillMarkerLabel(skillType),
    iconUrl: getAssetSkillMarkerIconUrl(skillType),
    iconAlt: `${skillType}技能图标`,
    totalCount: 0,
  };
}

function createMaterialSummary(assetId: string): ExportMaterialSummary {
  const asset = getAssetById(assetId);

  return {
    assetId,
    assetName: getAssetName(assetId, asset),
    officialId: asset?.officialId ?? null,
    thumbnailUrl: asset?.thumbnailUrl ?? null,
    thumbnailAlt: asset?.thumbnailAlt ?? assetId,
    totalCount: 0,
  };
}

function getAssetName(assetId: string, asset: AssetDefinition | null): string {
  return asset?.name ?? assetId;
}

function buildReproductionNotes(instance: TileInstance): string[] {
  const notes: string[] = [];

  if (instance.requiresSkill) {
    notes.push(instance.skillType ? `技能: ${instance.skillType}` : '技能: 需要');
  }

  if (instance.skillNote.trim()) {
    notes.push(`技能备注: ${instance.skillNote}`);
  }

  if (instance.dyeColor) {
    notes.push(`染色: ${instance.dyeColor}`);
  }

  if (instance.rotationDegrees !== 0) {
    notes.push(`旋转: ${instance.rotationDegrees}°`);
  }

  return notes;
}

function getSkillTypesFromInstances(instances: readonly TileInstance[]): ConcreteAssetSkillType[] {
  return instances
    .map((instance) => (instance.requiresSkill ? instance.skillType : null))
    .filter(isConcreteSkillType);
}

function getSkillTypesFromExportInstances(instances: readonly ExportTileInstanceSummary[]): ConcreteAssetSkillType[] {
  return instances
    .map((instance) => (instance.requiresSkill ? instance.skillType : null))
    .filter(isConcreteSkillType);
}

function isConcreteSkillType(skillType: AssetSkillType): skillType is ConcreteAssetSkillType {
  return skillType !== null;
}

function sortSkillSummaries<T extends Pick<ExportSkillSummary, 'skillType' | 'totalCount'>>(skills: T[]): T[] {
  return skills.sort((left, right) => {
    if (left.totalCount !== right.totalCount) {
      return right.totalCount - left.totalCount;
    }

    return assetSkillTypes.indexOf(left.skillType) - assetSkillTypes.indexOf(right.skillType);
  });
}

function sortMaterialSummaries<T extends Pick<ExportMaterialSummary, 'assetId' | 'assetName' | 'totalCount'>>(
  materials: T[],
): T[] {
  return materials.sort((left, right) => {
    if (left.totalCount !== right.totalCount) {
      return right.totalCount - left.totalCount;
    }

    const nameOrder = left.assetName.localeCompare(right.assetName, 'zh-Hans');
    return nameOrder === 0 ? left.assetId.localeCompare(right.assetId, 'en') : nameOrder;
  });
}
