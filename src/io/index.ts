export interface SceneIoBoundary {
  readonly status: 'reserved-for-save-and-recovery';
}

export const sceneIoBoundary: SceneIoBoundary = {
  status: 'reserved-for-save-and-recovery',
};

export * from './image-export';
export * from './scene-schema';
export * from './scene-recovery';
export * from './scene-roundtrip';
export * from './scene-serializer';
export * from './scene-string-codec';
export * from './scene-storage';
export * from './ui-preferences';
