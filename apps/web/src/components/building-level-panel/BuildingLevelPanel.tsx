import { useEffect, useMemo, useState, type DragEvent, type KeyboardEvent, type MouseEvent } from 'react';
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
  onReorderLayer: (levelIds: string[]) => void;
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
  onReorderLayer,
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
  const [draggingLevelId, setDraggingLevelId] = useState<string | null>(null);
  const [previewLevelIds, setPreviewLevelIds] = useState<string[] | null>(null);
  const [reorderAnnouncement, setReorderAnnouncement] = useState('');
  const orderedLevels = useMemo(() => {
    if (!previewLevelIds) {
      return levels;
    }

    const levelsById = new Map(levels.map((level) => [level.id, level]));
    const previewLevels = previewLevelIds
      .map((levelId) => levelsById.get(levelId))
      .filter((level): level is BuildingLevelContext => Boolean(level));

    return previewLevels.length === levels.length ? previewLevels : levels;
  }, [levels, previewLevelIds]);

  useEffect(() => {
    setLevelNames((current) => {
      const nextNames: Record<string, string> = {};
      for (const level of levels) {
        nextNames[level.id] = level.id === editingLevelId ? current[level.id] ?? level.name : level.name;
      }
      return nextNames;
    });
  }, [editingLevelId, levels]);

  useEffect(() => {
    if (!previewLevelIds) {
      return;
    }

    const levelIds = new Set(levels.map((level) => level.id));
    if (previewLevelIds.length !== levels.length || previewLevelIds.some((levelId) => !levelIds.has(levelId))) {
      setPreviewLevelIds(null);
      setDraggingLevelId(null);
    }
  }, [levels, previewLevelIds]);

  const getCurrentDisplayOrder = () => orderedLevels.map((level) => level.id);

  const previewReorder = (sourceLevelId: string, targetLevelId: string) => {
    if (readOnly || sourceLevelId === targetLevelId) {
      return;
    }

    const nextOrder = moveLevelId(getCurrentDisplayOrder(), sourceLevelId, targetLevelId);
    setPreviewLevelIds(nextOrder);
  };

  const announceReorder = (announcement: string) => {
    setReorderAnnouncement('');
    window.setTimeout(() => setReorderAnnouncement(announcement), 0);
  };

  const commitReorder = (levelIds: string[], announcement: string) => {
    const currentOrder = levels.map((level) => level.id);
    setPreviewLevelIds(null);
    setDraggingLevelId(null);
    if (levelIds.length !== currentOrder.length || levelIds.every((levelId, index) => levelId === currentOrder[index])) {
      return;
    }

    onReorderLayer(levelIds);
    announceReorder(announcement);
  };

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, levelId: string) => {
    if (readOnly) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', levelId);
    setDraggingLevelId(levelId);
    setPreviewLevelIds(levels.map((level) => level.id));
  };

  const handleDragOver = (event: DragEvent<HTMLElement>, targetLevelId: string) => {
    if (!draggingLevelId || readOnly) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    previewReorder(draggingLevelId, targetLevelId);
  };

  const handleDrop = (event: DragEvent<HTMLElement>, targetLevelId: string) => {
    if (!draggingLevelId || readOnly) {
      return;
    }

    event.preventDefault();
    const nextOrder = moveLevelId(levels.map((level) => level.id), draggingLevelId, targetLevelId);
    commitReorder(nextOrder, t(locale, 'layerReorderDropped'));
  };

  const handleDragEnd = () => {
    setDraggingLevelId(null);
    setPreviewLevelIds(null);
  };

  const moveLayerByKeyboard = (levelId: string, direction: 'up' | 'down') => {
    if (readOnly) {
      return;
    }

    const currentOrder = levels.map((level) => level.id);
    const currentIndex = currentOrder.indexOf(levelId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= currentOrder.length) {
      return;
    }

    const nextOrder = [...currentOrder];
    const [movedLevelId] = nextOrder.splice(currentIndex, 1);
    nextOrder.splice(targetIndex, 0, movedLevelId);
    commitReorder(nextOrder, t(locale, direction === 'up' ? 'layerMovedUp' : 'layerMovedDown'));
  };

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
        <span className="sr-only" aria-live="polite">{reorderAnnouncement}</span>
        {orderedLevels.map((level, index) => (
          <article
            className={[
              'level-row',
              level.current ? 'level-row--current' : '',
              draggingLevelId === level.id ? 'level-row--dragging' : '',
              previewLevelIds ? 'level-row--preview' : '',
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
            data-dragging={draggingLevelId === level.id}
            tabIndex={0}
            key={level.id}
            onClick={(event: MouseEvent<HTMLElement>) => selectLevelFromRow(level.id, event.target)}
            onKeyDown={(event) => handleRowKeyDown(event, level.id)}
            onDragOver={(event) => handleDragOver(event, level.id)}
            onDrop={(event) => handleDrop(event, level.id)}
          >
            <button
              type="button"
              className="level-drag-handle has-icon-tooltip"
              aria-label={t(locale, 'reorderLayer', { name: level.name, displayId: level.displayId })}
              data-disabled-reason={readOnly ? 'read-only' : 'available'}
              data-tooltip={t(locale, 'reorderLayerTooltip')}
              title={t(locale, 'reorderLayerTooltip')}
              disabled={readOnly}
              draggable={!readOnly}
              onDragStart={(event) => handleDragStart(event, level.id)}
              onDragEnd={handleDragEnd}
            >
              <DragHandleIcon />
            </button>
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
                className="level-action-button level-action-button--reorder has-icon-tooltip"
                disabled={readOnly || index === 0}
                data-disabled-reason={readOnly ? 'read-only' : index === 0 ? 'edge' : 'available'}
                data-tooltip={t(locale, 'moveLayerUpTooltip')}
                aria-label={`${t(locale, 'moveLayerUp', { name: level.name, displayId: level.displayId })}${readOnly ? ' disabled in read-only mode' : ''}`}
                title={t(locale, 'moveLayerUpTooltip')}
                onClick={() => moveLayerByKeyboard(level.id, 'up')}
              >
                <MoveUpIcon />
              </button>
              <button
                type="button"
                className="level-action-button level-action-button--reorder has-icon-tooltip"
                disabled={readOnly || index === orderedLevels.length - 1}
                data-disabled-reason={readOnly ? 'read-only' : index === orderedLevels.length - 1 ? 'edge' : 'available'}
                data-tooltip={t(locale, 'moveLayerDownTooltip')}
                aria-label={`${t(locale, 'moveLayerDown', { name: level.name, displayId: level.displayId })}${readOnly ? ' disabled in read-only mode' : ''}`}
                title={t(locale, 'moveLayerDownTooltip')}
                onClick={() => moveLayerByKeyboard(level.id, 'down')}
              >
                <MoveDownIcon />
              </button>
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

function moveLevelId(levelIds: string[], sourceLevelId: string, targetLevelId: string): string[] {
  const sourceIndex = levelIds.indexOf(sourceLevelId);
  const targetIndex = levelIds.indexOf(targetLevelId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return levelIds;
  }

  const nextLevelIds = [...levelIds];
  const [movedLevelId] = nextLevelIds.splice(sourceIndex, 1);
  nextLevelIds.splice(targetIndex, 0, movedLevelId);
  return nextLevelIds;
}

function DragHandleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M9 6h.01" />
      <path d="M15 6h.01" />
      <path d="M9 12h.01" />
      <path d="M15 12h.01" />
      <path d="M9 18h.01" />
      <path d="M15 18h.01" />
    </svg>
  );
}

function MoveUpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </svg>
  );
}

function MoveDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 5v14" />
      <path d="M18 13l-6 6-6-6" />
    </svg>
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
