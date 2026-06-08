import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  anonymousAuthState,
  createAuthErrorState,
  createAuthStateFromSession,
  type AuthState,
  type SupabaseAuthSession,
} from './auth-state';
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
    onAuthStateChange: (
      callback: (event: string, session: SupabaseAuthSession | null) => void,
    ) => SupabaseSubscriptionResponse;
    signInWithPassword: (credentials: SupabaseEmailPasswordCredentials) => Promise<SupabaseSessionResponse>;
    signUp: (credentials: SupabaseEmailPasswordCredentials) => Promise<SupabaseSessionResponse>;
    signOut: () => Promise<{ error: SupabaseAuthError | null }>;
  };
}

interface SupabaseEmailPasswordCredentials {
  email: string;
  password: string;
}

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

  useEffect(() => {
    if (!authClient) {
      setState(anonymousAuthState);
      return undefined;
    }

    let active = true;

    authClient.auth.getSession()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        setState(error
          ? createAuthErrorState(error.message)
          : createAuthStateFromSession(data.session));
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }

        setState(createAuthErrorState(error instanceof Error ? error.message : 'Auth session restore failed.'));
      });

    const { data } = authClient.auth.onAuthStateChange((_event, session) => {
      setState(createAuthStateFromSession(session));
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

      setState((currentState) => ({ ...currentState, status: 'loading', error: null }));
      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      setState(error ? createAuthErrorState(error.message) : createAuthStateFromSession(data.session));
    },
    signUpWithPassword: async (email, password) => {
      if (!authClient) {
        setState(createAuthErrorState('Supabase Auth is not configured.', false));
        return;
      }

      setState((currentState) => ({ ...currentState, status: 'loading', error: null }));
      const { data, error } = await authClient.auth.signUp({ email, password });
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
