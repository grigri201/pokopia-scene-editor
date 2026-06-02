import { describe, expect, it } from 'vitest';
import {
  calculateAreaType,
  assertSceneDimensions,
  canvasSize,
  classifySceneDimensions,
  createSceneDimensionsForCanvasSize,
  createCanvasCells,
  defaultSceneDimensions,
  getAreaType,
  legacySceneDimensions,
  isMainAreaBoundaryCell,
  isPlaceableArea,
  summarizeSceneDimensions,
} from './area';

describe('scene canvas area rules', () => {
  it('creates the default 17x17 canvas', () => {
    expect(canvasSize).toBe(defaultSceneDimensions.canvasSize.width);
    expect(createCanvasCells()).toHaveLength(getCanvasCellCount(defaultSceneDimensions));
  });

  it('marks the center 15x15 as main and the surrounding ring as outer', () => {
    expect(getAreaType({ x: 1, y: 1 })).toBe('main');
    expect(getAreaType({ x: 15, y: 15 })).toBe('main');
    expect(getAreaType({ x: 0, y: 8 })).toBe('outer');
    expect(getAreaType({ x: 16, y: 8 })).toBe('outer');
    expect(getAreaType({ x: 8, y: 0 })).toBe('outer');
    expect(getAreaType({ x: 8, y: 16 })).toBe('outer');
  });

  it('rejects coordinates outside the default 17x17 canvas', () => {
    expect(() => getAreaType({ x: -1, y: 0 })).toThrow(RangeError);
    expect(() => getAreaType({ x: defaultSceneDimensions.canvasSize.width, y: 0 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 0, y: -1 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 0, y: defaultSceneDimensions.canvasSize.height })).toThrow(RangeError);
    expect(() => getAreaType({ x: 1.5, y: 1 })).toThrow(RangeError);
  });

  it('derives area type from scene dimensions instead of component state', () => {
    expect(calculateAreaType({ x: 0, y: 0 }, defaultSceneDimensions)).toBe('outer');
    expect(calculateAreaType({ x: 3, y: 3 }, defaultSceneDimensions)).toBe('main');
  });

  it('summarizes default, legacy, custom, and unsupported scene dimensions', () => {
    expect(summarizeSceneDimensions(defaultSceneDimensions)).toEqual({
      sceneSize: defaultSceneDimensions.sceneSize,
      canvasSize: defaultSceneDimensions.canvasSize,
      outerPadding: defaultSceneDimensions.outerPadding,
      classification: 'default-17x17',
    });
    expect(summarizeSceneDimensions(legacySceneDimensions)).toEqual({
      sceneSize: legacySceneDimensions.sceneSize,
      canvasSize: legacySceneDimensions.canvasSize,
      outerPadding: legacySceneDimensions.outerPadding,
      classification: 'legacy-7x7',
    });
    expect(summarizeSceneDimensions(createSceneDimensionsForCanvasSize({ width: 12, height: 16 }))).toEqual({
      sceneSize: { width: 10, height: 14 },
      canvasSize: { width: 12, height: 16 },
      outerPadding: 1,
      classification: 'custom',
    });
    expect(classifySceneDimensions({
      sceneSize: { width: 19, height: 19 },
      canvasSize: { width: 21, height: 21 },
      outerPadding: 1,
    })).toBe('unsupported');
  });

  it('creates custom rectangular canvas cells from selectable 6..20 canvas dimensions', () => {
    const dimensions = createSceneDimensionsForCanvasSize({ width: 6, height: 20 });
    const cells = createCanvasCells(dimensions);

    expect(dimensions.sceneSize).toEqual({ width: 4, height: 18 });
    expect(cells).toHaveLength(120);
    expect(Math.max(...cells.map((cell) => cell.x))).toBe(5);
    expect(Math.max(...cells.map((cell) => cell.y))).toBe(19);
    expect(calculateAreaType({ x: 1, y: 1 }, dimensions)).toBe('main');
    expect(calculateAreaType({ x: 5, y: 19 }, dimensions)).toBe('outer');
  });

  it('creates every 0-based coordinate inside the default 17x17 range', () => {
    const cells = createCanvasCells();

    expect(Math.min(...cells.map((cell) => cell.x))).toBe(0);
    expect(Math.max(...cells.map((cell) => cell.x))).toBe(defaultSceneDimensions.canvasSize.width - 1);
    expect(Math.min(...cells.map((cell) => cell.y))).toBe(0);
    expect(Math.max(...cells.map((cell) => cell.y))).toBe(defaultSceneDimensions.canvasSize.height - 1);
  });

  it('marks both MVP areas as placeable', () => {
    expect(isPlaceableArea('main')).toBe(true);
    expect(isPlaceableArea('outer')).toBe(true);
  });

  it('detects the visible 15x15 main-area boundary cells', () => {
    const boundaryCells = createCanvasCells().filter((cell) => isMainAreaBoundaryCell(cell));

    expect(boundaryCells).toHaveLength(getBoundaryCellCount(defaultSceneDimensions));
    expect(isMainAreaBoundaryCell({ x: defaultSceneDimensions.outerPadding, y: defaultSceneDimensions.outerPadding })).toBe(true);
    expect(isMainAreaBoundaryCell({ x: 8, y: 8 })).toBe(false);
    expect(isMainAreaBoundaryCell({ x: 0, y: 8 })).toBe(false);
  });

  it('rejects inconsistent scene and canvas dimensions', () => {
    expect(() =>
      assertSceneDimensions({
        sceneSize: { width: 5, height: 5 },
        canvasSize: { width: 6, height: 7 },
        outerPadding: 1,
      }),
    ).toThrow(RangeError);
  });

  it('rejects non-positive, fractional, and infinite dimensions before generating cells', () => {
    expect(() =>
      createCanvasCells({
        sceneSize: { width: 0, height: 5 },
        canvasSize: { width: 2, height: 7 },
        outerPadding: 1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      assertSceneDimensions({
        sceneSize: { width: 5.5, height: 5 },
        canvasSize: { width: 7.5, height: 7 },
        outerPadding: 1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      assertSceneDimensions({
        sceneSize: { width: Number.POSITIVE_INFINITY, height: 5 },
        canvasSize: { width: 7, height: 7 },
        outerPadding: 1,
      }),
    ).toThrow(RangeError);
  });
});

function getCanvasCellCount(dimensions: typeof defaultSceneDimensions): number {
  return dimensions.canvasSize.width * dimensions.canvasSize.height;
}

function getBoundaryCellCount(dimensions: typeof defaultSceneDimensions): number {
  return dimensions.sceneSize.width * 2 + Math.max(0, dimensions.sceneSize.height - 2) * 2;
}
