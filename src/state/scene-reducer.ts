import {
  assertCanvasCoordinate,
  canvasSize,
  type GridCoordinate,
  type SceneDocument,
} from '../domain/scene';
import type { InteractionMode } from './interaction-mode';

export type SceneAction = {
  type: 'select-coordinate';
  coordinate: GridCoordinate;
  interactionMode: InteractionMode;
};

export function sceneReducer(scene: SceneDocument, action: SceneAction): SceneDocument {
  switch (action.type) {
    case 'select-coordinate':
      return selectCoordinate(scene, action.coordinate, action.interactionMode);
  }
}

export function selectCoordinate(
  scene: SceneDocument,
  coordinate: GridCoordinate,
  interactionMode: InteractionMode,
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  assertCanvasCoordinate(coordinate, {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  });

  return {
    ...scene,
    workspaceState: {
      ...scene.workspaceState,
      selectedCoordinate: { x: coordinate.x, y: coordinate.y },
    },
  };
}

export function moveCoordinate(coordinate: GridCoordinate, direction: 'up' | 'down' | 'left' | 'right') {
  const delta = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[direction];

  return {
    x: clampCanvasCoordinate(coordinate.x + delta.x),
    y: clampCanvasCoordinate(coordinate.y + delta.y),
  };
}

function clampCanvasCoordinate(value: number): number {
  return Math.min(Math.max(value, 0), canvasSize - 1);
}
