import {
  assetSkillTypes,
  getAssetById,
  getAssetSkillMarkerIconUrl,
  type AssetFootprint,
  type AssetDefinition,
  type AssetSkillType,
  type ConcreteAssetSkillType,
} from '../assets';
import {
  buildSceneOccupancy,
  type BlockingCell,
  type OccupancyInstance,
  type SceneOccupancy,
  type StackingRelation,
} from './occupancy';
import {
  getBuildingLevelContexts,
  getCanvasCellContexts,
  type BuildingLevelContext,
  type CanvasCellContext,
} from './selectors';
import { sortBuildingLevelsForRender } from './levels';
import type { AreaType, GridCoordinate } from './area';
import type { RotationDegrees, SceneDocument, SkillMarker, TileInstance } from './types';
import type { FootprintConflict } from './footprint';
import {
  defaultLocale,
  getAssetDisplay,
  getBuildingLevelDisplayName,
  getSkillDisplay,
  type Locale,
} from '../../locale';

export interface ImageExportSummary {
  sceneId: string;
  sceneName: string;
  selectedPokemonKey: SceneDocument['selectedPokemonKey'];
  sceneSize: SceneDocument['sceneSize'];
  canvasSize: SceneDocument['canvasSize'];
  outerPadding: number;
  overallMaterials: ExportMaterialSummary[];
  overallSkills: ExportSkillSummary[];
  stackingRelations: ExportStackingRelationSummary[];
  layers: ImageExportLayerSummary[];
}

export interface ImageExportLayerSummary extends BuildingLevelContext {
  empty: boolean;
  materialCount: number;
  skillCount: number;
  stackingRelations: ExportStackingRelationSummary[];
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
  skillName: string;
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
  stackingRelations: ExportStackingRelationSummary[];
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
  footprint: AssetFootprint | null;
  effectiveFootprint: AssetFootprint | null;
  occupiedCells: GridCoordinate[];
  blockingCells: ExportFootprintBlockingSummary[];
  footprintWarnings: string[];
}

export interface ExportFootprintBlockingSummary {
  buildingLevelId: string;
  buildingLevelNumber: number;
  coordinate: GridCoordinate;
  blockedByInstanceId: string;
  blockedByAssetId: string;
  blockedByBuildingLevelId: string;
}

export interface ExportStackingRelationSummary {
  id: string;
  topInstanceId: string;
  topAssetId: string;
  topAssetName: string;
  topThumbnailUrl: string | null;
  topThumbnailAlt: string;
  baseInstanceId: string;
  baseAssetId: string;
  baseAssetName: string;
  baseThumbnailUrl: string | null;
  baseThumbnailAlt: string;
  buildingLevelId: string;
  surfaceKind: StackingRelation['surfaceKind'];
  coordinates: GridCoordinate[];
}

interface ExportFootprintContext {
  occupancyInstancesById: Map<string, OccupancyInstance>;
  blockingCellsByInstanceId: Map<string, BlockingCell[]>;
  conflictsByInstanceId: Map<string, FootprintConflict[]>;
  stackingRelations: ExportStackingRelationSummary[];
  stackingRelationsByCellKey: Map<string, ExportStackingRelationSummary[]>;
}

export function buildImageExportSummary(scene: SceneDocument, locale: Locale = defaultLocale): ImageExportSummary {
  const occupancy = buildSceneOccupancy(scene);
  const footprintContext = buildExportFootprintContext(occupancy, locale);
  const layers = sortBuildingLevelsForRender(getBuildingLevelContexts(scene)).map((level) =>
    buildLayerSummary(scene, level, locale, footprintContext),
  );
  assertAllInstancesExported(scene, layers);
  assertAllSkillMarkersExported(scene, layers);

  return {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    selectedPokemonKey: scene.selectedPokemonKey,
    sceneSize: { ...scene.sceneSize },
    canvasSize: { ...scene.canvasSize },
    outerPadding: scene.outerPadding,
    overallMaterials: aggregateMaterials(scene.tileInstances, locale),
    overallSkills: aggregateSkills(scene.tileInstances, scene.skillMarkers, locale),
    stackingRelations: footprintContext.stackingRelations.map(cloneExportStackingRelationSummary),
    layers,
  };
}

