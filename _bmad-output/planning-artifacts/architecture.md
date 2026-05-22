---
stepsCompleted:
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-directions.html
  - docs/需求文档.md
workflowType: 'architecture'
project_name: 'pokopia-scene-editor'
user_name: 'Grigri'
date: '2026-05-15'
lastStep: 8
status: 'complete'
completedAt: '2026-05-15'
documentCounts:
  productBriefs: 0
  prd: 1
  uxDesign: 2
  research: 0
  projectDocs: 1
  projectContext: 0
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

我已审阅 `pokopia-scene-editor` 的 PRD、PRD 验证报告、UX 设计规格、UX 方向稿和原始需求文档。

当前发现 64 条 Functional Requirements，主要分为：

- Scene & Canvas Model：固定 7x7 实际编辑画布、中心 5x5 主体区、外围 1 圈装饰区、0-based 坐标和区域识别。
- Open Design Workbench Context：顶部 Pokemon/场景名/保存状态、右侧浮动素材栏、中央 7x7 画布、左侧建筑层面板和左下双预览检查器。
- Asset Placement & Editing：素材选择、放置、删除、替换、移动、跨建筑层移动、朝向、染色、备注和同层叠放规则。
- Building Level Management：默认 0/1/2 建筑层，层号递增，数据按 0 层到 n 层组织，UI 按 L2/L1/L0 这类高层到低层顺序展示，支持创建、删除、重命名、复制、隐藏、显示、锁定、解锁和当前编辑层。
- Asset Catalog & Selection：素材列表、缩略图、名称、分类、标签、适用区域、官方 `No.` 素材 ID、Pokemon 喜好、搜索、筛选、技能条件和素材详情。
- Ditto Skill / Instance Visual State：放置前默认技能状态、放置后实例级技能标记、`树叶`/`耕地`/`储水` 技能词表、一字技能标签、可染色状态、非默认旋转标记，以及画布/预览标识。
- Preview：左下 Preview Inspector 同屏展示俯视图和正视图、完整 7x7 展示、主体边界、当前层/全部可见层、网格和技能标记开关。
- Properties, Save & Recovery：上下文/检查器字段、保存/自动保存、重新打开、恢复校验、SceneDocument 序列化和字段级错误提示；显式 JSON 导出/导入 UI 后置。
- Image Export：从 SceneDocument、asset catalog 和 preview/export selectors 派生图片导出摘要、导出预览和图片下载；不修改 scene，不写入 storage。

### Approved Course Correction - 2026-05-19

本 Architecture 已按 `sprint-change-proposal-2026-05-19.md` 更新 MVP 架构边界。任何旧段落中关于建筑层隐藏/锁定、手动保存、dirty/saved/saveError、撤销/重做、素材空状态恢复动作、素材适用区域阻断校验、素材堆叠、实例移动、普通实例备注、素材可旋转差异、预览网格/主体边界/技能标记显示开关，以及 Mobile 下键盘查看操作的架构要求均被本节覆盖。

当前架构约束：

- `SceneDocument` 仍是唯一业务事实来源，但 `workspaceState.saveStatus` 和普通实例备注 `note` 不再是 MVP payload 要求。
- MVP 只保留自动保存和重新打开恢复；不提供手动保存 command/UI，也不展示 dirty/saved/saveError。
- State management 使用 React reducer + typed command dispatcher；不提供 undo/redo history。
- 建筑层模型不包含 hidden/locked 写操作；预览不需要 `selectVisibleLevels`，应使用当前层/全部层的派生 selector。
- Asset catalog 可保留适用区域元数据和筛选，但 placement command 不得用适用区域阻断放置。
- 同一建筑层同一坐标不支持堆叠；使用替换/删除语义。
- 所有素材均支持 `rotationDegrees: 0 | 90 | 180 | 270`，不再维护 canRotate 分支。
- Preview Inspector 固定不显示网格、主体边界和技能标记，也不持久化这类显示选项。
- Mobile View-only Mode 下应用级 keyboard handler 必须 no-op；桌面/平板键盘快捷操作可保留但不是 MVP 强制要求。

### Approved Course Correction - 2026-05-22

本 Architecture 已按 `sprint-change-proposal-2026-05-22.md` 增加图片导出预览和图片导出边界。当前用户可见导出产物是图片，不是 JSON 文件；图片必须包含整体使用素材、每层图形和每层使用素材。

`SceneDocument`、asset catalog 和 preview/export selectors 是图片导出的唯一业务数据源。图片导出不得维护第二套业务状态，不得修改 `SceneDocument`，不得触发 autosave，不得写入 `pokopia.sceneDocument.v1` 或 `pokopia.sceneDocument.autosave.v1`。当前不引入导入、JSON export UI、server route、auth、cloud storage、share URL、账号或在线发布。

另有 30 条 Non-Functional Requirements，核心架构约束包括：

- 编辑反馈必须快速：桌面 1280x720、1000 个素材以内、10 个建筑层以内，常见画布编辑操作需要在 100ms 内完成可见状态更新。
- 预览切换需要在 300ms 内完成首个可见更新；素材搜索筛选 1000 个素材以内需要在 200ms 内返回可见结果。
- 画布、上下文/检查器字段、建筑层列表、预览和序列化结果必须从同一场景数据源派生。
- 保存/序列化/恢复/重新打开必须通过往返恢复测试，恢复后建筑层数量、素材实例数量、染色数量和技能标记数量必须一致。
- 恢复数据或未来导入 JSON 必须作为数据处理，用户自定义名称、备注和技能说明必须按安全文本渲染，不得作为 HTML 或脚本执行。
- 基础可访问性目标是 WCAG 2.2 AA，关键状态不能只依赖颜色表达。
- 1280px 及以上使用完整 Open Design 浮动工作台，768px 以下进入 Mobile View-only Mode，不允许任何场景写操作。

Open Design UI 确认了新的工作台形态。架构上应支持一个桌面优先的单页工作台：顶部左侧 Pokemon/场景名/保存状态，右侧浮动 Asset Picker，中央 7x7 画布，左侧 Building Level Panel，左下 Preview Inspector 同时展示正视图和俯视图。动态 Pokemon 主题只影响外层 shell 和少量强调色，不允许覆盖主体区、外围区、当前层、选中格、技能标记、锁定层、隐藏、警告和错误状态等语义状态色。

关键架构结论：

