import { z } from 'zod';
import {
  assetSkillTypes,
  getAssetById,
  isKnownAssetId,
  isKnownPokemonKey,
} from '../domain/assets';
import {
  assertCanvasCoordinate,
  assertSupportedSceneDimensions,
  calculateAreaType,
  maxBuildingLevels,
  validateSceneOccupancy,
  type FootprintConflict,
  type GridCoordinate,
  type SceneDimensions,
} from '../domain/scene';

const isoDateTimeSchema = z.iso.datetime({ precision: 3 });

const gridSizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
}).strict();

const rotationDegreesSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

const coordinateSchema = z.object({
  x: z.number().int().min(0),
  y: z.number().int().min(0),
}).strict();

const buildingLevelNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().refine((value) => value.trim().length > 0, 'Expected non-empty note text'),
}).strict();

const buildingLevelSchema = z.object({
  id: z.string().min(1),
  levelNumber: z.number().int().min(0).max(maxBuildingLevels - 1),
  name: z.string(),
  notes: z.array(buildingLevelNoteSchema).default([]),
}).strip();

const skillTypeSchema = z.enum(assetSkillTypes);
const dyeColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Expected 6-digit hex color')
  .nullable();

const tileInstanceSchema = z.object({
  instanceId: z.string().min(1),
  assetId: z.string().refine(isKnownAssetId, 'Expected known asset id'),
  coordinate: coordinateSchema,
  areaType: z.enum(['main', 'outer']),
  buildingLevelId: z.string().min(1),
  rotationDegrees: rotationDegreesSchema,
  dyeColor: dyeColorSchema,
  requiresSkill: z.boolean(),
  skillType: skillTypeSchema.nullable(),
  skillNote: z.string(),
}).strip();

const skillMarkerSchema = z.object({
  coordinate: coordinateSchema,
  areaType: z.enum(['main', 'outer']),
  buildingLevelId: z.string().min(1),
  skillType: skillTypeSchema,
  skillNote: z.string(),
}).strip();

const workspaceStateSchema = z.object({
  currentBuildingLevelId: z.string().min(1),
  selectedAssetId: z.string().refine(isKnownAssetId, 'Expected known asset id').nullable(),
  selectedCoordinate: coordinateSchema.nullable(),
}).strip();

const metadataSchema = z.object({
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  lastSavedAt: isoDateTimeSchema.nullable(),
  lastAutosavedAt: isoDateTimeSchema.nullable(),
}).strict();

