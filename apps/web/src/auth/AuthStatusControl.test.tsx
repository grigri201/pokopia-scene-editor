import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, type SupabaseAuthClient } from './AuthProvider';
import { AuthStatusControl, getAuthStatusPopoverPlacement } from './AuthStatusControl';
import { authReturnPathStorageKey } from './auth-return-path';
import type { DomainSessionAuthContext, SupabaseAuthSession } from './auth-state';
import type { DomainSessionClient } from './domain-session-client';

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
    const domainSessionClient = createDomainSessionClientMock({ restoreSession: createDomainSession('user-1') });
    window.localStorage.setItem('pokopia.sceneDocument.autosave.v1', '{"schemaVersion":1}');

    render(
      <AuthProvider client={client} domainSessionClient={domainSessionClient}>
        <AuthStatusControl locale="zh-CN" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 已登录' })).toBeVisible();
    });
    await waitFor(() => {
      expect(domainSessionClient.sync).toHaveBeenCalledWith(session);
    });

    fireEvent.click(screen.getByRole('button', { name: '账号: 已登录' }));
    expect(screen.getByRole('dialog', { name: '账号' })).toHaveTextContent('user@example.com');

    fireEvent.click(screen.getByRole('button', { name: '登出' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 登录' })).toBeVisible();
    });
    expect(domainSessionClient.clear).toHaveBeenCalled();
    expect(window.localStorage.getItem('pokopia.sceneDocument.autosave.v1')).toBe('{"schemaVersion":1}');
  });

  it('restores a signed-in account from the Pokokit domain session when Supabase storage is empty', async () => {
    const client = createAuthClient();
    const domainSessionClient = createDomainSessionClientMock({ restoreSession: createDomainSession('domain-user') });

    render(
      <AuthProvider client={client} domainSessionClient={domainSessionClient}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Signed in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Signed in' }));
    expect(screen.getByRole('dialog', { name: 'Account' })).toHaveTextContent('domain-user');
    expect(domainSessionClient.getSession).toHaveBeenCalled();
    expect(domainSessionClient.sync).not.toHaveBeenCalled();
  });

  it('shows expired sessions with the sign-in form available', async () => {
    const expiredSession = createSession('expired-user', 'expired@example.com', Math.floor(Date.now() / 1000) - 60);
    const client = createAuthClient({ session: expiredSession });

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Session expired' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Session expired' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    expect(dialog).toHaveTextContent('Session expired');
    expect(within(dialog).getByLabelText('Email')).toBeVisible();
    expect(within(dialog).getByLabelText('Password')).toBeVisible();
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

  it('calculates a viewport-clamped account dialog placement', () => {
    expect(getAuthStatusPopoverPlacement({
      popoverRect: createRect({ height: 260 }),
      triggerRect: createRect({ bottom: 40, right: 38, top: 8 }),
      viewportHeight: 180,
      viewportWidth: 320,
    })).toEqual({
      left: 12,
      maxHeight: 156,
      top: 12,
      width: 296,
    });
  });

  it('positions the open account dialog inside a narrow viewport', async () => {
    const client = createAuthClient();
    const previousInnerWidth = window.innerWidth;
    const previousInnerHeight = window.innerHeight;
    const rectSpy = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      if (this.classList.contains('auth-status__trigger')) {
        return createRect({ bottom: 40, height: 32, left: 4, right: 38, top: 8, width: 34 });
      }

      if (this.classList.contains('auth-status__popover')) {
        return createRect({ bottom: 308, height: 260, left: -258, right: 38, top: 48, width: 296 });
      }

      return createRect();
    });

    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 180 });

    try {
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

      await waitFor(() => {
        expect(dialog.style.left).toBe('12px');
        expect(dialog.style.top).toBe('12px');
        expect(dialog.style.width).toBe('296px');
        expect(dialog.style.maxHeight).toBe('156px');
      });
    } finally {
      rectSpy.mockRestore();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousInnerWidth });
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: previousInnerHeight });
    }
  });

  it('keeps the account dialog open for inside clicks and hides it for outside clicks', async () => {
    const client = createAuthClient();

    render(
      <div>
        <button type="button">Outside workbench</button>
        <AuthProvider client={client}>
          <AuthStatusControl locale="en-US" />
        </AuthProvider>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Sign in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Sign in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    fireEvent.pointerDown(within(dialog).getByLabelText('Email'));

    expect(screen.getByRole('dialog', { name: 'Account' })).toBeVisible();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside workbench' }));

    expect(screen.queryByRole('dialog', { name: 'Account' })).not.toBeInTheDocument();
  });

  it('signs in with email and password', async () => {
    const signedInSession = createSession('user-2', 'signed-in@example.com');
    const client = createAuthClient({ signInSession: signedInSession });
    const domainSessionClient = createDomainSessionClientMock();

    render(
      <AuthProvider client={client} domainSessionClient={domainSessionClient}>
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
    expect(domainSessionClient.sync).toHaveBeenCalledWith(signedInSession);
  });

  it('keeps a restored signed-in session when domain session sync fails', async () => {
    const session = createSession('domain-failed-user', 'domain-failed@example.com');
    const domainSessionClient = createDomainSessionClientMock({
      restoreSession: createDomainSession('domain-failed-user'),
      syncError: `Pokokit domain session sync failed Bearer eyJdomain.payload.signature with ${'sb_' + 'secret_'}domain_key`,
    });
    const client = createAuthClient({ session });

    render(
      <AuthProvider client={client} domainSessionClient={domainSessionClient}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Signed in' })).toBeVisible();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Account: Signed in' }));

    const dialog = screen.getByRole('dialog', { name: 'Account' });
    await waitFor(() => {
      expect(dialog).toHaveTextContent('Pokokit domain session sync failed');
      expect(dialog).toHaveTextContent('Bearer [redacted]');
      expect(dialog).toHaveTextContent(`${'sb_' + 'secret_'}[redacted]`);
    });
    expect(dialog).toHaveTextContent('domain-failed@example.com');
    expect(dialog).not.toHaveTextContent('eyJdomain');
    expect(dialog).not.toHaveTextContent('domain_key');
  });

  it('updates nickname from the signed-in account menu', async () => {
    const client = createAuthClient({ session: createSession('profile-user', 'profile@example.com') });
    const domainSessionClient = createDomainSessionClientMock({
      restoreSession: createDomainSession('profile-user'),
      profileSession: createDomainSession('profile-user', 'Old Panda'),
      updatedProfileSession: createDomainSession('profile-user', 'New Panda'),
    });

    render(
      <AuthProvider client={client} domainSessionClient={domainSessionClient}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Signed in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Signed in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });

    await waitFor(() => {
      expect(within(dialog).getByLabelText('Nickname')).toHaveValue('Old Panda');
    });
    fireEvent.change(within(dialog).getByLabelText('Nickname'), { target: { value: 'New Panda' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save nickname' }));

    await waitFor(() => {
      expect(domainSessionClient.updateProfile).toHaveBeenCalledWith('New Panda', 'profile-user-access-token');
    });
    expect(await within(dialog).findByText('Nickname saved')).toBeVisible();
    expect(within(dialog).getByText('New Panda')).toBeVisible();
  });

  it('does not show a saved notice when nickname update fails', async () => {
    const client = createAuthClient({ session: createSession('profile-error-user', 'profile-error@example.com') });
    const domainSessionClient = createDomainSessionClientMock({
      restoreSession: createDomainSession('profile-error-user'),
      profileSession: createDomainSession('profile-error-user', 'Old Panda'),
      updateProfileError: 'Pokokit profile update failed.',
    });

    render(
      <AuthProvider client={client} domainSessionClient={domainSessionClient}>
        <AuthStatusControl locale="en-US" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Account: Signed in' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Account: Signed in' }));
    const dialog = screen.getByRole('dialog', { name: 'Account' });
    await waitFor(() => {
      expect(within(dialog).getByLabelText('Nickname')).toHaveValue('Old Panda');
    });

    fireEvent.change(within(dialog).getByLabelText('Nickname'), { target: { value: 'New Panda' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save nickname' }));

    await waitFor(() => {
      expect(dialog).toHaveTextContent('Pokokit profile update failed.');
    });
    expect(within(dialog).queryByText('Nickname saved')).not.toBeInTheDocument();
  });

  it('shows a signing-in state while the password sign-in request is pending', async () => {
    const signInBarrier = createDeferred<void>();
    const client = createAuthClient({ signInBeforeResponse: signInBarrier.promise });

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="zh-CN" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 登录' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: '账号: 登录' }));
    const dialog = screen.getByRole('dialog', { name: '账号' });
    fireEvent.change(within(dialog).getByLabelText('邮箱'), { target: { value: 'pending-signin@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: '登录' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 登录中' })).toBeVisible();
    });
    expect(dialog).toHaveTextContent('登录中');
    expect(within(dialog).getByRole('button', { name: '登录中' })).toBeDisabled();
    expect(within(dialog).getByLabelText('邮箱')).toBeDisabled();

    signInBarrier.resolve();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 已登录' })).toBeVisible();
    });
  });

  it('shows a signing-up state while the password sign-up request is pending', async () => {
    const signUpBarrier = createDeferred<void>();
    const client = createAuthClient({ signUpBeforeResponse: signUpBarrier.promise });

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="zh-CN" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 登录' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: '账号: 登录' }));
    const dialog = screen.getByRole('dialog', { name: '账号' });
    fireEvent.click(within(dialog).getByRole('button', { name: '注册' }));
    fireEvent.change(within(dialog).getByLabelText('邮箱'), { target: { value: 'pending-signup@example.com' } });
    fireEvent.change(within(dialog).getByLabelText('昵称'), { target: { value: '待处理用户' } });
    fireEvent.change(within(dialog).getByLabelText('密码'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: '注册' }).at(-1)!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 注册中' })).toBeVisible();
    });
    expect(dialog).toHaveTextContent('注册中');
    expect(within(dialog).getByRole('button', { name: '注册中' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '登录' })).toBeDisabled();
    expect(within(dialog).getByLabelText('昵称')).toBeDisabled();

    signUpBarrier.resolve();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 已登录' })).toBeVisible();
    });
  });

  it('shows a signing-out state while sign-out is pending', async () => {
    const signOutBarrier = createDeferred<void>();
    const client = createAuthClient({
      session: createSession('signout-user', 'signout@example.com'),
      signOutBeforeResponse: signOutBarrier.promise,
    });

    render(
      <AuthProvider client={client}>
        <AuthStatusControl locale="zh-CN" />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 已登录' })).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: '账号: 已登录' }));
    const dialog = screen.getByRole('dialog', { name: '账号' });
    fireEvent.click(within(dialog).getByRole('button', { name: '登出' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 登出中' })).toBeVisible();
    });
    expect(dialog).toHaveTextContent('登出中');
    expect(within(dialog).getByRole('button', { name: '登出中' })).toBeDisabled();

    signOutBarrier.resolve();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '账号: 登录' })).toBeVisible();
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
    fireEvent.change(within(dialog).getByLabelText('Nickname'), { target: { value: 'Pixel Panda' } });
    fireEvent.change(within(dialog).getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Sign up' }).at(-1)!);

    await waitFor(() => {
      expect(client.auth.signUp).toHaveBeenCalled();
    });
    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'redirect-signup@example.com',
      password: 'password123',
      options: {
        data: {
          nickname: 'Pixel Panda',
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
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
  signInBeforeResponse?: Promise<void>;
  signUpBeforeResponse?: Promise<void>;
  signOutBeforeResponse?: Promise<void>;
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
        await options.signInBeforeResponse;

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
        await options.signUpBeforeResponse;

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
        await options.signOutBeforeResponse;

        currentSession = null;
        notify('SIGNED_OUT');
        return { error: null };
      }),
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, reject, resolve };
}

