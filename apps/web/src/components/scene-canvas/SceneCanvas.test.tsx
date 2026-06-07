import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  createSceneDimensionsForCanvasSize,
  createStackingPartialSurfaceScene,
  createStackingPlateFoodScene,
  stackingContractFixtureIds,
  createSkillMarker,
  createTileInstance,
  buildSceneOccupancy,
  getCanvasCellContexts,
  legacySceneDimensions,
  type GridCoordinate,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import { getAssetPlacementPreview } from '../../state';
import { SceneCanvas } from './SceneCanvas';

const scene = createDefaultSceneDocument({
  sceneId: 'scene-test',
  now: '2026-05-16T07:00:00.000Z',
});
const defaultCanvasCellCount = scene.canvasSize.width * scene.canvasSize.height;
const defaultMainCellCount = scene.sceneSize.width * scene.sceneSize.height;
const defaultOuterCellCount = defaultCanvasCellCount - defaultMainCellCount;
const defaultMainBoundaryCellCount = getBoundaryCellCount(scene.sceneSize);
const defaultMaxCoordinate = {
  x: scene.canvasSize.width - 1,
  y: scene.canvasSize.height - 1,
};
const defaultMaxMainCoordinate = {
  x: scene.outerPadding + scene.sceneSize.width - 1,
  y: scene.outerPadding + scene.sceneSize.height - 1,
};

const defaultProps = {
  canvasSize: scene.canvasSize,
  cells: getCanvasCellContexts(scene),
  placementMode: false,
  selectedCoordinate: null,
  targetCoordinate: null,
  onSelectCoordinate: () => undefined,
  onViewCoordinate: () => undefined,
  onDeleteCoordinate: () => undefined,
  onHoverCoordinate: () => undefined,
  onFocusCoordinate: () => undefined,
};

