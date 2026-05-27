# Story 2.7: 支持同坐标跨建筑层放置与跨层移动

Status: done

## Story

As a 布景编辑用户,
I want 在不同建筑层的同一坐标放置和移动不同素材,
So that 我可以表达垂直层级关系而不是被单层规则限制。

## Acceptance Criteria

1. Given 当前场景有多个建筑层, when 用户在不同建筑层的同一 x/y 坐标放置不同素材, then 系统允许每个建筑层各自保存该坐标的素材实例, and 同层同格叠放规则不错误地应用到不同建筑层之间。
2. Given 用户切换当前编辑建筑层, when 同坐标在其他层已有内容, then 画布清楚表达当前层内容和其他可见层内容的关系, and 用户不会误以为其他层内容被覆盖或删除。
3. Given 用户选中一个已放置素材实例, when 用户将其移动到另一个建筑层, then 系统更新该实例的建筑层归属, and 保留素材 ID、坐标、技能标记、技能类型、技能备注、朝向、染色和备注。
4. Given 用户跨层移动素材到目标层同坐标, when 目标层同格存在素材, then 系统按目标层内素材可叠放属性判断允许叠放、需要替换确认或拒绝移动, and 判断结果在执行前可见。
5. Given 目标建筑层已锁定, when 用户尝试移动素材到该层或从该层移出, then command layer 拒绝操作并说明锁定原因, and 原实例保持在原建筑层、原坐标和原属性状态。

## Tasks / Subtasks

- [x] 扩展 scene selector 的跨层同坐标上下文 (AC: 1, 2)
  - [x] 保持当前层 `tileInstances` 语义不变
  - [x] 额外派生其他可见层同坐标实例数量/列表
  - [x] SceneCanvas 显示其他可见层提示且不替代当前层内容
- [x] 扩展放置和移动 command 层 (AC: 1, 3, 4, 5)
  - [x] 验证跨层同坐标放置只看当前层冲突
  - [x] `editAssetInstance` 支持移动到目标建筑层
  - [x] 校验源层/目标层 visible/locked、目标层存在、区域兼容和目标层内冲突
  - [x] 跨层移动保留实例字段并更新 `buildingLevelId`
- [x] 接入实例检查器跨层移动 UI (AC: 3, 4, 5)
  - [x] 提供目标建筑层选择
  - [x] move preview 基于目标层同格实例和目标层锁定状态
  - [x] 移动执行时传递目标建筑层
- [x] 补充测试与 smoke 覆盖 (AC: 1-5)
  - [x] unit tests 覆盖跨层同坐标放置、跨层移动保留字段、目标层冲突和锁定失败
  - [x] component tests 覆盖目标层选择和跨层 move preview
  - [x] Playwright smoke 覆盖同坐标跨层放置和跨层移动
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 2.3 的 `placeSelectedAsset` 已按当前层过滤替换目标；本 story 要把该行为固化为测试，避免未来把不同建筑层同坐标误判为同层冲突。
- Story 2.4 的 `editAssetInstance` 已集中处理实例移动、旋转、染色、备注；跨层移动应继续走这个 command helper，不要在 React 层直接改 `tileInstances`。
- Story 2.5/2.6 的 building layer command 已定义 visible/locked/current 规则；跨层移动必须遵守同一套 source/target layer guard。
- 画布仍以当前建筑层为主视图；其他可见层提示只能作为上下文，不能让用户误以为当前层也有该实例。
- Mobile `<768px` 仍为严格 read-only，不应启用跨层移动。

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
- `npm run test` - pass, 17 files / 113 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- `getCellContext`/`getCanvasCellContexts` 新增其他可见层同坐标实例派生，当前层 occupancy 保持独立。
- `SceneCanvas` 显示其他可见层实例提示，并提供 `data-other-layer-instance-count` 供 smoke 验证。
- `editAssetInstance` 的 move command 支持目标建筑层，校验目标层存在、visible、locked、区域兼容和目标层内冲突。
- `SelectionInspector` 新增目标建筑层选择，move preview 和执行都使用目标层上下文。
- Code review 后修复：目标层选择不再被备注/染色同步重置；同层同格移动为 no-op 且不 dirty；smoke 断言同一 `instanceId` 被移动而不是复制。
- Smoke 覆盖 L1 同坐标放置、其他层提示、跨层移动冲突预览和成功移动。

### File List

- `_bmad-output/implementation-artifacts/2-7-cross-layer-placement-move.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/components/selection-inspector/SelectionInspector.test.tsx`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/selectors.test.ts`
- `src/state/asset-instance-edit.ts`
- `src/state/asset-instance-edit.test.ts`
- `src/state/asset-placement.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.7 and moved to in-progress.
- 2026-05-16: Implemented cross-layer placement/move and moved story to review.
- 2026-05-16: Addressed review findings and marked story done.
