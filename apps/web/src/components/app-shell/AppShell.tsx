import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { type AssetSkillType, type PokemonKey } from '@pokopia-scene-editor/scene-core';
import { AssetPicker, type AssetSelectionMode } from '../asset-picker/AssetPicker';
import { BuildingLevelPanel } from '../building-level-panel/BuildingLevelPanel';
import { PokemonSceneControls } from '../pokemon-scene-controls/PokemonSceneControls';
import { PreviewInspector } from '../preview-inspector/PreviewInspector';
import { SceneCanvas } from '../scene-canvas/SceneCanvas';
import { SelectionInspector } from '../selection-inspector/SelectionInspector';
import {
  buildSceneOccupancy,
  buildImageExportSummary,
  createDefaultSceneDocument,
  getBuildingLevelContexts,
  getCanvasCellContexts,
  getCellContext,
  type GridCoordinate,
  type ImageExportSummary,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
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
  writeHelpOverlayDismissedPreferenceToStorage,
  type RecoveryError,
  writeLocalePreferenceToStorage,
  writeSceneDocumentToStorage,
} from '../../io';
import { ExportPreview } from '../export-preview/ExportPreview';
import { getDefaultBuildingLevelName, localeLabels, locales, t, type Locale } from '../../i18n';

const replacementConfirmationWindowMs = 15_000;
const toastAutoDismissMs = 3_000;
const helpOverlayMinimumWidth = 1280;

type HelpGuideTargetKey = 'layers' | 'asset-favorites' | 'assets' | 'scene-controls';

interface HelpGuideTarget {
  key: HelpGuideTargetKey;
  selector: string;
  arrowSelector: string;
  messageKey:
    | 'helpOverlayLayers'
    | 'helpOverlayFavoriteAssets'
    | 'helpOverlayAssets'
    | 'helpOverlaySceneControls';
}

interface HelpGuideRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface HelpGuideSnapshot {
  viewportWidth: number;
  viewportHeight: number;
  targets: Partial<Record<HelpGuideTargetKey, HelpGuideRect>>;
  arrowTargets: Partial<Record<HelpGuideTargetKey, HelpGuideRect>>;
}

interface HelpGuideLayout {
  noteStyle: CSSProperties;
  arrowPath: string;
}

type NotificationToastTone = 'info' | 'success' | 'error';

interface NotificationToast {
  id: string;
  tone: NotificationToastTone;
  title: string;
  message: string;
}

const helpGuideTargets: HelpGuideTarget[] = [
  {
    key: 'layers',
    selector: '.level-panel',
    arrowSelector: '.level-row--current input',
    messageKey: 'helpOverlayLayers',
  },
  {
    key: 'asset-favorites',
    selector: '.asset-picker .favorite-toggle',
    arrowSelector: '.asset-picker .favorite-toggle input',
    messageKey: 'helpOverlayFavoriteAssets',
  },
  {
    key: 'assets',
    selector: '.asset-picker .asset-row:first-of-type .asset-select-button',
    arrowSelector: '.asset-picker .asset-row:first-of-type .asset-select-button',
    messageKey: 'helpOverlayAssets',
  },
  {
    key: 'scene-controls',
    selector: '.scene-controls',
    arrowSelector: '.scene-controls input',
    messageKey: 'helpOverlaySceneControls',
  },
];

