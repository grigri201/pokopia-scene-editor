# Story 7.2: 新增 Worker HTTP API 与 monorepo 部署脚本

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 在 `apps/worker` 中新增 Cloudflare Worker HTTP API 和 Wrangler scripts,
so that scene-core 能以无状态服务方式被浏览器、脚本和后续 MCP 复用。

## Acceptance Criteria

1. Given monorepo 已建立, When dev agent 新增 `apps/worker`, Then `apps/worker/wrangler.toml` 必须使用 Workers static assets, And `assets.directory` 指向 `../web/dist`, And Worker code 处理 `/api/*`，其余 SPA 请求走 static assets/fallback。
2. Given Worker API MVP 已实现, When 请求命中 API, Then 至少支持 `/api/health`、`/api/scene/generate`、`/api/scene/validate`、`/api/scene/recover`、`/api/scene/export-summary`、`/api/scene/encode`、`/api/scene/decode` 和 `/api/assets`。
3. Given Worker 返回结果, When 任一 API 成功或失败, Then 返回统一 result envelope：`ok`、`data`、`errors`、`warnings`、`meta`, And `meta` 包含 service version、schema version 和 catalog version。
4. Given Worker 处理用户 scene payload, When 请求执行完成, Then 不保存用户 scene，不记录完整 payload，不暴露 stack trace, And request body、content type、tool timeout 和 output size 有明确限制。
5. Given root `package.json`, When monorepo scripts 更新, Then 必须提供 `worker:dev`、`worker:types`、`worker:types:check`、`worker:deploy:dry-run`、`worker:deploy` 和 `deploy`, And 这些命令通过 `pnpm --filter @pokopia-scene-editor/worker ...` 调用 Worker package scripts。
6. Given `apps/worker/package.json`, When scripts 更新, Then 必须封装 `wrangler dev`、`wrangler types`、`wrangler types --check`、`wrangler deploy --dry-run` 和 `wrangler deploy`, And deploy/dry-run 之前必须构建 `apps/web` 静态资源。

## Tasks / Subtasks

- [x] 新增 Worker package、Wrangler config 和 scripts (AC: 1, 5, 6)
  - [x] 新增 `apps/worker/package.json`、`apps/worker/tsconfig.json`、`apps/worker/wrangler.toml`。
  - [x] `wrangler.toml` 使用 Workers static assets，`assets.directory = "../web/dist"`，并设置 `main = "src/index.ts"`。
  - [x] root scripts 新增 `worker:dev`、`worker:types`、`worker:types:check`、`worker:deploy:dry-run`、`worker:deploy` 和 `deploy`。
  - [x] Worker package scripts 封装 `wrangler dev`、`wrangler types`、`wrangler types --check`、`wrangler deploy --dry-run` 和 `wrangler deploy`，deploy/dry-run 前构建 Web 静态资源。
- [x] 实现无状态 HTTP API adapter (AC: 1, 2, 3, 4)
  - [x] `apps/worker/src/index.ts` 只路由 `/api/*`；非 API 请求交给 static assets fallback。
  - [x] 新增统一 result envelope helper，所有响应都包含 `ok`、`data`、`errors`、`warnings`、`meta`。
  - [x] 支持 `/api/health`、`/api/scene/generate`、`/api/scene/validate`、`/api/scene/recover`、`/api/scene/export-summary`、`/api/scene/encode`、`/api/scene/decode` 和 `/api/assets`。
  - [x] Adapter 只能调用 `@pokopia-scene-editor/scene-core`，不得 import `apps/web/src/*` 或复制 scene 业务规则。
- [x] 增加安全边界和错误处理 (AC: 3, 4)
  - [x] 限制 JSON request body size、content type 和 response output size。
  - [x] 错误响应不得返回 stack trace 或原始 scene payload。
  - [x] 日志只能记录 route、method、status、duration、error category 等 redacted metadata；不记录完整 request/scene body。
  - [x] 不引入 D1/KV/R2/Durable Objects、账号、权限、云同步、分享链接或服务端图片生成。
- [x] 增加 Worker contract tests 与 release gate (AC: 2, 3, 4, 6)
  - [x] 使用 Vitest 覆盖 API success/error envelopes、content type/body size guard、未知 route、asset search 和 scene validate/recover/export/encode/decode。
  - [x] root `pnpm run typecheck/test/build` 包含 Worker package。
  - [x] `pnpm run build` 必须先构建 core/web，再运行 Worker dry-run 或等效 bundle validation。

### Review Findings