- MVP 应采用客户端优先架构，先完成本地场景编辑、保存/自动保存、序列化、恢复和图片导出闭环；显式 JSON 导出/导入 UI、账号、云同步、协作、公开方案库、在线发布和分享链接不进入当前 backlog。
- Scene document 必须是编辑数据的单一事实来源。画布、上下文/检查器字段、建筑层列表、预览和保存/恢复校验不得维护互相分叉的业务状态。
- 所有会修改 scene document 的行为都应经过统一 command 层，便于只读模式、校验、自动保存和自动化测试；MVP 不提供撤销/重做。
- `<768px` 的只读边界不能只靠隐藏按钮实现；command 层、canvas pointer handler 和 keyboard handler 都必须检查 `interactionMode`。
- 建筑层、素材实例、染色/朝向/技能状态和保存/恢复 schema 是最重要的领域模型边界，应优先稳定。
- 正视图在 MVP 中应是结构化高度关系预览，不做真实游戏视角和复杂遮挡模拟。
- 素材库在 MVP 中可以使用静态/本地数据源，但数据结构必须支持官方素材 ID、Pokemon 喜好、可染色性、后续批量导入、模板、更多技能类型和更大画布扩展。

项目复杂度判断：低到中等。没有后端、账号、实时协作、监管合规或复杂基础设施，但编辑状态一致性、结构化数据可复现、只读模式权限边界、可访问性和素材列表性能需要明确架构约束。

## Starter Template Evaluation

### Primary Technology Domain

本项目的主要技术域是客户端优先 Web application。MVP 是桌面优先的单页编辑工作台，不需要账号系统、后端 API、服务端渲染、支付、实时协作或公开内容页。

### Current Version Check

2026-05-15 已核对当前 starter 与运行时要求：

- Vite 官方文档当前为 v8.x，支持 `react-ts` 模板，并要求 Node.js 20.19+ 或 22.12+。
- Vite 8 使用 Rolldown 作为统一 bundler，并随 Vite 8 发布 `@vitejs/plugin-react` v6。
- React 官方文档当前 latest major 为 19.2。
- 本地环境为 Node v24.14.0、npm 11.12.1，满足 Vite 与 Playwright 的 Node 要求。

### Starter Options Considered

**Vite + React + TypeScript (`react-ts`)**

适合作为默认方案。它提供快速开发服务器、生产构建、React 组件模型和 TypeScript 类型检查，同时保持客户端 SPA 架构简单。适合实现 Open Design 浮动工作台、画布组件、建筑层列表、选中检查器、双预览检查器、command 层和只读模式权限边界。

**Vite + Vanilla TypeScript (`vanilla-ts`)**

依赖最少，但本项目有大量状态化 UI、键盘交互、组件组合和测试边界。用 Vanilla TS 手写组件生命周期与状态同步会把复杂度推到本地代码中，不利于后续 AI agents 保持一致实现。

**Next.js**

适合 full-stack、SSR、公开页面、服务端数据读取或分享链接场景。MVP 明确不包含账号、云同步、分享页、公开方案库或 SEO 核心诉求，因此 Next.js 会引入不必要的服务端和路由复杂度。

**React Router v7 framework**

适合多路由或 full-stack React framework。MVP 核心体验是单页编辑器，不需要通过路由组织核心流程，因此不作为 starter 基础。

**Vue/Svelte Vite templates**

技术上可行，但当前文档没有团队偏好。考虑复杂编辑器、组件生态、测试工具和 AI agent 代码生成一致性，React + TypeScript 是更稳妥的默认选择。

### Selected Starter: Vite + React + TypeScript

**Initialization Command:**

```bash
npm create vite@latest . -- --template react-ts --no-interactive
```

如果目标目录已有文件，实施 story 应先检查当前工作区并只在安全范围内初始化，避免覆盖 `_bmad-output/`、`docs/` 或其他规划产物。

### Architectural Decisions Provided by Starter

**Language & Runtime**

使用 TypeScript 与 React JSX。TypeScript 用于锁定 scene document、asset catalog、building level、tile instance、command payload 和 save/recovery schema 的类型边界。

**UI Framework**

使用 React 构建编辑器组件树。核心组件应围绕 Open Design UI 拆分为 Dynamic Pokemon Theme Shell、Pokemon Scene Controls、Scene Canvas、Asset Picker、Building Level Panel、Selection Inspector、Preview Inspector 和 Recovery Validator。

**Build Tooling**

使用 Vite 8 的开发服务器与生产构建。项目保持静态前端输出，MVP 可部署到任意静态站点托管环境。

**Styling Solution**

starter 默认 CSS 即可作为基础。MVP 应优先使用自有设计 tokens 与 CSS modules 或分层 CSS 文件，不引入重型 UI 组件库。动态宝可梦主题色、纸面面板色、语义状态色、网格尺寸和字体层级需要集中定义。

**Testing Framework**

starter 不默认包含完整测试栈。后续实施应补充：

- Vitest：领域模型、command reducer、schema validation、area calculation、level ordering 和 read-only command guard 的单元测试。
- React Testing Library：组件状态、可访问名称、上下文/检查器字段和素材筛选行为测试。
- Playwright：桌面编辑闭环、390x844 只读边界、浏览器矩阵、save/recovery roundtrip 和安全文本渲染测试。

**Code Organization**

初始化后应采用 feature/domain 分层，而不是把逻辑集中在单个 `App.tsx`：

- `src/domain/scene/`：scene document 类型、area 计算、building level 规则、tile instance 规则。
- `src/domain/assets/`：asset catalog 类型、搜索筛选、适用区域展示/筛选元数据和默认技能规则。
- `src/state/`：scene state、command dispatch、autosave state、interactionMode。
- `src/components/`：Scene Canvas、Asset Picker、Building Level Panel、Selection Inspector、Preview Inspector、Pokemon Scene Controls、Recovery Validator。
- `src/io/`：scene storage、scene serialization、schema validation、safe text handling。
- `src/theme/`：动态宝可梦主题 tokens 和语义色 tokens。
- `src/tests/` 或 colocated tests：领域规则、组件行为和 command guard 测试。

**Development Experience**

Vite 提供快速 dev server、HMR、TypeScript/JSX 支持和静态构建。第一条实施 story 应是初始化 Vite React TypeScript 项目，并建立最小质量门禁：typecheck、build、unit test scaffold 和 Playwright scaffold。

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation)**

