import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  anonymousAuthState,
  createAuthErrorState,
  createAuthStateFromSession,
  type AuthState,
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

interface AuthProviderProps {
  children: ReactNode;
  client?: SupabaseAuthClient | null;
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

export function AuthProvider({ children, client }: AuthProviderProps) {
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
  const callbackRestoreFailedRef = useRef(false);

  useEffect(() => {
    if (!authClient) {
      setState(anonymousAuthState);
      return undefined;
    }

    let active = true;

    const callbackError = readAuthCallbackError();
    if (callbackError) {
      clearAuthReturnPath();
      clearAuthCallbackLocation();
      setState(createAuthErrorState(callbackError));
    } else {
      authClient.auth.getSession()
        .then(({ data, error }) => {
          if (!active) {
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

          setState(createAuthStateFromSession(data.session));
          if (data.session) {
            restoreAuthReturnPathForCurrentLocation();
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

      setState(createAuthStateFromSession(session));
      if (session && event === 'SIGNED_IN' && isCurrentLocationAuthCallback()) {
        restoreAuthReturnPathForCurrentLocation();
      }
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [authClient]);

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
      if (!error && data.session) {
        clearAuthReturnPath();
      }
      setState(error ? createAuthErrorState(error.message) : createAuthStateFromSession(data.session));
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
      if (!error && data.session) {
        clearAuthReturnPath();
      }
      setState(error ? createAuthErrorState(error.message) : createAuthStateFromSession(data.session));
    },
    signOut: async () => {
      if (!authClient) {
        setState(anonymousAuthState);
        return;
      }

      const { error } = await authClient.auth.signOut();
      setState(error ? createAuthErrorState(error.message) : createAuthStateFromSession(null));
    },
  }), [authClient, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
