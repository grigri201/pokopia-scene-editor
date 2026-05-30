# Story 13.5: Web/Core 复杂度与代码量收敛

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want 在不改变用户可见行为的前提下降低 Web 和 core 的复杂度,
so that 后续功能和 bugfix 不再集中到少数超大文件。

## Acceptance Criteria

1. 至少拆分一个 Web 热点文件，优先 `apps/web/src/components/app-shell/AppShell.tsx`；拆分后原文件不再继续承载可独立维护的纯 helper/type/constant。
2. 若 `styles.css` 或大型 component tests 暂不拆分，必须在 story Dev Notes/Completion Notes 中说明原因和后续边界；不得为了满足形式拆出难维护的 CSS/test 碎片。
3. 可共享领域逻辑继续保留在 `scene-core`；Web-only 展示、帮助 overlay、toast、runtime/test helper 等逻辑可以收敛到 web-local helper。不得把 catalog、dimension、footprint、stacking、translation 事实复制进 Web local fixtures。
4. 删除或隔离不再可达的 Worker-only compatibility wrappers / obsolete fixtures；如果本 story 未发现可删除项，必须记录检查结果。
5. 保持 `SceneDocument v1` payload、storage key、autosave/recovery、scene string import/export、image export 和移动 read-only 行为不变。
6. 每个拆分点必须有 focused tests 或 existing tests 证明行为不变。

## Tasks / Subtasks

- [x] 拆分 AppShell 纯 helper (AC: 1, 3, 5)
  - [x] 将 help overlay target/layout 类型、常量和几何函数拆到 `apps/web/src/components/app-shell/help-guide.ts`。
  - [x] 将 AppShell runtime utilities（local preview host、performance marks、timestamp/id、recovery title/message、dropped tile formatting 等）拆到 `apps/web/src/components/app-shell/app-shell-helpers.ts` 或同等文件。
  - [x] 保持 `AppShell.tsx` JSX、state ownership 和 command wiring 不变；不要在本 story 改 UI copy、CSS class、storage key 或 action payload。
- [x] 检查 dead code / obsolete fixture (AC: 4)
  - [x] 搜索 Worker/MCP/skill 残留或 obsolete compatibility wrappers，确认 13.3 后没有 Web/core 可删除代码。
  - [x] 若发现只属于 Story 13.6 的测试常量去配置耦合，不在本 story 大范围改动，记录给后续。
- [x] 记录 CSS/test 拆分边界 (AC: 2, 6)
  - [x] 在 Completion Notes 说明 `styles.css` / 大型 component tests 是否本 story 拆分；若不拆，说明风险和后续建议。
  - [x] 不新增无行为收益的 CSS/test 碎片。
