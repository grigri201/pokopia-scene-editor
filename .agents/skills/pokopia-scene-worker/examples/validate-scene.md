# Example: Validate Scene

User intent: "Validate this scene JSON and fix any recoverable errors."

Workflow:

1. Read the scene payload from the specified repo-local file or user-provided JSON.
2. Call `validate_scene_document`:

```json
{
  "scene": "<scene payload>"
}
```

3. If the result is invalid, preserve the full `structuredContent.errors[]` objects and use their `fieldPath`, `conflictType`, asset ids, instance ids, blocking fields, `coordinates`, and `structuredContent.fixSuggestions` to edit only the reported fields.
4. Call `recover_scene_document` with the edited payload.
5. Report whether the recovered scene is valid, list warnings, and cite the edited file if one was changed.

Do not paste the complete scene payload into the final answer unless explicitly requested.
Do not rebuild footprint, occupied-cell, or height-blocking rules locally; use the structured MCP error fields as the authority.
