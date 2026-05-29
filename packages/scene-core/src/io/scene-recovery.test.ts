import { describe, expect, it } from 'vitest';
import {
  buildSceneOccupancy,
  createBuildingLevel,
  createDefaultSceneDocument,
  legacySceneDimensions,
  createStackingPlateFoodScene,
  createStackingPlateNonFoodScene,
  createTileInstance,
  stackingContractFixtureIds,
} from '../domain/scene';
import { serializeSceneDocument } from './scene-serializer';
import { applyRecoveredSceneDocument, recoverSceneDocument } from './scene-recovery';

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
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-recover',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 0, y: 2 },
          buildingLevelId: 'level-1',
          rotationDegrees: 90,
          dyeColor: '#56ccf2',
          requiresSkill: true,
          skillType: '耕地',
          skillNote: 'restore skill',
        }),
      ],
      workspaceState: {
        ...scene.workspaceState,
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'brick-roof-decoration',
        selectedCoordinate: { x: 0, y: 2 },
      },
    });

    const recovered = recoverSceneDocument(payload);

    expect(recovered.ok).toBe(true);
    if (!recovered.ok) {
      throw new Error('Expected valid payload to recover.');
    }
    expect(recovered.scene.workspaceState).toEqual({
      currentBuildingLevelId: 'level-1',
      selectedAssetId: 'brick-roof-decoration',
      selectedCoordinate: { x: 0, y: 2 },
    });
    expect(recovered.scene.tileInstances[0]).toMatchObject({
      instanceId: 'tile-recover',
      assetId: 'brick-roof-decoration',
      areaType: 'outer',
      rotationDegrees: 90,
      dyeColor: '#56ccf2',
      requiresSkill: true,
      skillType: '耕地',
      skillNote: 'restore skill',
    });
    expect(recovered.scene.workspaceState).not.toHaveProperty('saveStatus');
    expect(recovered.scene.tileInstances[0]).not.toHaveProperty('note');
  });

  it('recovers compatible stacking scenes and rejects unsupported stack surfaces', () => {
    const recovered = recoverSceneDocument(serializeSceneDocument(createStackingPlateFoodScene()));
    const rejected = recoverSceneDocument(createStackingPlateNonFoodScene());

    expect(recovered.ok).toBe(true);
    if (!recovered.ok) {
      throw new Error('Expected compatible stacking scene to recover.');
    }
    expect(buildSceneOccupancy(recovered.scene).stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: stackingContractFixtureIds.food,
        baseInstanceId: stackingContractFixtureIds.plate,
        surfaceKind: 'food-surface',
      }),
    ]);
    expect(rejected.ok).toBe(false);
    if (rejected.ok) {
      throw new Error('Expected unsupported stacking scene to fail recovery.');
    }
    expect(rejected.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'unsupported-stack-surface',
          instanceId: stackingContractFixtureIds.nonFood,
          blockingInstanceId: stackingContractFixtureIds.plate,
          surfaceKind: 'food-surface',
        }),
      ]),
    );
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

  it('recovers older v1 payloads that do not include building level notes', () => {
    const payload = serializeSceneDocument(
      createDefaultSceneDocument({
        sceneId: 'scene-old-level-notes',
        sceneName: 'Old 5x5 notes payload',
        now: '2026-05-16T08:00:00.000Z',
      }),
    );
    const legacyPayload = {
      ...payload,
      buildingLevels: payload.buildingLevels.map((level) => {
        const copy = { ...level } as Partial<typeof level>;
        delete copy.notes;
        return copy;
      }),
    };

    const recovered = recoverSceneDocument(legacyPayload);

    expect(recovered.ok).toBe(true);
    if (!recovered.ok) {
      throw new Error('Expected legacy notes payload to recover.');
    }
    expect(recovered.scene.buildingLevels).toEqual([
      expect.objectContaining({
        id: 'level-0',
        notes: [],
      }),
    ]);
    expect(recovered.payload.buildingLevels[0].notes).toEqual([]);
  });

  it('migrates only the legacy generated scene name to the current Pokemon-based default', () => {
    const legacyDefaultScene = createDefaultSceneDocument({
      sceneId: 'scene-legacy-default-name',
      sceneName: 'Ditto 5x5 布景草稿',
      selectedPokemonKey: 'eevee',
      now: '2026-05-16T08:00:00.000Z',
    });
    const customScene = createDefaultSceneDocument({
      sceneId: 'scene-custom-name',
      sceneName: 'Ditto 5x5 serialization',
      selectedPokemonKey: 'eevee',
      now: '2026-05-16T08:00:00.000Z',
    });

    const migrated = recoverSceneDocument(serializeSceneDocument(legacyDefaultScene));
    const custom = recoverSceneDocument(serializeSceneDocument(customScene));

    expect(migrated.ok).toBe(true);
    expect(custom.ok).toBe(true);
    if (!migrated.ok || !custom.ok) {
      throw new Error('Expected valid payloads to recover.');
    }
    expect(migrated.scene.sceneName).toBe('15x15 布景');
    expect(custom.scene.sceneName).toBe('Ditto 5x5 serialization');
  });

  it('recovers legacy 7x7 JSON payloads and preserves legacy dimensions', () => {
    const payload = serializeSceneDocument(createDefaultSceneDocument({
      sceneId: 'scene-legacy-json',
      sceneName: 'Ditto 5x5 布景草稿',
      selectedPokemonKey: 'ditto',
      now: '2026-05-16T08:00:00.000Z',
    }));
    const legacyPayload = {
      ...payload,
      sceneSize: { ...legacySceneDimensions.sceneSize },
      canvasSize: { ...legacySceneDimensions.canvasSize },
      outerPadding: legacySceneDimensions.outerPadding,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-legacy-json',
          assetId: 'leafy-plant',
          coordinate: { x: 6, y: 6 },
          buildingLevelId: 'level-0',
          dimensions: legacySceneDimensions,
        }),
      ],
      workspaceState: {
        ...payload.workspaceState,
        selectedCoordinate: { x: 6, y: 6 },
      },
    };

    const recovered = recoverSceneDocument(legacyPayload);

    expect(recovered.ok).toBe(true);
    if (!recovered.ok) {
      throw new Error('Expected legacy JSON payload to recover.');
    }
    expect(recovered.scene.sceneName).toBe('5x5 布景');
    expect(recovered.scene.sceneSize).toEqual({ width: 5, height: 5 });
    expect(recovered.scene.canvasSize).toEqual({ width: 7, height: 7 });
    expect(recovered.scene.tileInstances[0]).toMatchObject({
      coordinate: { x: 6, y: 6 },
      areaType: 'outer',
    });
  });

  it('migrates old generated Pokemon default names to the neutral default name', () => {
    const generatedDefaultScene = createDefaultSceneDocument({
      sceneId: 'scene-generated-default-name',
      sceneName: '伊布的布景',
      selectedPokemonKey: 'eevee',
      now: '2026-05-16T08:00:00.000Z',
    });

    const migrated = recoverSceneDocument(serializeSceneDocument(generatedDefaultScene));

    expect(migrated.ok).toBe(true);
    if (!migrated.ok) {
      throw new Error('Expected valid payload to recover.');
    }
    expect(migrated.scene.sceneName).toBe('15x15 布景');
  });

  it('applies a valid recovered payload only after validation succeeds', () => {
    const currentScene = createDirtyCurrentScene();
    const recoveredScene = createDefaultSceneDocument({
      sceneId: 'scene-valid-recovery',
      sceneName: 'Recovered 5x5 scene',
      selectedPokemonKey: 'pikachu',
      selectedCoordinate: { x: 3, y: 3 },
      now: '2026-05-16T08:10:00.000Z',
    });
    const payload = serializeSceneDocument(recoveredScene);

    const result = applyRecoveredSceneDocument(currentScene, payload, {
      interactionMode: 'edit',
      source: 'confirmed-user',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected valid recovery to apply.');
    }
    expect(result.previousScene).toBe(currentScene);
    expect(result.scene).toMatchObject({
      sceneId: 'scene-valid-recovery',
      sceneName: 'Recovered 5x5 scene',
      selectedPokemonKey: 'pikachu',
      workspaceState: {
        selectedCoordinate: { x: 3, y: 3 },
      },
    });
  });

  it('protects the current dirty scene when schemaVersion is missing or unknown', () => {
    const currentScene = createDirtyCurrentScene();
    const missingVersion = applyRecoveredSceneDocument(currentScene, { sceneId: 'bad-scene' }, {
      interactionMode: 'edit',
      source: 'confirmed-user',
    });
    const unknownVersion = applyRecoveredSceneDocument(currentScene, {
      schemaVersion: 99,
      sceneId: 'bad-scene',
    }, {
      interactionMode: 'edit',
      source: 'confirmed-user',
    });

    expect(missingVersion.ok).toBe(false);
    expect(unknownVersion.ok).toBe(false);
    if (missingVersion.ok || unknownVersion.ok) {
      throw new Error('Expected invalid versions to fail.');
    }
    expect(missingVersion.scene).toBe(currentScene);
    expect(unknownVersion.scene).toBe(currentScene);
    expect(currentScene.metadata.updatedAt).toBe('2026-05-16T08:05:00.000Z');
    expect(missingVersion.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'schemaVersion',
          actual: 'undefined',
        }),
      ]),
    );
    expect(unknownVersion.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'schemaVersion',
          actual: '99',
        }),
      ]),
    );
  });

  it('returns field-level recovery errors for invalid payload fields without replacing scene', () => {
    const currentScene = createDirtyCurrentScene();
    const validPayload = serializeSceneDocument(
      createDefaultSceneDocument({
        sceneId: 'scene-invalid-recovery',
        sceneName: 'Invalid 5x5 recovery',
        now: '2026-05-16T08:10:00.000Z',
      }),
    );
    const invalidPayload = {
      ...validPayload,
      tileInstances: [
        {
          instanceId: 'tile-bad-area',
          assetId: 'wooden-fencing',
          coordinate: { x: 0, y: 2 },
          areaType: 'main',
          buildingLevelId: 'level-0',
          rotationDegrees: 0,
          dyeColor: '#bb6bd9',
          requiresSkill: false,
          skillType: null,
          skillNote: '',
        },
        {
          instanceId: 'tile-bad-coordinate',
          assetId: 'leafy-plant',
          coordinate: { x: 17, y: 0 },
          areaType: 'outer',
          buildingLevelId: 'level-0',
          rotationDegrees: 0,
          dyeColor: null,
          requiresSkill: true,
          skillType: '树叶',
          skillNote: '',
        },
      ],
    };

    const result = applyRecoveredSceneDocument(currentScene, invalidPayload, {
      interactionMode: 'edit',
      source: 'confirmed-user',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected invalid payload to fail.');
    }
    expect(result.scene).toBe(currentScene);
    expect(result.availableActions).toEqual(['retry', 'cancel', 'view-details']);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].areaType',
        }),
        expect.objectContaining({
          fieldPath: 'tileInstances[1].coordinate.x',
          recoveryAction: 'Keep coordinates inside the SceneDocument v1 canvas bounds.',
        }),
      ]),
    );
  });

  it('rejects recovered scenes when current footprint rules create cross-layer blocking conflicts', () => {
    const currentScene = createDirtyCurrentScene();
    const payload = {
      ...serializeSceneDocument(createDefaultSceneDocument({
        sceneId: 'scene-footprint-recovery',
        sceneName: 'Footprint recovery',
        now: '2026-05-16T08:10:00.000Z',
      })),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
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

    const result = applyRecoveredSceneDocument(currentScene, payload, {
      interactionMode: 'edit',
      source: 'confirmed-user',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected footprint-blocked recovery to fail.');
    }
    expect(result.scene).toBe(currentScene);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'height-blocked-by-lower-footprint',
          fieldPath: 'tileInstances[1].coordinate',
          instanceId: 'tile-upper',
          blockingInstanceId: 'tile-boulder',
        }),
      ]),
    );
  });

  it('rejects areaType mismatches without replacing the current scene', () => {
    const currentScene = createDirtyCurrentScene();
    const validPayload = serializeSceneDocument(
      createDefaultSceneDocument({
        sceneId: 'scene-area-recovery',
        sceneName: 'Area 5x5 recovery',
        now: '2026-05-16T08:10:00.000Z',
      }),
    );
    const invalidPayload = {
      ...validPayload,
      tileInstances: [
        {
          instanceId: 'tile-bad-area',
          assetId: 'stepping-stones',
          coordinate: { x: 0, y: 2 },
          areaType: 'main',
          buildingLevelId: 'level-0',
          rotationDegrees: 0,
          dyeColor: null,
          requiresSkill: false,
          skillType: null,
          skillNote: '',
        },
      ],
    };

    const result = applyRecoveredSceneDocument(currentScene, invalidPayload, {
      interactionMode: 'edit',
      source: 'confirmed-user',
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error('Expected invalid areaType to fail.');
    }
    expect(result.scene).toBe(currentScene);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'tileInstances[0].areaType',
          recoveryAction: 'Recompute areaType from coordinate, sceneSize, and outerPadding before saving.',
        }),
      ]),
    );
  });

  it('applies a valid recovered payload in read-only mode', () => {
    const currentScene = createDirtyCurrentScene();
    const payload = serializeSceneDocument(
      createDefaultSceneDocument({
        sceneId: 'scene-readonly-recovery',
        sceneName: 'Read-only recovered scene',
        selectedPokemonKey: 'pikachu',
        now: '2026-05-16T08:10:00.000Z',
      }),
    );

    const result = applyRecoveredSceneDocument(currentScene, payload, {
      interactionMode: 'readOnly',
      source: 'confirmed-user',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected read-only recovery to apply.');
    }
    expect(result.previousScene).toBe(currentScene);
    expect(result.scene).toMatchObject({
      sceneId: 'scene-readonly-recovery',
      sceneName: 'Read-only recovered scene',
      selectedPokemonKey: 'pikachu',
    });
  });
});

function createDirtyCurrentScene() {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-current-dirty',
    sceneName: 'Current Dirty 5x5 scene',
    now: '2026-05-16T08:00:00.000Z',
  });

  return {
    ...scene,
    metadata: {
      ...scene.metadata,
      updatedAt: '2026-05-16T08:05:00.000Z',
    },
  };
}
