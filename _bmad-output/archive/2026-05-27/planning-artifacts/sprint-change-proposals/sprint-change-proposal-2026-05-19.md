---
workflowType: correct-course
date: 2026-05-19
project_name: pokopia-scene-editor
user_name: Grigri
mode: Batch
status: Approved
approvedAt: 2026-05-19
approvedBy: Grigri
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-directions.html
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - docs/功能验收-checklist.md
---

# Sprint Change Proposal: MVP 范围删减与移动端键盘屏蔽

## 1. Issue Summary

本次 correct-course 的触发原因是新的产品范围决策：MVP 需要删除一批已进入 PRD、Architecture、Epics/Stories 和实现验收的复杂编辑能力，并调整键盘操作要求。

当前 `sprint-status.yaml` 显示 Epic 1-4 及其 story 均为 `done`，因此这不是普通未开始 story 的验收微调，而是对已完成范围的正式收敛。`docs/功能验收-checklist.md` 中也能看到多项相关能力被标记为 `[-]` 或带有注释，和本次用户明确列出的删除项一致。

本次范围决策：

- 删除建筑层锁定、隐藏状态。
- 删除手动保存功能，仅保留自动保存/重新打开恢复方向。
- 删除 dirty / saved / saveError 这类可区分保存状态。
- 删除 Undo / Redo。
- 删除素材列表空状态中的清除筛选、恢复列表等恢复动作。
- 删除素材放置/移动时的素材适用区域校验。
- 删除素材堆砌能力。
- 删除移动素材实例能力，包括同层移动和跨建筑层移动。
- 删除实例普通备注维护能力。
- 删除素材是否可旋转的差异，所有素材都视为可旋转。
- 删除预览中控制是否显示网格、主体边界、技能标记的能力；预览改为固定不显示这三类覆盖信息。
- 桌面键盘操作不再作为产品要求；可保留也可移除。
- Mobile 模式下屏蔽所有应用级键盘操作。

## 2. Change Analysis Checklist

| Item | Status | Notes |
| --- | --- | --- |
| 1.1 Triggering story | Done | 触发项跨越 Story 1.4、1.6、1.7、2.1-2.5、2.7-2.8、3.2、3.5、4.1-4.6。不是单一 story 缺陷。 |
| 1.2 Core problem | Done | 类型为 stakeholder scope reduction / MVP scope simplification。原计划实现了较完整编辑器，现在需要压缩 MVP 操作面。 |
| 1.3 Evidence | Done | 用户明确列出删除/修改项；`docs/功能验收-checklist.md` 对相关项已有 `[-]` 或待修改注释。 |
| 2.1 Current epic impact | Done | Epic 1-4 均受影响，但核心 7x7 画布、建筑层、素材放置、技能标记、双预览、自动保存恢复仍保留。 |
| 2.2 Epic-level changes | Done | 已在 `epics.md` 中新增 Epic 5 cleanup/scope-reduction backlog，避免抹掉已完成 Epic 1-4 交付历史。 |
| 2.3 Future epics | N/A | 当前没有未完成 planned epic。 |
| 2.4 Obsolete epics | Done | 无需废弃 Epic 1-4，但其中多个 story 的验收结果将被 Epic 5 反向调整。 |
| 2.5 Priority/order | Done | 新 cleanup epic 应优先于后续新功能开发。 |
| 3.1 PRD conflicts | Done | FR/NFR、User Journey、MVP Feature Set、Measurable Outcomes 多处需要删减。 |
| 3.2 Architecture conflicts | Done | command layer、undo/redo、saveStatus、lock/hidden、stackability、area validation、preview UI preferences、mobile keyboard handler 均需调整。 |
| 3.3 UX conflicts | Done | 顶部保存/撤销/重做、建筑层状态、素材空状态动作、预览开关、mobile 键盘行为需更新。 |
| 3.4 Other artifacts | Done | story 文件、sprint tracker、测试策略、功能验收 checklist 和实现代码都需后续同步。 |
| 4.1 Direct adjustment | Viable | 可通过新增 cleanup epic + 更新 PRD/Architecture/UX/Epics 完成。努力中等，风险中等。 |
| 4.2 Rollback | Not viable | 直接回滚多个已完成 story 成本高，且会丢失仍需保留的基础能力。 |
| 4.3 PRD MVP review | Viable | 本质是 MVP 降复杂度，必须更新 PRD，避免实现和验收继续追逐旧范围。 |
| 4.4 Recommended path | Done | 采用 Hybrid：PRD MVP Review + Direct Adjustment，新增 cleanup epic 执行实现删减。 |
| 5.1-5.5 Proposal components | Done | 本文给出影响分析、具体修改提案和 handoff。 |
| 6.1-6.4 Final review / approval / tracker update | Done | 用户已回复 `C` 批准；PRD、Architecture、UX、Epics 和 `sprint-status.yaml` 已更新。 |

