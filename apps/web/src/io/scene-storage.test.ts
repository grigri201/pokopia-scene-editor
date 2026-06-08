import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildSceneOccupancy,
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractScene,
  createStackingPlateNonFoodScene,
  createTileInstance,
  footprintContractExpected,
  footprintContractFixtureIds,
  serializeSceneDocument,
  stackingContractFixtureIds,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import {
  autosavedSceneStorageKey,
  readLatestSceneDocumentFromStorage,
  readSceneDocumentFromStorage,
  savedSceneStorageKey,
  writeSceneDocumentToAllStorageSlots,
  writeSceneDocumentToStorage,
} from './scene-storage';

describe('scene storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('writes saved SceneDocument payloads through the v1 serializer', () => {
    const scene = createScene({
      workspaceState: {
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'brick-roof-decoration',
        selectedCoordinate: { x: 0, y: 2 },
      },
    });

    const payload = writeSceneDocumentToStorage(window.localStorage, scene, 'saved');
    const rawPayload = window.localStorage.getItem(savedSceneStorageKey);

    expect(rawPayload).not.toBeNull();
    expect(JSON.parse(rawPayload ?? '{}')).toEqual(payload);
    expect(rawPayload).not.toContain('saveError');
    expect(payload.workspaceState).not.toHaveProperty('saveStatus');
    expect(payload.tileInstances[0]).toMatchObject({
      assetId: 'brick-roof-decoration',
      areaType: 'outer',
      rotationDegrees: 90,
      dyeColor: '#56ccf2',
      requiresSkill: true,
      skillType: '耕地',
      skillNote: 'soil marker',
    });
    expect(payload.tileInstances[0]).not.toHaveProperty('note');
  });

  it('reads storage payloads into editable scene state', () => {
    const scene = createScene();
    writeSceneDocumentToStorage(window.localStorage, scene, 'autosave');

    const recovered = readSceneDocumentFromStorage(window.localStorage, 'autosave');

    expect(recovered?.ok).toBe(true);
    if (!recovered?.ok) {
      throw new Error('Expected stored scene to recover.');
    }
    expect(recovered.slot).toBe('autosave');
    expect(recovered.scene.sceneName).toBe('Storage 5x5 scene');
    expect(recovered.scene.workspaceState).not.toHaveProperty('saveError');
    expect(recovered.scene.tileInstances).toHaveLength(1);
  });

  it('recovers local storage by dropping incompatible tile instances and importing remaining content', () => {
    const scene = createStackingPlateNonFoodScene();
    const payload = {
      ...serializeSceneDocument({
        ...scene,
        tileInstances: [scene.tileInstances[0]],
      }),
      tileInstances: scene.tileInstances,
    };
    window.localStorage.setItem(savedSceneStorageKey, JSON.stringify(payload));

    const recovered = readSceneDocumentFromStorage(window.localStorage, 'saved');

    expect(recovered?.ok).toBe(true);
    if (!recovered?.ok) {
      throw new Error('Expected stored scene to recover lossily.');
    }
    expect(recovered.scene.tileInstances).toEqual([
      expect.objectContaining({
        instanceId: stackingContractFixtureIds.plate,
        assetId: 'plate',
      }),
    ]);
    expect(recovered.payload.tileInstances).toEqual([
      expect.objectContaining({
        instanceId: stackingContractFixtureIds.plate,
        assetId: 'plate',
      }),
    ]);
    expect(recovered.droppedTileInstances).toEqual([
      expect.objectContaining({
        instanceId: stackingContractFixtureIds.nonFood,
        assetId: 'leafy-plant',
        conflictType: 'unsupported-stack-surface',
        blockingInstanceId: stackingContractFixtureIds.plate,
        blockingAssetId: 'plate',
      }),
    ]);
  });

  it('writes manual saves to saved and autosave slots with identical payloads', () => {
    writeSceneDocumentToAllStorageSlots(window.localStorage, createScene());

    expect(window.localStorage.getItem(savedSceneStorageKey)).toBe(
      window.localStorage.getItem(autosavedSceneStorageKey),
    );
  });

  it('does not persist auth or session fields into saved or autosaved SceneDocument payloads', () => {
    const scene = withForbiddenAuthFields(createScene());
    const payload = writeSceneDocumentToAllStorageSlots(window.localStorage, scene);
    const rawSaved = window.localStorage.getItem(savedSceneStorageKey);
    const rawAutosaved = window.localStorage.getItem(autosavedSceneStorageKey);

    expect(rawSaved).not.toBeNull();
    expect(rawAutosaved).not.toBeNull();
    expect(rawSaved).toBe(rawAutosaved);
    expectForbiddenAuthKeysAbsent(payload);
    expectForbiddenAuthKeysAbsent(rawSaved ?? '');
    expectForbiddenAuthKeysAbsent(rawAutosaved ?? '');
  });

  it('stores the shared footprint fixture without persisting derived occupancy fields', () => {
    writeSceneDocumentToAllStorageSlots(window.localStorage, createFootprintContractScene());

    const rawSaved = window.localStorage.getItem(savedSceneStorageKey);
    const rawAutosaved = window.localStorage.getItem(autosavedSceneStorageKey);
    expect(rawSaved).not.toBeNull();
    expect(rawSaved).toBe(rawAutosaved);
    expect(rawSaved).not.toContain('"footprint"');
    expect(rawSaved).not.toContain('"effectiveFootprint"');
    expect(rawSaved).not.toContain('"occupiedCells"');
    expect(rawSaved).not.toContain('"blockingCells"');

    const recovered = readSceneDocumentFromStorage(window.localStorage, 'autosave');
    expect(recovered?.ok).toBe(true);
    if (!recovered?.ok) {
      throw new Error('Expected footprint fixture autosave to recover.');
    }
    expect(buildSceneOccupancy(recovered.scene).instances.find((instance) => instance.instanceId === footprintContractFixtureIds.boulder)).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.boulder],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.boulder],
    });
  });

  it('restores the latest valid saved or autosaved scene by metadata.updatedAt', () => {
    const saved = createScene({ sceneName: 'Saved 5x5 scene', updatedAt: '2026-05-16T08:00:00.000Z' });
    const autosaved = createScene({
      sceneName: 'Autosaved 5x5 scene',
      updatedAt: '2026-05-16T08:05:00.000Z',
      workspaceState: {
        currentBuildingLevelId: 'level-1',
        selectedAssetId: 'brick-roof-decoration',
        selectedCoordinate: { x: 0, y: 2 },
      },
    });

    writeSceneDocumentToStorage(window.localStorage, saved, 'saved');
    writeSceneDocumentToStorage(window.localStorage, autosaved, 'autosave');

    const latest = readLatestSceneDocumentFromStorage(window.localStorage);

    expect(latest?.ok).toBe(true);
    if (!latest?.ok) {
      throw new Error('Expected latest stored scene to recover.');
    }
    expect(latest.slot).toBe('autosave');
    expect(latest.scene.sceneName).toBe('Autosaved 5x5 scene');
    expect(latest.scene.workspaceState.selectedAssetId).toBe('brick-roof-decoration');
  });

  it('surfaces invalid autosave instead of silently falling back to saved scene', () => {
    writeSceneDocumentToStorage(window.localStorage, createScene({ sceneName: 'Saved 5x5 scene' }), 'saved');
    window.localStorage.setItem(
      autosavedSceneStorageKey,
      JSON.stringify({
        schemaVersion: 99,
        sceneId: 'bad-autosave',
      }),
    );

    const latest = readLatestSceneDocumentFromStorage(window.localStorage);

    expect(latest?.ok).toBe(false);
    if (!latest || latest.ok) {
      throw new Error('Expected invalid autosave to be reported.');
    }
    expect(latest.slot).toBe('autosave');
    expect(latest.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: 'schemaVersion',
          actual: '99',
        }),
      ]),
    );
  });

  it('returns structured failure for invalid stored JSON', () => {
    window.localStorage.setItem(savedSceneStorageKey, '{not-json');

    const recovered = readSceneDocumentFromStorage(window.localStorage, 'saved');

    expect(recovered?.ok).toBe(false);
    if (!recovered || recovered.ok) {
      throw new Error('Expected invalid JSON to fail.');
    }
    expect(recovered.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fieldPath: '$',
          expected: 'SceneDocument v1 JSON',
        }),
      ]),
    );
  });
});

