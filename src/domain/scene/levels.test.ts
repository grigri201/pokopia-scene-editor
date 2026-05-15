import { describe, expect, it } from 'vitest';
import {
  createBuildingLevel,
  createDefaultBuildingLevels,
  getNextBuildingLevelNumber,
  sortBuildingLevelsForDisplay,
} from './levels';

describe('building level rules', () => {
  it('creates default 0, 1, and 2 building levels in data order', () => {
    const levels = createDefaultBuildingLevels();

    expect(levels.map((level) => level.levelNumber)).toEqual([0, 1, 2]);
    expect(levels.map((level) => level.id)).toEqual(['level-0', 'level-1', 'level-2']);
    expect(levels.every((level) => level.visible)).toBe(true);
    expect(levels.every((level) => !level.locked)).toBe(true);
  });

  it('allocates the next building level number from the current maximum', () => {
    expect(getNextBuildingLevelNumber(createDefaultBuildingLevels())).toBe(3);
    expect(getNextBuildingLevelNumber([createBuildingLevel(0), createBuildingLevel(7)])).toBe(8);
    expect(getNextBuildingLevelNumber([])).toBe(0);
  });

  it('rejects invalid building level numbers', () => {
    expect(() => createBuildingLevel(-1)).toThrow(RangeError);
    expect(() => createBuildingLevel(1.5)).toThrow(RangeError);
    expect(() => createBuildingLevel(Number.NaN)).toThrow(RangeError);
  });

  it('sorts building levels for display from high to low without mutating data order', () => {
    const levels = createDefaultBuildingLevels();
    const sorted = sortBuildingLevelsForDisplay(levels);

    expect(sorted.map((level) => level.levelNumber)).toEqual([2, 1, 0]);
    expect(levels.map((level) => level.levelNumber)).toEqual([0, 1, 2]);
  });
});
