import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assetCatalog, assetPageSize } from '@pokopia-scene-editor/scene-core';
import {
  assetStagingPreferencesStorageKey,
  readAssetStagingPreferencesFromStorage,
  readUiPreferencesFromStorage,
  uiPreferencesStorageKey,
} from '../../io';
import { AssetPicker } from './AssetPicker';

const totalAssetCount = assetCatalog.length;
const totalAssetPages = Math.ceil(totalAssetCount / assetPageSize);

describe('AssetPicker', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('renders the compact Open Design catalog without a separate current asset box', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="pecha-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    const emptyStaging = screen.getByLabelText('素材暂存区');
    expect(emptyStaging).toHaveClass('asset-staging--empty');
    expect(within(emptyStaging).getByText('拖动素材放进背包')).toBeVisible();
    expect(within(emptyStaging).queryByRole('heading', { name: '素材暂存区' })).not.toBeInTheDocument();
    expect(within(emptyStaging).queryByLabelText('素材暂存数量')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '展开素材暂存区' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '素材' })).toBeVisible();
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent(`${totalAssetCount} results`);
    expect(screen.getByLabelText('Asset page status')).toHaveTextContent(`1 / ${totalAssetPages}`);
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.queryByText(/Showing first/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Current placement asset')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('待放置素材控制')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '旋转待放置素材 90 度' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清除筛选' })).not.toBeInTheDocument();
    expect(getAssetSelectButton('pecha-berry')).toHaveAttribute('aria-pressed', 'true');
    expect(getAssetRow('pecha-berry')).toHaveAttribute('data-selection-mode', 'single');
    expect(getAssetRow('pecha-berry')).not.toHaveClass('asset-row--continuous');
    expect(getAssetSelectButton('pecha-berry')).not.toHaveTextContent('No.');
    expect(getAssetSelectButton('pecha-berry')).toHaveTextContent('桃桃果');
    expect(getAssetSelectButton('pecha-berry')).not.toHaveTextContent('Pecha Berry');
    expect(getAssetSelectButton('pecha-berry')).toHaveTextContent('食物');
    expect(getAssetSelectButton('pecha-berry')).not.toHaveTextContent('食物 · 食物');
    expect(
      within(screen.getByRole('group', { name: 'Asset category filters' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['全部', '建筑', '家具', '功能', '户外', '自然', '食物', '材料', '地块', '杂项', '其他']);
    expect(screen.getByRole('button', { name: '查看桃桃果详情' })).toBeVisible();
    expect(screen.getByRole('button', { name: '查看桃桃果详情' })).toHaveTextContent('详情');
    expect(screen.queryByLabelText('桃桃果 asset detail')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset advanced filters')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset area filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset skill filter')).not.toBeInTheDocument();
  }, 15_000);

  it('paginates the catalog with 10 assets per page', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.getByLabelText('Asset page status')).toHaveTextContent(`1 / ${totalAssetPages}`);
    expect(screen.getByLabelText('Previous asset page')).toBeDisabled();
    expect(screen.getByLabelText('Next asset page')).toBeEnabled();

    fireEvent.click(screen.getByLabelText('Next asset page'));

    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.getByLabelText('Asset page status')).toHaveTextContent(`2 / ${totalAssetPages}`);
    expect(screen.getByLabelText('Previous asset page')).toBeEnabled();
    expect(queryAssetSelectButton('wooden-fencing')).toBeNull();
    expect(queryAssetSelectButton('sturdy-stick')).toBeNull();
  }, 15_000);

  it('selects assets by mouse, Enter, Space, and arrow-key focus', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    const pechaBerry = getAssetSelectButton('pecha-berry');
    const lumBerry = getAssetSelectButton('lum-berry');

    fireEvent.click(pechaBerry);
    fireEvent.keyDown(pechaBerry, { key: 'ArrowDown' });
    expect(lumBerry).toHaveFocus();
    fireEvent.keyDown(lumBerry, { key: 'Enter' });
    fireEvent.keyDown(lumBerry, { key: ' ' });

    expect(onAssetSelect).toHaveBeenCalledWith('pecha-berry', 'single');
    expect(onAssetSelect).toHaveBeenCalledWith('lum-berry', 'single');
    expect(onAssetSelect).toHaveBeenCalledTimes(3);
  });

  it('selects continuous placement mode when an asset is double-clicked', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    fireEvent.doubleClick(getAssetSelectButton('pecha-berry'));

    expect(onAssetSelect).toHaveBeenLastCalledWith('pecha-berry', 'continuous');
  });

  it('shows a pre-placement rotate button for non-1x1 assets only', () => {
    const onPlacementRotationChange = vi.fn();

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="wooden-bench"
        placementRotationDegrees={90}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onPlacementRotationChange={onPlacementRotationChange}
        onAssetSelect={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '木长椅' } });

    const rotateButton = screen.getByRole('button', { name: '旋转待放置素材 90 度：木长椅' });
    expect(rotateButton).toHaveAttribute('aria-pressed', 'true');
    expect(rotateButton).toHaveAttribute('data-rotation', '90');

    fireEvent.click(within(getAssetRow('wooden-bench')).getByRole('button', { name: '查看木长椅详情' }));
    expect(screen.getByLabelText('木长椅 asset detail')).toHaveTextContent('可放在兼容承载面上');
    expect(screen.getByLabelText('木长椅 asset detail')).toHaveTextContent('90 deg');

    fireEvent.click(rotateButton);

    expect(onPlacementRotationChange).toHaveBeenCalledWith('wooden-bench');

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '苹野果' } });

    expect(screen.queryByRole('button', { name: /旋转待放置素材/ })).not.toBeInTheDocument();
  });

  it('renders continuous asset selection differently from single selection', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="pecha-berry"
        selectedAssetMode="continuous"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    const selectedRow = getAssetRow('pecha-berry');
    expect(selectedRow).toHaveAttribute('data-selection-mode', 'continuous');
    expect(selectedRow).toHaveClass('asset-row--selected');
    expect(selectedRow).toHaveClass('asset-row--continuous');
  });

  it('opens asset detail without selecting the placement asset', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="pecha-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '查看苹野果详情' }));

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('pecha-berry')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('leppa-berry');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('官方编号');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('占用');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('1x1x1');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('可旋转');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('否');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('可染色');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('叠放规则');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('可放在兼容承载面上');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('待放置旋转');
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('0 deg');
    expect(within(screen.getByLabelText('苹野果 asset detail')).getByAltText('苹野果缩略图')).toBeInTheDocument();
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBeNull();
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(screen.queryByLabelText('苹野果 asset detail')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'plate' } });
    fireEvent.click(within(getAssetRow('plate')).getByRole('button', { name: /详情$/ }));
    expect(screen.getByLabelText(/asset detail$/)).toHaveTextContent('食物 承载面');
    expect(screen.getByLabelText(/asset detail$/)).not.toHaveTextContent('food-surface');
  });

  it('enables the placement skill toggle for any selected asset only', () => {
    const onPlacementRequiresSkillChange = vi.fn();
    const { rerender } = render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill
        onPlacementRequiresSkillChange={onPlacementRequiresSkillChange}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Requires Ditto skill')).toBeDisabled();
    expect(screen.getByLabelText('Requires Ditto skill')).not.toBeChecked();

    rerender(
      <AssetPicker
        readOnly={false}
        selectedAssetId="pecha-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={onPlacementRequiresSkillChange}
        onAssetSelect={() => undefined}
      />,
    );

    const skillToggle = screen.getByLabelText('Requires Ditto skill');
    expect(skillToggle).toBeEnabled();
    fireEvent.click(skillToggle);
    expect(onPlacementRequiresSkillChange).toHaveBeenCalledWith(true);
  });

  it('filters by search query without the removed favorite-only toggle', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="eevee"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.queryByLabelText('Show favorite assets')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '木长椅' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1 results');
    expect(getAssetSelectButton('wooden-bench')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'wooden-bench' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1 results');
    expect(getAssetSelectButton('wooden-bench')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'Leppa Berry' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1 results');
    expect(getAssetSelectButton('leppa-berry')).toHaveTextContent('苹野果');

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '苹野果' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1 results');
    expect(getAssetSelectButton('leppa-berry')).toBeVisible();
  });

  it('persists compact query and category filters separately from scene state', () => {
    const { unmount } = render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="eevee"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '屋顶' } });
    fireEvent.click(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: '建筑' }));

    expect(screen.queryByLabelText('Show favorite assets')).not.toBeInTheDocument();
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toEqual({
      query: '屋顶',
      category: 'buildings',
      favoriteOnly: false,
    });

    unmount();
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="eevee"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Search assets')).toHaveValue('屋顶');
    expect(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: '建筑' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('Show favorite assets')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset area filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset skill filter')).not.toBeInTheDocument();
  });

  it('stages dragged assets in collapsed mode with dedupe, recent-three display, delete, and select', () => {
    const onAssetSelect = vi.fn();
    const stagedAssetIds = assetCatalog.slice(0, 4).map((asset) => asset.assetId);

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    for (const assetId of stagedAssetIds) {
      dragAssetToStaging(assetId);
    }

    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      stagedAssetIds: [...stagedAssetIds].reverse(),
      expanded: false,
    });
    expect(screen.getByLabelText('素材暂存数量')).toHaveTextContent('4');
    expect(getCollapsedStagedAssetIds()).toEqual([
      stagedAssetIds[3],
      stagedAssetIds[2],
      stagedAssetIds[1],
    ]);

    dragAssetToStaging(stagedAssetIds[1]);

    expect(readAssetStagingPreferencesFromStorage(window.localStorage).stagedAssetIds).toEqual([
      stagedAssetIds[1],
      stagedAssetIds[3],
      stagedAssetIds[2],
      stagedAssetIds[0],
    ]);
    expect(getCollapsedStagedAssetIds()).toEqual([
      stagedAssetIds[1],
      stagedAssetIds[3],
      stagedAssetIds[2],
    ]);

    onAssetSelect.mockClear();
    fireEvent.click(getCollapsedStagedCard(stagedAssetIds[3]).querySelector<HTMLButtonElement>('.asset-staging-card__remove')!);
    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(readAssetStagingPreferencesFromStorage(window.localStorage).stagedAssetIds).toEqual([
      stagedAssetIds[1],
      stagedAssetIds[2],
      stagedAssetIds[0],
    ]);

    fireEvent.click(getCollapsedStagedCard(stagedAssetIds[1]).querySelector<HTMLButtonElement>('.asset-staging-card__select')!);
    expect(onAssetSelect).toHaveBeenCalledWith(stagedAssetIds[1], 'single');
  });

  it('expands staged assets with shared row selection state, continuous selection, rotation, and persistence', () => {
    const onAssetSelect = vi.fn();
    const onPlacementRotationChange = vi.fn();
    window.localStorage.setItem(
      assetStagingPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        stagedAssetIds: ['missing-asset', 'wooden-bench', 'pecha-berry', 'wooden-bench'],
        expanded: false,
      }),
    );

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="wooden-bench"
        selectedAssetMode="continuous"
        placementRotationDegrees={90}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onPlacementRotationChange={onPlacementRotationChange}
        onAssetSelect={onAssetSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '展开素材暂存区' }));

    expect(screen.getByLabelText('素材暂存区')).toHaveClass('asset-staging--expanded');
    expect(document.querySelector('.asset-sidebar')).toHaveClass('asset-sidebar--staging-expanded');
    expect(screen.getByRole('complementary', { name: 'Asset picker' })).not.toContainElement(screen.getByLabelText('素材暂存区'));
    expect(screen.getByRole('complementary', { name: 'Asset picker' })).toHaveTextContent(/素材/);
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent(/\d+ results/);
    expect(document.querySelector('.asset-catalog-panel')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Search assets')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset results')).not.toBeInTheDocument();
    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      stagedAssetIds: ['wooden-bench', 'pecha-berry'],
      expanded: true,
    });

    const benchRow = getExpandedStagedRow('wooden-bench');
    expect(screen.getByLabelText('全部暂存素材')).toHaveClass('asset-staging__list');
    expect(screen.getByLabelText('全部暂存素材')).toHaveAttribute('data-asset-list', 'staging');
    expect(benchRow).toHaveAttribute('data-selection-mode', 'continuous');
    expect(benchRow).toHaveAttribute('data-placement-rotation', '90');
    expect(benchRow).toHaveClass('asset-row--selected');
    expect(benchRow).toHaveClass('asset-row--continuous');

    fireEvent.click(within(benchRow).getByRole('button', { name: '旋转待放置素材 90 度：木长椅' }));
    expect(onPlacementRotationChange).toHaveBeenCalledWith('wooden-bench');

    fireEvent.doubleClick(getExpandedStagedRow('pecha-berry').querySelector<HTMLButtonElement>('.asset-select-button')!);
    expect(onAssetSelect).toHaveBeenLastCalledWith('pecha-berry', 'continuous');

    fireEvent.click(getExpandedStagedRow('pecha-berry').querySelector<HTMLButtonElement>('.asset-staging-row__remove')!);
    expect(readAssetStagingPreferencesFromStorage(window.localStorage).stagedAssetIds).toEqual(['wooden-bench']);

    fireEvent.click(screen.getByRole('button', { name: '收起素材暂存区' }));
    expect(readAssetStagingPreferencesFromStorage(window.localStorage).expanded).toBe(false);
  }, 15_000);

  it('restores UI-written staging order and expanded state after remount while filtering unknown assets', () => {
    const stagedAssetIds = assetCatalog.slice(0, 2).map((asset) => asset.assetId);
    const { unmount } = render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    dragAssetToStaging(stagedAssetIds[0]);
    dragAssetToStaging(stagedAssetIds[1]);
    fireEvent.click(screen.getByRole('button', { name: '展开素材暂存区' }));
    unmount();
    window.localStorage.setItem(
      assetStagingPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        stagedAssetIds: ['missing-asset', stagedAssetIds[1], stagedAssetIds[0], stagedAssetIds[1]],
        expanded: true,
      }),
    );

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getByLabelText('素材暂存区')).toHaveClass('asset-staging--expanded');
    expect(getExpandedStagedAssetIds()).toEqual([stagedAssetIds[1], stagedAssetIds[0]]);
    expect(readAssetStagingPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      stagedAssetIds: [stagedAssetIds[1], stagedAssetIds[0]],
      expanded: true,
    });
  });

  it('ignores external text drops and unknown custom asset payloads', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    const textOnlyTransfer = createDataTransferDouble();
    textOnlyTransfer.setData('text/plain', 'pecha-berry');
    fireEvent.dragOver(screen.getByLabelText('素材暂存区'), { dataTransfer: textOnlyTransfer });
    fireEvent.drop(screen.getByLabelText('素材暂存区'), { dataTransfer: textOnlyTransfer });
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).toBeNull();

    const unknownCustomTransfer = createDataTransferDouble();
    unknownCustomTransfer.setData('application/x-pokopia-asset-id', 'missing-asset');
    fireEvent.dragOver(screen.getByLabelText('素材暂存区'), { dataTransfer: unknownCustomTransfer });
    fireEvent.drop(screen.getByLabelText('素材暂存区'), { dataTransfer: unknownCustomTransfer });
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).toBeNull();
  });

  it('guards staging writes and callbacks in read-only mode without normalizing stored staging data', () => {
    const onAssetSelect = vi.fn();
    const rawStagingPreferences = JSON.stringify({
      schemaVersion: 1,
      stagedAssetIds: ['missing-asset', 'pecha-berry', 'pecha-berry'],
      expanded: false,
    });
    window.localStorage.setItem(assetStagingPreferencesStorageKey, rawStagingPreferences);

    render(
      <AssetPicker
        readOnly
        selectedAssetId="pecha-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    expect(getCollapsedStagedAssetIds()).toEqual(['pecha-berry']);
    fireEvent.click(getCollapsedStagedCard('pecha-berry').querySelector<HTMLButtonElement>('.asset-staging-card__select')!);
    fireEvent.click(getCollapsedStagedCard('pecha-berry').querySelector<HTMLButtonElement>('.asset-staging-card__remove')!);
    dragAssetToStaging(assetCatalog[1].assetId, { expectDragImage: false });

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).toBe(rawStagingPreferences);
  }, 15_000);

  it('disables expanded staged rows in read-only mode without normalizing stored staging data', () => {
    const onAssetSelect = vi.fn();
    const rawStagingPreferences = JSON.stringify({
      schemaVersion: 1,
      stagedAssetIds: ['missing-asset', 'wooden-bench', 'wooden-bench'],
      expanded: true,
    });
    window.localStorage.setItem(assetStagingPreferencesStorageKey, rawStagingPreferences);

    render(
      <AssetPicker
        readOnly
        selectedAssetId="wooden-bench"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    expect(screen.getByLabelText('素材暂存区')).toHaveClass('asset-staging--expanded');
    expect(getExpandedStagedRow('wooden-bench').querySelector<HTMLButtonElement>('.asset-select-button')).toBeDisabled();
    expect(getExpandedStagedRow('wooden-bench').querySelector<HTMLButtonElement>('.asset-rotate-button')).toBeDisabled();
    expect(getExpandedStagedRow('wooden-bench').querySelector<HTMLButtonElement>('.asset-staging-row__remove')).toBeDisabled();
    expect(window.localStorage.getItem(assetStagingPreferencesStorageKey)).toBe(rawStagingPreferences);
    expect(onAssetSelect).not.toHaveBeenCalled();
  }, 15_000);

  it('drops restored legacy area and skill filters from UI preferences', () => {
    window.localStorage.setItem(
      uiPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        assetFilters: {
          query: '',
          category: 'all',
          area: 'outer',
          favoriteOnly: false,
          skill: '树叶',
        },
      }),
    );

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.queryByLabelText('Asset advanced filters')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset area filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset skill filter')).not.toBeInTheDocument();
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toEqual({
      query: '',
      category: 'all',
      favoriteOnly: false,
    });
  });

  it('shows an empty state without recovery actions for unmatched filters', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'missing' } });

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('0 results');
    expect(screen.getByLabelText('No matching assets')).toBeVisible();
    expect(screen.getByText('No assets match the current filters.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('does not offer empty-state recovery actions', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'missing asset' } });
    fireEvent.click(screen.getByRole('button', { name: '建筑' }));

    expect(screen.getByLabelText('No matching assets')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Disable favorite' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All categories' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset filters' })).not.toBeInTheDocument();
  });

  it('keeps read-only asset cards usable for detail viewing', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly
        selectedAssetId="pecha-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    expect(getAssetSelectButton('pecha-berry')).toBeEnabled();
    expect(screen.queryByLabelText('Current placement asset')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search assets')).toHaveAttribute('readonly');
    expect(screen.queryByLabelText('Show favorite assets')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset advanced filters')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset area filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset skill filter')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '查看苹野果详情' })).toBeEnabled();
    expect(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: '全部' }))
      .toBeDisabled();
    fireEvent.click(getAssetSelectButton('leppa-berry'));
    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('pecha-berry')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByLabelText('苹野果 asset detail')).not.toBeInTheDocument();

    getAssetSelectButton('pecha-berry').focus();
    fireEvent.keyDown(getAssetSelectButton('pecha-berry'), { key: 'ArrowDown' });
    fireEvent.keyDown(getAssetSelectButton('pecha-berry'), { key: 'ArrowUp' });
    fireEvent.keyDown(getAssetSelectButton('pecha-berry'), { key: 'Enter' });
    fireEvent.keyDown(getAssetSelectButton('pecha-berry'), { key: ' ' });
    fireEvent.click(screen.getByRole('button', { name: '查看苹野果详情' }));
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('leppa-berry');

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('pecha-berry')).toHaveFocus();
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
  }, 15_000);
});

