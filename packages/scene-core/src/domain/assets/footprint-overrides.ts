export interface AssetFootprint {
  readonly length: number;
  readonly width: number;
  readonly height: number;
}

export const defaultAssetFootprint: AssetFootprint = {
  length: 1,
  width: 1,
  height: 1,
};

const assetFootprintOverridesByAssetId: Readonly<Record<string, AssetFootprint>> = {
  'wooden-bench': { length: 2, width: 1, height: 1 },
  'large-narrow-rug': { length: 1, width: 2, height: 1 },
  'large-boulder': { length: 2, width: 1, height: 2 },
};

export const assetFootprintOverrideAssetIds: readonly string[] = Object.keys(assetFootprintOverridesByAssetId);

assertValidFootprints(assetFootprintOverridesByAssetId);

export function getAssetFootprint(assetId: string): AssetFootprint {
  return cloneAssetFootprint(assetFootprintOverridesByAssetId[assetId] ?? defaultAssetFootprint);
}

function cloneAssetFootprint(footprint: AssetFootprint): AssetFootprint {
  return {
    length: footprint.length,
    width: footprint.width,
    height: footprint.height,
  };
}

function assertValidFootprints(overrides: Readonly<Record<string, AssetFootprint>>): void {
  for (const [assetId, footprint] of Object.entries(overrides)) {
    for (const [fieldName, value] of Object.entries(footprint)) {
      if (!Number.isInteger(value) || value < 1) {
        throw new RangeError(`Invalid footprint ${fieldName} for asset ${assetId}: ${value}`);
      }
    }
  }
}
