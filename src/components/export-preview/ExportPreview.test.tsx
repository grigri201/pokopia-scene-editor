import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createSkillMarker, createTileInstance, buildImageExportSummary } from '../../domain/scene';
import { unsafeAngleText, unsafeScriptText } from '../../test/fixtures/unsafe-text';
import { ExportPreview } from './ExportPreview';

describe('ExportPreview', () => {
  it('renders the title, overall materials, layer graphics, layer materials and empty layers', () => {
    const onClose = vi.fn();
    const summary = buildImageExportSummary(createPreviewScene());

    render(<ExportPreview summary={summary} downloadDisabled onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: '图片导出预览' })).toBeVisible();
    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    const pokemonTitleImage = screen.getByLabelText('百变怪导出预览宝可梦图片');
    expect(pokemonTitleImage).toBeVisible();
    expect(pokemonTitleImage).toHaveClass('export-preview__pokemon-title-image');
    expect(within(pokemonTitleImage).getByAltText('百变怪宝可梦图片')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/pokemon_portraits/063-ditto.png'),
    );
    expect(document.querySelector('.export-preview__pokemon-rail')).toBeNull();
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('绿叶植物');
    expect(screen.getByLabelText('整体使用素材清单')).not.toHaveTextContent('No. 1052');
    expect(screen.getByLabelText('Export image content').firstElementChild).toBe(screen.getByLabelText('整体使用素材清单'));
    expect(within(screen.getByLabelText('整体使用素材清单')).getByAltText('绿叶植物缩略图')).toBeVisible();
    expect(screen.getByLabelText('整体技能数量')).toHaveTextContent('技能数量');
    expect(screen.getByLabelText('整体技能数量')).toHaveTextContent('树叶');
    expect(screen.getByLabelText('整体技能数量')).toHaveTextContent('储水');
    expect(screen.getByLabelText('整体技能数量')).toHaveTextContent('x1');
    expect(within(screen.getByLabelText('整体技能数量')).getByAltText('树叶技能图标')).toBeVisible();
    expect(within(screen.getByLabelText('逐层图形和素材清单')).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'L0 · 0层',
      'L1 · 1层',
      'L2 · 2层',
    ]);
    expect(screen.getByLabelText('逐层图形和素材清单')).not.toHaveTextContent('placed items');
    expect(screen.getByLabelText('L1 7x7 图形').querySelectorAll('.export-layer-cell')).toHaveLength(49);
    const previewCell = screen.getByLabelText('3,3: 绿叶植物');
    expect(previewCell).toHaveTextContent('');
    expect(previewCell.querySelector('img')).toHaveAttribute('src', expect.stringContaining('leafy-plant'));
    const skillCell = screen.getByLabelText('4,4: 储水技能');
    expect(skillCell.querySelector('img')).toHaveAttribute('src', expect.stringContaining('specialty_icons/water.png'));
    expect(screen.getByLabelText('L1 使用素材清单')).toHaveTextContent('绿叶植物');
    expect(within(screen.getByLabelText('L1 使用素材清单')).getByAltText('绿叶植物缩略图')).toBeVisible();
    expect(screen.getByLabelText('L1 使用素材清单')).not.toHaveTextContent('No. 1052');
    expect(screen.getByLabelText('L1 使用素材清单')).not.toHaveTextContent('(3, 3)');
    expect(screen.getByLabelText('L1 使用素材清单')).not.toHaveTextContent(unsafeAngleText);
    expect(screen.getByLabelText('L1 技能数量')).toHaveTextContent('树叶');
    expect(screen.getByLabelText('L1 技能数量')).toHaveTextContent('储水');
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('该层没有素材');
    expect(screen.getAllByText('空层')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render instance detail text from layer material summaries', () => {
    const { container } = render(<ExportPreview summary={buildImageExportSummary(createPreviewScene())} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    expect(within(screen.getByLabelText('L1 使用素材清单')).queryByText((content) => content.includes(unsafeAngleText))).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('L1 技能数量')).queryByText((content) => content.includes(unsafeAngleText))).not.toBeInTheDocument();
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
    skillMarkers: [
      createSkillMarker({
        coordinate: { x: 4, y: 4 },
        buildingLevelId: 'level-1',
        skillType: '储水',
        skillNote: unsafeAngleText,
      }),
    ],
  };
}
