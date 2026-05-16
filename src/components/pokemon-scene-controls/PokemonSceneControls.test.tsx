import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PokemonSceneControls } from './PokemonSceneControls';

describe('PokemonSceneControls', () => {
  it('supports searchable Pokemon selection, scene name edits, and save action', () => {
    const onPokemonChange = vi.fn();
    const onSceneNameChange = vi.fn();
    const onSave = vi.fn();

    render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="ditto"
        sceneName="Ditto 5x5 布景草稿"
        saveStatus="dirty"
        saveError={null}
        canUndo
        canRedo={false}
        onPokemonChange={onPokemonChange}
        onSceneNameChange={onSceneNameChange}
        onSave={onSave}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );

    fireEvent.change(screen.getByLabelText('Current Pokemon'), { target: { value: 'eevee' } });
    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Garden 5x5 Layout' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));

    expect(onPokemonChange).toHaveBeenCalledWith('eevee');
    expect(onSceneNameChange).toHaveBeenCalledWith('Garden 5x5 Layout');
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('accepts unique Pokemon prefixes and restores invalid drafts on blur', () => {
    const onPokemonChange = vi.fn();

    render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="ditto"
        sceneName="Ditto 5x5 布景草稿"
        saveStatus="dirty"
        saveError={null}
        canUndo={false}
        canRedo={false}
        onPokemonChange={onPokemonChange}
        onSceneNameChange={() => undefined}
        onSave={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );

    const pokemonInput = screen.getByLabelText('Current Pokemon');
    fireEvent.change(pokemonInput, { target: { value: 'eev' } });
    expect(onPokemonChange).toHaveBeenCalledWith('eevee');

    fireEvent.change(pokemonInput, { target: { value: 'missingno' } });
    expect(pokemonInput).toHaveAttribute('aria-invalid', 'true');
    fireEvent.blur(pokemonInput);
    expect(pokemonInput).toHaveValue('ditto');
  });

  it('blocks invalid scene names and save actions with an error state', () => {
    const onSceneNameChange = vi.fn();
    const onSave = vi.fn();

    render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="ditto"
        sceneName="Ditto 5x5 布景草稿"
        saveStatus="dirty"
        saveError={null}
        canUndo={false}
        canRedo={false}
        onPokemonChange={() => undefined}
        onSceneNameChange={onSceneNameChange}
        onSave={onSave}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );

    const sceneNameInput = screen.getByLabelText('Scene Name');
    fireEvent.change(sceneNameInput, { target: { value: 'Garden' } });
    fireEvent.blur(sceneNameInput);

    expect(sceneNameInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Name must include 5x5.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save scene' })).toBeDisabled();
    expect(onSceneNameChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('announces save failures through the live save status', () => {
    render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="ditto"
        sceneName="Ditto 5x5 布景草稿"
        saveStatus="saveError"
        saveError="Local storage unavailable."
        canUndo={false}
        canRedo={false}
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
        onSave={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );

    expect(screen.getByRole('status', { name: 'Save status' })).toHaveTextContent(
      'Save failed: Local storage unavailable.',
    );
  });

  it('disables scene edits in read-only mode', () => {
    render(
      <PokemonSceneControls
        readOnly
        selectedPokemonKey="ditto"
        sceneName="Ditto 5x5 布景草稿"
        saveStatus="saved"
        saveError={null}
        canUndo
        canRedo
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
        onSave={() => undefined}
        onUndo={() => undefined}
        onRedo={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Current Pokemon')).toBeDisabled();
    expect(screen.getByLabelText('Scene Name')).toHaveAttribute('readonly', '');
    expect(screen.getByRole('button', { name: 'Save scene' })).toBeDisabled();
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Read-only · Saved');
    expect(screen.getByRole('button', { name: 'Toggle grid' })).toBeDisabled();
  });

  it('enables undo and redo only when available in edit mode', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const { rerender } = render(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="ditto"
        sceneName="Ditto 5x5 布景草稿"
        saveStatus="dirty"
        saveError={null}
        canUndo
        canRedo={false}
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
        onSave={() => undefined}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();

    rerender(
      <PokemonSceneControls
        readOnly={false}
        selectedPokemonKey="ditto"
        sceneName="Ditto 5x5 布景草稿"
        saveStatus="dirty"
        saveError={null}
        canUndo={false}
        canRedo
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
        onSave={() => undefined}
        onUndo={onUndo}
        onRedo={onRedo}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(onRedo).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  });
});
