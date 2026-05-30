# Story 12.3: Short string、Worker、MCP 与 Codex skill dimension parity

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a agent 工具使用者,
I want Worker、MCP 和 Codex skill 明确保留并报告 scene dimensions,
so that 7x7 legacy 数据和 17x17 默认场景不会在浏览器、API 和 agent 工具之间发生尺寸漂移。

## Acceptance Criteria

1. Given Worker `/api/scene/validate`、`recover`、`export-summary`、`encode` 或 `decode` 收到 scene, When scene 是 legacy 7x7 或 default 17x17, Then 响应必须保留并报告 `sceneSize`、`canvasSize` 和 `outerPadding`, And errors/warnings 必须使用当前 dimensions 解释坐标和 bounds。
2. Given MCP tools/resources/prompts 处理 scene, When 输入包含 legacy 7x7 或 default 17x17 scene, Then structuredContent 和摘要必须包含尺寸信息, And MCP 不得复制 Web-only 或 Worker-only 的 7x7 常量。
3. Given Codex repo-scoped skill 校验、恢复、摘要或搜索素材, When skill 调用 MCP/Worker, Then skill 文档和示例必须说明默认 17x17 与 legacy 7x7 的区别, And 不得在 skill 内复制 schema、dimension helpers、codec 或 asset catalog 逻辑。
4. Given 用户尝试把新 17x17 场景编码成短字符串, When codec 输出字符串, Then 字符串必须包含 dimensions 或使用新的 revision, And legacy PSE1 decoder 不应把它误解释为 7x7 成功场景。

## Tasks / Subtasks

- [x] 更新 Worker scene routes 的 dimension envelope (AC: 1, 4)
  - [x] `/api/scene/validate` 和 `/api/scene/recover` 对 valid/recovered payload 返回 `dimensions` summary，包含 `sceneSize`、`canvasSize`、`outerPadding` 和 legacy/default classification。
  - [x] `/api/scene/export-summary` 返回与 export summary 一致的 `canvasSize`，并在 route result metadata/summary 中显式报告 dimensions。
  - [x] `/api/scene/encode` 输出 PSE2/new revision 字符串时报告 dimensions；`decode` 对 PSE1 legacy 和 PSE2 17x17 均报告 dimensions。
  - [x] Worker validation/recovery errors 的 coordinate/bounds 文案不得写死 7x7、49 cells 或 max coordinate 6。
- [x] 更新 MCP tools/resources/prompts dimension parity (AC: 2, 4)
  - [x] `validate_scene_document`、`recover_scene_document`、`summarize_scene_export` structuredContent 包含 dimensions。
  - [x] MCP resources/prompts/schema 文案说明 default 17x17 与 legacy 7x7，且不复制 7x7 常量作为业务规则。
  - [x] MCP tests 同时覆盖 default 17x17 和 legacy 7x7 输入/输出。
- [x] 更新 repo-scoped Codex skill 文档与示例 (AC: 3)
  - [x] `SKILL.md` workflow 说明通过 MCP/Worker 读取 dimensions，不在 skill 内复制 schema/codec/catalog 逻辑。
  - [x] `examples/validate-scene.md`、`examples/summarize-export.md` 或 `references/workflows.md` 包含 default 17x17 与 legacy 7x7 解释。
  - [x] `scripts/verify-pokopia-scene-worker-skill.mjs` 覆盖 dimension wording 且防止重新引入 hardcoded 7x7 规则。
- [x] 验证 (AC: 1-4)
  - [x] 运行 Worker route tests 与 MCP tests。
  - [x] 运行 scene-core short string codec tests。
  - [x] 运行 skill verification script。
  - [x] 运行 worker typecheck / relevant root gates。
  - [x] 运行 `git diff --check`。

## Dev Notes

- Story 12.1 已把 scene-core schema、recovery 和 string codec 调整为 default 15x15/17x17 + legacy 5x5/7x7；Story 12.3 不应重新实现 dimension logic。
- See `_bmad-output/implementation-artifacts/12-1-scene-core-dimension-contract-and-legacy-recovery.md` for the source dimension contract.
- `SceneDocument v1` JSON shape 继续保持，尺寸由 `sceneSize`、`canvasSize`、`outerPadding` 表达。
- New short string 应使用 PSE2 或显式 dimensions；PSE1 继续表示 legacy 7x7。
- Worker/MCP/skill 是 adapter/documentation 层，只能调用 `packages/scene-core` 权威 helpers、serializer、codec 和 export summary。
- 16x16 明确不属于 Epic 12；遇到 unsupported dimensions 应返回 validation error，而不是静默改写。

