import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssetPicker } from './AssetPicker';

describe('AssetPicker', () => {
  it('renders catalog metadata and selected placement context', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId="garden-plant"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="0 层"
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('06 / 06');
    expect(screen.getByLabelText('Current placement asset')).toHaveTextContent('Garden Plant');
    expect(screen.getByRole('button', { name: /Garden Plant.*No\. 014/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByLabelText('Garden Plant asset detail')).toHaveTextContent('garden-plant');
    expect(screen.getByLabelText('Garden Plant asset detail')).toHaveTextContent('Default skill: leaf');
    expect(within(screen.getByLabelText('Garden Plant asset detail')).getByAltText('Garden plant thumbnail')).toBeVisible();
    expect(screen.getByAltText('Garden plant thumbnail')).toBeVisible();
  });

  it('selects assets by mouse, Enter, Space, and arrow-key focus', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="0 层"
        onAssetSelect={onAssetSelect}
      />,
    );

    const woodenFloor = screen.getByRole('button', { name: /Wooden Floor.*No\. 001/ });
    const gardenPlant = screen.getByRole('button', { name: /Garden Plant.*No\. 014/ });

    fireEvent.click(woodenFloor);
    fireEvent.keyDown(woodenFloor, { key: 'ArrowDown' });
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
        currentBuildingLevelName="0 层"
        onAssetSelect={onAssetSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View Outer Wall details' }));

    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Current placement asset')).toHaveTextContent('Wooden Floor');
    expect(screen.getByLabelText('Outer Wall asset detail')).toHaveTextContent('outer-wall');
    expect(within(screen.getByLabelText('Outer Wall asset detail')).getByAltText('Outer wall thumbnail')).toBeVisible();
  });

  it('filters by search query and current Pokemon favorites', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="eevee"
        currentBuildingLevelName="0 层"
        onAssetSelect={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show favorite assets' }));
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('03 / 06');
    expect(screen.getByRole('button', { name: /Roof Tile.*No\. 068/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Water Barrel.*No\. 052/ })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'plant' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('01 / 06');
    expect(screen.getByRole('button', { name: /Garden Plant.*No\. 014/ })).toBeVisible();

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'garden-plant' } });
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('01 / 06');
    expect(screen.getByRole('button', { name: /Garden Plant.*No\. 014/ })).toBeVisible();
  });

  it('combines category, area, and skill filters with a clear action', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="pikachu"
        currentBuildingLevelName="0 层"
        onAssetSelect={() => undefined}
      />,
    );

    expect(screen.getByRole('group', { name: 'Asset category filters' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Asset area filters' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Asset filters' })).toBeVisible();

    fireEvent.click(within(screen.getByRole('group', { name: 'Asset category filters' })).getByRole('button', { name: 'Wall' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Asset area filters' })).getByRole('button', { name: 'Outer' }));
    fireEvent.change(screen.getByLabelText('Skill filter'), { target: { value: 'soil' } });

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('01 / 06');
    expect(screen.getByRole('button', { name: /Roof Tile.*No\. 068/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Outer Wall.*No\. 027/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('06 / 06');
  });

  it('shows an empty state with recovery actions for unmatched filters', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="0 层"
        onAssetSelect={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'missing' } });

    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('00 / 06');
    expect(screen.getByLabelText('No matching assets')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
    expect(screen.getByLabelText('Asset result count')).toHaveTextContent('06 / 06');
  });

  it('offers a favorite-specific empty-state recovery action', () => {
    render(
      <AssetPicker
        readOnly={false}
        selectedAssetId={null}
        selectedPokemonKey="ditto"
        currentBuildingLevelName="0 层"
        onAssetSelect={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Show favorite assets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Utility' }));

    expect(screen.getByLabelText('No matching assets')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Disable favorite' }));
    expect(screen.getByRole('button', { name: /Water Barrel.*No\. 052/ })).toBeVisible();
  });

  it('keeps read-only asset cards usable for detail viewing', () => {
    const onAssetSelect = vi.fn();

    render(
      <AssetPicker
        readOnly
        selectedAssetId="wooden-floor"
        selectedPokemonKey="ditto"
        currentBuildingLevelName="0 层"
        onAssetSelect={onAssetSelect}
      />,
    );

    const picker = screen.getByRole('complementary', { name: 'Asset picker' });
    expect(within(picker).getByRole('button', { name: /Wooden Floor.*No\. 001/ })).toBeEnabled();
    expect(screen.getByLabelText('Current placement asset')).toHaveTextContent('View only');
    fireEvent.click(screen.getByRole('button', { name: /Outer Wall.*No\. 027/ }));
    expect(onAssetSelect).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Current placement asset')).toHaveTextContent('Wooden Floor');
    expect(screen.getByLabelText('Outer Wall asset detail')).toHaveTextContent('outer-wall');
  });
});
