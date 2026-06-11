import { describe, expect, it } from 'vitest';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  createStackingPlateFoodScene,
  createStackingPlateNonFoodScene,
  createTileInstance,
  maxBuildingLevels,
  stackingContractFixtureIds,
} from '../domain/scene';
import { unsafeScriptText } from '../test/fixtures/unsafe-text';
import { parseSceneDocument, validateSceneDocument, type SceneDocumentV1 } from './scene-schema';
import { serializeSceneDocument } from './scene-serializer';

describe('SceneDocument v1 schema', () => {
  it('accepts a complete serialized scene document', () => {
    const payload = createValidPayload();
    const result = parseSceneDocument(payload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.schemaVersion).toBe(1);
      expect(result.scene.workspaceState.currentBuildingLevelId).toBe('level-0');
    }
  });

  it('rejects missing required fields instead of silently defaulting', () => {
    const payload = createValidPayload();
    const input = removeField(payload, 'sceneName');

    const errors = validateSceneDocument(input);

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'sceneName',
          expected: 'string',
          actual: 'undefined',
        }),
      ]),
    );
  });

  it('rejects non-camelCase top-level extras', () => {
    const input = {
      ...createValidPayload(),
      scene_name: 'snake case should not be accepted',
    };

    const errors = validateSceneDocument(input);

    expect(errors.some((error) => error.fieldPath === '$')).toBe(true);
  });

  it('strips legacy MVP fields from nested payload objects', () => {
    const payload = createValidPayload();
    const result = parseSceneDocument({
      ...payload,
      buildingLevels: payload.buildingLevels.map((level) => ({
        ...level,
        visible: false,
        locked: true,
      })),
      tileInstances: payload.tileInstances.map((instance) => ({
        ...instance,
        note: 'legacy note',
      })),
      workspaceState: {
        ...payload.workspaceState,
        saveStatus: 'saveError',
        saveError: 'legacy UI failure text',
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(JSON.stringify(result.scene)).not.toContain('legacy');
      expect(result.scene.workspaceState).not.toHaveProperty('saveStatus');
      expect(result.scene.buildingLevels[0]).not.toHaveProperty('visible');
      expect(result.scene.tileInstances[0]).not.toHaveProperty('note');
    }
  });

  it('defaults missing standalone skill markers for older v1 payloads', () => {
    const payload = createValidPayload();
    const result = parseSceneDocument(removeField(payload, 'skillMarkers'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.skillMarkers).toEqual([]);
    }
  });

  it('defaults missing author and ref for older v1 payloads', () => {
    const payload = createValidPayload();
    const legacyPayload = removeField(removeField(payload, 'sceneAuthor'), 'sceneRef');
    const result = parseSceneDocument(legacyPayload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.sceneAuthor).toBe('');
      expect(result.scene.sceneRef).toBe('');
    }
  });

  it('defaults missing building level notes for older v1 payloads', () => {
    const payload = createValidPayload();
    const result = parseSceneDocument({
      ...payload,
      buildingLevels: payload.buildingLevels.map((level) => removeField(level, 'notes')),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.buildingLevels).toEqual([
        expect.objectContaining({
          id: 'level-0',
          notes: [],
        }),
      ]);
    }
  });

  it('keeps building level notes as plain text scene data', () => {
    const payload = createValidPayload();
    const result = parseSceneDocument({
      ...payload,
      buildingLevels: [
        {
          ...payload.buildingLevels[0],
          notes: [{ id: 'note-unsafe', text: unsafeScriptText }],
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.buildingLevels[0].notes).toEqual([{ id: 'note-unsafe', text: unsafeScriptText }]);
      expect(JSON.stringify(result.scene)).toContain(unsafeScriptText);
      expect(result.scene.tileInstances[0]).not.toHaveProperty('note');
    }
  });

  it('rejects duplicate and blank building level notes', () => {
    const payload = createValidPayload();
    const duplicateNotes = {
      ...payload,
      buildingLevels: [
        {
          ...payload.buildingLevels[0],
          notes: [
            { id: 'note-duplicate', text: 'first' },
            { id: 'note-duplicate', text: 'second' },
          ],
        },
      ],
    };
    const blankNotes = {
      ...payload,
      buildingLevels: [
        {
          ...payload.buildingLevels[0],
          notes: [{ id: 'note-blank', text: '   ' }],
        },
      ],
    };

    expect(validateSceneDocument(duplicateNotes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'buildingLevels[0].notes[1].id',
          reason: 'Duplicate building level note id: note-duplicate',
        }),
      ]),
    );
    expect(validateSceneDocument(blankNotes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'buildingLevels[0].notes[0].text',
          expected: 'Expected non-empty note text',
        }),
      ]),
    );
  });

  it('rejects scenes with more than 30 building levels', () => {
    const payload = createValidPayload();
    const input = {
      ...payload,
      buildingLevels: Array.from({ length: maxBuildingLevels + 1 }, (_, levelNumber) => ({
        id: `level-${levelNumber}`,
        levelNumber,
        name: `${levelNumber + 1}层`,
        notes: [],
      })),
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'buildingLevels',
        }),
      ]),
    );
  });

  it('rejects unknown Pokemon and asset ids', () => {
    const unknownPokemon = {
      ...createValidPayload(),
      selectedPokemonKey: 'missingno',
    };
    const unknownAsset = {
      ...createValidPayload(),
      tileInstances: [
        {
          ...createValidPayload().tileInstances[0],
          assetId: 'missing-asset',
        },
      ],
    };

    expect(validateSceneDocument(unknownPokemon)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'selectedPokemonKey',
          recoveryAction: 'Use an existing Decor Dex Pokemon key.',
        }),
      ]),
    );
    expect(validateSceneDocument(unknownAsset)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].assetId',
          recoveryAction: 'Use an existing asset id or null for an empty selection.',
        }),
      ]),
    );
  });

  it('allows coordinates inside the current 17x17 v1 canvas bounds', () => {
    const payload = createValidPayload();
    const input = {
      ...payload,
      tileInstances: [
        {
          ...payload.tileInstances[0],
          coordinate: { x: 16, y: 16 },
          areaType: 'outer',
        },
      ],
    };

    expect(validateSceneDocument(input)).toEqual([]);
  });

  it('rejects coordinates outside the current v1 canvas bounds', () => {
    const input = {
      ...createValidPayload(),
      tileInstances: [
        {
          ...createValidPayload().tileInstances[0],
          coordinate: { x: 17, y: 0 },
        },
      ],
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].coordinate.x',
          recoveryAction: 'Keep coordinates inside the SceneDocument v1 canvas bounds.',
        }),
      ]),
    );
  });

  it('recovers legacy 7x7 SceneDocument v1 dimensions without rewriting them', () => {
    const payload = createLegacy7x7Payload();

    const result = parseSceneDocument(payload);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected legacy 7x7 payload to parse.');
    }
    expect(result.scene.sceneSize).toEqual({ width: 5, height: 5 });
    expect(result.scene.canvasSize).toEqual({ width: 7, height: 7 });
    expect(result.scene.outerPadding).toBe(1);
    expect(result.scene.tileInstances[0]).toMatchObject({
      coordinate: { x: 6, y: 6 },
      areaType: 'outer',
    });
  });

  it('rejects inconsistent scene and canvas dimensions', () => {
    const payload = createValidPayload();

    expect(validateSceneDocument({
      ...payload,
      canvasSize: { width: 16, height: 17 },
    })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: '$',
          reason: 'Canvas size must equal scene size plus outer padding on each side.',
        }),
      ]),
    );
  });

  it('accepts internally consistent custom scene dimensions inside the selectable canvas range', () => {
    const payload = createValidPayload();

    expect(validateSceneDocument({
      ...payload,
      sceneSize: { width: 14, height: 14 },
      canvasSize: { width: 16, height: 16 },
    })).toEqual([]);
  });

  it('rejects internally consistent but unsupported scene dimensions', () => {
    const payload = createValidPayload();

    expect(validateSceneDocument({
      ...payload,
      sceneSize: { width: 19, height: 19 },
      canvasSize: { width: 21, height: 21 },
    })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: '$',
          reason: 'Scene dimensions must use outerPadding 1 and canvas width/height between 6 and 20.',
        }),
      ]),
    );
  });

  it('reports dimension-derived coordinate errors when base payload fields are also invalid', () => {
    const payload = createValidPayload();
    const errors = validateSceneDocument({
      ...payload,
      selectedPokemonKey: 'missingno',
      tileInstances: [
        {
          ...payload.tileInstances[0],
          coordinate: { x: 17, y: 0 },
        },
      ],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'selectedPokemonKey',
        }),
        expect.objectContaining({
          fieldPath: 'tileInstances[0].coordinate.x',
          recoveryAction: 'Keep coordinates inside the SceneDocument v1 canvas bounds.',
        }),
      ]),
    );
  });

  it('rejects areaType that does not match coordinate plus scene dimensions', () => {
    const input = {
      ...createValidPayload(),
      tileInstances: [
        {
          ...createValidPayload().tileInstances[0],
          coordinate: { x: 0, y: 2 },
          areaType: 'main',
        },
      ],
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].areaType',
          reason: 'Expected areaType outer for coordinate 0,2',
          recoveryAction: 'Recompute areaType from coordinate, sceneSize, and outerPadding before saving.',
        }),
      ]),
    );
  });

  it('rejects duplicate tile instance ids to keep restore identity unambiguous', () => {
    const payload = createValidPayload();
    const input = {
      ...payload,
      tileInstances: [
        payload.tileInstances[0],
        {
          ...payload.tileInstances[0],
          coordinate: { x: 3, y: 3 },
        },
      ],
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[1].instanceId',
          reason: 'Duplicate tile instance id: tile-1',
        }),
      ]),
    );
  });

  it('rejects duplicate tile instances on the same building layer coordinate', () => {
    const payload = createValidPayload();
    const input = {
      ...payload,
      tileInstances: [
        payload.tileInstances[0],
        {
          ...payload.tileInstances[0],
          instanceId: 'tile-duplicate-cell',
          assetId: 'brick-roof-decoration',
        },
      ],
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[1].coordinate',
          conflictType: 'same-level-footprint-overlap',
          reason: expect.stringContaining('same-level-footprint-overlap'),
        }),
      ]),
    );
  });

  it('rejects footprint bounds, same-layer overlap and height blocking conflicts with structured details', () => {
    const payload = createValidPayload();
    const levels = [createBuildingLevel(0), createBuildingLevel(1)];
    const outOfBounds = {
      ...payload,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-wide',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 16 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const overlap = {
      ...payload,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-wide',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
          rotationDegrees: 90,
        }),
        createTileInstance({
          instanceId: 'tile-overlap',
          assetId: 'leafy-plant',
          coordinate: { x: 3, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const heightBlocked = {
      ...payload,
      buildingLevels: levels,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-boulder',
          assetId: 'strength-rock',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-upper',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
    };

    expect(validateSceneDocument(outOfBounds)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].coordinate',
          conflictType: 'footprint-out-of-bounds',
          instanceId: 'tile-wide',
          assetId: 'wooden-bench',
          buildingLevelId: 'level-0',
          coordinates: [{ x: 2, y: 17 }],
        }),
      ]),
    );
    expect(validateSceneDocument(overlap)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[1].coordinate',
          conflictType: 'same-level-footprint-overlap',
          instanceId: 'tile-overlap',
          blockingInstanceId: 'tile-wide',
          coordinates: [{ x: 3, y: 2 }],
        }),
      ]),
    );
    expect(validateSceneDocument(heightBlocked)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[1].coordinate',
          conflictType: 'height-blocked-by-lower-footprint',
          instanceId: 'tile-upper',
          blockingInstanceId: 'tile-boulder',
          blockingAssetId: 'strength-rock',
          blockingBuildingLevelId: 'level-0',
          coordinates: [{ x: 2, y: 2 }],
        }),
      ]),
    );
  });

  it('validates compatible stacking scenes and reports unsupported stack surfaces', () => {
    expect(validateSceneDocument(createStackingPlateFoodScene())).toEqual([]);
    expect(validateSceneDocument(createStackingPlateNonFoodScene())).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[1].coordinate',
          conflictType: 'unsupported-stack-surface',
          instanceId: stackingContractFixtureIds.nonFood,
          assetId: 'leafy-plant',
          blockingInstanceId: stackingContractFixtureIds.plate,
          blockingAssetId: 'plate',
          blockingBuildingLevelId: stackingContractFixtureIds.level0,
          surfaceKind: 'food-surface',
          coordinates: [{ x: 2, y: 2 }],
        }),
      ]),
    );
  });

  it('rejects duplicate standalone skill markers on the same building layer coordinate', () => {
    const payload = createValidPayload();
    const marker = {
      coordinate: { x: 3, y: 3 },
      areaType: 'main',
      buildingLevelId: 'level-0',
      skillType: '耕地',
      skillNote: '',
    };
    const input = {
      ...payload,
      skillMarkers: [marker, marker],
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'skillMarkers[1].coordinate',
          reason: 'Expected one skill marker per building level coordinate; duplicate with skillMarkers[0]',
        }),
      ]),
    );
  });

  it('rejects standalone skill markers with stale area or missing building levels', () => {
    const payload = createValidPayload();
    const invalidArea = {
      ...payload,
      skillMarkers: [
        {
          coordinate: { x: 0, y: 2 },
          areaType: 'main',
          buildingLevelId: 'level-0',
          skillType: '耕地',
          skillNote: '',
        },
      ],
    };
    const missingLayer = {
      ...payload,
      skillMarkers: [
        {
          coordinate: { x: 3, y: 3 },
          areaType: 'main',
          buildingLevelId: 'missing-level',
          skillType: '耕地',
          skillNote: '',
        },
      ],
    };

    expect(validateSceneDocument(invalidArea)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'skillMarkers[0].areaType',
          reason: 'Expected areaType outer for coordinate 0,2',
        }),
      ]),
    );
    expect(validateSceneDocument(missingLayer)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'skillMarkers[0].buildingLevelId',
          reason: 'Expected buildingLevelId to reference an existing building level',
        }),
      ]),
    );
  });

  it('allows the same coordinate to be occupied on different building layers', () => {
    const payload = createValidPayload();
    const input = {
      ...payload,
      buildingLevels: [
        ...payload.buildingLevels,
        { id: 'level-1', levelNumber: 1, name: '2层', notes: [] },
      ],
      tileInstances: [
        payload.tileInstances[0],
        {
          ...payload.tileInstances[0],
          instanceId: 'tile-cross-layer',
          buildingLevelId: 'level-1',
        },
      ],
    };

    expect(validateSceneDocument(input)).toEqual([]);
  });

  it('rejects tile instances that reference a missing building level', () => {
    const payload = createValidPayload();
    const input = {
      ...payload,
      tileInstances: [
        {
          ...payload.tileInstances[0],
          buildingLevelId: 'missing-level',
        },
      ],
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].buildingLevelId',
          reason: 'Expected buildingLevelId to reference an existing building level',
        }),
      ]),
    );
  });

  it('requires nullable and empty-string recovery fields to be present', () => {
    const payload = createValidPayload();
    const tileWithoutSkillNote = removeField(payload.tileInstances[0], 'skillNote');
    const tileWithoutDyeColor = removeField(payload.tileInstances[0], 'dyeColor');

    expect(validateSceneDocument({ ...payload, tileInstances: [tileWithoutSkillNote] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].skillNote',
          expected: 'string',
        }),
      ]),
    );
    expect(validateSceneDocument({ ...payload, tileInstances: [tileWithoutDyeColor] })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].dyeColor',
        }),
      ]),
    );
  });

  it('rejects invalid ISO datetimes instead of accepting date-shaped strings', () => {
    const input = {
      ...createValidPayload(),
      metadata: {
        ...createValidPayload().metadata,
        updatedAt: '2026-99-99T99:99:99.000Z',
      },
    };

    expect(validateSceneDocument(input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'metadata.updatedAt',
        }),
      ]),
    );
  });

  it('rejects invalid dye colors and colors on non-dyeable assets', () => {
    const payload = createValidPayload();
    const invalidColor = {
      ...payload,
      tileInstances: [
        {
          ...payload.tileInstances[0],
          dyeColor: 'not-a-color',
        },
      ],
    };
    const nonDyeableColor = {
      ...payload,
      tileInstances: [
        {
          ...payload.tileInstances[0],
          assetId: 'leafy-plant',
          dyeColor: '#56ccf2',
        },
      ],
    };

    expect(validateSceneDocument(invalidColor)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].dyeColor',
          expected: 'Expected 6-digit hex color',
        }),
      ]),
    );
    expect(validateSceneDocument(nonDyeableColor)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].dyeColor',
          reason: 'Expected dyeColor null for non-dyeable asset',
        }),
      ]),
    );
  });
});

