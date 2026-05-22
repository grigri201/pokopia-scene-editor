# Story 6.2: 图片导出预览 UI

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 在下载前预览即将导出的图片,
So that 我能确认图片中包含整体素材、每层图形和每层素材清单。

## Acceptance Criteria

1. Given 桌面或平板编辑模式下存在有效 scene, when 用户点击 `导出`, then 系统打开图片导出预览面板或 modal。
2. Given 导出预览已打开, then 预览中显示标题区、整体使用素材清单、逐层图形和逐层素材清单。
3. Given 某一层没有素材, then 图片预览仍展示该层，并明确显示空层状态。
4. Given sceneName、assetName 或 skillNote 包含 HTML-like 文本, when 导出预览渲染, then UI 只能按普通文本显示，不执行 HTML 或脚本。
5. Given 导出预览打开或关闭, when 用户不执行下载, then SceneDocument、autosave storage、saved storage 和 UI preferences 均不得改变。

## Tasks / Subtasks

- [x] 新增导出预览组件 (AC: 2, 3, 4)
  - [x] 新增 `ExportPreview` 组件，输入为 Story 6.1 的 `ImageExportSummary`，展示标题区、整体素材清单、逐层图形和逐层素材清单。
  - [x] 每个建筑层都渲染 7x7 图形数据；空层必须显示明确空层状态。
  - [x] `sceneName`、asset name、skill note 和 reproduction notes 只能通过 React text rendering 输出，不使用 `dangerouslySetInnerHTML`。
- [x] 将顶部 `导出` 入口改为打开预览 (AC: 1, 5)
  - [x] 在 `AppShell` 中把现有 direct JSON download 替换为打开 export preview overlay/modal。
  - [x] 预览打开时使用当前 `scene` 调用 `buildImageExportSummary(scene)`；关闭后回到原工作台上下文。
  - [x] 预览打开/关闭不得调用 scene reducer、storage writer、UI preference writer 或 autosave 路径。
- [x] 保留 Story 6.3 下载边界 (AC: 1, 2, 5)
  - [x] 预览中可以渲染 `下载图片` 按钮，但本 story 不实现图片文件生成或下载触发；按钮应为明确不可执行/待 Story 6.3 接管的 UI 状态，或以 no-op 形式不触发下载。
  - [x] 不再从用户点击 `导出` 直接下载 `.pokopia-scene.json`。
  - [x] 不新增 JSON import/export UI、server route、share URL、cloud sync 或 image upload。
- [x] 增加 component/AppShell 回归测试 (AC: 1, 2, 3, 4, 5)
  - [x] `ExportPreview` 测试覆盖标题、整体素材清单、逐层图形、逐层素材清单、空层和 HTML-like 文本安全渲染。
  - [x] `AppShell` 测试覆盖点击 `导出` 打开预览、关闭预览、不会触发 JSON 下载、不会写 saved/autosave/UI preferences。
  - [x] 更新旧 JSON export 测试，使其不再断言 `.pokopia-scene.json` 为用户可见导出产物。
- [x] 运行并记录验证门禁 (AC: 5)
  - [x] 运行 `npm run typecheck`。
  - [x] 运行 `npm test`。
  - [x] 运行 `npm run build`。
  - [x] 运行 `git diff --check`。

### Review Findings

- [x] [Review][Patch] Modal declared `aria-modal` without managing focus or background focusability [src/components/export-preview/ExportPreview.tsx] — Added focus entry, Tab trap, Escape close, focus restore, and inert/aria-hidden background workbench/header state while the preview is open.
- [x] [Review][Patch] Export preview backdrop z-index could be lower than existing focused overlays [src/styles.css] — Raised the export preview backdrop z-index.
- [x] [Review][Patch] Download button could render enabled without a download handler [src/components/export-preview/ExportPreview.tsx] — Disabled the download button whenever no handler is provided.

## Dev Notes

