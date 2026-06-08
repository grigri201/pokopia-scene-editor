export const authReturnPathStorageKey = 'pokopia.auth.returnPath.v1';
export const authReturnPathRestoredEvent = 'pokopia.auth.returnPath.restored';
export const authCallbackPath = '/auth/callback';

export interface AuthReturnPathLocation {
  hash: string;
  pathname: string;
  search: string;
}

export function rememberCurrentAuthReturnPath(
  storage: Storage | null = getSessionStorage(),
  location: AuthReturnPathLocation = window.location,
): string | null {
  if (!storage) {
    return null;
  }

  if (isAuthRedirectCallbackLocation(location) || location.pathname === authCallbackPath) {
    return null;
  }

  const returnPath = createAuthReturnPath(location);
  storage.setItem(authReturnPathStorageKey, returnPath);

  return returnPath;
}

export function clearAuthReturnPath(storage: Storage | null = getSessionStorage()): void {
  storage?.removeItem(authReturnPathStorageKey);
}

export function createAuthCallbackUrl(location: Pick<Location, 'origin'> = window.location): string {
  return `${location.origin}${authCallbackPath}`;
}

export function clearAuthCallbackLocation({
  history = window.history,
  location = window.location,
}: {
  history?: History;
  location?: Pick<AuthReturnPathLocation, 'pathname'>;
} = {}): void {
  history.replaceState(null, '', location.pathname || authCallbackPath);
}

export function consumeAuthReturnPath(storage: Storage | null = getSessionStorage()): string | null {
  if (!storage) {
    return null;
  }

  const rawReturnPath = storage.getItem(authReturnPathStorageKey);
  storage.removeItem(authReturnPathStorageKey);

  return normalizeAuthReturnPath(rawReturnPath);
}

export function restoreAuthReturnPathAfterCallback({
  dispatchRestoredEvent = true,
  history = window.history,
  location = window.location,
  requireCallbackLocation = true,
  storage = getSessionStorage(),
}: {
  dispatchRestoredEvent?: boolean;
  history?: History;
  location?: AuthReturnPathLocation;
  requireCallbackLocation?: boolean;
  storage?: Storage | null;
} = {}): string | null {
  if (requireCallbackLocation && !isAuthRedirectCallbackLocation(location)) {
    return null;
  }

  const returnPath = consumeAuthReturnPath(storage);
  if (!returnPath) {
    return null;
  }

  const currentPath = createAuthReturnPath(location);
  if (returnPath !== currentPath) {
    history.replaceState(null, '', returnPath);
  }

  if (dispatchRestoredEvent) {
    window.dispatchEvent(new Event(authReturnPathRestoredEvent));
  }

  return returnPath;
}

export function isAuthRedirectCallbackLocation(location: Pick<AuthReturnPathLocation, 'hash' | 'search'>): boolean {
  const searchParams = new URLSearchParams(stripPrefix(location.search, '?'));
  const hashParams = new URLSearchParams(stripPrefix(location.hash, '#'));

  return searchParams.has('code') ||
    searchParams.has('error') ||
    searchParams.has('error_code') ||
    searchParams.has('error_description') ||
    (searchParams.has('token_hash') && searchParams.has('type')) ||
    hashParams.has('access_token') ||
    hashParams.has('refresh_token') ||
    hashParams.has('error') ||
    hashParams.has('error_code') ||
    hashParams.has('error_description');
}

export function readAuthCallbackError(location: Pick<AuthReturnPathLocation, 'hash' | 'search'> = window.location): string | null {
  const searchParams = new URLSearchParams(stripPrefix(location.search, '?'));
  const hashParams = new URLSearchParams(stripPrefix(location.hash, '#'));
  const errorDescription = searchParams.get('error_description') ?? hashParams.get('error_description');
  const errorCode = searchParams.get('error_code') ?? hashParams.get('error_code');
  const error = searchParams.get('error') ?? hashParams.get('error');

  if (errorDescription) {
    return errorCode ? `${errorDescription} (${errorCode})` : errorDescription;
  }

  return errorCode ?? error;
}

function createAuthReturnPath(location: AuthReturnPathLocation): string {
  return `${location.pathname || '/'}${location.search}${location.hash}`;
}

function normalizeAuthReturnPath(rawReturnPath: string | null): string | null {
  if (!rawReturnPath) {
    return null;
  }

  if (!rawReturnPath.startsWith('/')) {
    return null;
  }

  if (rawReturnPath.startsWith('//')) {
    return null;
  }

  try {
    const parsed = new URL(rawReturnPath, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function getSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function stripPrefix(value: string, prefix: string): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}
