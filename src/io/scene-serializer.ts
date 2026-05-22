import { getAssetById } from '../domain/assets';
import { calculateAreaType, type SceneDocument } from '../domain/scene';
import { sceneDocumentV1Schema, type SceneDocumentV1 } from './scene-schema';

export function serializeSceneDocument(scene: SceneDocument): SceneDocumentV1 {
  return sceneDocumentV1Schema.parse(createSceneDocumentV1PayloadInput(scene));
}

export function createSceneDocumentV1PayloadInput(scene: SceneDocument): unknown {
  const dimensions = {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  };

  const payload = {
    schemaVersion: 1,
    sceneId: scene.sceneId,
    sceneName: scene.sceneName,
    selectedPokemonKey: scene.selectedPokemonKey,
    sceneSize: { ...scene.sceneSize },
    canvasSize: { ...scene.canvasSize },
    outerPadding: scene.outerPadding,
    buildingLevels: scene.buildingLevels.map((level) => ({ ...level })),
    tileInstances: scene.tileInstances.map((instance) => ({
      instanceId: instance.instanceId,
      assetId: instance.assetId,
      coordinate: { ...instance.coordinate },
      areaType: calculateSerializableAreaType(instance, dimensions),
      buildingLevelId: instance.buildingLevelId,
      rotationDegrees: instance.rotationDegrees,
      dyeColor: serializeDyeColor(instance.assetId, instance.dyeColor),
      requiresSkill: instance.requiresSkill,
      skillType: instance.skillType ?? null,
      skillNote: instance.skillNote ?? '',
    })),
    skillMarkers: scene.skillMarkers.map((marker) => ({
      coordinate: { ...marker.coordinate },
      areaType: calculateSerializableAreaType(marker, dimensions),
      buildingLevelId: marker.buildingLevelId,
      skillType: marker.skillType,
      skillNote: marker.skillNote ?? '',
    })),
    workspaceState: {
      currentBuildingLevelId: scene.workspaceState.currentBuildingLevelId,
      selectedAssetId: scene.workspaceState.selectedAssetId,
      selectedCoordinate: scene.workspaceState.selectedCoordinate
        ? { ...scene.workspaceState.selectedCoordinate }
        : null,
    },
    metadata: { ...scene.metadata },
  };

  return payload;
}

export function stringifySceneDocument(scene: SceneDocument, spacing?: number): string {
  return JSON.stringify(serializeSceneDocument(scene), null, spacing);
}

function serializeDyeColor(assetId: string, dyeColor: string | null): string | null {
  const asset = getAssetById(assetId);

  if (!asset?.dyeable || !isHexDyeColor(dyeColor)) {
    return null;
  }

  return dyeColor;
}

function isHexDyeColor(value: string | null): value is string {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? '');
}

function calculateSerializableAreaType(
  item: Pick<SceneDocument['tileInstances'][number], 'coordinate' | 'areaType'>,
  dimensions: Parameters<typeof calculateAreaType>[1],
) {
  try {
    return calculateAreaType(item.coordinate, dimensions);
  } catch {
    return item.areaType;
  }
}
