import { describe, expect, it } from 'vitest';
import {
  createBuildingLevel,
  createDefaultSceneDocument,
  createTileInstance,
  maxBuildingLevels,
} from '@pokopia-scene-editor/scene-core';
import { editBuildingLayer } from './building-layer-edit';

const now = '2026-05-16T08:25:00.000Z';

describe('building layer edit command', () => {
  it('creates, renames, and switches current building layers', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const created = editBuildingLayer(scene, { type: 'create', interactionMode: 'edit', now });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error('Expected create success.');
    }
    expect(created.scene.buildingLevels.at(-1)).toEqual({
      id: 'level-1',
      levelNumber: 1,
      name: '2层',
      notes: [],
    });
    expect(created.scene.workspaceState.currentBuildingLevelId).toBe('level-1');

    const renamed = editBuildingLayer(created.scene, {
      type: 'rename',
      levelId: 'level-1',
      name: '屋顶层',
      interactionMode: 'edit',
      now,
    });
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) {
      throw new Error('Expected rename success.');
    }
    expect(renamed.scene.buildingLevels.at(-1)?.name).toBe('屋顶层');

    const current = editBuildingLayer(renamed.scene, {
      type: 'set-current',
      levelId: 'level-1',
      interactionMode: 'edit',
      now,
    });
    expect(current.ok).toBe(true);
    if (current.ok) {
      expect(current.scene.workspaceState.currentBuildingLevelId).toBe('level-1');
    }
  });

  it('uses a caller-provided name only for the newly created layer', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const created = editBuildingLayer(scene, {
      type: 'create',
      name: 'Layer 2',
      interactionMode: 'edit',
      now,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error('Expected create success.');
    }
    expect(created.scene.buildingLevels).toEqual([
      { id: 'level-0', levelNumber: 0, name: '1层', notes: [] },
      { id: 'level-1', levelNumber: 1, name: 'Layer 2', notes: [] },
    ]);
  });

  it('blocks read-only writes, missing layers, and invalid names', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const readOnly = editBuildingLayer(scene, { type: 'create', interactionMode: 'readOnly', now });
    const missing = editBuildingLayer(scene, {
      type: 'set-current',
      levelId: 'missing-level',
      interactionMode: 'edit',
      now,
    });
    const invalidName = editBuildingLayer(scene, {
      type: 'rename',
      levelId: 'level-0',
      name: '   ',
      interactionMode: 'edit',
      now,
    });

    expect(readOnly.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.reason).toBe('missing-layer');
    }
    expect(invalidName.ok).toBe(false);
    if (!invalidName.ok) {
      expect(invalidName.reason).toBe('invalid-name');
    }
  });

  it('does not mark no-op current-layer commands dirty', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const sameCurrent = editBuildingLayer(scene, {
      type: 'set-current',
      levelId: 'level-0',
      interactionMode: 'edit',
      now,
    });

    expect(sameCurrent.ok && sameCurrent.scene).toBe(scene);
  });

  it('reorders building layers by display order without changing stable references', () => {
    const baseScene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const scene = {
      ...baseScene,
      buildingLevels: [
        { ...createBuildingLevel(0), notes: [{ id: 'note-ground', text: 'ground note' }] },
        createBuildingLevel(1),
        { ...createBuildingLevel(2), name: '屋顶层' },
      ],
      workspaceState: {
        ...baseScene.workspaceState,
        currentBuildingLevelId: 'level-2',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-roof',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-2',
        }),
      ],
      skillMarkers: [
        {
          coordinate: { x: 1, y: 1 },
          areaType: 'main' as const,
          buildingLevelId: 'level-0',
          skillType: '树叶' as const,
          skillNote: 'keep marker ref',
        },
      ],
    };

    const reordered = editBuildingLayer(scene, {
      type: 'reorder',
      levelIds: ['level-0', 'level-2', 'level-1'],
      interactionMode: 'edit',
      now,
    });

    expect(reordered.ok).toBe(true);
    if (!reordered.ok) {
      throw new Error('Expected reorder success.');
    }
    expect(reordered.scene.buildingLevels).toEqual([
      { id: 'level-1', levelNumber: 0, name: '2层', notes: [] },
      { id: 'level-2', levelNumber: 1, name: '屋顶层', notes: [] },
      { id: 'level-0', levelNumber: 2, name: '1层', notes: [{ id: 'note-ground', text: 'ground note' }] },
    ]);
    expect(reordered.scene.workspaceState.currentBuildingLevelId).toBe('level-2');
    expect(reordered.scene.tileInstances[0]?.buildingLevelId).toBe('level-2');
    expect(reordered.scene.skillMarkers[0]?.buildingLevelId).toBe('level-0');
    expect(reordered.scene.metadata.updatedAt).toBe(now);
  });

  it('does not dirty no-op layer reorder commands and rejects invalid orders', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now: '2026-05-16T08:00:00.000Z' }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
    };

    const noOp = editBuildingLayer(scene, {
      type: 'reorder',
      levelIds: ['level-2', 'level-1', 'level-0'],
      interactionMode: 'edit',
      now,
    });
    const duplicate = editBuildingLayer(scene, {
      type: 'reorder',
      levelIds: ['level-2', 'level-2', 'level-0'],
      interactionMode: 'edit',
      now,
    });
    const missing = editBuildingLayer(scene, {
      type: 'reorder',
      levelIds: ['level-2', 'missing-level', 'level-0'],
      interactionMode: 'edit',
      now,
    });

    expect(noOp.ok && noOp.scene).toBe(scene);
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.reason).toBe('invalid-order');
    }
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.reason).toBe('invalid-order');
    }
  });

  it('copies a building layer with preserved instance fields and new ids', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      buildingLevels: [
        createBuildingLevel(0),
        {
          ...createBuildingLevel(1),
          notes: [
            { id: 'note-1', text: '先摆长椅' },
            { id: 'note-2', text: '<b>不要执行</b>' },
          ],
        },
        createBuildingLevel(2),
      ],
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
          rotationDegrees: 90,
          dyeColor: '#bb6bd9',
          requiresSkill: true,
          skillType: '耕地',
          skillNote: 'height',
        }),
      ],
    };
    const result = editBuildingLayer(scene, {
      type: 'copy',
      levelId: 'level-1',
      instanceIdPrefix: 'copy-level-1',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected copy success.');
    }
    expect(result.scene.buildingLevels.at(-1)).toEqual({
      id: 'level-3',
      levelNumber: 3,
      name: '2层 copy',
      notes: [
        { id: 'level-3-note-1', text: '先摆长椅' },
        { id: 'level-3-note-2', text: '<b>不要执行</b>' },
      ],
    });
    expect(result.scene.workspaceState.currentBuildingLevelId).toBe('level-3');
    expect(result.scene.tileInstances).toHaveLength(2);
    expect(result.scene.tileInstances[1]).toMatchObject({
      instanceId: 'copy-level-1-1',
      assetId: 'brick-roof-decoration',
      coordinate: { x: 2, y: 2 },
      buildingLevelId: 'level-3',
      rotationDegrees: 90,
      dyeColor: '#bb6bd9',
      requiresSkill: true,
      skillType: '耕地',
      skillNote: 'height',
    });
  });

  it('avoids copied instance id collisions with existing scene instances', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      buildingLevels: [createBuildingLevel(0), createBuildingLevel(1), createBuildingLevel(2)],
      tileInstances: [
        createTileInstance({
          instanceId: 'copy-level-1-1',
          assetId: 'wooden-fencing',
          coordinate: { x: 1, y: 1 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'copy-level-1-1-2',
          assetId: 'wooden-fencing',
          coordinate: { x: 1, y: 2 },
          buildingLevelId: 'level-0',
        }),
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
    };
    const result = editBuildingLayer(scene, {
      type: 'copy',
      levelId: 'level-1',
      instanceIdPrefix: 'copy-level-1',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected copy success.');
    }
    expect(result.scene.tileInstances.at(-1)?.instanceId).toBe('copy-level-1-1-3');
    expect(new Set(result.scene.tileInstances.map((instance) => instance.instanceId)).size).toBe(
      result.scene.tileInstances.length,
    );
  });

  it('blocks creating and copying once the scene has 30 building layers', () => {
    const baseScene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const scene = {
      ...baseScene,
      buildingLevels: Array.from({ length: maxBuildingLevels }, (_, levelNumber) => createBuildingLevel(levelNumber)),
      workspaceState: {
        ...baseScene.workspaceState,
        currentBuildingLevelId: 'level-29',
      },
    };

    const created = editBuildingLayer(scene, { type: 'create', interactionMode: 'edit', now });
    const copied = editBuildingLayer(scene, {
      type: 'copy',
      levelId: 'level-29',
      instanceIdPrefix: 'copy-level-29',
      interactionMode: 'edit',
      now,
    });

    expect(created.ok).toBe(false);
    if (!created.ok) {
      expect(created.reason).toBe('max-layers');
    }
    expect(copied.ok).toBe(false);
    if (!copied.ok) {
      expect(copied.reason).toBe('max-layers');
    }
  });

  it('requires confirmation before deleting layers and blocks deleting the last layer', () => {
    const baseScene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const scene = {
      ...baseScene,
      buildingLevels: [
        createBuildingLevel(0),
        { ...createBuildingLevel(1), notes: [{ id: 'note-delete', text: '会随层删除' }] },
        createBuildingLevel(2),
      ],
      workspaceState: {
        ...baseScene.workspaceState,
        currentBuildingLevelId: 'level-1',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-source',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-1',
        }),
      ],
    };
    const blocked = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-1',
      interactionMode: 'edit',
      now,
    });
    const deleted = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-1',
      confirmDelete: true,
      interactionMode: 'edit',
      now,
    });
    const oneLayerScene = {
      ...baseScene,
      buildingLevels: [baseScene.buildingLevels[0]],
      workspaceState: { ...baseScene.workspaceState, currentBuildingLevelId: 'level-0' },
    };
    const lastLayer = editBuildingLayer(oneLayerScene, {
      type: 'delete',
      levelId: 'level-0',
      interactionMode: 'edit',
      now,
    });

    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.reason).toBe('delete-confirmation-required');
      expect(blocked.message).toContain('1 note');
    }
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      throw new Error('Expected delete success.');
    }
    expect(deleted.scene.buildingLevels.map((level) => level.id)).toEqual(['level-0', 'level-2']);
    expect(deleted.scene.buildingLevels.map((level) => level.levelNumber)).toEqual([0, 1]);
    expect(deleted.scene.buildingLevels.map((level) => level.name)).toEqual(['1层', '3层']);
    expect(deleted.scene.tileInstances).toEqual([]);
    expect(deleted.scene.buildingLevels.some((level) => level.notes.some((note) => note.id === 'note-delete'))).toBe(false);
    expect(deleted.scene.workspaceState.currentBuildingLevelId).toBe('level-2');
    expect(lastLayer.ok).toBe(false);
    if (!lastLayer.ok) {
      expect(lastLayer.reason).toBe('last-layer');
    }
  });

  it('resequences level markers after deletion and creates the next visible marker without id collisions', () => {
    const baseScene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const scene = {
      ...baseScene,
      buildingLevels: [
        createBuildingLevel(0),
        createBuildingLevel(1),
        { ...createBuildingLevel(2), name: '屋顶层' },
      ],
      workspaceState: {
        ...baseScene.workspaceState,
        currentBuildingLevelId: 'level-2',
      },
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-roof',
          assetId: 'brick-roof-decoration',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-2',
        }),
      ],
    };
    const deleted = editBuildingLayer(scene, {
      type: 'delete',
      levelId: 'level-1',
      confirmDelete: true,
      interactionMode: 'edit',
      now,
    });

    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      throw new Error('Expected delete success.');
    }
    expect(deleted.scene.buildingLevels).toEqual([
      { id: 'level-0', levelNumber: 0, name: '1层', notes: [] },
      { id: 'level-2', levelNumber: 1, name: '屋顶层', notes: [] },
    ]);
    expect(deleted.scene.tileInstances[0]?.buildingLevelId).toBe('level-2');

    const created = editBuildingLayer(deleted.scene, {
      type: 'create',
      interactionMode: 'edit',
      now,
    });

    expect(created.ok).toBe(true);
    if (!created.ok) {
      throw new Error('Expected create success.');
    }
    expect(created.scene.buildingLevels).toEqual([
      { id: 'level-0', levelNumber: 0, name: '1层', notes: [] },
      { id: 'level-2', levelNumber: 1, name: '屋顶层', notes: [] },
      { id: 'level-3', levelNumber: 2, name: '3层', notes: [] },
    ]);
    expect(new Set(created.scene.buildingLevels.map((level) => level.id)).size).toBe(3);
    expect(created.scene.workspaceState.currentBuildingLevelId).toBe('level-3');
  });

  it('adds, updates, and deletes building layer notes without touching tile instances', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      tileInstances: [
        createTileInstance({
          instanceId: 'tile-stable',
          assetId: 'leafy-plant',
          coordinate: { x: 2, y: 2 },
          buildingLevelId: 'level-0',
        }),
      ],
    };

    const added = editBuildingLayer(scene, {
      type: 'add-note',
      levelId: 'level-0',
      noteId: 'note-1',
      text: '  <b>摆放说明</b>  ',
      interactionMode: 'edit',
      now,
    });
    expect(added.ok).toBe(true);
    if (!added.ok) {
      throw new Error('Expected note add success.');
    }
    expect(added.scene.buildingLevels[0].notes).toEqual([{ id: 'note-1', text: '  <b>摆放说明</b>  ' }]);
    expect(added.scene.tileInstances).toBe(scene.tileInstances);

    const updated = editBuildingLayer(added.scene, {
      type: 'update-note',
      levelId: 'level-0',
      noteId: ' note-1 ',
      text: '更新说明',
      interactionMode: 'edit',
      now,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      throw new Error('Expected note update success.');
    }
    expect(updated.scene.buildingLevels[0].notes).toEqual([{ id: 'note-1', text: '更新说明' }]);
    expect(updated.scene.tileInstances).toBe(scene.tileInstances);

    const deleted = editBuildingLayer(updated.scene, {
      type: 'delete-note',
      levelId: 'level-0',
      noteId: ' note-1 ',
      interactionMode: 'edit',
      now,
    });
    expect(deleted.ok).toBe(true);
    if (!deleted.ok) {
      throw new Error('Expected note delete success.');
    }
    expect(deleted.scene.buildingLevels[0].notes).toEqual([]);
    expect(deleted.scene.tileInstances).toBe(scene.tileInstances);
    expect(deleted.scene.tileInstances[0]).not.toHaveProperty('note');
  });

  it('blocks read-only, missing layer, missing note, duplicate id, and empty building layer note edits', () => {
    const scene = {
      ...createDefaultSceneDocument({ sceneId: 'scene-test', now }),
      buildingLevels: [
        {
          ...createBuildingLevel(0),
          notes: [{ id: 'note-1', text: '已有备注' }],
        },
      ],
    };

    const readOnly = editBuildingLayer(scene, {
      type: 'add-note',
      levelId: 'level-0',
      noteId: 'note-2',
      text: '只读不写',
      interactionMode: 'readOnly',
      now,
    });
    const missingLayer = editBuildingLayer(scene, {
      type: 'add-note',
      levelId: 'missing-level',
      noteId: 'note-2',
      text: '无层',
      interactionMode: 'edit',
      now,
    });
    const missingNote = editBuildingLayer(scene, {
      type: 'update-note',
      levelId: 'level-0',
      noteId: 'missing-note',
      text: '找不到',
      interactionMode: 'edit',
      now,
    });
    const duplicateId = editBuildingLayer(scene, {
      type: 'add-note',
      levelId: 'level-0',
      noteId: 'note-1',
      text: '重复',
      interactionMode: 'edit',
      now,
    });
    const emptyText = editBuildingLayer(scene, {
      type: 'add-note',
      levelId: 'level-0',
      noteId: 'note-empty',
      text: '   ',
      interactionMode: 'edit',
      now,
    });

    expect(readOnly.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    expect(missingLayer.ok).toBe(false);
    if (!missingLayer.ok) {
      expect(missingLayer.reason).toBe('missing-layer');
    }
    expect(missingNote.ok).toBe(false);
    if (!missingNote.ok) {
      expect(missingNote.reason).toBe('missing-note');
    }
    expect(duplicateId.ok).toBe(false);
    if (!duplicateId.ok) {
      expect(duplicateId.reason).toBe('invalid-note');
    }
    expect(emptyText.ok).toBe(false);
    if (!emptyText.ok) {
      expect(emptyText.reason).toBe('invalid-note');
    }
  });
});
