import { z } from 'zod';
import {
  assetSkillTypes,
  getAssetById,
  isKnownAssetId,
  isKnownPokemonKey,
} from '../domain/assets';
import { calculateAreaType, validateSceneOccupancy, type FootprintConflict, type GridCoordinate } from '../domain/scene';

const isoDateTimeSchema = z.iso.datetime({ precision: 3 });

const gridSizeSchema = z.object({
  width: z.number().int(),
  height: z.number().int(),
}).strict();

const sceneSizeSchema = gridSizeSchema.refine(
  (size) => size.width === 5 && size.height === 5,
  'Expected 5x5 scene size',
);

const canvasSizeSchema = gridSizeSchema.refine(
  (size) => size.width === 7 && size.height === 7,
  'Expected 7x7 canvas size',
);

const rotationDegreesSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

const coordinateSchema = z.object({
  x: z.number().int().min(0).max(6),
  y: z.number().int().min(0).max(6),
}).strict();

const buildingLevelNoteSchema = z.object({
  id: z.string().min(1),
  text: z.string().refine((value) => value.trim().length > 0, 'Expected non-empty note text'),
}).strict();

const buildingLevelSchema = z.object({
  id: z.string().min(1),
  levelNumber: z.number().int().min(0),
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
  sceneSize: sceneSizeSchema,
  canvasSize: canvasSizeSchema,
  outerPadding: z.literal(1),
  buildingLevels: z.array(buildingLevelSchema).min(1),
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
  return issues.map((issue) => ({
    fieldPath: formatIssuePath(issue.path),
    expected: formatIssueExpected(issue),
    actual: formatIssueActual(issue, input),
    reason: issue.message,
    recoveryAction: getRecoveryAction(issue),
    ...formatFootprintIssueDetails(issue),
  }));
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
