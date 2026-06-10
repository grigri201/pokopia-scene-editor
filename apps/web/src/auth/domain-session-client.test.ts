import { describe, expect, it, vi } from 'vitest';

import type { SupabaseAuthSession } from './auth-state';
import { createDomainSessionClient } from './domain-session-client';

describe('domain session client', () => {
  it('restores the current user from the Pokokit domain session endpoint', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { user: { id: 'domain-user' }, expiresAt: 1780000000 } }), { status: 200 }),
    );
    const client = createDomainSessionClient(fetchImpl);

    await expect(client.getSession()).resolves.toEqual({
      user: {
        id: 'domain-user',
        nickname: null,
      },
      expiresAt: 1780000000,
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/auth/session', {
      credentials: 'include',
    });
  });

  it('treats an anonymous domain session response as signed out', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { user: null } }), { status: 200 }));
    const client = createDomainSessionClient(fetchImpl);

    await expect(client.getSession()).resolves.toBeNull();
  });

  it('syncs the Supabase session to the Pokokit domain session endpoint', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { user: { id: 'user-1' } } }), { status: 200 }));
    const client = createDomainSessionClient(fetchImpl);

    await client.sync(createSession('access-token-1'));

    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/auth/session', {
      method: 'POST',
      credentials: 'include',
      headers: {
        Authorization: 'Bearer access-token-1',
      },
    });
  });

  it('loads the auth profile with bearer auth when an access token is available', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { user: { id: 'user-1', nickname: 'Pixel Panda' } } }), { status: 200 }),
    );
    const client = createDomainSessionClient(fetchImpl);

    await expect(client.getProfile('access-token-1')).resolves.toEqual({
      user: {
        id: 'user-1',
        nickname: 'Pixel Panda',
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/auth/profile', {
      headers: {
        Authorization: 'Bearer access-token-1',
      },
    });
  });

  it('updates the auth profile nickname with cookie auth when no access token is available', async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { user: { id: 'domain-user', nickname: 'New Panda' } } }), { status: 200 }),
    );
    const client = createDomainSessionClient(fetchImpl);

    await expect(client.updateProfile('New Panda')).resolves.toEqual({
      user: {
        id: 'domain-user',
        nickname: 'New Panda',
      },
    });
    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/auth/profile', {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nickname: 'New Panda' }),
    });
  });

  it('does not call the API when the Supabase access token is unavailable', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const client = createDomainSessionClient(fetchImpl);

    await expect(client.sync(createSession(null))).rejects.toThrow('Supabase access token is unavailable.');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('surfaces failed sync responses without exposing response details', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Bearer raw-token' } }), { status: 500 }));
    const client = createDomainSessionClient(fetchImpl);

    await expect(client.sync(createSession('access-token-1'))).rejects.toThrow('Pokokit domain session sync failed.');
  });

  it('clears the Pokokit domain session with credentials', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ data: { signedOut: true } }), { status: 200 }));
    const client = createDomainSessionClient(fetchImpl);

    await client.clear();

    expect(fetchImpl).toHaveBeenCalledWith('https://scene-api.pokokit.com/api/v1/auth/session', {
      method: 'DELETE',
      credentials: 'include',
    });
  });

  it('throws when clearing the Pokokit domain session fails', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ error: { code: 'forbidden' } }), { status: 403 }));
    const client = createDomainSessionClient(fetchImpl);

    await expect(client.clear()).rejects.toThrow('Pokokit domain session clear failed.');
  });
});

function createSession(accessToken: string | null): SupabaseAuthSession {
  return {
    user: {
      id: 'user-1',
      email: 'user@example.com',
    },
    access_token: accessToken,
  };
}
