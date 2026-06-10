type RemoteSceneImportEnv = {
  VITE_SCENE_API_URL?: string;
};

const configuredSceneApiBaseUrl = (import.meta as ImportMeta & { env?: RemoteSceneImportEnv }).env
  ?.VITE_SCENE_API_URL
  ?.trim();

export const sceneApiBaseUrl = resolveSceneApiBaseUrl(configuredSceneApiBaseUrl);
export const remoteSceneApiBaseUrl = resolveRemoteSceneApiBaseUrl(configuredSceneApiBaseUrl);
export const remoteSceneApiOrigin = 'https://scene-editor.pokokit.com';
export const remoteSceneDevProxyPathPrefix = '/api/v1/scenes';
export const remoteSceneDevProxyContextPattern = '^/api/v1/scenes(?:[/?#]|$)';

export type RemoteSceneEndpointMode = 'development' | 'production';

export function resolveSceneApiBaseUrl(value: string | undefined): string {
  const raw = value?.trim();
  if (!raw || isPlaceholderValue(raw)) {
    return 'https://scene-api.pokokit.com';
  }
  return raw.replace(/\/$/, '');
}

export function resolveRemoteSceneApiBaseUrl(value: string | undefined): string {
  return `${resolveSceneApiBaseUrl(value)}/api/v1/scenes`;
}

export function getRemoteSceneDevProxyRequestHeaders(): Record<string, string> {
  return {
    Origin: remoteSceneApiOrigin,
  };
}

export function rewriteRemoteSceneDevProxyPath(path: string): string {
  return path.replace(remoteSceneDevProxyPathPrefix, '');
}

function isPlaceholderValue(value: string): boolean {
  return /\breplace\b/i.test(value) || /\bplaceholder\b/i.test(value) || /\bexample\b/i.test(value);
}
