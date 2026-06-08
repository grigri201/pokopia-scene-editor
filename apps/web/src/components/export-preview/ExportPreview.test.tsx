import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  buildImageExportSummary,
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractScene,
  createSceneDimensionsForCanvasSize,
  createSkillMarker,
  createStackingPartialSurfaceScene,
  createStackingPlateFoodScene,
  createTileInstance,
  footprintContractExpected,
  footprintContractFixtureIds,
  stackingContractFixtureIds,
  type GridCoordinate,
  type ImageExportSummary,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import { unsafeAngleText, unsafeImageText, unsafeScriptText } from '../../test/fixtures/unsafe-text';
import { ExportPreview, ExportPreviewContent } from './ExportPreview';

describe('ExportPreview', () => {
  it('renders the title, overall materials, layer graphics, layer materials and empty layers', () => {
    const onClose = vi.fn();
    const scene = createPreviewScene();
    const summary = buildImageExportSummary(scene);
    const expectedCellCount = getCanvasCellCount(scene.canvasSize);

    expect(summary.canvasSize).toEqual(scene.canvasSize);
    expect(summary.layers[1]?.cells).toHaveLength(expectedCellCount);

    render(<ExportPreview summary={summary} downloadDisabled onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: '下载预览' })).toBeVisible();
    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    const pokemonTitleImage = screen.getByLabelText('百变怪导出预览宝可梦图片');
    expect(pokemonTitleImage).toBeVisible();
    expect(pokemonTitleImage).toHaveClass('export-preview__pokemon-title-image');
    expect(within(pokemonTitleImage).getByAltText('百变怪宝可梦图片')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/pokopia_image_sources/pokemon_portraits/063-ditto.png'),
    );
    expect(screen.getByText(`${scene.canvasSize.width}x${scene.canvasSize.height} 画布 · ${scene.buildingLevels.length} 个建筑层`)).toBeVisible();
    expect(document.querySelector('.export-preview__pokemon-rail')).toBeNull();
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('大叶子的植栽');
    expect(screen.getByLabelText('整体使用素材清单')).toHaveAttribute('data-image-export-page', 'overall');
    expect(screen.getByLabelText('整体使用素材清单')).toHaveAttribute('data-image-export-file-part', 'overall');
    expect(screen.getByLabelText('整体使用素材清单')).not.toHaveTextContent('No. 336');
    expect(screen.getByLabelText('图片导出内容').firstElementChild).toBe(screen.getByLabelText('整体使用素材清单'));
    expect(within(screen.getByLabelText('整体使用素材清单')).getByAltText('大叶子的植栽缩略图')).toBeVisible();
    const overallMaterialItem = within(screen.getByLabelText('整体使用素材清单')).getByText('大叶子的植栽').closest('li');
    expect(overallMaterialItem).not.toBeNull();
    expect(overallMaterialItem?.style.getPropertyValue('--export-material-color')).toBe('');
    expect(overallMaterialItem?.querySelector('.export-material-list__color')).toBeNull();
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
    const activeLayer = summary.layers[1];
    const activeLayerGraphicLabel = getLayerGraphicLabel(activeLayer, scene.canvasSize);
    expect(screen.getByLabelText('L2 2层')).toHaveAttribute('data-image-export-page', 'layer');
    expect(screen.getByLabelText('L2 2层')).toHaveAttribute('data-image-export-file-part', 'L2');
    expect(screen.getByLabelText(activeLayerGraphicLabel).querySelectorAll('.export-layer-cell')).toHaveLength(expectedCellCount);
    const layerGraphicFrame = screen.getByLabelText(activeLayerGraphicLabel).closest('.export-layer-grid-frame');
    expect(layerGraphicFrame).not.toBeNull();
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--origin')).toHaveTextContent('0,0');
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--origin')).toHaveAttribute('aria-hidden', 'true');
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--max')).toHaveTextContent(getMaxCoordinateText(scene.canvasSize));
    expect(layerGraphicFrame?.querySelector('.export-layer-coordinate-label--max')).toHaveAttribute('aria-hidden', 'true');
    const previewCell = screen.getByLabelText('3,3: 大叶子的植栽');
    expect(previewCell).toHaveTextContent('');
    expect(previewCell.querySelector('img')).toHaveAttribute('src', expect.stringContaining('leafy-plant'));
    const skillCell = screen.getByLabelText('4,4: 储水技能');
    expect(skillCell.querySelector('img')).toHaveAttribute('src', expect.stringContaining('specialty_icons/water.png'));
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('大叶子的植栽');
    expect(within(screen.getByLabelText('L2 使用素材清单')).getByAltText('大叶子的植栽缩略图')).toBeVisible();
    expect(screen.getByLabelText('L2 使用素材清单')).not.toHaveTextContent('No. 336');
    expect(screen.getByLabelText('L2 使用素材清单')).not.toHaveTextContent('(3, 3)');
    expect(screen.getByLabelText('L2 使用素材清单')).not.toHaveTextContent(unsafeAngleText);
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('树叶');
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('储水');
    const leafyMaterialItem = within(screen.getByLabelText('L2 使用素材清单')).getByText('大叶子的植栽').closest('li');
    expect(leafyMaterialItem).not.toBeNull();
    const leafyMaterialColor = leafyMaterialItem?.style.getPropertyValue('--export-material-color');
    expect(leafyMaterialColor).toBeTruthy();
    expect(leafyMaterialItem?.querySelector('.export-material-list__color')).toBeNull();
    expect(previewCell).toHaveAttribute('data-material-asset-id', 'leafy-plant');
    expect(previewCell.style.getPropertyValue('--export-material-color')).toBe(leafyMaterialColor);
    expect(skillCell).toHaveAttribute('data-material-color', '');
    expect(within(screen.getByLabelText('L2 使用素材清单')).getByAltText('储水技能图标')).toBeVisible();
    expect(screen.queryByLabelText('L2 技能数量')).not.toBeInTheDocument();
    expect(screen.getByLabelText('L2 层备注')).toHaveTextContent(unsafeAngleText);
    expect(screen.getByLabelText('L2 层备注')).toHaveTextContent(unsafeImageText);
    expect(within(screen.getByLabelText('L2 层备注')).getByRole('heading', { name: '层备注' })).toBeVisible();
    expect(screen.queryByLabelText('L3 层备注')).not.toBeInTheDocument();
    expect(screen.getByLabelText('L3 使用素材清单')).toHaveTextContent('该层没有素材');
    expect(screen.getAllByText('空层')).toHaveLength(2);
    const logo = screen.getByLabelText('pokokit 彩色 logo');
    expect(logo).toBeVisible();
    expect(logo).toHaveTextContent('pokokit');
    expect(logo.closest('[data-image-export-exclude="true"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  }, 15_000);

  it('does not render instance detail text from layer material summaries', () => {
    const { container } = render(<ExportPreview summary={buildImageExportSummary(createPreviewScene())} onClose={vi.fn()} />);

    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    expect(within(screen.getByLabelText('L2 使用素材清单')).queryByText((content) => content.includes(unsafeAngleText))).not.toBeInTheDocument();
    expect(screen.queryByLabelText('L2 技能数量')).not.toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(screen.queryByAltText(unsafeAngleText)).not.toBeInTheDocument();
    expect(screen.queryByAltText(unsafeScriptText)).not.toBeInTheDocument();
  });

  it('assigns distinct layer material colors beyond the first dozen materials', () => {
    render(<ExportPreview summary={buildImageExportSummary(createManyMaterialScene())} onClose={vi.fn()} />);

    const materialItems = Array.from(
      screen.getByLabelText('L1 使用素材清单').querySelectorAll<HTMLElement>('li[data-export-item-kind="material"]'),
    );
    const materialColors = materialItems.map((item) => item.style.getPropertyValue('--export-material-color'));

    expect(materialItems).toHaveLength(manyMaterialAssetIds.length);
    expect(materialColors.every(Boolean)).toBe(true);
    expect(materialColors.every((color) => /^#[0-9A-F]{6}$/.test(color))).toBe(true);
    expect(new Set(materialColors).size).toBe(manyMaterialAssetIds.length);
    expect(getMinimumOklabDistance(materialColors)).toBeGreaterThan(0.1);
  });

  it('renders system-provided export content in English mode', () => {
    const scene = createPreviewScene();
    const summary = buildImageExportSummary(scene, 'en-US');

    render(<ExportPreview locale="en-US" summary={summary} onClose={vi.fn()} />);

    expect(screen.getByRole('dialog', { name: 'Download preview' })).toBeVisible();
    expect(screen.getByLabelText('Ditto export preview Pokemon image')).toBeVisible();
    expect(screen.getByText(`${scene.canvasSize.width}x${scene.canvasSize.height} canvas · ${scene.buildingLevels.length} building layers`)).toBeVisible();
    expect(screen.getByLabelText('Overall material list')).toHaveTextContent(/Leafy/i);
    expect(screen.getByLabelText('Overall material list')).toHaveTextContent('Leaf');
    expect(screen.getByLabelText('Overall material list')).toHaveTextContent('Water Storage');
    expect(screen.getByLabelText('L2 material list')).toHaveTextContent(/Leafy/i);
    expect(screen.getByLabelText('L2 layer notes')).toHaveTextContent(unsafeAngleText);
    expect(within(screen.getByLabelText('L2 layer notes')).getByRole('heading', { name: 'Layer notes' })).toBeVisible();
    expect(screen.queryByLabelText('L3 layer notes')).not.toBeInTheDocument();
    expect(screen.getByLabelText('L3 material list')).toHaveTextContent('No materials on this layer');
    expect(screen.getAllByText('Empty layer')).toHaveLength(2);
    expect(screen.getByLabelText('4,4: Water skill')).toBeVisible();
    expect(screen.getByLabelText('Layer graphics and material lists')).toBeVisible();
    expect(screen.getByLabelText('pokokit color logo')).toHaveTextContent('pokokit');
    expect(screen.getByLabelText('Image export content')).not.toHaveTextContent(/[一-龥]/);
  });

  it('renders the shared export content inline without dialog, backdrop or download controls', () => {
    const scene = createPreviewScene();
    const summary = buildImageExportSummary(scene);

    render(<ExportPreviewContent summary={summary} />);

    expect(screen.queryByRole('dialog', { name: '下载预览' })).not.toBeInTheDocument();
    expect(document.querySelector('.export-preview-backdrop')).toBeNull();
    expect(document.querySelector('[aria-modal]')).toBeNull();
    expect(screen.queryByRole('button', { name: '下载图片' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '按层下载图片' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '关闭' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
    expect(screen.getByLabelText('百变怪导出预览宝可梦图片')).toBeVisible();
    expect(screen.getByText(`${scene.canvasSize.width}x${scene.canvasSize.height} 画布 · ${scene.buildingLevels.length} 个建筑层`)).toBeVisible();
    expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('大叶子的植栽');
    expect(screen.getByLabelText('逐层图形和素材清单')).toBeVisible();
    expect(screen.getByLabelText('L2 17x17 图形').querySelectorAll('.export-layer-cell')).toHaveLength(289);
    expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('大叶子的植栽');
    expect(screen.getByLabelText('L2 层备注')).toHaveTextContent(unsafeAngleText);
    expect(screen.getByLabelText('pokokit 彩色 logo')).toHaveTextContent('pokokit');
  });

  it('keeps auth and ownership fields out of shared export preview content', () => {
    const summary = buildImageExportSummary(withForbiddenAuthFields(createPreviewScene()));

    render(<ExportPreviewContent summary={summary} />);

    const content = screen.getByLabelText('图片导出内容');
    expectForbiddenAuthKeysAbsent(summary);
    expectForbiddenAuthKeysAbsent(content.textContent ?? '');
    expectForbiddenAuthAttributesAbsent(content);
  });

  it('keeps desktop modal and inline content in parity for the same scene summary', () => {
    const scene = createPreviewScene();
    const summary = buildImageExportSummary(scene);

    const { unmount } = render(<ExportPreview summary={summary} downloadDisabled onClose={vi.fn()} />);
    const desktopSnapshot = collectSharedExportContentSnapshot(scene);

    expect(screen.getByRole('dialog', { name: '下载预览' })).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('button', { name: '下载图片' })).toBeVisible();
    expect(screen.getByRole('button', { name: '按层下载图片' })).toBeVisible();

    unmount();
    render(<ExportPreviewContent summary={summary} />);

    expect(collectSharedExportContentSnapshot(scene)).toEqual(desktopSnapshot);
    expect(screen.queryByRole('dialog', { name: '下载预览' })).not.toBeInTheDocument();
    expect(document.querySelector('.export-preview-backdrop')).toBeNull();
    expect(document.querySelector('[aria-modal]')).toBeNull();
    expect(screen.queryByRole('button', { name: '下载图片' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '按层下载图片' })).not.toBeInTheDocument();
  });

  it('uses a singular English layer summary for one-layer exports', () => {
    const scene = createDefaultSceneDocument();
    const summary = buildImageExportSummary(scene, 'en-US');

    render(<ExportPreview locale="en-US" summary={summary} onClose={vi.fn()} />);

    expect(screen.getByText(`${scene.canvasSize.width}x${scene.canvasSize.height} canvas · ${scene.buildingLevels.length} building layer`)).toBeVisible();
  });

  it('shrinks rectangular layer graphics from the longest side so export preview cells stay square', () => {
    const dimensions = createSceneDimensionsForCanvasSize({ width: 6, height: 17 });
    const baseScene = createDefaultSceneDocument({
      sceneId: 'scene-export-preview-rectangular',
      sceneName: 'Rectangular export preview',
      now: '2026-05-29T00:00:00.000Z',
    });
    const rectangularScene = {
      ...baseScene,
      sceneSize: dimensions.sceneSize,
      canvasSize: dimensions.canvasSize,
      outerPadding: dimensions.outerPadding,
    };

    render(<ExportPreview summary={buildImageExportSummary(rectangularScene)} onClose={vi.fn()} />);

    const layerGraphic = screen.getByLabelText('L1 6x17 图形');
    expect(layerGraphic.querySelectorAll('.export-layer-cell')).toHaveLength(102);
    expect(layerGraphic).toHaveStyle({
      '--export-grid-columns': '6',
      '--export-grid-rows': '17',
      '--export-grid-aspect-ratio': '6 / 17',
      '--export-grid-width': '81.1765px',
    });
  });

  it('renders footprint overlays in layer graphics while keeping material lists instance-count based', () => {
    const scene = createFootprintContractScene();
    const summary = buildImageExportSummary(scene);
    const benchSource = getSceneTileInstance(scene, footprintContractFixtureIds.bench);
    const rugSource = getSceneTileInstance(scene, footprintContractFixtureIds.rug);

    render(<ExportPreview summary={summary} onClose={vi.fn()} />);

    const layerGraphic = screen.getByLabelText('L1 7x7 图形');
    const layerMaterials = screen.getByLabelText('L1 使用素材清单');
    const benchOverlay = screen.getByTestId(`export-footprint-overlay-${footprintContractFixtureIds.bench}`);
    const chairOverlay = screen.getByTestId(`export-footprint-overlay-${footprintContractFixtureIds.rug}`);
    const benchMaterial = layerMaterials.querySelector<HTMLElement>(`li[data-material-asset-id="${benchSource.assetId}"]`);

    expect(layerGraphic.querySelectorAll('.export-layer-cell')).toHaveLength(summary.layers[0].cells.length);
    expect(benchOverlay).toHaveAttribute('data-footprint-asset-id', benchSource.assetId);
    expect(benchOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.bench]));
    expect(benchOverlay).toHaveAttribute('data-occupied-cells', formatCoordinates(footprintContractExpected.occupiedCells[footprintContractFixtureIds.bench]));
    expect(benchMaterial?.querySelector('.export-material-list__color')).toBeNull();
    expect(benchOverlay.style.getPropertyValue('--export-material-color')).toBe(
      benchMaterial?.style.getPropertyValue('--export-material-color'),
    );
    expect(chairOverlay).toHaveAttribute('data-footprint-asset-id', rugSource.assetId);
    expect(chairOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rug]));
    expect(layerMaterials.querySelectorAll('li')).toHaveLength(5);
    expect(Array.from(layerMaterials.querySelectorAll('.export-material-list__row span')).map((node) => node.textContent)).toEqual([
      'x2',
      'x2',
      'x1',
      'x1',
      'x1',
    ]);
  });

  it('renders stacking relations as split export cells while keeping material lists instance-count based', () => {
    const summary = buildImageExportSummary(createStackingPlateFoodScene());
    const relation = getExportStackingRelation(summary, stackingContractFixtureIds.food);
    const baseInstance = getExportInstance(summary, relation.baseInstanceId);
    const topInstance = getExportInstance(summary, relation.topInstanceId);

    render(<ExportPreview summary={summary} onClose={vi.fn()} />);

    const layerGraphic = screen.getByLabelText('L1 7x7 图形');
    const layerMaterials = screen.getByLabelText('L1 使用素材清单');
    const stackingCell = screen.getByLabelText('2,2: 苹野果 stacked on 盘子');

    expect(summary.stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: relation.topInstanceId,
        topAssetId: relation.topAssetId,
        baseInstanceId: relation.baseInstanceId,
        baseAssetId: relation.baseAssetId,
        surfaceKind: relation.surfaceKind,
      }),
    ]);
    expect(layerGraphic.querySelectorAll('.export-layer-cell')).toHaveLength(summary.layers[0].cells.length);
    expect(stackingCell).toHaveAttribute('data-stacking-state', 'placed');
    expect(stackingCell).toHaveAttribute('data-stacking-base-instance-id', relation.baseInstanceId);
    expect(stackingCell).toHaveAttribute('data-stacking-top-instance-id', relation.topInstanceId);
    expect(stackingCell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(baseInstance.effectiveFootprint));
    expect(stackingCell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(topInstance.effectiveFootprint));
    expect(stackingCell).toHaveAttribute('data-stacking-surface-kind', relation.surfaceKind);
    expect(stackingCell.querySelector('.export-stacking-split')).toHaveAttribute('data-stacking-base-visibility', 'visible');
    expect(stackingCell.querySelector('.export-stacking-split')).toHaveAttribute('data-stacking-split-axis', 'block');
    expect(stackingCell.querySelector('[data-stacking-role="top"]')).toHaveAttribute('data-asset-id', relation.topAssetId);
    expect(stackingCell.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-asset-id', relation.baseAssetId);
    expect(stackingCell.querySelector('[data-stacking-role="base"] img')).toHaveAttribute('src', expect.stringContaining(relation.baseAssetId));
    expect(layerMaterials.querySelectorAll('li')).toHaveLength(2);
    expect(Array.from(layerMaterials.querySelectorAll('.export-material-list__row span')).map((node) => node.textContent)).toEqual([
      'x1',
      'x1',
    ]);
  });

  it('renders multi-cell base overlays behind stacked export cells', () => {
    const summary = buildImageExportSummary(createLargeRugStackingScene());
    const relation = getExportStackingRelation(summary, 'export-top-plant');
    const baseInstance = getExportInstance(summary, relation.baseInstanceId);
    const topInstance = getExportInstance(summary, relation.topInstanceId);

    render(<ExportPreview summary={summary} onClose={vi.fn()} />);

    const layerGraphic = screen.getByLabelText('L1 17x17 图形');
    const layerMaterials = screen.getByLabelText('L1 使用素材清单');
    const rugOverlay = screen.getByTestId('export-footprint-overlay-export-base-large-rug');
    const stackingCell = layerGraphic.querySelector<HTMLElement>('[data-stacking-top-instance-id="export-top-plant"]');
    const stackingSplit = stackingCell?.querySelector('.export-stacking-split');

    expect(summary.stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: relation.topInstanceId,
        topAssetId: relation.topAssetId,
        baseInstanceId: relation.baseInstanceId,
        baseAssetId: relation.baseAssetId,
        surfaceKind: relation.surfaceKind,
      }),
    ]);
    expect(rugOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(baseInstance.effectiveFootprint));
    expect(rugOverlay).toHaveAttribute('data-occupied-cells', formatCoordinates(baseInstance.occupiedCells));
    expect(rugOverlay).toHaveAttribute('data-stacking-state', '');
    expect(rugOverlay).toHaveAttribute('data-stacking-role', '');
    expect(rugOverlay.querySelector('.export-stacking-split')).toBeNull();
    expect(rugOverlay.querySelector('img')).toHaveAttribute('src', expect.stringContaining(relation.baseAssetId));
    expect(stackingCell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(baseInstance.effectiveFootprint));
    expect(stackingCell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(topInstance.effectiveFootprint));
    expect(stackingCell).toHaveAttribute('data-stacking-base-visibility', 'hidden');
    expect(stackingCell).toHaveAttribute('data-stacking-base-render', 'overlay');
    expect(stackingCell).toHaveAttribute('data-stacking-top-render', 'cell');
    expect(stackingSplit).toHaveClass('export-stacking-split--base-hidden');
    expect(stackingSplit).toHaveAttribute('data-stacking-base-render', 'overlay');
    expect(stackingSplit).toHaveAttribute('data-stacking-top-render', 'cell');
    expect(stackingSplit?.querySelector('[data-stacking-role="top"] img')).toHaveAttribute('src', expect.stringContaining(relation.topAssetId));
    expect(stackingSplit?.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-base-image-visible', 'false');
    expect(stackingSplit?.querySelector('[data-stacking-role="base"] img')).toBeNull();
    expect(layerMaterials.querySelectorAll('li')).toHaveLength(2);
    expect(Array.from(layerMaterials.querySelectorAll('.export-material-list__row span')).map((node) => node.textContent)).toEqual([
      'x1',
      'x1',
    ]);
  });

  it('renders partial stacking on the overlapped export cell while keeping the multi-cell top overlay', () => {
    const summary = buildImageExportSummary(createStackingPartialSurfaceScene());
    const relation = getExportStackingRelation(summary, stackingContractFixtureIds.partialTop);
    const baseInstance = getExportInstance(summary, relation.baseInstanceId);
    const topInstance = getExportInstance(summary, relation.topInstanceId);

    render(<ExportPreview summary={summary} onClose={vi.fn()} />);

    const stackedCell = screen.getByLabelText('1,1: 木长椅 stacked on 长方形小地垫');
    const baseOverlay = screen.getByTestId(`export-footprint-overlay-${relation.baseInstanceId}`);
    const topOverlay = screen.getByTestId(`export-footprint-overlay-${stackingContractFixtureIds.partialTop}`);

    expect(summary.stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: relation.topInstanceId,
        baseInstanceId: relation.baseInstanceId,
        surfaceKind: relation.surfaceKind,
        coordinates: relation.coordinates,
      }),
    ]);
    expect(stackedCell).toHaveAttribute('data-stacking-state', 'placed');
    expect(stackedCell).toHaveAttribute('data-stacking-base-instance-id', relation.baseInstanceId);
    expect(stackedCell).toHaveAttribute('data-stacking-top-instance-id', relation.topInstanceId);
    expect(stackedCell).toHaveAttribute('data-stacking-base-footprint', formatFootprint(baseInstance.effectiveFootprint));
    expect(stackedCell).toHaveAttribute('data-stacking-top-footprint', formatFootprint(topInstance.effectiveFootprint));
    expect(stackedCell.querySelector('.export-stacking-split')).toHaveAttribute('data-stacking-base-visibility', 'visible');
    expect(stackedCell).toHaveAttribute('data-stacking-base-render', 'overlay');
    expect(stackedCell).toHaveAttribute('data-stacking-top-render', 'overlay');
    expect(stackedCell.querySelector('.export-stacking-split')).toHaveAttribute('data-stacking-base-render', 'overlay');
    expect(stackedCell.querySelector('.export-stacking-split')).toHaveAttribute('data-stacking-top-render', 'overlay');
    expect(stackedCell.querySelector('[data-stacking-role="top"]')).toHaveAttribute('data-top-image-visible', 'false');
    expect(stackedCell.querySelector('[data-stacking-role="top"] img')).toBeNull();
    expect(stackedCell.querySelector('[data-stacking-role="base"]')).toHaveAttribute('data-base-image-visible', 'false');
    expect(stackedCell.querySelector('[data-stacking-role="base"] img')).toBeNull();
    expect(baseOverlay).toHaveAttribute('data-footprint-instance-id', relation.baseInstanceId);
    expect(baseOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(baseInstance.effectiveFootprint));
    expect(baseOverlay.querySelector('img')).toHaveAttribute('src', expect.stringContaining(relation.baseAssetId));
    expect(topOverlay).toHaveAttribute('data-footprint-instance-id', relation.topInstanceId);
    expect(topOverlay).toHaveAttribute('data-effective-footprint', formatFootprint(topInstance.effectiveFootprint));
    expect(topOverlay).toHaveAttribute('data-stacking-state', 'placed');
    expect(topOverlay).toHaveAttribute('data-stacking-role', 'top');
    expect(topOverlay).toHaveAttribute('data-stacking-base-instance-id', relation.baseInstanceId);
    expect(topOverlay).toHaveAttribute('data-stacking-top-instance-id', relation.topInstanceId);
    expect(topOverlay).toHaveAttribute('data-stacking-base-footprint', formatFootprint(baseInstance.effectiveFootprint));
    expect(topOverlay).toHaveAttribute('data-stacking-top-footprint', formatFootprint(topInstance.effectiveFootprint));
    expect(topOverlay).toHaveAttribute('data-stacking-top-crop-axis', 'block');
    expect(topOverlay.querySelectorAll('img')).toHaveLength(1);
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

    fireEvent.keyDown(screen.getByRole('dialog', { name: '下载预览' }), { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    fireEvent.keyDown(screen.getByRole('dialog', { name: '下载预览' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
  });

  it('enables download when a handler exists and delegates download feedback', () => {
    const onDownloadImage = vi.fn();
    const onDownloadLayerImages = vi.fn();

    render(
      <ExportPreview
        summary={buildImageExportSummary(createPreviewScene())}
        onClose={vi.fn()}
        onDownloadImage={onDownloadImage}
        onDownloadLayerImages={onDownloadLayerImages}
      />,
    );

    const downloadButton = screen.getByRole('button', { name: '下载图片' });
    const layerDownloadButton = screen.getByRole('button', { name: '按层下载图片' });
    expect(downloadButton).toBeEnabled();
    expect(layerDownloadButton).toBeEnabled();
    fireEvent.click(downloadButton);
    fireEvent.click(layerDownloadButton);

    expect(onDownloadImage).toHaveBeenCalledTimes(1);
    expect(onDownloadLayerImages).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('status', { name: 'Image export download status' })).not.toBeInTheDocument();
  });

  it('shows download status while the shell is generating an image', () => {
    render(
      <ExportPreview
        summary={buildImageExportSummary(createPreviewScene())}
        downloadDisabled
        downloadStatus="正在生成图片…"
        onClose={vi.fn()}
        onDownloadImage={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '下载图片' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '按层下载图片' })).toBeDisabled();
    expect(screen.getByRole('status', { name: '图片下载状态' })).toHaveTextContent('正在生成图片');
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
    buildingLevels: [
      createBuildingLevel(0),
      {
        ...createBuildingLevel(1),
        notes: [
          { id: 'note-export-preview-1', text: unsafeAngleText },
          { id: 'note-export-preview-2', text: unsafeImageText },
        ],
      },
      createBuildingLevel(2),
    ],
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

function withForbiddenAuthFields<T extends object>(scene: T): T {
  const contaminated = scene as unknown as Record<string, unknown>;
  contaminated['userId'] = 'auth-user';
  contaminated['session'] = { accessToken: 'session-token' };
  contaminated['owner'] = 'auth-owner';
  contaminated['visibility'] = 'private';
  contaminated['accessToken'] = 'access-token';
  contaminated['refreshToken'] = 'refresh-token';
  contaminated['workspaceState'] = {
    ...(typeof contaminated['workspaceState'] === 'object' && contaminated['workspaceState'] !== null
      ? contaminated['workspaceState']
      : {}),
    owner: 'nested-owner',
    session: { accessToken: 'nested-session-token' },
    refreshToken: 'nested-refresh-token',
  };

  return scene;
}

function expectForbiddenAuthKeysAbsent(value: unknown): void {
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  for (const key of ['userId', 'session', 'owner', 'visibility', 'accessToken', 'refreshToken']) {
    expect(raw).not.toContain(key);
  }
}

function expectForbiddenAuthAttributesAbsent(root: HTMLElement): void {
  const forbiddenNames = ['userId', 'session', 'owner', 'visibility', 'accessToken', 'refreshToken'];
  const forbiddenValues = [
    'auth-user',
    'auth-owner',
    'private',
    'access-token',
    'refresh-token',
    'session-token',
    'nested-owner',
    'nested-session-token',
    'nested-refresh-token',
  ];
  const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const attributeNames = new Set<string>();
  const attributeValues: string[] = [];

  for (const node of nodes) {
    for (const attribute of Array.from(node.attributes)) {
      attributeNames.add(attribute.name.toLowerCase());
      attributeValues.push(attribute.value);
    }
  }

  const serializedAttributeValues = JSON.stringify(attributeValues);

  for (const name of forbiddenNames) {
    const normalizedForbiddenName = name.toLowerCase();
    const kebabForbiddenName = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`).toLowerCase();
    expect(attributeNames).not.toContain(normalizedForbiddenName);
    expect(attributeNames).not.toContain(`data-${kebabForbiddenName}`);
    expect(serializedAttributeValues).not.toContain(`"${name}"`);
  }

  for (const value of forbiddenValues) {
    expect(serializedAttributeValues).not.toContain(value);
  }
}

function collectSharedExportContentSnapshot(scene: SceneDocument): Record<string, number | string> {
  const content = screen.getByLabelText('图片导出内容');
  const dimensions = `${scene.canvasSize.width}x${scene.canvasSize.height} 画布 · ${scene.buildingLevels.length} 个建筑层`;

  expect(screen.getByRole('heading', { name: unsafeScriptText })).toBeVisible();
  expect(screen.getByLabelText('百变怪导出预览宝可梦图片')).toBeVisible();
  expect(screen.getByText(dimensions)).toBeVisible();
  expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('大叶子的植栽');
  expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('树叶');
  expect(screen.getByLabelText('整体使用素材清单')).toHaveTextContent('储水');
  expect(screen.getByLabelText('逐层图形和素材清单')).toBeVisible();
  expect(screen.getByLabelText('L2 17x17 图形')).toBeVisible();
  expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('大叶子的植栽');
  expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('树叶');
  expect(screen.getByLabelText('L2 使用素材清单')).toHaveTextContent('储水');
  expect(screen.getByLabelText('L2 层备注')).toHaveTextContent(unsafeAngleText);
  expect(screen.getByLabelText('L2 层备注')).toHaveTextContent(unsafeImageText);
  expect(screen.getByLabelText('pokokit 彩色 logo')).toHaveTextContent('pokokit');
  expect(content.querySelector('script')).toBeNull();
  expect(content.querySelector('img[src="x"]')).toBeNull();

  return {
    dimensions: screen.getByText(dimensions).textContent ?? '',
    footer: normalizeSnapshotText(screen.getByLabelText('pokokit 彩色 logo').textContent ?? ''),
    heading: screen.getByRole('heading', { name: unsafeScriptText }).textContent ?? '',
    layerGraphicCells: screen.getByLabelText('L2 17x17 图形').querySelectorAll('.export-layer-cell').length,
    layerMaterials: normalizeSnapshotText(screen.getByLabelText('L2 使用素材清单').textContent ?? ''),
    layerNotes: normalizeSnapshotText(screen.getByLabelText('L2 层备注').textContent ?? ''),
    layersLabel: screen.getByLabelText('逐层图形和素材清单').getAttribute('aria-label') ?? '',
    overallMaterials: normalizeSnapshotText(screen.getByLabelText('整体使用素材清单').textContent ?? ''),
    pokemonImage: screen.getByLabelText('百变怪导出预览宝可梦图片').getAttribute('aria-label') ?? '',
  };
}

function normalizeSnapshotText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

const manyMaterialAssetIds = [
  'leppa-berry',
  'chesto-berry',
  'rawst-berry',
  'aspear-berry',
  'pecha-berry',
  'lum-berry',
  'bean',
  'tomato',
  'wheat',
  'potato',
  'fresh-carrot',
  'seaweed',
  'cave-mushrooms',
  'simple-salad',
  'leppa-salad',
  'seaweed-salad',
  'shredded-salad',
  'crushed-berry-salad',
  'crouton-salad',
  'simple-soup',
];

function createManyMaterialScene() {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-export-preview-many-materials',
    sceneName: 'Many materials',
    now: '2026-05-22T05:20:00.000Z',
  });

  return {
    ...baseScene,
    tileInstances: manyMaterialAssetIds.map((assetId, index) => createTileInstance({
      instanceId: `tile-many-materials-${index + 1}`,
      assetId,
      coordinate: {
        x: (index % 5) + 1,
        y: Math.floor(index / 5) + 1,
      },
      buildingLevelId: 'level-0',
    })),
  };
}

function createLargeRugStackingScene() {
  const scene = createDefaultSceneDocument({
    sceneId: 'scene-export-large-rug-stack',
    sceneName: 'Large Rug Stack',
    now: '2026-05-28T00:00:00.000Z',
  });

  return {
    ...scene,
    tileInstances: [
      createTileInstance({
        instanceId: 'export-base-large-rug',
        assetId: 'large-round-rug',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
      createTileInstance({
        instanceId: 'export-top-plant',
        assetId: 'leafy-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ],
  };
}

function getLayerGraphicLabel(
  layer: { displayId: string },
  canvasSize: { width: number; height: number },
): string {
  return `${layer.displayId} ${canvasSize.width}x${canvasSize.height} 图形`;
}

function getMaxCoordinateText(canvasSize: { width: number; height: number }): string {
  return `${canvasSize.width - 1},${canvasSize.height - 1}`;
}

function getCanvasCellCount(canvasSize: { width: number; height: number }): number {
  return canvasSize.width * canvasSize.height;
}

function getSceneTileInstance(scene: SceneDocument, instanceId: string): SceneDocument['tileInstances'][number] {
  const instance = scene.tileInstances.find((candidate) => candidate.instanceId === instanceId);

  if (!instance) {
    throw new Error(`Expected scene tile instance ${instanceId}.`);
  }

  return instance;
}

function getExportInstance(
  summary: ImageExportSummary,
  instanceId: string,
): ImageExportSummary['layers'][number]['cells'][number]['tileInstances'][number] {
  const instance = summary.layers
    .flatMap((layer) => layer.cells)
    .flatMap((cell) => cell.tileInstances)
    .find((candidate) => candidate.instanceId === instanceId);

  if (!instance) {
    throw new Error(`Expected export instance ${instanceId}.`);
  }

  return instance;
}

function getExportStackingRelation(
  summary: ImageExportSummary,
  topInstanceId: string,
): ImageExportSummary['stackingRelations'][number] {
  const relation = summary.stackingRelations.find((candidate) => candidate.topInstanceId === topInstanceId);

  if (!relation) {
    throw new Error(`Expected export stacking relation for ${topInstanceId}.`);
  }

  return relation;
}

function formatFootprint(footprint: { length: number; width: number; height: number } | null): string {
  if (!footprint) {
    throw new Error('Expected footprint.');
  }

  return `${footprint.length}x${footprint.width}x${footprint.height}`;
}

function formatCoordinates(coordinates: readonly GridCoordinate[]): string {
  return coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`).join(' ');
}

interface TestRgbColor {
  red: number;
  green: number;
  blue: number;
}

interface TestOklabColor {
  lightness: number;
  redGreen: number;
  blueYellow: number;
}

function getMinimumOklabDistance(colors: readonly string[]): number {
  const oklabColors = colors.map((color) => rgbToOklab(hexToRgb(color)));
  let minimumDistance = Number.POSITIVE_INFINITY;

  for (let leftIndex = 0; leftIndex < oklabColors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < oklabColors.length; rightIndex += 1) {
      minimumDistance = Math.min(
        minimumDistance,
        getOklabDistance(oklabColors[leftIndex], oklabColors[rightIndex]),
      );
    }
  }

  return minimumDistance;
}

function hexToRgb(color: string): TestRgbColor {
  const match = /^#(?<red>[0-9A-F]{2})(?<green>[0-9A-F]{2})(?<blue>[0-9A-F]{2})$/.exec(color);

  if (!match?.groups) {
    throw new RangeError(`Invalid test color: ${color}`);
  }

  return {
    red: Number.parseInt(match.groups.red, 16) / 255,
    green: Number.parseInt(match.groups.green, 16) / 255,
    blue: Number.parseInt(match.groups.blue, 16) / 255,
  };
}

function rgbToOklab(rgb: TestRgbColor): TestOklabColor {
  const red = toLinearRgb(rgb.red);
  const green = toLinearRgb(rgb.green);
  const blue = toLinearRgb(rgb.blue);
  const long = Math.cbrt((0.4122214708 * red) + (0.5363325363 * green) + (0.0514459929 * blue));
  const medium = Math.cbrt((0.2119034982 * red) + (0.6806995451 * green) + (0.1073969566 * blue));
  const short = Math.cbrt((0.0883024619 * red) + (0.2817188376 * green) + (0.6299787005 * blue));

  return {
    lightness: (0.2104542553 * long) + (0.793617785 * medium) - (0.0040720468 * short),
    redGreen: (1.9779984951 * long) - (2.428592205 * medium) + (0.4505937099 * short),
    blueYellow: (0.0259040371 * long) + (0.7827717662 * medium) - (0.808675766 * short),
  };
}

function getOklabDistance(left: TestOklabColor, right: TestOklabColor): number {
  return Math.hypot(
    (left.lightness - right.lightness) * 1.35,
    left.redGreen - right.redGreen,
    left.blueYellow - right.blueYellow,
  );
}

function toLinearRgb(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}
