import type { ExportLayerMaterialSummary, ImageExportLayerSummary, ImageExportSummary } from '../domain/scene';

const exportImageWidth = 1200;
const pageMargin = 32;
const gridCellSize = 22;
const gridGap = 2;
const layerGap = 28;
const layerHeaderHeight = 72;
const layerMinimumHeight = 210;
const materialHeaderHeight = 22;

export interface ImageExportFile {
  blob: Blob;
  fileName: string;
  svgText: string;
}

export function createImageExportFile(summary: ImageExportSummary): ImageExportFile {
  const svgText = buildImageExportSvg(summary);

  return {
    blob: new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }),
    fileName: getImageExportFileName(summary.sceneName),
    svgText,
  };
}

export function getImageExportFileName(sceneName: string): string {
  return `${toExportFileBaseName(sceneName)}.pokopia-scene.svg`;
}

export function buildImageExportSvg(summary: ImageExportSummary): string {
  const overallHeight = Math.max(88, 52 + summary.overallMaterials.length * 24);
  const layerHeights = summary.layers.map(getLayerHeight);
  const height =
    pageMargin * 2 +
    88 +
    overallHeight +
    layerHeights.reduce((total, layerHeight) => total + layerHeight + layerGap, 0);
  let y = pageMargin;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${exportImageWidth}" height="${height}" viewBox="0 0 ${exportImageWidth} ${height}" role="img">`,
    `<title>${escapeXml(summary.sceneName)} Pokopia scene export</title>`,
    '<rect width="100%" height="100%" fill="#fffefb"/>',
    text(summary.sceneName, pageMargin, y + 30, 30, '#231f1a', 900),
    text(`${summary.canvasSize.width}x${summary.canvasSize.height} canvas · ${summary.layers.length} building layers`, pageMargin, y + 58, 15, '#6b6258', 700),
  ];
  y += 88;

  parts.push(sectionFrame(pageMargin, y, exportImageWidth - pageMargin * 2, overallHeight));
  parts.push(text('整体使用素材', pageMargin + 18, y + 32, 18, '#231f1a', 900));
  if (summary.overallMaterials.length === 0) {
    parts.push(text('未放置素材', pageMargin + 18, y + 62, 15, '#6b6258', 700));
  } else {
    summary.overallMaterials.forEach((material, index) => {
      parts.push(
        text(
          `${material.assetName} · x${material.totalCount}`,
          pageMargin + 18,
          y + 62 + index * 24,
          14,
          '#231f1a',
          700,
        ),
      );
    });
  }
  y += overallHeight + layerGap;

  for (const [index, layer] of summary.layers.entries()) {
    const layerHeight = layerHeights[index];
    parts.push(...renderLayer(layer, y, layerHeight));
    y += layerHeight + layerGap;
  }

  parts.push('</svg>');
  return parts.join('');
}

function renderLayer(layer: ImageExportLayerSummary, y: number, height: number): string[] {
  const parts: string[] = [];
  const frameWidth = exportImageWidth - pageMargin * 2;
  const gridSize = gridCellSize * 7 + gridGap * 6;
  const gridX = pageMargin + 18;
  const gridY = y + 48;
  const materialX = gridX + gridSize + 32;

  parts.push(sectionFrame(pageMargin, y, frameWidth, height));
  parts.push(text(`${layer.displayId} · ${layer.name}`, pageMargin + 18, y + 30, 18, '#231f1a', 900));
  parts.push(text(layer.empty ? '空层' : `${layer.materialCount} placed items`, pageMargin + 150, y + 30, 14, '#6b6258', 800));
  parts.push(text('逐层图形', gridX, y + 44, 13, '#6b6258', 800));
  parts.push(text('逐层素材清单', materialX, y + 44, 13, '#6b6258', 800));

  for (const cell of layer.cells) {
    const x = gridX + cell.coordinate.x * (gridCellSize + gridGap);
    const cellY = gridY + cell.coordinate.y * (gridCellSize + gridGap);
    const firstInstance = cell.tileInstances[0] ?? null;
    parts.push(
      `<rect x="${x}" y="${cellY}" width="${gridCellSize}" height="${gridCellSize}" rx="3" fill="${cell.areaType === 'main' ? '#e8f6ef' : '#fcf8f0'}" stroke="#d8cfc2" stroke-width="1"/>`,
    );
    if (firstInstance) {
      parts.push(text(firstInstance.assetName.slice(0, 2), x + 4, cellY + 15, 9, '#231f1a', 900));
    }
  }

  if (layer.materials.length === 0) {
    parts.push(text('该层没有素材', materialX, y + 72, 14, '#6b6258', 700));
  } else {
    let materialY = y + 72;
    for (const material of layer.materials) {
      parts.push(...renderMaterial(material, materialX, materialY));
      materialY += getMaterialHeight();
    }
  }

  return parts;
}

function renderMaterial(material: ExportLayerMaterialSummary, x: number, y: number): string[] {
  return [
    text(`${material.assetName} · x${material.count}`, x, y, 14, '#231f1a', 800),
  ];
}

function getLayerHeight(layer: ImageExportLayerSummary): number {
  const materialHeight = layer.materials.length === 0
    ? materialHeaderHeight
    : layer.materials.reduce((total) => total + getMaterialHeight(), 0);

  return Math.max(layerMinimumHeight, layerHeaderHeight + materialHeight + 24);
}

function getMaterialHeight(): number {
  return materialHeaderHeight + 10;
}

function sectionFrame(x: number, y: number, width: number, height: number): string {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="10" fill="#ffffff" stroke="#d8cfc2" stroke-width="1"/>`;
}

function text(value: string, x: number, y: number, size: number, fill: string, weight: number): string {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(value)}</text>`;
}

function toExportFileBaseName(sceneName: string): string {
  const normalizedName = sceneName
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedName || 'pokopia-scene';
}

function escapeXml(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
