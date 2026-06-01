# Story 15.3: Remote import 回归测试与浏览器验证

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a maintainer,
I want remote import 有 focused tests 和 smoke coverage,
so that scene_id link 不会破坏已有 desktop/mobile import/storage contract。

## Acceptance Criteria

1. Component tests 覆盖 no-query baseline、desktop remote success、desktop fetch failure、desktop invalid scene string、mobile remote success、mobile failure 和 remote lossy confirmation。
2. Tests 断言 local dev 使用 proxy/adapted endpoint，proxy upstream header 包含 Origin；production 使用远程 API URL 且 client fetch 不手写 Origin header。
3. Tests 使用 mocked fetch/route，不依赖 live `scene-api.pokokit.com`。
4. Playwright desktop 覆盖 `?scene_id=fixture` 自动导入并显示 scene name、Pokemon 和 export/material summary 关键内容。
5. Playwright mobile `390x844` 覆盖 `?scene_id=fixture` 自动导入后显示 inline preview、无桌面编辑控件、autosave-only 写入和刷新后仍可从 storage 读取。
6. Existing Epic 14 mobile manual import、desktop import/export/autosave 和 download preview tests 继续通过；不得弱化既有断言。
7. 验证命令至少包含 focused web tests、web typecheck、web build 和 focused Playwright smoke；最终在 story Dev Agent Record 记录命令、结果和剩余风险。

## Tasks / Subtasks

- [x] 补齐 adapter/config coverage audit（AC: 2, 3）
  - [x] 确认 Story 15.1 的 `remote-scene-import.test.ts` 覆盖 dev endpoint、production endpoint、Origin proxy strategy、invalid query 和 invalid response。
  - [x] 若 Story 15.1 没覆盖 proxy upstream header，补测试或在本 story 中补 config-level assertion。
  - [x] 确认所有 remote tests mock fetch/route，不访问 live API。

- [x] 补齐 AppShell component regression（AC: 1, 3, 6）
  - [x] no-query baseline：不调用 remote fetch，storage/default startup 断言保持。
  - [x] desktop success：`?scene_id=fixture` 自动导入 scene，显示 scene name/Pokemon；import 不调用 `window.prompt`/`window.confirm`。
  - [x] desktop fetch failure / invalid response / invalid string：显示 error，不写 storage，不把 default scene 当作 remote success。
  - [x] mobile success：remote scene 写 autosave，saved/UI preferences 不写，inline preview 可见，desktop controls 不存在。
  - [x] mobile failure：显示错误和“导入字符串”入口，storage 不写，不展示 default scene 成功。
  - [x] remote lossy：首次显示 dropped details；确认后导入；取消不写 storage、不改变 scene。
  - [x] Existing Epic 14 manual import tests 继续通过，尤其 mobile empty/valid/invalid/manual import/lossy/cancel/close/storage failure。

- [x] 补齐 Playwright desktop/mobile smoke（AC: 4, 5）
  - [x] 使用 `page.route()` mock `scene-api.pokokit.com` 或 dev proxy route，不依赖真实网络。
  - [x] Desktop `?scene_id=fixture`：自动导入，工作台可见，scene name、Pokemon、关键 material/export preview 内容正确。
  - [x] Desktop failure：mock 404/invalid body，显示 error，页面仍可手动导入或继续使用，不静默成功。
  - [x] Mobile 390×844 `?scene_id=fixture`：自动导入后 inline preview 可见，无 Scene Canvas、Asset Picker、Building Level Panel、Selection Inspector、重置、下载预览、导出字符串或 desktop workbench controls。
  - [x] Mobile refresh：第一次 remote success 后 autosave slot 已写入；刷新无 `scene_id` 或按预期保留 query 时仍能从 storage/remote path 显示同一 scene。
  - [x] Mobile failure：显示 error + “导入字符串”，无 dialog/backdrop drift，无横向 overflow，关键控件不重叠。

