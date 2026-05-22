import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance, getCanvasCellContexts } from '../../domain/scene';
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
  onDeleteCoordinate: () => undefined,
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

  it('keeps all editable cells available because layer hidden/locked state is no longer a command boundary', () => {
    render(<SceneCanvas {...defaultProps} readOnly={false} />);

    expect(screen.getByLabelText('Cell 0,0, outer area, level-0, placeable')).toBeVisible();
    expect(screen.getAllByTestId('scene-cell').every((cell) => cell.dataset.editable === 'true')).toBe(true);
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
      'Cell 2,3, main area, level-0, placeable, 绿叶植物, Skill marker 绿叶植物 树',
    );
    expect(cell).toHaveAttribute('data-has-instance', 'true');
    expect(cell).toHaveAttribute('data-requires-skill', 'true');
    expect(cell).toHaveAttribute('data-skill-marker-label', '树');
    expect(cell).toHaveTextContent('绿叶植物');
    const skillMarker = screen.getByLabelText('Skill marker 绿叶植物 树');
    expect(skillMarker).toHaveAttribute('data-tooltip', '树叶');
    expect(skillMarker).not.toHaveTextContent('树');
    expect(skillMarker.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/item_portraits/0050-leaf.png'),
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
      'Cell 2,3, main area, level-0, placeable, 砖瓦屋顶装饰, rotated 90, dyed #56ccf2, Skill marker 砖瓦屋顶装饰 耕',
    );
    expect(duplicateCell).toHaveAttribute('data-instance-count', '1');
    expect(duplicateCell).toHaveAttribute('data-skill-marker-label', '耕');
    expect(duplicateCell).toHaveAttribute('data-rotation', '90');
    expect(duplicateCell).toHaveAttribute('data-dye-color', '#56ccf2');
    expect(duplicateCell).toHaveTextContent('砖瓦屋顶装饰');
    expect(duplicateCell).not.toHaveTextContent('2x');
    expect(document.querySelector('.cell-stack-count')).toBeNull();
    const rotationMarker = duplicateCell.querySelector('.cell-rotation-marker');
    expect(rotationMarker).toHaveAttribute('aria-label', '旋转 90 度');
    expect(rotationMarker).toHaveAttribute('data-tooltip', '旋转 90 度');
    expect(rotationMarker?.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByLabelText('Dye #56ccf2')).toBeVisible();
    const skillMarker = screen.getByLabelText('Skill marker 砖瓦屋顶装饰 耕');
    expect(skillMarker).toHaveAttribute('data-tooltip', '耕地');
    expect(skillMarker.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/decorative_item_portraits/171-farm-soil-ridge.webp'),
    );

    expect(screen.getByLabelText('Cell 4,4, main area, level-0, placeable, Unknown asset: missing-asset')).toBeVisible();
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
    expect(cell).toHaveTextContent('木长椅');
    expect(screen.queryByLabelText('Skill marker 绿叶植物 树')).not.toBeInTheDocument();
    expect(cell).toHaveAttribute('data-instance-count', '1');
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
      'Cell 2,3, main area, level-0, placeable, 绿叶植物, Skill marker 绿叶植物 树',
    );
    expect(cell).toHaveAttribute('data-has-instance', 'true');
    expect(cell).toHaveAttribute('data-requires-skill', 'true');
    expect(cell).toHaveTextContent('绿叶植物');
    expect(sceneWithInstance.tileInstances[0]).toMatchObject({
      requiresSkill: true,
      skillType: '树叶',
      skillNote: 'kept while hidden',
    });
  });
});
