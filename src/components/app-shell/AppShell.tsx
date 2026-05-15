import { useEffect, useReducer, useRef, useState } from 'react';
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
  getSelectedCellContext,
  type GridCoordinate,
} from '../../domain/scene';
import { getInteractionMode, sceneReducer, type InteractionMode } from '../../state';

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
  const [hoveredCoordinate, setHoveredCoordinate] = useState<GridCoordinate | null>(null);
  const [focusedCoordinate, setFocusedCoordinate] = useState<GridCoordinate | null>(null);
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() =>
    getInteractionMode(window.innerWidth),
  );
  const isReadOnly = interactionMode === 'readOnly';
  const buildingLevelContexts = getBuildingLevelContexts(scene);
  const canvasCells = getCanvasCellContexts(scene);
  const targetCoordinate = hoveredCoordinate ?? focusedCoordinate;
  const selectedContext = getSelectedCellContext(scene);
  const targetContext = targetCoordinate ? getCellContext(scene, targetCoordinate) : null;
  const selectedCoordinate = scene.workspaceState.selectedCoordinate;

  useEffect(() => {
    const updateInteractionMode = () => {
      setInteractionMode(getInteractionMode(window.innerWidth));
    };

    window.addEventListener('resize', updateInteractionMode);
    return () => window.removeEventListener('resize', updateInteractionMode);
  }, []);

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
    pendingSelectionMeasureRef.current = markSelectionStart(selectionMeasureCounterRef.current);
    selectionMeasureCounterRef.current += 1;
    dispatch({ type: 'select-coordinate', coordinate });
  };

  return (
    <main className="app-shell" aria-label="Pokopia scene editor workbench">
      <PokemonSceneControls readOnly={isReadOnly} />
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
