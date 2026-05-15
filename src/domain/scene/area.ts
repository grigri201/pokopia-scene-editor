export const sceneSize = 5;
export const outerPadding = 1;
export const canvasSize = sceneSize + outerPadding * 2;

export type AreaType = 'main' | 'outer';

export interface GridCoordinate {
  x: number;
  y: number;
}

export interface CanvasCell extends GridCoordinate {
  id: string;
  areaType: AreaType;
}

export function assertCanvasCoordinate({ x, y }: GridCoordinate): void {
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new RangeError('Canvas coordinates must be integers.');
  }

  if (x < 0 || x >= canvasSize || y < 0 || y >= canvasSize) {
    throw new RangeError(`Canvas coordinates must be inside 0..${canvasSize - 1}.`);
  }
}

export function getAreaType(coordinate: GridCoordinate): AreaType {
  assertCanvasCoordinate(coordinate);

  const isOuterEdge =
    coordinate.x < outerPadding ||
    coordinate.y < outerPadding ||
    coordinate.x >= canvasSize - outerPadding ||
    coordinate.y >= canvasSize - outerPadding;

  return isOuterEdge ? 'outer' : 'main';
}

export function createCanvasCells(): CanvasCell[] {
  return Array.from({ length: canvasSize * canvasSize }, (_, index) => {
    const x = index % canvasSize;
    const y = Math.floor(index / canvasSize);

    return {
      id: `${x}-${y}`,
      x,
      y,
      areaType: getAreaType({ x, y }),
    };
  });
}
