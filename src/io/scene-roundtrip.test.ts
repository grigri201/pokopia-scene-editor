import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance, type SceneDocument } from '../domain/scene';
import { roundtripSceneDocument } from './scene-roundtrip';

describe('SceneDocument v1 roundtrip', () => {
  it('roundtrips an empty scene without relying on UI defaults', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-empty-roundtrip',
      sceneName: 'Empty 5x5 Roundtrip',
      selectedPokemonKey: 'eevee',
      now: '2026-05-16T09:00:00.000Z',
    });

    const roundtrip = expectRoundtrip(scene);

    expect(roundtrip.sourcePayload).toEqual(roundtrip.roundtrippedPayload);
    expect(roundtrip.sourcePayload).toMatchObject({
      schemaVersion: 1,
      sceneId: 'scene-empty-roundtrip',
      sceneName: 'Empty 5x5 Roundtrip',
      selectedPokemonKey: 'eevee',
      sceneSize: { width: 5, height: 5 },
      canvasSize: { width: 7, height: 7 },
      outerPadding: 1,
      workspaceState: {
        currentBuildingLevelId: 'level-0',
        selectedAssetId: null,
        selectedCoordinate: null,
        saveStatus: 'saved',
      },
      metadata: {
        createdAt: '2026-05-16T09:00:00.000Z',
        updatedAt: '2026-05-16T09:00:00.000Z',
        lastSavedAt: '2026-05-16T09:00:00.000Z',
        lastAutosavedAt: null,
      },
    });
    expect(roundtrip.sourcePayload.tileInstances).toEqual([]);
  });

  it('roundtrips workspace state and multiple building level states', () => {
    const roundtrip = expectRoundtrip(createRichScene());

    expect(roundtrip.sourcePayload).toEqual(roundtrip.roundtrippedPayload);
    expect(roundtrip.recoveredScene.workspaceState).toEqual({
      currentBuildingLevelId: 'level-2',
      selectedAssetId: 'roof-tile',
      selectedCoordinate: { x: 0, y: 2 },
      saveStatus: 'dirty',
      saveError: null,
    });
    expect(roundtrip.sourcePayload.buildingLevels).toEqual([
      {
        id: 'level-0',
        levelNumber: 0,
        name: 'Ground',
        visible: true,
        locked: false,
      },
      {
        id: 'level-1',
        levelNumber: 1,
        name: 'Canopy',
        visible: false,
        locked: true,
      },
      {
        id: 'level-2',
        levelNumber: 2,
        name: 'Roof',
        visible: true,
        locked: false,
      },
    ]);
  });

  it('roundtrips single-layer multi-instance and multi-layer tile data', () => {
    const roundtrip = expectRoundtrip(createRichScene());

    expect(roundtrip.sourcePayload.tileInstances).toEqual([
      expect.objectContaining({
        instanceId: 'tile-floor',
        assetId: 'wooden-floor',
        coordinate: { x: 2, y: 2 },
        areaType: 'main',
        buildingLevelId: 'level-0',
        rotationDegrees: 0,
        dyeColor: '#bb6bd9',
        requiresSkill: false,
        skillType: null,
        skillNote: '',
        note: 'main floor note',
      }),
      expect.objectContaining({
        instanceId: 'tile-plant',
        assetId: 'garden-plant',
        coordinate: { x: 2, y: 2 },
        areaType: 'main',
        buildingLevelId: 'level-0',
        rotationDegrees: 0,
        dyeColor: null,
        requiresSkill: true,
        skillType: '树叶',
        skillNote: 'leaf marker note',
        note: 'stacked plant note',
      }),
      expect.objectContaining({
        instanceId: 'tile-roof',
        assetId: 'roof-tile',
        coordinate: { x: 0, y: 2 },
        areaType: 'outer',
        buildingLevelId: 'level-2',
        rotationDegrees: 90,
        dyeColor: '#56ccf2',
        requiresSkill: true,
        skillType: '耕地',
        skillNote: 'soil roof note',
        note: 'outer roof note',
      }),
    ]);
    expect(roundtrip.sourcePayload).toEqual(roundtrip.roundtrippedPayload);
  });

  it('returns structured errors for scenes that cannot serialize into v1', () => {
    const invalidScene = {
      ...createRichScene(),
      selectedPokemonKey: 'missingno',
    } as never as SceneDocument;

    const roundtrip = roundtripSceneDocument(invalidScene);

    expect(roundtrip.ok).toBe(false);
    if (roundtrip.ok) {
      throw new Error('Expected invalid scene to fail roundtrip.');
    }
    expect(roundtrip.errors).toEqual([
      expect.objectContaining({
        fieldPath: 'selectedPokemonKey',
        actual: 'missingno',
        reason: 'Expected known Decor Dex Pokemon key',
        recoveryAction: 'Use an existing Decor Dex Pokemon key.',
      }),
    ]);
  });
});

function expectRoundtrip(scene: SceneDocument) {
  const roundtrip = roundtripSceneDocument(scene);

  expect(roundtrip.ok).toBe(true);
  if (!roundtrip.ok) {
    throw new Error(roundtrip.errors.map((error) => error.reason).join('\n'));
  }

  return roundtrip;
}

function createRichScene(): SceneDocument {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-rich-roundtrip',
    sceneName: 'Rich 5x5 Roundtrip',
    selectedPokemonKey: 'pikachu',
    now: '2026-05-16T09:30:00.000Z',
  });

  return {
    ...scene,
    buildingLevels: [
      {
        id: 'level-0',
        levelNumber: 0,
        name: 'Ground',
        visible: true,
        locked: false,
      },
      {
        id: 'level-1',
        levelNumber: 1,
        name: 'Canopy',
        visible: false,
        locked: true,
      },
      {
        id: 'level-2',
        levelNumber: 2,
        name: 'Roof',
        visible: true,
        locked: false,
      },
    ],
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-floor',
        assetId: 'wooden-floor',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        rotationDegrees: 0,
        dyeColor: '#bb6bd9',
        note: 'main floor note',
      }),
      createTileInstance({
        instanceId: 'tile-plant',
        assetId: 'garden-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: 'leaf marker note',
        note: 'stacked plant note',
      }),
      createTileInstance({
        instanceId: 'tile-roof',
        assetId: 'roof-tile',
        coordinate: { x: 0, y: 2 },
        buildingLevelId: 'level-2',
        rotationDegrees: 90,
        dyeColor: '#56ccf2',
        requiresSkill: true,
        skillType: '耕地',
        skillNote: 'soil roof note',
        note: 'outer roof note',
      }),
    ],
    workspaceState: {
      currentBuildingLevelId: 'level-2',
      selectedAssetId: 'roof-tile',
      selectedCoordinate: { x: 0, y: 2 },
      saveStatus: 'dirty',
      saveError: null,
    },
    metadata: {
      ...scene.metadata,
      updatedAt: '2026-05-16T09:45:00.000Z',
      lastAutosavedAt: '2026-05-16T09:44:00.000Z',
    },
  };
}
