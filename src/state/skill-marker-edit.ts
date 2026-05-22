import {
  assertCanvasCoordinate,
  createSkillMarker,
  type GridCoordinate,
  type SceneDocument,
  type SkillMarker,
} from '../domain/scene';
import { isAssetSkillType, type AssetSkillType, type ConcreteAssetSkillType } from '../domain/assets';
import type { InteractionMode } from './interaction-mode';

export type SkillMarkerEditFailureReason = 'read-only' | 'missing-layer' | 'invalid-skill-type';

export type SkillMarkerEditResult =
  | {
      ok: true;
      scene: SceneDocument;
      marker: SkillMarker | null;
      message: string;
    }
  | {
      ok: false;
      reason: SkillMarkerEditFailureReason;
      message: string;
      repairHint: string;
    };

export interface SaveCellSkillMarkerInput {
  coordinate: GridCoordinate;
  buildingLevelId: string;
  requiresSkill: boolean;
  skillType: AssetSkillType;
  skillNote: string;
  interactionMode: InteractionMode;
  now: string;
}

export function saveCellSkillMarker(
  scene: SceneDocument,
  input: SaveCellSkillMarkerInput,
): SkillMarkerEditResult {
  if (input.interactionMode === 'readOnly') {
    return failure('read-only', 'Read-only mode', 'Use desktop edit mode to edit skill markers.');
  }

  assertCanvasCoordinate(input.coordinate, {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  });

  if (!scene.buildingLevels.some((level) => level.id === input.buildingLevelId)) {
    return failure('missing-layer', 'Skill marker building layer is missing', 'Select another building layer or repair the scene data.');
  }

  if (!input.requiresSkill) {
    return markEditedScene(
      scene,
      input.now,
      scene.skillMarkers.filter((marker) => !isSameCellMarker(marker, input.buildingLevelId, input.coordinate)),
      null,
      'Skill marker removed',
      input.coordinate,
    );
  }

  if (!isConcreteSkillType(input.skillType)) {
    return failure('invalid-skill-type', 'Invalid skill type', 'Choose 树叶, 耕地, or 储水.');
  }

  const nextMarker = createSkillMarker({
    coordinate: input.coordinate,
    buildingLevelId: input.buildingLevelId,
    skillType: input.skillType,
    skillNote: input.skillNote,
  });
  const remainingMarkers = scene.skillMarkers.filter(
    (marker) => !isSameCellMarker(marker, input.buildingLevelId, input.coordinate),
  );

  return markEditedScene(
    scene,
    input.now,
    [...remainingMarkers, nextMarker],
    nextMarker,
    'Skill marker saved',
    input.coordinate,
  );
}

function markEditedScene(
  scene: SceneDocument,
  now: string,
  skillMarkers: SkillMarker[],
  marker: SkillMarker | null,
  message: string,
  selectedCoordinate: GridCoordinate,
): SkillMarkerEditResult {
  if (skillMarkersEqual(scene.skillMarkers, skillMarkers)) {
    return { ok: true, scene, marker, message: `${message} unchanged` };
  }

  return {
    ok: true,
    marker,
    message,
    scene: {
      ...scene,
      skillMarkers,
      workspaceState: {
        ...scene.workspaceState,
        selectedCoordinate: { x: selectedCoordinate.x, y: selectedCoordinate.y },
      },
      metadata: {
        ...scene.metadata,
        updatedAt: now,
      },
    },
  };
}

function failure(
  reason: SkillMarkerEditFailureReason,
  message: string,
  repairHint: string,
): Extract<SkillMarkerEditResult, { ok: false }> {
  return {
    ok: false,
    reason,
    message,
    repairHint,
  };
}

function isConcreteSkillType(value: AssetSkillType): value is ConcreteAssetSkillType {
  return value !== null && isAssetSkillType(value);
}

function isSameCellMarker(marker: SkillMarker, buildingLevelId: string, coordinate: GridCoordinate): boolean {
  return (
    marker.buildingLevelId === buildingLevelId &&
    marker.coordinate.x === coordinate.x &&
    marker.coordinate.y === coordinate.y
  );
}

function skillMarkersEqual(left: readonly SkillMarker[], right: readonly SkillMarker[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((leftMarker, index) => {
    const rightMarker = right[index];

    return (
      rightMarker &&
      leftMarker.coordinate.x === rightMarker.coordinate.x &&
      leftMarker.coordinate.y === rightMarker.coordinate.y &&
      leftMarker.areaType === rightMarker.areaType &&
      leftMarker.buildingLevelId === rightMarker.buildingLevelId &&
      leftMarker.skillType === rightMarker.skillType &&
      leftMarker.skillNote === rightMarker.skillNote
    );
  });
}
