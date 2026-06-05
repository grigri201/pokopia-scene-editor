import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import {
  getAssetById,
  getAssetSkillMarkerIconUrl,
  getEffectiveAssetFootprint,
  getBuildingLevelDisplayId,
  type ConcreteAssetSkillType,
  type AssetSkillType,
} from '@pokopia-scene-editor/scene-core';
import {
  type BuildingLevel,
  type CellContext,
  type GridCoordinate,
  type GridSize,
  type RotationDegrees,
  type SceneDimensions,
  type SkillMarker,
  type StackingRelation,
  type TileInstance,
} from '@pokopia-scene-editor/scene-core';
import type { AssetPlacementPreview } from '../../state';
import { defaultLocale, getAssetDisplay, getSkillDisplay, t, type Locale } from '../../i18n';
import { getStackingSplitDisplay } from '../stacking-display';

interface SelectionInspectorProps {
  locale?: Locale;
  selectedContext: CellContext | null;
  selectedInstance: TileInstance | null;
  selectedInstanceId: string | null;
  selectedSkillMarker: SkillMarker | null;
  stackingRelations: readonly StackingRelation[];
  targetContext: CellContext | null;
  targetPlacement: AssetPlacementPreview | null;
  canvasSize: GridSize;
  sceneDimensions: SceneDimensions;
  buildingLevels: readonly BuildingLevel[];
  currentBuildingLevel: BuildingLevel | null;
  tileInstances: readonly TileInstance[];
  readOnly: boolean;
  onSelectInstance: (instanceId: string) => void;
  onDeleteInstance: (instanceId: string) => void;
  onRotateInstance: (instanceId: string, rotationDegrees: RotationDegrees) => void;
  onSaveInstanceSkill: (
    instanceId: string,
    requiresSkill: boolean,
    skillType: AssetSkillType,
    skillNote: string,
  ) => void;
  onSaveCellSkill: (
    coordinate: GridCoordinate,
    buildingLevelId: string,
    requiresSkill: boolean,
    skillType: AssetSkillType,
    skillNote: string,
  ) => void;
  onAddLayerNote: (levelId: string, text: string) => boolean;
  onUpdateLayerNote: (levelId: string, noteId: string, text: string) => boolean;
  onDeleteLayerNote: (levelId: string, noteId: string) => boolean;
}

