import { useState, type FormEvent } from 'react';
import type { Locale } from '../i18n';
import { useAuth } from './AuthProvider';

interface AuthStatusControlProps {
  locale: Locale;
}

type AuthFormMode = 'sign-in' | 'sign-up';

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
    password: '密码',
    signedIn: '已登录',
    signIn: '登录',
    signOut: '登出',
    signUp: '注册',
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
    password: 'Password',
    signedIn: 'Signed in',
    signIn: 'Sign in',
    signOut: 'Sign out',
    signUp: 'Sign up',
    submitSignIn: 'Sign in',
    submitSignUp: 'Sign up',
  },
} as const;

export function AuthStatusControl({ locale }: AuthStatusControlProps) {
  const { state, signInWithPassword, signOut, signUpWithPassword } = useAuth();
  const text = labels[locale];
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthFormMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const identityLabel = state.user?.email ?? state.user?.id ?? text.anonymous;
  const canUseAuthForm = state.configured && state.status !== 'authenticated';
  const statusLabel = getStatusLabel(state.status, state.configured, text);

  const submitAuthForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !password) {
      return;
    }

    if (mode === 'sign-in') {
      await signInWithPassword(email, password);
    } else {
      await signUpWithPassword(email, password);
    }
  };

  return (
    <div className="auth-status" data-auth-status={state.status}>
      <button
        type="button"
        className="auth-status__trigger has-icon-tooltip"
        aria-label={`${text.account}: ${statusLabel}`}
        title={statusLabel}
        data-tooltip={statusLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <AccountIcon />
        <span className="auth-status__text">{statusLabel}</span>
      </button>
      {open ? (
        <div className="auth-status__popover" role="dialog" aria-label={text.account}>
          <div className="auth-status__summary">
            <strong>{statusLabel}</strong>
            <span>{state.status === 'authenticated' ? identityLabel : text.anonymous}</span>
          </div>
          {state.error ? <p className="auth-status__error">{state.error}</p> : null}
          {state.status === 'authenticated' ? (
            <button type="button" className="auth-status__submit" onClick={signOut}>
              {text.signOut}
            </button>
          ) : null}
          {canUseAuthForm ? (
            <form className="auth-status__form" onSubmit={submitAuthForm}>
              <div className="auth-status__tabs" role="group" aria-label={text.account}>
                <button
                  type="button"
                  className={mode === 'sign-in' ? 'is-active' : undefined}
                  onClick={() => setMode('sign-in')}
                >
                  {text.signIn}
                </button>
                <button
                  type="button"
                  className={mode === 'sign-up' ? 'is-active' : undefined}
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
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                <span>{text.password}</span>
                <input
                  type="password"
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button type="submit" className="auth-status__submit">
                {mode === 'sign-in' ? text.submitSignIn : text.submitSignUp}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
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

function AccountIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.9-4.2 3.2-6.3 6.5-6.3s5.6 2.1 6.5 6.3" />
    </svg>
  );
}

