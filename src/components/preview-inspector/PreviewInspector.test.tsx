import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance } from '../../domain/scene';
import { readUiPreferencesFromStorage } from '../../io';
import { PreviewInspector } from './PreviewInspector';

const scene = {
  ...createDefaultSceneDocument({
    sceneId: 'scene-preview',
    selectedCoordinate: { x: 2, y: 3 },
    now: '2026-05-16T10:00:00.000Z',
  }),
  tileInstances: [
    createTileInstance({
      instanceId: 'tile-preview',
      assetId: 'garden-plant',
      coordinate: { x: 2, y: 3 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: '树叶',
    }),
    createTileInstance({
      instanceId: 'tile-upper',
      assetId: 'roof-tile',
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
    expect(screen.getByRole('heading', { name: '检查器' })).toBeVisible();
    expect(screen.getByLabelText('正视图预览')).toBeVisible();
    expect(screen.getByLabelText('俯视图预览')).toBeVisible();
    expect(container.querySelectorAll('.front-cell')).toHaveLength(21);
    expect(container.querySelectorAll('.top-cell')).toHaveLength(49);
    expect(container.querySelectorAll('[data-preview-coordinate="2,3"]')).toHaveLength(1);
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-id',
      'garden-plant',
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
      'roof-tile',
    );
    expect(screen.getByLabelText('Top preview scope')).toHaveTextContent('Current layer top projection');
    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('1 current-layer preview items');
    expect(screen.getByLabelText('Front preview item summary')).toHaveTextContent('2 visible items projected across 3 layers');
    expect(screen.getByLabelText('Top preview selection summary')).toHaveTextContent('2,3');
  });

  it('keeps preview scope and display options in UI preferences only', () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Show preview grid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show preview main boundary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show preview skill markers' }));

    expect(readUiPreferencesFromStorage(window.localStorage).preview).toEqual({
      displayOptions: {
        grid: false,
        mainBoundary: false,
        skillMarkers: false,
      },
      layerScope: 'current-layer',
    });
    expect(container.querySelector('.front-preview')).toHaveAttribute('data-preview-grid-visible', 'false');
    expect(container.querySelector('.front-cell[data-front-level-id="level-1"][data-front-x="2"]')).toHaveAttribute(
      'data-preview-asset-id',
      'roof-tile',
    );
    expect(container.querySelector('.top-cell[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-id',
      'garden-plant',
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
    expect(screen.getByRole('button', { name: 'Show preview grid' })).toHaveAttribute('aria-pressed', 'false');
    expect(restored.container.querySelector('.front-preview')).toHaveAttribute('data-preview-grid-visible', 'false');
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
      'roof-tile',
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
    expect(container.querySelector('.front-cell[data-front-level-display-id="L8"]')).toBeInTheDocument();
    expect(container.querySelector('.front-cell[data-front-level-display-id="L0"]')).toBeInTheDocument();
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
