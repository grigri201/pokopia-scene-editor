# Story 7.3: 新增 Streamable HTTP MCP server、tools、resources 与 prompts

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Codex 或 MCP 客户端,
I want 通过少量高语义 MCP tools 调用 Scene Editor 领域能力,
so that 我可以校验、恢复、摘要和查询素材，而不是猜测内部 schema。

## Acceptance Criteria

1. Given `apps/worker` 已存在, When dev agent 新增 MCP server, Then `/mcp` 必须提供 Streamable HTTP MCP endpoint, And 初始实现保持无状态，不保存用户 scene 或 session state。
2. Given MCP tools 已注册, When MCP 客户端列出 tools, Then 至少包含 `generate_scene_document`、`validate_scene_document`、`recover_scene_document`、`summarize_scene_export` 和 `search_pokopia_assets`, And tools 不得机械镜像所有 HTTP endpoints。
3. Given MCP resources 已注册, When MCP 客户端读取 resources, Then 至少提供 scene schema、asset catalog、Pokemon catalog、默认 scene 示例和服务版本信息。
4. Given MCP prompts 已注册, When MCP 客户端列出 prompts, Then 应包含修复 scene、准备导出摘要和按主题找素材的高频 workflow prompt。
5. Given MCP tool 执行, When 输入非法或 scene 校验失败, Then 返回结构化错误、字段路径、warnings 和可执行修复建议, And 不记录完整 scene payload。
6. Given Worker API 已存在, When `/api/*`、`/mcp` 和静态资源请求共存, Then `/api/*` 仍走 HTTP API，`/mcp` 只走 MCP handler，其他请求继续走 static assets fallback。
7. Given release gate 运行, When 执行 `pnpm run typecheck`、`pnpm run test`、`pnpm run worker:types:check`、`pnpm run build` 和 `pnpm run smoke`, Then 新增 MCP 代码和测试必须通过。

## Tasks / Subtasks

- [x] 引入 MCP/Cloudflare Worker 依赖并保持无状态边界 (AC: 1, 6, 7)
  - [x] 在 `apps/worker/package.json` 增加 `agents`、`@modelcontextprotocol/sdk` 和 `zod` 依赖；不要把 MCP 依赖加到 Web package。
  - [x] 新增 `apps/worker/src/mcp.ts` 或等价模块，使用 `McpServer` 注册 tools/resources/prompts。
  - [x] 使用 Cloudflare Agents `createMcpHandler(server, { route: "/mcp" })` 暴露 Streamable HTTP；每个 `/mcp` request 必须创建新的 `McpServer` 实例，避免全局 server/transport state。
  - [x] 更新 `apps/worker/src/index.ts` 路由顺序，确保 `/api/*`、`/mcp` 和 static assets fallback 不互相吞掉。
- [x] 注册高语义 MCP tools (AC: 2, 5)
  - [x] `generate_scene_document`：生成默认或指定 Pokemon/名称/时间的 `SceneDocument v1`。
  - [x] `validate_scene_document`：返回 `valid`、结构化 errors、warnings 和修复建议。
  - [x] `recover_scene_document`：尝试恢复 scene；失败时返回字段路径和修复建议，不暴露 stack trace。
  - [x] `summarize_scene_export`：返回与 Web 导出摘要一致的 JSON summary；不得生成 PNG 或调用 `html-to-image`。
  - [x] `search_pokopia_assets`：支持 query/category/area/skill/favorite/page/pageSize 等语义筛选，返回分页结果而不是完整 catalog。
- [x] 注册 MCP resources 与 prompts (AC: 3, 4)
  - [x] Resources 至少包含：`pokopia://scene/schema/v1`、`pokopia://assets/catalog`、`pokopia://pokemon/catalog`、`pokopia://scene/examples/default`、`pokopia://service/version`。
  - [x] Scene schema resource 应从 `scene-core` 的 `sceneDocumentV1Schema` 派生，避免复制 schema。
  - [x] Asset/Pokemon/default scene/version resources 必须从 `scene-core` 和 Worker version helpers 派生。
  - [x] Prompts 至少包含：修复 scene、准备导出摘要、按主题找素材；prompt 文案应指导客户端调用 MCP tools，而不是要求模型猜 schema。
- [x] 增加 MCP contract tests 与日志/错误边界覆盖 (AC: 1, 2, 3, 4, 5, 6)
  - [x] 用 Vitest 通过 `handleRequest()` 或 MCP client transport 覆盖 initialize、tools/list、resources/list、prompts/list 和主要 tool call。
  - [x] 覆盖非法 scene payload 的 MCP tool 结果，断言 structured error、field path、warnings/fix suggestions 存在且响应不包含原始 payload 或 stack trace。
  - [x] 覆盖 `/mcp` 不影响 `/api/health` 和 static assets fallback。
  - [x] 覆盖 MCP 日志只记录 tool/status/duration/error category 等 redacted metadata。

### Review Findings

- [x] [Review][Patch] `generate_scene_document` let semantic input errors such as unknown `selectedPokemonKey` or invalid `now` fall through to a generic internal tool error. Fixed by adding field-specific validation that returns structured MCP errors and fix suggestions without echoing invalid payload values.
- [x] [Review][Patch] MCP contract tests listed resources but did not read the scene schema resource, leaving `z.toJSONSchema(sceneDocumentV1Schema)` unexercised. Fixed by reading `pokopia://scene/schema/v1` and asserting key schema properties.

## Dev Notes

