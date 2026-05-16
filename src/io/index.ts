export interface SceneIoBoundary {
  readonly status: 'reserved-for-save-and-recovery';
}

export const sceneIoBoundary: SceneIoBoundary = {
  status: 'reserved-for-save-and-recovery',
};

export * from './scene-schema';
export * from './scene-recovery';
export * from './scene-roundtrip';
export * from './scene-serializer';
export * from './scene-storage';
