# Story 2.2: 搜索、分类、喜好、区域与技能筛选素材

Status: done

## Story

As a 布景编辑用户,
I want 按关键词、分类、Pokemon 喜好、适用区域和技能条件筛选素材,
So that 我可以快速找到适合当前格子和编辑意图的素材。

## Acceptance Criteria

1. Given 素材目录已加载, when 用户输入关键词, then Asset Picker 按素材名称、ID、分类或标签返回匹配结果, and 结果计数通过可访问方式更新。
2. Given 用户选择素材分类筛选项, when 筛选条件生效, then 列表只显示符合所选分类的素材, and 用户可以清除筛选恢复全部结果。
3. Given 用户开启只显示喜好素材, when 当前 Pokemon 与素材喜好字段匹配, then 列表只显示当前 Pokemon 喜好的素材, and 若没有喜好匹配，空状态应提供关闭喜好筛选或显示全部素材的恢复动作。
4. Given 用户选择适用区域筛选项, when 筛选条件生效, then 列表只显示适用于主体区、外围区或全部区域的素材, and 素材卡片仍显示其适用区域，避免用户误解放置范围。
5. Given 用户选择技能相关筛选项, when 用户按默认需要百变怪技能、技能类型或本次放置技能候选筛选, then 列表只显示符合技能条件的素材, and 默认技能状态在每个素材卡片上可见。
6. Given 用户组合关键词、分类、喜好、区域和技能筛选, when 没有素材匹配, then 系统显示空状态, and 空状态提供清除筛选、显示全部或切换分类的恢复动作。
7. Given 素材目录包含 1,000 个以内素材, when 用户输入搜索词、切换筛选或滚动列表, then 首屏可见结果更新在 200ms 目标内完成, and 如果一次性渲染超过 100 个素材卡片，列表采用分页、虚拟滚动或等效机制限制首屏渲染量。

## Tasks / Subtasks

- [x] 建立 asset filtering domain helpers (AC: 1-7)
  - [x] 定义关键词、分类、区域、favorite-only 和技能筛选状态类型
  - [x] 过滤按素材名称、官方 ID、分类和标签匹配关键词
  - [x] 分类、区域、喜好、默认技能、技能类型和技能候选筛选可组合
  - [x] 一次渲染结果限制在 100 条以内并保留完整匹配计数
- [x] 扩展 asset catalog 支持技能候选筛选 (AC: 5)
  - [x] 为 asset metadata 增加本次放置技能候选字段
  - [x] seed data 覆盖默认技能、技能类型和非默认候选案例
- [x] 升级 Asset Picker 筛选 UI (AC: 1-6)
  - [x] 搜索输入、分类 segmented controls、favorite-only toggle、区域筛选和技能筛选可组合
  - [x] 结果计数 `aria-live` 更新且宽度稳定
  - [x] 空状态显示恢复动作：清除筛选、显示全部或切换分类
  - [x] 筛选不写入 `SceneDocument`、不改变 dirty state
- [x] 补充测试与 smoke 覆盖 (AC: 1-7)
  - [x] unit tests 覆盖 filter helper 组合、空结果和 100 条 limit
  - [x] component tests 覆盖搜索、分类、喜好、区域、技能和空状态恢复
  - [x] Playwright smoke 覆盖组合筛选、空状态恢复、scene snapshot 不变和布局稳定
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成实现后推进到 `review`

## Dev Notes

- Story 2.1 已建立 `src/domain/assets/catalog.ts`、`AssetPicker`、`workspaceState.selectedAssetId` 和素材详情路径。本 story 应在此基础上扩展，不要重写选择/详情语义。
- Architecture 明确将 Asset Catalog & Selection 映射到 `src/domain/assets/` 和 `components/asset-picker/`，asset filtering 应保持 pure helper，组件只负责 UI state。
- 筛选状态属于 UI-only state，不得写入 `SceneDocument`，不得触发 dirty/saved 变化。PRD 后续要求 localStorage 恢复 UI 偏好，但本 story 不需要实现持久化。
- Story 2.2 的空状态需要可执行恢复动作，不能只渲染空列表。
- Performance 目标是 1,000 个素材以内搜索/筛选 200ms；当前 seed data 很小，但实现应保留 100 条渲染上限路径，避免未来 catalog 扩大时一次性渲染所有卡片。
- Mobile View-only Mode 下筛选可以改变本地可见列表和详情，但不能进入放置编辑状态或修改 scene document。

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

- `npm run typecheck` — passed
- `npm run test` — passed, 13 test files / 72 tests
- `npm run build` — passed
- `npm run smoke` — passed, 2 Chromium smoke tests
- `git diff --check` — passed

### Completion Notes List

- 已新增 `src/domain/assets/filters.ts` pure helper，支持关键词、分类、区域、favorite-only、默认技能、技能类型和技能候选组合筛选。
- 已为 asset catalog 增加 `skillCandidate` 字段，并保留 100 条渲染上限与完整匹配计数。
- 已升级 Asset Picker 筛选 UI：分类 segmented controls、区域 controls、favorite-only、技能下拉、清除筛选、空状态恢复动作和 `aria-live` 计数。
- 已验证筛选 UI-only state 不写入 `SceneDocument`、不改变 dirty state。
- 已根据 multi-agent review 修复 assetId 搜索、read-only 下选择回调自守卫、筛选组可访问语义、mobile read-only 筛选 smoke、筛选性能 smoke、100 条上限可继续加载和 skill-candidate 可读说明问题。

### File List

- `_bmad-output/implementation-artifacts/2-2-asset-search-filters.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/domain/assets/catalog.test.ts`
- `src/domain/assets/catalog.ts`
- `src/domain/assets/filters.test.ts`
- `src/domain/assets/filters.ts`
- `src/domain/assets/index.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.2 and marked ready for development.
- 2026-05-16: Implemented search/filter domain helpers, Asset Picker filtering UI, empty state recovery, tests, smoke coverage, review fixes, and marked Story 2.2 done.
