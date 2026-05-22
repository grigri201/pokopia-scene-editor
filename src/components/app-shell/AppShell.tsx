import { useEffect, useRef, useState } from 'react';
import { type AssetSkillType, type PokemonKey } from '../../domain/assets';
import { AssetPicker, type AssetSelectionMode } from '../asset-picker/AssetPicker';
import { BuildingLevelPanel } from '../building-level-panel/BuildingLevelPanel';
import { PokemonSceneControls } from '../pokemon-scene-controls/PokemonSceneControls';
import { PreviewInspector } from '../preview-inspector/PreviewInspector';
import { SceneCanvas } from '../scene-canvas/SceneCanvas';
import { SelectionInspector } from '../selection-inspector/SelectionInspector';
import {
  buildImageExportSummary,
  createDefaultSceneDocument,
  getBuildingLevelContexts,
  getCanvasCellContexts,
  getCellContext,
  type GridCoordinate,
  type ImageExportSummary,
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
  createImageExportFile,
  readLatestSceneDocumentFromStorage,
  savedSceneStorageKey,
  type RecoveryError,
  writeSceneDocumentToStorage,
} from '../../io';
import { ExportPreview } from '../export-preview/ExportPreview';

const replacementConfirmationWindowMs = 15_000;

export function AppShell() {
  const [initialSceneState] = useState(createInitialSceneState);
  const [scene, setScene] = useState(initialSceneState.scene);
  const [recoveryErrors, setRecoveryErrors] = useState<RecoveryError[]>(
    initialSceneState.recoveryErrors,
  );
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'error' | 'success' | 'canceled'>(
    initialSceneState.recoveryErrors.length > 0 ? 'error' : 'idle',
  );
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const autosaveReadyRef = useRef(false);
  const pendingSelectionMeasureRef = useRef<string | null>(null);
  const selectionMeasureCounterRef = useRef(0);
  const replacementConfirmationExpiresAtRef = useRef(0);
  const [readOnlySelectedCoordinate, setReadOnlySelectedCoordinate] = useState<GridCoordinate | null>(null);
  const [hoveredCoordinate, setHoveredCoordinate] = useState<GridCoordinate | null>(null);
  const [focusedCoordinate, setFocusedCoordinate] = useState<GridCoordinate | null>(null);
  const [placementRequiresSkill, setPlacementRequiresSkill] = useState(false);
  const [assetSelectionMode, setAssetSelectionMode] = useState<AssetSelectionMode>('single');
  const [placementFeedback, setPlacementFeedback] = useState<AssetPlacementPreview | null>(null);
  const [buildingLayerFeedback, setBuildingLayerFeedback] = useState<string | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [readOnlyViewingLevelId, setReadOnlyViewingLevelId] = useState<string | null>(null);
  const [exportPreviewSummary, setExportPreviewSummary] = useState<ImageExportSummary | null>(null);
  const [exportPreviewError, setExportPreviewError] = useState<string | null>(null);
  const [exportDownloadStatus, setExportDownloadStatus] = useState<string | null>(null);
  const [exportDownloadError, setExportDownloadError] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() =>
    getInteractionMode(window.innerWidth),
  );
  const isReadOnly = interactionMode === 'readOnly';
  const exportPreviewOpen = exportPreviewSummary !== null;
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
  const commitSceneEdit = (nextScene: SceneDocument, currentScene = scene) => {
    if (nextScene === currentScene) {
      setScene(nextScene);
      return;
    }

    setScene(nextScene);
  };
  const dispatch = (action: SceneAction) => {
    const nextScene = sceneReducer(scene, action);
    commitSceneEdit(nextScene);
  };

  useEffect(() => {
    const updateInteractionMode = () => {
      setInteractionMode(getInteractionMode(window.innerWidth));
    };

    window.addEventListener('resize', updateInteractionMode);
    return () => window.removeEventListener('resize', updateInteractionMode);
  }, []);

  useEffect(() => {
    if (!isReadOnly) {
      return undefined;
    }

    const blockReadOnlyApplicationKey = (event: KeyboardEvent) => {
      if (!isMobileReadOnlyApplicationKey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    window.addEventListener('keydown', blockReadOnlyApplicationKey, { capture: true });
    return () => window.removeEventListener('keydown', blockReadOnlyApplicationKey, { capture: true });
  }, [isReadOnly]);

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
    if (isReadOnly) {
      setAutosaveError(null);
      setHoveredCoordinate(null);
      setFocusedCoordinate(null);
      document
        .querySelectorAll<HTMLElement>('[data-testid="scene-canvas"][data-read-only="true"]')
        .forEach((grid) => grid.removeAttribute('data-keyboard-coordinate'));
      return;
    }

    if (!autosaveReadyRef.current) {
      autosaveReadyRef.current = true;
      return;
    }

    const storage = getBrowserStorage();
    if (!storage) {
      setAutosaveError('Autosave is unavailable. Your latest edits are not stored locally.');
      return;
    }

    try {
      writeSceneDocumentToStorage(storage, scene, 'autosave');
      setAutosaveError(null);
    } catch {
      setAutosaveError('Autosave failed. Your latest edits are not stored locally.');
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
    setReadOnlySelectedCoordinate((currentCoordinate) =>
      currentCoordinate?.x === nextCoordinate.x && currentCoordinate.y === nextCoordinate.y
        ? null
        : nextCoordinate,
    );
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

  const selectAsset = (assetId: string, mode: AssetSelectionMode) => {
    if (isReadOnly) {
      return;
    }

    setPlacementRequiresSkill(false);
    setPlacementFeedback(null);
    setAssetSelectionMode(mode);

    if (mode === 'continuous') {
      dispatch({
        type: 'set-selected-asset',
        assetId,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      });
      return;
    }

    dispatch({
      type: 'select-asset',
      assetId,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
  };

  const placeCurrentAsset = (coordinate: GridCoordinate) => {
    const canReplaceWithoutPrompt = replacementConfirmationExpiresAtRef.current > Date.now();
    const result = placeSelectedAsset(scene, {
      coordinate,
      interactionMode,
      now: getCurrentIsoTimestamp(),
      instanceId: createTileInstanceId(),
      requiresSkill: placementRequiresSkill,
      confirmReplace: canReplaceWithoutPrompt,
    });

    if (result.ok) {
      commitPlacedScene(result.scene);
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

      replacementConfirmationExpiresAtRef.current = Date.now() + replacementConfirmationWindowMs;
      const confirmedResult = placeSelectedAsset(scene, {
        coordinate,
        interactionMode,
        now: getCurrentIsoTimestamp(),
        instanceId: createTileInstanceId(),
        requiresSkill: placementRequiresSkill,
        confirmReplace: true,
      });

      if (confirmedResult.ok) {
        commitPlacedScene(confirmedResult.scene);
        setPlacementFeedback(confirmedResult.preview);
        return;
      }

      setPlacementFeedback(confirmedResult.preview);
      return;
    }

    setPlacementFeedback(result.preview);
  };

  const commitPlacedScene = (nextScene: SceneDocument) => {
    if (assetSelectionMode === 'continuous') {
      commitSceneEdit(nextScene);
      return;
    }

    setAssetSelectionMode('single');
    commitSceneEdit({
      ...nextScene,
      workspaceState: {
        ...nextScene.workspaceState,
        selectedAssetId: null,
      },
    });
  };

  const handleInstanceEditResult = (result: AssetInstanceEditResult) => {
    if (result.ok) {
      commitSceneEdit(result.scene);
      setSelectedInstanceId(result.instance?.instanceId ?? null);
      setPlacementFeedback(null);
    }
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

  const deleteInstance = (instanceId: string) => {
    if (isReadOnly) {
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

  const deleteCoordinateMaterial = (coordinate: GridCoordinate) => {
    if (isReadOnly) {
      return;
    }

    const targetCell = getCellContext(scene, coordinate, activeBuildingLevelId);
    const targetInstance = targetCell.tileInstances.at(-1);
    if (!targetInstance) {
      return;
    }

    const result = editAssetInstance(scene, {
      type: 'delete',
      instanceId: targetInstance.instanceId,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
    if (!result.ok) {
      return;
    }

    handleInstanceEditResult({
      ...result,
      scene: {
        ...result.scene,
        workspaceState: {
          ...result.scene.workspaceState,
          selectedCoordinate: { x: coordinate.x, y: coordinate.y },
        },
      },
    });
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
    });
    const storage = getBrowserStorage();
    storage?.removeItem(savedSceneStorageKey);
    storage?.removeItem(autosavedSceneStorageKey);
    setScene(nextScene);
    setRecoveryErrors([]);
    setRecoveryStatus('idle');
    setAutosaveError(null);
    setSelectedInstanceId(null);
    setPlacementRequiresSkill(false);
    setAssetSelectionMode('single');
    replacementConfirmationExpiresAtRef.current = 0;
    setPlacementFeedback(null);
    setBuildingLayerFeedback(null);
  };

  const openExportPreview = () => {
    try {
      setExportPreviewSummary(buildImageExportSummary(scene));
      setExportPreviewError(null);
      setExportDownloadStatus(null);
      setExportDownloadError(null);
    } catch {
      setExportPreviewSummary(null);
      setExportPreviewError('Image export preview could not be prepared.');
    }
  };

  const closeExportPreview = () => {
    setExportPreviewSummary(null);
    setExportPreviewError(null);
    setExportDownloadStatus(null);
    setExportDownloadError(null);
  };

  const downloadExportImage = () => {
    if (!exportPreviewSummary) {
      return;
    }

    let objectUrl: string | null = null;
    let downloadLink: HTMLAnchorElement | null = null;

    try {
      const exportFile = createImageExportFile(exportPreviewSummary);
      objectUrl = URL.createObjectURL(exportFile.blob);
      downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = exportFile.fileName;
      downloadLink.rel = 'noopener';
      document.body.append(downloadLink);
      downloadLink.click();
      setExportDownloadStatus('图片已准备下载');
      setExportDownloadError(null);
    } catch {
      setExportDownloadStatus(null);
      setExportDownloadError('Image export download failed.');
    } finally {
      downloadLink?.remove();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
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
    setRecoveryErrors([]);
    setRecoveryStatus('success');
    setAutosaveError(null);
    setPlacementFeedback(null);
    setAssetSelectionMode('single');
    replacementConfirmationExpiresAtRef.current = 0;
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
    >
      <header
        className="app-header"
        aria-label="Application header"
        inert={exportPreviewOpen ? true : undefined}
        aria-hidden={exportPreviewOpen ? true : undefined}
      >
        <div className="app-brand" aria-label="Pokopia Scene Editor">
          <span className="app-brand__mark" aria-hidden="true">P</span>
          <span>Pokopia Scene Editor</span>
        </div>
        <div className="app-header__actions" aria-label="Scene file actions">
          {!isReadOnly ? (
            <button
              type="button"
              className="app-action-button"
              onClick={openExportPreview}
            >
              下载预览
            </button>
          ) : null}
          <button
            type="button"
            className="app-action-button app-action-button--danger"
            title="删除场景"
            disabled={isReadOnly}
            onClick={deleteCurrentScene}
          >
            删除
          </button>
        </div>
      </header>
      {autosaveError ? (
        <section
          className="autosave-warning"
          role="alert"
          aria-label="Autosave warning"
          data-autosave-status="error"
        >
          <strong>Autosave paused</strong>
          <span>{autosaveError}</span>
        </section>
      ) : null}
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
      {exportPreviewError ? (
        <section className="export-preview-error" role="alert" aria-label="Image export preview error">
          <span>{exportPreviewError}</span>
          <button type="button" className="app-action-button" onClick={closeExportPreview}>
            关闭
          </button>
        </section>
      ) : null}
      {exportPreviewSummary ? (
        <ExportPreview
          summary={exportPreviewSummary}
          downloadError={exportDownloadError}
          downloadStatus={exportDownloadStatus}
          onClose={closeExportPreview}
          onDownloadImage={downloadExportImage}
        />
      ) : null}
      <section
        className="workbench-grid"
        aria-label="Open Design editing workbench"
        inert={exportPreviewOpen ? true : undefined}
        aria-hidden={exportPreviewOpen ? true : undefined}
      >
        <div className="workbench-left">
          <PokemonSceneControls
            readOnly={isReadOnly}
            selectedPokemonKey={scene.selectedPokemonKey}
            sceneName={scene.sceneName}
            onPokemonChange={updatePokemon}
            onSceneNameChange={updateSceneName}
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
            onDeleteCoordinate={deleteCoordinateMaterial}
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
              onDeleteInstance={deleteInstance}
              onRotateInstance={rotateInstance}
              onSaveInstanceSkill={saveInstanceSkill}
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
          selectedAssetMode={assetSelectionMode}
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

function createInitialSceneState(): InitialSceneState {
  const defaultScene = createDefaultSceneDocument({
    sceneId: 'scene-default',
    now: '2026-05-16T07:00:00.000Z',
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

function isMobileReadOnlyApplicationKey(event: KeyboardEvent): boolean {
  const normalizedKey = event.key.toLowerCase();

  return (
    normalizedKey === 'arrowup' ||
    normalizedKey === 'arrowdown' ||
    normalizedKey === 'arrowleft' ||
    normalizedKey === 'arrowright' ||
    normalizedKey === 'enter' ||
    normalizedKey === ' ' ||
    normalizedKey === 'spacebar' ||
    normalizedKey === 'escape' ||
    normalizedKey === 'delete' ||
    normalizedKey === 'backspace' ||
    ((event.metaKey || event.ctrlKey) && normalizedKey === 's')
  );
}

function getBrowserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
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

function createTileInstanceId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCopiedLayerInstancePrefix(): string {
  return `layer-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
