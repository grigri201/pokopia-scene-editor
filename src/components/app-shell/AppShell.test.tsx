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

  it('saves the editable Open Design scene and restores it after remount', async () => {
    const { unmount } = render(<AppShell />);
    const saveButton = screen.getByRole('button', { name: 'Save scene' });
    const deleteButton = screen.getByRole('button', { name: 'Delete scene' });

    expect(saveButton.querySelector('svg')).toBeInTheDocument();
    expect(deleteButton.querySelector('svg')).toBeInTheDocument();
    expect(saveButton).toHaveAttribute('data-tooltip', '保存');
    expect(deleteButton).toHaveAttribute('data-tooltip', '删除');
    expect(saveButton).not.toHaveTextContent('S');
    expect(deleteButton).not.toHaveTextContent('D');

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Saved Garden Layout' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save scene' })).toBeEnabled());
    expectNoSaveStatus();
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));

    let rawSavedPayload: string | null = null;
    await waitFor(() => {
      rawSavedPayload = window.localStorage.getItem(savedSceneStorageKey);
      expect(rawSavedPayload).not.toBeNull();
    });
    expect(rawSavedPayload).not.toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBe(rawSavedPayload);
    expect(JSON.parse(rawSavedPayload ?? '{}')).toMatchObject({
      sceneName: 'Saved Garden Layout',
      selectedPokemonKey: 'pikachu',
      workspaceState: {
        saveStatus: 'saved',
      },
    });

    unmount();
    render(<AppShell />);

    expect(screen.getByLabelText('Scene Name')).toHaveValue('Saved Garden Layout');
    expectNoSaveStatus();
  }, 10_000);

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

    const roofRow = screen.getByLabelText('L2, 屋顶与遮挡, 5 instances, visible, unlocked');

    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L1');
    expect(roofRow).not.toHaveAttribute('aria-current');

    fireEvent.click(roofRow);

    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L2');
    expect(roofRow).toHaveAttribute('aria-current', 'true');
    expect(screen.getByLabelText(/Cell 0,0, outer area, level-2/)).toBeVisible();
  });

  it('autosaves dirty edits without marking them saved', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Autosaved Garden Layout' } });

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        sceneName: 'Autosaved Garden Layout',
        workspaceState: {
          saveStatus: 'dirty',
        },
      });
    });
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
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
          saveStatus: 'dirty',
        },
      });
    });
    expectNoSaveStatus();

    unmount();
    render(<AppShell />);

    const restoredCell = screen.getByLabelText(/Cell 2,3, main area, level-1, placeable, 白木栅栏/);
    expect(restoredCell).toBeVisible();
    expect(restoredCell).toHaveAttribute('aria-selected', 'true');
  });

  it('stores UI preferences separately without dirtying or polluting saved SceneDocument payloads', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: '屋顶' } });
    fireEvent.click(screen.getByLabelText('Show favorite assets'));
    fireEvent.click(screen.getByRole('button', { name: 'Show preview grid' }));

    expect(window.localStorage.getItem(uiPreferencesStorageKey)).not.toBeNull();
    expectNoSaveStatus();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Payload Isolation Layout' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save scene' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));

    await waitFor(() => {
      const rawSavedPayload = window.localStorage.getItem(savedSceneStorageKey);
      expect(rawSavedPayload).not.toBeNull();
      expect(JSON.parse(rawSavedPayload ?? '{}')).toMatchObject({
        sceneName: 'Payload Isolation Layout',
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

    fireEvent.change(screen.getByLabelText('Scene Name'), { target: { value: 'Undo Check Layout' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save scene' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));
    await waitFor(() => expect(window.localStorage.getItem(savedSceneStorageKey)).not.toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => expect(screen.getByLabelText('Scene Name')).toHaveValue('星光庭院'));
    expect(screen.getByRole('button', { name: 'Save scene' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save scene' }));

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(savedSceneStorageKey) ?? '{}')).toMatchObject({
        sceneName: '星光庭院',
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
    expectNoSaveStatus();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
  });

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
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save scene' })).toBeEnabled());

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
              note: unsafeImageText,
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
