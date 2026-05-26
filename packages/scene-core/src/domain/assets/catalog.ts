import { isKnownPokemonKey, type PokemonKey } from './pokemon';
import { getPokopiaAssetUrl } from './asset-base-url';
import { sourcePlaceableAssetNameTranslations } from './source-placeable-item-translations';
import { sourcePlaceableAssetItems, type SourcePlaceableAssetItem } from './source-placeable-items';
import { sourceItemPreferenceTerms, sourcePokemonPreferences } from './source-pokemon-preferences';
import { assetFootprintOverrideAssetIds, getAssetFootprint, type AssetFootprint } from './footprint-overrides';

export const assetCategories = [
  'buildings',
  'furniture',
  'utilities',
  'outdoor',
  'nature',
  'food',
  'materials',
  'blocks',
  'misc',
  'other',
] as const;
export type AssetCategory = (typeof assetCategories)[number];
export const assetSkillTypes = ['树叶', '耕地', '储水'] as const;
export type ConcreteAssetSkillType = (typeof assetSkillTypes)[number];
export type AssetSkillType = ConcreteAssetSkillType | null;

export interface AssetDefinition {
  assetId: string;
  officialId: string;
  name: string;
  englishName: string;
  category: AssetCategory;
  tags: readonly string[];
  englishTags: readonly string[];
  searchKeywords: readonly string[];
  favoritePokemonKeys: readonly PokemonKey[];
  dyeable: boolean;
  footprint: AssetFootprint;
  thumbnailUrl: string;
  thumbnailAlt: string;
}

export const assetCategoryLabels: Record<AssetCategory, string> = {
  buildings: '建筑',
  furniture: '家具',
  utilities: '功能',
  outdoor: '户外',
  nature: '自然',
  food: '食物',
  materials: '材料',
  blocks: '地块',
  misc: '杂项',
  other: '其他',
};

export const assetSkillMarkerLabels: Record<ConcreteAssetSkillType, string> = {
  树叶: '树',
  耕地: '耕',
  储水: '水',
};

const assetSkillMarkerIconPaths: Record<ConcreteAssetSkillType, string> = {
  树叶: 'assets/pokopia_image_sources/item_portraits/0050-leaf.png',
  耕地: 'assets/pokopia_image_sources/ability_icons/rototiller.png',
  储水: 'assets/pokopia_image_sources/specialty_icons/water.png',
};

const sourceAssetTagLabels: Record<string, string> = {
  Blocks: '地块',
  Buildings: '建筑',
  Decoration: '装饰',
  Food: '食物',
  Furniture: '家具',
  Kits: '套件',
  'Key Items': '重要物品',
  Materials: '材料',
  'Misc.': '杂项',
  Nature: '自然',
  Other: '其他',
  Outdoor: '户外',
  Relaxation: '休憩',
  Road: '道路',
  Toy: '玩具',
  Utilities: '功能',
};

const legacyAssetSkillTypeMap: Record<string, ConcreteAssetSkillType> = {
  leaf: '树叶',
  soil: '耕地',
  water: '储水',
};

interface AssetCatalogOverride {
  assetId: string;
  name: string;
  category: AssetCategory;
  favoritePokemonKeys: readonly PokemonKey[];
  dyeable: boolean;
  thumbnailAlt: string;
  sortOrder: number;
}

const seedAssetOverridesByOfficialId: Record<string, AssetCatalogOverride> = {};

const reservedSeedAssetIds = new Set(Object.values(seedAssetOverridesByOfficialId).map((asset) => asset.assetId));

const favoriteCategoryIdsByPokemonKey: Readonly<Partial<Record<PokemonKey, readonly number[]>>> = {
  ditto: [],
  eevee: [2204, 2208, 2212, 2213, 2215, 2240],
  pikachu: [2206, 2211, 2212, 2228, 2229, 2234],
};

const itemPreferenceTermsBySlug = new Map<string, readonly string[]>(
  sourceItemPreferenceTerms.map((entry) => [entry.slug, normalizePreferenceTerms(entry.preferenceTerms)]),
);

const pokemonPreferenceEntries: readonly {
  key: PokemonKey;
  preferenceTerms: readonly string[];
}[] = sourcePokemonPreferences.flatMap((entry) =>
  isKnownPokemonKey(entry.key)
    ? [
        {
          key: entry.key,
          preferenceTerms: normalizePreferenceTerms(entry.preferenceTerms),
        },
      ]
    : [],
);

interface SortableAssetDefinition {
  asset: AssetDefinition;
  sortOrder: number;
}

export const assetCatalog: readonly AssetDefinition[] = sourcePlaceableAssetItems
  .filter((sourceItem) => !isFilteredSourcePlaceableItem(sourceItem))
  .map((sourceItem, index) => buildAssetDefinition(sourceItem, index))
  .sort((left, right) => left.sortOrder - right.sortOrder)
  .map((entry) => entry.asset);

function buildAssetDefinition(sourceItem: SourcePlaceableAssetItem, sourceIndex: number): SortableAssetDefinition {
  const officialId = sourceItem.id.toString().padStart(3, '0');
  const override = seedAssetOverridesByOfficialId[String(sourceItem.id)];
  const assetId = override?.assetId ?? buildGeneratedAssetId(sourceItem.slug, officialId);
  const translatedName = sourcePlaceableAssetNameTranslations[sourceItem.id];
  const displayName = override?.name ?? translatedName ?? sourceItem.name;

  return {
    asset: {
      assetId,
      officialId,
      name: displayName,
      englishName: sourceItem.name,
      category: override?.category ?? inferAssetCategory(sourceItem),
      tags: buildSourceAssetTags(sourceItem),
      englishTags: buildSourceAssetTags(sourceItem, 'en-US'),
      searchKeywords: buildSearchKeywords(sourceItem, displayName),
      favoritePokemonKeys: buildFavoritePokemonKeys(sourceItem, override),
      dyeable: override?.dyeable ?? inferDyeable(sourceItem),
      footprint: getAssetFootprint(assetId),
      thumbnailUrl: getAssetThumbnailUrl(sourceItem.imageFileName),
      thumbnailAlt: override?.thumbnailAlt ?? `${displayName}缩略图`,
    },
    sortOrder: override?.sortOrder ?? sourceIndex + 100,
  };
}

