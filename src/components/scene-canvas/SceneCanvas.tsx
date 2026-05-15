import type { KeyboardEvent } from 'react';
import type { BuildingLevel, CanvasCellContext, GridCoordinate, GridSize } from '../../domain/scene';
import { moveCoordinate } from '../../state';

interface SceneCanvasProps {
  canvasSize: GridSize;
  cells: CanvasCellContext[];
  readOnly: boolean;
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
                  selected ? ', selected' : ''
                }`}
                onClick={() =>
                  handleCellPointerSelect(readOnly, coordinate, onSelectCoordinate, onViewCoordinate)
                }
                onFocus={() => onFocusCoordinate(toGridCoordinate(coordinate))}
                onBlur={() => onFocusCoordinate(null)}
                onMouseEnter={() => onHoverCoordinate(toGridCoordinate(coordinate))}
                onMouseLeave={() => onHoverCoordinate(null)}
                onKeyDown={(event) =>
                  handleCellKeyDown(event, coordinate, readOnly, onSelectCoordinate, onViewCoordinate)
                }
                data-testid="scene-cell"
                data-coordinate={`${coordinate.x},${coordinate.y}`}
                data-area={cell.areaType}
                data-placeable={placeable}
                data-editable={editable}
                data-selected={selected}
                data-targeted={targeted}
                data-main-boundary={cell.mainBoundary}
                key={cell.id}
              >
                <span className="cell-coordinate">
                  {coordinate.x},{coordinate.y}
                </span>
                <span className="cell-area">{cell.areaType}</span>
                <span className="cell-placeable">{readOnly ? 'view' : 'place'}</span>
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
  onSelectCoordinate: (coordinate: GridCoordinate) => void,
  onViewCoordinate: (coordinate: GridCoordinate) => void,
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
    dispatchCoordinate(readOnly, coordinate, onSelectCoordinate, onViewCoordinate);
    return;
  }

  const direction = directionByKey[event.key as keyof typeof directionByKey];
  if (!direction) {
    return;
  }

  event.preventDefault();
  const nextCoordinate = moveCoordinate(coordinate, direction);
  const grid = event.currentTarget.closest('[role="grid"]');
  dispatchCoordinate(readOnly, nextCoordinate, onSelectCoordinate, onViewCoordinate);
  requestAnimationFrame(() => {
    grid
      ?.querySelector<HTMLButtonElement>(`[data-coordinate="${nextCoordinate.x},${nextCoordinate.y}"]`)
      ?.focus();
  });
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