export function AppShell() {
  const [initialUiPreferences] = useState(() =>
    readUiPreferencesFromStorage(getUiPreferencesStorage(), { persistNormalized: false }),
  );
  const initialViewportWidth = window.innerWidth;
  const initialInteractionMode = getInteractionMode(initialViewportWidth);
  const [initialSceneState] = useState(createInitialSceneState);
  const [scene, setScene] = useState(initialSceneState.scene);
  const [recoveryErrors, setRecoveryErrors] = useState<RecoveryError[]>(
    initialSceneState.recoveryErrors,
  );
  const [recoveryStatus, setRecoveryStatus] = useState<'idle' | 'error' | 'success' | 'canceled'>(
    initialSceneState.recoveryErrors.length > 0 ? 'error' : 'idle',
  );
  const [locale, setLocale] = useState<Locale>(initialUiPreferences.locale);
  const autosaveReadyRef = useRef(false);
  const recoveryToastTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const recoveryToastStartedAtRef = useRef(0);
  const recoveryToastRemainingMsRef = useRef(toastAutoDismissMs);
  const [notificationToasts, setNotificationToasts] = useState<NotificationToast[]>([]);
  const notificationToastTimersRef = useRef(new Map<string, ReturnType<typeof window.setTimeout>>());
  const notificationToastStartedAtRef = useRef(new Map<string, number>());
  const notificationToastRemainingMsRef = useRef(new Map<string, number>());
  const pendingSelectionMeasureRef = useRef<string | null>(null);
  const selectionMeasureCounterRef = useRef(0);
  const replacementConfirmationExpiresAtRef = useRef(0);
  const [readOnlySelectedCoordinate, setReadOnlySelectedCoordinate] = useState<GridCoordinate | null>(null);
  const [hoveredCoordinate, setHoveredCoordinate] = useState<GridCoordinate | null>(null);
  const [focusedCoordinate, setFocusedCoordinate] = useState<GridCoordinate | null>(null);
  const [placementRequiresSkill, setPlacementRequiresSkill] = useState(false);
  const [assetSelectionMode, setAssetSelectionMode] = useState<AssetSelectionMode>('single');
  const [placementFeedback, setPlacementFeedback] = useState<AssetPlacementPreview | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [readOnlyViewingLevelId, setReadOnlyViewingLevelId] = useState<string | null>(null);
  const [exportPreviewSummary, setExportPreviewSummary] = useState<ImageExportSummary | null>(null);
  const [imageDownloadPending, setImageDownloadPending] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(initialViewportWidth);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(initialInteractionMode);
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(
    initialInteractionMode === 'edit' &&
      initialViewportWidth >= helpOverlayMinimumWidth &&
      !initialUiPreferences.helpOverlayDismissed,
  );
  const [helpGuideSnapshot, setHelpGuideSnapshot] = useState<HelpGuideSnapshot | null>(null);
  const helpOverlayAutoHandledRef = useRef(
    initialUiPreferences.helpOverlayDismissed ||
      (initialInteractionMode === 'edit' && initialViewportWidth >= helpOverlayMinimumWidth),
  );
  const isReadOnly = interactionMode === 'readOnly';
  const exportPreviewOpen = exportPreviewSummary !== null;
  const helpOverlayAvailable = !isReadOnly && viewportWidth >= helpOverlayMinimumWidth;
  const helpOverlayVisible = helpOverlayOpen && helpOverlayAvailable;
  const toastStackVisible = recoveryStatus !== 'idle' || notificationToasts.length > 0;
  const helpGuideLayouts = helpGuideSnapshot ? getHelpGuideLayouts(helpGuideSnapshot) : {};
  const activeBuildingLevelId = isReadOnly
    ? readOnlyViewingLevelId ?? scene.workspaceState.currentBuildingLevelId
    : scene.workspaceState.currentBuildingLevelId;
  const buildingLevelContexts = getBuildingLevelContexts(scene);
  const displayedBuildingLevelContexts = buildingLevelContexts.map((level) => ({
    ...level,
    current: level.id === activeBuildingLevelId,
  }));
  const currentBuildingLevel = displayedBuildingLevelContexts.find((level) => level.current);
  const currentBuildingLevelRecord = scene.buildingLevels.find((level) => level.id === activeBuildingLevelId) ?? null;
  const canvasCells = getCanvasCellContexts(scene, activeBuildingLevelId);
  const stackingRelations = buildSceneOccupancy(scene).stackingRelations;
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
    ? getAssetPlacementPreview(scene, targetCoordinate, interactionMode, placementRequiresSkill, 0)
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

  const clearNotificationToastTimer = (toastId: string) => {
    const timer = notificationToastTimersRef.current.get(toastId);
    if (!timer) {
      return;
    }

    window.clearTimeout(timer);
    notificationToastTimersRef.current.delete(toastId);
  };

  const dismissNotificationToast = (toastId: string) => {
    clearNotificationToastTimer(toastId);
    notificationToastStartedAtRef.current.delete(toastId);
    notificationToastRemainingMsRef.current.delete(toastId);
    setNotificationToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== toastId));
  };

  const dismissAllNotificationToasts = () => {
    for (const toastId of Array.from(notificationToastTimersRef.current.keys())) {
      clearNotificationToastTimer(toastId);
    }

    notificationToastStartedAtRef.current.clear();
    notificationToastRemainingMsRef.current.clear();
    setNotificationToasts([]);
  };

  const startNotificationToastTimer = (
    toastId: string,
    delayMs = notificationToastRemainingMsRef.current.get(toastId) ?? toastAutoDismissMs,
  ) => {
    clearNotificationToastTimer(toastId);
    notificationToastStartedAtRef.current.set(toastId, Date.now());
    notificationToastTimersRef.current.set(
      toastId,
      window.setTimeout(() => dismissNotificationToast(toastId), delayMs),
    );
  };

  const pauseNotificationToastTimer = (toastId: string) => {
    const timer = notificationToastTimersRef.current.get(toastId);
    if (!timer) {
      return;
    }

    const startedAt = notificationToastStartedAtRef.current.get(toastId) ?? Date.now();
    const remainingMs = notificationToastRemainingMsRef.current.get(toastId) ?? toastAutoDismissMs;
    notificationToastRemainingMsRef.current.set(toastId, Math.max(0, remainingMs - (Date.now() - startedAt)));
    clearNotificationToastTimer(toastId);
  };

  const resumeNotificationToastTimer = (toastId: string) => {
    if (notificationToastTimersRef.current.has(toastId)) {
      return;
    }

    startNotificationToastTimer(toastId);
  };

  const showNotificationToast = (toast: NotificationToast) => {
    notificationToastRemainingMsRef.current.set(toast.id, toastAutoDismissMs);
    setNotificationToasts((currentToasts) => [
      toast,
      ...currentToasts.filter((currentToast) => currentToast.id !== toast.id),
    ]);
    startNotificationToastTimer(toast.id, toastAutoDismissMs);
  };

  useEffect(() => {
    const updateViewportState = () => {
      setViewportWidth(window.innerWidth);
      setInteractionMode(getInteractionMode(window.innerWidth));
    };

    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, []);

  useEffect(() => {
    return () => {
      for (const timer of notificationToastTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      notificationToastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!helpOverlayAvailable || helpOverlayAutoHandledRef.current) {
      return;
    }

    helpOverlayAutoHandledRef.current = true;
    setHelpOverlayOpen(true);
  }, [helpOverlayAvailable]);

  useEffect(() => {
    if (!helpOverlayAvailable && helpOverlayOpen) {
      setHelpOverlayOpen(false);
    }
  }, [helpOverlayAvailable, helpOverlayOpen]);

  useLayoutEffect(() => {
    if (!helpOverlayVisible) {
      setHelpGuideSnapshot(null);
      return undefined;
    }

    const updateHelpGuideSnapshot = () => {
      const targets: Partial<Record<HelpGuideTargetKey, HelpGuideRect>> = {};
      const arrowTargets: Partial<Record<HelpGuideTargetKey, HelpGuideRect>> = {};

      for (const target of helpGuideTargets) {
        const targetElement = document.querySelector<HTMLElement>(target.selector);
        if (!targetElement) {
          continue;
        }

        const rect = targetElement.getBoundingClientRect();
        targets[target.key] = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        const arrowTargetElement = document.querySelector<HTMLElement>(target.arrowSelector);
        if (arrowTargetElement) {
          const arrowTargetRect = arrowTargetElement.getBoundingClientRect();
          arrowTargets[target.key] = {
            top: arrowTargetRect.top,
            left: arrowTargetRect.left,
            width: arrowTargetRect.width,
            height: arrowTargetRect.height,
          };
        }
      }

      setHelpGuideSnapshot({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        targets,
        arrowTargets,
      });
    };

    updateHelpGuideSnapshot();
    window.addEventListener('resize', updateHelpGuideSnapshot);
    window.addEventListener('scroll', updateHelpGuideSnapshot, true);

    return () => {
      window.removeEventListener('resize', updateHelpGuideSnapshot);
      window.removeEventListener('scroll', updateHelpGuideSnapshot, true);
    };
  }, [helpOverlayVisible]);

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
      dismissNotificationToast('autosave');
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
      showNotificationToast({
        id: 'autosave',
        tone: 'error',
        title: t(locale, 'autosaveToastTitle'),
        message: t(locale, 'autosaveUnavailable'),
      });
      return;
    }

    try {
      writeSceneDocumentToStorage(storage, scene, 'autosave');
      dismissNotificationToast('autosave');
    } catch {
      showNotificationToast({
        id: 'autosave',
        tone: 'error',
        title: t(locale, 'autosaveToastTitle'),
        message: t(locale, 'autosaveFailed'),
      });
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

  const showSceneNameValidationError = (message: string) => {
    showNotificationToast({
      id: 'scene-name',
      tone: 'error',
      title: t(locale, 'sceneNameToastTitle'),
      message,
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
      rotationDegrees: 0,
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
        rotationDegrees: 0,
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

  const handleBuildingLayerResult = (
    result: BuildingLayerEditResult,
    options: { showSuccessToast?: boolean } = {},
  ) => {
    if (result.ok) {
      commitSceneEdit(result.scene);
      if (options.showSuccessToast ?? true) {
        showNotificationToast({
          id: 'building-layer',
          tone: 'success',
          title: t(locale, 'buildingLayerToastTitle'),
          message: result.message,
        });
      }
      setPlacementFeedback(null);
      return;
    }

    showNotificationToast({
      id: 'building-layer',
      tone: 'error',
      title: t(locale, 'buildingLayerToastTitle'),
      message: `${result.message}. ${result.repairHint}`,
    });
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
      return;
    }

    handleBuildingLayerResult(
      editBuildingLayer(scene, {
        type: 'set-current',
        levelId,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
      { showSuccessToast: false },
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

  const addLayerNote = (levelId: string, text: string) => {
    if (isReadOnly) {
      return false;
    }

    const result = editBuildingLayer(scene, {
      type: 'add-note',
      levelId,
      noteId: createLayerNoteId(levelId),
      text,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
    handleBuildingLayerResult(result, { showSuccessToast: false });
    return result.ok;
  };

  const updateLayerNote = (levelId: string, noteId: string, text: string) => {
    if (isReadOnly) {
      return false;
    }

    const result = editBuildingLayer(scene, {
      type: 'update-note',
      levelId,
      noteId,
      text,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
    handleBuildingLayerResult(result, { showSuccessToast: false });
    return result.ok;
  };

  const deleteLayerNote = (levelId: string, noteId: string) => {
    if (isReadOnly) {
      return false;
    }

    const result = editBuildingLayer(scene, {
      type: 'delete-note',
      levelId,
      noteId,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });
    handleBuildingLayerResult(result, { showSuccessToast: false });
    return result.ok;
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
    const affectedNoteCount = targetLayer?.notes.length ?? 0;
    const confirmed = window.confirm(
      t(locale, 'deleteLayerConfirm', {
        name: targetLayer?.name ?? levelId,
        itemCount: affectedCount,
        itemLabel: affectedCount === 1 ? t(locale, 'itemSingular') : t(locale, 'itemPlural'),
        noteCount: affectedNoteCount,
        noteLabel: affectedNoteCount === 1 ? t(locale, 'noteSingular') : t(locale, 'notePlural'),
      }),
    );

    if (!confirmed) {
      showNotificationToast({
        id: 'building-layer',
        tone: 'info',
        title: t(locale, 'buildingLayerToastTitle'),
        message: t(locale, 'deleteLayerCanceled', { message: result.message }),
      });
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
    dismissAllNotificationToasts();
    setSelectedInstanceId(null);
    setPlacementRequiresSkill(false);
    setAssetSelectionMode('single');
    replacementConfirmationExpiresAtRef.current = 0;
    setPlacementFeedback(null);
  };

  const exportSceneString = () => {
    try {
      const sceneString = encodeSceneDocumentString(scene);
      navigator.clipboard?.writeText(sceneString).catch(() => undefined);
      window.prompt(t(locale, 'sceneStringExportPrompt'), sceneString);
      showNotificationToast({
        id: 'scene-string',
        tone: 'success',
        title: t(locale, 'sceneStringToastTitle'),
        message: t(locale, 'sceneStringExported', { count: sceneString.length }),
      });
    } catch {
      showNotificationToast({
        id: 'scene-string',
        tone: 'error',
        title: t(locale, 'sceneStringToastTitle'),
        message: t(locale, 'sceneStringExportFailed'),
      });
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
      showNotificationToast({
        id: 'scene-string',
        tone: 'error',
        title: t(locale, 'sceneStringToastTitle'),
        message: t(locale, 'sceneStringInvalid'),
      });
      return;
    }

    const confirmed = window.confirm(t(locale, 'sceneStringImportConfirm'));
    if (!confirmed) {
      showNotificationToast({
        id: 'scene-string',
        tone: 'info',
        title: t(locale, 'sceneStringToastTitle'),
        message: t(locale, 'sceneStringImportCanceled'),
      });
      return;
    }

    const appliedRecovery = applyRecoveredSceneDocument(scene, decoded.payload, {
      interactionMode,
      source: 'confirmed-user',
    });
    if (!appliedRecovery.ok) {
      setRecoveryErrors(appliedRecovery.errors);
      setRecoveryStatus('error');
      showNotificationToast({
        id: 'scene-string',
        tone: 'error',
        title: t(locale, 'sceneStringToastTitle'),
        message: t(locale, 'sceneStringInvalid'),
      });
      return;
    }

    setScene(appliedRecovery.scene);
    setRecoveryErrors([]);
    setRecoveryStatus('success');
    dismissNotificationToast('autosave');
    setPlacementFeedback(null);
    setAssetSelectionMode('single');
    setSelectedInstanceId(null);
    replacementConfirmationExpiresAtRef.current = 0;
    showNotificationToast({
      id: 'scene-string',
      tone: 'success',
      title: t(locale, 'sceneStringToastTitle'),
      message: t(locale, 'sceneStringImported'),
    });
  };

  const openExportPreview = () => {
    try {
      setExportPreviewSummary(buildImageExportSummary(scene, locale));
      setImageDownloadPending(false);
      dismissNotificationToast('image-export');
      dismissNotificationToast('image-download');
    } catch {
      setExportPreviewSummary(null);
      showNotificationToast({
        id: 'image-export',
        tone: 'error',
        title: t(locale, 'imageExportToastTitle'),
        message: t(locale, 'imagePreviewFailed'),
      });
    }
  };

  const closeExportPreview = () => {
    setExportPreviewSummary(null);
    setImageDownloadPending(false);
  };

  const downloadExportImage = async (previewElement: HTMLElement) => {
    if (!exportPreviewSummary || imageDownloadPending) {
      return;
    }

    let objectUrl: string | null = null;
    let downloadLink: HTMLAnchorElement | null = null;

    try {
      setImageDownloadPending(true);
      showNotificationToast({
        id: 'image-download',
        tone: 'info',
        title: t(locale, 'imageExportToastTitle'),
        message: t(locale, 'imagePreparing'),
      });
      await waitForPlaywrightImageExportDelay();
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
      showNotificationToast({
        id: 'image-download',
        tone: 'success',
        title: t(locale, 'imageExportToastTitle'),
        message: t(locale, 'imageReady'),
      });
    } catch (error) {
      console.error('Image export download failed.', error);
      showNotificationToast({
        id: 'image-download',
        tone: 'error',
        title: t(locale, 'imageExportToastTitle'),
        message: t(locale, 'imageDownloadFailed'),
      });
    } finally {
      setImageDownloadPending(false);
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

  const openHelpOverlay = () => {
    if (!helpOverlayAvailable) {
      return;
    }

    setHelpOverlayOpen(true);
  };

  const closeHelpOverlay = () => {
    helpOverlayAutoHandledRef.current = true;
    setHelpOverlayOpen(false);
    writeHelpOverlayDismissedPreferenceToStorage(getUiPreferencesStorage());
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
    dismissNotificationToast('autosave');
    setPlacementFeedback(null);
    setAssetSelectionMode('single');
    replacementConfirmationExpiresAtRef.current = 0;
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
        <div className="app-header__brand-tools">
          <a
            className="app-brand"
            href="https://www.pokokit.com"
            aria-label="pokokit Scene Editor"
          >
            <span className="app-brand__pokokit">pokokit</span>
            <span>Scene Editor</span>
          </a>
          {helpOverlayAvailable ? (
            <button
              type="button"
              className="help-entry-button"
              aria-label={t(locale, 'openHelpOverlay')}
              title={t(locale, 'openHelpOverlay')}
              onClick={openHelpOverlay}
            >
              ?
            </button>
          ) : null}
        </div>
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
      {helpOverlayVisible && helpGuideSnapshot ? (
        <div
          className="help-guide-backdrop"
          data-guide-step="single-page"
          role="dialog"
          aria-modal="true"
          aria-label={t(locale, 'helpOverlayTitle')}
        >
          <svg
            className="help-guide-backdrop__scrim"
            aria-hidden="true"
            width={helpGuideSnapshot.viewportWidth}
            height={helpGuideSnapshot.viewportHeight}
          >
            <defs>
              <mask id="help-guide-mask" maskUnits="userSpaceOnUse">
                <rect
                  x="0"
                  y="0"
                  width={helpGuideSnapshot.viewportWidth}
                  height={helpGuideSnapshot.viewportHeight}
                  fill="white"
                />
                {helpGuideTargets.map((target) => {
                  const targetRect = helpGuideSnapshot.targets[target.key];
                  if (!targetRect) {
                    return null;
                  }

                  const spotlightRect = getPaddedHelpGuideRect(targetRect, helpGuideSnapshot);

                  return (
                    <rect
                      key={target.key}
                      x={spotlightRect.left}
                      y={spotlightRect.top}
                      width={spotlightRect.width}
                      height={spotlightRect.height}
                      rx="14"
                      fill="black"
                    />
                  );
                })}
              </mask>
              <marker
                id="help-guide-arrow-head"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="8"
                markerHeight="8"
                orient="auto"
              >
                <path d="M 1 1 L 10 6 L 1 11 z" className="help-guide-arrow-head" />
              </marker>
            </defs>
            <rect
              x="0"
              y="0"
              width={helpGuideSnapshot.viewportWidth}
              height={helpGuideSnapshot.viewportHeight}
              className="help-guide-scrim"
              mask="url(#help-guide-mask)"
            />
            {helpGuideTargets.map((target) => {
              const targetRect = helpGuideSnapshot.targets[target.key];
              if (!targetRect) {
                return null;
              }

              const spotlightRect = getPaddedHelpGuideRect(targetRect, helpGuideSnapshot);

              return (
                <rect
                  key={target.key}
                  className="help-guide-spotlight"
                  x={spotlightRect.left}
                  y={spotlightRect.top}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx="14"
                />
              );
            })}
            {helpGuideTargets.map((target) => {
              const layout = helpGuideLayouts[target.key];
              if (!layout) {
                return null;
              }

              return (
                <path
                  key={target.key}
                  className="help-guide-arrow"
                  d={layout.arrowPath}
                  markerEnd="url(#help-guide-arrow-head)"
                />
              );
            })}
          </svg>
          {helpGuideTargets.map((target) => {
            const layout = helpGuideLayouts[target.key];
            if (!layout) {
              return null;
            }

            return (
              <div
                key={target.key}
                className="help-guide-note"
                data-guide-target={target.key}
                style={layout.noteStyle}
              >
                <span>{t(locale, target.messageKey)}</span>
              </div>
            );
          })}
          <button
            type="button"
            className="help-guide-confirm"
            title={t(locale, 'closeHelpOverlay')}
            onClick={closeHelpOverlay}
          >
            {t(locale, 'helpOverlayConfirm')}
          </button>
        </div>
      ) : null}
      {toastStackVisible ? (
        <div className="toast-stack" aria-label={t(locale, 'notifications')}>
          {recoveryStatus !== 'idle' ? (
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
          ) : null}
          {notificationToasts.map((toast) => (
            <section
              className={`app-toast app-toast--${toast.tone}`}
              role={toast.tone === 'error' ? 'alert' : 'status'}
              aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
              aria-label={toast.title}
              data-toast-id={toast.id}
              data-toast-tone={toast.tone}
              key={toast.id}
              onMouseEnter={() => pauseNotificationToastTimer(toast.id)}
              onMouseLeave={() => resumeNotificationToastTimer(toast.id)}
              onFocus={() => pauseNotificationToastTimer(toast.id)}
              onBlur={() => resumeNotificationToastTimer(toast.id)}
            >
              <div className="app-toast__header">
                <div>
                  <h2>{toast.title}</h2>
                  <p>{toast.message}</p>
                </div>
                <div className="app-toast__actions">
                  <button type="button" onClick={() => dismissNotificationToast(toast.id)}>
                    {t(locale, 'close')}
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      ) : null}
      {exportPreviewSummary ? (
        <ExportPreview
          locale={locale}
          summary={exportPreviewSummary}
          downloadDisabled={imageDownloadPending}
          downloadStatus={imageDownloadPending ? t(locale, 'imagePreparing') : null}
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
            locale={locale}
            readOnly={isReadOnly}
            selectedPokemonKey={scene.selectedPokemonKey}
            sceneName={scene.sceneName}
            onPokemonChange={updatePokemon}
            onSceneNameChange={updateSceneName}
            onSceneNameValidationError={showSceneNameValidationError}
          />
          <BuildingLevelPanel
            locale={locale}
            levels={displayedBuildingLevelContexts}
            readOnly={isReadOnly}
            onCreateLayer={createBuildingLayer}
            onSelectLayer={selectBuildingLayer}
            onRenameLayer={renameBuildingLayer}
            onCopyLayer={copyBuildingLayer}
            onDeleteLayer={deleteBuildingLayer}
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
        <section
          className="canvas-stage"
          aria-label={t(locale, 'sceneCanvasWorkspace', {
            width: scene.canvasSize.width,
            height: scene.canvasSize.height,
          })}
        >
          <span className="sr-only status-pill" aria-label="Interaction mode">
            {isReadOnly ? 'Mobile read-only mode' : 'Desktop edit mode'}
          </span>
          <SceneCanvas
            locale={locale}
            canvasSize={scene.canvasSize}
            scene={scene}
            cells={canvasCells}
            readOnly={isReadOnly}
            placementMode={Boolean(scene.workspaceState.selectedAssetId && !isReadOnly)}
            selectedCoordinate={selectedCoordinate}
            targetCoordinate={targetCoordinate}
            targetPlacement={targetCoordinate ? targetPlacementPreview : null}
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
              stackingRelations={stackingRelations}
              targetContext={targetContext}
              targetPlacement={targetPlacementPreview}
              canvasSize={scene.canvasSize}
              sceneDimensions={{
                sceneSize: scene.sceneSize,
                canvasSize: scene.canvasSize,
                outerPadding: scene.outerPadding,
              }}
              buildingLevels={scene.buildingLevels}
              currentBuildingLevel={currentBuildingLevelRecord}
              tileInstances={scene.tileInstances}
              readOnly={isReadOnly}
              onSelectInstance={setSelectedInstanceId}
              onDeleteInstance={deleteInstance}
              onRotateInstance={rotateInstance}
              onSaveInstanceSkill={saveInstanceSkill}
              onSaveCellSkill={saveSelectedCellSkill}
              onAddLayerNote={addLayerNote}
              onUpdateLayerNote={updateLayerNote}
              onDeleteLayerNote={deleteLayerNote}
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

function getHelpGuideLayouts(
  snapshot: HelpGuideSnapshot,
): Partial<Record<HelpGuideTargetKey, HelpGuideLayout>> {
  return helpGuideTargets.reduce<Partial<Record<HelpGuideTargetKey, HelpGuideLayout>>>(
    (layouts, target) => {
      const targetRect = snapshot.targets[target.key];
      if (!targetRect) {
        return layouts;
      }

      layouts[target.key] = getHelpGuideLayout(
        targetRect,
        snapshot.arrowTargets?.[target.key] ?? targetRect,
        target.key,
        snapshot,
      );
      return layouts;
    },
    {},
  );
}

function getHelpGuideLayout(
  targetRect: HelpGuideRect,
  arrowTargetRect: HelpGuideRect,
  targetKey: HelpGuideTargetKey,
  snapshot: HelpGuideSnapshot,
): HelpGuideLayout {
  const viewportWidth = snapshot.viewportWidth;
  const viewportHeight = snapshot.viewportHeight;
  const noteWidth =
    targetKey === 'assets' ? Math.min(400, viewportWidth - 36) : Math.min(330, viewportWidth - 36);
  const noteHeight = 58;
  const viewportPadding = 18;
  const targetPoint = getHelpGuideTargetPoint(arrowTargetRect, targetKey);
  let noteLeft = targetPoint.x - noteWidth / 2;
  let noteTop = targetRect.top + targetRect.height + 26;

  if (targetKey === 'layers') {
    noteLeft = targetRect.left + targetRect.width + 116;
    noteTop = targetRect.top + 128;
  }

  if (targetKey === 'asset-favorites') {
    noteLeft = targetRect.left - noteWidth - 170;
    noteTop = targetRect.top + 78;
  }

  if (targetKey === 'assets') {
    noteLeft = targetRect.left - noteWidth - 116;
    noteTop = targetRect.top + 172;
  }

  if (targetKey === 'scene-controls') {
    noteLeft = targetRect.left + targetRect.width + 116;
    noteTop = targetRect.top + 8;
  }

  noteLeft = clamp(noteLeft, viewportPadding, viewportWidth - noteWidth - viewportPadding);
  noteTop = clamp(noteTop, viewportPadding, viewportHeight - noteHeight - viewportPadding);

  const noteAnchorX = getHelpGuideNoteArrowAnchorX(targetPoint, targetKey, noteLeft, noteWidth);
  const noteAnchorY = 32;
  const anchorX = noteLeft + noteAnchorX;
  const anchorY = noteTop + noteAnchorY;
  const targetEdgePoint = getHelpGuideTargetEdgePoint(arrowTargetRect, targetPoint, {
    x: anchorX,
    y: anchorY,
  });

  return {
    noteStyle: {
      left: `${noteLeft}px`,
      top: `${noteTop}px`,
      width: `${noteWidth}px`,
    },
    arrowPath: getHelpGuideArrowPath({ x: anchorX, y: anchorY }, targetEdgePoint),
  };
}

function getHelpGuideNoteArrowAnchorX(
  targetPoint: { x: number; y: number },
  targetKey: HelpGuideTargetKey,
  noteLeft: number,
  noteWidth: number,
): number {
  if (targetPoint.x < noteLeft) {
    return 8;
  }

  if (targetPoint.x > noteLeft + noteWidth) {
    return getHelpGuideRightArrowAnchorX(targetKey, noteWidth);
  }

  return noteWidth / 2;
}

function getHelpGuideRightArrowAnchorX(targetKey: HelpGuideTargetKey, noteWidth: number): number {
  if (targetKey === 'assets') {
    return Math.min(noteWidth - 8, 292);
  }

  if (targetKey === 'asset-favorites') {
    return Math.min(noteWidth - 8, 304);
  }

  return noteWidth - 8;
}

function getHelpGuideArrowPath(
  startPoint: { x: number; y: number },
  endPoint: { x: number; y: number },
): string {
  const deltaX = endPoint.x - startPoint.x;
  const deltaY = endPoint.y - startPoint.y;
  const distance = Math.max(1, Math.hypot(deltaX, deltaY));
  const downwardCurveOffset = clamp(distance * 0.32, 34, 96);
  const controlPoint = {
    x: startPoint.x + deltaX * 0.5,
    y: Math.max(startPoint.y, endPoint.y) + downwardCurveOffset,
  };

  return `M ${formatSvgNumber(startPoint.x)} ${formatSvgNumber(startPoint.y)} Q ${formatSvgNumber(controlPoint.x)} ${formatSvgNumber(controlPoint.y)} ${formatSvgNumber(endPoint.x)} ${formatSvgNumber(endPoint.y)}`;
}

function getHelpGuideTargetEdgePoint(
  targetRect: HelpGuideRect,
  targetPoint: { x: number; y: number },
  fromPoint: { x: number; y: number },
): { x: number; y: number } {
  const deltaX = fromPoint.x - targetPoint.x;
  const deltaY = fromPoint.y - targetPoint.y;
  const candidates: Array<{ x: number; y: number; distance: number }> = [];
  const right = targetRect.left + targetRect.width;
  const bottom = targetRect.top + targetRect.height;

  if (deltaX !== 0) {
    const edgeX = deltaX > 0 ? right : targetRect.left;
    const distance = (edgeX - targetPoint.x) / deltaX;
    const y = targetPoint.y + deltaY * distance;
    if (distance > 0 && y >= targetRect.top && y <= bottom) {
      candidates.push({ x: edgeX, y, distance });
    }
  }

  if (deltaY !== 0) {
    const edgeY = deltaY > 0 ? bottom : targetRect.top;
    const distance = (edgeY - targetPoint.y) / deltaY;
    const x = targetPoint.x + deltaX * distance;
    if (distance > 0 && x >= targetRect.left && x <= right) {
      candidates.push({ x, y: edgeY, distance });
    }
  }

  const nearestEdgePoint = candidates.sort((first, second) => first.distance - second.distance)[0];
  if (!nearestEdgePoint) {
    return targetPoint;
  }

  return {
    x: nearestEdgePoint.x,
    y: nearestEdgePoint.y,
  };
}

function formatSvgNumber(value: number): string {
  return value.toFixed(1);
}

function getPaddedHelpGuideRect(targetRect: HelpGuideRect, snapshot: HelpGuideSnapshot): HelpGuideRect {
  const left = Math.max(8, targetRect.left - 8);
  const top = Math.max(8, targetRect.top - 8);

  return {
    left,
    top,
    width: Math.min(targetRect.width + 16, snapshot.viewportWidth - left - 8),
    height: Math.min(targetRect.height + 16, snapshot.viewportHeight - top - 8),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getHelpGuideTargetPoint(
  targetRect: HelpGuideRect,
  targetKey: HelpGuideTargetKey,
): { x: number; y: number } {
  if (targetKey === 'layers') {
    return {
      x: targetRect.left + targetRect.width * 0.48,
      y: targetRect.top + Math.min(116, targetRect.height * 0.38),
    };
  }

  if (targetKey === 'assets') {
    return {
      x: targetRect.left + targetRect.width * 0.5,
      y: targetRect.top + Math.min(210, targetRect.height * 0.34),
    };
  }

  return {
    x: targetRect.left + targetRect.width / 2,
    y: targetRect.top + targetRect.height / 2,
  };
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

function waitForPlaywrightImageExportDelay(): Promise<void> {
  const testWindow = window as unknown as { __pokopiaImageExportDelayMs?: number };
  const delayMs = navigator.webdriver && isLocalPreviewHost(window.location.hostname)
    ? testWindow.__pokopiaImageExportDelayMs
    : undefined;

  if (!delayMs || delayMs <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => window.setTimeout(resolve, delayMs));
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

function createLayerNoteId(levelId: string): string {
  return `${levelId}-note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
