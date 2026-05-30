import { toBlob } from 'html-to-image';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createImageExportFile,
  createLayeredImageExportFiles,
  getImageExportFileName,
  getPreviewExportSize,
} from './image-export';

vi.mock('html-to-image', () => ({
  toBlob: vi.fn(),
}));

const toBlobMock = vi.mocked(toBlob);

describe('image export file generation', () => {
  beforeEach(() => {
    toBlobMock.mockReset();
    toBlobMock.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  it('sanitizes scene names into PNG image filenames', () => {
    expect(getImageExportFileName('Export / Scene <draft>')).toBe('Export-Scene-draft.pokopia-scene.png');
    expect(getImageExportFileName('Export / Scene <draft>', 'L1')).toBe('Export-Scene-draft.L1.pokopia-scene.png');
    expect(getImageExportFileName('   ')).toBe('pokopia-scene.pokopia-scene.png');
  });

  it('creates a PNG image blob using the full preview scroll size', async () => {
    const previewElement = createPreviewElement({ height: 421.2, width: 590.1 });
    const file = await createImageExportFile({
      previewElement,
      sceneName: 'Export Image Scene',
    });

    expect(file.fileName).toBe('Export-Image-Scene.pokopia-scene.png');
    expect(file.blob.type).toBe('image/png');
    expect(file.width).toBe(1182);
    expect(file.height).toBe(844);
    expect(toBlobMock).toHaveBeenCalledWith(
      previewElement,
      expect.objectContaining({
        canvasHeight: 422,
        canvasWidth: 591,
        height: 422,
        imagePlaceholder: expect.stringContaining('data:image/png;base64'),
        onImageErrorHandler: expect.any(Function),
        pixelRatio: 2,
        type: 'image/png',
        width: 591,
      }),
    );
  });

  it('includes preview content outside the visible browser viewport', async () => {
    const previewElement = createPreviewElement({
      bodyScrollHeight: 760,
      bodyVisibleHeight: 220,
      height: 421,
      width: 590,
    });
    const previewBody = previewElement.querySelector<HTMLElement>('.export-preview__body');

    const file = await createImageExportFile({
      previewElement,
      sceneName: 'Tall Preview',
    });

    expect(file.width).toBe(1180);
    expect(file.height).toBe(1922);
    expect(previewElement.style.height).toBe('');
    expect(previewElement.style.maxHeight).toBe('');
    expect(previewElement.style.overflow).toBe('');
    expect(previewBody?.style.height).toBe('');
    expect(previewBody?.style.overflow).toBe('');
    expect(toBlobMock).toHaveBeenCalledWith(
      previewElement,
      expect.objectContaining({
        canvasHeight: 961,
        height: 961,
        pixelRatio: 2,
      }),
    );
  });

  it('excludes preview controls from DOM capture', async () => {
    const previewElement = createPreviewElement({ height: 420, width: 590 });
    const controls = document.createElement('div');
    const controlButton = document.createElement('button');
    const capturedDisplays: string[] = [];
    controls.dataset.imageExportExclude = 'true';
    controls.style.display = 'flex';
    controlButton.dataset.imageExportExclude = 'true';
    controlButton.style.display = 'inline-flex';
    controls.append(controlButton);
    previewElement.prepend(controls);
    toBlobMock.mockImplementation(async () => {
      capturedDisplays.push(`${controls.style.display}|${controlButton.style.display}`);
      return new Blob(['png'], { type: 'image/png' });
    });

    await createImageExportFile({ previewElement, sceneName: 'Controls Filter' });
    const options = toBlobMock.mock.calls[0]?.[1];
    const filter = options?.filter;
    const chromeNode = document.createElement('div');
    const contentNode = document.createElement('div');
    const logoNode = document.createElement('footer');
    chromeNode.dataset.imageExportExclude = 'true';
    logoNode.className = 'export-preview__footer';

    expect(filter?.(chromeNode)).toBe(false);
    expect(filter?.(contentNode)).toBe(true);
    expect(filter?.(logoNode)).toBe(true);
    expect(capturedDisplays).toEqual(['none|none']);
    expect(controls.style.display).toBe('flex');
    expect(controlButton.style.display).toBe('inline-flex');
  });

  it('creates one overall image and one image per layer while restoring preview layout', async () => {
    const previewElement = createPreviewElement({ height: 420, width: 590 });
    const previewBody = previewElement.querySelector<HTMLElement>('.export-preview__body');
    const overallPage = document.createElement('section');
    const layerContainer = document.createElement('section');
    const layerOne = document.createElement('article');
    const layerTwo = document.createElement('article');
    const capturedLayouts: string[] = [];

    overallPage.dataset.imageExportPage = 'overall';
    overallPage.dataset.imageExportFilePart = 'overall';
    layerContainer.dataset.imageExportLayerContainer = 'true';
    layerOne.dataset.imageExportPage = 'layer';
    layerOne.dataset.imageExportFilePart = 'L1';
    layerTwo.dataset.imageExportPage = 'layer';
    layerTwo.dataset.imageExportFilePart = 'L2';
    layerContainer.append(layerOne, layerTwo);
    previewBody?.append(overallPage, layerContainer);
    overallPage.style.display = 'grid';
    layerContainer.style.display = 'grid';
    layerOne.style.display = 'grid';
    layerTwo.style.display = 'grid';
    previewElement.dataset.imageExportMode = 'preview';

    toBlobMock.mockImplementation(async () => {
      capturedLayouts.push([
        `mode:${previewElement.dataset.imageExportMode ?? ''}`,
        `overall:${overallPage.style.display || 'css'}`,
        `layers:${layerContainer.style.display || 'css'}`,
        `l1:${layerOne.style.display || 'css'}`,
        `l2:${layerTwo.style.display || 'css'}`,
      ].join('|'));

      return new Blob(['png'], { type: 'image/png' });
    });

    const files = await createLayeredImageExportFiles({
      previewElement,
      sceneName: 'Layered Export',
    });

    expect(files.map((file) => file.fileName)).toEqual([
      'Layered-Export.overall.pokopia-scene.png',
      'Layered-Export.L1.pokopia-scene.png',
      'Layered-Export.L2.pokopia-scene.png',
    ]);
    expect(capturedLayouts).toEqual([
      'mode:layered|overall:css|layers:none|l1:none|l2:none',
      'mode:layered|overall:none|layers:css|l1:css|l2:none',
      'mode:layered|overall:none|layers:css|l1:none|l2:css',
    ]);
    expect(previewElement.dataset.imageExportMode).toBe('preview');
    expect(overallPage.style.display).toBe('grid');
    expect(layerContainer.style.display).toBe('grid');
    expect(layerOne.style.display).toBe('grid');
    expect(layerTwo.style.display).toBe('grid');
  });

  it('rejects hidden previews without a rendered size', () => {
    const previewElement = createPreviewElement({ height: 0, width: 590 });

    expect(() => getPreviewExportSize(previewElement)).toThrow(/must be visible/);
  });
});

function createPreviewElement({
  bodyScrollHeight,
  bodyVisibleHeight,
  height,
  width,
}: {
  bodyScrollHeight?: number;
  bodyVisibleHeight?: number;
  height: number;
  width: number;
}): HTMLElement {
  const previewElement = document.createElement('section');
  const previewBody = document.createElement('section');
  previewBody.className = 'export-preview__body';
  previewElement.append(previewBody);
  previewElement.getBoundingClientRect = vi.fn(() => ({
    bottom: height,
    height,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));
  previewBody.getBoundingClientRect = vi.fn(() => ({
    bottom: bodyVisibleHeight ?? 0,
    height: bodyVisibleHeight ?? 0,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  }));

  Object.defineProperty(previewElement, 'scrollWidth', {
    configurable: true,
    value: width,
  });
  Object.defineProperty(previewElement, 'scrollHeight', {
    configurable: true,
    value: height,
  });
  Object.defineProperty(previewBody, 'scrollHeight', {
    configurable: true,
    value: bodyScrollHeight ?? bodyVisibleHeight ?? 0,
  });

  return previewElement;
}
