import { describe, expect, it } from 'vitest';
import {
  calculateAreaType,
  assertSceneDimensions,
  canvasSize,
  classifySceneDimensions,
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
    expect(canvasSize).toBe(17);
    expect(createCanvasCells()).toHaveLength(289);
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
    expect(() => getAreaType({ x: 17, y: 0 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 0, y: -1 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 0, y: 17 })).toThrow(RangeError);
    expect(() => getAreaType({ x: 1.5, y: 1 })).toThrow(RangeError);
  });

  it('derives area type from scene dimensions instead of component state', () => {
    expect(calculateAreaType({ x: 0, y: 0 }, defaultSceneDimensions)).toBe('outer');
    expect(calculateAreaType({ x: 3, y: 3 }, defaultSceneDimensions)).toBe('main');
  });

  it('summarizes supported and unsupported scene dimensions', () => {
    expect(summarizeSceneDimensions(defaultSceneDimensions)).toEqual({
      sceneSize: { width: 15, height: 15 },
      canvasSize: { width: 17, height: 17 },
      outerPadding: 1,
      classification: 'default-17x17',
    });
    expect(summarizeSceneDimensions(legacySceneDimensions)).toEqual({
      sceneSize: { width: 5, height: 5 },
      canvasSize: { width: 7, height: 7 },
      outerPadding: 1,
      classification: 'legacy-7x7',
    });
    expect(classifySceneDimensions({
      sceneSize: { width: 16, height: 16 },
      canvasSize: { width: 18, height: 18 },
      outerPadding: 1,
    })).toBe('unsupported');
  });

  it('creates every 0-based coordinate inside the default 17x17 range', () => {
    const cells = createCanvasCells();

    expect(Math.min(...cells.map((cell) => cell.x))).toBe(0);
    expect(Math.max(...cells.map((cell) => cell.x))).toBe(16);
    expect(Math.min(...cells.map((cell) => cell.y))).toBe(0);
    expect(Math.max(...cells.map((cell) => cell.y))).toBe(16);
  });

  it('marks both MVP areas as placeable', () => {
    expect(isPlaceableArea('main')).toBe(true);
    expect(isPlaceableArea('outer')).toBe(true);
  });

  it('detects the visible 15x15 main-area boundary cells', () => {
    const boundaryCells = createCanvasCells().filter((cell) => isMainAreaBoundaryCell(cell));

    expect(boundaryCells).toHaveLength(56);
    expect(isMainAreaBoundaryCell({ x: 1, y: 1 })).toBe(true);
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
