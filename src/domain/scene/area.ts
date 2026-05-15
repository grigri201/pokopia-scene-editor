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

export interface GridSize {
  width: number;
  height: number;
}

export interface SceneDimensions {
  sceneSize: GridSize;
  canvasSize: GridSize;
  outerPadding: number;
}

export const defaultSceneDimensions: SceneDimensions = {
  sceneSize: { width: sceneSize, height: sceneSize },
  canvasSize: { width: canvasSize, height: canvasSize },
  outerPadding,
};

export function getCanvasSizeForScene(scene: GridSize, padding: number): GridSize {
  return {
    width: scene.width + padding * 2,
    height: scene.height + padding * 2,
  };
}

export function assertSceneDimensions(dimensions: SceneDimensions): void {
  assertPositiveInteger(dimensions.sceneSize.width, 'Scene width');
  assertPositiveInteger(dimensions.sceneSize.height, 'Scene height');
  assertPositiveInteger(dimensions.canvasSize.width, 'Canvas width');
  assertPositiveInteger(dimensions.canvasSize.height, 'Canvas height');

  if (!Number.isInteger(dimensions.outerPadding) || dimensions.outerPadding < 0) {
    throw new RangeError('Outer padding must be a non-negative integer.');
  }

  const expectedCanvasSize = getCanvasSizeForScene(dimensions.sceneSize, dimensions.outerPadding);
  if (
    dimensions.canvasSize.width !== expectedCanvasSize.width ||
    dimensions.canvasSize.height !== expectedCanvasSize.height
  ) {
    throw new RangeError('Canvas size must equal scene size plus outer padding on each side.');
  }
}

export function assertCanvasCoordinate(
  { x, y }: GridCoordinate,
  dimensions: SceneDimensions = defaultSceneDimensions,
): void {
  assertSceneDimensions(dimensions);

  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new RangeError('Canvas coordinates must be integers.');
  }

  if (x < 0 || x >= dimensions.canvasSize.width || y < 0 || y >= dimensions.canvasSize.height) {
    throw new RangeError(
      `Canvas coordinates must be inside 0..${dimensions.canvasSize.width - 1}, 0..${
        dimensions.canvasSize.height - 1
      }.`,
    );
  }
}

export function calculateAreaType(
  coordinate: GridCoordinate,
  dimensions: SceneDimensions = defaultSceneDimensions,
): AreaType {
  assertCanvasCoordinate(coordinate, dimensions);

  const isMainArea =
    coordinate.x >= dimensions.outerPadding &&
    coordinate.y >= dimensions.outerPadding &&
    coordinate.x < dimensions.outerPadding + dimensions.sceneSize.width &&
    coordinate.y < dimensions.outerPadding + dimensions.sceneSize.height;

  return isMainArea ? 'main' : 'outer';
}

export function getAreaType(coordinate: GridCoordinate): AreaType {
  return calculateAreaType(coordinate);
}

export function isPlaceableArea(areaType: AreaType): boolean {
  return areaType === 'main' || areaType === 'outer';
}

export function isMainAreaBoundaryCell(
  coordinate: GridCoordinate,
  dimensions: SceneDimensions = defaultSceneDimensions,
): boolean {
  if (calculateAreaType(coordinate, dimensions) !== 'main') {
    return false;
  }

  return (
    coordinate.x === dimensions.outerPadding ||
    coordinate.y === dimensions.outerPadding ||
    coordinate.x === dimensions.outerPadding + dimensions.sceneSize.width - 1 ||
    coordinate.y === dimensions.outerPadding + dimensions.sceneSize.height - 1
  );
}

export function createCanvasCells(dimensions: SceneDimensions = defaultSceneDimensions): CanvasCell[] {
  assertSceneDimensions(dimensions);

  return Array.from(
    { length: dimensions.canvasSize.width * dimensions.canvasSize.height },
    (_, index) => {
      const x = index % dimensions.canvasSize.width;
      const y = Math.floor(index / dimensions.canvasSize.width);

      return {
        id: `${x}-${y}`,
        x,
        y,
        areaType: calculateAreaType({ x, y }, dimensions),
      };
    },
  );
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
}
