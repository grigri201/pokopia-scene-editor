# Story 13.3: 移除本仓库 Worker/API/MCP/Skill 代码

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 仓库维护者,
I want 从本仓库移除 API、MCP、Worker 和 repo-scoped skill,
so that 仓库边界和依赖图只服务 Web 与 `scene-core`。

## Acceptance Criteria

1. 删除本仓库 active Worker/API/MCP/skill surface：tracked `apps/worker/**`、`.agents/skills/pokopia-scene-worker/**`、`scripts/verify-pokopia-scene-worker-skill.mjs`、`scripts/verify-worker-bundle.mjs` 不再存在。
2. 根 `package.json` 不再暴露 `worker:*`、`skill:verify`、`worker:mcp:smoke`、`worker:bundle:check`、Worker deploy/dry-run/type generation 等脚本。
3. 根 `typecheck`、`test`、`build`、`release:verify` 只覆盖 `scene-core`、`web`、`scene-core:file-install:smoke`、Web smoke 和 runtime asset verification，不再默认运行 Worker runtime、MCP smoke、skill verify 或 `wrangler types --check`。
4. `pnpm-workspace.yaml` 或 workspace package discovery 不再要求 `apps/worker` package 存在。`pnpm install --lockfile-only` 后 lockfile 不再保留 `apps/worker` importer，也不再保留只由 Worker/MCP/skill 引入的 `@modelcontextprotocol/sdk`、`agents`、`@cloudflare/workers-types`、`partyserver` 等依赖。
5. Cloudflare Pages static deploy 行为保持：`pnpm run deploy` 仍先构建 `apps/web`，再部署 `apps/web/dist` 到 `pokopia-scene-editor` Pages project；不得重新引入 Worker route、`/api/*`、`/api/v1/*` 或 `/mcp` 发布路径。
6. 新增 handoff 文档，列出被移除的 HTTP routes、MCP tools/resources/prompts、repo-scoped skill examples/references 和 Worker/skill verification scripts。文档必须明确新项目要通过 `pnpm add file:<repo>/packages/scene-core` 复用领域规则，不得复制 schema、catalog、codec、footprint、stacking、dimension 或 export-summary 逻辑。
7. 不改变终端用户 Web 行为，不改 `SceneDocument v1` schema shape，不新增 `SceneDocument v2`，不保存 footprint/stacking/dimension derived state。

## Tasks / Subtasks

- [x] 删除 Worker/API/MCP/skill tracked surface (AC: 1)
  - [x] 删除 tracked `apps/worker/**`，包括 `src`、`package.json`、`tsconfig.json`、`wrangler.toml` 和 Worker generated type file。
  - [x] 删除 `.agents/skills/pokopia-scene-worker/**`。不要删除 repo-local BMAD/system skills，例如 `.agents/skills/bmad-*`。
  - [x] 删除 Worker/skill 专用验证脚本：`scripts/verify-pokopia-scene-worker-skill.mjs`、`scripts/verify-worker-bundle.mjs`。
- [x] 收敛 root scripts 与 workspace dependency graph (AC: 2, 3, 4, 5)
  - [x] 从 root `package.json` 删除所有 `worker:*` 和 `skill:verify` 相关脚本。
  - [x] 更新 `typecheck` / `test` / `release:verify`，只覆盖 core/web/file-install smoke/static Web smoke。`release:verify` 必须包含 `pnpm run scene-core:file-install:smoke`。
  - [x] 修复 `web:deploy` / `deploy`，不再依赖 `apps/worker` 目录执行 Wrangler；可使用 root/ephemeral Wrangler Pages CLI，但不得恢复 Worker deploy。
  - [x] 运行 `pnpm install --lockfile-only`，确保 `apps/worker` importer 和 Worker-only dependencies 从 lockfile 移除。
- [x] 编写外迁 handoff 文档 (AC: 6)
  - [x] 新增 `docs/worker-api-mcp-skill-handoff.md` 或同等文档。
  - [x] 文档列出 HTTP routes：`GET /api/health`、`GET|POST /api/assets`、`POST /api/scene/generate`、`POST /api/scene/validate`、`POST /api/scene/recover`、`POST /api/scene/export-summary`、`POST /api/scene/encode`、`POST /api/scene/decode`，以及 public aliases `/api/v1`、`/api/v1/*`、`/api/v1/mcp`。
  - [x] 文档列出旧 Worker 的 `OPTIONS /api/*` 与 `OPTIONS /api/v1/*` CORS preflight 行为。
  - [x] 文档列出 MCP tools：`generate_scene_document`、`validate_scene_document`、`recover_scene_document`、`summarize_scene_export`、`search_pokopia_assets`。
  - [x] 文档列出 MCP resources：`pokopia://scene/schema/v1`、`pokopia://assets/catalog`、`pokopia://pokemon/catalog`、`pokopia://scene/examples/default`、`pokopia://service/version`。
  - [x] 文档列出 MCP prompts：`repair_scene_document`、`prepare_scene_export_summary`、`find_assets_by_theme`。
  - [x] 文档列出 removed skill examples/references：`validate-scene.md`、`summarize-export.md`、`search-assets-and-generate.md`、`references/workflows.md`。
  - [x] 文档明确新项目必须依赖 file-installable `@pokopia-scene-editor/scene-core`，并把 API/MCP/skill 重新设计为 adapter 层。
