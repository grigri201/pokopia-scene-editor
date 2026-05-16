import {
  calculateAreaType,
  type GridCoordinate,
  type RotationDegrees,
  type SceneDocument,
  type TileInstance,
} from '../domain/scene';
import { canAssetRequirePlacementSkill, getAssetById, type AssetSkillType } from '../domain/assets';
import type { InteractionMode } from './interaction-mode';

export type InstanceEditFailureReason =
  | 'read-only'
  | 'missing-instance'
  | 'missing-layer'
  | 'locked-layer'
  | 'hidden-layer'
  | 'unknown-asset'
  | 'invalid-coordinate'
  | 'area-incompatible'
  | 'target-conflict'
  | 'not-rotatable'
  | 'not-dyeable'
  | 'not-skill-capable'
  | 'invalid-skill-type';

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
  | (EditAssetInstanceBaseInput & { type: 'asset'; assetId: string })
  | (EditAssetInstanceBaseInput & { type: 'move'; coordinate: GridCoordinate; buildingLevelId?: string })
  | (EditAssetInstanceBaseInput & { type: 'rotate'; rotationDegrees: RotationDegrees })
  | (EditAssetInstanceBaseInput & { type: 'dye'; dyeColor: string | null })
  | (EditAssetInstanceBaseInput & {
      type: 'skill';
      requiresSkill: boolean;
      skillType: AssetSkillType;
      skillNote: string;
    })
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
    case 'asset':
      return changeInstanceAsset(scene, guard.instance, input.assetId, input.now);
    case 'move':
      return moveInstance(scene, guard.instance, input.coordinate, input.buildingLevelId, input.now);
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
    case 'skill':
      return updateSkill(scene, guard.instance, input.requiresSkill, input.skillType, input.skillNote, input.now);
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
    return failure('missing-layer', 'Instance building layer is missing', 'Select another instance or repair the scene data.');
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

function changeInstanceAsset(
  scene: SceneDocument,
  instance: TileInstance,
  assetId: string,
  now: string,
): AssetInstanceEditResult {
  if (instance.assetId === assetId) {
    return { ok: true, scene, instance, message: 'Asset unchanged' };
  }

  const nextAsset = getAssetById(assetId);
  if (!nextAsset) {
    return failure('unknown-asset', 'Unknown replacement asset', 'Choose a valid asset from the Asset Picker.');
  }

  if (!nextAsset.applicableAreas.includes(instance.areaType)) {
    return failure(
      'area-incompatible',
      `${nextAsset.name} cannot be used in ${instance.areaType}`,
      `Choose an asset that supports ${instance.areaType} cells or move the instance first.`,
    );
  }

  const targetInstances = scene.tileInstances.filter(
    (candidate) =>
      candidate.instanceId !== instance.instanceId &&
      candidate.buildingLevelId === instance.buildingLevelId &&
      candidate.coordinate.x === instance.coordinate.x &&
      candidate.coordinate.y === instance.coordinate.y,
  );
  const stackAllowed =
    targetInstances.length === 0 ||
    (nextAsset.stackable && targetInstances.every((candidate) => getAssetById(candidate.assetId)?.stackable === true));

  if (!stackAllowed) {
    return failure(
      'target-conflict',
      `${nextAsset.name} conflicts with ${targetInstances.length} item${
        targetInstances.length === 1 ? '' : 's'
      } at this cell`,
      'Choose a stackable asset, move the instance, or clear the target cell.',
    );
  }

  const nextCanUseSkill = canAssetRequirePlacementSkill(nextAsset);
  const nextRequiresSkill = instance.requiresSkill && nextCanUseSkill;

  return updateInstance(scene, instance, now, 'Asset updated', (current) => ({
    ...current,
    assetId: nextAsset.assetId,
    rotationDegrees: nextAsset.rotatable ? current.rotationDegrees : 0,
    dyeColor: nextAsset.dyeable ? current.dyeColor : null,
    requiresSkill: nextRequiresSkill,
    skillType: nextRequiresSkill ? current.skillType ?? nextAsset.defaultSkillType : null,
    skillNote: nextRequiresSkill ? current.skillNote : '',
  }));
}

