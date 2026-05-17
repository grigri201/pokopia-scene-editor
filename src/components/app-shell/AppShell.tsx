import { useEffect, useRef, useState } from 'react';
import { getAssetById, type AssetSkillType, type PokemonKey } from '../../domain/assets';
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
  type SceneDocument,
} from '../../domain/scene';
import {
  editAssetInstance,
  editBuildingLayer,
  getAssetPlacementPreview,
  getInteractionMode,
  placeSelectedAsset,
  sceneReducer,
  type AssetInstanceEditResult,
  type AssetPlacementPreview,
  type BuildingLayerEditResult,
  type InteractionMode,
  type SceneAction,
} from '../../state';
import {
  applyRecoveredSceneDocument,
  autosavedSceneStorageKey,
  readLatestSceneDocumentFromStorage,
  savedSceneStorageKey,
  serializeSceneDocument,
  type RecoveryError,
  writeSceneDocumentToAllStorageSlots,
  writeSceneDocumentToStorage,
} from '../../io';
import { getPokemonTheme, toPokemonThemeStyle } from '../../theme';

export function AppShell() {
  const [initialSceneState] = useState(createInitialSceneState);
  const [scene, setScene] = useState(initialSceneState.scene);
  const [recoveryErrors, setRecoveryErrors] = useState<RecoveryError[]>(
    initialSceneState.recoveryErrors,
  );
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'error' | 'success' | 'canceled'>(
    initialSceneState.recoveryErrors.length > 0 ? 'error' : 'idle',
  );
  const [undoStack, setUndoStack] = useState<SceneDocument[]>([]);
  const [redoStack, setRedoStack] = useState<SceneDocument[]>([]);
  const autosaveReadyRef = useRef(false);
  const pendingSelectionMeasureRef = useRef<string | null>(null);
  const selectionMeasureCounterRef = useRef(0);
  const [readOnlySelectedCoordinate, setReadOnlySelectedCoordinate] = useState<GridCoordinate | null>(null);
  const [hoveredCoordinate, setHoveredCoordinate] = useState<GridCoordinate | null>(null);
  const [focusedCoordinate, setFocusedCoordinate] = useState<GridCoordinate | null>(null);
  const [placementRequiresSkill, setPlacementRequiresSkill] = useState(false);
  const [placementFeedback, setPlacementFeedback] = useState<AssetPlacementPreview | null>(null);
  const [buildingLayerFeedback, setBuildingLayerFeedback] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [readOnlyViewingLevelId, setReadOnlyViewingLevelId] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() =>
    getInteractionMode(window.innerWidth),
  );
  const isReadOnly = interactionMode === 'readOnly';
  const activeBuildingLevelId = isReadOnly
    ? readOnlyViewingLevelId ?? scene.workspaceState.currentBuildingLevelId
    : scene.workspaceState.currentBuildingLevelId;
  const buildingLevelContexts = getBuildingLevelContexts(scene);
  const displayedBuildingLevelContexts = buildingLevelContexts.map((level) => ({
    ...level,
    current: level.id === activeBuildingLevelId,
  }));
  const currentBuildingLevel = displayedBuildingLevelContexts.find((level) => level.current);
  const canvasCells = getCanvasCellContexts(scene, activeBuildingLevelId);
  const targetCoordinate = hoveredCoordinate ?? focusedCoordinate;
  const selectedCoordinate = isReadOnly
    ? readOnlySelectedCoordinate
    : scene.workspaceState.selectedCoordinate;
  const selectedContext = selectedCoordinate ? getCellContext(scene, selectedCoordinate, activeBuildingLevelId) : null;
  const selectedInstance =
    selectedContext?.tileInstances.find((instance) => instance.instanceId === selectedInstanceId) ??
    selectedContext?.tileInstances.at(-1) ??
    null;
  const targetContext = targetCoordinate ? getCellContext(scene, targetCoordinate, activeBuildingLevelId) : null;
  const selectedAssetId = scene.workspaceState.selectedAssetId;
  const targetPlacementPreview = targetCoordinate
    ? getAssetPlacementPreview(scene, targetCoordinate, interactionMode, placementRequiresSkill)
    : placementFeedback;
  const pokemonThemeStyle = toPokemonThemeStyle(getPokemonTheme(scene.selectedPokemonKey));
  const commitSceneEdit = (nextScene: SceneDocument, currentScene = scene) => {
    if (nextScene === currentScene) {
      setScene(nextScene);
      return;
    }

    setUndoStack((pastScenes) => [...pastScenes.slice(-49), currentScene]);
    setRedoStack([]);
    setScene(nextScene);
  };
  const dispatch = (action: SceneAction, recordHistory = false) => {
    const nextScene = sceneReducer(scene, action);
    if (recordHistory) {
      commitSceneEdit(nextScene);
      return;
    }

    setScene(nextScene);
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

    const testWindow = window as unknown as {
      __pokopiaSceneSnapshot?: () => string;
    };
    testWindow.__pokopiaSceneSnapshot = () => JSON.stringify(scene);

    return () => {
      delete testWindow.__pokopiaSceneSnapshot;
    };
  }, [scene]);

  useEffect(() => {
    if (isReadOnly) {
      setReadOnlyViewingLevelId(scene.workspaceState.currentBuildingLevelId);
      setReadOnlySelectedCoordinate(scene.workspaceState.selectedCoordinate);
      return;
    }

    setReadOnlyViewingLevelId(null);
    setReadOnlySelectedCoordinate(null);
  }, [isReadOnly, scene.workspaceState.currentBuildingLevelId, scene.workspaceState.selectedCoordinate]);

  useEffect(() => {
    if (isReadOnly || scene.workspaceState.saveStatus === 'saveError') {
      return;
    }

    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true;
      return;
    }

    const storage = getBrowserStorage();
    if (!storage) {
      return;
    }

    try {
      writeSceneDocumentToStorage(storage, scene, 'autosave');
    } catch {
      // Autosave is best-effort; explicit Save reports storage failures in the UI.
    }
  }, [isReadOnly, scene]);

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
    setReadOnlySelectedCoordinate(nextCoordinate);
  };

  const updatePokemon = (pokemonKey: PokemonKey) => {
    dispatch({
      type: 'select-pokemon',
      pokemonKey,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    }, true);
  };

  const updateSceneName = (sceneName: string) => {
    dispatch({
      type: 'update-scene-name',
      sceneName,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    }, true);
  };

  const saveScene = () => {
    if (isReadOnly) {
      return;
    }

    const storage = getBrowserStorage();
    const now = getCurrentIsoTimestamp();

    if (!storage) {
      dispatch({
        type: 'save-scene',
        interactionMode,
        now,
        result: 'failure',
        errorMessage: 'Local storage unavailable.',
      });
      return;
    }

    const savedScene = sceneReducer(scene, {
      type: 'save-scene',
      interactionMode,
      now,
    });

    try {
      writeSceneDocumentToAllStorageSlots(storage, savedScene);
      setScene(savedScene);
    } catch (error) {
      setScene(
        sceneReducer(scene, {
          type: 'save-scene',
          interactionMode,
          now,
          result: 'failure',
          errorMessage: getStorageErrorMessage(error),
        }),
      );
    }
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
    }, true);
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
      commitSceneEdit(result.scene);
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
        commitSceneEdit(confirmedResult.scene);
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
      commitSceneEdit(result.scene);
      setSelectedInstanceId(result.instance?.instanceId ?? null);
      setPlacementFeedback(null);
    }
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

  const changeInstanceAsset = (instanceId: string, assetId: string) => {
    if (isReadOnly) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'asset',
        instanceId,
        assetId,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const moveInstance = (instanceId: string, coordinate: GridCoordinate, buildingLevelId: string) => {
    if (isReadOnly) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'move',
        instanceId,
        coordinate,
        buildingLevelId,
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

  const saveInstanceSkill = (
    instanceId: string,
    requiresSkill: boolean,
    skillType: AssetSkillType,
    skillNote: string,
  ) => {
    if (isReadOnly) {
      return;
    }

    handleInstanceEditResult(
      editAssetInstance(scene, {
        type: 'skill',
        instanceId,
        requiresSkill,
        skillType,
        skillNote,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const handleBuildingLayerResult = (result: BuildingLayerEditResult) => {
    if (result.ok) {
      commitSceneEdit(result.scene);
      setBuildingLayerFeedback(result.message);
      setPlacementFeedback(null);
      return;
    }

    setBuildingLayerFeedback(`${result.message}. ${result.repairHint}`);
  };

  const createBuildingLayer = () => {
    handleBuildingLayerResult(
      editBuildingLayer(scene, {
        type: 'create',
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const selectBuildingLayer = (levelId: string) => {
    if (isReadOnly) {
      setReadOnlyViewingLevelId(levelId);
      setBuildingLayerFeedback(null);
      return;
    }

    handleBuildingLayerResult(
      editBuildingLayer(scene, {
        type: 'set-current',
        levelId,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const renameBuildingLayer = (levelId: string, name: string) => {
    handleBuildingLayerResult(
      editBuildingLayer(scene, {
        type: 'rename',
        levelId,
        name,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const copyBuildingLayer = (levelId: string) => {
    handleBuildingLayerResult(
      editBuildingLayer(scene, {
        type: 'copy',
        levelId,
        instanceIdPrefix: createCopiedLayerInstancePrefix(),
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const deleteBuildingLayer = (levelId: string) => {
    const result = editBuildingLayer(scene, {
      type: 'delete',
      levelId,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });

    if (result.ok) {
      handleBuildingLayerResult(result);
      return;
    }

    if (result.reason !== 'delete-confirmation-required') {
      handleBuildingLayerResult(result);
      return;
    }

    const targetLayer = scene.buildingLevels.find((level) => level.id === levelId);
    const affectedCount = scene.tileInstances.filter((instance) => instance.buildingLevelId === levelId).length;
    const confirmed = window.confirm(
      `Delete building layer "${targetLayer?.name ?? levelId}" with ${affectedCount} item${
        affectedCount === 1 ? '' : 's'
      }? This removes the layer and all item instances. Press OK to confirm or Cancel to keep the scene unchanged.`,
    );

    if (!confirmed) {
      setBuildingLayerFeedback(`${result.message}. Canceled; scene unchanged.`);
      return;
    }

    handleBuildingLayerResult(
      editBuildingLayer(scene, {
        type: 'delete',
        levelId,
        confirmDelete: true,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
    );
  };

  const undoSceneEdit = () => {
    if (isReadOnly || undoStack.length === 0) {
      return;
    }

    const previousScene = undoStack.at(-1);
    if (!previousScene) {
      return;
    }

    setUndoStack((pastScenes) => pastScenes.slice(0, -1));
    setRedoStack((futureScenes) => [scene, ...futureScenes.slice(0, 49)]);
    setScene(reconcileHistorySceneSaveStatus(previousScene));
    setPlacementFeedback(null);
    setBuildingLayerFeedback(null);
  };

  const redoSceneEdit = () => {
    if (isReadOnly || redoStack.length === 0) {
      return;
    }

    const nextScene = redoStack[0];
    if (!nextScene) {
      return;
    }

    setRedoStack((futureScenes) => futureScenes.slice(1));
    setUndoStack((pastScenes) => [...pastScenes.slice(-49), scene]);
    setScene(reconcileHistorySceneSaveStatus(nextScene));
    setPlacementFeedback(null);
    setBuildingLayerFeedback(null);
  };

  const deleteCurrentScene = () => {
    if (isReadOnly) {
      return;
    }

    const confirmed = window.confirm('Delete the current scene and reset the workbench?');
    if (!confirmed) {
      return;
    }

    const nextScene = createDefaultSceneDocument({
      sceneId: 'scene-default',
      now: getCurrentIsoTimestamp(),
      includeOpenDesignDemo: true,
    });
    const storage = getBrowserStorage();
    storage?.removeItem(savedSceneStorageKey);
    storage?.removeItem(autosavedSceneStorageKey);
    setUndoStack([]);
    setRedoStack([]);
    setScene(nextScene);
    setRecoveryErrors([]);
    setRecoveryStatus('idle');
    setSelectedInstanceId(null);
    setPlacementRequiresSkill(false);
    setPlacementFeedback(null);
    setBuildingLayerFeedback(null);
  };

  const retrySceneRecovery = () => {
    const storage = getBrowserStorage();
    if (!storage) {
      setRecoveryErrors([createStorageUnavailableRecoveryError()]);
      setRecoveryStatus('error');
      return;
    }

    const storedScene = readLatestSceneDocumentFromStorage(storage);
    if (!storedScene) {
      setRecoveryErrors([]);
      setRecoveryStatus('idle');
      return;
    }

    if (!storedScene.ok) {
      setRecoveryErrors(storedScene.errors);
      setRecoveryStatus('error');
      return;
    }

    const appliedRecovery = applyRecoveredSceneDocument(scene, storedScene.payload, {
      interactionMode,
      source: 'confirmed-user',
    });
    if (!appliedRecovery.ok) {
      setRecoveryErrors(appliedRecovery.errors);
      setRecoveryStatus('error');
      return;
    }

    setScene(appliedRecovery.scene);
    setUndoStack([]);
    setRedoStack([]);
    setRecoveryErrors([]);
    setRecoveryStatus('success');
    setPlacementFeedback(null);
    setBuildingLayerFeedback(null);
  };

  const cancelSceneRecovery = () => {
    setRecoveryErrors([]);
    setRecoveryStatus('canceled');
  };

  return (
    <main
      className="app-shell"
      aria-label="Pokopia scene editor workbench"
      style={pokemonThemeStyle}
    >
      <header className="app-header" aria-label="Application header">
        <div className="app-brand" aria-label="Pokopia Scene Editor">
          <span className="app-brand__mark" aria-hidden="true">P</span>
          <span>Pokopia Scene Editor</span>
        </div>
        <div className="app-header__actions" aria-label="Scene file actions">
          <button
            type="button"
            className="icon-button has-icon-tooltip"
            aria-label="Save scene"
            data-tooltip="保存"
            title="保存"
            disabled={isReadOnly || scene.workspaceState.saveStatus === 'saved'}
            onClick={saveScene}
          >
            <SaveIcon />
          </button>
          <button
            type="button"
            className="icon-button icon-button--danger has-icon-tooltip"
            aria-label="Delete scene"
            data-tooltip="删除"
            title="删除"
            disabled={isReadOnly}
            onClick={deleteCurrentScene}
          >
            <DeleteIcon />
          </button>
          <button
            type="button"
            className="sr-only"
            aria-label="Undo"
            disabled={isReadOnly || undoStack.length === 0}
            onClick={undoSceneEdit}
          >
            Undo
          </button>
          <button
            type="button"
            className="sr-only"
            aria-label="Redo"
            disabled={isReadOnly || redoStack.length === 0}
            onClick={redoSceneEdit}
          >
            Redo
          </button>
        </div>
      </header>
      {recoveryStatus !== 'idle' ? (
        <section
          className="recovery-validator"
          role={recoveryStatus === 'error' ? 'alert' : 'status'}
          aria-label="Recovery Validator"
          data-recovery-status={recoveryStatus}
        >
          <div className="recovery-validator__header">
            <div>
              <p className="eyebrow">Recovery Validator</p>
              <h2>{getRecoveryStatusTitle(recoveryStatus)}</h2>
              <p>{getRecoveryStatusMessage(recoveryStatus)}</p>
            </div>
            {recoveryStatus === 'error' ? (
              <div className="recovery-validator__actions" aria-label="Recovery actions">
                <button type="button" onClick={retrySceneRecovery}>
                  Retry
                </button>
                <button type="button" onClick={cancelSceneRecovery}>
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
          {recoveryStatus === 'error' ? (
            <ul className="recovery-validator__errors" aria-label="Recovery error details">
              {recoveryErrors.map((error, index) => (
                <li key={`${error.fieldPath}-${index}`}>
                  <strong>{error.fieldPath}</strong>
                  <span>{error.reason}</span>
                  <span>Expected: {error.expected}</span>
                  <span>Actual: {error.actual}</span>
                  <span>{error.recoveryAction}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      <section className="workbench-grid" aria-label="Open Design editing workbench">
        <div className="workbench-left">
          <PokemonSceneControls
            readOnly={isReadOnly}
            selectedPokemonKey={scene.selectedPokemonKey}
            sceneName={scene.sceneName}
            saveStatus={scene.workspaceState.saveStatus}
            onPokemonChange={updatePokemon}
            onSceneNameChange={updateSceneName}
            onSave={saveScene}
          />
          <BuildingLevelPanel
            levels={displayedBuildingLevelContexts}
            readOnly={isReadOnly}
            feedback={buildingLayerFeedback}
            onCreateLayer={createBuildingLayer}
            onSelectLayer={selectBuildingLayer}
            onRenameLayer={renameBuildingLayer}
            onCopyLayer={copyBuildingLayer}
            onDeleteLayer={deleteBuildingLayer}
          />
        </div>
        <section className="canvas-stage" aria-label="7x7 scene canvas workspace">
          <span className="sr-only status-pill" aria-label="Interaction mode">
            {isReadOnly ? 'Mobile read-only mode' : 'Desktop edit mode'}
          </span>
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
          <div className="canvas-bottom-panels" aria-label="Canvas lower inspectors">
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
              buildingLevels={scene.buildingLevels}
              tileInstances={scene.tileInstances}
              readOnly={isReadOnly}
              onSelectedInstanceChange={setSelectedInstanceId}
              onDeleteInstance={deleteInstance}
              onChangeInstanceAsset={changeInstanceAsset}
              onMoveInstance={moveInstance}
              onRotateInstance={rotateInstance}
              onDyeInstance={dyeInstance}
              onSaveInstanceSkill={saveInstanceSkill}
              onSaveInstanceNote={saveInstanceNote}
            />
            <PreviewInspector
              scene={scene}
              activeBuildingLevelId={activeBuildingLevelId}
              selectedCoordinate={selectedCoordinate}
              selectedInstanceId={selectedInstanceId}
              readOnly={isReadOnly}
            />
          </div>
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

interface InitialSceneState {
  scene: SceneDocument;
  recoveryErrors: RecoveryError[];
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5 4h12l2 2v14H5z" />
      <path d="M8 4v6h8V4" />
      <path d="M8 20v-7h8v7" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function createInitialSceneState(): InitialSceneState {
  const defaultScene = createDefaultSceneDocument({
    sceneId: 'scene-default',
    now: '2026-05-16T07:00:00.000Z',
    includeOpenDesignDemo: true,
  });
  const initialInteractionMode = getInteractionMode(window.innerWidth);
  const testWindow = window as unknown as { __pokopiaInitialSceneSnapshot?: SceneDocument };

  if (isLocalPreviewHost(window.location.hostname) && navigator.webdriver && testWindow.__pokopiaInitialSceneSnapshot) {
    return {
      scene: testWindow.__pokopiaInitialSceneSnapshot,
      recoveryErrors: [],
    };
  }

  const storage = getBrowserStorage();
  if (!storage) {
    return {
      scene: defaultScene,
      recoveryErrors: [],
    };
  }

  const storedScene = readLatestSceneDocumentFromStorage(storage);
  if (storedScene?.ok && initialInteractionMode !== 'readOnly') {
    return {
      scene: storedScene.scene,
      recoveryErrors: [],
    };
  }

  if (storedScene?.ok && initialInteractionMode === 'readOnly') {
    const rejectedRecovery = applyRecoveredSceneDocument(defaultScene, storedScene.payload, {
      interactionMode: 'readOnly',
      source: 'startup',
    });

    return {
      scene: defaultScene,
      recoveryErrors: rejectedRecovery.ok ? [] : rejectedRecovery.errors,
    };
  }

  if (storedScene && !storedScene.ok) {
    return {
      scene: defaultScene,
      recoveryErrors: storedScene.errors,
    };
  }

  return {
    scene: defaultScene,
    recoveryErrors: [],
  };
}

function getCurrentIsoTimestamp(): string {
  return new Date().toISOString();
}

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getStorageErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return `Local storage unavailable: ${error.message}`;
  }

  return 'Local storage unavailable.';
}

function createStorageUnavailableRecoveryError(): RecoveryError {
  return {
    fieldPath: '$',
    expected: 'browser localStorage',
    actual: 'unavailable',
    reason: 'Saved scene storage is unavailable.',
    recoveryAction: 'Enable localStorage and retry recovery.',
  };
}

function getRecoveryStatusTitle(status: 'idle' | 'error' | 'success' | 'canceled'): string {
  if (status === 'success') {
    return 'Saved scene recovered';
  }

  if (status === 'canceled') {
    return 'Recovery canceled';
  }

  if (status === 'error') {
    return 'Saved scene was rejected';
  }

  return 'Recovery idle';
}

function getRecoveryStatusMessage(status: 'idle' | 'error' | 'success' | 'canceled'): string {
  if (status === 'success') {
    return 'The saved SceneDocument passed validation and replaced the current scene.';
  }

  if (status === 'canceled') {
    return 'Current scene was kept unchanged.';
  }

  if (status === 'error') {
    return 'Current scene was kept unchanged. Review the invalid fields, retry, or cancel.';
  }

  return 'No recovery action is pending.';
}

function reconcileHistorySceneSaveStatus(scene: SceneDocument): SceneDocument {
  const storage = getBrowserStorage();
  const savedPayload = storage?.getItem(savedSceneStorageKey);

  if (!savedPayload) {
    return scene;
  }

  const sceneAsSaved = {
    ...scene,
    workspaceState: {
      ...scene.workspaceState,
      saveStatus: 'saved' as const,
      saveError: null,
    },
  };

  try {
    if (JSON.stringify(serializeSceneDocument(sceneAsSaved)) === savedPayload) {
      return sceneAsSaved;
    }
  } catch {
    return markSceneDirtyAfterHistory(scene);
  }

  return markSceneDirtyAfterHistory(scene);
}

function markSceneDirtyAfterHistory(scene: SceneDocument): SceneDocument {
  return {
    ...scene,
    workspaceState: {
      ...scene.workspaceState,
      saveStatus: 'dirty',
      saveError: null,
    },
    metadata: {
      ...scene.metadata,
      updatedAt: getCurrentIsoTimestamp(),
    },
  };
}

function createTileInstanceId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCopiedLayerInstancePrefix(): string {
  return `layer-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
