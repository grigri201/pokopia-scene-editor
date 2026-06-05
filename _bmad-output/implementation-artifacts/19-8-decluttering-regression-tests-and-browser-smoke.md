# Story 19.8: 降噪回归测试与浏览器布局验证

Status: done

## Story

As a 维护者, I want Desktop 降噪改造有 focused tests 和 viewport smoke, So that UI 收敛不会破坏现有编辑、导入、导出、暂存、排序和 mobile preview。

## Acceptance Criteria

1. AppShell tests 覆盖顶部菜单焦点管理、危险重置分组、导入/导出字符串仍可访问、预览/导出入口仍可打开。
2. BuildingLevelPanel / Scene summary tests 覆盖摘要展开、UI-only persistence、建筑层排序不回退。
3. SelectionInspector tests 覆盖快捷栏、详情区、只读模式、层备注保留。
4. AssetPicker tests 覆盖可见详情入口、详情不选择素材、staging 边界不回退。
5. SceneCanvas tests 覆盖 lower-layer ghost 渲染层级和不参与交互/placement semantics。
6. ExportPreview / MobilePreviewMode tests 继续证明 desktop modal 和 mobile inline content 一致。
7. Playwright 覆盖 1280x720 desktop、1000px tablet 和 390x844 mobile：无重叠、桌面可编辑、mobile 不出现编辑工作台。
8. 验证命令至少包含 web focused tests、scene-core focused tests、web typecheck、web build 和 desktop/mobile smoke。

## Tasks / Subtasks

- [x] Audit Epic 19 regression coverage and identify gaps. (AC: 1-6)
  - [x] Review current AppShell, BuildingLevelPanel, PokemonSceneControls, SelectionInspector, AssetPicker, SceneCanvas, ExportPreview and MobilePreviewMode focused tests.
  - [x] Avoid duplicating tests already added by Stories 19.2-19.7; add only missing regression assertions.
  - [x] Keep all new assertions tied to visible user behavior or UI-only storage boundaries.
- [x] Fill focused test gaps for desktop decluttering surfaces. (AC: 1-6)
  - [x] Ensure AppShell tests cover file menu focus/escape/outside-click/resize, dangerous reset grouping, string import/export and preview/export entry.
  - [x] Ensure scene summary and building-layer tests cover UI-only persistence and drag/reorder regressions.
  - [x] Ensure SelectionInspector tests cover compact quick bar, expandable details, read-only mode and layer notes.
  - [x] Ensure AssetPicker tests cover visible detail entry, detail browsing without selection and staging persistence boundaries.
  - [x] Ensure SceneCanvas tests cover lower-layer ghost visual layer, read-only gating, interaction pass-through and placement semantics.
  - [x] Ensure ExportPreview/MobilePreviewMode tests cover shared content parity after PreviewInspector removal.
- [x] Extend Playwright viewport smoke. (AC: 7)
  - [x] Cover 1280x720 desktop edit workbench with no horizontal overflow and no PreviewInspector.
  - [x] Cover 1000px tablet edit workbench with no overlapping primary panels and usable asset/canvas surfaces.
  - [x] Cover 390x844 mobile preview mode with no desktop editing workbench, no asset picker/staging/editor controls and accessible import/inline preview paths.
  - [x] Add layout overlap checks that fail on incoherent bounding-box overlap while allowing intentional modal overlays.
- [x] Run and record validation. (AC: 8)
  - [x] Run web focused tests for Epic 19 touched component suites.
  - [x] Run scene-core focused tests for selectors, occupancy, footprint, stacking/export/codec boundaries affected by Epic 19 assumptions.
  - [x] Run `pnpm --filter @pokopia-scene-editor/web typecheck`.
  - [x] Run `pnpm --filter @pokopia-scene-editor/web build`.
  - [x] Run `pnpm --filter @pokopia-scene-editor/web smoke` or equivalent Playwright smoke that includes desktop/tablet/mobile viewport coverage.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 19 / Story 19.8.
- Sprint proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-05-desktop-workbench-decluttering.md`.
- PRD NFR67 requires UI-only states for scene summary expansion, details expansion, asset detail state, lower-layer ghost toggle and file/menu state to stay out of scene saved/autosave storage.
- PRD NFR68 requires lower-layer ghost to remain a UI projection and not change scene-core occupancy, stacking, replacement confirmation, height blocking or placement preview.
- PRD NFR69 requires 1280x720 desktop layout to keep top toolbar, left summary/layers, center canvas, bottom quick bar and right asset browser from overlapping.

### Existing Implementation Map

- `apps/web/src/components/app-shell/AppShell.test.tsx`
  - Already covers many Epic 19 surfaces: file actions menu, scene summary preference, lower-layer ghost preference, independent preview/export modal, mobile preview/import and storage isolation.
  - Use existing helpers such as `setViewportWidth()`, `readSceneSnapshot()`, `clickFileActionMenuItem()` and storage keys.
- `apps/web/src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
  - Scene summary expansion and compact summary behavior live here, with AppShell persistence coverage in AppShell tests.
- `apps/web/src/components/building-level-panel/BuildingLevelPanel.test.tsx`
  - Epic 16 drag/reorder behavior must remain covered; Story 19.3 changed density but must not regress whole-row drag or keyboard fallback.
