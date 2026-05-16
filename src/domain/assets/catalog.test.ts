import { describe, expect, it } from 'vitest';
import {
  assetCatalog,
  assertKnownAssetId,
  filterAssetsByFavorite,
  getAssetAreaLabel,
  getAssetById,
  getAssetSkillMarkerLabel,
  getAssetSkillLabel,
  isAssetSkillType,
  toAssetSkillType,
} from './catalog';

describe('asset catalog', () => {
  it('provides complete static metadata for each seed asset', () => {
    expect(assetCatalog.length).toBeGreaterThanOrEqual(6);

    for (const asset of assetCatalog) {
      expect(asset.assetId).not.toBe('');
      expect(asset.officialId).toMatch(/^\d{3}$/);
      expect(asset.name).not.toBe('');
      expect(asset.tags.length).toBeGreaterThan(0);
      expect(asset.applicableAreas.length).toBeGreaterThan(0);
      expect(asset.thumbnailUrl).toMatch(/^\/assets\/asset-thumbnails\/.+\.svg$/);
      expect(asset.thumbnailAlt).toContain('thumbnail');
      expect(typeof asset.defaultRequiresSkill).toBe('boolean');
      expect(typeof asset.skillCandidate).toBe('boolean');
      expect(typeof asset.rotatable).toBe('boolean');
      expect(typeof asset.stackable).toBe('boolean');
      expect(typeof asset.dyeable).toBe('boolean');
    }
  });

  it('looks up assets and rejects unknown ids', () => {
    expect(getAssetById('garden-plant')?.name).toBe('Garden Plant');
    expect(getAssetById(null)).toBeNull();
    expect(() => assertKnownAssetId('missing-asset')).toThrow(RangeError);
  });

  it('formats area and skill labels for picker display', () => {
    const gardenPlant = getAssetById('garden-plant');
    const woodenFloor = getAssetById('wooden-floor');

    expect(gardenPlant).not.toBeNull();
    expect(woodenFloor).not.toBeNull();
    expect(getAssetAreaLabel(gardenPlant!)).toBe('Main / Outer');
    expect(getAssetSkillLabel(gardenPlant!)).toBe('Default skill: 树叶');
    expect(getAssetSkillLabel(woodenFloor!)).toBe('No default skill');
  });

  it('normalizes Ditto skill vocabulary and one-character markers', () => {
    expect(isAssetSkillType('树叶')).toBe(true);
    expect(isAssetSkillType('耕地')).toBe(true);
    expect(isAssetSkillType('储水')).toBe(true);
    expect(isAssetSkillType('leaf')).toBe(false);
    expect(toAssetSkillType('leaf')).toBe('树叶');
    expect(toAssetSkillType('soil')).toBe('耕地');
    expect(toAssetSkillType('water')).toBe('储水');
    expect(getAssetSkillMarkerLabel('树叶')).toBe('树');
    expect(getAssetSkillMarkerLabel('leaf')).toBe('树');
    expect(getAssetSkillMarkerLabel('耕地')).toBe('耕');
    expect(getAssetSkillMarkerLabel('储水')).toBe('水');
    expect(getAssetSkillMarkerLabel(null)).toBe('技');
  });

  it('filters favorite assets by current Pokemon', () => {
    const eeveeFavorites = filterAssetsByFavorite(assetCatalog, 'eevee', true);
    const allAssets = filterAssetsByFavorite(assetCatalog, 'eevee', false);

    expect(eeveeFavorites.map((asset) => asset.assetId)).toEqual([
      'wooden-floor',
      'garden-plant',
      'roof-tile',
    ]);
    expect(allAssets).toBe(assetCatalog);
  });
});
