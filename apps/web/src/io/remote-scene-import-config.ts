export const remoteSceneApiBaseUrl = 'https://scene-api.pokokit.com/api/scenes';
export const remoteSceneApiOrigin = 'https://scene-editor.pokokit.com';
export const remoteSceneDevProxyPathPrefix = '/api/remote-scenes';
export const remoteSceneDevProxyContextPattern = '^/api/remote-scenes/';

export type RemoteSceneEndpointMode = 'development' | 'production';

export function getRemoteSceneDevProxyRequestHeaders(): Record<string, string> {
  return {
    Origin: remoteSceneApiOrigin,
  };
}

export function rewriteRemoteSceneDevProxyPath(path: string): string {
  return path.replace(remoteSceneDevProxyPathPrefix, '');
}
