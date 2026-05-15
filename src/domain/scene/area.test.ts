import { describe, expect, it } from 'vitest';
import { canvasSize, createCanvasCells, getAreaType } from './area';

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
  });
});
