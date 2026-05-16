# Story 3.4: 渲染正视图结构化高度预览

Status: done

## Story

As a 布景编辑用户,
I want 在左下检查器中查看正视图预览里的主体区、外围区和建筑层高度关系,
So that 我可以校验布景的层级结构是否便于复现。

## Acceptance Criteria

1. Given 用户位于编辑工作台且当前存在有效场景, when Preview Inspector 渲染, then 正视图作为左下双预览的一部分持续可见, and 正视图区域支持独立纵向滚动，不改变中央画布尺寸。
2. Given 用户打开正视图预览, when 场景包含主体区、外围装饰区和多个建筑层, then 正视图以结构化方式展示区域分组、层号顺序和高度关系, and 正视图不实现真实游戏视角、复杂遮挡、高拟真渲染或会误导用户的透视效果。
3. Given 用户在 scene 中修改建筑层、素材实例位置、可见层或当前层, when 正视图重新渲染, then 正视图从同一 scene state 和 shared selectors 派生结构数据, and 正视图不得形成可编辑的独立预览状态或写回 scene JSON。

## Tasks / Subtasks

- [x] 派生正视图结构数据 (AC: 2, 3)
  - [x] shared selector 输出当前 scope 下每个可见层的层号、层名、高度百分比和锁定状态
  - [x] shared selector 按主体区 / 外围区统计每层素材数量
  - [x] 技能标记数量从同一实例数据派生，供后续 overlay story 复用
- [x] 渲染结构化正视图 (AC: 1, 2)
  - [x] Front preview 持续保留在左下双预览中
  - [x] 正视图展示层号顺序、高度关系、主体区数量和外围区数量
  - [x] 使用结构化列表/条带表达，不做真实透视、复杂遮挡或高拟真画面
  - [x] 正视图结构区域支持独立纵向滚动
- [x] 保持只读与单一事实来源 (AC: 3)
  - [x] 正视图不接收写操作 handler
  - [x] scope 切换、当前层变化、隐藏/显示层和素材移动后从 shared selectors 重新派生
  - [x] 不写入 `SceneDocument`、dirty state、undo/redo 或 scene JSON
- [x] 补充自动化覆盖 (AC: 1-3)
  - [x] component tests 覆盖结构行、主体/外围统计、高度百分比、锁定状态和当前/全部可见 scope
  - [x] smoke 覆盖正视图结构数据随放置、移动、隐藏/显示和 scope 切换更新
  - [x] gates 覆盖 typecheck/test/build/smoke/diff check
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 3.1 建立 Preview Inspector 只读数据入口；Story 3.2 完成 Top preview 49 格与主体边界；Story 3.3 增加当前层 / 全部可见层 scope、render order selector、locked 状态和 full asset stack。
- 本 story 应继续复用 scene selectors，不在组件中重复 level ordering、visibility、area 或 height 规则。
- PRD 明确正视图应表达主体区、外围装饰区和建筑层高度关系，正视图可独立滚动；架构明确 MVP 正视图是结构化高度关系预览，不做真实游戏视角和复杂遮挡模拟。
- 正视图结构数据应从同一 `SceneDocument` 派生，隐藏层排除，锁定层保留状态上下文，当前层 scope 中隐藏当前层时不显示隐藏素材。
- Mobile/read-only 下正视图仍允许查看和滚动，但不得触发任何 scene 写入、dirty state 或 undo/redo。

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
- `npm run test -- --run src/domain/scene/selectors.test.ts src/components/preview-inspector/PreviewInspector.test.tsx` - pass, 2 files / 14 tests
- `npm run test -- --run` - pass, 18 files / 135 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- Added shared front preview selectors for current-layer and all-visible scopes, including height percentage, main/outer counts, skill count and lock state.
- Front preview now renders a structure-only, independently scrollable layer list alongside height bars.
- Front structure rows expose per-layer area grouping and height relationship through accessible names and data attributes.
- Smoke covers front structure persistence, scroll styling, placement updates, all-visible scope, hidden-layer exclusion and lock state.
- Review 修复：正视图 area 统计改为从坐标和 scene dimensions 重新计算，不信任持久化 `areaType`。
- Review 修复：高度比例按全部建筑层最大层号固定计算，隐藏高层不会让低层高度漂移。
- Review 修复：底层 front selector helper 收为私有并按层索引一次累加，减少重复扫描和未来误用。
- Review 修复：smoke 构造可滚动正视图，验证独立滚动不改变中央画布尺寸，并补 mobile/read-only front structure 不写 scene 覆盖。

### File List

- `_bmad-output/implementation-artifacts/3-4-front-view-height-preview.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/selectors.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 3 Story 3.4 and moved to ready-for-dev.
- 2026-05-16: Story moved to in-progress for implementation.
- 2026-05-16: Implemented structured front-view height preview and moved story to review.
- 2026-05-16: Fixed review findings for stable height scale, shared area derivation, front scroll coverage and mobile read-only coverage; moved story to done.
