# Pokopia Scene Worker MCP Workflows

This reference describes how to call the MCP tools without duplicating business logic.

## Validate Or Recover

1. Read the scene payload from the repo-local file or user-provided content.
2. Call `validate_scene_document` with `{ "scene": <payload> }`.
3. If `structuredContent.ok` is false, preserve the full `errors[]` objects and use their `fieldPath`, footprint conflict fields, `warnings`, and `fixSuggestions` to make the smallest repair.
4. Call `recover_scene_document` after edits to confirm the payload can be recovered into a current `SceneDocument`.

## Summarize Export

1. Call `summarize_scene_export` with `{ "scene": <payload> }`.
2. Use `structuredContent.data.summary` as the export-summary JSON, including `structuredContent.data.summary.layers[].notes` for layer notes plus `footprint`, `effectiveFootprint`, `occupiedCells`, `blockingCells`, `footprintWarnings`, and derived `stackingRelations`.
3. Preserve warnings in the answer. Do not generate PNG files or call browser image-export code.

## Search Assets And Generate Defaults

1. Call `search_pokopia_assets` with semantic filters such as `query`, `category`, `pokemonKey`, `favoriteOnly`, `page`, and `pageSize`.
2. Return asset ids, names, categories, `footprint`, `stacking`, and why the results fit the request.
3. For a starter scene, call `generate_scene_document` with optional `sceneName`, `selectedPokemonKey`, `now`, and `includeOpenDesignDemo`.

## Failure Handling

Production deployment publishes only the static web app, so do not use `scene-editor.pokokit.com` as an MCP endpoint. Use the local Worker MCP endpoint when MCP is required. If it is unavailable and the task allows local development services, start the Worker with `pnpm run worker:dev` and use the local `/mcp` endpoint. If the selected local endpoint still fails, report the MCP failure and stop. Do not rebuild the schema, catalog, stacking rules, recovery, or export-summary behavior from source files.
