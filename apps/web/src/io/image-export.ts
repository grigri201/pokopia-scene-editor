import { toBlob } from 'html-to-image';

export interface ImageExportFile {
  blob: Blob;
  fileName: string;
  height: number;
  width: number;
}

export interface LayeredImageExportArchiveFile {
  blob: Blob;
  fileCount: number;
  fileName: string;
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
const zipMimeType = 'application/zip';
const imageExportPixelRatio = 2;
const transparentPixelDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
const zipUtf8GeneralPurposeBitFlag = 0x0800;
const zipStoreCompressionMethod = 0;
const zipMinimumVersion = 20;
const zipDosTime = 0;
const zipDosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;
const maxZip16 = 0xffff;
const maxZip32 = 0xffffffff;
const crc32Table = createCrc32Table();

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

export async function createLayeredImageExportArchiveFile({
  previewElement,
  sceneName,
}: Omit<CreateImageExportFileInput, 'fileNamePart'>): Promise<LayeredImageExportArchiveFile> {
  const exportFiles = await createLayeredImageExportFiles({ previewElement, sceneName });

  return {
    blob: await createZipBlob(exportFiles.map((file) => ({
      blob: file.blob,
      fileName: file.fileName,
    }))),
    fileCount: exportFiles.length,
    fileName: getLayeredImageExportArchiveFileName(sceneName),
  };
}

export function getImageExportFileName(sceneName: string, fileNamePart?: string): string {
  const baseName = toExportFileBaseName(sceneName);
  const partName = fileNamePart ? toExportFileBaseName(fileNamePart) : '';

  return partName
    ? `${baseName}.${partName}.pokopia-scene.png`
    : `${baseName}.pokopia-scene.png`;
}

export function getLayeredImageExportArchiveFileName(sceneName: string): string {
  return `${toExportFileBaseName(sceneName)}.pokopia-scene-layers.zip`;
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

interface ZipEntryInput {
  blob: Blob;
  fileName: string;
}

interface ZipCentralDirectoryRecord {
  compressedSize: number;
  crc32: number;
  fileNameBytes: Uint8Array;
  localHeaderOffset: number;
  uncompressedSize: number;
}

async function createZipBlob(entries: readonly ZipEntryInput[]): Promise<Blob> {
  if (entries.length === 0) {
    throw new Error('Image export archive must contain at least one file.');
  }
  if (entries.length > maxZip16) {
    throw new RangeError('Image export archive contains too many files.');
  }

  const encoder = new TextEncoder();
  const parts: BlobPart[] = [];
  const centralDirectoryRecords: ZipCentralDirectoryRecord[] = [];
  let archiveOffset = 0;

  for (const entry of entries) {
    const fileNameBytes = encoder.encode(entry.fileName);
    assertZip16Length(fileNameBytes.byteLength, `File name is too long for ZIP export: ${entry.fileName}`);
    assertZip32Size(entry.blob.size, `File is too large for ZIP export: ${entry.fileName}`);
    assertZip32Size(archiveOffset, 'Layered image ZIP archive is too large.');

    const data = new Uint8Array(await entry.blob.arrayBuffer());
    const crc32 = calculateCrc32(data);
    const localHeader = createZipLocalFileHeader(fileNameBytes, crc32, data.byteLength);
    parts.push(toBlobArrayBufferPart(localHeader), toBlobArrayBufferPart(fileNameBytes), entry.blob);
    centralDirectoryRecords.push({
      compressedSize: data.byteLength,
      crc32,
      fileNameBytes,
      localHeaderOffset: archiveOffset,
      uncompressedSize: data.byteLength,
    });
    archiveOffset += localHeader.byteLength + fileNameBytes.byteLength + data.byteLength;
  }

  const centralDirectoryOffset = archiveOffset;

  for (const record of centralDirectoryRecords) {
    const centralDirectoryHeader = createZipCentralDirectoryHeader(record);
    parts.push(toBlobArrayBufferPart(centralDirectoryHeader), toBlobArrayBufferPart(record.fileNameBytes));
    archiveOffset += centralDirectoryHeader.byteLength + record.fileNameBytes.byteLength;
  }

  const centralDirectorySize = archiveOffset - centralDirectoryOffset;
  assertZip32Size(centralDirectoryOffset, 'Layered image ZIP archive is too large.');
  assertZip32Size(centralDirectorySize, 'Layered image ZIP central directory is too large.');
  parts.push(toBlobArrayBufferPart(
    createZipEndOfCentralDirectory(centralDirectoryRecords.length, centralDirectorySize, centralDirectoryOffset),
  ));

  return new Blob(parts, { type: zipMimeType });
}

function createZipLocalFileHeader(fileNameBytes: Uint8Array, crc32: number, fileSize: number): Uint8Array {
  const header = new Uint8Array(30);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, zipMinimumVersion, true);
  view.setUint16(6, zipUtf8GeneralPurposeBitFlag, true);
  view.setUint16(8, zipStoreCompressionMethod, true);
  view.setUint16(10, zipDosTime, true);
  view.setUint16(12, zipDosDate, true);
  view.setUint32(14, crc32, true);
  view.setUint32(18, fileSize, true);
  view.setUint32(22, fileSize, true);
  view.setUint16(26, fileNameBytes.byteLength, true);
  view.setUint16(28, 0, true);
  return header;
}

function toBlobArrayBufferPart(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function createZipCentralDirectoryHeader(record: ZipCentralDirectoryRecord): Uint8Array {
  const header = new Uint8Array(46);
  const view = new DataView(header.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, zipMinimumVersion, true);
  view.setUint16(6, zipMinimumVersion, true);
  view.setUint16(8, zipUtf8GeneralPurposeBitFlag, true);
  view.setUint16(10, zipStoreCompressionMethod, true);
  view.setUint16(12, zipDosTime, true);
  view.setUint16(14, zipDosDate, true);
  view.setUint32(16, record.crc32, true);
  view.setUint32(20, record.compressedSize, true);
  view.setUint32(24, record.uncompressedSize, true);
  view.setUint16(28, record.fileNameBytes.byteLength, true);
  view.setUint16(30, 0, true);
  view.setUint16(32, 0, true);
  view.setUint16(34, 0, true);
  view.setUint16(36, 0, true);
  view.setUint32(38, 0, true);
  view.setUint32(42, record.localHeaderOffset, true);
  return header;
}

function createZipEndOfCentralDirectory(
  entryCount: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): Uint8Array {
  const record = new Uint8Array(22);
  const view = new DataView(record.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralDirectorySize, true);
  view.setUint32(16, centralDirectoryOffset, true);
  view.setUint16(20, 0, true);
  return record;
}

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;

  for (let index = 0; index < data.byteLength; index += 1) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ data[index]) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function createCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < table.length; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }

  return table;
}

function assertZip16Length(value: number, message: string): void {
  if (!Number.isInteger(value) || value > maxZip16) {
    throw new RangeError(message);
  }
}

function assertZip32Size(value: number, message: string): void {
  if (!Number.isInteger(value) || value > maxZip32) {
    throw new RangeError(message);
  }
}
