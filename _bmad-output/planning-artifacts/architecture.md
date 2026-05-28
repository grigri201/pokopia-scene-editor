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
  - _bmad-output/archive/2026-05-27/planning-artifacts/supporting-documents/prd-validation-report.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/archive/2026-05-27/planning-artifacts/supporting-documents/ux-design-directions.html
  - _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-25.md
  - _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-27.md
  - _bmad-output/archive/2026-05-27/planning-artifacts/supporting-documents/research/technical-pokopia-scene-editor-cloudflare-worker-mcp-server-codex-skill-research-2026-05-25.md
  - docs/需求文档.md
workflowType: 'architecture'
project_name: 'pokopia-scene-editor'
user_name: 'Grigri'
date: '2026-05-15'
lastStep: 8
status: 'complete'
completedAt: '2026-05-26'
documentCounts:
  productBriefs: 0
  prd: 1
  uxDesign: 2
  research: 1
  projectDocs: 1
  projectContext: 0
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

我已审阅 `pokopia-scene-editor` 的 PRD、PRD 验证报告、UX 设计规格、UX 方向稿和原始需求文档。

当前架构基线覆盖 100 条 Functional Requirements，主要分为：

- Scene & Canvas Model：固定 7x7 实际编辑画布、中心 5x5 主体区、外围 1 圈装饰区、0-based 坐标和区域识别。
- Open Design Workbench Context：顶部 Pokemon/场景名/保存状态、右侧浮动素材栏、中央 7x7 画布、左侧建筑层面板和左下双预览检查器。
- Asset Placement & Editing：素材选择、放置、删除、替换、移动、跨建筑层移动、朝向、染色、备注、footprint 占用、跨层阻塞规则和受控承载/叠放规则。
- Building Level Management：默认 0/1/2 建筑层，层号递增，数据按 0 层到 n 层组织，UI 按 L2/L1/L0 这类高层到低层顺序展示，支持创建、删除、重命名、复制、隐藏、显示、锁定、解锁和当前编辑层。
- Asset Catalog & Selection：素材列表、缩略图、名称、分类、标签、适用区域、官方 `No.` 素材 ID、Pokemon 喜好、footprint、搜索、筛选、技能条件和素材详情。
- Ditto Skill / Instance Visual State：放置前默认技能状态、放置后实例级技能标记、`树叶`/`耕地`/`储水` 技能词表、一字技能标签、可染色状态、非默认旋转标记，以及画布/预览标识。
- Preview：左下 Preview Inspector 同屏展示俯视图和正视图、完整 7x7 展示、主体边界、当前层/全部可见层、网格和技能标记开关。
- Properties, Save & Recovery：上下文/检查器字段、保存/自动保存、重新打开、恢复校验、SceneDocument 序列化和字段级错误提示；显式 JSON 导出/导入 UI 后置。
- Image Export：从 SceneDocument、asset catalog 和 preview/export selectors 派生图片导出摘要、导出预览和图片下载；不修改 scene，不写入 storage。
- Scene Worker, MCP & Codex Skill：pnpm workspace monorepo、共享 `scene-core`、无状态 Cloudflare Worker HTTP API、Streamable HTTP MCP server、repo-scoped Codex skill 和 Worker/MCP/skill release gates。
- Asset Footprint & Occupancy：asset catalog 默认 1x1x1，真实大素材 override，90/270 度 length/width 交换，height 派生上层 blocking cells，所有端复用 `scene-core` rules。
- Asset Carrying & Stacking Surface：盘子/木盘子/派对拼盘承载食物，已审计底垫/地毯/嫩芽/低高度素材允许兼容物品同层叠放或放到其上方，所有端复用 `scene-core` stacking rules。

### Approved Course Correction - 2026-05-19

本 Architecture 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-19.md` 更新 MVP 架构边界。任何旧段落中关于建筑层隐藏/锁定、手动保存、dirty/saved/saveError、撤销/重做、素材空状态恢复动作、素材适用区域阻断校验、素材堆叠、实例移动、普通实例备注、素材可旋转差异、预览网格/主体边界/技能标记显示开关，以及 Mobile 下键盘查看操作的架构要求均被本节覆盖。

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

本 Architecture 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-22.md` 增加图片导出预览和图片导出边界。当前用户可见导出产物是图片，不是 JSON 文件；图片必须包含整体使用素材、每层图形和每层使用素材。

`SceneDocument`、asset catalog 和 preview/export selectors 是图片导出的唯一业务数据源。图片导出不得维护第二套业务状态，不得修改 `SceneDocument`，不得触发 autosave，不得写入 `pokopia.sceneDocument.v1` 或 `pokopia.sceneDocument.autosave.v1`。当前不引入导入、JSON export UI、server route、auth、cloud storage、share URL、账号或在线发布。

### Approved Course Correction - 2026-05-25

本 Architecture 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-25.md` 增加 Epic 7 服务化边界。已完成的 MVP 仍保持浏览器客户端优先；新增工作是把可脱离 DOM、React 和 localStorage 的领域能力抽取到共享 `packages/scene-core`，并通过 pnpm workspace monorepo 中的 `apps/web`、`apps/worker` 和 repo-scoped Codex skill 共同复用。

目标目录结构改为 monorepo：现有前端 UI 从根目录迁入 `apps/web/src/`；Cloudflare Worker HTTP API 和 Streamable HTTP MCP server 放入 `apps/worker/`；共享领域逻辑放入 `packages/scene-core/`。根 `package.json` 只做 pnpm workspace orchestration，Wrangler 部署命令通过 `pnpm run worker:*` 和 `pnpm run deploy` 暴露。

Worker 第一阶段无状态，不引入数据库、账号、云保存、分享链接、在线发布或服务端图片生成。`apps/worker` 只做 HTTP/MCP adapter、request parsing、result envelope、cache/header/security/logging 和 Wrangler 配置；不得重新实现 scene 业务规则。`packages/scene-core` 不得依赖 React、DOM、localStorage、Worker runtime 或 UI components。

### Approved Course Correction - 2026-05-27

本 Architecture 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-27.md` 增加 Epic 8 footprint/occupancy 边界。当前 `SceneDocument v1` 继续作为保存、恢复、短字符串、Worker API 和 MCP tools 的输入/输出契约；本次不创建 `SceneDocument v2`，不保存 blocking cells，不在 tile instance 上保存 footprint snapshot 或 override。

Footprint 是 asset catalog metadata：每个 asset 拥有 `footprint.length`、`footprint.width`、`footprint.height`，默认 1x1x1，真实大素材通过集中 override 覆盖。`packages/scene-core` 必须提供 DOM-free helpers 计算 effective footprint、occupied cells、same-layer overlap、canvas bounds 和 height-derived blocking cells。`apps/web`、`apps/worker`、MCP tools/resources 和 Codex skill 只能调用这些 helpers，不能复制规则。

### Approved Course Correction - 2026-05-28 建筑层备注

