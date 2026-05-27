import { describe, expect, it } from 'vitest';
import { createBuildingLevel, createDefaultSceneDocument, createSkillMarker, createTileInstance, type TileInstance } from './index';
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
    expect(summary.overallSkills).toEqual([
      expect.objectContaining({
        skillType: '树叶',
        skillLabel: '树',
        totalCount: 1,
      }),
      expect.objectContaining({
        skillType: '耕地',
        skillLabel: '耕',
        totalCount: 1,
      }),
      expect.objectContaining({
        skillType: '储水',
        skillLabel: '水',
        totalCount: 1,
      }),
    ]);
    expect(summary.layers.map((layer) => layer.displayId)).toEqual(['L0', 'L1', 'L2']);
    expect(summary.layers.map((layer) => layer.empty)).toEqual([false, false, true]);
    expect(summary.layers.map((layer) => layer.skillCount)).toEqual([1, 2, 0]);
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
    expect(summary.layers[1].skills).toEqual([
      expect.objectContaining({
        skillType: '树叶',
        count: 1,
      }),
      expect.objectContaining({
        skillType: '储水',
        count: 1,
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
    expect(layerOne?.cells.find((cell) => cell.id === '4-4')).toEqual(
      expect.objectContaining({
        coordinate: { x: 4, y: 4 },
        areaType: 'main',
        empty: false,
        tileInstances: [],
        skillMarkers: [
          expect.objectContaining({
            coordinate: { x: 4, y: 4 },
            skillType: '储水',
            skillLabel: '水',
            iconAlt: '储水技能图标',
          }),
        ],
      }),
    );
  });

  it('regenerates from the latest SceneDocument without mutating scene', () => {
    const scene = createExportScene();
    const sceneBefore = cloneForTest(scene);
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
    expect(firstSummary.overallSkills.find((skill) => skill.skillType === '储水')?.totalCount).toBe(1);
    expect(secondSummary.overallSkills.find((skill) => skill.skillType === '储水')?.totalCount).toBe(1);
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
    expect(summary.overallSkills).toEqual([
      expect.objectContaining({ skillType: '耕地', totalCount: 1 }),
      expect.objectContaining({ skillType: '储水', totalCount: 1 }),
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
      materialInstance.footprint = { length: 99, width: 99, height: 99 };
      materialInstance.occupiedCells[0].x = 99;
    }

    expect(cellInstance).toEqual(
      expect.objectContaining({
        assetName: '绿叶植物',
        coordinate: { x: 3, y: 3 },
        footprint: { length: 1, width: 1, height: 1 },
        occupiedCells: [{ x: 3, y: 3 }],
        reproductionNotes: ['技能: 树叶', '技能备注: Use <angle brackets> as plain text.', '染色: #88cc44', '旋转: 90°'],
      }),
    );
  });

  it('includes derived footprint, occupied cells and height blocking details without inflating instance counts', () => {
    const summary = buildImageExportSummary(createFootprintExportScene());
    const layerZero = summary.layers.find((layer) => layer.id === 'level-0');
    const layerOne = summary.layers.find((layer) => layer.id === 'level-1');

    expect(layerZero?.materialCount).toBe(3);
    expect(layerZero?.cells.flatMap((cell) => cell.tileInstances)).toHaveLength(3);
    expect(layerZero?.materials.find((material) => material.assetId === 'wooden-bench')?.count).toBe(1);
    expect(layerZero?.materials.find((material) => material.assetId === 'large-narrow-rug')?.count).toBe(1);
    expect(layerZero?.materials.find((material) => material.assetId === 'large-boulder')?.count).toBe(1);
    expect(layerOne?.materialCount).toBe(0);

    const bench = getLayerInstance(summary, 'level-0', 'tile-bench');
    expect(bench).toMatchObject({
      footprint: { length: 2, width: 1, height: 1 },
      effectiveFootprint: { length: 2, width: 1, height: 1 },
      occupiedCells: [
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ],
      blockingCells: [],
      footprintWarnings: [],
    });

    const rotatedRug = getLayerInstance(summary, 'level-0', 'tile-rug');
    expect(rotatedRug).toMatchObject({
      footprint: { length: 1, width: 2, height: 1 },
      effectiveFootprint: { length: 2, width: 1, height: 1 },
      occupiedCells: [
        { x: 5, y: 1 },
        { x: 6, y: 1 },
      ],
    });

    const boulder = getLayerInstance(summary, 'level-0', 'tile-boulder');
    expect(boulder).toMatchObject({
      footprint: { length: 2, width: 1, height: 2 },
      effectiveFootprint: { length: 2, width: 1, height: 2 },
      occupiedCells: [
        { x: 1, y: 4 },
        { x: 2, y: 4 },
      ],
      blockingCells: [
        expect.objectContaining({
          buildingLevelId: 'level-1',
          buildingLevelNumber: 1,
          coordinate: { x: 1, y: 4 },
          blockedByInstanceId: 'tile-boulder',
          blockedByAssetId: 'large-boulder',
          blockedByBuildingLevelId: 'level-0',
        }),
        expect.objectContaining({
          buildingLevelId: 'level-1',
          buildingLevelNumber: 1,
          coordinate: { x: 2, y: 4 },
        }),
      ],
      footprintWarnings: [],
    });
  });

  it('rejects scenes when a standalone skill marker cannot be represented in layer cell graphics', () => {
    const scene = {
      ...createExportScene(),
      skillMarkers: [
        {
          ...createSkillMarker({
            coordinate: { x: 1, y: 1 },
            buildingLevelId: 'level-0',
            skillType: '耕地',
          }),
          coordinate: { x: 99, y: 99 },
        },
      ],
    };

    expect(() => buildImageExportSummary(scene)).toThrow(
      /Unable to include skill markers in image export layer cells: level-0:99,99/,
    );
  });
});

function getLayerInstance(summary: ReturnType<typeof buildImageExportSummary>, buildingLevelId: string, instanceId: string) {
  const instance = summary.layers
    .find((layer) => layer.id === buildingLevelId)
    ?.materials.flatMap((material) => material.instances)
    .find((candidate) => candidate.instanceId === instanceId);

  if (!instance) {
    throw new Error(`Expected export instance ${instanceId} on ${buildingLevelId}.`);
  }

  return instance;
}

function cloneForTest<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

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
    skillMarkers: [
      createSkillMarker({
        coordinate: { x: 1, y: 1 },
        buildingLevelId: 'level-0',
        skillType: '耕地',
      }),
      createSkillMarker({
        coordinate: { x: 4, y: 4 },
        buildingLevelId: 'level-1',
        skillType: '储水',
      }),
    ],
  };
}

function createFootprintExportScene() {
  const baseScene = createDefaultSceneDocument({
    sceneId: 'scene-export-footprint-summary',
    sceneName: 'Export Footprint Scene',
    selectedPokemonKey: 'ditto',
    now: '2026-05-27T08:00:00.000Z',
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
        instanceId: 'tile-bench',
        assetId: 'wooden-bench',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
      createTileInstance({
        instanceId: 'tile-rug',
        assetId: 'large-narrow-rug',
        coordinate: { x: 5, y: 1 },
        buildingLevelId: 'level-0',
        rotationDegrees: 90,
      }),
      createTileInstance({
        instanceId: 'tile-boulder',
        assetId: 'large-boulder',
        coordinate: { x: 1, y: 4 },
        buildingLevelId: 'level-0',
      }),
    ],
    skillMarkers: [],
  };
}
