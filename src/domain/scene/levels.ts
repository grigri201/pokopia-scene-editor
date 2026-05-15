import type { BuildingLevel } from './types';

export const defaultBuildingLevelNumbers = [0, 1, 2] as const;

export function createBuildingLevel(levelNumber: number): BuildingLevel {
  assertBuildingLevelNumber(levelNumber);

  return {
    id: `level-${levelNumber}`,
    levelNumber,
    name: `${levelNumber} 层`,
    visible: true,
    locked: false,
  };
}

export function assertBuildingLevelNumber(levelNumber: number): void {
  if (!Number.isInteger(levelNumber) || levelNumber < 0) {
    throw new RangeError('Building level number must be a non-negative integer.');
  }
}

export function createDefaultBuildingLevels(): BuildingLevel[] {
  return defaultBuildingLevelNumbers.map((levelNumber) => createBuildingLevel(levelNumber));
}

export function getNextBuildingLevelNumber(levels: readonly BuildingLevel[]): number {
  if (levels.length === 0) {
    return 0;
  }

  return Math.max(...levels.map((level) => level.levelNumber)) + 1;
}

export function sortBuildingLevelsForDisplay(levels: readonly BuildingLevel[]): BuildingLevel[] {
  return [...levels].sort((left, right) => right.levelNumber - left.levelNumber);
}
