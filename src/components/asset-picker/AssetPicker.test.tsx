import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readUiPreferencesFromStorage } from '../../io';
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
  });

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

  it('persists compact category, query, and favorite filters separately from scene state', () => {
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

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('001 results');
    expect(readUiPreferencesFromStorage(window.localStorage).assetFilters).toEqual({
      query: '屋顶',
      category: 'roof',
      area: 'all',
      favoriteOnly: true,
      skill: 'all',
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
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('001 results');
  });

  it('shows an empty state with recovery actions for unmatched filters', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('006 results');
  });

  it('offers a favorite-specific empty-state recovery action', () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Disable favorite' }));
    expect(getAssetSelectButton('water-barrel')).toBeVisible();
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
    fireEvent.click(getAssetSelectButton('outer-wall'));
    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(getAssetSelectButton('wooden-floor')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('石板路径 asset detail')).toHaveTextContent('outer-wall');
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
