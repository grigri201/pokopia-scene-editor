---
date: 2026-06-04
workflow: bmad-correct-course
status: approved
approval: A
approved_at: 2026-06-04T17:26:24+0800
change_scope: moderate
recommended_path: direct-adjustment
trigger: 在素材区域上方增加素材暂存区
---

# Sprint Change Proposal - 素材暂存区

## 1. Issue Summary

用户提出在现有素材区域上方增加一个“素材暂存区”，用于把素材窗口中的素材拖入临时列表。折叠状态下，暂存区只显示最后放入的 3 个素材和暂存区素材总数；每个素材只显示图片和名称，并在右上角提供小删除按钮。暂存区底部提供向下箭头；点击后素材区域下沉，暂存区占据素材面板 80% 高度，素材区域占据 20% 高度。展开后，暂存区显示效果与素材区相同，同样提供旋转按钮；暂存区不按类型分组，所有素材在一个可滚动列表中展示。

这不是数据模型能力，也不是素材 catalog 数据变更。它是 `apps/web` 的 desktop/tablet 编辑工作台中的素材选择效率改进，目标是让用户在大素材库中先收集常用候选，再从暂存区快速选择、旋转和放置。暂存区需要写入本地存储以便刷新后保留，但不得进入 `SceneDocument` 或任何导出字符串。Mobile surface 不显示暂存区。

当前触发不是某个失败 story，而是新的用户体验需求。现有 Epic 14-17 均已完成，tracker 中没有 active backlog；因此推荐新增后续 Polish Epic，而不是修改已完成 Epic。

## 2. Change Navigation Checklist

### Section 1 - Understand the Trigger and Context

- [N/A] 1.1 Triggering story: 无直接触发 story；这是新提出的工作台素材选择效率需求。
- [x] 1.2 Core problem: 素材库分页/筛选足以查找，但用户缺少一个跨筛选、跨页的临时候选区来保留近期想使用的素材。
- [x] 1.3 Evidence: 用户明确要求“素材暂存区”、拖入、删除、总数、最后 3 个、80/20 展开布局、展开后与素材区相同且有旋转按钮。

### Section 2 - Epic Impact Assessment

- [x] 2.1 Current epic: Epic 17 已完成，不应把 UI polish 插入 Epic 17 数据抽取范围。
- [x] 2.2 Epic-level changes: 新增 Epic 18“素材暂存区与快速候选素材选择”。
- [x] 2.3 Planned epic review: 当前无未完成 active epic；不影响 Epic 14 mobile、Epic 15 remote import、Epic 16 layer reorder、Epic 17 data extraction。
- [x] 2.4 Future epic invalidation: 不使任何未来 epic 失效。
- [x] 2.5 Priority/order: 作为独立 Polish Epic，排在已完成 Epic 17 之后。

### Section 3 - Artifact Conflict and Impact Analysis

- [x] 3.1 PRD: 需要新增 functional requirements，明确暂存区是本地持久化的 UI candidate list；写入 localStorage，但不写 `SceneDocument v1`、scene saved/autosave slots、PSE string 或 export summary。
- [x] 3.2 Architecture: 需要扩展 `asset-picker/` component boundary，增加 drag/drop、暂存列表、展开布局、localStorage adapter 和 selected placement wiring；不进入 `packages/scene-core` 领域模型。
- [x] 3.3 UI/UX: 需要补充 Asset Picker 组件 anatomy/states/interaction behavior，以及 desktop/tablet responsive 约束。
- [x] 3.4 Other artifacts: 需要新增 focused component tests、AppShell integration tests、layout/browser smoke；不需要 deploy script、schema、worker、API 或 data-source 文档变更。

### Section 4 - Path Forward Evaluation

- [x] 4.1 Option 1 Direct Adjustment: Viable. 新增 Epic + stories 即可；实现集中在 `apps/web/src/components/asset-picker/`、`apps/web/src/components/app-shell/`、`apps/web/src/styles.css` 和 i18n/tests。
- [x] 4.2 Option 2 Rollback: Not viable. 无需回滚已完成 story。
- [x] 4.3 Option 3 PRD MVP Review: Not viable. 产品已进入 Polish 阶段，不需要重审 MVP。
- [x] 4.4 Recommended path: Direct Adjustment，scope = moderate。理由：这是单一工作台区域的 UX 增强，但涉及拖拽、布局比例、可访问删除按钮、旋转 wiring、desktop read-only guard、mobile absence 和测试，不能作为无规划 quick fix。

