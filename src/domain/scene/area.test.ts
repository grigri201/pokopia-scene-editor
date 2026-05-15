import { describe, expect, it } from 'vitest';
import {
  calculateAreaType,
  assertSceneDimensions,
  canvasSize,
  createCanvasCells,
  defaultSceneDimensions,
  getAreaType,
  isMainAreaBoundaryCell,
  isPlaceableArea,
} from './area';

describe('scene canvas area rules', () => {
  it('creates a fixed 7x7 canvas', () => {
    expect(canvasSize).toBe(7);
    expect(createCanvasCells()).toHaveLength(49);
  });

  it('marks the center 5x5 as main and the surrounding ring as outer', () => {
    expect(getAreaType({ x: 1, y: 1 })).toBe('main');
    expect(getAreaType({ x: 5, y: 5 })).toBe('main');
    expect(getAreaType({ x: 0, y: 3 })).toBe('outer');
    expect(getAreaType({ x: 6, y: 3 })).toBe('outer');
    expect(getAreaType({ x: 3, y: 0 })).toBe('outer');
    expect(getAreaType({ x: 3, y: 6 })).toBe('outer');
  });

  it('rejects coordinates outside the 7x7 canvas', () => {
    expect(() => getAreaType({ x: -1, y: 0 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 7, y: 0 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 0, y: -1 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 0, y: 7 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 1.5, y: 1 })).toThrow(RangeError);
  });

  it('derives area type from scene dimensions instead of component state', () => {
    expect(calculateAreaType({ x: 0, y: 0 }, defaultSceneDimensions)).toBe('outer');
    expect(calculateAreaType({ x: 3, y: 3 }, defaultSceneDimensions)).toBe('main');
  });

  it('creates every 0-based coordinate inside the 7x7 range', () => {
    const cells = createCanvasCells();

    expect(Math.min(...cells.map((cell) => cell.x))).toBe(0);
    expect(Math.max(...cells.map((cell) => cell.x))).toBe(6);
    expect(Math.min(...cells.map((cell) => cell.y))).toBe(0);
    expect(Math.max(...cells.map((cell) => cell.y))).toBe(6);
  });

  it('marks both MVP areas as placeable', () => {
    expect(isPlaceableArea('main')).toBe(true);
    expect(isPlaceableArea('outer')).toBe(true);
  });

  it('detects the visible 5x5 main-area boundary cells', () => {
    const boundaryCells = createCanvasCells().filter((cell) => isMainAreaBoundaryCell(cell));

    expect(boundaryCells).toHaveLength(16);
    expect(isMainAreaBoundaryCell({ x: 1, y: 1 })).toBe(true);
    expect(isMainAreaBoundaryCell({ x: 3, y: 3 })).toBe(false);
    expect(isMainAreaBoundaryCell({ x: 0, y: 3 })).toBe(false);
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