function buildLayerSummary(
  scene: SceneDocument,
  level: BuildingLevelContext,
  locale: Locale,
  footprintContext: ExportFootprintContext,
): ImageExportLayerSummary {
  const cells = getCanvasCellContexts(scene, level.id).map((cell) => toExportCellSummary(cell, locale, footprintContext));
  const layerInstances = cells.flatMap((cell) => cell.tileInstances);
  const layerSkillMarkers = cells.flatMap((cell) => cell.skillMarkers);
  const skills = aggregateLayerSkills(layerInstances, layerSkillMarkers, locale);
  const stackingRelations = footprintContext.stackingRelations
    .filter((relation) => relation.buildingLevelId === level.id)
    .map(cloneExportStackingRelationSummary);

  return {
    ...level,
    name: getBuildingLevelDisplayName(level.name, level.levelNumber, locale),
    empty: layerInstances.length === 0 && layerSkillMarkers.length === 0,
    materialCount: layerInstances.length,
    skillCount: skills.reduce((total, skill) => total + skill.count, 0),
    stackingRelations,
    materials: aggregateLayerMaterials(layerInstances, locale),
    skills,
    cells,
  };
}

function toExportCellSummary(
  cell: CanvasCellContext,
  locale: Locale,
  footprintContext: ExportFootprintContext,
): ImageExportCellSummary {
  const tileInstances = cell.tileInstances.map((instance) => toExportTileInstanceSummary(instance, locale, footprintContext));
  const skillMarkers = cell.skillMarkers.map((marker) => toExportSkillMarkerSummary(marker, locale));
  const stackingRelations = footprintContext.stackingRelationsByCellKey
    .get(getLayerCoordinateKey(cell.buildingLevel.id, cell.coordinate))
    ?.map(cloneExportStackingRelationSummary) ?? [];

  return {
    id: cell.id,
    coordinate: { ...cell.coordinate },
    areaType: cell.areaType,
    placeable: cell.placeable,
    mainBoundary: cell.mainBoundary,
    empty: tileInstances.length === 0 && skillMarkers.length === 0,
    tileInstances,
    skillMarkers,
    stackingRelations,
  };
}

function aggregateMaterials(instances: readonly TileInstance[], locale: Locale): ExportMaterialSummary[] {
  const materialsByAssetId = new Map<string, ExportMaterialSummary>();

  for (const instance of instances) {
    const material = materialsByAssetId.get(instance.assetId) ?? createMaterialSummary(instance.assetId, locale);
    material.totalCount += 1;
    materialsByAssetId.set(instance.assetId, material);
  }

  return sortMaterialSummaries(Array.from(materialsByAssetId.values()));
}

function aggregateSkills(
  instances: readonly TileInstance[],
  skillMarkers: readonly SkillMarker[],
  locale: Locale,
): ExportSkillSummary[] {
  const skillsByType = new Map<ConcreteAssetSkillType, ExportSkillSummary>();

  for (const skillType of getSkillTypesFromInstances(instances)) {
    const skill = skillsByType.get(skillType) ?? createSkillSummary(skillType, locale);
    skill.totalCount += 1;
    skillsByType.set(skillType, skill);
  }

  for (const marker of skillMarkers) {
    const skill = skillsByType.get(marker.skillType) ?? createSkillSummary(marker.skillType, locale);
    skill.totalCount += 1;
    skillsByType.set(marker.skillType, skill);
  }

  return sortSkillSummaries(Array.from(skillsByType.values()));
}

