import type { AreaType } from '../scene';
import type { PokemonKey } from './pokemon';

export type AssetCategory = 'floor' | 'plant' | 'wall' | 'decor' | 'utility';
export type AssetSkillType = 'leaf' | 'water' | 'soil' | null;

export interface AssetDefinition {
  assetId: string;
  officialId: string;
  name: string;
  category: AssetCategory;
  tags: readonly string[];
  applicableAreas: readonly AreaType[];
  favoritePokemonKeys: readonly PokemonKey[];
  defaultRequiresSkill: boolean;
  defaultSkillType: AssetSkillType;
  skillCandidate: boolean;
  rotatable: boolean;
  stackable: boolean;
  dyeable: boolean;
  thumbnailUrl: string;
  thumbnailAlt: string;
}

export const assetCategoryLabels: Record<AssetCategory, string> = {
  floor: 'Floor',
  plant: 'Plant',
  wall: 'Wall',
  decor: 'Decor',
  utility: 'Utility',
};

export const areaLabels: Record<AreaType, string> = {
  main: 'Main',
  outer: 'Outer',
};

export const assetCatalog: readonly AssetDefinition[] = [
  {
    assetId: 'wooden-floor',
    officialId: '001',
    name: 'Wooden Floor',
    category: 'floor',
    tags: ['floor', 'wood', 'base'],
    applicableAreas: ['main'],
    favoritePokemonKeys: ['eevee'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: false,
    rotatable: false,
    stackable: false,
    dyeable: true,
    thumbnailUrl: getAssetThumbnailUrl('wooden-floor.svg'),
    thumbnailAlt: 'Wooden floor thumbnail',
  },
  {
    assetId: 'garden-plant',
    officialId: '014',
    name: 'Garden Plant',
    category: 'plant',
    tags: ['plant', 'leaf', 'green'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['ditto', 'eevee'],
    defaultRequiresSkill: true,
    defaultSkillType: 'leaf',
    skillCandidate: true,
    rotatable: false,
    stackable: true,
    dyeable: false,
    thumbnailUrl: getAssetThumbnailUrl('garden-plant.svg'),
    thumbnailAlt: 'Garden plant thumbnail',
  },
  {
    assetId: 'outer-wall',
    officialId: '027',
    name: 'Outer Wall',
    category: 'wall',
    tags: ['wall', 'edge', 'outer'],
    applicableAreas: ['outer'],
    favoritePokemonKeys: ['pikachu'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: false,
    rotatable: true,
    stackable: false,
    dyeable: true,
    thumbnailUrl: getAssetThumbnailUrl('outer-wall.svg'),
    thumbnailAlt: 'Outer wall thumbnail',
  },
  {
    assetId: 'ditto-doll',
    officialId: '039',
    name: 'Ditto Doll',
    category: 'decor',
    tags: ['decor', 'ditto', 'cute'],
    applicableAreas: ['main'],
    favoritePokemonKeys: ['ditto'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: true,
    rotatable: true,
    stackable: true,
    dyeable: false,
    thumbnailUrl: getAssetThumbnailUrl('ditto-doll.svg'),
    thumbnailAlt: 'Ditto doll thumbnail',
  },
  {
    assetId: 'water-barrel',
    officialId: '052',
    name: 'Water Barrel',
    category: 'utility',
    tags: ['water', 'barrel', 'storage'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['pikachu'],
    defaultRequiresSkill: true,
    defaultSkillType: 'water',
    skillCandidate: true,
    rotatable: true,
    stackable: false,
    dyeable: false,
    thumbnailUrl: getAssetThumbnailUrl('water-barrel.svg'),
    thumbnailAlt: 'Water barrel thumbnail',
  },
  {
    assetId: 'roof-tile',
    officialId: '068',
    name: 'Roof Tile',
    category: 'wall',
    tags: ['roof', 'tile', 'height'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['eevee', 'pikachu'],
    defaultRequiresSkill: true,
    defaultSkillType: 'soil',
    skillCandidate: true,
    rotatable: true,
    stackable: true,
    dyeable: true,
    thumbnailUrl: getAssetThumbnailUrl('roof-tile.svg'),
    thumbnailAlt: 'Roof tile thumbnail',
  },
] as const;

assertUniqueCatalogValues(
  assetCatalog.map((asset) => asset.assetId),
  'assetId',
);
assertUniqueCatalogValues(
  assetCatalog.map((asset) => asset.officialId),
  'officialId',
);

const assetIdSet = new Set(assetCatalog.map((asset) => asset.assetId));

export function isKnownAssetId(value: string): boolean {
  return assetIdSet.has(value);
}

export function assertKnownAssetId(value: string): void {
  if (!isKnownAssetId(value)) {
    throw new RangeError(`Unknown asset id: ${value}`);
  }
}

export function getAssetById(assetId: string | null | undefined): AssetDefinition | null {
  if (!assetId) {
    return null;
  }

  return assetCatalog.find((asset) => asset.assetId === assetId) ?? null;
}

export function getAssetAreaLabel(asset: AssetDefinition): string {
  return asset.applicableAreas.map((area) => areaLabels[area]).join(' / ');
}

export function getAssetSkillLabel(asset: AssetDefinition): string {
  if (!asset.defaultRequiresSkill) {
    return 'No default skill';
  }

  return asset.defaultSkillType ? `Default skill: ${asset.defaultSkillType}` : 'Default skill required';
}

export function assetMatchesPokemonFavorite(asset: AssetDefinition, pokemonKey: PokemonKey): boolean {
  return asset.favoritePokemonKeys.includes(pokemonKey);
}

export function filterAssetsByFavorite(
  assets: readonly AssetDefinition[],
  pokemonKey: PokemonKey,
  favoriteOnly: boolean,
): readonly AssetDefinition[] {
  if (!favoriteOnly) {
    return assets;
  }

  return assets.filter((asset) => assetMatchesPokemonFavorite(asset, pokemonKey));
}

function getAssetThumbnailUrl(fileName: string): string {
  return `${normalizeBaseUrl(import.meta.env.BASE_URL)}assets/asset-thumbnails/${fileName}`;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function assertUniqueCatalogValues(values: readonly string[], fieldName: string): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value)) {
      throw new RangeError(`Duplicate asset catalog ${fieldName}: ${value}`);
    }

    seen.add(value);
  }
}
