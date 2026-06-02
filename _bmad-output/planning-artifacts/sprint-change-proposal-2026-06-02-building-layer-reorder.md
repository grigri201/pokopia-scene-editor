---
date: 2026-06-02
status: approved
mode: batch
trigger: 增加左侧建筑层拖动排序功能。拖动结果可以预览，拖动完成后自动保存。
scope_classification: minor
recommended_path: Direct Adjustment
approved_at: 2026-06-02
---

# Sprint Change Proposal - 建筑层拖动排序

## 1. Issue Summary

用户需要在左侧建筑层面板中直接拖动调整建筑层顺序。拖动过程中应能预览排序结果；拖动完成后，新的层顺序应作为当前场景事实自动保存。

当前工作台已支持建筑层创建、复制、删除、重命名和切换，但不支持重新排序。现有 PRD 把建筑层管理列入核心闭环，Architecture 规定 Building Level Panel 读取 `buildingLevels + current level`，且组件不能复制业务事实源。当前实现中 `BuildingLevelPanel` 只暴露 create/select/rename/copy/delete handlers；`editBuildingLayer()` 也没有 reorder command。排序需求因此是一个明确的新交互和 command-layer 能力，不是纯视觉调整。

触发类型：New requirement emerged from stakeholder.

## 2. Impact Analysis

### Checklist Status

- [x] 1.1 Trigger story: N/A。当前没有 active in-progress story；Epic 14 和 Epic 15 均为 done，需求来自新的产品交互变更。
- [x] 1.2 Core problem: 建筑层顺序无法通过 UI 调整，用户只能创建/复制/删除/重命名/切换，无法修正层级组织。
- [x] 1.3 Evidence: `BuildingLevelPanel` props 只有 `onCreateLayer`、`onSelectLayer`、`onRenameLayer`、`onCopyLayer`、`onDeleteLayer`；`BuildingLayerEditInput` 没有 reorder 类型；`resequenceBuildingLevels()` 已存在，可作为提交后的规范化基础。
- [x] 2.1 Current epic impact: 当前 active Epic 15 已完成，不应 retroactively 修改完成 story。
- [x] 2.2 Epic-level changes: 新增 Epic 16，作为一个小范围 Polish story 承载建筑层排序。
- [x] 2.3 Future epic impact: 无已规划 future epic 被阻塞。
- [x] 2.4 New epic needed: 是。需要新增 active backlog epic/story，避免把已完成 Epic 15 改成混合范围。
- [x] 2.5 Priority/order: Epic 16 可排在 Epic 15 后，直接进入 ready-for-dev。
- [x] 3.1 PRD conflicts: 不冲突。PRD 已把建筑层管理、自动保存、SceneDocument v1 校验列入核心闭环；需新增排序要求。
- [x] 3.2 Architecture conflicts: 不冲突。排序必须经 command layer；拖动预览可作为 local UI state，不进入 autosave；drop 后重排 `buildingLevels[].levelNumber` 并走现有 autosave。
- [x] 3.3 UX conflicts: 旧 UX 的隐藏/锁定字段已废弃；本次不能恢复隐藏/锁定。Building Level Panel anatomy 需加入 drag handle、drag-over/preview/drop states 和键盘可达的备用排序入口。
- [x] 3.4 Secondary artifacts: 需要更新 i18n、component/unit tests、AppShell wiring、focused browser smoke；不需要 Worker/MCP/API/deploy script 更新。
- [x] 4.1 Direct Adjustment: Viable。Effort low-to-medium，risk low-to-medium。
- [x] 4.2 Potential Rollback: Not viable。无需回滚已完成功能。
- [x] 4.3 PRD MVP Review: Not viable。无需缩减或重定义产品目标。
- [x] 4.4 Recommended path: Direct Adjustment，新建 Epic 16 + 单 story 实现。

### Epic Impact

新增 Epic 16：建筑层拖动排序。

不修改 Epic 14 / Epic 15 完成状态，不回滚任何归档 story。Epic 16 只覆盖 desktop/tablet 编辑工作台；mobile preview/import surface 仍不提供建筑层编辑能力。

### Story Impact

新增 Story 16.1：左侧建筑层拖动排序与自动保存。

该 story 应覆盖：