本 Architecture 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28.md` 增加 Epic 10 建筑层备注边界。层备注属于 `BuildingLevel` 的用户自填场景事实，不是普通 `TileInstance.note`，也不是 UI preference 或导出专用状态。

`SceneDocument v1` 继续作为当前 schema。本次批准一个向后兼容的 additive exception：旧 payload 或旧 PSE1 短字符串缺少 `buildingLevels[].notes` 时，恢复为空数组；新 serializer、autosave、short string codec、export summary、Worker API 和 MCP summary 必须保留层备注。备注正文必须按纯文本处理，不随 locale 自动翻译。

### Approved Course Correction - 2026-05-28 承载面/叠放规则

本 Architecture 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28-stacking-surface-rules.md` 增加 Epic 11 承载面与受控叠放边界。当前 `SceneDocument v1` 继续作为保存、恢复、短字符串、Worker API 和 MCP tools 的输入/输出契约；本次不创建 `SceneDocument v2`，不保存 stacking relation、surface id、z-index、parent instance id 或 catalog snapshot。

Stacking surface 是 asset catalog metadata：默认不可承载、不可被同层 overlap；明确 override 才能把 `wooden-plate`、`plate`、`party-platter` 标记为 food surface，或把已审计底垫、地毯、嫩芽和低高度素材标记为 floor-cover/low-height surface。`packages/scene-core` 必须提供 DOM-free helpers 计算 stacking compatibility、derived base/top relation、unsupported surface conflicts 和 surface capacity conflicts。`apps/web`、`apps/worker`、MCP tools/resources 和 Codex skill 只能调用这些 helpers，不能复制盘子、地毯、嫩芽或低高度素材规则列表。Web 渲染可以把合法同格 stacking relation 表达为上下半格显示，但该上下分区只是 UI projection，不是保存顺序、z-index 或 schema 字段。

另有 47 条 Non-Functional Requirements，核心架构约束包括：

- 编辑反馈必须快速：桌面 1280x720、1000 个素材以内、10 个建筑层以内，常见画布编辑操作需要在 100ms 内完成可见状态更新。
- 预览切换需要在 300ms 内完成首个可见更新；素材搜索筛选 1000 个素材以内需要在 200ms 内返回可见结果。
- 画布、上下文/检查器字段、建筑层列表、预览和序列化结果必须从同一场景数据源派生。
- 保存/序列化/恢复/重新打开必须通过往返恢复测试，恢复后建筑层数量、素材实例数量、染色数量和技能标记数量必须一致。
- Footprint、effective footprint、occupied cells 和 height blocking cells 必须由 `scene-core` 确定性派生；不得保存为独立 state。
- 层备注必须随 `BuildingLevel` 一起保存、恢复、短字符串 roundtrip 和导出；不得作为 React-only state、localStorage UI preference 或 export-only state。
- Stacking surface compatibility 和 derived stacking relation 必须由 `scene-core` 确定性派生；不得保存为独立 state。
- 恢复数据或未来导入 JSON 必须作为数据处理，用户自定义名称、备注和技能说明必须按安全文本渲染，不得作为 HTML 或脚本执行。
- 基础可访问性目标是 WCAG 2.2 AA，关键状态不能只依赖颜色表达。
- 1280px 及以上使用完整 Open Design 浮动工作台，768px 以下进入 Mobile View-only Mode，不允许任何场景写操作。

Open Design UI 确认了新的工作台形态。架构上应支持一个桌面优先的单页工作台：顶部左侧 Pokemon/场景名/保存状态，右侧浮动 Asset Picker，中央 7x7 画布，左侧 Building Level Panel，左下 Preview Inspector 同时展示正视图和俯视图。动态 Pokemon 主题只影响外层 shell 和少量强调色，不允许覆盖主体区、外围区、当前层、选中格、技能标记、锁定层、隐藏、警告和错误状态等语义状态色。

关键架构结论：

- MVP 应采用客户端优先架构，先完成本地场景编辑、保存/自动保存、序列化、恢复和图片导出闭环；显式 JSON 导出/导入 UI、账号、云同步、协作、公开方案库、在线发布和分享链接不进入当前 backlog。
- 当前生产部署采用 pnpm workspace monorepo + Cloudflare Pages static assets：`apps/web` 承载浏览器编辑器，`packages/scene-core` 承载共享领域规则。`apps/worker` 保留为本地 API/MCP 开发与测试适配层，但不再进入生产发布路径。
- Scene document 必须是编辑数据的单一事实来源。画布、上下文/检查器字段、建筑层列表、预览和保存/恢复校验不得维护互相分叉的业务状态。
- 所有会修改 scene document 的行为都应经过统一 command 层，便于只读模式、校验、自动保存和自动化测试；MVP 不提供撤销/重做。
- `<768px` 的只读边界不能只靠隐藏按钮实现；command 层、canvas pointer handler 和 keyboard handler 都必须检查 `interactionMode`。
- 建筑层、素材实例、染色/朝向/技能状态和保存/恢复 schema 是最重要的领域模型边界，应优先稳定。
- 正视图在 MVP 中应是结构化高度关系预览，不做真实游戏视角和复杂遮挡模拟。
- 素材库在 MVP 中可以使用静态/本地数据源，但数据结构必须支持官方素材 ID、Pokemon 喜好、可染色性、footprint、后续批量导入、模板、更多技能类型和更大画布扩展。

项目复杂度判断：中等。已完成 MVP 没有账号、实时协作、监管合规或复杂持久化基础设施。Worker API、MCP 和 Codex skill 仍需要清晰模块边界，但生产发布边界已收敛为静态 Pages 部署，默认 release gate 不再验证或发布 API/MCP。

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

- `apps/web/src/`：React browser UI、scene state、command dispatch、autosave state、interactionMode、components、theme、browser-only IO 和 web tests。
- `packages/scene-core/src/`：scene document 类型、area/level/tile 规则、asset catalog 查询、schema、serializer/recovery、selectors、short code codec、export summary JSON 和 shared tests。
- `apps/worker/src/`：HTTP routes、MCP handler、result envelope、request limits、headers/cache、redacted logging 和 Worker tests。
- `.agents/skills/pokopia-scene-worker/`：Codex skill workflow、examples 和 MCP dependency。

**Development Experience**

Vite 提供快速 dev server、HMR、TypeScript/JSX 支持和静态构建。第一条实施 story 应是初始化 Vite React TypeScript 项目，并建立最小质量门禁：typecheck、build、unit test scaffold 和 Playwright scaffold。

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation)**

- 已完成 MVP 采用客户端优先静态 Web App；Epic 7 批准新增 Post-MVP Worker/API/MCP service layer，但仍不引入数据库、认证、云保存、分享链接或服务端图片生成。
- `SceneDocument` 是唯一业务事实来源；画布、上下文/检查器字段、建筑层列表、预览和保存/恢复校验必须从同一个 scene state 派生。
- 所有会修改 `SceneDocument` 的行为必须经过 typed command layer，不能由组件直接改写深层 scene object。
- `<768px` 进入只读模式；只读限制必须在 command layer、canvas pointer handler 和 keyboard handler 三处生效。
- 恢复数据或未来导入 JSON 必须通过 runtime schema validation，失败时不得覆盖当前 scene。