- [x] 验证 Web/core 行为与静态发布边界 (AC: 3, 5, 7)
  - [x] 确认 `rg "@pokopia-scene-editor/worker|apps/worker|worker:|worker:mcp|skill:verify|verify-worker|verify-pokopia-scene-worker|@modelcontextprotocol|\\bagents\\b|workers-types" package.json pnpm-lock.yaml pnpm-workspace.yaml scripts apps packages docs` 不再命中 active runtime/config（handoff 文档中的历史引用允许存在）。
  - [x] 确认 `apps/web`、`packages/scene-core` 和 `scripts/verify-scene-core-file-install.mjs` 不依赖 Worker/MCP/skill。
  - [x] 保持 `SceneDocument v1` 字段不变；如果实现过程中发现必须改 schema，停止并先发起 course correction。
- [x] 验证 (AC: 1-7)
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core test`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/web test`
  - [x] `pnpm run build`
  - [x] `pnpm run scene-core:file-install:smoke`
  - [x] `pnpm run release:verify`
  - [x] `git diff --check`

## Dev Notes

### Current State

- `apps/worker` is a tracked workspace package with HTTP routes, MCP server, Worker tests, Wrangler config and generated Worker types.
- Root `package.json` still includes Worker/skill scripts: `worker:mcp:smoke`, `worker:bundle:check`, `worker:dev`, `worker:types`, `worker:types:check`, `worker:deploy:dry-run`, `worker:deploy`, and `skill:verify`.
- Root `typecheck`, `test`, and `release:verify` still reference `@pokopia-scene-editor/worker`; these will fail after removing `apps/worker` unless updated in the same story.
- `web:deploy` currently runs Wrangler through `pnpm --dir apps/worker exec wrangler`; this must be replaced before deleting `apps/worker`.
- `.agents/skills/pokopia-scene-worker` is the only repo-scoped user skill to remove in this story. Do not touch BMAD workflow skills under `.agents/skills/bmad-*`.
- Story 13.2 made `packages/scene-core` file-installable and added `scene-core:file-install:smoke`; Story 13.3 should reuse that as the handoff dependency boundary.

### Removed Surface Inventory

- HTTP routes currently implemented by `apps/worker/src/index.ts` and `apps/worker/src/routes/*`:
  - `GET /api/health`
  - `GET|POST /api/assets`
  - `POST /api/scene/generate`
  - `POST /api/scene/validate`
  - `POST /api/scene/recover`
  - `POST /api/scene/export-summary`
  - `POST /api/scene/encode`
  - `POST /api/scene/decode`
  - Public aliases under `/api/v1`, including `/api/v1/mcp` normalization to `/mcp`.
- MCP tools currently implemented by `apps/worker/src/mcp.ts`:
  - `generate_scene_document`
  - `validate_scene_document`
  - `recover_scene_document`
  - `summarize_scene_export`
  - `search_pokopia_assets`
- MCP resources:
  - `pokopia://scene/schema/v1`
  - `pokopia://assets/catalog`
  - `pokopia://pokemon/catalog`
  - `pokopia://scene/examples/default`
  - `pokopia://service/version`
- MCP prompts:
  - `repair_scene_document`
  - `prepare_scene_export_summary`
  - `find_assets_by_theme`
- Skill files:
  - `.agents/skills/pokopia-scene-worker/SKILL.md`
  - `.agents/skills/pokopia-scene-worker/examples/*.md`
  - `.agents/skills/pokopia-scene-worker/references/workflows.md`

### Implementation Guardrails

- Do not delete or alter `packages/scene-core` domain/schema/codec/export-summary helpers to compensate for Worker removal.
- Do not move Worker tests into Web tests wholesale. Story 13.6 owns release-gate/data-derived test migration; this story only removes Worker/MCP/skill code and keeps existing core/web gates green.
- Do not introduce an API console, server-side image generation, auth, database, cloud persistence, public sharing, or new routing layer.
- Handoff documentation is the only place where removed endpoint/tool names should remain as historical inventory. Active scripts/config should not keep those names.
- If deploy script needs Wrangler for Pages, keep it strictly scoped to Pages static deploy; do not keep Worker config or Worker package just to access Wrangler.

