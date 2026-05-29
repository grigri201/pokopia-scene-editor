import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { maxBuildingLevels, type BuildingLevelContext } from '@pokopia-scene-editor/scene-core';
import { defaultLocale, t, type Locale } from '../../i18n';

interface BuildingLevelPanelProps {
  locale?: Locale;
  levels: BuildingLevelContext[];
  readOnly: boolean;
  onCreateLayer: () => void;
  onSelectLayer: (levelId: string) => void;
  onRenameLayer: (levelId: string, name: string) => void;
  onCopyLayer: (levelId: string) => void;
  onDeleteLayer: (levelId: string) => void;
}

export function BuildingLevelPanel({
  locale = defaultLocale,
  levels,
  readOnly,
  onCreateLayer,
  onSelectLayer,
  onRenameLayer,
  onCopyLayer,
  onDeleteLayer,
}: BuildingLevelPanelProps) {
  const currentLevel = levels.find((level) => level.current);
  const layerLimitReached = levels.length >= maxBuildingLevels;
  const createLayerDisabled = readOnly || layerLimitReached;
  const createLayerTooltip = layerLimitReached
    ? t(locale, 'maxBuildingLayersReached', { count: maxBuildingLevels })
    : t(locale, 'newLayer');
  const copyLayerTooltip = layerLimitReached
    ? t(locale, 'maxBuildingLayersReached', { count: maxBuildingLevels })
    : t(locale, 'copyLayerTooltip');
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
    <aside className="panel level-panel" aria-label={t(locale, 'buildingLevelPanel')}>
      <div className="panel__header">
        <h2>{t(locale, 'buildingLevels')}</h2>
        <span className="sr-only" aria-label={t(locale, 'currentBuildingLevel')}>
          Current {currentLevel?.displayId ?? 'None'}
        </span>
        <button
          type="button"
          className="icon-button level-create-button has-icon-tooltip"
          aria-label={t(locale, 'newLayer')}
          data-disabled-reason={layerLimitReached ? 'max-layers' : readOnly ? 'read-only' : 'available'}
          data-tooltip={createLayerTooltip}
          title={createLayerTooltip}
          disabled={createLayerDisabled}
          onClick={onCreateLayer}
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
      {readOnly ? (
        <div className="level-toolbar">
          <span aria-label={t(locale, 'buildingLayerEditMode')}>
            {t(locale, 'mobileViewOnlyMode')}
          </span>
        </div>
      ) : null}
      <div className="level-list" role="list" aria-label={t(locale, 'buildingLevelsHighToLow')}>
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
            aria-label={`${level.displayId}, ${level.name}, ${t(locale, 'instanceCount', { count: level.instanceCount })}${
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
                <span className="sr-only">{t(locale, 'layerName')}</span>
                <input
                  aria-label={t(locale, 'renameLayer', { name: level.name })}
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
                {t(locale, 'instanceCount', { count: level.instanceCount })}
              </em>
            </div>
            <span className={level.current ? 'level-badge level-badge--current' : 'level-badge'} aria-hidden="true">
              {level.current ? (readOnly ? t(locale, 'viewing') : t(locale, 'current')) : t(locale, 'standby')}
            </span>
            <div className="level-actions" aria-label={t(locale, 'layerActions', { name: level.name })}>
              <button
                type="button"
                className="level-action-button level-action-button--copy has-icon-tooltip"
                disabled={readOnly || layerLimitReached}
                data-disabled-reason={layerLimitReached ? 'max-layers' : readOnly ? 'read-only' : 'available'}
                data-tooltip={copyLayerTooltip}
                aria-label={`${t(locale, 'copyLayer', { name: level.name, displayId: level.displayId })}${readOnly ? ' disabled in read-only mode' : ''}`}
                title={copyLayerTooltip}
                onClick={() => onCopyLayer(level.id)}
              >
                <CopyIcon />
              </button>
              <button
                type="button"
                className="level-action-button level-action-button--danger has-icon-tooltip"
                disabled={readOnly}
                data-disabled-reason={readOnly ? 'read-only' : 'available'}
                data-tooltip={t(locale, 'deleteLayerTooltip')}
                aria-label={`${t(locale, 'deleteLayer', { name: level.name, displayId: level.displayId })}${readOnly ? ' disabled in read-only mode' : ''}`}
                title={t(locale, 'deleteLayerTooltip')}
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
