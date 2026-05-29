import {
  assetCatalog,
  assetSkillTypes,
  getAssetById,
  knownPokemonKeys,
  type ConcreteAssetSkillType,
} from '../domain/assets';
import {
  calculateAreaType,
  assertCanvasCoordinate,
  assertSceneDimensions,
  assertSupportedSceneDimensions,
  legacySceneDimensions,
  summarizeSceneDimensions,
  type GridCoordinate,
  type SceneDimensions,
  type SceneDimensionsSummary,
  type SceneDocument,
  type RotationDegrees,
} from '../domain/scene';
import { recoverSceneDocument } from './scene-recovery';
import { serializeSceneDocument } from './scene-serializer';
import type { SceneDocumentV1, SceneDocumentValidationError } from './scene-schema';

const legacyCodecPrefix = 'PSE1';
const dimensionedCodecPrefix = 'PSE2';
const empty = '_';
const radixAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const rotationValues: readonly RotationDegrees[] = [0, 90, 180, 270];

export type SceneStringDecodeResult =
  | { ok: true; scene: SceneDocument; payload: SceneDocumentV1 }
  | { ok: false; errors: SceneDocumentValidationError[] };

type SceneStringDecodeFailure = { ok: false; errors: SceneDocumentValidationError[] };

export interface SceneStringDroppedTileInstance {
  instanceId: string;
  assetId: string;
  assetName: string;
  buildingLevelId: string;
  buildingLevelName: string;
  buildingLevelNumber: number | null;
  coordinate: GridCoordinate;
  conflictType: NonNullable<SceneDocumentValidationError['conflictType']>;
  reason: string;
  coordinates: readonly GridCoordinate[];
  blockingInstanceId?: string;
  blockingAssetId?: string;
  blockingAssetName?: string;
  blockingBuildingLevelId?: string;
  blockingBuildingLevelName?: string;
  blockingBuildingLevelNumber?: number | null;
}

export type SceneStringLossyDecodeResult =
  | {
      ok: true;
      scene: SceneDocument;
      payload: SceneDocumentV1;
      droppedTileInstances: readonly SceneStringDroppedTileInstance[];
    }
  | { ok: false; errors: SceneDocumentValidationError[] };

export function encodeSceneDocumentString(scene: SceneDocument): string {
  const payload = serializeSceneDocument({
    ...scene,
    workspaceState: {
      ...scene.workspaceState,
      selectedAssetId: null,
    },
  });
  const levelIndexById = new Map(payload.buildingLevels.map((level, index) => [level.id, index]));
  const currentLevelIndex = levelIndexById.get(payload.workspaceState.currentBuildingLevelId) ?? 0;

  const dimensions = getPayloadDimensions(payload);
  const encodedHeader = encodeHeader(payload, currentLevelIndex, dimensions);
  const encodedLevels = payload.buildingLevels.map(encodeLevel).join(';') || empty;
  const encodedInstances =
    payload.tileInstances.map((instance) => encodeTileInstance(instance, levelIndexById, dimensions)).join(';') || empty;
  const encodedMarkers =
    payload.skillMarkers.map((marker) => encodeSkillMarker(marker, levelIndexById, dimensions)).join(';') || empty;

  if (isLegacySceneDimensions(dimensions)) {
    return [
      legacyCodecPrefix,
      encodedHeader,
      encodedLevels,
      encodedInstances,
      encodedMarkers,
    ].join('~');
  }

  return [
    dimensionedCodecPrefix,
    encodeDimensions(dimensions),
    encodedHeader,
    encodedLevels,
    encodedInstances,
    encodedMarkers,
  ].join('~');
}

export function decodeSceneDocumentString(value: string, now = new Date().toISOString()): SceneStringDecodeResult {
  try {
    const payload = decodeSceneDocumentPayload(value.trim(), now);
    return recoverSceneDocument(payload);
  } catch (error) {
    return createSceneStringDecodeFailure(error);
  }
}

export function decodeSceneDocumentStringWithLossyRecovery(
  value: string,
  now = new Date().toISOString(),
): SceneStringLossyDecodeResult {
  try {
    const payload = decodeSceneDocumentPayload(value.trim(), now);
    return recoverSceneDocumentWithDroppedTileInstances(payload);
  } catch (error) {
    return createSceneStringDecodeFailure(error);
  }
}

export function summarizeSceneDocumentStringDimensions(value: string): SceneDimensionsSummary | null {
  const [prefix, ...parts] = value.trim().split('~');

  if (prefix === legacyCodecPrefix) {
    return summarizeSceneDimensions(legacySceneDimensions);
  }

  if (prefix !== dimensionedCodecPrefix) {
    return null;
  }

  try {
    return summarizeSceneDimensions(decodeDimensions(parts.shift(), { requireSupported: false }));
  } catch {
    return null;
  }
}

