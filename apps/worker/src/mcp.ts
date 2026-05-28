import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, GetPromptResult, ReadResourceResult } from '@modelcontextprotocol/sdk/types.js';
import {
  assetCatalog,
  assetCategories,
  buildImageExportSummary,
  createDefaultSceneDocument,
  defaultAssetFilters,
  defaultSelectedPokemonKey,
  filterAssetCatalog,
  isKnownPokemonKey,
  pokemonThemeCatalog,
  recoverSceneDocument,
  sceneDocumentV1Schema,
  validateSceneDocument,
  type AssetFilterState,
  type PokemonKey,
  type SceneDocumentValidationError,
} from '@pokopia-scene-editor/scene-core';
import { z } from 'zod';
import { catalogVersion, schemaVersion, serviceVersion } from './version';
import type { WorkerEnv } from './index';

const mcpRoute = '/mcp';
const assetCategoryFilterValues = ['all', ...assetCategories] as const;
const isoDateTimeInputSchema = z.iso.datetime({ precision: 3 });

interface McpErrorDetail {
  code: string;
  message: string;
  fieldPath?: string;
  expected?: string;
  recoveryAction?: string;
  conflictType?: string;
  instanceId?: string;
  assetId?: string;
  buildingLevelId?: string;
  coordinates?: { x: number; y: number }[];
  blockingInstanceId?: string;
  blockingAssetId?: string;
  blockingBuildingLevelId?: string;
  surfaceKind?: string;
}

interface McpToolStructuredResult<T extends Record<string, unknown>> {
  ok: boolean;
  data: T | null;
  errors: McpErrorDetail[];
  warnings: string[];
  fixSuggestions: string[];
  meta: {
    serviceVersion: string;
    schemaVersion: number;
    catalogVersion: string;
  };
}

type ToolHandler = () => CallToolResult | Promise<CallToolResult>;

type CreateMcpHandler = typeof import('agents/mcp')['createMcpHandler'];

export async function handleMcpRequest(request: Request, env: WorkerEnv, context: ExecutionContext): Promise<Response> {
  const server = createPokopiaMcpServer();
  const createMcpHandler = await getCreateMcpHandler();
  const handler = createMcpHandler(server, {
    route: mcpRoute,
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });
  const startedAt = Date.now();

  return handler(request, env, context).then((response) => {
    logMcpRequest({
      method: request.method,
      route: new URL(request.url).pathname,
      status: response.status,
      durationMs: Date.now() - startedAt,
      errorCategory: response.ok ? 'none' : 'mcp_transport_error',
    });
    return response;
  }).catch((error: unknown) => {
    logMcpRequest({
      method: request.method,
      route: new URL(request.url).pathname,
      status: 500,
      durationMs: Date.now() - startedAt,
      errorCategory: 'mcp_transport_error',
    });
    throw error;
  });
}

async function getCreateMcpHandler(): Promise<CreateMcpHandler> {
  const module = await import('agents/mcp');
  return module.createMcpHandler;
}

