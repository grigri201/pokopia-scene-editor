# Story 12.2: Web canvas、preview 与 export 的 17x17 渲染

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 新建场景在 Web 工作台中显示完整 17x17 编辑画布,
so that 我可以编辑中心 15x15 主体区和外围一圈装饰区，而不丢失现有素材、预览、导出和移动端只读体验。

## Acceptance Criteria

1. Given 用户打开默认新场景, When Web 工作台渲染 Scene Canvas, Then 画布必须显示 17x17 共 289 个格子, And 中心 15x15 主体区、外围 1 圈装饰区、坐标标签、选中格和 areaType 文案必须来自 scene dimensions。
2. Given 用户在默认 17x17 场景中放置、替换或删除素材, When 画布、选中检查器、俯视图、正视图和图片导出预览更新, Then 所有视图必须使用同一 scene state 和 dimension helpers, And 不得出现 hardcoded 7x7、49 cells、max coordinate 6 或旧布局假设。
3. Given 桌面视口为 1280px+ 或 1440x900, When 默认 17x17 场景显示在 Open Design 工作台, Then 素材栏、建筑层面板、检查器、顶部控制和导出预览不得互相遮挡, And 允许画布内部滚动、缩放或稳定压缩，但格子固定宽高比和坐标可读性必须保留。
4. Given `<768px` Mobile View-only Mode, When 用户查看 17x17 场景, Then 用户可以查看、缩放、平移和点选查看信息, And 仍不得通过触摸、键盘或隐藏入口修改 SceneDocument。

## Tasks / Subtasks

- [x] 更新 SceneCanvas 与 keyboard navigation 尺寸来源 (AC: 1, 2, 4)
  - [x] SceneCanvas grid、footprint overlay、ARIA label 和 coordinate watermark 使用传入 `canvasSize`。
  - [x] `moveCoordinate` 不再依赖全局 canvas 常量，改为从当前 scene/canvas size clamp。
  - [x] 默认 17x17 与 legacy 7x7 的 cell count、main/outer/boundary、键盘边界测试均覆盖。
- [x] 更新 PreviewInspector 尺寸驱动渲染 (AC: 2, 3, 4)
  - [x] 俯视图、正视图、stacking/footprint/skill marker indicators 使用 summary/scene dimensions。
  - [x] CSS 不再写死 7 列/7 行；17x17 保持固定宽高比、可滚动或稳定压缩。
  - [x] 保留 legacy 7x7 回归，同时新增 default 17x17 断言。
- [x] 更新 ExportPreview 与图片导出预览 UI (AC: 2, 3)
  - [x] layer graphic aria/i18n 文案包含当前 width/height。
  - [x] export layer grid、coordinate labels、material summaries 使用 `summary.canvasSize`。
  - [x] 测试覆盖 17x17 289 cells、max `16,16` 和 legacy 7x7 49 cells、max `6,6`。
- [x] 更新 Web shell/i18n/SEO 中旧 7x7 文案 (AC: 1, 3, 4)
  - [x] `sceneCanvas`、`sceneCanvasReadOnly`、`layerGraphic` 等文案改为参数化尺寸。
  - [x] workspace aria label 与静态 SEO 不再把当前产品限定为 7x7。
  - [x] mobile read-only 不暴露编辑入口，并能查看 17x17 canvas。
