import { describe, expect, it, vi } from 'vitest';
import {
  remoteSceneDevProxyContextPattern,
  rewriteRemoteSceneDevProxyPath,
  getRemoteSceneDevProxyRequestHeaders,
  remoteSceneApiOrigin,
  resolveRemoteSceneApiBaseUrl,
} from './remote-scene-import-config';
import {
  fetchRemoteSceneString,
  getSceneIdFromSearch,
  resolveRemoteSceneEndpoint,
} from './remote-scene-import';

describe('remote scene import adapter', () => {
  it('parses scene_id query values without accepting unsafe path segments', () => {
    expect(getSceneIdFromSearch('')).toEqual({ status: 'no-scene-id' });
    expect(getSceneIdFromSearch('?utm_source=share')).toEqual({ status: 'no-scene-id' });
    expect(getSceneIdFromSearch('?scene_id=82AY')).toEqual({ status: 'valid', sceneId: '82AY' });
    expect(getSceneIdFromSearch('?scene_id=abc%2D123')).toEqual({ status: 'valid', sceneId: 'abc-123' });
    expect(getSceneIdFromSearch('?scene_id=')).toEqual({
      status: 'invalid-query',
      reason: 'empty-scene-id',
    });
    expect(getSceneIdFromSearch('?scene_id=one&scene_id=two')).toEqual({
      status: 'invalid-query',
      reason: 'duplicate-scene-id',
    });
    expect(getSceneIdFromSearch('?scene_id=abc%2Fdef')).toEqual({
      status: 'invalid-query',
      reason: 'invalid-scene-id',
      sceneId: 'abc/def',
    });
    expect(getSceneIdFromSearch('?scene_id=abc%20def')).toEqual({
      status: 'invalid-query',
      reason: 'invalid-scene-id',
      sceneId: 'abc def',
    });
    expect(getSceneIdFromSearch('?scene_id=%2082AY%20')).toEqual({
      status: 'invalid-query',
      reason: 'invalid-scene-id',
      sceneId: ' 82AY ',
    });
  });

  it('resolves development proxy and production API endpoints with encoded ids', () => {
    expect(resolveRemoteSceneEndpoint('scene_82-AY', 'development')).toBe('/api/v1/scenes/scene_82-AY');
    expect(resolveRemoteSceneEndpoint('scene_82-AY', 'production')).toBe(
      'https://scene-api.pokokit.com/api/v1/scenes/scene_82-AY',
    );
    expect(resolveRemoteSceneApiBaseUrl('http://127.0.0.1:8787/')).toBe('http://127.0.0.1:8787/api/v1/scenes');
    expect(resolveRemoteSceneApiBaseUrl('replace-with-scene-api-url')).toBe('https://scene-api.pokokit.com/api/v1/scenes');
  });

  it('documents the dev proxy Origin strategy without setting Origin in client fetch options', async () => {
    const fetchOptions: RequestInit[] = [];
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchOptions.push(init ?? {});
      return jsonResponse({ id: '82AY', pse: 'PSE1~fixture' });
    });

    await fetchRemoteSceneString('?scene_id=82AY', { endpointMode: 'production', fetchImpl });

    expect(getRemoteSceneDevProxyRequestHeaders()).toEqual({
      Origin: remoteSceneApiOrigin,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://scene-api.pokokit.com/api/v1/scenes/82AY',
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );
    expect(fetchOptions).toEqual([
      {
        headers: {
          Accept: 'application/json',
        },
      },
    ]);
    expect(JSON.stringify(fetchOptions[0])).not.toContain('Origin');
    expect(new RegExp(remoteSceneDevProxyContextPattern).test('/api/v1/scenes')).toBe(true);
    expect(new RegExp(remoteSceneDevProxyContextPattern).test('/api/v1/scenes?page=1')).toBe(true);
    expect(new RegExp(remoteSceneDevProxyContextPattern).test('/api/v1/scenes/82AY')).toBe(true);
    expect(new RegExp(remoteSceneDevProxyContextPattern).test('/api/v1/scenes-extra/82AY')).toBe(false);
    expect(rewriteRemoteSceneDevProxyPath('/api/v1/scenes')).toBe('');
    expect(rewriteRemoteSceneDevProxyPath('/api/v1/scenes?page=1')).toBe('?page=1');
    expect(rewriteRemoteSceneDevProxyPath('/api/v1/scenes/82AY')).toBe('/82AY');
  });

  it('fetches a scene string and cloud metadata from the Scene API v1 envelope', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      data: {
        id: '82AY',
        owner_user_id: 'owner-1',
        name: 'Fixture',
        pse: 'PSE1~fixture',
        pokemon: 'pikachu',
        visibility: 'public',
        created_at: '2026-06-08T00:00:00.000Z',
        updated_at: '2026-06-08T00:00:00.000Z',
      },
    }));

    await expect(fetchRemoteSceneString('?scene_id=82AY', { endpointMode: 'development', fetchImpl })).resolves.toEqual({
      status: 'success',
      endpoint: '/api/v1/scenes/82AY',
      sceneId: '82AY',
      sceneString: 'PSE1~fixture',
      cloudScene: {
        sceneId: '82AY',
        ownerUserId: 'owner-1',
        visibility: 'public',
      },
    });
  });

  it('keeps a temporary legacy JSON pse response parser for old scene links', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: '82AY', meta: { name: 'Fixture' }, pse: 'PSE1~fixture' }));

    await expect(fetchRemoteSceneString('?scene_id=82AY', { endpointMode: 'development', fetchImpl })).resolves.toEqual({
      status: 'success',
      endpoint: '/api/v1/scenes/82AY',
      sceneId: '82AY',
      sceneString: 'PSE1~fixture',
      cloudScene: null,
    });
  });

  it('sends a bearer token when loading a private cloud scene', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: '82AY', meta: { name: 'Fixture' }, pse: 'PSE1~fixture' }));

    await fetchRemoteSceneString('?scene_id=82AY', {
      auth: { kind: 'bearer', accessToken: 'user-token' },
      endpointMode: 'production',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/scenes/82AY', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer user-token',
      },
    });
  });

  it('sends credentials without bearer when loading with a domain session', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: '82AY', meta: { name: 'Fixture' }, pse: 'PSE1~fixture' }));

    await fetchRemoteSceneString('?scene_id=82AY', {
      auth: { kind: 'domain-session' },
      endpointMode: 'production',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/scenes/82AY', {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  });

  it('maps no-op and invalid query states before fetch', async () => {
    const fetchImpl = vi.fn();

    await expect(fetchRemoteSceneString('', { fetchImpl })).resolves.toEqual({ status: 'no-scene-id' });
    await expect(fetchRemoteSceneString('?scene_id=one&scene_id=two', { fetchImpl })).resolves.toEqual({
      status: 'invalid-query',
      reason: 'duplicate-scene-id',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps 404, non-2xx and thrown fetches to typed errors', async () => {
    await expect(fetchRemoteSceneString('?scene_id=missing', {
      endpointMode: 'production',
      fetchImpl: vi.fn(async () => jsonResponse({ error: { code: 'scene_not_found' } }, { status: 404 })),
    })).resolves.toEqual({
      status: 'not-found',
      endpoint: 'https://scene-api.pokokit.com/api/v1/scenes/missing',
      sceneId: 'missing',
    });

    await expect(fetchRemoteSceneString('?scene_id=blocked', {
      endpointMode: 'production',
      fetchImpl: vi.fn(async () => jsonResponse({ error: { code: 'forbidden_origin' } }, { status: 403 })),
    })).resolves.toEqual({
      status: 'network-error',
      endpoint: 'https://scene-api.pokokit.com/api/v1/scenes/blocked',
      httpStatus: 403,
      reason: 'Remote scene request failed with HTTP 403.',
      sceneId: 'blocked',
    });

    await expect(fetchRemoteSceneString('?scene_id=offline', {
      endpointMode: 'production',
      fetchImpl: vi.fn(async () => {
        throw new Error('network unavailable');
      }),
    })).resolves.toEqual({
      status: 'network-error',
      endpoint: 'https://scene-api.pokokit.com/api/v1/scenes/offline',
      reason: 'network unavailable',
      sceneId: 'offline',
    });
  });

  it('rejects invalid remote response shapes', async () => {
    await expectInvalidResponse(textResponse('PSE1~fixture'), 'content-type');
    await expectInvalidResponse(new Response(JSON.stringify({ id: '82AY', meta: {}, pse: 'PSE1~fixture' }), {
      headers: { 'content-type': 'application/jsonx' },
    }), 'content-type');
    await expectInvalidResponse(new Response('{', { headers: jsonHeaders }), 'json-parse');
    await expectInvalidResponse(jsonResponse({ id: '82AY', sceneString: 'PSE1~fixture' }), 'response-shape');
    await expectInvalidResponse(jsonResponse({ id: '82AY', pse: 'PSE1~fixture' }), 'response-shape');
    await expectInvalidResponse(jsonResponse({ id: 'other', meta: { name: 'Fixture' }, pse: 'PSE1~fixture' }), 'scene-id-mismatch');
    await expectInvalidResponse(jsonResponse({ id: '82AY', meta: { name: 'Fixture' }, pse: '' }), 'empty-scene-string');
  });
});

const jsonHeaders = { 'content-type': 'application/json; charset=utf-8' };

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...init.headers,
    },
  });
}

function textResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}

async function expectInvalidResponse(
  response: Response,
  reason: 'content-type' | 'json-parse' | 'response-shape' | 'scene-id-mismatch' | 'empty-scene-string',
): Promise<void> {
  await expect(fetchRemoteSceneString('?scene_id=82AY', {
    endpointMode: 'production',
    fetchImpl: vi.fn(async () => response),
    })).resolves.toEqual({
      status: 'invalid-response',
      endpoint: 'https://scene-api.pokokit.com/api/v1/scenes/82AY',
      httpStatus: 200,
      reason,
    sceneId: '82AY',
  });
}