export const sceneDocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  sceneId: z.string().min(1),
  sceneName: z.string().min(1),
  selectedPokemonKey: z.string().refine(isKnownPokemonKey, 'Expected known Decor Dex Pokemon key'),
  sceneSize: gridSizeSchema,
  canvasSize: gridSizeSchema,
  outerPadding: z.number().int().min(0),
  buildingLevels: z.array(buildingLevelSchema).min(1).max(maxBuildingLevels),
  tileInstances: z.array(tileInstanceSchema),
  skillMarkers: z.array(skillMarkerSchema).default([]),
  workspaceState: workspaceStateSchema,
  metadata: metadataSchema,
}).strict().superRefine((scene, context) => {
  const levelIds = new Set<string>();

  for (const [index, level] of scene.buildingLevels.entries()) {
    if (levelIds.has(level.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate building level id: ${level.id}`,
        path: ['buildingLevels', index, 'id'],
      });
    }

    levelIds.add(level.id);

    const noteIds = new Set<string>();
    for (const [noteIndex, note] of level.notes.entries()) {
      if (noteIds.has(note.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate building level note id: ${note.id}`,
          path: ['buildingLevels', index, 'notes', noteIndex, 'id'],
        });
      }

      noteIds.add(note.id);
    }
  }

  if (!levelIds.has(scene.workspaceState.currentBuildingLevelId)) {
    context.addIssue({
      code: 'custom',
      message: 'Expected currentBuildingLevelId to reference an existing building level',
      path: ['workspaceState', 'currentBuildingLevelId'],
    });
  }

  const dimensions = {
    sceneSize: scene.sceneSize,
    canvasSize: scene.canvasSize,
    outerPadding: scene.outerPadding,
  };
  try {
    assertSupportedSceneDimensions(dimensions);
  } catch (error) {
    context.addIssue({
      code: 'custom',
      message: error instanceof Error ? error.message : 'Invalid scene dimensions.',
      path: [],
    });
    return;
  }

  if (scene.workspaceState.selectedCoordinate) {
    addCoordinateBoundsIssue(
      context,
      ['workspaceState', 'selectedCoordinate'],
      scene.workspaceState.selectedCoordinate,
      dimensions,
    );
  }

  const instanceIds = new Set<string>();
  const skillMarkerLevelCoordinates = new Map<string, number>();

  for (const [index, instance] of scene.tileInstances.entries()) {
    if (instanceIds.has(instance.instanceId)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate tile instance id: ${instance.instanceId}`,
        path: ['tileInstances', index, 'instanceId'],
      });
    }

    instanceIds.add(instance.instanceId);

    addCoordinateBoundsIssue(context, ['tileInstances', index, 'coordinate'], instance.coordinate, dimensions);

    if (!levelIds.has(instance.buildingLevelId)) {
      context.addIssue({
        code: 'custom',
        message: 'Expected buildingLevelId to reference an existing building level',
        path: ['tileInstances', index, 'buildingLevelId'],
      });
    }

    const asset = getAssetById(instance.assetId);
    if (asset && !asset.dyeable && instance.dyeColor !== null) {
      context.addIssue({
        code: 'custom',
        message: 'Expected dyeColor null for non-dyeable asset',
        path: ['tileInstances', index, 'dyeColor'],
      });
    }

    let calculatedAreaType: string;
    try {
      calculatedAreaType = calculateAreaType(instance.coordinate, dimensions);
    } catch {
      continue;
    }

    if (instance.areaType !== calculatedAreaType) {
      context.addIssue({
        code: 'custom',
        message: `Expected areaType ${calculatedAreaType} for coordinate ${instance.coordinate.x},${instance.coordinate.y}`,
        path: ['tileInstances', index, 'areaType'],
      });
    }
  }

  for (const [index, marker] of scene.skillMarkers.entries()) {
    const markerKey = `${marker.buildingLevelId}:${marker.coordinate.x},${marker.coordinate.y}`;
    addCoordinateBoundsIssue(context, ['skillMarkers', index, 'coordinate'], marker.coordinate, dimensions);
    const existingIndex = skillMarkerLevelCoordinates.get(markerKey);

    if (existingIndex !== undefined) {
      context.addIssue({
        code: 'custom',
        message: `Expected one skill marker per building level coordinate; duplicate with skillMarkers[${existingIndex}]`,
        path: ['skillMarkers', index, 'coordinate'],
      });
    } else {
      skillMarkerLevelCoordinates.set(markerKey, index);
    }

    if (!levelIds.has(marker.buildingLevelId)) {
      context.addIssue({
        code: 'custom',
        message: 'Expected buildingLevelId to reference an existing building level',
        path: ['skillMarkers', index, 'buildingLevelId'],
      });
    }

    let calculatedAreaType: string;
    try {
      calculatedAreaType = calculateAreaType(marker.coordinate, dimensions);
    } catch {
      continue;
    }

    if (marker.areaType !== calculatedAreaType) {
      context.addIssue({
        code: 'custom',
        message: `Expected areaType ${calculatedAreaType} for coordinate ${marker.coordinate.x},${marker.coordinate.y}`,
        path: ['skillMarkers', index, 'areaType'],
      });
    }
  }

  for (const conflict of validateSceneOccupancy(scene)) {
    const instanceIndex = scene.tileInstances.findIndex((instance) => instance.instanceId === conflict.instanceId);
    context.addIssue({
      code: 'custom',
      message: conflict.message,
      path: ['tileInstances', Math.max(instanceIndex, 0), 'coordinate'],
      params: conflict,
    });
  }
});

function addCoordinateBoundsIssue(
  context: z.RefinementCtx,
  path: Array<string | number>,
  coordinate: GridCoordinate,
  dimensions: SceneDimensions,
): void {
  try {
    assertCanvasCoordinate(coordinate, dimensions);
  } catch {
    const message = `Expected coordinate inside 0..${dimensions.canvasSize.width - 1}, 0..${
      dimensions.canvasSize.height - 1
    }.`;

    if (coordinate.x >= dimensions.canvasSize.width) {
      context.addIssue({
        code: 'custom',
        message,
        path: [...path, 'x'],
      });
    }

    if (coordinate.y >= dimensions.canvasSize.height) {
      context.addIssue({
        code: 'custom',
        message,
        path: [...path, 'y'],
      });
    }
  }
}

export type SceneDocumentV1 = z.infer<typeof sceneDocumentV1Schema>;

export interface SceneDocumentValidationError {
  fieldPath: string;
  expected: string;
  actual: string;
  reason: string;
  recoveryAction: string;
  conflictType?: FootprintConflict['conflictType'];
  instanceId?: string;
  assetId?: string;
  buildingLevelId?: string;
  coordinates?: GridCoordinate[];
  blockingInstanceId?: string;
  blockingAssetId?: string;
  blockingBuildingLevelId?: string;
  surfaceKind?: FootprintConflict['surfaceKind'];
}

export type SceneDocumentParseResult =
  | { ok: true; scene: SceneDocumentV1 }
  | { ok: false; errors: SceneDocumentValidationError[] };

export function parseSceneDocument(input: unknown): SceneDocumentParseResult {
  const result = sceneDocumentV1Schema.safeParse(input);

  if (result.success) {
    return { ok: true, scene: result.data };
  }

  return { ok: false, errors: formatValidationErrors(result.error.issues, input) };
}

export function validateSceneDocument(input: unknown): SceneDocumentValidationError[] {
  const result = parseSceneDocument(input);

  return result.ok ? [] : result.errors;
}

function formatValidationErrors(issues: z.ZodIssue[], input: unknown): SceneDocumentValidationError[] {
  const errors = issues.map((issue) => ({
    fieldPath: formatIssuePath(issue.path),
    expected: formatIssueExpected(issue),
    actual: formatIssueActual(issue, input),
    reason: issue.message,
    recoveryAction: getRecoveryAction(issue),
    ...formatFootprintIssueDetails(issue),
  }));

  return mergeValidationErrors(errors, getRawDimensionValidationErrors(input));
}

function getRawDimensionValidationErrors(input: unknown): SceneDocumentValidationError[] {
  const root = asRecord(input);
  if (!root) {
    return [];
  }

  const dimensions = readRawDimensions(root);
  if (!dimensions) {
    return [];
  }

  try {
    assertSupportedSceneDimensions(dimensions);
  } catch (error) {
    return [{
      fieldPath: '$',
      expected: 'outerPadding 1 and canvas width/height 6..20 scene dimensions',
      actual: stringifyActualValue({
        sceneSize: root.sceneSize,
        canvasSize: root.canvasSize,
        outerPadding: root.outerPadding,
      }),
      reason: error instanceof Error ? error.message : 'Invalid scene dimensions.',
      recoveryAction: 'Fix the SceneDocument v1 payload field and try again.',
    }];
  }

  const errors: SceneDocumentValidationError[] = [];
  const workspaceState = asRecord(root.workspaceState);
  const selectedCoordinate = asCoordinate(workspaceState?.selectedCoordinate);
  if (selectedCoordinate) {
    errors.push(...getRawCoordinateBoundsErrors('workspaceState.selectedCoordinate', selectedCoordinate, dimensions));
  }

  if (Array.isArray(root.tileInstances)) {
    root.tileInstances.forEach((item, index) => {
      const coordinate = asCoordinate(asRecord(item)?.coordinate);
      if (coordinate) {
        errors.push(...getRawCoordinateBoundsErrors(`tileInstances[${index}].coordinate`, coordinate, dimensions));
      }
    });
  }

  if (Array.isArray(root.skillMarkers)) {
    root.skillMarkers.forEach((item, index) => {
      const coordinate = asCoordinate(asRecord(item)?.coordinate);
      if (coordinate) {
        errors.push(...getRawCoordinateBoundsErrors(`skillMarkers[${index}].coordinate`, coordinate, dimensions));
      }
    });
  }

  return errors;
}

function readRawDimensions(root: Record<string, unknown>): SceneDimensions | null {
  const sceneSize = asGridSize(root.sceneSize);
  const canvasSize = asGridSize(root.canvasSize);
  const outerPadding = root.outerPadding;

  if (!sceneSize || !canvasSize || typeof outerPadding !== 'number' || !Number.isInteger(outerPadding)) {
    return null;
  }

  return {
    sceneSize,
    canvasSize,
    outerPadding,
  };
}

function asGridSize(value: unknown): SceneDimensions['sceneSize'] | null {
  const record = asRecord(value);
  const width = record?.width;
  const height = record?.height;

  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isInteger(width) ||
    !Number.isInteger(height)
  ) {
    return null;
  }

  return {
    width,
    height,
  };
}

function asCoordinate(value: unknown): GridCoordinate | null {
  const record = asRecord(value);
  const x = record?.x;
  const y = record?.y;

  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isInteger(x) || !Number.isInteger(y)) {
    return null;
  }

  return {
    x,
    y,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function getRawCoordinateBoundsErrors(
  fieldPath: string,
  coordinate: GridCoordinate,
  dimensions: SceneDimensions,
): SceneDocumentValidationError[] {
  const errors: SceneDocumentValidationError[] = [];
  const message = `Expected coordinate inside 0..${dimensions.canvasSize.width - 1}, 0..${
    dimensions.canvasSize.height - 1
  }.`;

  if (coordinate.x >= dimensions.canvasSize.width) {
    errors.push(createRawCoordinateBoundsError(`${fieldPath}.x`, coordinate.x, message));
  }

  if (coordinate.y >= dimensions.canvasSize.height) {
    errors.push(createRawCoordinateBoundsError(`${fieldPath}.y`, coordinate.y, message));
  }

  return errors;
}

function createRawCoordinateBoundsError(
  fieldPath: string,
  actual: number,
  reason: string,
): SceneDocumentValidationError {
  return {
    fieldPath,
    expected: reason,
    actual: String(actual),
    reason,
    recoveryAction: 'Keep coordinates inside the SceneDocument v1 canvas bounds.',
  };
}

function mergeValidationErrors(
  primary: SceneDocumentValidationError[],
  secondary: SceneDocumentValidationError[],
): SceneDocumentValidationError[] {
  const seen = new Set(primary.map((error) => `${error.fieldPath}:${error.reason}`));
  const merged = [...primary];

  for (const error of secondary) {
    const key = `${error.fieldPath}:${error.reason}`;
    if (!seen.has(key)) {
      merged.push(error);
      seen.add(key);
    }
  }

  return merged;
}

function formatFootprintIssueDetails(issue: z.ZodIssue): Partial<SceneDocumentValidationError> {
  const issueWithParams = issue as z.ZodIssue & { params?: Partial<FootprintConflict> };
  const params = issueWithParams.params;

  if (!params?.conflictType) {
    return {};
  }

  return {
    conflictType: params.conflictType,
    instanceId: params.instanceId,
    assetId: params.assetId,
    buildingLevelId: params.buildingLevelId,
    coordinates: params.coordinates?.map((coordinate) => ({ x: coordinate.x, y: coordinate.y })),
    blockingInstanceId: params.blockingInstanceId,
    blockingAssetId: params.blockingAssetId,
    blockingBuildingLevelId: params.blockingBuildingLevelId,
    surfaceKind: params.surfaceKind,
  };
}

function formatIssuePath(path: readonly PropertyKey[]): string {
  if (path.length === 0) {
    return '$';
  }

  return path.reduce<string>((fieldPath, segment) => {
    if (typeof segment === 'number') {
      return `${fieldPath}[${segment}]`;
    }

    const segmentText = String(segment);

    return fieldPath ? `${fieldPath}.${segmentText}` : segmentText;
  }, '');
}

function formatIssueExpected(issue: z.ZodIssue): string {
  if (issue.code === 'invalid_type') {
    return issue.expected;
  }

  if (issue.code === 'invalid_value') {
    return issue.values.map(String).join(' | ');
  }

  return issue.message;
}

function formatIssueActual(issue: z.ZodIssue, input: unknown): string {
  const issueWithInput = issue as z.ZodIssue & { input?: unknown };

  if ('input' in issueWithInput) {
    return stringifyActualValue(issueWithInput.input);
  }

  return stringifyActualValue(getPathValue(input, issue.path));
}

function getPathValue(input: unknown, path: readonly PropertyKey[]): unknown {
  let value = input;

  for (const segment of path) {
    if (value === null || typeof value !== 'object') {
      return undefined;
    }

    value = (value as Record<PropertyKey, unknown>)[segment];
  }

  return value;
}

function stringifyActualValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null) {
    return 'null';
  }

  if (typeof value === 'undefined') {
    return 'undefined';
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getRecoveryAction(issue: z.ZodIssue): string {
  const fieldPath = formatIssuePath(issue.path);
  const issueWithParams = issue as z.ZodIssue & { params?: Partial<FootprintConflict> };

  if (issueWithParams.params?.conflictType) {
    return 'Resolve footprint bounds, overlap, or height blocking conflicts before saving or importing.';
  }

  if (fieldPath.endsWith('areaType')) {
    return 'Recompute areaType from coordinate, sceneSize, and outerPadding before saving.';
  }

  if (fieldPath.includes('coordinate')) {
    return 'Keep coordinates inside the SceneDocument v1 canvas bounds.';
  }

  if (fieldPath === 'selectedPokemonKey') {
    return 'Use an existing Decor Dex Pokemon key.';
  }

  if (fieldPath.endsWith('assetId') || fieldPath === 'workspaceState.selectedAssetId') {
    return 'Use an existing asset id or null for an empty selection.';
  }

  return 'Fix the SceneDocument v1 payload field and try again.';
}
