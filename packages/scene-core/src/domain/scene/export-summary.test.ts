import { describe, expect, it } from 'vitest';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractScene,
  createStackingPlateFoodScene,
  createSkillMarker,
  createTileInstance,
  footprintContractExpected,
  footprintContractFixtureIds,
  stackingContractFixtureIds,
  type TileInstance,
} from './index';
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
        assetName: '大叶子的植栽',
        officialId: '336',
        totalCount: 2,
      }),
      expect.objectContaining({
        assetId: 'wooden-fencing',
        officialId: '661',
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
    expect(summary.layers.map((layer) => layer.displayId)).toEqual(['L1', 'L2', 'L3']);
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

  it('builds a 17x17 graphical cell summary for every default building layer, including empty layers', () => {
    const scene = createExportScene();
    const expectedCellCount = scene.canvasSize.width * scene.canvasSize.height;
    const summary = buildImageExportSummary(scene);
    const emptyLayer = summary.layers.find((layer) => layer.id === 'level-2');
    const layerOne = summary.layers.find((layer) => layer.id === 'level-1');

    expect(emptyLayer?.cells).toHaveLength(expectedCellCount);
    expect(emptyLayer?.cells.every((cell) => cell.tileInstances.length === 0)).toBe(true);
    expect(layerOne?.cells).toHaveLength(expectedCellCount);
    expect(layerOne?.cells.find((cell) => cell.id === '3-3')).toEqual(
      expect.objectContaining({
        coordinate: { x: 3, y: 3 },
        areaType: 'main',
        tileInstances: [
          expect.objectContaining({
            instanceId: 'tile-skill',
            assetId: 'leafy-plant',
            assetName: '大叶子的植栽',
            thumbnailUrl: expect.stringContaining('leafy-plant'),
            thumbnailAlt: '大叶子的植栽缩略图',
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

  it('includes ordered layer notes in layer summaries without mutating scene', () => {
    const scene = {
      ...createExportScene(),
      buildingLevels: [
        createBuildingLevel(0),
        {
          ...createBuildingLevel(1),
          notes: [
            { id: 'note-first', text: '先铺路径，再摆植物' },
            { id: 'note-second', text: 'Keep <angle> text as plain data' },
          ],
        },
        {
          ...createBuildingLevel(2),
          notes: [{ id: 'note-notes-only', text: '空素材层仍有搭建说明' }],
        },
      ],
    };
    const sceneBefore = cloneForTest(scene);
    const summary = buildImageExportSummary(scene);
    const layerZero = summary.layers.find((layer) => layer.id === 'level-0');
    const layerOne = summary.layers.find((layer) => layer.id === 'level-1');
    const notesOnlyLayer = summary.layers.find((layer) => layer.id === 'level-2');

    expect(layerZero?.notes).toEqual([]);
    expect(layerOne?.notes).toEqual([
      { id: 'note-first', text: '先铺路径，再摆植物' },
      { id: 'note-second', text: 'Keep <angle> text as plain data' },
    ]);
    expect(notesOnlyLayer).toMatchObject({
      empty: false,
      materialCount: 0,
      notes: [{ id: 'note-notes-only', text: '空素材层仍有搭建说明' }],
    });

    if (layerOne?.notes[0]) {
      layerOne.notes[0].text = 'changed by summary consumer';
    }
    expect(scene).toEqual(sceneBefore);
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
        assetName: '大叶子的植栽',
        coordinate: { x: 3, y: 3 },
        footprint: { length: 1, width: 1, height: 1 },
        occupiedCells: [{ x: 3, y: 3 }],
        reproductionNotes: ['技能: 树叶', '技能备注: Use <angle brackets> as plain text.', '染色: #88cc44', '旋转: 90°'],
      }),
    );
  });

  it('includes derived footprint, occupied cells and height blocking details without inflating instance counts', () => {
    const summary = buildImageExportSummary(createFootprintContractScene());
    const layerZero = summary.layers.find((layer) => layer.id === 'level-0');
    const layerOne = summary.layers.find((layer) => layer.id === 'level-1');

    expect(layerZero?.materialCount).toBe(6);
    expect(layerZero?.cells.flatMap((cell) => cell.tileInstances)).toHaveLength(6);
    expect(layerZero?.materials.find((material) => material.assetId === 'leafy-plant')?.count).toBe(1);
    expect(layerZero?.materials.find((material) => material.assetId === 'wooden-bench')?.count).toBe(2);
    expect(layerZero?.materials.find((material) => material.assetId === 'deck-chair')?.count).toBe(2);
    expect(layerZero?.materials.find((material) => material.assetId === 'strength-rock')?.count).toBe(1);
    expect(layerOne?.materialCount).toBe(0);

    const bench = getLayerInstance(summary, 'level-0', footprintContractFixtureIds.bench);
    expect(bench).toMatchObject({
      footprint: { length: 1, width: 2, height: 1 },
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.bench],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.bench],
      blockingCells: [],
      footprintWarnings: [],
    });

    const rug = getLayerInstance(summary, 'level-0', footprintContractFixtureIds.rug);
    expect(rug).toMatchObject({
      footprint: { length: 2, width: 1, height: 1 },
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rug],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rug],
    });

    const rotatedBench = getLayerInstance(summary, 'level-0', footprintContractFixtureIds.rotatedBench);
    expect(rotatedBench).toMatchObject({
      footprint: { length: 1, width: 2, height: 1 },
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedBench],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedBench],
    });

    const rotatedRug = getLayerInstance(summary, 'level-0', footprintContractFixtureIds.rotatedRug);
    expect(rotatedRug).toMatchObject({
      footprint: { length: 2, width: 1, height: 1 },
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedRug],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedRug],
    });

    const boulder = getLayerInstance(summary, 'level-0', footprintContractFixtureIds.boulder);
    expect(boulder).toMatchObject({
      footprint: { length: 1, width: 1, height: 2 },
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.boulder],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.boulder],
      blockingCells: [
        expect.objectContaining({
          buildingLevelId: 'level-1',
          buildingLevelNumber: 1,
          coordinate: { x: 1, y: 4 },
          blockedByInstanceId: footprintContractFixtureIds.boulder,
          blockedByAssetId: 'strength-rock',
          blockedByBuildingLevelId: 'level-0',
        }),
      ],
      footprintWarnings: [],
    });
  });

  it('includes derived stacking relation summaries without inflating material counts', () => {
    const scene = createStackingPlateFoodScene();
    const summary = buildImageExportSummary(scene);
    const layer = summary.layers.find((candidate) => candidate.id === stackingContractFixtureIds.level0);
    const stackedCell = layer?.cells.find((cell) => cell.id === '2-2');

    expect(summary.stackingRelations).toEqual([
      expect.objectContaining({
        id: `stack:${stackingContractFixtureIds.level0}:${stackingContractFixtureIds.plate}:${stackingContractFixtureIds.food}`,
        topInstanceId: stackingContractFixtureIds.food,
        topAssetId: 'leppa-berry',
        baseInstanceId: stackingContractFixtureIds.plate,
        baseAssetId: 'plate',
        buildingLevelId: stackingContractFixtureIds.level0,
        surfaceKind: 'food-surface',
        coordinates: [{ x: 2, y: 2 }],
      }),
    ]);
    expect(summary.stackingRelations[0]).toMatchObject({
      topAssetName: '苹野果',
      topThumbnailUrl: expect.stringContaining('leppa-berry'),
      baseAssetName: '盘子',
      baseThumbnailUrl: expect.stringContaining('plate'),
    });
    expect(layer?.stackingRelations).toEqual(summary.stackingRelations);
    expect(layer?.materialCount).toBe(2);
    expect(layer?.materials.map((material) => [material.assetId, material.count])).toEqual(expect.arrayContaining([
      ['leppa-berry', 1],
      ['plate', 1],
    ]));
    expect(stackedCell?.tileInstances.map((instance) => instance.instanceId)).toEqual([
      stackingContractFixtureIds.plate,
      stackingContractFixtureIds.food,
    ]);
    expect(stackedCell?.stackingRelations).toEqual(summary.stackingRelations);
    expect(JSON.stringify(scene)).not.toContain('stackingRelations');
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
