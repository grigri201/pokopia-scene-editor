import { describe, expect, it } from 'vitest';
import { autosavedSceneStorageKey, savedSceneStorageKey, uiPreferencesStorageKey } from '../../io';
import { createBuildingLevel, createDefaultSceneDocument, createTileInstance, type TileInstance } from './index';
import { buildImageExportSummary } from './export-summary';

describe('image export summary', () => {
  it('aggregates overall materials and per-layer materials with reproduction details', () => {
    const scene = createExportScene();
    const summary = buildImageExportSummary(scene);

    expect(summary.sceneId).toBe('scene-export-summary');
    expect(summary.sceneName).toBe('Export Summary Scene');
    expect(summary.overallMaterials).toEqual([
      expect.objectContaining({
        assetId: 'leafy-plant',
        assetName: '绿叶植物',
        officialId: '1052',
        totalCount: 2,
      }),
      expect.objectContaining({
        assetId: 'wooden-fencing',
        officialId: '390',
        totalCount: 1,
      }),
    ]);
    expect(summary.layers.map((layer) => layer.displayId)).toEqual(['L2', 'L1', 'L0']);
    expect(summary.layers.map((layer) => layer.empty)).toEqual([true, false, false]);
    expect(summary.layers[1].materials).toEqual([
      expect.objectContaining({
        assetId: 'leafy-plant',
        count: 1,
        instances: [
          expect.objectContaining({
            instanceId: 'tile-skill',
            coordinate: { x: 3, y: 3 },
            requiresSkill: true,
            skillType: '树叶',
            skillNote: 'Use <angle brackets> as plain text.',
            rotationDegrees: 90,
            dyeColor: '#88cc44',
          }),
        ],
      }),
    ]);
  });

  it('builds a 7x7 graphical cell summary for every building layer, including empty layers', () => {
    const summary = buildImageExportSummary(createExportScene());
    const emptyLayer = summary.layers.find((layer) => layer.id === 'level-2');
    const layerOne = summary.layers.find((layer) => layer.id === 'level-1');

    expect(emptyLayer?.cells).toHaveLength(49);
    expect(emptyLayer?.cells.every((cell) => cell.tileInstances.length === 0)).toBe(true);
    expect(layerOne?.cells).toHaveLength(49);
    expect(layerOne?.cells.find((cell) => cell.id === '3-3')).toEqual(
      expect.objectContaining({
        coordinate: { x: 3, y: 3 },
        areaType: 'main',
        tileInstances: [
          expect.objectContaining({
            instanceId: 'tile-skill',
            assetId: 'leafy-plant',
            assetName: '绿叶植物',
            thumbnailUrl: expect.stringContaining('leafy-plant'),
            thumbnailAlt: '绿叶植物缩略图',
          }),
        ],
      }),
    );
  });

  it('regenerates from the latest SceneDocument without mutating scene or storage', () => {
    window.localStorage.setItem(savedSceneStorageKey, 'saved-sentinel');
    window.localStorage.setItem(autosavedSceneStorageKey, 'autosave-sentinel');
    window.localStorage.setItem(uiPreferencesStorageKey, 'ui-sentinel');

    const scene = createExportScene();
    const sceneBefore = structuredClone(scene);
    const firstSummary = buildImageExportSummary(scene);
    const nextScene = {
      ...scene,
      tileInstances: [
        ...scene.tileInstances,
        createTileInstance({
          instanceId: 'tile-added',
          assetId: 'wooden-fencing',
          coordinate: { x: 4, y: 4 },
          buildingLevelId: 'level-1',
        }),
      ],
    };
    const secondSummary = buildImageExportSummary(nextScene);

    expect(scene).toEqual(sceneBefore);
    expect(firstSummary.overallMaterials.find((material) => material.assetId === 'wooden-fencing')?.totalCount).toBe(1);
    expect(secondSummary.overallMaterials.find((material) => material.assetId === 'wooden-fencing')?.totalCount).toBe(2);
    expect(window.localStorage.getItem(savedSceneStorageKey)).toBe('saved-sentinel');
    expect(window.localStorage.getItem(autosavedSceneStorageKey)).toBe('autosave-sentinel');
    expect(window.localStorage.getItem(uiPreferencesStorageKey)).toBe('ui-sentinel');
  });

  it('falls back to asset id when a scene references an unknown asset', () => {
    const scene = {
      ...createExportScene(),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-unknown',
          assetId: 'unknown-export-asset',
          coordinate: { x: 1, y: 1 },
          buildingLevelId: 'level-0',
        }),
      ],
    };
    const summary = buildImageExportSummary(scene);

    expect(summary.overallMaterials).toEqual([
      expect.objectContaining({
        assetId: 'unknown-export-asset',
        assetName: 'unknown-export-asset',
        officialId: null,
        totalCount: 1,
      }),
    ]);
  });

  it('rejects scenes when an instance cannot be represented in layer cell graphics', () => {
    const scene = {
      ...createExportScene(),
      tileInstances: [
        {
          ...createTileInstance({
            instanceId: 'tile-outside-canvas',
            assetId: 'leafy-plant',
            coordinate: { x: 1, y: 1 },
            buildingLevelId: 'level-0',
          }),
          coordinate: { x: 99, y: 99 },
        } satisfies TileInstance,
      ],
    };

    expect(() => buildImageExportSummary(scene)).toThrow(
      /Unable to include tile instances in image export layer cells: tile-outside-canvas/,
    );
  });

  it('keeps material-list instances independent from graphical cell instances', () => {
    const summary = buildImageExportSummary(createExportScene());
    const layerOne = summary.layers.find((layer) => layer.id === 'level-1');
    const materialInstance = layerOne?.materials[0].instances[0];
    const cellInstance = layerOne?.cells.find((cell) => cell.id === '3-3')?.tileInstances[0];

    expect(materialInstance).not.toBe(cellInstance);
    if (materialInstance) {
      materialInstance.assetName = 'Changed by consumer';
      materialInstance.coordinate.x = 0;
      materialInstance.reproductionNotes.push('mutated');
    }

    expect(cellInstance).toEqual(
      expect.objectContaining({
        assetName: '绿叶植物',
        coordinate: { x: 3, y: 3 },
        reproductionNotes: ['技能: 树叶', '技能备注: Use <angle brackets> as plain text.', '染色: #88cc44', '旋转: 90°'],
      }),
    );
  });
});

function createExportScene() {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-export-summary',
    sceneName: 'Export Summary Scene',
    selectedPokemonKey: 'ditto',
    now: '2026-05-22T05:00:00.000Z',
  });

  return {
    ...baseScene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
    workspaceState: {
      ...baseScene.workspaceState,
      currentBuildingLevelId: 'level-0',
    },
    tileInstances: [
      createTileInstance({
        instanceId: 'tile-base',
        assetId: 'wooden-fencing',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
      createTileInstance({
        instanceId: 'tile-skill',
        assetId: 'leafy-plant',
        coordinate: { x: 3, y: 3 },
        buildingLevelId: 'level-1',
        rotationDegrees: 90,
        dyeColor: '#88cc44',
        requiresSkill: true,
        skillType: '树叶',
        skillNote: 'Use <angle brackets> as plain text.',
      }),
      createTileInstance({
        instanceId: 'tile-rotated',
        assetId: 'leafy-plant',
        coordinate: { x: 0, y: 3 },
        buildingLevelId: 'level-0',
        rotationDegrees: 180,
      }),
    ],
  };
}