export function SelectionInspector({
  locale = defaultLocale,
  selectedContext,
  selectedInstance,
  selectedInstanceId,
  selectedSkillMarker,
  stackingRelations,
  buildingLevels,
  currentBuildingLevel,
  tileInstances,
  readOnly,
  onSelectInstance,
  onDeleteInstance,
  onRotateInstance,
  onSaveInstanceSkill,
  onSaveCellSkill,
  onAddLayerNote,
  onUpdateLayerNote,
  onDeleteLayerNote,
}: SelectionInspectorProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const context = selectedContext;
  const asset = getAssetById(selectedInstance?.assetId);
  const assetDisplay = asset ? getAssetDisplay(asset, locale) : null;
  const canEditSelectedSkill = Boolean(context?.placeable && (!selectedInstance || asset || selectedSkillMarker));
  const selectedLevel = selectedInstance
    ? buildingLevels.find((level) => level.id === selectedInstance.buildingLevelId) ?? null
    : context?.buildingLevel ?? null;
  const layerNotesLevel = currentBuildingLevel ?? selectedLevel ?? null;
  const coordinate = selectedInstance?.coordinate ?? context?.coordinate ?? null;
  const activeSkillType = selectedSkillMarker?.skillType ?? (selectedInstance?.requiresSkill ? selectedInstance.skillType : null);
  const activeSkillNote = selectedSkillMarker?.skillNote ?? selectedInstance?.skillNote ?? '';
  const nextRotation = getNextRotation(selectedInstance?.rotationDegrees ?? 0);
  const selectedStackingRelation = getSelectedStackingRelation(stackingRelations, context);
  const stackItems = selectedStackingRelation
    ? getStackItems(selectedStackingRelation, tileInstances).filter((item) => item.instanceId !== selectedInstanceId)
    : [];
  const selectionSummary = [
    assetDisplay ? assetDisplay.name : selectedInstance?.assetId ?? (coordinate ? `${coordinate.x},${coordinate.y}` : t(locale, 'noSelection')),
    coordinate ? `x${coordinate.x} y${coordinate.y}` : null,
    selectedLevel ? getBuildingLevelDisplayId(selectedLevel.levelNumber) : null,
  ]
    .filter(Boolean)
    .join(', ');
  const compactMetaItems = [
    coordinate ? `x${coordinate.x} y${coordinate.y}` : null,
    selectedLevel ? getBuildingLevelDisplayId(selectedLevel.levelNumber) : null,
    selectedInstance ? `${selectedInstance.rotationDegrees} deg` : null,
  ].filter(Boolean);
  const selectedAssetLabel = assetDisplay?.name ?? selectedInstance?.assetId ?? (coordinate ? t(locale, 'emptyGridCell') : t(locale, 'noSelection'));
  const detailsId = 'selection-details-panel';
  const emptyPromptStyle = {
    '--selection-empty-image': `url("${dittoPromptImageUrl}")`,
  } as CSSProperties;

  return (
    <section
      className="selection-inspector"
      aria-label={t(locale, 'selectionContext')}
      data-details-expanded={detailsExpanded}
    >
      <div
        className={[
          'current-selection-bar',
          coordinate ? '' : 'current-selection-bar--empty',
        ].filter(Boolean).join(' ')}
        aria-label={t(locale, 'currentSelectionActions')}
      >
        {coordinate ? (
          <div className="current-selection-bar__asset" aria-label={selectionSummary}>
            {asset && assetDisplay ? (
              <>
                <img src={asset.thumbnailUrl} alt="" />
                <span className="current-selection-bar__asset-copy">
                  <span className="current-selection-bar__asset-name" title={assetDisplay.name}>
                    {assetDisplay.name}
                  </span>
                  <span className="current-selection-bar__meta">
                    {compactMetaItems.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </span>
                </span>
              </>
            ) : (
              <>
                <span className="current-selection-bar__asset-placeholder" aria-hidden="true" />
                <span className="current-selection-bar__asset-copy">
                  <span className="current-selection-bar__asset-name">{selectedAssetLabel}</span>
                  <span className="current-selection-bar__meta">
                    {compactMetaItems.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </span>
                </span>
              </>
            )}
          </div>
        ) : (
          <div
            className="selection-empty-prompt"
            aria-label={t(locale, 'noSelectedGridCell')}
            style={emptyPromptStyle}
          >
            <span>{t(locale, 'emptySelectionPrompt')}</span>
          </div>
        )}
        {stackItems.length > 0 ? (
          <div className="current-selection-bar__stack" aria-label="Stacking relation">
            {stackItems.map((item) => {
              const itemAsset = getAssetById(item.assetId);
              const itemDisplay = itemAsset ? getAssetDisplay(itemAsset, locale).name : item.assetId;

              return (
                <button
                  type="button"
                  className={[
                    'current-selection-stack-button',
                    'has-icon-tooltip',
                    selectedInstanceId === item.instanceId ? 'current-selection-stack-button--active' : '',
                  ].filter(Boolean).join(' ')}
                  aria-label={`Stack ${item.role}: ${itemDisplay}`}
                  aria-pressed={selectedInstanceId === item.instanceId}
                  data-tooltip={`Stack ${item.role}: ${itemDisplay}`}
                  data-stacking-role={item.role}
                  data-instance-id={item.instanceId}
                  data-asset-id={item.assetId}
                  title={`Stack ${item.role}: ${itemDisplay}`}
                  key={item.role}
                  onClick={() => onSelectInstance(item.instanceId)}
                >
                  {itemAsset ? <img src={itemAsset.thumbnailUrl} alt="" /> : null}
                  <span className="sr-only">{itemDisplay}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="current-selection-bar__actions" aria-label={t(locale, 'selectionEditActions')}>
          {coordinate ? (
            <>
            {selectedInstance ? (
              <button
                type="button"
                className="current-selection-action-button current-selection-action-button--rotate has-icon-tooltip"
                aria-label={t(locale, 'rotate90')}
                data-tooltip={t(locale, 'rotate90')}
                title={t(locale, 'rotate90')}
                disabled={readOnly}
                onClick={() => onRotateInstance(selectedInstance.instanceId, nextRotation)}
              >
                <RotateIcon />
              </button>
            ) : null}
            <button
              type="button"
              className="current-selection-action-button current-selection-action-button--clear has-icon-tooltip"
              aria-label={t(locale, 'clearSelectedMaterial')}
              data-tooltip={t(locale, 'clearMaterial')}
              title={t(locale, 'clearMaterial')}
              disabled={readOnly || !selectedInstance}
              onClick={() => {
                if (!selectedInstance) {
                  return;
                }

                onDeleteInstance(selectedInstance.instanceId);
              }}
            >
              <ClearMaterialIcon />
            </button>
            {selectionSkillActions.map((action) => {
              const isActiveSkill = activeSkillType === action.skillType;
              const skillDisplay = getSkillDisplay(action.skillType, locale);
              const actionLabel = locale === 'zh-CN' ? action.label : skillDisplay.name;
              const tooltipLabel = locale === 'zh-CN' ? action.tooltipLabel ?? action.label : skillDisplay.name;

              return (
                <button
                  type="button"
                  className={[
                    'current-selection-action-button',
                    'current-selection-action-button--skill',
                    'has-icon-tooltip',
                    isActiveSkill ? 'current-selection-action-button--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={t(locale, 'setSkillMarker', { label: actionLabel })}
                  aria-pressed={isActiveSkill}
                  data-tooltip={tooltipLabel}
                  title={tooltipLabel}
                  disabled={readOnly || !canEditSelectedSkill}
                  key={action.skillType}
                  onClick={() => {
                    if (selectedSkillMarker || !selectedInstance) {
                      if (!context) {
                        return;
                      }

                      onSaveCellSkill(
                        context.coordinate,
                        context.buildingLevel.id,
                        !isActiveSkill,
                        action.skillType,
                        activeSkillNote,
                      );
                      return;
                    }

                    if (!selectedInstance) {
                      return;
                    }

                    onSaveInstanceSkill(
                      selectedInstance.instanceId,
                      !isActiveSkill,
                      action.skillType,
                      activeSkillNote,
                    );
                  }}
                >
                  <img src={action.iconUrl} alt="" />
                </button>
              );
            })}
            </>
          ) : null}
          <button
            type="button"
            className="current-selection-action-button current-selection-action-button--details has-icon-tooltip"
            aria-controls={detailsId}
            aria-expanded={detailsExpanded}
            aria-label={t(locale, detailsExpanded ? 'collapseSelectionDetails' : 'expandSelectionDetails')}
            data-tooltip={t(locale, detailsExpanded ? 'collapseSelectionDetails' : 'expandSelectionDetails')}
            title={t(locale, detailsExpanded ? 'collapseSelectionDetails' : 'expandSelectionDetails')}
            onClick={() => setDetailsExpanded((current) => !current)}
          >
            <DetailsIcon />
          </button>
        </div>
      </div>
      <section
        id={detailsId}
        className="selection-details-panel"
        aria-label={t(locale, 'selectionDetails')}
        hidden={!detailsExpanded}
        inert={!detailsExpanded ? true : undefined}
        aria-hidden={!detailsExpanded ? true : undefined}
      >
        <SelectionDetailsSummary
          locale={locale}
          assetName={assetDisplay?.name ?? null}
          assetId={selectedInstance?.assetId ?? null}
          coordinate={coordinate}
          selectedLevel={selectedLevel}
          rotationDegrees={selectedInstance?.rotationDegrees ?? null}
          dyeColor={selectedInstance?.dyeColor ?? null}
          skillType={activeSkillType}
          skillNote={activeSkillNote}
        />
        {layerNotesLevel ? (
          <LayerNotesPanel
            locale={locale}
            level={layerNotesLevel}
            readOnly={readOnly}
            onAddLayerNote={onAddLayerNote}
            onUpdateLayerNote={onUpdateLayerNote}
            onDeleteLayerNote={onDeleteLayerNote}
          />
        ) : null}
      </section>
    </section>
  );
}

const dittoPromptImageUrl = `${normalizeBaseUrl(import.meta.env.BASE_URL)}assets/pokopia_image_sources/pokemon_portraits/063-ditto.png`;

const selectionSkillActions: {
  skillType: ConcreteAssetSkillType;
  label: string;
  tooltipLabel?: string;
  iconUrl: string;
}[] = [
  {
    skillType: '树叶',
    label: '树叶',
    iconUrl: getAssetSkillMarkerIconUrl('树叶') ?? '',
  },
  {
    skillType: '耕地',
    label: '耕地',
    iconUrl: getAssetSkillMarkerIconUrl('耕地') ?? '',
  },
  {
    skillType: '储水',
    label: '蓄水',
    tooltipLabel: '储水',
    iconUrl: getAssetSkillMarkerIconUrl('储水') ?? '',
  },
];

function getSelectedStackingRelation(
  stackingRelations: readonly StackingRelation[],
  context: CellContext | null,
): StackingRelation | null {
  if (!context) {
    return null;
  }

  return stackingRelations.find((relation) =>
    relation.buildingLevelId === context.buildingLevel.id &&
    relation.coordinates.some((coordinate) =>
      coordinate.x === context.coordinate.x &&
      coordinate.y === context.coordinate.y),
  ) ?? null;
}

function getStackItems(
  relation: StackingRelation,
  tileInstances: readonly TileInstance[],
): Array<{
  role: 'top' | 'base';
  instanceId: string;
  assetId: string;
}> {
  const topInstance = tileInstances.find((instance) => instance.instanceId === relation.topInstanceId) ?? null;
  const baseInstance = tileInstances.find((instance) => instance.instanceId === relation.baseInstanceId) ?? null;
  const topFootprint = getStackItemFootprint(relation.topAssetId, topInstance);
  const baseFootprint = getStackItemFootprint(relation.baseAssetId, baseInstance);
  const stackingDisplay = getStackingSplitDisplay({ topFootprint, baseFootprint });
  const items: Array<{
    role: 'top' | 'base';
    instanceId: string;
    assetId: string;
  }> = [
    {
      role: 'top',
      instanceId: relation.topInstanceId,
      assetId: relation.topAssetId,
    },
  ];

  if (stackingDisplay.showBaseImage) {
    items.push({
      role: 'base',
      instanceId: relation.baseInstanceId,
      assetId: relation.baseAssetId,
    });
  }

  return items;
}

function getStackItemFootprint(assetId: string, instance: TileInstance | null) {
  const asset = getAssetById(assetId);

  if (!asset) {
    return null;
  }

  return getEffectiveAssetFootprint(asset.footprint, instance?.rotationDegrees ?? 0);
}

function SelectionDetailsSummary({
  locale,
  assetName,
  assetId,
  coordinate,
  selectedLevel,
  rotationDegrees,
  dyeColor,
  skillType,
  skillNote,
}: {
  locale: Locale;
  assetName: string | null;
  assetId: string | null;
  coordinate: GridCoordinate | null;
  selectedLevel: BuildingLevel | null;
  rotationDegrees: RotationDegrees | null;
  dyeColor: string | null | undefined;
  skillType: AssetSkillType | null;
  skillNote: string;
}) {
  const skillDisplay = skillType ? getSkillDisplay(skillType, locale).name : t(locale, 'noSkillMarker');

  return (
    <section className="selection-details-summary" aria-label={t(locale, 'selectedInstanceDetails')}>
      <div className="selection-details-summary__header">
        <h2>{t(locale, 'selectedInstanceDetails')}</h2>
        <span>{t(locale, 'futureInstanceDetails')}</span>
      </div>
      <dl>
        <div>
          <dt>{t(locale, 'selectionAsset')}</dt>
          <dd>{assetName ?? assetId ?? t(locale, 'emptyGridCell')}</dd>
        </div>
        {assetId ? (
          <div>
            <dt>assetId</dt>
            <dd>{assetId}</dd>
          </div>
        ) : null}
        {coordinate ? (
          <div>
            <dt>{t(locale, 'selectionCoordinate')}</dt>
            <dd>{coordinate.x},{coordinate.y}</dd>
          </div>
        ) : null}
        {selectedLevel ? (
          <div>
            <dt>{t(locale, 'selectionBuildingLayer')}</dt>
            <dd>{getBuildingLevelDisplayId(selectedLevel.levelNumber)} {selectedLevel.name}</dd>
          </div>
        ) : null}
        {rotationDegrees !== null ? (
          <div>
            <dt>{t(locale, 'selectionRotation')}</dt>
            <dd>{rotationDegrees} deg</dd>
          </div>
        ) : null}
        {dyeColor ? (
          <div>
            <dt>{t(locale, 'selectionDye')}</dt>
            <dd>{dyeColor}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t(locale, 'skillMarker')}</dt>
          <dd>{skillDisplay}</dd>
        </div>
        <div>
          <dt>{t(locale, 'skillNote')}</dt>
          <dd>{skillNote.trim() ? skillNote : t(locale, 'noSkillNote')}</dd>
        </div>
      </dl>
    </section>
  );
}

function DetailsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </svg>
  );
}

function RotateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4.9 7.4h7.2a4.7 4.7 0 0 1 4.7 4.7v5" />
      <path d="m14.1 14.4 2.7 2.7 2.7-2.7" />
    </svg>
  );
}

function ClearMaterialIcon() {
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

function DeleteNoteIcon() {
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

function LayerNotesPanel({
  locale,
  level,
  readOnly,
  onAddLayerNote,
  onUpdateLayerNote,
  onDeleteLayerNote,
}: {
  locale: Locale;
  level: BuildingLevel;
  readOnly: boolean;
  onAddLayerNote: (levelId: string, text: string) => boolean;
  onUpdateLayerNote: (levelId: string, noteId: string, text: string) => boolean;
  onDeleteLayerNote: (levelId: string, noteId: string) => boolean;
}) {
  const [draftText, setDraftText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  useEffect(() => {
    setDraftText('');
    setEditingNoteId(null);
    setEditingText('');
  }, [level.id]);

  useEffect(() => {
    if (!readOnly) {
      return;
    }

    setEditingNoteId(null);
    setEditingText('');
  }, [readOnly]);

  const submitNewNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (readOnly || !draftText.trim()) {
      return;
    }

    if (onAddLayerNote(level.id, draftText)) {
      setDraftText('');
    }
  };

  const submitEditedNote = (event: FormEvent<HTMLFormElement>, noteId: string) => {
    event.preventDefault();
    if (readOnly || !editingText.trim()) {
      return;
    }

    if (onUpdateLayerNote(level.id, noteId, editingText)) {
      setEditingNoteId(null);
      setEditingText('');
    }
  };

  return (
    <section className="layer-notes-panel" aria-label={t(locale, 'layerNotes')}>
      <div className="layer-notes-panel__header">
        <h2>{t(locale, 'layerNotes')}</h2>
        {readOnly ? <span>{t(locale, 'layerNotesReadonly')}</span> : null}
      </div>
      <form className="layer-note-form" onSubmit={submitNewNote}>
        <label className="sr-only" htmlFor={`layer-note-input-${level.id}`}>
          {t(locale, 'addLayerNoteInput')}
        </label>
        <textarea
          id={`layer-note-input-${level.id}`}
          aria-label={t(locale, 'addLayerNoteInput')}
          value={draftText}
          rows={2}
          disabled={readOnly}
          onChange={(event) => setDraftText(event.target.value)}
        />
        <button type="submit" disabled={readOnly || !draftText.trim()}>
          {t(locale, 'addLayerNote')}
        </button>
      </form>
      {level.notes.length > 0 ? (
        <ol className="layer-note-list" aria-label={t(locale, 'layerNoteList')}>
          {level.notes.map((note, index) => {
            const noteIndex = index + 1;

            return (
              <li className="layer-note-item" key={note.id}>
                {editingNoteId === note.id ? (
                  <form className="layer-note-edit-form" onSubmit={(event) => submitEditedNote(event, note.id)}>
                    <label className="sr-only" htmlFor={`layer-note-edit-${note.id}`}>
                      {t(locale, 'editLayerNoteInput', { index: noteIndex })}
                    </label>
                    <textarea
                      id={`layer-note-edit-${note.id}`}
                      aria-label={t(locale, 'editLayerNoteInput', { index: noteIndex })}
                      value={editingText}
                      rows={2}
                      disabled={readOnly}
                      onChange={(event) => setEditingText(event.target.value)}
                    />
                    <div className="layer-note-item__actions">
                      <button type="submit" disabled={readOnly || !editingText.trim()}>
                        {t(locale, 'saveLayerNote')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(null);
                          setEditingText('');
                        }}
                      >
                        {t(locale, 'cancelLayerNote')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    <p>{note.text}</p>
                    <div className="layer-note-item__actions">
                      <button
                        type="button"
                        aria-label={t(locale, 'editLayerNoteAction', { index: noteIndex })}
                        disabled={readOnly}
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditingText(note.text);
                        }}
                      >
                        {t(locale, 'editLayerNote')}
                      </button>
                      <button
                        type="button"
                        className="layer-note-icon-button layer-note-icon-button--danger has-icon-tooltip"
                        aria-label={t(locale, 'deleteLayerNoteAction', { index: noteIndex })}
                        data-tooltip={t(locale, 'deleteLayerNote')}
                        title={t(locale, 'deleteLayerNote')}
                        disabled={readOnly}
                        onClick={() => onDeleteLayerNote(level.id, note.id)}
                      >
                        <DeleteNoteIcon />
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="layer-notes-empty">{t(locale, 'noLayerNotes')}</p>
      )}
    </section>
  );
}

function getNextRotation(rotationDegrees: RotationDegrees): RotationDegrees {
  if (rotationDegrees === 0) {
    return 90;
  }

  if (rotationDegrees === 90) {
    return 180;
  }

  if (rotationDegrees === 180) {
    return 270;
  }

  return 0;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}
