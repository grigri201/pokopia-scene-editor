import {
  createTileInstance,
  evaluateScenePlacementFootprint,
  getCellContext,
  getCurrentBuildingLevel,
  type FootprintConflict,
  type GridCoordinate,
  type RotationDegrees,
  type SceneDocument,
  type StackingRelation,
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
  stackingRelations: readonly StackingRelation[];
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
  const shouldReplaceExistingInstances = input.confirmReplace && evaluation.preview.stackingRelations.length === 0;
  const nextTileInstances = shouldReplaceExistingInstances
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
    const stackingConflictMessage = getStackingConflictMessage(footprintEvaluation.conflicts, asset.assetId);
    return failure(
      'footprint-blocked',
      stackingConflictMessage ?? footprintEvaluation.conflicts.map((conflict) => conflict.conflictType).join(', '),
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
      message: getReadyPlacementMessage(footprintEvaluation),
      repairHint: getReadyPlacementRepairHint(footprintEvaluation),
      skillLabel,
      overwriteLabel: getReadyPlacementOverwriteLabel(footprintEvaluation),
      asset,
      effectiveFootprint: footprintEvaluation.effectiveFootprint,
      occupiedCells: footprintEvaluation.occupiedCells,
      footprintConflicts: [],
      existingInstances,
      stackingRelations: footprintEvaluation.stackingRelations,
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
        stackingRelations: footprintEvaluation?.stackingRelations ?? [],
      },
    };
  }
}

function getReadyPlacementMessage(footprintEvaluation: ReturnType<typeof evaluateScenePlacementFootprint>): string {
  const relation = footprintEvaluation.stackingRelations[0];

  if (!relation) {
    return 'Ready to place';
  }

  return `Will stack ${getAssetLabel(relation.topAssetId)} on ${getAssetLabel(relation.baseAssetId)}`;
}

function getReadyPlacementRepairHint(footprintEvaluation: ReturnType<typeof evaluateScenePlacementFootprint>): string {
  const relation = footprintEvaluation.stackingRelations[0];

  if (!relation) {
    return 'Click or press Enter to place.';
  }

  return `Click or press Enter to place above ${getAssetLabel(relation.baseAssetId)}.`;
}

function getReadyPlacementOverwriteLabel(footprintEvaluation: ReturnType<typeof evaluateScenePlacementFootprint>): string {
  const relation = footprintEvaluation.stackingRelations[0];

  if (!relation) {
    return 'No overwrite';
  }

  return `Stack on ${getAssetLabel(relation.baseAssetId)}`;
}

function getStackingConflictMessage(conflicts: readonly FootprintConflict[], topAssetId: string): string | null {
  const conflict = conflicts.find((candidate) =>
    candidate.conflictType === 'unsupported-stack-surface' ||
    candidate.conflictType === 'surface-capacity-conflict',
  );

  if (!conflict) {
    return null;
  }

  return `${conflict.conflictType}: top=${getAssetLabel(topAssetId)} base=${getAssetLabel(conflict.blockingAssetId)} level=${conflict.buildingLevelId} coordinates=${formatCoordinates(conflict.coordinates)}`;
}

function getAssetLabel(assetId: string | undefined): string {
  if (!assetId) {
    return 'unknown asset';
  }

  return getAssetById(assetId)?.name ?? assetId;
}

function formatCoordinates(coordinates: readonly GridCoordinate[]): string {
  return coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`).join(' ');
}

function getPlacementSkillLabel(requiresSkill: boolean): string {
  if (!requiresSkill) {
    return 'No skill required';
  }

  return 'Skill required';
}
