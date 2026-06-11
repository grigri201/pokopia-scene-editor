import { describe, expect, it, vi } from 'vitest';

import { fetchGalleryQuota, resolveCloudSceneSaveEndpoint, resolveGalleryQuotaEndpoint, saveCloudScene } from './cloud-scene-api';

describe('cloud scene api', () => {
  it('resolves create and update endpoints for dev and production', () => {
    expect(resolveCloudSceneSaveEndpoint(undefined, 'development')).toBe('/api/v1/scenes');
    expect(resolveCloudSceneSaveEndpoint('scene-1', 'development')).toBe('/api/v1/scenes/scene-1');
    expect(resolveCloudSceneSaveEndpoint(undefined, 'production')).toBe('https://scene-api.pokokit.com/api/v1/scenes');
    expect(resolveCloudSceneSaveEndpoint('scene-1', 'production')).toBe('https://scene-api.pokokit.com/api/v1/scenes/scene-1');
    expect(resolveGalleryQuotaEndpoint('development')).toBe('/api/v1/scenes/quota');
    expect(resolveGalleryQuotaEndpoint('production')).toBe('https://scene-api.pokokit.com/api/v1/scenes/quota');
  });

  it('creates a cloud scene with bearer auth', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: cloudSceneRecord('scene-1') }, { status: 201 }));

    const result = await saveCloudScene({
      auth: { kind: 'bearer', accessToken: 'user-token' },
      endpointMode: 'production',
      payload: {
        name: 'Cloud room',
        pse: 'PSE3-cloud',
        pokemon: 'pikachu',
        visibility: 'private',
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/scenes', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer user-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Cloud room',
        pse: 'PSE3-cloud',
        pokemon: 'pikachu',
        visibility: 'private',
      }),
    });
    expect(result).toMatchObject({
      ok: true,
      operation: 'create',
      record: {
        id: 'scene-1',
      },
    });
  });

  it('updates an owner cloud scene', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: cloudSceneRecord('scene-1') }));

    const result = await saveCloudScene({
      auth: { kind: 'bearer', accessToken: 'user-token' },
      endpointMode: 'development',
      sceneId: 'scene-1',
      payload: {
        pse: 'PSE3-cloud',
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/scenes/scene-1', expect.objectContaining({
      body: JSON.stringify({
        pse: 'PSE3-cloud',
      }),
      method: 'PUT',
    }));
    expect(result).toMatchObject({
      ok: true,
      operation: 'update',
    });
  });

  it('surfaces explicit API errors such as scene_limit_reached', async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({ error: { code: 'scene_limit_reached', message: 'Gallery save quota reached.' } }, { status: 409 }),
    );

    await expect(saveCloudScene({
      auth: { kind: 'bearer', accessToken: 'user-token' },
      endpointMode: 'development',
      payload: {
        name: 'Overflow',
        pse: 'PSE3-overflow',
        pokemon: 'pikachu',
        visibility: 'private',
      },
      fetchImpl,
    })).resolves.toEqual({
      ok: false,
      code: 'scene_limit_reached',
      message: 'Gallery save quota reached.',
    });
  });

  it('fetches non-VIP Gallery quota with bearer auth', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      data: {
        is_vip: false,
        saved_count: 4,
        limit: 5,
        remaining: 1,
        can_create: true,
      },
    }));

    const result = await fetchGalleryQuota({
      auth: { kind: 'bearer', accessToken: 'user-token' },
      endpointMode: 'production',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/scenes/quota', {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer user-token',
      },
    });
    expect(result).toEqual({
      ok: true,
      quota: {
        is_vip: false,
        saved_count: 4,
        limit: 5,
        remaining: 1,
        can_create: true,
      },
    });
  });

  it('fetches VIP Gallery quota with domain session auth', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      data: {
        is_vip: true,
        saved_count: 8,
        limit: null,
        remaining: null,
        can_create: true,
      },
    }));

    const result = await fetchGalleryQuota({
      auth: { kind: 'domain-session' },
      endpointMode: 'development',
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('/api/v1/scenes/quota', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
    expect(result).toMatchObject({
      ok: true,
      quota: {
        is_vip: true,
        limit: null,
        remaining: null,
      },
    });
  });

  it('rejects malformed Gallery quota payloads', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      data: {
        is_vip: 'yes',
        saved_count: -1,
        limit: 5,
        remaining: 6,
        can_create: true,
      },
    }));

    await expect(fetchGalleryQuota({
      auth: { kind: 'bearer', accessToken: 'user-token' },
      endpointMode: 'development',
      fetchImpl,
    })).resolves.toEqual({
      ok: false,
      code: 'invalid_response',
      message: 'Scene API returned an invalid Gallery quota.',
    });
  });

  it('rejects inconsistent Gallery quota payloads', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({
      data: {
        is_vip: false,
        saved_count: 5,
        limit: null,
        remaining: null,
        can_create: true,
      },
    }));

    await expect(fetchGalleryQuota({
      auth: { kind: 'bearer', accessToken: 'user-token' },
      endpointMode: 'development',
      fetchImpl,
    })).resolves.toEqual({
      ok: false,
      code: 'invalid_response',
      message: 'Scene API returned an invalid Gallery quota.',
    });
  });

  it('can save with the domain session cookie without sending a bearer token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: cloudSceneRecord('scene-cookie') }, { status: 201 }));

    await saveCloudScene({
      auth: { kind: 'domain-session' },
      endpointMode: 'production',
      payload: {
        name: 'Cookie cloud room',
        pse: 'PSE3-cookie-cloud',
        pokemon: 'eevee',
        visibility: 'private',
      },
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/scenes', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Cookie cloud room',
        pse: 'PSE3-cookie-cloud',
        pokemon: 'eevee',
        visibility: 'private',
      }),
    });
  });
});

function cloudSceneRecord(id: string) {
  return {
    id,
    owner_user_id: 'user-1',
    name: 'Cloud room',
    pse: 'PSE3-cloud',
    pokemon: 'pikachu',
    visibility: 'private',
    created_at: '2026-06-08T00:00:00.000Z',
    updated_at: '2026-06-08T00:00:00.000Z',
  };
}

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  });
}
