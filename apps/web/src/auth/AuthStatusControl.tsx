import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import type { Locale } from '../i18n';
import { useAuth } from './AuthProvider';

interface AuthStatusControlProps {
  locale: Locale;
}

type AuthFormMode = 'sign-in' | 'sign-up';
type AuthPendingAction = AuthFormMode | 'sign-out' | 'nickname';

const authPopoverViewportMargin = 12;
const authPopoverTriggerGap = 8;
const authPopoverPreferredWidth = 300;

const labels = {
  'zh-CN': {
    account: '账号',
    anonymous: '未登录',
    configuredAnonymous: '登录',
    disabled: '身份未配置',
    email: '邮箱',
    error: '登录异常',
    expired: '登录已过期',
    loading: '读取登录状态',
    nickname: '昵称',
    nicknameSaved: '昵称已保存',
    password: '密码',
    saveNickname: '保存昵称',
    savingNickname: '保存中',
    signedIn: '已登录',
    signIn: '登录',
    signingIn: '登录中',
    signOut: '登出',
    signingOut: '登出中',
    signUp: '注册',
    signingUp: '注册中',
    submitSignIn: '登录',
    submitSignUp: '注册',
  },
  'en-US': {
    account: 'Account',
    anonymous: 'Signed out',
    configuredAnonymous: 'Sign in',
    disabled: 'Auth not configured',
    email: 'Email',
    error: 'Auth error',
    expired: 'Session expired',
    loading: 'Loading account',
    nickname: 'Nickname',
    nicknameSaved: 'Nickname saved',
    password: 'Password',
    saveNickname: 'Save nickname',
    savingNickname: 'Saving',
    signedIn: 'Signed in',
    signIn: 'Sign in',
    signingIn: 'Signing in',
    signOut: 'Sign out',
    signingOut: 'Signing out',
    signUp: 'Sign up',
    signingUp: 'Signing up',
    submitSignIn: 'Sign in',
    submitSignUp: 'Sign up',
  },
} as const;

