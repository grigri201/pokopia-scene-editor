# Pokopia Scene Worker MCP Workflows

This reference describes how to call the MCP tools without duplicating business logic.

## Dimensions

Supported scene dimensions use `outerPadding: 1`: the default is `15x15` scene / `17x17` canvas, custom user-selected canvas width/height may be any integer from `6..17`, and legacy recovered payloads may remain `5x5` scene / `7x7` canvas. All scene workflows must preserve and report returned `sceneSize`, `canvasSize`, `outerPadding`, and `classification` from `structuredContent.dimensions` or the Worker route `dimensions` field.

## Validate Or Recover

1. Read the scene payload from the repo-local file or user-provided content.
2. Call `validate_scene_document` with `{ "scene": <payload> }`.
3. If `structuredContent.ok` is false, preserve the full `errors[]` objects and use their `fieldPath`, footprint conflict fields, `dimensions`, `warnings`, and `fixSuggestions` to make the smallest repair.
4. Call `recover_scene_document` after edits to confirm the payload can be recovered into a current `SceneDocument`.

## Summarize Export

1. Call `summarize_scene_export` with `{ "scene": <payload> }`.
2. Use `structuredContent.data.summary` as the export-summary JSON, including `structuredContent.data.summary.sceneSize`, `structuredContent.data.summary.canvasSize`, `structuredContent.data.summary.outerPadding`, `structuredContent.data.summary.layers[].notes` for layer notes plus `footprint`, `effectiveFootprint`, `occupiedCells`, `blockingCells`, `footprintWarnings`, and derived `stackingRelations`.
3. Preserve warnings in the answer. Do not generate PNG files or call browser image-export code.

## Search Assets And Generate Defaults

1. Call `search_pokopia_assets` with semantic filters such as `query`, `category`, `pokemonKey`, `favoriteOnly`, `page`, and `pageSize`.
2. Return asset ids, names, categories, `footprint`, `stacking`, and why the results fit the request.
3. For a starter scene, call `generate_scene_document` with optional `sceneName`, `selectedPokemonKey`, `now`, and `includeOpenDesignDemo`, then preserve the returned dimensions.

## Failure Handling

Production deployment publishes only the static web app, so do not use `scene-editor.pokokit.com` as an MCP endpoint. Use the local Worker MCP endpoint when MCP is required. If it is unavailable and the task allows local development services, start the Worker with `pnpm run worker:dev` and use the local `/mcp` endpoint. If the selected local endpoint still fails, report the MCP failure and stop. Do not rebuild the schema, catalog, stacking rules, recovery, or export-summary behavior from source files.
