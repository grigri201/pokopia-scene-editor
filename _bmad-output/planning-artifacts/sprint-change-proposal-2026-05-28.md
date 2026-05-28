---
title: "Sprint Change Proposal - 建筑层多条备注"
date: "2026-05-28"
project: "pokopia-scene-editor"
status: "approved"
mode: "Batch"
scope: "Moderate"
recommended_path: "Direct Adjustment with new Epic 10"
trigger_source: "User request: bmad-correct-course layer notes"
approved_by: "Grigri"
approved_at: "2026-05-28T11:21:35+0800"
---

# Sprint Change Proposal - 建筑层多条备注

## 1. Issue Summary

Grigri 提出新的布景复现需求：每个建筑层需要支持多条备注。备注输入框应显示在选中空格提示框下方；导出预览中，每层素材下方区域应显示该层备注，并按建筑层填写和列出。

这是新需求，不是实现过程中发现的 bug。现有规划存在两个相关边界：

- 2026-05-19 course correction 明确移除了普通素材实例备注 `note`。
- 当前保留的 `skillNote` 只描述素材实例或空格技能标记，不适合表达“本层搭建说明、注意事项、顺序说明”。

本次需求应定义为 `BuildingLevel` 级别备注，而不是恢复普通实例备注。备注属于用户自填的场景事实，应随自动保存、恢复、导出摘要和图片导出一起保留；系统文案需要跟随当前 i18n 语言，备注正文原样显示，不自动翻译。

## 2. Checklist Findings

### 1. Trigger and Context

- [N/A] 1.1 Triggering story: 当前 Epic 1-8 均已完成，没有正在执行的触发 story。本次由用户提出新的功能需求。
- [x] 1.2 Core problem: 新需求 emerged from stakeholder。现有模型只保存 `BuildingLevel.id/levelNumber/name`，不能保存逐层备注；导出摘要和导出预览也没有层备注区域。
- [x] 1.3 Evidence: 用户要求“每层增加备注功能，备注可以多条，输入框显示在选中空格提示框下方；会显示在导出预览的素材下方区域，备注按层填写和列出”。当前代码中 `BuildingLevel` 无备注字段，`ImageExportLayerSummary` 无备注字段，`SelectionInspector` 无层备注编辑入口。

### 2. Epic Impact

- [x] 2.1 Current epic: Epic 8 已完成，不应直接修改其完成记录。
- [x] 2.2 Epic-level change: 新增 Epic 10，覆盖层备注的数据模型、编辑 UI、导出预览和跨端一致性。
- [x] 2.3 Remaining epics: 当前无 future epic；无需重排。
- [x] 2.4 Future invalidation: 不废弃既有 epics；需要新增一组 story。
- [x] 2.5 Priority: 建议排在 Epic 8 后，作为 Epic 10 backlog。

### 3. Artifact Impact

- [x] 3.1 PRD: 需要新增 FR87-FR92、NFR41-NFR43，并更新范围、成功标准、保存/导出说明。
- [x] 3.2 Architecture: 需要更新 `SceneDocument` / `BuildingLevel` 类型、Zod schema、command layer、short string codec、export summary、Worker/MCP parity、text-safety 说明。
- [x] 3.3 UX: 需要更新 Selection Inspector、Layer Notes Panel、Export Preview 的行为和布局规则。
- [x] 3.4 Other artifacts: 需要更新 `sprint-status.yaml`，新增 Epic 10 backlog entries；后续实现需要补充 scene-core、web、worker、MCP、i18n 和 image-export tests。

### 4. Path Forward

- [x] Option 1 Direct Adjustment: Viable. 新增 Epic 10，不回滚已完成工作。Effort: Medium. Risk: Medium.
- [x] Option 2 Rollback: Not viable. 回滚 Epic 5 的普通实例备注移除会扩大范围并违背本次“按层备注”需求。
- [x] Option 3 MVP Review: Not needed. MVP 目标仍成立；本功能增强导出说明图的可复现性。
- [x] Recommended path: Direct Adjustment with new Epic 10.

## 3. Recommended Approach

采用新增 Epic 10 的方式处理。核心决策：