## 3. Impact Analysis

### Epic Impact

**Epic 1: 规则可见的 7x7 布景工作台**

保留：工作台布局、7x7 画布、5x5 主体区、外围区、坐标、建筑层上下文、移动端只读模式。

调整：

- Story 1.4 的键盘选格不再是验收要求；桌面可保留实现，但不能作为必须通过项。
- Story 1.5 不再需要展示可见/锁定状态。
- Story 1.6 mobile 只读仍保留，但 mobile 下应用级键盘操作应全部屏蔽，不再允许键盘移动查看焦点或选择查看对象。
- Story 1.7 顶部保存状态需要从 dirty/saved/saveError 简化为无保存状态，或仅展示自动保存/恢复的非状态化提示。

**Epic 2: 素材、建筑层与技能的完整编辑闭环**

保留：素材浏览、搜索、分类/喜好/技能筛选、选择素材、放置、删除、替换、旋转、染色、建筑层创建/删除/重命名/复制/切换、实例技能标记和技能类型。

删除：

- 建筑层隐藏/显示/锁定/解锁。
- 同层堆叠和 `canStack` 规则。
- 放置/移动时的适用区域校验。
- 同层移动、跨格移动、跨层移动。
- 普通实例备注 `note` 的 UI 和持久化要求。
- 可旋转性差异；`canRotate` 不再作为产品约束，所有素材允许 0/90/180/270 旋转。
- 素材空状态恢复动作。

待确认边界：

- 本提案默认只删除“普通实例备注 `note`”。`skillNote` 是否也删除未在用户列表中明确出现；若要一起删除，应在审批时标记为 revise。

**Epic 3: 俯视图与正视图结构校验**

保留：左下 Preview Inspector、俯视图、正视图、建筑层高度关系、当前层/全部层范围的基础展示。

调整：

- 删除 Story 3.5 的预览显示选项。
- 预览固定不显示网格、5x5 主体边界和技能标记。
- 预览显示选项不再进入 localStorage UI preferences。

**Epic 4: 保存、导出、导入恢复与数据可信闭环**

保留：SceneDocument v1、自动保存、重新打开恢复、schema validation、roundtrip、恢复失败保护、安全文本展示。

调整：

- 删除手动保存按钮和手动保存 flow。
- 删除 user-facing dirty/saved/saveError 区分。
- 删除 `workspaceState.saveStatus` 作为 payload 必填字段的要求。
- 删除 undo/redo history 对保存/恢复和 mobile guard 的影响。
- 若删除普通备注 `note`，SceneDocument v1 schema、serializer、roundtrip 和 unsafe-text tests 需同步。

## 4. Recommended Approach

建议采用 **Hybrid: PRD MVP Review + Direct Adjustment**。

理由：

- 这是明确的 MVP 范围收敛，必须更新 PRD/Architecture/UX/Epics，否则后续实现、验收和 code review 会继续引用旧要求。
- 不建议回滚已完成 story，因为大量基础能力仍然有效，例如 7x7 画布、建筑层、素材放置、技能标记、自动保存恢复和双预览。
- 不建议直接改写已完成 story 历史并当作从未存在；当前 tracker 已显示 Epic 1-4 完成。更稳妥的方式是在计划中新增一个 cleanup epic，明确“删除已实现但不再属于 MVP 的能力”，再由 dev story 执行代码/测试/文档同步。

Change scope classification: **Moderate**。需要 Product Owner / Developer coordination：先更新规划源，再实现删减和回归测试。

## 5. Detailed Change Proposals

### 5.1 PRD Updates

**PRD Scope Summary**

OLD:

```md
核心规则包括：中心 5×5 主体区、外围 1 圈装饰区、0 层到 n 层的建筑层关系、同坐标跨建筑层叠放、素材实例级技能标记，以及完整 7×7 预览。
```

