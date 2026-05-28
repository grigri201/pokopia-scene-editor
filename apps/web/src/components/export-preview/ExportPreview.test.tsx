import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildImageExportSummary,
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractScene,
  createSkillMarker,
  createTileInstance,
  footprintContractFixtureIds,
} from '@pokopia-scene-editor/scene-core';
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
    expect(screen.getByText('7x7 画布 · 3 个建筑层')).toBeVisible();
    expect(document.querySelector('.export-preview__pokemon-rail')).toBeNull();
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('绿叶植物');
    expect(screen.getByLabelText('整体使用素材清单')).not.toHaveTextContent('No. 1052');
    expect(screen.getByLabelText('图片导出内容').firstElementChild).toBe(screen.getByLabelText('整体使用素材清单'));
    expect(within(screen.getByLabelText('整体使用素材清单')).getByAltText('绿叶植物缩略图')).toBeVisible();
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('树叶');
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('储水');
    expect(within(screen.getByLabelText('整体使用素材清单')).getByAltText('树叶技能图标')).toBeVisible();
    expect(within(screen.getByLabelText('整体使用素材清单')).getByAltText('储水技能图标')).toBeVisible();
    expect(screen.queryByLabelText('整体技能数量')).not.toBeInTheDocument();
    expect(within(screen.getByLabelText('逐层图形和素材清单')).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual([
      'L1 · 1层',
      'L2 · 2层',
      'L3 · 3层',
    ]);
    expect(screen.getByLabelText('逐层图形和素材清单')).not.toHaveTextContent('placed items');
    expect(screen.getByLabelText('L2 7x7 图形').querySelectorAll('.export-layer-cell')).toHaveLength(49);
    const layerGraphicFrame = screen.getByLabelText('L2 7x7 图形').closest('.export-layer-grid-frame');
    expect(layerGraphicFrame).not.toBeNull();
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--origin')).toHaveTextContent('0,0');
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--origin')).toHaveAttribute('aria-hidden', 'true');
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--max')).toHaveTextContent('6,6');
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--max')).toHaveAttribute('aria-hidden', 'true');
    const previewCell = screen.getByLabelText('3,3: 绿叶植物');
    expect(previewCell).toHaveTextContent('');
    expect(previewCell.querySelector('img')).toHaveAttribute('src', expect.stringContaining('leafy-plant'));
    const skillCell = screen.getByLabelText('4,4: 储水技能');
    expect(skillCell.querySelector('img')).toHaveAttribute('src', expect.stringContaining('specialty_icons/water.png'));
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('绿叶植物');
    expect(within(screen.getByLabelText('L2 使用素材清单')).getByAltText('绿叶植物缩略图')).toBeVisible();
    expect(screen.getByLabelText('L2 使用素材清单')).not.toHaveTextContent('No. 1052');
    expect(screen.getByLabelText('L2 使用素材清单')).not.toHaveTextContent('(3, 3)');
    expect(screen.getByLabelText('L2 使用素材清单')).not.toHaveTextContent(unsafeAngleText);
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('树叶');
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('储水');
    expect(within(screen.getByLabelText('L2 使用素材清单')).getByAltText('储水技能图标')).toBeVisible();
    expect(screen.queryByLabelText('L2 技能数量')).not.toBeInTheDocument();
    expect(screen.getByLabelText('L3 使用素材清单')).toHaveTextContent('该层没有素材');
    expect(screen.getAllByText('空层')).toHaveLength(2);
    const logo = screen.getByLabelText('pokokit 彩色 logo');
    expect(logo).toBeVisible();
    expect(logo).toHaveTextContent('pokokit');
    expect(logo.closest('[data-image-export-exclude="true"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render instance detail text from layer material summaries', () => {
    const { container } = render(<ExportPreview summary={buildImageExportSummary(createPreviewScene())} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    expect(within(screen.getByLabelText('L2 使用素材清单')).queryByText((content) => content.includes(unsafeAngleText))).not.toBeInTheDocument();
    expect(screen.queryByLabelText('L2 技能数量')).not.toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByAltText(unsafeAngleText)).not.toBeInTheDocument();
    expect(screen.queryByAltText(unsafeScriptText)).not.toBeInTheDocument();
  });

  it('renders system-provided export content in English mode', () => {
    const summary = buildImageExportSummary(createPreviewScene(), 'en-US');

    render(<ExportPreview locale="en-US" summary={summary} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Image export preview' })).toBeVisible();
    expect(screen.getByLabelText('Ditto export preview Pokemon image')).toBeVisible();
    expect(screen.getByText('7x7 canvas · 3 building layers')).toBeVisible();
    expect(screen.getByLabelText('Overall material list')).toHaveTextContent(/Leafy/i);
    expect(screen.getByLabelText('Overall material list')).toHaveTextContent('Leaf');
    expect(screen.getByLabelText('Overall material list')).toHaveTextContent('Water Storage');
    expect(screen.getByLabelText('L2 material list')).toHaveTextContent(/Leafy/i);
    expect(screen.getByLabelText('L3 material list')).toHaveTextContent('No materials on this layer');
    expect(screen.getAllByText('Empty layer')).toHaveLength(2);
    expect(screen.getByLabelText('4,4: Water skill')).toBeVisible();
    expect(screen.getByLabelText('Layer graphics and material lists')).toBeVisible();
    expect(screen.getByLabelText('pokokit color logo')).toHaveTextContent('pokokit');
    expect(screen.getByLabelText('Image export content')).not.toHaveTextContent(/[一-龥]/);
  });

  it('uses a singular English layer summary for one-layer exports', () => {
    const summary = buildImageExportSummary(createDefaultSceneDocument(), 'en-US');

    render(<ExportPreview locale="en-US" summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText('7x7 canvas · 1 building layer')).toBeVisible();
  });

  it('renders footprint overlays in layer graphics while keeping material lists instance-count based', () => {
    render(<ExportPreview summary={buildImageExportSummary(createFootprintContractScene())} onClose={vi.fn()} />);

    const layerGraphic = screen.getByLabelText('L1 7x7 图形');
    const layerMaterials = screen.getByLabelText('L1 使用素材清单');
    const benchOverlay = screen.getByTestId(`export-footprint-overlay-${footprintContractFixtureIds.bench}`);
    const chairOverlay = screen.getByTestId(`export-footprint-overlay-${footprintContractFixtureIds.rug}`);

    expect(layerGraphic.querySelectorAll('.export-layer-cell')).toHaveLength(49);
    expect(benchOverlay).toHaveAttribute('data-footprint-asset-id', 'wooden-bench');
    expect(benchOverlay).toHaveAttribute('data-effective-footprint', '1x2x1');
    expect(benchOverlay).toHaveAttribute('data-occupied-cells', '2,1 2,2');
    expect(chairOverlay).toHaveAttribute('data-footprint-asset-id', 'deck-chair');
    expect(chairOverlay).toHaveAttribute('data-effective-footprint', '2x1x1');
    expect(layerMaterials.querySelectorAll('li')).toHaveLength(5);
    expect(Array.from(layerMaterials.querySelectorAll('.export-material-list__row span')).map((node) => node.textContent)).toEqual([
      'x2',
      'x2',
      'x1',
      'x1',
      'x1',
    ]);
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

  it('enables download when a handler exists and delegates download feedback', () => {
    const onDownloadImage = vi.fn();

    render(
      <ExportPreview
        summary={buildImageExportSummary(createPreviewScene())}
        onClose={vi.fn()}
        onDownloadImage={onDownloadImage}
      />,
    );

    const downloadButton = screen.getByRole('button', { name: '下载图片' });
    expect(downloadButton).toBeEnabled();
    fireEvent.click(downloadButton);

    expect(onDownloadImage).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status', { name: 'Image export download status' })).not.toBeInTheDocument();
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
