# Story 6.3: 图片文件生成、下载与回归测试

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 将预览确认过的布景导出图片下载到本机,
So that 我可以分享或保存一个无需导入功能也能阅读的布景说明图。

## Acceptance Criteria

1. Given 导出预览有效, when 用户点击 `下载图片`, then 浏览器下载 `<sanitized-scene-name>.pokopia-scene.png` 或规划批准的图片格式。
2. Given 用户执行图片下载, then 下载内容必须与预览中的图片语义一致，包含整体使用素材、每层图形和每层使用素材。
3. Given 用户执行图片下载, then 系统显示轻量成功反馈，并且不写入 `pokopia.sceneDocument.v1`、不写入 `pokopia.sceneDocument.autosave.v1`、不改变 SceneDocument。
4. Given `<768px` Mobile View-only Mode, when 导出入口被隐藏、禁用或只读渲染, then 不允许任何 scene mutation 或 storage write。
5. Given release gate 运行, then `npm run typecheck`、unit tests、`npm run build` 和 Playwright smoke 必须通过，并覆盖导出预览、图片下载触发、逐层内容存在和 storage 不变性。

## Tasks / Subtasks

- [x] 新增浏览器图片导出 helper (AC: 1, 2, 3)
  - [x] 新增 `src/io/image-export.ts`，将 Story 6.1 `ImageExportSummary` 转为图片 Blob，并提供 `<sanitized-scene-name>.pokopia-scene.svg` 文件名作为规划允许的浏览器原生图片格式。
  - [x] 图片内容语义必须与预览一致：标题、整体素材、逐层图形、逐层素材清单都进入生成源。
  - [x] 文件名清洗必须处理空白、斜杠、HTML-like 字符和非法文件名字符，fallback 为 `pokopia-scene.pokopia-scene.svg`。
- [x] 接通 `下载图片` 触发和成功反馈 (AC: 1, 3)
  - [x] 在 `ExportPreview` 中让 `下载图片` 可点击，并从 AppShell 传入下载 handler。
  - [x] 点击后创建 Blob URL、触发 anchor download、释放 Blob URL，并显示轻量成功反馈。
  - [x] 下载失败时显示可访问失败提示，不修改 scene，不写 saved/autosave/UI preferences。
- [x] 增加 unit/component 回归测试 (AC: 1, 2, 3, 4)
  - [x] `image-export` tests 覆盖文件名清洗、Blob MIME、生成内容包含标题/整体素材/逐层图形/逐层素材清单。
  - [x] `ExportPreview` / `AppShell` tests 覆盖下载按钮触发、成功反馈、Blob URL 释放、SceneDocument/storage 不变性。
  - [x] Mobile `<768px` 下导出入口隐藏或不可触发，并证明 scene snapshot 和 storage 不变。
- [x] 更新 Playwright smoke (AC: 5)
  - [x] smoke 覆盖打开导出预览、逐层内容存在、下载图片触发、下载文件名和 storage 不变性。
  - [x] smoke 覆盖 mobile read-only 下导出入口隐藏/不可触发时不会修改 scene 或 storage。
- [x] 运行并记录 release gate (AC: 5)
  - [x] 运行 `npm run typecheck`。
  - [x] 运行 `npm test`。
  - [x] 运行 `npm run build`。
  - [x] 运行 `git diff --check`。
  - [x] 运行 `npm run smoke`。

### Review Findings

- [x] [Review][Patch] SVG export used fixed layer height and could overlap or clip dense layer material lists [src/io/image-export.ts] — Added dynamic layer height calculation from material/instance rows and regression coverage for dense material lists.
- [x] [Review][Patch] SVG export only rendered the first same-asset instance's reproduction notes [src/io/image-export.ts] — Rendered per-instance reproduction rows and added coverage for same-asset instances with different skill/dye/rotation notes.
- [x] [Review][Patch] Anchor click failure could skip Blob URL and hidden anchor cleanup [src/components/app-shell/AppShell.tsx] — Moved anchor removal and Blob URL revocation into `finally`.
- [x] [Review][Patch] XML-forbidden control characters in user text could produce invalid SVG [src/io/image-export.ts] — Stripped XML control characters before escaping text.

## Dev Notes

