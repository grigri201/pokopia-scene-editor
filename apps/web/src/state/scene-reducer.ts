import {
  assertCanvasCoordinate,
  assertSceneNameLabelsSceneSize,
  defaultSceneDimensions,
  type GridCoordinate,
  type GridSize,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import { assertKnownAssetId, assertKnownPokemonKey, type PokemonKey } from '@pokopia-scene-editor/scene-core';
import type { InteractionMode } from './interaction-mode';
import { createSceneResizePlan, resizeSceneDocumentWithPlan } from './scene-resize';

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
      type: 'update-scene-author';
      sceneAuthor: string;
      interactionMode: InteractionMode;
      now: string;
    }
  | {
      type: 'update-scene-ref';
      sceneRef: string;
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
      type: 'resize-scene-canvas';
      canvasSize: GridSize;
      interactionMode: InteractionMode;
      now: string;
    }
  | {
      type: 'select-asset';
      assetId: string;
      interactionMode: InteractionMode;
      now: string;
    }
  | {
      type: 'set-selected-asset';
      assetId: string | null;
      interactionMode: InteractionMode;
      now: string;
    }
  | {
      type: 'save-scene';
      interactionMode: InteractionMode;
      now: string;
    };

export function sceneReducer(scene: SceneDocument, action: SceneAction): SceneDocument {
  switch (action.type) {
    case 'select-coordinate':
      return selectCoordinate(scene, action.coordinate, action.interactionMode);
    case 'update-scene-name':
      return updateSceneName(scene, action.sceneName, action.interactionMode, action.now);
    case 'update-scene-author':
      return updateSceneAuthor(scene, action.sceneAuthor, action.interactionMode, action.now);
    case 'update-scene-ref':
      return updateSceneRef(scene, action.sceneRef, action.interactionMode, action.now);
    case 'select-pokemon':
      return selectPokemon(scene, action.pokemonKey, action.interactionMode, action.now);
    case 'resize-scene-canvas':
      return resizeSceneCanvas(scene, action.canvasSize, action.interactionMode, action.now);
    case 'select-asset':
      return selectAsset(scene, action.assetId, action.interactionMode, action.now);
    case 'set-selected-asset':
      return setSelectedAsset(scene, action.assetId, action.interactionMode, action.now);
    case 'save-scene':
      return saveScene(scene, action.interactionMode, action.now);
  }
}

export function updateSceneAuthor(
  scene: SceneDocument,
  sceneAuthor: string,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly' || sceneAuthor === scene.sceneAuthor) {
    return scene;
  }

  return markSceneDirty(
    {
      ...scene,
      sceneAuthor,
    },
    now,
  );
}

export function updateSceneRef(
  scene: SceneDocument,
  sceneRef: string,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly' || sceneRef === scene.sceneRef) {
    return scene;
  }

  return markSceneDirty(
    {
      ...scene,
      sceneRef,
    },
    now,
  );
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
  const currentCoordinate = scene.workspaceState.selectedCoordinate;
  const nextSelectedCoordinate =
    currentCoordinate && currentCoordinate.x === coordinate.x && currentCoordinate.y === coordinate.y
      ? null
      : { x: coordinate.x, y: coordinate.y };

  return {
    ...scene,
    workspaceState: {
      ...scene.workspaceState,
      selectedCoordinate: nextSelectedCoordinate,
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

export function resizeSceneCanvas(
  scene: SceneDocument,
  canvasSize: GridSize,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  const plan = createSceneResizePlan(scene.canvasSize, canvasSize);
  if (scene.canvasSize.width === plan.nextCanvasSize.width && scene.canvasSize.height === plan.nextCanvasSize.height) {
    return scene;
  }

  return markSceneDirty(resizeSceneDocumentWithPlan(scene, plan), now);
}

export function selectAsset(
  scene: SceneDocument,
  assetId: string,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  assertKnownAssetId(assetId);
  const nextSelectedAssetId = assetId === scene.workspaceState.selectedAssetId ? null : assetId;

  return markSceneDirty(
    {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
        selectedAssetId: nextSelectedAssetId,
      },
    },
    now,
  );
}

export function setSelectedAsset(
  scene: SceneDocument,
  assetId: string | null,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  if (assetId) {
    assertKnownAssetId(assetId);
  }

  if (assetId === scene.workspaceState.selectedAssetId) {
    return scene;
  }

  return markSceneDirty(
    {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
        selectedAssetId: assetId,
      },
    },
    now,
  );
}

export function saveScene(
  scene: SceneDocument,
  interactionMode: InteractionMode,
  now: string,
): SceneDocument {
  if (interactionMode === 'readOnly') {
    return scene;
  }

  return {
    ...scene,
    metadata: {
      ...scene.metadata,
      updatedAt: now,
      lastSavedAt: now,
    },
  };
}

export function moveCoordinate(
  coordinate: GridCoordinate,
  direction: 'up' | 'down' | 'left' | 'right',
  bounds: GridSize = defaultSceneDimensions.canvasSize,
) {
  const delta = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  }[direction];

  return {
    x: clampCanvasCoordinate(coordinate.x + delta.x, bounds.width),
    y: clampCanvasCoordinate(coordinate.y + delta.y, bounds.height),
  };
}

function clampCanvasCoordinate(value: number, size: number): number {
  return Math.min(Math.max(value, 0), size - 1);
}

function markSceneDirty(scene: SceneDocument, now: string): SceneDocument {
  return {
    ...scene,
    metadata: {
      ...scene.metadata,
      updatedAt: now,
    },
  };
}
