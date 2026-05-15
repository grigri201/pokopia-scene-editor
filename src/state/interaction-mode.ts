export type InteractionMode = 'edit' | 'readOnly';

export function getInteractionMode(viewportWidth: number): InteractionMode {
  return viewportWidth < 768 ? 'readOnly' : 'edit';
}
