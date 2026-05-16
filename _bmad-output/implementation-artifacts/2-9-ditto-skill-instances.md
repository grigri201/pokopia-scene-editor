# Story 2.9: 在画布和编辑闭环中稳定标识百变怪技能实例

Status: done

## Story

As a 布景编辑用户,
I want 在放置前后清楚看到并维护需要百变怪技能的素材实例,
So that 我可以准确复现哪些实例需要特殊技能。

## Acceptance Criteria

1. Given 用户选择一个默认需要百变怪技能的素材, when 该素材进入待放置状态, then 工作台显示本次放置默认技能状态, and 用户可以在放置前覆盖本次放置是否需要技能。
2. Given 用户放置一个需要百变怪技能的实例, when 画布渲染该实例, then Scene Canvas 在该实例上显示技能角标或等效标识, and 标识结合图标、形态、文本、边框或角标中的至少两种视觉通道，不只依赖颜色。
3. Given 用户设置或编辑技能类型, when 技能类型控件渲染, then 可选词表只能包含 `树叶`、`耕地`、`储水`, and 画布和预览中的技能标记分别显示一字标签 `树`、`耕`、`水` 或等效可访问文本。
4. Given 用户在上下文/检查器字段中切换技能标记、技能类型或技能备注, when 修改成功, then 画布中的技能标识立即更新, and 同一素材模板的其他实例不受影响。
5. Given 用户为实例清除技能类型或技能备注, when 系统保存实例字段, then `skillType` 未设置时使用 `null`, and `skillNote` 为空时使用空字符串。
6. Given 用户关闭技能标记显示相关视图选项或隐藏所在建筑层, when 画布重新渲染, then 技能实例数据仍保留在 `SceneDocument` 中, and 仅显示状态变化，不删除或改写实例字段。
7. Given 用户执行放置、修改技能、移动、跨层移动、删除、撤销或重做, when 系统重新派生画布、上下文/检查器字段、建筑层列表和序列化状态, then 技能标记、技能类型和技能备注保持一致, and 自动化测试验证这些视图读取同一素材实例字段一致。

## Tasks / Subtasks

- [x] 收紧百变怪技能领域词表 (AC: 3, 5)
  - [x] 将 asset catalog 默认技能和 command 校验统一到 `树叶`、`耕地`、`储水`
  - [x] 提供一字技能标记派生 helper，避免组件各自硬编码
  - [x] 更新筛选、详情和放置预览中的技能显示
- [x] 强化 Scene Canvas 技能标识 (AC: 2, 3, 4, 6, 7)
  - [x] 技能实例显示一字角标和可访问文本
  - [x] 角标使用文本、边框、形态或角标位置等至少两种视觉通道
  - [x] 隐藏建筑层只改变显示，不改写实例技能字段
- [x] 补齐 Selection Inspector 技能编辑闭环 (AC: 3, 4, 5)
  - [x] 技能类型控件只提供 `树叶`、`耕地`、`储水`
  - [x] 保存技能标记、类型和备注后画布与实例字段同步刷新
  - [x] 清空技能类型和备注时保存为 `null` 与空字符串
- [x] 补充一致性测试和 smoke 覆盖 (AC: 1-7)
  - [x] unit tests 覆盖中文技能词表、清空语义和隐藏层保留数据
  - [x] component tests 覆盖技能类型选项、画布角标和实例级隔离
  - [x] Playwright smoke 覆盖放置前覆盖、技能编辑和序列化一致
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Architecture Data Exchange 已明确 `skillType` 未设置时为 `null`，已设置时只允许 `树叶`、`耕地`、`储水`；不要继续使用旧的 `leaf`、`soil`、`water` 作为持久字段。
- Story 2.8 已把实例级技能编辑放入 `editAssetInstance`；本 story 应继续扩展该 command boundary，React 组件不得直接改 `tileInstances`。
- `SceneCanvas` 目前已从 `CanvasCellContext` 派生当前层和其他可见层实例；技能角标应从同一实例字段派生，不维护组件级副本。
- 隐藏层、锁定层和 Mobile View-only Mode 仍按前序 stories 的 read-only/visibility 规则执行；隐藏只影响渲染，不得删除或清理技能字段。
- 技能备注属于用户输入文本，必须保持 React 文本渲染，不使用 HTML parser 或 `dangerouslySetInnerHTML`。
- 预览检查器尚未进入 Epic 3；本 story 中的“预览”可以覆盖现有 target/placement preview 与 canvas 标识，后续 Epic 3 继续扩展双预览。

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
- `npm run test -- --run` - pass, 17 files / 127 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- 素材默认技能、技能筛选、放置预览和实例编辑统一使用 `树叶`、`耕地`、`储水`。
- 新增统一技能角标 helper，画布技能实例显示一字 `树`、`耕`、`水` 或未设置 fallback `技`。
- Scene Canvas 技能角标通过文本、角标位置、边框和形态表达，不再显示旧 `skill` 文本。
- Selection Inspector 技能类型控件只暴露中文词表，并继续支持清空为 `null` 与空字符串。
- Review 修复：legacy `leaf`/`soil`/`water` 会归一到中文词表，未知旧值不会隐藏提交；domain `TileInstance.skillType` 收紧到 `AssetSkillType`。
- Review 修复：堆叠格子的技能角标改为明确的 stack-level 可访问文案，避免把下层技能误归到顶层实例。
- Review 修复：AppShell 增加 undo/redo 历史栈，smoke 覆盖技能编辑后的撤销/重做一致性。
- Smoke 覆盖技能类型编辑、undo/redo 和序列化字段读取同一实例数据。

### File List

- `_bmad-output/implementation-artifacts/2-9-ditto-skill-instances.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/components/selection-inspector/SelectionInspector.test.tsx`
- `src/domain/assets/catalog.ts`
- `src/domain/assets/catalog.test.ts`
- `src/domain/assets/filters.test.ts`
- `src/domain/scene/tile-instance.ts`
- `src/domain/scene/tile-instance.test.ts`
- `src/domain/scene/types.ts`
- `src/state/asset-instance-edit.ts`
- `src/state/asset-instance-edit.test.ts`
- `src/state/asset-placement.test.ts`
- `src/state/building-layer-edit.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.9 and moved to in-progress.
- 2026-05-16: Implemented Ditto skill vocabulary, markers, edit loop, tests and moved story to review.
- 2026-05-16: Addressed review findings for legacy skill values, stack-level markers, skill typing and undo/redo; marked story done.
