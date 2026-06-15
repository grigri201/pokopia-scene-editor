import { isKnownPokemonKey, type PokemonKey } from './pokemon';
import { getPokopiaAssetUrl } from './asset-base-url';
import {
  itemsData,
  preferencesData,
  translationsData,
  type PokopiaItemRecord,
} from 'pokopia-data';
import { assetFootprintOverrideAssetIds, getAssetFootprint, type AssetFootprint } from './footprint-overrides';
import { assetStackingOverrideAssetIds, getAssetStacking, type AssetStackingMetadata } from './stacking-overrides';

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
export const assetSkillTypes = ['树叶', '耕地', '储水', '缠绕蔓藤'] as const;
export type ConcreteAssetSkillType = (typeof assetSkillTypes)[number];
export type AssetSkillType = ConcreteAssetSkillType | null;

export interface AssetDefinition {
  assetId: string;
  officialId: string;
  sceneCodecOfficialId?: string;
  legacyOfficialIds?: readonly string[];
  name: string;
  englishName: string;
  category: AssetCategory;
  tags: readonly string[];
  englishTags: readonly string[];
  searchKeywords: readonly string[];
  favoritePokemonKeys: readonly PokemonKey[];
  dyeable: boolean;
  footprint: AssetFootprint;
  stacking: AssetStackingMetadata;
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
  缠绕蔓藤: '藤',
};

