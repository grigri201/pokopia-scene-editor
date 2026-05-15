import {
  canvasSize,
  createCanvasCells,
  isMainAreaBoundaryCell,
  isPlaceableArea,
} from '../../domain/scene';

const cells = createCanvasCells();
const rows = Array.from({ length: canvasSize }, (_, rowIndex) =>
  cells.slice(rowIndex * canvasSize, rowIndex * canvasSize + canvasSize),
);

interface SceneCanvasProps {
  readOnly: boolean;
}

export function SceneCanvas({ readOnly }: SceneCanvasProps) {
  return (
    <div
      className="scene-canvas"
      role="grid"
      aria-label={
        readOnly
          ? '7x7 canvas with main and outer regions, read-only'
          : '7x7 canvas with main and outer regions'
      }
      aria-rowcount={canvasSize}
      aria-colcount={canvasSize}
      data-testid="scene-canvas"
    >
      {rows.map((row, rowIndex) => (
        <div className="scene-row" role="row" aria-rowindex={rowIndex + 1} key={rowIndex}>
          {row.map((cell) => {
            const placeable = isPlaceableArea(cell.areaType);
            const editable = placeable && !readOnly;
            const stateLabel = readOnly ? 'read-only' : placeable ? 'placeable' : 'not placeable';

            return (
              <button
                type="button"
                role="gridcell"
                className={[
                  'scene-cell',
                  `scene-cell--${cell.areaType}`,
                  isMainAreaBoundaryCell(cell) ? 'scene-cell--main-boundary' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-colindex={cell.x + 1}
                aria-disabled={readOnly}
                aria-label={`Cell ${cell.x},${cell.y}, ${cell.areaType} area, layer 0, ${stateLabel}`}
                data-testid="scene-cell"
                data-coordinate={`${cell.x},${cell.y}`}
                data-area={cell.areaType}
                data-placeable={placeable}
                data-editable={editable}
                data-main-boundary={isMainAreaBoundaryCell(cell)}
                key={cell.id}
              >
                <span className="cell-coordinate">
                  {cell.x},{cell.y}
                </span>
                <span className="cell-area">{cell.areaType}</span>
                <span className="cell-placeable">{readOnly ? 'view' : 'place'}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
