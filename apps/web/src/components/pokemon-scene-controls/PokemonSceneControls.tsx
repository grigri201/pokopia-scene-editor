import { type KeyboardEvent, useEffect, useId, useMemo, useState } from 'react';
import {
  getPokemonThemeDefinition,
  maxEditableCanvasSize,
  minEditableCanvasSize,
  pokemonThemeCatalogByNumber,
  type GridSize,
  type PokemonThemeDefinition,
  type PokemonKey,
} from '@pokopia-scene-editor/scene-core';
import { defaultLocale, getPokemonDisplay, t, type Locale } from '../../i18n';

interface PokemonSceneControlsProps {
  locale?: Locale;
  readOnly: boolean;
  canvasSize: GridSize;
  selectedPokemonKey: PokemonKey;
  sceneName: string;
  onCanvasSizeChange: (canvasSize: GridSize) => void;
  onPokemonChange: (pokemonKey: PokemonKey) => void;
  onSceneNameChange: (sceneName: string) => void;
  onSceneNameValidationError?: (message: string) => void;
}

export function PokemonSceneControls({
  locale = defaultLocale,
  readOnly,
  canvasSize,
  selectedPokemonKey,
  sceneName,
  onCanvasSizeChange,
  onPokemonChange,
  onSceneNameChange,
  onSceneNameValidationError,
}: PokemonSceneControlsProps) {
  const pokemonListboxId = useId();
  const [sceneNameDraft, setSceneNameDraft] = useState(sceneName);
  const [isPokemonMenuOpen, setIsPokemonMenuOpen] = useState(false);
  const [pokemonSearchQuery, setPokemonSearchQuery] = useState('');
  const [activePokemonIndex, setActivePokemonIndex] = useState(0);
  const sceneNameEmpty = !sceneNameDraft.trim();
  const selectedPokemon = getPokemonThemeDefinition(selectedPokemonKey);
  const filteredPokemon = useMemo(
    () =>
      pokemonThemeCatalogByNumber.filter((pokemon) =>
        pokemonMatchesSearch(pokemon, pokemonSearchQuery, locale),
      ),
    [locale, pokemonSearchQuery],
  );
  const selectedPokemonIndex = useMemo(
    () => pokemonThemeCatalogByNumber.findIndex((pokemon) => pokemon.key === selectedPokemonKey),
    [selectedPokemonKey],
  );
  const selectedPokemonMenuIndex = selectedPokemonIndex >= 0 ? selectedPokemonIndex : 0;
  const activePokemon = isPokemonMenuOpen ? filteredPokemon[activePokemonIndex] : undefined;
  const activePokemonOptionId = activePokemon ? `${pokemonListboxId}-${activePokemon.key}` : undefined;

  useEffect(() => {
    setSceneNameDraft(sceneName);
  }, [sceneName]);

  useEffect(() => {
    setPokemonSearchQuery(getPokemonDisplay(selectedPokemon, locale));
  }, [locale, selectedPokemon]);

  useEffect(() => {
    if (!isPokemonMenuOpen) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      document.getElementById(activePokemonOptionId ?? '')?.scrollIntoView?.({ block: 'nearest' });
    });

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [activePokemonOptionId, isPokemonMenuOpen]);

  useEffect(() => {
    if (!isPokemonMenuOpen) {
      return;
    }

    setActivePokemonIndex((currentIndex) => {
      if (filteredPokemon.length === 0) {
        return 0;
      }

      return Math.min(currentIndex, filteredPokemon.length - 1);
    });
  }, [filteredPokemon.length, isPokemonMenuOpen]);

  const openPokemonMenu = () => {
    if (readOnly) {
      return;
    }

    setPokemonSearchQuery('');
    setActivePokemonIndex(selectedPokemonMenuIndex);
    setIsPokemonMenuOpen(true);
  };

  const closePokemonMenu = () => {
    setIsPokemonMenuOpen(false);
    setActivePokemonIndex(0);
    setPokemonSearchQuery(getPokemonDisplay(selectedPokemon, locale));
  };

  const selectPokemon = (pokemon: PokemonThemeDefinition) => {
    if (readOnly) {
      return;
    }

    onPokemonChange(pokemon.key);
    setPokemonSearchQuery(getPokemonDisplay(pokemon, locale));
    setIsPokemonMenuOpen(false);
    setActivePokemonIndex(0);
  };

  const handlePokemonSearchChange = (value: string) => {
    if (readOnly) {
      return;
    }

    setPokemonSearchQuery(value);
    setActivePokemonIndex(0);
    setIsPokemonMenuOpen(true);
  };

  const handlePokemonKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (readOnly) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isPokemonMenuOpen) {
        openPokemonMenu();
        return;
      }

      setActivePokemonIndex((currentIndex) =>
        filteredPokemon.length === 0 ? 0 : Math.min(currentIndex + 1, filteredPokemon.length - 1),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isPokemonMenuOpen) {
        openPokemonMenu();
        return;
      }

      setActivePokemonIndex((currentIndex) =>
        filteredPokemon.length === 0 ? 0 : Math.max(currentIndex - 1, 0),
      );
      return;
    }

    if (event.key === 'Enter' && isPokemonMenuOpen) {
      event.preventDefault();
      const pokemon = filteredPokemon[activePokemonIndex];
      if (pokemon) {
        selectPokemon(pokemon);
      }
      return;
    }

    if (event.key === 'Escape' && isPokemonMenuOpen) {
      event.preventDefault();
      closePokemonMenu();
    }
  };

  const handleSceneNameCommit = () => {
    if (readOnly) {
      return;
    }

    const nextSceneName = sceneNameDraft.trim();
    if (!nextSceneName) {
      onSceneNameValidationError?.(t(locale, 'sceneNameRequired'));
      return;
    }

    onSceneNameChange(nextSceneName);
  };

  const handleSceneNameChange = (value: string) => {
    if (readOnly) {
      return;
    }

    setSceneNameDraft(value);

    const nextSceneName = value.trim();
    if (nextSceneName) {
      onSceneNameChange(nextSceneName);
    }
  };

  const handleCanvasSizeChange = (axis: 'width' | 'height', value: string) => {
    if (readOnly) {
      return;
    }

    const nextSize = Number(value);
    if (!Number.isInteger(nextSize)) {
      return;
    }

    onCanvasSizeChange({
      ...canvasSize,
      [axis]: nextSize,
    });
  };

  return (
    <section className="scene-controls" aria-label={t(locale, 'sceneControls')}>
      <div className="scene-controls__fields">
        <label>
          {t(locale, 'sceneName')}
          <input
            aria-label={t(locale, 'sceneName')}
            aria-invalid={sceneNameEmpty}
            value={sceneNameDraft}
            onBlur={handleSceneNameCommit}
            onChange={(event) => handleSceneNameChange(event.target.value)}
            readOnly={readOnly}
          />
        </label>
        <label className="scene-field scene-field--pokemon">
          {t(locale, 'pokemon')}
          <span className="pokemon-select-control">
            <img
              src={selectedPokemon.portraitUrl}
              alt=""
              aria-hidden="true"
              className="pokemon-select-control__image"
            />
            <span className="pokemon-select-control__number">
              #{formatPokedexNumber(selectedPokemon.pokedexNumber)}
            </span>
            <span className="pokemon-combobox">
              <input
                aria-activedescendant={activePokemonOptionId}
                aria-autocomplete="list"
                aria-controls={pokemonListboxId}
                aria-expanded={isPokemonMenuOpen}
                aria-label={t(locale, 'currentPokemon')}
                className="pokemon-combobox__input"
                disabled={readOnly}
                placeholder={getPokemonDisplay(selectedPokemon, locale)}
                role="combobox"
                spellCheck={false}
                value={pokemonSearchQuery}
                onBlur={closePokemonMenu}
                onChange={(event) => handlePokemonSearchChange(event.target.value)}
                onClick={openPokemonMenu}
                onFocus={openPokemonMenu}
                onKeyDown={handlePokemonKeyDown}
              />
            </span>
            {isPokemonMenuOpen && !readOnly ? (
              <div
                className="pokemon-combobox__list"
                id={pokemonListboxId}
                role="listbox"
              >
                {filteredPokemon.length > 0 ? (
                  filteredPokemon.map((pokemon, index) => {
                    const displayName = getPokemonDisplay(pokemon, locale);
                    const secondaryName = locale === 'en-US' ? pokemon.name : pokemon.englishName;
                    const isSelected = pokemon.key === selectedPokemonKey;
                    const isActive = index === activePokemonIndex;

                    return (
                      <div
                        aria-selected={isSelected}
                        className={[
                          'pokemon-combobox__option',
                          isSelected ? 'is-selected' : '',
                          isActive ? 'is-active' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        data-pokedex-number={pokemon.pokedexNumber}
                        data-pokemon-key={pokemon.key}
                        id={`${pokemonListboxId}-${pokemon.key}`}
                        key={pokemon.key}
                        role="option"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          selectPokemon(pokemon);
                        }}
                      >
                        <img
                          src={pokemon.portraitUrl}
                          alt=""
                          aria-hidden="true"
                          className="pokemon-combobox__option-image"
                        />
                        <span className="pokemon-combobox__option-copy">
                          <span className="pokemon-combobox__option-title">
                            <span className="pokemon-combobox__option-number">
                              #{formatPokedexNumber(pokemon.pokedexNumber)}
                            </span>
                            <span>{displayName}</span>
                          </span>
                          <span className="pokemon-combobox__option-secondary">{secondaryName}</span>
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="pokemon-combobox__empty">{t(locale, 'pokemonSearchNoResults')}</div>
                )}
              </div>
            ) : null}
          </span>
        </label>
        <fieldset className="scene-size-control" aria-label={t(locale, 'editAreaSize')}>
          <div className="scene-size-control__selects">
            <label>
              {t(locale, 'editAreaWidth')}
              <select
                aria-label={t(locale, 'editAreaWidth')}
                disabled={readOnly}
                value={canvasSize.width}
                onChange={(event) => handleCanvasSizeChange('width', event.target.value)}
              >
                {editableCanvasSizeOptions.map((size) => (
                  <option value={size} key={`width-${size}`}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t(locale, 'editAreaHeight')}
              <select
                aria-label={t(locale, 'editAreaHeight')}
                disabled={readOnly}
                value={canvasSize.height}
                onChange={(event) => handleCanvasSizeChange('height', event.target.value)}
              >
                {editableCanvasSizeOptions.map((size) => (
                  <option value={size} key={`height-${size}`}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      </div>
    </section>
  );
}

const editableCanvasSizeOptions = Array.from(
  { length: maxEditableCanvasSize - minEditableCanvasSize + 1 },
  (_, index) => minEditableCanvasSize + index,
);

function formatPokedexNumber(pokedexNumber: number): string {
  return String(pokedexNumber).padStart(3, '0');
}

function normalizePokemonSearch(value: string): string {
  return value.trim().toLowerCase();
}

function compactPokemonSearch(value: string): string {
  return normalizePokemonSearch(value).replace(/[#.\s'’_-]/g, '');
}

function pokemonMatchesSearch(
  pokemon: PokemonThemeDefinition,
  query: string,
  locale: Locale,
): boolean {
  const normalizedQuery = normalizePokemonSearch(query);

  if (!normalizedQuery) {
    return true;
  }

  const compactQuery = compactPokemonSearch(query);
  const pokedexNumber = formatPokedexNumber(pokemon.pokedexNumber);
  const searchValues = [
    pokedexNumber,
    String(pokemon.pokedexNumber),
    `#${pokedexNumber}`,
    `No. ${pokedexNumber}`,
    pokemon.name,
    pokemon.englishName,
    getPokemonDisplay(pokemon, locale),
  ];

  return searchValues.some((value) => {
    const normalizedValue = normalizePokemonSearch(value);

    return (
      normalizedValue.includes(normalizedQuery) ||
      (compactQuery.length > 0 && compactPokemonSearch(value).includes(compactQuery))
    );
  });
}
