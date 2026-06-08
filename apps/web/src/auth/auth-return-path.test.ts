import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authReturnPathRestoredEvent,
  authReturnPathStorageKey,
  clearAuthCallbackLocation,
  consumeAuthReturnPath,
  isAuthRedirectCallbackLocation,
  rememberCurrentAuthReturnPath,
  restoreAuthReturnPathAfterCallback,
} from './auth-return-path';

describe('auth return path', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
  });

  it('records the current path, query and hash in dedicated auth storage', () => {
    window.history.replaceState(null, '', '/editor?scene_id=82AY&tab=assets#L2');

    expect(rememberCurrentAuthReturnPath()).toBe('/editor?scene_id=82AY&tab=assets#L2');
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBe('/editor?scene_id=82AY&tab=assets#L2');
    expect(window.localStorage.getItem(authReturnPathStorageKey)).toBeNull();
  });

  it('does not record auth callback URLs as return paths', () => {
    window.history.replaceState(null, '', '/auth/callback?error=server_error');

    expect(rememberCurrentAuthReturnPath()).toBeNull();
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
  });

  it('clears auth callback markers from the current URL', () => {
    window.history.replaceState(null, '', '/auth/callback?error=server_error#error=hash_error');

    clearAuthCallbackLocation();

    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/auth/callback');
  });

  it('consumes only same-origin local return paths', () => {
    window.sessionStorage.setItem(authReturnPathStorageKey, '//evil.test/path');
    expect(consumeAuthReturnPath()).toBeNull();
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();

    window.sessionStorage.setItem(authReturnPathStorageKey, 'https://evil.test/path');
    expect(consumeAuthReturnPath()).toBeNull();

    window.sessionStorage.setItem(authReturnPathStorageKey, '/scene-editor?scene_id=fixture#preview');
    expect(consumeAuthReturnPath()).toBe('/scene-editor?scene_id=fixture#preview');
  });

  it('detects Supabase auth redirect callback markers in query or hash without accepting ordinary type filters', () => {
    expect(isAuthRedirectCallbackLocation({ search: '?code=auth-code', hash: '' })).toBe(true);
    expect(isAuthRedirectCallbackLocation({ search: '?token_hash=hash&type=email', hash: '' })).toBe(true);
    expect(isAuthRedirectCallbackLocation({ search: '', hash: '#access_token=token&refresh_token=refresh' })).toBe(true);
    expect(isAuthRedirectCallbackLocation({ search: '?scene_id=fixture', hash: '#layers' })).toBe(false);
    expect(isAuthRedirectCallbackLocation({ search: '?type=grass', hash: '' })).toBe(false);
  });

  it('restores the return path after successful auth callback and dispatches a browser event', () => {
    const restoredListener = vi.fn();
    window.addEventListener(authReturnPathRestoredEvent, restoredListener);
    window.sessionStorage.setItem(authReturnPathStorageKey, '/editor?scene_id=fixture#layers');
    window.history.replaceState(null, '', '/auth/callback?code=auth-code');

    expect(restoreAuthReturnPathAfterCallback()).toBe('/editor?scene_id=fixture#layers');
    expect(`${window.location.pathname}${window.location.search}${window.location.hash}`).toBe('/editor?scene_id=fixture#layers');
    expect(window.sessionStorage.getItem(authReturnPathStorageKey)).toBeNull();
    expect(restoredListener).toHaveBeenCalledTimes(1);

    window.removeEventListener(authReturnPathRestoredEvent, restoredListener);
  });
});
