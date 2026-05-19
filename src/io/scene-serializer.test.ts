import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance, type SceneDocument } from '../domain/scene';
import { parseSceneDocument } from './scene-schema';
import { serializeSceneDocument, stringifySceneDocument } from './scene-serializer';

describe('SceneDocument v1 serializer', () => {
  it('serializes complete scene fields while excluding UI-only save status', () => {
    const scene = createSceneWithInstances({
      workspaceState: {
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'garden-plant',
        selectedCoordinate: { x: 2, y: 3 },
      },
    });

    const payload = serializeSceneDocument(scene);

    expect(payload).toMatchObject({
      schemaVersion: 1,
      sceneId: 'scene-serialize',
      sceneName: 'Ditto 5x5 serialization',
      selectedPokemonKey: 'ditto',
      sceneSize: { width: 5, height: 5 },
      canvasSize: { width: 7, height: 7 },
      outerPadding: 1,
      workspaceState: {
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'garden-plant',
        selectedCoordinate: { x: 2, y: 3 },
      },
      metadata: {
        createdAt: '2026-05-16T06:20:00.000Z',
        updatedAt: '2026-05-16T06:30:00.000Z',
        lastSavedAt: '2026-05-16T06:20:00.000Z',
        lastAutosavedAt: null,
      },
    });
    expect(payload.workspaceState).not.toHaveProperty('saveStatus');
    expect(JSON.stringify(payload)).not.toContain('saveError');
    expect(parseSceneDocument(payload).ok).toBe(true);
  });

  it('recomputes authoritative areaType from the scene dimensions', () => {
    const scene = createSceneWithInstances();
    const staleAreaInstance = {
      ...scene.tileInstances[0],
      coordinate: { x: 0, y: 2 },
      areaType: 'main' as const,
    };

    const payload = serializeSceneDocument({
      ...scene,
      tileInstances: [staleAreaInstance],
    });

    expect(payload.tileInstances[0]).toMatchObject({
      coordinate: { x: 0, y: 2 },
      areaType: 'outer',
    });
  });

  it('keeps skill and dye fields explicit for recovery', () => {
    const payload = serializeSceneDocument(createSceneWithInstances());

    expect(payload.tileInstances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: 'garden-plant',
          dyeColor: null,
          requiresSkill: true,
          skillType: '树叶',
          skillNote: '',
        }),
        expect.objectContaining({
          assetId: 'wooden-floor',
          dyeColor: '#bb6bd9',
          requiresSkill: false,
          skillType: null,
          skillNote: '',
        }),
      ]),
    );
    expect(JSON.stringify(payload)).not.toContain('"note"');
  });

  it('normalizes unset, invalid, and unsupported dye colors to null', () => {
    const scene = createSceneWithInstances();

    const payload = serializeSceneDocument({
      ...scene,
      tileInstances: [
        {
          ...scene.tileInstances[0],
          assetId: 'garden-plant',
          dyeColor: '#56ccf2',
        },
        {
          ...scene.tileInstances[1],
          dyeColor: '',
        },
      ],
    });

    expect(payload.tileInstances.map((instance) => instance.dyeColor)).toEqual([null, null]);
  });

  it('serializes without mutating source scene geometry', () => {
    const scene = createSceneWithInstances();
    serializeSceneDocument(scene);

    expect(scene.tileInstances[0].areaType).toBe('main');
  });

  it('stringifies the validated payload for storage boundaries', () => {
    const json = stringifySceneDocument(createSceneWithInstances(), 2);
    const parsed = JSON.parse(json) as unknown;

    expect(parseSceneDocument(parsed).ok).toBe(true);
    expect(json).toContain('"schemaVersion": 1');
  });
});

function createSceneWithInstances(overrides: Partial<SceneDocument> = {}): SceneDocument {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-serialize',
    sceneName: 'Ditto 5x5 serialization',
    now: '2026-05-16T06:20:00.000Z',
  });

  return {
    ...scene,
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-skill',
        assetId: 'garden-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-1',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: '',
      }),
      createTileInstance({
        instanceId: 'tile-dye',
        assetId: 'wooden-floor',
        coordinate: { x: 3, y: 3 },
        buildingLevelId: 'level-0',
        dyeColor: '#bb6bd9',
        skillNote: '',
      }),
    ],
    workspaceState: {
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: null,
    },
    metadata: {
      ...scene.metadata,
      updatedAt: '2026-05-16T06:30:00.000Z',
    },
    ...overrides,
  };
}
