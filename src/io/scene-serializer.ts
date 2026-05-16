import { getAssetById } from '../domain/assets';
import { calculateAreaType, type SceneDocument } from '../domain/scene';
import { sceneDocumentV1Schema, type SceneDocumentV1 } from './scene-schema';

export function serializeSceneDocument(scene: SceneDocument): SceneDocumentV1 {
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
      areaType: calculateAreaType(instance.coordinate, dimensions),
      buildingLevelId: instance.buildingLevelId,
      rotationDegrees: instance.rotationDegrees,
      dyeColor: serializeDyeColor(instance.assetId, instance.dyeColor),
      requiresSkill: instance.requiresSkill,
      skillType: instance.skillType ?? null,
      skillNote: instance.skillNote ?? '',
      note: instance.note ?? '',
    })),
    workspaceState: {
      currentBuildingLevelId: scene.workspaceState.currentBuildingLevelId,
      selectedAssetId: scene.workspaceState.selectedAssetId,
      selectedCoordinate: scene.workspaceState.selectedCoordinate
        ? { ...scene.workspaceState.selectedCoordinate }
        : null,
      saveStatus: scene.workspaceState.saveStatus === 'saved' ? 'saved' : 'dirty',
    },
    metadata: { ...scene.metadata },
  };

  return sceneDocumentV1Schema.parse(payload);
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
