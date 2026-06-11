import {
  remoteSceneApiBaseUrl,
  remoteSceneDevProxyPathPrefix,
  type RemoteSceneEndpointMode,
} from './remote-scene-import-config';

export type CloudSceneVisibility = 'public' | 'private';

export interface CloudSceneRecord {
  id: string;
  owner_user_id: string;
  name: string;
  pse: string;
  pokemon: string;
  visibility: CloudSceneVisibility;
  created_at: string;
  updated_at: string;
}

export interface CreateCloudScenePayload {
  name: string;
  pse: string;
  pokemon: string;
  visibility: CloudSceneVisibility;
}

export type UpdateCloudScenePayload = Partial<CreateCloudScenePayload>;

export type CloudSceneAuth =
  | { kind: 'bearer'; accessToken: string }
  | { kind: 'domain-session' };

interface SaveCloudSceneOptionsBase {
  auth: CloudSceneAuth;
  endpointMode?: RemoteSceneEndpointMode;
  fetchImpl?: typeof fetch;
}

export type SaveCloudSceneOptions = SaveCloudSceneOptionsBase & (
  | {
      sceneId?: undefined;
      payload: CreateCloudScenePayload;
    }
  | {
      sceneId: string;
      payload: UpdateCloudScenePayload;
    }
);

export type SaveCloudSceneResult =
  | {
      ok: true;
      record: CloudSceneRecord;
      operation: 'create' | 'update';
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function saveCloudScene(options: SaveCloudSceneOptions): Promise<SaveCloudSceneResult> {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const operation = options.sceneId ? 'update' : 'create';
  const endpoint = resolveCloudSceneSaveEndpoint(options.sceneId, options.endpointMode);

  let response: Response;
  try {
    response = await fetchImpl(endpoint, {
      method: operation === 'update' ? 'PUT' : 'POST',
      ...createAuthRequestInit(options.auth, {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(options.payload),
    });
  } catch {
    return {
      ok: false,
      code: 'network_error',
      message: 'Scene API is unavailable.',
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Scene API returned invalid JSON.',
    };
  }

  if (!response.ok) {
    const error = readApiError(body);
    return {
      ok: false,
      code: error.code,
      message: error.message,
    };
  }

  if (!isCloudSceneRecordEnvelope(body)) {
    return {
      ok: false,
      code: 'invalid_response',
      message: 'Scene API returned an invalid scene record.',
    };
  }

  return {
    ok: true,
    operation,
    record: body.data,
  };
}

function createAuthRequestInit(auth: CloudSceneAuth, headers: Record<string, string>): RequestInit {
  if (auth.kind === 'bearer') {
    return {
      headers: {
        ...headers,
        Authorization: `Bearer ${auth.accessToken}`,
      },
    };
  }

  return {
    credentials: 'include',
    headers,
  };
}

export function resolveCloudSceneSaveEndpoint(
  sceneId?: string,
  mode: RemoteSceneEndpointMode = getDefaultRemoteSceneEndpointMode(),
): string {
  if (!sceneId) {
    return mode === 'development' ? remoteSceneDevProxyPathPrefix : remoteSceneApiBaseUrl;
  }

  const encodedSceneId = encodeURIComponent(sceneId);
  return mode === 'development'
    ? `${remoteSceneDevProxyPathPrefix}/${encodedSceneId}`
    : `${remoteSceneApiBaseUrl}/${encodedSceneId}`;
}

function getDefaultRemoteSceneEndpointMode(): RemoteSceneEndpointMode {
  return import.meta.env.DEV ? 'development' : 'production';
}

function isCloudSceneRecordEnvelope(value: unknown): value is { data: CloudSceneRecord } {
  return typeof value === 'object' && value !== null && isCloudSceneRecord((value as { data?: unknown }).data);
}

function isCloudSceneRecord(value: unknown): value is CloudSceneRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Partial<CloudSceneRecord>;
  return (
    typeof record.id === 'string' &&
    typeof record.owner_user_id === 'string' &&
    typeof record.name === 'string' &&
    typeof record.pse === 'string' &&
    typeof record.pokemon === 'string' &&
    (record.visibility === 'public' || record.visibility === 'private') &&
    typeof record.created_at === 'string' &&
    typeof record.updated_at === 'string'
  );
}

function readApiError(value: unknown): { code: string; message: string } {
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { error?: { code?: unknown; message?: unknown } }).error?.code === 'string' &&
    typeof (value as { error?: { code?: unknown; message?: unknown } }).error?.message === 'string'
  ) {
    return {
      code: (value as { error: { code: string; message: string } }).error.code,
      message: (value as { error: { code: string; message: string } }).error.message,
    };
  }

  return {
    code: 'api_error',
    message: 'Scene API request failed.',
  };
}
