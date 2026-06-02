# Story 15.2: AppShell `scene_id` 启动自动导入 flow

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a scene editor user,
I want 打开带 `scene_id` 的链接后自动看到对应布景,
so that 我不需要手动复制粘贴导入字符串。

## Acceptance Criteria

1. `scene_id` 存在时，startup remote import 优先于 localStorage/default scene 的成功展示；没有 `scene_id` 时现有 startup 行为不变。
2. Fetch 成功取得 scene string 后复用现有 `decodeSceneDocumentStringWithLossyRecovery()` 和 `applyRecoveredSceneDocument()`；不得复制 decode/recovery logic。
3. Desktop remote import 成功后显示可编辑工作台中的导入 scene，并清理 selected instance、placement feedback、replacement confirmation 等 transient state，语义与手动 import 一致。
4. Mobile remote import 成功后显示 inline preview，并按现有 mobile import 规则写入 autosave slot；saved slot、UI preferences、export summary 和 derived footprint/stacking state 不得写入。
5. Invalid string、invalid API response、fetch error、not found 或 recovery failure 不把 default scene 当作 remote success；UI 必须显示错误和可恢复入口。
6. Remote lossy import 必须展示 dropped material details，并要求用户确认后才应用兼容内容；用户取消不写 storage、不改变 scene。
7. Remote loading、success、error 和 lossy confirmation 状态必须可访问，并且在 mobile 下不渲染 desktop edit controls。
8. 成功导入后是否清理 URL query 不强制；若实现清理，必须不破坏 browser back/refresh 预期，并有测试覆盖。

## Tasks / Subtasks

- [x] 建立 AppShell remote import state（AC: 1, 5, 7）
  - [x] 在 `AppShell` mount 后读取 `window.location.search`，调用 Story 15.1 adapter。
  - [x] 添加 remote import state union，例如 `idle/loading/success/error/lossy-confirmation`；避免把 loading/error 塞进 `SceneDocument`。
  - [x] `scene_id` 存在时，mobile render branch 应优先展示 remote loading/error/lossy 状态，而不是直接把 localStorage/default scene 当作成功。
  - [x] 没有 `scene_id` 时，不触发 remote fetch，不改变现有 localStorage/default startup。

- [x] 复用 scene string import pipeline（AC: 2, 3, 4, 6）
  - [x] 抽取或复用现有 `submitSceneStringImport()` 的 decode、lossy details、`applyRecoveredSceneDocument()`、toast/recovery 状态和 transient cleanup。
  - [x] 对 remote import source 增加明确 source label，例如 `source: "remote-scene-id"`，但不写进 SceneDocument。
  - [x] Desktop success 使用与手动 import 一致的 scene replacement 和 transient cleanup。
  - [x] Mobile success 先验证 `buildImageExportSummary()`，再 `writeSceneDocumentToStorage(storage, scene, "autosave")`，并进入 inline preview。
  - [x] Lossy remote import 首次 decode 只展示 dropped details；确认后才 apply；取消后不写 storage、不改变 current scene。

- [x] 更新 UI 状态与 i18n（AC: 5, 7）
  - [x] 增加 zh-CN/en-US 文案：remote loading、remote failed、not found、invalid response、retry/open manual import、lossy confirm。
  - [x] Desktop 用现有 toast/recovery surface 或轻量 status 区表达 remote loading/error，不能遮挡工作台。
  - [x] Mobile 用 Mobile Preview Mode 内的 status/error surface 表达 remote loading/error，并保留“导入字符串”手动入口。
  - [x] 所有 API error、scene name、dropped details 和 recovery errors 按文本渲染，不使用 `dangerouslySetInnerHTML`。

