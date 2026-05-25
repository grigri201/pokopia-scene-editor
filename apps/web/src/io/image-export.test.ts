import { toBlob } from 'html-to-image';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createImageExportFile, getImageExportFileName, getPreviewExportSize } from './image-export';

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
    expect(file.width).toBe(591);
    expect(file.height).toBe(422);
    expect(toBlobMock).toHaveBeenCalledWith(
      previewElement,
      expect.objectContaining({
        canvasHeight: 422,
        canvasWidth: 591,
        height: 422,
        imagePlaceholder: expect.stringContaining('data:image/png;base64'),
        onImageErrorHandler: expect.any(Function),
        pixelRatio: 1,
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

    expect(file.height).toBe(961);
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
      }),
    );
  });

  it('excludes preview controls from DOM capture', async () => {
    const previewElement = createPreviewElement({ height: 420, width: 590 });
    await createImageExportFile({ previewElement, sceneName: 'Controls Filter' });
    const options = toBlobMock.mock.calls[0]?.[1];
    const filter = options?.filter;
    const chromeNode = document.createElement('div');
    const contentNode = document.createElement('div');
    chromeNode.dataset.imageExportExclude = 'true';

    expect(filter?.(chromeNode)).toBe(false);
    expect(filter?.(contentNode)).toBe(true);
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