export function createPokopiaMcpServer(): McpServer {
  const server = new McpServer({
    name: 'pokopia-scene-editor',
    version: serviceVersion,
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}

function registerTools(server: McpServer): void {
  server.registerTool(
    'generate_scene_document',
    {
      title: 'Generate SceneDocument',
      description: 'Generate a deterministic SceneDocument v1 from optional Pokemon, name, and timestamp inputs.',
      inputSchema: {
        sceneId: z.string().min(1).optional(),
        sceneName: z.string().min(1).optional(),
        selectedPokemonKey: z.string().min(1).optional(),
        now: z.string().min(1).optional(),
        includeOpenDesignDemo: z.boolean().optional(),
      },
    },
    (input) => runTool('generate_scene_document', () => {
      const inputError = validateGenerateSceneInput(input);
      if (inputError) {
        return inputError;
      }

      const scene = createDefaultSceneDocument({
        sceneId: input.sceneId,
        sceneName: input.sceneName,
        selectedPokemonKey: input.selectedPokemonKey,
        now: input.now,
        includeOpenDesignDemo: input.includeOpenDesignDemo ?? false,
      });

      return toolOk('Generated SceneDocument v1.', { scene });
    }),
  );

  server.registerTool(
    'validate_scene_document',
    {
      title: 'Validate SceneDocument',
      description: 'Validate a SceneDocument v1 payload and return structured field errors plus recovery suggestions.',
      inputSchema: {
        scene: z.unknown(),
      },
    },
    (input) => runTool('validate_scene_document', () => {
      const errors = validateSceneDocument(input.scene);
      const valid = errors.length === 0;

      return toolResult(
        valid ? 'SceneDocument is valid.' : 'SceneDocument validation failed.',
        {
          valid,
          errors: errors.map(toMcpValidationError),
        },
        {
          errors: errors.map(toMcpValidationError),
          warnings: valid ? [] : ['SceneDocument failed validation and should be repaired before use.'],
          fixSuggestions: errors.map((error) => error.recoveryAction),
          isError: !valid,
        },
      );
    }),
  );

  server.registerTool(
    'recover_scene_document',
    {
      title: 'Recover SceneDocument',
      description: 'Recover a SceneDocument v1 payload using the same migration and validation rules as the browser app.',
      inputSchema: {
        scene: z.unknown(),
      },
    },
    (input) => runTool('recover_scene_document', () => {
      const result = recoverSceneDocument(input.scene);
      if (!result.ok) {
        return validationToolError(result.errors);
      }

      return toolOk('Recovered SceneDocument v1.', {
        scene: result.scene,
        warnings: [],
      });
    }),
  );

  server.registerTool(
    'summarize_scene_export',
    {
      title: 'Summarize Scene Export',
      description: 'Return the JSON export summary for a recoverable SceneDocument without generating a PNG.',
      inputSchema: {
        scene: z.unknown(),
      },
    },
    (input) => runTool('summarize_scene_export', () => {
      const result = recoverSceneDocument(input.scene);
      if (!result.ok) {
        return validationToolError(result.errors);
      }

      return toolOk('Prepared scene export summary.', {
        summary: buildImageExportSummary(result.scene),
        warnings: [],
      });
    }),
  );

  server.registerTool(
    'search_pokopia_assets',
    {
      title: 'Search Pokopia Assets',
      description: 'Search the Pokopia placeable asset catalog with semantic filters and pagination.',
      inputSchema: {
        query: z.string().optional(),
        category: z.enum(assetCategoryFilterValues).optional(),
        pokemonKey: z.string().optional(),
        favoriteOnly: z.boolean().optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(50).optional(),
      },
    },
    (input) => runTool('search_pokopia_assets', () => {
      const filters: AssetFilterState = {
        query: input.query ?? defaultAssetFilters.query,
        category: input.category ?? defaultAssetFilters.category,
        favoriteOnly: input.favoriteOnly ?? defaultAssetFilters.favoriteOnly,
      };
      const pokemonKey = normalizePokemonKey(input.pokemonKey);
      const result = filterAssetCatalog(assetCatalog, filters, pokemonKey, input.page ?? 1, input.pageSize ?? 10);

      return toolOk('Found matching Pokopia assets.', {
        filters,
        pokemonKey,
        assets: result.renderedAssets,
        filteredCount: result.filteredCount,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        pageCount: result.pageCount,
        hasPreviousPage: result.hasPreviousPage,
        hasNextPage: result.hasNextPage,
      });
    }),
  );
}

function registerResources(server: McpServer): void {
  registerJsonResource(
    server,
    'scene-schema-v1',
    'pokopia://scene/schema/v1',
    'SceneDocument v1 Schema',
    'JSON Schema for the current SceneDocument v1 contract.',
    () => z.toJSONSchema(sceneDocumentV1Schema),
  );

  registerJsonResource(
    server,
    'asset-catalog',
    'pokopia://assets/catalog',
    'Pokopia Asset Catalog',
    'Current placeable asset catalog used by the editor and service tools.',
    () => ({
      catalogVersion,
      categories: assetCategories,
      assets: assetCatalog,
    }),
  );

  registerJsonResource(
    server,
    'pokemon-catalog',
    'pokopia://pokemon/catalog',
    'Pokemon Catalog',
    'Current Decor Dex Pokemon theme catalog.',
    () => ({
      catalogVersion,
      defaultSelectedPokemonKey,
      pokemon: pokemonThemeCatalog,
    }),
  );

  registerJsonResource(
    server,
    'default-scene-example',
    'pokopia://scene/examples/default',
    'Default Scene Example',
    'Default SceneDocument v1 example generated from scene-core.',
    () => ({
      scene: createDefaultSceneDocument({
        sceneId: 'scene-mcp-default-example',
        sceneName: 'MCP Default Scene',
        now: '2026-05-26T00:00:00.000Z',
      }),
    }),
  );

  registerJsonResource(
    server,
    'service-version',
    'pokopia://service/version',
    'Service Version',
    'Worker/MCP service, schema, and catalog version metadata.',
    () => mcpMeta(),
  );
}

function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'repair_scene_document',
    {
      title: 'Repair SceneDocument',
      description: 'Validate and repair a SceneDocument using MCP tools instead of guessing the schema.',
      argsSchema: {
        sceneReference: z.string().optional(),
      },
    },
    ({ sceneReference }): GetPromptResult => ({
      description: 'Repair a SceneDocument through validation and recovery tools.',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Use the MCP tools to repair a Pokopia SceneDocument.',
              `Scene reference: ${sceneReference ?? 'use the scene payload provided by the user'}.`,
              'First call validate_scene_document. If it fails, use fieldPath and recoveryAction values to make the smallest safe repair.',
              'Then call recover_scene_document and report remaining warnings or repair actions. Do not invent schema fields.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'prepare_scene_export_summary',
    {
      title: 'Prepare Scene Export Summary',
      description: 'Prepare a scene export summary through the MCP summary tool.',
      argsSchema: {
        sceneReference: z.string().optional(),
      },
    },
    ({ sceneReference }): GetPromptResult => ({
      description: 'Prepare an export summary without generating a server-side image.',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Use summarize_scene_export for the provided Pokopia SceneDocument.',
              `Scene reference: ${sceneReference ?? 'use the current scene payload'}.`,
              'If the tool returns validation errors, repair only the reported fields and retry.',
              'Return the summary JSON and note that PNG/image generation remains browser-only.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'find_assets_by_theme',
    {
      title: 'Find Assets By Theme',
      description: 'Search Pokopia assets by theme using catalog filters instead of guessing asset ids.',
      argsSchema: {
        theme: z.string(),
        pokemonKey: z.string().optional(),
      },
    },
    ({ theme, pokemonKey }): GetPromptResult => ({
      description: 'Find matching placeable assets for a scene theme.',
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              `Search Pokopia placeable assets for this theme: ${theme}.`,
              `Pokemon preference key: ${pokemonKey ?? defaultSelectedPokemonKey}.`,
              'Call search_pokopia_assets with a concise query and useful category/favorite filters.',
              'Return asset ids, names, categories, and why each result fits the theme.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}

async function runTool(tool: string, handler: ToolHandler): Promise<CallToolResult> {
  const startedAt = Date.now();
  let status = 'ok';
  let errorCategory = 'none';

  try {
    const result = await handler();
    if (result.isError) {
      status = 'error';
      errorCategory = getToolErrorCategory(result);
    }
    return result;
  } catch {
    status = 'error';
    errorCategory = 'internal_error';
    return toolError('internal_error', 'The MCP tool could not complete the request.');
  } finally {
    console.info('worker_mcp_tool', {
      tool,
      status,
      durationMs: Date.now() - startedAt,
      errorCategory,
    });
  }
}

function registerJsonResource(
  server: McpServer,
  name: string,
  uri: string,
  title: string,
  description: string,
  getData: () => unknown,
): void {
  server.registerResource(
    name,
    uri,
    { title, description, mimeType: 'application/json' },
    (resourceUri): ReadResourceResult => ({
      contents: [
        {
          uri: resourceUri.href,
          mimeType: 'application/json',
          text: JSON.stringify(getData(), null, 2),
        },
      ],
    }),
  );
}

function validateGenerateSceneInput(input: {
  sceneName?: string;
  selectedPokemonKey?: string;
  now?: string;
}): CallToolResult | null {
  if (input.sceneName !== undefined && input.sceneName.trim().length === 0) {
    return toolError(
      'invalid_scene_name',
      'sceneName must include at least one non-space character.',
      'sceneName',
    );
  }

  if (input.selectedPokemonKey !== undefined && !isKnownPokemonKey(input.selectedPokemonKey)) {
    return toolError(
      'invalid_pokemon_key',
      'selectedPokemonKey must be a known Decor Dex Pokemon key.',
      'selectedPokemonKey',
    );
  }

  if (input.now !== undefined && !isoDateTimeInputSchema.safeParse(input.now).success) {
    return toolError(
      'invalid_datetime',
      'now must be an ISO datetime with millisecond precision.',
      'now',
    );
  }

  return null;
}

function validationToolError(errors: SceneDocumentValidationError[]): CallToolResult {
  return toolResult(
    'SceneDocument validation failed.',
    {
      errors: errors.map(toMcpValidationError),
    },
    {
      errors: errors.map(toMcpValidationError),
      warnings: ['SceneDocument failed validation and should be repaired before use.'],
      fixSuggestions: errors.map((error) => error.recoveryAction),
      isError: true,
    },
  );
}

function toolOk<T extends Record<string, unknown>>(message: string, data: T, warnings: string[] = []): CallToolResult {
  return toolResult(message, data, { warnings });
}

function toolError(code: string, message: string, fieldPath?: string): CallToolResult {
  return toolResult(
    message,
    {},
    {
      errors: [{ code, message, fieldPath }],
      warnings: ['The tool failed before producing a scene result.'],
      fixSuggestions: ['Check the input against the listed tool schema and retry with a minimal payload.'],
      isError: true,
    },
  );
}

function toolResult<T extends Record<string, unknown>>(
  message: string,
  data: T,
  options: {
    errors?: McpErrorDetail[];
    warnings?: string[];
    fixSuggestions?: string[];
    isError?: boolean;
  } = {},
): CallToolResult {
  const structuredContent: McpToolStructuredResult<T> = {
    ok: !options.isError,
    data: options.isError ? null : data,
    errors: options.errors ?? [],
    warnings: options.warnings ?? [],
    fixSuggestions: options.fixSuggestions ?? [],
    meta: mcpMeta(),
  };

  return {
    content: [
      {
        type: 'text',
        text: message,
      },
    ],
    structuredContent: structuredContent as unknown as Record<string, unknown>,
    isError: options.isError || undefined,
  };
}

function toMcpValidationError(error: SceneDocumentValidationError): McpErrorDetail {
  return {
    code: 'scene_validation_failed',
    message: error.reason,
    fieldPath: error.fieldPath,
    expected: error.expected,
    recoveryAction: error.recoveryAction,
    conflictType: error.conflictType,
    instanceId: error.instanceId,
    assetId: error.assetId,
    buildingLevelId: error.buildingLevelId,
    coordinates: error.coordinates?.map((coordinate) => ({ x: coordinate.x, y: coordinate.y })),
    blockingInstanceId: error.blockingInstanceId,
    blockingAssetId: error.blockingAssetId,
    blockingBuildingLevelId: error.blockingBuildingLevelId,
    surfaceKind: error.surfaceKind,
  };
}

function getToolErrorCategory(result: CallToolResult): string {
  const structuredContent = asRecord(result.structuredContent);
  const errors = Array.isArray(structuredContent.errors) ? structuredContent.errors : [];
  const firstError = asRecord(errors[0]);
  return stringValue(firstError.code) ?? 'tool_error';
}

function normalizePokemonKey(value: string | undefined): PokemonKey {
  return value && isKnownPokemonKey(value) ? value : defaultSelectedPokemonKey;
}

function mcpMeta() {
  return {
    serviceVersion,
    schemaVersion,
    catalogVersion,
  };
}

function logMcpRequest(event: {
  method: string;
  route: string;
  status: number;
  durationMs: number;
  errorCategory: string;
}): void {
  console.info('worker_mcp_request', event);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}