**Important Decisions (Shape Architecture)**

- 领域类型使用 TypeScript 定义，保存/恢复 schema 使用 Zod 4.x。
- MVP 状态管理使用 React `useReducer` + command dispatcher，不默认引入 Redux、Zustand 或 undo/redo history。
- MVP 保存/自动保存使用浏览器本地存储适配层和 SceneDocument 序列化；图片导出预览和图片下载进入当前 backlog，但必须从 SceneDocument v1、asset catalog 和 preview/export selectors 派生；显式 JSON 文件导出/导入 UI 延后到 Post-MVP。
- 测试栈采用 Vitest、React Testing Library 和 Playwright。
- 部署目标保持为 Cloudflare Pages static assets：`apps/web/dist` 发布到 `pokopia-scene-editor` Pages project；CI/release gate 至少包含 scene-core/web typecheck、unit tests、build 和 Playwright smoke。Worker runtime tests、MCP smoke、`wrangler types` 和 deploy dry-run 可作为本地适配层验证，但不属于默认生产发布门禁。

**Deferred Decisions (Post-MVP)**

- 显式 JSON 导出/导入 UI、数据库、账号、云同步、分享链接、公开方案库、协作编辑、在线发布和版本历史全部延后到 Post-MVP。
- 图片导出预览和图片文件下载进入当前 backlog，但必须从 SceneDocument v1、asset catalog 和 preview/export selectors 派生，不引入第二套业务状态。
- Zustand 或其他外部状态库延后。只有当 React reducer + context/selectors 在实际实现中出现明确订阅性能或组件边界问题时再引入。
- 复杂正视图遮挡、真实游戏视角模拟和更大画布尺寸延后。
- 持久化、多环境私有权限、API rate limiting、server monitoring 深度方案和服务端日志分析平台延后；Epic 7 仅要求基础 body limit、redacted logs、structured errors 和 deploy dry-run。

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
- `buildingLevels`，其中每个 `BuildingLevel` 包含 `id`、`levelNumber`、`name` 和 `notes: BuildingLevelNote[]`
- `tileInstances`
- `workspaceState.currentBuildingLevelId`
- `workspaceState.selectedAssetId`
- `workspaceState.selectedCoordinate`
- `rotationDegrees` on tile instances, constrained to `0 | 90 | 180 | 270`
- `dyeColor` on tile instances, explicitly `null` when unset
- metadata such as `createdAt`, `updatedAt` and `lastAutosavedAt`

`SceneDocument` 应表达 PRD 中的固定 MVP 规则：`sceneSize = 5x5`、`canvasSize = 7x7`、`outerPadding = 1`。MVP 只接受当前 SceneDocument v1 的完整字段集合，缺失必需字段必须失败；Epic 10 批准的 `buildingLevels[].notes` additive compatibility 除外，旧 payload 缺失该字段时恢复为空数组。

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
- 当前 MVP 不接受旧字段名、缺省字段或隐式迁移，除非 course correction 明确批准向后兼容的新增字段。Epic 10 的 `buildingLevels[].notes` 是已批准例外：旧 payload 缺失时补为空数组，新 serializer 必须显式输出该字段。后续如果产品决定引入新的 schema，应先更新 PRD、Architecture、Epics 和测试，再定义新的当前 schema。

**Decision: Footprint lives in the asset catalog, while occupancy is derived.**

本次 Epic 8 不需要 `SceneDocument v2`。`SceneDocument v1` 已经保存足够的实例事实：`assetId`、anchor `coordinate`、`buildingLevelId` 和 `rotationDegrees`。真实占用格应从当前 asset catalog 的 `footprint` 元数据派生：

- `AssetDefinition.footprint = { length: positive int, width: positive int, height: positive int }`。
- 未显式覆盖的素材默认 1x1x1。
- 0/180 度使用原 length/width；90/270 度交换 length/width；height 不随旋转变化。
- `coordinate` 是 footprint anchor，occupied cells 从 anchor 向正 x/y 方向展开。
- occupied cells 必须全部在 7x7 canvas 内。
- 同一 building level 的 occupied cells 不得重叠。
- `height > 1` 时，上方 `height - 1` 个 `levelNumber` 范围内的相同 occupied cells 派生为 blocked cells。

派生的 `effectiveFootprint`、`occupiedCells`、`blockingCells` 和 `blockedBy` 不进入 `SceneDocument v1`、autosave payload 或短字符串。短字符串仍编码 asset official id、anchor coordinate、building level、rotation、dye 和 skill fields；decode 后通过当前 catalog 重新派生 occupancy。若未来必须保存 catalog snapshot、历史 footprint 解释或实例级 footprint override，才需要新的 course correction 和 `SceneDocument v2`。

**Decision: Building level notes are persistent scene facts.**

Epic 10 新增 `BuildingLevelNote`，用于按建筑层记录搭建说明、复现步骤或注意事项。建议初始结构：

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

`notes` 数组顺序即显示顺序。空备注必须在 command 层阻止或过滤。层备注不是普通素材实例备注，不得新增或恢复 `TileInstance.note`；它也不是 UI preference，不进入 `pokopia.uiPreferences.v1`。复制建筑层时复制备注正文并为每条备注生成新的稳定 id；删除建筑层时随层删除备注，并在破坏性确认中说明备注数量。

PSE1 短字符串需要兼容旧 level record，同时保留新层备注。旧字符串解码为 `notes: []`；新字符串编码每层备注正文和顺序。备注不得作为 derived data 省略，因为它是用户自填场景事实。
**Decision: Stacking surface rules live in the asset catalog, while stacking relations are derived.**

本次 Epic 11 不需要 `SceneDocument v2`。`SceneDocument v1` 已经保存足够的实例事实：`assetId`、anchor `coordinate`、`buildingLevelId` 和 `rotationDegrees`。承载/叠放关系应从当前 asset catalog 的 stacking metadata 和 occupancy map 派生：

- `AssetDefinition.stacking` 默认表示不可承载、不可被同层 overlap。
- `wooden-plate`、`plate`、`party-platter` 通过 catalog override 标记为 food surface，只允许 `food` category 或等价已审计食物素材作为 top item。
- 已审计底垫、地毯、嫩芽和低高度素材通过 catalog override 标记为 floor-cover 或 low-height surface；不得靠名称匹配自动开放叠放。
- 同一 building level 的 occupied cells 默认不得重叠；只有 base instance 的 stacking metadata 允许 incoming asset category，且 incoming footprint 覆盖范围满足 surface 规则时，overlap 才合法。
- Height blocking 优先级高于 stacking compatibility；stacking rule 不得绕过 Epic 8 的跨层阻塞。
- Web canvas、preview 和 image export 对合法同格 stacking relation 使用同一显示契约：原始格子或对应 footprint cell 拆分为上/下两个显示区，下半部分显示 base surface，上半部分显示 top item。
- 不兼容 stacking relation 必须复用 Epic 8 冲突反馈模式：浅红提示层、红色边框或状态标签、文本原因和结构化 conflict，不允许静默替换 base/top 实例。

