import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PokemonSceneControls } from './PokemonSceneControls';

describe('PokemonSceneControls', () => {
  it('uses compact Open Design controls for Pokemon, name, and save', () => {
    const onPokemonChange = vi.fn();
    const onSceneNameChange = vi.fn();
    const onSave = vi.fn();

    const { container } = render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        saveStatus="dirty"
        onPokemonChange={onPokemonChange}
        onSceneNameChange={onSceneNameChange}
        onSave={onSave}
      />,
    );

    expect(container.querySelector('.pokemon-select-control__image')).toHaveAttribute(
      'src',
      '/assets/pokopia_image_sources/pokemon_portraits/213-pikachu.png',
    );
    expect(screen.getByRole('option', { name: '百变怪' })).toHaveValue('ditto');
    expect(screen.getByRole('option', { name: '伊布' })).toHaveValue('eevee');
    expect(screen.getByRole('option', { name: '皮卡丘' })).toHaveValue('pikachu');

    fireEvent.change(screen.getByLabelText('Current Pokemon'), { target: { value: 'eevee' } });
    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: '月光庭院' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save scene from scene controls' }));

    expect(onPokemonChange).toHaveBeenCalledWith('eevee');
    expect(onSceneNameChange).toHaveBeenCalledWith('月光庭院');
    expect(onSave).toHaveBeenCalledOnce();
    expect(screen.queryByLabelText('Save status')).not.toBeInTheDocument();
  });

  it('blocks empty scene names and announces the validation state', () => {
    const onSceneNameChange = vi.fn();

    render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        saveStatus="dirty"
        onPokemonChange={() => undefined}
        onSceneNameChange={onSceneNameChange}
        onSave={() => undefined}
      />,
    );

    const sceneNameInput = screen.getByLabelText('Scene Name');
    fireEvent.change(sceneNameInput, { target: { value: '   ' } });
    fireEvent.blur(sceneNameInput);

    expect(sceneNameInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Name is required.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save scene from scene controls' })).toBeDisabled();
    expect(onSceneNameChange).not.toHaveBeenCalled();
  });

  it('does not render save status or save failure hints', () => {
    render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        saveStatus="saveError"
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(screen.queryByRole('status', { name: 'Save status' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Save failed/)).not.toBeInTheDocument();
  });

  it('disables scene edits in read-only mode', () => {
    render(
      <PokemonSceneControls
        readOnly
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        saveStatus="saved"
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
        onSave={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Current Pokemon')).toBeDisabled();
    expect(screen.getByLabelText('Scene Name')).toHaveAttribute('readonly', '');
    expect(screen.getByRole('button', { name: 'Save scene from scene controls' })).toBeDisabled();
    expect(screen.queryByLabelText('Save status')).not.toBeInTheDocument();
  });
});
