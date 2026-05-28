import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildImageExportSummary,
  buildSceneOccupancy,
  createBuildingLevel,
  createDefaultSceneDocument,
  createFootprintContractHeightBlockedScene,
  createFootprintContractScene,
  createStackingPlateFoodScene,
  createStackingPlateNonFoodScene,
  footprintContractExpected,
  footprintContractFixtureIds,
  stackingContractFixtureIds,
  validateSceneDocument,
} from '@pokopia-scene-editor/scene-core';
import { handleRequest, type WorkerEnv } from './index';

vi.mock('agents/mcp', () => ({
  createMcpHandler: (server: any, options: { route?: string } = {}) => async (request: Request) => {
    const url = new URL(request.url);
    if (url.pathname !== (options.route ?? '/mcp')) {
      return jsonRpcError(null, -32004, 'MCP route was not found.', 404);
    }

    if (request.method !== 'POST') {
      return jsonRpcError(null, -32005, 'MCP method is not allowed.', 405);
    }

    const message = await request.json() as {
      id?: string | number | null;
      method?: string;
      params?: Record<string, any>;
    };
    const id = message.id ?? null;

    switch (message.method) {
      case 'initialize':
        return jsonRpcOk(id, {
          protocolVersion: message.params?.protocolVersion ?? '2025-11-25',
          capabilities: {},
          serverInfo: { name: 'pokopia-scene-editor', version: '0.1.0' },
        });
      case 'tools/list':
        return jsonRpcOk(id, {
          tools: Object.entries(server._registeredTools).map(([name, tool]: [string, any]) => ({
            name,
            title: tool.title,
            description: tool.description,
          })),
        });
      case 'tools/call': {
        const tool = server._registeredTools[message.params?.name];
        if (!tool) {
          return jsonRpcError(id, -32602, 'Unknown tool.', 200);
        }
        return jsonRpcOk(id, await tool.handler(message.params?.arguments ?? {}, {}));
      }
      case 'resources/list':
        return jsonRpcOk(id, {
          resources: Object.entries(server._registeredResources).map(([uri, resource]: [string, any]) => ({
            uri,
            name: resource.name,
            title: resource.title,
            ...resource.metadata,
          })),
        });
      case 'resources/read': {
        const resource = server._registeredResources[message.params?.uri];
        if (!resource) {
          return jsonRpcError(id, -32602, 'Unknown resource.', 200);
        }
        return jsonRpcOk(id, await resource.readCallback(new URL(message.params?.uri), {}));
      }
      case 'prompts/list':
        return jsonRpcOk(id, {
          prompts: Object.entries(server._registeredPrompts).map(([name, prompt]: [string, any]) => ({
            name,
            title: prompt.title,
            description: prompt.description,
          })),
        });
      default:
        return jsonRpcError(id, -32601, 'Unknown MCP method.', 200);
    }
  },
}));

const env: WorkerEnv = {
  ASSETS: {
    fetch: vi.fn(() => Promise.resolve(new Response('asset fallback', { status: 200 }))),
  } as unknown as Fetcher,
};

