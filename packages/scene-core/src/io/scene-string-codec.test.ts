import { describe, expect, it } from 'vitest';
import {
  buildSceneOccupancy,
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractScene,
  createTileInstance,
  footprintContractExpected,
  footprintContractFixtureIds,
} from '../domain/scene';
import {
  decodeSceneDocumentString,
  encodeSceneDocumentString,
} from './scene-string-codec';
import { stringifySceneDocument } from './scene-serializer';

describe('SceneDocument short string codec', () => {
  it('roundtrips scene settings with a shorter domain codec than JSON', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-short-code',
      sceneName: '庭院 A',
      selectedPokemonKey: 'pikachu',
      now: '2026-05-23T09:00:00.000Z',
    });
    const sourceScene = {
      ...scene,
      buildingLevels: [
        createBuildingLevel(0),
        { ...createBuildingLevel(1), name: '主体层' },
      ],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-1',
          assetId: 'stone-brick-wall',
          coordinate: { x: 3, y: 2 },
          buildingLevelId: 'level-1',
          rotationDegrees: 90,
          dyeColor: '#d59a61',
          requiresSkill: true,
          skillType: '树叶',
          skillNote: '靠墙',
        }),
        createTileInstance({
          instanceId: 'tile-2',
          assetId: 'leafy-plant',
          coordinate: { x: 0, y: 6 },
          buildingLevelId: 'level-0',
        }),
      ],
      skillMarkers: [
        {
          coordinate: { x: 4, y: 4 },
          areaType: 'main' as const,
          buildingLevelId: 'level-1',
          skillType: '储水' as const,
          skillNote: '',
        },
      ],
      workspaceState: {
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'leafy-plant',
        selectedCoordinate: { x: 3, y: 2 },
      },
    };

    const encoded = encodeSceneDocumentString(sourceScene);
    const encodedWithoutSelectedAsset = encodeSceneDocumentString({
      ...sourceScene,
      workspaceState: {
        ...sourceScene.workspaceState,
        selectedAssetId: null,
      },
    });
    const decoded = decodeSceneDocumentString(encoded, '2026-05-23T09:30:00.000Z');

    expect(encoded).toMatch(/^PSE1~/);
    expect(encoded).not.toContain('{');
    expect(encoded).not.toContain('schemaVersion');
    expect(encoded).toBe(encodedWithoutSelectedAsset);
    expect(encoded.length).toBeLessThan(stringifySceneDocument(sourceScene).length * 0.45);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected scene string decode to pass.');
    }

    expect(decoded.scene).toMatchObject({
      sceneName: '庭院 A',
      selectedPokemonKey: 'pikachu',
      buildingLevels: [
        { id: 'level-0', levelNumber: 0, name: '0层' },
        { id: 'level-1', levelNumber: 1, name: '主体层' },
      ],
      workspaceState: {
        currentBuildingLevelId: 'level-1',
        selectedAssetId: null,
        selectedCoordinate: { x: 3, y: 2 },
      },
    });
    expect(decoded.scene.tileInstances).toEqual([
      expect.objectContaining({
        assetId: 'stone-brick-wall',
        coordinate: { x: 3, y: 2 },
        areaType: 'main',
        buildingLevelId: 'level-1',
        rotationDegrees: 90,
        dyeColor: '#d59a61',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: '靠墙',
      }),
      expect.objectContaining({
        assetId: 'leafy-plant',
        coordinate: { x: 0, y: 6 },
        areaType: 'outer',
        buildingLevelId: 'level-0',
      }),
    ]);
    expect(decoded.scene.skillMarkers).toEqual([
      expect.objectContaining({
        coordinate: { x: 4, y: 4 },
        areaType: 'main',
        buildingLevelId: 'level-1',
        skillType: '储水',
      }),
    ]);
  });

  it('ignores selected assets from legacy scene strings during import', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-legacy-selected-asset',
      sceneName: '旧字符串',
      selectedPokemonKey: 'eevee',
      selectedCoordinate: { x: 2, y: 2 },
      now: '2026-05-23T09:00:00.000Z',
    });
    const encoded = encodeSceneDocumentString(scene);
    const parts = encoded.split('~');
    const headerParts = parts[1].split('.');
    headerParts[3] = 'Gy';
    parts[1] = headerParts.join('.');

    const decoded = decodeSceneDocumentString(parts.join('~'), '2026-05-23T09:30:00.000Z');

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected legacy scene string decode to pass.');
    }
    expect(decoded.scene.workspaceState).toMatchObject({
      selectedAssetId: null,
      selectedCoordinate: { x: 2, y: 2 },
    });
  });

  it('returns recovery-style errors for invalid strings', () => {
    const decoded = decodeSceneDocumentString('not-a-scene');

    expect(decoded.ok).toBe(false);
    if (decoded.ok) {
      throw new Error('Expected invalid scene string decode to fail.');
    }
    expect(decoded.errors[0]).toMatchObject({
      fieldPath: '$',
      expected: 'Pokopia Scene Editor short scene string',
      reason: 'Unable to decode scene string.',
    });
  });

  it('keeps footprint data out of PSE1 strings and validates decoded scenes with current occupancy rules', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-short-code-footprint',
      sceneName: '短字符串大型素材',
      now: '2026-05-23T09:00:00.000Z',
    });
    const sourceScene = {
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-wide',
          assetId: 'deck-chair',
          coordinate: { x: 5, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const validEncoded = encodeSceneDocumentString(sourceScene);
    const parts = validEncoded.split('~');
    const tileFields = parts[3].split('.');
    tileFields[1] = 'K';
    parts[3] = tileFields.join('.');
    const encoded = parts.join('~');
    const decoded = decodeSceneDocumentString(encoded, '2026-05-23T09:30:00.000Z');

    expect(encoded).toMatch(/^PSE1~/);
    expect(encoded).not.toContain('footprint');
    expect(encoded).not.toContain('occupiedCells');
    expect(encoded).not.toContain('blocking');
    expect(decoded.ok).toBe(false);
    if (decoded.ok) {
      throw new Error('Expected decoded scene to fail current footprint validation.');
    }
    expect(decoded.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'footprint-out-of-bounds',
          fieldPath: 'tileInstances[0].coordinate',
        }),
      ]),
    );
  });

  it('roundtrips the shared footprint contract fixture through PSE1 without encoded derived fields', () => {
    const encoded = encodeSceneDocumentString(createFootprintContractScene());
    const decoded = decodeSceneDocumentString(encoded, '2026-05-27T00:10:00.000Z');

    expect(encoded).toMatch(/^PSE1~/);
    expect(encoded).not.toContain('footprint');
    expect(encoded).not.toContain('effectiveFootprint');
    expect(encoded).not.toContain('occupiedCells');
    expect(encoded).not.toContain('blockingCells');
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected footprint fixture decode to pass.');
    }

    const occupancy = buildSceneOccupancy(decoded.scene);
    expect(occupancy.instances.find((instance) =>
      instance.assetId === 'wooden-bench' &&
      instance.instance.rotationDegrees === 90 &&
      instance.instance.coordinate.x === 4 &&
      instance.instance.coordinate.y === 4,
    )).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedBench],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedBench],
    });
    expect(occupancy.instances.find((instance) =>
      instance.assetId === 'deck-chair' &&
      instance.instance.rotationDegrees === 90 &&
      instance.instance.coordinate.x === 6 &&
      instance.instance.coordinate.y === 4,
    )).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedRug],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedRug],
    });
    expect(occupancy.blockingCells).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          buildingLevelId: footprintContractFixtureIds.level1,
          blockedByAssetId: 'strength-rock',
          blockedByBuildingLevelId: footprintContractFixtureIds.level0,
          coordinate: { x: 1, y: 4 },
        }),
      ]),
    );
  });
});
