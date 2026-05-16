import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneDocument, createTileInstance, getCellContext } from '../../domain/scene';
import { SelectionInspector } from './SelectionInspector';

const scene = {
  ...createDefaultSceneDocument({
    sceneId: 'scene-test',
    now: '2026-05-16T07:00:00.000Z',
  }),
  tileInstances: [
    createTileInstance({
      instanceId: 'tile-edit',
      assetId: 'roof-tile',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-0',
      rotationDegrees: 90,
      dyeColor: '#56ccf2',
      note: '<script>alert(1)</script>',
    }),
  ],
};

const selectedContext = getCellContext(scene, { x: 2, y: 2 });
const selectedInstance = selectedContext.tileInstances[0];
const sceneDimensions = {
  sceneSize: scene.sceneSize,
  canvasSize: scene.canvasSize,
  outerPadding: scene.outerPadding,
};
const defaultInspectorProps = {
  targetContext: null,
  targetPlacement: null,
  canvasSize: scene.canvasSize,
  sceneDimensions,
  buildingLevels: scene.buildingLevels,
  tileInstances: scene.tileInstances,
  editFeedback: null,
  onSelectedInstanceChange: () => undefined,
  onDeleteInstance: () => undefined,
  onMoveInstance: () => undefined,
  onRotateInstance: () => undefined,
  onDyeInstance: () => undefined,
  onSaveInstanceNote: () => undefined,
};

describe('SelectionInspector', () => {
  it('binds instance edit controls to the selected instance id', () => {
    const onDeleteInstance = vi.fn();
    const onMoveInstance = vi.fn();
    const onRotateInstance = vi.fn();
    const onDyeInstance = vi.fn();
    const onSaveInstanceNote = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={selectedInstance}
        selectedInstanceId="tile-edit"
        readOnly={false}
        editFeedback="Ready"
        onDeleteInstance={onDeleteInstance}
        onMoveInstance={onMoveInstance}
        onRotateInstance={onRotateInstance}
        onDyeInstance={onDyeInstance}
        onSaveInstanceNote={onSaveInstanceNote}
      />,
    );

    expect(screen.getByLabelText('Selected instance')).toHaveTextContent('Roof Tile');
    expect(screen.getByLabelText('Selected instance id')).toHaveTextContent('tile-edit');
    expect(screen.getByLabelText('Selected instance rotation')).toHaveTextContent('90 deg');
    expect(screen.getByLabelText('Selected instance dye')).toHaveTextContent('#56ccf2');
    expect(screen.getByLabelText('Selected instance note')).toHaveTextContent('<script>alert(1)</script>');
    expect(screen.getByLabelText('Instance edit feedback')).toHaveTextContent('Ready');

    fireEvent.change(screen.getByLabelText('Move instance X'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Move instance Y'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    fireEvent.change(screen.getByLabelText('Instance rotation'), { target: { value: '180' } });
    fireEvent.change(screen.getByLabelText('Instance dye color'), { target: { value: '#bb6bd9' } });
    fireEvent.change(screen.getByLabelText('Instance note'), {
      target: { value: '<img src=x onerror=alert(1)>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onMoveInstance).toHaveBeenCalledWith('tile-edit', { x: 3, y: 4 }, 'level-0');
    expect(onRotateInstance).toHaveBeenCalledWith('tile-edit', 180);
    expect(onDyeInstance).toHaveBeenCalledWith('tile-edit', '#bb6bd9');
    expect(onSaveInstanceNote).toHaveBeenCalledWith('tile-edit', '<img src=x onerror=alert(1)>');
    expect(onDeleteInstance).toHaveBeenCalledWith('tile-edit');
  });

  it('keeps edit controls disabled in read-only mode while preserving instance fields', () => {
    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={selectedInstance}
        selectedInstanceId="tile-edit"
        readOnly
      />,
    );

    expect(screen.getByLabelText('Instance edit state')).toHaveTextContent('Read-only mode');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save note' })).toBeDisabled();
  });

  it('shows move preview, invalid input feedback, and unsupported capability reasons', () => {
    const onSelectedInstanceChange = vi.fn();
    const onMoveInstance = vi.fn();
    const stackedScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-bottom',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-top',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-blocker',
          assetId: 'wooden-floor',
          coordinate: { x: 3, y: 3 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const stackedContext = getCellContext(stackedScene, { x: 2, y: 2 });

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={stackedContext}
        selectedInstance={stackedContext.tileInstances[0]}
        selectedInstanceId="tile-bottom"
        tileInstances={stackedScene.tileInstances}
        readOnly={false}
        onSelectedInstanceChange={onSelectedInstanceChange}
        onMoveInstance={onMoveInstance}
      />,
    );

    fireEvent.change(screen.getByLabelText('Selected instance selector'), { target: { value: 'tile-top' } });
    expect(onSelectedInstanceChange).toHaveBeenCalledWith('tile-top');
    expect(screen.getByLabelText('Rotation edit state')).toHaveTextContent('This asset cannot rotate');
    expect(screen.getByLabelText('Dye edit state')).toHaveTextContent('This asset cannot be dyed');

    fireEvent.change(screen.getByLabelText('Move instance X'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Move instance Y'), { target: { value: '3' } });
    expect(screen.getByLabelText('Move target preview')).toHaveTextContent('Move blocked by 1 item on 0 层');
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Move instance X'), { target: { value: '99' } });
    expect(screen.getByLabelText('Move target preview')).toHaveTextContent('Invalid target');
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(onMoveInstance).not.toHaveBeenCalled();
  });

  it('previews and emits cross-layer move targets from the layer selector', () => {
    const onMoveInstance = vi.fn();
    const crossLayerScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-target-stack',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
    };
    const crossLayerContext = getCellContext(crossLayerScene, { x: 2, y: 2 }, 'level-0');

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={crossLayerContext}
        selectedInstance={crossLayerContext.tileInstances[0]}
        selectedInstanceId="tile-source"
        tileInstances={crossLayerScene.tileInstances}
        readOnly={false}
        onMoveInstance={onMoveInstance}
      />,
    );

    fireEvent.change(screen.getByLabelText('Move target layer'), { target: { value: 'level-1' } });
    expect(screen.getByLabelText('Move target preview')).toHaveTextContent('Move will stack with 1 item on 1 层');
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));
    expect(onMoveInstance).toHaveBeenCalledWith('tile-source', { x: 2, y: 2 }, 'level-1');
  });

  it('keeps the selected target layer while note and dye fields change', () => {
    const onMoveInstance = vi.fn();

    const { rerender } = render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={selectedInstance}
        selectedInstanceId="tile-edit"
        readOnly={false}
        onMoveInstance={onMoveInstance}
      />,
    );

    fireEvent.change(screen.getByLabelText('Move target layer'), { target: { value: 'level-1' } });
    rerender(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={{ ...selectedInstance, dyeColor: '#bb6bd9', note: 'saved note' }}
        selectedInstanceId="tile-edit"
        readOnly={false}
        onMoveInstance={onMoveInstance}
      />,
    );
    fireEvent.change(screen.getByLabelText('Move instance X'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move' }));

    expect(screen.getByLabelText('Move target layer')).toHaveValue('level-1');
    expect(onMoveInstance).toHaveBeenCalledWith('tile-edit', { x: 3, y: 2 }, 'level-1');
  });

  it('disables no-op moves to the same layer and coordinate', () => {
    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={selectedInstance}
        selectedInstanceId="tile-edit"
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Move target preview')).toHaveTextContent('Move target unchanged');
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled();
  });
});
