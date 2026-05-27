# Story 3.1: 渲染左下双预览检查器

Status: done

## Story

As a 布景编辑用户,
I want 在工作台左下同时看到俯视图和正视图预览,
So that 我可以在不离开画布的情况下校验当前布景结构。

## Acceptance Criteria

1. Given 用户位于桌面或平板编辑工作台，且当前存在有效 `SceneDocument`, when Preview Inspector 渲染, then 左下检查器同时显示正视图和俯视图缩略预览, and 预览区域不得遮挡中央 7×7 画布、左侧建筑层面板或当前素材上下文。
2. Given 用户查看 Preview Inspector, when 场景中已有素材实例、当前建筑层、选中格子或选中实例, then 双预览内容从同一 scene state 和 shared selectors 派生, and 预览不得维护独立的素材实例、坐标、建筑层或选中状态副本。
3. Given 用户处于只读模式或 Mobile View-only Mode, when 用户查看 Preview Inspector, then 系统允许查看、选择格子或实例、缩放和平移, and 不允许通过预览触发放置、移动、删除、旋转、染色、修改技能、保存或 dirty state 变化。

## Tasks / Subtasks

- [x] 建立 Preview Inspector 数据入口 (AC: 2, 3)
  - [x] 从 AppShell 传入当前 scene、当前显示建筑层、选中坐标和选中实例
  - [x] Preview Inspector 只读展示，不接收任何写操作 handler
  - [x] 派生数据复用 `getCanvasCellContexts`、`getBuildingLevelContexts` 或等效 shared selectors
- [x] 渲染左下双预览骨架 (AC: 1, 2)
  - [x] 同时显示俯视图和正视图预览区域
  - [x] 展示当前层、实例数量、选中坐标/实例和只读状态
  - [x] 布局保持在左下，不遮挡画布、建筑层面板或当前素材上下文
- [x] 保持预览只读边界 (AC: 3)
  - [x] Preview Inspector 不触发 dirty state 或 scene document 写入
  - [x] Mobile/read-only 下继续显示派生摘要
  - [x] 不在预览中实现放置、移动、删除、旋转、染色或技能编辑
- [x] 补充测试与 smoke 覆盖 (AC: 1-3)
  - [x] component tests 覆盖双预览、派生摘要和只读状态
  - [x] smoke 覆盖首屏左下双预览可见且读取同一 scene snapshot
  - [x] gates 覆盖 typecheck/test/build/smoke/diff check
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- 当前 `PreviewInspector` 是静态占位；本 story 应把它接入 AppShell 的 scene state，但保持只读。
- Epic 3 后续 stories 会扩展完整 7×7 俯视图、当前层/全部可见层、正视图高度结构、网格/边界/技能显示选项；本 story 先建立双预览检查器和 shared selector 数据入口。
- 不要在 Preview Inspector 内维护独立业务副本；预览摘要必须从传入 scene 和 shared selectors 派生。
- Mobile `<768px` 仍为严格 view-only；预览允许查看，不允许写入 scene、dirty state 或 undo/redo history。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`
- `git diff --check`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck` - pass
- `npm run test -- --run` - pass, 18 files / 132 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- Preview Inspector 接入 AppShell 的 `SceneDocument`、当前显示建筑层、选中坐标和选中实例 id。
- 俯视/正视两个预览区域通过 `getPreviewInspectorContext`、`getVisibleBuildingLevelContexts`、`getCanvasCellContexts` 和 `getCellContext` 派生摘要。
- Preview Inspector 不接收写操作 handler，Mobile/read-only 下的格子选择、缩放和平移只影响本地 view state，不改 scene。
- Review 修复：可见层摘要排除隐藏层实例；隐藏当前层时不显示隐藏素材名。
- Review 修复：正视图层柱高度归一化并使用 `list`/`listitem` 暴露；5+ 层不会溢出预览区域。
- Review 修复：左侧工作台改为 viewport-bounded/sticky 布局，smoke 检查 1280×720 首屏内可见。
- Smoke 覆盖首屏双预览、当前层摘要、放置后实例/选择摘要同步和首屏位置。

### File List

- `_bmad-output/implementation-artifacts/3-1-dual-preview-inspector.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/selectors.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 3 Story 3.1 and moved to in-progress.
- 2026-05-16: Implemented dual preview inspector data entry, derived read-only summaries and tests; moved story to review.
- 2026-05-16: Addressed review findings for visible-layer summaries, bounded layout, read-only preview view state and accessibility; marked story done.
