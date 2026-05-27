# Story 1.5: 显示默认建筑层与当前编辑层上下文

Status: done

## Story

As a 布景作者,
I want 在工作台中看到默认 0/1/2 建筑层和当前编辑层,
so that 我能理解布景从一开始就是按建筑层组织的。

## Acceptance Criteria

1. Given 默认场景已创建, when 用户打开工作台, then 建筑层区域应显示 0 层、1 层、2 层, and 应清楚标识当前编辑建筑层, 默认当前层应来自 scene state 的单一事实来源。
2. Given 用户查看建筑层区域, when 建筑层列表渲染, then 数据层号仍按 0 层到 2 层定义, 但工作台视觉顺序应按 L2、L1、L0 从高到低展示, and 层号、层名称、实例数量、可见/锁定状态和当前层标识不得在 1280x720 桌面视口和 390x844 窄视口下截断到无法识别。
3. Given 默认建筑层规则已实现, when dev agent 检查 state 和 domain 边界, then 建筑层列表、当前层状态和画布当前层显示应从同一个 `SceneDocument` 或统一 selector 派生, and 组件不得复制建筑层业务字段作为独立 truth。
4. Given 当前层发生变化的能力在后续 epic 中扩展, when 本 story 提供建筑层领域规则, then 新增层号分配、层排序和默认层创建规则应已经可由 unit tests 验证, and 不应在本 story 实现删除、重命名、复制、隐藏、锁定或素材跨层移动等 Epic 2 范围行为。
5. Given dev agent 运行测试, when 测试建筑层默认状态, then 应验证默认层数量为 3、层号为 0/1/2、排序稳定、当前编辑层可见, and 建筑层操作入口应具备可访问名称或为后续 story 预留明确的可访问结构。

## Tasks / Subtasks

- [x] 建立建筑层 selector 上下文 (AC: 1, 2, 3)
  - [x] 从 `SceneDocument.buildingLevels` 和 `workspaceState.currentBuildingLevelId` 派生展示列表
  - [x] 展示顺序使用现有高层到低层排序规则
  - [x] 计算每层素材实例数量、当前层、可见和锁定状态
- [x] 改造 BuildingLevelPanel (AC: 1, 2, 3, 5)
  - [x] 移除静态层列表, 由 `AppShell` 传入 selector 输出
  - [x] 明确展示 L2/L1/L0、层名称、实例数量、Visible/Locked 状态和 Current 标识
  - [x] 为后续设置当前层、显示/隐藏、锁定/解锁入口预留可访问结构, 但不实现写操作
- [x] 补充测试与 smoke 覆盖 (AC: 2, 4, 5)
  - [x] unit tests 覆盖默认层、排序、当前层和实例计数
  - [x] component tests 覆盖 BuildingLevelPanel 的列表顺序、状态和可访问入口
  - [x] Playwright smoke 覆盖桌面和 390x844 窄视口下建筑层上下文可见
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成评审修复后推进到 `done`

## Dev Notes

- Story 1.2 已建立默认 `0/1/2` 建筑层、`sortBuildingLevelsForDisplay` 和 `getNextBuildingLevelNumber`。
- Story 1.4 已将 `AppShell` 连接到默认 `SceneDocument`, 并要求画布、上下文和面板从 shared selectors 派生。
- 本 story 只展示默认层与当前层上下文。删除、重命名、复制、显示/隐藏、锁定/解锁和切换当前编辑层的写操作属于 Epic 2 或后续 story, 不在本 story 实现。
- 建筑层数据顺序仍为 0 层到 n 层; UI 展示顺序为高层到低层, 例如 L2、L1、L0。

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
- `npm run test` passed after initial implementation: 8 files, 37 tests.
- `npm run build` passed after initial implementation.
- `npm run smoke` passed after initial implementation: 2 Chromium smoke tests against production `dist`.
- Multi-agent code review found BMAD status cleanup, invalid level reference handling, hidden/locked current layer editability, mobile overflow assertion, and disabled-action reason coverage gaps.
- Post-review fix run: `npm run typecheck` passed.
- Post-review fix run: `npm run test` passed: 8 files, 40 tests.
- Post-review fix run: `npm run build` passed.
- Post-review fix run: `npm run smoke` passed: 2 Chromium smoke tests against production `dist`.

### Completion Notes List

- Added building level selector contexts derived from `SceneDocument`, including L2/L1/L0 display ids, current state, visible/locked state and per-level instance counts.
- Replaced the static BuildingLevelPanel list with selector-driven rendering from `AppShell`.
- Added reserved, disabled Set/Hide/Lock action structure with accessible labels and explicit disabled reasons for read-only versus future-story reservation.
- Added selector validation for unknown current layer ids, duplicate building level ids and tile instances referencing unknown levels.
- Updated SceneCanvas editability and labels so hidden or locked current layers are non-editable even in desktop edit mode.
- Added unit, component and Playwright coverage for building layer context, invalid references, disabled reasons and mobile overflow constraints.

### File List

- `_bmad-output/implementation-artifacts/1-5-building-layer-context.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/selectors.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 1 Story 1.5 and moved into development.
- 2026-05-16: Implemented selector-driven building level context, applied multi-agent review fixes, reran all gates, and marked story done.
