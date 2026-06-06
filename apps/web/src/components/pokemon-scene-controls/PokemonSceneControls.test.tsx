import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createDefaultSceneDocument } from '@pokopia-scene-editor/scene-core';
import { PokemonSceneControls } from './PokemonSceneControls';

describe('PokemonSceneControls', () => {
  it('shows the scene settings form directly without a summary toggle', () => {
    const { container } = render(
      <PokemonSceneControls
        readOnly={false}
        canvasSize={defaultCanvasSize}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        onCanvasSizeChange={() => undefined}
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
      />,
    );

    expect(screen.queryByRole('region', { name: '场景摘要' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '展开场景设置' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收起场景设置' })).not.toBeInTheDocument();
    expect(container.querySelector('.scene-controls__fields')).toBeVisible();
    expect(container.querySelector('.scene-controls__fields')).not.toHaveAttribute('hidden');
    expect(container.querySelector('.scene-controls__fields')).not.toHaveAttribute('inert');
    expect(screen.getByLabelText('布景')).toBeVisible();
    expect(screen.getByLabelText('Current Pokemon')).toBeVisible();
    expect(screen.getByRole('group', { name: '编辑区域大小' })).toBeVisible();
  });

  it('uses compact Open Design controls for Pokemon and name without manual save', () => {
    const onCanvasSizeChange = vi.fn();
    const onPokemonChange = vi.fn();
    const onSceneNameChange = vi.fn();

    const { container } = render(
      <PokemonSceneControls
        readOnly={false}
        canvasSize={defaultCanvasSize}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        onCanvasSizeChange={onCanvasSizeChange}
        onPokemonChange={onPokemonChange}
        onSceneNameChange={onSceneNameChange}
      />,
    );

    expect(container.querySelector('.pokemon-select-control__image')).toHaveAttribute(
      'src',
      '/assets/pokopia_image_sources/pokemon_portraits/213-pikachu.png',
    );
    expect(container.querySelector('.pokemon-select-control__number')).toHaveTextContent('#079');
    expect(screen.getByLabelText('Current Pokemon')).toHaveValue('皮卡丘');

    fireEvent.focus(screen.getByLabelText('Current Pokemon'));

    const options = Array.from(container.querySelectorAll<HTMLElement>('[role="option"]'));
    const optionByText = (pattern: RegExp) => {
      const match = options.find((option) => pattern.test(option.textContent ?? ''));
      expect(match).toBeDefined();
      return match as HTMLElement;
    };
    const pikachuOption = optionByText(/#079.*皮卡丘.*Pikachu/);

    expect(options).toHaveLength(311);
    expect(optionByText(/#213.*凯西.*Abra/)).toHaveAttribute('data-pokemon-key', 'abra');
    expect(optionByText(/#047.*百变怪.*Ditto/)).toHaveAttribute('data-pokemon-key', 'ditto');
    expect(optionByText(/#280.*伊布.*Eevee/)).toHaveAttribute('data-pokemon-key', 'eevee');
    expect(pikachuOption).toHaveAttribute('data-pokemon-key', 'pikachu');
    expect(pikachuOption).toHaveAttribute('aria-selected', 'true');
    expect(pikachuOption).toHaveClass('is-active');
    expect(optionByText(/#081.*超音蝠.*Zubat/)).toHaveAttribute('data-pokemon-key', 'zubat');
    const pokemonOptionValues = options.map((option) => option.dataset.pokemonKey);
    expect(pokemonOptionValues.slice(0, 9)).toEqual([
      'bulbasaur',
      'ivysaur',
      'venusaur',
      'charmander',
      'charmeleon',
      'charizard',
      'squirtle',
      'wartortle',
      'blastoise',
    ]);
    expect(pokemonOptionValues.indexOf('bulbasaur')).toBeLessThan(pokemonOptionValues.indexOf('abra'));
    expect(pokemonOptionValues.indexOf('peakychu')).toBeLessThan(pokemonOptionValues.indexOf('pikachu'));
    expect(pokemonOptionValues.at(-1)).toBe('mew');
    const fieldLabels = Array.from(container.querySelectorAll('.scene-controls__fields > label'));
    expect(fieldLabels).toHaveLength(2);
    expect(fieldLabels[0]?.querySelector('input')).toHaveAccessibleName('布景');
    expect(fieldLabels[1]?.childNodes[0]?.textContent?.trim()).toBe('宝可梦');
    expect(fieldLabels[1]?.querySelector('input')).toHaveAccessibleName('Current Pokemon');
    expect(screen.getByRole('group', { name: '编辑区域大小' })).toBeVisible();
    expect(container.querySelector('.scene-size-control legend')).toBeNull();
    expect(screen.getByLabelText('宽度')).toHaveValue(`${defaultCanvasSize.width}`);
    expect(screen.getByLabelText('高度')).toHaveValue(`${defaultCanvasSize.height}`);
    expect(getSelectOptionValues(screen.getByLabelText('宽度'))).toEqual([
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
    ]);
    expect(getSelectOptionValues(screen.getByLabelText('高度'))).toContain('20');

    fireEvent.change(screen.getByLabelText('Current Pokemon'), { target: { value: 'eevee' } });
    fireEvent.mouseDown(screen.getByRole('option', { name: /#280.*伊布.*Eevee/ }));
    fireEvent.change(screen.getByLabelText('布景'), { target: { value: '月光庭院' } });
    fireEvent.change(screen.getByLabelText('宽度'), { target: { value: '12' } });
    fireEvent.change(screen.getByLabelText('高度'), { target: { value: '9' } });

    expect(onPokemonChange).toHaveBeenCalledWith('eevee');
    expect(onSceneNameChange).toHaveBeenCalledWith('月光庭院');
    expect(onCanvasSizeChange).toHaveBeenNthCalledWith(1, { width: 12, height: defaultCanvasSize.height });
    expect(onCanvasSizeChange).toHaveBeenNthCalledWith(2, { width: defaultCanvasSize.width, height: 9 });
    expect(screen.queryByRole('button', { name: /Save scene/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Save status')).not.toBeInTheDocument();
  }, 15_000);

  it('searches Pokemon by Pokedex number, localized name, and English name', () => {
    const onPokemonChange = vi.fn();

    render(
      <PokemonSceneControls
        readOnly={false}
        canvasSize={defaultCanvasSize}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        onCanvasSizeChange={() => undefined}
        onPokemonChange={onPokemonChange}
        onSceneNameChange={() => undefined}
      />,
    );

    const pokemonSearch = screen.getByLabelText('Current Pokemon');

    fireEvent.change(pokemonSearch, { target: { value: '001' } });
    expect(screen.getByRole('option', { name: /#001.*妙蛙种子.*Bulbasaur/ })).toHaveAttribute(
      'data-pokemon-key',
      'bulbasaur',
    );
    expect(screen.queryByRole('option', { name: /#079.*皮卡丘.*Pikachu/ })).not.toBeInTheDocument();

    fireEvent.change(pokemonSearch, { target: { value: '皮卡' } });
    expect(screen.getByRole('option', { name: /#079.*皮卡丘.*Pikachu/ })).toHaveAttribute(
      'data-pokemon-key',
      'pikachu',
    );

    fireEvent.change(pokemonSearch, { target: { value: 'bulba' } });
    const bulbasaurOption = screen.getByRole('option', { name: /#001.*妙蛙种子.*Bulbasaur/ });
    expect(bulbasaurOption.querySelector('img')).toHaveAttribute(
      'src',
      '/assets/pokopia_image_sources/pokemon_portraits/026-bulbasaur.png',
    );

    fireEvent.mouseDown(bulbasaurOption);

    expect(onPokemonChange).toHaveBeenCalledWith('bulbasaur');
    expect(screen.getByLabelText('Current Pokemon')).toHaveValue('妙蛙种子');
  });

  it('blocks empty scene names and announces the validation state', () => {
    const onSceneNameChange = vi.fn();
    const onSceneNameValidationError = vi.fn();

    render(
      <PokemonSceneControls
        readOnly={false}
        canvasSize={defaultCanvasSize}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        onCanvasSizeChange={() => undefined}
        onPokemonChange={() => undefined}
        onSceneNameChange={onSceneNameChange}
        onSceneNameValidationError={onSceneNameValidationError}
      />,
    );

    const sceneNameInput = screen.getByLabelText('布景');
    fireEvent.change(sceneNameInput, { target: { value: '   ' } });
    fireEvent.blur(sceneNameInput);

    expect(sceneNameInput).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('请输入布景。')).not.toBeInTheDocument();
    expect(onSceneNameValidationError).toHaveBeenCalledWith('请输入布景。');
    expect(screen.queryByRole('button', { name: /Save scene/ })).not.toBeInTheDocument();
    expect(onSceneNameChange).not.toHaveBeenCalled();
  });

  it('does not render save status, manual save, or save failure hints', () => {
    render(
      <PokemonSceneControls
        readOnly={false}
        canvasSize={defaultCanvasSize}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        onCanvasSizeChange={() => undefined}
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
      />,
    );

    expect(screen.queryByRole('button', { name: /Save scene/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Save status' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Save failed/)).not.toBeInTheDocument();
  });

  it('disables scene edits in read-only mode', () => {
    render(
      <PokemonSceneControls
        readOnly
        canvasSize={defaultCanvasSize}
        selectedPokemonKey="pikachu"
        sceneName="星光庭院"
        onCanvasSizeChange={() => undefined}
        onPokemonChange={() => undefined}
        onSceneNameChange={() => undefined}
      />,
    );

    expect(screen.getByLabelText('Current Pokemon')).toBeDisabled();
    expect(screen.getByLabelText('布景')).toHaveAttribute('readonly', '');
    expect(screen.getByLabelText('宽度')).toBeDisabled();
    expect(screen.getByLabelText('高度')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save scene/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Save status')).not.toBeInTheDocument();
  });
});

const defaultCanvasSize = createDefaultSceneDocument({
  sceneId: 'scene-controls-default-canvas',
  now: '2026-05-16T07:00:00.000Z',
}).canvasSize;

function getSelectOptionValues(select: HTMLElement): string[] {
  return Array.from(select.querySelectorAll<HTMLOptionElement>('option')).map((option) => option.value);
}
