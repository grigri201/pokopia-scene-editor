import type { CSSProperties, FocusEvent, KeyboardEvent, MouseEvent } from 'react';
import { getAssetById, getAssetSkillMarkerIconUrl, toAssetSkillType } from '../../domain/assets';
import type { CanvasCellContext, GridCoordinate, GridSize } from '../../domain/scene';
import { moveCoordinate } from '../../state';
import { defaultLocale, getAssetDisplay, getSkillDisplay, t, type Locale } from '../../i18n';

interface SceneCanvasProps {
  locale?: Locale;
  canvasSize: GridSize;
  cells: CanvasCellContext[];
  readOnly: boolean;
  placementMode: boolean;
  selectedCoordinate: GridCoordinate | null;
  targetCoordinate: GridCoordinate | null;
  onSelectCoordinate: (coordinate: GridCoordinate) => void;
  onViewCoordinate: (coordinate: GridCoordinate) => void;
  onDeleteCoordinate: (coordinate: GridCoordinate) => void;
  onHoverCoordinate: (coordinate: GridCoordinate | null) => void;
  onFocusCoordinate: (coordinate: GridCoordinate | null) => void;
}

export function SceneCanvas({
  locale = defaultLocale,
  canvasSize,
  cells,
  readOnly,
  placementMode,
  selectedCoordinate,
  targetCoordinate,
  onSelectCoordinate,
  onViewCoordinate,
  onDeleteCoordinate,
  onHoverCoordinate,
  onFocusCoordinate,
}: SceneCanvasProps) {
  const rows = Array.from({ length: canvasSize.height }, (_, rowIndex) =>
    cells.slice(rowIndex * canvasSize.width, rowIndex * canvasSize.width + canvasSize.width),
  );

  return (
    <div
      className="scene-canvas"
      role="grid"
      aria-label={
        readOnly
          ? t(locale, 'sceneCanvasReadOnly')
          : t(locale, 'sceneCanvas')
      }
      aria-rowcount={canvasSize.height}
      aria-colcount={canvasSize.width}
      data-testid="scene-canvas"
      data-read-only={readOnly}
    >
      {rows.map((row, rowIndex) => (
        <div className="scene-row" role="row" aria-rowindex={rowIndex + 1} key={rowIndex}>
          {row.map((cell) => {
            const coordinate = cell.coordinate;
            const placeable = cell.placeable;
            const editable = isCellEditable(placeable, readOnly);
            const stateLabel = getCellStateLabel(placeable, readOnly);
            const selected = coordinatesEqual(selectedCoordinate, coordinate);
            const targeted = coordinatesEqual(targetCoordinate, coordinate);
            const visibleInstances = cell.tileInstances;
            const topInstance = visibleInstances.at(-1) ?? null;
            const topAsset = getAssetById(topInstance?.assetId);
            const topAssetLabel = topInstance ? getInstanceDisplayLabel(topInstance.assetId, locale) : null;
            const otherLayerInstanceCount = cell.otherVisibleLayerInstances.length;
            const topSkillInstance = topInstance?.requiresSkill ? topInstance : null;
            const topCellSkillMarker = cell.skillMarkers.at(-1) ?? null;
            const skillMarkerType = topSkillInstance?.skillType ?? topCellSkillMarker?.skillType ?? null;
            const hasSkillMarker = Boolean(skillMarkerType);
            const normalizedSkillType = toAssetSkillType(skillMarkerType);
            const skillMarkerLabel = normalizedSkillType ? getSkillDisplay(normalizedSkillType, locale).marker : null;
            const skillMarkerIconUrl = skillMarkerType
              ? getAssetSkillMarkerIconUrl(skillMarkerType)
              : null;
            const skillMarkerTooltip = normalizedSkillType ? getSkillDisplay(normalizedSkillType, locale).name : null;
            const skillMarkerAriaLabel = topSkillInstance
              ? getInstanceSkillMarkerLabel(topSkillInstance.assetId, skillMarkerLabel, locale)
              : topCellSkillMarker
                ? getCellSkillMarkerLabel(skillMarkerLabel, locale)
                : null;
            const rotationDegrees = topInstance?.rotationDegrees ?? 0;
            const rotationLabel = rotationDegrees ? `${rotationDegrees}` : null;
            const dyeColor = topInstance?.dyeColor ?? null;

            return (
              <button
                type="button"
                role="gridcell"
                className={[
                  'scene-cell',
                  `scene-cell--${cell.areaType}`,
                  cell.mainBoundary ? 'scene-cell--main-boundary' : '',
                  !editable ? 'scene-cell--non-editable' : '',
                  selected ? 'scene-cell--selected' : '',
                  targeted ? 'scene-cell--targeted' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-colindex={coordinate.x + 1}
                aria-selected={selected}
                aria-current={selected ? 'location' : undefined}
                aria-label={`${t(locale, 'cellLabel', {
                  x: coordinate.x,
                  y: coordinate.y,
                  area: cell.areaType,
                  levelId: cell.buildingLevel.id,
                  state: stateLabel,
                })}${
                  topAssetLabel ? `, ${topAssetLabel}` : ''
                }${
                  otherLayerInstanceCount > 0
                    ? `, ${t(locale, 'otherLayerItems', {
                        count: otherLayerInstanceCount,
                        plural: otherLayerInstanceCount === 1 ? '' : 's',
                      })}`
                    : ''
                }${
                  rotationLabel ? `, ${t(locale, 'rotated', { degrees: rotationLabel })}` : ''
                }${dyeColor ? `, ${t(locale, 'dyed', { color: dyeColor })}` : ''}${
                  skillMarkerAriaLabel ? `, ${skillMarkerAriaLabel}` : ''
                }`}
                onClick={() =>
                  handleCellPointerSelect(readOnly, coordinate, onSelectCoordinate, onViewCoordinate)
                }
                onContextMenu={(event) =>
                  handleCellContextMenu(event, readOnly, coordinate, onDeleteCoordinate)
                }
                onFocus={(event) =>
                  readOnly ? undefined : handleCellFocus(event, coordinate, onFocusCoordinate)
                }
                onBlur={() => {
                  if (!readOnly) {
                    onFocusCoordinate(null);
                  }
                }}
                onMouseEnter={() => onHoverCoordinate(toGridCoordinate(coordinate))}
                onMouseLeave={() => onHoverCoordinate(null)}
                onKeyDown={(event) =>
                  handleCellKeyDown(
                    event,
                    coordinate,
                    readOnly,
                    placementMode,
                    onSelectCoordinate,
                    onViewCoordinate,
                    onFocusCoordinate,
                  )
                }
                data-testid="scene-cell"
                data-coordinate={`${coordinate.x},${coordinate.y}`}
                data-area={cell.areaType}
                data-placeable={placeable}
                data-editable={editable}
                data-selected={selected}
                data-targeted={targeted}
                data-main-boundary={cell.mainBoundary}
                data-has-instance={Boolean(topInstance)}
                data-instance-count={topInstance ? 1 : 0}
                data-other-layer-instance-count={otherLayerInstanceCount}
                data-requires-skill={hasSkillMarker}
                data-skill-marker-label={skillMarkerLabel ?? ''}
                data-rotation={topInstance?.rotationDegrees ?? 0}
                data-dye-color={dyeColor ?? ''}
                key={cell.id}
              >
                <span className="cell-area">{cell.areaType}</span>
                <span className="cell-placeable">{readOnly ? t(locale, 'view') : editable ? t(locale, 'place') : stateLabel}</span>
                {topAsset ? (
                  <span className="cell-asset-token">
                    <img src={topAsset.thumbnailUrl} alt="" className="cell-asset-thumb" />
                    <span className="sr-only">{topAssetLabel}</span>
                  </span>
                ) : topAssetLabel ? (
                  <span className="cell-asset-label">{topAssetLabel}</span>
                ) : null}
                {rotationLabel ? (
                  <span
                    className="cell-rotation-marker has-icon-tooltip"
                    data-tooltip={t(locale, 'rotationDegrees', { degrees: rotationLabel })}
                    title={t(locale, 'rotationDegrees', { degrees: rotationLabel })}
                    aria-label={t(locale, 'rotationDegrees', { degrees: rotationLabel })}
                  >
                    <svg viewBox="0 0 28 24" aria-hidden="true">
                      <path
                        className="cell-rotation-marker__blob"
                        d="M4.4 13.1C2.7 8.4 5.4 4.3 10.1 4.6c1.4-2.4 5.2-2.3 6.4.1 4.2-.4 7.6 3.1 6.6 7.5 1.8 2.7-.1 6.3-3.6 6.5-2.6 2.4-7.1 2.2-9.2-.2-3.6.7-6.9-2-5.9-5.4Z"
                      />
                      <g
                        className="cell-rotation-marker__arrow"
                        style={{ '--rotation': `${rotationDegrees}deg` } as CSSProperties}
                      >
                        <path d="M14 17.5v-11" />
                        <path d="m9.7 10.8 4.3-4.3 4.3 4.3" />
                      </g>
                    </svg>
                  </span>
                ) : null}
                {dyeColor ? (
                  <span
                    className="cell-dye-marker"
                    aria-label={t(locale, 'dye', { color: dyeColor })}
                    style={{ backgroundColor: dyeColor }}
                  />
                ) : null}
                {hasSkillMarker ? (
                  <span
                    className="cell-skill-marker has-icon-tooltip"
                    aria-label={skillMarkerAriaLabel ?? t(locale, 'skillMarker')}
                    data-tooltip={skillMarkerTooltip ?? skillMarkerLabel ?? t(locale, 'skillMarker')}
                    title={skillMarkerTooltip ?? skillMarkerLabel ?? t(locale, 'skillMarker')}
                  >
                    {skillMarkerIconUrl ? (
                      <img src={skillMarkerIconUrl} alt="" />
                    ) : (
                      <span className="cell-skill-marker__fallback">{skillMarkerLabel}</span>
                    )}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function handleCellKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  coordinate: GridCoordinate,
  readOnly: boolean,
  placementMode: boolean,
  onSelectCoordinate: (coordinate: GridCoordinate) => void,
  onViewCoordinate: (coordinate: GridCoordinate) => void,
  onFocusCoordinate: (coordinate: GridCoordinate | null) => void,
): void {
  if (readOnly) {
    if (isReadOnlyApplicationKey(event)) {
      event.preventDefault();
    }
    return;
  }

  const directionByKey = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  } as const;

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    dispatchCoordinate(
      readOnly,
      placementMode ? getGridKeyboardTarget(event.currentTarget) ?? coordinate : coordinate,
      onSelectCoordinate,
      onViewCoordinate,
    );
    return;
  }

  const direction = directionByKey[event.key as keyof typeof directionByKey];
  if (!direction) {
    return;
  }

  event.preventDefault();
  const baseCoordinate = getGridKeyboardTarget(event.currentTarget) ?? coordinate;
  const nextCoordinate = moveCoordinate(baseCoordinate, direction);
  const grid = event.currentTarget.closest('[role="grid"]');
  setGridKeyboardTarget(event.currentTarget, nextCoordinate);
  if (!placementMode) {
    dispatchCoordinate(readOnly, nextCoordinate, onSelectCoordinate, onViewCoordinate);
  }
  onFocusCoordinate(nextCoordinate);
  requestAnimationFrame(() => {
    grid
      ?.querySelector<HTMLButtonElement>(`[data-coordinate="${nextCoordinate.x},${nextCoordinate.y}"]`)
      ?.focus();
  });
}

function handleCellFocus(
  event: FocusEvent<HTMLButtonElement>,
  coordinate: GridCoordinate,
  onFocusCoordinate: (coordinate: GridCoordinate | null) => void,
): void {
  setGridKeyboardTarget(event.currentTarget, coordinate);
  onFocusCoordinate(toGridCoordinate(coordinate));
}

function coordinatesEqual(left: GridCoordinate | null, right: GridCoordinate): boolean {
  return left?.x === right.x && left.y === right.y;
}

function handleCellPointerSelect(
  readOnly: boolean,
  coordinate: GridCoordinate,
  onSelectCoordinate: (coordinate: GridCoordinate) => void,
  onViewCoordinate: (coordinate: GridCoordinate) => void,
): void {
  dispatchCoordinate(readOnly, coordinate, onSelectCoordinate, onViewCoordinate);
}

function handleCellContextMenu(
  event: MouseEvent<HTMLButtonElement>,
  readOnly: boolean,
  coordinate: GridCoordinate,
  onDeleteCoordinate: (coordinate: GridCoordinate) => void,
): void {
  if (readOnly) {
    return;
  }

  event.preventDefault();
  onDeleteCoordinate(toGridCoordinate(coordinate));
}

function dispatchCoordinate(
  readOnly: boolean,
  coordinate: GridCoordinate,
  onSelectCoordinate: (coordinate: GridCoordinate) => void,
  onViewCoordinate: (coordinate: GridCoordinate) => void,
): void {
  const nextCoordinate = toGridCoordinate(coordinate);
  if (readOnly) {
    onViewCoordinate(nextCoordinate);
    return;
  }

  onSelectCoordinate(nextCoordinate);
}

function toGridCoordinate(coordinate: GridCoordinate): GridCoordinate {
  return { x: coordinate.x, y: coordinate.y };
}

function getInstanceDisplayLabel(assetId: string, locale: Locale): string {
  const asset = getAssetById(assetId);

  return asset ? getAssetDisplay(asset, locale).name : `Unknown asset: ${assetId}`;
}

function getInstanceSkillMarkerLabel(assetId: string, markerLabel: string | null, locale: Locale): string {
  const assetLabel = getInstanceDisplayLabel(assetId, locale);

  return `${t(locale, 'skillMarker')} ${assetLabel} ${markerLabel ?? t(locale, 'skillMarker')}`;
}

function getCellSkillMarkerLabel(markerLabel: string | null, locale: Locale): string {
  return `${t(locale, 'skillMarker')} ${markerLabel ?? t(locale, 'skillMarker')}`;
}

function setGridKeyboardTarget(cell: HTMLButtonElement, coordinate: GridCoordinate): void {
  cell.closest<HTMLElement>('[role="grid"]')?.setAttribute('data-keyboard-coordinate', `${coordinate.x},${coordinate.y}`);
}

function getGridKeyboardTarget(cell: HTMLButtonElement): GridCoordinate | null {
  const value = cell.closest<HTMLElement>('[role="grid"]')?.getAttribute('data-keyboard-coordinate');
  const match = value?.match(/^(\d+),(\d+)$/);

  if (!match) {
    return null;
  }

  return {
    x: Number(match[1]),
    y: Number(match[2]),
  };
}

function isCellEditable(placeable: boolean, readOnly: boolean): boolean {
  return placeable && !readOnly;
}

function getCellStateLabel(placeable: boolean, readOnly: boolean): string {
  if (readOnly) {
    return 'read-only';
  }

  return placeable ? 'placeable' : 'not placeable';
}

function isReadOnlyApplicationKey(event: KeyboardEvent<HTMLButtonElement>): boolean {
  const normalizedKey = event.key.toLowerCase();

  return (
    normalizedKey === 'arrowup' ||
    normalizedKey === 'arrowdown' ||
    normalizedKey === 'arrowleft' ||
    normalizedKey === 'arrowright' ||
    normalizedKey === 'enter' ||
    normalizedKey === ' ' ||
    normalizedKey === 'spacebar' ||
    normalizedKey === 'escape' ||
    normalizedKey === 'delete' ||
    normalizedKey === 'backspace' ||
    ((event.metaKey || event.ctrlKey) && normalizedKey === 's')
  );
}
