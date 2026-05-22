import { describe, expect, it } from 'vitest';
import { buildImageExportSummary, createBuildingLevel, createDefaultSceneDocument, createTileInstance } from '../domain/scene';
import { unsafeScriptText } from '../test/fixtures/unsafe-text';
import { buildImageExportSvg, createImageExportFile, getImageExportFileName } from './image-export';

describe('image export file generation', () => {
  it('sanitizes scene names into image filenames', () => {
    expect(getImageExportFileName('Export / Scene <draft>')).toBe('Export-Scene-draft.pokopia-scene.svg');
    expect(getImageExportFileName('   ')).toBe('pokopia-scene.pokopia-scene.svg');
  });

  it('creates an SVG image blob containing the same semantic sections as the preview', async () => {
    const summary = buildImageExportSummary(createImageScene());
    const file = createImageExportFile(summary);
    const svgText = await file.blob.text();

    expect(file.fileName).toBe('Export-Image-Scene.pokopia-scene.svg');
    expect(file.blob.type).toBe('image/svg+xml;charset=utf-8');
    expect(svgText).toContain('Export Image Scene');
    expect(svgText).toContain('整体使用素材');
    expect(svgText).toContain('逐层图形');
    expect(svgText).toContain('逐层素材清单');
    expect(svgText).toContain('绿叶植物');
    expect(svgText).toContain('No. 1052');
    expect(svgText).toContain('技能: 树叶');
    expect(svgText).toContain('(3,3) · 技能: 树叶 · 旋转: 90°');
  });

  it('escapes HTML-like text in generated SVG', () => {
    const svgText = buildImageExportSvg(buildImageExportSummary(createImageScene(`${unsafeScriptText}\u0001`)));

    expect(svgText).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(svgText).not.toContain('<script>alert(1)</script>');
    expect(svgText).not.toContain('\u0001');
  });

  it('allocates layer height for dense material lists without overlapping following layers', () => {
    const summary = buildImageExportSummary(createDenseMaterialScene());
    const svgText = buildImageExportSvg(summary);
    const height = Number(svgText.match(/height="(\d+)"/)?.[1] ?? 0);
    const layerFrameYs = Array.from(svgText.matchAll(/<rect x="32" y="(\d+)" width="1136" height="(\d+)"/g)).map((match) => ({
      y: Number(match[1]),
      height: Number(match[2]),
    }));
    const emptyLayerFrame = layerFrameYs.at(-2);
    const denseLayerFrame = layerFrameYs.at(-1);

    expect(svgText).toContain('No. 390');
    expect(svgText).toContain('No. 1052');
    expect(denseLayerFrame?.height).toBeGreaterThan(210);
    expect(emptyLayerFrame && denseLayerFrame ? emptyLayerFrame.y + emptyLayerFrame.height : 0).toBeLessThan(denseLayerFrame?.y ?? 0);
    expect(denseLayerFrame ? denseLayerFrame.y + denseLayerFrame.height : 0).toBeLessThanOrEqual(height);
  });

  it('preserves different reproduction notes for each same-asset instance', () => {
    const summary = buildImageExportSummary(createSameAssetVariantScene());
    const svgText = buildImageExportSvg(summary);

    expect(svgText).toContain('(2,2) · 技能: 树叶 · 技能备注: first skill note · 旋转: 90°');
    expect(svgText).toContain('(3,3) · 技能: 树叶 · 技能备注: second skill note · 染色: #88cc44 · 旋转: 180°');
  });
});

function createImageScene(sceneName = 'Export Image Scene') {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-image-export',
    sceneName,
    now: '2026-05-22T06:00:00.000Z',
  });

  return {
    ...baseScene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-image',
        assetId: 'leafy-plant',
        coordinate: { x: 3, y: 3 },
        buildingLevelId: 'level-1',
        rotationDegrees: 90,
        requiresSkill: true,
        skillType: '树叶',
      }),
    ],
  };
}

function createDenseMaterialScene() {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-dense-image-export',
    sceneName: 'Dense Image Export',
    now: '2026-05-22T06:20:00.000Z',
  });
  const assetIds = ['wooden-fencing', 'leafy-plant', 'stepping-stones', 'ditto-doll', 'stone-brick-wall', 'brick-roof-decoration'];

  return {
    ...baseScene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
    tileInstances: assetIds.map((assetId, index) =>
      createTileInstance({
        instanceId: `tile-dense-${index}`,
        assetId,
        coordinate: { x: index % 7, y: Math.floor(index / 7) },
        buildingLevelId: 'level-0',
      }),
    ),
  };
}

function createSameAssetVariantScene() {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-variant-image-export',
    sceneName: 'Variant Image Export',
    now: '2026-05-22T06:30:00.000Z',
  });

  return {
    ...baseScene,
    buildingLevels: [createBuildingLevel(0)],
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-variant-1',
        assetId: 'leafy-plant',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
        rotationDegrees: 90,
        requiresSkill: true,
        skillType: '树叶',
        skillNote: 'first skill note',
      }),
      createTileInstance({
        instanceId: 'tile-variant-2',
        assetId: 'leafy-plant',
        coordinate: { x: 3, y: 3 },
        buildingLevelId: 'level-0',
        rotationDegrees: 180,
        dyeColor: '#88cc44',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: 'second skill note',
      }),
    ],
  };
}
