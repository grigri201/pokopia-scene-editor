import { jsonError, jsonOk, type ApiError } from './api-result';
import { handleMcpRequest } from './mcp';
import { getRequestId, readJsonRequest, ApiRequestError } from './request';
import { searchAssetsFromBody, searchAssetsFromUrl } from './routes/assets';
import {
  decodeScene,
  encodeScene,
  generateScene,
  recoverScene,
  summarizeSceneExport,
  validateScene,
} from './routes/scene';

export type WorkerEnv = Env;

const apiTimeoutMs = 5_000;
const publicApiBasePath = '/api/v1';

export default {
  async fetch(request: Request, env: WorkerEnv, context: ExecutionContext): Promise<Response> {
    return handleRequest(request, env, context);
  },
};

export async function handleRequest(request: Request, env: WorkerEnv, _context?: ExecutionContext): Promise<Response> {
  const routedRequest = normalizePublicApiRequest(request);
  const url = new URL(routedRequest.url);

  if (url.pathname === '/mcp') {
    return handleMcpRequest(routedRequest, env, _context ?? createNoopExecutionContext());
  }

  if (!url.pathname.startsWith('/api/')) {
    return env.ASSETS.fetch(routedRequest);
  }

  return handleApiRequest(routedRequest, url);
}

function normalizePublicApiRequest(request: Request): Request {
  const url = new URL(request.url);
  const normalizedUrl = normalizePublicApiUrl(url);

  if (normalizedUrl.href === url.href) {
    return request;
  }

  return new Request(normalizedUrl, request);
}

function normalizePublicApiUrl(url: URL): URL {
  if (url.pathname === publicApiBasePath) {
    const normalizedUrl = new URL(url);
    normalizedUrl.pathname = '/api/health';
    return normalizedUrl;
  }

  if (!url.pathname.startsWith(`${publicApiBasePath}/`)) {
    return url;
  }

  const normalizedUrl = new URL(url);
  const publicApiPath = normalizedUrl.pathname.slice(publicApiBasePath.length);
  normalizedUrl.pathname = publicApiPath === '/mcp'
    ? '/mcp'
    : `/api${publicApiPath}`;

  return normalizedUrl;
}

async function handleApiRequest(request: Request, url: URL): Promise<Response> {
  const requestId = getRequestId(request);
  const startedAt = Date.now();
  let status = 200;
  let errorCategory = 'none';

  try {
    const response = await dispatchApiRequest(request, url, requestId);
    status = response.status;
    return response;
  } catch (error) {
    const normalizedError = normalizeError(error);
    status = normalizedError.status;
    errorCategory = normalizedError.errors[0]?.code ?? 'internal_error';
    return jsonError(normalizedError.errors, requestId, { status });
  } finally {
    logApiRequest({
      method: request.method,
      route: url.pathname,
      status,
      durationMs: Date.now() - startedAt,
      errorCategory,
    });
  }
}

async function dispatchApiRequest(request: Request, url: URL, requestId: string): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return jsonOk({ allow: 'GET, POST, OPTIONS' }, requestId);
  }

  if (url.pathname === '/api/health') {
    assertMethod(request, ['GET']);
    return jsonOk({ status: 'ok', timeoutMs: apiTimeoutMs }, requestId);
  }

  if (url.pathname === '/api/assets') {
    assertMethod(request, ['GET', 'POST']);
    const data = request.method === 'GET'
      ? searchAssetsFromUrl(url)
      : searchAssetsFromBody(await readJsonRequest(request));
    return jsonOk(data, requestId);
  }

  switch (url.pathname) {
    case '/api/scene/generate': {
      const body = await readPostJson(request);
      return jsonOk(generateScene(body), requestId);
    }
    case '/api/scene/validate': {
      const body = await readPostJson(request);
      return jsonOk(validateScene(body), requestId);
    }
    case '/api/scene/recover': {
      const body = await readPostJson(request);
      return jsonOk(recoverScene(body), requestId);
    }
    case '/api/scene/export-summary': {
      const body = await readPostJson(request);
      return jsonOk(summarizeSceneExport(body), requestId);
    }
    case '/api/scene/encode': {
      const body = await readPostJson(request);
      return jsonOk(encodeScene(body), requestId);
    }
    case '/api/scene/decode': {
      const body = await readPostJson(request);
      return jsonOk(decodeScene(body), requestId);
    }
    default:
      throw new ApiRequestError(404, 'not_found', 'API route was not found.');
  }
}

async function readPostJson(request: Request): Promise<unknown> {
  assertMethod(request, ['POST']);
  return readJsonRequest(request);
}

function assertMethod(request: Request, methods: readonly string[]): void {
  if (!methods.includes(request.method)) {
    throw new ApiRequestError(405, 'method_not_allowed', `Method ${request.method} is not allowed for this route.`);
  }
}

function normalizeError(error: unknown): { status: number; errors: ApiError[] } {
  if (error instanceof ApiRequestError) {
    return {
      status: error.status,
      errors: error.apiErrors,
    };
  }

  return {
    status: 500,
    errors: [
      {
        code: 'internal_error',
        message: 'The service could not complete the request.',
      },
    ],
  };
}

function logApiRequest(event: {
  method: string;
  route: string;
  status: number;
  durationMs: number;
  errorCategory: string;
}): void {
  console.info('worker_api_request', event);
}

function createNoopExecutionContext(): ExecutionContext {
  return {
    waitUntil() {
      // Test-only fallback when handleRequest is called without a Worker context.
    },
    passThroughOnException() {
      // Test-only fallback when handleRequest is called without a Worker context.
    },
    exports: {},
    props: {},
  } as unknown as ExecutionContext;
}
