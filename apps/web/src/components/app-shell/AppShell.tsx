import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { type AssetSkillType, type PokemonKey, type RotationDegrees } from '@pokopia-scene-editor/scene-core';
import { AssetPicker, type AssetSelectionMode } from '../asset-picker/AssetPicker';
import { BuildingLevelPanel } from '../building-level-panel/BuildingLevelPanel';
import { PokemonSceneControls } from '../pokemon-scene-controls/PokemonSceneControls';
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
  type GridSize,
  type ImageExportSummary,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import {
  editAssetInstance,
  editBuildingLayer,
  clearSceneRectangle,
  fillSceneRectangleWithSelectedAsset,
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
  createLayeredImageExportFiles,
  decodeSceneDocumentStringWithLossyRecovery,
  encodeSceneDocumentString,
  fetchRemoteSceneString,
  getSceneIdFromSearch,
  getUiPreferencesStorage,
  readLatestSceneDocumentFromStorage,
  readUiPreferencesFromStorage,
  savedSceneStorageKey,
  writeHelpOverlayDismissedPreferenceToStorage,
  type RecoveryError,
  type RemoteSceneFetchResult,
  writeLocalePreferenceToStorage,
  writeSceneDocumentToStorage,
} from '../../io';
import { ExportPreview } from '../export-preview/ExportPreview';
import {
  getDefaultBuildingLevelName,
  localeLabels,
  locales,
  t,
  type Locale,
} from '../../i18n';
import {
  createCopiedLayerInstancePrefix,
  createLayerNoteId,
  createStorageUnavailableRecoveryError,
  createTileInstanceId,
  formatDroppedTileInstance,
  getBrowserStorage,
  getCurrentIsoTimestamp,
  getRecoveryStatusMessage,
  getRecoveryStatusTitle,
  isMobileReadOnlyApplicationKey,
  isLocalPreviewHost,
  markSelectionStart,
  markSelectionVisible,
  waitForPlaywrightImageExportDelay,
  type RecoveryStatus,
} from './app-shell-helpers';
import {
  getHelpGuideLayouts,
  getPaddedHelpGuideRect,
  helpGuideCallouts,
  helpGuideSteps,
  type HelpGuideRect,
  type HelpGuideSnapshot,
  type HelpGuideCalloutKey,
} from './help-guide';
import { MobilePreviewMode } from './mobile-preview-mode';
import { resolveMobilePreviewState, type MobilePreviewState } from './mobile-preview-state';
import {
  SceneStringImportModal,
  type SceneStringImportSubmitResult,
} from '../scene-string-import-modal/scene-string-import-modal';
import { AuthProvider } from '../../auth/AuthProvider';
import { AuthStatusControl } from '../../auth/AuthStatusControl';
import { authReturnPathRestoredEvent } from '../../auth/auth-return-path';

const replacementConfirmationWindowMs = 15_000;
const toastAutoDismissMs = 3_000;
const helpOverlayMinimumWidth = 1280;

type NotificationToastTone = 'info' | 'success' | 'warning' | 'error';

interface NotificationToast {
  id: string;
  tone: NotificationToastTone;
  title: string;
  message: string;
}

type SceneStringImportSource = 'manual' | 'remote-scene-id';

type RemoteSceneImportState =
  | {
      status: 'idle';
    }
  | {
      status: 'loading';
      sceneId: string;
    }
  | {
      status: 'success';
      sceneId: string;
    }
  | {
      status: 'error';
      errors?: RecoveryError[];
      message: string;
      sceneId?: string;
    }
  | {
      status: 'lossy-confirmation';
      droppedTileDetails: string[];
      sceneId: string;
      sceneString: string;
    };

