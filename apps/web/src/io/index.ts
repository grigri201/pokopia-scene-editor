export interface SceneIoBoundary {
  readonly status: 'reserved-for-save-and-recovery';
}

export const sceneIoBoundary: SceneIoBoundary = {
  status: 'reserved-for-save-and-recovery',
};

export * from './image-export';
export * from './asset-staging-preferences';
export * from './lower-layer-ghost-preferences';
export * from './remote-scene-import';
export * from './scene-summary-preferences';
export * from '@pokopia-scene-editor/scene-core';
export * from './scene-storage';
export * from './ui-preferences';