function encodeHeader(payload: SceneDocumentV1, currentLevelIndex: number, dimensions: SceneDimensions): string {
  return [
    encodeText(payload.sceneName),
    encodeNumber(knownPokemonKeys.indexOf(payload.selectedPokemonKey)),
    encodeNumber(currentLevelIndex),
    empty,
    payload.workspaceState.selectedCoordinate
      ? encodeCoordinate(payload.workspaceState.selectedCoordinate, dimensions)
      : empty,
  ].join('.');
}

function encodeLevel(level: SceneDocumentV1['buildingLevels'][number]): string {
  const encodedBase = `${encodeNumber(level.levelNumber)}.${encodeText(level.name)}`;

  if (level.notes.length === 0) {
    return encodedBase;
  }

  return `${encodedBase}.${encodeNotes(level.notes)}`;
}

function encodeTileInstance(
  instance: SceneDocumentV1['tileInstances'][number],
  levelIndexById: ReadonlyMap<string, number>,
  dimensions: SceneDimensions,
): string {
  return [
    encodeNumber(requireLevelIndex(levelIndexById, instance.buildingLevelId)),
    encodeCoordinate(instance.coordinate, dimensions),
    encodeOfficialAssetId(instance.assetId),
    encodeNumber(rotationValues.indexOf(instance.rotationDegrees)),
    instance.dyeColor ? instance.dyeColor.slice(1).toLowerCase() : empty,
    instance.skillType ? encodeSkillType(instance.skillType) : empty,
    instance.skillNote ? encodeText(instance.skillNote) : empty,
  ].join('.');
}

function encodeSkillMarker(
  marker: SceneDocumentV1['skillMarkers'][number],
  levelIndexById: ReadonlyMap<string, number>,
  dimensions: SceneDimensions,
): string {
  return [
    encodeNumber(requireLevelIndex(levelIndexById, marker.buildingLevelId)),
    encodeCoordinate(marker.coordinate, dimensions),
    encodeSkillType(marker.skillType),
    marker.skillNote ? encodeText(marker.skillNote) : empty,
  ].join('.');
}

function decodeSceneDocumentPayload(value: string, now: string): SceneDocumentV1 {
  const [prefix, ...parts] = value.split('~');
  const isLegacy = prefix === legacyCodecPrefix;
  const isDimensioned = prefix === dimensionedCodecPrefix;

  if (!isLegacy && !isDimensioned) {
    throw new Error('Invalid scene string format.');
  }

  const dimensions = isLegacy ? legacySceneDimensions : decodeDimensions(parts.shift());
  const [encodedHeader, encodedLevels, encodedInstances, encodedMarkers, ...extra] = parts;
  if (!encodedHeader || !encodedLevels || extra.length > 0) {
    throw new Error('Invalid scene string format.');
  }

  const header = decodeHeader(encodedHeader, dimensions);
  const buildingLevels = decodeRecordList(encodedLevels).map((record, index) => decodeLevel(record, index));
  if (buildingLevels.length === 0) {
    throw new Error('Scene string must include at least one building level.');
  }

  const levelIdByIndex = buildingLevels.map((level) => level.id);
  const tileInstances = decodeRecordList(encodedInstances).map((record, index) =>
    decodeTileInstance(record, index, levelIdByIndex, dimensions),
  );
  const skillMarkers = decodeRecordList(encodedMarkers).map((record) => decodeSkillMarker(record, levelIdByIndex, dimensions));

  return {
    schemaVersion: 1,
    sceneId: `scene-import-${now.replace(/[^0-9]/g, '').slice(0, 17)}`,
    sceneName: header.sceneName,
    selectedPokemonKey: header.selectedPokemonKey,
    sceneSize: { ...dimensions.sceneSize },
    canvasSize: { ...dimensions.canvasSize },
    outerPadding: dimensions.outerPadding,
    buildingLevels,
    tileInstances,
    skillMarkers,
    workspaceState: {
      currentBuildingLevelId: levelIdByIndex[header.currentLevelIndex] ?? levelIdByIndex[0],
      selectedAssetId: null,
      selectedCoordinate: header.selectedCoordinate,
    },
    metadata: {
      createdAt: now,
      updatedAt: now,
      lastSavedAt: now,
      lastAutosavedAt: null,
    },
  };
}

