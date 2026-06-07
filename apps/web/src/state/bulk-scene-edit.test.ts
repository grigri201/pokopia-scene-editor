import { describe, expect, it } from 'vitest';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  createTileInstance,
} from '@pokopia-scene-editor/scene-core';
import type { SceneDocument } from '@pokopia-scene-editor/scene-core';
import { selectAsset } from './scene-reducer';
import {
  clearSceneRectangle,
  fillSceneRectangleWithSelectedAsset,
  normalizeGridRectangle,
} from './bulk-scene-edit';

const now = '2026-06-07T08:00:00.000Z';

describe('bulk scene edit commands', () => {
  it('normalizes inclusive rectangle coordinates in row-major order', () => {
    const rectangle = normalizeGridRectangle({
      start: { x: 4, y: 3 },
      end: { x: 2, y: 1 },
    });

    expect(rectangle.start).toEqual({ x: 2, y: 1 });
    expect(rectangle.end).toEqual({ x: 4, y: 3 });
    expect(rectangle.coordinates).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
    ]);
  });

  it('clears current-level instances once when their effective footprint intersects the rectangle', () => {
    const scene = createLayeredScene({
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-bench',
          assetId: 'wooden-bench',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-same-cell-other-level',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 3 },
          buildingLevelId: 'level-1',
        }),
        createTileInstance({
          instanceId: 'tile-outside',
          assetId: 'pecha-berry',
          coordinate: { x: 5, y: 5 },
          buildingLevelId: 'level-0',
        }),
      ],
    });

    const result = clearSceneRectangle(scene, {
      start: { x: 2, y: 3 },
      end: { x: 2, y: 3 },
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected rectangle clear success.');
    }
    expect(result.cleared).toBe(1);
    expect(result.clearedInstanceIds).toEqual(['tile-bench']);
    expect(result.scene.tileInstances.map((instance) => instance.instanceId)).toEqual([
      'tile-same-cell-other-level',
      'tile-outside',
    ]);
    expect(result.scene.workspaceState.selectedCoordinate).toEqual({ x: 2, y: 3 });
    expect(result.scene.metadata.updatedAt).toBe(now);
  });

  it('fills selected assets in row-major order and preserves selected asset state', () => {
    const scene = selectAsset(
      createDefaultSceneDocument({ sceneId: 'scene-fill', now: '2026-06-07T07:00:00.000Z' }),
      'pecha-berry',
      'edit',
      now,
    );
    const instanceIds = ['tile-1', 'tile-2', 'tile-3', 'tile-4'];
    const result = fillSceneRectangleWithSelectedAsset(scene, {
      start: { x: 2, y: 2 },
      end: { x: 3, y: 3 },
      interactionMode: 'edit',
      now,
      createInstanceId: () => instanceIds.shift() ?? 'tile-extra',
      requiresSkill: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected rectangle fill success.');
    }
    expect(result.placed).toBe(4);
    expect(result.summary.skipped).toBe(0);
    expect(result.scene.tileInstances.map((instance) => ({
      id: instance.instanceId,
      assetId: instance.assetId,
      coordinate: instance.coordinate,
      requiresSkill: instance.requiresSkill,
    }))).toEqual([
      { id: 'tile-1', assetId: 'pecha-berry', coordinate: { x: 2, y: 2 }, requiresSkill: true },
      { id: 'tile-2', assetId: 'pecha-berry', coordinate: { x: 3, y: 2 }, requiresSkill: true },
      { id: 'tile-3', assetId: 'pecha-berry', coordinate: { x: 2, y: 3 }, requiresSkill: true },
      { id: 'tile-4', assetId: 'pecha-berry', coordinate: { x: 3, y: 3 }, requiresSkill: true },
    ]);
    expect(result.scene.workspaceState.selectedAssetId).toBe('pecha-berry');
    expect(result.scene.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 3 });
    expect(result.scene.metadata.updatedAt).toBe(now);
  });

  it('skips replacement-required targets instead of implicitly overwriting existing material', () => {
    const selectedScene = selectAsset(
      createDefaultSceneDocument({ sceneId: 'scene-replacement-skip', now }),
      'pecha-berry',
      'edit',
      now,
    );
    const scene = {
      ...selectedScene,
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-existing',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const result = fillSceneRectangleWithSelectedAsset(scene, {
      start: { x: 2, y: 2 },
      end: { x: 2, y: 2 },
      interactionMode: 'edit',
      now,
      createInstanceId: () => 'tile-skipped',
      requiresSkill: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected rectangle fill command to return a summary.');
    }
    expect(result.placed).toBe(0);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.skippedReasons).toEqual({ 'replace-confirmation-required': 1 });
    expect(result.scene.tileInstances).toEqual(scene.tileInstances);
  });

  it('threads each placement result through the next fill coordinate for wide footprints', () => {
    const scene = selectAsset(
      createDefaultSceneDocument({ sceneId: 'scene-wide-threading', now }),
      'wooden-bench',
      'edit',
      now,
    );
    const instanceIds = ['tile-wide-1', 'tile-wide-skipped'];
    const result = fillSceneRectangleWithSelectedAsset(scene, {
      start: { x: 2, y: 2 },
      end: { x: 2, y: 3 },
      interactionMode: 'edit',
      now,
      createInstanceId: () => instanceIds.shift() ?? 'tile-wide-extra',
      requiresSkill: false,
      rotationDegrees: 0,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected rectangle fill command to return a summary.');
    }
    expect(result.placed).toBe(1);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.skippedReasons).toEqual({ 'replace-confirmation-required': 1 });
    expect(result.scene.tileInstances).toEqual([
      expect.objectContaining({
        instanceId: 'tile-wide-1',
        assetId: 'wooden-bench',
        coordinate: { x: 2, y: 2 },
      }),
    ]);
  });

  it('stores rotation on placed rectangle fill instances and counts footprint-blocked skips', () => {
    const scene = selectAsset(
      createDefaultSceneDocument({ sceneId: 'scene-rotated-fill', now }),
      'wooden-bench',
      'edit',
      now,
    );
    const instanceIds = ['tile-rotated-1', 'tile-out-of-bounds'];
    const result = fillSceneRectangleWithSelectedAsset(scene, {
      start: { x: 15, y: 15 },
      end: { x: 16, y: 15 },
      interactionMode: 'edit',
      now,
      createInstanceId: () => instanceIds.shift() ?? 'tile-rotated-extra',
      requiresSkill: false,
      rotationDegrees: 90,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected rectangle fill command to return a summary.');
    }
    expect(result.placed).toBe(1);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.skippedReasons).toEqual({ 'footprint-blocked': 1 });
    expect(result.scene.tileInstances).toEqual([
      expect.objectContaining({
        instanceId: 'tile-rotated-1',
        coordinate: { x: 15, y: 15 },
        rotationDegrees: 90,
      }),
    ]);
  });

  it('returns the original scene when rectangle clear has no current-level matches', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-empty-clear', now });
    const result = clearSceneRectangle(scene, {
      start: { x: 2, y: 2 },
      end: { x: 3, y: 3 },
      interactionMode: 'edit',
      now: '2026-06-07T09:00:00.000Z',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected rectangle clear command to return a summary.');
    }
    expect(result.cleared).toBe(0);
    expect(result.scene).toBe(scene);
    expect(result.scene.metadata.updatedAt).toBe(now);
  });

  it('keeps read-only clear and fill as no-op failures', () => {
    const scene = selectAsset(createDefaultSceneDocument({ sceneId: 'scene-readonly', now }), 'pecha-berry', 'edit', now);

    const clearResult = clearSceneRectangle(scene, {
      start: { x: 2, y: 2 },
      end: { x: 3, y: 3 },
      interactionMode: 'readOnly',
      now,
    });
    const fillResult = fillSceneRectangleWithSelectedAsset(scene, {
      start: { x: 2, y: 2 },
      end: { x: 3, y: 3 },
      interactionMode: 'readOnly',
      now,
      createInstanceId: () => 'tile-readonly',
      requiresSkill: false,
    });

    expect(clearResult).toMatchObject({ ok: false, reason: 'read-only', scene });
    expect(fillResult).toMatchObject({ ok: false, reason: 'read-only', scene });
    expect(scene.tileInstances).toEqual([]);
  });
});

function createLayeredScene(input: Pick<SceneDocument, 'tileInstances'>): SceneDocument {
  const baseScene = createDefaultSceneDocument({ sceneId: 'scene-layered-clear', now });

  return {
    ...baseScene,
    buildingLevels: [createBuildingLevel(0), createBuildingLevel(1)],
    workspaceState: {
      ...baseScene.workspaceState,
      currentBuildingLevelId: 'level-0',
    },
    tileInstances: input.tileInstances,
  };
}
