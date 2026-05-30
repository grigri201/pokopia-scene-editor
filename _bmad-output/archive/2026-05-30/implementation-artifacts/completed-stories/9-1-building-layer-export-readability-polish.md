# Story 9.1: 楼层显示、坐标提示、导出品牌和放置旋转收敛

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 工作台、预览和导出图片使用一致、易读的楼层与坐标表达,
so that 我可以减少 L0/0 层误读，并把导出图直接分享给他人理解。

## Acceptance Criteria

1. Given `SceneDocument v1` 仍使用零基 `levelNumber`, When 系统创建默认场景、创建建筑层或展示旧场景, Then 用户可见的默认楼层名称和 display id 必须从 L1/1 层开始, And 底层 `levelNumber`、building level id、schema、autosave、saved scene 和 PSE1 短字符串不得改成一基。
2. Given 旧 payload 或测试 fixture 中存在系统生成的 `0层`、`Layer 0`、`1层` 或 `Layer 1`, When selectors、locale helpers、Building Level Panel、Selection Inspector、Preview Inspector 或 Export Preview 展示楼层, Then 系统生成名称应按当前 `levelNumber + 1` 规范化, And 用户自定义楼层名必须原样保留。
3. Given 用户切换当前编辑建筑层, When 该操作成功且没有修改 scene 内容, Then 当前层应切换, And 不应显示成功 toast 或制造额外提示噪音。
4. Given 用户选择素材后准备放置, When 未编辑已放置实例, Then 资产栏不再暴露待放置素材旋转控件, And 新放置实例使用 `rotationDegrees: 0`；已放置实例的旋转编辑能力仍保留。
5. Given 用户查看主画布或图片导出预览, When 画布/导出图形渲染完成, Then 0,0 和最大坐标提示必须稳定显示且对辅助技术隐藏, And 导出预览必须包含本地化的逐层图形和素材清单标签、单/复数建筑层摘要以及会进入导出图片的 `pokokit` 彩色 logo。

## Tasks / Subtasks

- [x] 统一楼层 display helper 与默认系统楼层名 (AC: 1, 2)
  - [x] 在 `packages/scene-core/src/domain/scene/levels.ts` 增加一基 display number / display id helper，并保留 `levelNumber` 零基。
  - [x] 默认 `createBuildingLevel()` 使用 `1层` 起始名称；locale helper 对系统生成的 `0层`/`Layer 0` 和当前 display 名称做规范化。
  - [x] selectors、selection summary、front/top/export summary 使用 shared display helper，不在 UI 组件内重新拼 `L${levelNumber}`。
- [x] 收敛楼层切换和放置旋转交互 (AC: 3, 4)
  - [x] `set-current` 成功切层时不显示 success toast，其他 create/copy/delete/rename 成功 toast 保持现有行为。
  - [x] 移除资产栏的待放置素材旋转按钮、状态文案和相关 i18n keys。
  - [x] 新放置素材固定写入 `rotationDegrees: 0`，但保留已放置实例的旋转 action bar 流程和测试。
- [x] 增加画布与导出图可读性标记 (AC: 5)
  - [x] Scene Canvas 每格渲染坐标水印，保持 aria-hidden，不改变 gridcell label 和可点击区域。
  - [x] Export Preview 的 layer graphic 外框显示 origin/max 坐标，逐层 section aria-label 使用 locale key。
  - [x] Export Preview 顶部摘要支持英文单/复数建筑层，底部 `pokokit` 彩色 logo 进入图片导出内容且不被 image-export filter 排除。
- [x] 更新回归测试和 smoke 覆盖 (AC: 1-5)
  - [x] 更新 scene-core levels/selectors/locale/export-summary/schema/short-string tests，验证零基数据和一基显示边界。
  - [x] 更新 AppShell、AssetPicker、BuildingLevelPanel、SceneCanvas、SelectionInspector、PreviewInspector、ExportPreview 和 image-export tests。
  - [x] 更新 Playwright smoke，覆盖中文/英文导出、楼层显示、坐标提示和 mobile read-only 预期。
  - [x] 运行 `pnpm run typecheck`、`pnpm run test`、`pnpm run build`、`pnpm run smoke` 和 `git diff --check`。

## Dev Notes

