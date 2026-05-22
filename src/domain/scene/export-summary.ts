import { getAssetById, type AssetDefinition, type AssetSkillType } from '../assets';
import {
  getBuildingLevelContexts,
  getCanvasCellContexts,
  type BuildingLevelContext,
  type CanvasCellContext,
} from './selectors';
import type { AreaType, GridCoordinate } from './area';
import type { RotationDegrees, SceneDocument, TileInstance } from './types';

export interface ImageExportSummary {
  sceneId: string;
  sceneName: string;
  selectedPokemonKey: SceneDocument['selectedPokemonKey'];
  sceneSize: SceneDocument['sceneSize'];
  canvasSize: SceneDocument['canvasSize'];
  outerPadding: number;
  overallMaterials: ExportMaterialSummary[];
  layers: ImageExportLayerSummary[];
}

export interface ImageExportLayerSummary extends BuildingLevelContext {
  empty: boolean;
  materialCount: number;
  materials: ExportLayerMaterialSummary[];
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

export interface ImageExportCellSummary {
  id: string;
  coordinate: GridCoordinate;
  areaType: AreaType;
  placeable: boolean;
  mainBoundary: boolean;
  empty: boolean;
  tileInstances: ExportTileInstanceSummary[];
}

export interface ExportTileInstanceSummary {
  instanceId: string;
  assetId: string;
  assetName: string;
  officialId: string | null;
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
  const layers = getBuildingLevelContexts(scene).map((level) => buildLayerSummary(scene, level));
  assertAllInstancesExported(scene, layers);

  return {
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    selectedPokemonKey: scene.selectedPokemonKey,
    sceneSize: { ...scene.sceneSize },
    canvasSize: { ...scene.canvasSize },
    outerPadding: scene.outerPadding,
    overallMaterials: aggregateMaterials(scene.tileInstances),
    layers,
  };
}

function buildLayerSummary(scene: SceneDocument, level: BuildingLevelContext): ImageExportLayerSummary {
  const cells = getCanvasCellContexts(scene, level.id).map(toExportCellSummary);
  const layerInstances = cells.flatMap((cell) => cell.tileInstances);

  return {
    ...level,
    empty: layerInstances.length === 0,
    materialCount: layerInstances.length,
    materials: aggregateLayerMaterials(layerInstances),
    cells,
  };
}

function toExportCellSummary(cell: CanvasCellContext): ImageExportCellSummary {
  const tileInstances = cell.tileInstances.map(toExportTileInstanceSummary);

  return {
    id: cell.id,
    coordinate: { ...cell.coordinate },
    areaType: cell.areaType,
    placeable: cell.placeable,
    mainBoundary: cell.mainBoundary,
    empty: tileInstances.length === 0,
    tileInstances,
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

function toExportTileInstanceSummary(instance: TileInstance): ExportTileInstanceSummary {
  const asset = getAssetById(instance.assetId);

  return {
    instanceId: instance.instanceId,
    assetId: instance.assetId,
    assetName: getAssetName(instance.assetId, asset),
    officialId: asset?.officialId ?? null,
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

function cloneExportTileInstanceSummary(instance: ExportTileInstanceSummary): ExportTileInstanceSummary {
  return {
    ...instance,
    coordinate: { ...instance.coordinate },
    reproductionNotes: [...instance.reproductionNotes],
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
