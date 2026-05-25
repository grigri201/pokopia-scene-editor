import {
  createTileInstance,
  getCellContext,
  getCurrentBuildingLevel,
  type GridCoordinate,
  type SceneDocument,
  type TileInstance,
} from '@pokopia-scene-editor/scene-core';
import { getAssetById, type AssetDefinition } from '@pokopia-scene-editor/scene-core';
import type { InteractionMode } from './interaction-mode';

export type PlacementStatus = 'ready' | 'blocked' | 'will-replace' | 'no-asset' | 'read-only';

export interface AssetPlacementPreview {
  status: PlacementStatus;
  canPlace: boolean;
  message: string;
  repairHint: string;
  skillLabel: string;
  overwriteLabel: string;
  asset: AssetDefinition | null;
  existingInstances: readonly TileInstance[];
}

export type PlacementFailureReason =
  | 'read-only'
  | 'missing-asset'
  | 'unknown-asset'
  | 'replace-confirmation-required';

export type AssetPlacementCommandResult =
  | {
      ok: true;
      scene: SceneDocument;
      preview: AssetPlacementPreview;
    }
  | {
      ok: false;
      reason: PlacementFailureReason;
      preview: AssetPlacementPreview;
    };

export interface PlaceSelectedAssetInput {
  coordinate: GridCoordinate;
  interactionMode: InteractionMode;
  now: string;
  instanceId: string;
  requiresSkill: boolean;
  confirmReplace?: boolean;
}

export function getAssetPlacementPreview(
  scene: SceneDocument,
  coordinate: GridCoordinate | null,
  interactionMode: InteractionMode,
  requiresSkill: boolean,
): AssetPlacementPreview | null {
  if (!coordinate) {
    return null;
  }

  return evaluatePlacement(scene, coordinate, interactionMode, requiresSkill, false).preview;
}

export function placeSelectedAsset(
  scene: SceneDocument,
  input: PlaceSelectedAssetInput,
): AssetPlacementCommandResult {
  const evaluation = evaluatePlacement(
    scene,
    input.coordinate,
    input.interactionMode,
    input.requiresSkill,
    Boolean(input.confirmReplace),
  );

  if (evaluation.failureReason) {
    return {
      ok: false,
      reason: evaluation.failureReason,
      preview: evaluation.preview,
    };
  }

  const asset = evaluation.preview.asset;
  if (!asset) {
    return {
      ok: false,
      reason: 'missing-asset',
      preview: evaluation.preview,
    };
  }

  const currentLevel = getCurrentBuildingLevel(scene);
  const tileInstance = createTileInstance({
    instanceId: input.instanceId,
    assetId: asset.assetId,
    coordinate: input.coordinate,
    buildingLevelId: currentLevel.id,
    requiresSkill: input.requiresSkill,
    skillType: null,
  });
  const nextTileInstances = input.confirmReplace
    ? scene.tileInstances.filter(
        (instance) =>
          !(
            instance.buildingLevelId === currentLevel.id &&
            instance.coordinate.x === input.coordinate.x &&
            instance.coordinate.y === input.coordinate.y
          ),
      )
    : scene.tileInstances;

  return {
    ok: true,
    preview: evaluation.preview,
    scene: {
      ...scene,
      tileInstances: [...nextTileInstances, tileInstance],
      workspaceState: {
        ...scene.workspaceState,
        selectedCoordinate: { x: input.coordinate.x, y: input.coordinate.y },
      },
      metadata: {
        ...scene.metadata,
        updatedAt: input.now,
      },
    },
  };
}

function evaluatePlacement(
  scene: SceneDocument,
  coordinate: GridCoordinate,
  interactionMode: InteractionMode,
  requiresSkill: boolean,
  confirmReplace: boolean,
): {
  preview: AssetPlacementPreview;
  failureReason: PlacementFailureReason | null;
} {
  const assetId = scene.workspaceState.selectedAssetId;
  const asset = getAssetById(assetId);
  const cellContext = getCellContext(scene, coordinate);
  const existingInstances = cellContext.tileInstances;
  const skillLabel = getPlacementSkillLabel(Boolean(asset && requiresSkill));

  if (interactionMode === 'readOnly') {
    return failure('read-only', 'Read-only mode', 'Use desktop edit mode to place assets.');
  }

  if (!assetId) {
    return failure('missing-asset', 'No current asset', 'Choose an asset before placing.');
  }

  if (!asset) {
    return failure('unknown-asset', 'Unknown current asset', 'Choose a valid asset from the Asset Picker.');
  }

  const hasExistingInstances = existingInstances.length > 0;

  if (hasExistingInstances && !confirmReplace) {
    return failure(
      'replace-confirmation-required',
      `Will replace ${existingInstances.length} item${existingInstances.length === 1 ? '' : 's'}`,
      'Confirm replacement before placing.',
      'will-replace',
    );
  }

  return {
    failureReason: null,
    preview: {
      status: 'ready',
      canPlace: true,
      message: 'Ready to place',
      repairHint: 'Click or press Enter to place.',
      skillLabel,
      overwriteLabel: 'No overwrite',
      asset,
      existingInstances,
    },
  };

  function failure(
    reason: PlacementFailureReason,
    message: string,
    repairHint: string,
    status: PlacementStatus = 'blocked',
  ) {
    return {
      failureReason: reason,
      preview: {
        status,
        canPlace: false,
        message,
        repairHint,
        skillLabel,
        overwriteLabel:
          status === 'will-replace'
            ? `Will replace ${existingInstances.length} item${existingInstances.length === 1 ? '' : 's'}`
            : existingInstances.length > 0
              ? `${existingInstances.length} item${existingInstances.length === 1 ? '' : 's'} at target`
              : 'No overwrite',
        asset,
        existingInstances,
      },
    };
  }
}

function getPlacementSkillLabel(requiresSkill: boolean): string {
  if (!requiresSkill) {
    return 'No skill required';
  }

  return 'Skill required';
}
