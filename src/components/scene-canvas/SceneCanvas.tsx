import { createCanvasCells } from '../../domain/scene';

const cells = createCanvasCells();
const rows = Array.from({ length: 7 }, (_, rowIndex) =>
  cells.slice(rowIndex * 7, rowIndex * 7 + 7),
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
      aria-rowcount={7}
      aria-colcount={7}
      data-testid="scene-canvas"
    >
      {rows.map((row, rowIndex) => (
        <div className="scene-row" role="row" aria-rowindex={rowIndex + 1} key={rowIndex}>
          {row.map((cell) => (
            <button
              type="button"
              role="gridcell"
              className={`scene-cell scene-cell--${cell.areaType}`}
              aria-colindex={cell.x + 1}
              aria-label={`Cell ${cell.x},${cell.y}, ${cell.areaType} area, layer 0`}
              data-testid="scene-cell"
              data-area={cell.areaType}
              key={cell.id}
            >
              <span className="cell-coordinate">
                {cell.x},{cell.y}
              </span>
              <span className="cell-area">{cell.areaType}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