- MVP 采用客户端优先静态 Web App，不引入数据库、认证、后端 API 或服务端运行时。
- `SceneDocument` 是唯一业务事实来源；画布、上下文/检查器字段、建筑层列表、预览和保存/恢复校验必须从同一个 scene state 派生。
- 所有会修改 `SceneDocument` 的行为必须经过 typed command layer，不能由组件直接改写深层 scene object。
- `<768px` 进入只读模式；只读限制必须在 command layer、canvas pointer handler 和 keyboard handler 三处生效。
- 恢复数据或未来导入 JSON 必须通过 runtime schema validation，失败时不得覆盖当前 scene。

**Important Decisions (Shape Architecture)**

- 领域类型使用 TypeScript 定义，保存/恢复 schema 使用 Zod 4.x。
- MVP 状态管理使用 React `useReducer` + command dispatcher，不默认引入 Redux、Zustand 或 undo/redo history。
- MVP 保存/自动保存使用浏览器本地存储适配层和 SceneDocument 序列化；图片导出预览和图片下载进入当前 backlog，但必须从 SceneDocument v1、asset catalog 和 preview/export selectors 派生；显式 JSON 文件导出/导入 UI 延后到 Post-MVP。
- 测试栈采用 Vitest、React Testing Library 和 Playwright。
- 部署目标是静态站点托管，CI 至少包含 typecheck、unit tests、build 和 Playwright smoke。

**Deferred Decisions (Post-MVP)**

- 显式 JSON 导出/导入 UI、数据库、账号、云同步、分享链接、公开方案库、协作编辑、在线发布和版本历史全部延后到 Post-MVP。
- 图片导出预览和图片文件下载进入当前 backlog，但必须从 SceneDocument v1、asset catalog 和 preview/export selectors 派生，不引入第二套业务状态。
- Zustand 或其他外部状态库延后。只有当 React reducer + context/selectors 在实际实现中出现明确订阅性能或组件边界问题时再引入。
- 复杂正视图遮挡、真实游戏视角模拟和更大画布尺寸延后。
- 多环境后端配置、API rate limiting、server monitoring 和服务端日志延后。

### Current Version Baseline

2026-05-15 通过 npm registry 和官方文档核对的版本基线：

- Vite: 8.0.13
- React: 19.2.6
- TypeScript: 6.0.3
- Vitest: 4.1.6
- Zod: 4.4.3
- Playwright: 1.60.0
- React Testing Library: 16.3.2
- Zustand: 5.0.13，作为已评估但暂缓引入的外部状态库

### Data Architecture

**Decision: MVP uses local in-memory scene state plus SceneDocument save/recovery, not a database.**

`SceneDocument` 是核心数据模型，包含：

- `schemaVersion`
- `sceneId`
- `sceneName`
- `selectedPokemonKey`，使用 Decor Dex 现有 Pokemon key
- `sceneSize`
- `canvasSize`
- `outerPadding`
- `buildingLevels`
- `tileInstances`
- `workspaceState.currentBuildingLevelId`
- `workspaceState.selectedAssetId`
- `workspaceState.selectedCoordinate`
- `rotationDegrees` on tile instances, constrained to `0 | 90 | 180 | 270`
- `dyeColor` on tile instances, explicitly `null` when unset
- metadata such as `createdAt`, `updatedAt` and `lastAutosavedAt`

`SceneDocument` 应表达 PRD 中的固定 MVP 规则：`sceneSize = 5x5`、`canvasSize = 7x7`、`outerPadding = 1`。MVP 只接受当前 SceneDocument v1 的完整字段集合，缺失必需字段必须失败。

**Decision: Area type is derived, then persisted for serialization integrity.**

坐标的权威判断来自 `x/y + sceneSize + outerPadding` 的纯函数：

- `x` / `y` 范围必须在 `0..6`
- `x = 0`、`x = 6`、`y = 0` 或 `y = 6` 时为 `outer`
- 其他格子为 `main`

序列化数据可保留 `areaType` 字段，但恢复时必须重新计算并比对。如果传入 `areaType` 与坐标不一致，恢复校验失败或明确报告字段不一致，不能静默接受。

**Decision: Runtime validation uses Zod 4.x.**

TypeScript 类型只覆盖编译期；恢复数据或未来导入 JSON 是不可信输入，必须通过 Zod schema parse。校验错误需要转换成面向用户的错误结构，至少包含：

- `fieldPath`
- `expected`
- `actual`
- `reason`
- `recoveryAction`

恢复失败不得覆盖当前 scene，不得创建 partial scene，不得修改 dirty state。

**Decision: SceneDocument v1 is a strict current schema, not a compatibility layer.**

MVP schema 固定为 `1`。恢复流程应先读取 `schemaVersion`：

- `schemaVersion === 1`：按当前 schema 校验。
- 缺失或未知版本：显示明确错误。
- 当前 MVP 不接受旧字段名、缺省字段或隐式迁移。后续如果产品决定引入新的 schema，应先更新 PRD、Architecture、Epics 和测试，再定义新的当前 schema。

### Authentication & Security

**Decision: MVP has no authentication or authorization.**

产品范围不包含账号、权限、云同步、协作编辑、公开方案库或分享链接。因此 MVP 不引入 auth provider、session、JWT、OAuth、RBAC 或用户表。

**Decision: Recovered or imported content is data only.**

恢复数据或未来导入 JSON 中的素材名称、场景名称、备注和技能说明必须作为纯文本保存和展示。实现中禁止把这些字段传入 `dangerouslySetInnerHTML` 或任何 HTML parser。包含 `<script>`、事件处理属性、`<img onerror>` 等字符串时，UI 只能把它们作为普通文本显示。

**Decision: Destructive commands require explicit confirmation at command boundary.**

删除非空建筑层、恢复替换当前 scene、批量清空等破坏性操作必须提供确认流程。确认内容至少包含受影响对象名称、素材实例数量和操作后果。

### API & Communication Patterns

**Decision: MVP has no backend API.**

核心数据流全部发生在浏览器内：

- scene create/edit：内存 state
- autosave：serialize `SceneDocument` through local scene storage; image export reads the same scene truth but does not reuse JSON as the user-facing artifact
- reopen/recover：read autosaved SceneDocument data, parse, validate, then replace state only after success
- local UI preferences：persist asset search/filter/favorite-only to a separate localStorage namespace, outside `SceneDocument`
- asset catalog：MVP 使用 repo-local static data 或 bundled JSON/TS data

**Decision: Internal operations use typed Result objects.**

保存、恢复、command execution、validation 和 destructive confirmation should return typed results rather than throwing for expected user errors:

- `ok: true, value`
- `ok: false, errors`

异常只用于不可恢复的 programmer error 或 unexpected runtime failure。用户可修复的问题必须进入错误结构并展示到 UI。