describe('SceneCanvas', () => {
  it('renders every addressable 0-based canvas cell with coordinate watermarks', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const cells = screen.getAllByRole('gridcell');
    const coordinateWatermarks = document.querySelectorAll('.cell-coordinate-watermark');

    expect(screen.getByRole('grid', { name: `${scene.canvasSize.width}x${scene.canvasSize.height} canvas with main and outer regions` })).toBeVisible();
    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-canvas-density', 'compact');
    expect(screen.getByTestId('scene-canvas')).toHaveStyle({
      '--scene-canvas-columns': `${scene.canvasSize.width}`,
      '--scene-canvas-rows': `${scene.canvasSize.height}`,
      '--scene-canvas-max-side': `${Math.max(scene.canvasSize.width, scene.canvasSize.height)}`,
      '--scene-canvas-aspect-ratio': `${scene.canvasSize.width} / ${scene.canvasSize.height}`,
      '--scene-canvas-width-large': 'calc(min(100cqw, 100cqh) * 1)',
      '--scene-canvas-height-large': 'calc(min(100cqw, 100cqh) * 1)',
      '--scene-canvas-render-width-large': 'calc(min(100cqw, 100cqh) * 1)',
      '--scene-canvas-render-height-large': 'calc(min(100cqw, 100cqh) * 1)',
    });
    expect(cells).toHaveLength(defaultCanvasCellCount);
    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, placeable')).toBeVisible();
    expect(screen.getByLabelText(`Cell ${defaultMaxCoordinate.x},${defaultMaxCoordinate.y}, outer area, level-0, placeable`)).toBeVisible();
    expect(screen.getByLabelText(`Cell ${scene.outerPadding},${scene.outerPadding}, main area, level-0, placeable`)).toBeVisible();
    expect(screen.getByLabelText(`Cell ${defaultMaxMainCoordinate.x},${defaultMaxMainCoordinate.y}, main area, level-0, placeable`)).toBeVisible();
    expect(coordinateWatermarks).toHaveLength(defaultCanvasCellCount);
    expect(cells[0]).toHaveTextContent('0,0');
    expect(cells[scene.canvasSize.width + 1]).toHaveTextContent(`${scene.outerPadding},${scene.outerPadding}`);
    expect(cells[0].querySelector('.cell-coordinate-watermark')).toHaveAttribute('aria-hidden', 'true');
  }, 15_000);

  it('marks main, outer, main-boundary, and placeable states for tests and styling', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const cells = screen.getAllByTestId('scene-cell');

    expect(cells.filter((cell) => cell.dataset.area === 'main')).toHaveLength(defaultMainCellCount);
    expect(cells.filter((cell) => cell.dataset.area === 'outer')).toHaveLength(defaultOuterCellCount);
    expect(cells.filter((cell) => cell.dataset.mainBoundary === 'true')).toHaveLength(defaultMainBoundaryCellCount);
    expect(cells.every((cell) => cell.dataset.placeable === 'true')).toBe(true);
    expect(cells.every((cell) => cell.dataset.editable === 'true')).toBe(true);

    const coordinates = cells.map((cell) => cell.dataset.coordinate);
    const expectedCoordinates = Array.from({ length: defaultCanvasCellCount }, (_, index) => {
      const x = index % scene.canvasSize.width;
      const y = Math.floor(index / scene.canvasSize.width);
      return `${x},${y}`;
    });

    expect(new Set(coordinates).size).toBe(defaultCanvasCellCount);
    expect(coordinates).toEqual(expectedCoordinates);
  });

  it('continues to render legacy recovered 7x7 scenes by their saved dimensions', () => {
    render(<SceneCanvas {...createSceneCanvasProps(createLegacyScene())} readOnly={false} />);

    const legacyCanvasCellCount = legacySceneDimensions.canvasSize.width * legacySceneDimensions.canvasSize.height;
    const legacyMainCellCount = legacySceneDimensions.sceneSize.width * legacySceneDimensions.sceneSize.height;
    const legacyOuterCellCount = legacyCanvasCellCount - legacyMainCellCount;
    const legacyMainBoundaryCellCount = getBoundaryCellCount(legacySceneDimensions.sceneSize);
    const legacyMaxCoordinate = {
      x: legacySceneDimensions.canvasSize.width - 1,
      y: legacySceneDimensions.canvasSize.height - 1,
    };
    const cells = screen.getAllByTestId('scene-cell');

    expect(screen.getByRole('grid', { name: `${legacySceneDimensions.canvasSize.width}x${legacySceneDimensions.canvasSize.height} canvas with main and outer regions` })).toBeVisible();
    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-canvas-density', 'standard');
    expect(cells).toHaveLength(legacyCanvasCellCount);
    expect(cells.filter((cell) => cell.dataset.area === 'main')).toHaveLength(legacyMainCellCount);
    expect(cells.filter((cell) => cell.dataset.area === 'outer')).toHaveLength(legacyOuterCellCount);
    expect(cells.filter((cell) => cell.dataset.mainBoundary === 'true')).toHaveLength(legacyMainBoundaryCellCount);
    expect(screen.getByLabelText(`Cell ${legacyMaxCoordinate.x},${legacyMaxCoordinate.y}, outer area, level-0, placeable`)).toBeVisible();
  });

  it('separates domain placeability from current read-only editability', () => {
    render(<SceneCanvas {...defaultProps} readOnly />);

    const cells = screen.getAllByTestId('scene-cell');

    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, read-only')).toBeVisible();
    expect(cells.every((cell) => cell.dataset.placeable === 'true')).toBe(true);
    expect(cells.every((cell) => cell.dataset.editable === 'false')).toBe(true);
    expect(cells.every((cell) => !cell.hasAttribute('aria-disabled'))).toBe(true);
  });

  it('keeps all editable cells available because layer hidden/locked state is no longer a command boundary', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, placeable')).toBeVisible();
    expect(screen.getAllByTestId('scene-cell').every((cell) => cell.dataset.editable === 'true')).toBe(true);
  });

  it('sizes portrait rectangular canvases so the long side fills the viewport height', () => {
    const dimensions = createSceneDimensionsForCanvasSize({ width: 6, height: 20 });
    const rectangularScene = {
      ...scene,
      sceneSize: dimensions.sceneSize,
      canvasSize: dimensions.canvasSize,
      outerPadding: dimensions.outerPadding,
    };

    render(<SceneCanvas {...createSceneCanvasProps(rectangularScene)} readOnly={false} />);

    const canvas = screen.getByTestId('scene-canvas');
    expect(screen.getByRole('grid', { name: '6x20 canvas with main and outer regions' })).toBeVisible();
    expect(screen.getAllByTestId('scene-cell')).toHaveLength(120);
    expect(canvas).toHaveStyle({
      '--scene-canvas-columns': '6',
      '--scene-canvas-rows': '20',
      '--scene-canvas-max-side': '20',
      '--scene-canvas-aspect-ratio': '6 / 20',
      '--scene-canvas-width-large': 'calc(min(100cqw, 30cqh) * 1)',
      '--scene-canvas-height-large': 'calc(min(333.3333cqw, 100cqh) * 1)',
      '--scene-canvas-width-medium': 'min(30%, 186px)',
      '--scene-canvas-width-mobile': 'min(30%, 27.6vw)',
    });
  });

  it('sizes landscape rectangular canvases so the long side fills the viewport width', () => {
    const dimensions = createSceneDimensionsForCanvasSize({ width: 20, height: 6 });
    const rectangularScene = {
      ...scene,
      sceneSize: dimensions.sceneSize,
      canvasSize: dimensions.canvasSize,
      outerPadding: dimensions.outerPadding,
    };

    render(<SceneCanvas {...createSceneCanvasProps(rectangularScene)} readOnly={false} />);

    const canvas = screen.getByTestId('scene-canvas');
    expect(screen.getByRole('grid', { name: '20x6 canvas with main and outer regions' })).toBeVisible();
    expect(screen.getAllByTestId('scene-cell')).toHaveLength(120);
    expect(canvas).toHaveStyle({
      '--scene-canvas-columns': '20',
      '--scene-canvas-rows': '6',
      '--scene-canvas-max-side': '20',
      '--scene-canvas-aspect-ratio': '20 / 6',
      '--scene-canvas-width-large': 'calc(min(100cqw, 333.3333cqh) * 1)',
      '--scene-canvas-height-large': 'calc(min(30cqw, 100cqh) * 1)',
      '--scene-canvas-width-medium': 'min(100%, 620px)',
      '--scene-canvas-width-mobile': 'min(100%, 92vw)',
    });
  });

  it('wraps the grid in a clipped zoom viewport with long-side max zoom bounds', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const canvas = screen.getByTestId('scene-canvas');

    expect(viewport).toHaveAttribute('data-zoom-scale', '1');
    expect(viewport).toHaveAttribute('data-zoom-min-scale', '1');
    expect(viewport).toHaveAttribute('data-zoom-max-scale', '2.8333');
    expect(viewport).toHaveAttribute('data-zoom-origin', '50,50');
    expect(canvas).toHaveStyle({
      '--scene-canvas-zoom-scale': '1',
      '--scene-canvas-zoom-max-scale': '2.8333',
      '--scene-canvas-render-width-large': 'calc(min(100cqw, 100cqh) * 1)',
      '--scene-canvas-render-height-large': 'calc(min(100cqw, 100cqh) * 1)',
    });
  });

  it('reflows the canvas at the zoomed size so CSS grid details stay sharp', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const canvas = screen.getByTestId('scene-canvas');

    fireEvent.wheel(viewport, { deltaY: -1200 });

    expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');
    expect(canvas).toHaveStyle({
      '--scene-canvas-render-width-large': 'calc(min(100cqw, 100cqh) * 2.8333)',
      '--scene-canvas-render-height-large': 'calc(min(100cqw, 100cqh) * 2.8333)',
    });
  });

  it('derives max zoom from legacy, rectangular, and small canvas dimensions', () => {
    const { rerender } = render(<SceneCanvas {...createSceneCanvasProps(createLegacyScene())} readOnly={false} />);

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-zoom-max-scale', '1.1667');

    const rectangularScene = createSceneWithCanvasSize({ width: 6, height: 17 });
    rerender(<SceneCanvas {...createSceneCanvasProps(rectangularScene)} readOnly={false} />);

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-zoom-max-scale', '2.8333');
    fireEvent.wheel(screen.getByTestId('scene-canvas-viewport'), { deltaY: -1200 });
    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-zoom-scale', '2.8333');

    const smallScene = createSceneWithCanvasSize({ width: 6, height: 6 });
    rerender(<SceneCanvas {...createSceneCanvasProps(smallScene)} readOnly={false} />);

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-zoom-max-scale', '1');
    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-zoom-scale', '1');
  });

  it('clamps wheel zoom inside the viewport without changing coordinate callbacks', () => {
    const onSelectCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onSelectCoordinate={onSelectCoordinate}
      />,
    );

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const zoomInEvent = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: -1200,
      clientX: 12,
      clientY: 18,
    });
    const preventDefaultSpy = vi.spyOn(zoomInEvent, 'preventDefault');

    fireEvent(viewport, zoomInEvent);
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
    expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');

    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-0, placeable'));

    expect(onSelectCoordinate).toHaveBeenCalledWith({ x: 2, y: 3 });

    fireEvent.wheel(viewport, { deltaY: 1200 });

    expect(viewport).toHaveAttribute('data-zoom-scale', '1');
  });

  it('resets zoom and pan to the default viewport mode from the viewport control', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    let pointerCaptured = false;
    const hasPointerCapture = vi.fn(() => pointerCaptured);
    setPointerCapture.mockImplementation(() => {
      pointerCaptured = true;
    });
    releasePointerCapture.mockImplementation(() => {
      pointerCaptured = false;
    });
    Object.assign(viewport, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
    });

    fireEvent.wheel(viewport, { deltaY: -1200 });
    fireEvent.pointerDown(viewport, { button: 0, clientX: 100, clientY: 100, pointerId: 7 });
    fireEvent.pointerMove(viewport, { clientX: 130, clientY: 112, pointerId: 7 });
    fireEvent.pointerUp(viewport, { clientX: 130, clientY: 112, pointerId: 7 });

    expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');
    expect(viewport).toHaveAttribute('data-zoom-pan', '30,12');

    fireEvent.click(screen.getByRole('button', { name: 'Reset canvas view' }));

    expect(viewport).toHaveAttribute('data-zoom-scale', '1');
    expect(viewport).toHaveAttribute('data-zoom-origin', '50,50');
    expect(viewport).toHaveAttribute('data-zoom-pan', '0,0');
  });

  it('pans the editable canvas by dragging the viewport without selecting a cell', () => {
    const onSelectCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onSelectCoordinate={onSelectCoordinate}
      />,
    );

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    let pointerCaptured = false;
    const hasPointerCapture = vi.fn(() => pointerCaptured);
    setPointerCapture.mockImplementation(() => {
      pointerCaptured = true;
    });
    releasePointerCapture.mockImplementation(() => {
      pointerCaptured = false;
    });
    Object.assign(viewport, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
    });

    fireEvent.pointerDown(viewport, { button: 0, clientX: 100, clientY: 100, pointerId: 7 });
    fireEvent.pointerMove(viewport, { clientX: 130, clientY: 112, pointerId: 7 });

    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(viewport).toHaveAttribute('data-dragging-canvas', 'true');
    expect(viewport).toHaveAttribute('data-zoom-pan', '30,12');

    fireEvent.pointerUp(viewport, { clientX: 130, clientY: 112, pointerId: 7 });
    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-0, placeable'));

    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    expect(viewport).toHaveAttribute('data-dragging-canvas', 'false');
    expect(onSelectCoordinate).not.toHaveBeenCalled();
  });

  it('does not capture ordinary cell clicks before drag movement starts', () => {
    const onSelectCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onSelectCoordinate={onSelectCoordinate}
      />,
    );

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    const hasPointerCapture = vi.fn(() => false);
    Object.assign(viewport, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
    });

    fireEvent.pointerDown(cell, { button: 0, clientX: 100, clientY: 100, pointerId: 7 });
    fireEvent.pointerUp(cell, { clientX: 100, clientY: 100, pointerId: 7 });
    fireEvent.click(cell);

    expect(setPointerCapture).not.toHaveBeenCalled();
    expect(releasePointerCapture).not.toHaveBeenCalled();
    expect(onSelectCoordinate).toHaveBeenCalledWith({ x: 2, y: 3 });
  });

  it('emits a rectangle fill callback from locked left-drag without also placing a single cell', () => {
    const onFillRectangle = vi.fn();
    const onSelectCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        rectangleFillEnabled
        onFillRectangle={onFillRectangle}
        onSelectCoordinate={onSelectCoordinate}
      />,
    );

    const startCell = getRenderedCell('2,2');
    const endCell = getRenderedCell('4,3');
    fireEvent.pointerDown(startCell, { button: 0, clientX: 10, clientY: 10, pointerId: 11 });
    fireEvent.pointerMove(endCell, { button: 0, clientX: 40, clientY: 30, pointerId: 11 });

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-rectangle-gesture', 'rectangle-fill');
    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-rectangle-range', '2,2:4,3');
    expect(getRenderedCell('2,2')).toHaveAttribute('data-rectangle-preview', 'rectangle-fill');
    expect(getRenderedCell('4,3')).toHaveAttribute('data-rectangle-preview', 'rectangle-fill');

    fireEvent.pointerUp(endCell, { button: 0, clientX: 40, clientY: 30, pointerId: 11 });
    fireEvent.click(startCell);

    expect(onFillRectangle).toHaveBeenCalledWith({ x: 2, y: 2 }, { x: 4, y: 3 });
    expect(onSelectCoordinate).not.toHaveBeenCalled();
    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-rectangle-gesture', 'idle');
  });

  it('emits a rectangle clear callback from right-drag without also running single-cell delete', () => {
    const onClearRectangle = vi.fn();
    const onDeleteCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onClearRectangle={onClearRectangle}
        onDeleteCoordinate={onDeleteCoordinate}
      />,
    );

    const startCell = getRenderedCell('2,2');
    const endCell = getRenderedCell('2,4');
    fireEvent.pointerDown(startCell, { button: 2, clientX: 10, clientY: 10, pointerId: 12 });
    fireEvent.pointerMove(endCell, { button: 2, clientX: 20, clientY: 40, pointerId: 12 });

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-rectangle-gesture', 'rectangle-clear');
    expect(getRenderedCell('2,3')).toHaveAttribute('data-rectangle-preview', 'rectangle-clear');

    fireEvent.pointerUp(endCell, { button: 2, clientX: 20, clientY: 40, pointerId: 12 });
    fireEvent.contextMenu(startCell);

    expect(onClearRectangle).toHaveBeenCalledWith({ x: 2, y: 2 }, { x: 2, y: 4 });
    expect(onDeleteCoordinate).not.toHaveBeenCalled();
  });

  it('suppresses native contextmenu while a moved right-drag clear is active', () => {
    const onClearRectangle = vi.fn();
    const onDeleteCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onClearRectangle={onClearRectangle}
        onDeleteCoordinate={onDeleteCoordinate}
      />,
    );

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const startCell = getRenderedCell('2,2');
    fireEvent.pointerDown(startCell, { button: 2, clientX: 10, clientY: 10, pointerId: 17 });
    fireEvent.pointerMove(getRenderedCell('3,3'), { button: 2, clientX: 30, clientY: 30, pointerId: 17 });

    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    viewport.dispatchEvent(contextMenuEvent);

    expect(contextMenuEvent.defaultPrevented).toBe(true);
    expect(onDeleteCoordinate).not.toHaveBeenCalled();

    fireEvent.pointerUp(getRenderedCell('3,3'), { button: 2, clientX: 30, clientY: 30, pointerId: 17 });

    expect(onClearRectangle).toHaveBeenCalledWith({ x: 2, y: 2 }, { x: 3, y: 3 });
  });

  it('uses nearest-cell release after zoom when the rectangle drag ends off-cell', () => {
    const onClearRectangle = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onClearRectangle={onClearRectangle}
      />,
    );

    const viewport = screen.getByTestId('scene-canvas-viewport');
    mockSceneCanvasRect(0, 0, 170, 170);
    fireEvent.wheel(viewport, { deltaY: -1200, clientX: 80, clientY: 80 });
    fireEvent.pointerDown(getRenderedCell('2,2'), { button: 2, clientX: 25, clientY: 25, pointerId: 13 });
    fireEvent.pointerMove(viewport, { button: 2, clientX: 90, clientY: 90, pointerId: 13 });
    fireEvent.pointerUp(viewport, { button: 2, clientX: 999, clientY: 999, pointerId: 13 });

    expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');
    expect(onClearRectangle).toHaveBeenCalledWith({ x: 2, y: 2 }, { x: 16, y: 16 });
  });

  it('keeps left-drag on the pan path when rectangle fill is not enabled or starts off-cell', () => {
    const onFillRectangle = vi.fn();
    const onSelectCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onFillRectangle={onFillRectangle}
        onSelectCoordinate={onSelectCoordinate}
      />,
    );

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    let pointerCaptured = false;
    const hasPointerCapture = vi.fn(() => pointerCaptured);
    setPointerCapture.mockImplementation(() => {
      pointerCaptured = true;
    });
    releasePointerCapture.mockImplementation(() => {
      pointerCaptured = false;
    });
    Object.assign(viewport, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
    });

    fireEvent.pointerDown(getRenderedCell('2,2'), { button: 0, clientX: 100, clientY: 100, pointerId: 14 });
    fireEvent.pointerMove(viewport, { button: 0, clientX: 128, clientY: 116, pointerId: 14 });
    fireEvent.pointerUp(viewport, { button: 0, clientX: 128, clientY: 116, pointerId: 14 });

    expect(onFillRectangle).not.toHaveBeenCalled();
    expect(onSelectCoordinate).not.toHaveBeenCalled();
    expect(viewport).toHaveAttribute('data-rectangle-gesture', 'idle');
    expect(viewport).toHaveAttribute('data-zoom-pan', '28,16');
  });

  it('pans from a non-cell viewport start even when rectangle fill is enabled', () => {
    const onFillRectangle = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        rectangleFillEnabled
        onFillRectangle={onFillRectangle}
      />,
    );

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    let pointerCaptured = false;
    const hasPointerCapture = vi.fn(() => pointerCaptured);
    setPointerCapture.mockImplementation(() => {
      pointerCaptured = true;
    });
    releasePointerCapture.mockImplementation(() => {
      pointerCaptured = false;
    });
    Object.assign(viewport, {
      setPointerCapture,
      releasePointerCapture,
      hasPointerCapture,
    });

    fireEvent.pointerDown(viewport, { button: 0, clientX: 100, clientY: 100, pointerId: 18 });
    fireEvent.pointerMove(viewport, { button: 0, clientX: 122, clientY: 110, pointerId: 18 });
    fireEvent.pointerUp(viewport, { button: 0, clientX: 122, clientY: 110, pointerId: 18 });

    expect(onFillRectangle).not.toHaveBeenCalled();
    expect(viewport).toHaveAttribute('data-rectangle-gesture', 'idle');
    expect(viewport).toHaveAttribute('data-rectangle-range', '');
    expect(viewport).toHaveAttribute('data-zoom-pan', '22,10');
  });

  it('does not enter rectangle edit state in read-only usage', () => {
    const onClearRectangle = vi.fn();
    const onFillRectangle = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly
        rectangleFillEnabled
        onClearRectangle={onClearRectangle}
        onFillRectangle={onFillRectangle}
      />,
    );

    fireEvent.pointerDown(getRenderedCell('2,2'), { button: 2, clientX: 10, clientY: 10, pointerId: 15 });
    fireEvent.pointerMove(getRenderedCell('4,4'), { button: 2, clientX: 40, clientY: 40, pointerId: 15 });
    fireEvent.pointerUp(getRenderedCell('4,4'), { button: 2, clientX: 40, clientY: 40, pointerId: 15 });

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-rectangle-gesture', 'idle');
    expect(onClearRectangle).not.toHaveBeenCalled();
    expect(onFillRectangle).not.toHaveBeenCalled();
  });

  it('clears rectangle preview without committing when the pointer gesture is canceled', () => {
    const onFillRectangle = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        rectangleFillEnabled
        onFillRectangle={onFillRectangle}
      />,
    );

    fireEvent.pointerDown(getRenderedCell('2,2'), { button: 0, clientX: 10, clientY: 10, pointerId: 16 });
    fireEvent.pointerMove(getRenderedCell('4,4'), { button: 0, clientX: 40, clientY: 40, pointerId: 16 });

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-rectangle-gesture', 'rectangle-fill');

    fireEvent.pointerCancel(getRenderedCell('4,4'), { button: 0, clientX: 40, clientY: 40, pointerId: 16 });

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-rectangle-gesture', 'idle');
    expect(onFillRectangle).not.toHaveBeenCalled();
  });

  it('keeps hover and focus callbacks on raw grid coordinates after zoom', () => {
    const onFocusCoordinate = vi.fn();
    const onHoverCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onFocusCoordinate={onFocusCoordinate}
        onHoverCoordinate={onHoverCoordinate}
      />,
    );

    fireEvent.wheel(screen.getByTestId('scene-canvas-viewport'), { deltaY: -1200 });

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    fireEvent.mouseEnter(cell);
    fireEvent.focus(cell);
    fireEvent.mouseLeave(cell);
    fireEvent.blur(cell);

    expect(onHoverCoordinate).toHaveBeenNthCalledWith(1, { x: 2, y: 3 });
    expect(onHoverCoordinate).toHaveBeenNthCalledWith(2, null);
    expect(onFocusCoordinate).toHaveBeenNthCalledWith(1, { x: 2, y: 3 });
    expect(onFocusCoordinate).toHaveBeenNthCalledWith(2, null);
  });

  it('does not consume wheel events when the zoom clamp cannot change', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const zoomOutAtMinEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 1200 });
    const minPreventDefaultSpy = vi.spyOn(zoomOutAtMinEvent, 'preventDefault');

    fireEvent(viewport, zoomOutAtMinEvent);

    expect(minPreventDefaultSpy).not.toHaveBeenCalled();
    expect(viewport).toHaveAttribute('data-zoom-scale', '1');

    fireEvent.wheel(viewport, { deltaY: -1200 });
    expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');

    const zoomInAtMaxEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -1200 });
    const maxPreventDefaultSpy = vi.spyOn(zoomInAtMaxEvent, 'preventDefault');

    fireEvent(viewport, zoomInAtMaxEvent);

    expect(maxPreventDefaultSpy).not.toHaveBeenCalled();
    expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');
  });

  it('keeps extreme wheel deltas clamped to max zoom instead of resetting to min', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const viewport = screen.getByTestId('scene-canvas-viewport');
    fireEvent.wheel(viewport, { deltaY: -Number.MAX_VALUE });

    expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');
  });

  it('computes zoom origin from the wheel focus and resets it when canvas dimensions change', () => {
    const { rerender } = render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const viewport = screen.getByTestId('scene-canvas-viewport');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      x: 10,
      y: 20,
      left: 10,
      top: 20,
      right: 210,
      bottom: 120,
      width: 200,
      height: 100,
      toJSON: () => undefined,
    } as DOMRect);

    fireEvent.wheel(viewport, { deltaY: -120, clientX: 60, clientY: 45 });
    expect(viewport).toHaveAttribute('data-zoom-origin', '25,25');

    const rectangularScene = createSceneWithCanvasSize({ width: 6, height: 17 });
    rerender(<SceneCanvas {...createSceneCanvasProps(rectangularScene)} readOnly={false} />);

    expect(screen.getByTestId('scene-canvas-viewport')).toHaveAttribute('data-zoom-origin', '50,50');
  });

  it('does not apply zoom handlers to read-only canvases', () => {
    render(<SceneCanvas {...defaultProps} readOnly />);

    const viewport = screen.getByTestId('scene-canvas-viewport');
    const readOnlyWheelEvent = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -1200 });
    const preventDefaultSpy = vi.spyOn(readOnlyWheelEvent, 'preventDefault');

    fireEvent(viewport, readOnlyWheelEvent);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
    expect(viewport).toHaveAttribute('data-zoom-scale', '1');
  });

  it('maps guarded Safari gesture events to the same zoom clamp', () => {
    const mutableWindow = window as unknown as { ongesturechange?: unknown };
    const hadGestureChange = Object.prototype.hasOwnProperty.call(window, 'ongesturechange');
    const originalGestureChange = mutableWindow.ongesturechange;

    Object.defineProperty(window, 'ongesturechange', {
      configurable: true,
      value: null,
    });

    try {
      render(<SceneCanvas {...defaultProps} readOnly={false} />);

      const viewport = screen.getByTestId('scene-canvas-viewport');
      const zoomInStart = createGestureEvent('gesturestart', { scale: 1 });
      const zoomInChange = createGestureEvent('gesturechange', { scale: 5 });

      expect(fireEvent(viewport, zoomInStart)).toBe(false);
      expect(fireEvent(viewport, zoomInChange)).toBe(false);
      expect(zoomInStart.defaultPrevented).toBe(true);
      expect(zoomInChange.defaultPrevented).toBe(true);
      expect(viewport).toHaveAttribute('data-zoom-scale', '2.8333');

      fireEvent(viewport, createGestureEvent('gesturestart', { scale: 1 }));
      fireEvent(viewport, createGestureEvent('gesturechange', { scale: 0.1 }));

      expect(viewport).toHaveAttribute('data-zoom-scale', '1');
    } finally {
      if (hadGestureChange) {
        Object.defineProperty(window, 'ongesturechange', {
          configurable: true,
          value: originalGestureChange,
        });
      } else {
        delete mutableWindow.ongesturechange;
      }
    }
  });

  it('does not register Safari gesture handlers when feature detection is absent', () => {
    const mutableWindow = window as unknown as { ongesturechange?: unknown };
    const hadGestureChange = Object.prototype.hasOwnProperty.call(window, 'ongesturechange');
    const originalGestureChange = mutableWindow.ongesturechange;

    delete mutableWindow.ongesturechange;

    try {
      render(<SceneCanvas {...defaultProps} readOnly={false} />);

      const viewport = screen.getByTestId('scene-canvas-viewport');
      const unsupportedGesture = createGestureEvent('gesturechange', { scale: 5 });

      fireEvent(viewport, unsupportedGesture);

      expect(unsupportedGesture.defaultPrevented).toBe(false);
      expect(viewport).toHaveAttribute('data-zoom-scale', '1');
    } finally {
      if (hadGestureChange) {
        Object.defineProperty(window, 'ongesturechange', {
          configurable: true,
          value: originalGestureChange,
        });
      }
    }
  });

  it('emits plain grid coordinates at the UI boundary', () => {
    const onSelectCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onSelectCoordinate={onSelectCoordinate}
      />,
    );

    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-0, placeable'));

    expect(onSelectCoordinate).toHaveBeenCalledWith({ x: 2, y: 3 });
    expect(onSelectCoordinate.mock.calls[0][0]).not.toHaveProperty('id');
    expect(onSelectCoordinate.mock.calls[0][0]).not.toHaveProperty('areaType');
  });

  it('uses right-click as an editable delete shortcut without selecting or placing', () => {
    const onDeleteCoordinate = vi.fn();
    const onSelectCoordinate = vi.fn();
    const onViewCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onDeleteCoordinate={onDeleteCoordinate}
        onSelectCoordinate={onSelectCoordinate}
        onViewCoordinate={onViewCoordinate}
      />,
    );

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    cell.dispatchEvent(contextMenuEvent);

    expect(contextMenuEvent.defaultPrevented).toBe(true);
    expect(onDeleteCoordinate).toHaveBeenCalledWith({ x: 2, y: 3 });
    expect(onDeleteCoordinate.mock.calls[0][0]).not.toHaveProperty('id');
    expect(onDeleteCoordinate.mock.calls[0][0]).not.toHaveProperty('areaType');
    expect(onSelectCoordinate).not.toHaveBeenCalled();
    expect(onViewCoordinate).not.toHaveBeenCalled();
  });

  it('allows pointer view selection but blocks all read-only application keyboard paths', () => {
    const onSelectCoordinate = vi.fn();
    const onViewCoordinate = vi.fn();
    const onDeleteCoordinate = vi.fn();
    const onFocusCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly
        onSelectCoordinate={onSelectCoordinate}
        onViewCoordinate={onViewCoordinate}
        onDeleteCoordinate={onDeleteCoordinate}
        onFocusCoordinate={onFocusCoordinate}
      />,
    );

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, read-only');
    const grid = screen.getByTestId('scene-canvas');
    fireEvent.pointerDown(cell);
    fireEvent.click(cell);
    expect(onSelectCoordinate).not.toHaveBeenCalled();
    expect(onViewCoordinate).toHaveBeenCalledTimes(1);
    expect(onViewCoordinate).toHaveBeenNthCalledWith(1, { x: 2, y: 3 });

    const contextMenuEvent = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    cell.dispatchEvent(contextMenuEvent);
    expect(contextMenuEvent.defaultPrevented).toBe(false);
    expect(onDeleteCoordinate).not.toHaveBeenCalled();

    onViewCoordinate.mockClear();
    fireEvent.focus(cell);
    for (const keyEvent of [
      { key: 'ArrowUp' },
      { key: 'ArrowDown' },
      { key: 'ArrowLeft' },
      { key: 'ArrowRight' },
      { key: 'Enter' },
      { key: ' ' },
      { key: 'Escape' },
      { key: 'Delete' },
      { key: 'Backspace' },
      { key: 's', metaKey: true },
      { key: 's', ctrlKey: true },
    ]) {
      fireEvent.keyDown(cell, keyEvent);
    }

    expect(onSelectCoordinate).not.toHaveBeenCalled();
    expect(onViewCoordinate).not.toHaveBeenCalled();
    expect(onFocusCoordinate).not.toHaveBeenCalled();
    expect(grid).not.toHaveAttribute('data-keyboard-coordinate');
  });

  it('moves the placement target before confirming with Enter', () => {
    const onSelectCoordinate = vi.fn();
    const onFocusCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        placementMode
        readOnly={false}
        onSelectCoordinate={onSelectCoordinate}
        onFocusCoordinate={onFocusCoordinate}
      />,
    );

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    fireEvent.wheel(screen.getByTestId('scene-canvas-viewport'), { deltaY: -1200 });
    fireEvent.keyDown(cell, { key: 'ArrowRight' });
    fireEvent.keyDown(cell, { key: 'Enter' });

    expect(onFocusCoordinate).toHaveBeenCalledWith({ x: 3, y: 3 });
    expect(onSelectCoordinate).toHaveBeenCalledTimes(1);
    expect(onSelectCoordinate).toHaveBeenCalledWith({ x: 3, y: 3 });
  });

  it('keeps focus target separate from hover target', () => {
    const onFocusCoordinate = vi.fn();
    const onHoverCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly={false}
        onFocusCoordinate={onFocusCoordinate}
        onHoverCoordinate={onHoverCoordinate}
      />,
    );

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    fireEvent.focus(cell);
    fireEvent.mouseLeave(cell);
    fireEvent.blur(cell);

    expect(onFocusCoordinate).toHaveBeenNthCalledWith(1, { x: 2, y: 3 });
    expect(onFocusCoordinate).toHaveBeenNthCalledWith(2, null);
    expect(onHoverCoordinate).toHaveBeenCalledWith(null);
  });

  it('renders placed asset thumbnails and skill markers on canvas cells', () => {
    const sceneWithTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-1',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          requiresSkill: true,
          skillType: '树叶',
        }),
      ],
    };
    render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(sceneWithTile)}
        readOnly={false}
      />,
    );

    const cell = screen.getByLabelText(
      'Cell 2,3, main area, level-0, placeable, 大叶子的植栽, Skill marker 大叶子的植栽 树',
    );
    expect(cell).toHaveAttribute('data-has-instance', 'true');
    expect(cell).toHaveAttribute('data-requires-skill', 'true');
    expect(cell).toHaveAttribute('data-skill-marker-label', '树');
    expect(cell.querySelector('.cell-asset-label')).toBeNull();
    expect(cell.querySelector('.cell-asset-token img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/item_portraits/0345-leafy-plant.png'),
    );
    const skillMarker = screen.getByLabelText('Skill marker 大叶子的植栽 树');
    expect(skillMarker).toHaveAttribute('data-tooltip', '树叶');
    expect(skillMarker).not.toHaveTextContent('树');
    expect(skillMarker.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/item_portraits/0050-leaf.png'),
    );
  });

  it('renders standalone skill markers on empty canvas cells', () => {
    const sceneWithSkillMarker = {
      ...scene,
      skillMarkers: [
        createSkillMarker({
          coordinate: { x: 3, y: 3 },
          buildingLevelId: 'level-0',
          skillType: '耕地',
        }),
      ],
    };
    render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(sceneWithSkillMarker)}
        readOnly={false}
      />,
    );

    const cell = screen.getByLabelText('Cell 3,3, main area, level-0, placeable, Skill marker 耕');
    expect(cell).toHaveAttribute('data-has-instance', 'false');
    expect(cell).toHaveAttribute('data-requires-skill', 'true');
    expect(cell).toHaveAttribute('data-skill-marker-label', '耕');
    const skillMarker = screen.getByLabelText('Skill marker 耕');
    expect(skillMarker).toHaveAttribute('data-tooltip', '耕地');
    expect(skillMarker.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/ability_icons/rototiller.png'),
    );
  });

  it('shows other visible layer context without marking the current layer as occupied', () => {
    const sceneWithCrossLayerTile = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-other-layer',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-1',
        }),
      ],
    };
    render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(sceneWithCrossLayerTile, 'level-0')}
        readOnly={false}
      />,
    );

    const cell = screen.getByLabelText(
      'Cell 2,3, main area, level-0, placeable, 1 item on other visible layers',
    );
    expect(cell).toHaveAttribute('data-has-instance', 'false');
    expect(cell).toHaveAttribute('data-instance-count', '0');
    expect(cell).toHaveAttribute('data-other-layer-instance-count', '1');
    expect(cell).not.toHaveTextContent('+1');
    expect(document.querySelector('.cell-other-layer-count')).toBeNull();
  });

  it('does not render lower-layer ghosts on the ground layer', () => {
    const layeredScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-upper-layer',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-1',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        scene={layeredScene}
        cells={getCanvasCellContexts(layeredScene, 'level-0')}
        lowerLayerGhostEnabled
        readOnly={false}
      />,
    );

    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-lower-layer-ghost-count', '0');
    expect(document.querySelector('[data-lower-layer-ghost="true"]')).toBeNull();
  });

  it('renders the direct lower layer as non-interactive footprint ghosts with rotation and dye', () => {
    const layeredScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-1' },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-lower-bench',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          requiresSkill: true,
          skillType: '树叶',
          rotationDegrees: 90,
          dyeColor: '#56ccf2',
        }),
      ],
    };
    const benchInstance = getOccupancyInstance(layeredScene, 'tile-lower-bench');

    render(
      <SceneCanvas
        {...defaultProps}
        scene={layeredScene}
        cells={getCanvasCellContexts(layeredScene, 'level-1')}
        lowerLayerGhostEnabled
        readOnly={false}
      />,
    );

    const ghost = screen.getByTestId('lower-layer-ghost-tile-lower-bench');

    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-lower-layer-ghost-count', '1');
    expect(ghost.closest('.scene-lower-layer-ghost-layer')).toHaveAttribute('aria-hidden', 'true');
    expect(ghost).toHaveAttribute('data-instance-id', 'tile-lower-bench');
    expect(ghost).toHaveAttribute('data-building-level-id', 'level-0');
    expect(ghost).toHaveAttribute('data-anchor-coordinate', '2,3');
    expect(ghost).toHaveAttribute('data-effective-footprint', formatFootprint(benchInstance.effectiveFootprint));
    expect(ghost).toHaveAttribute('data-rotation', '90');
    expect(ghost).toHaveAttribute('data-dye-color', '#56ccf2');
    expect(ghost).toHaveStyle({
      gridColumn: '3 / span 2',
      gridRow: '4 / span 1',
    });
    expect(ghost).toHaveStyle({ '--lower-layer-ghost-rotation': '90deg' });
    expect(ghost.querySelectorAll('img')).toHaveLength(1);
    expect(ghost.querySelector('.scene-lower-layer-ghost__rotation')).toHaveAttribute(
      'data-rotation-marker',
      '90',
    );
    const dyeMarker = ghost.querySelector<HTMLElement>('.scene-lower-layer-ghost__dye');
    expect(dyeMarker).toHaveAttribute('data-dye-marker', '#56ccf2');
    expect(dyeMarker?.style.backgroundColor).toBe('rgb(86, 204, 242)');
    expect(ghost.querySelector('.cell-skill-marker')).toBeNull();
    expect(ghost.querySelector('button')).toBeNull();
  });

  it('does not render lower-layer ghosts in read-only canvas usage', () => {
    const layeredScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-1' },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-readonly-lower',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        scene={layeredScene}
        cells={getCanvasCellContexts(layeredScene, 'level-1')}
        lowerLayerGhostEnabled
        readOnly
      />,
    );

    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-lower-layer-ghost-count', '0');
    expect(screen.queryByTestId('lower-layer-ghost-tile-readonly-lower')).not.toBeInTheDocument();
  });

  it('renders only the direct lower layer when editing above multiple layers', () => {
    const layeredScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-2' },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-lowest-bench',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-direct-lower-plant',
          assetId: 'leafy-plant',
          coordinate: { x: 4, y: 4 },
          buildingLevelId: 'level-1',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        scene={layeredScene}
        cells={getCanvasCellContexts(layeredScene, 'level-2')}
        lowerLayerGhostEnabled
        readOnly={false}
      />,
    );

    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-lower-layer-ghost-count', '1');
    expect(screen.getByTestId('lower-layer-ghost-tile-direct-lower-plant')).toHaveAttribute(
      'data-building-level-id',
      'level-1',
    );
    expect(screen.queryByTestId('lower-layer-ghost-tile-lowest-bench')).not.toBeInTheDocument();
  });

  it('ignores same-number building level peers when deriving malformed direct lower context', () => {
    const layeredScene = {
      ...scene,
      buildingLevels: [
        createBuildingLevel(0),
        { ...createBuildingLevel(1), id: 'level-peer', name: 'Peer layer' },
        createBuildingLevel(1),
      ],
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-1' },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-same-number-peer',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-peer',
        }),
        createTileInstance({
          instanceId: 'tile-strict-lower',
          assetId: 'leafy-plant',
          coordinate: { x: 4, y: 4 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        scene={layeredScene}
        cells={getCanvasCellContexts(layeredScene, 'level-1')}
        lowerLayerGhostEnabled
        readOnly={false}
      />,
    );

    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-lower-layer-ghost-count', '1');
    expect(screen.getByTestId('lower-layer-ghost-tile-strict-lower')).toHaveAttribute(
      'data-building-level-id',
      'level-0',
    );
    expect(screen.queryByTestId('lower-layer-ghost-tile-same-number-peer')).not.toBeInTheDocument();
  });

  it('keeps ghost-covered cells on the current layer interaction path', () => {
    const onSelectCoordinate = vi.fn();
    const layeredScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-1' },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-lower-plant',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        scene={layeredScene}
        cells={getCanvasCellContexts(layeredScene, 'level-1')}
        lowerLayerGhostEnabled
        readOnly={false}
        onSelectCoordinate={onSelectCoordinate}
      />,
    );

    fireEvent.click(getRenderedCell('2,3'));

    expect(screen.getByTestId('lower-layer-ghost-tile-lower-plant')).toHaveAttribute(
      'data-building-level-id',
      'level-0',
    );
    expect(onSelectCoordinate).toHaveBeenCalledWith({ x: 2, y: 3 });
  });

  it('does not expose same-layer duplicate instances as stack UI', () => {
    const sceneWithDuplicateTiles = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-1',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-2',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          rotationDegrees: 90,
          dyeColor: '#56ccf2',
          requiresSkill: true,
          skillType: '耕地',
        }),
        createTileInstance({
          instanceId: 'tile-unknown',
          assetId: 'missing-asset',
          coordinate: { x: 4, y: 4 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(sceneWithDuplicateTiles)}
        readOnly={false}
      />,
    );

    const duplicateCell = screen.getByLabelText(
      'Cell 2,3, main area, level-0, placeable, 屋顶装饰, rotated 90, dyed #56ccf2, Skill marker 屋顶装饰 耕',
    );
    expect(duplicateCell).toHaveAttribute('data-instance-count', '1');
    expect(duplicateCell).toHaveAttribute('data-skill-marker-label', '耕');
    expect(duplicateCell).toHaveAttribute('data-rotation', '90');
    expect(duplicateCell).toHaveAttribute('data-dye-color', '#56ccf2');
    expect(duplicateCell.querySelector('.cell-asset-label')).toBeNull();
    expect(duplicateCell).not.toHaveTextContent('2x');
    expect(document.querySelector('.cell-stack-count')).toBeNull();
    const rotationMarker = duplicateCell.querySelector('.cell-rotation-marker');
    expect(rotationMarker).toHaveAttribute('aria-label', '旋转 90 度');
    expect(rotationMarker).toHaveAttribute('data-tooltip', '旋转 90 度');
    expect(rotationMarker?.querySelector('svg')).toBeInTheDocument();
    expect(screen.queryByLabelText('高度 +1')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Dye #56ccf2')).toBeVisible();
    const skillMarker = screen.getByLabelText('Skill marker 屋顶装饰 耕');
    expect(skillMarker).toHaveAttribute('data-tooltip', '耕地');
    expect(skillMarker.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/ability_icons/rototiller.png'),
    );

    expect(screen.getByLabelText('Cell 4,4, main area, level-0, placeable, Unknown asset: missing-asset')).toBeVisible();
  });

  it('renders a height marker to the left of the rotation marker for tall assets', () => {
    const sceneWithTallAsset = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-office-locker',
          assetId: 'office-locker',
          coordinate: { x: 3, y: 3 },
          buildingLevelId: 'level-0',
          rotationDegrees: 270,
        }),
      ],
    };
    render(
      <SceneCanvas
        {...defaultProps}
        scene={sceneWithTallAsset}
        cells={getCanvasCellContexts(sceneWithTallAsset)}
        readOnly={false}
      />,
    );

    const tallCell = screen.getByLabelText(
      'Cell 3,3, main area, level-0, placeable, 办公室储物柜, rotated 270',
    );
    const heightMarker = screen.getByLabelText('高度 +1');
    const rotationMarker = screen.getByLabelText('旋转 270 度');

    expect(tallCell).toHaveAttribute('data-footprint-height', '2');
    expect(heightMarker).toHaveClass('cell-height-marker');
    expect(heightMarker).toHaveTextContent('+1');
    expect(rotationMarker).toHaveClass('cell-rotation-marker--with-height');
  });

  it('does not surface skill markers from ignored duplicate same-layer instances', () => {
    const sceneWithDuplicateSkill = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-skill-bottom',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          requiresSkill: true,
          skillType: '树叶',
        }),
        createTileInstance({
          instanceId: 'tile-plain-top',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          requiresSkill: false,
        }),
      ],
    };
    render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(sceneWithDuplicateSkill)}
        readOnly={false}
      />,
    );

    const cell = screen.getByLabelText(
      'Cell 2,3, main area, level-0, placeable, 木长椅',
    );
    expect(cell.querySelector('.cell-asset-label')).toBeNull();
    expect(screen.queryByLabelText('Skill marker 大叶子的植栽 树')).not.toBeInTheDocument();
    expect(cell).toHaveAttribute('data-instance-count', '1');
  });

  it('renders legal stacking relations as base and top half-cell regions', () => {
    const stackingScene = createStackingPlateFoodScene();
    const stacking = getStackingExpectation(stackingScene, stackingContractFixtureIds.food);

    render(
      <SceneCanvas
        {...defaultProps}
        scene={stackingScene}
        cells={getCanvasCellContexts(stackingScene)}
        readOnly={false}
      />,
    );

    const cell = getRenderedCell(formatCoordinate(stacking.relation.coordinates[0]));
    const split = cell.querySelector('.cell-stacking-split');

    expect(cell).toHaveAccessibleName(expect.stringContaining('stacked 苹野果 on 盘子'));
    expect(cell).toHaveAttribute('data-stacking-state', 'placed');
    expect(cell).toHaveAttribute('data-instance-count', '2');
    expect(cell).toHaveAttribute('data-stacking-base-instance-id', stacking.relation.baseInstanceId);
    expect(cell).toHaveAttribute('data-stacking-top-instance-id', stacking.relation.topInstanceId);
    expect(cell).toHaveAttribute('data-stacking-base-asset-id', stacking.relation.baseAssetId);
    expect(cell).toHaveAttribute('data-stacking-top-asset-id', stacking.relation.topAssetId);
    expect(cell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(stacking.baseInstance.effectiveFootprint));
    expect(cell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(cell).toHaveAttribute('data-stacking-base-visibility', 'visible');
    expect(cell).toHaveAttribute('data-stacking-split-axis', 'block');
    expect(cell).toHaveAttribute('data-stacking-surface-kind', stacking.relation.surfaceKind);
    expect(split).toHaveClass('cell-stacking-split--base-visible');
    expect(split?.querySelector('[data-stacking-role="top"]')).toHaveAttribute('data-asset-id', stacking.relation.topAssetId);
    expect(split?.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-asset-id', stacking.relation.baseAssetId);
    expect(split?.querySelector('[data-stacking-role="base"] img')).toHaveAttribute('src', expect.stringContaining(stacking.relation.baseAssetId));
  });

  it('hides the base half image when stacking on a multi-cell rug', () => {
    const rugStackingScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-large-square-rug',
          assetId: 'large-square-rug',
          coordinate: { x: 1, y: 3 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-tomato',
          assetId: 'tomato',
          coordinate: { x: 1, y: 3 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const stacking = getStackingExpectation(rugStackingScene, 'tile-tomato');

    render(
      <SceneCanvas
        {...defaultProps}
        scene={rugStackingScene}
        cells={getCanvasCellContexts(rugStackingScene)}
        readOnly={false}
      />,
    );

    const cell = getRenderedCell(formatCoordinate(stacking.relation.coordinates[0]));
    const split = cell.querySelector('.cell-stacking-split');
    const topSlot = split?.querySelector('[data-stacking-role="top"]');
    const baseSlot = split?.querySelector('[data-stacking-role="base"]');

    expect(cell).toHaveAccessibleName(expect.stringContaining('stacked 番茄 on 方形大地垫'));
    expect(cell).toHaveAttribute('data-stacking-state', 'placed');
    expect(cell).toHaveAttribute('data-stacking-base-asset-id', stacking.relation.baseAssetId);
    expect(cell).toHaveAttribute('data-stacking-top-asset-id', stacking.relation.topAssetId);
    expect(cell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(stacking.baseInstance.effectiveFootprint));
    expect(cell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(cell).toHaveAttribute('data-stacking-base-visibility', 'hidden');
    expect(cell).toHaveAttribute('data-stacking-split-axis', 'block');
    expect(split).toHaveClass('cell-stacking-split--base-hidden');
    expect(topSlot).toHaveAttribute('data-asset-id', stacking.relation.topAssetId);
    expect(topSlot?.querySelector('img')).toHaveAttribute('src', expect.stringContaining(stacking.relation.topAssetId));
    expect(baseSlot).toHaveAttribute('data-asset-id', stacking.relation.baseAssetId);
    expect(baseSlot).toHaveAttribute('data-base-image-visible', 'false');
    expect(baseSlot?.querySelector('img')).toBeNull();
  });

  it('keeps a visible multi-cell base on its footprint overlay instead of duplicating it in the split cell', () => {
    const rugOnRugScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-large-narrow-rug',
          assetId: 'large-narrow-rug',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-oblong-rug',
          assetId: 'oblong-rug',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const stacking = getStackingExpectation(rugOnRugScene, 'tile-oblong-rug');

    render(
      <SceneCanvas
        {...defaultProps}
        scene={rugOnRugScene}
        cells={getCanvasCellContexts(rugOnRugScene)}
        readOnly={false}
      />,
    );

    const cell = getRenderedCell(formatCoordinate(stacking.relation.coordinates[0]));
    const split = cell.querySelector('.cell-stacking-split');
    const topSlot = split?.querySelector('[data-stacking-role="top"]');
    const baseSlot = split?.querySelector('[data-stacking-role="base"]');
    const baseOverlay = screen.getByTestId(`scene-footprint-overlay-${stacking.relation.baseInstanceId}`);
    const topOverlay = screen.getByTestId(`scene-footprint-overlay-${stacking.relation.topInstanceId}`);

    expect(cell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(stacking.baseInstance.effectiveFootprint));
    expect(cell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(cell).toHaveAttribute('data-stacking-base-visibility', 'visible');
    expect(cell).toHaveAttribute('data-stacking-base-render', 'overlay');
    expect(cell).toHaveAttribute('data-stacking-top-render', 'overlay');
    expect(cell).toHaveAttribute('data-stacking-split-axis', 'inline');
    expect(split).toHaveClass('cell-stacking-split--inline');
    expect(split).toHaveClass('cell-stacking-split--base-hidden');
    expect(split).toHaveAttribute('data-stacking-base-visibility', 'visible');
    expect(split).toHaveAttribute('data-stacking-base-render', 'overlay');
    expect(topSlot).toHaveAttribute('data-top-image-visible', 'false');
    expect(topSlot?.querySelector('img')).toBeNull();
    expect(baseSlot).toHaveAttribute('data-asset-id', stacking.relation.baseAssetId);
    expect(baseSlot).toHaveAttribute('data-base-image-visible', 'false');
    expect(baseSlot?.querySelector('img')).toBeNull();
    expect(baseOverlay.querySelector('img')).toHaveAttribute('src', expect.stringContaining(stacking.relation.baseAssetId));
    expect(topOverlay.querySelector('img')).toHaveAttribute('src', expect.stringContaining(stacking.relation.topAssetId));
  });

  it('renders partial stacking only on the overlapped cell for multi-cell top items', () => {
    const partialStackingScene = createStackingPartialSurfaceScene();
    const stacking = getStackingExpectation(partialStackingScene, stackingContractFixtureIds.partialTop);
    const nonOverlappedTopCoordinate = stacking.topInstance.occupiedCells.find(
      (coordinate) => !stacking.relation.coordinates.some((relationCoordinate) => coordinatesEqual(coordinate, relationCoordinate)),
    );

    if (!nonOverlappedTopCoordinate) {
      throw new Error('Expected a non-overlapped top footprint coordinate.');
    }

    render(
      <SceneCanvas
        {...defaultProps}
        scene={partialStackingScene}
        cells={getCanvasCellContexts(partialStackingScene)}
        readOnly={false}
      />,
    );

    const stackedCell = getRenderedCell(formatCoordinate(stacking.relation.coordinates[0]));
    const emptyFootprintCell = getRenderedCell(formatCoordinate(nonOverlappedTopCoordinate));
    const stackedSplit = stackedCell.querySelector('.cell-stacking-split');
    const topSlot = stackedSplit?.querySelector('[data-stacking-role="top"]');
    const baseSlot = stackedSplit?.querySelector('[data-stacking-role="base"]');
    const baseOverlay = screen.getByTestId(`scene-footprint-overlay-${stacking.relation.baseInstanceId}`);
    const topOverlay = screen.getByTestId(`scene-footprint-overlay-${stacking.relation.topInstanceId}`);

    expect(stackedCell).toHaveAttribute('data-stacking-state', 'placed');
    expect(stackedCell).toHaveAttribute('data-stacking-base-instance-id', stacking.relation.baseInstanceId);
    expect(stackedCell).toHaveAttribute('data-stacking-top-instance-id', stacking.relation.topInstanceId);
    expect(stackedCell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(stacking.baseInstance.effectiveFootprint));
    expect(stackedCell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(stackedCell).toHaveAttribute('data-stacking-base-visibility', 'visible');
    expect(stackedCell).toHaveAttribute('data-stacking-base-render', 'overlay');
    expect(stackedCell).toHaveAttribute('data-stacking-top-render', 'overlay');
    expect(stackedSplit).toHaveClass('cell-stacking-split--base-hidden');
    expect(topSlot).toHaveAttribute('data-asset-id', stacking.relation.topAssetId);
    expect(topSlot).toHaveAttribute('data-top-image-visible', 'false');
    expect(topSlot?.querySelector('img')).toBeNull();
    expect(baseSlot).toHaveAttribute('data-asset-id', stacking.relation.baseAssetId);
    expect(baseSlot).toHaveAttribute('data-base-image-visible', 'false');
    expect(baseSlot?.querySelector('img')).toBeNull();
    expect(baseOverlay.querySelector('img')).toHaveAttribute('src', expect.stringContaining(stacking.relation.baseAssetId));
    expect(topOverlay).toHaveAttribute('data-stacking-role', 'top');
    expect(topOverlay).toHaveAttribute('data-stacking-top-instance-id', stacking.relation.topInstanceId);
    expect(topOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(topOverlay).toHaveAttribute('data-stacking-top-crop-axis', 'block');
    expect(topOverlay.querySelectorAll('img')).toHaveLength(1);
    expect(emptyFootprintCell).toHaveAttribute('data-stacking-state', 'none');
    expect(emptyFootprintCell).toHaveAttribute('data-footprint-instance-id', stacking.relation.topInstanceId);
    expect(emptyFootprintCell.querySelector('.cell-stacking-split')).toBeNull();
  });

  it('renders a 1x2 top stacked item once as a left-half footprint overlay', () => {
    const partialRugStackingScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-large-round-rug',
          assetId: 'large-round-rug',
          coordinate: { x: 2, y: 4 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-big-storage-box',
          assetId: 'big-storage-box',
          coordinate: { x: 2, y: 5 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const stacking = getStackingExpectation(partialRugStackingScene, 'tile-big-storage-box');
    const nonOverlappedTopCoordinate = stacking.topInstance.occupiedCells.find(
      (coordinate) => !stacking.relation.coordinates.some((relationCoordinate) => coordinatesEqual(coordinate, relationCoordinate)),
    );

    if (!nonOverlappedTopCoordinate) {
      throw new Error('Expected a non-overlapped top footprint coordinate.');
    }

    render(
      <SceneCanvas
        {...defaultProps}
        scene={partialRugStackingScene}
        cells={getCanvasCellContexts(partialRugStackingScene)}
        readOnly={false}
      />,
    );

    const stackedCell = getRenderedCell(formatCoordinate(stacking.relation.coordinates[0]));
    const nonOverlappedTopCell = getRenderedCell(formatCoordinate(nonOverlappedTopCoordinate));
    const stackedSplit = stackedCell.querySelector('.cell-stacking-split');
    const topSlot = stackedSplit?.querySelector('[data-stacking-role="top"]');
    const baseSlot = stackedSplit?.querySelector('[data-stacking-role="base"]');
    const topOverlay = screen.getByTestId(`scene-footprint-overlay-${stacking.relation.topInstanceId}`);

    expect(stackedCell).toHaveAccessibleName(expect.stringContaining('stacked 大收纳箱 on 圆形大地垫'));
    expect(stackedCell).toHaveAttribute('data-stacking-state', 'placed');
    expect(stackedCell).toHaveAttribute('data-stacking-base-asset-id', stacking.relation.baseAssetId);
    expect(stackedCell).toHaveAttribute('data-stacking-top-asset-id', stacking.relation.topAssetId);
    expect(stackedCell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(stacking.baseInstance.effectiveFootprint));
    expect(stackedCell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(stackedCell).toHaveAttribute('data-stacking-base-visibility', 'hidden');
    expect(stackedCell).toHaveAttribute('data-stacking-top-render', 'overlay');
    expect(topSlot).toHaveAttribute('data-asset-id', stacking.relation.topAssetId);
    expect(topSlot).toHaveAttribute('data-top-image-visible', 'false');
    expect(topSlot?.querySelector('img')).toBeNull();
    expect(baseSlot).toHaveAttribute('data-asset-id', stacking.relation.baseAssetId);
    expect(baseSlot).toHaveAttribute('data-base-image-visible', 'false');
    expect(topOverlay).toHaveClass('scene-footprint-overlay--stacking-top');
    expect(topOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(topOverlay).toHaveAttribute('data-stacking-role', 'top');
    expect(topOverlay).toHaveAttribute('data-stacking-top-crop-axis', 'inline');
    expect(topOverlay.querySelectorAll('img')).toHaveLength(1);
    expect(document.querySelectorAll('img[src*="big-storage-box"]')).toHaveLength(1);
    expect(nonOverlappedTopCell).toHaveAttribute('data-stacking-state', 'none');
    expect(nonOverlappedTopCell.querySelector('.cell-stacking-split')).toBeNull();
  });

  it('renders legal stacking placement preview with top and base halves', () => {
    const placementScene = {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
        selectedAssetId: 'leppa-berry',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-plate',
          assetId: 'plate',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const preview = getAssetPlacementPreview(placementScene, { x: 2, y: 2 }, 'edit', false);
    const stackingRelation = preview?.stackingRelations[0];

    if (!preview || !stackingRelation) {
      throw new Error('Expected legal stacking placement preview.');
    }

    render(
      <SceneCanvas
        {...defaultProps}
        scene={placementScene}
        cells={getCanvasCellContexts(placementScene)}
        targetCoordinate={{ x: 2, y: 2 }}
        targetPlacement={preview}
        readOnly={false}
      />,
    );

    const cell = getRenderedCell('2,2');
    const split = cell.querySelector('.cell-stacking-split');

    expect(cell).toHaveAccessibleName(expect.stringContaining('placement preview stacking 苹野果 on 盘子'));
    expect(cell).toHaveAttribute('data-placement-status', 'ready');
    expect(cell).toHaveAttribute('data-stacking-state', 'placement');
    expect(cell).toHaveAttribute('data-stacking-base-instance-id', stackingRelation.baseInstanceId);
    expect(cell).toHaveAttribute('data-stacking-top-instance-id', stackingRelation.topInstanceId);
    expect(split?.querySelector('[data-stacking-role="top"]')).toHaveAttribute('data-asset-id', stackingRelation.topAssetId);
    expect(split?.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-asset-id', stackingRelation.baseAssetId);
  });

  it('renders unsupported stacking placement as a shallow red conflict state', () => {
    const placementScene = {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
        selectedAssetId: 'leafy-plant',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-plate',
          assetId: 'plate',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const preview = getAssetPlacementPreview(placementScene, { x: 2, y: 2 }, 'edit', false);
    const conflict = preview?.footprintConflicts[0];

    if (!preview || !conflict) {
      throw new Error('Expected unsupported stacking placement conflict preview.');
    }

    render(
      <SceneCanvas
        {...defaultProps}
        scene={placementScene}
        cells={getCanvasCellContexts(placementScene)}
        targetCoordinate={{ x: 2, y: 2 }}
        targetPlacement={preview}
        readOnly={false}
      />,
    );

    const cell = getRenderedCell('2,2');

    expect(cell).toHaveClass('scene-cell--placement-conflict');
    expect(cell).toHaveClass('scene-cell--stacking-conflict');
    expect(cell).toHaveAccessibleName(expect.stringContaining('unsupported stacking 大叶子的植栽 on 盘子'));
    expect(cell).toHaveAttribute('data-placement-status', 'blocked');
    expect(cell).toHaveAttribute('data-placement-conflicts', 'unsupported-stack-surface');
    expect(cell).toHaveAttribute('data-stacking-state', 'conflict');
    expect(cell).toHaveAttribute('data-stacking-base-instance-id', conflict.blockingInstanceId);
    expect(cell).toHaveAttribute('data-stacking-top-asset-id', conflict.assetId);
  });

  it('renders rotation-aware footprint placement preview across all occupied cells', () => {
    const placementScene = {
      ...scene,
      workspaceState: {
        ...scene.workspaceState,
        selectedAssetId: 'wooden-bench',
      },
    };
    const preview = getAssetPlacementPreview(placementScene, { x: 2, y: 3 }, 'edit', false, 90);

    render(
      <SceneCanvas
        {...defaultProps}
        scene={placementScene}
        cells={getCanvasCellContexts(placementScene)}
        targetCoordinate={{ x: 2, y: 3 }}
        targetPlacement={preview}
        readOnly={false}
      />,
    );

    fireEvent.wheel(screen.getByTestId('scene-canvas-viewport'), { deltaY: -1200 });

    const anchor = screen.getByLabelText(/Cell 2,3, main area, level-0, placeable, placement preview anchor/);
    const occupied = screen.getByLabelText(/Cell 3,3, main area, level-0, placeable, placement preview footprint/);
    const sideCell = screen.getByLabelText('Cell 2,4, main area, level-0, placeable');
    const overlay = screen.getByTestId('placement-footprint-overlay');

    expect(preview?.effectiveFootprint).not.toBeNull();
    expect(anchor).toHaveAttribute('data-placement-preview', 'anchor');
    expect(occupied).toHaveAttribute('data-placement-preview', 'occupied');
    expect(sideCell).toHaveAttribute('data-placement-preview', 'none');
    expect(overlay).toHaveAttribute('data-effective-footprint', formatFootprint(preview?.effectiveFootprint ?? null));
    expect(overlay).toHaveAttribute('data-placement-status', 'ready');
  });

  it('renders placement preview from the current layer while lower-layer ghosts remain passive', () => {
    const placementScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      workspaceState: {
        ...scene.workspaceState,
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'wooden-bench',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-lower-plant-preview',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const preview = getAssetPlacementPreview(placementScene, { x: 2, y: 3 }, 'edit', false, 90);

    render(
      <SceneCanvas
        {...defaultProps}
        scene={placementScene}
        cells={getCanvasCellContexts(placementScene, 'level-1')}
        targetCoordinate={{ x: 2, y: 3 }}
        targetPlacement={preview}
        lowerLayerGhostEnabled
        readOnly={false}
      />,
    );

    const anchor = screen.getByLabelText(/Cell 2,3, main area, level-1, placeable, 1 item on other visible layers, placement preview anchor/);
    const occupied = screen.getByLabelText(/Cell 3,3, main area, level-1, placeable, placement preview footprint/);
    const placementOverlay = screen.getByTestId('placement-footprint-overlay');
    const ghost = screen.getByTestId('lower-layer-ghost-tile-lower-plant-preview');

    expect(anchor).toHaveAttribute('data-placement-preview', 'anchor');
    expect(anchor).toHaveAttribute('data-footprint-instance-id', '');
    expect(occupied).toHaveAttribute('data-placement-preview', 'occupied');
    expect(placementOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(preview?.effectiveFootprint ?? null));
    expect(placementOverlay).toHaveAttribute('data-placement-status', 'ready');
    expect(ghost).toHaveAttribute('data-building-level-id', 'level-0');
  });

  it('renders placed wide assets as one anchor-bound footprint overlay without duplicating occupied cells', () => {
    const sceneWithBench = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-bench',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          requiresSkill: true,
          skillType: '树叶',
          rotationDegrees: 0,
          dyeColor: '#56ccf2',
        }),
      ],
    };
    const benchInstance = getOccupancyInstance(sceneWithBench, 'tile-bench');
    const occupiedCoordinate = benchInstance.occupiedCells.find(
      (coordinate) => !coordinatesEqual(coordinate, benchInstance.instance.coordinate),
    );

    if (!occupiedCoordinate) {
      throw new Error('Expected occupied non-anchor footprint coordinate.');
    }

    render(
      <SceneCanvas
        {...defaultProps}
        scene={sceneWithBench}
        cells={getCanvasCellContexts(sceneWithBench)}
        readOnly={false}
      />,
    );

    const anchor = screen.getByLabelText(new RegExp(`Cell ${formatCoordinate(benchInstance.instance.coordinate)}, main area, level-0, placeable, 木长椅`));
    const occupied = screen.getByLabelText(new RegExp(`Cell ${formatCoordinate(occupiedCoordinate)}, main area, level-0, placeable, occupied by 木长椅 anchor ${formatCoordinate(benchInstance.instance.coordinate)}`));
    const overlay = screen.getByTestId(`scene-footprint-overlay-${benchInstance.instanceId}`);

    expect(anchor).toHaveAttribute('data-footprint-role', 'anchor');
    expect(anchor).toHaveAttribute('data-footprint-instance-id', benchInstance.instanceId);
    expect(anchor).toHaveAttribute('data-skill-marker-label', '树');
    expect(anchor).toHaveAttribute('data-dye-color', '#56ccf2');
    expect(occupied).toHaveAttribute('data-footprint-role', 'occupied');
    expect(occupied).toHaveAttribute('data-footprint-instance-id', benchInstance.instanceId);
    expect(occupied).toHaveAttribute('data-footprint-anchor-coordinate', formatCoordinate(benchInstance.instance.coordinate));
    expect(occupied).toHaveAttribute('data-has-instance', 'false');
    expect(occupied).not.toHaveTextContent('木长椅');
    expect(overlay).toHaveAttribute('data-effective-footprint', formatFootprint(benchInstance.effectiveFootprint));
    expect(overlay.querySelectorAll('img')).toHaveLength(1);
  });

  it('marks cells blocked by lower-level footprint height with blocking source details', () => {
    const stackedScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      workspaceState: { ...scene.workspaceState, currentBuildingLevelId: 'level-1' },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-boulder',
          assetId: 'strength-rock',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        scene={stackedScene}
        cells={getCanvasCellContexts(stackedScene, 'level-1')}
        readOnly={false}
      />,
    );

    const blockedAnchor = getRenderedCell('2,2');

    expect(blockedAnchor).toHaveAttribute('data-height-blocked', 'true');
    expect(blockedAnchor).toHaveAttribute('data-placeable', 'false');
    expect(blockedAnchor).toHaveAttribute('data-editable', 'false');
    expect(blockedAnchor).toHaveAccessibleName(expect.stringContaining('blocked by 怪力岩 on level-0'));
    expect(blockedAnchor).toHaveAttribute('data-blocked-by-instance-id', 'tile-boulder');
    expect(blockedAnchor).toHaveAttribute('data-blocked-by-asset-id', 'strength-rock');
    expect(blockedAnchor).toHaveAttribute('data-blocked-by-building-level-id', 'level-0');
  });

  it('renders current layer instances because hidden layer state is no longer persisted', () => {
    const sceneWithInstance = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-visible',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          requiresSkill: true,
          skillType: '树叶',
          skillNote: 'kept while hidden',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(sceneWithInstance)}
        readOnly={false}
      />,
    );

    const cell = screen.getByLabelText(
      'Cell 2,3, main area, level-0, placeable, 大叶子的植栽, Skill marker 大叶子的植栽 树',
    );
    expect(cell).toHaveAttribute('data-has-instance', 'true');
    expect(cell).toHaveAttribute('data-requires-skill', 'true');
    expect(cell.querySelector('.cell-asset-label')).toBeNull();
    expect(cell.querySelector('.cell-asset-token img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/item_portraits/0345-leafy-plant.png'),
    );
    expect(sceneWithInstance.tileInstances[0]).toMatchObject({
      requiresSkill: true,
      skillType: '树叶',
      skillNote: 'kept while hidden',
    });
  });
});

function createLegacyScene(): SceneDocument {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-legacy-canvas',
    now: '2026-05-16T07:00:00.000Z',
  });

  return {
    ...baseScene,
    sceneSize: { ...legacySceneDimensions.sceneSize },
    canvasSize: { ...legacySceneDimensions.canvasSize },
    outerPadding: legacySceneDimensions.outerPadding,
  };
}

function createSceneWithCanvasSize(canvasSize: { width: number; height: number }): SceneDocument {
  const dimensions = createSceneDimensionsForCanvasSize(canvasSize);

  return {
    ...scene,
    sceneSize: dimensions.sceneSize,
    canvasSize: dimensions.canvasSize,
    outerPadding: dimensions.outerPadding,
  };
}

function createSceneCanvasProps(inputScene: SceneDocument) {
  return {
    ...defaultProps,
    canvasSize: inputScene.canvasSize,
    cells: getCanvasCellContexts(inputScene),
  };
}

function getBoundaryCellCount(sceneSize: { width: number; height: number }): number {
  return sceneSize.width * 2 + Math.max(0, sceneSize.height - 2) * 2;
}

function getStackingExpectation(scene: SceneDocument, topInstanceId: string) {
  const occupancy = buildSceneOccupancy(scene);
  const relation = occupancy.stackingRelations.find((candidate) => candidate.topInstanceId === topInstanceId);

  if (!relation) {
    throw new Error(`Expected stacking relation for ${topInstanceId}.`);
  }

  return {
    relation,
    baseInstance: getOccupancyInstance(scene, relation.baseInstanceId),
    topInstance: getOccupancyInstance(scene, relation.topInstanceId),
  };
}

function getOccupancyInstance(scene: SceneDocument, instanceId: string) {
  const instance = buildSceneOccupancy(scene).instances.find((candidate) => candidate.instanceId === instanceId);

  if (!instance) {
    throw new Error(`Expected occupancy instance ${instanceId}.`);
  }

  return instance;
}

function createGestureEvent(
  type: 'gesturestart' | 'gesturechange',
  options: { scale: number; clientX?: number; clientY?: number },
): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });

  Object.defineProperties(event, {
    scale: { value: options.scale },
    clientX: { value: options.clientX ?? 0 },
    clientY: { value: options.clientY ?? 0 },
  });

  return event;
}

function formatFootprint(footprint: { length: number; width: number; height: number } | null): string {
  if (!footprint) {
    throw new Error('Expected footprint.');
  }

  return `${footprint.length}x${footprint.width}x${footprint.height}`;
}

function formatCoordinate(coordinate: GridCoordinate): string {
  return `${coordinate.x},${coordinate.y}`;
}

function coordinatesEqual(left: GridCoordinate, right: GridCoordinate): boolean {
  return left.x === right.x && left.y === right.y;
}

function mockSceneCanvasRect(left: number, top: number, width: number, height: number): void {
  vi.spyOn(screen.getByTestId('scene-canvas'), 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => undefined,
  } as DOMRect);
}

function getRenderedCell(coordinate: string): HTMLElement {
  const cell = screen.getAllByTestId('scene-cell').find((candidate) => candidate.dataset.coordinate === coordinate);

  if (!cell) {
    throw new Error(`Expected rendered cell ${coordinate}.`);
  }

  return cell;
}