function getAssetSelectButton(assetId: string): HTMLButtonElement {
  const button = queryAssetSelectButton(assetId);
  if (!button) {
    throw new Error(`Expected ${assetId} asset select button.`);
  }

  return button;
}

function getAssetRow(assetId: string): HTMLElement {
  const row = screen
    .getByLabelText('Asset results')
    .querySelector<HTMLElement>(`[data-asset-id="${assetId}"]`);
  if (!row) {
    throw new Error(`Expected ${assetId} asset row.`);
  }

  return row;
}

function getCollapsedStagedCard(assetId: string): HTMLElement {
  const card = screen
    .getByLabelText('最近暂存素材')
    .querySelector<HTMLElement>(`[data-asset-id="${assetId}"]`);
  if (!card) {
    throw new Error(`Expected ${assetId} collapsed staged card.`);
  }

  return card;
}

function getExpandedStagedRow(assetId: string): HTMLElement {
  const row = screen
    .getByLabelText('全部暂存素材')
    .querySelector<HTMLElement>(`[data-asset-id="${assetId}"][data-asset-source="staging"]`);
  if (!row) {
    throw new Error(`Expected ${assetId} expanded staged row.`);
  }

  return row;
}

function getCollapsedStagedAssetIds(): string[] {
  return Array.from(screen.getByLabelText('最近暂存素材').querySelectorAll<HTMLElement>('[data-asset-id]'))
    .map((element) => element.dataset.assetId ?? '');
}