- [x] Release readiness verification（AC: 6, 7）
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/io/remote-scene-import.test.ts --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/web build`
  - [x] `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "scene_id|remote import|Mobile Preview Mode|import" --project=chromium`
  - [x] 如 focused gate 全绿且时间允许，运行 `pnpm run release:verify`；若未运行，记录原因和剩余风险。
  - [x] 不执行 deploy、push 或发布动作，除非用户另行明确要求。

### Review Findings

- [x] [Review][Patch] Include all new Story 15.1 remote adapter and BMAD artifact files in closeout/commit scope so AppShell imports and adapter coverage are not omitted [`apps/web/src/io/remote-scene-import*.ts`, `_bmad-output/implementation-artifacts/15-*.md`]
- [x] [Review][Patch] Correct story record wording: Playwright preview smoke exercises the production endpoint route mock; dev proxy behavior is covered by adapter/config unit tests, not by the Playwright preview server [`_bmad-output/implementation-artifacts/15-3-remote-import-regression-tests-and-browser-smoke.md`]
- [x] [Review][Patch] Add AppShell desktop network/fetch failure component coverage for thrown fetch errors, recoverable UI and no storage writes [`apps/web/src/components/app-shell/AppShell.test.tsx`]
- [x] [Review][Patch] Add desktop-to-mobile slow remote fetch regression so late remote success applies with current mobile context and writes autosave-only [`apps/web/src/components/app-shell/AppShell.test.tsx`]
- [x] [Review][Patch] Strengthen pending remote overwrite regression to wait for full remote JSON parsing before asserting manual fallback remains active [`apps/web/src/components/app-shell/AppShell.test.tsx`]

## Dev Notes

### Epic Context

- Epic 15 的 release risk 不在 schema，而在 URL/fetch/dev proxy、AppShell startup priority、mobile storage side effect 和 lossy/error UX。测试要覆盖这些边界，而不是重复 scene-core codec contract。
- Epic 14 已有 mobile manual import 和 inline preview regression suite；本 story 应保证 remote import 不破坏它。

### Test Design Guidance

- 对 remote API 使用 deterministic fixtures。可以用 `encodeSceneDocumentString(createDefaultSceneDocument(...))` 生成 scene string，避免手写 fragile PSE payload。
- 避免硬编码 asset catalog 总数或分页总页数；如果需要 material summary，选择 fixture 中明确放置的少量素材。
- Mobile assertions 应针对当前 shared `ExportPreviewContent` surface，不要恢复 14.1 临时 mobile summary labels。
- 对 layout readiness 保留 `document.documentElement.scrollWidth <= window.innerWidth`，必要时增加 import button、modal actions、inline preview controls 的 bounding box 检查。

### Current Coverage To Preserve

- `AppShell.test.tsx` 已覆盖 desktop/manual import modal、mobile manual import success/invalid/lossy/cancel/close/storage failure、valid/invalid storage、desktop-to-mobile draft 和 keyboard no-op。新增 remote tests 不应删除这些断言。
- `ExportPreview.test.tsx` 已覆盖 desktop modal wrapper 与 inline content boundary、safe text、overall/per-layer materials、layer graphics 和 layer notes。
- `workbench-smoke.spec.ts` 已覆盖 390×844 Mobile Preview Mode、manual import happy path、invalid stored scene 和 no-overflow helper；remote smoke 应在这些基础上新增，不替换。

### Technical Constraints

- 不访问 live `scene-api.pokokit.com`。所有 Playwright remote API 响应用 route/mock。
- 不新增测试库或 browser automation dependency。
- 不放宽 prompt/confirm 断言；remote import 和 manual import 都不应调用 system prompt/confirm，export string prompt 除外。
- 不为通过测试而改业务范围；若发现 API response shape 与 Story 15.1 assumption 不一致，应回到 adapter contract 修正。

## Project Structure Notes

- Likely update files:
  - `apps/web/src/io/remote-scene-import.test.ts`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/e2e/workbench-smoke.spec.ts`
  - `_bmad-output/implementation-artifacts/15-3-remote-import-regression-tests-and-browser-smoke.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Avoid business-code changes unless tests reveal a real regression in Story 15.1/15.2 implementation.

## References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/implementation-artifacts/14-4-mobile-preview-import-regression-tests-and-browser-verification.md`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/io/scene-storage.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-01T10:11:26+0800：按 `bmad-dev-story` 开发 Story 15.3；先审计 Story 15.1 adapter coverage 和 Story 15.2 AppShell coverage，确认 remote tests 使用 mocked fetch/route，不依赖 live API。
- 补充 AppShell regression：desktop network/404/not-found/invalid response/invalid string 不写 storage；desktop 404/not-found 后手动 fallback 导入会清理 stale remote error；mobile remote error 后手动导入进入 `preview-ready`；remote loading 中手动导入后，延迟 remote response 不覆盖用户导入。
- 补充 Playwright smoke：在 production preview server 下用 `page.route()` mock production API endpoint；覆盖 desktop `?scene_id=fixture` 自动导入、desktop not-found failure、mobile remote success/autosave/no desktop controls/no-query storage reload、mobile remote failure/no overflow。Dev proxy endpoint 行为由 adapter/config unit tests 覆盖。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/io/remote-scene-import.test.ts --environment jsdom`：通过，1 file / 7 tests。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`：通过，1 file / 83 tests。
- `pnpm --filter @pokopia-scene-editor/web typecheck`：通过。
- `pnpm --filter @pokopia-scene-editor/scene-core build && pnpm --filter @pokopia-scene-editor/web build`：通过，runtime asset verification passed（1474 references checked）。
- `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "scene_id|remote import|Mobile Preview Mode|import" --project=chromium`：通过，8 tests。
- `pnpm run release:verify`：通过；完整 web smoke 23 tests 通过，scene-core/web tests/build/file-install/runtime asset verification 均通过。
- 2026-06-01T10:11:26+0800：所有 tasks/subtasks 完成，story status 和 sprint tracker 15-3 更新为 `review`。
- 2026-06-01T10:18:10+0800：按 `bmad-code-review` 并行审查 Story 15.3；修复 network/fetch failure component coverage、desktop-to-mobile pending fetch regression、manual fallback stale toast/lossy cancel regressions，并将 story status 推进到 `done`。