- [x] 验证 (AC: 1-6)
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/web test src/components/app-shell/AppShell.test.tsx`
  - [x] `pnpm --filter @pokopia-scene-editor/web test src/components/scene-canvas/SceneCanvas.test.tsx src/components/export-preview/ExportPreview.test.tsx`
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
  - [x] `git diff --check`

### Review Findings

- [x] [Review][Patch] Completion Notes 未记录 CSS/test 拆分边界与 dead-code 检查 [`_bmad-output/implementation-artifacts/13-5-web-core-complexity-and-code-volume-reduction.md`] - fixed by recording the CSS/test split boundary and Worker/MCP/skill residual search result.
- [x] [Review][Patch] 缺少 focused/existing tests 证据，无法证明敏感行为不变 [`_bmad-output/implementation-artifacts/13-5-web-core-complexity-and-code-volume-reduction.md`] - fixed by recording the focused verification commands and coverage mapping.
- [x] [Review][Patch] AppShell 仍保留明显可独立维护的 pure helper [`apps/web/src/components/app-shell/AppShell.tsx`] - fixed by moving `isMobileReadOnlyApplicationKey` to `app-shell-helpers.ts`.
- [x] [Review][Patch] Dev Agent Record/File List 未反映实际 staged implementation [`_bmad-output/implementation-artifacts/13-5-web-core-complexity-and-code-volume-reduction.md`] - fixed by updating Debug Log, Completion Notes and File List.

## Dev Notes

### Current State

- `apps/web/src/components/app-shell/AppShell.tsx` is about 2,171 lines. It mixes state ownership, command wiring, JSX, help overlay geometry, recovery text helpers, id/timestamp helpers, local preview/test helpers, storage access and scene-string dropped-tile formatting.
- `apps/web/src/styles.css` is about 3,334 lines. It is a real hotspot, but splitting CSS without a component/module CSS strategy risks cascade/order regressions. Prefer leaving CSS intact unless a scoped, low-risk section is obvious.
- Large tests include `AppShell.test.tsx`, `SceneCanvas.test.tsx`, `ExportPreview.test.tsx` and `SelectionInspector.test.tsx`. Broad test deduplication is adjacent to Story 13.6 and should not be mixed into this story unless needed for the chosen AppShell split.
- Previous Story 13.3 removed Worker/API/MCP/skill code. Do not restore any of that surface while searching for obsolete wrappers.

### Implementation Guardrails

- Keep React state, effects, callbacks and JSX structure in `AppShell.tsx`; move only pure helpers/constants/types unless a stronger local seam is obvious and covered.
- Do not change `SceneDocument v1`, storage keys, localStorage migration behavior, command action names, data-testid values, aria labels, CSS class names or public URLs.
- Keep helper modules web-local under `apps/web/src/components/app-shell/`; do not add `scene-core` dependencies for browser-only behavior.
- If moving a helper reveals a circular dependency or test fragility, stop and choose a smaller pure-helper extraction.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 13.5 AC and FR110/FR113/FR114 scope.
- `_bmad-output/implementation-artifacts/13-4-resource-data-single-source-of-truth-cleanup.md` - data SSoT boundaries and runtime asset guard.
- `docs/data-source-of-truth.md` - current data owner map; do not duplicate business facts into Web.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-30T12:49:57+0800 - Created story from Epic 13.5 and moved tracker to `ready-for-dev`.
- 2026-05-30T12:50:27+0800 - Started `bmad-dev-story`; tracker moved to `in-progress`.
- 2026-05-30T12:54:00+0800 - Extracted help-guide geometry/target data and AppShell web-local helpers from `AppShell.tsx`.
- 2026-05-30T13:11:36+0800 - Addressed review findings by moving the remaining mobile read-only key helper and completing story evidence.
- 2026-05-30T13:15:02+0800 - Review layers completed; blind and edge-case reviews were clean after patches, and tracker moved to `done`.

### Completion Notes List

- `AppShell.tsx` remains the owner of React state, effects, command wiring and JSX, while helper/type/constant logic moved to `help-guide.ts` and `app-shell-helpers.ts`.
- `AppShell.tsx` line count dropped from about 2,171 to about 1,700 lines after extracting help overlay geometry, scene-string dropped-tile formatting, recovery text helpers, browser storage/runtime helpers, performance marks, ids and mobile read-only key detection.
- `styles.css` was intentionally not split in this story because the file is a cascade/order hotspot and there is no component CSS-module boundary yet; a future CSS split should first define section ownership and visual regression coverage.
- Large component tests were intentionally not split here because Story 13.6 owns test-data/release-gate cleanup; this story relies on existing behavior tests rather than creating low-value fragmented test files.
- Dead-code search found no active Worker/MCP/skill runtime/config remnants under `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts`, `apps` or `packages`. Remaining Worker/MCP references are handoff/history docs or BMAD workflow text, not active compatibility wrappers.
- Existing focused tests cover the sensitive unchanged behavior: AppShell tests cover autosave/recovery, storage payload cleanliness, scene string import/export loss reporting, image export preview/download and mobile read-only keyboard behavior; SceneCanvas and ExportPreview tests cover canvas/editability and export preview behavior.
- Verified commands:
  - `pnpm --filter @pokopia-scene-editor/web typecheck`
  - `pnpm --filter @pokopia-scene-editor/web test src/components/app-shell/AppShell.test.tsx` (59 passed)
  - `pnpm --filter @pokopia-scene-editor/web test src/components/scene-canvas/SceneCanvas.test.tsx src/components/export-preview/ExportPreview.test.tsx` (41 passed)
  - `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
  - `git diff --check`

### File List

- `_bmad-output/implementation-artifacts/13-5-web-core-complexity-and-code-volume-reduction.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/app-shell-helpers.ts`
- `apps/web/src/components/app-shell/help-guide.ts`

### Change Log

- 2026-05-30: Created Story 13.5.
- 2026-05-30: Split AppShell helpers and recorded review/verification evidence.