function aggregateLayerMaterials(instances: readonly ExportTileInstanceSummary[], locale: Locale): ExportLayerMaterialSummary[] {
  const materialsByAssetId = new Map<string, ExportLayerMaterialSummary>();

  for (const instance of instances) {
    const material = materialsByAssetId.get(instance.assetId) ?? {
      ...createMaterialSummary(instance.assetId, locale),
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
  locale: Locale,
): ExportLayerSkillSummary[] {
  const skillsByType = new Map<ConcreteAssetSkillType, ExportLayerSkillSummary>();

  for (const skillType of getSkillTypesFromExportInstances(instances)) {
    const skill = skillsByType.get(skillType) ?? {
      ...createSkillSummary(skillType, locale),
      count: 0,
    };
    skill.count += 1;
    skill.totalCount = skill.count;
    skillsByType.set(skillType, skill);
  }

  for (const marker of skillMarkers) {
    const skill = skillsByType.get(marker.skillType) ?? {
      ...createSkillSummary(marker.skillType, locale),
      count: 0,
    };
    skill.count += 1;
    skill.totalCount = skill.count;
    skillsByType.set(marker.skillType, skill);
  }

  return sortSkillSummaries(Array.from(skillsByType.values()));
}

function toExportTileInstanceSummary(
  instance: TileInstance,
  locale: Locale,
  footprintContext: ExportFootprintContext,
): ExportTileInstanceSummary {
  const asset = getAssetById(instance.assetId);
  const assetDisplay = asset ? getAssetDisplay(asset, locale) : null;
  const occupancyInstance = footprintContext.occupancyInstancesById.get(instance.instanceId);
  const footprintWarnings = footprintContext.conflictsByInstanceId.get(instance.instanceId)?.map((conflict) => conflict.message) ?? [];

  if (!asset) {
    footprintWarnings.push(`Unknown asset footprint metadata: ${instance.assetId}`);
  }

  return {
    instanceId: instance.instanceId,
    assetId: instance.assetId,
    assetName: assetDisplay?.name ?? getAssetName(instance.assetId, asset),
    officialId: asset?.officialId ?? null,
    thumbnailUrl: asset?.thumbnailUrl ?? null,
    thumbnailAlt: assetDisplay?.thumbnailAlt ?? asset?.thumbnailAlt ?? instance.assetId,
    coordinate: { ...instance.coordinate },
    areaType: instance.areaType,
    buildingLevelId: instance.buildingLevelId,
    rotationDegrees: instance.rotationDegrees,
    dyeColor: instance.dyeColor,
    requiresSkill: instance.requiresSkill,
    skillType: instance.skillType,
    skillNote: instance.skillNote,
    reproductionNotes: buildReproductionNotes(instance, locale),
    footprint: asset ? cloneFootprint(asset.footprint) : null,
    effectiveFootprint: occupancyInstance ? cloneFootprint(occupancyInstance.effectiveFootprint) : null,
    occupiedCells: occupancyInstance ? cloneCoordinates(occupancyInstance.occupiedCells) : [{ ...instance.coordinate }],
    blockingCells: cloneBlockingCells(footprintContext.blockingCellsByInstanceId.get(instance.instanceId) ?? []),
    footprintWarnings,
  };
}

function toExportSkillMarkerSummary(marker: SkillMarker, locale: Locale): ExportSkillMarkerSummary {
  const skillDisplay = getSkillDisplay(marker.skillType, locale);

  return {
    coordinate: { ...marker.coordinate },
    areaType: marker.areaType,
    buildingLevelId: marker.buildingLevelId,
    skillType: marker.skillType,
    skillLabel: skillDisplay.marker,
    iconUrl: getAssetSkillMarkerIconUrl(marker.skillType),
    iconAlt: locale === 'en-US' ? `${skillDisplay.name} skill icon` : `${marker.skillType}技能图标`,
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
    footprint: instance.footprint ? cloneFootprint(instance.footprint) : null,
    effectiveFootprint: instance.effectiveFootprint ? cloneFootprint(instance.effectiveFootprint) : null,
    occupiedCells: cloneCoordinates(instance.occupiedCells),
    blockingCells: cloneBlockingCells(instance.blockingCells),
    footprintWarnings: [...instance.footprintWarnings],
  };
}

function cloneExportStackingRelationSummary(relation: ExportStackingRelationSummary): ExportStackingRelationSummary {
  return {
    ...relation,
    coordinates: cloneCoordinates(relation.coordinates),
  };
}

function buildExportFootprintContext(occupancy: SceneOccupancy, locale: Locale): ExportFootprintContext {
  const occupancyInstancesById = new Map<string, OccupancyInstance>();
  const blockingCellsByInstanceId = new Map<string, BlockingCell[]>();
  const conflictsByInstanceId = new Map<string, FootprintConflict[]>();
  const stackingRelations = occupancy.stackingRelations.map((relation) => toExportStackingRelationSummary(relation, locale));
  const stackingRelationsByCellKey = new Map<string, ExportStackingRelationSummary[]>();

  for (const occupancyInstance of occupancy.instances) {
    occupancyInstancesById.set(occupancyInstance.instanceId, occupancyInstance);
  }

  for (const blockingCell of occupancy.blockingCells) {
    const blockingCells = blockingCellsByInstanceId.get(blockingCell.blockedByInstanceId) ?? [];
    blockingCells.push(blockingCell);
    blockingCellsByInstanceId.set(blockingCell.blockedByInstanceId, blockingCells);
  }

  for (const conflict of occupancy.conflicts) {
    addConflictByInstanceId(conflictsByInstanceId, conflict.instanceId, conflict);
    if (conflict.blockingInstanceId) {
      addConflictByInstanceId(conflictsByInstanceId, conflict.blockingInstanceId, conflict);
    }
  }

  for (const relation of stackingRelations) {
    for (const coordinate of relation.coordinates) {
      const key = getLayerCoordinateKey(relation.buildingLevelId, coordinate);
      const relations = stackingRelationsByCellKey.get(key) ?? [];
      relations.push(relation);
      stackingRelationsByCellKey.set(key, relations);
    }
  }

  return {
    occupancyInstancesById,
    blockingCellsByInstanceId,
    conflictsByInstanceId,
    stackingRelations,
    stackingRelationsByCellKey,
  };
}

function toExportStackingRelationSummary(
  relation: StackingRelation,
  locale: Locale,
): ExportStackingRelationSummary {
  const topAsset = getAssetById(relation.topAssetId);
  const topAssetDisplay = topAsset ? getAssetDisplay(topAsset, locale) : null;
  const baseAsset = getAssetById(relation.baseAssetId);
  const baseAssetDisplay = baseAsset ? getAssetDisplay(baseAsset, locale) : null;

  return {
    id: `stack:${relation.buildingLevelId}:${relation.baseInstanceId}:${relation.topInstanceId}`,
    topInstanceId: relation.topInstanceId,
    topAssetId: relation.topAssetId,
    topAssetName: topAssetDisplay?.name ?? getAssetName(relation.topAssetId, topAsset),
    topThumbnailUrl: topAsset?.thumbnailUrl ?? null,
    topThumbnailAlt: topAssetDisplay?.thumbnailAlt ?? topAsset?.thumbnailAlt ?? relation.topAssetId,
    baseInstanceId: relation.baseInstanceId,
    baseAssetId: relation.baseAssetId,
    baseAssetName: baseAssetDisplay?.name ?? getAssetName(relation.baseAssetId, baseAsset),
    baseThumbnailUrl: baseAsset?.thumbnailUrl ?? null,
    baseThumbnailAlt: baseAssetDisplay?.thumbnailAlt ?? baseAsset?.thumbnailAlt ?? relation.baseAssetId,
    buildingLevelId: relation.buildingLevelId,
    surfaceKind: relation.surfaceKind,
    coordinates: cloneCoordinates(relation.coordinates),
  };
}

function addConflictByInstanceId(
  conflictsByInstanceId: Map<string, FootprintConflict[]>,
  instanceId: string,
  conflict: FootprintConflict,
): void {
  const conflicts = conflictsByInstanceId.get(instanceId) ?? [];
  conflicts.push(conflict);
  conflictsByInstanceId.set(instanceId, conflicts);
}

function cloneFootprint(footprint: AssetFootprint): AssetFootprint {
  return {
    length: footprint.length,
    width: footprint.width,
    height: footprint.height,
  };
}

function cloneCoordinates(coordinates: readonly GridCoordinate[]): GridCoordinate[] {
  return coordinates.map((coordinate) => ({ x: coordinate.x, y: coordinate.y }));
}

function cloneBlockingCells(cells: readonly ExportFootprintBlockingSummary[]): ExportFootprintBlockingSummary[] {
  return cells.map((cell) => ({
    buildingLevelId: cell.buildingLevelId,
    buildingLevelNumber: cell.buildingLevelNumber,
    coordinate: { x: cell.coordinate.x, y: cell.coordinate.y },
    blockedByInstanceId: cell.blockedByInstanceId,
    blockedByAssetId: cell.blockedByAssetId,
    blockedByBuildingLevelId: cell.blockedByBuildingLevelId,
  }));
}

function getLayerCoordinateKey(buildingLevelId: string, coordinate: GridCoordinate): string {
  return `${buildingLevelId}:${coordinate.x},${coordinate.y}`;
}

function createSkillSummary(skillType: ConcreteAssetSkillType, locale: Locale): ExportSkillSummary {
  const skillDisplay = getSkillDisplay(skillType, locale);

  return {
    skillType,
    skillName: skillDisplay.name,
    skillLabel: skillDisplay.marker,
    iconUrl: getAssetSkillMarkerIconUrl(skillType),
    iconAlt: locale === 'en-US' ? `${skillDisplay.name} skill icon` : `${skillType}技能图标`,
    totalCount: 0,
  };
}

function createMaterialSummary(assetId: string, locale: Locale): ExportMaterialSummary {
  const asset = getAssetById(assetId);
  const assetDisplay = asset ? getAssetDisplay(asset, locale) : null;

  return {
    assetId,
    assetName: assetDisplay?.name ?? getAssetName(assetId, asset),
    officialId: asset?.officialId ?? null,
    thumbnailUrl: asset?.thumbnailUrl ?? null,
    thumbnailAlt: assetDisplay?.thumbnailAlt ?? asset?.thumbnailAlt ?? assetId,
    totalCount: 0,
  };
}

function getAssetName(assetId: string, asset: AssetDefinition | null): string {
  return asset?.name ?? assetId;
}

function buildReproductionNotes(instance: TileInstance, locale: Locale): string[] {
  const notes: string[] = [];

  if (instance.requiresSkill) {
    notes.push(
      locale === 'en-US'
        ? `Skill: ${instance.skillType ? getSkillDisplay(instance.skillType, locale).name : 'Required'}`
        : instance.skillType ? `技能: ${instance.skillType}` : '技能: 需要',
    );
  }

  if (instance.skillNote.trim()) {
    notes.push(locale === 'en-US' ? `Skill note: ${instance.skillNote}` : `技能备注: ${instance.skillNote}`);
  }

  if (instance.dyeColor) {
    notes.push(locale === 'en-US' ? `Dye: ${instance.dyeColor}` : `染色: ${instance.dyeColor}`);
  }

  if (instance.rotationDegrees !== 0) {
    notes.push(locale === 'en-US' ? `Rotation: ${instance.rotationDegrees}°` : `旋转: ${instance.rotationDegrees}°`);
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

    const nameOrder = left.assetName.localeCompare(right.assetName);
    return nameOrder === 0 ? left.assetId.localeCompare(right.assetId, 'en') : nameOrder;
  });
}