function createValidPayload(): SceneDocumentV1 {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-v1',
    sceneName: 'Ditto 15x15 contract',
    now: '2026-05-16T06:20:00.000Z',
  });

  return serializeSceneDocument({
    ...scene,
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-1',
        assetId: 'leafy-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: '',
      }),
    ],
    workspaceState: {
      ...scene.workspaceState,
      selectedAssetId: 'leafy-plant',
      selectedCoordinate: { x: 2, y: 2 },
    },
  });
}

function createLegacy7x7Payload(): SceneDocumentV1 {
  return {
    ...createValidPayload(),
    sceneId: 'scene-legacy-7x7',
    sceneName: 'Legacy 5x5 contract',
    sceneSize: { width: 5, height: 5 },
    canvasSize: { width: 7, height: 7 },
    outerPadding: 1,
    tileInstances: [
      {
        ...createValidPayload().tileInstances[0],
        coordinate: { x: 6, y: 6 },
        areaType: 'outer',
      },
    ],
    workspaceState: {
      ...createValidPayload().workspaceState,
      selectedCoordinate: { x: 6, y: 6 },
    },
  };
}

function removeField<T extends Record<string, unknown>, K extends keyof T>(
  input: T,
  field: K,
): Omit<T, K> {
  const copy = { ...input };
  delete copy[field];
  return copy;
}
