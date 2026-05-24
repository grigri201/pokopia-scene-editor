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
  saveCellSkillMarker,
  type AssetInstanceEditResult,
  type AssetPlacementPreview,
  type BuildingLayerEditResult,
  type InteractionMode,
  type SceneAction,
  type SkillMarkerEditResult,
} from '../../state';
import {
  applyRecoveredSceneDocument,
  autosavedSceneStorageKey,
  createImageExportFile,
  decodeSceneDocumentString,
  encodeSceneDocumentString,
  getUiPreferencesStorage,
  readLatestSceneDocumentFromStorage,
  readUiPreferencesFromStorage,
  savedSceneStorageKey,
  type RecoveryError,
  writeLocalePreferenceToStorage,
  writeSceneDocumentToStorage,
} from '../../io';
import { ExportPreview } from '../export-preview/ExportPreview';
import { getDefaultBuildingLevelName, localeLabels, locales, t, type Locale } from '../../i18n';

const replacementConfirmationWindowMs = 15_000;
const toastAutoDismissMs = 3_000;

export function AppShell() {
  const [initialSceneState] = useState(createInitialSceneState);
  const [scene, setScene] = useState(initialSceneState.scene);
  const [recoveryErrors, setRecoveryErrors] = useState<RecoveryError[]>(
    initialSceneState.recoveryErrors,
  );
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'error' | 'success' | 'canceled'>(
    initialSceneState.recoveryErrors.length > 0 ? 'error' : 'idle',
  );
  const [locale, setLocale] = useState<Locale>(() =>
    readUiPreferencesFromStorage(getUiPreferencesStorage(), { persistNormalized: false }).locale,
  );
  const [autosaveError, setAutosaveError] = useState<string | null>(null);
  const autosaveReadyRef = useRef(false);
  const recoveryToastTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const recoveryToastStartedAtRef = useRef(0);
  const recoveryToastRemainingMsRef = useRef(toastAutoDismissMs);
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
  const [sceneStringStatus, setSceneStringStatus] = useState<string | null>(null);
  const [sceneStringError, setSceneStringError] = useState<string | null>(null);
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
  const selectedSkillMarker = selectedContext?.skillMarkers.at(-1) ?? null;
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

  const clearRecoveryToastTimer = () => {
    if (!recoveryToastTimerRef.current) {
      return;
    }

    window.clearTimeout(recoveryToastTimerRef.current);
    recoveryToastTimerRef.current = null;
  };

  const dismissRecoveryToast = () => {
    clearRecoveryToastTimer();
    recoveryToastRemainingMsRef.current = toastAutoDismissMs;
    setRecoveryErrors([]);
    setRecoveryStatus('idle');
  };

  const startRecoveryToastTimer = (delayMs = recoveryToastRemainingMsRef.current) => {
    clearRecoveryToastTimer();
    recoveryToastStartedAtRef.current = Date.now();
    recoveryToastTimerRef.current = window.setTimeout(dismissRecoveryToast, delayMs);
  };

  const pauseRecoveryToastTimer = () => {
    if (recoveryStatus === 'idle' || !recoveryToastTimerRef.current) {
      return;
    }

    const elapsedMs = Date.now() - recoveryToastStartedAtRef.current;
    recoveryToastRemainingMsRef.current = Math.max(0, recoveryToastRemainingMsRef.current - elapsedMs);
    clearRecoveryToastTimer();
  };

  const resumeRecoveryToastTimer = () => {
    if (recoveryStatus === 'idle' || recoveryToastTimerRef.current) {
      return;
    }

    startRecoveryToastTimer(recoveryToastRemainingMsRef.current);
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
    if (recoveryStatus === 'idle') {
      clearRecoveryToastTimer();
      return undefined;
    }

    recoveryToastRemainingMsRef.current = toastAutoDismissMs;
    startRecoveryToastTimer();

    return clearRecoveryToastTimer;
  }, [recoveryStatus]);

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

  const handleSkillMarkerEditResult = (result: SkillMarkerEditResult) => {
    if (result.ok) {
      commitSceneEdit(result.scene);
      setPlacementFeedback(null);
    }
  };

  const saveSelectedCellSkill = (
    coordinate: GridCoordinate,
    buildingLevelId: string,
    requiresSkill: boolean,
    skillType: AssetSkillType,
    skillNote: string,
  ) => {
    if (isReadOnly) {
      return;
    }

    handleSkillMarkerEditResult(
      saveCellSkillMarker(scene, {
        coordinate,
        buildingLevelId,
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
        name: getDefaultBuildingLevelName(scene.buildingLevels.length, locale),
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

    const confirmed = window.confirm(t(locale, 'resetConfirm'));
    if (!confirmed) {
      return;
    }

    const nextScene = createDefaultSceneDocument({
      sceneId: 'scene-default',
      initialBuildingLevelName: getDefaultBuildingLevelName(0, locale),
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
    setSceneStringStatus(null);
    setSceneStringError(null);
  };

  const exportSceneString = () => {
    try {
      const sceneString = encodeSceneDocumentString(scene);
      navigator.clipboard?.writeText(sceneString).catch(() => undefined);
      window.prompt(t(locale, 'sceneStringExportPrompt'), sceneString);
      setSceneStringStatus(t(locale, 'sceneStringExported', { count: sceneString.length }));
      setSceneStringError(null);
    } catch {
      setSceneStringStatus(null);
      setSceneStringError(t(locale, 'sceneStringExportFailed'));
    }
  };

  const importSceneString = () => {
    if (isReadOnly) {
      return;
    }

    const sceneString = window.prompt(t(locale, 'sceneStringImportPrompt'));
    if (!sceneString?.trim()) {
      return;
    }

    const decoded = decodeSceneDocumentString(sceneString, getCurrentIsoTimestamp());
    if (!decoded.ok) {
      setRecoveryErrors(decoded.errors);
      setRecoveryStatus('error');
      setSceneStringStatus(null);
      setSceneStringError(t(locale, 'sceneStringInvalid'));
      return;
    }

    const confirmed = window.confirm(t(locale, 'sceneStringImportConfirm'));
    if (!confirmed) {
      setSceneStringStatus(null);
      setSceneStringError(t(locale, 'sceneStringImportCanceled'));
      return;
    }

    const appliedRecovery = applyRecoveredSceneDocument(scene, decoded.payload, {
      interactionMode,
      source: 'confirmed-user',
    });
    if (!appliedRecovery.ok) {
      setRecoveryErrors(appliedRecovery.errors);
      setRecoveryStatus('error');
      setSceneStringStatus(null);
      setSceneStringError(t(locale, 'sceneStringInvalid'));
      return;
    }

    setScene(appliedRecovery.scene);
    setRecoveryErrors([]);
    setRecoveryStatus('success');
    setAutosaveError(null);
    setPlacementFeedback(null);
    setAssetSelectionMode('single');
    setSelectedInstanceId(null);
    replacementConfirmationExpiresAtRef.current = 0;
    setBuildingLayerFeedback(null);
    setSceneStringStatus(t(locale, 'sceneStringImported'));
    setSceneStringError(null);
  };

  const openExportPreview = () => {
    try {
      setExportPreviewSummary(buildImageExportSummary(scene, locale));
      setExportPreviewError(null);
      setExportDownloadStatus(null);
      setExportDownloadError(null);
    } catch {
      setExportPreviewSummary(null);
      setExportPreviewError(t(locale, 'imagePreviewFailed'));
    }
  };

  const closeExportPreview = () => {
    setExportPreviewSummary(null);
    setExportPreviewError(null);
    setExportDownloadStatus(null);
    setExportDownloadError(null);
  };

  const downloadExportImage = async (previewElement: HTMLElement) => {
    if (!exportPreviewSummary) {
      return;
    }

    let objectUrl: string | null = null;
    let downloadLink: HTMLAnchorElement | null = null;

    try {
      const exportFile = await createImageExportFile({
        previewElement,
        sceneName: exportPreviewSummary.sceneName,
      });
      objectUrl = URL.createObjectURL(exportFile.blob);
      downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = exportFile.fileName;
      downloadLink.rel = 'noopener';
      document.body.append(downloadLink);
      downloadLink.click();
      setExportDownloadStatus(t(locale, 'imageReady'));
      setExportDownloadError(null);
    } catch (error) {
      console.error('Image export download failed.', error);
      setExportDownloadStatus(null);
      setExportDownloadError(t(locale, 'imageDownloadFailed'));
    } finally {
      downloadLink?.remove();
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  };

  const updateLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    writeLocalePreferenceToStorage(getUiPreferencesStorage(), nextLocale);
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
    setSceneStringStatus(null);
    setSceneStringError(null);
  };

  const cancelSceneRecovery = () => {
    setRecoveryErrors([]);
    setRecoveryStatus('canceled');
  };

  return (
    <main
      className="app-shell"
      data-locale={locale}
      aria-label="Pokopia scene editor workbench"
    >
      <header
        className="app-header"
        aria-label="Application header"
        inert={exportPreviewOpen ? true : undefined}
        aria-hidden={exportPreviewOpen ? true : undefined}
      >
        <a
          className="app-brand"
          href="https://www.pokokit.com"
          aria-label="pokokit Scene Editor"
        >
          <span className="app-brand__pokokit">pokokit</span>
          <span>Scene Editor</span>
        </a>
        <div className="app-header__actions" aria-label="Scene file actions">
          {!isReadOnly ? (
            <>
              <button
                type="button"
                className="app-action-button"
                onClick={exportSceneString}
              >
                {t(locale, 'exportSceneString')}
              </button>
              <button
                type="button"
                className="app-action-button"
                onClick={importSceneString}
              >
                {t(locale, 'importSceneString')}
              </button>
              <button
                type="button"
                className="app-action-button"
                onClick={openExportPreview}
              >
                {t(locale, 'exportPreview')}
              </button>
            </>
          ) : null}
          <label className="language-control">
            <span>{t(locale, 'language')}</span>
            <select
              aria-label={t(locale, 'language')}
              value={locale}
              onChange={(event) => updateLocale(event.target.value as Locale)}
            >
              {locales.map((option) => (
                <option value={option} key={option}>
                  {localeLabels[option]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="app-action-button app-action-button--danger"
            title={t(locale, 'resetSceneTitle')}
            disabled={isReadOnly}
            onClick={deleteCurrentScene}
          >
            {t(locale, 'reset')}
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
          <strong>{t(locale, 'autosavePaused')}</strong>
          <span>{autosaveError}</span>
        </section>
      ) : null}
      {recoveryStatus !== 'idle' ? (
        <div className="toast-stack" aria-label={t(locale, 'notifications')}>
          <section
            className={`recovery-toast recovery-toast--${recoveryStatus}`}
            role={recoveryStatus === 'error' ? 'alert' : 'status'}
            aria-live={recoveryStatus === 'error' ? 'assertive' : 'polite'}
            aria-label={t(locale, 'recoveryToast')}
            data-recovery-status={recoveryStatus}
            onMouseEnter={pauseRecoveryToastTimer}
            onMouseLeave={resumeRecoveryToastTimer}
            onFocus={pauseRecoveryToastTimer}
            onBlur={resumeRecoveryToastTimer}
          >
            <div className="recovery-toast__header">
              <div>
                <p className="eyebrow">{t(locale, 'recovery')}</p>
                <h2>{getRecoveryStatusTitle(recoveryStatus, locale)}</h2>
                <p>{getRecoveryStatusMessage(recoveryStatus, locale)}</p>
              </div>
              <div className="recovery-toast__actions" aria-label={t(locale, 'recoveryActions')}>
                {recoveryStatus === 'error' ? (
                  <>
                    <button type="button" onClick={retrySceneRecovery}>
                      {t(locale, 'retry')}
                    </button>
                    <button type="button" onClick={cancelSceneRecovery}>
                      {t(locale, 'cancel')}
                    </button>
                  </>
                ) : null}
                <button type="button" onClick={dismissRecoveryToast}>
                  {t(locale, 'close')}
                </button>
              </div>
            </div>
            {recoveryStatus === 'error' ? (
              <ul className="recovery-toast__errors" aria-label={t(locale, 'recoveryDetails')}>
                {recoveryErrors.map((error, index) => (
                  <li key={`${error.fieldPath}-${index}`}>
                    <strong>{error.fieldPath}</strong>
                    <span>{error.reason}</span>
                    <span>{t(locale, 'expected')}: {error.expected}</span>
                    <span>{t(locale, 'actual')}: {error.actual}</span>
                    <span>{error.recoveryAction}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </div>
      ) : null}
      {exportPreviewError ? (
        <section className="export-preview-error" role="alert" aria-label={t(locale, 'imageExportError')}>
          <span>{exportPreviewError}</span>
          <button type="button" className="app-action-button" onClick={closeExportPreview}>
            {t(locale, 'close')}
          </button>
        </section>
      ) : null}
      {exportPreviewSummary ? (
        <ExportPreview
          locale={locale}
          summary={exportPreviewSummary}
          downloadError={exportDownloadError}
          downloadStatus={exportDownloadStatus}
          onClose={closeExportPreview}
          onDownloadImage={downloadExportImage}
        />
      ) : null}
      {sceneStringStatus || sceneStringError ? (
        <section
          className="scene-string-status"
          role={sceneStringError ? 'alert' : 'status'}
          aria-label={t(locale, 'sceneStringStatus')}
        >
          {sceneStringError ?? sceneStringStatus}
        </section>
      ) : null}
      <section
        className="workbench-grid"
        aria-label="Open Design editing workbench"
        inert={exportPreviewOpen ? true : undefined}
        aria-hidden={exportPreviewOpen ? true : undefined}
      >
        <div className="workbench-left">
          <PokemonSceneControls
            locale={locale}
            readOnly={isReadOnly}
            selectedPokemonKey={scene.selectedPokemonKey}
            sceneName={scene.sceneName}
            onPokemonChange={updatePokemon}
            onSceneNameChange={updateSceneName}
          />
          <BuildingLevelPanel
            locale={locale}
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
            locale={locale}
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
              locale={locale}
              selectedContext={selectedContext}
              selectedInstance={selectedInstance}
              selectedInstanceId={selectedInstanceId}
              selectedSkillMarker={selectedSkillMarker}
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
              onSaveCellSkill={saveSelectedCellSkill}
            />
            <PreviewInspector
              locale={locale}
              scene={scene}
              activeBuildingLevelId={activeBuildingLevelId}
              selectedCoordinate={selectedCoordinate}
              selectedInstanceId={selectedInstanceId}
              readOnly={isReadOnly}
            />
          </div>
        </section>
        <AssetPicker
          locale={locale}
          readOnly={isReadOnly}
          selectedAssetId={selectedAssetId}
          selectedAssetMode={assetSelectionMode}
          selectedPokemonKey={scene.selectedPokemonKey}
          currentBuildingLevelName={currentBuildingLevel?.name ?? t(locale, 'noBuildingLayer')}
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
  const testWindow = window as unknown as { __pokopiaInitialSceneSnapshot?: unknown };

  if (isLocalPreviewHost(window.location.hostname) && navigator.webdriver && testWindow.__pokopiaInitialSceneSnapshot) {
    const recoveredInitialScene = applyRecoveredSceneDocument(defaultScene, testWindow.__pokopiaInitialSceneSnapshot, {
      interactionMode: 'edit',
      source: 'startup',
    });

    if (!recoveredInitialScene.ok) {
      return {
        scene: defaultScene,
        recoveryErrors: recoveredInitialScene.errors,
      };
    }

    return {
      scene: recoveredInitialScene.scene,
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
  if (storedScene?.ok) {
    return {
      scene: storedScene.scene,
      recoveryErrors: [],
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

function getRecoveryStatusTitle(status: 'idle' | 'error' | 'success' | 'canceled', locale: Locale): string {
  if (status === 'success') {
    return t(locale, 'savedSceneRecovered');
  }

  if (status === 'canceled') {
    return t(locale, 'recoveryCanceled');
  }

  if (status === 'error') {
    return t(locale, 'savedSceneRejected');
  }

  return t(locale, 'recoveryIdle');
}

function getRecoveryStatusMessage(status: 'idle' | 'error' | 'success' | 'canceled', locale: Locale): string {
  if (status === 'success') {
    return t(locale, 'recoverySuccessMessage');
  }

  if (status === 'canceled') {
    return t(locale, 'recoveryCanceledMessage');
  }

  if (status === 'error') {
    return t(locale, 'recoveryErrorMessage');
  }

  return t(locale, 'recoveryIdleMessage');
}

function createTileInstanceId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCopiedLayerInstancePrefix(): string {
  return `layer-copy-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
