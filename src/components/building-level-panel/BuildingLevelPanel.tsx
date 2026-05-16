import { useEffect, useState } from 'react';
import type { BuildingLevelContext } from '../../domain/scene';

interface BuildingLevelPanelProps {
  levels: BuildingLevelContext[];
  readOnly: boolean;
  feedback: string | null;
  onCreateLayer: () => void;
  onRenameLayer: (levelId: string, name: string) => void;
  onSetCurrentLayer: (levelId: string) => void;
  onSetLayerVisible: (levelId: string, visible: boolean) => void;
  onSetLayerLocked: (levelId: string, locked: boolean) => void;
  onCopyLayer: (levelId: string) => void;
  onDeleteLayer: (levelId: string) => void;
}

export function BuildingLevelPanel({
  levels,
  readOnly,
  feedback,
  onCreateLayer,
  onRenameLayer,
  onSetCurrentLayer,
  onSetLayerVisible,
  onSetLayerLocked,
  onCopyLayer,
  onDeleteLayer,
}: BuildingLevelPanelProps) {
  const currentLevel = levels.find((level) => level.current);
  const [levelNames, setLevelNames] = useState<Record<string, string>>({});

  useEffect(() => {
    setLevelNames(Object.fromEntries(levels.map((level) => [level.id, level.name])));
  }, [levels]);

  return (
    <aside className="panel level-panel" aria-label="Building level panel">
      <div className="panel__header">
        <h2>建筑层</h2>
        <span aria-label="Current building level">
          Current {currentLevel?.displayId ?? 'None'}
        </span>
      </div>
      <div className="level-toolbar">
        <button type="button" disabled={readOnly} onClick={onCreateLayer}>
          New layer
        </button>
        {readOnly ? (
          <span aria-label="Building layer edit mode">
            Mobile View-only Mode · Layer edits disabled
          </span>
        ) : null}
        {feedback ? <span aria-label="Building layer feedback" role="status">{feedback}</span> : null}
      </div>
      <div className="level-list" role="list" aria-label="Building levels high to low">
        {levels.map((level) => (
          <article
            className={[
              'level-row',
              level.current ? 'level-row--current' : '',
              !level.visible ? 'level-row--hidden' : '',
              level.locked ? 'level-row--locked' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            role="listitem"
            aria-current={level.current ? 'true' : undefined}
            aria-label={`${level.displayId}, ${level.name}, ${level.instanceCount} instances, ${
              level.visible ? 'visible' : 'hidden'
            }, ${level.locked ? 'locked' : 'unlocked'}${
              level.current ? (readOnly ? ', viewing layer' : ', current editing layer') : ''
            }`}
            data-testid="building-level-row"
            data-level-id={level.id}
            data-level-number={level.levelNumber}
            data-display-id={level.displayId}
            data-current={level.current}
            data-visible={level.visible}
            data-locked={level.locked}
            key={level.id}
          >
            <span className="level-code">{level.displayId}</span>
            <div className="level-summary">
              <label>
                Layer name
                <input
                  aria-label={`Rename ${level.name}`}
                  value={levelNames[level.id] ?? level.name}
                  disabled={readOnly}
                  onChange={(event) =>
                    setLevelNames((current) => ({ ...current, [level.id]: event.target.value }))
                  }
                  onBlur={() => onRenameLayer(level.id, levelNames[level.id] ?? level.name)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
              <em aria-label={`${level.name} instance count`}>
                {level.instanceCount} items
              </em>
            </div>
            <span className={level.current ? 'level-badge level-badge--current' : 'level-badge'}>
              {level.current ? (readOnly ? 'Viewing' : 'Current') : 'Standby'}
            </span>
            <div className="level-state-tags" aria-label={`${level.name} layer state`}>
              <span className={level.visible ? 'level-state-tag' : 'level-state-tag level-state-tag--hidden'}>
                {level.visible ? 'Visible' : 'Hidden'}
              </span>
              <span className={level.locked ? 'level-state-tag level-state-tag--locked' : 'level-state-tag'}>
                {level.locked ? 'Locked' : 'Unlocked'}
              </span>
            </div>
            <div className="level-actions" aria-label={`${level.name} layer actions`}>
              <button
                type="button"
                disabled={level.current}
                data-disabled-reason={level.current ? 'current' : 'available'}
                aria-label={`${readOnly ? 'View' : 'Set'} ${level.name} as ${
                  readOnly ? 'viewing' : 'current building'
                } layer${level.current ? ' already current' : ''}`}
                onClick={() => onSetCurrentLayer(level.id)}
              >
                {readOnly ? 'View' : 'Set'}
              </button>
              <button
                type="button"
                disabled={readOnly}
                data-disabled-reason={readOnly ? 'read-only' : 'available'}
                aria-label={`${level.visible ? 'Hide' : 'Show'} ${level.name}${
                  readOnly ? ' disabled in read-only mode' : ''
                }`}
                onClick={() => onSetLayerVisible(level.id, !level.visible)}
              >
                {level.visible ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                disabled={readOnly}
                data-disabled-reason={readOnly ? 'read-only' : 'available'}
                aria-label={`${level.locked ? 'Unlock' : 'Lock'} ${level.name}${
                  readOnly ? ' disabled in read-only mode' : ''
                }`}
                onClick={() => onSetLayerLocked(level.id, !level.locked)}
              >
                {level.locked ? 'Unlock' : 'Lock'}
              </button>
              <button
                type="button"
                disabled={readOnly}
                data-disabled-reason={readOnly ? 'read-only' : 'available'}
                aria-label={`Copy ${level.name} (${level.displayId})${readOnly ? ' disabled in read-only mode' : ''}`}
                onClick={() => onCopyLayer(level.id)}
              >
                Copy
              </button>
              <button
                type="button"
                disabled={readOnly || level.locked}
                data-disabled-reason={readOnly ? 'read-only' : level.locked ? 'locked-layer' : 'available'}
                aria-label={`Delete ${level.name} (${level.displayId})${
                  readOnly
                    ? ' disabled in read-only mode'
                    : level.locked
                      ? ' disabled because layer is locked'
                      : ''
                }`}
                onClick={() => onDeleteLayer(level.id)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
