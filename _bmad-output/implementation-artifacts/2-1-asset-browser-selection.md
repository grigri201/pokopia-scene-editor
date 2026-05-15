# Story 2.1: 浏览素材并选择当前放置素材

Status: done

## Story

As a 布景编辑用户,
I want 浏览素材列表并选择当前要放置的素材,
So that 我可以从可理解的素材信息开始编辑布景。

## Acceptance Criteria

1. Given 工作台已打开且素材目录来自 repo-local static data 或 bundled JSON/TS data, when 用户查看右侧浮动 Asset Picker, then 系统显示素材列表、固定宽度结果计数、缩略图、名称、分类、标签、适用区域、官方 `No.` 素材 ID 和默认技能状态, and 素材目录数据结构包含素材 ID、名称、分类、标签、适用区域、喜好状态、默认技能需求、可旋转性、可叠放性、可染色性和缩略图地址。
2. Given 用户聚焦或点击任一素材卡片, when 用户选择该素材, then 该素材成为当前待放置素材, and 右侧素材栏固定显示当前素材、本次放置默认技能状态、当前建筑层和待放置上下文。
3. Given 用户查看某个素材详情, when 用户打开或展开素材详情, then 系统至少显示素材 ID、名称、分类、标签、适用区域、喜好状态、默认技能需求、是否可旋转、是否可叠放、是否可染色和缩略图, and 详情中的素材元数据不修改 `SceneDocument`。
4. Given 用户仅使用键盘操作素材列表, when 用户通过 Tab、方向键、Enter 或 Space 选择素材, then 素材选择状态与鼠标选择一致, and 搜索框、结果计数和素材卡片具备可访问名称或可读说明。
5. Given 用户勾选只显示喜好素材, when 当前 Pokemon 有喜好匹配, then Asset Picker 只显示匹配当前 Pokemon 喜好的素材, and 结果计数区域保持稳定宽度，不挤压搜索框、筛选项或当前素材区。
6. Given 视口宽度小于 768px, when 用户选择素材卡片, then 系统允许查看素材信息, and 不允许进入会修改 scene document 或 dirty state 的放置编辑状态。

## Tasks / Subtasks

- [x] 建立可维护的 asset catalog domain 边界 (AC: 1, 3, 5)
  - [x] 定义 `AssetDefinition`、分类、标签、适用区域、喜好 Pokemon、默认技能需求、旋转/叠放/染色和缩略图字段
  - [x] 提供 repo-local static seed data, 至少覆盖主区、外围区、通用、默认技能、可旋转、可染色和当前 Pokemon 喜好匹配样例
  - [x] 提供 helper/selectors 获取资产、详情、当前 Pokemon 喜好匹配和稳定计数
- [x] 将当前素材选择接入 `SceneDocument.workspaceState.selectedAssetId` (AC: 2, 6)
  - [x] 新增 reducer action/command 选择当前素材并校验 asset id
  - [x] desktop edit 下选择素材后标记待放置状态但不创建 `tileInstances`
  - [x] mobile/read-only 下选择素材只用于查看信息, 不写入 `SceneDocument`、不改变 dirty state
- [x] 升级 `AssetPicker` 为可访问素材浏览与选择组件 (AC: 1-6)
  - [x] 显示固定宽度结果计数、搜索输入、favorite-only 控件、素材卡片、当前素材和待放置上下文
  - [x] 素材卡片显示缩略图、名称、分类、标签、适用区域、`No.` 官方 ID 和默认技能状态
  - [x] 支持展开/查看素材详情，详情不修改 scene document
  - [x] 支持鼠标、Tab、方向键、Enter 和 Space 选择素材
- [x] 保持布局、只读和主题边界 (AC: 1, 5, 6)
  - [x] 结果计数区域保持稳定宽度且 `aria-live`
  - [x] favorite-only 只过滤当前 Pokemon 喜好素材；空状态和完整搜索/分类筛选留给 Story 2.2
  - [x] Asset Picker 不得遮挡中央 7x7 画布，不引入卡片套卡片或 hero-scale 文案
