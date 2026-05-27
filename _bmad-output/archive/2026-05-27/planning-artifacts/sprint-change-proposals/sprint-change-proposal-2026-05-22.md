---
workflowType: correct-course
date: 2026-05-22
project_name: pokopia-scene-editor
user_name: Grigri
mode: Batch
status: Approved
approvedAt: 2026-05-22
approvedBy: Grigri
changeTrigger: image-export-preview-and-export
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - src/components/app-shell/AppShell.tsx
  - src/components/preview-inspector/PreviewInspector.tsx
  - src/io/scene-serializer.ts
  - src/io/scene-schema.ts
---

# Sprint Change Proposal: 图片导出预览与图片导出

## 1. Issue Summary

本次 correct-course 的触发原因是新的范围决策：`pokopia-scene-editor` 需要把“导出预览”和“导出当前布景为图片”正式纳入实施计划。

用户补充确认：

1. 导出功能应导出成图片，而不是 JSON 文件。
2. 导出的图片中应包含：整体使用的素材、每层的图形、每层使用的素材。
3. 当前系统没有导入功能，本次目标也不新增导入。

现有 PRD 和 Architecture 曾明确把“显式 JSON 导出/导入 UI”放在 Post-MVP，同时规定后续显式 JSON 导出必须复用 `SceneDocument v1` payload。根据本次补充，本 proposal 不再把“导出”解释为 JSON 文件导出，而是把它定义为 **由当前 `SceneDocument` 派生的图片报告导出**。`SceneDocument v1` 仍是内部事实来源，但不是用户可下载的导出产物。

当前 tracker 显示 Epic 1-5 均为 `done`，没有 active epic 可以安全吸收该能力。为保留已完成历史，本 proposal 推荐新增 **Epic 6: 图片导出预览与图片导出闭环**，而不是改写 Epic 1-5。

实现侧需要注意一个冲突事实：`src/components/app-shell/AppShell.tsx` 目前已有 `导出` 按钮和直接 JSON 下载实现，测试也覆盖了 JSON 文件下载。该实现与本次新范围不一致，Epic 6 应将它替换为图片导出预览和图片下载，而不是继续强化 JSON export。

## 2. Change Analysis Checklist

| Item | Status | Notes |
| --- | --- | --- |
| 1.1 Triggering story | N/A | 不是某个 active story 暴露的问题；触发来自新的产品范围决策和当前导出语义修正。 |
| 1.2 Core problem | Done | 类型为 new requirement / scope clarification：把 export 定义为 image export，不是 JSON export；导入仍不进入当前范围。 |
| 1.3 Evidence | Done | 用户明确要求导出成图片，并指定图片内容；tracker 显示 Epic 1-5 全部 done；当前代码已有 JSON export 但缺少 image export。 |
| 2.1 Current epic impact | Done | 当前没有 active epic；Epic 3 的预览和 Epic 4 的 SceneDocument 数据契约是技术基础，Epic 6 应在其后新增。 |
| 2.2 Epic-level changes | Done | 新增 Epic 6，覆盖图片导出预览、图片构图、每层图形、素材清单和图片下载。 |
| 2.3 Remaining planned epics | N/A | 没有未完成 planned epic。 |
| 2.4 Future invalidation | Done | 不废弃 Epic 1-5；只新增能力并调整 Post-MVP 边界。当前 JSON export 代码需要替换或降级为非用户可见能力。 |
| 2.5 Order/priority | Done | Epic 6 应排在 Epic 5 之后，作为新的 backlog epic。 |
| 3.1 PRD conflicts | Done | PRD 需要把“显式 JSON 导出/导入 UI”继续保留在 Post-MVP，同时新增“图片导出”进入当前范围。 |
| 3.2 Architecture conflicts | Done | Architecture 需要新增 image render/export boundary，并明确不引入 import、backend、auth、cloud 或 share URL。 |
| 3.3 UX conflicts | Done | UX 需要定义图片导出预览、导出图片内容结构、下载动作和失败反馈。 |
| 3.4 Other artifacts | Done | `epics.md`、`sprint-status.yaml`、story 文件、component tests、Playwright smoke 需要同步；现有 JSON export 测试要改写。 |
| 4.1 Direct adjustment | Viable | 新增 Epic 6 和两到三条 story 即可覆盖；努力中等，风险中等。 |
| 4.2 Rollback | Not viable | 不需要回滚 Epic 1-5；现有 SceneDocument、selectors、preview 派生可作为图片生成基础。 |
| 4.3 PRD MVP review | Viable | 需要做小范围 MVP 扩展：image export 进入当前范围，JSON import/export、share/cloud/account 继续排除。 |
| 4.4 Recommended path | Done | 采用 Hybrid：PRD MVP Review + Direct Adjustment，新增 Epic 6。 |
| 5.1-5.5 Proposal components | Done | 本文给出影响分析、具体修改提案和 handoff。 |
| 6.1-6.4 Final review / approval / tracker update | Approved | Grigri 已用默认 Continue 批准；本次更新 PRD、UX、Architecture、Epics 和 sprint-status。 |