- `apps/web/src/components/selection-inspector/SelectionInspector.test.tsx`
  - Story 19.4 compact quick bar/details coverage should be checked for read-only and layer-note flows.
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
  - Story 19.5 browse-first detail surface and Epic 18 staging boundaries should both remain covered.
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
  - Story 19.7 lower-layer ghost coverage should remain focused on UI projection and current-layer semantics.
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - Shared export preview content remains the source for desktop modal and mobile inline preview parity.
- `apps/web/e2e/workbench-smoke.spec.ts`
  - Existing smoke already covers a broad workbench flow and responsive viewport list; Story 19.8 should extend this file rather than creating an unrelated smoke surface unless necessary.
- `apps/web/playwright.config.ts`
  - `pnpm --filter @pokopia-scene-editor/web smoke` builds scene-core, starts Vite preview and runs Chromium Playwright with one worker.

### Technical Constraints

- Do not introduce new production behavior unless a test exposes a real regression that must be fixed.
- Do not modify `SceneDocument v1`, PSE codec, export summary schema, `packages/scene-core` placement/occupancy/stacking semantics, Worker routes or deployment behavior.
- Do not add brittle screenshot assertions; prefer semantic locators, bounding-box checks and storage payload checks.
- Browser smoke may use helper functions inside `workbench-smoke.spec.ts`; keep viewport checks deterministic under reduced motion.
- Layout overlap checks must account for intentional modal/backdrop overlays and should not fail because offscreen or hidden content has a stale bounding box.

### Testing Requirements

- `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx src/components/app-shell/mobile-preview-mode.test.tsx src/components/building-level-panel/BuildingLevelPanel.test.tsx src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx src/components/selection-inspector/SelectionInspector.test.tsx src/components/asset-picker/AssetPicker.test.tsx src/components/scene-canvas/SceneCanvas.test.tsx src/components/export-preview/ExportPreview.test.tsx`
- `pnpm --filter @pokopia-scene-editor/scene-core test -- src/domain/scene/occupancy.test.ts src/domain/scene/footprint.test.ts src/domain/scene/selectors.test.ts src/domain/scene/export-summary.test.ts src/io/scene-string-codec.test.ts`
- `pnpm --filter @pokopia-scene-editor/web typecheck`
- `pnpm --filter @pokopia-scene-editor/web build`
- `pnpm --filter @pokopia-scene-editor/web smoke`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-06: Created story context from Epic 19.8 AC, PRD NFR67-NFR69, existing focused tests and Playwright smoke layout.
- 2026-06-06: Updated Playwright smoke for Epic 19 desktop decluttering UI, file menu, scene-summary expansion and 1000px tablet viewport coverage.
- 2026-06-06: Ran web focused tests, scene-core focused tests, web typecheck, web build and Playwright smoke before code review.
- 2026-06-06: Added direct MobilePreviewMode focused coverage for shared inline export content and download callbacks.
- 2026-06-06: Addressed multi-agent review findings by hardening localized smoke locators, mobile negative edit-control assertions, tablet edit/menu/preview smoke, layout overlap helpers, scene-settings expansion assertions and Playwright retry/trace config.
- 2026-06-06: Re-ran focused web tests, scene-core focused tests, web typecheck, web build, Playwright smoke and `git diff --check`; final smoke passed 26/26.

### Completion Notes

- Added direct MobilePreviewMode unit coverage for inline ExportPreviewContent parity after PreviewInspector removal.
- Extended `workbench-smoke.spec.ts` with localized file/menu assertions, a 1000px tablet edit smoke, English mobile preview smoke and layout helpers that prove visible workbench panels exist and do not overlap.
- Added CI retry and trace-on-first-retry to Playwright config.
- Final validation passed:
  - `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx src/components/app-shell/mobile-preview-mode.test.tsx src/components/building-level-panel/BuildingLevelPanel.test.tsx src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx src/components/selection-inspector/SelectionInspector.test.tsx src/components/asset-picker/AssetPicker.test.tsx src/components/scene-canvas/SceneCanvas.test.tsx src/components/export-preview/ExportPreview.test.tsx` - 20 files, 310 tests.
  - `pnpm --filter @pokopia-scene-editor/scene-core test -- src/domain/scene/occupancy.test.ts src/domain/scene/footprint.test.ts src/domain/scene/selectors.test.ts src/domain/scene/export-summary.test.ts src/io/scene-string-codec.test.ts` - 16 files, 154 tests.
  - `pnpm --filter @pokopia-scene-editor/web typecheck`.
  - `pnpm --filter @pokopia-scene-editor/web build`.
  - `pnpm --filter @pokopia-scene-editor/web smoke` - 26 tests.
  - `git diff --check`.

## Senior Developer Review (AI)

Completed.

- Fixed P2: Added direct MobilePreviewMode focused test coverage for shared inline export content and download callbacks.
- Fixed P2: Replaced brittle desktop-only smoke assumptions with localized file/menu locators, actual 1000px tablet cell/menu/preview interaction and layout helpers that require visible panels before overlap checks.
- Fixed P3: Added mobile no-edit-control negative assertions and mobile layout checks for import/inline preview paths.
- Fixed P3: Made scene-settings expansion helper assert the expanded fields and target textbox instead of silently skipping.
- Fixed P3: Removed brittle staging upper-ratio assertion and kept usability, scrollability and no-overlap checks.
- Fixed P3: Added Playwright CI retries and trace capture on first retry.

### File List

- `_bmad-output/implementation-artifacts/19-8-decluttering-regression-tests-and-browser-smoke.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/playwright.config.ts`
- `apps/web/src/components/app-shell/mobile-preview-mode.test.tsx`

## Change Log

- 2026-06-06: Story created and marked ready-for-dev.
- 2026-06-06: Implemented regression smoke/test hardening and marked story done after review fixes and validation.
