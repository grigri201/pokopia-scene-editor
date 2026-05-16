import {
  calculateAreaType,
  type GridCoordinate,
  type RotationDegrees,
  type SceneDocument,
  type TileInstance,
} from '../domain/scene';
import { getAssetById } from '../domain/assets';
import type { InteractionMode } from './interaction-mode';

export type InstanceEditFailureReason =
  | 'read-only'
  | 'missing-instance'
  | 'locked-layer'
  | 'hidden-layer'
  | 'unknown-asset'
  | 'invalid-coordinate'
  | 'area-incompatible'
  | 'target-conflict'
  | 'not-rotatable'
  | 'not-dyeable';

export type AssetInstanceEditResult =
  | {
      ok: true;
      scene: SceneDocument;
      instance: TileInstance | null;
      message: string;
    }
  | {
      ok: false;
      reason: InstanceEditFailureReason;
      message: string;
      repairHint: string;
    };

export interface EditAssetInstanceBaseInput {
  instanceId: string;
  interactionMode: InteractionMode;
  now: string;
}

export type EditAssetInstanceInput =
  | (EditAssetInstanceBaseInput & { type: 'delete' })
  | (EditAssetInstanceBaseInput & { type: 'move'; coordinate: GridCoordinate })
  | (EditAssetInstanceBaseInput & { type: 'rotate'; rotationDegrees: RotationDegrees })
  | (EditAssetInstanceBaseInput & { type: 'dye'; dyeColor: string | null })
  | (EditAssetInstanceBaseInput & { type: 'note'; note: string });

export function editAssetInstance(
  scene: SceneDocument,
  input: EditAssetInstanceInput,
): AssetInstanceEditResult {
  const guard = validateEditableInstance(scene, input.instanceId, input.interactionMode);
  if (!guard.ok) {
    return guard;
  }

  switch (input.type) {
    case 'delete':
      return markEditedScene(
        scene,
        input.now,
        scene.tileInstances.filter((instance) => instance.instanceId !== input.instanceId),
        null,
        'Instance deleted',
      );
    case 'move':
      return moveInstance(scene, guard.instance, input.coordinate, input.now);
    case 'rotate':
      return updateInstance(
        scene,
        guard.instance,
        input.now,
        'Rotation updated',
        (instance) => ({
          ...instance,
          rotationDegrees: input.rotationDegrees,
        }),
        'rotation',
      );
    case 'dye':
      return updateInstance(
        scene,
        guard.instance,
        input.now,
        'Dye updated',
        (instance) => ({
          ...instance,
          dyeColor: input.dyeColor,
        }),
        'dye',
      );
    case 'note':
      return updateInstance(scene, guard.instance, input.now, 'Note saved', (instance) => ({
        ...instance,
        note: input.note,
      }));
  }
}

function validateEditableInstance(
  scene: SceneDocument,
  instanceId: string,
  interactionMode: InteractionMode,
):
  | { ok: true; instance: TileInstance }
  | { ok: false; reason: InstanceEditFailureReason; message: string; repairHint: string } {
  if (interactionMode === 'readOnly') {
    return failure('read-only', 'Read-only mode', 'Use desktop edit mode to edit instances.');
  }

  const instance = scene.tileInstances.find((candidate) => candidate.instanceId === instanceId);
  if (!instance) {
    return failure('missing-instance', 'No selected instance', 'Select a placed asset instance first.');
  }

  const buildingLevel = scene.buildingLevels.find((level) => level.id === instance.buildingLevelId);
  if (!buildingLevel) {
    return failure('missing-instance', 'Instance building layer is missing', 'Select another instance.');
  }

  if (!buildingLevel.visible) {
    return failure('hidden-layer', 'Instance layer is hidden', 'Show the building layer before editing.');
  }

  if (buildingLevel.locked) {
    return failure('locked-layer', 'Instance layer is locked', 'Unlock the building layer before editing.');
  }

  const asset = getAssetById(instance.assetId);
  if (!asset) {
    return failure('unknown-asset', 'Unknown instance asset', 'Replace the instance with a known asset.');
  }

  return { ok: true, instance };
}