describe('worker MCP endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves Streamable HTTP MCP initialize metadata', async () => {
    const response = await mcpRpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'pokopia-worker-test', version: '0.1.0' },
    });
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.result.serverInfo).toMatchObject({
      name: 'pokopia-scene-editor',
      version: '0.1.0',
    });
  });

  it('lists high-semantic tools, resources, and prompts', async () => {
    const tools = await readJson(await mcpRpc('tools/list'));
    const resources = await readJson(await mcpRpc('resources/list'));
    const prompts = await readJson(await mcpRpc('prompts/list'));

    expect(tools.result.tools.map((tool: { name: string }) => tool.name)).toEqual(
      expect.arrayContaining([
        'generate_scene_document',
        'validate_scene_document',
        'recover_scene_document',
        'summarize_scene_export',
        'search_pokopia_assets',
      ]),
    );
    expect(tools.result.tools.map((tool: { name: string }) => tool.name)).not.toContain('encode_scene_document');

    expect(resources.result.resources.map((resource: { uri: string }) => resource.uri)).toEqual(
      expect.arrayContaining([
        'pokopia://scene/schema/v1',
        'pokopia://assets/catalog',
        'pokopia://pokemon/catalog',
        'pokopia://scene/examples/default',
        'pokopia://service/version',
      ]),
    );

    expect(prompts.result.prompts.map((prompt: { name: string }) => prompt.name)).toEqual(
      expect.arrayContaining([
        'repair_scene_document',
        'prepare_scene_export_summary',
        'find_assets_by_theme',
      ]),
    );
  });

  it('generates scenes, searches assets, and reads resources through MCP', async () => {
    const generated = await readJson(await mcpRpc('tools/call', {
      name: 'generate_scene_document',
      arguments: {
        selectedPokemonKey: 'pikachu',
        sceneName: 'MCP Scene',
        now: '2026-05-26T00:00:00.000Z',
      },
    }));
    expect(generated.result.structuredContent).toMatchObject({
      ok: true,
      data: {
        scene: {
          sceneName: 'MCP Scene',
          selectedPokemonKey: 'pikachu',
          schemaVersion: 1,
        },
      },
    });

    const assets = await readJson(await mcpRpc('tools/call', {
      name: 'search_pokopia_assets',
      arguments: { query: 'wood', pageSize: 3 },
    }));
    expect(assets.result.structuredContent.data.assets).toHaveLength(3);
    expect(assets.result.structuredContent.data.filteredCount).toBeGreaterThan(3);
    expect(assets.result.structuredContent.data.assets[0].footprint).toMatchObject({
      length: expect.any(Number),
      width: expect.any(Number),
      height: expect.any(Number),
    });
    expect(assets.result.structuredContent.data.assets[0].stacking).toMatchObject({
      surfaceKind: expect.any(String),
      allowsSameLevelOverlap: expect.any(Boolean),
      allowedTopCategories: expect.any(Array),
    });

    const assetCatalog = await readJson(await mcpRpc('resources/read', { uri: 'pokopia://assets/catalog' }));
    expect(JSON.parse(assetCatalog.result.contents[0].text).assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: 'wooden-bench',
          footprint: { length: 1, width: 2, height: 1 },
          stacking: { surfaceKind: 'none', allowsSameLevelOverlap: false, allowedTopCategories: [] },
        }),
        expect.objectContaining({
          assetId: 'wooden-plate',
          stacking: {
            surfaceKind: 'food-surface',
            allowsSameLevelOverlap: true,
            allowedTopCategories: ['food'],
          },
        }),
      ]),
    );

    const version = await readJson(await mcpRpc('resources/read', { uri: 'pokopia://service/version' }));
    expect(JSON.parse(version.result.contents[0].text)).toMatchObject({
      serviceVersion: '0.1.0',
      schemaVersion: 1,
    });

    const schema = await readJson(await mcpRpc('resources/read', { uri: 'pokopia://scene/schema/v1' }));
    expect(JSON.parse(schema.result.contents[0].text)).toMatchObject({
      type: 'object',
      properties: expect.objectContaining({
        schemaVersion: expect.any(Object),
        sceneId: expect.any(Object),
        selectedPokemonKey: expect.any(Object),
      }),
    });
  });

  it('returns structured validation errors without stack traces or raw scene payloads', async () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    try {
      const response = await mcpRpc('tools/call', {
        name: 'recover_scene_document',
        arguments: { scene: { sceneName: 'private broken scene' } },
      });
      const bodyText = await response.text();
      const body = JSON.parse(bodyText);

      expect(response.status).toBe(200);
      expect(body.result.isError).toBe(true);
      expect(body.result.structuredContent).toMatchObject({
        ok: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            code: 'scene_validation_failed',
            fieldPath: expect.any(String),
            recoveryAction: expect.any(String),
          }),
        ]),
        warnings: expect.arrayContaining([expect.any(String)]),
        fixSuggestions: expect.arrayContaining([expect.any(String)]),
      });
      expect(bodyText).not.toContain('ZodError');
      expect(bodyText).not.toContain('private broken scene');
      expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('private broken scene');
      expect(infoSpy).toHaveBeenCalledWith(
        'worker_mcp_tool',
        expect.objectContaining({
          tool: 'recover_scene_document',
          status: 'error',
          errorCategory: 'scene_validation_failed',
        }),
      );
    } finally {
      infoSpy.mockRestore();
    }
  });

  it('validates scenes through MCP with scene-core contract parity', async () => {
    const scene = createDefaultSceneDocument({ now: '2026-05-26T00:00:00.000Z' });
    const validResponse = await readJson(await mcpRpc('tools/call', {
      name: 'validate_scene_document',
      arguments: { scene },
    }));

    expect(validResponse.result.structuredContent).toMatchObject({
      ok: true,
      data: { valid: true, errors: [] },
      errors: [],
      warnings: [],
    });

    const invalidScene = { ...scene, selectedPokemonKey: 'not-a-real-pokemon' };
    const directErrors = validateSceneDocument(invalidScene);
    const invalidResponse = await readJson(await mcpRpc('tools/call', {
      name: 'validate_scene_document',
      arguments: { scene: invalidScene },
    }));

    expect(invalidResponse.result.isError).toBe(true);
    expect(invalidResponse.result.structuredContent.errors).toEqual(
      directErrors.map((error) => expect.objectContaining({
        fieldPath: error.fieldPath,
        message: error.reason,
        expected: error.expected,
        recoveryAction: error.recoveryAction,
      })),
    );
  });

  it('keeps MCP tools aligned with the shared footprint contract fixture', async () => {
    const scene = createFootprintContractScene();
    const validation = await readJson(await mcpRpc('tools/call', {
      name: 'validate_scene_document',
      arguments: { scene },
    }));
    const summary = await readJson(await mcpRpc('tools/call', {
      name: 'summarize_scene_export',
      arguments: { scene },
    }));
    const recovery = await readJson(await mcpRpc('tools/call', {
      name: 'recover_scene_document',
      arguments: { scene },
    }));
    const blocked = await readJson(await mcpRpc('tools/call', {
      name: 'recover_scene_document',
      arguments: { scene: createFootprintContractHeightBlockedScene() },
    }));

    expect(validation.result.structuredContent).toMatchObject({
      ok: true,
      data: { valid: true, errors: [] },
    });
    expect(summary.result.structuredContent.data.summary).toEqual(buildImageExportSummary(scene));
    expect(findSummaryInstance(summary.result.structuredContent.data.summary, footprintContractFixtureIds.rotatedBench)).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedBench],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedBench],
    });
    expect(findSummaryInstance(summary.result.structuredContent.data.summary, footprintContractFixtureIds.rotatedRug)).toMatchObject({
      effectiveFootprint: footprintContractExpected.effectiveFootprints[footprintContractFixtureIds.rotatedRug],
      occupiedCells: footprintContractExpected.occupiedCells[footprintContractFixtureIds.rotatedRug],
    });
    expect(recovery.result.structuredContent).toMatchObject({
      ok: true,
      data: {
        scene,
        warnings: [],
      },
    });
    expect(blocked.result.isError).toBe(true);
    expect(blocked.result.structuredContent.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'scene_validation_failed',
          conflictType: 'height-blocked-by-lower-footprint',
          instanceId: footprintContractFixtureIds.heightBlocked,
          blockingInstanceId: footprintContractFixtureIds.boulder,
          blockingAssetId: 'strength-rock',
          buildingLevelId: footprintContractFixtureIds.level1,
          coordinates: [{ x: 1, y: 4 }],
        }),
      ]),
    );
    expect(blocked.result.structuredContent.fixSuggestions).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it('returns shared export-summary layer notes through the MCP summary tool', async () => {
    const scene = createSceneWithLayerNotes();
    const summary = await readJson(await mcpRpc('tools/call', {
      name: 'summarize_scene_export',
      arguments: { scene },
    }));

    expect(summary.result.structuredContent.data.summary).toEqual(buildImageExportSummary(scene));
    expect(summary.result.structuredContent.data.summary.layers.map((layer: any) => layer.notes)).toEqual([
      [
        { id: 'note-mcp-1', text: '先确认高度' },
        { id: 'note-mcp-2', text: '<script>alert(1)</script>' },
      ],
      [{ id: 'note-mcp-3', text: '<img src=x onerror=alert(1)>' }],
    ]);
  });

  it('keeps MCP tools aligned with the shared stacking contract fixture', async () => {
    const scene = createStackingPlateFoodScene();
    const validation = await readJson(await mcpRpc('tools/call', {
      name: 'validate_scene_document',
      arguments: { scene },
    }));
    const summary = await readJson(await mcpRpc('tools/call', {
      name: 'summarize_scene_export',
      arguments: { scene },
    }));
    const recovery = await readJson(await mcpRpc('tools/call', {
      name: 'recover_scene_document',
      arguments: { scene },
    }));
    const unsupported = await readJson(await mcpRpc('tools/call', {
      name: 'validate_scene_document',
      arguments: { scene: createStackingPlateNonFoodScene() },
    }));

    expect(validation.result.structuredContent).toMatchObject({
      ok: true,
      data: { valid: true, errors: [] },
    });
    expect(summary.result.structuredContent.data.summary).toEqual(buildImageExportSummary(scene));
    expect(summary.result.structuredContent.data.summary.stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: stackingContractFixtureIds.food,
        topAssetId: 'leppa-berry',
        baseInstanceId: stackingContractFixtureIds.plate,
        baseAssetId: 'plate',
        surfaceKind: 'food-surface',
      }),
    ]);
    expect(recovery.result.structuredContent).toMatchObject({
      ok: true,
      data: {
        scene,
        warnings: [],
      },
    });
    expect(JSON.stringify(recovery.result.structuredContent.data.scene)).not.toContain('stackingRelations');
    expect(JSON.stringify(recovery.result.structuredContent.data.scene)).not.toContain('surfaceKind');
    expect(buildSceneOccupancy(recovery.result.structuredContent.data.scene).stackingRelations).toEqual([
      expect.objectContaining({
        topInstanceId: stackingContractFixtureIds.food,
        baseInstanceId: stackingContractFixtureIds.plate,
        surfaceKind: 'food-surface',
      }),
    ]);
    expect(unsupported.result.isError).toBe(true);
    expect(unsupported.result.structuredContent.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          conflictType: 'unsupported-stack-surface',
          instanceId: stackingContractFixtureIds.nonFood,
          blockingInstanceId: stackingContractFixtureIds.plate,
          surfaceKind: 'food-surface',
        }),
      ]),
    );
  });

  it('returns structured generate input errors with field-level fix suggestions', async () => {
    const response = await mcpRpc('tools/call', {
      name: 'generate_scene_document',
      arguments: {
        selectedPokemonKey: 'not-a-real-pokemon',
      },
    });
    const body = await readJson(response);

    expect(body.result.isError).toBe(true);
    expect(body.result.structuredContent).toMatchObject({
      ok: false,
      errors: [
        expect.objectContaining({
          code: 'invalid_pokemon_key',
          fieldPath: 'selectedPokemonKey',
        }),
      ],
      fixSuggestions: expect.arrayContaining([expect.any(String)]),
    });
    expect(JSON.stringify(body)).not.toContain('not-a-real-pokemon');
  });

  it('keeps MCP routing isolated from API and static assets', async () => {
    const api = await request('/api/health');
    const staticAsset = await request('/mcp-client-route');

    expect(api.status).toBe(200);
    expect((await readJson(api)).data.status).toBe('ok');
    expect(staticAsset.status).toBe(200);
    expect(await staticAsset.text()).toBe('asset fallback');
    expect(env.ASSETS.fetch).toHaveBeenCalledOnce();
  });

  it('serves MCP from the public /api/v1/mcp path', async () => {
    const response = await mcpRpc('initialize', {
      protocolVersion: '2025-11-25',
      capabilities: {},
      clientInfo: { name: 'pokopia-worker-test', version: '0.1.0' },
    }, '/api/v1/mcp');
    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.result.serverInfo.name).toBe('pokopia-scene-editor');
  });

  it('summarizes export data for valid scenes', async () => {
    const scene = createDefaultSceneDocument({ now: '2026-05-26T00:00:00.000Z' });
    const summary = await readJson(await mcpRpc('tools/call', {
      name: 'summarize_scene_export',
      arguments: { scene },
    }));

    expect(summary.result.structuredContent).toMatchObject({
      ok: true,
      data: {
        summary: {
          sceneId: scene.sceneId,
        },
      },
    });
  });
});