## 3. Recommended Approach

推荐新增 Epic 18，并按以下边界实现：

- 暂存区是 `apps/web` desktop/tablet edit surface 的 UI-only 状态，需要通过 UI preferences 或独立 localStorage key 持久化 `assetId` 顺序和展开/折叠状态。
- 暂存区不得写入 `SceneDocument v1`、scene autosave slot、scene saved slot、PSE1/PSE2/PSE3 字符串、export summary 或 `packages/scene-core`。
- 本地存储恢复时应过滤未知 `assetId`、坏 schema、重复项和不可解析内容；读取失败时回退为空暂存区，不能阻塞 SceneDocument recovery。
- 暂存内容按 `assetId` 去重；重复拖入同一素材只把它移动到最近位置，不增加总数。暂存区总数表示 distinct staged assets count。
- 折叠状态展示最近 3 个素材。建议 newest-first，最晚放入的素材显示在最上方或最左侧。
- 折叠状态卡片只显示缩略图、名称和删除按钮；卡片点击仍可选择该素材作为待放置素材，删除按钮只移出暂存区。
- 展开状态复用素材区的 row/card 视觉和交互：点击选择、双击连续放置、非 1x1 素材显示旋转按钮、当前选中/连续放置状态一致表达。
- 展开状态不显示分类分组或 category tabs；所有暂存素材按最近顺序进入一个可滚动列表。
- 展开按钮在折叠时显示向下箭头；展开后应提供对应收起入口，建议箭头切换为向上，避免用户无法恢复原布局。
- Mobile Preview Mode (`<768px`) 继续不显示素材选择和暂存区；mobile 不需要读取、展示或写入暂存区本地存储。Desktop/tablet read-only 状态不允许拖入、删除或选择放置，但可以按既有规则查看素材详情。

## 4. Detailed Change Proposals

### PRD Change Proposal

Artifact: `_bmad-output/planning-artifacts/prd.md`

Section: Course Corrections

OLD:

```md
### Approved Course Correction - 2026-06-04 Pokopia Data 独立项目抽取

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-pokopia-data-extraction.md` 增加 Epic 17...
```

NEW:

```md
### Approved Course Correction - 2026-06-04 素材暂存区

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md` 增加 Epic 18，用于在 `apps/web` desktop/tablet 编辑工作台的素材区域上方提供一个 UI-only 素材暂存区。用户可以从素材列表拖动素材到暂存区，折叠状态下查看最近 3 个暂存素材和总数，并可移除单个素材；展开状态下暂存区占据素材面板主要高度，使用与素材区一致的素材行展示、选择和旋转交互。

`SceneDocument v1` 继续保持。素材暂存区是本地持久化的候选素材选择状态，可写入 UI preferences 或独立 localStorage key，但不得写入 `SceneDocument`、scene autosave slot、scene saved slot、PSE 字符串、export summary、footprint/stacking derived state 或 `packages/scene-core`。Mobile Preview Mode 不渲染素材暂存区，也不需要读取、恢复或写入暂存区本地存储。
```

Section: Functional Requirements / Asset Catalog & Selection

OLD:

```md
- FR28-FR35 and FR59 Asset Catalog & Selection...
```

NEW:

```md
- FR124: `apps/web` desktop/tablet 编辑工作台的素材区域上方必须提供“素材暂存区”，允许用户从素材列表拖动素材进入暂存区；desktop/tablet read-only 不得允许写入暂存区或触发 scene edit command。
- FR125: 暂存区折叠状态必须显示最后放入的 3 个素材和暂存区素材总数；每个暂存素材只显示缩略图、名称和右上角删除按钮。删除只移出暂存区，不删除 scene 中已放置素材。
- FR126: 暂存区底部必须提供展开入口。点击后暂存区占据素材面板约 80% 高度，原素材区域下沉并占据约 20% 高度；展开状态必须可滚动且有可访问的收起入口。
- FR127: 暂存区展开后必须用与素材区一致的素材行/card 视觉和主要交互展示所有暂存素材，包括点击选择、连续放置表达、当前选中状态和非 1x1 素材的旋转按钮；暂存区不按 category/type 分组。
- FR128: 暂存区状态必须写入本地存储，至少保留暂存 `assetId` 顺序和展开/折叠状态；本地存储读取失败、版本不匹配或包含未知素材时必须安全回退或过滤。
- FR129: 暂存区状态不得写入 `SceneDocument v1`、scene autosave slot、scene saved slot、scene string codec、PSE 导出字符串、export summary 或任何 `scene-core` 领域状态。
- FR130: `<768px` Mobile Preview Mode 不得渲染素材暂存区、暂存区展开/收起入口、暂存删除按钮或暂存旋转按钮；mobile 不需要读取、恢复或写入暂存区 localStorage。
```

