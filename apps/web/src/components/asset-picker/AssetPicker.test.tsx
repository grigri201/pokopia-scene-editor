import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readUiPreferencesFromStorage, uiPreferencesStorageKey } from '../../io';
import { AssetPicker } from './AssetPicker';

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
        selectedAssetId="leppa-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: '素材' })).toBeVisible();
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1160 results');
    expect(screen.getByLabelText('Asset page status')).toHaveTextContent('1 / 116');
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.queryByText(/Showing first/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Current placement asset')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清除筛选' })).not.toBeInTheDocument();
    expect(getAssetSelectButton('leppa-berry')).toHaveAttribute('aria-pressed', 'true');
    expect(getAssetRow('leppa-berry')).toHaveAttribute('data-selection-mode', 'single');
    expect(getAssetRow('leppa-berry')).not.toHaveClass('asset-row--continuous');
    expect(getAssetSelectButton('leppa-berry')).toHaveTextContent('No. 197');
    expect(getAssetSelectButton('leppa-berry')).toHaveTextContent('苹野果');
    expect(getAssetSelectButton('leppa-berry')).not.toHaveTextContent('Leppa Berry');
    expect(getAssetSelectButton('leppa-berry')).toHaveTextContent('食物');
    expect(getAssetSelectButton('leppa-berry')).not.toHaveTextContent('食物 · 食物');
    expect(
      within(screen.getByRole('group', { name: 'Asset category filters' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['全部', '建筑', '家具', '功能', '户外', '自然', '食物', '材料', '地块', '杂项', '其他']);
    expect(screen.getByLabelText('苹野果 asset detail')).toHaveTextContent('leppa-berry');
    expect(screen.getByLabelText('苹野果 asset detail')).not.toHaveTextContent('Skill marker');
    expect(screen.queryByLabelText('Asset advanced filters')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset area filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset skill filter')).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('苹野果 asset detail')).getByAltText('苹野果缩略图')).toBeInTheDocument();
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
    expect(screen.getByLabelText('Asset page status')).toHaveTextContent('1 / 116');
    expect(screen.getByLabelText('Previous asset page')).toBeDisabled();
    expect(screen.getByLabelText('Next asset page')).toBeEnabled();

    fireEvent.click(screen.getByLabelText('Next asset page'));

    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.getByLabelText('Asset page status')).toHaveTextContent('2 / 116');
    expect(screen.getByLabelText('Previous asset page')).toBeEnabled();
    expect(queryAssetSelectButton('wooden-fencing')).toBeNull();
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

    const leppaBerry = getAssetSelectButton('leppa-berry');
    const chestoBerry = getAssetSelectButton('chesto-berry');

    fireEvent.click(leppaBerry);
    fireEvent.keyDown(leppaBerry, { key: 'ArrowDown' });
    expect(chestoBerry).toHaveFocus();
    fireEvent.keyDown(chestoBerry, { key: 'Enter' });
    fireEvent.keyDown(chestoBerry, { key: ' ' });

    expect(onAssetSelect).toHaveBeenCalledWith('leppa-berry', 'single');
    expect(onAssetSelect).toHaveBeenCalledWith('chesto-berry', 'single');
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

    fireEvent.doubleClick(getAssetSelectButton('leppa-berry'));

    expect(onAssetSelect).toHaveBeenLastCalledWith('leppa-berry', 'continuous');
  });

  it('renders continuous asset selection differently from single selection', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="leppa-berry"
        selectedAssetMode="continuous"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    const selectedRow = getAssetRow('leppa-berry');
    expect(selectedRow).toHaveAttribute('data-selection-mode', 'continuous');
    expect(selectedRow).toHaveClass('asset-row--selected');
    expect(selectedRow).toHaveClass('asset-row--continuous');
  });

  it('opens asset detail without selecting the placement asset', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="leppa-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View 零余果 details' }));

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('leppa-berry')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('零余果 asset detail')).toHaveTextContent('chesto-berry');
    expect(within(screen.getByLabelText('零余果 asset detail')).getByAltText('零余果缩略图')).toBeInTheDocument();
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
        selectedAssetId="leppa-berry"
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

  it('filters by search query and current Pokemon favorites', () => {
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

    fireEvent.click(screen.getByLabelText('Show favorite assets'));
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('249 results');
    expect(queryAssetSelectButton('leppa-berry')).toBeNull();
    expect(queryAssetSelectButton('stepping-stones')).toBeNull();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '木长椅' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1 results');
    expect(getAssetSelectButton('wooden-bench')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'wooden-bench' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1 results');
    expect(getAssetSelectButton('wooden-bench')).toBeVisible();

    fireEvent.click(screen.getByLabelText('Show favorite assets'));
    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'Leppa Berry' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('1 results');
    expect(getAssetSelectButton('leppa-berry')).toHaveTextContent('苹野果');

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '苹野果' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('4 results');
    expect(getAssetSelectButton('leppa-berry')).toBeVisible();
  });

  it('persists compact query, category, and favorite filters separately from scene state', () => {
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
    fireEvent.click(screen.getByLabelText('Show favorite assets'));

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('3 results');
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toEqual({
      query: '屋顶',
      category: 'buildings',
      favoriteOnly: true,
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
    expect(screen.getByLabelText('Show favorite assets')).toBeChecked();
    expect(screen.queryByLabelText('Asset area filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset skill filter')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('3 results');
  });

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

  it('does not offer favorite-specific empty-state recovery actions', () => {
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

    fireEvent.click(screen.getByLabelText('Show favorite assets'));
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
        selectedAssetId="leppa-berry"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    expect(getAssetSelectButton('leppa-berry')).toBeEnabled();
    expect(screen.queryByLabelText('Current placement asset')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search assets')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Show favorite assets')).toBeDisabled();
    expect(screen.queryByLabelText('Asset advanced filters')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset area filter')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Asset skill filter')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View 零余果 details' })).toBeDisabled();
    expect(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: '全部' }))
      .toBeDisabled();
    fireEvent.click(getAssetSelectButton('chesto-berry'));
    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('leppa-berry')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('零余果 asset detail')).toHaveTextContent('chesto-berry');

    getAssetSelectButton('leppa-berry').focus();
    fireEvent.keyDown(getAssetSelectButton('leppa-berry'), { key: 'ArrowDown' });
    fireEvent.keyDown(getAssetSelectButton('leppa-berry'), { key: 'ArrowUp' });
    fireEvent.keyDown(getAssetSelectButton('leppa-berry'), { key: 'Enter' });
    fireEvent.keyDown(getAssetSelectButton('leppa-berry'), { key: ' ' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'View 零余果 details' }), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'View 零余果 details' }), { key: ' ' });

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('leppa-berry')).toHaveFocus();
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

function queryAssetSelectButton(assetId: string): HTMLButtonElement | null {
  return screen
    .getByLabelText('Asset results')
    .querySelector<HTMLButtonElement>(`[data-asset-id="${assetId}"] .asset-select-button`);
}
