import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneDocument, createTileInstance, getCanvasCellContexts } from '../../domain/scene';
import { SceneCanvas } from './SceneCanvas';

const scene = createDefaultSceneDocument({
  sceneId: 'scene-test',
  now: '2026-05-16T07:00:00.000Z',
});

const defaultProps = {
  canvasSize: scene.canvasSize,
  cells: getCanvasCellContexts(scene),
  placementMode: false,
  selectedCoordinate: null,
  targetCoordinate: null,
  onSelectCoordinate: () => undefined,
  onViewCoordinate: () => undefined,
  onHoverCoordinate: () => undefined,
  onFocusCoordinate: () => undefined,
};

describe('SceneCanvas', () => {
  it('renders 49 addressable 0-based canvas cells', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const cells = screen.getAllByRole('gridcell');

    expect(cells).toHaveLength(49);
    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, placeable')).toBeVisible();
    expect(screen.getByLabelText('Cell 6,6, outer area, level-0, placeable')).toBeVisible();
    expect(screen.getByLabelText('Cell 1,1, main area, level-0, placeable')).toBeVisible();
    expect(screen.getByLabelText('Cell 5,5, main area, level-0, placeable')).toBeVisible();
  });

  it('marks main, outer, main-boundary, and placeable states for tests and styling', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    const cells = screen.getAllByTestId('scene-cell');

    expect(cells.filter((cell) => cell.dataset.area === 'main')).toHaveLength(25);
    expect(cells.filter((cell) => cell.dataset.area === 'outer')).toHaveLength(24);
    expect(cells.filter((cell) => cell.dataset.mainBoundary === 'true')).toHaveLength(16);
    expect(cells.every((cell) => cell.dataset.placeable === 'true')).toBe(true);
    expect(cells.every((cell) => cell.dataset.editable === 'true')).toBe(true);

    const coordinates = cells.map((cell) => cell.dataset.coordinate);
    const expectedCoordinates = Array.from({ length: 49 }, (_, index) => {
      const x = index % 7;
      const y = Math.floor(index / 7);
      return `${x},${y}`;
    });

    expect(new Set(coordinates).size).toBe(49);
    expect(coordinates).toEqual(expectedCoordinates);
  });

  it('separates domain placeability from current read-only editability', () => {
    render(<SceneCanvas {...defaultProps} readOnly />);

    const cells = screen.getAllByTestId('scene-cell');

    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, read-only')).toBeVisible();
    expect(cells.every((cell) => cell.dataset.placeable === 'true')).toBe(true);
    expect(cells.every((cell) => cell.dataset.editable === 'false')).toBe(true);
    expect(cells.every((cell) => !cell.hasAttribute('aria-disabled'))).toBe(true);
  });

  it('marks cells as non-editable when the current layer is hidden or locked', () => {
    const hiddenScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === scene.workspaceState.currentBuildingLevelId ? { ...level, visible: false } : level,
      ),
    };
    const lockedScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === scene.workspaceState.currentBuildingLevelId ? { ...level, locked: true } : level,
      ),
    };

    const { rerender } = render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(hiddenScene)}
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, hidden layer')).toBeVisible();
    expect(screen.getAllByTestId('scene-cell').every((cell) => cell.dataset.editable === 'false')).toBe(true);

    rerender(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(lockedScene)}
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, locked layer')).toBeVisible();
    expect(screen.getAllByTestId('scene-cell').every((cell) => cell.dataset.editable === 'false')).toBe(true);
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

  it('allows read-only view selection but blocks edit shortcut keys', () => {
    const onSelectCoordinate = vi.fn();
    const onViewCoordinate = vi.fn();
    render(
      <SceneCanvas
        {...defaultProps}
        readOnly
        onSelectCoordinate={onSelectCoordinate}
        onViewCoordinate={onViewCoordinate}
      />,
    );

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, read-only');
    fireEvent.pointerDown(cell);
    fireEvent.click(cell);
    fireEvent.keyDown(cell, { key: 'Enter' });
    fireEvent.keyDown(cell, { key: 'Delete' });
    fireEvent.keyDown(cell, { key: 's', metaKey: true });

    expect(onSelectCoordinate).not.toHaveBeenCalled();
    expect(onViewCoordinate).toHaveBeenCalledTimes(3);
    expect(onViewCoordinate).toHaveBeenNthCalledWith(1, { x: 2, y: 3 });
    expect(onViewCoordinate).toHaveBeenNthCalledWith(2, { x: 2, y: 3 });
    expect(onViewCoordinate).toHaveBeenNthCalledWith(3, { x: 2, y: 3 });
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

  it('renders placed asset labels and skill markers on canvas cells', () => {
    const sceneWithTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-1',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          requiresSkill: true,
          skillType: 'leaf',
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

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable, Garden Plant, skill required');
    expect(cell).toHaveAttribute('data-has-instance', 'true');
    expect(cell).toHaveAttribute('data-requires-skill', 'true');
    expect(screen.getByText('Garden Plant')).toBeVisible();
    expect(screen.getByText('skill')).toBeVisible();
  });

  it('shows other visible layer context without marking the current layer as occupied', () => {
    const sceneWithCrossLayerTile = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-other-layer',
          assetId: 'roof-tile',
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
    expect(screen.getByLabelText('1 item on other visible layers')).toHaveTextContent('+1');
  });

  it('renders the latest stacked asset, stack count, and unknown asset fallback', () => {
    const sceneWithStackedTiles = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-1',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-2',
          assetId: 'roof-tile',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          rotationDegrees: 90,
          dyeColor: '#56ccf2',
          requiresSkill: true,
          skillType: 'soil',
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
        cells={getCanvasCellContexts(sceneWithStackedTiles)}
        readOnly={false}
      />,
    );

    const stackedCell = screen.getByLabelText(
      'Cell 2,3, main area, level-0, placeable, Roof Tile, 2 stacked items, rotated 90 deg, dyed #56ccf2, skill required',
    );
    expect(stackedCell).toHaveAttribute('data-instance-count', '2');
    expect(stackedCell).toHaveAttribute('data-rotation', '90');
    expect(stackedCell).toHaveAttribute('data-dye-color', '#56ccf2');
    expect(stackedCell).toHaveTextContent('Roof Tile');
    expect(stackedCell).toHaveTextContent('2x');
    expect(stackedCell).toHaveTextContent('90 deg');
    expect(screen.getByLabelText('Dye #56ccf2')).toBeVisible();

    expect(screen.getByLabelText('Cell 4,4, main area, level-0, placeable, Unknown asset: missing-asset')).toBeVisible();
  });

  it('does not render instances when the current building layer is hidden', () => {
    const hiddenScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? { ...level, visible: false } : level,
      ),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-hidden',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    render(
      <SceneCanvas
        {...defaultProps}
        cells={getCanvasCellContexts(hiddenScene)}
        readOnly={false}
      />,
    );

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, hidden layer');
    expect(cell).toHaveAttribute('data-has-instance', 'false');
    expect(cell).not.toHaveTextContent('Garden Plant');
  });
});
