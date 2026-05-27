# Story 5.2: 清理工作台 UI 与预览交互

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景编辑用户,
I want 工作台界面不再显示已删除功能入口,
So that MVP 编辑流程更直接、更少误导。

## Acceptance Criteria

1. Given 用户打开桌面工作台, when 页面渲染, then 不显示手动保存、撤销、重做、建筑层隐藏/锁定、实例移动、普通备注、素材堆叠数量、不可旋转提示、预览网格开关、预览主体边界开关或预览技能标记开关。
2. Given 素材搜索或筛选没有结果, when 空状态渲染, then 只显示明确空状态, and 不提供清除筛选、显示全部或切换分类等恢复动作。
3. Given 用户查看 Preview Inspector, when 俯视图或正视图渲染, then 预览固定不显示网格、5x5 主体边界和技能标记, and 不向 localStorage 写入这三类预览显示偏好。
4. Given 用户选中素材实例, when Selection Inspector 渲染, then 仍可查看坐标、区域、建筑层、素材、朝向、染色、技能标记和技能备注, and 不提供普通备注或建筑层归属移动入口。
5. Given dev agent 运行回归门禁, when Story 5.2 完成, then `npm run typecheck`、`npm test`、`npm run build`、`git diff --check` 和 `npm run smoke` 必须通过。

## Tasks / Subtasks

- [x] 移除已删除的工作台入口和状态文案 (AC: 1)
  - [x] 在 `src/components/app-shell/AppShell.tsx` 中移除顶部手动 Save 按钮及相关 header action UI；自动保存仍保留在 effect/storage 路径中。
  - [x] 清理 `PokemonSceneControls` 与 tests 中仅服务手动保存/保存状态按钮禁用的 props 或断言；不得重新引入 visible save status 文案。
  - [x] 在 `BuildingLevelPanel` 和 tests 中移除 visible/locked 的 aria label、data attribute、class name、删除按钮 locked disabled 分支和对应文案；建筑层仍保留 create/copy/delete/rename/select。
  - [x] 确认 `SceneCanvas`、`SelectionInspector`、`AssetPicker` 中没有素材堆叠数量、不可旋转提示、实例移动或普通备注入口；若只剩测试/样式死代码，删除或改写。
- [x] 清理素材空状态恢复动作 (AC: 2)
  - [x] 在 `src/components/asset-picker/AssetPicker.tsx` 中让无结果空状态只展示明确说明，不渲染 Clear filters、Show all、Disable favorite、All categories、Clear search 或 Reset filters 等恢复按钮。
  - [x] 删除空状态恢复 action helper 中不再需要的回调 props，并更新 component tests / AppShell tests 中依赖恢复按钮的断言。
  - [x] 保留搜索、分类、喜好、区域、技能筛选本身及其 `localStorage` asset filter preference 行为；本 story 不删除筛选能力。
- [x] 固定 Preview Inspector 显示并移除 preview display preference (AC: 3)
  - [x] 在 `src/components/preview-inspector/PreviewInspector.tsx` 中移除隐藏的 Preview display options buttons、`displayOptions` state、`writePreviewDisplayOptionsToStorage` 调用和 grid/mainBoundary/skillMarkers toggle 分支。
  - [x] 俯视图和正视图固定不显示网格、5x5 主体边界和技能标记；对应 DOM/data attributes 不应继续暴露 `data-preview-grid-visible=true`、`data-preview-main-boundary-visible=true` 或 `data-preview-skill-markers-visible=true` 这类可切换状态。
  - [x] 更新 CSS，确保移除覆盖显示后 preview 布局仍稳定；不允许因隐藏开关删除导致 preview/canvas 尺寸跳动。
  - [x] 在 `src/io/ui-preferences.ts` 中删除 `PreviewDisplayOptions`、`PreviewUiPreferences.displayOptions`、`writePreviewDisplayOptionsToStorage` 和 preview display normalize；只保留 asset filter preferences，若仍需 `layerScope` 也必须确认当前 UI 是否实际使用。
  - [x] 更新 `src/io/ui-preferences.test.ts`，证明 UI preference 只保存 asset filters，不再保存 preview display options。
- [x] 保留 Selection Inspector 的 MVP 信息面 (AC: 4)
  - [x] 确认选中实例后仍可查看坐标、区域、建筑层、素材、朝向、染色、技能标记和技能备注；若当前 UI 仅显示部分信息，应补足 MVP 可见信息而不是恢复已删除入口。
  - [x] 不添加普通备注 textarea、建筑层归属选择、移动坐标输入或跨层移动入口。
  - [x] 更新 `SelectionInspector` tests，覆盖 retained fields 和 removed entry absence。
- [x] 更新 smoke 和回归测试 (AC: 1, 2, 3, 4, 5)
  - [x] 更新 component tests：`AssetPicker.test.tsx`、`BuildingLevelPanel.test.tsx`、`PreviewInspector.test.tsx`、`PokemonSceneControls.test.tsx`、`SelectionInspector` 相关 tests 和 AppShell tests。
  - [x] 更新 Playwright smoke：桌面首屏断言删除入口不存在；空状态无恢复动作；preview 不显示网格/主体边界/技能标记覆盖状态；UI preferences 不写 preview display fields。
  - [x] 运行 `npm run typecheck`、`npm test`、`npm run build`、`git diff --check`、`npm run smoke`。

### Review Findings

