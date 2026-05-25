import {
  assetCatalog,
  assetCategories,
  defaultAssetFilters,
  defaultSelectedPokemonKey,
  filterAssetCatalog,
  isKnownPokemonKey,
  type AssetCategoryFilter,
  type AssetFilterState,
  type PokemonKey,
} from '@pokopia-scene-editor/scene-core';

export function searchAssetsFromUrl(url: URL) {
  const filters = createAssetFilters({
    query: url.searchParams.get('query'),
    category: url.searchParams.get('category'),
    favoriteOnly: url.searchParams.get('favoriteOnly'),
  });

  const pokemonKey = normalizePokemonKey(url.searchParams.get('pokemonKey'));
  const page = normalizeNumber(url.searchParams.get('page'), 1);
  const pageSize = normalizeNumber(url.searchParams.get('pageSize'), 10);
  const result = filterAssetCatalog(assetCatalog, filters, pokemonKey, page, pageSize);

  return {
    filters,
    pokemonKey,
    assets: result.renderedAssets,
    filteredCount: result.filteredCount,
    totalCount: result.totalCount,
    currentPage: result.currentPage,
    pageCount: result.pageCount,
    hasPreviousPage: result.hasPreviousPage,
    hasNextPage: result.hasNextPage,
  };
}

export function searchAssetsFromBody(body: unknown) {
  const record = asRecord(body);
  const filters = createAssetFilters({
    query: stringValue(record.query),
    category: stringValue(record.category),
    favoriteOnly: record.favoriteOnly,
  });

  const pokemonKey = normalizePokemonKey(stringValue(record.pokemonKey));
  const page = normalizeNumber(record.page, 1);
  const pageSize = normalizeNumber(record.pageSize, 10);
  const result = filterAssetCatalog(assetCatalog, filters, pokemonKey, page, pageSize);

  return {
    filters,
    pokemonKey,
    assets: result.renderedAssets,
    filteredCount: result.filteredCount,
    totalCount: result.totalCount,
    currentPage: result.currentPage,
    pageCount: result.pageCount,
    hasPreviousPage: result.hasPreviousPage,
    hasNextPage: result.hasNextPage,
  };
}

function createAssetFilters(input: {
  query: unknown;
  category: unknown;
  favoriteOnly: unknown;
}): AssetFilterState {
  return {
    query: stringValue(input.query) ?? defaultAssetFilters.query,
    category: normalizeCategory(input.category),
    favoriteOnly: booleanValue(input.favoriteOnly) ?? defaultAssetFilters.favoriteOnly,
  };
}

function normalizePokemonKey(value: unknown): PokemonKey {
  const candidate = stringValue(value);
  return candidate && isKnownPokemonKey(candidate) ? candidate : defaultSelectedPokemonKey;
}

function normalizeCategory(value: unknown): AssetCategoryFilter {
  const candidate = stringValue(value);
  if (!candidate || candidate === 'all') {
    return 'all';
  }

  return (assetCategories as readonly string[]).includes(candidate) ? candidate as AssetCategoryFilter : 'all';
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function normalizeNumber(value: unknown, fallback: number): number {
  const numberValue = typeof value === 'number' ? value : Number(stringValue(value));
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
