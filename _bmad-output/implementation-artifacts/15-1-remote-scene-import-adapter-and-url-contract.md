# Story 15.1: Remote scene import adapter 与 URL contract

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a scene editor maintainer,
I want 一个 browser-only remote scene import adapter,
so that URL-driven scene loading 与 scene-core 领域规则保持解耦。

## Acceptance Criteria

1. 新增 IO adapter 读取并校验 `scene_id` query；缺失时返回 no-op 状态，空值、重复值或包含非法 URL path 字符时返回 typed invalid-query 状态。
2. Adapter 解析 remote endpoint：production 使用 `https://scene-api.pokokit.com/api/scenes/{id}`；local dev 使用 Vite dev proxy 或本地 adapter endpoint；`id` 必须安全编码。
3. Local dev 的 proxy/server-side upstream request 必须附带 `Origin: "https://scene-editor.pokokit.com"`；production browser request 不手写 Origin header。
4. Adapter fetch 成功后解析 API 响应得到 scene string；实现必须锁定精确 response shape，并对 invalid response 返回 typed invalid-response 错误。
5. Adapter 返回 typed result：`no-scene-id`、`invalid-query`、`success`、`not-found`、`network-error`、`invalid-response` 等；不得直接修改 React scene state、localStorage 或 UI preferences。
6. `packages/scene-core` 不新增 fetch、URL、window、Vite env、dev proxy 或 browser runtime 依赖。

## Tasks / Subtasks

- [x] 新增 remote scene import IO adapter（AC: 1, 2, 4, 5）
  - [x] 建议新增 `apps/web/src/io/remote-scene-import.ts`，保持 browser/app IO 边界。
  - [x] 提供 `getSceneIdFromSearch(search: string)` 或等价函数，处理缺失、空值、重复 query、URL encoding 和非法 path 字符。
  - [x] 提供 `resolveRemoteSceneEndpoint(sceneId, mode)` 或等价函数，production 输出 scene API URL，dev 输出 proxy/local adapter URL。
  - [x] 提供 `fetchRemoteSceneString(...)`，只返回 typed result，不触碰 React state、storage、toast 或 import pipeline。

- [x] 接入 local dev proxy 或本地 adapter（AC: 2, 3）
  - [x] 优先在 `apps/web/vite.config.ts` 配置 Vite dev proxy，例如 `/api/remote-scenes/:id` 转发到 `https://scene-api.pokokit.com/api/scenes/:id`。
  - [x] Proxy upstream request 必须设置 `Origin: "https://scene-editor.pokokit.com"`。
  - [x] Client-side dev fetch 只请求本地 proxy path，不在 browser `headers` 中设置 `Origin`。
  - [x] Production build/runtime 仍直连 scene API URL，不经过 dev proxy path。

- [x] 锁定 API response parsing contract（AC: 4）
  - [x] 确认 scene API 返回 plain text 还是 JSON 字段；若为 JSON，使用唯一明确字段，不做宽松猜测。
  - [x] 对 content-type mismatch、JSON parse failure、缺字段、字段非 string、空 string 返回 `invalid-response`。
  - [x] 对 HTTP 404 返回 `not-found`，其他非 2xx 返回 typed network/http error，错误文本不暴露敏感 stack。

- [x] 添加 adapter/config focused tests（AC: all）
  - [x] 覆盖 query parser：no query、valid id、empty id、duplicate id、encoded id、非法 path 字符。
  - [x] 覆盖 endpoint resolver：dev proxy path、production scene API URL、safe id encoding。
  - [x] 覆盖 fetch result：success、not found、non-2xx、network throw、invalid response。
  - [x] 覆盖 dev proxy/header strategy：proxy upstream header 有 Origin；production client fetch options 不包含 Origin。

