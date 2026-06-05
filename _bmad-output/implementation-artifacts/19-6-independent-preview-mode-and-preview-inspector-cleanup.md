# Story 19.6: 独立预览模式与 PreviewInspector 清理

Status: done

## Story

As a desktop 编辑用户, I want 通过独立入口进入预览/导出模式, So that 编辑态保持专注但我仍能检查整体和逐层导出内容。

## Acceptance Criteria

1. Desktop 工作台不再常驻显示 PreviewInspector。
2. 预览/导出入口打开独立模式、modal 或页面内切换模式。
3. 独立预览展示整体素材清单、逐层图形、逐层素材清单和层备注。
4. 支持下载整体图片和按层下载图片。
5. `ExportPreview` / `MobilePreviewMode` 已有内容不回退。
6. 删除或废弃 `PreviewInspector` 组件、测试、样式、i18n 和规划文档旧描述。
7. `docs/功能验收-checklist.md` 中“预览检查器”改为“独立预览/导出模式”验收。
8. 预览模式不写 SceneDocument、不触发 scene autosave、不保存 export summary。

## Tasks / Subtasks

- [x] Confirm independent preview entry remains the supported desktop path. (AC: 1-4, 8)
  - [x] Keep top `预览/导出` / `Preview / export` action opening `ExportPreview` modal.
  - [x] Ensure modal content includes overall material list, per-layer graphics, per-layer material lists and layer notes.
  - [x] Ensure modal actions include overall image download and layered image download.
  - [x] Verify open/close/download-preview path does not write SceneDocument, autosave, saved storage, UI preferences or export-summary cache.
- [x] Remove or deprecate PreviewInspector implementation surface. (AC: 1, 5, 6)
  - [x] Remove unused `apps/web/src/components/preview-inspector/` component and tests if no imports remain.
  - [x] Remove PreviewInspector-only i18n keys that are no longer referenced.
  - [x] Remove PreviewInspector-only styles if no longer referenced by `ExportPreview`, `SceneCanvas`, or other components.
  - [x] Keep `ExportPreview`, `MobilePreviewMode`, scene-core selectors and export summary behavior intact.
- [x] Update planning/checklist wording away from old PreviewInspector baseline. (AC: 6, 7)
  - [x] Replace stale planning references that still map preview to the removed component where they conflict with Epic 19.
  - [x] Keep historical proposal evidence text as historical only unless it asserts current implementation target.
  - [x] Ensure `docs/功能验收-checklist.md` uses independent preview/export terminology.
- [x] Update focused tests. (AC: 1-8)
  - [x] Keep AppShell coverage proving no constant `检查器预览` complementary region in desktop workbench.
  - [x] Keep AppShell coverage proving `预览/导出` opens the modal and does not write storage.
  - [x] Keep ExportPreview coverage proving shared content parity with inline/mobile content and download actions.
  - [x] Remove obsolete PreviewInspector tests once the component is removed.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 19 / Story 19.6.
- PRD FR136 says desktop must not constantly display PreviewInspector; preview/export must be independent mode, modal, or page switch and support overall materials, layer graphics/materials, overall image download and layered downloads.
- Architecture says `preview-inspector/` is no longer a desktop edit-workbench component and should be removed or deprecated during Epic 19; preview content continues through `export-preview/` and `mobile-preview-mode.tsx`.
- UX says preview/export is a top independent entry, while the editing workspace remains focused on current-layer editing.

### Existing Implementation Map

- `apps/web/src/components/app-shell/AppShell.tsx`
  - Already owns top `预览/导出` action and `exportPreviewSummary` local state.
  - `openExportPreview()` derives `buildImageExportSummary(scene, locale)` and renders `ExportPreview` when summary is non-null.
  - No current `PreviewInspector` import was found in AppShell; keep that invariant explicit in tests.
