export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'expired' | 'error';
export type AuthSource = 'anonymous' | 'supabase' | 'domain-session';

export interface AuthUser {
  id: string;
  email: string | null;
  nickname: string | null;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  configured: boolean;
  accessToken: string | null;
  source: AuthSource;
}

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export const anonymousAuthState: AuthState = {
  status: 'anonymous',
  user: null,
  error: null,
  configured: false,
  accessToken: null,
  source: 'anonymous',
};

export function getSupabasePublicConfig(env: ImportMetaEnv): SupabasePublicConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim() ?? '';
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function createAuthErrorState(message: string, configured = true): AuthState {
  return {
    status: 'error',
    user: null,
    error: sanitizeAuthErrorMessage(message),
    configured,
    accessToken: null,
    source: 'anonymous',
  };
}

export function createAuthStateFromSession(
  session: SupabaseAuthSession | null,
  configured = true,
): AuthState {
  if (!session) {
    return {
      status: 'anonymous',
      user: null,
      error: null,
      configured,
      accessToken: null,
      source: 'anonymous',
    };
  }

  if (isExpiredSession(session)) {
    return {
      status: 'expired',
      user: session.user ? toAuthUser(session.user) : null,
      error: null,
      configured,
      accessToken: session.access_token ?? null,
      source: 'supabase',
    };
  }

  return {
    status: 'authenticated',
    user: toAuthUser(session.user),
    error: null,
    configured,
    accessToken: session.access_token ?? null,
    source: 'supabase',
  };
}

export function createAuthStateFromDomainSession(session: DomainSessionAuthContext, configured = true): AuthState {
  return {
    status: 'authenticated',
    user: {
      id: session.user.id,
      email: null,
      nickname: session.user.nickname ?? null,
    },
    error: null,
    configured,
    accessToken: null,
    source: 'domain-session',
  };
}

export function sanitizeAuthErrorMessage(message: string): string {
  const secretKeyPrefix = createSupabaseKeyPrefix('secret');
  const publishableKeyPrefix = createSupabaseKeyPrefix('publishable');

  return removeStackTraceLines(message)
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(sensitiveQuotedFieldPattern, (_match, prefix: string, quote: string) => `${prefix}${quote}[redacted]${quote}`)
    .replace(sensitiveBareFieldPattern, '$1[redacted]')
    .replace(new RegExp(`${secretKeyPrefix}[A-Za-z0-9_-]+`, 'gi'), `${secretKeyPrefix}[redacted]`)
    .replace(new RegExp(`${publishableKeyPrefix}[A-Za-z0-9_-]+`, 'gi'), `${publishableKeyPrefix}[redacted]`)
    .replace(/(?:\/[A-Za-z0-9._~+@-]+)+\/[A-Za-z0-9._~+@-]+:\d+:\d+/g, '[redacted-stack]')
    .replace(posixPathPattern, '[redacted-path]')
    .replace(windowsPathPattern, '[redacted-path]')
    .replace(/eyJ[A-Za-z0-9._~+/=-]+/g, '[redacted-jwt]');
}

function createSupabaseKeyPrefix(kind: 'publishable' | 'secret'): string {
  return ['sb', kind, ''].join(String.fromCharCode(95));
}

function removeStackTraceLines(message: string): string {
  return message
    .split(/\r?\n/)
    .filter((line) => !/^\s*at\s+/.test(line))
    .join(' ')
    .replace(/\s+at\s+[^)]*\([^)]*:\d+:\d+\).*/g, '')
    .replace(/\s+at\s+[^\s]+\s+(?:\/|[A-Za-z]:\\).+:\d+:\d+.*/g, '');
}

const sensitiveFieldNames = 'access_token|refresh_token|token_hash|provider_token|provider_refresh_token|client_secret|secret|password|api_key|apikey|key';
const sensitiveQuotedFieldPattern = new RegExp(`(["']?\\b(?:${sensitiveFieldNames})\\b["']?\\s*[=:]\\s*)(["'])(?:\\\\.|(?!\\2).)*\\2`, 'gi');
const sensitiveBareFieldPattern = new RegExp(`(["']?\\b(?:${sensitiveFieldNames})\\b["']?\\s*[=:]\\s*)([^\\s"',}&]+)`, 'gi');
const posixPathPattern = /\/(?:Users|home|var|tmp|private|Volumes|workspace|app)(?:\/[^,\n\r()]+)+\.[A-Za-z0-9]+(?::\d+:\d+)?/g;
const windowsPathPattern = /[A-Za-z]:\\(?:[^\\\n\r()]+\\)*[^\\\n\r()]+\.[A-Za-z0-9]+(?::\d+:\d+)?/g;

function isExpiredSession(session: SupabaseAuthSession): boolean {
  return typeof session.expires_at === 'number' && session.expires_at * 1000 <= Date.now();
}

function toAuthUser(user: SupabaseAuthUser): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    nickname: readNicknameFromMetadata(user.user_metadata) ?? null,
  };
}

export interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  user_metadata?: unknown;
}

export interface SupabaseAuthSession {
  user: SupabaseAuthUser;
  access_token?: string | null;
  expires_at?: number | null;
}

export interface DomainSessionAuthContext {
  user: {
    id: string;
    nickname?: string | null;
  };
  expiresAt?: number;
  role?: string;
}

function readNicknameFromMetadata(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  for (const field of ['nickname', 'display_name', 'name', 'username']) {
    const candidate = (value as Record<string, unknown>)[field];
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed.length > 0 && trimmed.length <= 80) {
        return trimmed;
      }
    }
  }
  return null;
}