function recoverSceneDocumentWithDroppedTileInstances(payload: SceneDocumentV1): SceneStringLossyDecodeResult {
  let currentPayload = payload;
  const droppedById = new Map<string, SceneStringDroppedTileInstance>();
  const maxPasses = payload.tileInstances.length + 1;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const recovered = recoverSceneDocument(currentPayload);

    if (recovered.ok) {
      return {
        ...recovered,
        droppedTileInstances: [...droppedById.values()],
      };
    }

    const recoverableError = recovered.errors.find((error) =>
      isRecoverableTileInstanceConflict(error, currentPayload),
    );

    if (!recoverableError) {
      return recovered;
    }

    const instance = currentPayload.tileInstances.find((tileInstance) =>
      tileInstance.instanceId === recoverableError.instanceId,
    );

    if (!instance) {
      return recovered;
    }

    droppedById.set(
      recoverableError.instanceId,
      describeDroppedTileInstance(instance, recoverableError, currentPayload),
    );

    currentPayload = {
      ...currentPayload,
      tileInstances: currentPayload.tileInstances.filter((tileInstance) =>
        tileInstance.instanceId !== recoverableError.instanceId,
      ),
      workspaceState: { ...currentPayload.workspaceState },
      metadata: { ...currentPayload.metadata },
    };
  }

  const recovered = recoverSceneDocument(currentPayload);

  if (recovered.ok) {
    return {
      ...recovered,
      droppedTileInstances: [...droppedById.values()],
    };
  }

  return recovered;
}

function isRecoverableTileInstanceConflict(
  error: SceneDocumentValidationError,
  payload: SceneDocumentV1,
): error is SceneDocumentValidationError & {
  conflictType: NonNullable<SceneDocumentValidationError['conflictType']>;
  instanceId: string;
} {
  return Boolean(
    error.conflictType &&
      error.instanceId &&
      payload.tileInstances.some((instance) => instance.instanceId === error.instanceId),
  );
}

function describeDroppedTileInstance(
  instance: SceneDocumentV1['tileInstances'][number],
  error: SceneDocumentValidationError & {
    conflictType: NonNullable<SceneDocumentValidationError['conflictType']>;
    instanceId: string;
  },
  payload: SceneDocumentV1,
): SceneStringDroppedTileInstance {
  const level = payload.buildingLevels.find((candidate) => candidate.id === instance.buildingLevelId);
  const asset = getAssetById(instance.assetId);
  const blockingLevel = error.blockingBuildingLevelId
    ? payload.buildingLevels.find((candidate) => candidate.id === error.blockingBuildingLevelId)
    : null;
  const blockingAsset = error.blockingAssetId ? getAssetById(error.blockingAssetId) : null;

  return {
    instanceId: instance.instanceId,
    assetId: instance.assetId,
    assetName: asset?.name ?? instance.assetId,
    buildingLevelId: instance.buildingLevelId,
    buildingLevelName: level?.name ?? instance.buildingLevelId,
    buildingLevelNumber: level?.levelNumber ?? null,
    coordinate: { x: instance.coordinate.x, y: instance.coordinate.y },
    conflictType: error.conflictType,
    reason: error.reason,
    coordinates: (error.coordinates ?? [instance.coordinate]).map((coordinate) => ({
      x: coordinate.x,
      y: coordinate.y,
    })),
    blockingInstanceId: error.blockingInstanceId,
    blockingAssetId: error.blockingAssetId,
    blockingAssetName: blockingAsset?.name ?? error.blockingAssetId,
    blockingBuildingLevelId: error.blockingBuildingLevelId,
    blockingBuildingLevelName: blockingLevel?.name ?? error.blockingBuildingLevelId,
    blockingBuildingLevelNumber: blockingLevel?.levelNumber ?? null,
  };
}

function createSceneStringDecodeFailure(error: unknown): SceneStringDecodeFailure {
  return {
    ok: false,
    errors: [
      {
        fieldPath: '$',
        expected: 'Pokopia Scene Editor short scene string',
        actual: error instanceof Error ? error.message : String(error),
        reason: error instanceof RangeError ? error.message : 'Unable to decode scene string.',
        recoveryAction: 'Paste an unmodified string created by the export string button.',
      },
    ],
  };
}

