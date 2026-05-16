import type { FocusEvent, KeyboardEvent } from 'react';
import { getAssetById } from '../../domain/assets';
import type { BuildingLevel, CanvasCellContext, GridCoordinate, GridSize } from '../../domain/scene';
import { moveCoordinate } from '../../state';

interface SceneCanvasProps {
  canvasSize: GridSize;
  cells: CanvasCellContext[];
  readOnly: boolean;
  placementMode: boolean;
  selectedCoordinate: GridCoordinate | null;
  targetCoordinate: GridCoordinate | null;
  onSelectCoordinate: (coordinate: GridCoordinate) => void;
  onViewCoordinate: (coordinate: GridCoordinate) => void;
  onHoverCoordinate: (coordinate: GridCoordinate | null) => void;
  onFocusCoordinate: (coordinate: GridCoordinate | null) => void;
}

export function SceneCanvas({
  canvasSize,
  cells,
  readOnly,
  placementMode,
  selectedCoordinate,
  targetCoordinate,
  onSelectCoordinate,
  onViewCoordinate,
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
          ? '7x7 canvas with main and outer regions, read-only'
          : '7x7 canvas with main and outer regions'
      }
      aria-rowcount={canvasSize.height}
      aria-colcount={canvasSize.width}
      data-testid="scene-canvas"
    >
      {rows.map((row, rowIndex) => (
        <div className="scene-row" role="row" aria-rowindex={rowIndex + 1} key={rowIndex}>
          {row.map((cell) => {
            const coordinate = cell.coordinate;
            const placeable = cell.placeable;
            const editable = isCellEditable(cell.buildingLevel, placeable, readOnly);
            const stateLabel = getCellStateLabel(cell.buildingLevel, placeable, readOnly);
            const selected = coordinatesEqual(selectedCoordinate, coordinate);
            const targeted = coordinatesEqual(targetCoordinate, coordinate);
            const topInstance = cell.tileInstances.at(-1) ?? null;
            const topAssetLabel = topInstance ? getInstanceDisplayLabel(topInstance.assetId) : null;
            const stackCount = cell.tileInstances.length;
            const hasSkillInstance = cell.tileInstances.some((instance) => instance.requiresSkill);

            return (
              <button
                type="button"
                role="gridcell"
                className={[
                  'scene-cell',
                  `scene-cell--${cell.areaType}`,
                  cell.mainBoundary ? 'scene-cell--main-boundary' : '',
                  selected ? 'scene-cell--selected' : '',
                  targeted ? 'scene-cell--targeted' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-colindex={coordinate.x + 1}
                aria-selected={selected}
                aria-current={selected ? 'location' : undefined}
                aria-label={`Cell ${coordinate.x},${coordinate.y}, ${cell.areaType} area, ${cell.buildingLevel.id}, ${stateLabel}${
                  topAssetLabel ? `, ${topAssetLabel}` : ''
                }${stackCount > 1 ? `, ${stackCount} stacked items` : ''}${hasSkillInstance ? ', skill required' : ''}${
                  selected ? ', selected' : ''
                }`}
                onClick={() =>
                  handleCellPointerSelect(readOnly, coordinate, onSelectCoordinate, onViewCoordinate)
                }
                onPointerDown={() => {
                  if (readOnly) {
                    handleCellPointerSelect(true, coordinate, onSelectCoordinate, onViewCoordinate);
                  }
                }}
                onFocus={(event) => handleCellFocus(event, coordinate, onFocusCoordinate)}
                onBlur={() => onFocusCoordinate(null)}
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
                data-instance-count={stackCount}
                data-requires-skill={hasSkillInstance}
                key={cell.id}
              >
                <span className="cell-coordinate">
                  {coordinate.x},{coordinate.y}
                </span>
                <span className="cell-area">{cell.areaType}</span>
                <span className="cell-placeable">{readOnly ? 'view' : 'place'}</span>
                {topAssetLabel ? <span className="cell-asset-label">{topAssetLabel}</span> : null}
                {stackCount > 1 ? <span className="cell-stack-count">{stackCount}x</span> : null}
                {hasSkillInstance ? <span className="cell-skill-marker">skill</span> : null}
                {selected ? <span className="cell-selected-cue">selected</span> : null}
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
  if (readOnly && isBlockedReadOnlyEditKey(event)) {
    event.preventDefault();
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

function getInstanceDisplayLabel(assetId: string): string {
  return getAssetById(assetId)?.name ?? `Unknown asset: ${assetId}`;
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

function isCellEditable(buildingLevel: BuildingLevel, placeable: boolean, readOnly: boolean): boolean {
  return placeable && !readOnly && buildingLevel.visible && !buildingLevel.locked;
}

function getCellStateLabel(buildingLevel: BuildingLevel, placeable: boolean, readOnly: boolean): string {
  if (readOnly) {
    return 'read-only';
  }

  if (!buildingLevel.visible) {
    return 'hidden layer';
  }

  if (buildingLevel.locked) {
    return 'locked layer';
  }

  return placeable ? 'placeable' : 'not placeable';
}

function isBlockedReadOnlyEditKey(event: KeyboardEvent<HTMLButtonElement>): boolean {
  const normalizedKey = event.key.toLowerCase();

  return (
    normalizedKey === 'delete' ||
    normalizedKey === 'backspace' ||
    ((event.metaKey || event.ctrlKey) && normalizedKey === 's')
  );
}
