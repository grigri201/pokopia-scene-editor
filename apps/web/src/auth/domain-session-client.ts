import type { DomainSessionAuthContext, SupabaseAuthSession } from './auth-state';
import { sceneApiBaseUrl } from '../io/remote-scene-import-config';

export interface DomainSessionClient {
  getSession(): Promise<DomainSessionAuthContext | null>;
  getProfile(accessToken?: string | null): Promise<DomainSessionAuthContext>;
  sync(session: SupabaseAuthSession): Promise<void>;
  updateProfile(nickname: string, accessToken?: string | null): Promise<DomainSessionAuthContext>;
  clear(): Promise<void>;
}

export function createDomainSessionClient(fetchImpl: typeof fetch = globalThis.fetch): DomainSessionClient {
  const endpoint = `${sceneApiBaseUrl}/api/v1/auth/session`;
  const profileEndpoint = `${sceneApiBaseUrl}/api/v1/auth/profile`;
  return {
    async getSession() {
      const response = await fetchImpl(endpoint, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Pokokit domain session restore failed.');
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error('Pokokit domain session returned invalid JSON.');
      }

      const session = parseDomainSessionEnvelope(body);
      if (session === undefined) {
        throw new Error('Pokokit domain session returned an invalid payload.');
      }
      return session;
    },
    async getProfile(accessToken) {
      const response = await fetchImpl(profileEndpoint, createProfileRequestInit(accessToken));
      if (!response.ok) {
        throw new Error('Pokokit profile restore failed.');
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error('Pokokit profile returned invalid JSON.');
      }

      const profile = parseDomainSessionEnvelope(body);
      if (!profile) {
        throw new Error('Pokokit profile returned an invalid payload.');
      }
      return profile;
    },
    async sync(session) {
      if (!session.access_token) {
        throw new Error('Supabase access token is unavailable.');
      }
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Pokokit domain session sync failed.');
      }
    },
    async updateProfile(nickname, accessToken) {
      const response = await fetchImpl(profileEndpoint, {
        ...createProfileRequestInit(accessToken),
        method: 'PATCH',
        headers: {
          ...createProfileRequestHeaders(accessToken),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ nickname }),
      });
      if (!response.ok) {
        throw new Error('Pokokit profile update failed.');
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new Error('Pokokit profile returned invalid JSON.');
      }

      const profile = parseDomainSessionEnvelope(body);
      if (!profile) {
        throw new Error('Pokokit profile returned an invalid payload.');
      }
      return profile;
    },
    async clear() {
      const response = await fetchImpl(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Pokokit domain session clear failed.');
      }
    },
  };
}

function createProfileRequestInit(accessToken: string | null | undefined): RequestInit {
  return accessToken
    ? { headers: createProfileRequestHeaders(accessToken) }
    : { credentials: 'include' };
}

function createProfileRequestHeaders(accessToken: string | null | undefined): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

function parseDomainSessionEnvelope(value: unknown): DomainSessionAuthContext | null | undefined {
  if (!isRecord(value) || !isRecord(value.data)) {
    return undefined;
  }

  const user = value.data.user;
  if (user === null) {
    return null;
  }
  if (!isRecord(user) || typeof user.id !== 'string') {
    return undefined;
  }

  const session: DomainSessionAuthContext = {
    user: {
      id: user.id,
      nickname: typeof user.nickname === 'string' ? user.nickname : null,
    },
  };
  if (typeof value.data.expiresAt === 'number') {
    session.expiresAt = value.data.expiresAt;
  }
  if (typeof value.data.role === 'string') {
    session.role = value.data.role;
  }
  return session;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
