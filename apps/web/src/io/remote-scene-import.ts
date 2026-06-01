import {
  remoteSceneApiBaseUrl,
  remoteSceneDevProxyPathPrefix,
  type RemoteSceneEndpointMode,
} from './remote-scene-import-config';

export interface NoRemoteSceneIdResult {
  status: 'no-scene-id';
}

export interface InvalidRemoteSceneQueryResult {
  status: 'invalid-query';
  reason: 'empty-scene-id' | 'duplicate-scene-id' | 'invalid-scene-id';
  sceneId?: string;
}

export interface RemoteSceneSuccessResult {
  status: 'success';
  endpoint: string;
  sceneId: string;
  sceneString: string;
}

export interface RemoteSceneNotFoundResult {
  status: 'not-found';
  endpoint: string;
  sceneId: string;
}

export interface RemoteSceneNetworkErrorResult {
  status: 'network-error';
  endpoint: string;
  httpStatus?: number;
  reason: string;
  sceneId: string;
}

export interface RemoteSceneInvalidResponseResult {
  status: 'invalid-response';
  endpoint: string;
  httpStatus?: number;
  reason:
    | 'content-type'
    | 'json-parse'
    | 'response-shape'
    | 'scene-id-mismatch'
    | 'empty-scene-string';
  sceneId: string;
}

export type RemoteSceneQueryResult = NoRemoteSceneIdResult | InvalidRemoteSceneQueryResult | {
  status: 'valid';
  sceneId: string;
};

export type RemoteSceneFetchResult =
  | NoRemoteSceneIdResult
  | InvalidRemoteSceneQueryResult
  | RemoteSceneSuccessResult
  | RemoteSceneNotFoundResult
  | RemoteSceneNetworkErrorResult
  | RemoteSceneInvalidResponseResult;

interface FetchRemoteSceneStringOptions {
  endpointMode?: RemoteSceneEndpointMode;
  fetchImpl?: typeof fetch;
}

interface RemoteSceneApiResponse {
  id: string;
  meta: Record<string, unknown>;
  pse: string;
}

const pathSegmentSafeSceneIdPattern = /^[A-Za-z0-9_-]+$/;

export function getSceneIdFromSearch(search: string): RemoteSceneQueryResult {
  const params = new URLSearchParams(search);
  const sceneIds = params.getAll('scene_id');

  if (sceneIds.length === 0) {
    return { status: 'no-scene-id' };
  }

  if (sceneIds.length > 1) {
    return { status: 'invalid-query', reason: 'duplicate-scene-id' };
  }

  const sceneId = sceneIds[0] ?? '';

  if (sceneId.length === 0) {
    return { status: 'invalid-query', reason: 'empty-scene-id' };
  }

  if (!pathSegmentSafeSceneIdPattern.test(sceneId)) {
    return { status: 'invalid-query', reason: 'invalid-scene-id', sceneId };
  }

  return { status: 'valid', sceneId };
}

export function resolveRemoteSceneEndpoint(
  sceneId: string,
  mode: RemoteSceneEndpointMode = getDefaultRemoteSceneEndpointMode(),
): string {
  const encodedSceneId = encodeURIComponent(sceneId);

  return mode === 'development'
    ? `${remoteSceneDevProxyPathPrefix}/${encodedSceneId}`
    : `${remoteSceneApiBaseUrl}/${encodedSceneId}`;
}

export async function fetchRemoteSceneString(
  search: string,
  options: FetchRemoteSceneStringOptions = {},
): Promise<RemoteSceneFetchResult> {
  const queryResult = getSceneIdFromSearch(search);

  if (queryResult.status !== 'valid') {
    return queryResult;
  }

  const { sceneId } = queryResult;
  const endpoint = resolveRemoteSceneEndpoint(sceneId, options.endpointMode);
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  let response: Response;

  try {
    response = await fetchImpl(endpoint, {
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (error) {
    return {
      status: 'network-error',
      endpoint,
      reason: error instanceof Error ? error.message : 'Remote scene request failed.',
      sceneId,
    };
  }

  if (response.status === 404) {
    return { status: 'not-found', endpoint, sceneId };
  }

  if (!response.ok) {
    return {
      status: 'network-error',
      endpoint,
      httpStatus: response.status,
      reason: `Remote scene request failed with HTTP ${response.status}.`,
      sceneId,
    };
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (getMediaType(contentType) !== 'application/json') {
    return { status: 'invalid-response', endpoint, httpStatus: response.status, reason: 'content-type', sceneId };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { status: 'invalid-response', endpoint, httpStatus: response.status, reason: 'json-parse', sceneId };
  }

  if (!isRemoteSceneApiResponse(payload)) {
    return { status: 'invalid-response', endpoint, httpStatus: response.status, reason: 'response-shape', sceneId };
  }

  if (payload.id !== sceneId) {
    return {
      status: 'invalid-response',
      endpoint,
      httpStatus: response.status,
      reason: 'scene-id-mismatch',
      sceneId,
    };
  }

  if (payload.pse.trim().length === 0) {
    return {
      status: 'invalid-response',
      endpoint,
      httpStatus: response.status,
      reason: 'empty-scene-string',
      sceneId,
    };
  }

  return {
    status: 'success',
    endpoint,
    sceneId,
    sceneString: payload.pse,
  };
}

function getDefaultRemoteSceneEndpointMode(): RemoteSceneEndpointMode {
  return import.meta.env.DEV ? 'development' : 'production';
}

function isRemoteSceneApiResponse(payload: unknown): payload is RemoteSceneApiResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Partial<RemoteSceneApiResponse>).id === 'string' &&
    typeof (payload as Partial<RemoteSceneApiResponse>).meta === 'object' &&
    (payload as Partial<RemoteSceneApiResponse>).meta !== null &&
    !Array.isArray((payload as Partial<RemoteSceneApiResponse>).meta) &&
    typeof (payload as Partial<RemoteSceneApiResponse>).pse === 'string'
  );
}

function getMediaType(contentType: string): string {
  return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}