const assetSkillMarkerIconPaths: Record<ConcreteAssetSkillType, string> = {
  树叶: 'assets/pokopia_image_sources/item_portraits/0050-leaf.png',
  耕地: 'assets/pokopia_image_sources/ability_icons/rototiller.png',
  储水: 'assets/pokopia_image_sources/specialty_icons/water.png',
  缠绕蔓藤: 'assets/pokopia_image_sources/item_portraits/0126-dense-vines.png',
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

const sourceAssetCategoryLabels: Record<string, string> = {
  建筑: '建筑',
  家具: '家具',
  实用: '实用',
  室外: '室外',
  自然: '自然',
  食物: '食物',
  材料: '材料',
  方块: '方块',
  杂货: '杂货',
  其他: '其他',
  套组: '套组',
  重要物品: '重要物品',
};

const legacyAssetSkillTypeMap: Record<string, ConcreteAssetSkillType> = {
  leaf: '树叶',
  soil: '耕地',
  water: '储水',
  vine: '缠绕蔓藤',
  vines: '缠绕蔓藤',
};

interface AssetCatalogOverride {
  assetId: string;
  name: string;
  category: AssetCategory;
  favoritePokemonKeys: readonly PokemonKey[];
  dyeable: boolean;
  thumbnailAlt: string;
}

const seedAssetOverridesByOfficialId: Record<string, AssetCatalogOverride> = {};

const reservedSeedAssetIds = new Set(Object.values(seedAssetOverridesByOfficialId).map((asset) => asset.assetId));
const allowedPlaceableKitWordSlugs = new Set(['adventure-kit']);

const favoriteCategoryIdsByPokemonKey: Readonly<Partial<Record<PokemonKey, readonly number[]>>> = {
  ditto: [],
  eevee: [2204, 2208, 2212, 2213, 2215, 2240],
  pikachu: [2206, 2211, 2212, 2228, 2229, 2234],
};

const preferenceTermAliases: Record<string, string> = {
  百花盛开的: '百花盛开',
  能出声的: '会出声的',
  能感受自然的: '能感受大自然的',
};

const itemPreferenceTermsBySlug = new Map<string, readonly string[]>(
  preferencesData.itemPreferenceTerms.map((entry) => [entry.slug, normalizePreferenceTerms(entry.preferenceTerms)]),
);

const pokemonPreferenceEntries: readonly {
  key: PokemonKey;
  preferenceTerms: readonly string[];
}[] = preferencesData.pokemon.flatMap((entry) =>
  isKnownPokemonKey(entry.key)
    ? [
        {
          key: entry.key,
          preferenceTerms: normalizePreferenceTerms(entry.preferenceTerms),
        },
      ]
    : [],
);

export const assetCatalog: readonly AssetDefinition[] = itemsData.items
  .filter((sourceItem) => !isFilteredSourcePlaceableItem(sourceItem))
  .map((sourceItem) => buildAssetDefinition(sourceItem))
  .sort(compareAssetsByOfficialId);

function buildAssetDefinition(sourceItem: PokopiaItemRecord): AssetDefinition {
  const sceneCodecOfficialId = sourceItem.id.toString().padStart(3, '0');
  const officialId = (sourceItem.sourceNumber ?? sourceItem.displayNumber ?? sourceItem.id).toString().padStart(3, '0');
  const override = seedAssetOverridesByOfficialId[String(sourceItem.id)];
  const assetId = override?.assetId ?? buildGeneratedAssetId(sourceItem.slug, sceneCodecOfficialId);
  const translatedName = translationsData.itemNameById[String(sourceItem.id)];
  const displayName = override?.name ?? translatedName ?? sourceItem.name;
  const legacyOfficialIds = officialId === sceneCodecOfficialId ? [] : [sceneCodecOfficialId];

  return {
    assetId,
    officialId,
    sceneCodecOfficialId,
    legacyOfficialIds,
    name: displayName,
    englishName: sourceItem.name,
    category: override?.category ?? inferAssetCategory(sourceItem),
    tags: buildSourceAssetTags(sourceItem),
    englishTags: buildSourceAssetTags(sourceItem, 'en-US'),
    searchKeywords: buildSearchKeywords(sourceItem, displayName),
    favoritePokemonKeys: buildFavoritePokemonKeys(sourceItem, override),
    dyeable: override?.dyeable ?? inferDyeable(sourceItem),
    footprint: getAssetFootprint(assetId),
    stacking: getAssetStacking(assetId),
    thumbnailUrl: getAssetThumbnailUrl(sourceItem.imageFileName),
    thumbnailAlt: override?.thumbnailAlt ?? `${displayName}缩略图`,
  };
}

function compareAssetsByOfficialId(left: AssetDefinition, right: AssetDefinition): number {
  const officialIdOrder = Number(left.officialId) - Number(right.officialId);

  return officialIdOrder === 0 ? left.assetId.localeCompare(right.assetId, 'en') : officialIdOrder;
}

function buildGeneratedAssetId(slug: string, officialId: string): string {
  return reservedSeedAssetIds.has(slug) ? `${slug}-${officialId}` : slug;
}

function isFilteredSourcePlaceableItem(sourceItem: PokopiaItemRecord): boolean {
  const translatedName = translationsData.itemNameById[String(sourceItem.id)] ?? '';
  const sourceCategory = sourceItem.sourceCategory ?? '';
  const searchable = `${sourceItem.name} ${sourceItem.slug} ${sourceItem.menuCategory} ${sourceCategory} ${sourceItem.tags.join(' ')} ${sourceItem.sourceTags?.join(' ') ?? ''}`;
  const isAllowedPlaceableKitWord = allowedPlaceableKitWordSlugs.has(sourceItem.slug);

  return (
    sourceItem.menuCategory === 'Kits' ||
    sourceItem.menuCategory === 'Key Items' ||
    sourceCategory === '套组' ||
    sourceCategory === '重要物品' ||
    translatedName.includes('套件') ||
    (!isAllowedPlaceableKitWord && /\bkit\b/i.test(searchable))
  );
}

function inferAssetCategory(sourceItem: PokopiaItemRecord): AssetCategory {
  return normalizeSourceAssetCategory(sourceItem.sourceCategory ?? sourceItem.menuCategory);
}

function normalizeSourceAssetCategory(menuCategory: string): AssetCategory {
  switch (menuCategory) {
    case '建筑':
    case 'Buildings':
      return 'buildings';
    case '家具':
    case 'Furniture':
      return 'furniture';
    case '实用':
    case 'Utilities':
      return 'utilities';
    case '室外':
    case 'Outdoor':
      return 'outdoor';
    case '自然':
    case 'Nature':
      return 'nature';
    case '食物':
    case 'Food':
      return 'food';
    case '材料':
    case 'Materials':
      return 'materials';
    case '方块':
    case 'Blocks':
      return 'blocks';
    case '杂货':
    case 'Misc.':
      return 'misc';
    case '其他':
    case 'Other':
      return 'other';
    default:
      throw new RangeError(`Unknown asset category: ${menuCategory}`);
  }
}

function buildSourceAssetTags(sourceItem: PokopiaItemRecord, locale: 'zh-CN' | 'en-US' = 'zh-CN'): readonly string[] {
  const sourceTags = locale === 'zh-CN' && sourceItem.sourceTags ? sourceItem.sourceTags : sourceItem.tags;
  const tagSet = new Set(sourceTags.filter(Boolean).map((tag) => {
    if (locale === 'en-US') {
      return tag;
    }

    return sourceAssetTagLabels[tag] ?? sourceAssetCategoryLabels[tag] ?? tag;
  }));

  return Array.from(tagSet);
}

function buildSearchKeywords(sourceItem: PokopiaItemRecord, displayName: string): readonly string[] {
  const officialId = (sourceItem.sourceNumber ?? sourceItem.displayNumber ?? sourceItem.id).toString().padStart(3, '0');
  const keywordSet = new Set([
    displayName,
    sourceItem.name,
    sourceItem.slug,
    officialId,
    sourceItem.menuCategory,
    sourceItem.sourceCategory,
    ...sourceItem.tags,
    ...(sourceItem.sourceTags ?? []),
  ].filter((keyword): keyword is string => Boolean(keyword)));

  return Array.from(keywordSet);
}

function buildFavoritePokemonKeys(
  sourceItem: PokopiaItemRecord,
  override: AssetCatalogOverride | undefined,
): readonly PokemonKey[] {
  const favoritePokemonKeySet = new Set<PokemonKey>(override?.favoritePokemonKeys ?? []);

  if (!sourceItem.sourceNumber) {
    const sourceFavoriteCategoryIdSet = new Set(sourceItem.favoriteCategoryIds);

    for (const pokemonKey of Object.keys(favoriteCategoryIdsByPokemonKey) as PokemonKey[]) {
      const favoriteCategoryIds = favoriteCategoryIdsByPokemonKey[pokemonKey] ?? [];

      if (favoriteCategoryIds.some((categoryId) => sourceFavoriteCategoryIdSet.has(categoryId))) {
        favoritePokemonKeySet.add(pokemonKey);
      }
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
  const normalized = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return preferenceTermAliases[normalized] ?? normalized;
}

function inferDyeable(sourceItem: PokopiaItemRecord): boolean {
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
const assetIdBySceneCodecOfficialId = buildAssetIdBySceneCodecOfficialId(assetCatalog);
assertKnownAssetFootprintOverrideIds(assetFootprintOverrideAssetIds, assetIdSet);
assertKnownAssetStackingOverrideIds(assetStackingOverrideAssetIds, assetIdSet);
assertKnownAssetStackingAllowedCategories(assetCatalog, new Set(assetCategories));

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

export function getAssetSceneCodecOfficialId(assetId: string): string {
  const asset = getAssetById(assetId);

  if (!asset) {
    throw new Error(`Unknown asset id: ${assetId}`);
  }

  return asset.sceneCodecOfficialId ?? asset.officialId;
}

export function getAssetIdBySceneCodecOfficialId(officialId: string): string | null {
  return assetIdBySceneCodecOfficialId.get(officialId) ?? null;
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

function buildAssetIdBySceneCodecOfficialId(assets: readonly AssetDefinition[]): ReadonlyMap<string, string> {
  const assetIdByOfficialId = new Map<string, string>();

  for (const asset of assets) {
    for (const officialId of [asset.sceneCodecOfficialId ?? asset.officialId, ...(asset.legacyOfficialIds ?? [])]) {
      const existingAssetId = assetIdByOfficialId.get(officialId);

      if (existingAssetId && existingAssetId !== asset.assetId) {
        throw new Error(`Duplicate scene codec official id: ${officialId}`);
      }

      assetIdByOfficialId.set(officialId, asset.assetId);
    }
  }

  return assetIdByOfficialId;
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

function assertKnownAssetStackingOverrideIds(overrideAssetIds: readonly string[], knownAssetIds: ReadonlySet<string>): void {
  for (const assetId of overrideAssetIds) {
    if (!knownAssetIds.has(assetId)) {
      throw new RangeError(`Unknown asset stacking override assetId: ${assetId}`);
    }
  }
}

function assertKnownAssetStackingAllowedCategories(
  assets: readonly AssetDefinition[],
  knownCategories: ReadonlySet<string>,
): void {
  for (const asset of assets) {
    for (const category of asset.stacking.allowedTopCategories) {
      if (!knownCategories.has(category)) {
        throw new RangeError(`Unknown asset stacking allowedTopCategory for ${asset.assetId}: ${category}`);
      }
    }
  }
}
