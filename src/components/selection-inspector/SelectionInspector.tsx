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
  targetContext,
  targetPlacement,
  buildingLevels,
  readOnly,
  onRotateInstance,
  onSaveInstanceSkill,
}: SelectionInspectorProps) {
  const context = selectedContext ?? targetContext;
  const asset = getAssetById(selectedInstance?.assetId);
  const canEditSelectedSkill = Boolean(selectedInstance && asset);
  const selectedLevel = selectedInstance
    ? buildingLevels.find((level) => level.id === selectedInstance.buildingLevelId)
    : context?.buildingLevel;
  const coordinate = selectedInstance?.coordinate ?? context?.coordinate ?? null;
  const nextRotation = getNextRotation(selectedInstance?.rotationDegrees ?? 0);

  return (
    <section className="selection-inspector" aria-label="Selection context">
      <div className="current-selection-bar" aria-label="Current selection actions">
        <div className="current-selection-bar__asset">
          {asset ? <img src={asset.thumbnailUrl} alt="" /> : <span aria-hidden="true" />}
          <div>
            <strong aria-label="Selected instance">
              {asset?.name ?? (coordinate ? `${coordinate.x},${coordinate.y}` : 'No selection')}
            </strong>
            <em aria-label="Selected coordinate">
              {coordinate
                ? `x${coordinate.x} y${coordinate.y} · ${selectedLevel ? `L${selectedLevel.levelNumber}` : 'No layer'}`
                : targetPlacement?.message ?? 'Choose an item or grid cell'}
            </em>
          </div>
        </div>
        {coordinate ? (
          <div className="current-selection-bar__actions" aria-label="Selection skill marker actions">
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
              aria-label="清除技能标记"
              data-tooltip="清除"
              title="清除"
              disabled={readOnly || !selectedInstance || !selectedInstance.requiresSkill}
              onClick={() => {
                if (!selectedInstance) {
                  return;
                }

                onSaveInstanceSkill(
                  selectedInstance.instanceId,
                  false,
                  selectedInstance.skillType,
                  selectedInstance.skillNote,
                );
              }}
            >
              <ClearSkillIcon />
            </button>
            {selectionSkillActions.map((action) => (
              <button
                type="button"
                className={[
                  'current-selection-action-button',
                  'current-selection-action-button--skill',
                  'has-icon-tooltip',
                  selectedInstance?.requiresSkill && selectedInstance.skillType === action.skillType
                    ? 'current-selection-action-button--active'
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-label={`设置技能标记：${action.label}`}
                aria-pressed={selectedInstance?.requiresSkill && selectedInstance.skillType === action.skillType}
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
                    true,
                    action.skillType,
                    selectedInstance.skillNote,
                  );
                }}
              >
                <img src={action.iconUrl} alt="" />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

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

function ClearSkillIcon() {
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
