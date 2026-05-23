import { useEffect, useId, useState } from 'react';
import {
  getPokemonThemeDefinition,
  pokemonThemeCatalog,
  type PokemonKey,
} from '../../domain/assets';
import { defaultLocale, getPokemonDisplay, t, type Locale } from '../../i18n';

interface PokemonSceneControlsProps {
  locale?: Locale;
  readOnly: boolean;
  selectedPokemonKey: PokemonKey;
  sceneName: string;
  onPokemonChange: (pokemonKey: PokemonKey) => void;
  onSceneNameChange: (sceneName: string) => void;
}

export function PokemonSceneControls({
  locale = defaultLocale,
  readOnly,
  selectedPokemonKey,
  sceneName,
  onPokemonChange,
  onSceneNameChange,
}: PokemonSceneControlsProps) {
  const sceneNameErrorId = useId();
  const [sceneNameDraft, setSceneNameDraft] = useState(sceneName);
  const sceneNameEmpty = !sceneNameDraft.trim();
  const selectedPokemon = getPokemonThemeDefinition(selectedPokemonKey);

  useEffect(() => {
    setSceneNameDraft(sceneName);
  }, [sceneName]);

  const handlePokemonChange = (value: string) => {
    if (readOnly) {
      return;
    }

    onPokemonChange(value as PokemonKey);
  };

  const handleSceneNameCommit = () => {
    if (readOnly) {
      return;
    }

    const nextSceneName = sceneNameDraft.trim();
    if (!nextSceneName) {
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

  return (
    <section className="scene-controls" aria-label={t(locale, 'sceneControls')}>
      <div className="scene-controls__fields">
        <label>
          {t(locale, 'sceneName')}
          <input
            aria-label={t(locale, 'sceneName')}
            aria-invalid={sceneNameEmpty}
            aria-describedby={sceneNameEmpty ? sceneNameErrorId : undefined}
            value={sceneNameDraft}
            onBlur={handleSceneNameCommit}
            onChange={(event) => handleSceneNameChange(event.target.value)}
            readOnly={readOnly}
          />
          {sceneNameEmpty ? (
            <span id={sceneNameErrorId} className="field-error">
              {t(locale, 'sceneNameRequired')}
            </span>
          ) : null}
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
            <select
              aria-label={t(locale, 'currentPokemon')}
              value={selectedPokemonKey}
              onChange={(event) => handlePokemonChange(event.target.value)}
              disabled={readOnly}
            >
              {pokemonThemeCatalog.map((pokemon) => (
                <option value={pokemon.key} key={pokemon.key}>
                  {getPokemonDisplay(pokemon, locale)}
                </option>
              ))}
            </select>
          </span>
        </label>
      </div>
    </section>
  );
}
