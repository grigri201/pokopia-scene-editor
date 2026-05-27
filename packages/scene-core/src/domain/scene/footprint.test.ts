import { describe, expect, it } from 'vitest';
import { getAssetById } from '../assets';
import { defaultSceneDimensions } from './area';
import {
  getEffectiveAssetFootprint,
  getFootprintBoundsConflict,
  getFootprintCells,
} from './footprint';

describe('asset footprint geometry', () => {
  it('derives effective footprint from rotation without changing height', () => {
    const asset = getAssetById('wooden-bench');

    expect(asset?.footprint).toEqual({ length: 1, width: 2, height: 1 });
    expect(getEffectiveAssetFootprint(asset!.footprint, 0)).toEqual({ length: 1, width: 2, height: 1 });
    expect(getEffectiveAssetFootprint(asset!.footprint, 180)).toEqual({ length: 1, width: 2, height: 1 });
    expect(getEffectiveAssetFootprint(asset!.footprint, 90)).toEqual({ length: 2, width: 1, height: 1 });
    expect(getEffectiveAssetFootprint(asset!.footprint, 270)).toEqual({ length: 2, width: 1, height: 1 });
  });

  it('expands occupied cells from the anchor toward positive x and y', () => {
    expect(getFootprintCells({ x: 2, y: 3 }, { length: 2, width: 1 })).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ]);
    expect(getFootprintCells({ x: 2, y: 3 }, { length: 1, width: 2 })).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ]);
  });

  it('reports out-of-bounds footprint cells without clipping them', () => {
    const conflict = getFootprintBoundsConflict({
      instanceId: 'tile-wide',
      assetId: 'wooden-bench',
      buildingLevelId: 'level-0',
      occupiedCells: getFootprintCells({ x: 2, y: 6 }, { length: 1, width: 2 }),
      dimensions: defaultSceneDimensions,
    });

    expect(conflict).toMatchObject({
      conflictType: 'footprint-out-of-bounds',
      instanceId: 'tile-wide',
      assetId: 'wooden-bench',
      buildingLevelId: 'level-0',
      coordinates: [{ x: 2, y: 7 }],
    });
  });
});