1. 层备注是 `BuildingLevel` 级别字段，不是 `TileInstance.note`。
2. 数据结构建议为 `buildingLevels[].notes: BuildingLevelNote[]`，其中 `BuildingLevelNote` 至少包含稳定 `id` 和 `text`，数组顺序即显示顺序。
3. 继续保持 `SceneDocument v1` 为当前 schema，但本次批准一个向后兼容的 additive exception：旧 payload 或旧 PSE1 字符串缺少 `buildingLevels[].notes` 时，parse/decode 应补为空数组；新 serialize/autosave 应显式写出 `notes: []` 或实际备注。
4. PSE1 短字符串应保留用户自填层备注，且必须继续兼容旧 level record。实现可以扩展 level record 的可选备注段；不得把备注当作 UI preference 或导出-only 状态。
5. 导出摘要和导出预览按层包含备注。Web 图片导出、Worker `/api/scene/export-summary`、MCP `summarize_scene_export` 使用同一 `scene-core` summary 语义。
6. 用户备注正文是用户数据：不自动翻译、不当作 HTML 执行、不参与素材/Pokemon display helper。

## 4. Detailed Change Proposals

### PRD Changes

#### PRD Front Matter Course Correction

OLD:

```yaml
  - date: '2026-05-27'
    source: _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-27.md
    status: approved
    summary: Add Epic 8 for real asset footprint metadata, rotated occupancy, height-derived blocking, cross-cell rendering, persistence compatibility, and Worker/MCP/Codex skill rule parity without introducing SceneDocument v2.
```

NEW:

```yaml
  - date: '2026-05-27'
    source: _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-27.md
    status: approved
    summary: Add Epic 8 for real asset footprint metadata, rotated occupancy, height-derived blocking, cross-cell rendering, persistence compatibility, and Worker/MCP/Codex skill rule parity without introducing SceneDocument v2.
  - date: '2026-05-28'
    source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28.md
    status: approved
    summary: Add Epic 10 for per-building-level multi-note editing, persistence, export preview rendering, and Worker/MCP export-summary parity while keeping ordinary tile instance note out of scope.
```

Rationale: 保持 course-correction 历史可追踪。

#### PRD Approved Course Correction Section

ADD after "Approved Course Correction - 2026-05-27":

```md
### Approved Course Correction - 2026-05-28

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28.md` 增加 Epic 10，用于按建筑层维护多条备注，并在图片导出预览和导出摘要中按层列出这些备注。层备注属于 `BuildingLevel` 的用户自填场景事实，不是普通素材实例备注 `note`，也不是 UI preference。

`SceneDocument v1` 继续作为当前 schema。本次变更允许 `buildingLevels[].notes` 作为向后兼容的新增字段：旧保存数据或旧 PSE1 短字符串缺少该字段时恢复为空数组；新的自动保存、序列化、短字符串和 export summary 必须保留备注。备注正文保持用户原文，不随 locale 自动翻译，并且必须作为安全文本渲染。
```

#### Functional Requirements

ADD under "Building Level Management":

```md
- FR87: 用户可以为每个建筑层维护多条备注，备注按建筑层归属保存和列出。
- FR88: 每条层备注至少包含稳定 id 和正文 text；用户可以新增、编辑和删除备注，备注列表顺序必须稳定。
```

ADD under "Properties, Save & Recovery":

```md
- FR89: 选中当前建筑层的空格时，层备注输入和列表必须显示在选中空格提示框下方；备注操作作用于当前建筑层，而不是当前格子或素材实例。
- FR90: 自动保存、恢复、结构化序列化和短字符串 roundtrip 必须保留 `buildingLevels[].notes`；旧 payload 或旧 PSE1 字符串缺少层备注时恢复为空数组。
```

ADD under "Image Export":

```md
- FR91: 图片导出预览和下载图片必须在每个建筑层的素材清单下方显示该层备注；没有备注的层不得产生误导性的空备注内容。
- FR92: Worker export-summary、MCP `summarize_scene_export` 和 Web 图片导出必须使用同一层备注语义，按建筑层 id/name/levelNumber 关联备注。
```

#### Non-Functional Requirements

ADD under "Reliability & Data Integrity":

```md
- NFR41: 层备注必须随 `BuildingLevel` 一起通过 scene-core 类型、Zod schema、serializer/parser、short string codec、default scene、fixtures 和 roundtrip tests 校验；不得作为 React-only state、localStorage UI preference 或 export-only state 保存。
```

ADD under "Usability":

```md
- NFR42: 层备注编辑不得挤压 7x7 画布或改变格子固定尺寸；在桌面布局中输入框位于选中空格提示框下方，在 `<768px` Mobile View-only Mode 中只能查看不能编辑。
```

ADD under "Security & Data Safety":

```md
- NFR43: 层备注正文与场景名称、建筑层名称、技能备注一样必须作为纯文本渲染；包含 HTML-like 文本时，工作台、导出预览、下载图片和 Worker/MCP summary 不得执行或注入 HTML。
```

### Architecture Changes

#### SceneDocument / BuildingLevel Contract

OLD:

```md
`SceneDocument` 是核心数据模型，包含：

