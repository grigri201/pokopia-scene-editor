import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../../domain/scene';
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
  it('renders top and front previews from the scene selectors', () => {
    render(
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
    expect(screen.getByLabelText('Top preview current layer')).toHaveTextContent('0 层');
    expect(screen.getByLabelText('Top preview item summary')).toHaveTextContent('1 current-layer item');
    expect(screen.getByLabelText('Top preview selection summary')).toHaveTextContent('2,3 · Garden Plant');
    expect(screen.getByLabelText('Front preview layer summary')).toHaveTextContent('3 visible layers, 2 visible items');
    expect(screen.getByRole('listitem', { name: 'L0 0 层, 1 item, visible, active' })).toBeVisible();
    expect(screen.getByRole('listitem', { name: 'L1 1 层, 1 item, visible' })).toBeVisible();
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
    expect(screen.getByLabelText('Front preview mode')).toHaveTextContent('Read-only preview');
    fireEvent.click(screen.getByRole('button', { name: 'Top preview cell 2,3, main, Roof Tile' }));
    expect(screen.getByLabelText('Top preview local focus')).toHaveTextContent('2,3 · Roof Tile');
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in preview' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pan preview right' }));
    expect(screen.getByLabelText('Top preview view state')).toHaveTextContent('125%, pan 4,0');
    expect(JSON.stringify(scene)).toBe(snapshotBefore);
  });

  it('excludes hidden-layer instances from visible preview summaries', () => {
    const hiddenScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? { ...level, visible: false } : level,
      ),
    };

    render(
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
    expect(screen.getByLabelText('Front preview layer summary')).toHaveTextContent('2 visible layers, 1 visible item');
    expect(screen.queryByRole('listitem', { name: /L0 0 层/ })).not.toBeInTheDocument();
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

    const layerBars = screen.getAllByRole('listitem');
    expect(layerBars).toHaveLength(6);
    expect(layerBars.every((bar) => Number.parseFloat((bar as HTMLElement).style.height) <= 100)).toBe(true);
    expect(layerBars.every((bar) => Number.parseFloat((bar as HTMLElement).style.height) >= 28)).toBe(true);
  });
});
