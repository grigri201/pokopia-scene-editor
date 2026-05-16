import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { serializeSceneDocument } from './scene-serializer';
import { recoverSceneDocument } from './scene-recovery';

describe('scene recovery', () => {
  it('restores a valid SceneDocument v1 payload into editable domain scene state', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-recover',
      sceneName: 'Recover 5x5 scene',
      selectedPokemonKey: 'eevee',
      selectedCoordinate: { x: 2, y: 3 },
      now: '2026-05-16T08:00:00.000Z',
    });
    const payload = serializeSceneDocument({
      ...scene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-recover',
          assetId: 'roof-tile',
          coordinate: { x: 0, y: 2 },
          buildingLevelId: 'level-1',
          rotationDegrees: 90,
          dyeColor: '#56ccf2',
          requiresSkill: true,
          skillType: '耕地',
          skillNote: 'restore skill',
          note: 'restore note',
        }),
      ],
      workspaceState: {
        ...scene.workspaceState,
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'roof-tile',
        selectedCoordinate: { x: 0, y: 2 },
        saveStatus: 'dirty',
        saveError: 'UI-only failure text',
      },
    });

    const recovered = recoverSceneDocument(payload);

    expect(recovered.ok).toBe(true);
    if (!recovered.ok) {
      throw new Error('Expected valid payload to recover.');
    }
    expect(recovered.scene.workspaceState).toEqual({
      currentBuildingLevelId: 'level-1',
      selectedAssetId: 'roof-tile',
      selectedCoordinate: { x: 0, y: 2 },
      saveStatus: 'dirty',
      saveError: null,
    });
    expect(recovered.scene.tileInstances[0]).toMatchObject({
      instanceId: 'tile-recover',
      assetId: 'roof-tile',
      areaType: 'outer',
      rotationDegrees: 90,
      dyeColor: '#56ccf2',
      requiresSkill: true,
      skillType: '耕地',
      skillNote: 'restore skill',
      note: 'restore note',
    });
  });

  it('returns validation errors without creating a partial scene', () => {
    const recovered = recoverSceneDocument({
      schemaVersion: 1,
      sceneId: 'scene-invalid',
    });

    expect(recovered.ok).toBe(false);
    if (recovered.ok) {
      throw new Error('Expected invalid payload to fail.');
    }
    expect(recovered.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'sceneName',
        }),
      ]),
    );
  });
});
