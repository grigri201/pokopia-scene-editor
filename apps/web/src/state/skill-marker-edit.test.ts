import { describe, expect, it } from 'vitest';
import {
  createDefaultSceneDocument,
  legacySceneDimensions,
  type SceneDocument,
} from '@pokopia-scene-editor/scene-core';
import { saveCellSkillMarker } from './skill-marker-edit';

const now = '2026-05-22T17:30:00.000Z';

describe('cell skill marker command', () => {
  it('adds, updates, and removes standalone skill markers without creating material instances', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-skill-marker', now });
    const added = saveCellSkillMarker(scene, {
      coordinate: { x: 3, y: 3 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: '缠绕蔓藤',
      skillNote: '',
      interactionMode: 'edit',
      now,
    });

    expect(added.ok).toBe(true);
    if (!added.ok) {
      throw new Error('Expected standalone skill marker creation.');
    }
    expect(added.scene.tileInstances).toEqual([]);
    expect(added.scene.skillMarkers).toEqual([
      expect.objectContaining({
        coordinate: { x: 3, y: 3 },
        areaType: 'main',
        buildingLevelId: 'level-0',
        skillType: '缠绕蔓藤',
        skillNote: '',
      }),
    ]);
    expect(added.scene.workspaceState.selectedCoordinate).toEqual({ x: 3, y: 3 });

    const updated = saveCellSkillMarker(added.scene, {
      coordinate: { x: 3, y: 3 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: '储水',
      skillNote: '',
      interactionMode: 'edit',
      now,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) {
      throw new Error('Expected standalone skill marker update.');
    }
    expect(updated.scene.skillMarkers).toHaveLength(1);
    expect(updated.scene.skillMarkers[0]).toMatchObject({ skillType: '储水' });

    const removed = saveCellSkillMarker(updated.scene, {
      coordinate: { x: 3, y: 3 },
      buildingLevelId: 'level-0',
      requiresSkill: false,
      skillType: '储水',
      skillNote: '',
      interactionMode: 'edit',
      now,
    });
    expect(removed.ok).toBe(true);
    if (removed.ok) {
      expect(removed.scene.skillMarkers).toEqual([]);
      expect(removed.scene.tileInstances).toEqual([]);
    }
  });

  it('blocks read-only and invalid standalone skill marker edits', () => {
    const scene = createDefaultSceneDocument({ sceneId: 'scene-skill-marker', now });
    const readOnly = saveCellSkillMarker(scene, {
      coordinate: { x: 3, y: 3 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: '耕地',
      skillNote: '',
      interactionMode: 'readOnly',
      now,
    });
    const invalidSkill = saveCellSkillMarker(scene, {
      coordinate: { x: 3, y: 3 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: null,
      skillNote: '',
      interactionMode: 'edit',
      now,
    });

    expect(readOnly.ok).toBe(false);
    if (!readOnly.ok) {
      expect(readOnly.reason).toBe('read-only');
    }
    expect(invalidSkill.ok).toBe(false);
    if (!invalidSkill.ok) {
      expect(invalidSkill.reason).toBe('invalid-skill-type');
    }
    expect(scene.skillMarkers).toEqual([]);
  });

  it('uses legacy scene dimensions when saving markers in recovered 7x7 scenes', () => {
    const result = saveCellSkillMarker(createLegacyScene(), {
      coordinate: { x: 6, y: 6 },
      buildingLevelId: 'level-0',
      requiresSkill: true,
      skillType: '储水',
      skillNote: '',
      interactionMode: 'edit',
      now,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected legacy marker save.');
    }
    expect(result.scene.skillMarkers[0]).toMatchObject({
      coordinate: { x: 6, y: 6 },
      areaType: 'outer',
    });
  });
});

function createLegacyScene(): SceneDocument {
  const scene = createDefaultSceneDocument({ sceneId: 'scene-legacy-marker', now });

  return {
    ...scene,
    sceneSize: { ...legacySceneDimensions.sceneSize },
    canvasSize: { ...legacySceneDimensions.canvasSize },
    outerPadding: legacySceneDimensions.outerPadding,
  };
}