## 3. Impact Analysis

### PRD Impact

PRD 的 `SceneDocument v1` 数据契约不需要改成图片格式。它应继续作为自动保存、恢复、预览和图片导出的内部事实来源。图片导出是一个 **rendered artifact**，不是可重新导入的数据 payload。

需要更新的 PRD 边界：

- `MVP Feature Set` 增加图片导出预览和图片导出。
- `Post-MVP Features` 继续保留显式 JSON 导出/导入 UI；当前 MVP 的“导出”不再指 JSON 文件导出。
- `Out of Scope / Non-Goals` 继续保留显式 JSON 导入、账号、云同步、协作、公开方案库、分享链接。JSON 导出也应保留在 Post-MVP，除非后续另行批准。
- `Functional Requirements` 新增 image-export FR，明确图片中必须包含整体素材清单、每层图形和每层素材清单。
- `NFR` 增加图片导出可读性、尺寸稳定性和性能约束。

不建议纳入的范围：

- 导入：当前系统没有导入功能，本次不新增 JSON 导入、图片导入或从图片恢复场景。
- JSON 文件导出：本次用户明确把导出定义为图片导出；JSON export 不应作为 Epic 6 的用户可见交付。
- 分享链接/云同步/账号：图片文件下载可完全在浏览器端完成，不需要身份、服务端或远程存储。
- 云端发布或公开方案库：图片导出只生成本地文件，不创建在线内容页。

### UX Impact

UX 需要定义一个 **Image Export Preview**，而不是 JSON validator。

推荐交互：

- 顶部工具栏保留 `导出` 入口，但点击后打开图片导出预览，而不是直接下载 JSON。
- 导出预览显示一张将被下载的图片预览，至少包含：
  - 标题区：场景名、当前 Pokemon、生成时间或更新时间。
  - Overall Materials：整张布景使用的素材清单，含素材名称、官方 `No.` 或 asset id、使用数量。
  - Layer Sections：按建筑层逐层展示。
  - 每层图形：该建筑层的 7x7 或规则化图形视图，表达主体区/外围区、坐标关系和该层素材位置。
  - 每层素材清单：该建筑层使用的素材名称、官方 `No.` 或 asset id、数量，必要时包含技能/染色/旋转摘要。
- 预览面板提供 `下载图片` 和 `取消/关闭`。
- 图片可以优先采用 PNG。若实现选择 SVG-to-PNG、HTML-to-canvas 或纯 SVG export，应在 Architecture 中明确依赖和浏览器兼容策略。
- 导出成功后显示轻量状态提示，不写入 `SceneDocument`、不触发 autosave、不写入 saved storage。
- Mobile View-only Mode 不需要新增完整图片导出体验；实现可以隐藏或禁用导出入口。若保留导出入口，也必须是只读导出，不允许 scene mutation 或 storage write。

不需要单独运行 `bmad-create-ux-design`。这是现有 Open Design 工作台中的局部导出工具流补充，不是新的全屏 UI 或布局方向变更。

### Architecture Impact

Architecture 需要新增 image export boundary：

- `SceneDocument` 仍是唯一业务事实来源。
- 图片内容必须从 `SceneDocument`、asset catalog 和现有 preview selectors 派生，不允许维护第二套导出业务状态。
- 可新增模块：
  - `src/domain/scene/export-summary.ts`：生成 overall materials、per-layer material summaries、per-layer render data。
  - `src/io/image-export.ts`：生成图片渲染输入、文件名、PNG/SVG data、download helper。
  - `src/components/export-preview/ExportPreview.tsx`：显示导出预览、下载按钮和错误状态。
- 如果使用 DOM-to-image/html2canvas 等第三方依赖，需先评估 bundle size、字体/图片跨域、SVG/foreignObject 兼容性和 Playwright 可测性。保守方案是先生成 deterministic SVG，再转为 PNG 或直接下载 SVG；但若 PRD 明确要求“图片”且实现选择 SVG，应说明 SVG 是否满足产品语义。
- 图片导出 flow 是 browser-only，可使用 Canvas、SVG、Blob、object URL 和 download link，不引入 backend API、routing、auth、database、cloud storage 或 secret。
- 图片导出不属于 scene command，不得经过会修改 `SceneDocument` 的 command layer，不得触发 autosave，不得写入 `pokopia.sceneDocument.v1` 或 `pokopia.sceneDocument.autosave.v1`。
- 导出预览中的用户文本继续按普通文本渲染；图片生成过程不得执行 HTML 或脚本。

