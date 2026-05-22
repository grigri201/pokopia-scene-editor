import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance, getCellContext } from '../../domain/scene';
import { SelectionInspector } from './SelectionInspector';

const scene = {
  ...createDefaultSceneDocument({
    sceneId: 'scene-test',
    now: '2026-05-16T07:00:00.000Z',
  }),
  tileInstances: [
    createTileInstance({
      instanceId: 'tile-edit',
      assetId: 'brick-roof-decoration',
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
  onDeleteInstance: () => undefined,
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
    expect(screen.getByLabelText('No selected grid cell')).toHaveTextContent('点击一个编辑格查看或放置素材');
    expect(screen.getByLabelText('No selected grid cell')).not.toHaveTextContent('没有选中格子');
    expect(screen.getByLabelText('No selected grid cell').querySelector('img')).toBeNull();
    expect(screen.getByLabelText('No selected grid cell')).toHaveStyle({
      '--selection-empty-image': 'url("/assets/pokopia_image_sources/pokemon_portraits/063-ditto.png")',
    });
    expectSelectionCopyRemoved('No selection', 'Choose an item or grid cell');
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

    expectSelectionCopyRemoved('3,3', 'x3 y3', 'Coordinate', 'Building layer');
    expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：耕地' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：蓄水' })).toBeDisabled();
  });

  it('ignores hover target context until a grid cell is selected', () => {
    render(
      <SelectionInspector
        {...defaultInspectorProps}
        targetContext={selectedContext}
        selectedContext={null}
        selectedInstance={null}
        selectedInstanceId={null}
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('No selected grid cell')).toHaveTextContent('点击一个编辑格查看或放置素材');
    expect(screen.getByLabelText('No selected grid cell')).not.toHaveTextContent('没有选中格子');
    expect(screen.getByLabelText('Current selection actions')).not.toHaveTextContent('2,2');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
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

    expectSelectionCopyRemoved(
      '砖瓦屋顶装饰',
      'x2 y2',
      'Coordinate',
      'Area',
      'Building layer',
      'Asset',
      'Rotation',
      'Dye',
      'Skill marker',
      'Skill note',
      '90 deg',
    );
    expect(screen.queryByRole('textbox', { name: /note/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /move/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /building layer/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '旋转 90' }));
    expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '旋转 90' })).toHaveAttribute('data-tooltip', '旋转 90');
    expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toHaveAttribute('data-tooltip', '清除素材');
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' }).querySelector('img')).not.toBeNull();
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toHaveAttribute('data-tooltip', '树叶');
    const soilSkillButton = screen.getByRole('button', { name: '设置技能标记：耕地' });
    expect(soilSkillButton).toHaveAttribute('data-tooltip', '耕地');
    expect(soilSkillButton.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/ability_icons/rototiller.png'),
    );
    expect(screen.getByRole('button', { name: '设置技能标记：蓄水' })).toHaveAttribute('data-tooltip', '储水');
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toHaveAttribute('aria-pressed', 'false');
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
    expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：耕地' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：蓄水' })).toBeDisabled();
  });

  it('labels an existing skill marker and clears the selected material through the icon action', () => {
    const onDeleteInstance = vi.fn();
    const onSaveInstanceSkill = vi.fn();
    const skillScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-skill',
          assetId: 'leafy-plant',
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
        onDeleteInstance={onDeleteInstance}
        onSaveInstanceSkill={onSaveInstanceSkill}
      />,
    );

    const skillButton = screen.getByRole('button', { name: '设置技能标记：树叶' });
    expect(skillButton).toHaveAttribute('aria-pressed', 'true');
    expectSelectionCopyRemoved('Skill marker', '树叶', 'Skill note', 'legacy note');
    fireEvent.click(skillButton);
    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-skill', false, '树叶', 'legacy note');

    fireEvent.click(screen.getByRole('button', { name: '清除选中格子中的素材' }));
    expect(onDeleteInstance).toHaveBeenCalledWith('tile-skill');
    expect(onSaveInstanceSkill).toHaveBeenCalledTimes(1);
  });

  it('shows retained selected-instance fields without note or move editors', () => {
    const richScene = {
      ...scene,
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-rich',
          assetId: 'brick-roof-decoration',
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

    expectSelectionCopyRemoved('0,2', 'outer', 'L2 2层', '砖瓦屋顶装饰', '270 deg', '#56ccf2', '耕地', 'soil roof note');
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

    const waterSkillButton = screen.getByRole('button', { name: '设置技能标记：蓄水' });
    expect(waterSkillButton.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/specialty_icons/water.png'),
    );

    fireEvent.click(waterSkillButton);

    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-edit', true, '储水', '');
  });
});

function expectSelectionCopyRemoved(...fragments: string[]): void {
  const bar = screen.getByLabelText('Current selection actions');

  expect(screen.queryByLabelText('Selected instance')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Selected coordinate')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Selection details')).not.toBeInTheDocument();

  for (const fragment of fragments) {
    expect(bar).not.toHaveTextContent(fragment);
  }
}