### Frontend Architecture

**Decision: React component tree reads from a single scene state.**

核心 UI 组件不拥有业务事实副本：

- Scene Canvas reads scene + current view state
- Asset Picker reads asset catalog + selected asset state
- Building Level Panel reads building levels + current level
- Selection Inspector reads selected instance derived from scene
- Preview Inspector derives front/top previews from scene and layer range
- Pokemon Scene Controls read selected Pokemon and scene name
- Recovery Validator reads schema validation result
- Image Export Preview reads export summary/render data derived from SceneDocument and asset catalog

组件可以拥有 local UI state，例如 hover cell、focused control、panel open state、search input text、filter controls、favorite-only、zoom/pan 或 modal open state；这些 UI 偏好可以保存到 localStorage，但不能复制 `SceneDocument` 的业务字段作为独立 truth，也不能进入自动保存 payload 或图片导出业务摘要。

**Decision: State management uses React reducer and typed command layer.**

MVP 使用：

- `SceneState`
- `SceneCommand`
- `executeSceneCommand(state, command, context): CommandResult`
- reducer wrapper without undo/redo history

每个 command 负责一个业务意图，例如：

- `PLACE_TILE`
- `DELETE_TILE`
- `UPDATE_TILE_SKILL`
- `UPDATE_TILE_ROTATION`
- `UPDATE_TILE_DYE`
- `CREATE_LEVEL`
- `DELETE_LEVEL`
- `RENAME_LEVEL`
- `RECOVER_SCENE`

command layer 必须统一检查：

- `interactionMode`
- coordinate bounds
- destructive confirmation
- autosave triggering

**Decision: Routing is not part of MVP architecture.**

MVP 是单页工作台，不引入 React Router。未来如果加入方案库、模板、公开分享页或文档页，再引入 routing。

**Decision: Mobile read-only mode is architecture-level, not CSS-only.**

统一定义：

```ts
type InteractionMode = "edit" | "readOnly";
```

`<768px` 时进入 `readOnly`。只读模式允许通过指针改变查看状态，例如选中格子、当前查看建筑层、预览模式、缩放和平移；应用级键盘操作必须 no-op。只读模式禁止改变 scene document、实例列表、建筑层、染色、技能标记或 autosave state。

### Infrastructure & Deployment

**Decision: MVP deploys as static assets.**

Vite production build 输出静态文件。部署可以使用任意静态站点托管，不需要 Node server、database server 或 serverless functions。

**Decision: Environment configuration remains minimal.**

MVP 不需要运行时后端 URL、API key 或 secret。若需要配置 public base path、asset base path 或 feature flag，必须使用 Vite public env convention，并且不能包含 secret。

**Decision: CI quality gate is implementation-critical.**

最小 CI / release gate：

- `npm run typecheck`
- `npm run test` or `npm run test:unit`
- `npm run build`
- Playwright smoke for desktop edit flow and mobile read-only flow

Playwright 必须覆盖：

- 1280x720 或以上桌面编辑闭环
- 390x844 mobile read-only guard
- save/recovery roundtrip
- dangerous text rendered as text
- no control overlap in key responsive viewports

### Decision Impact Analysis

**Implementation Sequence**

1. Initialize Vite React TypeScript starter and scripts.
2. Define domain types and Zod schema for `SceneDocument`, `BuildingLevel`, `TileInstance`, `AssetDefinition` and recovery errors.
3. Implement pure domain functions: area calculation, level ordering, selected instance lookup and serialization.
4. Implement command layer with `interactionMode`, autosave boundaries and recovery validation.
5. Build Scene Canvas, Asset Picker, Building Level Panel and Selection Inspector against the command layer.
6. Add Preview Inspector with top-view and basic front-view derived from level order.
7. Add Recovery Validator, scene storage/serializer and safe text rendering.
8. Add responsive read-only mode and Playwright coverage.

**Cross-Component Dependencies**

- Scene Canvas and Preview depend on the same scene selectors; they must not duplicate render ordering rules.
- Selection Inspector and command layer must share field validation rules; inspector validation cannot differ from recovery validation.
- Asset Picker and placement commands must share skill default handling; area compatibility is display/filter metadata, not a placement blocker.
- Building Level Panel and command layer must share deletion, copy, rename and current-level rules.
- Mobile UI and canvas handlers depend on the same `interactionMode` guard; mobile application keyboard handlers must no-op.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

本项目最容易出现 AI agent 实现分叉的地方包括：命名、文件组织、scene state 写入路径、command payload、恢复错误格式、selector 派生规则、mobile 只读边界、测试位置和用户文本安全渲染。

这些规则的目标不是限制具体实现细节，而是确保不同 agents 在不同 story 中写出的代码可以直接组合。

### Naming Patterns

**Database Naming Conventions**

MVP 没有数据库，因此不定义表名、列名、外键或索引命名规则。任何 story 不得为 MVP 擅自引入数据库结构。

**API Naming Conventions**

MVP 没有后端 API，因此不定义 REST endpoint、GraphQL schema 或 server route。浏览器内保存/恢复函数使用 `camelCase` 命名，例如：

- `serializeSceneDocument`
- `parseSceneDocument`
- `validateSceneDocument`
- `saveSceneDraft`
- `recoverSceneDraft`

后续若引入 API，必须先更新 architecture，而不是在 implementation story 中临时发明接口。

**Code Naming Conventions**

- 文件和目录使用 `kebab-case`：`scene-canvas.tsx`、`building-level-panel.tsx`、`recovery-validator.ts`。
- React 组件使用 `PascalCase`：`SceneCanvas`、`AssetPicker`、`BuildingLevelPanel`。
- TypeScript 类型、interface 和 schema-derived 类型使用 `PascalCase`：`SceneDocument`、`TileInstance`、`RecoveryError`。
- 函数、变量、selector 和 hook 使用 `camelCase`：`calculateAreaType`、`selectVisibleLevels`、`useInteractionMode`。
- command type 使用全大写 snake case：`PLACE_TILE`、`DELETE_LEVEL`、`RECOVER_SCENE`。
- JSON 字段使用 `camelCase`，与 PRD 示例保持一致：`sceneId`、`sceneSize`、`buildingLevels`、`requiresSkill`。
- 枚举值和 union literal 使用 lower camel 或 lower words：`main`、`outer`、`front`、`right`、`readOnly`。

### Structure Patterns

**Project Organization**

实现应按职责分层，不按页面临时堆叠：