function decodeHeader(value: string, dimensions: SceneDimensions) {
  const [sceneName, pokemonIndex, currentLevelIndex, selectedAssetOfficialId, selectedCoordinate, ...extra] =
    value.split('.');
  if (
    !sceneName ||
    !pokemonIndex ||
    !currentLevelIndex ||
    selectedAssetOfficialId === undefined ||
    selectedCoordinate === undefined ||
    extra.length > 0
  ) {
    throw new Error('Invalid scene string header.');
  }

  const pokemonKey = knownPokemonKeys[decodeNumber(pokemonIndex)];
  if (!pokemonKey) {
    throw new Error('Unknown Pokemon index.');
  }

  return {
    sceneName: decodeText(sceneName),
    selectedPokemonKey: pokemonKey,
    currentLevelIndex: decodeNumber(currentLevelIndex),
    selectedCoordinate: selectedCoordinate === empty ? null : decodeCoordinate(selectedCoordinate, dimensions),
  };
}

function decodeLevel(value: string, index: number) {
  const [levelNumber, name, encodedNotes, ...extra] = value.split('.');
  if (!levelNumber || name === undefined || extra.length > 0) {
    throw new Error('Invalid building level record.');
  }

  return {
    id: `level-${index}`,
    levelNumber: decodeNumber(levelNumber),
    name: decodeText(name),
    notes: decodeNotes(encodedNotes),
  };
}

function encodeNotes(notes: SceneDocumentV1['buildingLevels'][number]['notes']): string {
  return notes.map((note) => `${encodeText(note.id)}:${encodeText(note.text)}`).join(',');
}

function decodeNotes(value: string | undefined) {
  if (!value || value === empty) {
    return [];
  }

  return value.split(',').map((record) => {
    const [id, text, ...extra] = record.split(':');
    if (!id || text === undefined || extra.length > 0) {
      throw new Error('Invalid building level note record.');
    }

    return {
      id: decodeText(id),
      text: decodeText(text),
    };
  });
}

function decodeTileInstance(value: string, index: number, levelIdByIndex: readonly string[], dimensions: SceneDimensions) {
  const [levelIndex, coordinate, officialAssetId, rotationIndex, dyeColor, skillType, skillNote, ...extra] =
    value.split('.');
  if (
    !levelIndex ||
    !coordinate ||
    !officialAssetId ||
    !rotationIndex ||
    dyeColor === undefined ||
    skillType === undefined ||
    skillNote === undefined ||
    extra.length > 0
  ) {
    throw new Error('Invalid tile instance record.');
  }

  const decodedCoordinate = decodeCoordinate(coordinate, dimensions);
  const decodedSkillType = skillType === empty ? null : decodeSkillType(skillType);

  return {
    instanceId: `imported-tile-${index}`,
    assetId: getAssetIdByOfficialId(decodeOfficialAssetId(officialAssetId)),
    coordinate: decodedCoordinate,
    areaType: calculateAreaType(decodedCoordinate, dimensions),
    buildingLevelId: decodeLevelId(levelIndex, levelIdByIndex),
    rotationDegrees: decodeRotation(rotationIndex),
    dyeColor: dyeColor === empty ? null : `#${dyeColor}`,
    requiresSkill: decodedSkillType !== null,
    skillType: decodedSkillType,
    skillNote: skillNote === empty ? '' : decodeText(skillNote),
  };
}

function decodeSkillMarker(value: string, levelIdByIndex: readonly string[], dimensions: SceneDimensions) {
  const [levelIndex, coordinate, skillType, skillNote, ...extra] = value.split('.');
  if (!levelIndex || !coordinate || !skillType || skillNote === undefined || extra.length > 0) {
    throw new Error('Invalid skill marker record.');
  }

  const decodedCoordinate = decodeCoordinate(coordinate, dimensions);

  return {
    coordinate: decodedCoordinate,
    areaType: calculateAreaType(decodedCoordinate, dimensions),
    buildingLevelId: decodeLevelId(levelIndex, levelIdByIndex),
    skillType: decodeSkillType(skillType),
    skillNote: skillNote === empty ? '' : decodeText(skillNote),
  };
}

function decodeLevelId(value: string, levelIdByIndex: readonly string[]): string {
  const levelId = levelIdByIndex[decodeNumber(value)];
  if (!levelId) {
    throw new Error('Unknown building level index.');
  }

  return levelId;
}

function decodeRecordList(value: string | undefined): string[] {
  if (!value || value === empty) {
    return [];
  }

  return value.split(';');
}

function encodeOfficialAssetId(assetId: string): string {
  const asset = assetCatalog.find((entry) => entry.assetId === assetId);
  if (!asset) {
    throw new Error(`Unknown asset id: ${assetId}`);
  }

  return encodeNumber(Number(asset.officialId));
}

function decodeOfficialAssetId(value: string): string {
  return decodeNumber(value).toString().padStart(3, '0');
}

function getAssetIdByOfficialId(officialId: string): string {
  const asset = assetCatalog.find((entry) => entry.officialId === officialId);
  if (!asset) {
    throw new Error(`Unknown asset official id: ${officialId}`);
  }

  return asset.assetId;
}

