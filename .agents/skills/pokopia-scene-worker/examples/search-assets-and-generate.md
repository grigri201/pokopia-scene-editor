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

2. Return asset ids, display names, categories, and the reason each result fits the theme.
3. Call `generate_scene_document` when the user asks for a starter/default scene:

```json
{
  "sceneName": "Pikachu Cozy Wood Scene",
  "selectedPokemonKey": "pikachu",
  "includeOpenDesignDemo": false
}
```

4. If the tool returns a structured input error, use `fieldPath` and `fixSuggestions` to adjust the request and retry once.

Do not infer hidden catalog entries or fabricate asset ids.
