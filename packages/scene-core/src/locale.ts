import type {
  AssetCategory,
  AssetDefinition,
  ConcreteAssetSkillType,
  PokemonThemeDefinition,
} from './domain/assets';
import { getBuildingLevelDisplayNumber } from './domain/scene/levels';

export const locales = ['zh-CN', 'en-US'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

export const localeLabels: Record<Locale, string> = {
  'zh-CN': '中文',
  'en-US': 'English',
};

const assetCategoryLabelsByLocale: Record<Locale, Record<AssetCategory, string>> = {
  'zh-CN': {
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
  },
  'en-US': {
    buildings: 'Buildings',
    furniture: 'Furniture',
    utilities: 'Utilities',
    outdoor: 'Outdoor',
    nature: 'Nature',
    food: 'Food',
    materials: 'Materials',
    blocks: 'Blocks',
    misc: 'Misc.',
    other: 'Other',
  },
};

const skillLabelsByLocale: Record<Locale, Record<ConcreteAssetSkillType, { name: string; marker: string }>> = {
  'zh-CN': {
    树叶: { name: '树叶', marker: '树' },
    耕地: { name: '耕地', marker: '耕' },
    储水: { name: '储水', marker: '水' },
    缠绕蔓藤: { name: '缠绕蔓藤', marker: '藤' },
  },
  'en-US': {
    树叶: { name: 'Leaf', marker: 'Leaf' },
    耕地: { name: 'Tilled Soil', marker: 'Soil' },
    储水: { name: 'Water Storage', marker: 'Water' },
    缠绕蔓藤: { name: 'Entangling Vine', marker: 'Vine' },
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export function getAssetCategoryLabel(category: AssetCategory, locale: Locale): string {
  return assetCategoryLabelsByLocale[locale][category];
}

export function getSkillDisplay(skillType: ConcreteAssetSkillType, locale: Locale) {
  return skillLabelsByLocale[locale][skillType];
}

export function getAssetDisplay(asset: AssetDefinition, locale: Locale) {
  const name = locale === 'en-US' ? asset.englishName : asset.name;

  return {
    name,
    categoryLabel: getAssetCategoryLabel(asset.category, locale),
    tags: locale === 'en-US' ? asset.englishTags : asset.tags,
    thumbnailAlt: locale === 'en-US' ? `${name} thumbnail` : asset.thumbnailAlt,
  };
}

export function getPokemonDisplay(pokemon: PokemonThemeDefinition, locale: Locale): string {
  return locale === 'en-US' ? pokemon.englishName : pokemon.name;
}

export function getBuildingLevelDisplayName(name: string, levelNumber: number, locale: Locale): string {
  const displayNumber = getBuildingLevelDisplayNumber(levelNumber);

  if (name === `${levelNumber}层` || name === `${displayNumber}层`) {
    return locale === 'en-US' ? `Layer ${displayNumber}` : `${displayNumber}层`;
  }

  if (locale === 'en-US' && (name === `Layer ${levelNumber}` || name === `Layer ${displayNumber}`)) {
    return `Layer ${displayNumber}`;
  }

  return name;
}

export function getDefaultBuildingLevelName(levelNumber: number, locale: Locale): string {
  const displayNumber = getBuildingLevelDisplayNumber(levelNumber);

  return locale === 'en-US' ? `Layer ${displayNumber}` : `${displayNumber}层`;
}
