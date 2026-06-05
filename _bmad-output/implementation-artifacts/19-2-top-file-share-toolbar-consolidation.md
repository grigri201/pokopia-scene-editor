# Story 19.2: 顶部文件/分享工具栏收敛

Status: done

## Story

As a desktop 编辑用户, I want 顶部只保留高频预览/导出入口并把低频文件操作收进菜单, So that 首屏横向动作区更容易扫描且危险操作不易误触。

## Acceptance Criteria

1. 1280px desktop 下顶部不再平铺导出字符串、导入字符串、下载预览、语言、重置五类操作。
2. “预览/导出”或“分享预览”作为高频主入口，1 步打开独立预览/导出模式。
3. “导出字符串 / 导入字符串 / 重置”仍可在 1-2 步内访问。
4. “重置”在视觉、分组和确认流程上作为危险操作处理。
5. 菜单支持 Escape、点击外部关闭、焦点进入/返回、aria-label、aria-expanded 和键盘导航。
6. 不改变导入/导出字符串业务语义。

## Tasks / Subtasks

- [x] Consolidate desktop header actions in AppShell. (AC: 1-4)
  - [x] Keep the preview/export action as the visible high-frequency header button.
  - [x] Move export string, import string and reset into a low-frequency file/actions menu.
  - [x] Keep language selection visible but low visual weight in the header.
  - [x] Preserve existing reset confirmation and dangerous styling inside the menu.
- [x] Implement accessible menu behavior. (AC: 3, 5)
  - [x] Add menu open state and refs in AppShell as UI-only React state.
  - [x] Support Escape close, outside-click close and focus return to the trigger.
  - [x] Add aria-label, aria-haspopup, aria-expanded, role/menu semantics or an equivalent keyboard-accessible button group.
  - [x] Ensure menu items remain reachable by keyboard and disabled/read-only paths do not expose desktop edit actions on mobile read-only mode.
- [x] Preserve scene string and export semantics. (AC: 2, 3, 6)
  - [x] Existing export string still calls `encodeSceneDocumentString()` and writes no storage.
  - [x] Existing import modal flow still restores scene settings and writes only the expected scene autosave/snapshot path.
  - [x] Existing image preview/export dialog still opens from a single visible header action and writes no scene/autosave/UI preference storage.
- [x] Update focused tests. (AC: 1-6)
  - [x] Update AppShell tests that currently query the flat header actions.
  - [x] Add menu open/close/focus tests for Escape and outside click.
  - [x] Add reset grouping/confirmation and import/export-string accessibility assertions.
  - [x] Keep image export preview and locale persistence tests passing.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 19 / Story 19.2.
