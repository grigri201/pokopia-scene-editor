import {
  assertCanvasCoordinate,
  assertSceneNameLabelsSceneSize,
  canvasSize,
  type GridCoordinate,
  type SceneDocument,
} from '../domain/scene';
import { assertKnownPokemonKey, type PokemonKey } from '../domain/assets';
import type { InteractionMode } from './interaction-mode';

export type SceneAction =
  | {
      type: 'select-coordinate';
      coordinate: GridCoordinate;
      interactionMode: InteractionMode;
    }
  | {
      type: 'update-scene-name';
      sceneName: string;
      interactionMode: InteractionMode;
      now: string;
    }
  | {
      type: 'select-pokemon';
      pokemonKey: PokemonKey;
      interactionMode: InteractionMode;
      now: string;
    }
  | {
      type: 'save-scene';
      interactionMode: InteractionMode;
      now: string;
      result?: 'success' | 'failure';
      errorMessage?: string;
    };

export function sceneReducer(scene: SceneDocument, action: SceneAction): SceneDocument {
  switch (action.type) {
    case 'select-coordinate':
      return selectCoordinate(scene, action.coordinate, action.interactionMode);
    case 'update-scene-name':
      return updateSceneName(scene, action.sceneName, action.interactionMode, action.now);
    case 'select-pokemon':
      return selectPokemon(scene, action.pokemonKey, action.interactionMode, action.now);
    case 'save-scene':
      return saveScene(scene, action.interactionMode, action.now, action.result, action.errorMessage);
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

export function updateSceneName(
  scene: SceneDocument,
  sceneName: string,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  const nextSceneName = sceneName.trim();
  if (nextSceneName === scene.sceneName) {
    return scene;
  }

  assertSceneNameLabelsSceneSize(nextSceneName);

  return markSceneDirty(
    {
      ...scene,
      sceneName: nextSceneName,
    },
    now,
  );
}

export function selectPokemon(
  scene: SceneDocument,
  pokemonKey: PokemonKey,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  assertKnownPokemonKey(pokemonKey);
  if (pokemonKey === scene.selectedPokemonKey) {
    return scene;
  }

  return markSceneDirty(
    {
      ...scene,
      selectedPokemonKey: pokemonKey,
    },
    now,
  );
}

export function saveScene(
  scene: SceneDocument,
  interactionMode: InteractionMode,
  now: string,
  result: 'success' | 'failure' = 'success',
  errorMessage = 'Unable to save scene.',
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  if (result === 'failure') {
    return {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
        saveStatus: 'saveError',
        saveError: errorMessage,
      },
      metadata: {
        ...scene.metadata,
        updatedAt: now,
      },
    };
  }

  return {
    ...scene,
    workspaceState: {
      ...scene.workspaceState,
      saveStatus: 'saved',
      saveError: null,
    },
    metadata: {
      ...scene.metadata,
      updatedAt: now,
      lastSavedAt: now,
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

function markSceneDirty(scene: SceneDocument, now: string): SceneDocument {
  return {
    ...scene,
    workspaceState: {
      ...scene.workspaceState,
      saveStatus: 'dirty',
      saveError: null,
    },
    metadata: {
      ...scene.metadata,
      updatedAt: now,
    },
  };
}