### Completion Notes List

- Adapter/config coverage 已覆盖 dev proxy endpoint、production endpoint、proxy Origin header strategy、invalid query 和 invalid response；production client fetch options 不手写 Origin。
- AppShell component tests 覆盖 no-query baseline、desktop/mobile remote success/failure、network failure、invalid response、invalid scene string、lossy confirmation、manual fallback recovery、pending remote stale response 和 pending remote resize context。
- Playwright remote smoke 使用 deterministic `encodeSceneDocumentString(createDefaultSceneDocument(...))` fixture；通过 production API route mock，未访问 live `scene-api.pokokit.com`。Dev proxy route/header behavior 由 `remote-scene-import.test.ts` 覆盖。
- Desktop Playwright 覆盖自动导入后的 workbench scene name、Pokemon，以及下载预览中的 material/export summary 关键内容。
- Mobile Playwright 覆盖 remote import inline preview、autosave-only、无 desktop controls、无 query 时从 storage 读取，以及 remote failure 的 recoverable error UI。
- Existing Epic 14 mobile manual import、storage preview 和 invalid storage smoke 继续通过；未弱化既有断言。
- 顶层 `release:verify` 已通过；当前剩余风险为未执行真实线上 API/browser CORS smoke，因本 story 要求 remote tests 使用 mock 而不访问 live API。

### File List

- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/io/remote-scene-import-config.ts`
- `apps/web/src/io/remote-scene-import.ts`
- `apps/web/src/io/remote-scene-import.test.ts`
- `_bmad-output/implementation-artifacts/15-2-appshell-scene-id-startup-import-flow.md`
- `_bmad-output/implementation-artifacts/15-3-remote-import-regression-tests-and-browser-smoke.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-06-01: Story created from approved Epic 15 course correction.
- 2026-06-01: Added remote import regression coverage, Playwright desktop/mobile smoke and release verification; status moved to review.
- 2026-06-01: Addressed code review coverage and regression findings; status moved to done.

## Senior Developer Review (AI)

Review date: 2026-06-01
Reviewer: GPT-5 Codex with parallel Blind Hunter, Edge Case Hunter, and Acceptance Auditor agents
Decision: Approved after fixes.

### Findings Addressed

- Fixed Story 15.3 component coverage gap for desktop network/fetch failures.
- Fixed review-record wording so dev proxy coverage is attributed to adapter/config tests rather than Playwright preview smoke.
- Fixed missing regression coverage for pending remote fetch resolving after desktop-to-mobile resize.
- Strengthened pending remote overwrite test to wait until remote response JSON parsing is reached before asserting manual fallback remains active.
- Confirmed untracked Story 15.1 adapter files and BMAD artifacts are part of final commit scope.

### Verification Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/io/remote-scene-import.test.ts --environment jsdom` (7 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (83 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: `pnpm --filter @pokopia-scene-editor/scene-core build && pnpm --filter @pokopia-scene-editor/web build`
- PASS: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "scene_id|remote import|Mobile Preview Mode|import" --project=chromium` (8 tests)
- PASS: `pnpm run release:verify`