- `buildingLevels`
```

NEW:

```md
`SceneDocument` 是核心数据模型，包含：

- `buildingLevels`，其中每个 `BuildingLevel` 包含 `id`、`levelNumber`、`name` 和 `notes: BuildingLevelNote[]`
```

ADD:

````md
`BuildingLevelNote` 表示建筑层级别的用户备注，而不是素材实例备注。建议初始结构：

```ts
interface BuildingLevelNote {
  id: string;
  text: string;
}

interface BuildingLevel {
  id: string;
  levelNumber: number;
  name: string;
  notes: BuildingLevelNote[];
}
```

`notes` 使用数组顺序表达显示顺序。空备注必须过滤或阻止保存；旧 SceneDocument v1 payload 缺少 `notes` 时恢复为空数组，新的 serializer 必须显式输出该字段。
````

#### Command Layer

ADD:

```md
层备注写操作必须走 typed command layer，至少覆盖：

- `addBuildingLevelNote(buildingLevelId, text)`
- `updateBuildingLevelNote(buildingLevelId, noteId, text)`
- `deleteBuildingLevelNote(buildingLevelId, noteId)`

复制建筑层时复制该层备注并为备注生成新的稳定 id；删除建筑层时随层删除其备注，并在删除确认中把备注数量纳入影响说明。
```

#### Short String / Worker / MCP

ADD:

```md
PSE1 短字符串需要兼容旧 level record，同时保留新层备注。旧字符串解码为 `notes: []`；新字符串编码每层备注正文和顺序。备注不得被当作 derived data 省略，因为它是用户自填场景事实。

Worker `/api/scene/export-summary`、MCP `summarize_scene_export` 和 Codex skill 输出应在每个 layer summary 中包含 `notes`，并保持与 Web 图片导出一致。
```

### UX Design Changes

#### Selection Inspector

OLD:

```md
**Anatomy:** 素材 ID、素材名称、anchor 坐标、区域类型、建筑层、朝向、footprint/effective footprint、技能标记、技能类型、技能备注、格子备注、数据状态。
```

NEW:

```md
**Anatomy:** 素材 ID、素材名称、anchor 坐标、区域类型、建筑层、朝向、footprint/effective footprint、技能标记、技能类型、技能备注、当前层备注输入、当前层备注列表、数据状态。
```

ADD:

```md
当用户选中当前建筑层的空格时，Selection Inspector 在选中空格提示框下方显示当前层备注区域。该区域包含一行备注输入和添加按钮，并在下方列出当前层已有备注。备注列表中的编辑、删除操作只作用于当前建筑层。选中素材实例时，不把层备注误显示为素材实例字段。
```

#### Export Preview

ADD:

```md
图片导出预览中，每个 `export-layer` 在逐层素材清单下方显示该层备注区域。备注标题使用系统语言，备注正文保持用户原文。无备注时可以隐藏备注区域，避免导出图片产生空占位；但测试必须覆盖有备注层和无备注层。
```

### Epics Changes

ADD after Epic 8:

```md
## Epic 10: 建筑层备注与导出说明增强

用户可以为每个建筑层维护多条备注，并在图片导出预览中按层显示这些备注。层备注用于记录搭建顺序、摆放注意事项或复现说明；它们属于建筑层级别的场景数据，不恢复普通素材实例备注，不进入 UI preferences。

### Story 10.1: 在 scene-core 增加 BuildingLevel notes 数据契约

**Requirements covered:** FR87, FR88, FR90, NFR41, NFR43.

As a 布景创作者,
I want 每个建筑层可以保存多条备注,
So that 我的搭建说明可以和层级结构一起恢复和导出。

**Acceptance Criteria:**

**Given** 默认 scene 被创建
**When** scene-core 生成 `buildingLevels`
**Then** 每个 `BuildingLevel` 都包含 `notes: []`。

**Given** 用户新增、编辑或删除层备注
**When** command layer 更新 scene
**Then** 只修改目标 `buildingLevels[].notes`
**And** 不创建或恢复 `TileInstance.note`。

**Given** 旧 SceneDocument v1 payload 缺少 `buildingLevels[].notes`
**When** parse/recover 执行
**Then** 恢复为 `notes: []`
**And** 新 serializer 输出显式 `notes` 字段。

