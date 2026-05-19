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
        selectedAssetId="garden-plant"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: '素材' })).toBeVisible();
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('006 results');
    expect(screen.queryByLabelText('Current placement asset')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '清除筛选' })).not.toBeInTheDocument();
    expect(getAssetSelectButton('garden-plant')).toHaveAttribute('aria-pressed', 'true');
    expect(getAssetSelectButton('garden-plant')).toHaveTextContent('No. 1052');
    expect(screen.getByLabelText('小型灌木 asset detail')).toHaveTextContent('garden-plant');
    expect(screen.getByLabelText('小型灌木 asset detail')).toHaveTextContent('Default skill: 树叶');
    expect(within(screen.getByLabelText('小型灌木 asset detail')).getByAltText('小型灌木缩略图')).toBeInTheDocument();
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

    const woodenFence = getAssetSelectButton('wooden-floor');
    const gardenPlant = getAssetSelectButton('garden-plant');

    fireEvent.click(woodenFence);
    fireEvent.keyDown(woodenFence, { key: 'ArrowDown' });
    expect(gardenPlant).toHaveFocus();
    fireEvent.keyDown(gardenPlant, { key: 'Enter' });
    fireEvent.keyDown(gardenPlant, { key: ' ' });

    expect(onAssetSelect).toHaveBeenCalledWith('wooden-floor');
    expect(onAssetSelect).toHaveBeenCalledWith('garden-plant');
    expect(onAssetSelect).toHaveBeenCalledTimes(3);
  });

  it('opens asset detail without selecting the placement asset', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="wooden-floor"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View 石板路径 details' }));

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('wooden-floor')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('石板路径 asset detail')).toHaveTextContent('outer-wall');
    expect(within(screen.getByLabelText('石板路径 asset detail')).getByAltText('石板路径缩略图')).toBeInTheDocument();
  });

  it('only enables the placement skill toggle for skill-capable assets', () => {
    const onPlacementRequiresSkillChange = vi.fn();
    const { rerender } = render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="wooden-floor"
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
        selectedAssetId="ditto-doll"
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
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('003 results');
    expect(getAssetSelectButton('roof-tile')).toBeVisible();
    expect(queryAssetSelectButton('water-barrel')).toBeNull();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '灌木' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('001 results');
    expect(getAssetSelectButton('garden-plant')).toBeVisible();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'garden-plant' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('001 results');
    expect(getAssetSelectButton('garden-plant')).toBeVisible();
  });

  it('persists compact query, category, favorite, area, and skill filters separately from scene state', () => {
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
    fireEvent.click(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: '屋顶' }));
    fireEvent.click(screen.getByLabelText('Show favorite assets'));
    fireEvent.change(screen.getByLabelText('Asset area filter'), { target: { value: 'outer' } });
    fireEvent.change(screen.getByLabelText('Asset skill filter'), { target: { value: 'skill-candidate' } });

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('001 results');
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toEqual({
      query: '屋顶',
      category: 'roof',
      area: 'outer',
      favoriteOnly: true,
      skill: 'skill-candidate',
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
    expect(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: '屋顶' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Show favorite assets')).toBeChecked();
    expect(screen.getByLabelText('Asset area filter')).toHaveValue('outer');
    expect(screen.getByLabelText('Asset skill filter')).toHaveValue('skill-candidate');
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('001 results');
  });

  it('exposes restored area and skill filters so persisted constraints are editable', () => {
    window.localStorage.setItem(
      uiPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        assetFilters: {
          query: '',
          category: 'all',
          area: 'outer',
          favoriteOnly: false,
          skill: 'requires-skill',
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

    expect(screen.getByLabelText('Asset area filter')).toHaveValue('outer');
    expect(screen.getByLabelText('Asset skill filter')).toHaveValue('requires-skill');
    fireEvent.change(screen.getByLabelText('Asset area filter'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Asset skill filter'), { target: { value: 'all' } });
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toMatchObject({
      area: 'all',
      skill: 'all',
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

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('000 results');
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
        selectedAssetId="wooden-floor"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="主体道具"
        placementRequiresSkill={false}
        onPlacementRequiresSkillChange={() => undefined}
        onAssetSelect={onAssetSelect}
      />,
    );

    expect(getAssetSelectButton('wooden-floor')).toBeEnabled();
    expect(screen.queryByLabelText('Current placement asset')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Search assets')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('Show favorite assets')).toBeDisabled();
    expect(screen.getByLabelText('Asset area filter')).toBeDisabled();
    expect(screen.getByLabelText('Asset skill filter')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View 石板路径 details' })).toBeDisabled();
    expect(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: '全部' }))
      .toBeDisabled();
    fireEvent.click(getAssetSelectButton('outer-wall'));
    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('wooden-floor')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('石板路径 asset detail')).toHaveTextContent('outer-wall');

    getAssetSelectButton('wooden-floor').focus();
    fireEvent.keyDown(getAssetSelectButton('wooden-floor'), { key: 'ArrowDown' });
    fireEvent.keyDown(getAssetSelectButton('wooden-floor'), { key: 'ArrowUp' });
    fireEvent.keyDown(getAssetSelectButton('wooden-floor'), { key: 'Enter' });
    fireEvent.keyDown(getAssetSelectButton('wooden-floor'), { key: ' ' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'View 石板路径 details' }), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'View 石板路径 details' }), { key: ' ' });

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('wooden-floor')).toHaveFocus();
    expect(readUiPreferencesFromStorage(window.localStorage)).toEqual({
      schemaVersion: 1,
      assetFilters: {
        query: '',
        category: 'all',
        area: 'all',
        favoriteOnly: false,
        skill: 'all',
      },
    });
  });
});

function getAssetSelectButton(assetId: string): HTMLButtonElement {
  const button = queryAssetSelectButton(assetId);
  if (!button) {
    throw new Error(`Expected ${assetId} asset select button.`);
  }

  return button;
}

function queryAssetSelectButton(assetId: string): HTMLButtonElement | null {
  return screen
    .getByLabelText('Asset results')
    .querySelector<HTMLButtonElement>(`[data-asset-id="${assetId}"] .asset-select-button`);
}
