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
  onRotateInstance: () => undefined,
  onSaveInstanceSkill: () => undefined,
};

describe('SelectionInspector', () => {
  it('renders the compact Open Design selection bar when nothing is selected', () => {
    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={null}
        selectedInstance={null}
        selectedInstanceId={null}
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Current selection actions')).toBeVisible();
    expect(screen.getByLabelText('Selected instance')).toHaveTextContent('No selection');
    expect(screen.getByLabelText('Selected coordinate')).toHaveTextContent('Choose an item or grid cell');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows disabled clear and skill marker buttons for an empty selected position', () => {
    const emptyContext = getCellContext(scene, { x: 3, y: 3 });

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Selected instance')).toHaveTextContent('3,3');
    expect(screen.getByRole('button', { name: '清除技能标记' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：耕地' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：蓄水' })).toBeDisabled();
  });

  it('shows selected asset context and emits compact rotate and skill marker actions', () => {
    const onRotateInstance = vi.fn();
    const onSaveInstanceSkill = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={selectedInstance}
        selectedInstanceId="tile-edit"
        readOnly={false}
        onRotateInstance={onRotateInstance}
        onSaveInstanceSkill={onSaveInstanceSkill}
      />,
    );

    expect(screen.getByLabelText('Selected instance')).toHaveTextContent('屋檐片段');
    expect(screen.getByLabelText('Selected coordinate')).toHaveTextContent('x2 y2 · L0');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Coordinate');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('2,2');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Area');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('main');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Building layer');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('L0 0 层');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Asset');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('屋檐片段');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Rotation');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('90 deg');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Dye');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('None');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Skill marker');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('None');
    expect(screen.queryByRole('textbox', { name: /note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /building layer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '旋转 90' }));
    expect(screen.getByRole('button', { name: '清除技能标记' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '旋转 90' })).toHaveAttribute('data-tooltip', '旋转 90');
    expect(screen.getByRole('button', { name: '清除技能标记' })).toHaveAttribute('data-tooltip', '清除');
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' }).querySelector('img')).not.toBeNull();
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toHaveAttribute('data-tooltip', '树叶');
    expect(screen.getByRole('button', { name: '设置技能标记：耕地' })).toHaveAttribute('data-tooltip', '耕地');
    expect(screen.getByRole('button', { name: '设置技能标记：蓄水' })).toHaveAttribute('data-tooltip', '储水');
    fireEvent.click(screen.getByRole('button', { name: '设置技能标记：树叶' }));

    expect(onRotateInstance).toHaveBeenCalledWith('tile-edit', 180);
    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-edit', true, '树叶', '');
  });

  it('keeps compact edit actions disabled in read-only mode', () => {
    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={selectedInstance}
        selectedInstanceId="tile-edit"
        readOnly
      />,
    );

    expect(screen.getByRole('button', { name: '旋转 90' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '清除技能标记' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：耕地' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：蓄水' })).toBeDisabled();
  });

  it('labels an existing skill marker and clears it through the icon action', () => {
    const onSaveInstanceSkill = vi.fn();
    const skillScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-skill',
          assetId: 'garden-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
          requiresSkill: true,
          skillType: '树叶',
          skillNote: 'legacy note',
        }),
      ],
    };
    const skillContext = getCellContext(skillScene, { x: 2, y: 2 });

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={skillContext}
        selectedInstance={skillContext.tileInstances[0]}
        selectedInstanceId="tile-skill"
        readOnly={false}
        onSaveInstanceSkill={onSaveInstanceSkill}
      />,
    );

    const skillButton = screen.getByRole('button', { name: '设置技能标记：树叶' });
    expect(skillButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Skill marker');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('树叶');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('Skill note');
    expect(screen.getByLabelText('Selection details')).toHaveTextContent('legacy note');
    fireEvent.click(screen.getByRole('button', { name: '清除技能标记' }));
    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-skill', false, '树叶', 'legacy note');
  });

  it('shows retained selected-instance fields without note or move editors', () => {
    const richScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-rich',
          assetId: 'roof-tile',
          coordinate: { x: 0, y: 2 },
          buildingLevelId: 'level-2',
          rotationDegrees: 270,
          dyeColor: '#56ccf2',
          requiresSkill: true,
          skillType: '耕地',
          skillNote: 'soil roof note',
        }),
      ],
    };
    const richContext = getCellContext(richScene, { x: 0, y: 2 }, 'level-2');

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={richContext}
        selectedInstance={richContext.tileInstances[0]}
        selectedInstanceId="tile-rich"
        buildingLevels={richScene.buildingLevels}
        tileInstances={richScene.tileInstances}
        readOnly={false}
      />,
    );

    const details = screen.getByLabelText('Selection details');
    expect(details).toHaveTextContent('0,2');
    expect(details).toHaveTextContent('outer');
    expect(details).toHaveTextContent('L2 2 层');
    expect(details).toHaveTextContent('屋檐片段');
    expect(details).toHaveTextContent('270 deg');
    expect(details).toHaveTextContent('#56ccf2');
    expect(details).toHaveTextContent('耕地');
    expect(details).toHaveTextContent('soil roof note');
    expect(screen.queryByRole('textbox', { name: /note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /building layer/i })).not.toBeInTheDocument();
  });

  it('uses the water skill icon button to save the canonical 储水 skill type', () => {
    const onSaveInstanceSkill = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={selectedInstance}
        selectedInstanceId="tile-edit"
        readOnly={false}
        onSaveInstanceSkill={onSaveInstanceSkill}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '设置技能标记：蓄水' }));

    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-edit', true, '储水', '');
  });
});