function encodeSkillType(skillType: ConcreteAssetSkillType): string {
  return encodeNumber(assetSkillTypes.indexOf(skillType));
}

function decodeSkillType(value: string): ConcreteAssetSkillType {
  const skillType = assetSkillTypes[decodeNumber(value)];
  if (!skillType) {
    throw new Error('Unknown skill type index.');
  }

  return skillType;
}

function decodeRotation(value: string): RotationDegrees {
  const rotation = rotationValues[decodeNumber(value)];
  if (rotation === undefined) {
    throw new Error('Unknown rotation index.');
  }

  return rotation;
}

function encodeCoordinate(coordinate: GridCoordinate, dimensions: SceneDimensions): string {
  assertCanvasCoordinate(coordinate, dimensions);
  return encodeNumber(coordinate.y * dimensions.canvasSize.width + coordinate.x);
}

function decodeCoordinate(value: string, dimensions: SceneDimensions): GridCoordinate {
  const packed = decodeNumber(value);
  const coordinate = {
    x: packed % dimensions.canvasSize.width,
    y: Math.floor(packed / dimensions.canvasSize.width),
  };
  assertCanvasCoordinate(coordinate, dimensions);
  return coordinate;
}

function encodeText(value: string): string {
  return encodeURIComponent(value).replace(/\./g, '%2E').replace(/~/g, '%7E').replace(/;/g, '%3B');
}

function decodeText(value: string): string {
  return decodeURIComponent(value);
}

function encodeNumber(value: number): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Expected non-negative integer, received ${value}.`);
  }

  let remaining = value;
  let output = '';
  do {
    output = `${radixAlphabet[remaining % radixAlphabet.length]}${output}`;
    remaining = Math.floor(remaining / radixAlphabet.length);
  } while (remaining > 0);

  return output;
}

function decodeNumber(value: string): number {
  return [...value].reduce((total, char) => {
    const digit = radixAlphabet.indexOf(char);
    if (digit === -1) {
      throw new Error(`Invalid base62 digit: ${char}`);
    }

    return total * radixAlphabet.length + digit;
  }, 0);
}

function requireLevelIndex(levelIndexById: ReadonlyMap<string, number>, levelId: string): number {
  const levelIndex = levelIndexById.get(levelId);
  if (levelIndex === undefined) {
    throw new Error(`Unknown building level id: ${levelId}`);
  }

  return levelIndex;
}

function getPayloadDimensions(payload: SceneDocumentV1): SceneDimensions {
  return {
    sceneSize: { ...payload.sceneSize },
    canvasSize: { ...payload.canvasSize },
    outerPadding: payload.outerPadding,
  };
}

function isLegacySceneDimensions(dimensions: SceneDimensions): boolean {
  return (
    dimensions.sceneSize.width === legacySceneDimensions.sceneSize.width &&
    dimensions.sceneSize.height === legacySceneDimensions.sceneSize.height &&
    dimensions.canvasSize.width === legacySceneDimensions.canvasSize.width &&
    dimensions.canvasSize.height === legacySceneDimensions.canvasSize.height &&
    dimensions.outerPadding === legacySceneDimensions.outerPadding
  );
}

function encodeDimensions(dimensions: SceneDimensions): string {
  assertSupportedSceneDimensions(dimensions);
  return [
    encodeNumber(dimensions.sceneSize.width),
    encodeNumber(dimensions.sceneSize.height),
    encodeNumber(dimensions.outerPadding),
  ].join('.');
}

function decodeDimensions(
  value: string | undefined,
  options: { requireSupported?: boolean } = { requireSupported: true },
): SceneDimensions {
  if (!value) {
    throw new Error('Invalid scene string dimensions.');
  }

  const [sceneWidth, sceneHeight, outerPadding, ...extra] = value.split('.');
  if (!sceneWidth || !sceneHeight || !outerPadding || extra.length > 0) {
    throw new Error('Invalid scene string dimensions.');
  }

  const dimensions = {
    sceneSize: {
      width: decodeNumber(sceneWidth),
      height: decodeNumber(sceneHeight),
    },
    outerPadding: decodeNumber(outerPadding),
    canvasSize: {
      width: decodeNumber(sceneWidth) + decodeNumber(outerPadding) * 2,
      height: decodeNumber(sceneHeight) + decodeNumber(outerPadding) * 2,
    },
  };
  assertSceneDimensions(dimensions);
  if (options.requireSupported ?? true) {
    assertSupportedSceneDimensions(dimensions);
  }
  return dimensions;
}
