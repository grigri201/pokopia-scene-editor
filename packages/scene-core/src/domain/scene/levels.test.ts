import { describe, expect, it } from 'vitest';
import {
  createBuildingLevel,
  createDefaultBuildingLevels,
  getNextBuildingLevelNumber,
  resequenceBuildingLevels,
  sortBuildingLevelsForDisplay,
} from './levels';

describe('building level rules', () => {
  it('creates only the default 0 building level for a new empty scene', () => {
    const levels = createDefaultBuildingLevels();

    expect(levels.map((level) => level.levelNumber)).toEqual([0]);
    expect(levels.map((level) => level.id)).toEqual(['level-0']);
    expect(levels.map((level) => level.name)).toEqual(['1层']);
    expect(levels.map((level) => level.notes)).toEqual([[]]);
  });

  it('allocates the next building level number from the current maximum', () => {
    expect(getNextBuildingLevelNumber(createDefaultBuildingLevels())).toBe(1);
    expect(getNextBuildingLevelNumber([createBuildingLevel(0), createBuildingLevel(7)])).toBe(8);
    expect(getNextBuildingLevelNumber([])).toBe(0);
  });

  it('rejects invalid building level numbers', () => {
    expect(() => createBuildingLevel(-1)).toThrow(RangeError);
    expect(() => createBuildingLevel(1.5)).toThrow(RangeError);
    expect(() => createBuildingLevel(Number.NaN)).toThrow(RangeError);
  });

  it('sorts building levels for display from high to low without mutating data order', () => {
    const levels = [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)];
    const sorted = sortBuildingLevelsForDisplay(levels);

    expect(sorted.map((level) => level.levelNumber)).toEqual([2, 1, 0]);
    expect(levels.map((level) => level.levelNumber)).toEqual([0, 1, 2]);
  });

  it('resequences visible level numbers while preserving stable ids and every existing name', () => {
    const levels = [
      createBuildingLevel(0),
      { ...createBuildingLevel(2), name: '3层' },
      { ...createBuildingLevel(4), name: '屋顶层' },
    ];
    const resequenced = resequenceBuildingLevels(levels);

    expect(resequenced.map((level) => level.id)).toEqual(['level-0', 'level-2', 'level-4']);
    expect(resequenced.map((level) => level.levelNumber)).toEqual([0, 1, 2]);
    expect(resequenced.map((level) => level.name)).toEqual(['1层', '3层', '屋顶层']);
  });
});
