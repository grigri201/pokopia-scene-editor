import { useEffect, useRef, useState } from 'react';
import { getAssetById, type PokemonKey } from '../../domain/assets';
import { AssetPicker } from '../asset-picker/AssetPicker';
import { BuildingLevelPanel } from '../building-level-panel/BuildingLevelPanel';
import { PokemonSceneControls } from '../pokemon-scene-controls/PokemonSceneControls';
import { PreviewInspector } from '../preview-inspector/PreviewInspector';
import { SceneCanvas } from '../scene-canvas/SceneCanvas';
import { SelectionInspector } from '../selection-inspector/SelectionInspector';
import {
  createDefaultSceneDocument,
  getBuildingLevelContexts,
  getCanvasCellContexts,
  getCellContext,
  type GridCoordinate,
} from '../../domain/scene';
import {
  editAssetInstance,
  getAssetPlacementPreview,
  getInteractionMode,
  placeSelectedAsset,
  sceneReducer,
  type AssetInstanceEditResult,
  type AssetPlacementPreview,
  type InteractionMode,
  type SceneAction,
} from '../../state';
import { getPokemonTheme, toPokemonThemeStyle } from '../../theme';

export function AppShell() {
  const [scene, setScene] = useState(() =>
    createDefaultSceneDocument({
      sceneId: 'scene-default',
      now: '2026-05-16T07:00:00.000Z',
    }),
  );
  const pendingSelectionMeasureRef = useRef<string | null>(null);
  const selectionMeasureCounterRef = useRef(0);
  const [readOnlySelectedCoordinate, setReadOnlySelectedCoordinate] = useState<GridCoordinate | null>(null);
  const [hoveredCoordinate, setHoveredCoordinate] = useState<GridCoordinate | null>(null);
  const [focusedCoordinate, setFocusedCoordinate] = useState<GridCoordinate | null>(null);
  const [placementRequiresSkill, setPlacementRequiresSkill] = useState(false);
  const [placementFeedback, setPlacementFeedback] = useState<AssetPlacementPreview | null>(null);
  const [instanceEditFeedback, setInstanceEditFeedback] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() =>
    getInteractionMode(window.innerWidth),
  );
  const isReadOnly = interactionMode === 'readOnly';
  const buildingLevelContexts = getBuildingLevelContexts(scene);
  const currentBuildingLevel = buildingLevelContexts.find((level) => level.current);
  const currentLayerInstances = currentBuildingLevel
    ? scene.tileInstances.filter((instance) => instance.buildingLevelId === currentBuildingLevel.id)
    : [];
  const canvasCells = getCanvasCellContexts(scene);
  const targetCoordinate = hoveredCoordinate ?? focusedCoordinate;
  const selectedCoordinate = isReadOnly
    ? readOnlySelectedCoordinate
    : scene.workspaceState.selectedCoordinate;
  const selectedContext = selectedCoordinate ? getCellContext(scene, selectedCoordinate) : null;
  const selectedInstance =
    selectedContext?.tileInstances.find((instance) => instance.instanceId === selectedInstanceId) ??
    selectedContext?.tileInstances.at(-1) ??
    null;
  const targetContext = targetCoordinate ? getCellContext(scene, targetCoordinate) : null;
  const selectedAssetId = scene.workspaceState.selectedAssetId;
  const targetPlacementPreview = targetCoordinate
    ? getAssetPlacementPreview(scene, targetCoordinate, interactionMode, placementRequiresSkill)
    : placementFeedback;
  const pokemonThemeStyle = toPokemonThemeStyle(getPokemonTheme(scene.selectedPokemonKey));
  const dispatch = (action: SceneAction) => {
    setScene((currentScene) => sceneReducer(currentScene, action));
  };

  useEffect(() => {
    const updateInteractionMode = () => {
      setInteractionMode(getInteractionMode(window.innerWidth));
    };

    window.addEventListener('resize', updateInteractionMode);
    return () => window.removeEventListener('resize', updateInteractionMode);
  }, []);

  useEffect(() => {
    if (!isLocalPreviewHost(window.location.hostname)) {
      return undefined;
    }

    const testWindow = window as unknown as { __pokopiaSceneSnapshot?: () => string };
    testWindow.__pokopiaSceneSnapshot = () => JSON.stringify(scene);

    return () => {
      delete testWindow.__pokopiaSceneSnapshot;
    };
  }, [scene]);

  useEffect(() => {
    if (isReadOnly) {
      setReadOnlySelectedCoordinate(scene.workspaceState.selectedCoordinate);
      return;
    }

    setReadOnlySelectedCoordinate(null);
  }, [isReadOnly, scene.workspaceState.selectedCoordinate]);

  useEffect(() => {
    const measureId = pendingSelectionMeasureRef.current;

    if (!measureId || !selectedCoordinate) {
      return;
    }

    pendingSelectionMeasureRef.current = null;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => markSelectionVisible(measureId));
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) {
        cancelAnimationFrame(secondFrame);
      }
    };
  }, [selectedCoordinate?.x, selectedCoordinate?.y]);

  useEffect(() => {
    if (!selectedContext?.tileInstances.length) {
      setSelectedInstanceId(null);
      return;
    }

    if (selectedInstanceId && selectedContext.tileInstances.some((instance) => instance.instanceId === selectedInstanceId)) {
      return;
    }

    setSelectedInstanceId(selectedContext.tileInstances.at(-1)?.instanceId ?? null);
  }, [selectedContext, selectedInstanceId]);

  const selectCoordinate = (coordinate: GridCoordinate) => {
    const nextCoordinate = { x: coordinate.x, y: coordinate.y };
    pendingSelectionMeasureRef.current = markSelectionStart(selectionMeasureCounterRef.current);
    selectionMeasureCounterRef.current += 1;
    setFocusedCoordinate(nextCoordinate);
    setInstanceEditFeedback(null);

    if (scene.workspaceState.selectedAssetId) {
      placeCurrentAsset(nextCoordinate);
      return;
    }

    dispatch({ type: 'select-coordinate', coordinate: nextCoordinate, interactionMode });
  };

  const viewCoordinate = (coordinate: GridCoordinate) => {
    const nextCoordinate = { x: coordinate.x, y: coordinate.y };
    pendingSelectionMeasureRef.current = markSelectionStart(selectionMeasureCounterRef.current);
    selectionMeasureCounterRef.current += 1;
    setInstanceEditFeedback(null);
    setReadOnlySelectedCoordinate(nextCoordinate);
  };

  const updatePokemon = (pokemonKey: PokemonKey) => {
    dispatch({
      type: 'select-pokemon',
      pokemonKey,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
  };

  const updateSceneName = (sceneName: string) => {
    dispatch({
      type: 'update-scene-name',
      sceneName,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
  };

  const saveScene = () => {
    dispatch({
      type: 'save-scene',
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
  };

  const selectAsset = (assetId: string) => {
    if (isReadOnly) {
      return;
    }

    const asset = getAssetById(assetId);
    setPlacementRequiresSkill(Boolean(asset?.defaultRequiresSkill));
    setPlacementFeedback(null);
    dispatch({
      type: 'select-asset',
      assetId,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
  };

  const placeCurrentAsset = (coordinate: GridCoordinate) => {
    const result = placeSelectedAsset(scene, {
      coordinate,
      interactionMode,
      now: getCurrentIsoTimestamp(),
      instanceId: createTileInstanceId(),
      requiresSkill: placementRequiresSkill,
    });

    if (result.ok) {
      setScene(result.scene);
      setPlacementFeedback(result.preview);
      return;
    }

    if (result.reason === 'replace-confirmation-required') {
      const confirmed = window.confirm(
        `${result.preview.message}. Replace the existing item at ${coordinate.x},${coordinate.y}?`,
      );

      if (!confirmed) {
        setPlacementFeedback(result.preview);
        return;
      }

      const confirmedResult = placeSelectedAsset(scene, {
        coordinate,
        interactionMode,
        now: getCurrentIsoTimestamp(),
        instanceId: createTileInstanceId(),
        requiresSkill: placementRequiresSkill,
        confirmReplace: true,
      });

      if (confirmedResult.ok) {
        setScene(confirmedResult.scene);
        setPlacementFeedback(confirmedResult.preview);
        return;
      }

      setPlacementFeedback(confirmedResult.preview);
      return;
    }

    setPlacementFeedback(result.preview);
  };

  const handleInstanceEditResult = (result: AssetInstanceEditResult) => {
    if (result.ok) {
      setScene(result.scene);
      setSelectedInstanceId(result.instance?.instanceId ?? null);
      setInstanceEditFeedback(result.message);
      setPlacementFeedback(null);
      return;
    }

    setInstanceEditFeedback(`${result.message}. ${result.repairHint}`);
  };

  const deleteInstance = (instanceId: string) => {
    if (isReadOnly) {
      return;
    }

    const confirmed = window.confirm('Delete the selected asset instance?');
    if (!confirmed) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'delete',
          instanceId,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const moveInstance = (instanceId: string, coordinate: GridCoordinate) => {
    if (isReadOnly) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'move',
        instanceId,
        coordinate,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const rotateInstance = (instanceId: string, rotationDegrees: 0 | 90 | 180 | 270) => {
    if (isReadOnly) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'rotate',
        instanceId,
        rotationDegrees,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const dyeInstance = (instanceId: string, dyeColor: string | null) => {
    if (isReadOnly) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'dye',
        instanceId,
        dyeColor,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const saveInstanceNote = (instanceId: string, note: string) => {
    if (isReadOnly) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'note',
        instanceId,
        note,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  return (
    <main
      className="app-shell"
      aria-label="Pokopia scene editor workbench"
      style={pokemonThemeStyle}
    >
      <PokemonSceneControls
        readOnly={isReadOnly}
        selectedPokemonKey={scene.selectedPokemonKey}
        sceneName={scene.sceneName}
        saveStatus={scene.workspaceState.saveStatus}
        saveError={scene.workspaceState.saveError}
        onPokemonChange={updatePokemon}
        onSceneNameChange={updateSceneName}
        onSave={saveScene}
      />
      <section className="workbench-grid" aria-label="Open Design editing workbench">
        <div className="workbench-left">
          <BuildingLevelPanel levels={buildingLevelContexts} readOnly={isReadOnly} />
          <PreviewInspector />
        </div>
        <section className="canvas-stage" aria-label="7x7 scene canvas workspace">
          <div className="canvas-stage__header">
            <div>
              <p className="eyebrow">5x5 scene, 7x7 editable canvas</p>
              <h1>Pokopia Scene Editor</h1>
            </div>
            <span className="status-pill" aria-label="Interaction mode">
              {isReadOnly ? 'Mobile read-only mode' : 'Desktop edit mode'}
            </span>
          </div>
          <SelectionInspector
            selectedContext={selectedContext}
            selectedInstance={selectedInstance}
            selectedInstanceId={selectedInstanceId}
            targetContext={targetContext}
            targetPlacement={targetPlacementPreview}
            canvasSize={scene.canvasSize}
            sceneDimensions={{
              sceneSize: scene.sceneSize,
              canvasSize: scene.canvasSize,
              outerPadding: scene.outerPadding,
            }}
            currentLayerInstances={currentLayerInstances}
            readOnly={isReadOnly}
            editFeedback={instanceEditFeedback}
            onSelectedInstanceChange={setSelectedInstanceId}
            onDeleteInstance={deleteInstance}
            onMoveInstance={moveInstance}
            onRotateInstance={rotateInstance}
            onDyeInstance={dyeInstance}
            onSaveInstanceNote={saveInstanceNote}
          />
          <SceneCanvas
            canvasSize={scene.canvasSize}
            cells={canvasCells}
            readOnly={isReadOnly}
            placementMode={Boolean(scene.workspaceState.selectedAssetId && !isReadOnly)}
            selectedCoordinate={selectedCoordinate}
            targetCoordinate={targetCoordinate}
            onSelectCoordinate={selectCoordinate}
            onViewCoordinate={viewCoordinate}
            onHoverCoordinate={setHoveredCoordinate}
            onFocusCoordinate={setFocusedCoordinate}
          />
        </section>
        <AssetPicker
          readOnly={isReadOnly}
          selectedAssetId={selectedAssetId}
          selectedPokemonKey={scene.selectedPokemonKey}
          currentBuildingLevelName={currentBuildingLevel?.name ?? 'No building layer'}
          placementRequiresSkill={placementRequiresSkill}
          onPlacementRequiresSkillChange={setPlacementRequiresSkill}
          onAssetSelect={selectAsset}
        />
      </section>
    </main>
  );
}

function markSelectionStart(counter: number): string {
  const measureId = `scene-selection-${counter}`;
  performance.mark(`${measureId}-start`);

  return measureId;
}

function markSelectionVisible(measureId: string): void {
  const startMark = `${measureId}-start`;
  const visibleMark = `${measureId}-visible`;

  if (performance.getEntriesByName(startMark, 'mark').length === 0) {
    return;
  }

  performance.mark(visibleMark);
  performance.clearMeasures('scene-selection-duration');
  performance.clearMeasures(`${measureId}-duration`);
  performance.measure(`${measureId}-duration`, startMark, visibleMark);
  performance.measure('scene-selection-duration', startMark, visibleMark);
  performance.clearMarks(startMark);
  performance.clearMarks(visibleMark);
}

function isLocalPreviewHost(hostname: string): boolean {
  return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1' || hostname === '[::1]';
}

function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

function createTileInstanceId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
