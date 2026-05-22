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
  type GridSize,
  type RotationDegrees,
  type SceneDimensions,
  type TileInstance,
} from '../../domain/scene';
import type { AssetPlacementPreview } from '../../state';

interface SelectionInspectorProps {
  selectedContext: CellContext | null;
  selectedInstance: TileInstance | null;
  selectedInstanceId: string | null;
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
}

export function SelectionInspector({
  selectedContext,
  selectedInstance,
  buildingLevels,
  readOnly,
  onDeleteInstance,
  onRotateInstance,
  onSaveInstanceSkill,
}: SelectionInspectorProps) {
  const context = selectedContext;
  const asset = getAssetById(selectedInstance?.assetId);
  const canEditSelectedSkill = Boolean(selectedInstance && asset);
  const selectedLevel = selectedInstance
    ? buildingLevels.find((level) => level.id === selectedInstance.buildingLevelId)
    : context?.buildingLevel;
  const coordinate = selectedInstance?.coordinate ?? context?.coordinate ?? null;
  const nextRotation = getNextRotation(selectedInstance?.rotationDegrees ?? 0);
  const selectionSummary = [
    asset?.name ?? (coordinate ? `${coordinate.x},${coordinate.y}` : 'No selection'),
    coordinate ? `x${coordinate.x} y${coordinate.y}` : null,
    selectedLevel ? `L${selectedLevel.levelNumber}` : null,
  ]
    .filter(Boolean)
    .join(', ');
  const emptyPromptStyle = {
    '--selection-empty-image': `url("${dittoPromptImageUrl}")`,
  } as CSSProperties;

  return (
    <section className="selection-inspector" aria-label="Selection context">
      <div
        className={[
          'current-selection-bar',
          coordinate ? '' : 'current-selection-bar--empty',
        ].filter(Boolean).join(' ')}
        aria-label="Current selection actions"
      >
        {coordinate ? (
          <div className="current-selection-bar__asset" aria-label={selectionSummary}>
            {asset ? <img src={asset.thumbnailUrl} alt="" /> : <span aria-hidden="true" />}
          </div>
        ) : (
          <div
            className="selection-empty-prompt"
            aria-label="No selected grid cell"
            style={emptyPromptStyle}
          >
            <span>点击一个编辑格查看或放置素材</span>
          </div>
        )}
        {coordinate ? (
          <div className="current-selection-bar__actions" aria-label="Selection edit actions">
            {selectedInstance ? (
              <button
                type="button"
                className="current-selection-action-button current-selection-action-button--rotate has-icon-tooltip"
                aria-label="旋转 90"
                data-tooltip="旋转 90"
                title="旋转 90"
                disabled={readOnly}
                onClick={() => onRotateInstance(selectedInstance.instanceId, nextRotation)}
              >
                <RotateIcon />
              </button>
            ) : null}
            <button
              type="button"
              className="current-selection-action-button current-selection-action-button--clear has-icon-tooltip"
              aria-label="清除选中格子中的素材"
              data-tooltip="清除素材"
              title="清除素材"
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
              const isActiveSkill =
                selectedInstance?.requiresSkill && selectedInstance.skillType === action.skillType;

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
                  aria-label={`设置技能标记：${action.label}`}
                  aria-pressed={isActiveSkill}
                  data-tooltip={action.tooltipLabel ?? action.label}
                  title={action.tooltipLabel ?? action.label}
                  disabled={readOnly || !canEditSelectedSkill}
                  key={action.skillType}
                  onClick={() => {
                    if (!selectedInstance) {
                      return;
                    }

                    onSaveInstanceSkill(
                      selectedInstance.instanceId,
                      !isActiveSkill,
                      action.skillType,
                      selectedInstance.skillNote,
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
