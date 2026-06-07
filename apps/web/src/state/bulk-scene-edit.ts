import {
  buildSceneOccupancy,
  getCurrentBuildingLevel,
  type GridCoordinate,
  type GridSize,
  type RotationDegrees,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import type { InteractionMode } from './interaction-mode';
import { placeSelectedAsset, type PlacementFailureReason } from './asset-placement';

export interface GridRectangleInput {
  start: GridCoordinate;
  end: GridCoordinate;
}

export interface NormalizedGridRectangle {
  start: GridCoordinate;
  end: GridCoordinate;
  coordinates: GridCoordinate[];
}

export type RectangleEditSkippedReason = PlacementFailureReason;

export interface RectangleEditSummary {
  rectangle: NormalizedGridRectangle;
  skipped: number;
  skippedReasons: Partial<Record<RectangleEditSkippedReason, number>>;
}

export type RectangleClearResult =
  | {
      ok: true;
      scene: SceneDocument;
      cleared: number;
      clearedInstanceIds: string[];
      summary: RectangleEditSummary;
    }
  | {
      ok: false;
      reason: 'read-only';
      scene: SceneDocument;
      summary: RectangleEditSummary;
    };

export type RectangleFillResult =
  | {
      ok: true;
      scene: SceneDocument;
      placed: number;
      summary: RectangleEditSummary;
    }
  | {
      ok: false;
      reason: 'read-only';
      scene: SceneDocument;
      summary: RectangleEditSummary;
    };

export interface ClearRectangleInput extends GridRectangleInput {
  interactionMode: InteractionMode;
  now: string;
}

export interface FillRectangleInput extends GridRectangleInput {
  interactionMode: InteractionMode;
  now: string;
  createInstanceId: () => string;
  requiresSkill: boolean;
  rotationDegrees?: RotationDegrees;
}

export function normalizeGridRectangle(
  input: GridRectangleInput,
  canvasSize?: GridSize,
): NormalizedGridRectangle {
  const rawStart = {
    x: Math.min(input.start.x, input.end.x),
    y: Math.min(input.start.y, input.end.y),
  };
  const rawEnd = {
    x: Math.max(input.start.x, input.end.x),
    y: Math.max(input.start.y, input.end.y),
  };
  const start = canvasSize ? clampCoordinate(rawStart, canvasSize) : rawStart;
  const end = canvasSize ? clampCoordinate(rawEnd, canvasSize) : rawEnd;
  const coordinates: GridCoordinate[] = [];

  for (let y = start.y; y <= end.y; y += 1) {
    for (let x = start.x; x <= end.x; x += 1) {
      coordinates.push({ x, y });
    }
  }

  return { start, end, coordinates };
}

export function clearSceneRectangle(
  scene: SceneDocument,
  input: ClearRectangleInput,
): RectangleClearResult {
  const rectangle = normalizeGridRectangle(input, scene.canvasSize);
  const emptySummary = createRectangleEditSummary(rectangle);

  if (input.interactionMode === 'readOnly') {
    return {
      ok: false,
      reason: 'read-only',
      scene,
      summary: emptySummary,
    };
  }

  const currentLevel = getCurrentBuildingLevel(scene);
  const occupancy = buildSceneOccupancy(scene);
  const rectangleKeys = new Set(rectangle.coordinates.map(getCoordinateKey));
  const instanceIdsToDelete = new Set<string>();

  for (const occupancyInstance of occupancy.instances) {
    if (occupancyInstance.buildingLevelId !== currentLevel.id) {
      continue;
    }

    if (occupancyInstance.occupiedCells.some((coordinate) => rectangleKeys.has(getCoordinateKey(coordinate)))) {
      instanceIdsToDelete.add(occupancyInstance.instanceId);
    }
  }

  const clearedInstanceIds = Array.from(instanceIdsToDelete);

  if (clearedInstanceIds.length === 0) {
    return {
      ok: true,
      scene,
      cleared: 0,
      clearedInstanceIds,
      summary: emptySummary,
    };
  }

  return {
    ok: true,
    scene: {
      ...scene,
      tileInstances: scene.tileInstances.filter((instance) => !instanceIdsToDelete.has(instance.instanceId)),
      workspaceState: {
        ...scene.workspaceState,
        selectedCoordinate: { ...rectangle.end },
      },
      metadata: {
        ...scene.metadata,
        updatedAt: input.now,
      },
    },
    cleared: clearedInstanceIds.length,
    clearedInstanceIds,
    summary: emptySummary,
  };
}

export function fillSceneRectangleWithSelectedAsset(
  scene: SceneDocument,
  input: FillRectangleInput,
): RectangleFillResult {
  const rectangle = normalizeGridRectangle(input, scene.canvasSize);
  const summary = createRectangleEditSummary(rectangle);

  if (input.interactionMode === 'readOnly') {
    return {
      ok: false,
      reason: 'read-only',
      scene,
      summary,
    };
  }

  let nextScene = scene;
  let placed = 0;

  for (const coordinate of rectangle.coordinates) {
    const placement = placeSelectedAsset(nextScene, {
      coordinate,
      interactionMode: input.interactionMode,
      now: input.now,
      instanceId: input.createInstanceId(),
      requiresSkill: input.requiresSkill,
      confirmReplace: false,
      rotationDegrees: input.rotationDegrees ?? 0,
    });

    if (placement.ok) {
      nextScene = placement.scene;
      placed += 1;
      continue;
    }

    summary.skipped += 1;
    summary.skippedReasons[placement.reason] = (summary.skippedReasons[placement.reason] ?? 0) + 1;
  }

  return {
    ok: true,
    scene: nextScene,
    placed,
    summary,
  };
}

function createRectangleEditSummary(rectangle: NormalizedGridRectangle): RectangleEditSummary {
  return {
    rectangle,
    skipped: 0,
    skippedReasons: {},
  };
}

function clampCoordinate(coordinate: GridCoordinate, canvasSize: GridSize): GridCoordinate {
  return {
    x: Math.min(Math.max(coordinate.x, 0), Math.max(canvasSize.width - 1, 0)),
    y: Math.min(Math.max(coordinate.y, 0), Math.max(canvasSize.height - 1, 0)),
  };
}

function getCoordinateKey(coordinate: GridCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}
