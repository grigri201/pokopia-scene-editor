---
story_id: 16.1
story_key: 16-1-building-layer-drag-reorder-and-autosave
epic: 16
status: done
created: 2026-06-02
source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-building-layer-reorder.md
---

# Story 16.1: 左侧建筑层拖动排序与自动保存

## Story

As a 布景编辑用户, I want 通过拖动左侧建筑层行调整层级顺序, So that 我可以快速修正布景层级而不需要删除重建建筑层。

## Acceptance Criteria

1. 左侧建筑层面板为每一层提供可识别的拖动 handle，read-only/mobile 状态禁用排序。
2. 拖动过程中列表显示目标顺序预览；预览状态不写入 `SceneDocument`、autosave、saved storage 或 UI preferences。
3. Drop 完成后通过 command layer 提交排序，重排 `buildingLevels[].levelNumber`，保持 level id、层名、层备注、实例引用和技能标记引用不变。
4. 当前层按 `currentBuildingLevelId` 保持为同一层；排序后 display id 按新的 `levelNumber` 更新。
5. 成功排序后触发现有 autosave，刷新后恢复为新顺序；取消拖动或无变化 drop 不写 storage。
6. 支持键盘可达的排序 fallback，例如上移/下移按钮，并提供清晰 aria label / live announcement。
7. Focused tests 覆盖 domain reorder、read-only no-op、drag preview no persistence、drop autosave、keyboard fallback 和 existing layer create/copy/delete/rename regression。

## Tasks / Subtasks

- [x] Add building layer reorder command support (AC: 3, 4)
  - [x] Add `reorder` input to `editBuildingLayer()`.
  - [x] Preserve level ids, layer names, notes, tile instance refs, skill marker refs, and current level id.
  - [x] Treat same-order drops as no-op and avoid dirty metadata changes.
- [x] Add BuildingLevelPanel drag preview and keyboard fallback (AC: 1, 2, 6)
  - [x] Add drag handles and transient preview order state.
  - [x] Disable reorder in read-only/mobile mode.
  - [x] Add up/down accessible controls and live announcements.
- [x] Wire AppShell autosave behavior (AC: 5)
  - [x] Dispatch reorder command on drop / keyboard reorder.
  - [x] Rely on existing autosave effect only after committed scene updates.
- [x] Update i18n and styles (AC: 1, 2, 6)
  - [x] Add zh-CN/en-US labels and announcements.
  - [x] Add stable dimensions for handles/buttons and drag preview states.
- [x] Add focused tests (AC: 1-7)
  - [x] Domain tests for reorder and no-op/read-only behavior.
  - [x] Panel tests for drag preview, drop, read-only disabled state, and keyboard fallback.
  - [x] AppShell/autosave test for committed reorder persistence.
  - [x] Existing layer create/copy/delete/rename tests continue to pass.

## Dev Notes