Rationale: PRD 需要把用户可见行为和数据安全边界写清楚，尤其防止暂存区被误实现为 scene schema 字段。

### UX Design Change Proposal

Artifact: `_bmad-output/planning-artifacts/ux-design-specification.md`

Section: Course Corrections

OLD:

```md
### Approved Course Correction - 2026-06-01 `scene_id` URL 即时访问导入
...
```

NEW:

```md
### Approved Course Correction - 2026-06-04 素材暂存区

本 UX 规格已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md` 增加 Epic 18。素材暂存区是 `apps/web` desktop/tablet 编辑工作台中位于素材区域上方的本地持久化候选列表，帮助用户在分页、筛选和刷新之间保留近期想用的素材。Mobile preview/import surface 不显示该区域。

折叠状态下，暂存区保持紧凑，只展示最后放入的 3 个素材、总数和每项删除按钮。展开状态下，暂存区成为主要浏览 surface，占据素材面板 80% 高度，素材区域下沉为 20%，并用与素材区一致的素材行展示所有暂存素材。暂存区不提供类型分组；所有暂存素材在一个可滚动列表里按最近顺序排列。
```

Section: Component Strategy / Asset Picker

OLD:

```md
#### Asset Picker

**Purpose:** 帮助用户快速找到并选择当前要放置的素材。
**Usage:** Direction A 左侧栏。
**Anatomy:** 搜索框、结果计数、分类筛选、区域筛选、技能筛选、素材卡片、素材缩略图、名称、分类、标签、footprint、承载/叠放能力标识、默认技能状态。
**States:** 默认、搜索中、空结果、筛选无结果、素材选中、素材不可用于当前区域。
**Accessibility:** 搜索框有明确标签；结果数量使用 `aria-live`；素材卡片可键盘选择。
**Interaction Behavior:** 选择素材后进入待放置状态，并把本次放置默认技能状态暴露给画布和属性面板。
```

NEW:

```md
#### Asset Picker

**Purpose:** 帮助用户快速找到、暂存并选择当前要放置的素材。
**Usage:** Direction A 的素材栏；当前实现为右侧浮动素材面板，后续文档中“素材区域”均指该 Asset Picker 内的素材搜索/结果区域。
**Anatomy:** 素材暂存区、展开/收起箭头、暂存总数、暂存素材缩略图、暂存素材名称、暂存删除按钮、搜索框、结果计数、分类筛选、素材卡片、素材缩略图、名称、分类/标签信息、footprint、承载/叠放能力标识、默认技能状态和旋转入口。
**States:** 默认、暂存区空、暂存区有 1-3 个素材、暂存区超过 3 个素材、暂存区展开、暂存区折叠、拖入可接收、拖入完成、暂存素材删除、搜索中、空结果、筛选无结果、素材选中、连续放置素材选中、desktop/tablet read-only 禁用。Mobile 不渲染暂存区。
**Accessibility:** 搜索框有明确标签；结果数量和暂存总数使用可访问文本；暂存区 drop target、展开/收起按钮、删除按钮和旋转按钮都有明确可访问名称；删除按钮必须说明“从暂存区移除”，避免被误解为删除已放置素材。
**Interaction Behavior:** 用户可以从素材列表拖动素材到暂存区。重复拖入同一素材只更新最近顺序。折叠状态下展示最近 3 个暂存素材，点击素材仍可选择为待放置素材。展开状态下展示所有暂存素材，使用与素材结果一致的选择、双击连续放置、当前选中表达和旋转按钮。暂存区状态写入本地 UI 存储以便刷新后保留，但不写入 scene、不触发 scene autosave、不进入导出字符串，也不影响搜索筛选条件。
```

Rationale: UX 规格需要明确暂存区与素材区的层级关系、折叠/展开状态、删除语义和可访问名称。

### Architecture Change Proposal

Artifact: `_bmad-output/planning-artifacts/architecture.md`

Section: Approved Course Corrections

OLD:

```md
### Approved Course Correction - 2026-06-04 Pokopia Data 独立项目抽取
...
```

NEW:

```md
### Approved Course Correction - 2026-06-04 素材暂存区