function getExpandedStagedAssetIds(): string[] {
  return Array.from(
    screen
      .getByLabelText('全部暂存素材')
      .querySelectorAll<HTMLElement>('[data-asset-source="staging"][data-asset-id]'),
  ).map((element) => element.dataset.assetId ?? '');
}

function dragAssetToStaging(assetId: string, options: { expectDragImage?: boolean } = {}): void {
  const dataTransfer = createDataTransferDouble();
  fireEvent.dragStart(getAssetRow(assetId), { dataTransfer });
  if (options.expectDragImage !== false) {
    expect(dataTransfer.setDragImage).toHaveBeenCalledWith(
      expect.objectContaining({ className: 'asset-drag-preview' }),
      expect.any(Number),
      expect.any(Number),
    );
  }
  fireEvent.drop(screen.getByLabelText('素材暂存区'), { dataTransfer });
}

function createDataTransferDouble(): DataTransfer & { setDragImage: ReturnType<typeof createSetDragImageMock> } {
  const payload = new Map<string, string>();
  const setDragImage = createSetDragImageMock();

  return {
    dropEffect: 'none',
    effectAllowed: 'all',
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    get types() {
      return Array.from(payload.keys());
    },
    clearData: (format?: string) => {
      if (format) {
        payload.delete(format);
        return;
      }
      payload.clear();
    },
    getData: (format: string) => payload.get(format) ?? '',
    setData: (format: string, data: string) => {
      payload.set(format, data);
    },
    setDragImage,
  };
}

function createSetDragImageMock() {
  return vi.fn((_image: Element, _x: number, _y: number): void => undefined);
}

function queryAssetSelectButton(assetId: string): HTMLButtonElement | null {
  return screen
    .getByLabelText('Asset results')
    .querySelector<HTMLButtonElement>(`[data-asset-id="${assetId}"] .asset-select-button`);
}
