import { describe, expect, it } from 'vitest';
import { assetCatalog } from './catalog';
import {
  assetPageSize,
  defaultAssetFilters,
  filterAssetCatalog,
  hasActiveAssetFilters,
  type AssetFilterState,
} from './filters';

describe('asset catalog filters', () => {
  it('matches keyword queries by name, id, category, and tag', () => {
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '大叶子的植栽' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['leafy-plant']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: 'leafy-plant' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['leafy-plant']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '733' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['stone-brick-wall']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '屋顶装饰' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['brick-roof-decoration']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '木长椅' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['wooden-bench']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '苹野果' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toContain('leppa-berry');
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: 'Leppa Berry' }, 'ditto').filteredAssets.map((asset) => asset.assetId)).toEqual(['leppa-berry']);
    expect(filterAssetCatalog(assetCatalog, { ...defaultAssetFilters, query: '套件' }, 'ditto').filteredAssets).toEqual([]);
  });

  it('combines category and favorite filters', () => {
    const filters: AssetFilterState = {
      query: '木长椅',
      category: 'furniture',
      favoriteOnly: true,
    };

    expect(filterAssetCatalog(assetCatalog, filters, 'pikachu').filteredAssets.map((asset) => asset.assetId)).toEqual(['wooden-bench']);
    expect(hasActiveAssetFilters(filters)).toBe(true);
    expect(hasActiveAssetFilters(defaultAssetFilters)).toBe(false);
  });

  it('paginates rendered assets while preserving the full match count', () => {
    const largeCatalog = Array.from({ length: assetPageSize + 2 }, (_, index) => ({
      ...assetCatalog[index % assetCatalog.length],
      assetId: `asset-${index}`,
      officialId: index.toString().padStart(3, '0'),
      name: `Asset ${index}`,
    }));
    const result = filterAssetCatalog(largeCatalog, defaultAssetFilters, 'ditto');
    const secondPageResult = filterAssetCatalog(largeCatalog, defaultAssetFilters, 'ditto', 2);

    expect(result.filteredCount).toBe(assetPageSize + 2);
    expect(result.renderedAssets).toHaveLength(assetPageSize);
    expect(result.currentPage).toBe(1);
    expect(result.pageCount).toBe(2);
    expect(result.hasPreviousPage).toBe(false);
    expect(result.hasNextPage).toBe(true);
    expect(secondPageResult.renderedAssets).toHaveLength(2);
    expect(secondPageResult.currentPage).toBe(2);
    expect(secondPageResult.hasPreviousPage).toBe(true);
    expect(secondPageResult.hasNextPage).toBe(false);
  });
});
