import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance, buildImageExportSummary } from '../../domain/scene';
import { unsafeAngleText, unsafeScriptText } from '../../test/fixtures/unsafe-text';
import { ExportPreview } from './ExportPreview';

describe('ExportPreview', () => {
  it('renders the title, overall materials, layer graphics, layer materials and empty layers', () => {
    const onClose = vi.fn();
    const summary = buildImageExportSummary(createPreviewScene());

    render(<ExportPreview summary={summary} downloadDisabled onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: '图片导出预览' })).toBeVisible();
    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('绿叶植物');
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('No. 1052');
    expect(screen.getByLabelText('Export image content').firstElementChild).toBe(screen.getByLabelText('整体使用素材清单'));
    expect(within(screen.getByLabelText('整体使用素材清单')).getByAltText('绿叶植物缩略图')).toBeVisible();
    expect(screen.getByLabelText('L1 7x7 图形').querySelectorAll('.export-layer-cell')).toHaveLength(49);
    const previewCell = screen.getByLabelText('3,3: 绿叶植物');
    expect(previewCell).toHaveTextContent('');
    expect(previewCell.querySelector('img')).toHaveAttribute('src', expect.stringContaining('leafy-plant'));
    expect(screen.getByLabelText('L1 使用素材清单')).toHaveTextContent(unsafeAngleText);
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('该层没有素材');
    expect(screen.getAllByText('空层')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders HTML-like text as inert text content', () => {
    const { container } = render(<ExportPreview summary={buildImageExportSummary(createPreviewScene())} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    expect(within(screen.getByLabelText('L1 使用素材清单')).getByText((content) => content.includes(unsafeAngleText))).toBeVisible();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByAltText(unsafeAngleText)).not.toBeInTheDocument();
    expect(screen.queryByAltText(unsafeScriptText)).not.toBeInTheDocument();
  });

  it('focuses the dialog controls, traps tab focus, restores focus and disables download without a handler', () => {
    const opener = document.createElement('button');
    opener.textContent = 'open export';
    document.body.append(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(<ExportPreview summary={buildImageExportSummary(createPreviewScene())} onClose={onClose} />);
    const closeButton = screen.getByRole('button', { name: '关闭' });
    const downloadButton = screen.getByRole('button', { name: '下载图片' });

    expect(closeButton).toHaveFocus();
    expect(downloadButton).toBeDisabled();

    fireEvent.keyDown(screen.getByRole('dialog', { name: '图片导出预览' }), { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog', { name: '图片导出预览' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('enables download when a handler exists and renders download feedback', () => {
    const onDownloadImage = vi.fn();

    render(
      <ExportPreview
        summary={buildImageExportSummary(createPreviewScene())}
        downloadStatus="图片已准备下载"
        onClose={vi.fn()}
        onDownloadImage={onDownloadImage}
      />,
    );

    const downloadButton = screen.getByRole('button', { name: '下载图片' });
    expect(downloadButton).toBeEnabled();
    fireEvent.click(downloadButton);

    expect(onDownloadImage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status', { name: 'Image export download status' })).toHaveTextContent('图片已准备下载');
  });
});

function createPreviewScene() {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-export-preview',
    sceneName: unsafeScriptText,
    now: '2026-05-22T05:20:00.000Z',
  });

  return {
    ...baseScene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-preview',
        assetId: 'leafy-plant',
        coordinate: { x: 3, y: 3 },
        buildingLevelId: 'level-1',
        rotationDegrees: 90,
        dyeColor: '#88cc44',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: unsafeAngleText,
      }),
    ],
  };
}
