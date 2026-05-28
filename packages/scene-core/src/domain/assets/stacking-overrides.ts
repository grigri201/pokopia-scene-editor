import type { AssetCategory } from './catalog';

export const assetStackingSurfaceKinds = [
  'none',
  'food-surface',
  'floor-cover',
  'low-height-surface',
] as const;
export type AssetStackingSurfaceKind = (typeof assetStackingSurfaceKinds)[number];

export interface AssetStackingMetadata {
  readonly surfaceKind: AssetStackingSurfaceKind;
  readonly allowsSameLevelOverlap: boolean;
  readonly allowedTopCategories: readonly AssetCategory[];
}

export const defaultAssetStacking: AssetStackingMetadata = {
  surfaceKind: 'none',
  allowsSameLevelOverlap: false,
  allowedTopCategories: [],
};

const foodOnlyTopCategories: readonly AssetCategory[] = ['food'];
const generalSurfaceTopCategories: readonly AssetCategory[] = [
  'furniture',
  'utilities',
  'outdoor',
  'nature',
  'food',
  'materials',
  'misc',
  'other',
];

const foodSurfaceStacking: AssetStackingMetadata = {
  surfaceKind: 'food-surface',
  allowsSameLevelOverlap: true,
  allowedTopCategories: foodOnlyTopCategories,
};

const floorCoverStacking: AssetStackingMetadata = {
  surfaceKind: 'floor-cover',
  allowsSameLevelOverlap: true,
  allowedTopCategories: generalSurfaceTopCategories,
};

const lowHeightSurfaceStacking: AssetStackingMetadata = {
  surfaceKind: 'low-height-surface',
  allowsSameLevelOverlap: true,
  allowedTopCategories: generalSurfaceTopCategories,
};

const assetStackingOverridesByAssetId: Readonly<Record<string, AssetStackingMetadata>> = {
  'plate': foodSurfaceStacking,
  'wooden-plate': foodSurfaceStacking,
  'party-platter': foodSurfaceStacking,
  'green-shoots': lowHeightSurfaceStacking,
  'yellow-green-shoots': lowHeightSurfaceStacking,
  'verdant-shoots': lowHeightSurfaceStacking,
  'blue-green-shoots': lowHeightSurfaceStacking,
  'sewer-hole-cover': floorCoverStacking,
  'walkway': floorCoverStacking,
  'bridge-planks': floorCoverStacking,
  'grate-flooring': floorCoverStacking,
  'concrete-slab': floorCoverStacking,
  'stone-tiling-interior': floorCoverStacking,
  'stylish-stone-flooring-interior': floorCoverStacking,
  'wooden-flooring-interior': floorCoverStacking,
  'fluffy-flooring-interior': floorCoverStacking,
  'arched-tiling-interior': floorCoverStacking,
  'mosaic-tiling-interior': floorCoverStacking,
  'woven-carpeting-interior': floorCoverStacking,
  'aged-stone-flooring-interior': floorCoverStacking,
  'modern-carpeting-interior': floorCoverStacking,
  'iron-plate-flooring-interior': floorCoverStacking,
  'shop-tiling-interior': floorCoverStacking,
  'stone-flooring-interior': floorCoverStacking,
  'lined-stone-flooring-interior': floorCoverStacking,
  'diagonal-wooden-flooring-interior': floorCoverStacking,
  'stylish-tiling-interior': floorCoverStacking,
  'brick-flooring-interior': floorCoverStacking,
  'square-tiling-interior': floorCoverStacking,
  'iron-tiling-interior': floorCoverStacking,
  'dark-marble-flooring-interior': floorCoverStacking,
  'simple-flooring-interior': floorCoverStacking,
  'hardwood-flooring-interior': floorCoverStacking,
  'fish-scale-tiling-interior': floorCoverStacking,
  'cyber-flooring-interior': floorCoverStacking,
  'neon-flooring-interior': floorCoverStacking,
  'hexagonal-flooring-interior': floorCoverStacking,
  'simple-square-tiling-interior': floorCoverStacking,
  'felt-mat-interior': floorCoverStacking,
  'triangle-design-flooring-interior': floorCoverStacking,
  'crisscross-wooden-flooring-interior': floorCoverStacking,
  'light-marble-flooring-interior': floorCoverStacking,
  'grass-flooring-interior': floorCoverStacking,
  'small-narrow-rug': floorCoverStacking,
  'small-round-rug': floorCoverStacking,
  'small-square-rug': floorCoverStacking,
  'ditto-rug': floorCoverStacking,
  'slowpoke-rug': floorCoverStacking,
  'charizard-rug': floorCoverStacking,
  'oblong-rug': floorCoverStacking,
  'ratan-rug': floorCoverStacking,
  'large-round-rug': floorCoverStacking,
  'lace-rug': floorCoverStacking,
  'poke-ball-mat': floorCoverStacking,
  'large-narrow-rug': floorCoverStacking,
  'large-square-rug': floorCoverStacking,
  'soft-mat': floorCoverStacking,
  'picnic-blanket': floorCoverStacking,
  'frame': lowHeightSurfaceStacking,
};

export const assetStackingOverrideAssetIds: readonly string[] = Object.keys(assetStackingOverridesByAssetId);

assertValidStackingOverrides(assetStackingOverridesByAssetId);

export function getAssetStacking(assetId: string): AssetStackingMetadata {
  return cloneAssetStacking(assetStackingOverridesByAssetId[assetId] ?? defaultAssetStacking);
}

function cloneAssetStacking(stacking: AssetStackingMetadata): AssetStackingMetadata {
  return {
    surfaceKind: stacking.surfaceKind,
    allowsSameLevelOverlap: stacking.allowsSameLevelOverlap,
    allowedTopCategories: [...stacking.allowedTopCategories],
  };
}

function assertValidStackingOverrides(overrides: Readonly<Record<string, AssetStackingMetadata>>): void {
  for (const [assetId, stacking] of Object.entries(overrides)) {
    if (stacking.surfaceKind === 'none') {
      throw new RangeError(`Stacking override for ${assetId} must not use surfaceKind none.`);
    }

    if (!stacking.allowsSameLevelOverlap) {
      throw new RangeError(`Stacking override for ${assetId} must allow same-level overlap.`);
    }

    if (stacking.allowedTopCategories.length === 0) {
      throw new RangeError(`Stacking override for ${assetId} must list allowed top categories.`);
    }

    const uniqueCategories = new Set(stacking.allowedTopCategories);
    if (uniqueCategories.size !== stacking.allowedTopCategories.length) {
      throw new RangeError(`Stacking override for ${assetId} has duplicate allowed top categories.`);
    }
  }
}
