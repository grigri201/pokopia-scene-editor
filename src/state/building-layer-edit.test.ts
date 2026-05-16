import { describe, expect, it } from 'vitest';
import { createDefaultSceneDocument } from '../domain/scene';
import { editBuildingLayer } from './building-layer-edit';

const now = '2026-05-16T08:25:00.000Z';

describe('building layer edit command', () => {
  it('creates a new current building layer with the next level number', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const result = editBuildingLayer(scene, { type: 'create', interactionMode: 'edit', now });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected create success.');
    }
    expect(result.scene.buildingLevels.at(-1)).toMatchObject({
      id: 'level-3',
      levelNumber: 3,
      name: '3 层',
      visible: true,
      locked: false,
    });
    expect(result.scene.workspaceState.currentBuildingLevelId).toBe('level-3');
    expect(result.scene.workspaceState.saveStatus).toBe('dirty');
  });

  it('renames, switches current layer, toggles visibility, and toggles lock state', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const renamed = editBuildingLayer(scene, {
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

    const current = editBuildingLayer(renamed.scene, {
      type: 'set-current',
      levelId: 'level-1',
      interactionMode: 'edit',
      now,
    });
    expect(current.ok).toBe(true);
    if (!current.ok) {
      throw new Error('Expected current switch success.');
    }

    const hidden = editBuildingLayer(current.scene, {
      type: 'set-visible',
      levelId: 'level-1',
      visible: false,
      interactionMode: 'edit',
      now,
    });
    expect(hidden.ok).toBe(true);
    if (!hidden.ok) {
      throw new Error('Expected hide success.');
    }

    const locked = editBuildingLayer(hidden.scene, {
      type: 'set-locked',
      levelId: 'level-1',
      locked: true,
      interactionMode: 'edit',
      now,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) {
      throw new Error('Expected lock success.');
    }

    expect(locked.scene.buildingLevels.find((level) => level.id === 'level-1')).toMatchObject({
      name: '屋顶层',
      visible: false,
      locked: true,
    });
    expect(locked.scene.workspaceState.currentBuildingLevelId).toBe('level-1');
  });

  it('blocks read-only writes, missing layers, invalid names, and hiding the last visible layer', () => {
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
    const oneVisibleScene = {
      ...scene,
      buildingLevels: scene.buildingLevels.map((level) =>
        level.id === 'level-0' ? level : { ...level, visible: false },
      ),
    };
    const lastVisible = editBuildingLayer(oneVisibleScene, {
      type: 'set-visible',
      levelId: 'level-0',
      visible: false,
      interactionMode: 'edit',
      now,
    });

    expect(readOnly.ok).toBe(false);
    expect(missing.ok).toBe(false);
    expect(invalidName.ok).toBe(false);
    expect(lastVisible.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    if (!missing.ok) {
      expect(missing.reason).toBe('missing-layer');
    }
    if (!invalidName.ok) {
      expect(invalidName.reason).toBe('invalid-name');
    }
    if (!lastVisible.ok) {
      expect(lastVisible.reason).toBe('last-visible-layer');
    }
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });

  it('does not mark no-op layer commands dirty', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-test', now });
    const sameCurrent = editBuildingLayer(scene, {
      type: 'set-current',
      levelId: 'level-0',
      interactionMode: 'edit',
      now,
    });
    const sameVisible = editBuildingLayer(scene, {
      type: 'set-visible',
      levelId: 'level-0',
      visible: true,
      interactionMode: 'edit',
      now,
    });
    const sameLocked = editBuildingLayer(scene, {
      type: 'set-locked',
      levelId: 'level-0',
      locked: false,
      interactionMode: 'edit',
      now,
    });

    expect(sameCurrent.ok && sameCurrent.scene).toBe(scene);
    expect(sameVisible.ok && sameVisible.scene).toBe(scene);
    expect(sameLocked.ok && sameLocked.scene).toBe(scene);
    expect(scene.workspaceState.saveStatus).toBe('saved');
  });
});
