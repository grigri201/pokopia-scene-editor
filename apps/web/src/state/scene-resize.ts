import {
  calculateAreaType,
  createSceneDimensionsForCanvasSize,
  getAssetById,
  getEffectiveAssetFootprint,
  getFootprintCells,
  maxEditableCanvasSize,
  minEditableCanvasSize,
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
  affectedBuildingLevels: SceneResizeAffectedBuildingLevel[];
}

export interface SceneResizeAffectedBuildingLevel {
  buildingLevelId: string;
  buildingLevelName: string;
  buildingLevelNumber: number;
  tileInstanceCount: number;
  skillMarkerCount: number;
}

export type SceneResizeEdge = 'top' | 'right' | 'bottom' | 'left';
export type SceneResizeEdgeDelta = -1 | 1;

export interface SceneEdgeResizeRequest {
  edge: SceneResizeEdge;
  delta: SceneResizeEdgeDelta;
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

export function createSceneEdgeResizePlan(
  currentCanvasSize: GridSize,
  request: SceneEdgeResizeRequest,
): SceneResizePlan | null {
  const currentDimensions = createSceneDimensionsForCanvasSize(currentCanvasSize);
  const currentSize = currentDimensions.canvasSize;
  const nextCanvasSize = getNextEdgeCanvasSize(currentSize, request);

  if (!isEditableCanvasSize(nextCanvasSize)) {
    return null;
  }

  const nextDimensions = createSceneDimensionsForCanvasSize(nextCanvasSize);
  const plan = createEmptyResizePlan(currentSize, nextDimensions.canvasSize);

  switch (request.edge) {
    case 'left':
      if (request.delta > 0) {
        plan.leftAdded = 1;
        plan.xOffset = 1;
      } else {
        plan.leftRemoved = 1;
        plan.xOffset = -1;
        plan.survivor.minX = 1;
      }
      break;
    case 'right':
      if (request.delta > 0) {
        plan.rightAdded = 1;
      } else {
        plan.rightRemoved = 1;
        plan.survivor.maxXExclusive = currentSize.width - 1;
      }
      break;
    case 'top':
      if (request.delta > 0) {
        plan.topAdded = 1;
        plan.yOffset = 1;
      } else {
        plan.topRemoved = 1;
        plan.yOffset = -1;
        plan.survivor.minY = 1;
      }
      break;
    case 'bottom':
      if (request.delta > 0) {
        plan.bottomAdded = 1;
      } else {
        plan.bottomRemoved = 1;
        plan.survivor.maxYExclusive = currentSize.height - 1;
      }
      break;
  }

  return plan;
}

export function summarizeSceneResizeDeletion(
  scene: SceneDocument,
  plan: SceneResizePlan,
): SceneResizeDeletionSummary {
  const deletedTileInstances = scene.tileInstances.filter((instance) => !doesTileInstanceSurviveResize(instance, plan));
  const deletedSkillMarkers = scene.skillMarkers.filter((marker) =>
    !isSceneResizeSurvivorCoordinate(marker.coordinate, plan),
  );
  const tileInstanceIds = deletedTileInstances.map((instance) => instance.instanceId);
  const skillMarkerKeys = deletedSkillMarkers.map((marker) =>
    `${marker.buildingLevelId}:${marker.coordinate.x},${marker.coordinate.y}:${marker.skillType}`,
  );

  return {
    tileInstanceCount: tileInstanceIds.length,
    skillMarkerCount: skillMarkerKeys.length,
    tileInstanceIds,
    skillMarkerKeys,
    affectedBuildingLevels: summarizeAffectedBuildingLevels(scene, deletedTileInstances, deletedSkillMarkers),
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

function createEmptyResizePlan(currentCanvasSize: GridSize, nextCanvasSize: GridSize): SceneResizePlan {
  return {
    currentCanvasSize: { ...currentCanvasSize },
    nextCanvasSize: { ...nextCanvasSize },
    xOffset: 0,
    yOffset: 0,
    leftAdded: 0,
    rightAdded: 0,
    topAdded: 0,
    bottomAdded: 0,
    leftRemoved: 0,
    rightRemoved: 0,
    topRemoved: 0,
    bottomRemoved: 0,
    survivor: {
      minX: 0,
      maxXExclusive: currentCanvasSize.width,
      minY: 0,
      maxYExclusive: currentCanvasSize.height,
    },
  };
}

function getNextEdgeCanvasSize(currentCanvasSize: GridSize, request: SceneEdgeResizeRequest): GridSize {
  switch (request.edge) {
    case 'left':
    case 'right':
      return {
        ...currentCanvasSize,
        width: currentCanvasSize.width + request.delta,
      };
    case 'top':
    case 'bottom':
      return {
        ...currentCanvasSize,
        height: currentCanvasSize.height + request.delta,
      };
  }
}

function isEditableCanvasSize(canvasSize: GridSize): boolean {
  return (
    canvasSize.width >= minEditableCanvasSize &&
    canvasSize.width <= maxEditableCanvasSize &&
    canvasSize.height >= minEditableCanvasSize &&
    canvasSize.height <= maxEditableCanvasSize
  );
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

function summarizeAffectedBuildingLevels(
  scene: SceneDocument,
  deletedTileInstances: TileInstance[],
  deletedSkillMarkers: SceneDocument['skillMarkers'],
): SceneResizeAffectedBuildingLevel[] {
  const countsByLevelId = new Map<string, { tileInstanceCount: number; skillMarkerCount: number }>();

  for (const instance of deletedTileInstances) {
    const current = countsByLevelId.get(instance.buildingLevelId) ?? { tileInstanceCount: 0, skillMarkerCount: 0 };
    current.tileInstanceCount += 1;
    countsByLevelId.set(instance.buildingLevelId, current);
  }

  for (const marker of deletedSkillMarkers) {
    const current = countsByLevelId.get(marker.buildingLevelId) ?? { tileInstanceCount: 0, skillMarkerCount: 0 };
    current.skillMarkerCount += 1;
    countsByLevelId.set(marker.buildingLevelId, current);
  }

  const levelById = new Map(scene.buildingLevels.map((level) => [level.id, level]));

  return Array.from(countsByLevelId.entries())
    .map(([buildingLevelId, counts]) => {
      const buildingLevel = levelById.get(buildingLevelId);

      return {
        buildingLevelId,
        buildingLevelName: buildingLevel?.name ?? buildingLevelId,
        buildingLevelNumber: buildingLevel?.levelNumber ?? Number.MAX_SAFE_INTEGER,
        ...counts,
      };
    })
    .sort((a, b) => a.buildingLevelNumber - b.buildingLevelNumber || a.buildingLevelId.localeCompare(b.buildingLevelId));
}
