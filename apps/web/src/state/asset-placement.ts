import {
  createTileInstance,
  evaluateScenePlacementFootprint,
  getCellContext,
  getCurrentBuildingLevel,
  type FootprintConflict,
  type GridCoordinate,
  type RotationDegrees,
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
  effectiveFootprint: AssetDefinition['footprint'] | null;
  occupiedCells: readonly GridCoordinate[];
  footprintConflicts: readonly FootprintConflict[];
  existingInstances: readonly TileInstance[];
}

export type PlacementFailureReason =
  | 'read-only'
  | 'missing-asset'
  | 'unknown-asset'
  | 'footprint-blocked'
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
  rotationDegrees?: RotationDegrees;
}

export function getAssetPlacementPreview(
  scene: SceneDocument,
  coordinate: GridCoordinate | null,
  interactionMode: InteractionMode,
  requiresSkill: boolean,
  rotationDegrees: RotationDegrees = 0,
): AssetPlacementPreview | null {
  if (!coordinate) {
    return null;
  }

  return evaluatePlacement(scene, coordinate, interactionMode, requiresSkill, false, rotationDegrees).preview;
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
    input.rotationDegrees ?? 0,
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
    rotationDegrees: input.rotationDegrees ?? 0,
    requiresSkill: input.requiresSkill,
    skillType: null,
  });
  const replacementInstanceIds = new Set(evaluation.preview.existingInstances.map((instance) => instance.instanceId));
  const nextTileInstances = input.confirmReplace
    ? scene.tileInstances.filter((instance) => !replacementInstanceIds.has(instance.instanceId))
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
  rotationDegrees: RotationDegrees,
): {
  preview: AssetPlacementPreview;
  failureReason: PlacementFailureReason | null;
} {
  const assetId = scene.workspaceState.selectedAssetId;
  const asset = getAssetById(assetId);
  const cellContext = getCellContext(scene, coordinate);
  const anchorCellInstances = cellContext.tileInstances;
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

  const currentLevel = getCurrentBuildingLevel(scene);
  const footprintEvaluation = evaluateScenePlacementFootprint(scene, {
    asset,
    coordinate,
    buildingLevelId: currentLevel.id,
    rotationDegrees,
    confirmReplace,
  });
  const existingInstances = footprintEvaluation.existingInstances;

  if (footprintEvaluation.status === 'blocked') {
    return failure(
      'footprint-blocked',
      footprintEvaluation.conflicts.map((conflict) => conflict.conflictType).join(', '),
      'Choose another anchor cell or remove the blocking footprint conflict.',
      'blocked',
      footprintEvaluation,
    );
  }

  if (footprintEvaluation.status === 'will-replace' && !confirmReplace) {
    return failure(
      'replace-confirmation-required',
      `Will replace ${existingInstances.length} item${existingInstances.length === 1 ? '' : 's'}`,
      'Confirm replacement before placing.',
      'will-replace',
      footprintEvaluation,
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
      effectiveFootprint: footprintEvaluation.effectiveFootprint,
      occupiedCells: footprintEvaluation.occupiedCells,
      footprintConflicts: [],
      existingInstances,
    },
  };

  function failure(
    reason: PlacementFailureReason,
    message: string,
    repairHint: string,
    status: PlacementStatus = 'blocked',
    footprintEvaluation?: ReturnType<typeof evaluateScenePlacementFootprint>,
  ) {
    const previewExistingInstances = footprintEvaluation?.existingInstances ?? anchorCellInstances;
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
            ? `Will replace ${previewExistingInstances.length} item${previewExistingInstances.length === 1 ? '' : 's'}`
            : previewExistingInstances.length > 0
              ? `${previewExistingInstances.length} item${previewExistingInstances.length === 1 ? '' : 's'} at target`
              : 'No overwrite',
        asset,
        effectiveFootprint: footprintEvaluation?.effectiveFootprint ?? asset?.footprint ?? null,
        occupiedCells: footprintEvaluation?.occupiedCells ?? [],
        footprintConflicts: footprintEvaluation?.conflicts ?? [],
        existingInstances: previewExistingInstances,
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
