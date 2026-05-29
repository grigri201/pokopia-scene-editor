import {
  defaultSceneDimensions,
  legacySceneDimensions,
  summarizeSceneDocumentStringDimensions,
  summarizeSceneDimensions,
  type GridSize,
  type SceneDimensionsSource,
  type SceneDimensionsSummary,
} from '@pokopia-scene-editor/scene-core';

export type { SceneDimensionsSummary };

export function summarizeSceneSourceDimensions(source: SceneDimensionsSource): SceneDimensionsSummary {
  return summarizeSceneDimensions(source);
}

export function summarizeSceneInputDimensions(value: unknown): SceneDimensionsSummary | null {
  const input = asRecord(value);
  const sceneSize = readGridSize(input.sceneSize);
  const canvasSize = readGridSize(input.canvasSize);
  const outerPadding = readNonNegativeInteger(input.outerPadding);

  if (!sceneSize || !canvasSize || outerPadding === null) {
    return null;
  }

  try {
    return summarizeSceneDimensions({ sceneSize, canvasSize, outerPadding });
  } catch {
    return null;
  }
}

export function summarizeSceneStringInputDimensions(value: string): SceneDimensionsSummary | null {
  return summarizeSceneDocumentStringDimensions(value);
}

export function getSupportedDimensionsSummary() {
  return {
    default: summarizeSceneDimensions(defaultSceneDimensions),
    legacy: summarizeSceneDimensions(legacySceneDimensions),
  };
}

function readGridSize(value: unknown): GridSize | null {
  const input = asRecord(value);
  const width = readPositiveInteger(input.width);
  const height = readPositiveInteger(input.height);

  if (width === null || height === null) {
    return null;
  }

  return { width, height };
}

function readPositiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