- [x] 验证 (AC: 1-4)
  - [x] 运行 SceneCanvas、PreviewInspector、ExportPreview、scene-reducer、AppShell、image-export、SEO 相关 web tests。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/web typecheck`。
  - [x] 运行 `git diff --check`。

## Dev Notes

- Story 12.1 已把 `scene-core` 默认尺寸改为 `sceneSize=15x15`、`outerPadding=1`、`canvasSize=17x17`，并保留 legacy 5x5/7x7 dimensions。Web 不能复制尺寸常量，应从 `SceneDocument`、selectors 或 export summary 中读取。
- Dimension handoff: `_bmad-output/implementation-artifacts/12-1-scene-core-dimension-contract-and-legacy-recovery.md` is the source context; Epic 12 targets `sceneSize=15x15` / `canvasSize=17x17` with `outerPadding=1`, keeps legacy `sceneSize=5x5` / `canvasSize=7x7`, and does not support `16x16`.
- 当前 `SceneCanvas.tsx` 已接收 `canvasSize` 并按 rows slice cell data，但 i18n/keyboard clamp/CSS/test 仍存在 7x7 假设。
- 当前 `PreviewInspector.tsx` 和 `ExportPreview.tsx` 的数据多数来自 scene/export summary；主要风险在 CSS grid、aria/i18n 文案和旧测试断言。
- 旧 7x7 JSON 与 PSE1 仍是支持场景。不要删除 legacy 7x7 coverage；应同时覆盖 legacy 7x7 与 default 17x17。
- 桌面 1280px+ 与 mobile `<768px` 的布局约束来自 Epic 12 NFR50/NFR51；若需要滚动或缩放，应保持 cell aspect ratio 和 read-only mutation boundary。

### Project Structure Notes

- Expected updates:
  - `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
  - `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
  - `apps/web/src/state/scene-reducer.ts`
  - `apps/web/src/state/scene-reducer.test.ts`
  - `apps/web/src/components/preview-inspector/PreviewInspector.tsx`
  - `apps/web/src/components/preview-inspector/PreviewInspector.test.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - `apps/web/src/components/app-shell/AppShell.tsx`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/styles.css`
  - `apps/web/src/seo-metadata.test.ts`
  - `apps/web/index.html`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-12.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR101-FR108]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Approved-Course-Correction-2026-05-29-15x15-Scene-Size-17x17-编辑画布]
- [Source: apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [Source: apps/web/src/components/preview-inspector/PreviewInspector.tsx]
- [Source: apps/web/src/components/export-preview/ExportPreview.tsx]
- [Source: apps/web/src/styles.css]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-29: Story created from Epic 12 Story 12.2 and sprint tracker backlog.
- 2026-05-29: Started dev-story implementation and moved status to in-progress.
- 2026-05-29: Ran `pnpm exec vitest run src/components/app-shell/AppShell.test.tsx src/seo-metadata.test.ts` in `apps/web` (59 passed).
- 2026-05-29: Ran `pnpm exec vitest run src/state/scene-reducer.test.ts src/components/scene-canvas/SceneCanvas.test.tsx src/components/preview-inspector/PreviewInspector.test.tsx src/components/export-preview/ExportPreview.test.tsx src/components/app-shell/AppShell.test.tsx src/seo-metadata.test.ts` in `apps/web` (121 passed).
- 2026-05-29: Ran `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-05-29: Ran `git diff --check`.
- 2026-05-29: Ran multi-agent bmad-code-review for SceneCanvas/mobile, PreviewInspector/ExportPreview, and acceptance coverage.
- 2026-05-29: Addressed review findings by reconnecting PreviewInspector to AppShell, making scene canvas padding/gap/watermarks density-aware, adding image download progress state, converting E2E fixtures to 17x17, and adding mobile/dense/export smoke coverage.
- 2026-05-29: Ran `pnpm exec vitest run src/state/scene-reducer.test.ts src/components/scene-canvas/SceneCanvas.test.tsx src/components/preview-inspector/PreviewInspector.test.tsx src/components/export-preview/ExportPreview.test.tsx src/components/app-shell/AppShell.test.tsx src/io/image-export.test.ts src/seo-metadata.test.ts` in `apps/web` (128 passed).
- 2026-05-29: Ran `pnpm --dir apps/web exec playwright test e2e/workbench-smoke.spec.ts --project=chromium -g "renders the Open Design|switches scaffold|previews and downloads|keeps dense"` (4 passed).
- 2026-05-29: Re-ran `pnpm --filter @pokopia-scene-editor/web typecheck` and `git diff --check`.

### Completion Notes List

- SceneCanvas, preview inspector, export preview, workspace labels, i18n strings and SEO metadata now render default 17x17 dimensions from scene/export state.
- PreviewInspector is mounted in the real workbench again and memoizes dimension-heavy previews so selection changes do not rebuild dense 10-layer previews.
- Image export download shows a non-blocking generation status and disables duplicate download clicks while the image is being produced.
- Playwright smoke now covers default 17x17 first screen, 17x17 export preview/download, dense 17x17 selection, and mobile read-only 17x17 dimensions.
- Legacy 7x7 tests remain covered for canvas, preview and export compatibility.
- AppShell integration tests now use a file-local 15s timeout budget because default 17x17 DOM rendering can exceed Vitest's 5s default under the focused integration suite.

### Change Log

- 2026-05-29: Created Story 12.2 and moved status to ready-for-dev.
- 2026-05-29: Started Story 12.2 implementation.
- 2026-05-29: Completed Story 12.2 implementation and moved status to review.
- 2026-05-29: Completed review fixes and moved Story 12.2 to done.

### File List

- _bmad-output/implementation-artifacts/12-2-web-canvas-preview-export-17x17-rendering.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/e2e/workbench-smoke.spec.ts
- apps/web/index.html
- apps/web/src/components/app-shell/AppShell.test.tsx
- apps/web/src/components/app-shell/AppShell.tsx
- apps/web/src/components/export-preview/ExportPreview.test.tsx
- apps/web/src/components/export-preview/ExportPreview.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.test.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.test.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.tsx
- apps/web/src/i18n/index.ts
- apps/web/src/seo-metadata.test.ts
- apps/web/src/state/scene-reducer.test.ts
- apps/web/src/state/scene-reducer.ts
- apps/web/src/styles.css
- apps/web/src/theme/tokens.ts
