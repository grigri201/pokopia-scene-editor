# Story 1.6: 建立移动端只读边界与响应式规则可见性

Status: done

## Story

As a 布景作者,
I want 在窄屏设备上仍能查看 7x7 画布、选中格和建筑层上下文,
so that 我可以检查场景规则而不会误触发编辑行为。

## Acceptance Criteria

1. Given 视口宽度小于 768px, when 用户打开应用或从桌面缩小到移动视口, then 系统应进入 `interactionMode = "readOnly"`, and 界面应明确显示只读模式或桌面端编辑状态。
2. Given 系统处于 mobile read-only mode, when 用户查看工作台, then 编辑控件、右侧素材栏、保存/删除、建层、上下文操作和染色控件应隐藏或禁用, and 只读查看所需的场景、画布、建筑层上下文和预览仍应可访问。
3. Given 系统处于 mobile read-only mode, when 用户查看画布, then 7x7 画布、主体区边界、外围区、当前建筑层和选中格状态仍应可访问, and 390x844 视口下不得出现控件重叠或关键坐标无法识别。
4. Given 系统处于 read-only mode, when 用户点击格子、移动查看焦点或查看当前层上下文, then 应允许选择格子和查看信息, and 不得修改 `SceneDocument`、dirty state、undo/redo history、素材实例、染色状态或建筑层数据。
5. Given read-only guard 已实现, when dev agent 检查 command layer、canvas pointer handler 和 keyboard handler, then 三处都应检查 `interactionMode`, and 禁止放置、移动、删除、旋转、染色、修改技能、修改建筑层、恢复替换、保存 dirty changes、自动保存和撤销/重做等会改变场景的行为。
6. Given dev agent 运行 Playwright smoke, when 测试 390x844 mobile read-only flow, then 应验证用户可以查看 7x7 画布、选择格子并看到坐标/区域/建筑层, and 应验证任何写入型命令不会改变 scene JSON 或 dirty state。

## Tasks / Subtasks

- [x] 建立只读 command guard (AC: 4, 5)
  - [x] `sceneReducer` 或 command boundary 接收 `interactionMode`
  - [x] read-only 下拒绝写入 `SceneDocument.workspaceState.selectedCoordinate`
  - [x] unit tests 验证 read-only command 返回原 scene、dirty state 和业务数组不变
- [x] 拆分移动端查看选择与桌面 scene 选择 (AC: 1, 4, 5)
  - [x] 桌面 edit mode 继续写入 scene selectedCoordinate
  - [x] mobile read-only mode 使用本地查看 selection, 仍可显示 selected context
  - [x] 画布 pointer/keyboard handler 显式接收并处理 `readOnly`
- [x] 强化移动端只读 UI 和响应式可见性 (AC: 1, 2, 3)
  - [x] 编辑控件保持 disabled/readOnly 或明确保留为查看控件
  - [x] 390x844 下无横向滚动、建筑层/选中格/画布关键坐标可识别
- [x] 补充 Playwright 只读防写入验证 (AC: 6)
  - [x] smoke 比较 mobile 交互前后的 scene JSON snapshot
  - [x] 覆盖点击格子、键盘移动、素材按钮、保存快捷键或删除键等写入型入口
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成评审修复后推进到 `done`

## Dev Notes

- Story 1.4 让桌面选择写入 `SceneDocument.workspaceState.selectedCoordinate`。本 story 需要在 mobile read-only mode 下保留查看选择能力, 但不得把移动端选择写回 `SceneDocument`。
- Story 1.5 已使建筑层上下文从 `SceneDocument` selector 派生, mobile 下必须继续可见。
- `src/state/interaction-mode.ts` 已定义 `<768px` 为 `readOnly`。
- 只读模式允许查看场景、选择格子、查看当前建筑层和预览; 禁止任何 scene JSON、dirty state、实例、建筑层、染色、技能、保存、撤销/重做变更。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck` passed after initial implementation.
- `npm run test` passed after initial implementation: 8 files, 42 tests.
- `npm run build` passed after initial implementation.
- `npm run smoke` passed after initial implementation: 2 Chromium smoke tests against production `dist`.
- Multi-agent code review found required-mode guard weakness, stale read-only selection after resize, weak snapshot assertion, missing explicit pointer-handler read-only branch, read-only invalid-coordinate throw, and mobile selection card layout shift.
- Post-review fix run: `npm run typecheck` passed.
- Post-review fix run: `npm run test` passed: 8 files, 42 tests.
- Post-review fix run: `npm run build` passed.
- Post-review fix run: `npm run smoke` passed: 2 Chromium smoke tests against production `dist`.

### Completion Notes List

- Made `interactionMode` required for scene selection commands and made read-only commands return the original scene before coordinate validation.
- Split desktop scene selection from mobile read-only view selection in `AppShell`.
- Added explicit read-only pointer and keyboard handling in `SceneCanvas`, including blocking edit shortcut keys.
- Added localhost-only scene snapshot test helper and strict Playwright JSON snapshot assertions for read-only no-write behavior.
- Covered mobile click selection, keyboard movement, delete/save shortcuts, resize round-trip selection sync, and no-overflow selection cards in smoke.
- Stabilized mobile selection/target card dimensions so focus updates do not move the canvas during pointer clicks.

### File List

- `_bmad-output/implementation-artifacts/1-6-mobile-readonly-boundary.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/state/scene-reducer.ts`
- `src/state/scene-reducer.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 1 Story 1.6 and moved into development.
- 2026-05-16: Implemented mobile read-only boundary, applied multi-agent review fixes, reran all gates, and marked story done.
