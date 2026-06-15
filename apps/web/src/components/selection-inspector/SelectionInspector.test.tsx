import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildSceneOccupancy,
  createBuildingLevel,
  createDefaultSceneDocument,
  createStackingPlateFoodScene,
  createTileInstance,
  getCellContext,
} from '@pokopia-scene-editor/scene-core';
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
  stackingRelations: [],
  selectedSkillMarker: null,
  canvasSize: scene.canvasSize,
  sceneDimensions,
  buildingLevels: scene.buildingLevels,
  currentBuildingLevel: scene.buildingLevels[0],
  tileInstances: scene.tileInstances,
  onSelectInstance: () => undefined,
  onDeleteInstance: () => undefined,
  onRotateInstance: () => undefined,
  onSaveInstanceSkill: () => undefined,
  onSaveCellSkill: () => undefined,
  onAddLayerNote: () => true,
  onUpdateLayerNote: () => true,
  onDeleteLayerNote: () => true,
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
    expect(screen.queryByRole('button', { name: '展开详情' })).not.toBeInTheDocument();
    expect(document.querySelector('.selection-details-panel')).toBeNull();
    expectLayerNotesPanelVisible();
    expect(screen.getByRole('heading', { name: '当前层备注' })).toBeVisible();
    expect(screen.getByLabelText('新增当前层备注')).toBeVisible();
    expect(screen.getByRole('button', { name: '添加备注' })).toBeDisabled();
    expectSelectionCopyRemoved('No selection', 'Choose an item or grid cell');
  });

  it('adds current layer notes without requiring a selected grid cell', () => {
    const onAddLayerNote = vi.fn(() => true);

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={null}
        selectedInstance={null}
        selectedInstanceId={null}
        readOnly={false}
        onAddLayerNote={onAddLayerNote}
      />,
    );

    expectLayerNotesPanelVisible();
    fireEvent.change(screen.getByLabelText('新增当前层备注'), { target: { value: '无需选中格' } });
    fireEvent.click(screen.getByRole('button', { name: '添加备注' }));

    expect(onAddLayerNote).toHaveBeenCalledWith('level-0', '无需选中格');
  });

  it('allows skill marker buttons for an empty selected position', () => {
    const emptyContext = getCellContext(scene, { x: 3, y: 3 });
    const onSaveCellSkill = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={null}
        readOnly={false}
        onSaveCellSkill={onSaveCellSkill}
      />,
    );

    expectSelectionCopyRemoved('Coordinate', 'Building layer');
    expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '设置技能标记：耕地' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '设置技能标记：蓄水' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '设置技能标记：耕地' }));

    expect(onSaveCellSkill).toHaveBeenCalledWith({ x: 3, y: 3 }, 'level-0', true, '耕地', '');
  });

  it('shows layer note input and ordered safe-text notes for an empty selected position', () => {
    const noteScene = {
      ...scene,
      buildingLevels: [
        {
          ...scene.buildingLevels[0],
          notes: [
            { id: 'note-1', text: '<b>先放桌子</b>' },
            { id: 'note-2', text: '再放椅子' },
          ],
        },
      ],
    };
    const emptyContext = getCellContext(noteScene, { x: 3, y: 3 });
    const onAddLayerNote = vi.fn();
    const { container } = render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={null}
        buildingLevels={noteScene.buildingLevels}
        currentBuildingLevel={noteScene.buildingLevels[0]}
        readOnly={false}
        onAddLayerNote={onAddLayerNote}
      />,
    );

    expectLayerNotesPanelVisible();
    expect(screen.getByRole('heading', { name: '当前层备注' })).toBeVisible();
    expect(screen.getByLabelText('当前层备注列表')).toHaveTextContent('<b>先放桌子</b>');
    expect(screen.getByLabelText('当前层备注列表')).toHaveTextContent('再放椅子');
    expect(container.querySelector('b')).toBeNull();

    fireEvent.change(screen.getByLabelText('新增当前层备注'), { target: { value: '  保留空格  ' } });
    fireEvent.click(screen.getByRole('button', { name: '添加备注' }));

    expect(onAddLayerNote).toHaveBeenCalledWith('level-0', '  保留空格  ');
  });

  it('edits and deletes existing layer notes in edit mode', () => {
    const noteScene = {
      ...scene,
      buildingLevels: [
        {
          ...scene.buildingLevels[0],
          notes: [
            { id: 'note-1', text: '第一条' },
            { id: 'note-2', text: '第二条' },
          ],
        },
      ],
    };
    const emptyContext = getCellContext(noteScene, { x: 3, y: 3 });
    const onUpdateLayerNote = vi.fn();
    const onDeleteLayerNote = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={null}
        buildingLevels={noteScene.buildingLevels}
        currentBuildingLevel={noteScene.buildingLevels[0]}
        readOnly={false}
        onUpdateLayerNote={onUpdateLayerNote}
        onDeleteLayerNote={onDeleteLayerNote}
      />,
    );

    expectLayerNotesPanelVisible();
    fireEvent.click(screen.getByRole('button', { name: '编辑第 1 条备注' }));
    fireEvent.change(screen.getByLabelText('编辑第 1 条当前层备注'), { target: { value: '第一条更新' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    const deleteButton = screen.getByRole('button', { name: '删除第 2 条备注' });
    expect(deleteButton.querySelector('svg')).not.toBeNull();
    expect(deleteButton).not.toHaveTextContent('删除');
    fireEvent.click(deleteButton);

    expect(onUpdateLayerNote).toHaveBeenCalledWith('level-0', 'note-1', '第一条更新');
    expect(onDeleteLayerNote).toHaveBeenCalledWith('level-0', 'note-2');
  });

  it('shows layer notes with disabled mutation controls in read-only mode', () => {
    const noteScene = {
      ...scene,
      buildingLevels: [
        {
          ...scene.buildingLevels[0],
          notes: [{ id: 'note-readonly', text: '只能查看' }],
        },
      ],
    };
    const emptyContext = getCellContext(noteScene, { x: 3, y: 3 });

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={null}
        buildingLevels={noteScene.buildingLevels}
        currentBuildingLevel={noteScene.buildingLevels[0]}
        readOnly
      />,
    );

    expectLayerNotesPanelVisible();
    expect(screen.getByText('只能查看')).toBeVisible();
    expect(screen.getByText('只读')).toBeVisible();
    expect(screen.getByLabelText('新增当前层备注')).toBeDisabled();
    expect(screen.getByRole('button', { name: '添加备注' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '编辑第 1 条备注' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除第 1 条备注' })).toBeDisabled();
  });

  it('shows current layer notes in read-only mode even when no coordinate is selected', () => {
    const noteScene = {
      ...scene,
      buildingLevels: [
        {
          ...scene.buildingLevels[0],
          notes: [{ id: 'note-current-layer', text: '当前层只读备注' }],
        },
      ],
    };

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={null}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={null}
        buildingLevels={noteScene.buildingLevels}
        currentBuildingLevel={noteScene.buildingLevels[0]}
        readOnly
      />,
    );

    expectLayerNotesPanelVisible();
    expect(screen.getByLabelText('No selected grid cell')).toBeVisible();
    expect(screen.getByText('当前层只读备注')).toBeVisible();
    expect(screen.getByLabelText('新增当前层备注')).toBeDisabled();
    expect(screen.getByRole('button', { name: '添加备注' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '编辑第 1 条备注' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '删除第 1 条备注' })).toBeDisabled();
  });

  it('keeps note drafts when parent mutation callbacks fail', () => {
    const emptyContext = getCellContext(scene, { x: 3, y: 3 });
    const onAddLayerNote = vi.fn(() => false);

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={null}
        readOnly={false}
        onAddLayerNote={onAddLayerNote}
      />,
    );

    expectLayerNotesPanelVisible();
    fireEvent.change(screen.getByLabelText('新增当前层备注'), { target: { value: '失败时保留' } });
    fireEvent.click(screen.getByRole('button', { name: '添加备注' }));

    expect(onAddLayerNote).toHaveBeenCalledWith('level-0', '失败时保留');
    expect(screen.getByLabelText('新增当前层备注')).toHaveValue('失败时保留');
  });

  it('keeps unsaved layer-note drafts in the always-visible notes panel', () => {
    const emptyContext = getCellContext(scene, { x: 3, y: 3 });

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={null}
        readOnly={false}
      />,
    );

    expectLayerNotesPanelVisible();
    fireEvent.change(screen.getByLabelText('新增当前层备注'), { target: { value: '折叠后仍保留' } });
    expect(screen.queryByRole('button', { name: '收起详情' })).not.toBeInTheDocument();
    expect(document.querySelector('.selection-details-panel')).toBeNull();
    expect(screen.getByLabelText('新增当前层备注')).toHaveValue('折叠后仍保留');
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
    expectLayerNotesPanelVisible();
    expect(screen.getByLabelText('新增当前层备注')).toBeVisible();
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
      'Coordinate',
      'Area',
      'Building layer',
      'Asset',
      'Rotation',
      'Dye',
      'Skill marker',
      'Skill note',
    );
    const compactBar = screen.getByLabelText('Current selection actions');
    expect(within(compactBar).getByText('x2 y2')).toBeVisible();
    expect(within(compactBar).getByText('L1')).toBeVisible();
    expect(within(compactBar).getByText('90 deg')).toBeVisible();
    expect(within(compactBar).getByText('屋顶装饰')).toBeVisible();
    expectLayerNotesPanelVisible();
    expect(screen.queryByLabelText(/选择详情|Selection details/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '实例详情' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '当前层备注' })).toBeVisible();
    expect(screen.getByLabelText('新增当前层备注')).toBeVisible();
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
    const vineSkillButton = screen.getByRole('button', { name: '设置技能标记：缠绕蔓藤' });
    expect(vineSkillButton).toHaveAttribute('data-tooltip', '缠绕蔓藤');
    expect(vineSkillButton.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/item_portraits/0126-dense-vines.png'),
    );
    expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: '设置技能标记：树叶' }));

    expect(onRotateInstance).toHaveBeenCalledWith('tile-edit', 180);
    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-edit', true, '树叶', '');
  });

  it('labels an unresolved selected asset by asset id instead of empty-cell copy', () => {
    const missingAssetInstance = createTileInstance({
      instanceId: 'tile-missing-asset',
      assetId: 'missing-asset-id',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-0',
    });

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={selectedContext}
        selectedInstance={missingAssetInstance}
        selectedInstanceId="tile-missing-asset"
        readOnly={false}
      />,
    );

    expect(screen.getByLabelText('Current selection actions')).toHaveTextContent('missing-asset-id');
    expect(screen.getByLabelText('Current selection actions')).not.toHaveTextContent('空格');
    expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toBeEnabled();
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

  it('shows and clears an existing standalone cell skill marker', () => {
    const emptyContext = getCellContext(scene, { x: 3, y: 3 });
    const onSaveCellSkill = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={emptyContext}
        selectedInstance={null}
        selectedInstanceId={null}
        selectedSkillMarker={{
          coordinate: { x: 3, y: 3 },
          areaType: 'main',
          buildingLevelId: 'level-0',
          skillType: '耕地',
          skillNote: '',
        }}
        readOnly={false}
        onSaveCellSkill={onSaveCellSkill}
      />,
    );

    const soilSkillButton = screen.getByRole('button', { name: '设置技能标记：耕地' });
    expect(soilSkillButton).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(soilSkillButton);

    expect(onSaveCellSkill).toHaveBeenCalledWith({ x: 3, y: 3 }, 'level-0', false, '耕地', '');
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
    expectLayerNotesPanelVisible();
    expect(screen.queryByLabelText(/选择详情|Selection details/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '当前层备注' })).toBeVisible();
    fireEvent.click(skillButton);
    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-skill', false, '树叶', 'legacy note');

    fireEvent.click(screen.getByRole('button', { name: '清除选中格子中的素材' }));
    expect(onDeleteInstance).toHaveBeenCalledWith('tile-skill');
    expect(onSaveInstanceSkill).toHaveBeenCalledTimes(1);
  });

  it('exposes the other stacked instance as a selectable compact chip', () => {
    const stackingScene = createStackingPlateFoodScene();
    const stackingContext = getCellContext(stackingScene, { x: 2, y: 2 });
    const onSelectInstance = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={stackingContext}
        selectedInstance={stackingContext.tileInstances[1]}
        selectedInstanceId="stacking-top-food"
        stackingRelations={buildSceneOccupancy(stackingScene).stackingRelations}
        buildingLevels={stackingScene.buildingLevels}
        tileInstances={stackingScene.tileInstances}
        readOnly={false}
        onSelectInstance={onSelectInstance}
      />,
    );

    const baseChip = screen.getByRole('button', { name: 'Stack base: 盘子' });

    expect(screen.getByLabelText('Stacking relation')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Stack top: 苹野果' })).not.toBeInTheDocument();
    expect(baseChip).toHaveAttribute('aria-pressed', 'false');
    expect(baseChip).toHaveAttribute('data-tooltip', 'Stack base: 盘子');
    expect(baseChip).toHaveAttribute('title', 'Stack base: 盘子');
    expect(baseChip).toHaveAttribute('data-instance-id', 'stacking-base-plate');

    fireEvent.click(baseChip);

    expect(onSelectInstance).toHaveBeenCalledWith('stacking-base-plate');
    expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toBeEnabled();
  });

  it('does not duplicate the selected base instance in the stack chips', () => {
    const rugStackingScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-small-round-rug',
          assetId: 'small-round-rug',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-leppa-berry',
          assetId: 'leppa-berry',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const stackingContext = getCellContext(rugStackingScene, { x: 2, y: 2 });
    const onSelectInstance = vi.fn();

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={stackingContext}
        selectedInstance={rugStackingScene.tileInstances[0]}
        selectedInstanceId="tile-small-round-rug"
        stackingRelations={buildSceneOccupancy(rugStackingScene).stackingRelations}
        buildingLevels={rugStackingScene.buildingLevels}
        tileInstances={rugStackingScene.tileInstances}
        readOnly={false}
        onSelectInstance={onSelectInstance}
      />,
    );

    const topChip = screen.getByRole('button', { name: 'Stack top: 苹野果' });

    expect(screen.getByLabelText('Stacking relation')).toBeVisible();
    expect(topChip).toHaveAttribute('data-tooltip', 'Stack top: 苹野果');
    expect(topChip).toHaveAttribute('data-instance-id', 'tile-leppa-berry');
    expect(topChip).toHaveAttribute('data-asset-id', 'leppa-berry');
    expect(screen.queryByRole('button', { name: 'Stack base: 小圆地毯' })).not.toBeInTheDocument();

    fireEvent.click(topChip);

    expect(onSelectInstance).toHaveBeenCalledWith('tile-leppa-berry');
  });

  it('hides the stacked base chip when the base structure is hidden for a smaller top item', () => {
    const rugStackingScene = {
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
    const stackingContext = getCellContext(rugStackingScene, { x: 2, y: 5 });
    const selectedTopInstance = rugStackingScene.tileInstances[1];

    render(
      <SelectionInspector
        {...defaultInspectorProps}
        selectedContext={stackingContext}
        selectedInstance={selectedTopInstance}
        selectedInstanceId="tile-big-storage-box"
        stackingRelations={buildSceneOccupancy(rugStackingScene).stackingRelations}
        buildingLevels={rugStackingScene.buildingLevels}
        tileInstances={rugStackingScene.tileInstances}
        readOnly={false}
      />,
    );

    expect(screen.queryByLabelText('Stacking relation')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stack top: 大型收纳箱' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stack base: 大圆地毯' })).not.toBeInTheDocument();
  });

  it('shows retained selected-instance fields without move editors while keeping current layer notes', () => {
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
        currentBuildingLevel={richScene.buildingLevels[2]}
        tileInstances={richScene.tileInstances}
        readOnly={false}
      />,
    );

    expectSelectionCopyRemoved('outer', 'L3 3层', '#56ccf2', '耕地', 'soil roof note');
    expect(within(screen.getByLabelText('Current selection actions')).getByText('屋顶装饰')).toBeVisible();
    expectLayerNotesPanelVisible();
    expect(screen.queryByLabelText(/选择详情|Selection details/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '当前层备注' })).toBeVisible();
    expect(screen.getByLabelText('新增当前层备注')).toBeVisible();
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

  it('uses the vine skill icon button to save the canonical 缠绕蔓藤 skill type', () => {
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

    const vineSkillButton = screen.getByRole('button', { name: '设置技能标记：缠绕蔓藤' });
    expect(vineSkillButton.querySelector('img')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/item_portraits/0126-dense-vines.png'),
    );

    fireEvent.click(vineSkillButton);

    expect(onSaveInstanceSkill).toHaveBeenCalledWith('tile-edit', true, '缠绕蔓藤', '');
  });
});

function expectSelectionCopyRemoved(...fragments: string[]): void {
  const bar = screen.getByLabelText('Current selection actions');

  expect(screen.queryByLabelText('Selected instance')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Selected coordinate')).not.toBeInTheDocument();

  for (const fragment of fragments) {
    expect(bar).not.toHaveTextContent(fragment);
  }
}

function expectLayerNotesPanelVisible(): HTMLElement {
  expect(screen.queryByRole('button', { name: '展开详情' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '收起详情' })).not.toBeInTheDocument();
  expect(document.querySelector('.selection-details-panel')).toBeNull();

  const panel = screen.getByLabelText('当前层备注');
  expect(panel).toBeVisible();

  return panel;
}