- `src/domain/scene/`：scene document 类型、area 计算、level ordering、tile instance 规则。
- `src/domain/assets/`：asset catalog 类型、搜索筛选、适用区域展示/筛选元数据和默认技能规则。
- `src/state/`：scene reducer、command dispatcher、autosave state、interaction mode。
- `src/components/`：React UI 组件。
- `src/io/`：JSON parse、Zod schema、scene storage、serialization/recovery、safe text handling。
- `src/theme/`：动态宝可梦主题 tokens、语义色 tokens 和 theme helpers。
- `src/test/`：测试工具、fixtures、render helpers。
- `e2e/`：Playwright specs。

**File Structure Patterns**

- 领域纯函数优先 colocate tests：`area.ts` 与 `area.test.ts`。
- React 组件优先 colocate component tests：`scene-canvas.tsx` 与 `scene-canvas.test.tsx`。
- Playwright 测试统一放在 `e2e/*.spec.ts`。
- fixtures 放 `src/test/fixtures/`，不要散落在组件目录。
- public/static assets 后续统一放 `public/` 或 `src/assets/`，具体选择由实施 story 根据 Vite handling 决定，但同类资源不得混放。
- Markdown planning artifacts 保持在 `_bmad-output/`，实现 story 不应修改它们，除非 BMAD workflow 要求。

### Format Patterns

**API Response Formats**

MVP 无后端 API。浏览器内部异步/校验操作统一使用 Result 格式：

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; errors: E[] };
```

不要在用户可修复错误中直接 throw。throw 只用于 programmer error 或 unexpected runtime failure。

**Data Exchange Formats**

- JSON 字段使用 `camelCase`。
- 日期使用 ISO 8601 string。
- Boolean 使用 `true` / `false`。
- 技能备注字段必须显式存在；未填写时使用空字符串。普通实例备注 `note` 不属于 MVP payload 必填字段。
- `areaType` 只允许 `main | outer`。
- `rotationDegrees` 只允许 `0 | 90 | 180 | 270`；默认 0 度必须显式保存为 `0`，但 UI 不显示额外旋转标记。
- `dyeColor` 未设置时必须显式使用 `null`；支持染色且已选择颜色的实例必须保留可恢复颜色值。
- `skillType` 在未设置时使用 `null`，已设置时只允许 `树叶`、`耕地`、`储水`；`skillNote` 使用空字符串。
- `selectedAssetId`、`selectedCoordinate`、`dyeColor`、`skillType` 这类可空字段必须以显式 `null` 表达空状态，不允许缺失字段。
- `schemaVersion` 必须存在，MVP 使用 `1`。

Recovery error 统一结构：

```ts
type RecoveryError = {
  fieldPath: string;
  expected: string;
  actual: string;
  reason: string;
  recoveryAction: string;
};
```

### Communication Patterns

**Event System Patterns**

MVP 不引入全局 event bus。组件通信走 React props/context + command dispatcher。

如果需要 UI-only event handler，命名使用 `handleX` 或 `onX`：

- `handleCellClick`
- `handleAssetSelect`
- `onCommandResult`

业务事件不得绕过 command layer。

**State Management Patterns**

- `SceneDocument` 写操作只能通过 command。
- UI-only state 可以留在组件内，例如 hover cell、search query、panel open state、zoom/pan。
- 业务派生数据必须通过 selector 统一计算，例如 `selectVisibleLevels`、`selectTileAtCell`、`selectPreviewTiles`。
- selector 必须是 pure function，不读取 DOM，不触发 side effect。
- reducer 必须 immutable update，不能原地 mutate 输入 state。
- MVP 不维护 undo/redo history；hover、selection、zoom 和 preview mode 不进入 scene payload。

### Process Patterns

**Error Handling Patterns**

- 恢复失败：展示错误摘要和字段级列表，不覆盖当前 scene，不改变 dirty state。
- command 被拒绝：返回 typed command error，例如 `READ_ONLY_VIEWPORT`、`OUT_OF_BOUNDS` 或 `DESTRUCTIVE_CONFIRMATION_REQUIRED`。
- 用户可修复错误展示 recovery action。
- programmer error 可以 throw，并由 React error boundary 或测试暴露。
- 错误 UI 不得只靠红色，必须同时有文本、图标、边框或状态标签。

**Loading State Patterns**

- MVP 大多数操作是本地同步，不应伪造长期 loading。
- 本地读取、JSON parse、恢复校验和 Playwright-facing async flows 可以有 explicit status：
  - `idle`
  - `reading`
  - `validating`
  - `success`
  - `error`
- loading state 命名使用 `status` union，不使用多个散落 boolean，例如避免 `isLoading` + `hasError` + `isDone` 同时存在。

**Responsive and Read-Only Patterns**

- `interactionMode` 是权限边界，不是样式变量。
- `<768px` 必须进入 `readOnly`。
- read-only 允许通过指针 selection、preview mode、current viewed level、zoom/pan 和查看详情。
- read-only 禁止 place、delete、rotate、dye, skill toggle、level mutate、recover replace 和 autosave。
- command layer 和 canvas pointer handler 必须检查只读边界；mobile application keyboard handler 必须 no-op。

**Safe Text Rendering Patterns**

- 恢复数据或未来导入 JSON 的 `sceneName`、`assetName`、`skillNote` 等字段只能作为文本渲染。
- 禁止 `dangerouslySetInnerHTML`。
- 禁止把恢复字段传给 HTML parser。
- 测试 fixture 必须覆盖 `<script>`、`<img onerror>` 和普通尖括号文本。

### Enforcement Guidelines

**All AI Agents MUST**

- 不直接 mutate `SceneDocument`；所有业务写操作走 command layer。
- 不在组件中重复 area、level ordering、preview ordering 或 recovery validation 规则；使用 domain helpers / selectors。
- 不引入数据库、后端 API、auth、routing 或外部状态库，除非 architecture 先更新。
- 不把用户文本作为 HTML 渲染。
- 不绕过 mobile read-only command guard。
- 新增 command 时同时新增 domain/unit tests。
- 新增恢复字段时同时更新 TypeScript type、Zod schema、serializer/parser、fixture 和 roundtrip test。

**Pattern Enforcement**

- TypeScript strict typecheck 必须通过。
- Vitest 必须覆盖新增 domain rule 和 command rule。
- React Testing Library 覆盖组件可访问名称和核心交互状态。
- Playwright 覆盖关键 desktop/mobile flows。
- Code review 发现 pattern violation 时，应修复代码而不是只在 story notes 中解释。

### Pattern Examples

**Good Examples**

```ts
const result = executeSceneCommand(state, {
  type: "PLACE_TILE",
  payload: { assetId, x, y, levelIndex },
});
```

```ts
const areaType = calculateAreaType({ x, y }, scene.sceneSize, scene.outerPadding);
```

```tsx
<span>{tile.note}</span>
```

```ts
type RecoveryStatus = "idle" | "reading" | "validating" | "success" | "error";
```

**Anti-Patterns**

```ts
state.scene.buildingLevels[0].tiles.push(tile);
```

```tsx
<div dangerouslySetInnerHTML={{ __html: tile.note }} />
```

```ts
const isOuter = x === 0 || y === 0 || x === 6 || y === 6; // duplicated in component
```

```ts
if (window.innerWidth < 768) return; // UI-only guard without command guard
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
pokopia-scene-editor/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── README.md
├── .gitignore
├── src/
│   ├── main.tsx
│   ├── app.tsx
│   ├── styles/
│   │   ├── base.css
│   │   ├── layout.css
│   │   └── tokens.css
│   ├── domain/
│   │   ├── scene/
│   │   │   ├── types.ts
│   │   │   ├── area.ts
│   │   │   ├── area.test.ts
│   │   │   ├── levels.ts
│   │   │   ├── levels.test.ts
│   │   │   ├── tiles.ts
│   │   │   ├── tiles.test.ts
│   │   │   ├── selectors.ts
│   │   │   └── selectors.test.ts
│   │   └── assets/
│   │       ├── types.ts
│   │       ├── catalog.ts
│   │       ├── catalog.test.ts
│   │       ├── filters.ts
│   │       └── filters.test.ts
│   ├── state/
│   │   ├── scene-state.ts
│   │   ├── scene-commands.ts
│   │   ├── scene-commands.test.ts
│   │   ├── scene-reducer.ts
│   │   ├── scene-reducer.test.ts
│   │   ├── scene-storage-state.ts
│   │   ├── command-errors.ts
│   │   └── interaction-mode.ts
│   ├── io/
│   │   ├── scene-schema.ts
│   │   ├── scene-schema.test.ts
│   │   ├── scene-serializer.ts
│   │   ├── scene-serializer.test.ts
│   │   ├── scene-storage.ts
│   │   ├── scene-storage.test.ts
│   │   ├── recover-scene.ts
│   │   ├── recover-scene.test.ts
│   │   └── safe-text.ts
│   ├── theme/
│   │   ├── theme-tokens.ts
│   │   └── pokemon-theme.ts
│   ├── components/
│   │   ├── app-shell/
│   │   │   ├── app-shell.tsx
│   │   │   └── app-shell.test.tsx
│   │   ├── scene-canvas/
│   │   │   ├── scene-canvas.tsx
│   │   │   └── scene-canvas.test.tsx
│   │   ├── asset-picker/
│   │   │   ├── asset-picker.tsx
│   │   │   └── asset-picker.test.tsx
│   │   ├── building-level-panel/
│   │   │   ├── building-level-panel.tsx
│   │   │   └── building-level-panel.test.tsx
│   │   ├── selection-inspector/
│   │   │   ├── selection-inspector.tsx
│   │   │   └── selection-inspector.test.tsx
│   │   ├── preview-inspector/
│   │   │   ├── preview-inspector.tsx
│   │   │   └── preview-inspector.test.tsx
│   │   ├── pokemon-scene-controls/
│   │   │   ├── pokemon-scene-controls.tsx
│   │   │   └── pokemon-scene-controls.test.tsx
│   │   └── recovery-validator/
│   │       ├── recovery-validator.tsx
│   │       └── recovery-validator.test.tsx
│   └── test/
│       ├── fixtures/
│       │   ├── scene-valid.ts
│       │   ├── scene-invalid.ts
│       │   └── unsafe-text.ts
│       └── render.tsx
├── e2e/
│   ├── desktop-edit-flow.spec.ts
│   ├── mobile-readonly.spec.ts
│   ├── save-recovery-roundtrip.spec.ts
│   └── unsafe-text.spec.ts
├── public/
│   └── assets/
├── docs/
│   └── 需求文档.md
└── _bmad-output/
    └── planning-artifacts/
        ├── prd.md
        ├── prd-validation-report.md
        ├── ux-design-specification.md
        ├── ux-design-directions.html
        └── architecture.md
