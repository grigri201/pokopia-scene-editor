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
  cloudScene: RemoteCloudSceneContext | null;
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

export type RemoteSceneAuth =
  | { kind: 'bearer'; accessToken: string }
  | { kind: 'domain-session' };

interface FetchRemoteSceneStringOptions {
  auth?: RemoteSceneAuth | null;
  endpointMode?: RemoteSceneEndpointMode;
  fetchImpl?: typeof fetch;
}

export interface RemoteCloudSceneContext {
  sceneId: string;
  ownerUserId: string;
  visibility: 'public' | 'private';
}

interface LegacyRemoteSceneApiResponse {
  id: string;
  meta: Record<string, unknown>;
  pse: string;
}

interface SceneApiV1Envelope {
  data: SceneApiV1Record;
}

interface SceneApiV1Record {
  id: string;
  owner_user_id: string;
  name: string;
  pse: string;
  pokemon: string;
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
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
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.auth?.kind === 'bearer') {
    headers.Authorization = `Bearer ${options.auth.accessToken}`;
  }
  let response: Response;

  try {
    response = await fetchImpl(endpoint, {
      ...(options.auth?.kind === 'domain-session' ? { credentials: 'include' as const } : {}),
      headers,
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

  const parsedPayload = parseRemoteSceneApiResponse(payload);
  if (!parsedPayload) {
    return { status: 'invalid-response', endpoint, httpStatus: response.status, reason: 'response-shape', sceneId };
  }

  if (parsedPayload.id !== sceneId) {
    return {
      status: 'invalid-response',
      endpoint,
      httpStatus: response.status,
      reason: 'scene-id-mismatch',
      sceneId,
    };
  }

  if (parsedPayload.pse.trim().length === 0) {
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
    sceneString: parsedPayload.pse,
    cloudScene: parsedPayload.cloudScene,
  };
}

function getDefaultRemoteSceneEndpointMode(): RemoteSceneEndpointMode {
  return import.meta.env.DEV ? 'development' : 'production';
}

function parseRemoteSceneApiResponse(payload: unknown): { id: string; pse: string; cloudScene: RemoteCloudSceneContext | null } | null {
  if (isSceneApiV1Envelope(payload)) {
    return {
      id: payload.data.id,
      pse: payload.data.pse,
      cloudScene: {
        sceneId: payload.data.id,
        ownerUserId: payload.data.owner_user_id,
        visibility: payload.data.visibility,
      },
    };
  }

  if (isLegacyRemoteSceneApiResponse(payload)) {
    return {
      id: payload.id,
      pse: payload.pse,
      cloudScene: null,
    };
  }

  return null;
}

function isSceneApiV1Envelope(payload: unknown): payload is SceneApiV1Envelope {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }
  const data = (payload as Partial<SceneApiV1Envelope>).data;
  return isSceneApiV1Record(data);
}

function isSceneApiV1Record(payload: unknown): payload is SceneApiV1Record {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Partial<SceneApiV1Record>).id === 'string' &&
    typeof (payload as Partial<SceneApiV1Record>).owner_user_id === 'string' &&
    typeof (payload as Partial<SceneApiV1Record>).name === 'string' &&
    typeof (payload as Partial<SceneApiV1Record>).pse === 'string' &&
    typeof (payload as Partial<SceneApiV1Record>).pokemon === 'string' &&
    ((payload as Partial<SceneApiV1Record>).visibility === 'public' ||
      (payload as Partial<SceneApiV1Record>).visibility === 'private') &&
    typeof (payload as Partial<SceneApiV1Record>).created_at === 'string' &&
    typeof (payload as Partial<SceneApiV1Record>).updated_at === 'string'
  );
}

function isLegacyRemoteSceneApiResponse(payload: unknown): payload is LegacyRemoteSceneApiResponse {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    typeof (payload as Partial<LegacyRemoteSceneApiResponse>).id === 'string' &&
    typeof (payload as Partial<LegacyRemoteSceneApiResponse>).meta === 'object' &&
    (payload as Partial<LegacyRemoteSceneApiResponse>).meta !== null &&
    !Array.isArray((payload as Partial<LegacyRemoteSceneApiResponse>).meta) &&
    typeof (payload as Partial<LegacyRemoteSceneApiResponse>).pse === 'string'
  );
}

function getMediaType(contentType: string): string {
  return contentType.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}
