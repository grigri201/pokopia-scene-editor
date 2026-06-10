import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  anonymousAuthState,
  createAuthErrorState,
  createAuthStateFromDomainSession,
  createAuthStateFromSession,
  sanitizeAuthErrorMessage,
  type AuthState,
  type DomainSessionAuthContext,
  type SupabaseAuthSession,
} from './auth-state';
import {
  authCallbackPath,
  clearAuthCallbackLocation,
  clearAuthReturnPath,
  createAuthCallbackUrl,
  isAuthRedirectCallbackLocation,
  rememberCurrentAuthReturnPath,
  readAuthCallbackError,
  restoreAuthReturnPathAfterCallback,
} from './auth-return-path';
import { createBrowserSupabaseClient, getBrowserSupabasePublicConfig } from './supabase-client';
import { createDomainSessionClient, type DomainSessionClient } from './domain-session-client';

interface AuthProviderProps {
  children: ReactNode;
  client?: SupabaseAuthClient | null;
  domainSessionClient?: DomainSessionClient | null;
}

interface AuthContextValue {
  state: AuthState;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export interface SupabaseAuthClient {
  auth: {
    getSession: () => Promise<SupabaseSessionResponse>;
    onAuthStateChange: (callback: SupabaseAuthStateChangeCallback) => SupabaseSubscriptionResponse;
    signInWithPassword: (credentials: SupabaseEmailPasswordCredentials) => Promise<SupabaseSessionResponse>;
    signUp: (credentials: SupabaseSignUpCredentials) => Promise<SupabaseSessionResponse>;
    signOut: () => Promise<{ error: SupabaseAuthError | null }>;
  };
}

interface SupabaseEmailPasswordCredentials {
  email: string;
  password: string;
}

interface SupabaseSignUpCredentials extends SupabaseEmailPasswordCredentials {
  options?: {
    emailRedirectTo?: string;
  };
}

type SupabaseAuthStateChangeCallback = (event: string, session: SupabaseAuthSession | null) => void;

interface SupabaseSessionResponse {
  data: {
    session: SupabaseAuthSession | null;
  };
  error: SupabaseAuthError | null;
}

interface SupabaseSubscriptionResponse {
  data: {
    subscription: {
      unsubscribe: () => void;
    };
  };
}

interface SupabaseAuthError {
  message: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, client, domainSessionClient }: AuthProviderProps) {
  const [authClient] = useState<SupabaseAuthClient | null>(() => {
    if (client !== undefined) {
      return client;
    }

    const config = getBrowserSupabasePublicConfig();
    if (!config) {
      return null;
    }

    try {
      return createBrowserSupabaseClient(config) as SupabaseAuthClient;
    } catch {
      return null;
    }
  });
  const [state, setState] = useState<AuthState>(() => ({
    ...anonymousAuthState,
    configured: authClient !== null,
    status: authClient ? 'loading' : 'anonymous',
  }));
  const [domainClient] = useState<DomainSessionClient | null>(() => {
    if (domainSessionClient !== undefined) {
      return domainSessionClient;
    }
    if (client !== undefined) {
      return null;
    }
    return createDomainSessionClient();
  });
  const callbackRestoreFailedRef = useRef(false);
  const lastDomainSessionAccessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authClient) {
      setState(anonymousAuthState);
      return undefined;
    }

    let active = true;
    let authEventVersion = 0;

    const callbackError = readAuthCallbackError();
    if (callbackError) {
      clearAuthReturnPath();
      clearAuthCallbackLocation();
      setState(createAuthErrorState(callbackError));
    } else {
      authClient.auth.getSession()
        .then(async ({ data, error }) => {
          if (!active || authEventVersion > 0) {
            return;
          }

          if (error) {
            if (isCurrentLocationAuthCallback()) {
              clearAuthReturnPath();
              clearAuthCallbackLocation();
              callbackRestoreFailedRef.current = true;
            }
            setState(createAuthErrorState(error.message));
            return;
          }

          const domainRestore = await restoreDomainSession(domainClient);
          if (!active || authEventVersion > 0) {
            return;
          }

          if (data.session && domainRestore.ok && domainRestore.session === null && domainClient) {
            await authClient.auth.signOut();
            lastDomainSessionAccessTokenRef.current = null;
            setState(createAuthStateFromSession(null));
            return;
          }

          if (data.session && domainRestore.ok && domainRestore.session && domainRestore.session.user.id !== data.session.user.id) {
            await authClient.auth.signOut();
            lastDomainSessionAccessTokenRef.current = null;
            setState(createAuthStateFromDomainSession(domainRestore.session));
            return;
          }

          const nextState = data.session
            ? createAuthStateFromSession(data.session)
            : domainRestore.ok && domainRestore.session
              ? createAuthStateFromDomainSession(domainRestore.session)
              : createAuthStateFromSession(null);
          setState(nextState);
          if (data.session) {
            void syncDomainSession(data.session, domainClient, lastDomainSessionAccessTokenRef).then(syncResult => {
              if (!active || syncResult.ok) {
                return;
              }
              setState(withDomainSessionError(nextState, syncResult.message));
            });
            restoreAuthReturnPathForCurrentLocation();
          } else if (!domainRestore.ok) {
            setState(withDomainSessionError(nextState, domainRestore.message));
          }
        })
        .catch((error: unknown) => {
          if (!active) {
            return;
          }

          if (isCurrentLocationAuthCallback()) {
            clearAuthReturnPath();
            clearAuthCallbackLocation();
            callbackRestoreFailedRef.current = true;
          }
          setState(createAuthErrorState(error instanceof Error ? error.message : 'Auth session restore failed.'));
        });
    }

    const { data } = authClient.auth.onAuthStateChange((event, session) => {
      if (callbackError || callbackRestoreFailedRef.current) {
        return;
      }
      if (event !== 'INITIAL_SESSION') {
        authEventVersion += 1;
      }

      const nextState = createAuthStateFromSession(session);
      setState(nextState);
      if (session && event === 'SIGNED_IN') {
        void syncDomainSession(session, domainClient, lastDomainSessionAccessTokenRef).then(syncResult => {
          if (!syncResult.ok) {
            setState(withDomainSessionError(nextState, syncResult.message));
          }
        });
      }
      if (session && event === 'SIGNED_IN' && isCurrentLocationAuthCallback()) {
        restoreAuthReturnPathForCurrentLocation();
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [authClient, domainClient]);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    signInWithPassword: async (email, password) => {
      if (!authClient) {
        setState(createAuthErrorState('Supabase Auth is not configured.', false));
        return;
      }

      rememberCurrentAuthReturnPath();
      setState((currentState) => ({ ...currentState, status: 'loading', error: null }));
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      const syncResult = !error && data.session ? await syncDomainSession(data.session, domainClient, lastDomainSessionAccessTokenRef) : { ok: true as const };
      if (!error && data.session) {
        clearAuthReturnPath();
      }
      const nextState = error ? createAuthErrorState(error.message) : createAuthStateFromSession(data.session);
      setState(syncResult.ok ? nextState : withDomainSessionError(nextState, syncResult.message));
    },
    signUpWithPassword: async (email, password) => {
      if (!authClient) {
        setState(createAuthErrorState('Supabase Auth is not configured.', false));
        return;
      }

      rememberCurrentAuthReturnPath();
      setState((currentState) => ({ ...currentState, status: 'loading', error: null }));
      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: createAuthCallbackUrl() },
      });
      const syncResult = !error && data.session ? await syncDomainSession(data.session, domainClient, lastDomainSessionAccessTokenRef) : { ok: true as const };
      if (!error && data.session) {
        clearAuthReturnPath();
      }
      const nextState = error ? createAuthErrorState(error.message) : createAuthStateFromSession(data.session);
      setState(syncResult.ok ? nextState : withDomainSessionError(nextState, syncResult.message));
    },
    signOut: async () => {
      if (!authClient) {
        setState(anonymousAuthState);
        return;
      }

      const clearResult = await clearDomainSession(domainClient);
      if (!clearResult.ok) {
        setState(withDomainSessionError(state, clearResult.message));
        return;
      }
      lastDomainSessionAccessTokenRef.current = null;
      const { error } = await authClient.auth.signOut();
      setState(error ? createAuthErrorState(error.message) : createAuthStateFromSession(null));
    },
  }), [authClient, domainClient, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function restoreDomainSession(
  domainClient: DomainSessionClient | null,
): Promise<{ ok: true; session: DomainSessionAuthContext | null } | { ok: false; message: string }> {
  if (!domainClient) {
    return { ok: true, session: null };
  }
  try {
    return { ok: true, session: await domainClient.getSession() };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Pokokit domain session restore failed.',
    };
  }
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}

function restoreAuthReturnPathForCurrentLocation(): string | null {
  return restoreAuthReturnPathAfterCallback({
    requireCallbackLocation: window.location.pathname !== authCallbackPath,
  });
}

function isCurrentLocationAuthCallback(): boolean {
  return window.location.pathname === authCallbackPath || isAuthRedirectCallbackLocation(window.location);
}

async function syncDomainSession(
  session: SupabaseAuthSession,
  domainClient: DomainSessionClient | null,
  lastAccessTokenRef: { current: string | null },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!domainClient) {
    return { ok: true };
  }
  if (session.access_token && session.access_token === lastAccessTokenRef.current) {
    return { ok: true };
  }
  try {
    await domainClient.sync(session);
    lastAccessTokenRef.current = session.access_token ?? null;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Pokokit domain session sync failed.',
    };
  }
}

async function clearDomainSession(domainClient: DomainSessionClient | null): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!domainClient) {
    return { ok: true };
  }
  try {
    await domainClient.clear();
    return { ok: true };
  } catch {
    return { ok: false, message: 'Pokokit domain session clear failed.' };
  }
}

function withDomainSessionError(state: AuthState, message: string): AuthState {
  return {
    ...state,
    error: sanitizeAuthErrorMessage(message),
  };
}