interface SceneStringImportContext {
  interactionMode: InteractionMode;
  isReadOnly: boolean;
  locale: Locale;
  mobilePreviewState: MobilePreviewState | null;
  scene: SceneDocument;
}

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
  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>(
    initialInteractionMode === 'readOnly'
      ? 'idle'
      : initialSceneState.recoveryErrors.length > 0 ? 'error' : 'idle',
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
  const [placementRotationDegrees, setPlacementRotationDegrees] = useState<RotationDegrees>(0);
  const [assetSelectionMode, setAssetSelectionMode] = useState<AssetSelectionMode>('single');
  const [placementFeedback, setPlacementFeedback] = useState<AssetPlacementPreview | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [readOnlyViewingLevelId, setReadOnlyViewingLevelId] = useState<string | null>(null);
  const [exportPreviewSummary, setExportPreviewSummary] = useState<ImageExportSummary | null>(null);
  const [imageDownloadPending, setImageDownloadPending] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(initialViewportWidth);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(initialInteractionMode);
  const [sceneStringImportModalOpen, setSceneStringImportModalOpen] = useState(false);
  const [fileActionsMenuOpen, setFileActionsMenuOpen] = useState(false);
  const [remoteSceneImportState, setRemoteSceneImportState] = useState<RemoteSceneImportState>(() =>
    createInitialRemoteSceneImportState(window.location.search),
  );
  const remoteSceneImportRequestIdRef = useRef(0);
  const automaticallyImportedRemoteSceneSearchRef = useRef<string | null>(null);
  const hasEnteredEditModeRef = useRef(initialInteractionMode === 'edit');
  const fileActionsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const fileActionsMenuRef = useRef<HTMLDivElement | null>(null);
  const [helpOverlayOpen, setHelpOverlayOpen] = useState(
    initialInteractionMode === 'edit' &&
      initialViewportWidth >= helpOverlayMinimumWidth &&
      !initialUiPreferences.helpOverlayDismissed,
  );
  const [helpGuideStepIndex, setHelpGuideStepIndex] = useState(0);
  const [helpGuideSnapshot, setHelpGuideSnapshot] = useState<HelpGuideSnapshot | null>(null);
  const helpOverlayAutoHandledRef = useRef(
    initialUiPreferences.helpOverlayDismissed ||
      (initialInteractionMode === 'edit' && initialViewportWidth >= helpOverlayMinimumWidth),
  );
  const isReadOnly = interactionMode === 'readOnly';
  const exportPreviewOpen = exportPreviewSummary !== null;
  const helpOverlayAvailable = !isReadOnly && viewportWidth >= helpOverlayMinimumWidth;
  const helpOverlayVisible = helpOverlayOpen && helpOverlayAvailable;
  const remoteMobilePreviewState = isReadOnly
    ? getRemoteMobilePreviewState(remoteSceneImportState)
    : null;
  const mobilePreviewState = isReadOnly
    ? remoteMobilePreviewState ?? resolveMobilePreviewState(
        getBrowserStorage(),
        locale,
        hasEnteredEditModeRef.current ? scene : null,
      )
    : null;
  const sceneStringImportContextRef = useRef<SceneStringImportContext | null>(null);
  sceneStringImportContextRef.current = {
    interactionMode,
    isReadOnly,
    locale,
    mobilePreviewState,
    scene,
  };
  const toastStackVisible = recoveryStatus !== 'idle' || notificationToasts.length > 0;
  const helpGuideLayouts = helpGuideSnapshot ? getHelpGuideLayouts(helpGuideSnapshot) : {};
  const activeHelpGuideStepIndex = Math.min(helpGuideStepIndex, helpGuideSteps.length - 1);
  const activeHelpGuideStep = helpGuideSteps[activeHelpGuideStepIndex] ?? helpGuideSteps[0];
  const visibleHelpGuideCallouts = activeHelpGuideStep.callouts;
  const isFinalHelpGuideStep = activeHelpGuideStepIndex === helpGuideSteps.length - 1;
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
    ? getAssetPlacementPreview(scene, targetCoordinate, interactionMode, placementRequiresSkill, placementRotationDegrees)
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
    if (!isReadOnly) {
      hasEnteredEditModeRef.current = true;
    }
  }, [isReadOnly]);

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
      const targets: Partial<Record<HelpGuideCalloutKey, HelpGuideRect>> = {};
      const arrowTargets: Partial<Record<HelpGuideCalloutKey, HelpGuideRect>> = {};

      for (const callout of helpGuideCallouts) {
        const targetElement = document.querySelector<HTMLElement>(callout.selector);
        if (!targetElement) {
          continue;
        }

        const rect = targetElement.getBoundingClientRect();
        targets[callout.key] = {
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        };

        const arrowTargetElement = document.querySelector<HTMLElement>(callout.arrowSelector ?? callout.selector);
        if (arrowTargetElement) {
          const arrowTargetRect = arrowTargetElement.getBoundingClientRect();
          arrowTargets[callout.key] = {
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
      if (sceneStringImportModalOpen) {
        return;
      }

      if (!isMobileReadOnlyApplicationKey(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    window.addEventListener('keydown', blockReadOnlyApplicationKey, { capture: true });
    return () => window.removeEventListener('keydown', blockReadOnlyApplicationKey, { capture: true });
  }, [isReadOnly, sceneStringImportModalOpen]);

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

  const updateCanvasSize = (canvasSize: GridSize) => {
    setHoveredCoordinate(null);
    setFocusedCoordinate(null);
    setReadOnlySelectedCoordinate(null);
    dispatch({
      type: 'resize-scene-canvas',
      canvasSize,
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
    setPlacementRotationDegrees(0);
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

  const rotatePlacementAsset = (assetId: string) => {
    if (isReadOnly) {
      return;
    }

    setPlacementRequiresSkill(false);
    setPlacementFeedback(null);
    setAssetSelectionMode('single');
    setPlacementRotationDegrees((currentRotation) =>
      assetId === scene.workspaceState.selectedAssetId ? getNextPlacementRotation(currentRotation) : 90,
    );
    dispatch({
      type: 'set-selected-asset',
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
      rotationDegrees: placementRotationDegrees,
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
        rotationDegrees: placementRotationDegrees,
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
    setPlacementRotationDegrees(0);
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

  const clearRectangleMaterial = (start: GridCoordinate, end: GridCoordinate) => {
    if (isReadOnly) {
      return;
    }

    const result = clearSceneRectangle(scene, {
      start,
      end,
      interactionMode,
      now: getCurrentIsoTimestamp(),
    });

    if (!result.ok) {
      return;
    }

    if (result.scene !== scene) {
      commitSceneEdit(result.scene);
    }
    setSelectedInstanceId(null);
    setPlacementFeedback(null);
    showNotificationToast({
      id: 'rectangle-edit',
      tone: result.cleared > 0 ? 'success' : 'info',
      title: '矩形清空完成',
      message: `清空 ${result.cleared} 个素材实例。`,
    });
  };

  const fillRectangleWithCurrentAsset = (start: GridCoordinate, end: GridCoordinate) => {
    if (isReadOnly || assetSelectionMode !== 'continuous' || !selectedAssetId) {
      return;
    }

    const result = fillSceneRectangleWithSelectedAsset(scene, {
      start,
      end,
      interactionMode,
      now: getCurrentIsoTimestamp(),
      createInstanceId: createTileInstanceId,
      requiresSkill: placementRequiresSkill,
      rotationDegrees: placementRotationDegrees,
    });

    if (!result.ok) {
      return;
    }

    if (result.scene !== scene) {
      commitSceneEdit(result.scene);
    }
    setPlacementFeedback(null);
    showNotificationToast({
      id: 'rectangle-edit',
      tone: result.placed > 0 ? 'success' : 'warning',
      title: '矩形填充完成',
      message: `放置 ${result.placed} 个素材，跳过 ${result.summary.skipped} 个格子。`,
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

  const reorderBuildingLayers = (levelIds: string[]) => {
    handleBuildingLayerResult(
      editBuildingLayer(scene, {
        type: 'reorder',
        levelIds,
        interactionMode,
        now: getCurrentIsoTimestamp(),
      }),
      { showSuccessToast: false },
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

  const openSceneStringImportModal = () => {
    setSceneStringImportModalOpen(true);
  };

  const closeSceneStringImportModal = () => {
    setSceneStringImportModalOpen(false);
  };

  const closeFileActionsMenu = (restoreFocus = false) => {
    setFileActionsMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => {
        fileActionsTriggerRef.current?.focus();
      });
    }
  };

  const toggleFileActionsMenu = () => {
    setFileActionsMenuOpen((open) => !open);
  };

  const runFileAction = (action: () => void, options: { restoreFocus?: boolean } = {}) => {
    closeFileActionsMenu(options.restoreFocus ?? true);
    action();
  };

  const getFileActionsMenuItems = () =>
    Array.from(
      fileActionsMenuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );

  const focusFileActionsMenuItem = (direction: 'first' | 'last' | 'next' | 'previous') => {
    const menuItems = getFileActionsMenuItems();
    if (menuItems.length === 0) {
      return;
    }

    const activeIndex = menuItems.findIndex((item) => item === document.activeElement);
    const nextIndex = (() => {
      if (direction === 'first') {
        return 0;
      }

      if (direction === 'last') {
        return menuItems.length - 1;
      }

      if (activeIndex === -1) {
        return direction === 'next' ? 0 : menuItems.length - 1;
      }

      return direction === 'next'
        ? (activeIndex + 1) % menuItems.length
        : (activeIndex - 1 + menuItems.length) % menuItems.length;
    })();

    menuItems[nextIndex]?.focus();
  };

  const handleFileActionsMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusFileActionsMenuItem('next');
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusFileActionsMenuItem('previous');
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      focusFileActionsMenuItem('first');
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      focusFileActionsMenuItem('last');
      return;
    }

    if (event.key === 'Tab') {
      closeFileActionsMenu();
    }
  };

  const cancelSceneStringImportModal = () => {
    setSceneStringImportModalOpen(false);
    if (!isReadOnly) {
      showNotificationToast({
        id: 'scene-string',
        tone: 'info',
        title: t(locale, 'sceneStringToastTitle'),
        message: t(locale, 'sceneStringImportCanceled'),
      });
    }
  };

  const applySceneStringImport = (
    sceneString: string,
    options: { allowLossy: boolean; source: SceneStringImportSource },
  ): SceneStringImportSubmitResult => {
    const importContext = sceneStringImportContextRef.current ?? {
      interactionMode,
      isReadOnly,
      locale,
      mobilePreviewState,
      scene,
    };
    const activeLocale = importContext.locale;
    const decoded = decodeSceneDocumentStringWithLossyRecovery(sceneString.trim(), getCurrentIsoTimestamp());
    const toastTitle = options.source === 'remote-scene-id'
      ? t(activeLocale, 'remoteSceneImportToastTitle')
      : t(activeLocale, 'sceneStringToastTitle');
    if (!decoded.ok) {
      if (!importContext.isReadOnly) {
        setRecoveryErrors(decoded.errors);
        setRecoveryStatus('error');
        showNotificationToast({
          id: options.source === 'remote-scene-id' ? 'remote-scene-import' : 'scene-string',
          tone: 'error',
          title: toastTitle,
          message: options.source === 'remote-scene-id'
            ? t(activeLocale, 'remoteSceneImportInvalidSceneString')
            : t(activeLocale, 'sceneStringInvalid'),
        });
      }
      return { status: 'invalid', errors: decoded.errors };
    }

    const droppedTileDetails = decoded.droppedTileInstances.map((droppedInstance) =>
      formatDroppedTileInstance(droppedInstance, activeLocale),
    );
    if (droppedTileDetails.length > 0 && !options.allowLossy) {
      return { status: 'lossy', droppedTileDetails };
    }

    const baseScene = importContext.isReadOnly && importContext.mobilePreviewState?.status === 'preview-ready'
      ? importContext.mobilePreviewState.scene
      : importContext.scene;
    const appliedRecovery = applyRecoveredSceneDocument(baseScene, decoded.payload, {
      interactionMode: importContext.interactionMode,
      source: 'confirmed-user',
    });
    if (!appliedRecovery.ok) {
      if (!importContext.isReadOnly) {
        setRecoveryErrors(appliedRecovery.errors);
        setRecoveryStatus('error');
        showNotificationToast({
          id: options.source === 'remote-scene-id' ? 'remote-scene-import' : 'scene-string',
          tone: 'error',
          title: toastTitle,
          message: options.source === 'remote-scene-id'
            ? t(activeLocale, 'remoteSceneImportInvalidSceneString')
            : t(activeLocale, 'sceneStringInvalid'),
        });
      }
      return { status: 'invalid', errors: appliedRecovery.errors };
    }

    if (importContext.isReadOnly) {
      try {
        buildImageExportSummary(appliedRecovery.scene, activeLocale);
      } catch {
        const message = t(activeLocale, 'sceneStringImportPreviewFailed');
        showNotificationToast({
          id: options.source === 'remote-scene-id' ? 'remote-scene-import' : 'scene-string',
          tone: 'error',
          title: toastTitle,
          message,
        });
        return { status: 'storage-error', message };
      }

      const storage = getBrowserStorage();
      if (!storage) {
        const message = t(activeLocale, 'sceneStringImportStorageUnavailable');
        showNotificationToast({
          id: options.source === 'remote-scene-id' ? 'remote-scene-import' : 'scene-string',
          tone: 'error',
          title: toastTitle,
          message,
        });
        return { status: 'storage-error', message };
      }

      try {
        writeSceneDocumentToStorage(storage, appliedRecovery.scene, 'autosave');
      } catch {
        const message = t(activeLocale, 'sceneStringImportStorageFailed');
        showNotificationToast({
          id: options.source === 'remote-scene-id' ? 'remote-scene-import' : 'scene-string',
          tone: 'error',
          title: toastTitle,
          message,
        });
        return { status: 'storage-error', message };
      }

      setScene(appliedRecovery.scene);
      setRecoveryErrors([]);
      setRecoveryStatus('idle');
      dismissNotificationToast('autosave');
      showNotificationToast({
        id: options.source === 'remote-scene-id' ? 'remote-scene-import' : 'scene-string',
        tone: droppedTileDetails.length > 0 ? 'warning' : 'success',
        title: toastTitle,
        message: droppedTileDetails.length > 0
          ? t(activeLocale, 'sceneStringImportedWithLosses', {
              count: droppedTileDetails.length,
              details: droppedTileDetails.join('；'),
            })
          : options.source === 'remote-scene-id'
            ? t(activeLocale, 'remoteSceneImportLoaded')
            : t(activeLocale, 'sceneStringImported'),
      });
      return { status: 'success' };
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
      id: options.source === 'remote-scene-id' ? 'remote-scene-import' : 'scene-string',
      tone: droppedTileDetails.length > 0 ? 'warning' : 'success',
      title: toastTitle,
      message: droppedTileDetails.length > 0
        ? t(activeLocale, 'sceneStringImportedWithLosses', {
            count: droppedTileDetails.length,
            details: droppedTileDetails.join('；'),
          })
        : options.source === 'remote-scene-id'
          ? t(activeLocale, 'remoteSceneImportLoaded')
          : t(activeLocale, 'sceneStringImported'),
    });
    return { status: 'success' };
  };

  const submitSceneStringImport = (
    sceneString: string,
    options: { allowLossy: boolean },
  ): SceneStringImportSubmitResult => {
    const result = applySceneStringImport(sceneString, { ...options, source: 'manual' });

    if (result.status === 'lossy') {
      remoteSceneImportRequestIdRef.current += 1;
    }

    if (result.status === 'success') {
      remoteSceneImportRequestIdRef.current += 1;
      dismissNotificationToast('remote-scene-import');
      setRemoteSceneImportState({ status: 'idle' });
    }

    return result;
  };

  const handleRemoteSceneString = (
    sceneId: string,
    sceneString: string,
    options: { allowLossy: boolean },
  ) => {
    const result = applySceneStringImport(sceneString, { ...options, source: 'remote-scene-id' });

    if (result.status === 'success') {
      setRemoteSceneImportState({ status: 'success', sceneId });
      return;
    }

    if (result.status === 'lossy') {
      setRemoteSceneImportState({
        status: 'lossy-confirmation',
        droppedTileDetails: result.droppedTileDetails,
        sceneId,
        sceneString,
      });
      return;
    }

    if (result.status === 'storage-error') {
      setRemoteSceneImportState({
        status: 'error',
        message: result.message,
        sceneId,
      });
      return;
    }

    setRemoteSceneImportState({
      status: 'error',
      errors: result.errors,
      message: t(locale, 'remoteSceneImportInvalidSceneString'),
      sceneId,
    });
  };

  const runRemoteSceneImport = async () => {
    const requestId = remoteSceneImportRequestIdRef.current + 1;
    remoteSceneImportRequestIdRef.current = requestId;
    const query = getSceneIdFromSearch(window.location.search);

    if (query.status === 'no-scene-id') {
      setRemoteSceneImportState({ status: 'idle' });
      return;
    }

    if (query.status === 'invalid-query') {
      setRemoteSceneImportState({
        status: 'error',
        message: t(locale, 'remoteSceneImportInvalidQuery'),
        sceneId: query.sceneId,
      });
      return;
    }

    setRemoteSceneImportState({ status: 'loading', sceneId: query.sceneId });
    const result = await fetchRemoteSceneString(window.location.search);

    if (remoteSceneImportRequestIdRef.current !== requestId) {
      return;
    }

    handleRemoteSceneFetchResult(result);
  };

  const runRemoteSceneImportForCurrentSearch = () => {
    const currentSearch = window.location.search;
    const query = getSceneIdFromSearch(currentSearch);
    if (query.status === 'no-scene-id') {
      return;
    }

    if (automaticallyImportedRemoteSceneSearchRef.current === currentSearch) {
      return;
    }

    automaticallyImportedRemoteSceneSearchRef.current = currentSearch;
    void runRemoteSceneImport();
  };

  const handleRemoteSceneFetchResult = (result: RemoteSceneFetchResult) => {
    switch (result.status) {
      case 'no-scene-id':
        setRemoteSceneImportState({ status: 'idle' });
        return;
      case 'invalid-query':
        setRemoteSceneImportState({
          status: 'error',
          message: t(locale, 'remoteSceneImportInvalidQuery'),
          sceneId: result.sceneId,
        });
        return;
      case 'success':
        handleRemoteSceneString(result.sceneId, result.sceneString, { allowLossy: false });
        return;
      case 'not-found':
        setRemoteSceneImportState({
          status: 'error',
          message: t(locale, 'remoteSceneImportNotFound', { sceneId: result.sceneId }),
          sceneId: result.sceneId,
        });
        return;
      case 'invalid-response':
        setRemoteSceneImportState({
          status: 'error',
          message: t(locale, 'remoteSceneImportInvalidResponse'),
          sceneId: result.sceneId,
        });
        return;
      case 'network-error':
        setRemoteSceneImportState({
          status: 'error',
          message: t(locale, 'remoteSceneImportNetworkError'),
          sceneId: result.sceneId,
        });
    }
  };

  const confirmRemoteLossyImport = () => {
    if (remoteSceneImportState.status !== 'lossy-confirmation') {
      return;
    }

    handleRemoteSceneString(remoteSceneImportState.sceneId, remoteSceneImportState.sceneString, {
      allowLossy: true,
    });
  };

  const cancelRemoteLossyImport = () => {
    setRemoteSceneImportState({
      status: 'error',
      message: t(locale, 'remoteSceneImportCanceled'),
      sceneId: remoteSceneImportState.status === 'lossy-confirmation'
        ? remoteSceneImportState.sceneId
        : undefined,
    });
  };

  useEffect(() => {
    runRemoteSceneImportForCurrentSearch();
  }, []);

  useEffect(() => {
    const runRestoredRemoteSceneImport = () => {
      runRemoteSceneImportForCurrentSearch();
    };

    window.addEventListener(authReturnPathRestoredEvent, runRestoredRemoteSceneImport);
    runRemoteSceneImportForCurrentSearch();

    return () => {
      window.removeEventListener(authReturnPathRestoredEvent, runRestoredRemoteSceneImport);
    };
  }, []);

  useEffect(() => {
    if (!fileActionsMenuOpen) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      focusFileActionsMenuItem('first');
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [fileActionsMenuOpen]);

  useEffect(() => {
    if (isReadOnly && fileActionsMenuOpen) {
      closeFileActionsMenu();
    }
  }, [fileActionsMenuOpen, isReadOnly]);

  useEffect(() => {
    if (!fileActionsMenuOpen) {
      return;
    }

    const handleDocumentMouseDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (
        fileActionsMenuRef.current?.contains(event.target) ||
        fileActionsTriggerRef.current?.contains(event.target)
      ) {
        return;
      }

      closeFileActionsMenu(true);
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      event.preventDefault();
      closeFileActionsMenu(true);
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [fileActionsMenuOpen]);

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

  const requestMobileImport = () => {
    setSceneStringImportModalOpen(true);
  };

  const downloadExportImage = async (
    previewElement: HTMLElement,
    summaryOverride?: ImageExportSummary,
  ) => {
    const targetSummary = summaryOverride ?? exportPreviewSummary;
    if (!targetSummary || imageDownloadPending) {
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
        sceneName: targetSummary.sceneName,
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

  const downloadLayeredExportImages = async (
    previewElement: HTMLElement,
    summaryOverride?: ImageExportSummary,
  ) => {
    const targetSummary = summaryOverride ?? exportPreviewSummary;
    if (!targetSummary || imageDownloadPending) {
      return;
    }

    const objectUrls: string[] = [];
    let downloadLink: HTMLAnchorElement | null = null;

    try {
      setImageDownloadPending(true);
      showNotificationToast({
        id: 'image-download',
        tone: 'info',
        title: t(locale, 'imageExportToastTitle'),
        message: t(locale, 'layerImagesPreparing'),
      });
      await waitForPlaywrightImageExportDelay();
      const exportFiles = await createLayeredImageExportFiles({
        previewElement,
        sceneName: targetSummary.sceneName,
      });
      downloadLink = document.createElement('a');
      downloadLink.rel = 'noopener';
      document.body.append(downloadLink);

      for (const exportFile of exportFiles) {
        const objectUrl = URL.createObjectURL(exportFile.blob);
        objectUrls.push(objectUrl);
        downloadLink.href = objectUrl;
        downloadLink.download = exportFile.fileName;
        downloadLink.click();
      }

      showNotificationToast({
        id: 'image-download',
        tone: 'success',
        title: t(locale, 'imageExportToastTitle'),
        message: t(locale, 'layerImagesReady'),
      });
    } catch (error) {
      console.error('Layered image export download failed.', error);
      showNotificationToast({
        id: 'image-download',
        tone: 'error',
        title: t(locale, 'imageExportToastTitle'),
        message: t(locale, 'imageDownloadFailed'),
      });
    } finally {
      setImageDownloadPending(false);
      downloadLink?.remove();
      for (const objectUrl of objectUrls) {
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

    setHelpGuideStepIndex(0);
    setHelpOverlayOpen(true);
  };

  const advanceHelpOverlay = () => {
    setHelpGuideStepIndex((currentStepIndex) => Math.min(currentStepIndex + 1, helpGuideSteps.length - 1));
  };

  const closeHelpOverlay = () => {
    helpOverlayAutoHandledRef.current = true;
    setHelpOverlayOpen(false);
    setHelpGuideStepIndex(0);
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
    <AuthProvider>
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
            <span className="app-brand__product-name">Scene Editor</span>
          </a>
        </div>
        <div className="app-header__actions" aria-label="Scene file actions">
          {helpOverlayAvailable ? (
            <button
              type="button"
              className="app-header-tool-button help-entry-button has-icon-tooltip"
              aria-label={t(locale, 'openHelpOverlay')}
              title={t(locale, 'openHelpOverlay')}
              data-tooltip={t(locale, 'openHelpOverlay')}
              onClick={openHelpOverlay}
            >
              <span className="app-header-tool-button__frame" aria-hidden="true" />
              ?
            </button>
          ) : null}
          <AuthStatusControl locale={locale} />
          {!isReadOnly ? (
            <button
              type="button"
              className="app-header-tool-button app-header-icon-button has-icon-tooltip"
              aria-label={t(locale, 'previewExportAction')}
              title={t(locale, 'previewExportAction')}
              data-tooltip={t(locale, 'previewExportAction')}
              onClick={openExportPreview}
            >
              <span className="app-header-tool-button__frame" aria-hidden="true" />
              <PreviewExportIcon />
            </button>
          ) : null}
          <label
            className="app-header-tool-button language-control has-icon-tooltip"
            title={t(locale, 'language')}
            data-tooltip={t(locale, 'language')}
          >
            <span className="app-header-tool-button__frame" aria-hidden="true" />
            <span className="sr-only">{t(locale, 'language')}</span>
            <LanguageIcon />
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
          {!isReadOnly ? (
            <div className="file-actions-menu">
              <button
                type="button"
                ref={fileActionsTriggerRef}
                className="app-header-tool-button app-header-icon-button file-actions-menu__trigger has-icon-tooltip"
                aria-label={t(locale, 'fileActions')}
                title={t(locale, 'fileActions')}
                data-tooltip={t(locale, 'fileActions')}
                aria-haspopup="menu"
                aria-expanded={fileActionsMenuOpen}
                aria-controls={fileActionsMenuOpen ? 'file-actions-menu' : undefined}
                onClick={toggleFileActionsMenu}
              >
                <span className="app-header-tool-button__frame" aria-hidden="true" />
                <FileActionsIcon />
              </button>
              {fileActionsMenuOpen ? (
                <div
                  id="file-actions-menu"
                  ref={fileActionsMenuRef}
                  className="file-actions-menu__popover"
                  role="menu"
                  aria-label={t(locale, 'fileActionsMenu')}
                  onKeyDown={handleFileActionsMenuKeyDown}
                >
                  <div
                    className="file-actions-menu__group"
                    role="group"
                    aria-label={t(locale, 'sceneStringActions')}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="file-actions-menu__item"
                      onClick={() => runFileAction(exportSceneString)}
                    >
                      {t(locale, 'exportSceneString')}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="file-actions-menu__item"
                      onClick={() => runFileAction(openSceneStringImportModal, { restoreFocus: false })}
                    >
                      {t(locale, 'importSceneString')}
                    </button>
                  </div>
                  <div
                    className="file-actions-menu__group file-actions-menu__group--danger"
                    role="group"
                    aria-label={t(locale, 'dangerousActions')}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className="file-actions-menu__item app-action-button--danger"
                      title={t(locale, 'resetSceneTitle')}
                      onClick={() => runFileAction(deleteCurrentScene)}
                    >
                      {t(locale, 'reset')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>
      {!isReadOnly && isRemoteSceneImportNoticeVisible(remoteSceneImportState) ? (
        <RemoteSceneImportStatus
          locale={locale}
          state={remoteSceneImportState}
          onImportRequest={openSceneStringImportModal}
          onLossyCancel={cancelRemoteLossyImport}
          onLossyConfirm={confirmRemoteLossyImport}
          onRetry={runRemoteSceneImport}
        />
      ) : null}
      {helpOverlayVisible && helpGuideSnapshot ? (
        <div
          className="help-guide-backdrop"
          data-guide-step={activeHelpGuideStep.key}
          data-guide-step-index={activeHelpGuideStepIndex + 1}
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
                {visibleHelpGuideCallouts.map((callout) => {
                  const targetRect = helpGuideSnapshot.targets[callout.key];
                  if (!targetRect) {
                    return null;
                  }

                  const spotlightRect = getPaddedHelpGuideRect(targetRect, helpGuideSnapshot);

                  return (
                    <rect
                      key={callout.key}
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
            {visibleHelpGuideCallouts.map((callout) => {
              const targetRect = helpGuideSnapshot.targets[callout.key];
              if (!targetRect) {
                return null;
              }

              const spotlightRect = getPaddedHelpGuideRect(targetRect, helpGuideSnapshot);

              return (
                <rect
                  key={callout.key}
                  className="help-guide-spotlight"
                  x={spotlightRect.left}
                  y={spotlightRect.top}
                  width={spotlightRect.width}
                  height={spotlightRect.height}
                  rx="14"
                />
              );
            })}
            {visibleHelpGuideCallouts.map((callout) => {
              const layout = helpGuideLayouts[callout.key];
              if (!layout) {
                return null;
              }

              return (
                <path
                  key={callout.key}
                  className="help-guide-arrow"
                  d={layout.arrowPath}
                  markerEnd="url(#help-guide-arrow-head)"
                />
              );
            })}
          </svg>
          {visibleHelpGuideCallouts.map((callout) => {
            const layout = helpGuideLayouts[callout.key];
            if (!layout) {
              return null;
            }

            return (
              <div
                key={callout.key}
                className="help-guide-note"
                data-guide-target={callout.key}
                style={layout.noteStyle}
              >
                <span className="help-guide-note__sentence">{t(locale, callout.messageKey)}</span>
              </div>
            );
          })}
          <button
            type="button"
            className="help-guide-confirm"
            title={isFinalHelpGuideStep ? t(locale, 'closeHelpOverlay') : t(locale, 'helpOverlayNext')}
            onClick={isFinalHelpGuideStep ? closeHelpOverlay : advanceHelpOverlay}
          >
            {t(locale, isFinalHelpGuideStep ? 'helpOverlayConfirm' : 'helpOverlayNext')}
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
          onDownloadLayerImages={downloadLayeredExportImages}
        />
      ) : null}
      <SceneStringImportModal
        locale={locale}
        open={sceneStringImportModalOpen}
        onCancel={cancelSceneStringImportModal}
        onClose={closeSceneStringImportModal}
        onSubmit={submitSceneStringImport}
      />
      {mobilePreviewState ? (
        <MobilePreviewMode
          downloadDisabled={imageDownloadPending}
          downloadStatus={imageDownloadPending ? t(locale, 'imagePreparing') : null}
          locale={locale}
          state={mobilePreviewState}
          onDownloadImage={mobilePreviewState.status === 'preview-ready'
            ? (previewElement) => downloadExportImage(previewElement, mobilePreviewState.summary)
            : undefined}
          onDownloadLayerImages={mobilePreviewState.status === 'preview-ready'
            ? (previewElement) => downloadLayeredExportImages(previewElement, mobilePreviewState.summary)
            : undefined}
          onImportRequest={requestMobileImport}
          onRemoteLossyCancel={cancelRemoteLossyImport}
          onRemoteLossyConfirm={confirmRemoteLossyImport}
          onRemoteRetry={runRemoteSceneImport}
        />
      ) : (
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
            canvasSize={scene.canvasSize}
            selectedPokemonKey={scene.selectedPokemonKey}
            sceneName={scene.sceneName}
            onCanvasSizeChange={updateCanvasSize}
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
            onReorderLayer={reorderBuildingLayers}
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
            rectangleFillEnabled={assetSelectionMode === 'continuous' && Boolean(selectedAssetId) && !isReadOnly}
            onSelectCoordinate={selectCoordinate}
            onViewCoordinate={viewCoordinate}
            onDeleteCoordinate={deleteCoordinateMaterial}
            onFillRectangle={fillRectangleWithCurrentAsset}
            onClearRectangle={clearRectangleMaterial}
            onHoverCoordinate={setHoveredCoordinate}
            onFocusCoordinate={setFocusedCoordinate}
          />
        </section>
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
        <AssetPicker
          locale={locale}
          readOnly={isReadOnly}
          selectedAssetId={selectedAssetId}
          selectedAssetMode={assetSelectionMode}
          selectedPokemonKey={scene.selectedPokemonKey}
          currentBuildingLevelName={currentBuildingLevel?.name ?? t(locale, 'noBuildingLayer')}
          placementRequiresSkill={placementRequiresSkill}
          placementRotationDegrees={placementRotationDegrees}
          onPlacementRequiresSkillChange={setPlacementRequiresSkill}
          onPlacementRotationChange={rotatePlacementAsset}
          onAssetSelect={selectAsset}
        />
        </section>
      )}
      </main>
    </AuthProvider>
  );
}

function createInitialRemoteSceneImportState(search: string): RemoteSceneImportState {
  const query = getSceneIdFromSearch(search);

  if (query.status === 'no-scene-id') {
    return { status: 'idle' };
  }

  if (query.status === 'invalid-query') {
    return {
      status: 'loading',
      sceneId: query.sceneId ?? 'scene_id',
    };
  }

  return {
    status: 'loading',
    sceneId: query.sceneId,
  };
}

function getNextPlacementRotation(rotationDegrees: RotationDegrees): RotationDegrees {
  if (rotationDegrees === 0) {
    return 90;
  }

  if (rotationDegrees === 90) {
    return 180;
  }

  if (rotationDegrees === 180) {
    return 270;
  }

  return 0;
}

function getRemoteMobilePreviewState(state: RemoteSceneImportState): MobilePreviewState | null {
  if (state.status === 'loading') {
    return {
      status: 'remote-loading',
      sceneId: state.sceneId,
    };
  }

  if (state.status === 'error') {
    return {
      status: 'remote-error',
      errors: state.errors,
      message: state.message,
    };
  }

  if (state.status === 'lossy-confirmation') {
    return {
      status: 'remote-lossy',
      droppedTileDetails: state.droppedTileDetails,
    };
  }

  return null;
}

function isRemoteSceneImportNoticeVisible(
  state: RemoteSceneImportState,
): state is Exclude<RemoteSceneImportState, { status: 'idle' | 'success' }> {
  return state.status === 'loading' || state.status === 'error' || state.status === 'lossy-confirmation';
}

function RemoteSceneImportStatus({
  locale,
  onImportRequest,
  onLossyCancel,
  onLossyConfirm,
  onRetry,
  state,
}: {
  locale: Locale;
  onImportRequest: () => void;
  onLossyCancel: () => void;
  onLossyConfirm: () => void;
  onRetry: () => void;
  state: Exclude<RemoteSceneImportState, { status: 'idle' | 'success' }>;
}) {
  const isAlert = state.status === 'error' || state.status === 'lossy-confirmation';
  const ariaLabel = state.status === 'lossy-confirmation'
    ? t(locale, 'remoteSceneImportLossyTitle')
    : isAlert
      ? t(locale, 'remoteSceneImportErrorTitle')
      : t(locale, 'remoteSceneImportLoadingTitle');

  return (
    <section
      className={`remote-scene-import-status remote-scene-import-status--${state.status}`}
      role={isAlert ? 'alert' : 'status'}
      aria-label={ariaLabel}
    >
      <div>
        <p className="eyebrow">{t(locale, 'remoteSceneImportToastTitle')}</p>
        <h2>{getRemoteSceneImportStatusTitle(state, locale)}</h2>
        <p>{getRemoteSceneImportStatusMessage(state, locale)}</p>
        {state.status === 'error' && state.errors?.length ? (
          <ul aria-label={t(locale, 'recoveryDetails')}>
            {state.errors.map((error, index) => (
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
        {state.status === 'lossy-confirmation' ? (
          <ul aria-label={t(locale, 'remoteSceneImportLossyDetails')}>
            {state.droppedTileDetails.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="remote-scene-import-status__actions">
        {state.status === 'loading' || state.status === 'error' ? (
          <button type="button" className="app-action-button" onClick={onRetry}>
            {t(locale, 'remoteSceneImportRetry')}
          </button>
        ) : null}
        {state.status === 'lossy-confirmation' ? (
          <>
            <button type="button" className="app-action-button" onClick={onLossyCancel}>
              {t(locale, 'remoteSceneImportCancelAction')}
            </button>
            <button type="button" className="app-action-button" onClick={onLossyConfirm}>
              {t(locale, 'remoteSceneImportLossyConfirmAction')}
            </button>
          </>
        ) : (
          <button type="button" className="app-action-button" onClick={onImportRequest}>
            {t(locale, 'remoteSceneImportManualAction')}
          </button>
        )}
      </div>
    </section>
  );
}

function PreviewExportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 5h16v10H4z" />
      <path d="M8 19h8" />
      <path d="M12 15v4" />
      <path d="m15 10-3 3-3-3" />
      <path d="M12 13V7" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M3 5h12" />
      <path d="M9 3v2" />
      <path d="M6 9c1.2 2 3.2 3.5 6 4.5" />
      <path d="M13 5c-.8 3.6-3 6.5-6.5 8.5" />
      <path d="m15 21 4-10 4 10" />
      <path d="M16.5 17h5" />
    </svg>
  );
}

function FileActionsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
    </svg>
  );
}

function getRemoteSceneImportStatusTitle(
  state: Exclude<RemoteSceneImportState, { status: 'idle' | 'success' }>,
  locale: Locale,
): string {
  if (state.status === 'loading') {
    return t(locale, 'remoteSceneImportLoadingTitle');
  }

  if (state.status === 'lossy-confirmation') {
    return t(locale, 'remoteSceneImportLossyTitle');
  }

  return t(locale, 'remoteSceneImportErrorTitle');
}

function getRemoteSceneImportStatusMessage(
  state: Exclude<RemoteSceneImportState, { status: 'idle' | 'success' }>,
  locale: Locale,
): string {
  if (state.status === 'loading') {
    return t(locale, 'remoteSceneImportLoading', { sceneId: state.sceneId });
  }

  if (state.status === 'lossy-confirmation') {
    return t(locale, 'remoteSceneImportLossySummary', {
      count: state.droppedTileDetails.length,
    });
  }

  return state.message;
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