当前代码已有 direct JSON export：

- `AppShell.tsx` 中 `exportCurrentScene()` 用 `stringifySceneDocument(scene, 2)` 生成 JSON 并下载。
- 该实现应在 Epic 6 中替换为图片导出预览和图片下载。
- 现有 JSON export tests 应改为 image export tests，不再断言 `.pokopia-scene.json` 是用户可见导出产物。

### Epics and Story Impact

Epic 1-5 不改写完成状态。

新增 Epic 6：

```md
### Epic 6: 图片导出预览与图片导出闭环

用户可以在当前 Open Design 工作台中预览一张将要导出的布景图片，并下载该图片作为本地文件。导出图片必须包含整体使用的素材、每层的图形和每层使用的素材；导出不引入导入、JSON 文件导出、分享链接、云同步、账号或在线发布，也不改变 scene state、autosave 或 UI preferences。

**FRs covered:** FR65, FR66, FR67, FR68, NFR29, NFR30.

**Implementation notes:** 该 epic 承接 Epic 3 的 preview selectors、Epic 4 的 `SceneDocument v1` 数据契约和 Epic 5 的简化 MVP 边界。图片导出必须从同一 `SceneDocument` 和 asset catalog 派生整体素材清单、逐层图形和逐层素材清单。该 epic 不新增 import parser、JSON export UI、server route、auth、cloud storage、share URL 或 image upload。
```

建议 story：

```md
### Story 6.1: 图片导出摘要模型与逐层导出数据

As a 布景创作者,
I want 系统能从当前 SceneDocument 生成图片导出所需的整体素材和逐层摘要,
So that 导出的图片能准确表达整个布景和每一层的素材使用。

Acceptance Criteria:

1. Given 当前 scene 包含多个建筑层和素材实例, when 系统生成 export summary, then 输出整体素材清单，包含素材名称、官方 No. 或 asset id、总使用数量。
2. Given 当前 scene 包含多个建筑层, when 系统生成 layer export summaries, then 每个建筑层都有独立图形数据和该层素材清单。
3. Given 素材实例包含技能、染色或非默认旋转, when 生成每层素材清单, then 清单至少保留能帮助用户复现的技能、染色和旋转摘要。
4. Given 用户修改 scene 后再次打开导出预览, then export summary 必须反映最新 SceneDocument，不使用过期缓存。
5. Given export summary 生成, then 不修改 SceneDocument、autosave storage、saved storage 或 UI preferences。
```

```md
### Story 6.2: 图片导出预览 UI

As a 布景创作者,
I want 在下载前预览即将导出的图片,
So that 我能确认图片中包含整体素材、每层图形和每层素材清单。

Acceptance Criteria:

1. Given 桌面或平板编辑模式下存在有效 scene, when 用户点击 `导出`, then 系统打开图片导出预览面板或 modal。
2. Given 导出预览已打开, then 预览中显示标题区、整体使用素材清单、逐层图形和逐层素材清单。
3. Given 某一层没有素材, then 图片预览仍展示该层，并明确显示空层状态。
4. Given sceneName、assetName 或 skillNote 包含 HTML-like 文本, when 导出预览渲染, then UI 只能按普通文本显示，不执行 HTML 或脚本。
5. Given 导出预览打开或关闭, when 用户不执行下载, then SceneDocument、autosave storage、saved storage 和 UI preferences 均不得改变。
```

```md
### Story 6.3: 图片文件生成、下载与回归测试

As a 布景创作者,
I want 将预览确认过的布景导出图片下载到本机,
So that 我可以分享或保存一个无需导入功能也能阅读的布景说明图。

Acceptance Criteria:

1. Given 导出预览有效, when 用户点击 `下载图片`, then 浏览器下载 `<sanitized-scene-name>.pokopia-scene.png` 或规划批准的图片格式。
2. Given 用户执行图片下载, then 下载内容必须与预览中的图片语义一致，包含整体使用素材、每层图形和每层使用素材。
3. Given 用户执行图片下载, then 系统显示轻量成功反馈，并且不写入 `pokopia.sceneDocument.v1`、不写入 `pokopia.sceneDocument.autosave.v1`、不改变 SceneDocument。
4. Given `<768px` Mobile View-only Mode, when 导出入口被隐藏、禁用或只读渲染, then 不允许任何 scene mutation 或 storage write。
5. Given release gate 运行, then `npm run typecheck`、unit tests、`npm run build` 和 Playwright smoke 必须通过，并覆盖导出预览、图片下载触发、逐层内容存在和 storage 不变性。
```