- Story 6.2 承接 Story 6.1 commit `455d8b8 feat: add image export summary model`。必须复用 `src/domain/scene/export-summary.ts` 的 `buildImageExportSummary(scene)` 和类型，不要在 UI 组件里重新聚合业务数据。
- 当前 `src/components/app-shell/AppShell.tsx` 中 `exportCurrentScene()` 会直接生成 `SceneDocument` JSON 并下载 `<scene>.pokopia-scene.json`；Epic 6 明确要求当前导出入口不再指 JSON 文件导出。6.2 应把该入口改为打开预览，真实图片下载交给 6.3。
- UX 规格允许图片导出预览使用 modal 或轻量 overlay。该 overlay 不得遮挡或修改 underlying scene state；关闭后用户回到原工作台上下文。
- 组件视觉应跟随现有 Open Design 工作台风格：密集、工具型、稳定尺寸；不要做 landing/hero，也不要卡片套卡片。
- Mobile `<768px` 已是 read-only 模式。6.2 不必须最终决定移动端下载策略，但如果 `导出` 入口仍可见，点击也不得写 scene/storage。
- Safe text 边界沿用 React 默认转义；不要把 sceneName、assetName、skillNote 或任何 note 传给 `innerHTML`。

### Expected Touch Points

- `src/components/export-preview/ExportPreview.tsx`
- `src/components/export-preview/ExportPreview.test.tsx`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/styles.css`
- `_bmad-output/implementation-artifacts/6-2-image-export-preview-ui.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.2]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-22.md#Story-6.2]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Image-Export-Preview]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Modal-and-Overlay-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Approved-Course-Correction-2026-05-22]
- [Source: _bmad-output/implementation-artifacts/6-1-image-export-summary-and-layer-data.md]
- [Source: src/domain/scene/export-summary.ts]
- [Source: src/components/app-shell/AppShell.tsx]
- [Source: src/components/app-shell/AppShell.test.tsx]

## Testing Requirements

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-22: `npm test -- src/components/export-preview/ExportPreview.test.tsx src/components/app-shell/AppShell.test.tsx` (initial component test failed on duplicate empty-layer text query)
- 2026-05-22: `npm run typecheck`
- 2026-05-22: `npm test -- src/components/export-preview/ExportPreview.test.tsx src/components/app-shell/AppShell.test.tsx`
- 2026-05-22: `npm test`
- 2026-05-22: `npm run build`
- 2026-05-22: `git diff --check`
- 2026-05-22: Multi-agent code review (Blind Hunter found 1 focus-management finding; Edge Case Hunter found 3 patch findings; Acceptance Auditor clean)
- 2026-05-22: Review follow-up `npm run typecheck`
- 2026-05-22: Review follow-up `npm test -- src/components/export-preview/ExportPreview.test.tsx src/components/app-shell/AppShell.test.tsx`
- 2026-05-22: Review follow-up `npm test`
- 2026-05-22: Review follow-up `npm run build`
- 2026-05-22: Review follow-up `git diff --check`

### Completion Notes List

- Added `ExportPreview` overlay/modal UI backed by Story 6.1 `ImageExportSummary`, including title, overall materials, per-layer 7x7 graphics, per-layer materials and empty-layer state.
- Replaced direct JSON download from the AppShell `导出` button with image export preview opening; no Blob URL or anchor download is triggered in Story 6.2.
- Added safe-text component coverage for HTML-like scene names and skill notes, plus AppShell coverage for no saved/autosave/UI preference writes on open/close.
- Addressed review findings by adding modal focus management, background inert state, a higher modal stacking layer, and safe disabled download behavior when Story 6.3 has not yet wired download generation.

### File List

- `_bmad-output/implementation-artifacts/6-2-image-export-preview-ui.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/components/export-preview/ExportPreview.tsx`
- `src/components/export-preview/ExportPreview.test.tsx`
- `src/styles.css`

### Change Log

- 2026-05-22: Story created from Epic 6 Story 6.2 and marked ready-for-dev.
- 2026-05-22: Implemented image export preview UI and moved Story 6.2 to review.
- 2026-05-22: Addressed code-review findings, re-ran gates, and marked Story 6.2 done.