function moveInstance(
  scene: SceneDocument,
  instance: TileInstance,
  coordinate: GridCoordinate,
  now: string,
): AssetInstanceEditResult {
  const asset = getAssetById(instance.assetId);
  if (!asset) {
    return failure('unknown-asset', 'Unknown instance asset', 'Replace the instance with a known asset.');
  }

  const dimensions = {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  };
  const targetAreaTypeResult = getTargetAreaType(coordinate, dimensions);
  if (!targetAreaTypeResult.ok) {
    return targetAreaTypeResult;
  }
  const targetAreaType = targetAreaTypeResult.areaType;
  if (!asset.applicableAreas.includes(targetAreaType)) {
    return failure(
      'area-incompatible',
      `${asset.name} cannot move to ${targetAreaType}`,
      `Choose a ${asset.applicableAreas.join(' or ')} cell.`,
    );
  }

  const targetInstances = scene.tileInstances.filter(
    (candidate) =>
      candidate.instanceId !== instance.instanceId &&
      candidate.buildingLevelId === instance.buildingLevelId &&
      candidate.coordinate.x === coordinate.x &&
      candidate.coordinate.y === coordinate.y,
  );
  const stackAllowed =
    targetInstances.length === 0 ||
    (asset.stackable && targetInstances.every((candidate) => getAssetById(candidate.assetId)?.stackable === true));

  if (!stackAllowed) {
    return failure(
      'target-conflict',
      `Move blocked by ${targetInstances.length} item${targetInstances.length === 1 ? '' : 's'} at target`,
      'Move to an empty compatible cell or choose a stackable target.',
    );
  }

  return updateInstance(scene, instance, now, 'Instance moved', (current) => ({
    ...current,
    coordinate: { x: coordinate.x, y: coordinate.y },
    areaType: targetAreaType,
  }));
}

function updateInstance(
  scene: SceneDocument,
  instance: TileInstance,
  now: string,
  message: string,
  update: (instance: TileInstance) => TileInstance,
  capability?: 'rotation' | 'dye',
): AssetInstanceEditResult {
  const asset = getAssetById(instance.assetId);

  if (!asset) {
    return failure('unknown-asset', 'Unknown instance asset', 'Replace the instance with a known asset.');
  }

  if (capability === 'rotation' && !asset.rotatable) {
    return failure('not-rotatable', `${asset.name} cannot rotate`, 'Select a rotatable asset instance.');
  }

  if (capability === 'dye' && !asset.dyeable) {
    return failure('not-dyeable', `${asset.name} cannot be dyed`, 'Select a dyeable asset instance.');
  }

  const nextInstance = update(instance);
  const nextTileInstances = scene.tileInstances.map((candidate) =>
    candidate.instanceId === instance.instanceId ? nextInstance : candidate,
  );

  return markEditedScene(scene, now, nextTileInstances, nextInstance, message);
}

function markEditedScene(
  scene: SceneDocument,
  now: string,
  tileInstances: TileInstance[],
  instance: TileInstance | null,
  message: string,
): AssetInstanceEditResult {
  return {
    ok: true,
    instance,
    message,
    scene: {
      ...scene,
      tileInstances,
      workspaceState: {
        ...scene.workspaceState,
        selectedCoordinate: instance
          ? { x: instance.coordinate.x, y: instance.coordinate.y }
          : scene.workspaceState.selectedCoordinate,
        saveStatus: 'dirty',
        saveError: null,
      },
      metadata: {
        ...scene.metadata,
        updatedAt: now,
      },
    },
  };
}

function failure(
  reason: InstanceEditFailureReason,
  message: string,
  repairHint: string,
): Extract<AssetInstanceEditResult, { ok: false }> {
  return {
    ok: false,
    reason,
    message,
    repairHint,
  };
}

function getTargetAreaType(
  coordinate: GridCoordinate,
  dimensions: Pick<SceneDocument, 'sceneSize' | 'canvasSize' | 'outerPadding'>,
): { ok: true; areaType: ReturnType<typeof calculateAreaType> } | Extract<AssetInstanceEditResult, { ok: false }> {
  try {
    return { ok: true, areaType: calculateAreaType(coordinate, dimensions) };
  } catch {
    return failure(
      'invalid-coordinate',
      'Invalid target coordinate',
      `Use whole-number coordinates inside 0..${dimensions.canvasSize.width - 1}, 0..${dimensions.canvasSize.height - 1}.`,
    );
  }
}
