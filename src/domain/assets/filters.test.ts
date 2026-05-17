import { describe, expect, it } from 'vitest';
import { assetCatalog } from './catalog';
import {
  assetRenderLimit,
  defaultAssetFilters,
  filterAssetCatalog,
  hasActiveAssetFilters,
  type AssetFilterState,
} from './filters';

describe('asset catalog filters', () => {
  it('matches keyword queries by name, id, category, and tag', () => {
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '植物' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['garden-plant']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: 'garden-plant' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['garden-plant']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '1168' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['water-barrel']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '屋顶' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['roof-tile']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '休憩' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['ditto-doll']);
  });

  it('combines category, area, favorite, and skill filters', () => {
    const filters: AssetFilterState = {
      query: '',
      category: 'roof',
      area: 'outer',
      favoriteOnly: true,
      skill: 'skill-candidate',
    };

    expect(filterAssetCatalog(assetCatalog, filters, 'pikachu').filteredAssets.map((asset) => asset.assetId)).toEqual(['roof-tile']);
    expect(hasActiveAssetFilters(filters)).toBe(true);
    expect(hasActiveAssetFilters(defaultAssetFilters)).toBe(false);
  });

  it('filters default skill requirements and placement skill candidates separately', () => {
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, skill: 'requires-skill' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual([
      'garden-plant',
    ]);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, skill: 'skill-candidate' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual([
      'garden-plant',
      'ditto-doll',
      'water-barrel',
      'roof-tile',
    ]);
  });

  it('limits rendered assets while preserving the full match count', () => {
    const largeCatalog = Array.from({ length: assetRenderLimit + 2 }, (_, index) => ({
      ...assetCatalog[index % assetCatalog.length],
      assetId: `asset-${index}`,
      officialId: index.toString().padStart(3, '0'),
      name: `Asset ${index}`,
    }));
    const result = filterAssetCatalog(largeCatalog, defaultAssetFilters, 'ditto');
    const expandedResult = filterAssetCatalog(largeCatalog, defaultAssetFilters, 'ditto', assetRenderLimit + 2);

    expect(result.filteredCount).toBe(assetRenderLimit + 2);
    expect(result.renderedAssets).toHaveLength(assetRenderLimit);
    expect(result.renderLimited).toBe(true);
    expect(expandedResult.renderedAssets).toHaveLength(assetRenderLimit + 2);
    expect(expandedResult.renderLimited).toBe(false);
  });
});