派生的 `stackingRelations`、`stackedOn`、`supportedBy`、`surfaceConflicts` 或 equivalent API/export-summary fields 不进入 `SceneDocument v1`、autosave payload 或短字符串。若未来必须保存用户指定的叠放顺序、手动绑定 surface、稳定 z-index、parent instance id 或 catalog snapshot，才需要新的 course correction 和 `SceneDocument v2`。

### Authentication & Security

**Decision: MVP has no authentication or authorization.**

产品范围不包含账号、权限、云同步、协作编辑、公开方案库或分享链接。因此 MVP 不引入 auth provider、session、JWT、OAuth、RBAC 或用户表。

**Decision: Recovered or imported content is data only.**

恢复数据或未来导入 JSON 中的素材名称、场景名称、建筑层名称、层备注和技能说明必须作为纯文本保存和展示。实现中禁止把这些字段传入 `dangerouslySetInnerHTML` 或任何 HTML parser。包含 `<script>`、事件处理属性、`<img onerror>` 等字符串时，UI 只能把它们作为普通文本显示。

**Decision: Destructive commands require explicit confirmation at command boundary.**

删除非空建筑层、恢复替换当前 scene、批量清空等破坏性操作必须提供确认流程。确认内容至少包含受影响对象名称、素材实例数量和操作后果。

### API & Communication Patterns

**Decision: Completed MVP remains browser-first; Epic 7 adds a Post-MVP Worker/API/MCP service layer.**

已完成 MVP 的核心编辑数据流仍发生在浏览器内：

- scene create/edit：内存 state
- autosave：serialize `SceneDocument` through local scene storage; image export reads the same scene truth but does not reuse JSON as the user-facing artifact
- reopen/recover：read autosaved SceneDocument data, parse, validate, then replace state only after success
- local UI preferences：persist asset search/filter/favorite-only to a separate localStorage namespace, outside `SceneDocument`
- asset catalog：MVP 使用 repo-local static data 或 bundled JSON/TS data

Epic 7/8 新增无状态 service layer 与 shared domain rules：

- `packages/scene-core`：共享 `SceneDocument v1` schema、serializer/recovery、short code codec、asset query、footprint/occupancy helpers、selectors、default scene generation、building level notes 和 export summary JSON。
- `apps/worker`：Cloudflare Worker HTTP API 和 Streamable HTTP MCP server，复用 `scene-core`。
- HTTP API：`/api/health`、`/api/scene/generate`、`/api/scene/validate`、`/api/scene/recover`、`/api/scene/export-summary`、`/api/scene/encode`、`/api/scene/decode`、`/api/assets`。
- MCP tools：`generate_scene_document`、`validate_scene_document`、`recover_scene_document`、`summarize_scene_export`、`search_pokopia_assets`。
- 统一 result envelope：`{ ok, data?, errors?, warnings?, meta }`，`meta` 至少包含 service/schema/catalog version。
- 第一阶段不保存用户 scene，不引入账号、权限、云同步、分享链接、在线发布或服务端 PNG 生成；Worker/MCP 也不得保存 derived blocking cells 或复制 footprint rules。

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
- Selection Inspector reads selected instance and current building level notes derived from scene
- Preview Inspector derives front/top previews from scene and layer range
- Pokemon Scene Controls read selected Pokemon and scene name
- Recovery Validator reads schema validation result
- Image Export Preview reads export summary/render data, including layer notes, derived from SceneDocument and asset catalog

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

**Decision: Production deploys the web app as static Cloudflare Pages assets.**

`apps/web` 的 Vite production build 输出静态文件并通过 Cloudflare Pages 发布到 `pokopia-scene-editor` project。生产部署不再发布 `/api/*`、`/api/v1/*` 或 `/mcp`，也不再把 Worker/MCP 作为 release gate 的默认目标。

根 `package.json` 作为 pnpm workspace orchestration 层，`deploy` 必须委托到静态 Pages 部署。`apps/worker` 可以保留 local dev、types、tests 和 MCP smoke 入口，但 Worker deploy/dry-run 必须显式拒绝执行，避免误发布 API/MCP。

**Decision: Environment configuration remains minimal.**

MVP 不需要运行时后端 URL、API key 或 secret。Epic 7 第一阶段 Worker 仍不需要数据库或私有用户 secret。若后续加入私有 MCP tools、持久化或外部 API，必须先扩展 architecture 和 secret/binding 管理策略。

**Decision: CI quality gate is implementation-critical.**

最小 CI / release gate：