本 Architecture 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md` 增加 Epic 18。素材暂存区属于 `apps/web` desktop/tablet Asset Picker UI state，用于保存候选 `assetId` 列表和展开/折叠状态。它需要通过 UI preferences 或独立 localStorage key 本地持久化，但不属于 mobile preview/import surface、`SceneDocument v1`、scene saved/autosave storage、`packages/scene-core`、asset catalog source、scene string codec 或 export summary。

实现应优先在 `apps/web/src/components/asset-picker/` 内拆分可复用的 asset row/card presentation，以便素材结果区和展开后的暂存区共享视觉与选择/旋转 wiring。`apps/web/src/components/app-shell/` 只负责传入当前 selected asset、placement mode、rotation handlers、desktop read-only guard 和 mobile absence guard。拖拽进入暂存区、删除暂存项和展开/收起可以写入本地 UI 存储；不得 dispatch scene write command，也不得触发 scene autosave。
```

Section: Component Boundaries

OLD:

```md
- `asset-picker/`：右侧浮动素材搜索、分类/喜好/区域/技能筛选、选中素材和本次放置默认技能状态。
```

NEW:

```md
- `asset-picker/`：右侧浮动素材搜索、分类/喜好/区域/技能筛选、素材暂存区、暂存区拖入/删除/展开状态、选中素材和本次放置默认技能状态。暂存区只在 desktop/tablet edit surface 渲染，保存 UI-only `assetId` 顺序和展开状态，并通过 UI preferences 或独立 localStorage key 持久化；展开后复用素材结果行/card presentation，点击/双击选择和旋转仍通过既有 `onAssetSelect`、`onPlacementRotationChange` callback 进入 AppShell，不得直接修改 `SceneDocument`。
```

Section: State Management Patterns

OLD:

```md
- UI-only state 可以留在组件内，例如 hover cell、search query、panel open state、zoom/pan。
```

NEW:

```md
- UI-only state 可以留在组件内，例如 hover cell、search query、panel open state、zoom/pan。素材暂存区 `assetId` 顺序和暂存区展开状态是 UI-only preference state，可以写入 UI preferences 或独立 localStorage key；不得写入 SceneDocument、scene autosave payload、scene saved payload、scene string 或 export summary。
```

Rationale: Architecture 需要防止暂存列表进入 core/schema，并指导实现拆分共享素材行以减少视觉/交互漂移。

### Epics Change Proposal

Artifact: `_bmad-output/planning-artifacts/epics.md`

Section: Active Epic Index

OLD:

```md
As of 2026-06-04, Epic 17 is the active BMAD planning surface.
```

NEW:

```md
As of 2026-06-04, Epic 18 is the active BMAD planning surface.
```

Add after Epic 17:

