import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '../../domain/scene';
import {
  autosavedSceneStorageKey,
  savedSceneStorageKey,
  serializeSceneDocument,
  uiPreferencesStorageKey,
  writeSceneDocumentToStorage,
} from '../../io';
import {
  unsafeAngleText,
  unsafeCombinedText,
  unsafeImageText,
  unsafeScriptText,
} from '../../test/fixtures/unsafe-text';
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

  it('stores UI preferences separately without dirtying or polluting saved SceneDocument payloads', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'roof' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show favorite assets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Preview all visible layers' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show preview grid' }));

    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toBeNull();
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved');
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Payload Isolation 5x5 Layout' } });
    await waitFor(() => expect(screen.getByLabelText('Save status')).toHaveTextContent('Dirty'));
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));

    await waitFor(() => {
      const rawSavedPayload = window.localStorage.getItem(savedSceneStorageKey);
      expect(rawSavedPayload).not.toBeNull();
      expect(JSON.parse(rawSavedPayload ?? '{}')).toMatchObject({
        sceneName: 'Payload Isolation 5x5 Layout',
        workspaceState: {
          saveStatus: 'saved',
        },
      });
      expect(rawSavedPayload).not.toContain('assetFilters');
      expect(rawSavedPayload).not.toContain('displayOptions');
      expect(rawSavedPayload).not.toContain('layerScope');
      expect(rawSavedPayload).not.toContain('favoriteOnly');
    });
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

  it('shows recovery errors and keeps the current scene when startup storage is invalid', () => {
    window.localStorage.setItem(
      autosavedSceneStorageKey,
      JSON.stringify({
        schemaVersion: 99,
        sceneId: 'bad-scene',
      }),
    );

    render(<AppShell />);

    expect(screen.getByLabelText('Recovery Validator')).toBeVisible();
    expect(screen.getByLabelText('Recovery error details')).toHaveTextContent('schemaVersion');
    expect(screen.getByLabelText('Scene Name')).toHaveValue('Ditto 5x5 布景草稿');
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('Recovery Validator')).toHaveAttribute('data-recovery-status', 'canceled');
    expect(screen.getByLabelText('Recovery Validator')).toHaveTextContent('Recovery canceled');
    expect(screen.getByLabelText('Scene Name')).toHaveValue('Ditto 5x5 布景草稿');
  });

  it('retries recovery and replaces the scene only after storage becomes valid', async () => {
    window.localStorage.setItem(
      autosavedSceneStorageKey,
      JSON.stringify({
        schemaVersion: 99,
        sceneId: 'bad-scene',
      }),
    );

    render(<AppShell />);
    expect(screen.getByLabelText('Recovery Validator')).toBeVisible();

    writeSceneDocumentToStorage(
      window.localStorage,
      createDefaultSceneDocument({
        sceneId: 'scene-retry-recovery',
        sceneName: 'Retry 5x5 Recovery',
        selectedPokemonKey: 'pikachu',
        selectedCoordinate: { x: 3, y: 3 },
        now: '2026-05-16T08:30:00.000Z',
      }),
      'autosave',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Recovery Validator')).toHaveAttribute('data-recovery-status', 'success');
      expect(screen.getByLabelText('Scene Name')).toHaveValue('Retry 5x5 Recovery');
      expect(screen.getByLabelText(/Cell 3,3, main area, level-0, placeable, selected/)).toBeVisible();
    });
  });

  it('keeps read-only startup and retry from replacing the scene', async () => {
    setViewportWidth(390);
    writeSceneDocumentToStorage(
      window.localStorage,
      createDefaultSceneDocument({
        sceneId: 'scene-readonly-recovery',
        sceneName: 'Blocked 5x5 Recovery',
        selectedPokemonKey: 'pikachu',
        now: '2026-05-16T08:30:00.000Z',
      }),
      'autosave',
    );

    render(<AppShell />);

    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
    expect(screen.getByLabelText('Recovery Validator')).toBeVisible();
    expect(screen.getByLabelText('Recovery error details')).toHaveTextContent('Read-only mode cannot replace');
    expect(screen.getByLabelText('Scene Name')).toHaveValue('Ditto 5x5 布景草稿');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Recovery Validator')).toBeVisible();
      expect(screen.getByLabelText('Scene Name')).toHaveValue('Ditto 5x5 布景草稿');
      expect(screen.getByLabelText('Save status')).toHaveTextContent('Read-only · Saved');
    });
  });

  it('renders unsafe RecoveryError values as text and preserves scene state after cancel', async () => {
    window.localStorage.setItem(
      autosavedSceneStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        sceneId: 'bad-unsafe-scene',
        sceneName: 'Unsafe 5x5 error',
        selectedPokemonKey: unsafeCombinedText,
      }),
    );

    render(<AppShell />);

    const validator = screen.getByLabelText('Recovery Validator');
    const details = screen.getByLabelText('Recovery error details');
    expect(validator).toHaveAttribute('data-recovery-status', 'error');
    expect(details).toHaveTextContent(unsafeCombinedText);
    expect(details.querySelector('script')).toBeNull();
    expect(details.querySelector('img')).toBeNull();
    expect(screen.getByLabelText('Scene Name')).toHaveValue('Ditto 5x5 布景草稿');
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Saved');

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Current Dirty 5x5 Layout' } });
    fireEvent.click(screen.getByRole('button', { name: /Set 1 层 as current building layer/ }));
    await waitFor(() => {
      const levelOneBefore = screen.getByLabelText('L1, 1 层, 0 instances, visible, unlocked, current editing layer');
      expect(levelOneBefore).toHaveAttribute('data-current', 'true');
      expect(levelOneBefore).toHaveAttribute('data-locked', 'false');
      expect(screen.getByLabelText('Save status')).toHaveTextContent('Dirty');
    });
    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-1, placeable'));
    await waitFor(() => {
      expect(screen.getByLabelText('Cell 2,3, main area, level-1, placeable, selected')).toBeVisible();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('Recovery Validator')).toHaveAttribute('data-recovery-status', 'canceled');
    expect(screen.getByLabelText('Scene Name')).toHaveValue('Current Dirty 5x5 Layout');
    expect(screen.getByLabelText('Save status')).toHaveTextContent('Dirty');
    const levelOneAfter = screen.getByLabelText('L1, 1 层, 0 instances, visible, unlocked, current editing layer');
    expect(levelOneAfter).toHaveAttribute('data-current', 'true');
    expect(levelOneAfter).toHaveAttribute('data-locked', 'false');
    expect(screen.getByLabelText('Cell 2,3, main area, level-1, placeable, selected')).toBeVisible();
  });

  it('recovers unsafe scene text as plain text without inserting executable DOM nodes', async () => {
    const unsafeScene = createDefaultSceneDocument({
      sceneId: 'scene-unsafe-recovery',
      sceneName: `Unsafe 5x5 ${unsafeAngleText}`,
      selectedCoordinate: { x: 2, y: 2 },
      now: '2026-05-16T08:30:00.000Z',
    });
    window.localStorage.setItem(
      autosavedSceneStorageKey,
      JSON.stringify({
        ...serializeSceneDocument({
          ...unsafeScene,
          tileInstances: [
            createTileInstance({
              instanceId: 'tile-unsafe-note',
              assetId: 'garden-plant',
              coordinate: { x: 2, y: 2 },
              buildingLevelId: 'level-0',
              requiresSkill: true,
              skillType: '树叶',
              skillNote: unsafeScriptText,
              note: unsafeImageText,
            }),
          ],
        }),
      }),
    );

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByLabelText('Scene Name')).toHaveValue(`Unsafe 5x5 ${unsafeAngleText}`);
      expect(screen.getByLabelText('Selected instance note')).toHaveTextContent(unsafeImageText);
      expect(screen.getByLabelText('Selected instance skill note')).toHaveTextContent(unsafeScriptText);
      expect(document.querySelector('script')).toBeNull();
      expect(document.querySelector('img[src="x"]')).toBeNull();
    });
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
