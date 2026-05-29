# Example: Search Assets And Generate Scene

User intent: "Find cozy wood assets for Pikachu and make a starter scene."

Workflow:

1. Call `search_pokopia_assets` with concise filters:

```json
{
  "query": "wood cozy",
  "pokemonKey": "pikachu",
  "favoriteOnly": false,
  "pageSize": 5
}
```

2. Return asset ids, display names, categories, `footprint`, `stacking`, and the reason each result fits the theme.
3. Call `generate_scene_document` when the user asks for a starter/default scene:

```json
{
  "sceneName": "Pikachu Cozy Wood Scene",
  "selectedPokemonKey": "pikachu",
  "includeOpenDesignDemo": false
}
```

4. If the tool returns a structured input error, use `fieldPath` and `fixSuggestions` to adjust the request and retry once.
5. For generated scenes, preserve `structuredContent.dimensions` and confirm the default is `15x15` scene / `17x17` canvas unless MCP explicitly returns a legacy `5x5` scene / `7x7` canvas payload.

Do not infer hidden catalog entries or fabricate asset ids.
Do not copy footprint override lists into the answer; use `structuredContent.data.assets[].footprint`.
Do not copy stacking override lists into the answer; use `structuredContent.data.assets[].stacking`.

Dimension note: Epic 12 default is `15x15` scene / `17x17` canvas with `outerPadding: 1`; legacy recovered payloads may remain `5x5` / `7x7`; `16x16` is unsupported. Use `_bmad-output/implementation-artifacts/12-1-scene-core-dimension-contract-and-legacy-recovery.md` for the dimension contract context.
