import { toBlob } from 'html-to-image';

export interface ImageExportFile {
  blob: Blob;
  fileName: string;
  height: number;
  width: number;
}

interface CreateImageExportFileInput {
  previewElement: HTMLElement;
  sceneName: string;
}

const pngMimeType = 'image/png';
const transparentPixelDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

export async function createImageExportFile({
  previewElement,
  sceneName,
}: CreateImageExportFileInput): Promise<ImageExportFile> {
  const { height, width } = getPreviewExportSize(previewElement);
  const restorePreviewLayout = expandPreviewForImageExport(previewElement, { height, width });

  let blob: Blob | null = null;
  try {
    blob = await toBlob(previewElement, {
      backgroundColor: '#fffefb',
      canvasHeight: height,
      canvasWidth: width,
      cacheBust: true,
      filter: shouldIncludeInImageExport,
      height,
      imagePlaceholder: transparentPixelDataUrl,
      onImageErrorHandler: () => undefined,
      pixelRatio: 1,
      type: pngMimeType,
      width,
    });
  } finally {
    restorePreviewLayout();
  }

  if (!blob) {
    throw new Error('Image export renderer did not return a PNG blob.');
  }

  return {
    blob: blob.type === pngMimeType ? blob : blob.slice(0, blob.size, pngMimeType),
    fileName: getImageExportFileName(sceneName),
    height,
    width,
  };
}

export function getImageExportFileName(sceneName: string): string {
  return `${toExportFileBaseName(sceneName)}.pokopia-scene.png`;
}

export function getPreviewExportSize(previewElement: HTMLElement): { height: number; width: number } {
  const previewBox = previewElement.getBoundingClientRect();
  const previewBody = getPreviewBody(previewElement);
  const width = Math.ceil(Math.max(previewBox.width, previewElement.scrollWidth));
  const overflowHeight = previewBody
    ? Math.max(0, previewBody.scrollHeight - previewBody.getBoundingClientRect().height)
    : Math.max(0, previewElement.scrollHeight - previewBox.height);
  const height = Math.ceil(previewBox.height + overflowHeight);

  if (width <= 0 || height <= 0) {
    throw new Error('Image export preview must be visible before download.');
  }

  return { height, width };
}

function expandPreviewForImageExport(
  previewElement: HTMLElement,
  size: { height: number; width: number },
): () => void {
  const previewBody = getPreviewBody(previewElement);
  const previousPreviewStyles = {
    height: previewElement.style.height,
    maxHeight: previewElement.style.maxHeight,
    overflow: previewElement.style.overflow,
    width: previewElement.style.width,
  };
  const previousBodyStyles = previewBody
    ? {
        height: previewBody.style.height,
        maxHeight: previewBody.style.maxHeight,
        overflow: previewBody.style.overflow,
      }
    : null;
  const previousBodyScrollTop = previewBody?.scrollTop ?? 0;

  previewElement.style.width = `${size.width}px`;
  previewElement.style.height = `${size.height}px`;
  previewElement.style.maxHeight = 'none';
  previewElement.style.overflow = 'visible';

  if (previewBody) {
    previewBody.scrollTop = 0;
    previewBody.style.height = `${previewBody.scrollHeight}px`;
    previewBody.style.maxHeight = 'none';
    previewBody.style.overflow = 'visible';
  }

  return () => {
    previewElement.style.width = previousPreviewStyles.width;
    previewElement.style.height = previousPreviewStyles.height;
    previewElement.style.maxHeight = previousPreviewStyles.maxHeight;
    previewElement.style.overflow = previousPreviewStyles.overflow;

    if (previewBody && previousBodyStyles) {
      previewBody.style.height = previousBodyStyles.height;
      previewBody.style.maxHeight = previousBodyStyles.maxHeight;
      previewBody.style.overflow = previousBodyStyles.overflow;
      previewBody.scrollTop = previousBodyScrollTop;
    }
  };
}

function getPreviewBody(previewElement: HTMLElement): HTMLElement | null {
  return previewElement.querySelector<HTMLElement>('.export-preview__body');
}

function shouldIncludeInImageExport(domNode: HTMLElement): boolean {
  return !(domNode instanceof HTMLElement) || domNode.dataset.imageExportExclude !== 'true';
}

function toExportFileBaseName(sceneName: string): string {
  const normalizedName = sceneName
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedName || 'pokopia-scene';
}
