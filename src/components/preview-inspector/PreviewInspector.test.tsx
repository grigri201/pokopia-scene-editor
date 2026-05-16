import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../../domain/scene';
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

  it('renders top and front previews from the scene selectors', () => {
    const { container } = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    expect(screen.getByRole('complementary', { name: 'Preview inspector' })).toBeVisible();
    expect(screen.getByLabelText('Dual preview inspector')).toBeVisible();
    expect(screen.getByLabelText('Top view preview')).toBeVisible();
    expect(screen.getByLabelText('Front view preview')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Preview current layer' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Preview all visible layers' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByRole('button', { name: /^Top preview cell/ })).toHaveLength(49);
    expect(container.querySelectorAll('[data-preview-area="main"]')).toHaveLength(25);
    expect(container.querySelectorAll('[data-preview-area="outer"]')).toHaveLength(24);
    expect(container.querySelectorAll('[data-preview-main-boundary="true"]')).toHaveLength(16);
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-has-instance',
      'true',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-id',
      'garden-plant',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-requires-skill',
      'true',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-skill-marker-label',
      '树',
    );
    expect(screen.getByRole('button', { name: 'Top preview cell 2,3, main, Garden Plant, 1 item, skill 树' }))
      .toBeVisible();
    expect(screen.getByLabelText('Top preview scope')).toHaveTextContent('Current layer preview');
    expect(screen.getByLabelText('Top preview layer summary')).toHaveTextContent('L0 0 层 unlocked');
    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('1 current-layer item');
    expect(screen.getByLabelText('Top preview selection summary')).toHaveTextContent('2,3 · Garden Plant');
    expect(screen.getByLabelText('Front preview layer summary')).toHaveTextContent('1 visible layer, 1 visible item');
    expect(screen.getByLabelText('Front structure preview 1 visible layer, 1 visible item')).toHaveAttribute(
      'data-front-rendering',
      'structure-only',
    );
    expect(screen.getByLabelText('Front structure preview 1 visible layer, 1 visible item')).toHaveAttribute(
      'data-front-scroll',
      'independent',
    );
    expect(screen.getByRole('listitem', {
      name: 'L0 0 层, height 28%, 1 item, main 1, outer 0, skill 1, visible, unlocked, active',
    }))
      .toBeVisible();
    expect(container.querySelector('[data-front-layer-id="level-0"]')).toHaveAttribute(
      'data-front-layer-main-count',
      '1',
    );
    expect(container.querySelector('[data-front-layer-id="level-0"]')).toHaveAttribute(
      'data-front-layer-outer-count',
      '0',
    );
    expect(container.querySelector('[data-front-layer-id="level-0"]')).toHaveAttribute(
      'data-front-layer-skill-count',
      '1',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview all visible layers' }));

    expect(screen.getByRole('button', { name: 'Preview all visible layers' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Top preview scope')).toHaveTextContent('All visible layers preview');
    expect(screen.getByLabelText('Top preview layer summary')).toHaveTextContent(
      'L0 0 层 unlocked → L1 1 层 unlocked → L2 2 层 unlocked',
    );
    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('2 visible items across 3 layers');
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-instance-count',
      '2',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-id',
      'roof-tile',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-layer-stack',
      'L0,L1',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-stack',
      'L0 unlocked Garden Plant → L1 unlocked Roof Tile',
    );
    expect(screen.getByRole('button', {
      name: 'Top preview cell 2,3, main, Roof Tile, 2 items, layers L0 0 层 unlocked → L1 1 层 unlocked, asset stack L0 unlocked Garden Plant → L1 unlocked Roof Tile, skill 树',
    })).toBeVisible();
    expect(screen.getByLabelText('Front preview layer summary')).toHaveTextContent('3 visible layers, 2 visible items');
    expect(screen.getByRole('listitem', {
      name: 'L1 1 层, height 64%, 1 item, main 1, outer 0, skill 0, visible, unlocked',
    })).toBeVisible();
  });

  it('keeps read-only preview mode local to the preview and derived', () => {
    const snapshotBefore = JSON.stringify(scene);

    render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-1"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-upper"
        readOnly
      />,
    );

    expect(screen.getByText('View only')).toBeVisible();
    expect(screen.getByLabelText('Front preview mode')).toHaveTextContent('当前层 read-only preview');
    fireEvent.click(screen.getByRole('button', { name: 'Top preview cell 2,3, main, Roof Tile, 1 item' }));
    expect(screen.getByLabelText('Top preview local focus')).toHaveTextContent('2,3 · Roof Tile');
    fireEvent.click(screen.getByRole('button', { name: 'Preview all visible layers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pan preview right' }));
    expect(screen.getByLabelText('Top preview view state')).toHaveTextContent('125%, pan 4,0');
    expect(JSON.stringify(scene)).toBe(snapshotBefore);
  });

  it('keeps preview display toggles local while preserving derived data attributes', () => {
    const snapshotBefore = JSON.stringify(scene);
    const { container } = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );
    const topSurface = container.querySelector('.mini-grid');
    const frontSurface = container.querySelector('.front-structure');
    const boundaryCell = container.querySelector('[data-preview-coordinate="1,1"]');
    const skillCell = container.querySelector('[data-preview-coordinate="2,3"]');
    const frontLevel = container.querySelector('[data-front-layer-id="level-0"]');
    const gridToggle = screen.getByRole('button', { name: 'Show preview grid' });
    const boundaryToggle = screen.getByRole('button', { name: 'Show preview main boundary' });
    const skillToggle = screen.getByRole('button', { name: 'Show preview skill markers' });

    expect(screen.getByRole('group', { name: 'Preview display options' })).toBeVisible();
    expect(gridToggle).toHaveAttribute('aria-pressed', 'true');
    expect(boundaryToggle).toHaveAttribute('aria-pressed', 'true');
    expect(skillToggle).toHaveAttribute('aria-pressed', 'true');
    expect(topSurface).toHaveAttribute('data-preview-grid-visible', 'true');
    expect(topSurface).toHaveAttribute('data-preview-main-boundary-visible', 'true');
    expect(topSurface).toHaveAttribute('data-preview-skill-markers-visible', 'true');
    expect(frontSurface).toHaveAttribute('data-front-grid-visible', 'true');
    expect(frontSurface).toHaveAttribute('data-front-main-boundary-visible', 'true');
    expect(frontSurface).toHaveAttribute('data-front-skill-markers-visible', 'true');
    expect(boundaryCell).toHaveAttribute('data-preview-main-boundary', 'true');
    expect(boundaryCell).toHaveAttribute('data-preview-main-boundary-visible', 'true');
    expect(skillCell).toHaveAttribute('data-preview-requires-skill', 'true');
    expect(skillCell).toHaveAttribute('data-preview-skill-marker-label', '树');
    expect(frontLevel).toHaveAttribute('data-front-layer-skill-count', '1');
    expect(frontLevel).toHaveAttribute('data-front-layer-skill-visible', 'true');

    fireEvent.click(gridToggle);
    expect(gridToggle).toHaveAttribute('aria-pressed', 'false');
    expect(topSurface).toHaveAttribute('data-preview-grid-visible', 'false');
    expect(frontSurface).toHaveAttribute('data-front-grid-visible', 'false');
    expect(JSON.stringify(scene)).toBe(snapshotBefore);

    fireEvent.click(boundaryToggle);
    expect(boundaryToggle).toHaveAttribute('aria-pressed', 'false');
    expect(topSurface).toHaveAttribute('data-preview-main-boundary-visible', 'false');
    expect(frontSurface).toHaveAttribute('data-front-main-boundary-visible', 'false');
    expect(boundaryCell).toHaveAttribute('data-preview-main-boundary', 'true');
    expect(boundaryCell).toHaveAttribute('data-preview-main-boundary-visible', 'false');
    expect(JSON.stringify(scene)).toBe(snapshotBefore);

    fireEvent.click(skillToggle);
    expect(skillToggle).toHaveAttribute('aria-pressed', 'false');
    expect(topSurface).toHaveAttribute('data-preview-skill-markers-visible', 'false');
    expect(frontSurface).toHaveAttribute('data-front-skill-markers-visible', 'false');
    expect(skillCell).toHaveAttribute('data-preview-requires-skill', 'true');
    expect(skillCell).toHaveAttribute('data-preview-skill-marker-label', '树');
    expect(screen.getByLabelText('Top preview skill 树')).toHaveAttribute('data-preview-skill-visible', 'false');
    expect(frontLevel).toHaveAttribute('data-front-layer-skill-count', '1');
    expect(frontLevel).toHaveAttribute('data-front-layer-skill-visible', 'false');
    expect(JSON.stringify(scene)).toBe(snapshotBefore);
  });

  it('persists and restores preview display options and layer scope', () => {
    const { container, unmount } = render(
      <PreviewInspector
        scene={scene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview all visible layers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show preview grid' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show preview main boundary' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show preview skill markers' }));

    expect(readUiPreferencesFromStorage(window.localStorage).preview).toEqual({
      displayOptions: {
        grid: false,
        mainBoundary: false,
        skillMarkers: false,
      },
      layerScope: 'all-visible-layers',
    });
    expect(container.querySelector('.mini-grid')).toHaveAttribute('data-preview-grid-visible', 'false');
    expect(screen.getByRole('button', { name: 'Preview all visible layers' })).toHaveAttribute('aria-pressed', 'true');

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

    expect(screen.getByRole('button', { name: 'Preview all visible layers' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Show preview grid' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show preview main boundary' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Show preview skill markers' })).toHaveAttribute('aria-pressed', 'false');
    expect(restored.container.querySelector('.mini-grid')).toHaveAttribute('data-preview-grid-visible', 'false');
    expect(restored.container.querySelector('.front-structure')).toHaveAttribute('data-front-skill-markers-visible', 'false');
    expect(screen.getByLabelText('Top preview scope')).toHaveTextContent('All visible layers preview');
  });

  it('excludes hidden-layer instances from visible preview summaries', () => {
    const hiddenScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? { ...level, visible: false } : level,
      ),
    };

    const { container } = render(
      <PreviewInspector
        scene={hiddenScene}
        activeBuildingLevelId="level-0"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-preview"
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('0 current-layer items');
    expect(screen.getByLabelText('Top preview selection summary')).toHaveTextContent('2,3 · hidden layer');
    expect(screen.getByLabelText('Top preview local focus')).toHaveTextContent('2,3 · hidden layer');
    expect(screen.getByLabelText('Top preview local focus')).not.toHaveTextContent('Garden Plant');
    expect(screen.getByLabelText('Front preview layer summary')).toHaveTextContent('0 visible layers, 0 visible items');
    expect(screen.queryByRole('listitem', { name: /L0 0 层/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Top preview cell 1,1, main, hidden layer, main boundary' }))
      .toBeVisible();
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-has-instance',
      'false',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-requires-skill',
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview all visible layers' }));

    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('1 visible item across 2 layers');
    expect(screen.getByLabelText('Top preview layer summary')).toHaveTextContent(
      'L1 1 层 unlocked → L2 2 层 unlocked',
    );
    expect(screen.getByLabelText('Top preview local focus')).toHaveTextContent('2,3 · Roof Tile');
    expect(screen.getByLabelText('Top preview local focus')).not.toHaveTextContent('Garden Plant');
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-has-instance',
      'true',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-layer-stack',
      'L1',
    );
  });

  it('keeps front-view bars bounded for scenes with more than three levels', () => {
    const manyLevelScene = {
      ...scene,
      buildingLevels: [
        ...scene.buildingLevels,
        { id: 'level-3', levelNumber: 3, name: '3 层', visible: true, locked: false },
        { id: 'level-4', levelNumber: 4, name: '4 层', visible: true, locked: false },
        { id: 'level-5', levelNumber: 5, name: '5 层', visible: true, locked: false },
      ],
    };

    render(
      <PreviewInspector
        scene={manyLevelScene}
        activeBuildingLevelId="level-5"
        selectedCoordinate={null}
        selectedInstanceId={null}
        readOnly={false}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Preview all visible layers' }));

    const frontRows = document.querySelectorAll('.front-structure__layer');
    expect(frontRows).toHaveLength(6);
    expect(
      Array.from(frontRows).every((row) => Number.parseFloat(row.getAttribute('data-front-layer-height') ?? '') <= 100),
    ).toBe(true);
    expect(
      Array.from(frontRows).every((row) => Number.parseFloat(row.getAttribute('data-front-layer-height') ?? '') >= 28),
    ).toBe(true);
  });

  it('surfaces locked level state while preserving visible preview content', () => {
    const lockedScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-1' ? { ...level, locked: true } : level,
      ),
    };
    const { container } = render(
      <PreviewInspector
        scene={lockedScene}
        activeBuildingLevelId="level-1"
        selectedCoordinate={{ x: 2, y: 3 }}
        selectedInstanceId="tile-upper"
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Top preview layer summary')).toHaveTextContent('L1 1 层 locked');
    expect(screen.getByRole('listitem', {
      name: 'L1 1 层, height 64%, 1 item, main 1, outer 0, skill 0, visible, locked, active',
    })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Preview all visible layers' }));

    expect(screen.getByLabelText('Top preview layer summary')).toHaveTextContent(
      'L0 0 层 unlocked → L1 1 层 locked → L2 2 层 unlocked',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-locked-layer-count',
      '1',
    );
    expect(container.querySelector('[data-preview-coordinate="2,3"]')).toHaveAttribute(
      'data-preview-asset-stack',
      'L0 unlocked Garden Plant → L1 locked Roof Tile',
    );
    expect(screen.getByRole('button', {
      name: 'Top preview cell 2,3, main, Roof Tile, 2 items, layers L0 0 层 unlocked → L1 1 层 locked, asset stack L0 unlocked Garden Plant → L1 locked Roof Tile, skill 树',
    })).toBeVisible();
  });
});
