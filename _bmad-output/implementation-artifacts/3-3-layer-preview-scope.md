# Story 3.3: 选择预览当前建筑层或全部可见建筑层

Status: done

## Story

As a 布景编辑用户,
I want 控制预览范围为当前建筑层或全部可见建筑层,
So that 我可以分别校验单层细节和多层整体布景。

## Acceptance Criteria

1. Given 场景包含多个建筑层，且至少一个建筑层可见, when 用户在 Preview Inspector 控制中选择“当前层”, then 预览只显示当前编辑建筑层中可见且未被隐藏层排除的内容, and 预览区域明确显示当前层号、层名和当前层预览状态。
2. Given 场景包含多个可见建筑层, when 用户在 Preview Inspector 控制中选择“全部可见层”, then 预览按建筑层层号从 0 到 n 的顺序展示所有可见层内容, and 隐藏层保留数据但不参与预览显示。
3. Given 用户切换当前建筑层、显示/隐藏建筑层或锁定/解锁建筑层, when 当前预览范围为“当前层”或“全部可见层”, then 预览通过 `selectVisibleLevels`、`selectPreviewTiles` 或等效 shared selectors 更新, and 不在预览组件中重复实现 level ordering、visibility 或 area 规则。

## Tasks / Subtasks

- [x] 增加 Preview Inspector 范围控制 (AC: 1, 2)
  - [x] 使用分段控件或等效可访问控件切换“当前层”和“全部可见层”
  - [x] 控件只改变本地 preview view state，不写入 `SceneDocument`、dirty state 或 undo/redo history
  - [x] 预览摘要明确显示当前范围、当前层号/层名或全部可见层状态
- [x] 派生当前层与全部可见层预览数据 (AC: 1-3)
  - [x] 当前层范围继续复用 `getCanvasCellContexts` / `getPreviewInspectorContext`
  - [x] 全部可见层范围使用 shared selector 按 `levelNumber` 0 到 n 聚合可见层素材
  - [x] 隐藏层素材不参与全部可见层预览，但原始 scene 数据保持不变
- [x] 更新 Top/Front preview 表达 (AC: 1, 2)
  - [x] Top preview 在全部可见层范围中显示可见层聚合内容、实例数量和技能标记
  - [x] Front preview 在当前层与全部可见层范围中使用一致的可见层排序和层摘要
  - [x] 锁定/解锁只作为状态上下文展示，不影响只读预览是否显示素材
- [x] 补充自动化覆盖 (AC: 1-3)
  - [x] component tests 覆盖范围切换、隐藏层排除、层号 0 到 n 顺序和只读不写 scene
  - [x] smoke 覆盖切换当前层/全部可见层、隐藏/显示层后预览状态更新
  - [x] gates 覆盖 typecheck/test/build/smoke/diff check
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 3.1 已将 Preview Inspector 接入 AppShell 的 `SceneDocument`、当前显示建筑层、选中坐标和选中实例 id；Story 3.2 已补全 49 格 Top preview、主体边界、素材/技能 data 属性和编辑闭环一致性。
- 本 story 不应新建独立业务缓存。Preview scope 可以是组件本地 UI state，但预览内容必须从 scene 和 shared selectors 派生。
- 架构要求：Scene Canvas 和 Preview 依赖同一组 selectors，不能重复实现 render ordering、visibility 或 area 规则；Preview Inspector derives front/top previews from scene and view options。
- PRD/UX 要求：Preview Switcher 包含当前层/全部可见层选项，隐藏层排除，使用分段控件或标签页语义且有可访问名称。
- 当前 selector 基础：`getPreviewInspectorContext` 提供 active level/cells、active layer instances、visible levels 和 visible tile instances；`getVisibleBuildingLevelContexts` 已过滤隐藏层并按 Building Level Panel 的显示顺序返回。若全部可见层需要从 0 到 n 顺序，需新增或复用按 `levelNumber` 升序的 shared selector，避免在组件里手写排序规则。
- Mobile/read-only 下范围切换仍允许作为查看状态；禁止触发 scene 写入、dirty state 或 undo/redo history。

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
- `npm run test -- --run src/domain/scene/selectors.test.ts src/components/preview-inspector/PreviewInspector.test.tsx` - pass, 2 files / 12 tests
- `npm run test -- --run src/domain/scene/selectors.test.ts src/components/preview-inspector/PreviewInspector.test.tsx` - pass after review fixes, 2 files / 13 tests
- `npm run test -- --run` - pass, 18 files / 134 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- Preview Inspector 新增“当前层 / 全部可见层”范围切换，切换只影响本地预览状态，不写入 scene、dirty state 或 undo/redo history。
- 新增 shared selectors：按 `levelNumber` 0 到 n 输出可见层预览顺序，并为全部可见层聚合每个 7×7 格子的可见实例。
- Top preview 在全部可见层范围中暴露 layer stack、实例数、top asset 和技能标记；隐藏层不参与聚合。
- Front preview 按当前 scope 渲染当前层或全部可见层，并复用同一层级顺序与可见性规则。
- Review 修复：Preview layer summary、Front bar 和 all-visible cell stack 暴露 locked/unlocked 状态，锁定层仍显示素材但作为状态上下文可检查。
- Review 修复：全部可见层重叠格暴露完整 asset stack，例如 `L0 Wooden Floor → L1 Roof Tile`，避免只显示顶层素材。
- Review 修复：Mobile/read-only smoke 覆盖 scope 切换、预览 focus、zoom/pan 不写入 scene snapshot、dirty state 或 undo/redo。
- Smoke 覆盖 scope 切换、隐藏/显示当前层后预览排除/恢复隐藏层素材，以及回到当前层后预览状态。

### File List

- `_bmad-output/implementation-artifacts/3-3-layer-preview-scope.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/domain/scene/levels.ts`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/selectors.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 3 Story 3.3 and moved to ready-for-dev.
- 2026-05-16: Story moved to in-progress for implementation.
- 2026-05-16: Implemented preview layer scope selectors, controls and tests; moved story to review.
- 2026-05-16: Fixed review findings for locked state, full asset stack and mobile read-only coverage; moved story to done.
