# Worker/API/MCP/Skill Handoff

This repository now maintains only the browser Web app and the file-installable `@pokopia-scene-editor/scene-core` domain package.

Future API, MCP, Worker, or Codex skill projects must depend on the core package instead of copying business rules:

```sh
pnpm add file:/absolute/path/to/pokopia-scene-editor/packages/scene-core
```

Do not copy or fork `SceneDocument v1` schema, asset catalog, codec, dimension helpers, footprint/occupancy/stacking rules, recovery, selectors, or export-summary logic. Treat a future API/MCP service as an adapter over the package root export.

## Removed HTTP Surface

- `OPTIONS /api/*` CORS preflight handling
- `OPTIONS /api/v1/*` CORS preflight handling after v1 path normalization
- `GET /api/health`
- `GET /api/v1`
- `GET /api/v1/health`
- `GET|POST /api/assets`
- `GET|POST /api/v1/assets`
- `POST /api/scene/generate`
- `POST /api/v1/scene/generate`
- `POST /api/scene/validate`
- `POST /api/v1/scene/validate`
- `POST /api/scene/recover`
- `POST /api/v1/scene/recover`
- `POST /api/scene/export-summary`
- `POST /api/v1/scene/export-summary`
- `POST /api/scene/encode`
- `POST /api/v1/scene/encode`
- `POST /api/scene/decode`
- `POST /api/v1/scene/decode`
- `POST /mcp`
- `POST /api/v1/mcp`

## Removed MCP Surface

Tools:

- `generate_scene_document`
- `validate_scene_document`
- `recover_scene_document`
- `summarize_scene_export`
- `search_pokopia_assets`

Resources:

- `pokopia://scene/schema/v1`
- `pokopia://assets/catalog`
- `pokopia://pokemon/catalog`
- `pokopia://scene/examples/default`
- `pokopia://service/version`

Prompts:

- `repair_scene_document`
- `prepare_scene_export_summary`
- `find_assets_by_theme`

## Removed Repo-Scoped Skill Surface

- `.agents/skills/pokopia-scene-worker/SKILL.md`
- `.agents/skills/pokopia-scene-worker/examples/validate-scene.md`
- `.agents/skills/pokopia-scene-worker/examples/summarize-export.md`
- `.agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md`
- `.agents/skills/pokopia-scene-worker/references/workflows.md`

## Removed Verification And Deploy Coupling

- `scripts/verify-pokopia-scene-worker-skill.mjs`
- `scripts/verify-worker-bundle.mjs`
- Root `worker:*` scripts
- Root `skill:verify`
- Worker package `mcp:smoke`, `bundle:check`, `types`, `types:check`, and disabled Worker deploy scripts
- Worker Wrangler config and generated Worker environment types

Production deployment remains Cloudflare Pages static assets only. This repository's deploy script builds `apps/web` and deploys `apps/web/dist`; it must not publish `/api/*`, `/api/v1/*`, or `/mcp`.