NEW:

```md
核心规则包括：中心 5×5 主体区、外围 1 圈装饰区、0 层到 n 层的建筑层关系、同坐标跨建筑层放置、素材实例级技能标记，以及完整 7×7 预览。MVP 不支持同层素材堆叠、实例移动、建筑层隐藏/锁定或手动保存。
```

Rationale: 去掉堆叠、移动、隐藏/锁定和手动保存，同时保留跨建筑层同坐标放置。

**PRD Must-Have Capabilities**

OLD:

```md
当前素材选择、素材放置、删除、替换、移动和旋转。
建筑层创建、删除、重命名、复制、隐藏、显示、锁定、解锁和当前编辑层设置。
保存/自动保存、dirty/saved 状态和本地重新打开恢复。
```

NEW:

```md
当前素材选择、素材放置、删除、替换和旋转；所有素材均支持 0/90/180/270 度旋转。
建筑层创建、删除、重命名、复制和当前编辑层设置；MVP 不提供建筑层隐藏、显示、锁定或解锁。
自动保存和本地重新打开恢复；MVP 不提供手动保存按钮，也不要求展示 dirty/saved/saveError 状态。
```

Rationale: 对齐用户删除项，同时保留核心编辑闭环。

**PRD Functional Requirements**

OLD:

```md
FR13: 系统可以根据素材属性判断同一建筑层同一格子是否允许叠放。
FR14: 用户可以移动已放置素材到其他格子。
FR15: 用户可以将已放置素材移动到其他建筑层。
FR17: 系统可以在素材移动时保留素材 ID、建筑层、技能标记、朝向、染色和备注。
FR18: 用户可以为已放置素材维护备注。
FR25: 用户可以隐藏或显示建筑层。
FR26: 用户可以锁定或解锁建筑层。
FR47: 用户可以控制预览中是否显示网格、主体边界和技能标记。
FR50: 用户可以保存当前布景数据，系统可以在编辑后更新 dirty/saved 状态并支持自动保存草稿。
```

NEW:

```md
Remove FR13, FR14, FR15, FR17, FR18, FR25, FR26 and FR47 from MVP.
FR50: 系统可以自动保存当前布景数据并在重新打开时恢复最新有效草稿；自动保存必须写入与后续显式导出完全相同的 SceneDocument v1 payload。MVP 不提供手动保存入口，也不要求展示 dirty/saved/saveError 状态。
```

Rationale: 这些 FR 与明确删除项直接冲突。

**PRD Payload Requirements**

OLD:

```md
FR53: 系统可以在保存和序列化数据中包含 ... 备注，以及 workspaceState.saveStatus。
```

NEW:

```md
FR53: 系统可以在自动保存和序列化数据中包含建筑层、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记，以及 workspaceState.currentBuildingLevelId、workspaceState.selectedAssetId 和 workspaceState.selectedCoordinate。MVP payload 不要求包含普通实例备注 note 或 workspaceState.saveStatus。
```

Rationale: 删除普通备注和保存状态区分。

**PRD UI Preferences**

OLD:

```md
FR64: 系统可以将素材搜索词、分类/区域/技能筛选、favorite-only 和预览显示选项保存到 localStorage。
```

NEW:

```md
FR64: 系统可以将素材搜索词、分类/技能筛选和 favorite-only 保存到 localStorage，并确保这些 UI 偏好不进入 SceneDocument v1 payload。预览网格、主体边界和技能标记不再提供显示选项。
```

Rationale: 删除预览显示选项；区域筛选可保留为浏览辅助时应另行确认，放置区域校验明确删除。

**PRD Keyboard Accessibility**

OLD:

```md
NFR18: 用户应能仅使用键盘通过 Tab、Shift+Tab、Enter、Space 和方向键访问素材搜索、筛选控件、工具栏、建筑层列表和上下文/检查器字段中的主要表单控件。
```

NEW:

```md
NFR18: 桌面和平板编辑模式下的键盘快捷操作不作为 MVP 强制要求；现有键盘支持可以保留或删除。Mobile View-only Mode 下必须禁用应用级键盘操作，不允许键盘触发选择、放置、删除、旋转、保存、撤销/重做、建筑层切换或任何 scene/view editing command。
```

