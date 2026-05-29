# Example: Summarize Export

User intent: "Give me the export summary for this Pokopia scene."

Workflow:

1. Read the scene payload from the requested file or user-provided JSON.
2. Call `summarize_scene_export`:

```json
{
  "scene": "<scene payload>"
}
```

3. Use `structuredContent.data.summary` as the authoritative summary. Preserve `structuredContent.data.summary.sceneSize`, `structuredContent.data.summary.canvasSize`, `structuredContent.data.summary.outerPadding`, `structuredContent.dimensions`, `structuredContent.data.summary.layers[].notes` for layer notes, each instance's `footprint`, `effectiveFootprint`, `occupiedCells`, `blockingCells`, `footprintWarnings`, and any derived `stackingRelations`.
4. If the tool returns `isError`, follow `fieldPath` and `fixSuggestions`, then retry.
5. Explain that browser PNG/image generation remains outside the Worker MCP workflow.

The summary must come from MCP, not from a local recreation of export-summary rules.
Do not compute footprint spans, material counts, or base/top stacking relations in the skill.
Do not replace legacy `5x5` scene / `7x7` canvas dimensions with the current default `15x15` scene / `17x17` canvas dimensions.

Dimension note: the default is `15x15` scene / `17x17` canvas with `outerPadding: 1`; users may choose custom canvas width/height from `6..17`; legacy recovered payloads may remain `5x5` / `7x7`. Use Worker/MCP `dimensions` output as the current contract.
