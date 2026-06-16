import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildImageExportSummary,
  createDefaultSceneDocument,
  createTileInstance,
} from '@pokopia-scene-editor/scene-core';
import { MobilePreviewMode } from './mobile-preview-mode';

describe('MobilePreviewMode', () => {
  it('renders shared export preview content inline and wires download actions to the preview element', () => {
    const onDownloadImage = vi.fn();
    const onDownloadLayerImages = vi.fn();
    const onImportRequest = vi.fn();
    const scene = {
      ...createDefaultSceneDocument({
        sceneId: 'scene-mobile-preview-mode-direct',
        sceneName: 'Mobile Preview Direct',
        selectedPokemonKey: 'pikachu',
        now: '2026-06-06T00:40:00.000Z',
      }),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-mobile-preview-pecha',
          assetId: 'pecha-berry',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const { container } = render(
      <MobilePreviewMode
        locale="zh-CN"
        state={{
          status: 'preview-ready',
          scene,
          summary: buildImageExportSummary(scene),
        }}
        onDownloadImage={onDownloadImage}
        onDownloadLayerImages={onDownloadLayerImages}
        onImportRequest={onImportRequest}
      />,
    );

    const region = screen.getByRole('region', { name: 'Mobile Preview Mode' });
    const preview = container.querySelector<HTMLElement>('.export-preview');

    expect(region).toHaveAttribute('data-mobile-preview-state', 'preview-ready');
    expect(screen.getByLabelText('Interaction mode')).toHaveTextContent('Mobile Preview Mode');
    expect(preview).not.toBeNull();
    expect(screen.queryByRole('dialog', { name: '下载预览' })).not.toBeInTheDocument();
    expect(document.querySelector('.export-preview-backdrop')).toBeNull();
    expect(screen.getByRole('heading', { name: 'Mobile Preview Direct' })).toBeVisible();
    expect(screen.getByLabelText('皮卡丘导出预览宝可梦图片')).toBeVisible();
    expect(screen.getByText('17x17 画布 · 1 个建筑层')).toBeVisible();
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('桃桃果');
    expect(screen.getByLabelText('L1 17x17 图形')).toBeVisible();
    expect(screen.getByLabelText('L1 使用素材清单')).toHaveTextContent('桃桃果');
    expect(within(preview as HTMLElement).getByRole('button', { name: '下载图片' })).toBeVisible();
    expect(within(preview as HTMLElement).getByRole('button', { name: '按层下载图片' })).toBeVisible();

    fireEvent.click(within(preview as HTMLElement).getByRole('button', { name: '下载图片' }));
    fireEvent.click(within(preview as HTMLElement).getByRole('button', { name: '按层下载图片' }));
    fireEvent.click(screen.getByRole('button', { name: '导入文件' }));

    expect(onDownloadImage).toHaveBeenCalledWith(preview);
    expect(onDownloadLayerImages).toHaveBeenCalledWith(preview);
    expect(onImportRequest).toHaveBeenCalledTimes(1);
  });
});
