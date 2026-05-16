import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { parseSceneDocument, validateSceneDocument, type SceneDocumentV1 } from './scene-schema';
import { serializeSceneDocument } from './scene-serializer';

describe('SceneDocument v1 schema', () => {
  it('accepts a complete serialized scene document', () => {
    const payload = createValidPayload();
    const result = parseSceneDocument(payload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.scene.schemaVersion).toBe(1);
      expect(result.scene.workspaceState.saveStatus).toBe('saved');
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

  it('rejects wrong types, enum values, and non-camelCase extras', () => {
    const input = {
      ...createValidPayload(),
      scene_name: 'snake case should not be accepted',
      workspaceState: {
        ...createValidPayload().workspaceState,
        saveStatus: 'saveError',
        saveError: 'UI-only failure text',
      },
    };

    const errors = validateSceneDocument(input);

    expect(errors.some((error) => error.fieldPath === '$')).toBe(true);
    expect(errors.some((error) => error.fieldPath === 'workspaceState')).toBe(true);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'workspaceState.saveStatus',
          expected: 'dirty | saved',
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
          assetId: 'garden-plant',
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
        assetId: 'garden-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: '',
        note: '',
      }),
    ],
    workspaceState: {
      ...scene.workspaceState,
      selectedAssetId: 'garden-plant',
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
