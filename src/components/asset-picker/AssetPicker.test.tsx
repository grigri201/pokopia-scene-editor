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
    expect(onAssetSelect).toHaveBeenCalledWith('outer-wall');
  });
});
