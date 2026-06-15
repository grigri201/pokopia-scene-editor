import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneDocument,
  createSceneDimensionsForCanvasSize,
  createTileInstance,
  legacySceneDimensions,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import {
  createSceneEdgeResizePlan,
  createSceneResizePlan,
  summarizeSceneResizeDeletion,
} from './scene-resize';
import {
  moveCoordinate,
  resizeSceneCanvasFromEdge,
  resizeSceneCanvas,
  saveScene,
  sceneReducer,
  selectAsset,
  selectCoordinate,
  selectPokemon,
  setSelectedAsset,
  updateSceneAuthor,
  updateSceneName,
  updateSceneRef,
} from './scene-reducer';

describe('scene reducer selection rules', () => {
  it('selects a coordinate without dirtying scene content', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const tileInstances = [
      createTileInstance({
        instanceId: 'tile-1',
        assetId: 'wooden-fencing',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ];
    const sceneWithTile = { ...scene, tileInstances };
    const selected = selectCoordinate(sceneWithTile, { x: 3, y: 4 }, 'edit');

    expect(selected.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 4 });
    expect(selected.tileInstances).toBe(tileInstances);
    expect(selected.buildingLevels).toBe(scene.buildingLevels);
  });

  it('normalizes selected coordinates before writing workspace state', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const richCoordinate = { x: 2, y: 3, id: '2-3', areaType: 'main' };
    const selected = selectCoordinate(scene, richCoordinate, 'edit');

    expect(selected.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
  });

  it('clears the selected coordinate when the current coordinate is selected again', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      selectedCoordinate: { x: 2, y: 3 },
      now: '2026-05-16T07:00:00.000Z',
    });
    const cleared = selectCoordinate(scene, { x: 2, y: 3 }, 'edit');

    expect(cleared.workspaceState.selectedCoordinate).toBeNull();
    expect(cleared.tileInstances).toBe(scene.tileInstances);
    expect(cleared.buildingLevels).toBe(scene.buildingLevels);
  });

  it('guards scene selection writes in read-only mode', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const tileInstances = [
      createTileInstance({
        instanceId: 'tile-1',
        assetId: 'wooden-fencing',
        coordinate: { x: 2, y: 2 },
        buildingLevelId: 'level-0',
      }),
    ];
    const sceneWithTile = { ...scene, tileInstances };

    const selected = selectCoordinate(sceneWithTile, { x: 3, y: 4 }, 'readOnly');
    const reduced = sceneReducer(sceneWithTile, {
      type: 'select-coordinate',
      coordinate: { x: 4, y: 4 },
      interactionMode: 'readOnly',
    });

    expect(selected).toBe(sceneWithTile);
    expect(reduced).toBe(sceneWithTile);
    expect(sceneWithTile.workspaceState.selectedCoordinate).toBeNull();
    expect(sceneWithTile.tileInstances).toBe(tileInstances);
    expect(sceneWithTile.buildingLevels).toBe(scene.buildingLevels);
  });

  it('rejects invalid selected coordinates', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(() => selectCoordinate(scene, { x: 17, y: 0 }, 'edit')).toThrow(RangeError);
    expect(selectCoordinate(scene, { x: 17, y: 0 }, 'readOnly')).toBe(scene);
  });

  it('moves a keyboard coordinate within canvas bounds', () => {
    expect(moveCoordinate({ x: 3, y: 3 }, 'right')).toEqual({ x: 4, y: 3 });
    expect(moveCoordinate({ x: 0, y: 0 }, 'left')).toEqual({ x: 0, y: 0 });
    expect(moveCoordinate({ x: 16, y: 16 }, 'down')).toEqual({ x: 16, y: 16 });
    expect(moveCoordinate({ x: 6, y: 6 }, 'down', legacySceneDimensions.canvasSize)).toEqual({ x: 6, y: 6 });
  });

  it('creates an alternating-edge resize plan for direct size jumps', () => {
    expect(createSceneResizePlan({ width: 7, height: 7 }, { width: 10, height: 12 })).toMatchObject({
      xOffset: 2,
      yOffset: 3,
      leftAdded: 2,
      rightAdded: 1,
      topAdded: 3,
      bottomAdded: 2,
      leftRemoved: 0,
      rightRemoved: 0,
      topRemoved: 0,
      bottomRemoved: 0,
      survivor: {
        minX: 0,
        maxXExclusive: 7,
        minY: 0,
        maxYExclusive: 7,
      },
    });

    expect(createSceneResizePlan({ width: 10, height: 12 }, { width: 7, height: 7 })).toMatchObject({
      xOffset: -2,
      yOffset: -3,
      leftRemoved: 2,
      rightRemoved: 1,
      topRemoved: 3,
      bottomRemoved: 2,
      survivor: {
        minX: 2,
        maxXExclusive: 9,
        minY: 3,
        maxYExclusive: 10,
      },
    });

    expect(createSceneResizePlan({ width: 8, height: 8 }, { width: 10, height: 6 })).toMatchObject({
      xOffset: 1,
      yOffset: -1,
      leftAdded: 1,
      rightAdded: 1,
      topRemoved: 1,
      bottomRemoved: 1,
    });
  });

  it('uses the previous axis size to choose the edge for one-cell resize steps', () => {
    expect(createSceneResizePlan({ width: 8, height: 8 }, { width: 9, height: 9 })).toMatchObject({
      xOffset: 0,
      yOffset: 0,
      leftAdded: 0,
      rightAdded: 1,
      topAdded: 0,
      bottomAdded: 1,
    });

    expect(createSceneResizePlan({ width: 9, height: 9 }, { width: 10, height: 10 })).toMatchObject({
      xOffset: 1,
      yOffset: 1,
      leftAdded: 1,
      rightAdded: 0,
      topAdded: 1,
      bottomAdded: 0,
    });

    expect(createSceneResizePlan({ width: 9, height: 9 }, { width: 8, height: 8 })).toMatchObject({
      xOffset: 0,
      yOffset: 0,
      leftRemoved: 0,
      rightRemoved: 1,
      topRemoved: 0,
      bottomRemoved: 1,
      survivor: {
        minX: 0,
        maxXExclusive: 8,
        minY: 0,
        maxYExclusive: 8,
      },
    });

    expect(createSceneResizePlan({ width: 8, height: 8 }, { width: 7, height: 7 })).toMatchObject({
      xOffset: -1,
      yOffset: -1,
      leftRemoved: 1,
      rightRemoved: 0,
      topRemoved: 1,
      bottomRemoved: 0,
      survivor: {
        minX: 1,
        maxXExclusive: 8,
        minY: 1,
        maxYExclusive: 8,
      },
    });
  });

  it('creates explicit edge resize plans for one-cell directional changes', () => {
    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'left', delta: 1 })).toMatchObject({
      nextCanvasSize: { width: 9, height: 8 },
      xOffset: 1,
      yOffset: 0,
      leftAdded: 1,
      rightAdded: 0,
      survivor: { minX: 0, maxXExclusive: 8, minY: 0, maxYExclusive: 8 },
    });
    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'right', delta: 1 })).toMatchObject({
      nextCanvasSize: { width: 9, height: 8 },
      xOffset: 0,
      rightAdded: 1,
      survivor: { minX: 0, maxXExclusive: 8, minY: 0, maxYExclusive: 8 },
    });
    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'top', delta: 1 })).toMatchObject({
      nextCanvasSize: { width: 8, height: 9 },
      yOffset: 1,
      topAdded: 1,
      survivor: { minX: 0, maxXExclusive: 8, minY: 0, maxYExclusive: 8 },
    });
    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'bottom', delta: 1 })).toMatchObject({
      nextCanvasSize: { width: 8, height: 9 },
      yOffset: 0,
      bottomAdded: 1,
      survivor: { minX: 0, maxXExclusive: 8, minY: 0, maxYExclusive: 8 },
    });

    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'left', delta: -1 })).toMatchObject({
      nextCanvasSize: { width: 7, height: 8 },
      xOffset: -1,
      leftRemoved: 1,
      survivor: { minX: 1, maxXExclusive: 8, minY: 0, maxYExclusive: 8 },
    });
    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'right', delta: -1 })).toMatchObject({
      nextCanvasSize: { width: 7, height: 8 },
      xOffset: 0,
      rightRemoved: 1,
      survivor: { minX: 0, maxXExclusive: 7, minY: 0, maxYExclusive: 8 },
    });
    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'top', delta: -1 })).toMatchObject({
      nextCanvasSize: { width: 8, height: 7 },
      yOffset: -1,
      topRemoved: 1,
      survivor: { minX: 0, maxXExclusive: 8, minY: 1, maxYExclusive: 8 },
    });
    expect(createSceneEdgeResizePlan({ width: 8, height: 8 }, { edge: 'bottom', delta: -1 })).toMatchObject({
      nextCanvasSize: { width: 8, height: 7 },
      yOffset: 0,
      bottomRemoved: 1,
      survivor: { minX: 0, maxXExclusive: 8, minY: 0, maxYExclusive: 7 },
    });
  });

  it('returns no edge resize plan outside the editable 6..20 bounds', () => {
    expect(createSceneEdgeResizePlan({ width: 20, height: 8 }, { edge: 'left', delta: 1 })).toBeNull();
    expect(createSceneEdgeResizePlan({ width: 20, height: 8 }, { edge: 'right', delta: 1 })).toBeNull();
    expect(createSceneEdgeResizePlan({ width: 8, height: 20 }, { edge: 'top', delta: 1 })).toBeNull();
    expect(createSceneEdgeResizePlan({ width: 8, height: 20 }, { edge: 'bottom', delta: 1 })).toBeNull();
    expect(createSceneEdgeResizePlan({ width: 6, height: 8 }, { edge: 'left', delta: -1 })).toBeNull();
    expect(createSceneEdgeResizePlan({ width: 6, height: 8 }, { edge: 'right', delta: -1 })).toBeNull();
    expect(createSceneEdgeResizePlan({ width: 8, height: 6 }, { edge: 'top', delta: -1 })).toBeNull();
    expect(createSceneEdgeResizePlan({ width: 8, height: 6 }, { edge: 'bottom', delta: -1 })).toBeNull();
  });

  it('resizes from an explicit edge while migrating survivors and selected coordinate', () => {
    const scene = createSceneWithCanvasSize({
      canvasSize: { width: 8, height: 8 },
      selectedCoordinate: { x: 2, y: 4 },
      tileInstances: [
        createTileInstance({
          instanceId: 'edge-kept',
          assetId: 'leafy-plant',
          coordinate: { x: 1, y: 4 },
          buildingLevelId: 'level-0',
          dimensions: createSceneDimensionsForCanvasSize({ width: 8, height: 8 }),
        }),
        createTileInstance({
          instanceId: 'edge-deleted',
          assetId: 'leafy-plant',
          coordinate: { x: 0, y: 4 },
          buildingLevelId: 'level-0',
          dimensions: createSceneDimensionsForCanvasSize({ width: 8, height: 8 }),
        }),
      ],
    });

    const resized = resizeSceneCanvasFromEdge(
      scene,
      { edge: 'left', delta: -1 },
      'edit',
      '2026-05-16T08:00:00.000Z',
    );

    expect(resized.canvasSize).toEqual({ width: 7, height: 8 });
    expect(resized.tileInstances).toHaveLength(1);
    expect(resized.tileInstances[0]).toMatchObject({
      instanceId: 'edge-kept',
      coordinate: { x: 0, y: 4 },
    });
    expect(resized.workspaceState.selectedCoordinate).toEqual({ x: 1, y: 4 });
    expect(resized.metadata.updatedAt).toBe('2026-05-16T08:00:00.000Z');

    expect(resizeSceneCanvasFromEdge(scene, { edge: 'left', delta: -1 }, 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(resizeSceneCanvasFromEdge(scene, { edge: 'left', delta: 1 }, 'edit', '2026-05-16T08:00:00.000Z').canvasSize).toEqual({
      width: 9,
      height: 8,
    });
  });

  it('grows the editable canvas by migrating content with alternating-edge offsets', () => {
    const scene = createSceneWithCanvasSize({
      canvasSize: { width: 7, height: 7 },
      selectedCoordinate: { x: 2, y: 3 },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-kept',
          assetId: 'leafy-plant',
          coordinate: { x: 1, y: 1 },
          buildingLevelId: 'level-0',
          dimensions: legacySceneDimensions,
        }),
      ],
      skillMarkers: [
        {
          coordinate: { x: 5, y: 5 },
          areaType: 'outer',
          buildingLevelId: 'level-0',
          skillType: '储水',
          skillNote: '',
        },
      ],
    });

    const resized = resizeSceneCanvas(scene, { width: 10, height: 12 }, 'edit', '2026-05-16T08:00:00.000Z');

    expect(resized.sceneSize).toEqual({ width: 8, height: 10 });
    expect(resized.canvasSize).toEqual({ width: 10, height: 12 });
    expect(resized.tileInstances[0]).toMatchObject({
      instanceId: 'tile-kept',
      coordinate: { x: 3, y: 4 },
      areaType: 'main',
    });
    expect(resized.skillMarkers[0]).toMatchObject({
      coordinate: { x: 7, y: 8 },
      areaType: 'main',
    });
    expect(resized.workspaceState.selectedCoordinate).toEqual({ x: 4, y: 6 });
    expect(resized.metadata.updatedAt).toBe('2026-05-16T08:00:00.000Z');
  });

  it('shrinks the editable canvas by pruning deleted edge bands and migrating survivors', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      selectedCoordinate: { x: 3, y: 4 },
      now: '2026-05-16T07:00:00.000Z',
    });
    const resized = resizeSceneCanvas(
      {
        ...scene,
        sceneSize: { width: 8, height: 10 },
        canvasSize: { width: 10, height: 12 },
        tileInstances: [
          createTileInstance({
            instanceId: 'tile-kept',
            assetId: 'leafy-plant',
            coordinate: { x: 3, y: 4 },
            buildingLevelId: 'level-0',
            dimensions: createSceneDimensionsForCanvasSize({ width: 10, height: 12 }),
          }),
          createTileInstance({
            instanceId: 'tile-pruned',
            assetId: 'wooden-fencing',
            coordinate: { x: 1, y: 4 },
            buildingLevelId: 'level-0',
            dimensions: createSceneDimensionsForCanvasSize({ width: 10, height: 12 }),
          }),
        ],
        skillMarkers: [
          {
            coordinate: { x: 3, y: 4 },
            areaType: 'main',
            buildingLevelId: 'level-0',
            skillType: '树叶',
            skillNote: '',
          },
          {
            coordinate: { x: 5, y: 10 },
            areaType: 'outer',
            buildingLevelId: 'level-0',
            skillType: '储水',
            skillNote: '',
          },
        ],
      },
      { width: 7, height: 7 },
      'edit',
      '2026-05-16T08:00:00.000Z',
    );

    expect(resized.sceneSize).toEqual({ width: 5, height: 5 });
    expect(resized.canvasSize).toEqual({ width: 7, height: 7 });
    expect(resized.tileInstances).toHaveLength(1);
    expect(resized.tileInstances[0]).toMatchObject({
      instanceId: 'tile-kept',
      coordinate: { x: 1, y: 1 },
      areaType: 'main',
    });
    expect(resized.skillMarkers).toEqual([
      expect.objectContaining({
        coordinate: { x: 1, y: 1 },
        areaType: 'main',
      }),
    ]);
    expect(resized.workspaceState.selectedCoordinate).toEqual({ x: 1, y: 1 });
    expect(resized.metadata.updatedAt).toBe('2026-05-16T08:00:00.000Z');
  });

  it('summarizes destructive shrink using tile footprints and skill marker coordinates', () => {
    const scene = createSceneWithCanvasSize({
      canvasSize: { width: 10, height: 12 },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-kept',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-0',
          dimensions: createSceneDimensionsForCanvasSize({ width: 10, height: 12 }),
        }),
        createTileInstance({
          instanceId: 'tile-left-band',
          assetId: 'leafy-plant',
          coordinate: { x: 1, y: 5 },
          buildingLevelId: 'level-0',
          dimensions: createSceneDimensionsForCanvasSize({ width: 10, height: 12 }),
        }),
        createTileInstance({
          instanceId: 'tile-footprint-right-band',
          assetId: 'deck-chair',
          coordinate: { x: 8, y: 5 },
          buildingLevelId: 'level-0',
          dimensions: createSceneDimensionsForCanvasSize({ width: 10, height: 12 }),
        }),
        createTileInstance({
          instanceId: 'tile-rotated-footprint-bottom-band',
          assetId: 'deck-chair',
          coordinate: { x: 4, y: 9 },
          buildingLevelId: 'level-1',
          rotationDegrees: 90,
          dimensions: createSceneDimensionsForCanvasSize({ width: 10, height: 12 }),
        }),
      ],
      skillMarkers: [
        {
          coordinate: { x: 2, y: 9 },
          areaType: 'main',
          buildingLevelId: 'level-0',
          skillType: '树叶',
          skillNote: '',
        },
        {
          coordinate: { x: 0, y: 5 },
          areaType: 'outer',
          buildingLevelId: 'level-0',
          skillType: '耕地',
          skillNote: '',
        },
        {
          coordinate: { x: 5, y: 10 },
          areaType: 'outer',
          buildingLevelId: 'level-1',
          skillType: '储水',
          skillNote: '',
        },
      ],
    });
    const plan = createSceneResizePlan(scene.canvasSize, { width: 7, height: 7 });

    const summary = summarizeSceneResizeDeletion(scene, plan);

    expect(summary).toMatchObject({
      tileInstanceCount: 3,
      skillMarkerCount: 2,
      tileInstanceIds: [
        'tile-left-band',
        'tile-footprint-right-band',
        'tile-rotated-footprint-bottom-band',
      ],
    });
    expect(summary.skillMarkerKeys).toEqual([
      'level-0:0,5:耕地',
      'level-1:5,10:储水',
    ]);
    expect(summary.affectedBuildingLevels).toEqual([
      {
        buildingLevelId: 'level-0',
        buildingLevelName: '1层',
        buildingLevelNumber: 0,
        tileInstanceCount: 2,
        skillMarkerCount: 1,
      },
      {
        buildingLevelId: 'level-1',
        buildingLevelName: 'Level 1',
        buildingLevelNumber: 1,
        tileInstanceCount: 1,
        skillMarkerCount: 1,
      },
    ]);
  });

  it('summarizes edge resize deletion by affected building level', () => {
    const scene = createSceneWithCanvasSize({
      canvasSize: { width: 8, height: 8 },
      tileInstances: [
        createTileInstance({
          instanceId: 'left-ground',
          assetId: 'leafy-plant',
          coordinate: { x: 0, y: 3 },
          buildingLevelId: 'level-0',
          dimensions: createSceneDimensionsForCanvasSize({ width: 8, height: 8 }),
        }),
        createTileInstance({
          instanceId: 'left-upper',
          assetId: 'leafy-plant',
          coordinate: { x: 0, y: 4 },
          buildingLevelId: 'level-1',
          dimensions: createSceneDimensionsForCanvasSize({ width: 8, height: 8 }),
        }),
      ],
      skillMarkers: [
        {
          coordinate: { x: 0, y: 5 },
          areaType: 'main',
          buildingLevelId: 'level-1',
          skillType: '储水',
          skillNote: '',
        },
      ],
    });
    const plan = createSceneEdgeResizePlan(scene.canvasSize, { edge: 'left', delta: -1 });

    expect(plan).not.toBeNull();
    const summary = summarizeSceneResizeDeletion(scene, plan!);

    expect(summary).toMatchObject({
      tileInstanceCount: 2,
      skillMarkerCount: 1,
      tileInstanceIds: ['left-ground', 'left-upper'],
      skillMarkerKeys: ['level-1:0,5:储水'],
    });
    expect(summary.affectedBuildingLevels).toEqual([
      {
        buildingLevelId: 'level-0',
        buildingLevelName: '1层',
        buildingLevelNumber: 0,
        tileInstanceCount: 1,
        skillMarkerCount: 0,
      },
      {
        buildingLevelId: 'level-1',
        buildingLevelName: 'Level 1',
        buildingLevelNumber: 1,
        tileInstanceCount: 1,
        skillMarkerCount: 1,
      },
    ]);
  });

  it('allows resizing the editable canvas up to 20x20', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    const resized = resizeSceneCanvas(scene, { width: 20, height: 20 }, 'edit', '2026-05-16T08:00:00.000Z');

    expect(resized.sceneSize).toEqual({ width: 18, height: 18 });
    expect(resized.canvasSize).toEqual({ width: 20, height: 20 });
    expect(resized.metadata.updatedAt).toBe('2026-05-16T08:00:00.000Z');
  });

  it('updates scene controls and saved metadata through guarded commands', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const renamed = updateSceneName(scene, 'Garden 5x5 Layout', 'edit', '2026-05-16T08:00:00.000Z');
    const authored = updateSceneAuthor(renamed, 'https://example.test/author/builder-zero', 'edit', '2026-05-16T08:01:00.000Z');
    const referenced = updateSceneRef(authored, 'https://example.test/ref', 'edit', '2026-05-16T08:02:00.000Z');
    const themed = selectPokemon(referenced, 'eevee', 'edit', '2026-05-16T08:03:00.000Z');
    const saved = saveScene(themed, 'edit', '2026-05-16T08:04:00.000Z');

    expect(renamed.sceneName).toBe('Garden 5x5 Layout');
    expect(renamed.metadata.updatedAt).toBe('2026-05-16T08:00:00.000Z');
    expect(authored.sceneAuthor).toBe('https://example.test/author/builder-zero');
    expect(authored.metadata.updatedAt).toBe('2026-05-16T08:01:00.000Z');
    expect(referenced.sceneRef).toBe('https://example.test/ref');
    expect(referenced.metadata.updatedAt).toBe('2026-05-16T08:02:00.000Z');
    expect(themed.selectedPokemonKey).toBe('eevee');
    expect(saved.metadata.lastSavedAt).toBe('2026-05-16T08:04:00.000Z');
  });

  it('selects the current placement asset through guarded scene workspace state', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const selected = selectAsset(scene, 'leafy-plant', 'edit', '2026-05-16T08:00:00.000Z');
    const reduced = sceneReducer(scene, {
      type: 'select-asset',
      assetId: 'wooden-fencing',
      interactionMode: 'edit',
      now: '2026-05-16T08:01:00.000Z',
    });

    expect(selected.workspaceState.selectedAssetId).toBe('leafy-plant');
    expect(selected.tileInstances).toEqual([]);
    expect(reduced.workspaceState.selectedAssetId).toBe('wooden-fencing');
  });

  it('clears the placement asset when the current asset is selected again', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const selected = selectAsset(scene, 'wooden-fencing', 'edit', '2026-05-16T08:00:00.000Z');
    const cleared = selectAsset(selected, 'wooden-fencing', 'edit', '2026-05-16T08:01:00.000Z');

    expect(cleared.workspaceState.selectedAssetId).toBeNull();
    expect(cleared.metadata.updatedAt).toBe('2026-05-16T08:01:00.000Z');
  });

  it('sets or clears the placement asset without toggle semantics', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });
    const selected = setSelectedAsset(scene, 'wooden-fencing', 'edit', '2026-05-16T08:00:00.000Z');
    const repeated = setSelectedAsset(selected, 'wooden-fencing', 'edit', '2026-05-16T08:01:00.000Z');
    const cleared = setSelectedAsset(repeated, null, 'edit', '2026-05-16T08:02:00.000Z');

    expect(selected.workspaceState.selectedAssetId).toBe('wooden-fencing');
    expect(repeated).toBe(selected);
    expect(cleared.workspaceState.selectedAssetId).toBeNull();
    expect(cleared.metadata.updatedAt).toBe('2026-05-16T08:02:00.000Z');
  });

  it('guards selected asset writes in read-only mode and rejects unknown assets', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(selectAsset(scene, 'leafy-plant', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(setSelectedAsset(scene, 'leafy-plant', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(() => selectAsset(scene, 'missing-asset', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
      RangeError,
    );
    expect(() => setSelectedAsset(scene, 'missing-asset', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
      RangeError,
    );
  });

  it('rejects empty scene names', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(() => updateSceneName(scene, '   ', 'edit', '2026-05-16T08:00:00.000Z')).toThrow(
      RangeError,
    );
  });

  it('blocks scene control writes in read-only mode', () => {
    const scene = createDefaultSceneDocument({
      sceneId: 'scene-test',
      now: '2026-05-16T07:00:00.000Z',
    });

    expect(updateSceneName(scene, 'Blocked 5x5 Layout', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(updateSceneAuthor(scene, 'https://example.test/author/blocked', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(updateSceneRef(scene, 'https://example.test/ref/blocked', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(selectPokemon(scene, 'pikachu', 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(resizeSceneCanvas(scene, { width: 6, height: 6 }, 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
    expect(saveScene(scene, 'readOnly', '2026-05-16T08:00:00.000Z')).toBe(scene);
  });
});

function createSceneWithCanvasSize({
  canvasSize,
  selectedCoordinate = null,
  tileInstances = [],
  skillMarkers = [],
}: {
  canvasSize: { width: number; height: number };
  selectedCoordinate?: SceneDocument['workspaceState']['selectedCoordinate'];
  tileInstances?: SceneDocument['tileInstances'];
  skillMarkers?: SceneDocument['skillMarkers'];
}): SceneDocument {
  const dimensions = createSceneDimensionsForCanvasSize(canvasSize);
  const scene = createDefaultSceneDocument({
    sceneId: `scene-${canvasSize.width}x${canvasSize.height}`,
    now: '2026-05-16T07:00:00.000Z',
  });

  return {
    ...scene,
    ...dimensions,
    buildingLevels: [
      ...scene.buildingLevels,
      {
        id: 'level-1',
        levelNumber: 1,
        name: 'Level 1',
        notes: [],
      },
    ],
    tileInstances,
    skillMarkers,
    workspaceState: {
      ...scene.workspaceState,
      selectedCoordinate,
    },
  };
}
