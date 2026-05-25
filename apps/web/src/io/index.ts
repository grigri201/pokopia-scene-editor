export interface SceneIoBoundary {
  readonly status: 'reserved-for-save-and-recovery';
}

export const sceneIoBoundary: SceneIoBoundary = {
  status: 'reserved-for-save-and-recovery',
};

export * from './image-export';
export * from '@pokopia-scene-editor/scene-core';
export * from './scene-storage';
export * from './ui-preferences';
