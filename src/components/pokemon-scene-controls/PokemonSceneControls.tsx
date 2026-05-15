interface PokemonSceneControlsProps {
  readOnly: boolean;
}

export function PokemonSceneControls({ readOnly }: PokemonSceneControlsProps) {
  return (
    <header className="scene-controls" aria-label="Pokemon scene controls">
      <div className="scene-controls__identity">
        <label>
          Pokemon
          <select aria-label="Current Pokemon" defaultValue="ditto" disabled={readOnly}>
            <option value="ditto">Ditto</option>
            <option value="eevee">Eevee</option>
            <option value="pikachu">Pikachu</option>
          </select>
        </label>
        <label>
          Scene Name
          <input aria-label="Scene Name" defaultValue="5x5 布景草稿" readOnly={readOnly} />
        </label>
      </div>
      <div className="scene-controls__actions" aria-label="Scene status and tools">
        <span className="save-state" aria-label="Save status">
          {readOnly ? 'Read-only' : 'Saved'}
        </span>
        <button type="button" aria-label="Undo" disabled>
          Undo
        </button>
        <button type="button" aria-label="Redo" disabled>
          Redo
        </button>
        <button type="button" aria-label="Toggle grid" aria-pressed="true">
          Grid
        </button>
      </div>
    </header>
  );
}