```md
## Epic 18: 素材暂存区与快速候选素材选择

在 `apps/web` desktop/tablet 编辑工作台中，用户可以把素材区域中的素材拖入上方“素材暂存区”，形成一个不按类型分组的本地持久化候选列表。折叠时暂存区只展示最近 3 个素材和总数；展开时暂存区占据素材面板 80% 高度，素材区域下沉到 20%，并以与素材区相同的方式展示所有暂存素材、选择状态和旋转按钮。该能力不改变 `SceneDocument v1`，不进入 PSE 导出字符串，不渲染到 mobile preview/import surface，不修改 asset catalog 数据源。

### Story 18.1: Course Correction 同步与素材暂存区契约

As a 维护者, I want PRD、Architecture、UX、Epics 和 tracker 明确素材暂存区的本地 UI 存储边界, So that 后续实现不会把暂存状态误写入 scene schema、导出字符串或 catalog。

Acceptance Criteria:

- PRD 新增素材暂存区 functional requirements。
- Architecture 新增 `asset-picker/` 暂存区 component/state boundary。
- UX Design Specification 新增素材暂存区折叠/展开交互规格。
- Epics 新增 Epic 18 和 stories。
- sprint-status 新增 Epic 18 tracker entries。
- 明确本次只新增本地 UI 存储，不改 `SceneDocument v1`、PSE string、scene autosave payload、scene saved payload、export summary 或 `packages/scene-core` catalog。

### Story 18.2: 折叠暂存区、拖入与删除

As a 布景编辑用户, I want 从素材列表拖动素材到暂存区并在折叠状态看到最近 3 个素材, So that 我可以快速保留候选素材而不丢失当前搜索上下文。

Acceptance Criteria:

- 素材区域上方显示“素材暂存区”。
- 用户可从素材列表拖动素材到暂存区；desktop/tablet read-only 不允许写入暂存区；mobile preview/import 不渲染暂存区。
- 暂存区按 `assetId` 去重；重复拖入同一素材只移动到最近位置。
- 折叠状态只显示最后放入的 3 个素材和暂存区总数。
- 每个暂存素材只显示缩略图、名称和右上角删除按钮；删除只移出暂存区，不删除 scene 中已放置素材。
- 折叠暂存素材点击后可选择为待放置素材，并沿用现有 selected/continuous placement state。
- 拖入、删除和折叠/展开写入本地 UI 存储；不得写 `SceneDocument`、scene autosave slot、scene saved slot、PSE 导出字符串或 export summary。

### Story 18.3: 展开暂存区与素材区 80/20 布局

As a 布景编辑用户, I want 展开暂存区后像素材区一样浏览和操作所有候选素材, So that 我可以在候选列表中继续选择、连续放置和旋转大素材。

Acceptance Criteria:

- 暂存区底部提供向下箭头展开入口；展开后提供可访问的收起入口。
- 展开时暂存区占据 Asset Picker 内容高度约 80%，素材区域占据约 20%；布局不得导致搜索框、分类筛选、分页或素材行重叠。
- 展开暂存区显示所有暂存素材，使用与素材区一致的素材行/card 视觉、当前选中状态、连续放置状态和非 1x1 素材旋转按钮。
- 暂存区不按 category/type 分组，不显示分类 tab；所有暂存素材在一个可滚动列表中按最近顺序排列。
- 展开暂存区的选择和旋转通过既有 `onAssetSelect`、`onPlacementRotationChange` callbacks 生效；不得新增 scene write path。
- 在 1280x720 desktop 和 768-1279px tablet 单列布局下，展开状态不遮挡画布、建筑层面板或当前选择检查器。

### Story 18.4: 回归测试与浏览器验证

As a 维护者, I want 素材暂存区有 focused tests 和 layout smoke, So that 它不会破坏素材搜索、分页、旋转、连续放置、autosave 或 mobile preview。

Acceptance Criteria:

- AssetPicker component tests 覆盖拖入、去重、最近 3 个显示、总数、删除、折叠点击选择、展开 80/20 class/state、展开列表滚动、旋转按钮和 read-only guard。
- AppShell integration tests 覆盖从素材暂存区选择/旋转后，画布放置使用正确 `assetId` 和 `rotationDegrees`。
- Tests 明确断言暂存区拖入、删除、展开/收起会写入本地 UI 存储，但不写 scene autosave storage、不改变 `SceneDocument` payload、不改变 PSE 导出字符串。
- Tests 覆盖刷新/重新挂载后从本地存储恢复暂存素材顺序和展开/折叠状态，并过滤未知 `assetId`。
- Existing AssetPicker search/filter/pagination tests、pre-placement rotate tests、continuous selection tests 继续通过。
- Mobile tests 明确 `<768px` 不渲染素材暂存区、暂存区展开/收起入口、暂存删除按钮、暂存旋转按钮或素材编辑控件，并且不需要读取/恢复暂存区本地存储。
- Playwright/browser smoke 覆盖 desktop 1280x720 展开状态和 tablet 1000px 左右布局，验证没有重叠且素材区仍可滚动。
```

Rationale: 新增 Epic 18 是最清晰的 backlog 承载方式；它不污染已完成 Epic 17，也为 planning sync、实现和验证拆出可执行 story。

### Sprint Status Change Proposal

Artifact: `_bmad-output/implementation-artifacts/sprint-status.yaml`

Section: Workflow notes / development_status

OLD:

```yaml
# - Epic 17 is active for Pokopia data extraction and consumer migration.
...
  epic_17:
    status: done
```

NEW:

```yaml
# - Epic 18 is active for asset staging area polish.
...
  epic_18:
    status: backlog
    title: 素材暂存区与快速候选素材选择
    proposal: /Users/grigri/side-project/pokopia/pokopia-scene-editor/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md
    stories:
      18-1-course-correction-sync-and-asset-staging-contract:
        status: backlog
        title: Course Correction 同步与素材暂存区契约
      18-2-collapsed-asset-staging-drag-drop-and-delete:
        status: backlog
        title: 折叠暂存区、拖入与删除
      18-3-expanded-asset-staging-layout-and-rotation:
        status: backlog
        title: 展开暂存区与素材区 80/20 布局
      18-4-asset-staging-regression-tests-and-browser-smoke:
        status: backlog
        title: 回归测试与浏览器验证
```