- Story 6.3 承接 Story 6.1 commit `455d8b8 feat: add image export summary model` 和 Story 6.2 commit `7ecb9ff feat: add image export preview`。必须复用 `ImageExportSummary` 与 `ExportPreview`，不要重新实现第二套导出业务数据。
- 当前规划允许浏览器端 Canvas/SVG/Blob URL/download。为了避免引入新依赖和复杂 rasterization，本 story 使用 SVG Blob + `.pokopia-scene.svg` 作为规划允许的浏览器原生图片格式；后续可替换为 Canvas rasterization / PNG。
- 下载路径不得写入 `pokopia.sceneDocument.v1`、`pokopia.sceneDocument.autosave.v1` 或 `pokopia.uiPreferences.v1`。成功/失败反馈只能是组件 UI state，不得进入 SceneDocument。
- Mobile `<768px` 已隐藏 `.app-action-button`，因此 `导出` 入口应不可见；测试应证明不可见且不会通过键盘或 storage 路径改变 scene。
- Existing Playwright smoke 使用 `__pokopiaSceneSnapshot` 读取 scene JSON。优先复用该 hook 比较下载前后 scene 不变。

### Expected Touch Points

- `src/io/image-export.ts`
- `src/io/image-export.test.ts`
- `src/io/index.ts`
- `src/components/export-preview/ExportPreview.tsx`
- `src/components/export-preview/ExportPreview.test.tsx`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `e2e/workbench-smoke.spec.ts`
- `_bmad-output/implementation-artifacts/6-3-image-file-generation-download-and-regression-tests.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.3]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-22.md#Story-6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Browser-APIs]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR29-NFR30]
- [Source: _bmad-output/implementation-artifacts/6-1-image-export-summary-and-layer-data.md]
- [Source: _bmad-output/implementation-artifacts/6-2-image-export-preview-ui.md]
- [Source: src/domain/scene/export-summary.ts]
- [Source: src/components/export-preview/ExportPreview.tsx]
- [Source: e2e/workbench-smoke.spec.ts]

## Testing Requirements

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`
- `npm run smoke`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-22: `npm run typecheck`
- 2026-05-22: `npm test -- src/io/image-export.test.ts src/components/export-preview/ExportPreview.test.tsx src/components/app-shell/AppShell.test.tsx` (initial mobile assertion failed because jsdom does not apply CSS hiding)
- 2026-05-22: `npm test -- src/io/image-export.test.ts src/components/export-preview/ExportPreview.test.tsx src/components/app-shell/AppShell.test.tsx`
- 2026-05-22: `npm run build`
- 2026-05-22: `npm run smoke`
- 2026-05-22: `npm test` (first full run under concurrent build/smoke had one unrelated component timeout)
- 2026-05-22: `npm test`
- 2026-05-22: `git diff --check`
- 2026-05-22: Multi-agent code review (Blind Hunter found 2 P1 findings; Edge Case Hunter found 4 patch findings; Acceptance Auditor found 2 P1 findings)
- 2026-05-22: Review follow-up `npm test -- src/io/image-export.test.ts src/components/app-shell/AppShell.test.tsx`
- 2026-05-22: Review follow-up `npm run typecheck`
- 2026-05-22: Review follow-up `npm run build`
- 2026-05-22: Review follow-up `npm run smoke`
- 2026-05-22: Review follow-up `npm test` (concurrent run had one unrelated PokemonSceneControls timeout)
- 2026-05-22: Review follow-up `npm test`
- 2026-05-22: Review follow-up `git diff --check`

### Completion Notes List

- Added SVG image export generation from `ImageExportSummary`, including semantic title, overall materials, per-layer graphics and per-layer material lists.
- Connected `下载图片` to Blob URL download in AppShell, with success/error feedback and URL cleanup.
- Mobile read-only now omits the export action entirely; unit and smoke coverage prove no scene/storage write on mobile.
- Added Playwright smoke coverage for export preview contents, download filename/content and storage invariance.
- Addressed review findings by making SVG layer layout content-sized, preserving per-instance reproduction notes, guaranteeing download cleanup in `finally`, and stripping XML-forbidden control characters.

### File List

- `_bmad-output/implementation-artifacts/6-3-image-file-generation-download-and-regression-tests.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/components/export-preview/ExportPreview.tsx`
- `src/components/export-preview/ExportPreview.test.tsx`
- `src/io/image-export.ts`
- `src/io/image-export.test.ts`
- `src/io/index.ts`
- `src/styles.css`

### Change Log

- 2026-05-22: Story created from Epic 6 Story 6.3 and marked ready-for-dev.
- 2026-05-22: Implemented SVG image export download, unit/component/smoke coverage, and moved Story 6.3 to review.
- 2026-05-22: Addressed code-review findings, re-ran release gates, and marked Story 6.3 done.
