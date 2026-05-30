import { describe, expect, it } from 'vitest';
import { getAssetById } from '../domain/assets';
import {
  buildSceneOccupancy,
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractScene,
  createStackingPlateFoodScene,
  createTileInstance,
  footprintContractExpected,
  footprintContractFixtureIds,
} from '../domain/scene';
import {
  decodeSceneDocumentString,
  decodeSceneDocumentStringWithLossyRecovery,
  encodeSceneDocumentString,
  summarizeSceneDocumentStringDimensions,
} from './scene-string-codec';
import { stringifySceneDocument } from './scene-serializer';

describe('SceneDocument short string codec', () => {
  const unsafeScriptText = '<script>alert(1)</script>';
  const unsafeImageText = '<img src=x onerror=alert(1)>';

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

    expect(encoded).toMatch(/^PSE2~/);
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
        { id: 'level-0', levelNumber: 0, name: '1层' },
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
    expect(decoded.scene.sceneSize).toEqual({ width: 15, height: 15 });
    expect(decoded.scene.canvasSize).toEqual({ width: 17, height: 17 });
  });

  it('continues to decode legacy PSE1 strings as 5x5 scenes on a 7x7 canvas', () => {
    const decoded = decodeSceneDocumentString('PSE1~Legacy.0.0._._~0.1%E5%B1%82~0.m.Gy.0._._._~_', '2026-05-29T00:00:00.000Z');

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected legacy PSE1 scene string decode to pass.');
    }
    expect(decoded.scene.sceneSize).toEqual({ width: 5, height: 5 });
    expect(decoded.scene.canvasSize).toEqual({ width: 7, height: 7 });
    expect(decoded.scene.outerPadding).toBe(1);
    expect(decoded.scene.tileInstances[0]).toMatchObject({
      assetId: 'leafy-plant',
      coordinate: { x: 6, y: 6 },
      areaType: 'outer',
    });
  });

  it('keeps legacy asset codec ids stable after Xzonn display renumbering', () => {
    expect(getAssetById('leafy-plant')).toMatchObject({
      officialId: '336',
      sceneCodecOfficialId: '1052',
    });

    const legacyDecoded = decodeSceneDocumentString(
      'PSE1~Legacy.0.0._._~0.1%E5%B1%82~0.m.Gy.0._._._~_',
      '2026-05-29T00:00:00.000Z',
    );
    expect(legacyDecoded.ok).toBe(true);
    if (!legacyDecoded.ok) {
      throw new Error('Expected legacy scene string decode to pass.');
    }
    expect(legacyDecoded.scene.tileInstances[0]?.assetId).toBe('leafy-plant');

    const scene = {
      ...createDefaultSceneDocument({
        sceneId: 'scene-stable-codec-id',
        sceneName: '稳定编号',
        now: '2026-05-29T00:00:00.000Z',
      }),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-leafy-plant',
          assetId: 'leafy-plant',
          coordinate: { x: 1, y: 1 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const encoded = encodeSceneDocumentString(scene);
    const encodedAssetId = encoded.split('~')[4]?.split('.')[2];

    expect(encodedAssetId).toBe('Gy');
  });

  it('continues to decode legacy PSE2 strings that use pre-Xzonn asset numbers', () => {
    const legacyPse2 = 'PSE2~F.F.1~Legacy%20PSE2.3Q.1._.1A~0.1%E5%B1%82;1.%E4%B8%8A%E5%B1%82~0.I.Gy.0._.0._;1.1A.Fn.1._._._~_';
    const decoded = decodeSceneDocumentString(legacyPse2, '2026-05-29T00:00:00.000Z');

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected legacy PSE2 scene string decode to pass.');
    }
    expect(decoded.scene.selectedPokemonKey).toBe('pikachu');
    expect(decoded.scene.sceneSize).toEqual({ width: 15, height: 15 });
    expect(decoded.scene.canvasSize).toEqual({ width: 17, height: 17 });
    expect(decoded.scene.workspaceState).toMatchObject({
      currentBuildingLevelId: 'level-1',
      selectedAssetId: null,
      selectedCoordinate: { x: 4, y: 4 },
    });
    expect(decoded.scene.buildingLevels).toEqual([
      expect.objectContaining({ id: 'level-0', levelNumber: 0, name: '1层' }),
      expect.objectContaining({ id: 'level-1', levelNumber: 1, name: '上层' }),
    ]);
    expect(decoded.scene.tileInstances).toEqual([
      expect.objectContaining({
        assetId: 'leafy-plant',
        coordinate: { x: 1, y: 1 },
        buildingLevelId: 'level-0',
        requiresSkill: true,
        skillType: '树叶',
      }),
      expect.objectContaining({
        assetId: 'ditto-doll',
        coordinate: { x: 4, y: 4 },
        buildingLevelId: 'level-1',
        rotationDegrees: 90,
        dyeColor: null,
      }),
    ]);
  });

  it('decodes PSE2 strings that declare custom selectable dimensions', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-custom-dimensions',
      sceneName: 'Custom dimensions',
      now: '2026-05-23T09:00:00.000Z',
    });
    const encodedParts = encodeSceneDocumentString(scene).split('~');
    encodedParts[1] = 'E.C.1';

    const decoded = decodeSceneDocumentString(encodedParts.join('~'), '2026-05-23T09:30:00.000Z');

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected custom PSE2 dimensions to decode.');
    }
    expect(decoded.scene.sceneSize).toEqual({ width: 14, height: 12 });
    expect(decoded.scene.canvasSize).toEqual({ width: 16, height: 14 });
  });

  it('rejects PSE2 strings that declare unsupported dimensions', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-unsupported-dimensions',
      sceneName: 'Unsupported dimensions',
      now: '2026-05-23T09:00:00.000Z',
    });
    const encodedParts = encodeSceneDocumentString(scene).split('~');
    encodedParts[1] = 'G.G.1';

    const decoded = decodeSceneDocumentString(encodedParts.join('~'), '2026-05-23T09:30:00.000Z');

    expect(decoded.ok).toBe(false);
    if (decoded.ok) {
      throw new Error('Expected unsupported PSE2 dimensions to fail.');
    }
    expect(decoded.errors[0]).toMatchObject({
      fieldPath: '$',
      actual: expect.stringContaining('Scene dimensions must use outerPadding 1 and canvas width/height between 6 and 17.'),
    });
  });

  it('summarizes dimensions from PSE1, PSE2, and unsupported dimensioned strings', () => {
    const defaultString = encodeSceneDocumentString(createDefaultSceneDocument({
      sceneId: 'scene-default-dimensions-summary',
      now: '2026-05-23T09:00:00.000Z',
    }));
    const legacyString = encodeSceneDocumentString(createFootprintContractScene());
    const unsupportedParts = defaultString.split('~');
    unsupportedParts[1] = 'G.G.1';

    expect(summarizeSceneDocumentStringDimensions(defaultString)).toEqual({
      sceneSize: { width: 15, height: 15 },
      canvasSize: { width: 17, height: 17 },
      outerPadding: 1,
      classification: 'default-17x17',
    });
    expect(summarizeSceneDocumentStringDimensions(legacyString)).toEqual({
      sceneSize: { width: 5, height: 5 },
      canvasSize: { width: 7, height: 7 },
      outerPadding: 1,
      classification: 'legacy-7x7',
    });
    expect(summarizeSceneDocumentStringDimensions(unsupportedParts.join('~'))).toEqual({
      sceneSize: { width: 16, height: 16 },
      canvasSize: { width: 18, height: 18 },
      outerPadding: 1,
      classification: 'unsupported',
    });
  });

  it('roundtrips multi-layer building level notes without executing or dropping text', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-short-code-notes',
      sceneName: '备注场景',
      selectedPokemonKey: 'ditto',
      now: '2026-05-23T09:00:00.000Z',
    });
    const sourceScene = {
      ...scene,
      buildingLevels: [
        {
          ...createBuildingLevel(0),
          notes: [
            { id: 'note-a', text: unsafeScriptText },
            { id: 'note-b', text: '保留, 逗号: 冒号; 分号. 点' },
          ],
        },
        {
          ...createBuildingLevel(1),
          name: '说明层',
          notes: [{ id: 'note-c', text: unsafeImageText }],
        },
      ],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-note-pse1',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
      skillMarkers: [
        {
          coordinate: { x: 4, y: 4 },
          areaType: 'main' as const,
          buildingLevelId: 'level-0',
          skillType: '储水' as const,
          skillNote: '技能说明',
        },
      ],
      workspaceState: {
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'leafy-plant',
        selectedCoordinate: { x: 2, y: 2 },
      },
    };

    const encoded = encodeSceneDocumentString(sourceScene);
    const decoded = decodeSceneDocumentString(encoded, '2026-05-23T09:30:00.000Z');

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected scene string decode to pass.');
    }
    expect(encoded).not.toContain(unsafeScriptText);
    expect(encoded).not.toContain(unsafeImageText);
    expect(decoded.scene.buildingLevels.map((level) => level.notes)).toEqual([
      [
        { id: 'note-a', text: unsafeScriptText },
        { id: 'note-b', text: '保留, 逗号: 冒号; 分号. 点' },
      ],
      [{ id: 'note-c', text: unsafeImageText }],
    ]);
    expect(decoded.scene.workspaceState).toMatchObject({
      currentBuildingLevelId: 'level-1',
      selectedAssetId: null,
      selectedCoordinate: { x: 2, y: 2 },
    });
    expect(decoded.scene.tileInstances[0]).toMatchObject({
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-1',
    });
    expect(decoded.scene.skillMarkers[0]).toMatchObject({
      coordinate: { x: 4, y: 4 },
      buildingLevelId: 'level-0',
      skillType: '储水',
      skillNote: '技能说明',
    });
  });

  it('decodes legacy PSE1 level records without notes as empty notes while preserving selection and footprint semantics', () => {
    const sourceScene = {
      ...createFootprintContractScene(),
      workspaceState: {
        currentBuildingLevelId: footprintContractFixtureIds.level1,
        selectedAssetId: 'leafy-plant',
        selectedCoordinate: { x: 1, y: 4 },
      },
    };
    const encodedParts = encodeSceneDocumentString(sourceScene).split('~');
    encodedParts[2] = (encodedParts[2] ?? '')
      .split(';')
      .map((record) => record.split('.').slice(0, 2).join('.'))
      .join(';');
    const legacyEncoded = encodedParts.join('~');
    const levelRecords = encodedParts[2]?.split(';') ?? [];
    const decoded = decodeSceneDocumentString(legacyEncoded, '2026-05-27T00:20:00.000Z');

    expect(levelRecords.length).toBeGreaterThan(1);
    expect(levelRecords.every((record) => record.split('.').length === 2)).toBe(true);
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected legacy scene string decode to pass.');
    }
    expect(decoded.scene.buildingLevels.map((level) => level.notes)).toEqual([[], [], []]);
    expect(decoded.scene.workspaceState).toMatchObject({
      currentBuildingLevelId: 'level-1',
      selectedAssetId: null,
      selectedCoordinate: { x: 1, y: 4 },
    });

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

  it('ignores selected assets from scene strings during import', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-legacy-selected-asset',
      sceneName: '旧字符串',
      selectedPokemonKey: 'eevee',
      selectedCoordinate: { x: 2, y: 2 },
      now: '2026-05-23T09:00:00.000Z',
    });
    const encoded = encodeSceneDocumentString(scene);
    const parts = encoded.split('~');
    const headerIndex = encoded.startsWith('PSE2~') ? 2 : 1;
    const headerParts = parts[headerIndex].split('.');
    headerParts[3] = 'Gy';
    parts[headerIndex] = headerParts.join('.');

    const decoded = decodeSceneDocumentString(parts.join('~'), '2026-05-23T09:30:00.000Z');

    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected scene string decode to pass.');
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

  it('keeps footprint data out of PSE2 strings and validates decoded default scenes with current occupancy rules', () => {
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
    const tileFields = parts[4].split('.');
    tileFields[1] = 'o';
    parts[4] = tileFields.join('.');
    const encoded = parts.join('~');
    const decoded = decodeSceneDocumentString(encoded, '2026-05-23T09:30:00.000Z');

    expect(encoded).toMatch(/^PSE2~/);
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

  it('lossily imports compatible PSE2 content while reporting dropped footprint conflicts', () => {
    const encoded = [
      'PSE2',
      'F.F.1',
      'Lossy.0.0._._',
      '0.Source;1.Base',
      '0.f.C0.0._._._;1.f.6L.0._._._',
      '_',
    ].join('~');

    const strictDecoded = decodeSceneDocumentString(encoded, '2026-05-29T00:10:00.000Z');
    const lossyDecoded = decodeSceneDocumentStringWithLossyRecovery(encoded, '2026-05-29T00:10:00.000Z');

    expect(strictDecoded.ok).toBe(false);
    if (strictDecoded.ok) {
      throw new Error('Expected strict scene string decode to fail.');
    }
    expect(strictDecoded.errors[0]).toMatchObject({
      conflictType: 'height-blocked-by-lower-footprint',
      instanceId: 'imported-tile-1',
      assetId: 'wooden-flooring',
      blockingAssetId: 'bread-oven',
    });

    expect(lossyDecoded.ok).toBe(true);
    if (!lossyDecoded.ok) {
      throw new Error('Expected lossy scene string decode to import remaining content.');
    }
    expect(lossyDecoded.scene.tileInstances).toEqual([
      expect.objectContaining({
        instanceId: 'imported-tile-0',
        assetId: 'bread-oven',
        coordinate: { x: 7, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ]);
    expect(lossyDecoded.droppedTileInstances).toEqual([
      expect.objectContaining({
        instanceId: 'imported-tile-1',
        assetId: 'wooden-flooring',
        assetName: '木地板',
        buildingLevelId: 'level-1',
        buildingLevelName: 'Base',
        coordinate: { x: 7, y: 2 },
        conflictType: 'height-blocked-by-lower-footprint',
        blockingInstanceId: 'imported-tile-0',
        blockingAssetId: 'bread-oven',
        blockingAssetName: '面包窑',
        blockingBuildingLevelId: 'level-0',
        coordinates: [{ x: 7, y: 2 }],
      }),
    ]);
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

  it('roundtrips legal stacking scenes through PSE1 without encoded stacking fields', () => {
    const encoded = encodeSceneDocumentString(createStackingPlateFoodScene());
    const decoded = decodeSceneDocumentString(encoded, '2026-05-28T00:10:00.000Z');

    expect(encoded).toMatch(/^PSE1~/);
    expect(encoded).not.toContain('stacking');
    expect(encoded).not.toContain('stackingRelations');
    expect(encoded).not.toContain('supportedBy');
    expect(decoded.ok).toBe(true);
    if (!decoded.ok) {
      throw new Error('Expected stacking scene decode to pass.');
    }
    expect(buildSceneOccupancy(decoded.scene).stackingRelations).toEqual([
      expect.objectContaining({
        topAssetId: 'leppa-berry',
        baseAssetId: 'plate',
        surfaceKind: 'food-surface',
      }),
    ]);
  });
});