- [x] 运行验证（AC: all）
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/io/remote-scene-import.test.ts --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`

### Review Findings

- [x] [Review][Patch] Reject leading/trailing encoded whitespace in `scene_id` instead of trimming to a different id [`apps/web/src/io/remote-scene-import.ts`]
- [x] [Review][Patch] Require exact JSON media type instead of substring content-type matching [`apps/web/src/io/remote-scene-import.ts`]
- [x] [Review][Patch] Constrain Vite dev proxy to `/api/remote-scenes/` boundary and prevent adjacent prefix proxying [`apps/web/vite.config.ts`]
- [x] [Review][Patch] Lock proxy/header strategy through shared config tests instead of only checking helper output [`apps/web/src/io/remote-scene-import.test.ts`]
- [x] [Review][Patch] Restore sprint tracker absolute paths from temporary worktree path to canonical repo path [`_bmad-output/implementation-artifacts/sprint-status.yaml`]
- [x] [Review][Patch] Lock exact successful API response shape as JSON `{ id, meta, pse }` [`apps/web/src/io/remote-scene-import.ts`]

## Dev Notes

### Epic Context

- Epic 15 新增 `?scene_id={id}` 即时访问入口。它是“导入字符串的远程来源”，不是账号、云同步、公开方案库、在线编辑服务或 SceneDocument schema change。[Source: `_bmad-output/planning-artifacts/epics.md`]
- Approved proposal 明确本地调试不能依赖 browser fetch 手写 Origin；应通过 Vite dev proxy 或本地 adapter 在 server-side upstream request 设置 Origin。[Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md`]

### Architecture Guardrails

- `packages/scene-core` 继续只负责 DOM-free decode、recovery、schema、export summary 和规则派生；不要把 fetch、URL parsing、Vite env 或 proxy 行为放进 core。[Source: `_bmad-output/planning-artifacts/architecture.md`]
- Production endpoint 是 `https://scene-api.pokokit.com/api/scenes/{id}`。Local dev endpoint 由 `apps/web` dev server/proxy 处理 Origin 限制；production browser fetch 不手写 Origin header。[Source: `_bmad-output/planning-artifacts/architecture.md`]
- Adapter 只拿到远程 scene string，不调用 `decodeSceneDocumentStringWithLossyRecovery()` 或 `applyRecoveredSceneDocument()`；这些属于 Story 15.2 AppShell import orchestration。

### Current Code State

- `apps/web/vite.config.ts` 当前只有 Vite/React/build 基础配置和 `base` 设置；没有 remote scene proxy。
- `apps/web/src/io/scene-storage.ts` 是现有 browser scene storage adapter，可作为 IO module 风格参考，但 remote adapter 不应写 storage。
- `apps/web/src/components/app-shell/app-shell-helpers.ts` 已有 `isLocalPreviewHost()`，可作为 dev/local host 判断参考；不要把 endpoint resolution 散落到 React render 中。
- 当前代码没有 `scene_id` search param parser、remote fetch adapter 或 remote loading typed result。

### Technical Constraints

- 不新增依赖。使用 repo 现有 React/Vite/TypeScript/Vitest。
- 不请求 live `scene-api.pokokit.com` 做单元测试；fetch 必须 mock。
- 不修改 SceneDocument、codec、catalog、footprint、stacking 或 dimension contracts。
- 如果 API response shape 无法确认，dev-story 必须先用最小 spike 或 fixture 明确 shape，再继续 UI integration；不要用“多个字段都试试”的隐式猜测作为长期 contract。

## Project Structure Notes

- New likely files:
  - `apps/web/src/io/remote-scene-import.ts`
  - `apps/web/src/io/remote-scene-import.test.ts`
- Likely update:
  - `apps/web/vite.config.ts`
- Do not update:
  - `packages/scene-core/**`
  - `apps/web/src/components/app-shell/AppShell.tsx` unless a tiny type export is needed; main AppShell integration belongs to Story 15.2.

