import type { ApiError } from './api-result';

export const maxRequestBodyBytes = 128 * 1024;

export class ApiRequestError extends Error {
  readonly status: number;
  readonly apiError: ApiError;
  readonly apiErrors: ApiError[];

  constructor(status: number, code: string, message: string, apiErrors?: ApiError[]) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.apiError = apiErrors?.[0] ?? { code, message };
    this.apiErrors = apiErrors?.length ? apiErrors : [this.apiError];
  }
}

export async function readJsonRequest(request: Request): Promise<unknown> {
  assertJsonContentType(request);
  assertContentLength(request);

  const text = await request.text();
  const actualBytes = new TextEncoder().encode(text).byteLength;
  if (actualBytes > maxRequestBodyBytes) {
    throw new ApiRequestError(413, 'request_body_too_large', 'Request body exceeded the service limit.');
  }

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiRequestError(400, 'invalid_json', 'Request body must be valid JSON.');
  }
}

export function getRequestId(request: Request): string {
  return request.headers.get('cf-ray') ?? crypto.randomUUID();
}

function assertJsonContentType(request: Request): void {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new ApiRequestError(415, 'unsupported_media_type', 'Request content type must be application/json.');
  }
}

function assertContentLength(request: Request): void {
  const rawContentLength = request.headers.get('content-length');
  if (!rawContentLength) {
    return;
  }

  const contentLength = Number(rawContentLength);
  if (Number.isFinite(contentLength) && contentLength > maxRequestBodyBytes) {
    throw new ApiRequestError(413, 'request_body_too_large', 'Request body exceeded the service limit.');
  }
}
