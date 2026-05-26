import { describe, expect, it } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance } from '../domain/scene';
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
});
