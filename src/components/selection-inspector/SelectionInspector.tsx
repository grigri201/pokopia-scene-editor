import type { CSSProperties } from 'react';
import {
  getAssetById,
  getAssetSkillMarkerIconUrl,
  type ConcreteAssetSkillType,
  type AssetSkillType,
} from '../../domain/assets';
import {
  type BuildingLevel,
  type CellContext,
  type GridCoordinate,
  type GridSize,
  type RotationDegrees,
  type SceneDimensions,
  type SkillMarker,
  type TileInstance,
} from '../../domain/scene';
import type { AssetPlacementPreview } from '../../state';
import { defaultLocale, getAssetDisplay, getSkillDisplay, t, type Locale } from '../../i18n';

interface SelectionInspectorProps {
  locale?: Locale;
  selectedContext: CellContext | null;
  selectedInstance: TileInstance | null;
  selectedInstanceId: string | null;
  selectedSkillMarker: SkillMarker | null;
  targetContext: CellContext | null;
  targetPlacement: AssetPlacementPreview | null;
  canvasSize: GridSize;
  sceneDimensions: SceneDimensions;
  buildingLevels: readonly BuildingLevel[];
  tileInstances: readonly TileInstance[];
  readOnly: boolean;
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
}

export function SelectionInspector({
  locale = defaultLocale,
  selectedContext,
  selectedInstance,
  selectedSkillMarker,
  buildingLevels,
  readOnly,
  onDeleteInstance,
  onRotateInstance,
  onSaveInstanceSkill,
  onSaveCellSkill,
}: SelectionInspectorProps) {
  const context = selectedContext;
  const asset = getAssetById(selectedInstance?.assetId);
  const canEditSelectedSkill = Boolean(context?.placeable && (!selectedInstance || asset || selectedSkillMarker));
  const selectedLevel = selectedInstance
    ? buildingLevels.find((level) => level.id === selectedInstance.buildingLevelId)
    : context?.buildingLevel;
  const coordinate = selectedInstance?.coordinate ?? context?.coordinate ?? null;
  const activeSkillType = selectedSkillMarker?.skillType ?? (selectedInstance?.requiresSkill ? selectedInstance.skillType : null);
  const activeSkillNote = selectedSkillMarker?.skillNote ?? selectedInstance?.skillNote ?? '';
  const nextRotation = getNextRotation(selectedInstance?.rotationDegrees ?? 0);
  const selectionSummary = [
    asset ? getAssetDisplay(asset, locale).name : (coordinate ? `${coordinate.x},${coordinate.y}` : t(locale, 'noSelection')),
    coordinate ? `x${coordinate.x} y${coordinate.y}` : null,
    selectedLevel ? `L${selectedLevel.levelNumber}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const emptyPromptStyle = {
    '--selection-empty-image': `url("${dittoPromptImageUrl}")`,
  } as CSSProperties;

  return (
    <section className="selection-inspector" aria-label={t(locale, 'selectionContext')}>
      <div
        className={[
          'current-selection-bar',
          coordinate ? '' : 'current-selection-bar--empty',
        ].filter(Boolean).join(' ')}
        aria-label={t(locale, 'currentSelectionActions')}
      >
        {coordinate ? (
          <div className="current-selection-bar__asset" aria-label={selectionSummary}>
            {asset ? <img src={asset.thumbnailUrl} alt="" /> : <span aria-hidden="true" />}
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
        {coordinate ? (
          <div className="current-selection-bar__actions" aria-label={t(locale, 'selectionEditActions')}>
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
          </div>
        ) : null}
      </div>
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
