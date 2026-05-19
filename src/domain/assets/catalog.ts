import type { AreaType } from '../scene';
import type { PokemonKey } from './pokemon';

export type AssetCategory = 'furniture' | 'decor' | 'ground' | 'building' | 'roof';
export const assetSkillTypes = ['树叶', '耕地', '储水'] as const;
export type ConcreteAssetSkillType = (typeof assetSkillTypes)[number];
export type AssetSkillType = ConcreteAssetSkillType | null;

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
  dyeable: boolean;
  thumbnailUrl: string;
  thumbnailAlt: string;
}

export const assetCategoryLabels: Record<AssetCategory, string> = {
  furniture: '家具',
  decor: '装饰',
  ground: '地块',
  building: '建筑',
  roof: '屋顶',
};

export const areaLabels: Record<AreaType, string> = {
  main: '主体',
  outer: '外围',
};

export const assetSkillMarkerLabels: Record<ConcreteAssetSkillType, string> = {
  树叶: '树',
  耕地: '耕',
  储水: '水',
};

const assetSkillMarkerIconPaths: Record<ConcreteAssetSkillType, string> = {
  树叶: 'assets/pokopia_image_sources/item_portraits/0050-leaf.png',
  耕地: 'assets/pokopia_image_sources/decorative_item_portraits/171-farm-soil-ridge.webp',
  储水: 'assets/pokopia_image_sources/item_portraits/0508-water-basin.png',
};

const legacyAssetSkillTypeMap: Record<string, ConcreteAssetSkillType> = {
  leaf: '树叶',
  soil: '耕地',
  water: '储水',
};

export const assetCatalog: readonly AssetDefinition[] = [
  {
    assetId: 'wooden-floor',
    officialId: '390',
    name: '白木栅栏',
    category: 'decor',
    tags: ['装饰', '通用', '可旋转'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['pikachu', 'eevee'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: false,
    dyeable: true,
    thumbnailUrl: getAssetThumbnailUrl('0684-wooden-fencing.png'),
    thumbnailAlt: '白木栅栏缩略图',
  },
  {
    assetId: 'garden-plant',
    officialId: '1052',
    name: '小型灌木',
    category: 'decor',
    tags: ['装饰', '植物'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['pikachu', 'ditto', 'eevee'],
    defaultRequiresSkill: true,
    defaultSkillType: '树叶',
    skillCandidate: true,
    dyeable: false,
    thumbnailUrl: getAssetThumbnailUrl('0345-leafy-plant.png'),
    thumbnailAlt: '小型灌木缩略图',
  },
  {
    assetId: 'outer-wall',
    officialId: '717',
    name: '石板路径',
    category: 'ground',
    tags: ['地块', '道路'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['pikachu'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: false,
    dyeable: true,
    thumbnailUrl: getAssetThumbnailUrl('0701-stepping-stones.png'),
    thumbnailAlt: '石板路径缩略图',
  },
  {
    assetId: 'ditto-doll',
    officialId: '047',
    name: '木质长椅',
    category: 'furniture',
    tags: ['家具', '休憩'],
    applicableAreas: ['main'],
    favoritePokemonKeys: ['pikachu', 'ditto'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: true,
    dyeable: false,
    thumbnailUrl: getAssetThumbnailUrl('0282-wooden-bench.png'),
    thumbnailAlt: '木质长椅缩略图',
  },
  {
    assetId: 'water-barrel',
    officialId: '1168',
    name: '矮墙边角',
    category: 'building',
    tags: ['建筑', '围墙'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['pikachu'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: true,
    dyeable: false,
    thumbnailUrl: getAssetThumbnailUrl('0756-stone-brick-wall.png'),
    thumbnailAlt: '矮墙边角缩略图',
  },
  {
    assetId: 'roof-tile',
    officialId: '1903',
    name: '屋檐片段',
    category: 'roof',
    tags: ['屋顶', 'L2'],
    applicableAreas: ['main', 'outer'],
    favoritePokemonKeys: ['eevee', 'pikachu'],
    defaultRequiresSkill: false,
    defaultSkillType: null,
    skillCandidate: true,
    dyeable: true,
    thumbnailUrl: getAssetThumbnailUrl('0675-brick-roof-decoration.png'),
    thumbnailAlt: '屋檐片段缩略图',
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

export function isAssetSkillType(value: string | null | undefined): value is ConcreteAssetSkillType {
  return assetSkillTypes.includes(value as ConcreteAssetSkillType);
}

export function toAssetSkillType(value: string | null | undefined): AssetSkillType {
  if (isAssetSkillType(value)) {
    return value;
  }

  return value ? legacyAssetSkillTypeMap[value] ?? null : null;
}

export function getAssetSkillMarkerLabel(skillType: string | null | undefined): string {
  const normalizedSkillType = toAssetSkillType(skillType);

  return normalizedSkillType ? assetSkillMarkerLabels[normalizedSkillType] : '技';
}

export function getAssetSkillMarkerIconUrl(skillType: string | null | undefined): string | null {
  const normalizedSkillType = toAssetSkillType(skillType);

  return normalizedSkillType
    ? `${normalizeBaseUrl(import.meta.env.BASE_URL)}${assetSkillMarkerIconPaths[normalizedSkillType]}`
    : null;
}

export function canAssetRequirePlacementSkill(asset: AssetDefinition): boolean {
  return asset.skillCandidate || Boolean(asset.defaultSkillType);
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
  return `${normalizeBaseUrl(import.meta.env.BASE_URL)}assets/pokopia_image_sources/item_portraits/${fileName}`;
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
