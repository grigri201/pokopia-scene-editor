# Story 18.4: 回归测试与浏览器验证

Status: done

## Story

As a 维护者, I want 素材暂存区有 focused tests 和 layout smoke, So that 它不会破坏素材搜索、分页、旋转、连续放置、autosave 或 mobile preview。

## Acceptance Criteria

1. AssetPicker component tests 覆盖拖入、去重、最近 3 个显示、总数、删除、折叠点击选择、展开 80/20 class/state、展开列表滚动、旋转按钮和 read-only guard。
2. AppShell integration tests 覆盖从素材暂存区选择/旋转后，画布放置使用正确 `assetId` 和 `rotationDegrees`。
3. Tests 明确断言暂存区拖入、删除、展开/收起会写入本地 UI 存储，但不写 scene autosave storage、不改变 `SceneDocument` payload、不改变 PSE 导出字符串。
4. Tests 覆盖刷新/重新挂载后从本地存储恢复暂存素材顺序和展开/折叠状态，并过滤未知 `assetId`。
5. Existing AssetPicker search/filter/pagination tests、pre-placement rotate tests、continuous selection tests 继续通过。
6. Mobile tests 明确 `<768px` 不渲染素材暂存区、暂存区展开/收起入口、暂存删除按钮、暂存旋转按钮或素材编辑控件，并且不需要读取/恢复暂存区本地存储。
7. Playwright/browser smoke 覆盖 desktop 1280x720 展开状态和 tablet 1000px 左右布局，验证没有重叠且素材区仍可滚动。

## Tasks / Subtasks

- [x] Complete focused unit/component regression coverage. (AC: 1, 4, 5)
  - [x] Run and update `AssetPicker` and `ui-preferences` tests for all staging state and existing regressions.
- [x] Complete AppShell storage and placement integration coverage. (AC: 2, 3, 6)
  - [x] Assert staging UI preferences do not dirty saved/autosaved scene storage until an actual scene edit occurs.
  - [x] Assert staged selection and rotation place the expected asset and rotation on canvas.
  - [x] Assert mobile preview does not render or normalize staging state.
- [x] Add or update browser smoke coverage. (AC: 7)
  - [x] Cover 1280x720 desktop expanded staging layout.
  - [x] Cover around 1000px tablet layout with expanded staging and scrollable remaining asset area.
- [x] Run release-quality verification. (AC: 1-7)
  - [x] `pnpm --filter @pokopia-scene-editor/web test src/components/asset-picker/AssetPicker.test.tsx src/io/ui-preferences.test.ts src/components/app-shell/AppShell.test.tsx`
  - [x] `pnpm --filter @pokopia-scene-editor/web test`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/web build`

## Dev Notes

- Use existing Vitest and React Testing Library patterns.
- AppShell tests already contain storage isolation checks for UI preferences vs autosave; extend those patterns.
- Existing mobile boundary is `<768px` via `getInteractionMode()` and `MobilePreviewMode`.
- If Playwright smoke is added, keep it deterministic and scoped to layout/data attributes instead of visual pixel-perfect assertions.
- Story 18.4 closes the epic only after review findings are fixed and sprint-status marks all Epic 18 stories `done`.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-04: Story created from approved BMAD Epic 18 planning surface.
- 2026-06-04: Added asset-staging storage tests for defaults, isolated namespace, unknown/duplicate normalization, read-only non-persistence, invalid schema fallback, and best-effort failures.
- 2026-06-04: Added AssetPicker tests for drag-in, dedupe, recent 3, total count, delete, collapsed select, expanded shared row state, rotation, persistence, and read-only guard.
- 2026-06-04: Added AppShell tests for staged selection/rotation placement, staging-only storage isolation, PSE string stability during staging-only operations, and mobile non-render/non-normalization.
- 2026-06-04: Added Playwright smoke for 1280x720 desktop, 1000px tablet, short-height desktop/tablet, and 768px edge expanded staging layout.
- 2026-06-04: Code review fix: added remount restore coverage, explicit PSE string stability assertion, expanded staging list scroll assertion, pagination/selection-inspector layout checks, and strict 80/20 smoke checks for acceptance viewports.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/web test src/io/asset-staging-preferences.test.ts src/components/asset-picker/AssetPicker.test.tsx` passed: 2 files / 26 tests.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/web test src/components/app-shell/AppShell.test.tsx` passed: 1 file / 91 tests.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "expanded asset staging" --project=chromium --workers=1` passed.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/web typecheck` passed.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/web test` passed: 20 files / 298 tests.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/web build` passed; runtime asset verification checked 1474 references.
- 2026-06-04: `git diff --check` passed.

### Completion Notes

- Focused component, storage, AppShell, browser smoke, full Web tests, typecheck, build, and diff checks all pass locally.
- Mobile preview remains free of asset staging UI and does not normalize staging storage on startup.
- Staging-only operations are isolated from scene saved/autosave storage and do not change PSE output.

## Senior Developer Review (AI)

### Review Outcome

Approved after fixes.

### Findings Resolved

- [x] Added restore-on-remount coverage for staged order and expanded state.
- [x] Added explicit PSE string stability coverage for staging-only operations.
- [x] Added expanded staging scroll, pagination visibility, selection-inspector clearance, and 80/20 layout smoke checks.

### File List

- `_bmad-output/implementation-artifacts/18-4-asset-staging-regression-tests-and-browser-smoke.md`
- `apps/web/src/io/asset-staging-preferences.ts`
- `apps/web/src/io/asset-staging-preferences.test.ts`
- `apps/web/src/io/index.ts`
- `apps/web/src/components/asset-picker/AssetPicker.tsx`
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-04: Story created and marked ready-for-dev.
- 2026-06-04: Completed regression tests, browser smoke, full Web verification, review fixes, and moved story to done.
