import type { BuildingLevelContext } from '../../domain/scene';

interface BuildingLevelPanelProps {
  levels: BuildingLevelContext[];
  readOnly: boolean;
}

export function BuildingLevelPanel({ levels, readOnly }: BuildingLevelPanelProps) {
  const currentLevel = levels.find((level) => level.current);

  return (
    <aside className="panel level-panel" aria-label="Building level panel">
      <div className="panel__header">
        <h2>建筑层</h2>
        <span aria-label="Current building level">
          Current {currentLevel?.displayId ?? 'None'}
        </span>
      </div>
      <div className="level-list" role="list" aria-label="Building levels high to low">
        {levels.map((level) => (
          <article
            className={level.current ? 'level-row level-row--current' : 'level-row'}
            role="listitem"
            aria-current={level.current ? 'true' : undefined}
            aria-label={`${level.displayId}, ${level.name}, ${level.instanceCount} instances, ${
              level.visible ? 'visible' : 'hidden'
            }, ${level.locked ? 'locked' : 'unlocked'}${level.current ? ', current editing layer' : ''}`}
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
              <strong>{level.name}</strong>
              <em aria-label={`${level.name} instance count`}>
                {level.instanceCount} items
              </em>
            </div>
            <span className={level.current ? 'level-badge level-badge--current' : 'level-badge'}>
              {level.current ? 'Current' : 'Standby'}
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
                disabled
                data-disabled-reason={readOnly ? 'read-only' : 'reserved'}
                aria-label={`Set ${level.name} as current building layer${
                  readOnly ? ' disabled in read-only mode' : ' reserved for a later story'
                }`}
              >
                Set
              </button>
              <button
                type="button"
                disabled
                data-disabled-reason={readOnly ? 'read-only' : 'reserved'}
                aria-label={`${level.visible ? 'Hide' : 'Show'} ${level.name}${
                  readOnly ? ' disabled in read-only mode' : ' reserved for a later story'
                }`}
              >
                {level.visible ? 'Hide' : 'Show'}
              </button>
              <button
                type="button"
                disabled
                data-disabled-reason={readOnly ? 'read-only' : 'reserved'}
                aria-label={`${level.locked ? 'Unlock' : 'Lock'} ${level.name}${
                  readOnly ? ' disabled in read-only mode' : ' reserved for a later story'
                }`}
              >
                {level.locked ? 'Unlock' : 'Lock'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