function createDomainSessionClientMock(options: {
  restoreSession?: DomainSessionAuthContext | null;
  profileSession?: DomainSessionAuthContext;
  updatedProfileSession?: DomainSessionAuthContext;
  restoreError?: string;
  profileError?: string;
  updateProfileError?: string;
  syncError?: string;
  clearError?: string;
} = {}) {
  return {
    getSession: vi.fn(async () => {
      if (options.restoreError) {
        throw new Error(options.restoreError);
      }
      return options.restoreSession ?? null;
    }),
    getProfile: vi.fn(async () => {
      if (options.profileError) {
        throw new Error(options.profileError);
      }
      return options.profileSession ?? options.restoreSession ?? createDomainSession('profile-user');
    }),
    sync: vi.fn(async (_session: SupabaseAuthSession) => {
      if (options.syncError) {
        throw new Error(options.syncError);
      }
    }),
    updateProfile: vi.fn(async () => {
      if (options.updateProfileError) {
        throw new Error(options.updateProfileError);
      }
      return options.updatedProfileSession ?? options.profileSession ?? options.restoreSession ?? createDomainSession('profile-user');
    }),
    clear: vi.fn(async () => {
      if (options.clearError) {
        throw new Error(options.clearError);
      }
    }),
  } satisfies DomainSessionClient;
}

function createDomainSession(id: string, nickname: string | null = null): DomainSessionAuthContext {
  return {
    user: {
      id,
      nickname,
    },
  };
}

function createSession(
  id: string,
  email: string,
  expiresAt = Math.floor(Date.now() / 1000) + 3600,
): SupabaseAuthSession {
  return {
    user: { id, email },
    access_token: `${id}-access-token`,
    expires_at: expiresAt,
  };
}

function createRect(rect: Partial<DOMRectReadOnly> = {}): DOMRect {
  const left = rect.left ?? 0;
  const top = rect.top ?? 0;
  const width = rect.width ?? 0;
  const height = rect.height ?? 0;
  return {
    bottom: rect.bottom ?? top + height,
    height,
    left,
    right: rect.right ?? left + width,
    top,
    width,
    x: rect.x ?? left,
    y: rect.y ?? top,
    toJSON: () => ({}),
  };
}