Rationale: Tracker 需要显式记录新 Epic 和 stories，后续 `bmad-create-story` / `bmad-dev-story` 才有稳定入口。

## 5. Technical Impact

Expected implementation surface:

- `apps/web/src/components/asset-picker/AssetPicker.tsx`: add staging state, drop target, delete action, expanded/collapsed UI, shared asset row presentation, and local storage wiring.
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`: focused component coverage.
- `apps/web/src/components/app-shell/AppShell.tsx`: likely only passes existing callbacks; no new scene command expected.
- `apps/web/src/components/app-shell/AppShell.test.tsx`: integration coverage for staged selection/rotation, local storage persistence, and no scene autosave write.
- `apps/web/src/styles.css`: staged/expanded asset picker layout, 80/20 grid, scroll bounds, delete button placement, responsive checks.
- `apps/web/src/i18n/index.ts`: labels for staging area, count, delete, expand/collapse, drop target.
- `apps/web/src/io/`: add or extend UI preference storage for asset staging area; storage failures must be best-effort and must not block scene recovery.

Expected non-impact:

- No `packages/scene-core` type/schema/codec/catalog changes.
- No `SceneDocument v2`.
- No scene string / PSE encode-decode changes; staged assets are excluded from exported strings.
- No asset source-of-truth, footprint, stacking, or export summary changes.
- No Cloudflare Pages deploy script changes.
- No mobile preview/import behavior changes except explicit absence tests; mobile does not render or restore the staging area.

## 6. Risks and Mitigations

- Risk: 暂存区被误写入 scene/autosave 或 PSE string，导致用户的临时选择进入分享、恢复数据或导出字符串。
  Mitigation: PRD/Architecture 明确 local UI storage boundary；tests 断言 local storage writes only affect UI preference/dedicated key, and SceneDocument/PSE outputs remain unchanged。
- Risk: 80/20 展开布局压缩素材区域后造成分页、搜索或素材行不可用。
  Mitigation: 用 stable CSS grid/flex constraints、固定 min-height、scroll containers 和 Playwright smoke 验证。
- Risk: 展开暂存区与素材区 row/card 行为漂移。
  Mitigation: 拆分共享 `AssetRow` presentation 和 row action props。
- Risk: 拖拽事件干扰点击选择或双击连续放置。
  Mitigation: component tests 覆盖 click、double-click、dragStart/drop 三条路径；drag data 使用 `assetId` 并允许 fallback from DOM data attribute。
- Risk: 删除按钮语义被误解为删除 scene 中的素材。
  Mitigation: 可访问名称和 tooltip 使用“从暂存区移除”，视觉上仅在暂存卡片内显示。

## 7. Implementation Handoff

Scope classification: Moderate.

Recommended route:

1. Product Owner / Developer: 批准后同步 PRD、Architecture、UX、Epics 和 sprint-status。
2. Developer agent: 创建 Story 18.2-18.4 或按 BMAD story workflow 拆分执行。
3. Code Review agent: 对 local UI storage boundary、scene/PSE exclusion、desktop read-only guard、mobile absence、layout overlap 和 test coverage 做重点审查。

Success criteria:

- 用户能从素材列表拖入暂存区，折叠状态看到最近 3 个和总数。
- 用户能删除暂存素材，且 scene 中已放置素材不受影响。
- 展开后暂存区占 80%，素材区占 20%，所有暂存素材可滚动查看，视觉和旋转行为与素材区一致。
- 暂存区写入本地 UI 存储并可刷新恢复，但不写 `SceneDocument v1`、scene autosave/saved slots、PSE string、export summary 或 `scene-core`。
- Desktop/tablet 布局无重叠，mobile preview/import 不显示暂存区。

## 8. Approval

Approved via option A on 2026-06-04.

Approved decision: continue with planning sync.

Recorded options:

- Continue / Approve: 已同步 PRD、Architecture、UX、Epics 和 sprint-status，并创建 Epic 18 backlog surface。
- Edit: 调整暂存区持久化、去重、展开/收起、折叠点击选择或 story 拆分。
- Stop: 保留 proposal 草稿，不更新 active planning artifacts。
