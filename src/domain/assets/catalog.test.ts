import { describe, expect, it } from 'vitest';
import {
  assetCatalog,
  assertKnownAssetId,
  filterAssetsByFavorite,
  getAssetById,
  getAssetSkillMarkerIconUrl,
  getAssetSkillMarkerLabel,
  isAssetSkillType,
  toAssetSkillType,
} from './catalog';
import { knownPokemonKeys } from './pokemon';
import { sourceItemPreferenceTerms, sourcePokemonPreferences } from './source-pokemon-preferences';

describe('asset catalog', () => {
  it('provides complete static metadata for each seed asset', () => {
    expect(assetCatalog).toHaveLength(1160);

    for (const asset of assetCatalog) {
      expect(asset.assetId).not.toBe('');
      expect(asset.officialId).toMatch(/^\d{3,4}$/);
      expect(asset.name).not.toBe('');
      expect(asset.name).not.toContain('套件');
      expect(asset.tags).not.toContain('套件');
      expect(asset.searchKeywords.length).toBeGreaterThan(0);
      expect(asset.thumbnailUrl).toMatch(/^\/assets\/pokopia_image_sources\/item_portraits\/.+\.(png|webp)$/);
      expect(asset.thumbnailAlt).toContain('缩略图');
      expect('applicableAreas' in asset).toBe(false);
      expect('defaultRequiresSkill' in asset).toBe(false);
      expect('defaultSkillType' in asset).toBe(false);
      expect('skillCandidate' in asset).toBe(false);
      expect(typeof asset.dyeable).toBe('boolean');
    }
  });

  it('looks up assets and rejects unknown ids', () => {
    expect(getAssetById('leafy-plant')?.name).toBe('绿叶植物');
    expect(getAssetById(null)).toBeNull();
    expect(() => assertKnownAssetId('missing-asset')).toThrow(RangeError);
    expect(getAssetById('leaf-den-kit')).toBeNull();
    expect(() => assertKnownAssetId('leaf-den-kit')).toThrow(RangeError);
    expect(getAssetById('bouldery-badge')).toBeNull();
    expect(() => assertKnownAssetId('bouldery-badge')).toThrow(RangeError);
    expect(getAssetById('wooden-bench')?.officialId).toBe('047');
    expect(getAssetById('wooden-bench')?.name).toBe('木长椅');
    expect(getAssetById('ditto-doll')?.officialId).toBe('979');
    expect(getAssetById('ditto-doll')?.name).toBe('百变怪玩偶');
  });

  it('uses Chinese item names while retaining source names for search', () => {
    const leppaBerry = getAssetById('leppa-berry');
    const chestoBerry = getAssetById('chesto-berry');

    expect(leppaBerry).toMatchObject({
      officialId: '197',
      name: '苹野果',
      tags: ['食物'],
      thumbnailAlt: '苹野果缩略图',
    });
    expect(leppaBerry?.searchKeywords).toContain('Leppa Berry');
    expect(chestoBerry?.name).toBe('零余果');
  });

  it('uses source display metadata without seed overrides', () => {
    const gardenPlant = getAssetById('leafy-plant');
    const woodenFloor = getAssetById('wooden-fencing');

    expect(gardenPlant).not.toBeNull();
    expect(woodenFloor).not.toBeNull();
    expect(gardenPlant).toMatchObject({ officialId: '1052', name: '绿叶植物', category: 'misc' });
    expect(woodenFloor).toMatchObject({ officialId: '390', name: '木制栅栏', category: 'buildings' });
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
    expect(getAssetSkillMarkerIconUrl('树叶')).toContain('/assets/pokopia_image_sources/item_portraits/0050-leaf.png');
    expect(getAssetSkillMarkerIconUrl('耕地')).toContain(
      '/assets/pokopia_image_sources/decorative_item_portraits/171-farm-soil-ridge.webp',
    );
    expect(getAssetSkillMarkerIconUrl('water')).toContain('/assets/pokopia_image_sources/specialty_icons/water.png');
    expect(getAssetSkillMarkerIconUrl(null)).toBeNull();
  });

  it('filters favorite assets by current Pokemon', () => {
    const eeveeFavorites = filterAssetsByFavorite(assetCatalog, 'eevee', true);
    const allAssets = filterAssetsByFavorite(assetCatalog, 'eevee', false);
    const eeveeFavoriteIds = eeveeFavorites.map((asset) => asset.assetId);

    expect(eeveeFavorites).toHaveLength(249);
    expect(eeveeFavoriteIds).toEqual(expect.arrayContaining([
      'ditto-doll',
      'wooden-bench',
      'stone-brick-wall',
      'pecha-berry',
      'stone',
    ]));
    expect(eeveeFavoriteIds).not.toContain('wooden-fencing');
    expect(eeveeFavoriteIds).not.toContain('leafy-plant');
    expect(eeveeFavoriteIds).not.toContain('stepping-stones');
    expect(eeveeFavoriteIds).not.toContain('brick-roof-decoration');
    expect(eeveeFavoriteIds).not.toContain('leppa-berry');
    expect(allAssets).toBe(assetCatalog);
  });

  it('uses imported PokopiaDex preference terms for all Pokemon', () => {
    const abraFavoriteIds = filterAssetsByFavorite(assetCatalog, 'abra', true).map((asset) => asset.assetId);

    expect(sourcePokemonPreferences).toHaveLength(knownPokemonKeys.length);
    expect(sourcePokemonPreferences.every((entry) => knownPokemonKeys.includes(entry.key))).toBe(true);
    expect(sourceItemPreferenceTerms).toHaveLength(553);
    expect(sourcePokemonPreferences.find((entry) => entry.key === 'ditto')?.preferenceTerms).toEqual([]);
    expect(abraFavoriteIds).toEqual(expect.arrayContaining(['fluff', 'alarm-clock']));
    expect(abraFavoriteIds).not.toContain('leppa-berry');
  });
});
