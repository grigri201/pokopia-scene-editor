import { catalogVersion, schemaVersion, serviceVersion } from './version';

export interface ApiError {
  code: string;
  message: string;
  fieldPath?: string;
}

export interface ApiMeta {
  serviceVersion: string;
  schemaVersion: number;
  catalogVersion: string;
  requestId: string;
}

export interface ApiResult<T> {
  ok: boolean;
  data: T | null;
  errors: ApiError[];
  warnings: string[];
  meta: ApiMeta;
}

export const maxResponseBodyBytes = 512 * 1024;

export function createMeta(requestId: string): ApiMeta {
  return {
    serviceVersion,
    schemaVersion,
    catalogVersion,
    requestId,
  };
}

export function jsonOk<T>(data: T, requestId: string, init: ResponseInit = {}): Response {
  return jsonResult({ ok: true, data, errors: [], warnings: [], meta: createMeta(requestId) }, init);
}

export function jsonError(errors: ApiError[], requestId: string, init: ResponseInit = {}): Response {
  return jsonResult({ ok: false, data: null, errors, warnings: [], meta: createMeta(requestId) }, init);
}

function jsonResult<T>(result: ApiResult<T>, init: ResponseInit): Response {
  const body = JSON.stringify(result);
  if (new TextEncoder().encode(body).byteLength > maxResponseBodyBytes) {
    const fallback = JSON.stringify({
      ok: false,
      data: null,
      errors: [{ code: 'response_too_large', message: 'Response body exceeded the service output limit.' }],
      warnings: [],
      meta: result.meta,
    } satisfies ApiResult<null>);

    return new Response(fallback, {
      status: 500,
      headers: jsonHeaders(init.headers),
    });
  }

  return new Response(body, {
    ...init,
    headers: jsonHeaders(init.headers),
  });
}

function jsonHeaders(headers?: HeadersInit): Headers {
  const result = new Headers(headers);
  result.set('content-type', 'application/json; charset=utf-8');
  result.set('cache-control', 'no-store');
  result.set('x-content-type-options', 'nosniff');

  return result;
}
