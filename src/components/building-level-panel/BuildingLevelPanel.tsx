const levels = [
  { id: 'L2', name: '2 层', count: 0, current: false },
  { id: 'L1', name: '1 层', count: 0, current: false },
  { id: 'L0', name: '0 层', count: 0, current: true },
];

export function BuildingLevelPanel() {
  return (
    <aside className="panel level-panel" aria-label="Building level panel">
      <div className="panel__header">
        <h2>建筑层</h2>
        <span>Current L0</span>
      </div>
      <div className="level-list">
        {levels.map((level) => (
          <button
            type="button"
            className={level.current ? 'level-row level-row--current' : 'level-row'}
            aria-pressed={level.current}
            aria-label={`${level.name}, ${level.count} instances`}
            key={level.id}
          >
            <span>{level.id}</span>
            <strong>{level.name}</strong>
            <em>{level.count} items</em>
          </button>
        ))}
      </div>
    </aside>
  );
}