function moveInstance(
  scene: SceneDocument,
  instance: TileInstance,
  coordinate: GridCoordinate,
  buildingLevelId: string | undefined,
  now: string,
): AssetInstanceEditResult {
  const asset = getAssetById(instance.assetId);
  if (!asset) {
    return failure('unknown-asset', 'Unknown instance asset', 'Replace the instance with a known asset.');
  }

  const targetBuildingLevelId = buildingLevelId ?? instance.buildingLevelId;
  const targetBuildingLevel = scene.buildingLevels.find((level) => level.id === targetBuildingLevelId);
  if (!targetBuildingLevel) {
    return failure('missing-layer', 'Target building layer is missing', 'Choose an existing target building layer.');
  }

  if (!targetBuildingLevel.visible) {
    return failure('hidden-layer', 'Target layer is hidden', 'Show the target building layer before moving.');
  }

  if (targetBuildingLevel.locked) {
    return failure('locked-layer', 'Target layer is locked', 'Unlock the target building layer before moving.');
  }

  if (
    targetBuildingLevel.id === instance.buildingLevelId &&
    coordinate.x === instance.coordinate.x &&
    coordinate.y === instance.coordinate.y
  ) {
    return { ok: true, scene, instance, message: 'Move target unchanged' };
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
      candidate.buildingLevelId === targetBuildingLevel.id &&
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
    buildingLevelId: targetBuildingLevel.id,
  }), undefined, {
    currentBuildingLevelId: targetBuildingLevel.id,
  });
}

function updateInstance(
  scene: SceneDocument,
  instance: TileInstance,
  now: string,
  message: string,
  update: (instance: TileInstance) => TileInstance,
  capability?: 'rotation' | 'dye',
  workspaceOverride?: Partial<SceneDocument['workspaceState']>,
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
  if (instancesEqual(nextInstance, instance)) {
    return { ok: true, scene, instance, message: `${message} unchanged` };
  }
  const nextTileInstances = scene.tileInstances.map((candidate) =>
    candidate.instanceId === instance.instanceId ? nextInstance : candidate,
  );

  return markEditedScene(scene, now, nextTileInstances, nextInstance, message, workspaceOverride);
}

function updateSkill(
  scene: SceneDocument,
  instance: TileInstance,
  requiresSkill: boolean,
  skillType: AssetSkillType,
  skillNote: string,
  now: string,
): AssetInstanceEditResult {
  const asset = getAssetById(instance.assetId);

  if (!asset) {
    return failure('unknown-asset', 'Unknown instance asset', 'Replace the instance with a known asset.');
  }

  if (!requiresSkill) {
    return updateInstance(scene, instance, now, 'Skill fields saved', (current) => ({
      ...current,
      requiresSkill: false,
      skillType: null,
      skillNote: '',
    }));
  }

  if (!isValidSkillType(skillType)) {
    return failure('invalid-skill-type', 'Invalid skill type', 'Choose leaf, soil, water, or no skill type.');
  }

  if (!canAssetRequirePlacementSkill(asset)) {
    return failure(
      'not-skill-capable',
      `${asset.name} cannot use an instance skill marker`,
      'Choose a skill-capable asset or turn off the skill marker.',
    );
  }

  return updateInstance(scene, instance, now, 'Skill fields saved', (current) => ({
    ...current,
    requiresSkill: true,
    skillType,
    skillNote,
  }));
}

function markEditedScene(
  scene: SceneDocument,
  now: string,
  tileInstances: TileInstance[],
  instance: TileInstance | null,
  message: string,
  workspaceOverride?: Partial<SceneDocument['workspaceState']>,
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
        ...workspaceOverride,
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

function isValidSkillType(value: AssetSkillType): value is AssetSkillType {
  return value === null || value === 'leaf' || value === 'soil' || value === 'water';
}

function instancesEqual(left: TileInstance, right: TileInstance): boolean {
  return (
    left.instanceId === right.instanceId &&
    left.assetId === right.assetId &&
    left.coordinate.x === right.coordinate.x &&
    left.coordinate.y === right.coordinate.y &&
    left.areaType === right.areaType &&
    left.buildingLevelId === right.buildingLevelId &&
    left.rotationDegrees === right.rotationDegrees &&
    left.dyeColor === right.dyeColor &&
    left.requiresSkill === right.requiresSkill &&
    left.skillType === right.skillType &&
    left.skillNote === right.skillNote &&
    left.note === right.note
  );
}