- Story 9.1 不改变 `SceneDocument v1` 的数据层号。`levelNumber`、`buildingLevelId`、schema、serializer、roundtrip、PSE1 短字符串和 Worker/MCP 结构化语义仍然以零基 level number 为内部事实。[Source: _bmad-output/planning-artifacts/epics.md#Story-9.1]
- 现有 UX-DR9 说左侧 Building Level Panel 需要把建筑层作为一等上下文展示，并按高层到低层视觉顺序显示。当前 story 只修正用户可见编号起点和导出可读性，不重新引入隐藏/锁定/undo/redo 等已裁剪能力。[Source: _bmad-output/planning-artifacts/epics.md#UX-DR9; _bmad-output/archive/2026-05-27/implementation-artifacts/completed-stories/5-2-clean-workbench-ui-and-preview-controls.md]
- `packages/scene-core` 是楼层 display helper、selectors、locale 和 export-summary 的来源；Web 组件应复用 shared helper，避免 Web/Worker/MCP 显示语义漂移。[Source: _bmad-output/planning-artifacts/architecture.md#Unified-Project-Structure; _bmad-output/archive/2026-05-27/implementation-artifacts/completed-stories/7-1-extract-scene-core-shared-package.md]
- 放置 footprint 旋转在 Epic 8 中用于预览大素材，但本 story 明确移除“待放置素材旋转”控件。不能删除已放置实例的旋转编辑路径，也不能删除实例数据中的 `rotationDegrees` 字段。[Source: _bmad-output/planning-artifacts/epics.md#Story-8.3; _bmad-output/planning-artifacts/architecture.md#Data-Models]
- 图片导出必须从 React-rendered preview 内容生成，safe text、image filter、素材清单真实实例计数和 footprint overlay 语义必须保持。[Source: _bmad-output/archive/2026-05-27/implementation-artifacts/completed-stories/6-3-image-file-generation-download-and-regression-tests.md; _bmad-output/archive/2026-05-27/implementation-artifacts/completed-stories/8-4-preview-export-footprint-rendering.md]
- 当前验证脚本来自 root `package.json`：`typecheck`、`test`、`build`、`smoke`。如 release gate 时间过长，至少必须先跑 story 指定的四个门禁和 `git diff --check`。[Source: package.json]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/domain/scene/levels.ts`
  - `packages/scene-core/src/domain/scene/selectors.ts`
  - `packages/scene-core/src/locale.ts`
  - `apps/web/src/components/app-shell/AppShell.tsx`
  - `apps/web/src/components/asset-picker/AssetPicker.tsx`
  - `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
  - `apps/web/src/components/selection-inspector/SelectionInspector.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.tsx`
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/styles.css`
  - related Vitest/Playwright regression tests

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-9.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Unified-Project-Structure]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Models]
- [Source: packages/scene-core/src/domain/scene/levels.ts]
- [Source: packages/scene-core/src/domain/scene/selectors.ts]
- [Source: apps/web/src/components/app-shell/AppShell.tsx]
- [Source: apps/web/src/components/export-preview/ExportPreview.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created from existing Epic 9 worktree diff after sprint tracker contained only completed Epic 1-8 entries.
- 2026-05-28: Started dev-story implementation and marked tracker in-progress.
- 2026-05-28: Fixed locale-switch autosave contamination found by Playwright smoke.
- 2026-05-28: Passed `pnpm run typecheck`.
- 2026-05-28: Passed `pnpm run test`.
- 2026-05-28: Passed `pnpm run build`.
- 2026-05-28: Passed `pnpm run smoke`.
- 2026-05-28: Passed `git diff --check`.
- 2026-05-28: bmad-code-review completed with clean review; no patch findings.

### Completion Notes List

- Added shared one-based building level display helpers while preserving zero-based `SceneDocument` data, level ids, schema, storage and short-string behavior.
- Normalized system-generated level names at display boundaries and updated selectors, locale helpers, export summaries and tests to use L1/1层 as the first visible layer.
- Removed placement-time rotation controls and defaulted new placements to `rotationDegrees: 0`, while keeping already placed instance rotation intact.
- Added aria-hidden coordinate watermarks to the canvas and origin/max coordinate labels plus localized labels, singular English summary text and an included `pokokit` logo to the export preview.
- Fixed locale switching so UI preference changes do not write autosave/saved `SceneDocument` payloads.
- Completed typecheck, unit/component/worker tests, production build, Playwright smoke and whitespace validation.

### Change Log

- 2026-05-28: Created Story 9.1 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented Epic 9.1 and moved status to review.
- 2026-05-28: Code review passed and moved Story 9.1 and Epic 9 to done.

### File List

- _bmad-output/implementation-artifacts/9-1-building-layer-export-readability-polish.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/planning-artifacts/epics.md
- apps/web/e2e/workbench-smoke.spec.ts
- apps/web/src/components/app-shell/AppShell.test.tsx
- apps/web/src/components/app-shell/AppShell.tsx
- apps/web/src/components/asset-picker/AssetPicker.test.tsx
- apps/web/src/components/asset-picker/AssetPicker.tsx
- apps/web/src/components/building-level-panel/BuildingLevelPanel.test.tsx
- apps/web/src/components/export-preview/ExportPreview.test.tsx
- apps/web/src/components/export-preview/ExportPreview.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.test.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.test.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.tsx
- apps/web/src/components/selection-inspector/SelectionInspector.test.tsx
- apps/web/src/components/selection-inspector/SelectionInspector.tsx
- apps/web/src/i18n/index.ts
- apps/web/src/io/image-export.test.ts
- apps/web/src/state/building-layer-edit.test.ts
- apps/web/src/styles.css
- packages/scene-core/src/domain/scene/default-scene.test.ts
- packages/scene-core/src/domain/scene/export-summary.test.ts
- packages/scene-core/src/domain/scene/levels.test.ts
- packages/scene-core/src/domain/scene/levels.ts
- packages/scene-core/src/domain/scene/selectors.test.ts
- packages/scene-core/src/domain/scene/selectors.ts
- packages/scene-core/src/io/scene-schema.test.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
- packages/scene-core/src/locale.ts
