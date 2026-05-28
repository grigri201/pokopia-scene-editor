import type { AssetDefinition } from '@pokopia-scene-editor/scene-core';

export type StackingFootprint = AssetDefinition['footprint'];
export type StackingSplitAxis = 'block' | 'inline';

export interface StackingSplitDisplay {
  showBaseImage: boolean;
  splitAxis: StackingSplitAxis;
  baseVisibility: 'visible' | 'hidden';
}

export function getStackingSplitDisplay(input: {
  topFootprint: StackingFootprint | null | undefined;
  baseFootprint: StackingFootprint | null | undefined;
}): StackingSplitDisplay {
  const topFootprint = input.topFootprint ?? null;
  const baseFootprint = input.baseFootprint ?? null;
  const showBaseImage = !topFootprint || !baseFootprint || getFootprintVolume(topFootprint) >= getFootprintVolume(baseFootprint);

  return {
    showBaseImage,
    splitAxis: showBaseImage ? getShortSideSplitAxis(baseFootprint) : 'block',
    baseVisibility: showBaseImage ? 'visible' : 'hidden',
  };
}

export function formatStackingFootprint(footprint: StackingFootprint | null | undefined): string {
  return footprint ? `${footprint.length}x${footprint.width}x${footprint.height}` : '';
}

export function getStackingShortSideSplitAxis(footprint: StackingFootprint | null | undefined): StackingSplitAxis {
  return getShortSideSplitAxis(footprint ?? null);
}

function getFootprintVolume(footprint: StackingFootprint): number {
  return footprint.length * footprint.width * footprint.height;
}

function getShortSideSplitAxis(footprint: StackingFootprint | null): StackingSplitAxis {
  if (!footprint) {
    return 'block';
  }

  return footprint.length < footprint.width ? 'inline' : 'block';
}
