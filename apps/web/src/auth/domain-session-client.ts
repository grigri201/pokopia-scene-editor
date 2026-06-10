import type { DomainSessionAuthContext, SupabaseAuthSession } from './auth-state';
import { sceneApiBaseUrl } from '../io/remote-scene-import-config';

export interface DomainSessionClient {
  getSession(): Promise<DomainSessionAuthContext | null>;
  sync(session: SupabaseAuthSession): Promise<void>;
  clear(): Promise<void>;
}

export function createDomainSessionClient(fetchImpl: typeof fetch = globalThis.fetch): DomainSessionClient {
  const endpoint = `${sceneApiBaseUrl}/api/v1/auth/session`;
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
