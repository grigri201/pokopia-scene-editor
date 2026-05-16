import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  autosavedSceneStorageKey,
  savedSceneStorageKey,
} from '../../io';
import { AppShell } from './AppShell';

describe('AppShell scene storage integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('saves the editable scene and restores it after the app remounts', async () => {
    const { unmount } = render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Saved 5x5 Layout' } });
    await waitFor(() => expect(screen.getByLabelText('Save status')).toHaveTextContent('Dirty'));
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));

    await waitFor(() => expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved'));
    const rawSavedPayload = window.localStorage.getItem(savedSceneStorageKey);
    expect(rawSavedPayload).not.toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBe(rawSavedPayload);
    expect(JSON.parse(rawSavedPayload ?? '{}')).toMatchObject({
      sceneName: 'Saved 5x5 Layout',
      workspaceState: {
        saveStatus: 'saved',
      },
    });

    unmount();
    render(<AppShell />);

    expect(screen.getByLabelText('Scene Name')).toHaveValue('Saved 5x5 Layout');
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved');
  }, 10_000);

  it('autosaves dirty edits without marking them saved', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Autosaved 5x5 Layout' } });

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        sceneName: 'Autosaved 5x5 Layout',
        workspaceState: {
          saveStatus: 'dirty',
        },
      });
    });
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Dirty');
  });

  it('autosaves workspace selection changes even when the scene remains saved', async () => {
    const { unmount } = render(<AppShell />);

    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-0, placeable'));

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        workspaceState: {
          selectedCoordinate: { x: 2, y: 3 },
          saveStatus: 'saved',
        },
      });
    });
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved');

    unmount();
    render(<AppShell />);

    expect(screen.getByLabelText(/Cell 2,3, main area, level-0, placeable, selected/)).toBeVisible();
  });

  it('does not create an extra undo step for saving', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Undo Check 5x5 Layout' } });
    await waitFor(() => expect(screen.getByLabelText('Save status')).toHaveTextContent('Dirty'));
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));
    await waitFor(() => expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved'));

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => expect(screen.getByLabelText('Scene Name')).toHaveValue('Ditto 5x5 布景草稿'));
    await waitFor(() => expect(screen.getByLabelText('Save status')).toHaveTextContent('Dirty'));
    expect(screen.getByRole('button', { name: 'Save scene' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved');
      expect(JSON.parse(window.localStorage.getItem(savedSceneStorageKey) ?? '{}')).toMatchObject({
        sceneName: 'Ditto 5x5 布景草稿',
        workspaceState: {
          saveStatus: 'saved',
        },
      });
    });
  });

  it('keeps mobile view-only mode from writing scene storage', () => {
    setViewportWidth(390);

    render(<AppShell />);

    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
    expect(screen.getByRole('button', { name: 'Save scene' })).toBeDisabled();
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Read-only · Saved');
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
  });
});

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  window.dispatchEvent(new Event('resize'));
}