### Previous Story Intelligence

- Story 13.2 completed `scene-core` file-install package support and committed `feat(scene-core): support file install package`.
- Review follow-up from Story 13.2 added TypeScript NodeNext consumer coverage for installed declarations. New API/MCP project should depend on this package contract instead of importing TS source or copying rules.
- Story 13.2 intentionally did not wire file-install smoke into `release:verify`; Story 13.3 should update the release gate as part of removing Worker/MCP/skill gates.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 13.3 AC and Epic 13 scope.
- `_bmad-output/planning-artifacts/prd.md` - approved course correction: Web + file-installable core only; no `SceneDocument v1` change.
- `_bmad-output/planning-artifacts/architecture.md` - active architecture says Worker/API/MCP/skill are no longer part of this repository.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - terminal Web workflow must not change during repo slimming.
- `_bmad-output/implementation-artifacts/13-2-scene-core-file-installable-package.md` - previous story completion and file-install package boundary.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-30T12:27:30+0800 - Started `bmad-dev-story`; tracker moved to `in-progress`.
- 2026-05-30T12:28:00+0800 - Removed tracked Worker app, repo-scoped scene-worker skill, and Worker/skill verification scripts.
- 2026-05-30T12:29:00+0800 - Recomputed pnpm lockfile with 3 workspace projects and removed Worker-only build allowlist entries.
- 2026-05-30T12:31:55+0800 - Release verification passed; story moved to `review`.
- 2026-05-30T12:38:09+0800 - Fixed review findings: documented removed OPTIONS preflight behavior and marked stale planning Worker/API/MCP/skill guidance as superseded or external handoff.

### Completion Notes List

- Removed the active Worker/API/MCP/skill source surface from this repository.
- Root scripts now run only core/web validation plus file-install smoke and static Web smoke; `release:verify` no longer invokes Worker runtime, MCP smoke, skill verify, or Wrangler type checks.
- `web:deploy` no longer depends on `apps/worker`; it builds Web and deploys `apps/web/dist` to Cloudflare Pages through an ephemeral Wrangler Pages CLI.
- Added `docs/worker-api-mcp-skill-handoff.md` with the removed HTTP routes, MCP tools/resources/prompts, skill examples, verification scripts, and the required `scene-core` file-install dependency boundary.
- Handoff now includes the old API preflight behavior; planning artifacts no longer present Worker/API/MCP/skill as an active in-repo surface.
- Updated the manual verification checklist to remove obsolete Worker/MCP/skill commands.
- `SceneDocument v1` schema shape and terminal Web behavior were not changed.

### File List

- `.agents/skills/pokopia-scene-worker/SKILL.md` (deleted)
- `.agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md` (deleted)
- `.agents/skills/pokopia-scene-worker/examples/summarize-export.md` (deleted)
- `.agents/skills/pokopia-scene-worker/examples/validate-scene.md` (deleted)
- `.agents/skills/pokopia-scene-worker/references/workflows.md` (deleted)
- `_bmad-output/implementation-artifacts/13-3-remove-worker-api-mcp-skill-code.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `apps/worker/package.json` (deleted)
- `apps/worker/src/api-result.ts` (deleted)
- `apps/worker/src/index.test.ts` (deleted)
- `apps/worker/src/index.ts` (deleted)
- `apps/worker/src/mcp.test.ts` (deleted)
- `apps/worker/src/mcp.ts` (deleted)
- `apps/worker/src/request.ts` (deleted)
- `apps/worker/src/routes/assets.ts` (deleted)
- `apps/worker/src/routes/scene.ts` (deleted)
- `apps/worker/src/scene-dimensions.ts` (deleted)
- `apps/worker/src/version.ts` (deleted)
- `apps/worker/tsconfig.json` (deleted)
- `apps/worker/worker-configuration.d.ts` (deleted)
- `apps/worker/wrangler.toml` (deleted)
- `docs/worker-api-mcp-skill-handoff.md`
- `docs/功能验收-checklist.md`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `scripts/verify-pokopia-scene-worker-skill.mjs` (deleted)
- `scripts/verify-worker-bundle.mjs` (deleted)

### Change Log

- 2026-05-30: Removed Worker/API/MCP/skill surface and moved story to `review`.
- 2026-05-30: Applied code review fixes and marked story done.
