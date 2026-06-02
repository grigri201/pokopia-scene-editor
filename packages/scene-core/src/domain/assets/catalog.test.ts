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
import { assetFootprintOverrideAssetIds } from './footprint-overrides';
import { knownPokemonKeys } from './pokemon';
import { sourceItemPreferenceTerms, sourcePokemonPreferences } from './source-pokemon-preferences';
import { assetStackingOverrideAssetIds, defaultAssetStacking } from './stacking-overrides';

describe('asset catalog', () => {
  it('provides complete static metadata for each seed asset', () => {
    expect(assetCatalog).toHaveLength(1161);

    for (const asset of assetCatalog) {
      expect(asset.assetId).not.toBe('');
      expect(asset.officialId).toMatch(/^\d{3,4}$/);
      expect(asset.name).not.toBe('');
      expect(asset.name).not.toContain('套件');
      expect(asset.tags).not.toContain('套件');
      expect(asset.searchKeywords.length).toBeGreaterThan(0);
      expect(asset.thumbnailUrl).toMatch(/^\/assets\/pokopia_image_sources\/item_portraits\/.+\.(png|webp)$/);
      expect(asset.thumbnailAlt).toContain('缩略图');
      expect(asset.footprint).toEqual({
        length: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number),
      });
      expect(Number.isInteger(asset.footprint.length)).toBe(true);
      expect(Number.isInteger(asset.footprint.width)).toBe(true);
      expect(Number.isInteger(asset.footprint.height)).toBe(true);
      expect(asset.footprint.length).toBeGreaterThan(0);
      expect(asset.footprint.width).toBeGreaterThan(0);
      expect(asset.footprint.height).toBeGreaterThan(0);
      expect(asset.stacking).toEqual({
        surfaceKind: expect.any(String),
        allowsSameLevelOverlap: expect.any(Boolean),
        allowedTopCategories: expect.any(Array),
      });
      expect('applicableAreas' in asset).toBe(false);
      expect('defaultRequiresSkill' in asset).toBe(false);
      expect('defaultSkillType' in asset).toBe(false);
      expect('skillCandidate' in asset).toBe(false);
      expect(typeof asset.dyeable).toBe('boolean');
    }
  });

  it('looks up assets and rejects unknown ids', () => {
    expect(getAssetById('leafy-plant')?.name).toBe('大叶子的植栽');
    expect(getAssetById(null)).toBeNull();
    expect(() => assertKnownAssetId('missing-asset')).toThrow(RangeError);
    expect(getAssetById('leaf-den-kit')).toBeNull();
    expect(() => assertKnownAssetId('leaf-den-kit')).toThrow(RangeError);
    expect(getAssetById('bouldery-badge')).toBeNull();
    expect(() => assertKnownAssetId('bouldery-badge')).toThrow(RangeError);
    expect(getAssetById('wooden-bench')?.officialId).toBe('277');
    expect(getAssetById('wooden-bench')?.sceneCodecOfficialId).toBe('047');
    expect(getAssetById('wooden-bench')?.name).toBe('木长椅');
    expect(getAssetById('ditto-doll')?.officialId).toBe('448');
    expect(getAssetById('ditto-doll')?.sceneCodecOfficialId).toBe('979');
    expect(getAssetById('ditto-doll')?.name).toBe('百变怪玩偶');
  });

  it('uses Chinese item names while retaining source names for search', () => {
    const leppaBerry = getAssetById('leppa-berry');
    const chestoBerry = getAssetById('chesto-berry');

    expect(leppaBerry).toMatchObject({
      officialId: '001',
      sceneCodecOfficialId: '197',
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
    expect(gardenPlant).toMatchObject({ officialId: '336', sceneCodecOfficialId: '1052', name: '大叶子的植栽', category: 'misc' });
    expect(woodenFloor).toMatchObject({ officialId: '661', sceneCodecOfficialId: '390', name: '木栏杆', category: 'buildings' });
  });

  it('includes local Infipoke-only fallback placeable items', () => {
    expect(getAssetById('vine')).toMatchObject({
      officialId: '2374',
      sceneCodecOfficialId: '2374',
      name: '藤蔓',
      englishName: 'Vine',
      category: 'nature',
      thumbnailUrl: '/assets/pokopia_image_sources/item_portraits/1220-vine.png',
      thumbnailAlt: '藤蔓缩略图',
    });
  });

  it('sorts the catalog by official item number from low to high', () => {
    const officialIds = assetCatalog.map((asset) => Number(asset.officialId));

    expect(officialIds).toEqual([...officialIds].sort((left, right) => left - right));
  });

  it('defaults uncovered assets to 1x1x1 footprint and applies audited large-asset overrides', () => {
    expect(getAssetById('leafy-plant')?.footprint).toEqual({ length: 1, width: 1, height: 1 });
    expect(getAssetById('garden-ornament')?.footprint).toEqual({ length: 1, width: 1, height: 1 });
    expect(getAssetById('counter')?.footprint).toEqual({ length: 1, width: 1, height: 1 });
    expect(getAssetById('mini-bookcase')?.footprint).toEqual({ length: 1, width: 1, height: 1 });
    expect(getAssetById('cooking-stove')?.footprint).toEqual({ length: 1, width: 1, height: 1 });
    expect(getAssetById('wooden-bench')?.footprint).toEqual({ length: 1, width: 2, height: 1 });
    expect(getAssetById('curved-eave')?.footprint).toEqual({ length: 2, width: 1, height: 1 });
    expect(getAssetById('canoe')?.footprint).toEqual({ length: 2, width: 1, height: 1 });
    expect(getAssetById('firepit')?.footprint).toEqual({ length: 2, width: 2, height: 1 });
    expect(getAssetById('large-boulder')?.footprint).toEqual({ length: 2, width: 2, height: 1 });
    expect(getAssetById('chansey-plant')?.footprint).toEqual({ length: 2, width: 2, height: 3 });
    expect(getAssetById('bread-oven')?.footprint).toEqual({ length: 1, width: 1, height: 2 });
    expect(assetFootprintOverrideAssetIds.every((assetId) => getAssetById(assetId))).toBe(true);
  });

  it('applies audited large rug footprint overrides', () => {
    expect(getAssetById('oblong-rug')?.footprint).toEqual({ length: 1, width: 2, height: 1 });
    expect(getAssetById('large-narrow-rug')?.footprint).toEqual({ length: 1, width: 2, height: 1 });
    expect(getAssetById('large-round-rug')?.footprint).toEqual({ length: 2, width: 2, height: 1 });
    expect(getAssetById('large-square-rug')?.footprint).toEqual({ length: 4, width: 4, height: 1 });
    expect(getAssetById('lace-rug')?.footprint).toEqual({ length: 3, width: 3, height: 1 });
  });

  it('defaults assets to non-stackable metadata unless an audited override exists', () => {
    expect(getAssetById('leafy-plant')?.stacking).toEqual(defaultAssetStacking);
    expect(getAssetById('large-boulder')?.stacking).toEqual(defaultAssetStacking);
    expect(getAssetById('tall-grass')?.stacking).toEqual(defaultAssetStacking);
    expect(getAssetById('music-mat-low-do')?.stacking).toEqual(defaultAssetStacking);
    expect(getAssetById('felt-mat')?.stacking).toEqual(defaultAssetStacking);
    expect(assetStackingOverrideAssetIds).toHaveLength(59);
    expect(assetStackingOverrideAssetIds.every((assetId) => getAssetById(assetId))).toBe(true);
  });

  it('marks audited plate assets as food-only stacking surfaces', () => {
    for (const assetId of ['wooden-plate', 'plate', 'party-platter']) {
      expect(getAssetById(assetId)?.stacking).toEqual({
        surfaceKind: 'food-surface',
        allowsSameLevelOverlap: true,
        allowedTopCategories: ['food'],
      });
    }
  });

  it('marks only audited low-height and floor-cover surfaces as stackable', () => {
    expect(getAssetById('green-shoots')?.stacking).toMatchObject({
      surfaceKind: 'low-height-surface',
      allowsSameLevelOverlap: true,
      allowedTopCategories: expect.arrayContaining(['furniture', 'food', 'misc']),
    });
    expect(getAssetById('frame')?.stacking).toMatchObject({
      surfaceKind: 'low-height-surface',
      allowsSameLevelOverlap: true,
    });
    expect(getAssetById('small-narrow-rug')?.stacking).toMatchObject({
      surfaceKind: 'floor-cover',
      allowsSameLevelOverlap: true,
      allowedTopCategories: expect.arrayContaining(['furniture', 'food', 'misc']),
    });
    expect(getAssetById('felt-mat-interior')?.stacking).toMatchObject({
      surfaceKind: 'floor-cover',
      allowsSameLevelOverlap: true,
    });
    expect(getAssetById('felt-mat')?.stacking.surfaceKind).toBe('none');
    expect(getAssetById('modern-carpeting')?.stacking.surfaceKind).toBe('none');
  });

  it('covers each audited numeric footprint volume from the checklist', () => {
    const auditedFootprintExamples = [
      ['leppa-berry', { length: 1, width: 1, height: 1 }],
      ['strength-rock', { length: 1, width: 1, height: 2 }],
      ['office-locker', { length: 1, width: 1, height: 2 }],
      ['bread-oven', { length: 1, width: 1, height: 2 }],
      ['pointy-tree', { length: 1, width: 1, height: 3 }],
      ['driftwood', { length: 1, width: 2, height: 1 }],
      ['stalagmites', { length: 1, width: 2, height: 2 }],
      ['deck-chair', { length: 2, width: 1, height: 1 }],
      ['counter', { length: 1, width: 1, height: 1 }],
      ['large-boulder', { length: 2, width: 2, height: 1 }],
      ['large-square-rug', { length: 4, width: 4, height: 1 }],
      ['chansey-plant', { length: 2, width: 2, height: 3 }],
      ['lift-platform', { length: 2, width: 2, height: 2 }],
    ] as const;

    for (const [assetId, footprint] of auditedFootprintExamples) {
      expect(getAssetById(assetId)?.footprint).toEqual(footprint);
    }
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
    expect(getAssetSkillMarkerIconUrl('耕地')).toContain('/assets/pokopia_image_sources/ability_icons/rototiller.png');
    expect(getAssetSkillMarkerIconUrl('water')).toContain('/assets/pokopia_image_sources/specialty_icons/water.png');
    expect(getAssetSkillMarkerIconUrl(null)).toBeNull();
  });

  it('filters favorite assets by current Pokemon', () => {
    const eeveeFavorites = filterAssetsByFavorite(assetCatalog, 'eevee', true);
    const allAssets = filterAssetsByFavorite(assetCatalog, 'eevee', false);
    const eeveeFavoriteIds = eeveeFavorites.map((asset) => asset.assetId);

    expect(eeveeFavorites).toHaveLength(193);
    expect(eeveeFavoriteIds).toEqual(expect.arrayContaining([
      'ditto-doll',
      'wooden-bench',
      'stone-brick-wall',
      'stone',
    ]));
    expect(eeveeFavoriteIds).not.toContain('wooden-fencing');
    expect(eeveeFavoriteIds).not.toContain('leafy-plant');
    expect(eeveeFavoriteIds).not.toContain('stepping-stones');
    expect(eeveeFavoriteIds).not.toContain('brick-roof-decoration');
    expect(eeveeFavoriteIds).not.toContain('leppa-berry');
    expect(allAssets).toBe(assetCatalog);
  });

  it('uses imported Xzonn preference terms for all Pokemon', () => {
    const abraFavoriteIds = filterAssetsByFavorite(assetCatalog, 'abra', true).map((asset) => asset.assetId);

    expect(sourcePokemonPreferences).toHaveLength(knownPokemonKeys.length);
    expect(sourcePokemonPreferences.every((entry) => knownPokemonKeys.includes(entry.key))).toBe(true);
    expect(sourceItemPreferenceTerms).toHaveLength(548);
    expect(sourcePokemonPreferences.find((entry) => entry.key === 'ditto')?.preferenceTerms).toEqual([]);
    expect(abraFavoriteIds).toEqual(expect.arrayContaining(['fluff', 'alarm-clock']));
    expect(abraFavoriteIds).not.toContain('leppa-berry');
  });
});