- [x] 处理 side effects 与 storage 边界（AC: 3, 4, 5, 6, 8）
  - [x] Remote import 失败不写 autosave/saved/UI preferences。
  - [x] Mobile remote success 只写 autosave slot；desktop remote success 依赖现有 desktop autosave effect，不做 modal/remote-specific saved slot 写入。
  - [x] Remote loading 不触发普通 autosave；mobile read-only branch 仍不得触发 edit command。
  - [x] 如果选择清理 query，用 `history.replaceState` 或等价方式，测试 refresh/back 行为；否则保留 query，并记录预期 refresh 会重新 remote fetch。

- [x] 添加 focused AppShell tests（AC: all）
  - [x] no query baseline：不调用 remote adapter/fetch，现有 storage/default 行为不变。
  - [x] desktop success：`?scene_id=fixture` fetch -> decode -> scene name/Pokemon/summary 更新，不调用 prompt/confirm。
  - [x] desktop fetch failure / invalid response / invalid scene string：显示 error，不把 default scene 标为 remote success，不写 storage。
  - [x] mobile success：390 width 下 remote success 写 autosave、显示 inline preview、不显示 desktop controls。
  - [x] mobile failure：显示错误和“导入字符串”入口，不写 storage，不显示 default scene success。
  - [x] lossy remote import：显示 dropped material details，确认后 apply，取消不写 storage。

- [x] 运行验证（AC: all）
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/web build`

### Review Findings

- [x] [Review][Patch] Clear stale remote error/lossy/loading state after manual fallback import succeeds so mobile can enter `preview-ready` and desktop clears the remote banner [`apps/web/src/components/app-shell/AppShell.tsx`, `AppShell.test.tsx`]
- [x] [Review][Patch] Invalidate pending remote fetches when manual import supersedes remote loading to prevent late remote responses overwriting user-imported scene/autosave [`apps/web/src/components/app-shell/AppShell.tsx`, `AppShell.test.tsx`]
- [x] [Review][Patch] Apply scene string import with current render context so pending remote results respect current mobile/desktop mode after resize [`apps/web/src/components/app-shell/AppShell.tsx`]
- [x] [Review][Patch] Use lossy confirmation title as the desktop lossy alert accessible name instead of labeling it as a remote error [`apps/web/src/components/app-shell/AppShell.tsx`]
- [x] [Review][Patch] Remove initial hard-coded English invalid-query message by rendering a transient loading state until localized effect state is applied [`apps/web/src/components/app-shell/AppShell.tsx`]
- [x] [Review][Patch] Dismiss stale remote invalid-string toasts after successful manual fallback import [`apps/web/src/components/app-shell/AppShell.tsx`, `AppShell.test.tsx`]
- [x] [Review][Patch] Keep remote recovery state visible when manual fallback itself pauses on lossy confirmation and the user cancels before importing [`apps/web/src/components/app-shell/AppShell.tsx`, `AppShell.test.tsx`]
- [x] [Review][Patch] Add slow remote fetch resize regression so async remote import uses current mobile context after desktop-to-mobile resize [`apps/web/src/components/app-shell/AppShell.test.tsx`]

## Dev Notes

### Epic Context

- Epic 15 在 Epic 14 mobile manual import/inline preview 完成后新增 remote scene id entrypoint。Remote source 应被当作“取得 scene string 的来源”，不是新的 scene schema 或云同步能力。[Source: `_bmad-output/planning-artifacts/epics.md`]
- Story 15.1 应先提供 typed adapter 和 dev/prod endpoint strategy。本 story 只负责 AppShell orchestration、UI 状态和 storage side effects。

### Product / UX Requirements

- PRD FR117-FR123 是本 story 的直接验收边界：`scene_id` startup、safe endpoint、复用 decode/recovery、desktop/mobile success 行为、失败不静默、lossy 二次确认、`scene_id` 不写 SceneDocument。[Source: `_bmad-output/planning-artifacts/prd.md`]
- UX 要求 remote import 成功后 desktop 进入编辑工作台、mobile 进入 inline preview；失败时显示错误和手动导入入口，不把默认 scene 当作成功。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md`]

### Architecture Guardrails

