import {
  calculateAreaType,
  createSceneDimensionsForCanvasSize,
  getAssetById,
  getEffectiveAssetFootprint,
  getFootprintCells,
  type GridCoordinate,
  type GridSize,
  type SceneDocument,
  type TileInstance,
} from '@pokopia-scene-editor/scene-core';

export interface SceneResizePlan {
  currentCanvasSize: GridSize;
  nextCanvasSize: GridSize;
  xOffset: number;
  yOffset: number;
  leftAdded: number;
  rightAdded: number;
  topAdded: number;
  bottomAdded: number;
  leftRemoved: number;
  rightRemoved: number;
  topRemoved: number;
  bottomRemoved: number;
  survivor: {
    minX: number;
    maxXExclusive: number;
    minY: number;
    maxYExclusive: number;
  };
}

export interface SceneResizeDeletionSummary {
  tileInstanceCount: number;
  skillMarkerCount: number;
  tileInstanceIds: string[];
  skillMarkerKeys: string[];
}

interface AxisResizePlan {
  offset: number;
  leadingAdded: number;
  trailingAdded: number;
  leadingRemoved: number;
  trailingRemoved: number;
  survivorStart: number;
  survivorEndExclusive: number;
}

export function createSceneResizePlan(currentCanvasSize: GridSize, nextCanvasSize: GridSize): SceneResizePlan {
  const currentDimensions = createSceneDimensionsForCanvasSize(currentCanvasSize);
  const nextDimensions = createSceneDimensionsForCanvasSize(nextCanvasSize);
  const xPlan = createAxisResizePlan(currentDimensions.canvasSize.width, nextDimensions.canvasSize.width);
  const yPlan = createAxisResizePlan(currentDimensions.canvasSize.height, nextDimensions.canvasSize.height);

  return {
    currentCanvasSize: { ...currentDimensions.canvasSize },
    nextCanvasSize: { ...nextDimensions.canvasSize },
    xOffset: xPlan.offset,
    yOffset: yPlan.offset,
    leftAdded: xPlan.leadingAdded,
    rightAdded: xPlan.trailingAdded,
    topAdded: yPlan.leadingAdded,
    bottomAdded: yPlan.trailingAdded,
    leftRemoved: xPlan.leadingRemoved,
    rightRemoved: xPlan.trailingRemoved,
    topRemoved: yPlan.leadingRemoved,
    bottomRemoved: yPlan.trailingRemoved,
    survivor: {
      minX: xPlan.survivorStart,
      maxXExclusive: xPlan.survivorEndExclusive,
      minY: yPlan.survivorStart,
      maxYExclusive: yPlan.survivorEndExclusive,
    },
  };
}

export function summarizeSceneResizeDeletion(
  scene: SceneDocument,
  plan: SceneResizePlan,
): SceneResizeDeletionSummary {
  const tileInstanceIds = scene.tileInstances
    .filter((instance) => !doesTileInstanceSurviveResize(instance, plan))
    .map((instance) => instance.instanceId);
  const skillMarkerKeys = scene.skillMarkers
    .filter((marker) => !isSceneResizeSurvivorCoordinate(marker.coordinate, plan))
    .map((marker) => `${marker.buildingLevelId}:${marker.coordinate.x},${marker.coordinate.y}:${marker.skillType}`);

  return {
    tileInstanceCount: tileInstanceIds.length,
    skillMarkerCount: skillMarkerKeys.length,
    tileInstanceIds,
    skillMarkerKeys,
  };
}

export function hasSceneResizeDeletion(summary: SceneResizeDeletionSummary): boolean {
  return summary.tileInstanceCount > 0 || summary.skillMarkerCount > 0;
}