Rationale: 对齐“键盘操作不做要求”和“mobile 模式下屏蔽所有键盘操作”。

### 5.2 Architecture Updates

**Command and State**

OLD:

```md
所有会修改 scene document 的行为都应经过统一 command 层，便于撤销/重做、dirty state、只读模式、校验和自动化测试。
MVP 状态管理使用 React useReducer + command dispatcher + undo/redo history。
```

NEW:

```md
所有会修改 scene document 的行为都应经过统一 command 层，便于只读模式、校验和自动化测试。MVP 不提供撤销/重做 history。
MVP 状态管理使用 React useReducer + command dispatcher；undo/redo history 不进入 MVP。
```

Rationale: 删除 Undo / Redo。

**SceneDocument Payload**

OLD:

```md
workspaceState.saveStatus
workspaceState.saveStatus 只允许 dirty | saved
备注字段必须显式存在；未填写时使用空字符串。
```

NEW:

```md
workspaceState 不包含 saveStatus。
普通实例备注 note 不作为 MVP payload 必填字段；若后续恢复旧 payload，可在 migration/cleanup story 中明确移除或忽略。
skillNote 是否保留需在审批时确认；默认本 proposal 仍保留 skillNote。
```

Rationale: 删除保存状态区分和普通实例备注。

**Asset Rules**

OLD:

```md
src/domain/assets/: asset catalog 类型、搜索筛选、适用区域和默认技能规则。
command layer checks: stackability, area compatibility, locked-level checks.
```

NEW:

```md
src/domain/assets/: asset catalog 类型、搜索筛选、默认技能和染色规则。适用区域可作为展示/筛选元数据保留，但不作为放置阻断规则。
command layer 不再检查 stackability、area compatibility 或 locked-level state。MVP 同一建筑层同一坐标只保留单实例替换/删除语义，不支持堆叠。
```

Rationale: 删除素材适用区域校验、堆叠和建筑层锁定。

**Preview Preferences**

OLD:

```md
local UI preferences: persist asset search/filter/favorite-only and preview display options to a separate localStorage namespace.
preview-inspector/: 当前层/全部可见层、网格/边界/技能标记显示选项。
```

NEW:

```md
local UI preferences: persist asset search/filter/favorite-only to a separate localStorage namespace.
preview-inspector/: 展示正视图/俯视图和层范围；不提供网格、主体边界或技能标记显示开关，预览固定不显示这三类覆盖信息。
```

Rationale: 删除预览显示控制，并固定预览覆盖信息为不显示。

**Mobile Keyboard**

OLD:

```md
command layer、canvas pointer handler 和 keyboard handler 都必须检查只读边界。
Mobile 下键盘只能移动查看焦点或选择查看对象，不能触发编辑。
```

NEW:

```md
command layer 和 canvas pointer handler 继续检查只读边界。Mobile View-only Mode 下应用级 keyboard handler 必须直接 no-op，不移动查看焦点、不选择格子、不切换建筑层、不触发任何 scene/view command。
```

Rationale: 明确 mobile 屏蔽所有应用级键盘操作。

### 5.3 UX Design Updates

**Workbench Controls**

OLD:

```md
图标按钮用于保存、删除、旋转、染色、显示网格、显示主体边界、显示技能标记等高频工具。
```

NEW:

```md
图标按钮用于删除、旋转、染色等保留的编辑工具。MVP 不显示手动保存、撤销、重做、预览网格、预览主体边界或预览技能标记控制。
```

Rationale: 删除手动保存、Undo/Redo 和预览显示控制。

**Building Level Panel**

OLD:

```md
当前层、可见/隐藏、锁定、空层、删除确认、实例数量和当前编辑层标识必须可见或一次操作可达。
```

NEW:

```md
当前层、空层、删除确认、实例数量和当前编辑层标识必须可见或一次操作可达。建筑层不提供可见/隐藏或锁定状态。
```

Rationale: 删除建筑层隐藏和锁定。

**Asset Empty State**

OLD:

```md
素材搜索无结果或筛选无结果时必须显示空状态和恢复动作，例如清除筛选、显示全部或切换分类。
```

NEW:

```md
素材搜索无结果或筛选无结果时只显示明确空状态。MVP 不要求提供清除筛选、显示全部或切换分类等恢复动作。
```

Rationale: 删除空状态恢复操作。