### Sprint Status Impact

审批后建议追加：

```yaml
development_status:
  epic-6: backlog
  6-1-image-export-summary-and-layer-data: backlog
  6-2-image-export-preview-ui: backlog
  6-3-image-file-generation-download-and-regression-tests: backlog
  epic-6-retrospective: optional
```

不建议把 Epic 4 或 Epic 5 重新打开；Epic 6 是新的 backlog epic。

## 4. Recommended Approach

推荐采用 **Hybrid: PRD MVP Review + Direct Adjustment**。

理由：

- 该变更是小范围 MVP 扩展和导出语义修正，不是技术不可行导致的回滚。
- `SceneDocument v1`、asset catalog、preview selectors 和 current layer/all layers 派生逻辑已经存在，适合作为图片导出的内部数据源。
- 直接修改 Epic 1-5 会破坏完成历史；新增 Epic 6 更清楚地表达“这是新的图片导出能力”。
- 图片导出不需要导入、账号、云同步、分享链接或在线发布，因此不应扩大到更高复杂度的产品线。

Change scope classification: **Moderate**。需要 Product Owner / Developer coordination：先批准规划变更，再更新 PRD/UX/Architecture/Epics/tracker，之后从 Epic 6 Story 6.1 开始创建 story 和实现。

## 5. Detailed Change Proposals

### 5.1 PRD Proposed Edits

**MVP Feature Set**

OLD:

```md
- SceneDocument v1 结构化序列化和恢复校验，用于保存、自动保存、恢复和后续显式导出能力；自动保存 payload 与显式导出 payload 必须完全相同。
```

NEW:

```md
- SceneDocument v1 结构化序列化和恢复校验，用于保存、自动保存、恢复、roundtrip 校验和图片导出数据派生；图片导出必须从同一 SceneDocument v1 和 asset catalog 派生，不维护第二套导出业务状态。
- 用户可以在导出前预览一张布景说明图片，并将该图片下载到本机；图片必须包含整体使用的素材、每层的图形和每层使用的素材。
```

**Post-MVP Features**

OLD:

```md
- 显式 JSON 导出/导入 UI。
```

NEW:

```md
- 显式 JSON 导出/导入 UI。
- 分享链接、云同步、账号、公开方案库和在线发布。
```

**Out of Scope / Non-Goals**

OLD:

```md
MVP 不包含账号系统、云端同步、协作编辑、公开方案库、分享链接、自动生成布景、素材批量导入、显式 JSON 导出/导入 UI、复杂遮挡关系计算...
```

NEW:

```md
MVP 不包含账号系统、云端同步、协作编辑、公开方案库、分享链接、自动生成布景、素材批量导入、显式 JSON 导出/导入 UI、从导出图片或 JSON 导入恢复布景、复杂遮挡关系计算...
```

**New Functional Requirements**

```md
- FR65: 用户可以从 Open Design 工作台打开图片导出预览，查看即将导出的布景说明图片。
- FR66: 导出图片必须包含整体使用的素材清单，至少包含素材名称、官方 No. 或 asset id、总使用数量。
- FR67: 导出图片必须按建筑层展示每层图形，并表达该层 7x7 布局、主体区/外围区关系和素材位置。
- FR68: 导出图片必须按建筑层展示每层使用的素材清单；导出预览和下载不得写入 SceneDocument、autosave storage、saved storage 或 UI preferences。
```

**New / Updated NFRs**

```md
- NFR29: 图片导出预览和图片生成在 7x7 画布、10 个建筑层、每层 49 个素材实例以内的测试场景中，应在用户感知上可接受；若生成超过 1 秒，应显示非阻塞进度或生成状态。
- NFR30: 导出图片中的标题、整体素材清单、每层图形和每层素材清单必须在默认导出尺寸下可读；下载按钮、关闭操作和失败提示必须有可访问名称。
```

### 5.2 UX Proposed Edits

**Core User Experience**

OLD:

```md
第一次可信导出：用户导出 JSON 并重新打开后，画布、建筑层、素材 ID、坐标、主体/外围区分、技能标记和预览结果完整还原...
```

NEW:

```md
第一次可信图片导出：用户打开导出预览，看到一张包含整体素材清单、每层图形和每层素材清单的布景说明图片，随后下载图片到本机。导入和从文件恢复场景仍是 Post-MVP；当前 MVP 只承诺导出可阅读的本地图片。
```