interface CreateSceneOptions extends Partial<SceneDocument> {
  updatedAt?: string;
}

function createScene(options: CreateSceneOptions = {}): SceneDocument {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-storage',
    sceneName: options.sceneName ?? 'Storage 5x5 scene',
    now: '2026-05-16T08:00:00.000Z',
  });

  return {
    ...scene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-storage',
        assetId: 'brick-roof-decoration',
        coordinate: { x: 0, y: 2 },
        buildingLevelId: 'level-1',
        rotationDegrees: 90,
        dyeColor: '#56ccf2',
        requiresSkill: true,
        skillType: '耕地',
        skillNote: 'soil marker',
      }),
    ],
    workspaceState: {
      currentBuildingLevelId: 'level-1',
      selectedAssetId: 'brick-roof-decoration',
      selectedCoordinate: { x: 0, y: 2 },
    },
    metadata: {
      ...scene.metadata,
      updatedAt: options.updatedAt ?? scene.metadata.updatedAt,
    },
    ...options,
  };
}

const forbiddenAuthKeys = ['userId', 'session', 'owner', 'visibility', 'accessToken', 'refreshToken'];

function withForbiddenAuthFields(scene: SceneDocument): SceneDocument {
  const contaminated = scene as SceneDocument & Record<string, unknown>;
  contaminated.userId = 'auth-user';
  contaminated.session = { accessToken: 'session-token' };
  contaminated.owner = 'auth-owner';
  contaminated.visibility = 'private';
  contaminated.accessToken = 'access-token';
  contaminated.refreshToken = 'refresh-token';
  contaminated.workspaceState = {
    ...scene.workspaceState,
    session: { accessToken: 'nested-session-token' },
    accessToken: 'nested-access-token',
  } as SceneDocument['workspaceState'];

  return contaminated;
}

function expectForbiddenAuthKeysAbsent(value: unknown): void {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  for (const key of forbiddenAuthKeys) {
    expect(raw).not.toContain(`"${key}"`);
  }
}