export function AuthStatusControl({ locale }: AuthStatusControlProps) {
  const { state, signInWithPassword, signOut, signUpWithPassword, updateNickname } = useAuth();
  const text = labels[locale];
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthFormMode>('sign-in');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [profileNickname, setProfileNickname] = useState('');
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [pendingAction, setPendingAction] = useState<AuthPendingAction | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>();

  const identityLabel = state.user?.nickname ?? state.user?.email ?? state.user?.id ?? text.anonymous;
  const identityDetail = state.user?.email ?? state.user?.id ?? text.anonymous;
  const canUseAuthForm = state.configured && state.status !== 'authenticated';
  const statusLabel = getStatusLabel(state.status, state.configured, text);
  const pendingLabel = pendingAction ? getPendingActionLabel(pendingAction, text) : null;
  const displayStatusLabel = pendingLabel ?? statusLabel;
  const authActionPending = pendingAction !== null;

  const submitAuthForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (authActionPending || !email || !password) {
      return;
    }

    const action = mode;
    setPendingAction(action);

    try {
      if (action === 'sign-in') {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password, normalizeNickname(nickname, email));
      }
    } finally {
      setPendingAction(null);
    }
  };

  const submitSignOut = async () => {
    if (authActionPending) {
      return;
    }

    setPendingAction('sign-out');

    try {
      await signOut();
    } finally {
      setPendingAction(null);
    }
  };

  const submitNickname = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (authActionPending || !profileNickname.trim()) {
      return;
    }

    setProfileNotice(null);
    setPendingAction('nickname');

    try {
      await updateNickname(profileNickname);
      setProfileNotice(text.nicknameSaved);
    } catch {
      // The provider owns the sanitized error state shown in the same popover.
    } finally {
      setPendingAction(null);
    }
  };

  useEffect(() => {
    if (pendingAction === 'nickname') {
      return;
    }
    setProfileNickname(state.user?.nickname ?? '');
  }, [pendingAction, state.user?.id, state.user?.nickname]);

  useEffect(() => {
    setProfileNotice(null);
  }, [state.user?.id]);

  const closePopoverOnOutsidePointerDown = useCallback((event: PointerEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (popoverRef.current?.contains(target) || triggerRef.current?.contains(target)) {
      return;
    }

    setOpen(false);
  }, []);

  const updatePopoverPosition = useCallback(() => {
    if (!open || !triggerRef.current || !popoverRef.current || typeof window === 'undefined') {
      return;
    }

    const placement = getAuthStatusPopoverPlacement({
      popoverRect: popoverRef.current.getBoundingClientRect(),
      triggerRect: triggerRef.current.getBoundingClientRect(),
      viewportHeight: window.visualViewport?.height ?? window.innerHeight,
      viewportWidth: window.visualViewport?.width ?? window.innerWidth,
    });

    setPopoverStyle({
      left: `${placement.left}px`,
      maxHeight: `${placement.maxHeight}px`,
      top: `${placement.top}px`,
      width: `${placement.width}px`,
    });
  }, [open]);

  useLayoutEffect(() => {
    if (!open || typeof window === 'undefined') {
      setPopoverStyle(undefined);
      return;
    }

    updatePopoverPosition();

    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    window.visualViewport?.addEventListener('resize', updatePopoverPosition);
    window.visualViewport?.addEventListener('scroll', updatePopoverPosition);

    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
      window.visualViewport?.removeEventListener('resize', updatePopoverPosition);
      window.visualViewport?.removeEventListener('scroll', updatePopoverPosition);
    };
  }, [locale, mode, open, pendingAction, state.configured, state.error, state.status, updatePopoverPosition]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('pointerdown', closePopoverOnOutsidePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', closePopoverOnOutsidePointerDown, true);
    };
  }, [closePopoverOnOutsidePointerDown, open]);

  return (
    <div className="auth-status" data-auth-status={state.status}>
      <button
        type="button"
        className="auth-status__trigger has-icon-tooltip"
        ref={triggerRef}
        aria-label={`${text.account}: ${displayStatusLabel}`}
        title={displayStatusLabel}
        data-tooltip={displayStatusLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <AccountIcon />
        <span className="auth-status__text">{statusLabel}</span>
      </button>
      {open ? (
        <div
          className="auth-status__popover"
          ref={popoverRef}
          role="dialog"
          aria-label={text.account}
          aria-busy={authActionPending}
          style={popoverStyle}
        >
          <div className="auth-status__summary">
            <strong>{displayStatusLabel}</strong>
            <span>{state.status === 'authenticated' ? identityLabel : text.anonymous}</span>
            {state.status === 'authenticated' && identityDetail !== identityLabel ? <span>{identityDetail}</span> : null}
          </div>
          {state.error ? <p className="auth-status__error">{state.error}</p> : null}
          {state.status === 'authenticated' ? (
            <>
              <form className="auth-status__form auth-status__profile-form" onSubmit={submitNickname}>
                <label>
                  <span>{text.nickname}</span>
                  <input
                    type="text"
                    autoComplete="nickname"
                    value={profileNickname}
                    disabled={authActionPending}
                    maxLength={80}
                    onChange={(event) => {
                      setProfileNickname(event.target.value);
                      setProfileNotice(null);
                    }}
                  />
                </label>
                <button type="submit" className="auth-status__submit" disabled={authActionPending || !profileNickname.trim()}>
                  {pendingAction === 'nickname' ? text.savingNickname : text.saveNickname}
                </button>
              </form>
              {profileNotice ? <p className="auth-status__notice">{profileNotice}</p> : null}
              <button
                type="button"
                className="auth-status__submit"
                disabled={authActionPending}
                onClick={submitSignOut}
              >
                {pendingAction === 'sign-out' ? text.signingOut : text.signOut}
              </button>
            </>
          ) : null}
          {canUseAuthForm ? (
            <form className="auth-status__form" aria-busy={authActionPending} onSubmit={submitAuthForm}>
              <div className="auth-status__tabs" role="group" aria-label={text.account}>
                <button
                  type="button"
                  className={mode === 'sign-in' ? 'is-active' : undefined}
                  disabled={authActionPending}
                  onClick={() => setMode('sign-in')}
                >
                  {text.signIn}
                </button>
                <button
                  type="button"
                  className={mode === 'sign-up' ? 'is-active' : undefined}
                  disabled={authActionPending}
                  onClick={() => setMode('sign-up')}
                >
                  {text.signUp}
                </button>
              </div>
              <label>
                <span>{text.email}</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={authActionPending}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              {mode === 'sign-up' ? (
                <label>
                  <span>{text.nickname}</span>
                  <input
                    type="text"
                    autoComplete="nickname"
                    value={nickname}
                    disabled={authActionPending}
                    maxLength={80}
                    onChange={(event) => setNickname(event.target.value)}
                  />
                </label>
              ) : null}
              <label>
                <span>{text.password}</span>
                <input
                  type="password"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  value={password}
                  disabled={authActionPending}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="auth-status__submit" disabled={authActionPending}>
                {pendingAction === 'sign-in'
                  ? text.signingIn
                  : pendingAction === 'sign-up'
                    ? text.signingUp
                    : mode === 'sign-in'
                      ? text.submitSignIn
                      : text.submitSignUp}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function normalizeNickname(value: string, email: string): string {
  const nickname = value.trim();
  if (nickname) {
    return nickname;
  }

  return email.trim().split('@')[0]?.trim() || 'pokokit-user';
}

function getStatusLabel(status: string, configured: boolean, text: typeof labels[Locale]) {
  if (!configured) {
    return text.disabled;
  }

  switch (status) {
    case 'authenticated':
      return text.signedIn;
    case 'expired':
      return text.expired;
    case 'error':
      return text.error;
    case 'loading':
      return text.loading;
    default:
      return text.configuredAnonymous;
  }
}

function getPendingActionLabel(action: AuthPendingAction, text: typeof labels[Locale]) {
  switch (action) {
    case 'sign-in':
      return text.signingIn;
    case 'sign-up':
      return text.signingUp;
    case 'sign-out':
      return text.signingOut;
    case 'nickname':
      return text.savingNickname;
  }
}

interface AuthStatusPopoverPlacementInput {
  triggerRect: Pick<DOMRectReadOnly, 'bottom' | 'right' | 'top'>;
  popoverRect: Pick<DOMRectReadOnly, 'height'>;
  viewportWidth: number;
  viewportHeight: number;
}

export function getAuthStatusPopoverPlacement({
  popoverRect,
  triggerRect,
  viewportHeight,
  viewportWidth,
}: AuthStatusPopoverPlacementInput) {
  const availableWidth = Math.max(0, viewportWidth - authPopoverViewportMargin * 2);
  const width = Math.min(authPopoverPreferredWidth, availableWidth);
  const left = clamp(
    triggerRect.right - width,
    authPopoverViewportMargin,
    Math.max(authPopoverViewportMargin, viewportWidth - width - authPopoverViewportMargin),
  );
  const belowTop = triggerRect.bottom + authPopoverTriggerGap;
  const aboveTop = triggerRect.top - authPopoverTriggerGap - popoverRect.height;
  const top = belowTop + popoverRect.height <= viewportHeight - authPopoverViewportMargin
    ? belowTop
    : aboveTop >= authPopoverViewportMargin
      ? aboveTop
      : authPopoverViewportMargin;
  const maxHeight = Math.max(0, viewportHeight - top - authPopoverViewportMargin);

  return {
    left: Math.round(left),
    maxHeight: Math.round(maxHeight),
    top: Math.round(top),
    width: Math.round(width),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.9-4.2 3.2-6.3 6.5-6.3s5.6 2.1 6.5 6.3" />
    </svg>
  );
}
