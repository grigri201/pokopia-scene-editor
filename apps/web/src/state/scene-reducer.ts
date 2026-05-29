import {
  assertCanvasCoordinate,
  assertSceneNameLabelsSceneSize,
  calculateAreaType,
  createSceneDimensionsForCanvasSize,
  defaultSceneDimensions,
  type GridCoordinate,
  type GridSize,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import { assertKnownAssetId, assertKnownPokemonKey, type PokemonKey } from '@pokopia-scene-editor/scene-core';
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

  const dimensions = createSceneDimensionsForCanvasSize(canvasSize);
  if (scene.canvasSize.width === dimensions.canvasSize.width && scene.canvasSize.height === dimensions.canvasSize.height) {
    return scene;
  }

  const isInsideCanvas = (coordinate: GridCoordinate) =>
    coordinate.x >= 0 &&
    coordinate.y >= 0 &&
    coordinate.x < dimensions.canvasSize.width &&
    coordinate.y < dimensions.canvasSize.height;

  return markSceneDirty(
    {
      ...scene,
      sceneSize: dimensions.sceneSize,
      canvasSize: dimensions.canvasSize,
      outerPadding: dimensions.outerPadding,
      tileInstances: scene.tileInstances
        .filter((instance) => isInsideCanvas(instance.coordinate))
        .map((instance) => ({
          ...instance,
          areaType: calculateAreaType(instance.coordinate, dimensions),
        })),
      skillMarkers: scene.skillMarkers
        .filter((marker) => isInsideCanvas(marker.coordinate))
        .map((marker) => ({
          ...marker,
          areaType: calculateAreaType(marker.coordinate, dimensions),
        })),
      workspaceState: {
        ...scene.workspaceState,
        selectedCoordinate:
          scene.workspaceState.selectedCoordinate && isInsideCanvas(scene.workspaceState.selectedCoordinate)
            ? scene.workspaceState.selectedCoordinate
            : null,
      },
    },
    now,
  );
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