**Given** 层备注包含 HTML-like 文本
**When** schema、serializer、export summary 或 UI 展示该备注
**Then** 备注只能作为普通文本处理。

### Story 10.2: 在选中空格提示框下方编辑当前层备注

**Requirements covered:** FR87, FR88, FR89, NFR42, NFR43.

As a 布景创作者,
I want 在选中空格提示框下方填写当前层备注,
So that 我不需要离开画布上下文就能记录这一层的搭建说明。

**Acceptance Criteria:**

**Given** 桌面或平板编辑模式下用户选中当前层空格
**When** Selection Inspector 渲染
**Then** 选中空格提示框下方显示当前层备注输入框、添加动作和备注列表。

**Given** 用户输入非空备注并提交
**When** command layer 接收新增备注
**Then** 当前建筑层新增一条备注
**And** 画布格子尺寸、选中状态和当前素材状态不发生布局跳动。

**Given** 当前层已有多条备注
**When** 用户查看备注列表
**Then** 备注按保存顺序列出，并支持编辑和删除。

**Given** `<768px` Mobile View-only Mode
**When** 用户查看选中格或当前层信息
**Then** 可以查看层备注
**And** 新增、编辑、删除备注操作被禁用或隐藏，不触发 scene mutation。

### Story 10.3: 在导出摘要和图片导出预览中按层显示备注

**Requirements covered:** FR91, FR92, NFR30, NFR35, NFR43.

As a 布景创作者,
I want 导出预览在每层素材下方显示该层备注,
So that 其他人能按层阅读搭建说明。

**Acceptance Criteria:**

**Given** scene 中某个建筑层包含一条或多条备注
**When** build image export summary
**Then** 对应 layer summary 包含该层备注列表
**And** 备注按保存顺序输出。

**Given** 导出预览渲染某个有备注的建筑层
**When** 该层素材清单渲染完成
**Then** 素材清单下方显示该层备注区域。

**Given** 某层没有备注
**When** 导出预览和下载图片渲染该层
**Then** 不显示误导性的空备注内容。

**Given** Worker/MCP 调用 export summary
**When** scene 包含层备注
**Then** Web、Worker 和 MCP 的 layer notes 语义一致。

### Story 10.4: 层备注短字符串、测试和发布门禁

**Requirements covered:** FR90, FR92, NFR35, NFR41, NFR43.

As a 维护者,
I want 层备注在保存、短字符串、Worker/MCP 和导出中有一致测试,
So that 后续不会丢失用户填写的层级说明。

**Acceptance Criteria:**

**Given** scene 包含多层、多条层备注和 HTML-like 文本
**When** scene-core roundtrip、PSE1 encode/decode、web tests、Worker tests 和 MCP smoke 运行
**Then** 层备注数量、顺序和正文保持一致
**And** 不执行 HTML。

**Given** 旧 PSE1 短字符串不包含层备注字段
**When** decode/recover 执行
**Then** 每层恢复 `notes: []`
**And** 不破坏现有素材、技能、footprint 和 selected coordinate 语义。

**Given** release gate 运行
**When** dev agent 完成 Epic 10
**Then** `pnpm run release:verify` 必须通过
**And** 覆盖 scene-core schema、commands、short string codec、SelectionInspector、ExportPreview、Worker export summary、MCP summarize 和 i18n 文案。
```

### Sprint Status Changes

ADD under `development_status` after Epic 8:

```yaml
  epic-10: backlog
  10-1-building-level-notes-data-contract: backlog
  10-2-edit-layer-notes-under-empty-selection: backlog
  10-3-export-summary-and-preview-layer-notes: backlog
  10-4-layer-notes-parity-gates: backlog
  epic-10-retrospective: optional
```

## 5. Implementation Handoff

Scope classification: Moderate.

Recommended handoff:

- Product Owner / Developer: approve and apply PRD, Architecture, UX, Epics and sprint-status updates.
- Developer: implement Epic 10 stories in order.
- Code Review: specifically verify no `TileInstance.note` resurrection, no React-only note state, no unsafe HTML rendering, and no loss in short string roundtrip.

Suggested verification after implementation:

```bash
pnpm --filter @pokopia-scene-editor/scene-core test -- scene-schema scene-string-codec export-summary levels
pnpm --filter @pokopia-scene-editor/web test -- SelectionInspector ExportPreview AppShell
pnpm --filter @pokopia-scene-editor/worker test
pnpm run typecheck
pnpm run release:verify
git diff --check
```

## 6. Approval Gate

Approved by Grigri via `C` on 2026-05-28. Apply the planning artifact updates.
