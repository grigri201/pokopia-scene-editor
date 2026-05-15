import { describe, expect, it } from 'vitest';
import {
  assetCatalog,
  assertKnownAssetId,
  filterAssetsByFavorite,
  getAssetAreaLabel,
  getAssetById,
  getAssetSkillLabel,
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
    expect(getAssetSkillLabel(gardenPlant!)).toBe('Default skill: leaf');
    expect(getAssetSkillLabel(woodenFloor!)).toBe('No default skill');
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