- `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
- `pnpm --filter @pokopia-scene-editor/web typecheck`
- `pnpm --filter @pokopia-scene-editor/scene-core test`
- `pnpm --filter @pokopia-scene-editor/web test`
- `pnpm run build`
- Playwright smoke for desktop edit flow and mobile read-only flow

Playwright 必须覆盖：

- 1280x720 或以上桌面编辑闭环
- 390x844 mobile read-only guard
- save/recovery roundtrip
- dangerous text rendered as text
- no control overlap in key responsive viewports

### Decision Impact Analysis

**Implementation Sequence**

Completed MVP baseline sequence:

1. Initialize Vite React TypeScript starter and scripts.
2. Define domain types and Zod schema for `SceneDocument`, `BuildingLevel`, `TileInstance`, `AssetDefinition` and recovery errors.
3. Implement pure domain functions: area calculation, level ordering, selected instance lookup and serialization.
4. Implement command layer with `interactionMode`, autosave boundaries and recovery validation.
5. Build Scene Canvas, Asset Picker, Building Level Panel and Selection Inspector against the command layer.
6. Add Preview Inspector with top-view and basic front-view derived from level order.
7. Add Recovery Validator, scene storage/serializer and safe text rendering.
8. Add responsive read-only mode and Playwright coverage.

Approved Epic 7 implementation sequence:

1. Extract `packages/scene-core` and migrate the existing React app into `apps/web` without regressing browser behavior.
2. Add `apps/worker` with local HTTP API/MCP adapters, unified result envelope, request limits and local dev scripts.
3. Add Streamable HTTP MCP tools/resources/prompts over the same `scene-core` APIs for local agent-facing workflows.
4. Add `.agents/skills/pokopia-scene-worker/` as a workflow wrapper that calls MCP instead of copying business logic.
5. Harden local adapter validation with Worker runtime tests, MCP smoke, bundle pollution checks, redacted logging checks and `wrangler types --check`; production release remains static Pages-only.

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

已完成 MVP 没有后端 API，因此浏览器内保存/恢复函数使用 `camelCase` 命名，例如：

- `serializeSceneDocument`
- `parseSceneDocument`
- `validateSceneDocument`
- `saveSceneDraft`
- `recoverSceneDraft`

除 Epic 7 已批准的 Worker API/MCP 入口外，后续若再引入新的 API、持久化或权限边界，必须先更新 architecture，而不是在 implementation story 中临时发明接口。

Epic 7 已批准的 HTTP route 使用 kebab-case/resource-task 混合风格，例如 `/api/scene/export-summary`；MCP tool 使用 lower snake case，例如 `validate_scene_document`。HTTP/MCP adapter 名称不得绕过 `packages/scene-core` 直接表达业务实现细节。

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

- `apps/web/src/state/`：web scene reducer、command dispatcher、autosave state、interaction mode。
- `apps/web/src/components/`：React UI 组件。
- `apps/web/src/io/`：browser-only scene storage、UI preferences、image export/download 和 safe text boundaries。
- `apps/web/src/theme/`：动态宝可梦主题 tokens、语义色 tokens 和 theme helpers。
- `apps/web/src/test/`：web 测试工具、fixtures、render helpers。
- `apps/web/e2e/`：Playwright specs。
- `packages/scene-core/src/domain/`：scene document 类型、area 计算、level ordering、tile instance 规则、footprint 几何和 occupancy map。
- `packages/scene-core/src/domain/assets/`：asset catalog 类型、footprint metadata、搜索筛选、适用区域展示/筛选元数据和默认技能规则。
- `packages/scene-core/src/io/`：shared JSON parse、Zod schema、serialization/recovery 和 short code codec。
- `apps/worker/src/`：Worker routes、MCP adapter 和 result envelope。

**File Structure Patterns**

- 领域纯函数优先 colocate tests：`area.ts` 与 `area.test.ts`。
- React 组件优先 colocate component tests：`scene-canvas.tsx` 与 `scene-canvas.test.tsx`。
- Playwright 测试统一放在 `e2e/*.spec.ts`。
- web fixtures 放 `apps/web/src/test/fixtures/`，shared scene fixtures 放 `packages/scene-core/src/test/fixtures/`，不要散落在组件目录。
- public/static assets 后续统一放 `apps/web/public/` 或 `apps/web/src/assets/`，具体选择由实施 story 根据 Vite handling 决定，但同类资源不得混放。
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
- `BuildingLevel.notes` 必须显式存在；未填写时使用空数组。每条备注包含稳定 `id` 和 `text`，`text` 按用户原文保存。
- `areaType` 只允许 `main | outer`。
- `rotationDegrees` 只允许 `0 | 90 | 180 | 270`；默认 0 度必须显式保存为 `0`，但 UI 不显示额外旋转标记。
- `footprint.length`、`footprint.width`、`footprint.height` 只存在于 asset catalog，使用正整数；SceneDocument tile instance 不保存 footprint。
- `effectiveFootprint`、`occupiedCells`、`blockingCells` 只允许作为 selector/export-summary/API/MCP 派生输出，不允许写入保存 payload。
- `stacking.surfaceKind`、`stacking.allowedTopCategories`、`stacking.allowsSameLevelOverlap` 只存在于 asset catalog；SceneDocument tile instance 不保存 surface 或 stacking 字段。
- `stackingRelations`、`stackedOn`、`supportedBy`、`surfaceConflicts` 只允许作为 selector/export-summary/API/MCP 派生输出，不允许写入保存 payload。
- UI 的上下半格 stacking display 只允许从 derived stacking relation 派生；任何上下半格状态不得写回 SceneDocument、autosave payload、短字符串或 Worker/MCP 输入。
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
- 层备注写操作必须通过 command，例如 `addBuildingLevelNote`、`updateBuildingLevelNote`、`deleteBuildingLevelNote`；组件不得直接 mutate `buildingLevels[].notes`。
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
- read-only 禁止 place、delete、rotate、dye, skill toggle、layer note mutate、level mutate、recover replace 和 autosave。
- command layer 和 canvas pointer handler 必须检查只读边界；mobile application keyboard handler 必须 no-op。

**Safe Text Rendering Patterns**

- 恢复数据或未来导入 JSON 的 `sceneName`、`assetName`、`buildingLevel.name`、`BuildingLevelNote.text`、`skillNote` 等字段只能作为文本渲染。
- 禁止 `dangerouslySetInnerHTML`。
- 禁止把恢复字段传给 HTML parser。
- 测试 fixture 必须覆盖 `<script>`、`<img onerror>` 和普通尖括号文本。

### Enforcement Guidelines

**All AI Agents MUST**

- 不直接 mutate `SceneDocument`；所有业务写操作走 command layer。
- 不在组件中重复 area、level ordering、preview ordering、footprint/occupancy 或 recovery validation 规则；使用 domain helpers / selectors。
- 不引入数据库、auth、routing、外部状态库、云保存或服务端图片生成，除非 architecture 先更新；Epic 7 的后端 API 只允许作为无状态 Worker adapter 调用 `packages/scene-core`。
- 不把用户文本作为 HTML 渲染。
- 不绕过 mobile read-only command guard。
- 新增 command 时同时新增 domain/unit tests。
- 新增恢复字段时同时更新 TypeScript type、Zod schema、serializer/parser、fixture 和 roundtrip test；本次 footprint 不是恢复字段，必须保持 SceneDocument v1 shape 不变。Epic 10 的 `buildingLevels[].notes` 属于新增恢复字段，必须同步 short string codec、export summary、Worker/MCP contract tests 和 unsafe text fixtures。

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

Approved Epic 7 target structure:

```text
pokopia-scene-editor/
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   ├── state/
│   │   │   ├── theme/
│   │   │   ├── i18n/
│   │   │   └── io/
│   │   │       ├── image-export.ts
│   │   │       ├── scene-storage.ts
│   │   │       └── ui-preferences.ts
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── playwright.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── worker/
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   ├── mcp.ts
│       │   └── api-result.ts
│       ├── wrangler.toml
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── scene-core/
│       ├── src/
│       │   ├── domain/
│       │   ├── assets/
│       │   ├── io/
│       │   ├── export-summary/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── .agents/
│   └── skills/
│       └── pokopia-scene-worker/
│           └── SKILL.md
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
├── docs/
└── _bmad-output/
```

The pre-Epic-7 single-app tree below is retained as historical MVP context and is superseded for all new Worker/MCP/skill work:

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
    ├── planning-artifacts/
    │   ├── prd.md
    │   ├── ux-design-specification.md
    │   ├── epics.md
    │   └── architecture.md
    ├── implementation-artifacts/
    │   ├── sprint-status.yaml
    │   ├── spec-system-i18n-zh-en.md
    │   └── review-*-system-i18n-zh-en.md
    └── archive/
        └── 2026-05-27/
            ├── implementation-artifacts/
            │   ├── completed-stories/
            │   └── completed-specs/
            └── planning-artifacts/
                ├── sprint-change-proposals/
                └── supporting-documents/
```

### Architectural Boundaries

**API Boundaries**

已完成 MVP 没有后端 API；所有 scene create/edit/save/recover/serialize 操作都可以继续在浏览器内完成。Epic 7 批准新增 `apps/worker`，但其 API/MCP 只能调用 `packages/scene-core` 中的纯领域能力，不得保存用户 scene，不得引入数据库、auth middleware、账号、云同步或公开发布。

`apps/worker` 允许的公开入口：

- HTTP API under `/api/*`
- Streamable HTTP MCP under `/mcp`
- Static assets fallback for `apps/web/dist`

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

MVP web app 不使用 service/repository/database layer。跨组件业务操作统一集中到 web state/command 层和 shared domain helpers。Epic 7 新增 service boundary 只存在于 `apps/worker` adapter 层；业务规则必须下沉到 `packages/scene-core`，不得在 Worker routes、MCP tools 或 Codex skill 中复制。

**Data Boundaries**

- `packages/scene-core/src/*` 定义可共享的业务规则、SceneDocument schema、serializer/recovery、selectors、asset filtering、footprint/occupancy helpers、default scene generation 和 export summary JSON。
- `apps/web/src/state/*` 是浏览器 UI 的 scene write boundary。
- `apps/web/src/io/*` 保留浏览器专属 IO，例如 localStorage scene storage、UI preferences 和 `html-to-image` 图片下载。
- `apps/web/src/components/*` 只消费 state、selectors、command dispatcher 和 view options。
- `apps/web/src/theme/*` 只处理视觉 tokens，不参与 scene business rules。
- `apps/worker/src/*` 只做 HTTP/MCP adapter、request validation、result envelope、headers/cache、安全和日志脱敏。

### Requirements to Structure Mapping

**Feature Mapping**

- FR1-FR7 Scene & Canvas Model：`packages/scene-core/src/domain/scene/`、`apps/web/src/components/scene-canvas/`。
- FR8-FR18 Asset Placement & Editing：`packages/scene-core/src/domain/scene/`、`apps/web/src/state/`、`apps/web/src/components/scene-canvas/`、`apps/web/src/components/selection-inspector/`；FR13/14/15/17/18 已从 MVP 删除。
- FR19-FR27 Building Level Management：`packages/scene-core/src/domain/scene/levels.ts`、`apps/web/src/state/`、`apps/web/src/components/building-level-panel/`；FR25/26 已从 MVP 删除。
- FR28-FR35 and FR59 Asset Catalog & Selection：`packages/scene-core/src/domain/assets/`、`apps/web/src/components/asset-picker/`。
- FR36-FR40 and FR60-FR62 Ditto Skill / Instance Visual State：`apps/web/src/state/`、`packages/scene-core/src/domain/scene/`、`apps/web/src/components/selection-inspector/`、`apps/web/src/components/scene-canvas/`。
- FR41-FR47 and FR63 Preview：`packages/scene-core/src/domain/scene/selectors.ts`、`apps/web/src/components/preview-inspector/`、`apps/web/src/components/scene-canvas/`；FR43/47 已从 MVP 删除。
- FR48-FR49 Properties：`apps/web/src/components/selection-inspector/`、`packages/scene-core/src/domain/scene/selectors.ts`、`apps/web/src/state/`。
- FR50-FR55 Save & Recovery：`packages/scene-core/src/io/scene-schema.ts`、`scene-serializer.ts`、`recover-scene.ts`、`apps/web/src/io/scene-storage.ts`、`apps/web/src/components/recovery-validator/`。
- FR56-FR58 Open Design Workbench Context：`apps/web/src/components/app-shell/`、`apps/web/src/components/pokemon-scene-controls/`、`apps/web/src/theme/`、`apps/web/src/state/`。
- FR69-FR77 Scene Worker, MCP & Codex Skill：`packages/scene-core/`、`apps/worker/src/routes/`、`apps/worker/src/mcp.ts`、`.agents/skills/pokopia-scene-worker/`、root `package.json` pnpm scripts、`pnpm-workspace.yaml` 和 `apps/worker/wrangler.toml`。
- FR78-FR86 Asset Footprint & Occupancy Rules：`packages/scene-core/src/domain/assets/catalog.ts`、`packages/scene-core/src/domain/scene/footprint.ts`、`packages/scene-core/src/domain/scene/occupancy.ts`、`packages/scene-core/src/io/scene-schema.ts`、`apps/web/src/state/asset-placement.ts`、`apps/web/src/components/scene-canvas/`、`apps/web/src/components/preview-inspector/`、`apps/web/src/components/export-preview/`、`apps/worker/src/routes/scene.ts`、`apps/worker/src/mcp.ts` 和 `.agents/skills/pokopia-scene-worker/`。
- FR87-FR92 Building Level Notes：`packages/scene-core/src/domain/scene/levels.ts`、`packages/scene-core/src/domain/scene/types.ts`、`packages/scene-core/src/io/scene-schema.ts`、`packages/scene-core/src/io/scene-string-codec.ts`、`packages/scene-core/src/domain/scene/export-summary.ts`、`apps/web/src/state/`、`apps/web/src/components/selection-inspector/`、`apps/web/src/components/export-preview/`、`apps/worker/src/routes/scene.ts`、`apps/worker/src/mcp.ts` 和 `.agents/skills/pokopia-scene-worker/`。
- FR93-FR100 Asset Carrying & Stacking Surface Rules：`packages/scene-core/src/domain/assets/catalog.ts`、`packages/scene-core/src/domain/assets/stacking-overrides.ts`、`packages/scene-core/src/domain/scene/occupancy.ts`、`packages/scene-core/src/domain/scene/stacking.ts`、`packages/scene-core/src/io/scene-schema.ts`、`apps/web/src/state/asset-placement.ts`、`apps/web/src/components/scene-canvas/`、`apps/web/src/components/selection-inspector/`、`apps/web/src/components/preview-inspector/`、`apps/web/src/components/export-preview/`、`apps/worker/src/routes/scene.ts`、`apps/worker/src/mcp.ts` 和 `.agents/skills/pokopia-scene-worker/`。

**Cross-Cutting Concerns**

- Single source of truth：`apps/web/src/state/scene-state.ts`、`scene-reducer.ts`、`packages/scene-core` selectors 和 occupancy helpers。
- Mobile read-only：`apps/web/src/state/interaction-mode.ts`、scene commands、canvas handlers、`apps/web/e2e/mobile-readonly.spec.ts`。
- Safe text rendering：`apps/web/src/io/safe-text.ts` 或 shared safe-text helper、React text rendering conventions、web/shared unsafe text fixtures、`apps/web/e2e/unsafe-text.spec.ts`。
- Accessibility：component tests for accessible names, Playwright smoke across desktop/mobile.
- Performance：domain selectors kept pure and memoizable in `packages/scene-core`; asset filtering lives in `packages/scene-core/src/domain/assets/filters.ts`; virtualization/pagination added inside `apps/web/src/components/asset-picker/` only when implementation requires it.
- Service safety：Worker body limits, redacted logs, no raw scene payload logging, no React/DOM dependencies in Worker bundle, and `wrangler types --check` in release gate.

### Integration Points

**Internal Communication**

UI components communicate through props/context and dispatch typed commands. Business mutations flow:

```text
component event -> command dispatcher -> command guard -> domain helper -> reducer -> scene state -> selectors -> UI
```

View-only state such as hover cell, selected panel tab, zoom/pan, asset search/filter/favorite-only, preview mode and current viewed level can live in React state and may be persisted in a separate localStorage UI-preferences namespace, but must not mutate `SceneDocument` and must not appear in autosave/export payloads.

**External Integrations**

MVP web app has no required external service integrations. Browser APIs used:

- localStorage or equivalent local scene storage adapter for MVP autosave and reopen.
- localStorage UI-preferences namespace for asset search/filter/favorite-only; this namespace is explicitly outside SceneDocument.
- File input / drag-and-drop for future explicit import, outside current MVP UI.
- Canvas/SVG/Blob URL/download for current image export, browser-only and outside any backend integration.
- `matchMedia` or resize observation for interaction mode, routed through a shared `interaction-mode` helper.

Worker/MCP local integrations:

- Wrangler CLI for local Worker dev and generated types.
- Local Worker serves API/MCP routes for development workflows only.
- MCP clients/Codex may connect to the local Streamable HTTP MCP endpoint; Codex skill uses MCP and does not implement business logic itself.

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

Worker API / MCP
        -> request payload
        -> adapter validation and body limit
        -> packages/scene-core pure function
        -> result envelope / MCP tool result
        -> no user scene persistence and no raw payload logging
```

### File Organization Patterns

**Configuration Files**

- Root `package.json` owns pnpm workspace orchestration scripts only.
- `pnpm-workspace.yaml` declares `apps/*` and `packages/*`.
- `apps/web/package.json` owns React/Vite UI dependencies and web scripts.
- `apps/web/vite.config.ts`, `vitest.config.ts`, `playwright.config.ts` and `tsconfig*.json` own web app build/test config.
- `apps/worker/package.json` owns Worker/MCP/Wrangler dependencies and scripts.
- `apps/worker/wrangler.toml` owns Cloudflare Worker config and static assets binding to `../web/dist`.
- `packages/scene-core/package.json` and `tsconfig.json` own shared domain package build/test config.

**Source Organization**

Shared domain modules must not import React, DOM APIs, localStorage, Worker runtime or UI components. Web state modules may import `packages/scene-core` and browser IO types, but should avoid importing components. Components can import shared selectors and state dispatcher hooks. Worker adapter code can import `packages/scene-core`, but cannot import `apps/web/src/*`.

Allowed dependency direction:

```text
apps/web/components -> apps/web/state -> packages/scene-core
apps/web/components -> apps/web/theme
apps/web/components -> apps/web/io only for browser save/recovery/export UI
apps/web/state -> packages/scene-core
apps/web/io -> packages/scene-core
apps/worker -> packages/scene-core
.agents/skills/pokopia-scene-worker -> MCP tools only
packages/scene-core -> no React, no DOM, no Worker runtime, no app imports
```

**Test Organization**

- Unit tests colocate with domain/state/io files.
- Component tests colocate with component files.
- Shared scene-core fixtures live in `packages/scene-core/src/test/fixtures/`.
- Web component fixtures live in `apps/web/src/test/fixtures/`.
- Playwright tests live under `apps/web/e2e/` or another web-owned e2e folder declared by `apps/web/playwright.config.ts`.
- Worker runtime and MCP smoke tests live under `apps/worker/src/` or `apps/worker/test/`.
- New domain rule, command, schema field or recovery error requires tests in the same story.

**Asset Organization**

MVP sample/static images should live in `apps/web/public/assets/` when they are directly URL-addressed. If assets are imported by TypeScript and bundled, place them under `apps/web/src/assets/`. Shared catalog metadata needed by Worker must live in `packages/scene-core` or be generated into that package without importing browser-only assets.

### Development Workflow Integration

**Development Server Structure**

`apps/web` Vite serves `apps/web/index.html` and `apps/web/src/main.tsx`. Local web development starts with `pnpm run dev` at the root, delegating to `pnpm --filter @pokopia-scene-editor/web dev`. Worker development starts with `pnpm run worker:dev`, delegating to `apps/worker` and `wrangler dev`.

**Build Process Structure**

Root `pnpm run build` builds `packages/scene-core` and `apps/web` in order. `apps/web` produces static assets under `apps/web/dist/`. Build must not depend on `_bmad-output/` planning files. Planning artifacts are documentation inputs, not runtime dependencies.

**Deployment Structure**

Production deployment uses Cloudflare Pages. `pnpm run deploy` builds `apps/web` and runs `wrangler pages deploy ../web/dist --project-name pokopia-scene-editor --branch main` via the local Wrangler dependency. Worker API/MCP deployment is disabled from default release flow; `worker:deploy` and `worker:deploy:dry-run` intentionally fail to prevent accidental publication.

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility**

All major decisions work together without conflict. Vite + React + TypeScript supports the chosen single-page editor shape. Zod provides runtime validation for recovered SceneDocument data while TypeScript covers compile-time domain contracts. Vitest, React Testing Library and Playwright align with the selected Vite/React stack. Production deployment is static Pages-only, preserving the no-account, no-database, no-cloud-save first-stage service boundary while keeping Worker API/MCP as local adapters. Epic 8 keeps footprint as catalog metadata and derived scene-core rules, so it improves placement fidelity without changing the SceneDocument v1 payload shape. Epic 11 keeps stacking surface metadata in the asset catalog and derives base/top relations in `scene-core`, so it adds controlled overlap without changing the SceneDocument v1 payload shape.

The deferred decisions are also coherent: explicit JSON import/export UI, database, auth, routing, external state libraries, sharing, collaboration, online publishing, SceneDocument v2, saved catalog snapshots, instance-level footprint overrides, saved stacking relations, manual z-index and complex front-view rendering are all outside MVP and do not block the current architecture.

**Pattern Consistency**

Implementation patterns support the architecture decisions:

- `camelCase` JSON fields match the PRD data examples.
- command type names are consistent with a typed reducer/command layer.
- Result-style errors align with recovery validation and command rejection.
- safe text rendering rules directly support the security decision that recovered or imported content is data only.
- mobile read-only rules align with `interactionMode` as an architecture boundary rather than CSS-only behavior.

**Structure Alignment**

The project structure supports the required boundaries. `packages/scene-core` owns DOM-free domain/schema/selector/catalog/footprint/occupancy/export-summary rules. `apps/web` owns React UI, command/state write paths, browser-only IO, localStorage, and image download. `apps/worker` owns HTTP/MCP adapters, request validation, result envelopes, headers/cache, security, logging, and Wrangler deployment. E2E tests cover desktop editing, mobile read-only behavior, save/recovery roundtrip, unsafe text, and browser image export; Worker/MCP smoke covers the service layer and must include the shared footprint fixture.

### Requirements Coverage Validation ✅

**Feature Coverage**

All PRD feature groups have architectural support:

- Scene & Canvas Model maps to `packages/scene-core/src/domain/scene/` and `apps/web/src/components/scene-canvas/`.
- Open Design Workbench Context maps to `apps/web/src/components/app-shell/`, `apps/web/src/components/pokemon-scene-controls/`, theme tokens and interaction mode state.
- Asset Placement & Editing maps to `packages/scene-core/src/domain/scene/`, `apps/web/src/state/`, `apps/web/src/components/scene-canvas/` and `apps/web/src/components/selection-inspector/`.
- Building Level Management maps to `packages/scene-core/src/domain/scene/levels.ts`, web command handling and `apps/web/src/components/building-level-panel/`.
- Asset Catalog & Selection maps to `packages/scene-core/src/domain/assets/` and `apps/web/src/components/asset-picker/`.
- Ditto Skill / Instance Visual State maps to tile commands, selection inspector, scene canvas badges, dye controls and preview selectors.
- Preview maps to shared selectors and `apps/web/src/components/preview-inspector/`.
- Properties, Save & Recovery maps to selection inspector, IO schema, serializer/storage/recovery modules and validator UI.
- Image Export maps to `packages/scene-core` export summary JSON, browser-only `apps/web/src/io/image-export.ts`, `apps/web/src/components/export-preview/` and preview/export selectors; it must be derived from SceneDocument and asset catalog.
- Scene Worker, MCP and Codex Skill maps to `apps/worker/`, `packages/scene-core/`, `.agents/skills/pokopia-scene-worker/`, `pnpm-workspace.yaml`, root pnpm scripts and `apps/worker/wrangler.toml`.
- Asset Footprint & Occupancy maps to `packages/scene-core` asset catalog, footprint helpers, occupancy selectors, schema validation, web placement/canvas rendering, preview/export rendering, Worker routes, MCP tools/resources and Codex skill examples.

**Functional Requirements Coverage**

FR1-FR100 are architecturally supported. The architecture gives each functional area an owning module and prevents duplicated business rules through domain helpers/selectors and command-layer write boundaries. FR65-FR68 are covered by browser-only image export preview, export summary derivation and download helpers that do not mutate SceneDocument or storage. FR69-FR77 are covered by the pnpm workspace structure, shared `scene-core`, stateless Worker HTTP API, Streamable HTTP MCP server, and repo-scoped Codex skill wrapper. FR78-FR86 are covered by catalog-level footprint metadata, shared occupancy helpers, schema validation, web rendering updates, export-summary parity and MCP/Codex no-copy boundaries. FR87-FR92 are covered by building-level notes schema, commands, short string compatibility, export summary and safe-text rendering. FR93-FR100 are covered by catalog-level stacking metadata, shared stacking compatibility helpers, derived relation outputs, web placement feedback, export-summary parity and MCP/Codex no-copy boundaries.

**Non-Functional Requirements Coverage**

NFR coverage is sufficient for implementation:

- Performance: fixed 7x7 canvas, pure selectors, local state, static asset deployment and optional asset-list pagination/virtualization path support the required response targets.
- Reliability and data integrity: single source of truth, Zod schema validation, strict schemaVersion, command layer, catalog-derived footprint rules, SceneDocument-derived image export data and roundtrip Playwright tests support save/recovery consistency.
- Usability and accessibility: component boundaries, semantic state tokens, accessible-name tests and Playwright responsive checks support the UX/NFR requirements.
- Compatibility and responsive behavior: Vite static build plus Playwright desktop/mobile coverage supports the browser and viewport matrix.
- Security and data safety: no account/cloud persistence in Epic 7, no saved blocking cells or SceneDocument v2 in Epic 8, no saved stacking relations or SceneDocument v2 in Epic 11, redacted Worker logs, body limits, safe text rendering and JSON-as-data validation address the security NFRs.

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

None blocking. The architecture now admits a tightly scoped stateless Worker/API/MCP backend for Epic 7, derived footprint/occupancy rules for Epic 8, and derived stacking surface rules for Epic 11, while still deferring auth, persistence, cloud save, routing, external state libraries, sharing, collaboration, online publishing, server-side image generation, complex front-view rendering, SceneDocument v2 and configurable canvas sizes.

**Nice-to-Have Gaps**

- CI details for real Edge and Safari coverage can be refined during release planning. Playwright Chromium/Firefox/WebKit and manual browser acceptance are enough for architecture readiness.
- Asset catalog source format can be refined during implementation once real素材 data is available. The architecture reserves `packages/scene-core/src/domain/assets/` for shared metadata and `apps/web/public/` / `apps/web/src/assets/` for browser-rendered assets.
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
- Clear command layer that supports validation, command rejection, autosave/recovery boundaries and mobile read-only guard without reintroducing undo/redo or dirty/saved UI state.
- Explicit save/recovery schema and safe text rendering strategy.
- Component boundaries match the selected UX direction.
- Requirements-to-structure mapping is complete for FR1-FR100.
- Testing responsibilities are defined at shared unit, web component/E2E, Worker runtime and MCP smoke levels.

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
- Do not introduce auth, database, cloud persistence, public sharing, online publishing, server-side image generation, routing, or external state libraries unless architecture is updated first. Epic 7's approved backend scope is limited to stateless Worker API/MCP adapters over `packages/scene-core`.
- Do not introduce `SceneDocument v2`, saved blocking cells, saved stacking relations, surface ids, z-index, instance-level footprint overrides, or duplicated Worker/MCP/skill footprint/stacking rules for Epic 8 or Epic 11.
- Route all scene writes through the command layer.
- Use Zod validation for recovered or future imported JSON and preserve safe text rendering.
- Maintain tests with every new domain rule, command, schema field, UI boundary, Worker route, MCP tool and Codex skill workflow.

**First Implementation Priority**

Continue with BMAD implementation routing from the newly added Epic 11 backlog. The next implementation story is:

- `11-1-asset-catalog-stacking-surface-metadata`

Story 11.1 must add catalog-level stacking surface metadata with default non-stackable behavior and audited overrides for `wooden-plate`, `plate`, `party-platter`, selected mats/rugs/shoots/low-height surfaces, while preserving current asset IDs, display names, filtering, footprint metadata and Worker/MCP catalog resources.

Recommended next command:

```text
bmad-create-story 11-1-asset-catalog-stacking-surface-metadata
```

Use `bmad-create-story` for Story 11.1 before implementation. If the current dirty planning branch should be isolated, create a new git worktree before starting development.
