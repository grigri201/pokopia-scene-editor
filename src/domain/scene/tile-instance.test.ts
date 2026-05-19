import { describe, expect, it } from 'vitest';
import { createTileInstance } from './tile-instance';

describe('tile instance rules', () => {
  it('derives area type from coordinate and fills the SceneDocument v1 instance fields', () => {
    const tile = createTileInstance({
      instanceId: 'tile-1',
      assetId: 'wooden-floor',
      coordinate: { x: 0, y: 3 },
      buildingLevelId: 'level-1',
      rotationDegrees: 90,
      dyeColor: '#ffffff',
      requiresSkill: true,
      skillType: '树叶',
      skillNote: 'Needs Ditto skill',
    });

    expect(tile).toEqual({
      instanceId: 'tile-1',
      assetId: 'wooden-floor',
      coordinate: { x: 0, y: 3 },
      areaType: 'outer',
      buildingLevelId: 'level-1',
      rotationDegrees: 90,
      dyeColor: '#ffffff',
      requiresSkill: true,
      skillType: '树叶',
      skillNote: 'Needs Ditto skill',
    });
  });

  it('uses safe defaults for optional tile instance fields', () => {
    const tile = createTileInstance({
      instanceId: 'tile-1',
      assetId: 'wooden-floor',
      coordinate: { x: 3, y: 3 },
      buildingLevelId: 'level-0',
    });

    expect(tile.areaType).toBe('main');
    expect(tile.rotationDegrees).toBe(0);
    expect(tile.dyeColor).toBeNull();
    expect(tile.requiresSkill).toBe(false);
    expect(tile.skillType).toBeNull();
    expect(tile.skillNote).toBe('');
  });

  it('rejects out-of-range tile coordinates through area calculation', () => {
    expect(() =>
      createTileInstance({
        instanceId: 'tile-1',
        assetId: 'wooden-floor',
        coordinate: { x: 7, y: 0 },
        buildingLevelId: 'level-0',
      }),
    ).toThrow(RangeError);
  });
});
