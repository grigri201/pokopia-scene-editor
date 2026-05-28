import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractScene,
  createStackingPlateFoodScene,
  createTileInstance,
  footprintContractFixtureIds,
  stackingContractFixtureIds,
} from '@pokopia-scene-editor/scene-core';
import { readUiPreferencesFromStorage } from '../../io';
import { PreviewInspector } from './PreviewInspector';

const scene = {
  ...createDefaultSceneDocument({
    sceneId: 'scene-preview',
    selectedCoordinate: { x: 2, y: 3 },
    now: '2026-05-16T10:00:00.000Z',
  }),
  buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
  tileInstances: [
    createTileInstance({
      instanceId: 'tile-preview',
      assetId: 'leafy-plant',
      coordinate: { x: 2, y: 3 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: '树叶',
    }),
    createTileInstance({
      instanceId: 'tile-upper',
      assetId: 'brick-roof-decoration',
      coordinate: { x: 2, y: 3 },
      buildingLevelId: 'level-1',
    }),
  ],
};

describe('PreviewInspector', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the compact dual 7x7 preview inspector', () => {
    const { container } = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    expect(screen.getByRole('complementary', { name: '检查器预览' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: '检查器' })).not.toBeInTheDocument();
    expect(container.querySelector('.floating-preview-head')).toBeNull();
    expect(screen.getByLabelText('正视图预览')).toBeVisible();
    expect(screen.getByLabelText('俯视图预览')).toBeVisible();
    expect(container.querySelectorAll('.front-cell')).toHaveLength(21);
    expect(container.querySelectorAll('.top-cell')).toHaveLength(49);
    expect(container.querySelectorAll('[data-preview-coordinate="2,3"]')).toHaveLength(1);
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-id',
      'leafy-plant',
    );
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-skill-marker-label',
      '树',
    );
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,3"] img')).toHaveAttribute(
      'src',
      '/assets/pokopia_image_sources/item_portraits/0345-leafy-plant.png',
    );
    expect(container.querySelector('.front-cell[data-front-level-id="level-1"][data-front-x="2"]')).toHaveAttribute(
      'data-preview-asset-id',
      'brick-roof-decoration',
    );
    expect(screen.getByLabelText('Top preview scope')).toHaveTextContent('Current layer top projection');
    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('1 current-layer preview items');
    expect(screen.getByLabelText('Front preview item summary')).toHaveTextContent('2 visible items projected across 3 layers');
    expect(screen.getByLabelText('Top preview selection summary')).toHaveTextContent('2,3');
  });

  it('renders fixed preview overlays without display preference controls or storage writes', () => {
    const snapshotBefore = JSON.stringify(scene);
    const { container, unmount } = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Show preview grid' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show preview main boundary' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show preview skill markers' })).not.toBeInTheDocument();
    expect(readUiPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      assetFilters: {
        query: '',
        category: 'all',
        favoriteOnly: false,
      },
      locale: 'zh-CN',
      helpOverlayDismissed: false,
    });
    expect(window.localStorage.getItem('pokopia.uiPreferences.v1')).toBeNull();
    expect(container.querySelector('.front-preview')).not.toHaveAttribute('data-preview-grid-visible');
    expect(container.querySelector('.front-preview')).not.toHaveAttribute('data-preview-main-boundary-visible');
    expect(container.querySelector('.front-preview')).not.toHaveAttribute('data-preview-skill-markers-visible');
    expect(container.querySelector('.top-preview')).not.toHaveAttribute('data-preview-grid-visible');
    expect(container.querySelector('.front-cell.skill')).toBeNull();
    expect(container.querySelector('.top-cell.skill')).toBeNull();
    expect(container.querySelector('[data-preview-main-boundary-visible="true"]')).toBeNull();
    expect(container.querySelector('.front-cell[data-front-level-id="level-1"][data-front-x="2"]')).toHaveAttribute(
      'data-preview-asset-id',
      'brick-roof-decoration',
    );
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-id',
      'leafy-plant',
    );
    expect(JSON.stringify(scene)).toBe(snapshotBefore);

    unmount();
    const restored = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Preview all visible layers' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show preview grid' })).not.toBeInTheDocument();
    expect(restored.container.querySelector('.front-preview')).not.toHaveAttribute('data-preview-grid-visible');
    expect(screen.getByLabelText('Top preview scope')).toHaveTextContent('Current layer top projection');
  });

  it('renders display-only Open Design preview cells without mutating the scene', () => {
    const snapshotBefore = JSON.stringify(scene);
    const { container } = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly
      />,
    );

    expect(screen.getByText('View only')).toBeInTheDocument();
    expect(container.querySelector('.top-cell[data-preview-coordinate="3,3"]')).toHaveAttribute(
      'aria-label',
      '3,3',
    );
    expect(screen.queryAllByRole('button', { name: /preview cell/i })).toHaveLength(0);
    expect(JSON.stringify(scene)).toBe(snapshotBefore);
  });

  it('keeps current-layer instances visible because hidden layer state is no longer persisted', () => {
    const { container } = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('1 current-layer preview items');
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-has-instance',
      'true',
    );
    expect(screen.getByLabelText('Front preview item summary')).toHaveTextContent('2 visible items projected across 3 layers');
    expect(container.querySelector('.front-cell[data-front-level-id="level-1"][data-front-x="2"]')).toHaveAttribute(
      'data-preview-asset-id',
      'brick-roof-decoration',
    );
  });

  it('renders current-layer wide footprint as a single anchor-bound top-view overlay', () => {
    const { container } = render(
      <PreviewInspector
        scene={createFootprintContractScene()}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 1 }}
        selectedInstanceId={footprintContractFixtureIds.bench}
        readOnly={false}
      />,
    );

    const overlay = screen.getByTestId(`top-footprint-overlay-${footprintContractFixtureIds.bench}`);
    const anchor = container.querySelector('.top-cell[data-preview-coordinate="2,1"]');
    const occupied = container.querySelector('.top-cell[data-preview-coordinate="2,2"]');

    expect(overlay).toHaveAttribute('data-footprint-asset-id', 'wooden-bench');
    expect(overlay).toHaveAttribute('data-effective-footprint', '1x2x1');
    expect(overlay).toHaveAttribute('data-footprint-anchor-coordinate', '2,1');
    expect(anchor).toHaveAttribute('data-preview-footprint-role', 'anchor');
    expect(anchor).toHaveAttribute('data-preview-footprint-instance-id', footprintContractFixtureIds.bench);
    expect(occupied).toHaveAttribute('data-preview-footprint-role', 'occupied');
    expect(occupied).toHaveAttribute('data-preview-footprint-instance-id', footprintContractFixtureIds.bench);
    expect(occupied).toHaveAttribute('data-preview-footprint-anchor-coordinate', '2,1');
    expect(container.querySelectorAll('[data-testid^="top-footprint-overlay-"]')).toHaveLength(4);
    expect(container.querySelectorAll(`.top-cell[data-preview-instance-id="${footprintContractFixtureIds.bench}"]`)).toHaveLength(1);
  });

  it('renders height footprint in front view without counting derived blocking as real instances', () => {
    const { container } = render(
      <PreviewInspector
        scene={createFootprintContractScene()}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 1, y: 4 }}
        selectedInstanceId={footprintContractFixtureIds.boulder}
        readOnly={false}
      />,
    );

    const overlay = screen.getByTestId(`front-height-footprint-overlay-${footprintContractFixtureIds.boulder}`);
    const blockedCell = container.querySelector('.front-cell[data-front-level-id="level-1"][data-front-x="1"]');

    expect(overlay).toHaveAttribute('data-footprint-asset-id', 'strength-rock');
    expect(overlay).toHaveAttribute('data-effective-footprint', '1x1x2');
    expect(overlay).toHaveAttribute('data-footprint-height-span', '2');
    expect(overlay).toHaveAttribute('data-blocked-level-ids', 'level-1');
    expect(overlay).toHaveAttribute('data-footprint-x-span', '1');
    expect(blockedCell).toHaveAttribute('data-preview-has-instance', 'false');
    expect(blockedCell).toHaveAttribute('data-front-footprint-blocked', 'true');
    expect(blockedCell).toHaveAttribute('data-front-blocked-by-instance-id', footprintContractFixtureIds.boulder);
    expect(screen.getByLabelText('Front preview item summary')).toHaveTextContent('6 visible items projected across 3 layers');
  });

  it('renders legal stacking relations as top/base split cells in top and front previews', () => {
    const stackingScene = createStackingPlateFoodScene();
    const { container } = render(
      <PreviewInspector
        scene={stackingScene}
        activeBuildingLevelId={stackingContractFixtureIds.level0}
        selectedCoordinate={{ x: 2, y: 2 }}
        selectedInstanceId={stackingContractFixtureIds.food}
        readOnly={false}
      />,
    );

    const topCell = container.querySelector('.top-cell[data-preview-coordinate="2,2"]');
    const frontCell = container.querySelector('.front-cell[data-front-level-id="level-0"][data-front-x="2"]');

    expect(topCell).toHaveAttribute('data-preview-stacking-state', 'placed');
    expect(topCell).toHaveAttribute('data-preview-stacking-base-instance-id', stackingContractFixtureIds.plate);
    expect(topCell).toHaveAttribute('data-preview-stacking-top-instance-id', stackingContractFixtureIds.food);
    expect(topCell).toHaveAttribute('data-preview-stacking-base-asset-id', 'plate');
    expect(topCell).toHaveAttribute('data-preview-stacking-top-asset-id', 'leppa-berry');
    expect(topCell).toHaveAttribute('data-preview-stacking-surface-kind', 'food-surface');
    expect(topCell?.querySelector('[data-stacking-role="top"]')).toHaveAttribute('data-asset-id', 'leppa-berry');
    expect(topCell?.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-asset-id', 'plate');
    expect(topCell?.querySelectorAll('.preview-stacking-split__slot')).toHaveLength(2);

    expect(frontCell).toHaveAttribute('data-preview-stacking-state', 'placed');
    expect(frontCell).toHaveAttribute('data-preview-stacking-base-instance-id', stackingContractFixtureIds.plate);
    expect(frontCell).toHaveAttribute('data-preview-stacking-top-instance-id', stackingContractFixtureIds.food);
    expect(frontCell?.querySelector('[data-stacking-role="top"]')).toHaveAttribute('data-asset-id', 'leppa-berry');
    expect(frontCell?.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-asset-id', 'plate');
    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('1 current-layer preview items');
    expect(screen.getByLabelText('Front preview item summary')).toHaveTextContent('2 visible items projected across 1 layers');
  });

  it('does not show a front-view stacking split when another instance is the projected item for that column', () => {
    const stackingScene = createStackingPlateFoodScene();
    const sceneWithFrontItem = {
      ...stackingScene,
      tileInstances: [
        ...stackingScene.tileInstances,
        createTileInstance({
          instanceId: 'front-column-leafy',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 5 },
          buildingLevelId: stackingContractFixtureIds.level0,
        }),
      ],
    };
    const { container } = render(
      <PreviewInspector
        scene={sceneWithFrontItem}
        activeBuildingLevelId={stackingContractFixtureIds.level0}
        selectedCoordinate={{ x: 2, y: 2 }}
        selectedInstanceId={stackingContractFixtureIds.food}
        readOnly={false}
      />,
    );

    const frontCell = container.querySelector('.front-cell[data-front-level-id="level-0"][data-front-x="2"]');

    expect(frontCell).toHaveAttribute('data-preview-asset-id', 'leafy-plant');
    expect(frontCell).toHaveAttribute('data-preview-instance-id', 'front-column-leafy');
    expect(frontCell).toHaveAttribute('data-preview-stacking-state', '');
    expect(frontCell?.querySelector('.preview-stacking-split')).toBeNull();
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,2"]')).toHaveAttribute(
      'data-preview-stacking-state',
      'placed',
    );
  });

  it('keeps the front view in a scrollable seven-layer viewport when scenes exceed seven layers', () => {
    const manyLevelScene = {
      ...scene,
      buildingLevels: Array.from({ length: 9 }, (_, levelNumber) => createBuildingLevel(levelNumber)),
    };
    const { container } = render(
      <PreviewInspector
        scene={manyLevelScene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    const frontScrollRegion = screen.getByRole('region', { name: '正视图滚动区域' });
    const frontScrollShell = frontScrollRegion.closest('.preview-scroll-shell');

    expect(frontScrollRegion).toHaveAttribute('tabindex', '0');
    expect(frontScrollRegion).toHaveAttribute('data-front-visible-level-count', '9');
    expect(frontScrollRegion).toHaveAttribute('data-front-overflowing-levels', 'true');
    expect(frontScrollRegion).toHaveAttribute('data-front-scroll-window-layers', '7');
    expect(frontScrollShell).toHaveAttribute('data-front-scroll-can-up', 'false');
    expect(frontScrollShell).toHaveAttribute('data-front-scroll-can-down', 'true');
    expect(container.querySelector('.preview-scroll-cue--up')).toBeInTheDocument();
    expect(container.querySelector('.preview-scroll-cue--down')).toBeInTheDocument();
    expect(container.querySelectorAll('.front-cell')).toHaveLength(63);
    expect(container.querySelector('.front-cell[data-front-level-display-id="L9"]')).toBeInTheDocument();
    expect(container.querySelector('.front-cell[data-front-level-display-id="L1"]')).toBeInTheDocument();
  });

  it('updates front view scroll arrow hints from the scroll position', async () => {
    const manyLevelScene = {
      ...scene,
      buildingLevels: Array.from({ length: 9 }, (_, levelNumber) => createBuildingLevel(levelNumber)),
    };
    render(
      <PreviewInspector
        scene={manyLevelScene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    const frontScrollRegion = screen.getByRole('region', { name: '正视图滚动区域' }) as HTMLDivElement;
    const frontScrollShell = frontScrollRegion.closest('.preview-scroll-shell');
    expect(frontScrollShell).not.toBeNull();
    if (!frontScrollShell) {
      throw new Error('Expected front scroll shell.');
    }

    Object.defineProperty(frontScrollRegion, 'clientHeight', {
      configurable: true,
      value: 96,
    });
    Object.defineProperty(frontScrollRegion, 'scrollHeight', {
      configurable: true,
      value: 124,
    });
    Object.defineProperty(frontScrollRegion, 'scrollTop', {
      configurable: true,
      value: 0,
      writable: true,
    });

    fireEvent.scroll(frontScrollRegion);

    await waitFor(() => expect(frontScrollShell).toHaveAttribute('data-front-scroll-can-up', 'false'));
    expect(frontScrollShell).toHaveAttribute('data-front-scroll-can-down', 'true');

    frontScrollRegion.scrollTop = 28;
    fireEvent.scroll(frontScrollRegion);

    await waitFor(() => expect(frontScrollShell).toHaveAttribute('data-front-scroll-can-up', 'true'));
    expect(frontScrollShell).toHaveAttribute('data-front-scroll-can-down', 'false');
  });
});
