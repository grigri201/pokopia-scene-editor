import { describe, expect, it } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance } from '../domain/scene';
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

  it('rejects coordinates outside the v1 canvas bounds', () => {
    const input = {
      ...createValidPayload(),
      tileInstances: [
        {
          ...createValidPayload().tileInstances[0],
          coordinate: { x: 7, y: 0 },
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
          coordinate: { x: 2, y: 6 },
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
          coordinates: [{ x: 2, y: 7 }],
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
        { id: 'level-1', levelNumber: 1, name: '2层' },
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
    sceneName: 'Ditto 5x5 contract',
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

function removeField<T extends Record<string, unknown>, K extends keyof T>(
  input: T,
  field: K,
): Omit<T, K> {
  const copy = { ...input };
  delete copy[field];
  return copy;
}
