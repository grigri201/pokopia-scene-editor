import type {
  AssetCategory,
  AssetDefinition,
} from './catalog';
import { assetCategoryLabels } from './catalog';
import { assetMatchesPokemonFavorite } from './catalog';
import type { PokemonKey } from './pokemon';

export const assetPageSize = 10;

export type AssetCategoryFilter = 'all' | AssetCategory;

export interface AssetFilterState {
  query: string;
  category: AssetCategoryFilter;
  favoriteOnly: boolean;
}

export interface AssetFilterResult {
  filteredAssets: readonly AssetDefinition[];
  renderedAssets: readonly AssetDefinition[];
  filteredCount: number;
  totalCount: number;
  currentPage: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export const defaultAssetFilters: AssetFilterState = {
  query: '',
  category: 'all',
  favoriteOnly: false,
};

export function filterAssetCatalog(
  assets: readonly AssetDefinition[],
  filters: AssetFilterState,
  pokemonKey: PokemonKey,
  page = 1,
  pageSize = assetPageSize,
): AssetFilterResult {
  const filteredAssets = assets.filter((asset) => assetMatchesFilters(asset, filters, pokemonKey));
  const normalizedPageSize = normalizePageSize(pageSize);
  const pageCount = Math.max(1, Math.ceil(filteredAssets.length / normalizedPageSize));
  const currentPage = clampPage(page, pageCount);
  const pageStart = (currentPage - 1) * normalizedPageSize;
  const renderedAssets = filteredAssets.slice(pageStart, pageStart + normalizedPageSize);

  return {
    filteredAssets,
    renderedAssets,
    filteredCount: filteredAssets.length,
    totalCount: assets.length,
    currentPage,
    pageCount,
    hasPreviousPage: currentPage > 1,
    hasNextPage: currentPage < pageCount,
  };
}

export function hasActiveAssetFilters(filters: AssetFilterState): boolean {
  return (
    Boolean(filters.query.trim()) ||
    filters.category !== 'all' ||
    filters.favoriteOnly
  );
}

function assetMatchesFilters(
  asset: AssetDefinition,
  filters: AssetFilterState,
  pokemonKey: PokemonKey,
): boolean {
  return (
    assetMatchesQuery(asset, filters.query) &&
    assetMatchesCategory(asset, filters.category) &&
    assetMatchesFavorite(asset, filters.favoriteOnly, pokemonKey)
  );
}

function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.trunc(page)), pageCount);
}

function normalizePageSize(pageSize: number): number {
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    return assetPageSize;
  }

  return Math.trunc(pageSize);
}

function assetMatchesQuery(asset: AssetDefinition, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return (
    asset.name.toLowerCase().includes(normalizedQuery) ||
    asset.assetId.toLowerCase().includes(normalizedQuery) ||
    asset.officialId.toLowerCase().includes(normalizedQuery) ||
    asset.category.toLowerCase().includes(normalizedQuery) ||
    assetCategoryLabels[asset.category].toLowerCase().includes(normalizedQuery) ||
    asset.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
    asset.searchKeywords.some((keyword) => keyword.toLowerCase().includes(normalizedQuery))
  );
}

function assetMatchesCategory(asset: AssetDefinition, category: AssetCategoryFilter): boolean {
  return category === 'all' || asset.category === category;
}

function assetMatchesFavorite(
  asset: AssetDefinition,
  favoriteOnly: boolean,
  pokemonKey: PokemonKey,
): boolean {
  return !favoriteOnly || assetMatchesPokemonFavorite(asset, pokemonKey);
}