- Story 7.3 只实现 MCP server/tools/resources/prompts，不实现 repo-scoped Codex skill；skill 是 Story 7.4。[Source: _bmad-output/planning-artifacts/epics.md#Story-7.3]
- MCP tools 必须保持高语义集合：`generate_scene_document`、`validate_scene_document`、`recover_scene_document`、`summarize_scene_export`、`search_pokopia_assets`；不得机械暴露 HTTP endpoint 镜像如 `encode/decode` 全量接口。[Source: _bmad-output/planning-artifacts/prd.md#FR74]
- MCP resources/prompts 必须覆盖 scene schema、asset catalog、Pokemon catalog、默认 scene 示例、服务版本，以及修复 scene、准备导出摘要、按主题找素材 workflow。[Source: _bmad-output/planning-artifacts/prd.md#FR75]
- `apps/worker/src/*` 只能做 HTTP/MCP adapter、request validation、result envelope、headers/cache、安全和日志脱敏；业务规则必须来自 `packages/scene-core`。[Source: _bmad-output/planning-artifacts/architecture.md#Service-Boundaries]
- Worker 第一阶段无状态，不保存用户 scene，不引入数据库、auth middleware、账号、云同步、分享链接、在线发布或服务端图片生成。[Source: _bmad-output/planning-artifacts/architecture.md#Service-Boundaries]
- 7.2 已新增 `apps/worker` HTTP API、`api-result.ts`、`request.ts`、`routes/assets.ts`、`routes/scene.ts` 和 `version.ts`；MCP 可复用这些 adapter helper 或直接调用同一 `scene-core` 函数，但不得 import `apps/web/src/*`。[Source: _bmad-output/implementation-artifacts/7-2-worker-http-api-and-deploy-scripts.md]
- Cloudflare Agents `createMcpHandler` 是 plain Worker 的无状态 MCP handler；Cloudflare 文档说明它基于 `WorkerTransport` 并符合 Streamable HTTP transport。MCP SDK 1.26+ 的 stateless server 应使用 server factory，每次请求创建新的 `McpServer`，不要复用全局 server。[Source: https://developers.cloudflare.com/agents/api-reference/mcp-handler-api/]
- MCP TypeScript SDK 文档建议使用 `McpServer` 注册 tools/resources/prompts；tools 可以返回 `structuredContent`，失败工具结果应设置 `isError: true` 并用 content 描述错误。[Source: https://ts.sdk.modelcontextprotocol.io/documents/server.html]
- MCP Streamable HTTP spec 要求实现者注意 Origin/DNS rebinding 等安全边界；本 story 最小实现可保持无状态和 route-scoped handler，进一步 auth/hardening 留给 Story 7.5。[Source: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports]

### Project Structure Notes

- 新增/更新文件建议：
  - `apps/worker/src/mcp.ts`
  - `apps/worker/src/mcp.test.ts`
  - `apps/worker/src/mcp-tools.ts` 或等价拆分模块
  - `apps/worker/src/mcp-resources.ts` 或等价拆分模块
  - `apps/worker/src/mcp-prompts.ts` 或等价拆分模块
  - `apps/worker/src/index.ts`
  - `apps/worker/package.json`
  - `pnpm-lock.yaml`
- 若 `wrangler types` 因依赖或 binding 类型变化更新 `apps/worker/worker-configuration.d.ts`，应重新运行 `pnpm run worker:types:check`。

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.3]
- [Source: _bmad-output/planning-artifacts/prd.md#Scene-Worker-MCP-Codex-Skill]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Approved-Epic-7-implementation-sequence]
- [Source: https://developers.cloudflare.com/agents/api-reference/mcp-handler-api/]
- [Source: https://ts.sdk.modelcontextprotocol.io/documents/server.html]
- [Source: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-26: Story created after Story 7.2 commit `0c22ad9`.
- 2026-05-26: Added Worker MCP dependencies, `apps/worker/src/mcp.ts`, `/mcp` routing, high-semantic tools, resources, prompts, and MCP contract tests.
- 2026-05-26: Enabled `nodejs_compat` for the Worker bundle because Cloudflare Agents imports Node built-ins; regenerated Wrangler runtime types and added direct `@types/node`.
- 2026-05-26: Verified `pnpm run typecheck`, `pnpm run test`, `pnpm run worker:types:check`, `pnpm run build`, and `pnpm run smoke`.
- 2026-05-26: Applied code-review fixes for generate input errors and schema resource coverage; re-verified the full Story 7.3 gate.

### Completion Notes List

- Story context created for Streamable HTTP MCP endpoint, high-semantic tools, resources, prompts, redacted logging and contract tests.
- `/mcp` now creates a fresh `McpServer` per request through Cloudflare Agents `createMcpHandler`, keeping the initial MCP server stateless.
- MCP tools expose generate/validate/recover/export-summary/asset-search workflows with structured content, warnings, field paths and fix suggestions.
- MCP resources expose schema/catalog/example/version data from `scene-core` and Worker version helpers; prompts guide repair/export/search workflows.
- Node/Vitest tests mock only the Cloudflare `agents/mcp` transport because the package resolves `cloudflare:` modules outside the Worker runtime; `wrangler deploy --dry-run` validates the real Worker bundle.
- Review fixes ensure semantic generate input errors return field paths and fix suggestions, and schema resource generation is covered in tests.

### Change Log

- 2026-05-26: Created Story 7.3 and moved status to ready-for-dev.
- 2026-05-26: Implemented Story 7.3 and moved status to review.
- 2026-05-26: Completed Story 7.3 review fixes and moved status to done.

### File List

- _bmad-output/implementation-artifacts/7-3-mcp-server-tools-resources-prompts.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/worker/package.json
- apps/worker/src/index.ts
- apps/worker/src/mcp.ts
- apps/worker/src/mcp.test.ts
- apps/worker/wrangler.toml
- apps/worker/worker-configuration.d.ts
- pnpm-lock.yaml
- pnpm-workspace.yaml
