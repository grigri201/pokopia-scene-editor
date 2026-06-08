import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, type SupabaseAuthClient } from './AuthProvider';
import { AuthStatusControl } from './AuthStatusControl';
import type { SupabaseAuthSession } from './auth-state';

describe('AuthStatusControl', () => {
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
  signInSession?: SupabaseAuthSession | null;
  signInError?: string;
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
      getSession: vi.fn(async () => ({
        data: { session: currentSession },
        error: null,
      })),
      onAuthStateChange: vi.fn((callback) => {
        subscribers.add(callback);
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

        currentSession = options.signInSession ?? createSession('signed-in-user', 'signed-in@example.com');
        notify('SIGNED_IN');
        return {
          data: { session: currentSession },
          error: null,
        };
      }),
      signUp: vi.fn(async () => {
        currentSession = createSession('signed-up-user', 'signed-up@example.com');
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