- `interactionMode` guard 保持不变。Mobile remote import 是 read-only mobile 下允许的 explicit replacement flow；不得开启普通 place/delete/rotate/dye/skill/layer edit command。
- Remote import data flow 应是：parse query -> fetch scene string -> decodeSceneDocumentStringWithLossyRecovery -> applyRecoveredSceneDocument -> desktop scene replace 或 mobile autosave+inline preview。
- `scene_id`、remote URL、response body、loading/error state、lossy confirmation state 不进入 SceneDocument、UI preferences、export summary 或 derived state cache。

### Current Code State

- `AppShell` 已有 `submitSceneStringImport(sceneString, { allowLossy })`，集中处理手动 import 的 decode/recovery/lossy/mobile storage/desktop replacement。优先复用或抽取它，不要复制大块逻辑。
- `MobilePreviewMode` 接收 `MobilePreviewState` 并在 `preview-ready` 时渲染共享 `ExportPreviewContent`；remote success 应让它进入同一路径。
- `resolveMobilePreviewState(storage, locale, currentDraftScene)` 当前只考虑 storage/current draft；remote state 优先级需要在 AppShell 层处理，避免 storage 抢先展示旧 scene。
- `SceneStringImportModal` 已有 lossy confirmation UI，可以复用或抽出 confirm surface；不要重新引入 `window.prompt` / `window.confirm`。
- `readLatestSceneDocumentFromStorage()` invalid autosave 会直接报告 invalid；mobile remote success 写 autosave 后刷新应能读取该 scene。

### Testing Requirements

- Tests 必须 mock Story 15.1 adapter/fetch，不依赖 live API。
- 对 import flow 设置 `window.prompt` / `window.confirm` spy，remote import 不应调用系统 prompt/confirm。
- Storage assertions 要区分 desktop 和 mobile：mobile success 写 autosave；failure/cancel/lossy-cancel 不写；desktop success 可由现有 autosave effect 负责后续写入，不应写 saved slot。
- Mobile failure tests 必须断言没有 desktop workbench controls、没有 default scene success preview。

## Project Structure Notes

