export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'expired' | 'error';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  configured: boolean;
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
    };
  }

  if (isExpiredSession(session)) {
    return {
      status: 'expired',
      user: session.user ? toAuthUser(session.user) : null,
      error: null,
      configured,
    };
  }

  return {
    status: 'authenticated',
    user: toAuthUser(session.user),
    error: null,
    configured,
  };
}

export function sanitizeAuthErrorMessage(message: string): string {
  const secretKeyPrefix = 'sb_' + 'secret_';
  const publishableKeyPrefix = 'sb_' + 'publishable_';

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
  };
}

export interface SupabaseAuthUser {
  id: string;
  email?: string | null;
}

export interface SupabaseAuthSession {
  user: SupabaseAuthUser;
  expires_at?: number | null;
}