- [x] [Review][Patch] Root `package.json` duplicated pnpm build-dependency configuration already owned by `pnpm-workspace.yaml`, making future package-manager policy changes easier to miss. Fixed by keeping `onlyBuiltDependencies`/`allowBuilds` in the workspace file only.
- [x] [Review][Patch] Contract tests asserted redacted error responses but did not directly assert redacted request logs. Fixed by adding a Worker test that spies on `console.info` and verifies log metadata excludes raw scene fields and payload values.

## Dev Notes

- Story 7.2 只实现 HTTP API 和部署脚本，不实现 MCP server/tools/resources/prompts；MCP 是 Story 7.3。[Source: _bmad-output/planning-artifacts/epics.md#Story-7.2]
- `apps/worker/src/*` 只能做 HTTP adapter、request parsing、result envelope、headers/cache、安全和日志脱敏；业务规则必须来自 `packages/scene-core`。[Source: _bmad-output/planning-artifacts/architecture.md#Service-Boundaries]
- Worker 第一阶段无状态，不保存用户 scene，不引入数据库、auth middleware、账号、云同步、分享链接或公开发布。[Source: _bmad-output/planning-artifacts/architecture.md#Service-Boundaries]
- `scene-core` 已在 Story 7.1 完成抽取，当前 public export 在 `packages/scene-core/src/index.ts`。Worker 应通过 workspace dependency `@pokopia-scene-editor/scene-core` 复用 schema、default scene、asset catalog、filters、serializer/recovery、short string codec 和 export summary。[Source: _bmad-output/implementation-artifacts/7-1-extract-scene-core-shared-package.md]
- 当前 Web image export 仍在 `apps/web/src/io/image-export.ts`，Worker 不得实现或调用 PNG/`html-to-image` 路径。
- Existing root `wrangler.toml` 是旧 Pages 配置；Story 7.2 目标配置应迁入 `apps/worker/wrangler.toml`。如保留 root config，会和 architecture 的部署入口冲突。

### Project Structure Notes

- 新增 Worker 目录应对齐 architecture：
  - `apps/worker/src/index.ts`
  - `apps/worker/src/api-result.ts`
  - `apps/worker/src/routes/`
  - `apps/worker/src/request.ts`
  - `apps/worker/src/version.ts`
  - `apps/worker/wrangler.toml`
- Worker tests 可放在 `apps/worker/src/**/*.test.ts`，使用 node/Vitest 对 `fetch()` handler 做 contract tests。若引入 Wrangler runtime-specific tests，保持在 Worker package 内。
- `wrangler types` 可能生成 `apps/worker/worker-configuration.d.ts`；如果脚本生成该文件并被 typecheck 需要，应提交它或确保 fallback types 可用。

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service-Boundaries]
- [Source: _bmad-output/planning-artifacts/architecture.md#Development-Workflow-Integration]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md#Epic-7]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-26: Story created after Story 7.1 commit `b9ac5eb`.
- 2026-05-26: Added Worker package, Workers static assets Wrangler config, HTTP route adapter, envelope helpers, request guards, asset/scene routes, generated Wrangler runtime types, and contract tests.
- 2026-05-26: Verified `pnpm run typecheck`, `pnpm run test`, `pnpm run worker:types:check`, `pnpm run build`, and `pnpm run smoke`.
- 2026-05-26: Applied code-review fixes for pnpm config ownership and redacted log contract coverage; re-verified the full Story 7.2 gate.

### Completion Notes List

- Story context created for Worker HTTP API, static assets config, result envelope, request limits, and root/worker scripts.
- `apps/worker` exposes the required `/api/*` endpoints and delegates non-API requests to `env.ASSETS.fetch`.
- Worker API returns a consistent envelope with service/schema/catalog metadata and no raw payload or stack trace exposure.
- Root scripts now include Worker typecheck/test/build, Worker dev/types/deploy commands, and deploy delegation.
- `wrangler types` generated `apps/worker/worker-configuration.d.ts`; Worker tsconfig uses generated runtime types instead of `@cloudflare/workers-types`.

### Change Log

- 2026-05-26: Implemented Story 7.2 and moved status to review.
- 2026-05-26: Completed Story 7.2 review fixes and moved status to done.

### File List

- _bmad-output/implementation-artifacts/7-2-worker-http-api-and-deploy-scripts.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- apps/worker/package.json
- apps/worker/tsconfig.json
- apps/worker/wrangler.toml
- apps/worker/worker-configuration.d.ts
- apps/worker/src/index.ts
- apps/worker/src/index.test.ts
- apps/worker/src/api-result.ts
- apps/worker/src/request.ts
- apps/worker/src/version.ts
- apps/worker/src/routes/assets.ts
- apps/worker/src/routes/scene.ts
- wrangler.toml