### Project Structure Notes

- Expected updates:
  - `apps/worker/src/routes/scene.ts`
  - `apps/worker/src/index.test.ts`
  - `apps/worker/src/mcp.ts`
  - `apps/worker/src/mcp.test.ts`
  - `.agents/skills/pokopia-scene-worker/SKILL.md`
  - `.agents/skills/pokopia-scene-worker/examples/*.md`
  - `.agents/skills/pokopia-scene-worker/references/workflows.md`
  - `scripts/verify-pokopia-scene-worker-skill.mjs`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-12.3]
- [Source: _bmad-output/planning-artifacts/epics.md#FR103-FR108]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR101-FR108-Scene-Size-Expansion-&-Legacy-Compatibility]
- [Source: apps/worker/src/routes/scene.ts]
- [Source: apps/worker/src/mcp.ts]
- [Source: .agents/skills/pokopia-scene-worker/SKILL.md]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-29: Story created from Epic 12 Story 12.3 and sprint tracker backlog.
- 2026-05-29: Started dev-story implementation and moved status to in-progress.
- 2026-05-29: Added scene-core dimensions summary helper plus HTTP/MCP dimensions envelopes for default 17x17 and legacy 7x7 scenes.
- 2026-05-29: Multi-agent code review findings addressed: HTTP 422 envelopes now retain `data.dimensions`, decode revision detection trims input, MCP data/top-level dimensions are regression-tested, and skill verifier now guards codec/dimension helper copy-paste.
- 2026-05-29: Verification passed:
  - `pnpm --filter @pokopia-scene-editor/scene-core exec vitest run src/domain/scene/area.test.ts src/io/scene-string-codec.test.ts --environment node`
  - `pnpm --filter @pokopia-scene-editor/worker exec vitest run src/index.test.ts src/mcp.test.ts --environment node`
  - `pnpm --filter @pokopia-scene-editor/worker test`
  - `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
  - `pnpm --filter @pokopia-scene-editor/worker typecheck`
  - `pnpm run skill:verify`
  - `git diff --check`

### Completion Notes List

- Worker scene routes now return `dimensions` summaries for generate/validate/recover/export-summary/encode/decode success paths and carry `data.dimensions` through scene validation error envelopes.
- MCP scene tools return top-level `structuredContent.dimensions` and matching `data.dimensions`; default resources, service metadata, and prompts document supported dimensions.
- Scene string dimension parsing is centralized in scene-core so Worker/MCP adapters do not duplicate codec logic.
- Repo-local `pokopia-scene-worker` skill docs/examples/verifier distinguish default 15x15/17x17 from legacy 5x5/7x7 and reject hardcoded default-7x7 or copied codec/dimension helpers.

### Change Log

- 2026-05-29: Created Story 12.3 and moved status to ready-for-dev.
- 2026-05-29: Started Story 12.3 implementation.
- 2026-05-29: Implemented, reviewed, fixed findings, verified, and marked Story 12.3 done.

### File List

- _bmad-output/implementation-artifacts/12-3-short-string-worker-mcp-dimension-parity.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .agents/skills/pokopia-scene-worker/SKILL.md
- .agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md
- .agents/skills/pokopia-scene-worker/examples/summarize-export.md
- .agents/skills/pokopia-scene-worker/examples/validate-scene.md
- .agents/skills/pokopia-scene-worker/references/workflows.md
- apps/worker/src/api-result.ts
- apps/worker/src/index.test.ts
- apps/worker/src/index.ts
- apps/worker/src/mcp.test.ts
- apps/worker/src/mcp.ts
- apps/worker/src/request.ts
- apps/worker/src/routes/scene.ts
- apps/worker/src/scene-dimensions.ts
- packages/scene-core/src/domain/scene/area.test.ts
- packages/scene-core/src/domain/scene/area.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
- packages/scene-core/src/io/scene-string-codec.ts
- scripts/verify-pokopia-scene-worker-skill.mjs