- Approved proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-05-desktop-workbench-decluttering.md`.
- PRD states Epic 19 keeps `SceneDocument v1`; file menu state must not enter SceneDocument, scene autosave/saved payload, PSE string, export payload, export summary or `packages/scene-core`.
- UX states the top toolbar should keep only the preview/export primary entry and a low-visual-weight language control; export string, import string and reset move into file/more actions, with reset as a dangerous action and confirmation.
- Architecture assigns this story to `apps/web/src/components/app-shell/` and preserves `ExportPreview` / `MobilePreviewMode` content.

### Existing Implementation Map

- `apps/web/src/components/app-shell/AppShell.tsx`
  - Current header renders `exportSceneString`, `openSceneStringImportModal`, `openExportPreview`, language select and `deleteCurrentScene` as flat actions.
  - `exportSceneString()` uses `encodeSceneDocumentString(scene)` and `window.prompt()`; it shows the string toast and does not write scene storage.
  - `openSceneStringImportModal()` opens `SceneStringImportModal`; submit flow validates/recovery-applies imported scene and preserves existing lossy recovery behavior.
  - `openExportPreview()` builds `buildImageExportSummary(scene, locale)` and opens `ExportPreview`; download handlers use `createImageExportFile()` / `createLayeredImageExportFiles()`.
  - `deleteCurrentScene()` keeps the existing `window.confirm(t(locale, 'resetConfirm'))` guard. Do not weaken this.
- `apps/web/src/styles.css`
  - Header classes are `.app-header`, `.app-header__actions`, `.language-control`, `.app-action-button`, `.app-action-button--danger`.
  - Keep dimensions stable around 1280px desktop; avoid widening the header with long English labels.
- `apps/web/src/i18n/index.ts`
  - Existing labels: `exportSceneString`, `importSceneString`, `exportPreview`, `reset`, `resetSceneTitle`, `language`.
  - Add any menu labels in both `zh-CN` and `en-US`.
- `apps/web/src/components/app-shell/AppShell.test.tsx`
  - Existing tests assert flat buttons by role/name and will need updates.
  - Preserve tests proving export preview/storage behavior, locale UI preference persistence and mobile read-only absence of desktop actions.

### Previous Story Intelligence

- Story 19.1 completed planning sync only and intentionally changed no runtime code.
- Its core boundary remains binding for this story: UI-only header/menu state must not touch `SceneDocument v1`, PSE strings, scene autosave/saved storage, export summary, `packages/scene-core`, or Cloudflare deployment.
- Files already synchronized for Epic 19 include PRD, UX, Architecture, Epics, sprint-status and `docs/功能验收-checklist.md`.

### Technical Constraints

- Use existing React 19 / Vite / Vitest / Testing Library stack from the repo; do not add menu, focus-trap, state or UI libraries.
- Keep implementation inside `apps/web` unless a test reveals an existing helper needs a narrowly scoped addition.
- Do not modify `packages/scene-core` for this story.
- Menu open/close state is transient UI state. It should not be persisted to `uiPreferencesStorageKey`.
- The mobile read-only mode must continue to omit desktop export string, download preview and workbench controls; mobile import remains through `MobilePreviewMode`.

### Testing Requirements

- Focused command: `pnpm --filter @pokopia-scene-editor/web test -- AppShell`.
- If i18n or type signatures change, also run `pnpm --filter @pokopia-scene-editor/web typecheck`.
- For this story, no scene-core test should be necessary unless implementation unexpectedly touches shared state/domain rules.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-05: Created comprehensive story context from Epic 19 planning artifacts, existing AppShell implementation and Story 19.1 boundary notes.
- 2026-06-05: Added failing AppShell assertions for the collapsed header file menu, keyboard/focus behavior and dangerous reset grouping.
- 2026-06-05: Implemented the AppShell file-actions menu as transient React UI state and kept preview/export as the visible primary action.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx` passed: 20 files, 300 tests.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web typecheck` passed.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web build` passed, including runtime asset verification.
- 2026-06-05: Ran BMAD code review layers: Blind Hunter, Edge Case Hunter and Acceptance Auditor.
- 2026-06-05: Resolved review findings for primary button label-in-name, menu action/outside-click focus return, Tab close behavior, read-only resize cleanup and desktop import test helper coverage.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx`: 20 files, 300 tests.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web typecheck` and `pnpm --filter @pokopia-scene-editor/web build`.

### Completion Notes

- Desktop header now exposes one primary visible preview/export action plus language and a compact file-actions menu.
- Export string, import string and reset remain available from the menu; reset keeps the existing confirmation and dangerous styling.
- Menu supports aria menu semantics, `aria-expanded`, first-item focus on open, ArrowUp/ArrowDown/Home/End movement, Escape close with focus return and outside-click close.
- Code-review follow-ups now also cover label-in-name, Tab close, outside-click/action focus return, and mobile/read-only menu state cleanup.
- Scene string export/import and image preview/export storage semantics are unchanged.

## Senior Developer Review (AI)

### Review Outcome

Approved after fixes.

### Review Findings

- [x] [Review][Patch] Primary preview/export button accessible name must include the visible label. Fixed by removing the old `exportPreview` aria override so the visible `previewExportAction` text is the accessible name.
- [x] [Review][Patch] Menu close/focus return was incomplete for menu-item execution and outside-click close. Fixed by restoring focus for non-modal menu actions and outside-click close.
- [x] [Review][Patch] Menu stayed open when focus left via Tab. Fixed by closing the menu on Tab while allowing normal focus movement.
- [x] [Review][Patch] Menu open state could survive resize into mobile/read-only and reopen later. Fixed by clearing the menu when `isReadOnly` becomes true.
- [x] [Review][Patch] Desktop import tests could pass through a flat import button if it regressed. Fixed helper routing so desktop import tests require the file-actions menu when the menu trigger exists.

### File List

- `_bmad-output/implementation-artifacts/19-2-top-file-share-toolbar-consolidation.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-05: Story created and marked ready-for-dev.
- 2026-06-05: Implemented and verified top file/share toolbar consolidation; story marked review.
- 2026-06-05: Addressed BMAD code review findings and marked story done.