export function resizeSceneDocumentWithPlan(scene: SceneDocument, plan: SceneResizePlan): SceneDocument {
  const nextDimensions = createSceneDimensionsForCanvasSize(plan.nextCanvasSize);

  return {
    ...scene,
    sceneSize: nextDimensions.sceneSize,
    canvasSize: nextDimensions.canvasSize,
    outerPadding: nextDimensions.outerPadding,
    tileInstances: scene.tileInstances
      .filter((instance) => doesTileInstanceSurviveResize(instance, plan))
      .map((instance) => {
        const nextCoordinate = migrateSceneResizeCoordinate(instance.coordinate, plan);

        if (!nextCoordinate) {
          throw new RangeError(`Unable to migrate tile instance ${instance.instanceId}.`);
        }

        return {
          ...instance,
          coordinate: nextCoordinate,
          areaType: calculateAreaType(nextCoordinate, nextDimensions),
        };
      }),
    skillMarkers: scene.skillMarkers
      .filter((marker) => isSceneResizeSurvivorCoordinate(marker.coordinate, plan))
      .map((marker) => {
        const nextCoordinate = migrateSceneResizeCoordinate(marker.coordinate, plan);

        if (!nextCoordinate) {
          throw new RangeError(`Unable to migrate skill marker ${marker.skillType}.`);
        }

        return {
          ...marker,
          coordinate: nextCoordinate,
          areaType: calculateAreaType(nextCoordinate, nextDimensions),
        };
      }),
    workspaceState: {
      ...scene.workspaceState,
      selectedCoordinate: scene.workspaceState.selectedCoordinate
        ? migrateSceneResizeCoordinate(scene.workspaceState.selectedCoordinate, plan)
        : null,
    },
  };
}

export function migrateSceneResizeCoordinate(
  coordinate: GridCoordinate,
  plan: SceneResizePlan,
): GridCoordinate | null {
  if (!isSceneResizeSurvivorCoordinate(coordinate, plan)) {
    return null;
  }

  return {
    x: coordinate.x + plan.xOffset,
    y: coordinate.y + plan.yOffset,
  };
}

export function isSceneResizeSurvivorCoordinate(coordinate: GridCoordinate, plan: SceneResizePlan): boolean {
  return (
    coordinate.x >= plan.survivor.minX &&
    coordinate.x < plan.survivor.maxXExclusive &&
    coordinate.y >= plan.survivor.minY &&
    coordinate.y < plan.survivor.maxYExclusive
  );
}

function createAxisResizePlan(currentSize: number, nextSize: number): AxisResizePlan {
  let leadingAdded = 0;
  let trailingAdded = 0;
  let leadingRemoved = 0;
  let trailingRemoved = 0;

  for (let sizeBeforeStep = currentSize; sizeBeforeStep < nextSize; sizeBeforeStep += 1) {
    if (shouldGrowLeadingEdge(sizeBeforeStep)) {
      leadingAdded += 1;
    } else {
      trailingAdded += 1;
    }
  }

  for (let sizeBeforeStep = currentSize; sizeBeforeStep > nextSize; sizeBeforeStep -= 1) {
    if (shouldShrinkLeadingEdge(sizeBeforeStep)) {
      leadingRemoved += 1;
    } else {
      trailingRemoved += 1;
    }
  }

  return {
    offset: leadingAdded - leadingRemoved,
    leadingAdded,
    trailingAdded,
    leadingRemoved,
    trailingRemoved,
    survivorStart: leadingRemoved,
    survivorEndExclusive: currentSize - trailingRemoved,
  };
}

function shouldGrowLeadingEdge(sizeBeforeStep: number): boolean {
  return sizeBeforeStep % 2 === 1;
}

function shouldShrinkLeadingEdge(sizeBeforeStep: number): boolean {
  return sizeBeforeStep % 2 === 0;
}

function doesTileInstanceSurviveResize(instance: TileInstance, plan: SceneResizePlan): boolean {
  return getTileInstanceFootprintCells(instance).every((coordinate) =>
    isSceneResizeSurvivorCoordinate(coordinate, plan),
  );
}

function getTileInstanceFootprintCells(instance: TileInstance): GridCoordinate[] {
  const asset = getAssetById(instance.assetId);

  if (!asset) {
    return [{ ...instance.coordinate }];
  }

  return getFootprintCells(
    instance.coordinate,
    getEffectiveAssetFootprint(asset.footprint, instance.rotationDegrees),
  );
}
