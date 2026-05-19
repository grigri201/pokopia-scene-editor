import {
  type RotationDegrees,
  type SceneDocument,
  type TileInstance,
} from '../domain/scene';
import {
  canAssetRequirePlacementSkill,
  getAssetById,
  isAssetSkillType,
  toAssetSkillType,
  type AssetSkillType,
} from '../domain/assets';
import type { InteractionMode } from './interaction-mode';

export type InstanceEditFailureReason =
  | 'read-only'
  | 'missing-instance'
  | 'missing-layer'
  | 'unknown-asset'
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
  | (EditAssetInstanceBaseInput & { type: 'rotate'; rotationDegrees: RotationDegrees })
  | (EditAssetInstanceBaseInput & { type: 'dye'; dyeColor: string | null })
  | (EditAssetInstanceBaseInput & {
      type: 'skill';
      requiresSkill: boolean;
      skillType: AssetSkillType;
      skillNote: string;
    });

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

  const nextCanUseSkill = canAssetRequirePlacementSkill(nextAsset);
  const nextRequiresSkill = instance.requiresSkill && nextCanUseSkill;

  return updateInstance(scene, instance, now, 'Asset updated', (current) => ({
    ...current,
    assetId: nextAsset.assetId,
    dyeColor: nextAsset.dyeable ? current.dyeColor : null,
    requiresSkill: nextRequiresSkill,
    skillType: nextRequiresSkill ? toAssetSkillType(current.skillType) ?? nextAsset.defaultSkillType : null,
    skillNote: nextRequiresSkill ? current.skillNote : '',
  }));
}

function updateInstance(
  scene: SceneDocument,
  instance: TileInstance,
  now: string,
  message: string,
  update: (instance: TileInstance) => TileInstance,
  capability?: 'dye',
  workspaceOverride?: Partial<SceneDocument['workspaceState']>,
): AssetInstanceEditResult {
  const asset = getAssetById(instance.assetId);

  if (!asset) {
    return failure('unknown-asset', 'Unknown instance asset', 'Replace the instance with a known asset.');
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
    return failure('invalid-skill-type', 'Invalid skill type', 'Choose 树叶, 耕地, 储水, or no skill type.');
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

function isValidSkillType(value: AssetSkillType): value is AssetSkillType {
  return value === null || isAssetSkillType(value);
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
    left.skillNote === right.skillNote
  );
}
