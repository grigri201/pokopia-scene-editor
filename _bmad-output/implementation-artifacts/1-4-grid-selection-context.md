# Story 1.4: 支持格子选择与当前区域上下文

Status: done

## Story

As a 布景作者,
I want 点击或键盘移动选择一个画布格子,
so that 我能知道当前编辑对象的坐标、区域类型和建筑层上下文。

## Acceptance Criteria

1. Given 用户在桌面编辑模式下看到 7x7 画布, when 用户点击任意格子, then 该格子应成为当前选中格子, and 选中状态不得只依赖颜色, 必须至少结合边框、焦点样式、角标、形态或文本状态中的两种视觉通道。
2. Given 用户选中了任意格子, when 上下文/检查器或状态区域更新, then 应显示选中格子的 0-based x/y 坐标、区域类型 `main` 或 `outer`、当前建筑层, and 未放置素材时应显示明确空状态, 而不是空白面板。
3. Given 用户悬停或聚焦一个格子, when 画布展示目标上下文, then 应显示目标坐标、区域类型、当前建筑层和可放置区域状态, and 这些信息应从同一个 `SceneDocument` 与 selector 派生, 不得在组件中重复实现 area 判断。
4. Given 用户使用键盘操作画布, when 用户按 Tab、Shift+Tab、方向键、Enter 或 Space, then 应能访问画布并移动或确认当前选中格, and 键盘选择不得改变 scene document 中的素材实例、建筑层或 dirty state。
5. Given 1280x720 桌面视口下的默认场景, when 用户选择格子, then 可见状态更新应在 100ms 内完成, and 应使用浏览器性能标记、测试辅助函数或等效自动化计时为该交互留下可验证路径。

## Tasks / Subtasks

- [x] 建立选择状态写入边界 (AC: 1, 4)
  - [x] 使用 reducer/command 更新 `SceneDocument.workspaceState.selectedCoordinate`
  - [x] 点击、Enter/Space 和方向键能选择格子
  - [x] 选择不得改变 `tileInstances`、`buildingLevels` 或 `workspaceState.saveStatus`
- [x] 从 selector 派生当前/目标上下文 (AC: 2, 3)
  - [x] 添加 selector 返回坐标、area type、当前建筑层、可放置状态和空状态
  - [x] hover/focus 显示 target context, selected 显示 current context
  - [x] 组件不重复实现 area 判断
- [x] 强化选中格视觉与可访问状态 (AC: 1, 2, 3)
  - [x] 选中状态使用边框/形态、角标/文本、ARIA current/pressed 等多通道表达
  - [x] 未选中时显示明确空状态
- [x] 添加性能与交互测试 (AC: 4, 5)
  - [x] reducer unit tests 覆盖点击/键盘选择不污染业务数据或 dirty state
  - [x] component/Playwright 覆盖点击选择、键盘移动、target context 和 selection performance measure
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明、文件列表
  - [x] 完成评审修复后推进到 `done`

## Dev Notes

- Story 1.2 已建立 `SceneDocument.workspaceState.selectedCoordinate` 和 domain area helpers。
- Story 1.3 已建立 49 个可定位 cell、ARIA grid row/col、placeable/editable 区分和 production smoke。
- 本 story 可改变 `workspaceState.selectedCoordinate`, 但不得把选择动作视为 dirty scene edit。
- 完整素材放置、实例属性编辑和 dirty save flow 属于后续 stories。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck` passed.
- `npm run test` initially passed after implementation: 7 files, 30 tests.
- `npm run build` passed.
- `npm run smoke` passed: 2 Chromium smoke tests against production `dist`.
- Multi-agent code review found coordinate shape pollution, read-only ARIA mismatch, hover/focus target loss, selector/component context split, and pre-paint performance measurement risk.
- Post-review fix run: `npm run typecheck` passed.
- Post-review fix run: `npm run test` passed: 7 files, 34 tests.
- Post-review fix run: `npm run build` passed.
- Post-review fix run: `npm run smoke` passed: 2 Chromium smoke tests against production `dist`.

### Completion Notes List

- Added scene selectors for selected/target cell context from `SceneDocument`.
- Added scene reducer selection command and keyboard coordinate movement helper without dirtying scene content.
- Wired `AppShell` to a default `SceneDocument`, selected/target context state, and performance marks/measures.
- Added `SelectionInspector` to show selected and target coordinates, area, layer, occupancy and placeable state.
- Updated `SceneCanvas` for click selection, hover/focus target context, Enter/Space confirmation and arrow-key movement.
- Added multi-channel selected-cell visuals with outline, selected cue, ARIA selected/current and data attributes.
- Expanded unit and Playwright coverage for selection, target context, keyboard movement and 100ms performance measurement path.
- Fixed review findings by normalizing selected coordinates, splitting hover/focus target state, deriving canvas cells from `SceneDocument` selectors, scoping keyboard focus lookup to the active grid, and measuring selection visibility after render with double `requestAnimationFrame`.

### File List

- `_bmad-output/implementation-artifacts/1-4-grid-selection-context.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/app-shell/AppShell.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/domain/scene/index.ts`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/selectors.test.ts`
- `src/state/index.ts`
- `src/state/scene-reducer.ts`
- `src/state/scene-reducer.test.ts`
- `src/styles.css`
- `e2e/workbench-smoke.spec.ts`

### Change Log

- 2026-05-16: Story created from BMAD epics and prior canvas/domain context.
- 2026-05-16: Implemented grid selection and context display, then advanced story to review.
- 2026-05-16: Applied multi-agent review fixes, reran all gates, and marked story done.
