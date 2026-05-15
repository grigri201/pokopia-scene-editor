import type { AreaType } from '../scene';
import type {
  AssetCategory,
  AssetDefinition,
  AssetSkillType,
} from './catalog';
import { assetMatchesPokemonFavorite } from './catalog';
import type { PokemonKey } from './pokemon';

export const assetRenderLimit = 100;

export type AssetCategoryFilter = 'all' | AssetCategory;
export type AssetAreaFilter = 'all' | AreaType;
export type AssetSkillFilter = 'all' | 'requires-skill' | 'skill-candidate' | Exclude<AssetSkillType, null>;

export interface AssetFilterState {
  query: string;
  category: AssetCategoryFilter;
  area: AssetAreaFilter;
  favoriteOnly: boolean;
  skill: AssetSkillFilter;
}

export interface AssetFilterResult {
  filteredAssets: readonly AssetDefinition[];
  renderedAssets: readonly AssetDefinition[];
  filteredCount: number;
  totalCount: number;
  renderLimited: boolean;
}

export const defaultAssetFilters: AssetFilterState = {
  query: '',
  category: 'all',
  area: 'all',
  favoriteOnly: false,
  skill: 'all',
};

export function filterAssetCatalog(
  assets: readonly AssetDefinition[],
  filters: AssetFilterState,
  pokemonKey: PokemonKey,
  renderLimit = assetRenderLimit,
): AssetFilterResult {
  const filteredAssets = assets.filter((asset) => assetMatchesFilters(asset, filters, pokemonKey));
  const renderedAssets = filteredAssets.slice(0, renderLimit);

  return {
    filteredAssets,
    renderedAssets,
    filteredCount: filteredAssets.length,
    totalCount: assets.length,
    renderLimited: filteredAssets.length > renderedAssets.length,
  };
}

export function hasActiveAssetFilters(filters: AssetFilterState): boolean {
  return (
    Boolean(filters.query.trim()) ||
    filters.category !== 'all' ||
    filters.area !== 'all' ||
    filters.favoriteOnly ||
    filters.skill !== 'all'
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
    assetMatchesArea(asset, filters.area) &&
    assetMatchesFavorite(asset, filters.favoriteOnly, pokemonKey) &&
    assetMatchesSkill(asset, filters.skill)
  );
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
    asset.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
}

function assetMatchesCategory(asset: AssetDefinition, category: AssetCategoryFilter): boolean {
  return category === 'all' || asset.category === category;
}

function assetMatchesArea(asset: AssetDefinition, area: AssetAreaFilter): boolean {
  return area === 'all' || asset.applicableAreas.includes(area);
}

function assetMatchesFavorite(
  asset: AssetDefinition,
  favoriteOnly: boolean,
  pokemonKey: PokemonKey,
): boolean {
  return !favoriteOnly || assetMatchesPokemonFavorite(asset, pokemonKey);
}

function assetMatchesSkill(asset: AssetDefinition, skill: AssetSkillFilter): boolean {
  if (skill === 'all') {
    return true;
  }

  if (skill === 'requires-skill') {
    return asset.defaultRequiresSkill;
  }

  if (skill === 'skill-candidate') {
    return asset.skillCandidate;
  }

  return asset.defaultSkillType === skill;
}