- `apps/web/src/components/export-preview/ExportPreview.tsx`
  - Owns desktop modal wrapper and shared `ExportPreviewContent`.
  - Already renders overall materials, per-layer graphics/material lists, layer notes and footer from `ImageExportSummary`.
  - Actions include `downloadImage` and `downloadLayerImages` when callbacks are supplied.
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx`
  - Reuses `ExportPreviewContent` inline for mobile preview/import surface.
  - Must not regress while removing the old PreviewInspector component.
- `apps/web/src/components/preview-inspector/`
  - Still contains an unused component/test suite for old top/front inspector previews.
  - Remove this directory only after confirming no app imports remain.
- `packages/scene-core/src/domain/scene/selectors.ts`
  - Still exposes preview selector types/functions used by old tests and possibly domain tests.
  - Do not remove scene-core selectors in this story unless there is a verified no-import cleanup path; this story can remove only the web component surface.

### Technical Constraints

- Do not change `SceneDocument v1`, scene-core placement/occupancy/stacking rules, PSE codec, export summary schema, Worker routes, or Cloudflare deployment behavior.
- Preview/export state can remain React-local and scene-derived; it must not be written to scene storage, UI preferences, PSE strings or export summary cache.
- Preserve `ExportPreviewContent` desktop/modal and mobile/inline parity.
- Remove stale code cautiously: styles/classes reused by export preview or canvas must stay.

### Testing Requirements

- `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx src/components/export-preview/ExportPreview.test.tsx`
- `pnpm --filter @pokopia-scene-editor/web typecheck`
- `pnpm --filter @pokopia-scene-editor/web build`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-05: Created story context from Epic 19 AC, AppShell independent export preview state, shared ExportPreview content and unused PreviewInspector component surface.
- 2026-06-05: Started implementation.
- 2026-06-06: Deleted unused web PreviewInspector component and tests.
- 2026-06-06: Removed PreviewInspector-only i18n keys and CSS rules.
- 2026-06-06: Updated PRD, Architecture, UX and acceptance checklist wording to map preview to independent ExportPreview/MobilePreviewMode paths.
- 2026-06-06: Verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx src/components/export-preview/ExportPreview.test.tsx`: 19 files, 298 tests.
- 2026-06-06: Verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-06: Verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.
- 2026-06-06: Reviewed with multi-agent code review; fixed stale current PRD/Architecture/checklist preview wording, removed leftover `.preview-stacking-split*` CSS selectors, added layered-download storage boundary assertions and expanded story traceability.
- 2026-06-06: Re-verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx src/components/export-preview/ExportPreview.test.tsx`: 19 files, 298 tests.
- 2026-06-06: Re-verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-06: Re-verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.

### Completion Notes

- Desktop preview/export remains the top-level independent modal entry.
- `ExportPreview` and `MobilePreviewMode` continue to share `ExportPreviewContent`.
- The old web PreviewInspector component surface, tests, i18n keys and CSS are removed.
- Current planning/checklist docs no longer map active preview behavior to the old component.

## Senior Developer Review (AI)

Completed.

- P2: Replaced stale current PRD / Architecture / checklist references to old constant preview surfaces with independent preview/export wording.
- P3: Removed leftover `.preview-stacking-split*` CSS selectors that only applied to the removed web PreviewInspector.
- P3: Added storage-boundary assertions for layered image download and expanded story file-list traceability.

### File List

- `_bmad-output/implementation-artifacts/19-6-independent-preview-mode-and-preview-inspector-cleanup.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `docs/功能验收-checklist.md`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/export-preview/ExportPreview.tsx`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/src/components/preview-inspector/PreviewInspector.tsx`
- `apps/web/src/components/preview-inspector/PreviewInspector.test.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-05: Story created and marked ready-for-dev.
- 2026-06-05: Story marked in-progress.
- 2026-06-06: Implemented and verified independent preview cleanup; story marked review.
- 2026-06-06: Fixed review findings, re-verified, and marked done.
