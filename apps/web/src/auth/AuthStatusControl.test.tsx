import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, type SupabaseAuthClient } from './AuthProvider';
import { AuthStatusControl } from './AuthStatusControl';
import { authReturnPathStorageKey } from './auth-return-path';
import type { SupabaseAuthSession } from './auth-state';

describe('AuthStatusControl', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('keeps the editor auth entry in anonymous mode when Supabase env is not configured', () => {
    render(
      <AuthProvider client={null}>
        <AuthStatusControl locale="zh-CN" />
      </AuthProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '账号: 身份未配置' }));

    expect(screen.getByRole('dialog', { name: '账号' })).toHaveTextContent('身份未配置');
    expect(screen.queryByLabelText('邮箱')).not.toBeInTheDocument();
  });

  it('restores a signed-in session and signs out without touching scene storage', async () => {
    const session = createSession('user-1', 'user@example.com');
    const client = createAuthClient({ session });
    window.localStorage.setItem('pokopia.sceneDocument.autosave.v1', '{"schemaVersion":1}');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="zh-CN" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 已登录' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: '账号: 已登录' }));
    expect(screen.getByRole('dialog', { name: '账号' })).toHaveTextContent('user@example.com');

    fireEvent.click(screen.getByRole('button', { name: '登出' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 登录' })).toBeVisible();
    });
    expect(window.localStorage.getItem('pokopia.sceneDocument.autosave.v1')).toBe('{"schemaVersion":1}');
  });

  it('shows auth unavailable errors without touching scene storage', async () => {
    const client = createAuthClient({
      getSessionError: `Session restore failed Bearer eyJrestore.payload.signature with ${'sb_' + 'secret_'}restore_key`,
    });
    window.localStorage.setItem('pokopia.sceneDocument.autosave.v1', '{"schemaVersion":1}');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Auth error' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Auth error' }));
    expect(screen.getByRole('dialog', { name: 'Account' })).toHaveTextContent('Session restore failed');
    expect(screen.getByText(/Bearer \[redacted\]/)).toBeVisible();
    expect(screen.getByText(new RegExp(`${'sb_' + 'secret_'}\\[redacted\\]`))).toBeVisible();
    expect(screen.queryByText(/eyJrestore/)).not.toBeInTheDocument();
    expect(screen.queryByText(/restore_key/)).not.toBeInTheDocument();
    expect(window.localStorage.getItem('pokopia.sceneDocument.autosave.v1')).toBe('{"schemaVersion":1}');
  });

  it('keeps signed-out auth state isolated from scene storage', async () => {
    const client = createAuthClient();
    window.localStorage.setItem('pokopia.sceneDocument.autosave.v1', '{"schemaVersion":1}');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Sign in' })).toBeVisible();
    });

    expect(window.localStorage.getItem('pokopia.sceneDocument.autosave.v1')).toBe('{"schemaVersion":1}');
  });

  it('signs in with email and password', async () => {
    const signedInSession = createSession('user-2', 'signed-in@example.com');
    const client = createAuthClient({ signInSession: signedInSession });

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Sign in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Sign in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'signed-in@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Sign in' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Signed in' })).toBeVisible();
    });
    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'signed-in@example.com',
      password: 'password123',
    });
  });

  it('records the current return path before sign-in redirects', async () => {
    const client = createAuthClient({ signInSession: null });
    window.history.replaceState(null, '', '/editor?scene_id=fixture#layers');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Sign in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Sign in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'redirect@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Sign in' }).at(-1)!);

    await waitFor(() => {
      expect(client.auth.signInWithPassword).toHaveBeenCalled();
    });
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBe('/editor?scene_id=fixture#layers');
    expect(window.localStorage.getItem(authReturnPathStorageKey)).toBeNull();
  });

  it('records the current return path before sign-up redirects', async () => {
    const client = createAuthClient({ signUpSession: null });
    window.history.replaceState(null, '', '/signup-start?scene_id=fixture#mobile');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Sign in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Sign in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign up' }));
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'redirect-signup@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Sign up' }).at(-1)!);

    await waitFor(() => {
      expect(client.auth.signUp).toHaveBeenCalled();
    });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'redirect-signup@example.com',
      password: 'password123',
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBe('/signup-start?scene_id=fixture#mobile');
    expect(window.localStorage.getItem(authReturnPathStorageKey)).toBeNull();
  });

  it('restores the recorded path after a successful auth callback session restore', async () => {
    const client = createAuthClient({ session: createSession('callback-user', 'callback@example.com') });
    window.sessionStorage.setItem(authReturnPathStorageKey, '/editor?scene_id=callback-fixture#layers');
    window.history.replaceState(null, '', '/auth/callback?code=auth-code');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Signed in' })).toBeVisible();
    });
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/editor?scene_id=callback-fixture#layers');
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
  });

  it('restores the recorded path when the SDK cleans callback markers before SIGNED_IN arrives', async () => {
    const client = createAuthClient({
      authStateChangeEvent: 'SIGNED_IN',
      authStateChangeSession: createSession('event-callback-user', 'event-callback@example.com'),
    });
    window.sessionStorage.setItem(authReturnPathStorageKey, '/editor?scene_id=event-callback#layers');
    window.history.replaceState(null, '', '/auth/callback');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Signed in' })).toBeVisible();
    });
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/editor?scene_id=event-callback#layers');
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
  });

  it('shows sanitized provider callback errors and clears stale return paths', async () => {
    const client = createAuthClient();
    window.sessionStorage.setItem(authReturnPathStorageKey, '/editor?scene_id=stale-callback');
    window.history.replaceState(
      null,
      '',
      `/auth/callback?error=server_error&error_description=${encodeURIComponent(`Provider failed Bearer eyJcallback.payload.signature with ${'sb_' + 'secret_'}callback_key\n    at callback (/Users/grigri/auth.ts:12:4)`)}`,
    );

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Auth error' })).toBeVisible();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Account: Auth error' }));

    const dialog = screen.getByRole('dialog', { name: 'Account' });
    expect(dialog).toHaveTextContent('Provider failed');
    expect(dialog).toHaveTextContent('Bearer [redacted]');
    expect(dialog).toHaveTextContent(`${'sb_' + 'secret_'}[redacted]`);
    expect(dialog).not.toHaveTextContent('/Users/grigri');
    expect(dialog).not.toHaveTextContent('auth.ts:12:4');
    expect(dialog).not.toHaveTextContent('eyJcallback');
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/auth/callback');
  });

  it('keeps provider callback errors from being overwritten by a later stored session event', async () => {
    const client = createAuthClient({
      authStateChangeEvent: 'INITIAL_SESSION',
      authStateChangeSession: createSession('stored-user', 'stored@example.com'),
    });
    window.sessionStorage.setItem(authReturnPathStorageKey, '/editor?scene_id=stale-callback');
    window.history.replaceState(null, '', '/auth/callback?error=server_error&error_description=Provider%20failed');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Auth error' })).toBeVisible();
    });
    expect(screen.queryByRole('button', { name: 'Account: Signed in' })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
  });

  it('clears stale return paths when callback session restore fails without provider error params', async () => {
    const client = createAuthClient({
      authStateChangeEvent: 'INITIAL_SESSION',
      authStateChangeSession: null,
      getSessionError: 'Session exchange failed.',
    });
    window.sessionStorage.setItem(authReturnPathStorageKey, '/editor?scene_id=failed-code');
    window.history.replaceState(null, '', '/auth/callback?code=auth-code');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Auth error' })).toBeVisible();
    });
    expect(screen.queryByRole('button', { name: 'Account: Sign in' })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/auth/callback');
  });

  it('clears stale return paths when callback session restore rejects', async () => {
    const client = createAuthClient({
      authStateChangeEvent: 'INITIAL_SESSION',
      authStateChangeSession: null,
      getSessionReject: 'Session exchange rejected.',
    });
    window.sessionStorage.setItem(authReturnPathStorageKey, '/editor?scene_id=rejected-code');
    window.history.replaceState(null, '', '/auth/callback?code=auth-code');

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Auth error' })).toBeVisible();
    });
    expect(screen.queryByRole('button', { name: 'Account: Sign in' })).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/auth/callback');
  });

  it('redacts generic token, secret and path-shaped auth error details', async () => {
    const client = createAuthClient({
      signInError: 'Failed access_token=abc123 refresh_token: "refresh value" "token_hash":"hash value" provider_token=provider123 client_secret: "client value" secret=rawsecret password: "pass value" key=key123 at /Users/grigri/My Project/auth.ts and C:\\Users\\grigri\\My Project\\auth.ts',
    });

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Sign in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Sign in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'generic-secret@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Sign in' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Auth error' })).toBeVisible();
    });
    expect(screen.getByText(/access_token=\[redacted\]/)).toBeVisible();
    expect(screen.getByText(/refresh_token: "\[redacted\]"/)).toBeVisible();
    expect(screen.getByText(/"token_hash":"\[redacted\]"/)).toBeVisible();
    expect(screen.getByText(/provider_token=\[redacted\]/)).toBeVisible();
    expect(screen.getByText(/client_secret: "\[redacted\]"/)).toBeVisible();
    expect(screen.getByText(/secret=\[redacted\]/)).toBeVisible();
    expect(screen.getByText(/password: "\[redacted\]"/)).toBeVisible();
    expect(screen.getByText(/key=\[redacted\]/)).toBeVisible();
    expect(screen.queryByText(/abc123|refresh value|hash value|provider123|client value|rawsecret|pass value|key123/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/Users\/grigri/)).not.toBeInTheDocument();
    expect(screen.queryByText(/C:\\Users\\grigri/)).not.toBeInTheDocument();
  });

  it('redacts token-shaped values from auth errors', async () => {
    const client = createAuthClient({
      signInError: `Bad Bearer eyJsecret.payload.signature with ${'sb_' + 'secret_'}should_not_render`,
    });

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Sign in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Sign in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    fireEvent.change(within(dialog).getByLabelText('Email'), { target: { value: 'broken@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Sign in' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Auth error' })).toBeVisible();
    });

    expect(screen.getByText(/Bearer \[redacted\]/)).toBeVisible();
    expect(screen.getByText(new RegExp(`${'sb_' + 'secret_'}\\[redacted\\]`))).toBeVisible();
    expect(screen.queryByText(/eyJsecret/)).not.toBeInTheDocument();
  });
});

