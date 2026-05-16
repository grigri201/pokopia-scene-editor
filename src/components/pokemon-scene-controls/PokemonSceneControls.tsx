import { useEffect, useId, useState } from 'react';
import {
  findPokemonKeyByQuery,
  pokemonThemeCatalog,
  type PokemonKey,
} from '../../domain/assets';
import { sceneNameLabelsSceneSize, type SaveStatus } from '../../domain/scene';

interface PokemonSceneControlsProps {
  readOnly: boolean;
  selectedPokemonKey: PokemonKey;
  sceneName: string;
  saveStatus: SaveStatus;
  saveError: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onPokemonChange: (pokemonKey: PokemonKey) => void;
  onSceneNameChange: (sceneName: string) => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function PokemonSceneControls({
  readOnly,
  selectedPokemonKey,
  sceneName,
  saveStatus,
  saveError,
  canUndo,
  canRedo,
  onPokemonChange,
  onSceneNameChange,
  onSave,
  onUndo,
  onRedo,
}: PokemonSceneControlsProps) {
  const pokemonListId = useId();
  const pokemonErrorId = useId();
  const sceneNameErrorId = useId();
  const [pokemonQuery, setPokemonQuery] = useState<string>(selectedPokemonKey);
  const [sceneNameDraft, setSceneNameDraft] = useState(sceneName);
  const matchedPokemonKey = findPokemonKeyByQuery(pokemonQuery);
  const pokemonInvalid = Boolean(pokemonQuery.trim()) && !matchedPokemonKey;
  const sceneNameInvalid = Boolean(sceneNameDraft.trim()) && !sceneNameLabelsSceneSize(sceneNameDraft);
  const sceneNameEmpty = !sceneNameDraft.trim();
  const hasValidationError = pokemonInvalid || sceneNameInvalid || sceneNameEmpty;

  useEffect(() => {
    setPokemonQuery(selectedPokemonKey);
  }, [selectedPokemonKey]);

  useEffect(() => {
    setSceneNameDraft(sceneName);
  }, [sceneName]);

  const handlePokemonQueryChange = (value: string) => {
    if (readOnly) {
      return;
    }

    setPokemonQuery(value);
    const matchedKey = findPokemonKeyByQuery(value);

    if (matchedKey) {
      onPokemonChange(matchedKey);
    }
  };

  const handlePokemonBlur = () => {
    if (readOnly) {
      return;
    }

    if (!findPokemonKeyByQuery(pokemonQuery)) {
      setPokemonQuery(selectedPokemonKey);
    }
  };

  const handleSceneNameCommit = () => {
    if (readOnly) {
      return;
    }

    const nextSceneName = sceneNameDraft.trim();
    if (!nextSceneName || !sceneNameLabelsSceneSize(nextSceneName)) {
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
    if (nextSceneName && sceneNameLabelsSceneSize(nextSceneName)) {
      onSceneNameChange(nextSceneName);
    }
  };

  return (
    <header className="scene-controls" aria-label="Pokemon scene controls">
      <div className="scene-controls__identity">
        <label>
          Pokemon
          <input
            aria-label="Current Pokemon"
            aria-invalid={pokemonInvalid}
            aria-describedby={pokemonInvalid ? pokemonErrorId : undefined}
            list={pokemonListId}
            value={pokemonQuery}
            onBlur={handlePokemonBlur}
            onChange={(event) => handlePokemonQueryChange(event.target.value)}
            disabled={readOnly}
          />
          <datalist id={pokemonListId}>
            {pokemonThemeCatalog.map((pokemon) => (
              <option value={pokemon.key} key={pokemon.key}>
                {pokemon.name}
              </option>
            ))}
          </datalist>
          {pokemonInvalid ? (
            <span id={pokemonErrorId} className="field-error">
              Choose Ditto, Eevee, or Pikachu.
            </span>
          ) : null}
        </label>
        <label>
          Scene Name
          <input
            aria-label="Scene Name"
            aria-invalid={sceneNameInvalid || sceneNameEmpty}
            aria-describedby={sceneNameInvalid || sceneNameEmpty ? sceneNameErrorId : undefined}
            value={sceneNameDraft}
            onBlur={handleSceneNameCommit}
            onChange={(event) => handleSceneNameChange(event.target.value)}
            readOnly={readOnly}
          />
          {sceneNameInvalid || sceneNameEmpty ? (
            <span id={sceneNameErrorId} className="field-error">
              Name must include 5x5.
            </span>
          ) : null}
        </label>
      </div>
      <div className="scene-controls__actions" aria-label="Scene status and tools">
        <span
          className="save-state"
          aria-label="Save status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {getSaveStatusText(readOnly, saveStatus, saveError)}
        </span>
        <button
          type="button"
          aria-label="Save scene"
          disabled={readOnly || saveStatus === 'saved' || hasValidationError}
          onClick={onSave}
        >
          Save
        </button>
        <button type="button" aria-label="Undo" disabled={readOnly || !canUndo} onClick={onUndo}>
          Undo
        </button>
        <button type="button" aria-label="Redo" disabled={readOnly || !canRedo} onClick={onRedo}>
          Redo
        </button>
        <button type="button" aria-label="Toggle grid" aria-pressed="true" disabled={readOnly}>
          Grid
        </button>
      </div>
    </header>
  );
}

function getSaveStatusText(readOnly: boolean, saveStatus: SaveStatus, saveError: string | null): string {
  const modePrefix = readOnly ? 'Read-only · ' : '';

  if (saveStatus === 'saveError') {
    return `${modePrefix}Save failed${saveError ? `: ${saveError}` : ''}`;
  }

  return `${modePrefix}${saveStatus === 'dirty' ? 'Dirty' : 'Saved'}`;
}
