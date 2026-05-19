import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import type { BuildingLevelContext } from '../../domain/scene';

interface BuildingLevelPanelProps {
  levels: BuildingLevelContext[];
  readOnly: boolean;
  feedback: string | null;
  onCreateLayer: () => void;
  onSelectLayer: (levelId: string) => void;
  onRenameLayer: (levelId: string, name: string) => void;
  onCopyLayer: (levelId: string) => void;
  onDeleteLayer: (levelId: string) => void;
}

export function BuildingLevelPanel({
  levels,
  readOnly,
  feedback,
  onCreateLayer,
  onSelectLayer,
  onRenameLayer,
  onCopyLayer,
  onDeleteLayer,
}: BuildingLevelPanelProps) {
  const currentLevel = levels.find((level) => level.current);
  const [levelNames, setLevelNames] = useState<Record<string, string>>({});
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null);

  useEffect(() => {
    setLevelNames((current) => {
      const nextNames: Record<string, string> = {};
      for (const level of levels) {
        nextNames[level.id] = level.id === editingLevelId ? current[level.id] ?? level.name : level.name;
      }
      return nextNames;
    });
  }, [editingLevelId, levels]);

  const selectLevelFromRow = (levelId: string, target: EventTarget | null) => {
    if (isInteractiveLevelControl(target)) {
      return;
    }

    onSelectLayer(levelId);
  };

  const handleRowKeyDown = (event: KeyboardEvent<HTMLElement>, levelId: string) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    if (readOnly) {
      event.preventDefault();
      return;
    }

    if (isInteractiveLevelControl(event.target)) {
      return;
    }

    event.preventDefault();
    onSelectLayer(levelId);
  };

  return (
    <aside className="panel level-panel" aria-label="Building level panel">
      <div className="panel__header">
        <h2>建筑层</h2>
        <span className="sr-only" aria-label="Current building level">
          Current {currentLevel?.displayId ?? 'None'}
        </span>
        <button
          type="button"
          className="icon-button level-create-button has-icon-tooltip"
          aria-label="新建层"
          data-tooltip="新建层"
          title="新建层"
          disabled={readOnly}
          onClick={onCreateLayer}
        >
          <AddLayerIcon />
        </button>
      </div>
      <div className="level-toolbar">
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
            ]
              .filter(Boolean)
              .join(' ')}
            role="listitem"
            aria-current={level.current ? 'true' : undefined}
            aria-label={`${level.displayId}, ${level.name}, ${level.instanceCount} instances${
              level.current ? (readOnly ? ', viewing layer' : ', current editing layer') : ''
            }`}
            data-testid="building-level-row"
            data-level-id={level.id}
            data-level-number={level.levelNumber}
            data-display-id={level.displayId}
            data-current={level.current}
            tabIndex={0}
            key={level.id}
            onClick={(event: MouseEvent<HTMLElement>) => selectLevelFromRow(level.id, event.target)}
            onKeyDown={(event) => handleRowKeyDown(event, level.id)}
          >
            <span className="level-code">{level.displayId}</span>
            <div className="level-summary">
              <label>
                <span className="sr-only">Layer name</span>
                <input
                  aria-label={`Rename ${level.name}`}
                  value={levelNames[level.id] ?? level.name}
                  disabled={readOnly}
                  onChange={(event) =>
                    setLevelNames((current) => ({ ...current, [level.id]: event.target.value }))
                  }
                  onFocus={() => setEditingLevelId(level.id)}
                  onBlur={(event) => {
                    const nextName = event.currentTarget.value;
                    setLevelNames((current) => ({ ...current, [level.id]: nextName }));
                    setEditingLevelId(null);
                    onRenameLayer(level.id, nextName);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                />
              </label>
              <em aria-label={`${level.name} instance count`}>
                {level.instanceCount} instances
              </em>
            </div>
            <span className={level.current ? 'level-badge level-badge--current' : 'level-badge'} aria-hidden="true">
              {level.current ? (readOnly ? 'Viewing' : 'Current') : 'Standby'}
            </span>
            <div className="level-actions" aria-label={`${level.name} layer actions`}>
              <button
                type="button"
                className="level-action-button level-action-button--copy has-icon-tooltip"
                disabled={readOnly}
                data-disabled-reason={readOnly ? 'read-only' : 'available'}
                data-tooltip="复制建筑层"
                aria-label={`Copy ${level.name} (${level.displayId})${readOnly ? ' disabled in read-only mode' : ''}`}
                title="复制建筑层"
                onClick={() => onCopyLayer(level.id)}
              >
                <CopyIcon />
              </button>
              <button
                type="button"
                className="level-action-button level-action-button--danger has-icon-tooltip"
                disabled={readOnly}
                data-disabled-reason={readOnly ? 'read-only' : 'available'}
                data-tooltip="删除建筑层"
                aria-label={`Delete ${level.name} (${level.displayId})${readOnly ? ' disabled in read-only mode' : ''}`}
                title="删除建筑层"
                onClick={() => onDeleteLayer(level.id)}
              >
                <DeleteIcon />
              </button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function isInteractiveLevelControl(target: EventTarget | null): boolean {
  return target instanceof Element
    ? Boolean(target.closest('button,input,select,textarea,a,[contenteditable="true"]'))
    : false;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="10" height="10" rx="2" />
      <path d="M6 14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function AddLayerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4" />
      <path d="M12 16v5" />
      <path d="M9.5 18.5h5" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M7 7l1 13h8l1-13" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}
