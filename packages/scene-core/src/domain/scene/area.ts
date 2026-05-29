export const sceneSize = 15;
export const outerPadding = 1;
export const canvasSize = sceneSize + outerPadding * 2;
export const minEditableCanvasSize = 6;
export const maxEditableCanvasSize = 17;

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

export type SceneDimensionsClassification = 'default-17x17' | 'legacy-7x7' | 'custom' | 'unsupported';

export interface SceneDimensionsSource {
  sceneSize: GridSize;
  canvasSize: GridSize;
  outerPadding: number;
}

export interface SceneDimensionsSummary extends SceneDimensions {
  classification: SceneDimensionsClassification;
}

export const defaultSceneDimensions: SceneDimensions = {
  sceneSize: { width: sceneSize, height: sceneSize },
  canvasSize: { width: canvasSize, height: canvasSize },
  outerPadding,
};

export const legacySceneDimensions: SceneDimensions = {
  sceneSize: { width: 5, height: 5 },
  canvasSize: { width: 7, height: 7 },
  outerPadding,
};

export function createSceneDimensionsForCanvasSize(canvas: GridSize): SceneDimensions {
  const dimensions = {
    sceneSize: {
      width: canvas.width - outerPadding * 2,
      height: canvas.height - outerPadding * 2,
    },
    canvasSize: { ...canvas },
    outerPadding,
  };
  assertSupportedSceneDimensions(dimensions);
  return dimensions;
}

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

export function isSupportedSceneDimensions(dimensions: SceneDimensions): boolean {
  return (
    dimensionsEqual(dimensions, defaultSceneDimensions) ||
    dimensionsEqual(dimensions, legacySceneDimensions) ||
    isSelectableCanvasDimensions(dimensions)
  );
}

export function getSceneDimensions(source: SceneDimensionsSource): SceneDimensions {
  return {
    sceneSize: { ...source.sceneSize },
    canvasSize: { ...source.canvasSize },
    outerPadding: source.outerPadding,
  };
}

export function classifySceneDimensions(source: SceneDimensionsSource): SceneDimensionsClassification {
  const dimensions = getSceneDimensions(source);
  assertSceneDimensions(dimensions);

  if (dimensionsEqual(dimensions, defaultSceneDimensions)) {
    return 'default-17x17';
  }

  if (dimensionsEqual(dimensions, legacySceneDimensions)) {
    return 'legacy-7x7';
  }

  if (isSelectableCanvasDimensions(dimensions)) {
    return 'custom';
  }

  return 'unsupported';
}

export function summarizeSceneDimensions(source: SceneDimensionsSource): SceneDimensionsSummary {
  const dimensions = getSceneDimensions(source);

  return {
    ...dimensions,
    classification: classifySceneDimensions(dimensions),
  };
}

export function assertSupportedSceneDimensions(dimensions: SceneDimensions): void {
  assertSceneDimensions(dimensions);

  if (!isSupportedSceneDimensions(dimensions)) {
    throw new RangeError('Scene dimensions must use outerPadding 1 and canvas width/height between 6 and 17.');
  }
}

export function assertCanvasCoordinate(
  { x, y }: GridCoordinate,
  dimensions: SceneDimensions = defaultSceneDimensions,
): void {
  assertSupportedSceneDimensions(dimensions);

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
  assertSupportedSceneDimensions(dimensions);

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

function dimensionsEqual(left: SceneDimensions, right: SceneDimensions): boolean {
  return (
    left.sceneSize.width === right.sceneSize.width &&
    left.sceneSize.height === right.sceneSize.height &&
    left.canvasSize.width === right.canvasSize.width &&
    left.canvasSize.height === right.canvasSize.height &&
    left.outerPadding === right.outerPadding
  );
}

function isSelectableCanvasDimensions(dimensions: SceneDimensions): boolean {
  const expectedCanvasSize = getCanvasSizeForScene(dimensions.sceneSize, dimensions.outerPadding);

  return (
    dimensions.outerPadding === outerPadding &&
    dimensions.canvasSize.width === expectedCanvasSize.width &&
    dimensions.canvasSize.height === expectedCanvasSize.height &&
    dimensions.canvasSize.width >= minEditableCanvasSize &&
    dimensions.canvasSize.width <= maxEditableCanvasSize &&
    dimensions.canvasSize.height >= minEditableCanvasSize &&
    dimensions.canvasSize.height <= maxEditableCanvasSize
  );
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
}
