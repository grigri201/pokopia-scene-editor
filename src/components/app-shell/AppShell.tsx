import { useEffect, useReducer, useRef, useState } from 'react';
import type { PokemonKey } from '../../domain/assets';
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
import { getInteractionMode, sceneReducer, type InteractionMode } from '../../state';
import { getPokemonTheme, toPokemonThemeStyle } from '../../theme';

export function AppShell() {
  const [scene, dispatch] = useReducer(
    sceneReducer,
    undefined,
    () =>
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
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() =>
    getInteractionMode(window.innerWidth),
  );
  const isReadOnly = interactionMode === 'readOnly';
  const buildingLevelContexts = getBuildingLevelContexts(scene);
  const canvasCells = getCanvasCellContexts(scene);
  const targetCoordinate = hoveredCoordinate ?? focusedCoordinate;
  const selectedCoordinate = isReadOnly
    ? readOnlySelectedCoordinate
    : scene.workspaceState.selectedCoordinate;
  const selectedContext = selectedCoordinate ? getCellContext(scene, selectedCoordinate) : null;
  const targetContext = targetCoordinate ? getCellContext(scene, targetCoordinate) : null;
  const pokemonThemeStyle = toPokemonThemeStyle(getPokemonTheme(scene.selectedPokemonKey));

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

  const selectCoordinate = (coordinate: GridCoordinate) => {
    const nextCoordinate = { x: coordinate.x, y: coordinate.y };
    pendingSelectionMeasureRef.current = markSelectionStart(selectionMeasureCounterRef.current);
    selectionMeasureCounterRef.current += 1;

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
          <SelectionInspector selectedContext={selectedContext} targetContext={targetContext} />
          <SceneCanvas
            canvasSize={scene.canvasSize}
            cells={canvasCells}
            readOnly={isReadOnly}
            selectedCoordinate={selectedCoordinate}
            targetCoordinate={targetCoordinate}
            onSelectCoordinate={selectCoordinate}
            onViewCoordinate={viewCoordinate}
            onHoverCoordinate={setHoveredCoordinate}
            onFocusCoordinate={setFocusedCoordinate}
          />
        </section>
        <AssetPicker readOnly={isReadOnly} />
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