**Preview Inspector**

OLD:

```md
Preview Inspector 必须支持当前层/全部可见层、显示网格、显示主体边界和显示技能标记。
```

NEW:

```md
Preview Inspector 必须展示俯视图和正视图，并可保留当前层/全部层范围。预览固定不显示网格、主体边界和技能标记，也不提供对应开关。
```

Rationale: 预览覆盖信息固定为不显示。

### 5.4 Epic and Story Updates

建议不要直接改写已完成 Epic 1-4 的历史状态，而是在 `epics.md` 中新增：

```md
## Epic 5: MVP 范围删减与交互清理

用户可以使用一个更轻量的 Pokopia 布景编辑 MVP：保留 7x7 画布、建筑层、素材放置/删除/替换/旋转/染色、技能标记、双预览、自动保存和恢复；删除建筑层隐藏/锁定、手动保存、保存状态区分、Undo/Redo、素材空状态恢复动作、素材区域阻断校验、堆叠、实例移动、普通备注、可旋转性差异和预览覆盖开关。
```

建议新增 stories：

```md
### Story 5.1: 清理数据模型与 command 能力

删除 saveStatus、undo/redo history、建筑层 visible/locked 写操作、stackability、area compatibility blocking、实例 move command、普通 note 字段和 canRotate 分支。保留自动保存、恢复、替换、删除、旋转、染色、技能标记和技能类型。
```

```md
### Story 5.2: 清理工作台 UI 与预览交互

移除手动保存、撤销/重做入口、建筑层隐藏/锁定入口、素材空状态恢复动作、堆叠数量 UI、实例移动入口、普通备注字段、不可旋转提示和预览网格/主体边界/技能标记开关。预览固定不显示网格、主体边界和技能标记。
```

```md
### Story 5.3: Mobile 键盘屏蔽与回归测试

Mobile View-only Mode 下应用级键盘 handler no-op；不再要求桌面键盘完整操作验收。更新 unit/component/Playwright tests，证明 mobile 键盘不会选择、放置、删除、旋转、保存、撤销/重做、切换建筑层或改变 scene/view command state。
```

建议更新 `sprint-status.yaml`：

```yaml
development_status:
  epic-5: backlog
  5-1-clean-data-model-and-command-scope: backlog
  5-2-clean-workbench-ui-and-preview-controls: backlog
  5-3-mobile-keyboard-block-and-regression-tests: backlog
  epic-5-retrospective: optional
```

Rationale: 通过新 epic 保留历史完成记录，同时为删减后的实现闭环提供可追踪 backlog。

## 6. Implementation Handoff

Recommended handoff: **Product Owner / Developer agents**。

Responsibilities:

- Product/PO pass: 批准后更新 `prd.md`、`ux-design-specification.md`、`architecture.md`、`epics.md` 和 `sprint-status.yaml`。
- Developer pass: 按新增 Epic 5 stories 删除实现、更新 schema/serializer/reducer/components/tests。
- Review pass: 用 code review 检查是否仍残留被删除能力，尤其是隐藏/锁定、manual save、undo/redo、area validation、stackability、move commands、note、canRotate、preview toggles 和 mobile keyboard handlers。

Success criteria:

- PRD/Architecture/UX/Epics 不再把删除项描述为 MVP 必须能力。
- `sprint-status.yaml` 有清晰的 Epic 5 cleanup backlog。
- 实现后，UI 不再暴露被删除的入口。
- 自动保存和恢复仍通过。
- Mobile `<768px` 下应用级键盘操作无效。
- 预览不显示网格、主体边界或技能标记。

## 7. Approval Gate

本 proposal 当前为 **Approved**。

请审批下一步：

- 已批准：进入规划产物更新和 Epic 5 backlog 生成。

已确认边界：本 proposal 默认删除普通实例备注 `note`，但保留技能备注 `skillNote`。

## 8. Workflow Completion

- Issue addressed: MVP 范围删减与 Mobile 键盘屏蔽。
- Change scope: Moderate。
- Artifacts modified: `prd.md`、`ux-design-specification.md`、`architecture.md`、`epics.md`、`sprint-status.yaml`。
- Routed to: Product Owner / Developer agents。
- Next step: `bmad-create-story` 或 `bmad-dev-story` 应从 Epic 5 的 Story 5.1 开始。