function mcpRpc(method: string, params?: unknown, path = '/mcp') {
  return request(path, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-test`,
      method,
      params,
    }),
    headers: {
      'accept': 'application/json, text/event-stream',
      'content-type': 'application/json',
      'mcp-protocol-version': '2025-11-25',
    },
  });
}

function request(path: string, init: RequestInit = {}) {
  return handleRequest(new Request(`https://example.test${path}`, init), env);
}

async function readJson(response: Response): Promise<Record<string, any>> {
  return await response.json() as Record<string, any>;
}

function findSummaryInstance(summary: any, instanceId: string) {
  const instance = summary.layers
    .flatMap((layer: any) => layer.materials)
    .flatMap((material: any) => material.instances)
    .find((candidate: any) => candidate.instanceId === instanceId);

  if (!instance) {
    throw new Error(`Expected summary instance ${instanceId}.`);
  }

  return instance;
}

function createSceneWithLayerNotes() {
  const scene = createDefaultSceneDocument({ now: '2026-05-28T00:00:00.000Z' });

  return {
    ...scene,
    buildingLevels: [
      {
        ...scene.buildingLevels[0],
        notes: [
          { id: 'note-mcp-1', text: '先确认高度' },
          { id: 'note-mcp-2', text: '<script>alert(1)</script>' },
        ],
      },
      {
        ...createBuildingLevel(1),
        notes: [{ id: 'note-mcp-3', text: '<img src=x onerror=alert(1)>' }],
      },
    ],
  };
}

function jsonRpcOk(id: string | number | null, result: unknown, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, result }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function jsonRpcError(id: string | number | null, code: number, message: string, status = 200): Response {
  return new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
