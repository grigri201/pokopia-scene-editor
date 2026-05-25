import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { toBlob } from 'html-to-image';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultSceneDocument, createTileInstance } from '@pokopia-scene-editor/scene-core';
import {
  autosavedSceneStorageKey,
  encodeSceneDocumentString,
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

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
}));

const toBlobMock = vi.mocked(toBlob);

describe('AppShell scene storage integration', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setViewportWidth(1280);
    toBlobMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  it('links the header brand back to pokokit', () => {
    render(<AppShell />);

    expect(screen.getByRole('link', { name: 'pokokit Scene Editor' })).toHaveAttribute(
      'href',
      'https://www.pokokit.com',
    );
  });

  it('autosaves the editable Open Design scene and restores it after remount', async () => {
    const { unmount } = render(<AppShell />);
    const exportButton = screen.getByRole('button', { name: '下载预览' });
    const resetButton = screen.getByRole('button', { name: '重置' });

    expect(exportButton).toBeVisible();
    expect(resetButton).toBeVisible();
    expect(resetButton.querySelector('svg')).not.toBeInTheDocument();
    expect(resetButton).toHaveTextContent('重置');
    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save scene from scene controls' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('布景名称'), { target: { value: 'Autosaved Garden Layout' } });
    expectNoSaveStatus();

    let rawAutosavePayload: string | null = null;
    await waitFor(() => {
      rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
    });
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
      sceneName: 'Autosaved Garden Layout',
      selectedPokemonKey: 'ditto',
    });
    expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState).not.toHaveProperty('saveStatus');

    unmount();
    render(<AppShell />);

    expect(screen.getByLabelText('布景名称')).toHaveValue('Autosaved Garden Layout');
    expectNoSaveStatus();
  }, 20_000);

  it('exports the current scene as a short restorable string without writing storage', () => {
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(null);

    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: '导出字符串' }));

    const exportedString = promptSpy.mock.calls[0]?.[1];
    expect(exportedString).toMatch(/^PSE1~/);
    expect(exportedString).not.toContain('{');
    expect(exportedString).not.toContain('schemaVersion');
    expect(screen.getByRole('status', { name: 'Scene string import export status' })).toHaveTextContent(
      '已生成布景字符串',
    );
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBeNull();
  });

  it('imports a scene string and restores scene settings through recovery', async () => {
    const importedScene = createDefaultSceneDocument({
      sceneId: 'scene-import-source',
      sceneName: '导入庭院',
      selectedPokemonKey: 'eevee',
      selectedCoordinate: { x: 4, y: 4 },
      now: '2026-05-23T09:20:00.000Z',
    });
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue(encodeSceneDocumentString(importedScene));
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: '导入字符串' }));

    await waitFor(() => {
      expect(screen.getByLabelText('布景名称')).toHaveValue('导入庭院');
      expect(screen.getByLabelText('Current Pokemon')).toHaveValue('eevee');
      expect(screen.getByRole('status', { name: 'Scene string import export status' })).toHaveTextContent(
        '已导入布景字符串',
      );
    });
    expect(JSON.parse(readSceneSnapshot())).toMatchObject({
      sceneName: '导入庭院',
      selectedPokemonKey: 'eevee',
      workspaceState: {
        selectedCoordinate: { x: 4, y: 4 },
      },
    });
    expect(promptSpy).toHaveBeenCalledWith('粘贴布景字符串。导入会替换当前布景。');
    expect(confirmSpy).toHaveBeenCalledWith('导入会替换当前布景。继续导入？');
  });

  it('keeps the current scene when importing an invalid scene string', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('bad-code');
    const confirmSpy = vi.spyOn(window, 'confirm');

    render(<AppShell />);
    const beforeSnapshot = readSceneSnapshot();
    fireEvent.click(screen.getByRole('button', { name: '导入字符串' }));

    expect(readSceneSnapshot()).toBe(beforeSnapshot);
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('alert', { name: 'Scene string import export status' })).toHaveTextContent(
      '导入字符串无效',
    );
    expect(screen.getByLabelText('Recovery toast')).toHaveAttribute('data-recovery-status', 'error');
  });

  it('auto-dismisses recovery toast after three seconds', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'prompt').mockReturnValue('bad-code');

    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: '导入字符串' }));

    expect(screen.getByLabelText('Recovery toast')).toHaveAttribute('data-recovery-status', 'error');

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.queryByLabelText('Recovery toast')).not.toBeInTheDocument();
  });

  it('pauses recovery toast auto-dismiss while hovered', () => {
    vi.useFakeTimers();
    vi.spyOn(window, 'prompt').mockReturnValue('bad-code');

    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: '导入字符串' }));
    const toast = screen.getByLabelText('Recovery toast');

    fireEvent.mouseEnter(toast);
    act(() => {
      vi.advanceTimersByTime(3_000);
    });
    expect(screen.getByLabelText('Recovery toast')).toBeVisible();

    fireEvent.mouseLeave(toast);
    act(() => {
      vi.advanceTimersByTime(2_999);
    });
    expect(screen.getByLabelText('Recovery toast')).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByLabelText('Recovery toast')).not.toBeInTheDocument();
  });

  it('closes recovery toast immediately from the close button', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('bad-code');

    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: '导入字符串' }));
    const toast = screen.getByLabelText('Recovery toast');

    fireEvent.click(within(toast).getByRole('button', { name: '关闭' }));

    expect(screen.queryByLabelText('Recovery toast')).not.toBeInTheDocument();
  });

  it('opens an image export preview instead of downloading SceneDocument JSON', () => {
    const createObjectURL = vi.fn();
    const revokeObjectURL = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    render(<AppShell />);
    fireEvent.click(screen.getByRole('button', { name: '下载预览' }));

    expect(screen.getByRole('dialog', { name: '图片导出预览' })).toBeVisible();
    expect(screen.getByLabelText('Application header')).toHaveAttribute('inert');
    expect(screen.getByLabelText('Open Design editing workbench')).toHaveAttribute('inert');
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('未放置素材');
    expect(screen.getByLabelText('L0 使用素材清单')).toHaveTextContent('该层没有素材');
    expect(createObjectURL).not.toHaveBeenCalled();
    expect(anchorClick).not.toHaveBeenCalled();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));

    expect(screen.queryByRole('dialog', { name: '图片导出预览' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Application header')).not.toHaveAttribute('inert');
    expect(screen.getByLabelText('Open Design editing workbench')).not.toHaveAttribute('inert');
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBeNull();
  }, 20_000);

  it('persists English UI language separately from SceneDocument autosave', async () => {
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('语言'), { target: { value: 'en-US' } });

    expect(screen.getByRole('button', { name: 'Download Preview' })).toBeVisible();
    expect(screen.getByLabelText('Scene name')).toBeVisible();
    expect(screen.getByRole('option', { name: 'Ditto' })).toHaveValue('ditto');
    expect(JSON.parse(window.localStorage.getItem(uiPreferencesStorageKey) ?? '{}')).toMatchObject({
      locale: 'en-US',
    });

    fireEvent.change(screen.getByLabelText('Scene name'), { target: { value: 'English Garden' } });

    await waitFor(() => {
      expect(window.localStorage.getItem(autosavedSceneStorageKey)).not.toBeNull();
    });

    const autosavePayload = JSON.parse(window.localStorage.getItem(autosavedSceneStorageKey) ?? '{}');
    expect(autosavePayload.sceneName).toBe('English Garden');
    expect(autosavePayload).not.toHaveProperty('locale');
    expect(autosavePayload).not.toHaveProperty('language');
  }, 20_000);

  it('uses the active locale for newly generated layer names without renaming existing layers', async () => {
    const confirmReset = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AppShell />);

    fireEvent.change(screen.getByLabelText('语言'), { target: { value: 'en-US' } });

    await waitFor(() => {
      expect(JSON.parse(readSceneSnapshot()).buildingLevels).toEqual([
        { id: 'level-0', levelNumber: 0, name: '0层' },
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: 'New layer' }));

    await waitFor(() => {
      expect(JSON.parse(readSceneSnapshot()).buildingLevels).toEqual([
        { id: 'level-0', levelNumber: 0, name: '0层' },
        { id: 'level-1', levelNumber: 1, name: 'Layer 1' },
      ]);
    });

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'zh-CN' } });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Layer 1')).toBeVisible();
      expect(JSON.parse(readSceneSnapshot()).buildingLevels.at(-1)?.name).toBe('Layer 1');
    });

    fireEvent.change(screen.getByLabelText('语言'), { target: { value: 'en-US' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    await waitFor(() => {
      expect(JSON.parse(readSceneSnapshot()).buildingLevels).toEqual([
        { id: 'level-0', levelNumber: 0, name: 'Layer 0' },
      ]);
    });
    expect(confirmReset).toHaveBeenCalledWith('Reset the current scene and workbench?');
  }, 20_000);

  it('downloads the image export preview without changing scene or storage', async () => {
    const createObjectURL = vi.fn((blob: Blob) => {
      void blob;
      return 'blob:image-export';
    });
    const revokeObjectURL = vi.fn();
    let downloadLink: { href: string; download: string } | null = null;
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function clickAnchor(this: HTMLAnchorElement) {
      downloadLink = {
        href: this.href,
        download: this.download,
      };
    });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(this: HTMLElement) {
      const width = this.classList.contains('export-preview') ? 590 : 0;
      const height = this.classList.contains('export-preview') ? 420 : 0;

      return {
        bottom: height,
        height,
        left: 0,
        right: width,
        top: 0,
        width,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      };
    });

    render(<AppShell />);
    const beforeSnapshot = (window as unknown as { __pokopiaSceneSnapshot?: () => string }).__pokopiaSceneSnapshot?.();
    fireEvent.click(screen.getByRole('button', { name: '下载预览' }));
    fireEvent.click(screen.getByRole('button', { name: '下载图片' }));

    await waitFor(() => {
      expect(downloadLink).toEqual({
        href: 'blob:image-export',
        download: '5x5-布景.pokopia-scene.png',
      });
    });
    const exportedBlob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(exportedBlob.type).toBe('image/png');
    await expect(exportedBlob.text()).resolves.toBe('png');
    expect(toBlobMock).toHaveBeenCalledWith(
      screen.getByRole('dialog', { name: '图片导出预览' }),
      expect.objectContaining({
        pixelRatio: 1,
        type: 'image/png',
      }),
    );
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:image-export');
    expect(screen.getByRole('status', { name: 'Image export download status' })).toHaveTextContent('图片已准备下载');
    expect((window as unknown as { __pokopiaSceneSnapshot?: () => string }).__pokopiaSceneSnapshot?.()).toBe(beforeSnapshot);
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBeNull();
  }, 20_000);

  it('hides the export action on mobile read-only without writing scene storage', () => {
    setViewportWidth(390);

    render(<AppShell />);
    const beforeSnapshot = (window as unknown as { __pokopiaSceneSnapshot?: () => string }).__pokopiaSceneSnapshot?.();

    expect(screen.queryByRole('button', { name: '下载预览' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导出字符串' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '导入字符串' })).not.toBeInTheDocument();
    expect((window as unknown as { __pokopiaSceneSnapshot?: () => string }).__pokopiaSceneSnapshot?.()).toBe(beforeSnapshot);
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBeNull();
  });

  it('places the preview inspector below the canvas next to the current selection item', () => {
    const { container } = render(<AppShell />);

    const lowerInspectors = container.querySelector('.canvas-stage > .canvas-bottom-panels');
    expect(lowerInspectors).toBeInTheDocument();
    expect(lowerInspectors).toHaveAttribute('aria-label', 'Canvas lower inspectors');
    expect(lowerInspectors?.children[0]).toHaveClass('selection-inspector');
    expect(lowerInspectors?.children[1]).toHaveClass('preview-panel');
    expect(container.querySelector('.workbench-left .preview-panel')).toBeNull();
  });

  it('keeps the workbench theme stable when Pokemon selection changes', () => {
    render(<AppShell />);

    const workbench = screen.getByLabelText('Pokopia scene editor workbench') as HTMLElement;
    const pokemonSelect = screen.getByLabelText('Current Pokemon');

    expect(workbench.style.getPropertyValue('--pokemon-background')).toBe('');
    expect(workbench.style.getPropertyValue('--pokemon-background-ink')).toBe('');
    expect(workbench.style.getPropertyValue('--pokemon-accent')).toBe('');

    fireEvent.change(pokemonSelect, { target: { value: 'eevee' } });

    expect(pokemonSelect).toHaveValue('eevee');
    expect(workbench.style.getPropertyValue('--pokemon-background')).toBe('');
    expect(workbench.style.getPropertyValue('--pokemon-background-ink')).toBe('');
    expect(workbench.style.getPropertyValue('--pokemon-accent')).toBe('');
  });

  it('starts new scene data with only empty 0层', () => {
    render(<AppShell />);

    const snapshot = JSON.parse(readSceneSnapshot());
    expect(snapshot.buildingLevels).toEqual([{ id: 'level-0', levelNumber: 0, name: '0层' }]);
    expect(snapshot.tileInstances).toEqual([]);
    expect(snapshot.workspaceState).toMatchObject({
      currentBuildingLevelId: 'level-0',
      selectedAssetId: null,
      selectedCoordinate: null,
    });
    expect(screen.getByLabelText('L0, 0层, 0 instances, current editing layer')).toBeVisible();
    expect(screen.queryByLabelText(/L1,/)).not.toBeInTheDocument();
  });

  it('switches the active editing layer when a building level row is clicked', () => {
    writeSceneDocumentToStorage(
      window.localStorage,
      createDefaultSceneDocument({
        sceneId: 'scene-open-design-demo',
        now: '2026-05-16T08:20:00.000Z',
        includeOpenDesignDemo: true,
      }),
      'autosave',
    );
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

    fireEvent.change(screen.getByLabelText('布景名称'), { target: { value: 'Autosaved Garden Layout' } });

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

  it('clears the current placement asset when the selected asset is clicked again', async () => {
    render(<AppShell />);

    const assetButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    if (!assetButton) {
      throw new Error('Expected leppa-berry asset button.');
    }

    fireEvent.click(assetButton);
    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState.selectedAssetId).toBe('leppa-berry');
      expect(assetButton).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(assetButton);
    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState.selectedAssetId).toBeNull();
      expect(assetButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('resequences visible building layer markers after delete and create actions', async () => {
    const confirmDelete = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AppShell />);

    fireEvent.click(screen.getByRole('button', { name: '新建层' }));
    fireEvent.click(screen.getByRole('button', { name: '新建层' }));

    await waitFor(() => {
      expect(screen.getAllByTestId('building-level-row').map((row) => row.dataset.displayId)).toEqual([
        'L2',
        'L1',
        'L0',
      ]);
    });

    fireEvent.click(screen.getByRole('button', { name: /Delete 1层 \(L1\)/ }));

    await waitFor(() => {
      const rows = screen.getAllByTestId('building-level-row');
      expect(rows.map((row) => row.dataset.displayId)).toEqual(['L1', 'L0']);
      expect(screen.getByDisplayValue('2层')).toBeVisible();
      expect(screen.queryByText('L2')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '新建层' }));

    await waitFor(() => {
      const rows = screen.getAllByTestId('building-level-row');
      expect(rows.map((row) => row.dataset.displayId)).toEqual(['L2', 'L1', 'L0']);
      expect(JSON.parse(readSceneSnapshot()).buildingLevels).toEqual([
        { id: 'level-0', levelNumber: 0, name: '0层' },
        { id: 'level-2', levelNumber: 1, name: '2层' },
        { id: 'level-3', levelNumber: 2, name: '2层' },
      ]);
    });
    expect(confirmDelete).toHaveBeenCalledTimes(1);
  });

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

    fireEvent.change(screen.getByLabelText('布景名称'), { target: { value: 'Blocked Autosave Layout' } });

    await waitFor(() => {
      expect(screen.getByLabelText('Autosave warning')).toHaveAttribute('data-autosave-status', 'error');
      expect(screen.getByLabelText('Autosave warning')).toHaveTextContent('Autosave failed');
    });
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBeNull();
    expectNoSaveStatus();

    failAutosave = false;
    fireEvent.change(screen.getByLabelText('布景名称'), { target: { value: 'Recovered Autosave Layout' } });

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

    expect(screen.getByLabelText('布景名称')).toHaveValue('Autosave Draft Layout');
    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(autosavedSceneStorageKey) ?? '{}')).toMatchObject({
      sceneId: 'scene-autosave-draft',
      sceneName: 'Autosave Draft Layout',
    });
    expectNoSaveStatus();
  });

  it('autosaves an empty default layer selection without placing an asset', async () => {
    const { unmount } = render(<AppShell />);

    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-0, placeable'));

    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}')).toMatchObject({
        workspaceState: {
          selectedCoordinate: { x: 2, y: 3 },
        },
      });
      expect(JSON.parse(rawAutosavePayload ?? '{}').tileInstances).toEqual([]);
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState).not.toHaveProperty('saveStatus');
    });
    expectNoSaveStatus();

    unmount();
    render(<AppShell />);

    const restoredCell = screen.getByLabelText(/Cell 2,3, main area, level-0, placeable$/);
    expect(restoredCell).toBeVisible();
    expect(restoredCell).toHaveAttribute('aria-selected', 'true');
  });

  it('clears the selected coordinate when the selected cell is clicked again', async () => {
    render(<AppShell />);

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    fireEvent.click(cell);
    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
      expect(cell).toHaveAttribute('aria-selected', 'true');
    });

    fireEvent.click(cell);
    await waitFor(() => {
      const rawAutosavePayload = window.localStorage.getItem(autosavedSceneStorageKey);
      expect(rawAutosavePayload).not.toBeNull();
      expect(JSON.parse(rawAutosavePayload ?? '{}').workspaceState.selectedCoordinate).toBeNull();
      expect(cell).toHaveAttribute('aria-selected', 'false');
    });
  });

  it('places a single-use selected asset into the selected cell and then clears the asset selection', async () => {
    render(<AppShell />);

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    const assetButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    if (!assetButton) {
      throw new Error('Expected leppa-berry asset button.');
    }

    fireEvent.click(cell);
    fireEvent.click(assetButton);
    fireEvent.click(cell);

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.workspaceState.selectedAssetId).toBeNull();
      expect(payload.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
      expect(payload.tileInstances).toHaveLength(1);
      expect(payload.tileInstances[0]).toMatchObject({
        assetId: 'leppa-berry',
        coordinate: { x: 2, y: 3 },
      });
      expect(cell).toHaveAttribute('aria-selected', 'true');
      expect(assetButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('clears the selected grid cell material from the compact action bar', async () => {
    render(<AppShell />);

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    const assetButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    if (!assetButton) {
      throw new Error('Expected leppa-berry asset button.');
    }

    fireEvent.click(assetButton);
    fireEvent.click(cell);

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toHaveLength(1);
      expect(payload.tileInstances[0]).toMatchObject({
        assetId: 'leppa-berry',
        coordinate: { x: 2, y: 3 },
      });
    });

    fireEvent.click(screen.getByRole('button', { name: '清除选中格子中的素材' }));

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toEqual([]);
      expect(payload.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
      expect(screen.getByRole('button', { name: '清除选中格子中的素材' })).toBeDisabled();
    });
  });

  it('right-clicks a canvas cell to delete its current-layer material without checking selected asset', async () => {
    const confirmReplacement = vi.spyOn(window, 'confirm');
    render(<AppShell />);

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    const leppaBerryButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    const chestoBerryButton = document.querySelector<HTMLButtonElement>('[data-asset-id="chesto-berry"] .asset-select-button');
    if (!leppaBerryButton || !chestoBerryButton) {
      throw new Error('Expected first-page asset buttons.');
    }

    fireEvent.click(leppaBerryButton);
    fireEvent.click(cell);
    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toHaveLength(1);
      expect(payload.tileInstances[0]).toMatchObject({
        assetId: 'leppa-berry',
        coordinate: { x: 2, y: 3 },
      });
      expect(payload.workspaceState.selectedAssetId).toBeNull();
    });

    fireEvent.click(chestoBerryButton);
    fireEvent.contextMenu(cell);

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toEqual([]);
      expect(payload.workspaceState.selectedAssetId).toBe('chesto-berry');
      expect(payload.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
      expect(chestoBerryButton).toHaveAttribute('aria-pressed', 'true');
      expect(cell).toHaveAttribute('data-has-instance', 'false');
    });
    expect(confirmReplacement).not.toHaveBeenCalled();
  });

  it('toggles a skill marker off when the active skill button is clicked again', async () => {
    render(<AppShell />);

    const cell = screen.getByLabelText('Cell 2,3, main area, level-0, placeable');
    const assetButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    if (!assetButton) {
      throw new Error('Expected leppa-berry asset button.');
    }

    fireEvent.click(assetButton);
    fireEvent.click(cell);
    const leafSkillButton = screen.getByRole('button', { name: '设置技能标记：树叶' });

    fireEvent.click(leafSkillButton);
    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances[0]).toMatchObject({
        requiresSkill: true,
        skillType: '树叶',
      });
      expect(leafSkillButton).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(leafSkillButton);
    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances[0]).toMatchObject({
        requiresSkill: false,
        skillType: null,
        skillNote: '',
      });
      expect(leafSkillButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('sets and clears a skill marker on an empty selected grid cell', async () => {
    render(<AppShell />);

    const cell = screen.getByLabelText('Cell 3,3, main area, level-0, placeable');
    fireEvent.click(cell);
    const soilSkillButton = screen.getByRole('button', { name: '设置技能标记：耕地' });

    fireEvent.click(soilSkillButton);
    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toEqual([]);
      expect(payload.skillMarkers).toEqual([
        expect.objectContaining({
          coordinate: { x: 3, y: 3 },
          areaType: 'main',
          buildingLevelId: 'level-0',
          skillType: '耕地',
          skillNote: '',
        }),
      ]);
      expect(cell).toHaveAttribute('data-has-instance', 'false');
      expect(cell).toHaveAttribute('data-requires-skill', 'true');
      expect(soilSkillButton).toHaveAttribute('aria-pressed', 'true');
    });

    fireEvent.click(soilSkillButton);
    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.skillMarkers).toEqual([]);
      expect(payload.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 3 });
      expect(soilSkillButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('keeps double-clicked asset selection active for continuous placement until clicked again', async () => {
    render(<AppShell />);

    const assetButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    if (!assetButton) {
      throw new Error('Expected leppa-berry asset button.');
    }

    fireEvent.doubleClick(assetButton);
    fireEvent.click(screen.getByLabelText('Cell 2,2, main area, level-0, placeable'));
    fireEvent.click(screen.getByLabelText('Cell 2,3, main area, level-0, placeable'));

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.workspaceState.selectedAssetId).toBe('leppa-berry');
      expect(payload.tileInstances).toHaveLength(2);
      expect(assetButton).toHaveAttribute('aria-pressed', 'true');
      expect(assetButton.closest('[data-asset-id="leppa-berry"]')).toHaveAttribute(
        'data-selection-mode',
        'continuous',
      );
      expect(assetButton.closest('[data-asset-id="leppa-berry"]')).toHaveClass('asset-row--continuous');
    });

    fireEvent.click(assetButton);

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.workspaceState.selectedAssetId).toBeNull();
      expect(payload.tileInstances).toHaveLength(2);
      expect(assetButton).toHaveAttribute('aria-pressed', 'false');
      expect(assetButton.closest('[data-asset-id="leppa-berry"]')).toHaveAttribute('data-selection-mode', 'none');
    });
  });

  it('prompts once for replacement and reuses confirmation for 15 seconds', async () => {
    const confirmReplacement = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<AppShell />);

    const cell = screen.getByLabelText('Cell 2,2, main area, level-0, placeable');
    const leppaBerryButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    const chestoBerryButton = document.querySelector<HTMLButtonElement>('[data-asset-id="chesto-berry"] .asset-select-button');
    const rawstBerryButton = document.querySelector<HTMLButtonElement>('[data-asset-id="rawst-berry"] .asset-select-button');
    if (!leppaBerryButton || !chestoBerryButton || !rawstBerryButton) {
      throw new Error('Expected first-page asset buttons.');
    }

    fireEvent.click(leppaBerryButton);
    fireEvent.click(cell);

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toHaveLength(1);
      expect(payload.tileInstances[0].assetId).toBe('leppa-berry');
      expect(payload.workspaceState.selectedAssetId).toBeNull();
    });

    fireEvent.click(chestoBerryButton);
    fireEvent.click(cell);

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toHaveLength(1);
      expect(payload.tileInstances[0].assetId).toBe('chesto-berry');
      expect(payload.workspaceState.selectedAssetId).toBeNull();
    });

    fireEvent.click(rawstBerryButton);
    fireEvent.click(cell);

    await waitFor(() => {
      const payload = JSON.parse(readSceneSnapshot());
      expect(payload.tileInstances).toHaveLength(1);
      expect(payload.tileInstances[0].assetId).toBe('rawst-berry');
      expect(payload.workspaceState.selectedAssetId).toBeNull();
      expect(cell).toHaveAttribute('aria-selected', 'true');
    });
    expect(confirmReplacement).toHaveBeenCalledTimes(1);
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

    fireEvent.change(screen.getByLabelText('布景名称'), { target: { value: 'Payload Isolation Layout' } });

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

    fireEvent.change(screen.getByLabelText('布景名称'), { target: { value: 'Undo Check Layout' } });
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
    await waitFor(() => expect(readSceneSnapshot()).toContain('"sceneName":"5x5 布景"'));
    const beforeSnapshot = readSceneSnapshot();
    const globalKeyHandler = vi.fn();
    window.addEventListener('keydown', globalKeyHandler);

    const cell = screen.getByLabelText(/Cell 3,2, main area, level-0, read-only$/);
    const levelRow = screen.getByLabelText('L0, 0层, 0 instances, viewing layer');
    const assetButton = document.querySelector<HTMLButtonElement>('[data-asset-id="leppa-berry"] .asset-select-button');
    if (!assetButton) {
      throw new Error('Expected leppa-berry asset button.');
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
    expect(screen.getByLabelText('Current building level')).toHaveTextContent('Current L0');
    expect(cell).not.toHaveAttribute('aria-selected', 'true');
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
          category: 'misc',
          favoriteOnly: false,
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
    const desktopCell = screen.getByLabelText(/Cell 3,2, main area, level-0, placeable/);
    fireEvent.keyDown(desktopCell, { key: 'ArrowRight' });
    expect(screen.getByTestId('scene-canvas')).toHaveAttribute('data-keyboard-coordinate');
    await waitFor(() => expect(window.localStorage.getItem(autosavedSceneStorageKey)).not.toBeNull());
    window.localStorage.clear();

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

    expect(screen.getByLabelText('Recovery toast')).toBeVisible();
    expect(screen.getByLabelText('Recovery toast details')).toHaveTextContent('schemaVersion');
    expect(screen.getByLabelText('布景名称')).toHaveValue('5x5 布景');
    expectNoSaveStatus();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('Recovery toast')).toHaveAttribute('data-recovery-status', 'canceled');
    expect(screen.getByLabelText('Recovery toast')).toHaveTextContent('Recovery canceled');
    expect(screen.getByLabelText('布景名称')).toHaveValue('5x5 布景');
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
    expect(screen.getByLabelText('Recovery toast')).toBeVisible();

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
      expect(screen.getByLabelText('Recovery toast')).toHaveAttribute('data-recovery-status', 'success');
      expect(screen.getByLabelText('布景名称')).toHaveValue('Retry Recovery');
      const recoveredCell = screen.getByLabelText(/Cell 3,3, main area, level-0, placeable$/);
      expect(recoveredCell).toBeVisible();
      expect(recoveredCell).toHaveAttribute('aria-selected', 'true');
    });
  });

  it('restores saved scene during read-only startup without autosaving', () => {
    setViewportWidth(390);
    writeSceneDocumentToStorage(
      window.localStorage,
      createDefaultSceneDocument({
        sceneId: 'scene-readonly-recovery',
        sceneName: 'Mobile Restored Recovery',
        selectedPokemonKey: 'pikachu',
        now: '2026-05-16T08:30:00.000Z',
      }),
      'autosave',
    );

    render(<AppShell />);

    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
    expect(screen.queryByLabelText('Recovery toast')).not.toBeInTheDocument();
    expect(screen.getByLabelText('布景名称')).toHaveValue('Mobile Restored Recovery');
    expect(screen.getByLabelText('Current Pokemon')).toHaveValue('pikachu');
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBeNull();
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).not.toBeNull();
    expectNoSaveStatus();
  });

  it('retries and restores valid scene data in read-only mode', async () => {
    setViewportWidth(390);
    window.localStorage.setItem(
      autosavedSceneStorageKey,
      JSON.stringify({
        schemaVersion: 99,
        sceneId: 'bad-readonly-recovery',
      }),
    );

    render(<AppShell />);

    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile read-only mode');
    expect(screen.getByLabelText('Recovery toast')).toBeVisible();
    expect(screen.getByLabelText('布景名称')).toHaveValue('5x5 布景');

    writeSceneDocumentToStorage(
      window.localStorage,
      createDefaultSceneDocument({
        sceneId: 'scene-readonly-retry-recovery',
        sceneName: 'Mobile Retry Recovery',
        selectedPokemonKey: 'pikachu',
        now: '2026-05-16T08:30:00.000Z',
      }),
      'autosave',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Recovery toast')).toHaveAttribute('data-recovery-status', 'success');
      expect(screen.getByLabelText('布景名称')).toHaveValue('Mobile Retry Recovery');
      expect(screen.getByLabelText('Current Pokemon')).toHaveValue('pikachu');
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

    const validator = screen.getByLabelText('Recovery toast');
    const details = screen.getByLabelText('Recovery toast details');
    expect(validator).toHaveAttribute('data-recovery-status', 'error');
    expect(details).toHaveTextContent(unsafeCombinedText);
    expect(details.querySelector('script')).toBeNull();
    expect(details.querySelector('img')).toBeNull();
    expect(screen.getByLabelText('布景名称')).toHaveValue('5x5 布景');
    expectNoSaveStatus();

    fireEvent.change(screen.getByLabelText('布景名称'), { target: { value: 'Current Dirty Layout' } });
    await waitFor(() => expect(window.localStorage.getItem(autosavedSceneStorageKey)).not.toBeNull());
    expect(screen.queryByRole('button', { name: 'Save scene' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByLabelText('Recovery toast')).toHaveAttribute('data-recovery-status', 'canceled');
    expect(screen.getByLabelText('布景名称')).toHaveValue('Current Dirty Layout');
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
              assetId: 'leafy-plant',
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
      expect(screen.getByLabelText('布景名称')).toHaveValue(`Unsafe ${unsafeAngleText}`);
      expect(screen.getByRole('button', { name: '设置技能标记：树叶' })).toHaveAttribute('aria-pressed', 'true');
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
