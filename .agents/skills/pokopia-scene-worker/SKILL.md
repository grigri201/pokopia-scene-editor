---
name: pokopia-scene-worker
description: Use this repo-scoped skill in pokopia-scene-editor when a task needs Pokopia Scene Worker MCP for SceneDocument validation/recovery, export-summary JSON, asset search, or default scene generation. Always use MCP tools as the authority instead of copying scene-core schema, catalog, or export rules.
---

# Pokopia Scene Worker

Use this skill for agent-facing Scene Editor workflows that should run through the repo's Worker MCP endpoint:

- validate or recover a `SceneDocument`
- summarize export data as JSON, including derived footprint and stacking relation fields when present
- search Pokopia placeable assets, including catalog-provided footprint and stacking metadata
- generate a default `SceneDocument`

## Boundary

Use MCP tools as the source of truth:

- `generate_scene_document`
- `validate_scene_document`
- `recover_scene_document`
- `summarize_scene_export`
- `search_pokopia_assets`

Do not copy or reimplement `scene-core` schema, asset catalog filtering, stacking rules, export-summary logic, or recovery rules inside this skill. If MCP is unavailable, report that the Worker MCP endpoint is unavailable and stop or start the repo Worker dev server when the task allows it; do not fall back to local business-rule reconstruction.

Footprint, effective footprint, occupied cells, stacking metadata, derived stacking relations, and height blocking details must also come from MCP `structuredContent`. Never paste local footprint or stacking override tables, recalculate occupied cells, or infer blocking rules inside the skill.

## Setup Check

Production deployment now publishes only the static web app. Do not assume that `scene-editor.pokokit.com` exposes API or MCP routes.

Before calling tools, confirm the local Worker MCP endpoint is available:

```text
http://localhost:8788/api/v1/mcp
```

If it is unavailable and the task allows local development services, start the repo Worker dev server:

```bash
pnpm run worker:dev
```

Wrangler normally serves the local MCP endpoint at `/mcp` on the local Worker URL. If a different URL is explicitly configured by the user or environment, use that URL.

## Result Handling

For MCP tool results, treat `structuredContent` as authoritative:

- `ok: true`: use `data` and preserve `warnings` in the response when relevant.
- `ok: false` or `isError: true`: report `errors`, `fieldPath`, `warnings`, and `fixSuggestions`; make only the smallest repair implied by the tool result before retrying.
- Footprint or stacking conflicts: preserve the full `structuredContent.errors[]` objects, including `conflictType`, instance ids, asset ids, building level ids, surface/blocking fields, and `coordinates`.
- `meta`: keep service/schema/catalog version information when comparing outputs or explaining provenance.

Never echo a full user scene payload back in error text unless the user explicitly asks to inspect that file and it is already in the repo.

If the user wants to export the scene as an image, explain that the Worker/MCP skill does not generate images directly. Tell them to visit https://scene-editor.pokokit.com, import the scene string there, and then choose the image export action in the web editor.

## Workflows

For exact examples, read only the needed file:

- Validate or recover a scene: `examples/validate-scene.md`
- Summarize export JSON: `examples/summarize-export.md`
- Search assets or generate a default scene: `examples/search-assets-and-generate.md`

For compact tool input/output expectations, read `references/workflows.md`.

## Repo-Local References

When citing files, use repo-local paths the user provided or files discovered during the task. The Worker/MCP runtime must not depend on `_bmad-output/` planning files; those are planning context only.