- [x] 补充测试与 smoke 覆盖 (AC: 1-6)
  - [x] unit tests 覆盖 asset catalog schema/helper、favorite-only 和 selected asset reducer guard
  - [x] component tests 覆盖 AssetPicker 显示、选择、详情、键盘选择、favorite-only 和 read-only
  - [x] Playwright smoke 覆盖桌面选择当前素材、右侧上下文更新、mobile read-only 不写入 scene state
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成实现后推进到 `review`

## Dev Notes

- 当前实现已有 `src/components/asset-picker/AssetPicker.tsx` scaffold，但只包含 4 个字符串按钮；本 story 应替换为真实 domain-backed catalog，而不是继续在组件内维护字符串数组。
- `SceneDocument.workspaceState.selectedAssetId` 已在 `src/domain/scene/types.ts` 存在，默认值由 `createDefaultSceneDocument` 设为 `null`。本 story 只选择当前待放置素材，不创建或移动 `tileInstances`；实际放置属于 Story 2.3。
- 写入 scene 的行为必须经 `sceneReducer` / command boundary 并携带 `interactionMode`。Story 1.6 已把 `<768px` 定义为 mobile read-only；mobile 下可以查看素材详情，但不能写入 `selectedAssetId`、dirty state 或 tile instances。
- Story 1.7 已建立动态 Pokemon theme 和 `selectedPokemonKey`，favorite-only 应基于当前 `scene.selectedPokemonKey` 与 asset catalog 中的喜好字段过滤。
- Story 2.2 会继续实现关键词、分类、区域和技能筛选。本 story 只需保留搜索输入与筛选控件外观，并完整实现 favorite-only，因为 AC5 明确要求它。
- 素材缩略图可用 CSS/inline visual placeholders 或 repo-local static path；若使用真实静态图片，同一 asset family 必须统一放在 `public/assets/` 或 `src/assets/`，不要混放。
- 详情字段和 asset 名称/标签必须作为普通文本渲染，禁止 `dangerouslySetInnerHTML` 或 HTML parser。

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
- `npm run test` — passed, 12 test files / 65 tests
- `npm run build` — passed
- `npm run smoke` — passed, 2 Chromium smoke tests
- `git diff --check` — passed

### Completion Notes List

- 已将 Asset Picker 从字符串 scaffold 替换为 repo-local static asset catalog，并补齐 `AssetDefinition` 字段、thumbnail URL、Pokemon 喜好和 helper。
- 已接入 `SceneDocument.workspaceState.selectedAssetId`，desktop edit 选择素材会进入待放置状态并标记 dirty，但不会创建 `tileInstances`。
- 已实现 mobile/read-only 下素材选择只更新本地查看状态，不写入 `SceneDocument`、不改变 dirty state。
- 已增加独立 `Details` 路径查看素材详情，详情显示缩略图、domain asset id、官方 `No.`、分类、标签、适用区域、喜好、技能、旋转、叠放和染色字段，且不会修改 scene document。
- 已根据 multi-agent review 修复详情缺缩略图、详情与选择耦合、待放置上下文不足、Vite base path、catalog 唯一性、结果计数宽度、大小写搜索和素材卡可访问说明问题。

### File List

- `_bmad-output/implementation-artifacts/2-1-asset-browser-selection.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `public/assets/asset-thumbnails/ditto-doll.svg`
- `public/assets/asset-thumbnails/garden-plant.svg`
- `public/assets/asset-thumbnails/outer-wall.svg`
- `public/assets/asset-thumbnails/roof-tile.svg`
- `public/assets/asset-thumbnails/water-barrel.svg`
- `public/assets/asset-thumbnails/wooden-floor.svg`
- `src/components/app-shell/AppShell.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/domain/assets/catalog.test.ts`
- `src/domain/assets/catalog.ts`
- `src/domain/assets/index.ts`
- `src/state/scene-reducer.test.ts`
- `src/state/scene-reducer.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.1 and marked ready for development.
- 2026-05-16: Implemented asset catalog browsing, current asset selection, independent detail viewing, read-only viewing guard, tests, review fixes, and marked Story 2.1 done.
