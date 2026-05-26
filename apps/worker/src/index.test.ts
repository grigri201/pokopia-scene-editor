import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSceneDocument } from '@pokopia-scene-editor/scene-core';
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
      footprint: { length: 2, width: 1, height: 1 },
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