function createAuthClient(options: {
  session?: SupabaseAuthSession | null;
  authStateChangeEvent?: string;
  authStateChangeSession?: SupabaseAuthSession | null;
  signInSession?: SupabaseAuthSession | null;
  signUpSession?: SupabaseAuthSession | null;
  signInError?: string;
  getSessionError?: string;
  getSessionReject?: string;
} = {}): SupabaseAuthClient {
  let currentSession = options.session ?? null;
  const subscribers = new Set<(event: string, session: SupabaseAuthSession | null) => void>();
  const notify = (event: string) => {
    for (const subscriber of subscribers) {
      subscriber(event, currentSession);
    }
  };

  return {
    auth: {
      getSession: vi.fn(async () => {
        if (options.getSessionReject) {
          throw new Error(options.getSessionReject);
        }

        return {
          data: { session: currentSession },
          error: options.getSessionError ? { message: options.getSessionError } : null,
        };
      }),
      onAuthStateChange: vi.fn((callback) => {
        subscribers.add(callback);
        if ('authStateChangeSession' in options) {
          queueMicrotask(() => {
            currentSession = options.authStateChangeSession ?? null;
            callback(options.authStateChangeEvent ?? 'SIGNED_IN', currentSession);
          });
        }
        return {
          data: {
            subscription: {
              unsubscribe: () => subscribers.delete(callback),
            },
          },
        };
      }),
      signInWithPassword: vi.fn(async () => {
        if (options.signInError) {
          return {
            data: { session: null },
            error: { message: options.signInError },
          };
        }

        currentSession = 'signInSession' in options
          ? options.signInSession ?? null
          : createSession('signed-in-user', 'signed-in@example.com');
        notify('SIGNED_IN');
        return {
          data: { session: currentSession },
          error: null,
        };
      }),
      signUp: vi.fn(async () => {
        currentSession = 'signUpSession' in options
          ? options.signUpSession ?? null
          : createSession('signed-up-user', 'signed-up@example.com');
        notify('SIGNED_IN');
        return {
          data: { session: currentSession },
          error: null,
        };
      }),
      signOut: vi.fn(async () => {
        currentSession = null;
        notify('SIGNED_OUT');
        return { error: null };
      }),
    },
  };
}

function createSession(id: string, email: string): SupabaseAuthSession {
  return {
    user: { id, email },
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  };
}
