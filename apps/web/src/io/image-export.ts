import { toBlob } from 'html-to-image';

export interface ImageExportFile {
  blob: Blob;
  fileName: string;
  height: number;
  width: number;
}

interface CreateImageExportFileInput {
  fileNamePart?: string;
  previewElement: HTMLElement;
  sceneName: string;
}

interface LayeredImageExportPage {
  element: HTMLElement;
  fileNamePart: string;
  kind: 'overall' | 'layer';
}

const pngMimeType = 'image/png';
const imageExportPixelRatio = 2;
const transparentPixelDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';

export async function createImageExportFile({
  fileNamePart,
  previewElement,
  sceneName,
}: CreateImageExportFileInput): Promise<ImageExportFile> {
  const restoreExcludedElements = hideImageExportExcludedElements(previewElement);
  let restorePreviewLayout: (() => void) | null = null;
  let blob: Blob | null = null;
  let height = 0;
  let width = 0;

  try {
    ({ height, width } = getPreviewExportSize(previewElement));
    restorePreviewLayout = expandPreviewForImageExport(previewElement, { height, width });
    blob = await toBlob(previewElement, {
      backgroundColor: '#fffefb',
      canvasHeight: height,
      canvasWidth: width,
      cacheBust: true,
      filter: shouldIncludeInImageExport,
      height,
      imagePlaceholder: transparentPixelDataUrl,
      onImageErrorHandler: () => undefined,
      pixelRatio: imageExportPixelRatio,
      type: pngMimeType,
      width,
    });
  } finally {
    restorePreviewLayout?.();
    restoreExcludedElements();
  }

  if (!blob) {
    throw new Error('Image export renderer did not return a PNG blob.');
  }

  return {
    blob: blob.type === pngMimeType ? blob : blob.slice(0, blob.size, pngMimeType),
    fileName: getImageExportFileName(sceneName, fileNamePart),
    height: height * imageExportPixelRatio,
    width: width * imageExportPixelRatio,
  };
}

export async function createLayeredImageExportFiles({
  previewElement,
  sceneName,
}: Omit<CreateImageExportFileInput, 'fileNamePart'>): Promise<ImageExportFile[]> {
  const pages = getLayeredImageExportPages(previewElement);

  if (pages.length === 0) {
    throw new Error('Image export preview does not contain layer export pages.');
  }

  const layeredLayout = createLayeredExportLayoutController(previewElement, pages);

  try {
    const files: ImageExportFile[] = [];

    for (const page of pages) {
      layeredLayout.show(page);
      files.push(await createImageExportFile({
        fileNamePart: page.fileNamePart,
        previewElement,
        sceneName,
      }));
    }

    return files;
  } finally {
    layeredLayout.restore();
  }
}

export function getImageExportFileName(sceneName: string, fileNamePart?: string): string {
  const baseName = toExportFileBaseName(sceneName);
  const partName = fileNamePart ? toExportFileBaseName(fileNamePart) : '';

  return partName
    ? `${baseName}.${partName}.pokopia-scene.png`
    : `${baseName}.pokopia-scene.png`;
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

function hideImageExportExcludedElements(previewElement: HTMLElement): () => void {
  const previousDisplays = new Map<HTMLElement, string>();

  for (const element of previewElement.querySelectorAll<HTMLElement>('[data-image-export-exclude="true"]')) {
    previousDisplays.set(element, element.style.display);
    element.style.display = 'none';
  }

  return () => {
    for (const [element, display] of previousDisplays) {
      element.style.display = display;
    }
  };
}

function getLayeredImageExportPages(previewElement: HTMLElement): LayeredImageExportPage[] {
  const overallPage = previewElement.querySelector<HTMLElement>('[data-image-export-page="overall"]');
  const layerPages = Array.from(previewElement.querySelectorAll<HTMLElement>('[data-image-export-page="layer"]'));

  return [
    ...(overallPage ? [{
      element: overallPage,
      fileNamePart: overallPage.dataset.imageExportFilePart || 'overall',
      kind: 'overall' as const,
    }] : []),
    ...layerPages.map((element, index) => ({
      element,
      fileNamePart: element.dataset.imageExportFilePart || `layer-${index + 1}`,
      kind: 'layer' as const,
    })),
  ];
}

function createLayeredExportLayoutController(
  previewElement: HTMLElement,
  pages: readonly LayeredImageExportPage[],
): { restore: () => void; show: (page: LayeredImageExportPage) => void } {
  const layerContainer = previewElement.querySelector<HTMLElement>('[data-image-export-layer-container="true"]');
  const previousMode = previewElement.dataset.imageExportMode;
  const previousDisplays = new Map<HTMLElement, string>();

  for (const element of [...pages.map((page) => page.element), ...(layerContainer ? [layerContainer] : [])]) {
    previousDisplays.set(element, element.style.display);
  }

  return {
    show(pageToShow) {
      previewElement.dataset.imageExportMode = 'layered';

      if (layerContainer) {
        layerContainer.style.display = pageToShow.kind === 'layer' ? '' : 'none';
      }

      for (const page of pages) {
        page.element.style.display = page === pageToShow ? '' : 'none';
      }
    },
    restore() {
      if (previousMode === undefined) {
        delete previewElement.dataset.imageExportMode;
      } else {
        previewElement.dataset.imageExportMode = previousMode;
      }

      for (const [element, display] of previousDisplays) {
        element.style.display = display;
      }
    },
  };
}

function toExportFileBaseName(sceneName: string): string {
  const normalizedName = sceneName
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedName || 'pokopia-scene';
}