function buildGeneratedAssetId(slug: string, officialId: string): string {
  return reservedSeedAssetIds.has(slug) ? `${slug}-${officialId}` : slug;
}

function isFilteredSourcePlaceableItem(sourceItem: SourcePlaceableAssetItem): boolean {
  const translatedName = sourcePlaceableAssetNameTranslations[sourceItem.id] ?? '';
  const searchable = `${sourceItem.name} ${sourceItem.slug} ${sourceItem.menuCategory} ${sourceItem.tags.join(' ')}`;

  return (
    sourceItem.menuCategory === 'Kits' ||
    sourceItem.menuCategory === 'Key Items' ||
    translatedName.includes('套件') ||
    /\bkit\b/i.test(searchable)
  );
}

function inferAssetCategory(sourceItem: SourcePlaceableAssetItem): AssetCategory {
  return normalizeSourceAssetCategory(sourceItem.menuCategory);
}

function normalizeSourceAssetCategory(menuCategory: string): AssetCategory {
  switch (menuCategory) {
    case 'Buildings':
      return 'buildings';
    case 'Furniture':
      return 'furniture';
    case 'Utilities':
      return 'utilities';
    case 'Outdoor':
      return 'outdoor';
    case 'Nature':
      return 'nature';
    case 'Food':
      return 'food';
    case 'Materials':
      return 'materials';
    case 'Blocks':
      return 'blocks';
    case 'Misc.':
      return 'misc';
    case 'Other':
      return 'other';
    default:
      return 'misc';
  }
}

function buildSourceAssetTags(sourceItem: SourcePlaceableAssetItem, locale: 'zh-CN' | 'en-US' = 'zh-CN'): readonly string[] {
  const tagSet = new Set(
    sourceItem.tags
      .filter(Boolean)
      .map((tag) => (locale === 'en-US' ? tag : sourceAssetTagLabels[tag] ?? tag)),
  );

  return Array.from(tagSet);
}

function buildSearchKeywords(sourceItem: SourcePlaceableAssetItem, displayName: string): readonly string[] {
  const keywordSet = new Set([
    displayName,
    sourceItem.name,
    sourceItem.slug,
    sourceItem.menuCategory,
    ...sourceItem.tags,
  ].filter(Boolean));

  return Array.from(keywordSet);
}

function buildFavoritePokemonKeys(
  sourceItem: SourcePlaceableAssetItem,
  override: AssetCatalogOverride | undefined,
): readonly PokemonKey[] {
  const favoritePokemonKeySet = new Set<PokemonKey>(override?.favoritePokemonKeys ?? []);
  const sourceFavoriteCategoryIdSet = new Set(sourceItem.favoriteCategoryIds);

  for (const pokemonKey of Object.keys(favoriteCategoryIdsByPokemonKey) as PokemonKey[]) {
    const favoriteCategoryIds = favoriteCategoryIdsByPokemonKey[pokemonKey] ?? [];

    if (favoriteCategoryIds.some((categoryId) => sourceFavoriteCategoryIdSet.has(categoryId))) {
      favoritePokemonKeySet.add(pokemonKey);
    }
  }

  const sourceItemPreferenceTermSet = new Set(itemPreferenceTermsBySlug.get(sourceItem.slug) ?? []);

  if (sourceItemPreferenceTermSet.size > 0) {
    for (const pokemonPreferenceEntry of pokemonPreferenceEntries) {
      if (
        pokemonPreferenceEntry.preferenceTerms.some((preferenceTerm) => sourceItemPreferenceTermSet.has(preferenceTerm))
      ) {
        favoritePokemonKeySet.add(pokemonPreferenceEntry.key);
      }
    }
  }

  return Array.from(favoritePokemonKeySet);
}

function normalizePreferenceTerms(terms: readonly string[]): readonly string[] {
  return Array.from(new Set(terms.map(normalizePreferenceTerm).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
}

function normalizePreferenceTerm(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function inferDyeable(sourceItem: SourcePlaceableAssetItem): boolean {
  const searchable = `${sourceItem.name} ${sourceItem.slug} ${sourceItem.menuCategory} ${sourceItem.tags.join(' ')}`.toLowerCase();

  return searchable.includes('wall') || searchable.includes('floor') || searchable.includes('roof');
}

assertUniqueCatalogValues(
  assetCatalog.map((asset) => asset.assetId),
  'assetId',
);
assertUniqueCatalogValues(
  assetCatalog.map((asset) => asset.officialId),
  'officialId',
);

const assetIdSet = new Set(assetCatalog.map((asset) => asset.assetId));
assertKnownAssetFootprintOverrideIds(assetFootprintOverrideAssetIds, assetIdSet);

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
    ? getPokopiaAssetUrl(assetSkillMarkerIconPaths[normalizedSkillType])
    : null;
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
  return getPokopiaAssetUrl(`assets/pokopia_image_sources/item_portraits/${fileName}`);
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

function assertKnownAssetFootprintOverrideIds(overrideAssetIds: readonly string[], knownAssetIds: ReadonlySet<string>): void {
  for (const assetId of overrideAssetIds) {
    if (!knownAssetIds.has(assetId)) {
      throw new RangeError(`Unknown asset footprint override assetId: ${assetId}`);
    }
  }
}
