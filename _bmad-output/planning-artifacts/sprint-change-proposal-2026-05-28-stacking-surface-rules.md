# Sprint Change Proposal - 承载面 / 叠放规则

**日期:** 2026-05-28
**项目:** pokopia-scene-editor
**触发方式:** 用户通过 `bmad-correct-course` 要求基于 Epic 8 footprint/occupancy 规则新增承载面与叠放规则；按仓库指示在现有独立 worktree 中隔离处理。
**执行模式:** Batch
**状态:** Approved by current user request

## 1. Issue Summary

Epic 8 已完成真实素材 footprint、旋转后占用、同层 overlap 阻断和 height 跨层阻塞。但 Pokopia 中存在一类已实测或待固化的例外：`wooden-plate`、`plate`、`party-platter` 可以承载食物；部分底垫、地毯、嫩芽和低高度素材可以允许其他物品与其叠放或放到其上方。

当前 Epic 8 规则把同一建筑层的任意 occupied cell overlap 都视为冲突，这会错误拒绝这些合法摆放。该问题不是简单 UI 文案调整，而是 asset catalog、occupancy validation、placement preview、preview/export summary、Worker/MCP/Codex skill contract 都需要共享的新领域规则。

## 2. Impact Analysis

**Epic Impact:** Epic 1-10 已存在并保留为历史与计划。新增能力应作为 Epic 11 追加，不重写 Epic 8 或 Epic 10 记录。Epic 8 的 footprint/occupancy helper 是基础依赖，Epic 11 在其上增加 catalog-driven stacking surface 例外。

**Story Impact:** 需要新增 catalog metadata story、scene-core placement/validation story、web feedback story、preview/export/Worker/MCP parity story。

**PRD Impact:** 需要新增 FR93-FR100、NFR44-NFR47，明确盘子类 food surface、地毯/底垫/嫩芽/低高度素材的局部叠放规则，以及 `SceneDocument v1` 保持不变。

**UX Impact:** 画布、素材卡片、实例检查器、放置预览、错误提示、预览和导出需要表达“可承载 / 可叠放 / 被承载 / 不兼容”的状态，不能只显示 generic footprint conflict。

**Architecture Impact:** `AssetDefinition` 需要新增 catalog-level stacking/surface metadata，`scene-core` 需要新增 derived stacking relation 与 compatibility helper。`SceneDocument v1` 不需要新增字段，因为 base/top 关系可由 `assetId`、`coordinate`、`buildingLevelId`、`rotationDegrees`、catalog stacking rules 和当前 occupancy 派生。

## 3. Recommended Approach

选择 **Direct Adjustment via New Epic 11**。

理由：

- 该能力扩展 Epic 8 的 occupancy model，但不否定 Epic 8。
- 关系可由当前 scene facts 和 catalog metadata 确定性派生，无需保存 parent/child stack id、z-index 或 surface binding。
- 新增 `SceneDocument v2` 会扩大保存、恢复、短字符串、Worker/MCP 和历史 payload 迁移范围，目前没有必要。
- 若未来需要用户手动指定叠放顺序、固定某个物品“绑定”到某个承载面、保存 catalog snapshot 或支持同坐标多个 top item 的持久排序，才需要新的 course correction 评估 schema 变更。

## 4. Detailed Change Proposals

### PRD

- 新增 “Approved Course Correction - 2026-05-28 承载面/叠放规则”。
- 新增 FR93-FR100，覆盖 catalog metadata、盘子承载食物、底垫/地毯/嫩芽/低高度素材同层兼容 overlap、derived stacking relation、UI/export/Worker/MCP parity。
- 新增 NFR44-NFR47，覆盖 deterministic helper、测试矩阵、错误结构和 v1 schema 边界。
- 将 out-of-scope 中的“同层素材堆叠”收窄为“任意/通用同层素材堆叠”，避免与 Epic 11 的受控叠放规则冲突。

### UX

- 在画布 hover、placement preview、selected instance、Asset Picker、Preview Inspector、Export Preview 中加入承载/叠放状态表达；合法同格叠放的默认视觉方案是把原始格子或 footprint cell 拆成上下两部分，下方显示 base surface，上方显示 top item。
- 错误提示区分 `same-level-footprint-overlap`、`unsupported-stack-surface`、`surface-capacity-conflict` 和 `height-blocked-by-lower-footprint`。
- 不兼容叠放在画布上使用浅红/红色冲突提示，交互时机和视觉强度与 Epic 8 跨层 height 阻塞提示保持一致。
- 不新增单独 stacking editor；用户通过正常放置动作触发兼容性判断。

### Architecture

- `AssetDefinition` 新增 catalog metadata，例如 `stacking.surfaceKind`、`stacking.allowedTopCategories`、`stacking.allowsSameLevelOverlap`，默认 none。
- `scene-core` 新增 stacking compatibility helpers 和 derived stacking relation outputs。
- `SceneDocument v1`、autosave、short string 不保存 stacking relation、surface id、z-index 或 blocking cells。
- Worker/MCP/Codex skill 必须复用 `scene-core`，不得复制盘子/地毯/嫩芽规则列表。

### Epics & Sprint Status

- 新增 Epic 11：承载面与受控叠放规则。
- 新增 stories 9.1-9.4。
- `sprint-status.yaml` 新增 `epic-11` 和 stories，全部为 `backlog`。

## 5. Checklist Result

- [x] 1.1 Trigger story/context identified: Epic 8 completed footprint/occupancy exposes missing stacking exceptions.
- [x] 1.2 Core problem defined: same-level overlap is currently too strict for known carry/surface cases.
- [x] 1.3 Evidence captured: user provided concrete asset classes; repo `docs/todo.md` already records plate/mat/rug/shoot follow-up and food-on-plate examples.
- [x] 2.1 Current epic assessment: Epic 8 remains valid and complete.
- [x] 2.2 Epic change needed: add Epic 11.
- [x] 2.3 Remaining epics reviewed: no completed epic needs rollback.
- [x] 2.4 Future epics: Epic 11 fills the gap.
- [x] 2.5 Priority: Epic 11 becomes next backlog priority.
- [x] 3.1 PRD conflicts addressed.
- [x] 3.2 Architecture conflicts addressed.
- [x] 3.3 UX conflicts addressed.
- [x] 3.4 Secondary artifacts: sprint status updated; implementation code deferred to story execution.
- [x] 4.1 Direct Adjustment viable: medium effort, medium risk.
- [x] 4.2 Rollback not viable: no completed work needs reversal.
- [x] 4.3 MVP review not needed: scope is an additive rule correction.
- [x] 4.4 Recommended path selected.
- [x] 5.1-5.5 Proposal, impact, action plan and handoff documented.
- [x] 6.1-6.2 Final proposal reviewed for consistency.
- [x] 6.3 Approval captured from current user request.
- [x] 6.4 Sprint status updated.
- [x] 6.5 Next step: run `bmad-create-story` for Story 11.1 when implementation starts.

## 6. Handoff

Next implementation command:

```text
bmad-create-story 11-1-asset-catalog-stacking-surface-metadata
```

Implementation must start from `packages/scene-core` catalog metadata and tests, then extend placement validation, UI feedback, export summary, Worker/MCP parity and Codex skill examples.
