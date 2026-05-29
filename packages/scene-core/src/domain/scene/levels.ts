import type { BuildingLevel } from './types';

export const defaultBuildingLevelNumbers = [0] as const;
export const maxBuildingLevels = 30;

export function createBuildingLevel(levelNumber: number): BuildingLevel {
  assertBuildingLevelNumber(levelNumber);

  return {
    id: `level-${levelNumber}`,
    levelNumber,
    name: `${getBuildingLevelDisplayNumber(levelNumber)}层`,
    notes: [],
  };
}

export function assertBuildingLevelNumber(levelNumber: number): void {
  if (!Number.isInteger(levelNumber) || levelNumber < 0) {
    throw new RangeError('Building level number must be a non-negative integer.');
  }

  if (levelNumber >= maxBuildingLevels) {
    throw new RangeError(`Building level number must be less than ${maxBuildingLevels}.`);
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

export function getBuildingLevelDisplayNumber(levelNumber: number): number {
  assertBuildingLevelNumber(levelNumber);

  return levelNumber + 1;
}

export function getBuildingLevelDisplayId(levelNumber: number): string {
  return `L${getBuildingLevelDisplayNumber(levelNumber)}`;
}

export function normalizeBuildingLevelDisplayName(name: string, levelNumber: number): string {
  const displayNumber = getBuildingLevelDisplayNumber(levelNumber);

  if (name === `${levelNumber}层`) {
    return `${displayNumber}层`;
  }

  if (name === `Layer ${levelNumber}`) {
    return `Layer ${displayNumber}`;
  }

  return name;
}

export function resequenceBuildingLevels(levels: readonly BuildingLevel[]): BuildingLevel[] {
  return sortBuildingLevelsForRender(levels).map((level, levelNumber) => ({
    ...level,
    levelNumber,
  }));
}

export function sortBuildingLevelsForDisplay(levels: readonly BuildingLevel[]): BuildingLevel[] {
  return [...levels].sort((left, right) => right.levelNumber - left.levelNumber);
}

export function sortBuildingLevelsForRender<T extends Pick<BuildingLevel, 'levelNumber'>>(levels: readonly T[]): T[] {
  return [...levels].sort((left, right) => left.levelNumber - right.levelNumber);
}