**Import Export Validator**

OLD:

```md
Purpose: 支撑保存、导出、导入和重新打开的可信闭环。
Usage: 顶部工具栏触发，结果显示在右侧面板或弹窗。
Anatomy: 校验状态、字段路径、失败原因、期望值、实际值、修复方向、重试/取消操作。
States: 有效、未保存、导出成功、导入失败、字段缺失、类型错误、坐标越界。
```

NEW:

```md
Purpose: 在当前 MVP 中支撑图片导出预览和图片下载；导入校验仍为 Post-MVP。
Usage: 顶部工具栏 `导出` 触发，结果显示在轻量 modal 或工作台内导出预览面板。
Anatomy: 图片标题区、整体素材清单、逐层图形、逐层素材清单、下载图片、关闭、生成失败提示。
States: 预览生成中、预览有效、预览失败、下载成功、下载失败、空层。
```

**Modal and Overlay Patterns**

Add:

```md
图片导出预览可以使用 modal 或轻量 overlay，因为它是一次性确认和下载流程。该 overlay 不得遮挡或修改 underlying scene state；关闭后用户回到原工作台上下文。普通编辑、预览切换和属性修改仍不使用弹窗。
```

### 5.3 Architecture Proposed Edits

**Deferred Decisions**

OLD:

```md
- 显式 JSON 导出/导入 UI、数据库、账号、云同步、分享链接、公开方案库、协作编辑和版本历史全部延后到 Post-MVP。
```

NEW:

```md
- 显式 JSON 导出/导入 UI、数据库、账号、云同步、分享链接、公开方案库、协作编辑、在线发布和版本历史全部延后到 Post-MVP。
- 图片导出预览和图片文件下载进入当前 backlog，但必须从 SceneDocument v1、asset catalog 和 preview/export selectors 派生，不引入第二套业务状态。
```

**External Integrations**

OLD:

```md
- Blob URL / download for future explicit export, outside current MVP UI.
```

NEW:

```md
- Canvas/SVG/Blob URL/download for current image export, browser-only and outside any backend integration.
```

**Data Flow**

OLD:

```text
Future explicit export
        -> validate current SceneDocument
        -> same serialize function
        -> same JSON-compatible payload as autosave
```

NEW:

```text
Image export preview
        -> read current SceneDocument
        -> derive overall material summary and per-layer summaries
        -> render export image preview
        -> no SceneDocument mutation and no storage write

Image export download
        -> use same export render data as preview
        -> Canvas/SVG/Blob URL/browser download
        -> no SceneDocument mutation and no storage write
```

### 5.4 Epics Proposed Edits

Add Epic 6 to `epics.md` after Epic 5. Do not rewrite Epic 1-5 completion history.

Add `FR65-FR68` and `NFR29-NFR30` to the requirements inventory and coverage map.

Add three new story sections:

- `6.1-image-export-summary-and-layer-data`
- `6.2-image-export-preview-ui`
- `6.3-image-file-generation-download-and-regression-tests`

### 5.5 sprint-status Proposed Edits

Append Epic 6 entries to `_bmad-output/implementation-artifacts/sprint-status.yaml` after `epic-5-retrospective`.

```yaml
  epic-6: backlog
  6-1-image-export-summary-and-layer-data: backlog
  6-2-image-export-preview-ui: backlog
  6-3-image-file-generation-download-and-regression-tests: backlog
  epic-6-retrospective: optional
```

## 6. Implementation Handoff

Scope classification: **Moderate**.

Recommended handoff:

- Product Owner / planning pass: after approval, update PRD, UX specification, Architecture, Epics and sprint-status together.
- Developer pass: start with `bmad-create-story` for Story 6.1, then execute `bmad-dev-story` and `bmad-code-review`.
- Review focus: ensure image export data is derived from current SceneDocument and asset catalog; ensure the image includes overall materials, per-layer graphics and per-layer materials; ensure export does not write storage or mutate scene; ensure current JSON export UI is replaced or removed from the user-facing flow.

Success criteria:

- Planning artifacts consistently say image export is in scope and JSON export/import, share links, cloud sync, accounts and online publishing are out of scope.
- Epic 6 appears as backlog after completed Epic 5.
- Export preview shows the exact image structure that will be downloaded.
- Downloaded image contains overall used materials, every layer's graphic and every layer's used materials.
- `npm run typecheck`, unit tests, `npm run build`, and Playwright smoke pass after implementation.

## 7. Approval Gate

Approved on 2026-05-22 by Grigri via default Continue.

Artifact updates proceed for PRD, UX, Architecture, Epics and sprint-status.