- Likely update files:
  - `apps/web/src/components/app-shell/AppShell.tsx`
  - `apps/web/src/components/app-shell/mobile-preview-state.ts` only if state union must learn remote status
  - `apps/web/src/components/app-shell/mobile-preview-mode.tsx` only for remote loading/error display
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/styles.css`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
- Do not modify:
  - `packages/scene-core/**` unless Story 15.1 proves the existing decode/recovery API cannot express required behavior.

## References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/implementation-artifacts/14-3-custom-scene-string-import-modal-and-mobile-storage.md`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/mobile-preview-state.ts`
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx`
- `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx`
- `apps/web/src/io/scene-storage.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-01T09:55:27+0800：按 `bmad-dev-story` 读取 Story 15.2、Story 15.1 adapter 产物与 AppShell 手动 import pipeline；将 15.2 从 `ready-for-dev` 推进到实现并完成。
- 抽出 `applySceneStringImport()` 作为手动 modal 和 remote startup 共用的 decode/recovery/lossy/storage/transient cleanup helper；remote source 用 `source: "remote-scene-id"` 在 AppShell 层区分 UI/toast，不写入 SceneDocument。
- 新增 remote startup state `idle/loading/success/error/lossy-confirmation`，`scene_id` 存在时 mobile 优先渲染 remote loading/error/lossy 状态，阻止 localStorage/default scene 被误当作 remote success。
- 新增 desktop remote status 区和 mobile remote status/lossy/error UI；保留手动“导入字符串”入口和 retry/confirm/cancel actions。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`：通过，1 file / 75 tests。
- `pnpm --filter @pokopia-scene-editor/web typecheck`：通过。
- 初次 `pnpm --filter @pokopia-scene-editor/web build` 的 Vite build 通过，但 runtime asset verification 因本 worktree 尚未生成 `packages/scene-core/dist/index.js` 失败；随后先运行 `pnpm --filter @pokopia-scene-editor/scene-core build`，再重跑 web build 通过。
- `pnpm --filter @pokopia-scene-editor/scene-core build && pnpm --filter @pokopia-scene-editor/web build`：通过，runtime asset verification passed（1474 references checked）。
- 2026-06-01T09:55:27+0800：所有 tasks/subtasks 完成，story status 和 sprint tracker 15-2 更新为 `review`。
- 2026-06-01T10:11:26+0800：按 `bmad-code-review` 并行审查 Story 15.2；Blind Hunter、Edge Case Hunter、Acceptance Auditor 均指出 manual fallback 没有清理 remote state/pending fetch 的 P1 问题。
- Review fixes：手动导入成功时清理 remote state、dismiss stale remote toast 并递增 request id；手动 lossy confirmation 不提前清理 remote recovery state；`applySceneStringImport()` 改用 current render context；desktop lossy status 使用正确 accessible name；invalid query 初始状态不再显示硬编码英文。
- 追加 review regression：desktop invalid remote string -> manual fallback success 清理 toast；remote error -> manual lossy fallback cancel 保留 remote recovery；desktop slow remote fetch resize 到 mobile 后按 mobile context 写 autosave/preview。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`：通过，1 file / 83 tests。

### Completion Notes List

- Remote startup 现在使用 Story 15.1 adapter 读取 `scene_id` 并取得 remote `pse` 字符串；没有 `scene_id` 时不触发 fetch，保留既有 startup 行为。
- Desktop remote success 复用手动 import pipeline 替换 scene 并清理 placement/selection/replacement transient state；remote import 不调用 `window.prompt` 或 `window.confirm`。
- Mobile remote success 复用同一 pipeline，先验证 preview summary，再只写 autosave slot 并进入 shared inline preview；不写 saved slot、UI preferences 或 derived state。
- Fetch/response/scene-string failures 会显示 remote error 和手动导入入口，不把 default scene 或旧 storage 当作 remote success。
- Remote lossy import 首次只展示 dropped material details；确认后导入兼容内容，取消不写 storage、不改变当前 scene。
- Query 保留不清理；预期刷新带 query 的链接会重新执行 remote fetch。
- Code review 后补齐 manual fallback 恢复覆盖：remote error/loading 后手动导入会清理 remote 状态和旧 remote toast，pending remote response 不会覆盖用户后续导入；手动 lossy fallback cancel 不会误清掉 remote recovery。

### File List

- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx`
- `apps/web/src/components/app-shell/mobile-preview-state.ts`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`
- `_bmad-output/implementation-artifacts/15-2-appshell-scene-id-startup-import-flow.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-06-01: Story created from approved Epic 15 course correction.
- 2026-06-01: Implemented AppShell scene_id startup remote import flow with desktop/mobile states, lossy confirmation and focused tests; status moved to review.
- 2026-06-01: Addressed code review findings around manual fallback recovery, stale remote fetches, resize context and accessibility; status moved to done.

## Senior Developer Review (AI)

Review date: 2026-06-01
Reviewer: GPT-5 Codex with parallel Blind Hunter, Edge Case Hunter, and Acceptance Auditor agents
Decision: Approved after fixes.

### Findings Addressed

- Fixed mobile and desktop manual fallback recovery after remote error/lossy/loading by clearing remote state once manual import actually succeeds, and dismissing stale remote toasts.
- Fixed pending remote fetch overwrite risk by invalidating current remote request ids when manual import succeeds or enters manual lossy confirmation.
- Fixed manual lossy fallback cancel behavior so the original remote recovery state remains visible until compatible content is actually imported.
- Fixed remote import application to use current interaction mode, scene, locale and mobile preview state when an async fetch resolves after viewport changes.
- Fixed desktop lossy confirmation accessible label and removed the initial hard-coded English invalid-query message.

### Verification Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (83 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: `pnpm --filter @pokopia-scene-editor/scene-core build && pnpm --filter @pokopia-scene-editor/web build`
