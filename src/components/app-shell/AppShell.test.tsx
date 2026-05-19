import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  unsafeScriptText,
} from '../../test/fixtures/unsafe-text';
import { AppShell } from './AppShell';

describe('AppShell scene storage integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('autosaves the editable Open Design scene and restores it after remount', async () => {
    const { unmount } = render(<AppShell />);
    const deleteButton = screen.getByRole('button', { name: 'Delete scene' });

    expect(deleteButton.querySelector('svg')).toBeInTheDocument();
    expect(deleteButton).toHaveAttribute('data-tooltip', '删除');
    expect(deleteButton).not.toHaveTextContent('D');
    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save scene from scene controls' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Autosaved Garden Layout' } });
    expectNoSaveStatus();

    let rawAutosavePayload: string | null = null;
    await waitFor(() => {
      rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
    });
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
      sceneName: 'Autosaved Garden Layout',
      selectedPokemonKey: 'pikachu',
    });
    expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState).not.toHaveProperty('saveStatus');

    unmount();
    render(<AppShell />);

    expect(screen.getByLabelText('Scene Name')).toHaveValue('Autosaved Garden Layout');
    expectNoSaveStatus();
  }, 20_000);

  it('places the preview inspector below the canvas next to the current selection item', () => {
    const { container } = render(<AppShell />);

    const lowerInspectors = container.querySelector('.canvas-stage > .canvas-bottom-panels');
    expect(lowerInspectors).toBeInTheDocument();
    expect(lowerInspectors).toHaveAttribute('aria-label', 'Canvas lower inspectors');
    expect(lowerInspectors?.children[0]).toHaveClass('selection-inspector');
    expect(lowerInspectors?.children[1]).toHaveClass('preview-panel');
    expect(container.querySelector('.workbench-left .preview-panel')).toBeNull();
  });

  it('switches the active editing layer when a building level row is clicked', () => {
    render(<AppShell />);

    const roofRow = screen.getByLabelText('L2, 屋顶与遮挡, 5 instances');

    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L1');
    expect(roofRow).not.toHaveAttribute('aria-current');

    fireEvent.click(roofRow);

    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L2');
    expect(roofRow).toHaveAttribute('aria-current', 'true');
    expect(screen.getByLabelText(/Cell 0,0, outer area, level-2/)).toBeVisible();
  }, 15_000);

  it('autosaves dirty edits without writing UI save status into payload', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Autosaved Garden Layout' } });

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        sceneName: 'Autosaved Garden Layout',
      });
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState).not.toHaveProperty('saveStatus');
    });
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expectNoSaveStatus();
  }, 15_000);

  it('shows a non-payload autosave warning when local storage writes fail and clears it after recovery', async () => {
    const originalSetItem = Storage.prototype.setItem;
    let failAutosave = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItemDouble(
      this: Storage,
      key,
      value,
    ) {
      if (key === autosavedSceneStorageKey && failAutosave) {
        throw new Error('Autosave storage quota exceeded.');
      }

      return originalSetItem.call(this, key, value);
    });

    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Blocked Autosave Layout' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Autosave warning')).toHaveAttribute('data-autosave-status', 'error');
      expect(screen.getByLabelText('Autosave warning')).toHaveTextContent('Autosave failed');
    });
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
    expectNoSaveStatus();

    failAutosave = false;
    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Recovered Autosave Layout' } });

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        sceneName: 'Recovered Autosave Layout',
      });
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState).not.toHaveProperty('saveStatus');
      expect(screen.queryByLabelText('Autosave warning')).not.toBeInTheDocument();
    });
  }, 15_000);

  it('restores autosave-only drafts without exposing manual save', async () => {
    writeSceneDocumentToStorage(
      window.localStorage,
      createDefaultSceneDocument({
        sceneId: 'scene-autosave-draft',
        sceneName: 'Autosave Draft Layout',
        selectedPokemonKey: 'pikachu',
        now: '2026-05-16T08:45:00.000Z',
      }),
      'autosave',
    );

    render(<AppShell />);

    expect(screen.getByLabelText('Scene Name')).toHaveValue('Autosave Draft Layout');
    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(autosavedSceneStorageKey) ?? '{}')).toMatchObject({
      sceneId: 'scene-autosave-draft',
      sceneName: 'Autosave Draft Layout',
    });
    expectNoSaveStatus();
  });

  it('autosaves a default selected-asset placement on the current Open Design layer', async () => {
    const { unmount } = render(<AppShell />);

    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-1, placeable'));

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        workspaceState: {
          selectedCoordinate: { x: 2, y: 3 },
        },
      });
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState).not.toHaveProperty('saveStatus');
    });
    expectNoSaveStatus();

    unmount();
    render(<AppShell />);

    const restoredCell = screen.getByLabelText(/Cell 2,3, main area, level-1, placeable, 白木栅栏/);
    expect(restoredCell).toBeVisible();
    expect(restoredCell).toHaveAttribute('aria-selected', 'true');
  });

  it('stores asset filter preferences separately without dirtying or polluting autosaved SceneDocument payloads', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '屋顶' } });
    fireEvent.click(screen.getByLabelText('Show favorite assets'));

    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toBeNull();
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toContain('displayOptions');
    expectNoSaveStatus();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Payload Isolation Layout' } });

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        sceneName: 'Payload Isolation Layout',
      });
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState).not.toHaveProperty('saveStatus');
      expect(rawAutosavePayload).not.toContain('assetFilters');
      expect(rawAutosavePayload).not.toContain('displayOptions');
      expect(rawAutosavePayload).not.toContain('layerScope');
      expect(rawAutosavePayload).not.toContain('favoriteOnly');
    });
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
  });

  it('does not expose undo or redo scene history controls', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Undo Check Layout' } });
    await waitFor(() => expect(window.localStorage.getItem(autosavedSceneStorageKey)).not.toBeNull());

    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(autosavedSceneStorageKey) ?? '{}')).toMatchObject({
      sceneName: 'Undo Check Layout',
    });
  });

  it('keeps mobile view-only mode from writing scene storage', () => {
    setViewportWidth(390);

    render(<AppShell />);

    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();
    expectNoSaveStatus();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
  });

  it('keeps the mobile scene snapshot unchanged for application keyboard events', async () => {
    setViewportWidth(390);

    render(<AppShell />);
    await waitFor(() => expect(readSceneSnapshot()).toContain('"sceneName":"星光庭院"'));
    const beforeSnapshot = readSceneSnapshot();
    const globalKeyHandler = vi.fn();
    window.addEventListener('keydown', globalKeyHandler);

    const cell = screen.getByLabelText(/Cell 3,2, main area, level-1, read-only, 白木栅栏, rotated 90/);
    const levelRow = screen.getByLabelText('L2, 屋顶与遮挡, 5 instances');
    const assetButton = document.querySelector<HTMLButtonElement>('[data-asset-id="garden-plant"] .asset-select-button');
    if (!assetButton) {
      throw new Error('Expected garden-plant asset button.');
    }

    try {
      for (const target of [cell, levelRow, assetButton, document]) {
        for (const keyEvent of mobileApplicationKeyEvents) {
          fireEvent.keyDown(target, keyEvent);
        }
      }

      expect(readSceneSnapshot()).toBe(beforeSnapshot);
      expect(globalKeyHandler).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('keydown', globalKeyHandler);
    }
    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L1');
    expect(cell).toHaveAttribute('aria-selected', 'true');
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
  });

  it('does not migrate legacy UI preferences while starting in mobile read-only mode', () => {
    setViewportWidth(390);
    window.localStorage.setItem(
      uiPreferencesStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        assetFilters: {
          query: 'plant',
          category: 'decor',
          area: 'outer',
          favoriteOnly: false,
          skill: 'skill-candidate',
        },
        preview: {
          displayOptions: {
            grid: true,
            mainBoundary: true,
            skillMarkers: true,
          },
        },
      }),
    );

    render(<AppShell />);

    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toContain('displayOptions');
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
  });

  it('clears desktop keyboard targets when entering mobile read-only mode', async () => {
    render(<AppShell />);
    const desktopCell = screen.getByLabelText(/Cell 3,2, main area, level-1, placeable/);
    fireEvent.keyDown(desktopCell, { key: 'ArrowRight' });
    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-keyboard-coordinate');

    setViewportWidth(390);

    await waitFor(() => {
      expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
      expect(screen.getByTestId('scene-canvas')).not.toHaveAttribute('data-keyboard-coordinate');
    });
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
  }, 15_000);

  it('shows recovery errors and keeps the current Open Design scene when startup storage is invalid', () => {
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
    expect(screen.getByLabelText('Scene Name')).toHaveValue('星光庭院');
    expectNoSaveStatus();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('Recovery Validator')).toHaveAttribute('data-recovery-status', 'canceled');
    expect(screen.getByLabelText('Recovery Validator')).toHaveTextContent('Recovery canceled');
    expect(screen.getByLabelText('Scene Name')).toHaveValue('星光庭院');
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
        sceneName: 'Retry Recovery',
        selectedPokemonKey: 'pikachu',
        selectedCoordinate: { x: 3, y: 3 },
        now: '2026-05-16T08:30:00.000Z',
      }),
      'autosave',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Recovery Validator')).toHaveAttribute('data-recovery-status', 'success');
      expect(screen.getByLabelText('Scene Name')).toHaveValue('Retry Recovery');
      const recoveredCell = screen.getByLabelText(/Cell 3,3, main area, level-0, placeable$/);
      expect(recoveredCell).toBeVisible();
      expect(recoveredCell).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('keeps read-only startup and retry from replacing the scene', async () => {
    setViewportWidth(390);
    writeSceneDocumentToStorage(
      window.localStorage,
      createDefaultSceneDocument({
        sceneId: 'scene-readonly-recovery',
        sceneName: 'Blocked Recovery',
        selectedPokemonKey: 'pikachu',
        now: '2026-05-16T08:30:00.000Z',
      }),
      'autosave',
    );

    render(<AppShell />);

    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
    expect(screen.getByLabelText('Recovery Validator')).toBeVisible();
    expect(screen.getByLabelText('Recovery error details')).toHaveTextContent('Read-only mode cannot replace');
    expect(screen.getByLabelText('Scene Name')).toHaveValue('星光庭院');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Recovery Validator')).toBeVisible();
      expect(screen.getByLabelText('Scene Name')).toHaveValue('星光庭院');
      expectNoSaveStatus();
    });
  });

  it('renders unsafe RecoveryError values as text and preserves scene state after cancel', async () => {
    window.localStorage.setItem(
      autosavedSceneStorageKey,
      JSON.stringify({
        schemaVersion: 1,
        sceneId: 'bad-unsafe-scene',
        sceneName: 'Unsafe error',
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
    expect(screen.getByLabelText('Scene Name')).toHaveValue('星光庭院');
    expectNoSaveStatus();

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Current Dirty Layout' } });
    await waitFor(() => expect(window.localStorage.getItem(autosavedSceneStorageKey)).not.toBeNull());
    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('Recovery Validator')).toHaveAttribute('data-recovery-status', 'canceled');
    expect(screen.getByLabelText('Scene Name')).toHaveValue('Current Dirty Layout');
    expectNoSaveStatus();
  });

  it('recovers unsafe scene text as plain text without inserting executable DOM nodes', async () => {
    const unsafeScene = createDefaultSceneDocument({
      sceneId: 'scene-unsafe-recovery',
      sceneName: `Unsafe ${unsafeAngleText}`,
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
            }),
          ],
        }),
      }),
    );

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByLabelText('Scene Name')).toHaveValue(`Unsafe ${unsafeAngleText}`);
      expect(screen.getByLabelText('Selected instance')).toHaveTextContent('小型灌木');
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

function expectNoSaveStatus(): void {
  expect(screen.queryByLabelText('Save status')).not.toBeInTheDocument();
  expect(screen.queryByRole('status', { name: 'Save status' })).not.toBeInTheDocument();
}

function readSceneSnapshot(): string {
  const snapshot = (window as unknown as { __pokopiaSceneSnapshot?: () => string }).__pokopiaSceneSnapshot?.();
  if (!snapshot) {
    throw new Error('Expected scene snapshot test hook.');
  }

  return snapshot;
}

const mobileApplicationKeyEvents = [
  { key: 'ArrowUp' },
  { key: 'ArrowDown' },
  { key: 'ArrowLeft' },
  { key: 'ArrowRight' },
  { key: 'Enter' },
  { key: ' ' },
  { key: 'Escape' },
  { key: 'Delete' },
  { key: 'Backspace' },
  { key: 's', metaKey: true },
  { key: 's', ctrlKey: true },
] as const;