```

### Architectural Boundaries

**API Boundaries**

MVP 没有后端 API。所有 scene create/edit/save/recover/serialize 操作都在浏览器内完成。任何 story 不得新增 server route、server action、database client、auth middleware 或 remote API contract，除非 architecture 先更新。

**Component Boundaries**

React components 负责 UI rendering、local UI state 和 dispatching commands。组件不能直接修改 `SceneDocument`，不能复制业务事实源，也不能重新实现 area、level ordering、preview ordering 或 schema validation。

组件边界：

- `app-shell/`：Open Design 工作台 layout、interaction mode wiring。
- `pokemon-scene-controls/`：顶部 Pokemon 选择和场景 `Name`。
- `scene-canvas/`：7x7 canvas rendering、hover/selection UI、pointer handler 和桌面可选 keyboard handler，但写操作必须 dispatch command；mobile keyboard handler no-op。
- `asset-picker/`：右侧浮动素材搜索、分类/喜好/区域/技能筛选、选中素材和本次放置默认技能状态。
- `building-level-panel/`：左侧建筑层列表、当前层、创建/删除/复制/重命名 command entry；视觉顺序高层到低层，数据顺序仍为 0 层到 n 层。
- `selection-inspector/`：选中实例字段展示和字段 edit command entry。
- `preview-inspector/`：左下正视图/俯视图、当前层/全部层；不提供网格/边界/技能标记显示选项。
- `recovery-validator/`：保存/恢复校验错误摘要和 recovery action。

**Service Boundaries**

MVP 不使用 service/repository/database layer。跨组件业务操作统一集中到 `src/state/scene-commands.ts` 和 `src/domain/*`。如果后续出现重复 async orchestration，再提取 service，但不得在 MVP story 中预先创建空 service 层。

**Data Boundaries**

- `src/domain/*` 定义业务规则和 selector。
- `src/state/*` 是唯一 scene write boundary。
- `src/io/*` 是 JSON serialization、local scene storage、recovery 和 schema validation boundary。
- `src/components/*` 只消费 state、selectors、command dispatcher 和 view options。
- `src/theme/*` 只处理视觉 tokens，不参与 scene business rules。

### Requirements to Structure Mapping

**Feature Mapping**

- FR1-FR7 Scene & Canvas Model：`src/domain/scene/types.ts`、`area.ts`、`selectors.ts`、`components/scene-canvas/`。
- FR8-FR18 Asset Placement & Editing：`src/domain/scene/tiles.ts`、`src/state/scene-commands.ts`、`components/scene-canvas/`、`components/selection-inspector/`；FR13/14/15/17/18 已从 MVP 删除。
- FR19-FR27 Building Level Management：`src/domain/scene/levels.ts`、`src/state/scene-commands.ts`、`components/building-level-panel/`；FR25/26 已从 MVP 删除。
- FR28-FR35 and FR59 Asset Catalog & Selection：`src/domain/assets/types.ts`、`catalog.ts`、`filters.ts`、`components/asset-picker/`。
- FR36-FR40 and FR60-FR62 Ditto Skill / Instance Visual State：`src/state/scene-commands.ts`、`src/domain/scene/tiles.ts`、`components/selection-inspector/`、`components/scene-canvas/`。
- FR41-FR47 and FR63 Preview：`src/domain/scene/selectors.ts`、`components/preview-inspector/`、`components/scene-canvas/`；FR43/47 已从 MVP 删除。
- FR48-FR49 Properties：`components/selection-inspector/`、`src/domain/scene/selectors.ts`、`src/state/scene-commands.ts`。
- FR50-FR55 Save & Recovery：`src/io/scene-schema.ts`、`scene-serializer.ts`、`scene-storage.ts`、`recover-scene.ts`、`components/recovery-validator/`。
- FR56-FR58 Open Design Workbench Context：`components/app-shell/`、`components/pokemon-scene-controls/`、`src/theme/`、`src/state/scene-state.ts`。

**Cross-Cutting Concerns**

- Single source of truth：`src/state/scene-state.ts`、`scene-reducer.ts`、selectors。
- Mobile read-only：`src/state/interaction-mode.ts`、`scene-commands.ts`、canvas handlers、`e2e/mobile-readonly.spec.ts`。
- Safe text rendering：`src/io/safe-text.ts`、React text rendering conventions、`src/test/fixtures/unsafe-text.ts`、`e2e/unsafe-text.spec.ts`。
- Accessibility：component tests for accessible names, Playwright smoke across desktop/mobile.
- Performance：domain selectors kept pure and memoizable; asset filtering in `src/domain/assets/filters.ts`; virtualization/pagination added inside `asset-picker/` only when implementation requires it.

### Integration Points

**Internal Communication**

UI components communicate through props/context and dispatch typed commands. Business mutations flow:

```text
component event -> command dispatcher -> command guard -> domain helper -> reducer -> scene state -> selectors -> UI
```

View-only state such as hover cell, selected panel tab, zoom/pan, asset search/filter/favorite-only, preview mode and current viewed level can live in React state and may be persisted in a separate localStorage UI-preferences namespace, but must not mutate `SceneDocument` and must not appear in autosave/export payloads.

**External Integrations**

MVP has no external service integrations. Browser APIs used:

- localStorage or equivalent local scene storage adapter for MVP autosave and reopen.
- localStorage UI-preferences namespace for asset search/filter/favorite-only; this namespace is explicitly outside SceneDocument.
- File input / drag-and-drop for future explicit import, outside current MVP UI.
- Canvas/SVG/Blob URL/download for current image export, browser-only and outside any backend integration.
- `matchMedia` or resize observation for interaction mode, routed through a shared `interaction-mode` helper.

**Data Flow**

```text
Asset catalog + SceneDocument
        -> selectors
        -> Scene Canvas / Selection Inspector / Level Panel / Preview Inspector

User command
        -> executeSceneCommand
        -> validated state transition
        -> updated SceneDocument
        -> derived UI refresh

Saved SceneDocument data
        -> parseSceneDocument
        -> Zod schema validation
        -> required-field validation and area consistency check
        -> RECOVER_SCENE command
        -> state replacement only after success

Autosave
        -> validate current SceneDocument
        -> serialize
        -> local scene storage

Image export preview
        -> read current SceneDocument
        -> derive overall material summary and per-layer summaries
        -> render export image preview
        -> no SceneDocument mutation and no storage write

Image export download
        -> use same export render data as preview
        -> Canvas/SVG/Blob URL/browser download
        -> no SceneDocument mutation and no storage write

UI preference change
        -> localStorage UI-preferences namespace
        -> no SceneDocument mutation
```

### File Organization Patterns

**Configuration Files**

- `package.json` owns scripts and dependencies.
- `vite.config.ts` owns Vite build/dev configuration.
- `vitest.config.ts` owns unit/component test configuration.
- `playwright.config.ts` owns browser/e2e projects and web server startup.
- `tsconfig*.json` keeps app/node/test TypeScript boundaries.

**Source Organization**

Domain modules must not import React. State modules may import domain and io types, but should avoid importing components. Components can import domain selectors and state dispatcher hooks. IO can import domain types and Zod schemas, but not components.

Allowed dependency direction:

```text
components -> state -> domain
components -> theme
components -> io only for save/recovery UI
state -> domain
state -> io types/results where needed
io -> domain
theme -> no business imports
domain -> no React, no DOM, no components
```

**Test Organization**

- Unit tests colocate with domain/state/io files.
- Component tests colocate with component files.
- Shared fixtures live in `src/test/fixtures/`.
- Playwright tests live in `e2e/`.
- New domain rule, command, schema field or recovery error requires tests in the same story.

**Asset Organization**

MVP sample/static images should live in `public/assets/` when they are directly URL-addressed. If assets are imported by TypeScript and bundled, place them under `src/assets/`. A story must choose one approach for a given asset family and keep it consistent.

### Development Workflow Integration

**Development Server Structure**

Vite serves `index.html` and `src/main.tsx`. Local development starts the SPA with `npm run dev`. The app should not require backend services for MVP.

**Build Process Structure**

`npm run build` produces static assets under `dist/`. Build must not depend on `_bmad-output/` planning files. Planning artifacts are documentation inputs, not runtime dependencies.

**Deployment Structure**

Deployment serves `dist/` as static files. Runtime behavior must not require Node server APIs. If a future static host needs a non-root base path, configure it through Vite public configuration and document the deployment-specific value.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility**

All major decisions work together without conflict. Vite + React + TypeScript supports the chosen single-page editor shape. Zod provides runtime validation for recovered SceneDocument data while TypeScript covers compile-time domain contracts. Vitest, React Testing Library and Playwright align with the selected Vite/React stack. Static deployment fits the explicit MVP boundary of no backend API, no auth, no database and no server runtime.

The deferred decisions are also coherent: explicit JSON import/export UI, database, auth, routing, external state libraries, sharing, collaboration, online publishing and complex front-view rendering are all outside MVP and do not block the current static editor architecture.

**Pattern Consistency**

Implementation patterns support the architecture decisions:

- `camelCase` JSON fields match the PRD data examples.
- command type names are consistent with a typed reducer/command layer.
- Result-style errors align with recovery validation and command rejection.
- safe text rendering rules directly support the security decision that recovered or imported content is data only.
- mobile read-only rules align with `interactionMode` as an architecture boundary rather than CSS-only behavior.

**Structure Alignment**

The project structure supports the required boundaries. Domain modules are isolated from React and DOM concerns. State modules own write paths. IO modules own schema validation, serialization, storage and recovery. Components only render state and dispatch commands. E2E tests cover desktop editing, mobile read-only behavior, save/recovery roundtrip and unsafe text.

### Requirements Coverage Validation ✅

**Feature Coverage**

All PRD feature groups have architectural support:

- Scene & Canvas Model maps to `src/domain/scene/area.ts`, `types.ts`, `selectors.ts` and `components/scene-canvas/`.
- Open Design Workbench Context maps to `components/app-shell/`, `components/pokemon-scene-controls/`, theme tokens and interaction mode state.
- Asset Placement & Editing maps to `src/domain/scene/tiles.ts`, `src/state/scene-commands.ts`, `components/scene-canvas/` and `components/selection-inspector/`.
- Building Level Management maps to `src/domain/scene/levels.ts`, command handling and `components/building-level-panel/`.
- Asset Catalog & Selection maps to `src/domain/assets/` and `components/asset-picker/`.
- Ditto Skill / Instance Visual State maps to tile commands, selection inspector, scene canvas badges, dye controls and preview selectors.
- Preview maps to shared selectors and `components/preview-inspector/`.
- Properties, Save & Recovery maps to selection inspector, IO schema, serializer/storage/recovery modules and validator UI.
- Image Export maps to `src/domain/scene/export-summary.ts`, `src/io/image-export.ts`, `components/export-preview/` and preview/export selectors; it must be derived from SceneDocument and asset catalog.

**Functional Requirements Coverage**

FR1-FR68 are architecturally supported. The architecture gives each functional area an owning module and prevents duplicated business rules through domain helpers/selectors and command-layer write boundaries. FR65-FR68 are covered by browser-only image export preview, export summary derivation and download helpers that do not mutate SceneDocument or storage.

**Non-Functional Requirements Coverage**

NFR coverage is sufficient for implementation:

- Performance: fixed 7x7 canvas, pure selectors, local state, static asset deployment and optional asset-list pagination/virtualization path support the required response targets.
- Reliability and data integrity: single source of truth, Zod schema validation, strict schemaVersion, command layer, SceneDocument-derived image export data and roundtrip Playwright tests support save/recovery consistency.
- Usability and accessibility: component boundaries, semantic state tokens, accessible-name tests and Playwright responsive checks support the UX/NFR requirements.
- Compatibility and responsive behavior: Vite static build plus Playwright desktop/mobile coverage supports the browser and viewport matrix.
- Security and data safety: no backend/auth surface, safe text rendering and JSON-as-data validation address the security NFRs.

### Implementation Readiness Validation ✅

**Decision Completeness**

All implementation-blocking decisions are documented with current version baselines where relevant: Vite, React, TypeScript, Vitest, Zod, Playwright, React Testing Library and the evaluated-but-deferred Zustand option.

**Structure Completeness**

The directory tree defines the expected root config files, source modules, colocated tests, fixtures, Playwright specs, assets, docs and BMAD planning artifacts. Component, domain, state and IO boundaries are concrete enough for multiple AI agents to implement without inventing incompatible file locations.

**Pattern Completeness**

Naming, structure, format, communication, state, error, loading, responsive, read-only and safe-text patterns are defined with examples and anti-patterns. The enforcement guidelines specify what every implementation story must respect.

### Gap Analysis Results

**Critical Gaps**

None.

**Important Gaps**

None blocking. The architecture intentionally defers backend, auth, routing, external state libraries, sharing, collaboration, complex front-view rendering and configurable canvas sizes to Post-MVP.

**Nice-to-Have Gaps**

- CI details for real Edge and Safari coverage can be refined during release planning. Playwright Chromium/Firefox/WebKit and manual browser acceptance are enough for architecture readiness.
- Asset catalog source format can be refined during implementation once real素材 data is available. The architecture already reserves `src/domain/assets/` and `public/assets/` / `src/assets/` boundaries.
- A future incompatible schema can be designed only after PRD, Architecture, Epics and tests are updated together; MVP intentionally supports only the current v1 payload.

### Validation Issues Addressed

No blocking validation issues were found. Minor future refinements were classified as Post-MVP or implementation-phase details and do not require architecture changes before implementation starts.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** high

**Key Strengths**

- Strong single-source-of-truth boundary for scene state.
- Clear command layer that supports undo/redo, validation, dirty state and mobile read-only guard.
- Explicit save/recovery schema and safe text rendering strategy.
- Component boundaries match the selected UX direction.
- Requirements-to-structure mapping is complete for FR1-FR68.
- Testing responsibilities are defined at unit, component and E2E levels.

**Areas for Future Enhancement**

- Revisit schema evolution only when a future product decision requires a new current schema; do not add compatibility behavior in MVP.
- Revisit Zustand or another store only if real implementation profiling shows React reducer/context is insufficient.
- Add routing only when方案库, templates, public share pages or docs pages become product scope.
- Expand deployment and browser coverage details during release planning.

### Implementation Handoff

**AI Agent Guidelines**

- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently across all components.
- Respect project structure and module dependency direction.
- Do not introduce backend, auth, database, routing or external state libraries unless architecture is updated first.
- Route all scene writes through the command layer.
- Use Zod validation for recovered or future imported JSON and preserve safe text rendering.
- Maintain tests with every new domain rule, command, schema field and UI boundary.

**First Implementation Priority**

Initialize the Vite React TypeScript project in the current repo, preserving existing BMAD artifacts:

```bash
npm create vite@latest . -- --template react-ts --no-interactive
```

Then add the initial scripts and scaffolding for typecheck, Vitest and Playwright before implementing the editor features.