## References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `apps/web/vite.config.ts`
- `apps/web/src/io/scene-storage.ts`
- `apps/web/src/components/app-shell/app-shell-helpers.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-01T09:20:08+0800：按 `bmad-dev-story` 读取 Story 15.1 和 sprint tracker；确认 Epic 15 已由 create-story 产出 15.1-15.3，并将 15.1 从 `ready-for-dev` 标为 `in-progress`。
- 2026-06-01T09:18:12+0800：最小 live spike 确认 scene API 成功响应为 JSON `{ id, meta, pse }`，可导入字符串使用唯一字段 `pse`；无 Origin 请求返回 `forbidden_origin`，带 `Origin: https://scene-editor.pokokit.com` 后有效。
- 新增 `remote-scene-import` adapter：query parser、dev/prod endpoint resolver、typed fetch result、严格 JSON `pse` response parser；adapter 不写 React state、localStorage 或 UI preferences。
- 新增 Vite dev proxy `/api/remote-scenes/:id`，转发到 `https://scene-api.pokokit.com/api/scenes/:id`，server-side upstream request 设置 `Origin: https://scene-editor.pokokit.com`；client fetch 只发送 `Accept: application/json`。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/io/remote-scene-import.test.ts --environment jsdom`：通过，1 file / 7 tests。
- `pnpm --filter @pokopia-scene-editor/web typecheck`：通过。
- 2026-06-01T09:22:57+0800：所有 tasks/subtasks 完成，story status 和 sprint tracker 15-1 更新为 `review`。
- `bmad-code-review` 并行审查：Blind Hunter、Edge Case Hunter、Acceptance Auditor 共提出 6 个 patch items；无 decision-needed/defer。
- Review fixes：取消 query value trim；严格解析 `Content-Type` media type；成功响应 shape 收紧为 `{ id, meta, pse }`；proxy context 改为 `^/api/remote-scenes/`；新增 shared proxy rewrite/header tests；sprint tracker canonical path 修复。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/io/remote-scene-import.test.ts --environment jsdom`：通过，1 file / 7 tests。
- `pnpm --filter @pokopia-scene-editor/web typecheck`：通过。
- Manual proxy verification：Vite dev server fallback to `http://127.0.0.1:5174/`；`curl /api/remote-scenes/82AY` 返回 200 JSON with `pse`；`curl /api/remote-scenes-extra/82AY` 未代理到 remote API，返回 Vite HTML。
- 2026-06-01T09:29:24+0800：review patch items 全部修复并验证，story status 和 sprint tracker 15-1 更新为 `done`。

### Completion Notes List

- 已新增 browser-only remote scene import adapter，支持 `scene_id` no-op/invalid/success/not-found/network-error/invalid-response typed results。
- Response contract 锁定为 JSON `{ id, pse }`，其中 `pse` 是唯一导入字符串字段；plain text、多字段猜测、缺字段、空字符串和 id mismatch 都返回 `invalid-response`。
- Local dev 使用 Vite proxy path，生产使用 `https://scene-api.pokokit.com/api/scenes/{id}`；Origin 只在 dev server upstream request 中设置，client fetch 不手写 Origin。
- Focused adapter tests 和 web typecheck 均通过；没有修改 `packages/scene-core`。
- Code review patch items 已全部修复：query parser 不再吞掉非法空白，content-type 与 response shape 更严格，dev proxy 只匹配目标 endpoint，proxy/header strategy 有共享 config 覆盖，BMAD tracker 不再指向临时 worktree 路径。

### File List

- `apps/web/src/io/remote-scene-import-config.ts`
- `apps/web/src/io/remote-scene-import.ts`
- `apps/web/src/io/remote-scene-import.test.ts`
- `apps/web/src/io/index.ts`
- `apps/web/vite.config.ts`
- `_bmad-output/implementation-artifacts/15-1-remote-scene-import-adapter-and-url-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-06-01: Story created from approved Epic 15 course correction.
- 2026-06-01: Implemented remote scene import adapter, dev proxy Origin strategy, response contract parsing and focused tests; status moved to review.
- 2026-06-01: Addressed code review findings and moved status to done.

## Senior Developer Review (AI)

Review date: 2026-06-01
Reviewer: GPT-5 Codex with parallel Blind Hunter, Edge Case Hunter, and Acceptance Auditor agents
Decision: Approved after fixes.

### Findings Addressed

- Fixed `scene_id` parser accepting leading/trailing encoded whitespace by removing trim-before-validation.
- Fixed content-type validation to require exact `application/json` media type.
- Fixed dev proxy prefix boundary and added shared config tests for proxy context/rewrite/header strategy.
- Fixed sprint tracker canonical paths so committed BMAD artifacts do not point at the temporary worktree.
- Fixed response parser to require the locked successful JSON shape `{ id, meta, pse }`.

### Verification Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/io/remote-scene-import.test.ts --environment jsdom` (7 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: manual Vite proxy check for `/api/remote-scenes/82AY`; adjacent `/api/remote-scenes-extra/82AY` did not proxy to the remote API.