- `BuildingLevelPanel` currently renders rows from `BuildingLevelContext[]` in high-to-low display order and has handlers for create/select/rename/copy/delete only.
- `editBuildingLayer()` in `apps/web/src/state/building-layer-edit.ts` is the correct command layer for level mutations. Do not mutate `SceneDocument` directly in React components.
- `packages/scene-core/src/domain/scene/levels.ts` already has `resequenceBuildingLevels()` and display/render sort helpers. Drop should commit a render-order sequence and then resequence `levelNumber` from 0 upward.
- Current visual display order is high-to-low; data/render order remains 0-to-n. Be explicit when converting between display order and committed render order.
- Drag preview is local component state only. It must not update AppShell scene state or browser storage until drop.
- Autosave already happens in `AppShell` after scene state changes via `writeSceneDocumentToStorage(storage, scene, "autosave")`.
- Preserve `SceneDocument v1`; do not add schema fields or `SceneDocument v2`.
- Mobile/read-only must remain edit-disabled.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-02: Story created from approved BMAD course correction.
- 2026-06-02: Development started.
- 2026-06-02: Added `editBuildingLayer({ type: "reorder" })` and focused domain tests for stable references, no-op drops, and invalid orders.
- 2026-06-02: Added BuildingLevelPanel drag preview state, drag handle, up/down keyboard fallback, i18n labels, stable row/button styles, and AppShell reorder wiring.
- 2026-06-02: Added AppShell autosave integration coverage for committed reorder persistence.
- 2026-06-02: `pnpm --filter @pokopia-scene-editor/web test src/state/building-layer-edit.test.ts src/components/building-level-panel/BuildingLevelPanel.test.tsx src/components/app-shell/AppShell.test.tsx` passed: 3 files / 107 tests.
- 2026-06-02: `pnpm --filter @pokopia-scene-editor/web test` passed: 19 files / 273 tests.
- 2026-06-02: `pnpm --filter @pokopia-scene-editor/web typecheck` passed.
- 2026-06-02: First `pnpm --filter @pokopia-scene-editor/web build` built Vite output but failed runtime asset verification because scene-core dist was older than source files; ran `pnpm --filter @pokopia-scene-editor/scene-core build`.
- 2026-06-02: Re-ran `pnpm --filter @pokopia-scene-editor/web build`; passed, runtime asset verification checked 1474 references.
- 2026-06-02: Started Vite on `http://127.0.0.1:5174/` after 5173 was occupied; Playwright smoke with `@playwright/test` created two layers, moved L3 down, and confirmed autosave order `level-0:0|level-2:1|level-1:2`.
- 2026-06-02: Code review found stale drop-target risk, repeated live-announcement risk, and AppShell storage coverage gaps.
- 2026-06-02: Fixed drop commit to calculate from the actual drop target, reset live announcements before replaying the same text, and added AppShell storage/refresh/no-op coverage.
- 2026-06-02: Re-ran focused tests after review fixes; `pnpm --filter @pokopia-scene-editor/web test src/state/building-layer-edit.test.ts src/components/building-level-panel/BuildingLevelPanel.test.tsx src/components/app-shell/AppShell.test.tsx` passed: 3 files / 109 tests.
- 2026-06-02: `pnpm --filter @pokopia-scene-editor/web test` passed: 19 files / 275 tests.
- 2026-06-02: `pnpm --filter @pokopia-scene-editor/web typecheck` passed.
- 2026-06-02: `pnpm --filter @pokopia-scene-editor/web build` passed; runtime asset verification checked 1474 references.

### Completion Notes

- Left Building Level Panel now exposes a drag handle per row plus up/down accessible reorder controls.
- Dragging only changes component-local preview order until drop; no AppShell scene update or storage write happens during preview.
- Drop and keyboard reorder call the existing building-layer command path; `SceneDocument v1` is unchanged and only `buildingLevels[].levelNumber` is resequenced.
- Stable layer ids, names, notes, tile instance refs, skill marker refs, and current layer id are preserved.
- Existing autosave effect persists committed reorder and refresh recovery uses the new order.
- Mobile/read-only mode disables reorder controls.
- Review follow-ups are complete; story status moved to done.

### File List

- `_bmad-output/implementation-artifacts/16-1-building-layer-drag-reorder-and-autosave.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-building-layer-reorder.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `apps/web/src/state/building-layer-edit.ts`
- `apps/web/src/state/building-layer-edit.test.ts`
- `apps/web/src/components/building-level-panel/BuildingLevelPanel.tsx`
- `apps/web/src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-02: Story created and marked ready-for-dev.
- 2026-06-02: Story moved to in-progress for implementation.
- 2026-06-02: Implemented building layer drag reorder, keyboard fallback, autosave integration, planning sync, and focused verification; status moved to review.
- 2026-06-02: Addressed code review findings, expanded storage/refresh regression coverage, completed final verification; status moved to done.

## Senior Developer Review (AI)

### Review Outcome

Approve

### Review Summary

- Edge Case Hunter found stale drop-target risk and repeated live-announcement replay risk in `BuildingLevelPanel`.
- Blind Hunter found a low-severity AppShell storage coverage gap for drag preview/no-op behavior.
- Acceptance Auditor found AC 5 / AC 7 storage and refresh recovery evidence incomplete before follow-up fixes.

### Review Follow-ups (AI)

- [x] Recompute committed drag order from the actual drop target instead of relying on the latest preview state.
- [x] Replay identical live announcement text by clearing the live region before setting the next announcement.
- [x] Add AppShell-level storage assertions for drag preview, committed reorder autosave payload, refresh recovery, canceled drag, and same-order drop.
- [x] Re-run focused, full web, typecheck, and build verification after review fixes.