- [x] [Review][Patch] Autosave-only storage failure was silent [src/components/app-shell/AppShell.tsx] — Added a non-payload `Autosave warning` alert for storage write failures and a regression test proving the warning clears after a later successful autosave.
- [x] [Review][Patch] Persisted area/skill asset filters were hidden from users [src/components/asset-picker/AssetPicker.tsx] — Exposed area and skill filter controls so restored preferences are editable without empty-state recovery actions.
- [x] [Review][Patch] Legacy preview display preferences were not migrated out of localStorage [src/io/ui-preferences.ts] — Normalized valid legacy UI preference payloads on read and wrote back the asset-filter-only shape; added unit and smoke coverage.
- [x] [Review][Patch] Removed instance edit CSS/test props still referenced deleted note/move UI [src/styles.css] — Deleted stale instance editor styles and removed obsolete SelectionInspector test props.

## Dev Notes

- Story 5.2 承接 Story 5.1 commit `bf193d2 feat: clean scene model command scope`。5.1 已删除业务 payload 和 command 层复杂度：`workspaceState.saveStatus/saveError`、`TileInstance.note`、`BuildingLevel.visible/locked`、同层堆叠、move/note command、area placement blocking、not-rotatable branch 和 undo/redo。5.2 只做 UI/preview/user-facing cleanup，不要重新引入这些 domain 字段或 command。
- Epic 5 的计划来源是 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-19.md`，且 `epics.md` 已新增 Story 5.2。本 story 不修改 Epic 1-4 完成历史。
- 当前代码仍有过渡 UI：`BuildingLevelContext` 由 selectors 派生 `visible: true` / `locked: false`，`BuildingLevelPanel` 仍在 aria/data/class 中显示 visible/unlocked；这属于 5.2 清理范围。若可以合理删除这些 view-model 字段，应优先删除，而不是只隐藏文案。
- 当前 `PreviewInspector` 仍从 `readUiPreferencesFromStorage(...).preview.displayOptions` 初始化，并通过隐藏按钮写入 `writePreviewDisplayOptionsToStorage()`；5.2 必须移除这条偏好写入路径。Story 5.1 的 smoke 已覆盖 retained edit command wiring，5.2 smoke 应追加 removed UI absence。
- 当前 `AssetPicker` 空状态仍会渲染 recovery buttons 和 helper：`Clear filters`、`Show all`、`Disable favorite` / `All categories` / `Clear search` / `Reset filters`。这些按钮与 5.2 AC 直接冲突。
- PRD/Architecture 已按 course correction 更新：preview display options 不再属于 MVP UI preferences；手动保存 UI 和 dirty/saved/saveError 状态不再属于 MVP；移动端键盘 no-op 留给 Story 5.3。
- 自动保存不能被删除。即使手动 Save UI 被移除，`writeSceneDocumentToStorage(..., 'autosave')`、startup recovery、schema/recovery tests 和 retained smoke edit flow仍必须通过。

### Expected Touch Points

- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/components/selection-inspector/SelectionInspector.test.tsx` if present, otherwise add focused coverage in the closest existing component/AppShell tests.
- `src/io/ui-preferences.ts`
- `src/io/ui-preferences.test.ts`
- `src/styles.css`
- `e2e/workbench-smoke.spec.ts`
- `docs/功能验收-checklist.md`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.2]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-19.md#Detailed-Change-Proposals]
- [Source: _bmad-output/planning-artifacts/prd.md#Approved-Course-Correction]
- [Source: _bmad-output/planning-artifacts/architecture.md#Approved-Course-Correction]
- [Source: _bmad-output/implementation-artifacts/5-1-clean-data-model-and-command-scope.md]
- [Source: src/components/preview-inspector/PreviewInspector.tsx]
- [Source: src/components/asset-picker/AssetPicker.tsx]
- [Source: src/components/building-level-panel/BuildingLevelPanel.tsx]
- [Source: src/io/ui-preferences.ts]

## Testing Requirements

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`
- `npm run smoke`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-19: `npm run typecheck`
- 2026-05-19: `npm test`
- 2026-05-19: `npm run build`
- 2026-05-19: `git diff --check`
- 2026-05-19: `npm run smoke`
- 2026-05-19: Review follow-up `npm run typecheck`
- 2026-05-19: Review follow-up `npm test`
- 2026-05-19: Review follow-up `npm run build`
- 2026-05-19: Review follow-up `git diff --check`
- 2026-05-19: Review follow-up `npm run smoke`

### Completion Notes List

- 移除桌面工作台手动 Save/保存状态入口，保留 autosave、restore 和删除清理存储槽位路径。
- 移除建筑层 visible/locked 派生字段及对应 UI 文案、data/class 与删除禁用分支。
- AssetPicker 空状态只保留说明，不再渲染筛选恢复动作；asset filter preference 行为保留。
- Preview Inspector 删除 display option state/storage/toggle UI，预览不再暴露可切换 grid/main boundary/skill marker 显示状态。
- Selection Inspector 补足只读信息面，保留坐标、区域、建筑层、素材、朝向、染色、技能标记和技能备注可见性，不恢复普通备注/跨层移动入口。
- Code review follow-up 增加 autosave failure 可见告警、恢复 area/skill 筛选可见控件、迁移 legacy preview preferences，并删除旧实例编辑死 CSS/test props。

### File List

- `_bmad-output/implementation-artifacts/5-2-clean-workbench-ui-and-preview-controls.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/功能验收-checklist.md`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/components/selection-inspector/SelectionInspector.test.tsx`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/selectors.test.ts`
- `src/io/ui-preferences.ts`
- `src/io/ui-preferences.test.ts`
- `src/styles.css`
- `src/theme/tokens.ts`

### Change Log

- 2026-05-19: Story created from Epic 5 Story 5.2 and marked ready-for-dev.
- 2026-05-19: Implemented workbench UI cleanup, preview display preference removal, retained Selection Inspector information view, updated tests/smoke/checklist, and moved story to review.
- 2026-05-19: Addressed all code-review findings, re-ran full gates, and marked story done.