- Building Level Panel 支持拖动层行或拖动 handle。
- 拖动中显示目标顺序预览，且该预览为 UI-only transient state。
- 拖动结束 drop 后，通过 command layer 提交排序。
- 排序提交后更新 `buildingLevels[].levelNumber`，保持 `id`、`name`、`notes`、`tileInstances[].buildingLevelId` 和 `skillMarkers[].buildingLevelId` 不变。
- 当前层仍保持同一个 `levelId`，只改变其 `levelNumber` / display id。
- 成功 drop 后现有 autosave effect 写入 autosave slot；拖动中不得写 storage。
- read-only/mobile 禁用排序。
- 提供键盘可达 fallback，例如上移/下移按钮或等价 accessible control，避免只能靠鼠标拖动完成排序。

### Artifact Conflicts

PRD 需要新增一段 Approved Course Correction 和功能需求：建筑层排序属于 `SceneDocument v1` 内已有 `buildingLevels[].levelNumber` 的重排，不新增 schema 字段。

Architecture 需要更新 command list 和 component boundary：`building-level-panel/` 新增 reorder command entry；拖动 preview 是 local UI state，drop 后才写 scene state。

UX 需要更新 Building Level Panel：移除已废弃隐藏/锁定描述中的残留影响，新增 drag handle、preview row state、drop state、disabled/read-only state、keyboard fallback 和 aria 描述。

sprint-status 需要新增 Epic 16 / Story 16.1，初始可设为 `ready-for-dev`（若同时创建 story file）或 `backlog`（若只同步 epics）。

## 3. Recommended Approach

选择 Direct Adjustment。

理由：

- 现有数据模型已能表达排序：`levelNumber` 是建筑层高度/顺序事实，`id` 是实例和备注引用事实。
- `resequenceBuildingLevels()` 已存在，drop 后可以复用规范化排序逻辑。
- 自动保存链路已存在，只要排序 command 更新 `metadata.updatedAt`，AppShell 的 autosave effect 可自然落盘。
- 拖动预览不应进入 `SceneDocument`，只需在 `BuildingLevelPanel` 内维护 transient order。
- 不需要引入外部 drag-and-drop 库；层数上限为 30，原生 pointer/drag event 或轻量 React state 足够。若实现时发现原生拖动的可访问性不足，可以用稳定的 handle + up/down controls 补齐。

Effort: Low-to-medium.

Risk: Low-to-medium. 主要风险在 a11y、拖动中输入框/按钮事件冲突、以及 levelNumber 改变后 preview/export/occupancy selector 的顺序一致性。

Timeline impact: 新增一个 focused story，预计 0.5-1.5 个开发日，取决于是否加入 Playwright drag smoke。

## 4. Detailed Change Proposals

### PRD

Section: Approved Course Corrections / Functional Requirements

OLD:

```text
MVP 保留的闭环是：... 建筑层创建/删除/重命名/复制/切换 ... 自动保存、重新打开恢复和 SceneDocument v1 校验。
```

NEW:

```text
### Approved Course Correction - 2026-06-02 建筑层拖动排序

本 PRD 增加 Epic 16，用于在 desktop/tablet 编辑工作台的左侧建筑层面板中支持拖动排序。拖动过程中显示目标顺序预览；拖动完成后，系统通过现有 command layer 提交新的建筑层顺序，并由现有 autosave 链路自动保存。

`SceneDocument v1` 继续保持。排序只重排现有 `buildingLevels[].levelNumber`，不新增排序字段、z-index、层级历史或 SceneDocument v2。`buildingLevels[].id`、层名、层备注、素材实例引用和技能标记引用必须保持稳定。
```

Rationale: 把排序定义成现有层号事实的重排，避免误引入新 schema。

### Epics

Section: Active Epic Index

OLD:

```text
As of 2026-06-01, Epic 15 is the active BMAD planning surface.
```

NEW:

```text
As of 2026-06-02, Epic 16 is the active BMAD planning surface.
```

Add:

```text
## Epic 16: 建筑层拖动排序

用户可以在左侧建筑层面板中拖动建筑层来调整层级顺序。拖动中显示排序预览；drop 后提交为当前场景事实并自动保存。该能力只作用于 desktop/tablet 编辑工作台，mobile preview/import 仍不提供建筑层编辑。

### Story 16.1: 左侧建筑层拖动排序与自动保存

As a 布景编辑用户, I want 通过拖动左侧建筑层行调整层级顺序, So that 我可以快速修正布景层级而不需要删除重建建筑层。

Acceptance Criteria:

- 左侧建筑层面板为每一层提供可识别的拖动 handle，read-only/mobile 状态禁用排序。
- 拖动过程中列表显示目标顺序预览；预览状态不写入 `SceneDocument`、autosave、saved storage 或 UI preferences。
- Drop 完成后通过 command layer 提交排序，重排 `buildingLevels[].levelNumber`，保持 level id、层名、层备注、实例引用和技能标记引用不变。
- 当前层按 `currentBuildingLevelId` 保持为同一层；排序后 display id 按新的 `levelNumber` 更新。
- 成功排序后触发现有 autosave，刷新后恢复为新顺序；取消拖动或无变化 drop 不写 storage。
- 支持键盘可达的排序 fallback，例如上移/下移按钮，并提供清晰 aria label / live announcement。
- Focused tests 覆盖 domain reorder、read-only no-op、drag preview no persistence、drop autosave、keyboard fallback 和 existing layer create/copy/delete/rename regression。
```

Rationale: 单 story 足够覆盖功能、无障碍和回归验证。

### Architecture

Section: Frontend Architecture / command list / component boundary

OLD:

```text
- `building-level-panel/`：左侧建筑层列表、当前层、创建/删除/复制/重命名 command entry；视觉顺序高层到低层，数据顺序仍为 0 层到 n 层。
```

NEW:

```text
- `building-level-panel/`：左侧建筑层列表、当前层、创建/删除/复制/重命名/排序 command entry；视觉顺序高层到低层，数据顺序仍为 0 层到 n 层。拖动中的目标顺序可以作为 component-local preview state；drop 前不得写入 `SceneDocument` 或 autosave。Drop 后排序 command 重排 `buildingLevels[].levelNumber`，保持 level id 和所有引用稳定。
```

Rationale: 明确 transient preview 与 committed scene state 的边界。

### UX Design

Section: Building Level Panel

OLD:

```text
**Anatomy:** 层号、层名、实例数量、可见开关、锁定开关、当前编辑层标识、新建/复制/删除操作。
**States:** 当前层、可见、隐藏、锁定、空层、删除确认、复制中。
```

NEW:

```text
**Anatomy:** 拖动 handle、层号、层名、实例数量、当前编辑层标识、新建/复制/删除操作，以及键盘可达的上移/下移排序控件。不得恢复隐藏/锁定开关。
**States:** 当前层、空层、拖动中、目标顺序预览、drop 成功、排序不可用、删除确认、复制中。
**Interaction Behavior:** 用户拖动层行时列表即时显示目标顺序；取消拖动恢复原顺序。Drop 后提交排序并触发现有自动保存。键盘用户可通过上移/下移控件完成同一排序结果。
```

Rationale: 修正旧 UX 中已废弃的 hidden/locked 残留，并补齐 drag-sort 状态。

## 5. Implementation Handoff

Scope classification: Minor.

Route to: Developer agent.

Suggested implementation tasks:

1. Add `reorder` input to `BuildingLayerEditInput` and implement pure reorder helper in `apps/web/src/state/building-layer-edit.ts`.
2. Add tests in `building-layer-edit.test.ts` for reorder, invalid ids, no-op drop, read-only no-op, stable ids/references, levelNumber resequence, current layer preservation, metadata update.
3. Extend `BuildingLevelPanel` props with `onReorderLayer` or equivalent; add drag preview local state, drag handle UI, disabled state, and keyboard fallback.
4. Add i18n strings for reorder handle, move up/down, drag preview/drop announcements, and read-only disabled labels.
5. Wire AppShell handler to `editBuildingLayer({ type: "reorder" })`; rely on existing autosave effect after committed scene update.
6. Add focused component/AppShell tests for drag preview no persistence before drop and autosave persistence after drop.
7. Add or update a Playwright smoke if existing browser smoke coverage includes desktop editing interactions; otherwise keep to component/AppShell focused tests plus typecheck/build.

Success criteria:

- Dragging a layer previews the target order before drop.
- Drop commits the order and autosaves.
- Refresh restores the new order.
- No schema migration or `SceneDocument v2`.
- Mobile/read-only still cannot edit or sort layers.
- Existing building layer create/copy/delete/rename/select flows still pass.

## 6. Approval Gate

This proposal is approved. Implementation proceeds through Epic 16 / Story 16.1:

- Approve: sync PRD / Epics / Architecture / UX / sprint-status, create Story 16.1, then implement.
- Revise: adjust scope, interaction details, or test gates before syncing.
- Reject: leave current planning and code unchanged.
