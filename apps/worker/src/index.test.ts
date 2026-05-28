import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildImageExportSummary,
  buildSceneOccupancy,
  createDefaultSceneDocument,
  createFootprintContractHeightBlockedScene,
  createFootprintContractOverlapScene,
  createFootprintContractScene,
  footprintContractExpected,
  footprintContractFixtureIds,
} from '@pokopia-scene-editor/scene-core';
import { handleRequest, type WorkerEnv } from './index';
import { maxRequestBodyBytes } from './request';

const env: WorkerEnv = {
  ASSETS: {
    fetch: vi.fn(() => Promise.resolve(new Response('asset fallback', { status: 200 }))),
  } as unknown as Fetcher,
};

describe('worker HTTP API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns health envelope metadata', async () => {
    const response = await request('/api/health');
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      data: { status: 'ok' },
      errors: [],
      warnings: [],
      meta: {
        serviceVersion: '0.1.0',
        schemaVersion: 1,
      },
    });
    expect(body.meta.catalogVersion).toMatch(/^assets:\d+;pokemon:\d+$/);
  });

  it('serves health from the public /api/v1 base path', async () => {
    const baseResponse = await request('/api/v1');
    const healthResponse = await request('/api/v1/health');

    expect(baseResponse.status).toBe(200);
    expect((await readJson(baseResponse)).data.status).toBe('ok');
    expect(healthResponse.status).toBe(200);
    expect((await readJson(healthResponse)).data.status).toBe('ok');
  });

  it('generates and validates a default SceneDocument', async () => {
    const generated = await post('/api/v1/scene/generate', {
      selectedPokemonKey: 'pikachu',
      sceneName: 'Worker Scene',
      now: '2026-05-26T00:00:00.000Z',
    });
    const generatedBody = await readJson(generated);

    expect(generated.status).toBe(200);
    expect(generatedBody.data.scene).toMatchObject({
      sceneName: 'Worker Scene',
      selectedPokemonKey: 'pikachu',
      schemaVersion: 1,
    });

    const validation = await post('/api/v1/scene/validate', { scene: generatedBody.data.scene });
    const validationBody = await readJson(validation);

    expect(validationBody.data).toEqual({ valid: true, errors: [] });
  });

  it('recovers, summarizes, encodes, and decodes scene payloads', async () => {
    const scene = createDefaultSceneDocument({ now: '2026-05-26T00:00:00.000Z' });

    const recovery = await post('/api/scene/recover', { scene });
    const recoveryBody = await readJson(recovery);
    expect(recovery.status).toBe(200);
    expect(recoveryBody.data.scene.sceneId).toBe(scene.sceneId);

    const summary = await post('/api/scene/export-summary', { scene });
    const summaryBody = await readJson(summary);
    expect(summaryBody.data.summary.sceneId).toBe(scene.sceneId);

    const encoded = await post('/api/scene/encode', { scene });
    const encodedBody = await readJson(encoded);
    expect(encodedBody.data.sceneString).toMatch(/^PSE1~/);

    const decoded = await post('/api/scene/decode', { sceneString: encodedBody.data.sceneString });
    const decodedBody = await readJson(decoded);
    expect(decodedBody.data.scene.sceneId).toMatch(/^scene-import-/);
  });

  it('keeps HTTP scene tools aligned with the shared footprint contract fixture', async () => {
    const scene = createFootprintContractScene();
    const directSummary = buildImageExportSummary(scene);

    const validation = await post('/api/scene/validate', { scene });
    const validationBody = await readJson(validation);
    expect(validationBody.data).toEqual({ valid: true, errors: [] });

    const recovery = await post('/api/scene/recover', { scene });
    const recoveryBody = await readJson(recovery);
    expect(recovery.status).toBe(200);
    expect(recoveryBody.data.scene).toEqual(scene);

    const summary = await post('/api/scene/export-summary', { scene });
    const summaryBody = await readJson(summary);
    expect(summaryBody.data.summary).toEqual(directSummary);
    expect(findSummaryInstance(summaryBody.data.summary, footprintContractFixtureIds.rotatedRug)).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedRug],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedRug],
    });
    expect(findSummaryInstance(summaryBody.data.summary, footprintContractFixtureIds.boulder)).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.boulder],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.boulder],
      blockingCells: expect.arrayContaining([
        expect.objectContaining({
          buildingLevelId: footprintContractFixtureIds.level1,
          blockedByInstanceId: footprintContractFixtureIds.boulder,
          coordinate: { x: 1, y: 4 },
        }),
      ]),
    });

    const encoded = await post('/api/scene/encode', { scene });
    const encodedBody = await readJson(encoded);
    expect(encodedBody.data.sceneString).toMatch(/^PSE1~/);
    expect(encodedBody.data.sceneString).not.toContain('footprint');
    expect(encodedBody.data.sceneString).not.toContain('occupiedCells');
    expect(encodedBody.data.sceneString).not.toContain('blockingCells');

    const decoded = await post('/api/scene/decode', { sceneString: encodedBody.data.sceneString });
    const decodedBody = await readJson(decoded);
    expect(buildSceneOccupancy(decodedBody.data.scene).instances.find((instance) =>
      instance.assetId === 'wooden-bench' &&
      instance.instance.rotationDegrees === 90 &&
      instance.instance.coordinate.x === 4 &&
      instance.instance.coordinate.y === 4,
    )).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedBench],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedBench],
    });
    expect(buildSceneOccupancy(decodedBody.data.scene).instances.find((instance) =>
      instance.assetId === 'deck-chair' &&
      instance.instance.rotationDegrees === 90 &&
      instance.instance.coordinate.x === 6 &&
      instance.instance.coordinate.y === 4,
    )).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedRug],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedRug],
    });
  });

  it('returns shared export-summary layer notes through the HTTP endpoint', async () => {
    const scene = createSceneWithLayerNotes();
    const directSummary = buildImageExportSummary(scene);

    const summary = await post('/api/scene/export-summary', { scene });
    const summaryBody = await readJson(summary);

    expect(summary.status).toBe(200);
    expect(summaryBody.data.summary).toEqual(directSummary);
    expect(summaryBody.data.summary.layers[0].notes).toEqual([
      { id: 'note-worker-1', text: '先确认高度' },
      { id: 'note-worker-2', text: 'Keep <angle> text as plain data' },
    ]);
  });

  it('returns structured footprint validation errors from HTTP routes', async () => {
    const overlap = await post('/api/scene/validate', { scene: createFootprintContractOverlapScene() });
    const overlapBody = await readJson(overlap);
    expect(overlapBody.data.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'same-level-footprint-overlap',
          instanceId: footprintContractFixtureIds.overlap,
          blockingInstanceId: footprintContractFixtureIds.bench,
          buildingLevelId: footprintContractFixtureIds.level0,
          coordinates: [{ x: 2, y: 2 }],
        }),
      ]),
    );
    expect(JSON.stringify(overlapBody.data.errors)).not.toContain('"actual"');

    const blocked = await post('/api/scene/export-summary', { scene: createFootprintContractHeightBlockedScene() });
    const blockedBody = await readJson(blocked);
    expect(blocked.status).toBe(422);
    expect(blockedBody.errors[0]).toMatchObject({
      code: 'scene_validation_failed',
      conflictType: 'height-blocked-by-lower-footprint',
      instanceId: footprintContractFixtureIds.heightBlocked,
      blockingInstanceId: footprintContractFixtureIds.boulder,
      blockingAssetId: 'strength-rock',
      blockingBuildingLevelId: footprintContractFixtureIds.level0,
      coordinates: [{ x: 1, y: 4 }],
    });
    expect(JSON.stringify(blockedBody.errors[0])).not.toContain('Footprint Contract Scene');
  });

  it('redacts validate responses and preserves every HTTP validation conflict in error envelopes', async () => {
    const secretPokemonKey = 'private-validation-secret';
    const invalidValidation = await post('/api/scene/validate', {
      scene: {
        ...createDefaultSceneDocument({ selectedPokemonKey: 'pikachu' }),
        selectedPokemonKey: secretPokemonKey,
      },
    });
    const invalidValidationText = await invalidValidation.text();
    const invalidValidationBody = JSON.parse(invalidValidationText);
    expect(invalidValidation.status).toBe(200);
    expect(invalidValidationBody.data.valid).toBe(false);
    expect(invalidValidationBody.data.errors[0]).toMatchObject({
      code: 'scene_validation_failed',
      fieldPath: 'selectedPokemonKey',
      reason: expect.any(String),
      recoveryAction: expect.any(String),
    });
    expect(invalidValidationText).not.toContain(secretPokemonKey);
    expect(invalidValidationText).not.toContain('"actual"');

    const overlapScene = createFootprintContractOverlapScene();
    const heightBlockedInstance = createFootprintContractHeightBlockedScene().tileInstances.find(
      (instance) => instance.instanceId === footprintContractFixtureIds.heightBlocked,
    );
    if (!heightBlockedInstance) {
      throw new Error('Expected height-blocked fixture instance.');
    }
    const multiConflictScene = {
      ...overlapScene,
      tileInstances: [...overlapScene.tileInstances, heightBlockedInstance],
    };
    const multiConflict = await post('/api/scene/export-summary', { scene: multiConflictScene });
    const multiConflictBody = await readJson(multiConflict);

    expect(multiConflict.status).toBe(422);
    expect(multiConflictBody.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'same-level-footprint-overlap',
          instanceId: footprintContractFixtureIds.overlap,
          blockingInstanceId: footprintContractFixtureIds.bench,
          coordinates: [{ x: 2, y: 2 }],
        }),
        expect.objectContaining({
          conflictType: 'height-blocked-by-lower-footprint',
          instanceId: footprintContractFixtureIds.heightBlocked,
          blockingInstanceId: footprintContractFixtureIds.boulder,
          blockingBuildingLevelId: footprintContractFixtureIds.level0,
          coordinates: [{ x: 1, y: 4 }],
        }),
      ]),
    );
    expect(JSON.stringify(multiConflictBody.errors)).not.toContain('"actual"');
  });

  it('searches assets without returning the full catalog by default', async () => {
    const response = await request('/api/assets?query=wood&pageSize=3');
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.data.assets).toHaveLength(3);
    expect(body.data.filteredCount).toBeGreaterThan(3);
    expect(body.data.totalCount).toBeGreaterThan(body.data.filteredCount);
  });

  it('returns asset footprint metadata from HTTP asset search', async () => {
    const response = await request('/api/assets?query=wooden-bench&pageSize=1');
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.data.assets[0]).toMatchObject({
      assetId: 'wooden-bench',
      footprint: { length: 1, width: 2, height: 1 },
    });
  });

  it('rejects invalid scene recovery without stack traces or raw payloads', async () => {
    const response = await post('/api/scene/recover', { scene: { sceneName: 'broken' } });
    const bodyText = await response.text();
    const body = JSON.parse(bodyText);

    expect(response.status).toBe(422);
    expect(body.ok).toBe(false);
    expect(body.errors[0]).toMatchObject({
      code: 'scene_validation_failed',
      message: 'SceneDocument validation failed.',
    });
    expect(bodyText).not.toContain('ZodError');
    expect(bodyText).not.toContain('broken');
  });

  it('logs only redacted request metadata', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    try {
      await post('/api/scene/recover', { scene: { sceneName: 'private broken scene' } });

      expect(infoSpy).toHaveBeenCalledWith(
        'worker_api_request',
        expect.objectContaining({
          method: 'POST',
          route: '/api/scene/recover',
          status: 422,
          errorCategory: 'scene_validation_failed',
        }),
      );
      expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('private broken scene');
      expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('sceneName');
    } finally {
      infoSpy.mockRestore();
    }
  });

  it('enforces content type and body size limits', async () => {
    const wrongContentType = await request('/api/scene/validate', {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'text/plain' },
    });
    expect(wrongContentType.status).toBe(415);

    const tooLarge = await request('/api/scene/validate', {
      method: 'POST',
      body: JSON.stringify({ payload: 'x'.repeat(maxRequestBodyBytes + 1) }),
      headers: { 'content-type': 'application/json' },
    });
    expect(tooLarge.status).toBe(413);
  });

  it('does not route unknown API paths to static assets', async () => {
    const response = await request('/api/missing');
    const body = await readJson(response);

    expect(response.status).toBe(404);
    expect(body.errors[0].code).toBe('not_found');
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it('delegates non-API requests to static assets', async () => {
    const response = await request('/some/client/route');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('asset fallback');
    expect(env.ASSETS.fetch).toHaveBeenCalled();
  });
});

function request(path: string, init: RequestInit = {}) {
  return handleRequest(new Request(`https://example.test${path}`, init), env);
}

function post(path: string, body: unknown) {
  return request(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

async function readJson(response: Response): Promise<Record<string, any>> {
  return await response.json() as Record<string, any>;
}

function findSummaryInstance(summary: any, instanceId: string) {
  const instance = summary.layers
    .flatMap((layer: any) => layer.materials)
    .flatMap((material: any) => material.instances)
    .find((candidate: any) => candidate.instanceId === instanceId);

  if (!instance) {
    throw new Error(`Expected summary instance ${instanceId}.`);
  }

  return instance;
}

function createSceneWithLayerNotes() {
  const scene = createDefaultSceneDocument({ now: '2026-05-28T00:00:00.000Z' });

  return {
    ...scene,
    buildingLevels: [
      {
        ...scene.buildingLevels[0],
        notes: [
          { id: 'note-worker-1', text: '先确认高度' },
          { id: 'note-worker-2', text: 'Keep <angle> text as plain data' },
        ],
      },
    ],
  };
}
