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
      '--scene-canvas-width-large': 'min(72vh, 660px, 100%)',
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

  it('shrinks rectangular canvas width from the longest side so cells stay square', () => {
    const dimensions = createSceneDimensionsForCanvasSize({ width: 6, height: 17 });
    const rectangularScene = {
      ...scene,
      sceneSize: dimensions.sceneSize,
      canvasSize: dimensions.canvasSize,
      outerPadding: dimensions.outerPadding,
    };

    render(<SceneCanvas {...createSceneCanvasProps(rectangularScene)} readOnly={false} />);

    const canvas = screen.getByTestId('scene-canvas');
    expect(screen.getByRole('grid', { name: '6x17 canvas with main and outer regions' })).toBeVisible();
    expect(screen.getAllByTestId('scene-cell')).toHaveLength(102);
    expect(canvas).toHaveStyle({
      '--scene-canvas-columns': '6',
      '--scene-canvas-rows': '17',
      '--scene-canvas-max-side': '17',
      '--scene-canvas-aspect-ratio': '6 / 17',
      '--scene-canvas-width-large': 'min(25.4118vh, 232.9412px, 35.2941%)',
      '--scene-canvas-width-medium': 'min(35.2941%, 218.8235px)',
      '--scene-canvas-width-mobile': 'min(35.2941%, 32.4706vw)',
    });
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
    const topOverlay = screen.getByTestId(`scene-footprint-overlay-${stacking.relation.topInstanceId}`);

    expect(stackedCell).toHaveAttribute('data-stacking-state', 'placed');
    expect(stackedCell).toHaveAttribute('data-stacking-base-instance-id', stacking.relation.baseInstanceId);
    expect(stackedCell).toHaveAttribute('data-stacking-top-instance-id', stacking.relation.topInstanceId);
    expect(stackedCell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(stacking.baseInstance.effectiveFootprint));
    expect(stackedCell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(stacking.topInstance.effectiveFootprint));
    expect(stackedCell).toHaveAttribute('data-stacking-base-visibility', 'visible');
    expect(stackedCell).toHaveAttribute('data-stacking-base-render', 'cell');
    expect(stackedCell).toHaveAttribute('data-stacking-top-render', 'overlay');
    expect(stackedSplit).toHaveClass('cell-stacking-split--base-visible');
    expect(topSlot).toHaveAttribute('data-asset-id', stacking.relation.topAssetId);
    expect(topSlot).toHaveAttribute('data-top-image-visible', 'false');
    expect(topSlot?.querySelector('img')).toBeNull();
    expect(stackedSplit?.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-asset-id', stacking.relation.baseAssetId);
    expect(stackedSplit?.querySelector('[data-stacking-role="base"] img')).toHaveAttribute('src', expect.stringContaining(stacking.relation.baseAssetId));
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

function getRenderedCell(coordinate: string): HTMLElement {
  const cell = screen.getAllByTestId('scene-cell').find((candidate) => candidate.dataset.coordinate === coordinate);

  if (!cell) {
    throw new Error(`Expected rendered cell ${coordinate}.`);
  }

  return cell;
}
