---
stepsCompleted:
  - step-01-init.md
  - step-02-discovery.md
  - step-02b-vision.md
  - step-02c-executive-summary.md
  - step-03-success.md
  - step-04-journeys.md
  - step-05-domain.md
  - step-06-innovation.md
  - step-07-project-type.md
  - step-08-scoping.md
  - step-09-functional.md
  - step-10-nonfunctional.md
  - step-11-polish.md
  - step-12-complete.md
inputDocuments:
  - docs/需求文档.md
workflowType: 'prd'
date: '2026-05-15'
documentCounts:
  productBriefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
  requirements: 1
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
releaseMode: phased
courseCorrections:
  - date: '2026-05-19'
    source: _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-19.md
    status: approved
    summary: MVP scope reduced; remove layer hidden/locked state, manual save, save status distinction, undo/redo, empty-state recovery actions, area placement validation, stacking, instance movement, ordinary instance notes, can-rotate differentiation, preview overlay toggles; mobile blocks all app keyboard operations.
  - date: '2026-05-22'
    source: _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-22.md
    status: approved
    summary: Add image export preview and image download as Epic 6; exported image must include overall used materials, per-layer graphics, and per-layer material lists; JSON export/import, import, sharing, cloud sync, accounts, and online publishing remain out of scope.
  - date: '2026-05-25'
    source: _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-25.md
    status: approved
    summary: Add Epic 7 for pnpm workspace monorepo serviceization: move the existing React UI into apps/web, extract shared scene-core domain logic, add Cloudflare Worker HTTP API and Streamable HTTP MCP in apps/worker, and wrap the service with a repo-scoped Codex skill without adding accounts, persistence, cloud sync, sharing, or server-side image generation.
  - date: '2026-05-27'
    source: _bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-27.md
    status: approved
    summary: Add Epic 8 for real asset footprint metadata, rotated occupancy, height-derived blocking, cross-cell rendering, persistence compatibility, and Worker/MCP/Codex skill rule parity without introducing SceneDocument v2.
  - date: '2026-05-28'
    source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28.md
    status: approved
    summary: Add Epic 10 for per-building-level multi-note editing, persistence, export preview rendering, and Worker/MCP export-summary parity while keeping ordinary tile instance note out of scope.
  - date: '2026-05-28'
source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28-stacking-surface-rules.md
    status: approved
    summary: Add Epic 11 for catalog-driven carrying surfaces and controlled stacking rules; plates can carry food, selected mats/rugs/shoots/low-height assets can permit compatible overlap, and SceneDocument v1 remains unchanged.
---

# 产品需求文档 - pokopia-scene-editor

**作者:** Grigri
**日期:** 2026-05-15

## Executive Summary

Pokopia 布景编辑器是一个面向 Pokopia 布景创作者的 Web App，用于制作、编辑、预览和保存结构化布景方案。产品默认以 17×17 实际编辑画布承载中心 15×15 主体区和外围一圈装饰区，使外立面、屋檐、墙体边缘、植物、遮挡物等真实占格内容能够被纳入同一个结构化方案中管理；旧 7×7 场景仍按自身尺寸恢复。

目标用户需要的不只是一个格子摆放工具，而是一个能准确表达 Pokopia 布景规则的编辑环境：素材摆放、建筑层高度、外围装饰、百变怪技能需求、俯视图和正视图预览都需要可视化、可编辑、可保存、可恢复。当前产品应优先保证用户可以完整创建默认 17×17 布景数据模型，并能清楚区分中心 15×15 主体区与外围占格空间。

最新 Desktop 工作台进入 Polish 降噪阶段。第一屏仍是直接可用的编辑工作台，但默认视觉重点调整为“编辑当前建筑层”：中央保持尺寸驱动画布，新建场景默认 17×17；左侧以建筑层列表为主，场景/Pokemon/画布尺寸默认收敛为摘要；右侧以素材浏览为主，素材详情按需展开；底部默认只显示当前选择快捷栏，层备注和低频字段进入可展开详情区；顶部保留预览/导出主入口，导入/导出字符串和重置收进文件/更多操作区。旧常驻预览面板不再作为桌面编辑态基准；预览和导出通过独立模式展示整体素材清单、逐层图形、逐层素材清单和下载操作。PRD、Epics 和 Stories 应以该降噪工作台形态为当前实施基准。

### Approved Course Correction - 2026-05-19

本 PRD 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-19.md` 收敛 MVP 范围。自本节起，任何旧段落中关于以下能力的 MVP 要求均视为废弃：建筑层隐藏/显示/锁定/解锁、手动保存、dirty/saved/saveError 状态区分、Undo/Redo、素材空状态恢复动作、素材适用区域的放置阻断校验、同层素材堆叠、素材实例移动、普通实例备注 `note`、素材是否可旋转的差异，以及预览中的网格/主体边界/技能标记显示控制。

MVP 保留的闭环是：7×7 画布、中心 5×5 主体区与外围装饰区识别、建筑层创建/删除/重命名/复制/切换、素材浏览/筛选/选择、素材放置/删除/替换、所有素材 0/90/180/270 度旋转、染色、实例级百变怪技能标记和技能备注、独立预览/导出、自动保存、重新打开恢复和 SceneDocument v1 校验。Mobile View-only Mode 下必须屏蔽所有应用级键盘操作；桌面/平板键盘操作不作为 MVP 强制要求。

### Approved Course Correction - 2026-05-22

本 PRD 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-22.md` 扩展当前 backlog。新增目标是图片导出预览与图片导出，而不是 JSON 文件导出。导出的图片必须包含整体使用的素材、每层的图形和每层使用的素材。

`SceneDocument v1` 仍是自动保存、恢复、预览和图片导出的内部事实来源，但不是本次用户可下载的导出产物。当前系统没有导入功能；本次不新增 JSON 导入、图片导入、从导出图片恢复场景、分享链接、云同步、账号、公开方案库或在线发布。

### Approved Course Correction - 2026-05-25

本 PRD 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-25.md` 增加服务化与 agent tooling 范围。当前已完成的浏览器编辑器仍保持客户端优先；新增目标是把可脱离 DOM、React 和 localStorage 的领域能力抽取为共享 `scene-core`，并通过 pnpm workspace monorepo 中的 `apps/web`、`apps/worker` 和 `packages/scene-core` 共同复用。

新增服务化范围只覆盖无状态 Worker 能力：默认/确定性 `SceneDocument` 生成、schema 校验、恢复/decode、导出摘要 JSON、素材查询、短字符串 encode/decode、MCP tools/resources/prompts 和 repo-scoped Codex skill workflow。第一阶段不新增账号、数据库、云保存、公开方案库、分享链接、在线发布、服务端 PNG/图片生成或 AI 自动创作完整布景。

### Approved Course Correction - 2026-05-27

本 PRD 已按 `_bmad-output/archive/2026-05-27/planning-artifacts/sprint-change-proposals/sprint-change-proposal-2026-05-27.md` 增加 Epic 8，用于真实素材 footprint、旋转后占用格、跨建筑层阻塞、跨格显示和全端规则一致性。当前 `SceneDocument v1` 继续作为保存、恢复、短字符串和 Worker/MCP 输入的当前契约；本次不创建 `SceneDocument v2`，因为 footprint 属于 asset catalog 元数据，阻塞状态和占用状态必须由 `scene-core` 从 `assetId`、`coordinate`、`buildingLevelId`、`rotationDegrees` 和当前 catalog 派生，不能作为独立 scene state 保存。

现有素材迁移策略是：所有 catalog asset 默认 footprint 为 `{ length: 1, width: 1, height: 1 }`，再用可审计 override 补充真实大素材。90/270 度旋转时 length/width 占用格必须交换；height 大于 1 时，上方建筑层对应 footprint cells 显示为不可放置。Web 编辑画布、俯视/正视预览、图片导出、Worker validate/recover/export-summary、MCP resources/tools 和 Codex skill 必须复用同一套 `scene-core` footprint/occupancy helpers。

### Approved Course Correction - 2026-05-28 建筑层备注

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28.md` 增加 Epic 10，用于按建筑层维护多条备注，并在图片导出预览和导出摘要中按层列出这些备注。层备注属于 `BuildingLevel` 的用户自填场景事实，不是普通素材实例备注 `note`，也不是 UI preference。

`SceneDocument v1` 继续作为当前 schema。本次变更允许 `buildingLevels[].notes` 作为向后兼容的新增字段：旧保存数据或旧 PSE1 短字符串缺少该字段时恢复为空数组；新的自动保存、序列化、短字符串和 export summary 必须保留备注。备注正文保持用户原文，不随 locale 自动翻译，并且必须作为安全文本渲染。

### Approved Course Correction - 2026-05-28 承载面/叠放规则

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28-stacking-surface-rules.md` 增加 Epic 11，用于承载面与受控叠放规则。Epic 8 的默认规则仍然成立：同一建筑层的 occupied cells 默认不得重叠，height 大于 1 的素材会阻塞上方建筑层。Epic 11 只为已标记的 catalog 素材增加明确例外：`wooden-plate`、`plate`、`party-platter` 可以承载食物；部分底垫、地毯、嫩芽和低高度素材可以允许兼容物品与其同层叠放或放到其上方。

当前继续保持 `SceneDocument v1`。本次不新增 `SceneDocument v2`，因为承载/叠放关系可由 `assetId`、anchor `coordinate`、`buildingLevelId`、`rotationDegrees`、当前 asset catalog stacking metadata 和 `scene-core` occupancy helpers 确定性派生；不需要保存 parent/child stack id、z-index、surface id、blocking cells 或 catalog snapshot。若未来需要用户手动指定叠放顺序、绑定某个物品到某个承载面、保存历史 catalog 解释或支持同坐标多个 top item 的持久排序，才需要新的 schema course correction。

### Approved Course Correction - 2026-05-29 15x15 Scene Size / 17x17 编辑画布

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-29-15x15-scene-size.md` 增加 Epic 12，用于把新建场景默认尺寸扩大为 `sceneSize=15x15`、`outerPadding=1`，并由现有尺寸公式派生 `canvasSize=17x17`。旧文档中“固定 5x5 / 7x7”的当前目标语义自本节起被替换为“默认 15x15 主体区 / 17x17 实际编辑画布”；早期 Epic 1-11 的 7x7 描述仍作为历史完成记录保留。

`SceneDocument v1` 的字段 shape 继续保持：仍使用 `sceneSize`、`canvasSize` 和 `outerPadding` 表达尺寸，不新增 `SceneDocument v2`。本次变更要求 schema、area calculation、footprint bounds、stacking/occupancy、预览、导出、Worker/MCP 和 Codex skill 都从 scene dimensions 派生。旧 7x7 SceneDocument v1 JSON payload 必须按其保存的尺寸恢复，不静默改写坐标或 `areaType`；旧 PSE1 短字符串继续按 legacy 7x7 解码，新的短字符串必须编码尺寸或使用新的 codec revision。

### Approved Course Correction - 2026-05-30 仓库瘦身与 Scene Core 库化

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-30-repo-slim-core-library.md` 进入 Polish 阶段。产品已经不是 MVP：主流程已可用，用户可以完成布景编辑、保存/恢复、预览、导出，并生成所需攻略/导出说明图。自本节起，旧文档中的 “MVP” 应理解为历史完成基线，而不是当前产品阶段或当前范围控制语言。

当前目标是仓库边界、维护性和稳定性收敛：本仓库只继续维护浏览器 Web 工作台和可被其他项目通过 pnpm `file:` 安装的 `scene-core` 领域库。API、MCP、Codex skill 和 Worker adapter 从本仓库外迁到新项目重新设计，不再作为本仓库的 PRD 目标、默认 release gate 或 active backlog。

Epic 1-12 的详细需求和完成历史归档到 `_bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md`。Active PRD/epics/tracker 只承载 Epic 13 仓库瘦身与 Scene Core 库化。终端用户 Web 行为不得回退：编辑、保存/恢复、默认 15x15 / 17x17 尺寸、legacy 7x7 恢复、footprint、stacking、层备注、导出预览和图片下载都必须保持。`SceneDocument v1` 继续保持；本次不需要 schema change。

### Approved Course Correction - 2026-05-31 Mobile 导入与下载预览模式重写

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md` 增加 Epic 14。Mobile 目标从“缩窄版只读工作台”调整为“导入驱动的布景说明预览”：`<768px` 下系统优先读取本地 scene storage 的最新有效 `SceneDocument`；存在记录时直接展示与 desktop “下载预览”相同的布景说明内容；不存在记录时显示“导入字符串”按钮。

Mobile 允许用户通过显式“导入字符串”操作替换当前本地布景记录。该操作必须使用自定义 modal 输入和确认，不使用系统 `prompt` / `confirm`；导入成功后写入现有 scene storage，以便刷新或再次进入 mobile 时继续显示该布景。Mobile 仍不提供完整编辑体验，不允许素材放置、删除、旋转、染色、技能编辑、建筑层编辑、层备注编辑、撤销/重做、JSON 文件导入/导出、分享链接、云同步或账号。

`SceneDocument v1`、PSE1/PSE2 短字符串 codec、footprint/stacking/dimension 派生规则和 export summary contract 继续保持。本次变更只调整 mobile surface、导入 UI 和 export preview 的承载方式：desktop 继续使用 modal 下载预览，mobile 使用页面内 inline preview。

### Approved Course Correction - 2026-06-01 `scene_id` URL 即时访问导入

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md` 增加 Epic 15。用户打开带 `?scene_id={id}` query 的 scene editor URL 时，Web app 会请求 scene API，取得可导入的布景字符串，并复用现有 PSE scene string decode/recovery/import pipeline 自动显示该布景。

该入口是“导入字符串的远程来源”，不新增账号、云同步、公开方案库、在线编辑服务或 SceneDocument schema 字段。`SceneDocument v1`、PSE1/PSE2 codec、footprint/stacking/dimension 派生规则和 export summary contract 继续保持。

本地调试时，因为 scene API Origin 限制，dev server/proxy 需要向上游带 `Origin: "https://scene-editor.pokokit.com"`；生产环境 browser fetch 不手写该 header。远程加载失败、无效响应、无效 scene string 和 lossy recovery 都必须给出可恢复反馈，不能静默把默认 scene 当作远程 scene 成功显示。

### Approved Course Correction - 2026-06-02 建筑层拖动排序

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-02-building-layer-reorder.md` 增加 Epic 16，用于在 desktop/tablet 编辑工作台的左侧建筑层面板中支持拖动排序。拖动过程中显示目标顺序预览；拖动完成后，系统通过现有 command layer 提交新的建筑层顺序，并由现有 autosave 链路自动保存。

`SceneDocument v1` 继续保持。排序只重排现有 `buildingLevels[].levelNumber`，不新增排序字段、z-index、层级历史或 `SceneDocument v2`。`buildingLevels[].id`、层名、层备注、素材实例引用和技能标记引用必须保持稳定。Mobile preview/import surface 仍不提供建筑层编辑能力。

### Approved Course Correction - 2026-06-04 Pokopia Data 独立项目抽取

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-pokopia-data-extraction.md` 增加 Epic 17，用于把 Pokopia 基础数据从本仓库和 sibling project `../pokopia-color-pattern` 抽取为新的 sibling project `../pokopia-data`。本仓库继续维护浏览器 Web 工作台与 `scene-core` 领域库；`scene-core` 通过 data package 消费基础 item/Pokemon 数据，并继续负责 SceneDocument v1、codec/recovery、footprint/stacking、occupancy、selectors 和 export summary。

`SceneDocument v1` 继续保持。旧 PSE1/PSE2、旧 autosave、`assetId`、`sceneCodecOfficialId` 和 `legacyOfficialIds` 兼容性不得回退。终端用户 Web 行为不变。后续新增 Pokopia 基础数据应优先进入 `pokopia-data`，再由 `scene-core` 和 `pokopia-color-pattern` 作为 consumer 引用；recommendation ranking、editor-specific placement rules 和 Web runtime packaging 不作为基础 data package 的首轮职责。

### Approved Course Correction - 2026-06-04 素材暂存区

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md` 增加 Epic 18，用于在 `apps/web` desktop/tablet 编辑工作台的素材区域上方提供一个素材暂存区。用户可以从素材列表拖动素材到暂存区，折叠状态下查看最近 3 个暂存素材和总数，并可移除单个素材；展开状态下暂存区占据素材面板主要高度，使用与素材区一致的素材行展示、选择和旋转交互。

`SceneDocument v1` 继续保持。素材暂存区是本地持久化的候选素材选择状态，可写入 UI preferences 或独立 localStorage key，但不得写入 `SceneDocument`、scene autosave slot、scene saved slot、PSE 字符串、export summary、footprint/stacking derived state 或 `packages/scene-core`。Mobile Preview Mode 不渲染素材暂存区，也不需要读取、恢复或写入暂存区本地存储。

### Approved Course Correction - 2026-06-05 Desktop 工作台 UI/UX 降噪

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-05-desktop-workbench-decluttering.md` 增加 Epic 19，用于在 desktop/tablet 编辑工作台中降低默认信息密度。顶部文件操作收敛为预览/导出主入口和低频文件/危险操作菜单；左侧改为场景摘要 + 建筑层主面板；底部检查器改为紧凑快捷栏 + 可展开详情区；右侧素材栏以浏览为主，素材详情按需展开；桌面工作台删除旧常驻预览面板，预览/导出进入独立模式；SceneCanvas 新增直接下一层的半透明影子作为 UI-only 辅助参考。

`SceneDocument v1` 继续保持。场景摘要展开、底部详情展开、素材详情状态、下层影子开关和文件菜单状态均为 UI-only 状态，不进入 `SceneDocument`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core` 持久契约。下层影子只作为视觉投影，不参与 placement、occupancy、stacking、replacement confirmation、height blocking 或 scene-core 规则派生。

### Approved Course Correction - 2026-06-06 SceneCanvas 缩放视口

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-06-scene-canvas-zoom.md` 增加 Epic 20，用于在 desktop/tablet 编辑工作台的中央 SceneCanvas 增加用户可控缩放。用户可以在编辑区域内通过鼠标滚轮或 macOS 触控板缩放手势调整画布缩放比例；最小缩放完整显示当前画布长边；最大缩放以默认 17x17 场景约显示 6x6 格子为上限；放大后超出编辑区域的内容在 viewport 内隐藏，不撑开页面或侧栏。

`SceneDocument v1` 继续保持。缩放比例、缩放焦点和裁切状态均为 UI-only view state，不进入 `SceneDocument`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core`。缩放不得改变 placement、occupancy、stacking、replacement confirmation、height blocking、下层影子 projection 或导出预览语义。

### What Makes This Special

本产品的差异化在于它围绕 Pokopia 布景创作的实际约束建模，而不是提供通用网格绘图或自由画布。核心规则包括：默认中心 15×15 主体区、外围 1 圈装饰区、0 层到 n 层的建筑层关系、同坐标跨建筑层放置、素材 footprint 占用与跨层阻塞、受控承载/叠放、素材实例级技能标记，以及完整 17×17 预览。

产品的核心洞察是：布景方案的复现难点不在于记录素材名称，而在于记录素材所在区域、坐标、建筑层、朝向、技能需求和预览关系。通过将这些信息结构化，编辑器可以帮助用户把灵感图、搭建步骤和最终布景数据统一到一个可继续编辑和分享的方案中。

## Project Classification

- Project Type: web_app
- Domain: general
- Complexity: low
- Project Context: greenfield

该项目是一个浏览器端编辑工具，主要复杂度集中在交互设计、网格数据模型、建筑层管理、素材检索和预览表达。不涉及受监管行业、高风险交易、医疗安全、金融合规或复杂后端流程，因此按低复杂度通用 Web App 处理。

## Success Criteria

### User Success

用户能够在一个编辑流程中完成 Pokopia 5×5 布景方案的创建、编辑、预览、保存和恢复，并且始终清楚理解 5×5 主体区与 7×7 实际编辑画布之间的关系。

用户成功的关键表现包括：能在 7×7 画布中正确摆放主体区和外围装饰区素材；能通过建筑层表达从 0 层到 n 层的高度关系；能为具体素材实例标记百变怪技能需求；能通过俯视图和正视图检查完整布景效果；能重新打开保存数据并完整还原编辑状态。

用户还应始终看到当前 Pokemon/场景摘要、当前素材、当前建筑层、选中坐标和自动保存/恢复可用性；预览/导出应通过明确独立入口保持可达，而不是依赖常驻预览面板。编辑过程不应依赖 landing page、说明页或隐藏在二级页面中的关键编辑上下文。

### Business Success

第一版成功的核心指标是产品能够作为 Pokopia 布景创作者的可用方案编辑工具，而不是停留在静态文档或概念原型。发布后应能支持用户独立完成至少一个完整 5×5 布景方案，并生成可保存、可恢复、可序列化的结构化数据。

3 个月内的成功状态：核心编辑流程稳定，用户可以完成从素材搜索、摆放、分层、技能标记到预览、保存和重新打开的闭环。12 个月内的成功状态：产品具备足够的数据结构和交互基础，可以扩展到显式导出/导入、模板、批量素材导入、更复杂正视图和更大布景尺寸。

### Technical Success

系统必须稳定维护 5×5 主体尺寸、7×7 画布尺寸、外围扩展格数、场景名称、当前 Pokemon、建筑层、层备注、素材实例、坐标、区域类型、朝向、染色、技能标记、技能备注、当前编辑建筑层、当前素材和选中坐标等核心数据。素材 footprint、旋转后占用格、跨层阻塞和承载/叠放关系必须从 asset catalog 与 SceneDocument v1 共同派生，不进入独立保存状态。自动保存、恢复、预览和图片导出数据派生必须使用同一个 SceneDocument v1 事实来源，并能完整还原 Open Design 工作台的必需持久上下文；图片导出不得维护第二套业务状态。

编辑操作应即时响应；7×7 画布、建筑层切换、素材放置、删除、技能标记切换和预览切换不应出现明显卡顿。素材数量增长时，素材列表应支持分页或虚拟滚动，保证搜索和筛选仍可快速返回结果。

### Measurable Outcomes

- 用户可以创建、编辑并保存一个包含 7×7 画布、至少 3 个默认建筑层和多个素材实例的布景方案。
- 用户可以选择当前 Pokemon、编辑场景名称，并通过自动保存和重新打开恢复验证布景状态。
- 用户可以在右侧浮动素材栏中搜索素材、按分类筛选、只显示喜好素材，并看到当前素材和固定宽度结果计数。
- 系统能够准确识别任意坐标属于主体区还是外围装饰区。
- 用户可以在主体区和外围装饰区放置、删除和替换素材；MVP 不支持移动已放置素材。
- 用户可以创建、重命名、删除和复制建筑层，并在左侧建筑层面板中看到 L2/L1/L0 这种高层到低层的视觉顺序，同时数据仍按 0 层到 n 层组织；MVP 不支持建筑层隐藏或锁定状态。
- 用户可以为每个建筑层维护多条备注，备注随建筑层保存、恢复并按层导出。
- 预览按建筑层层号从 0 层到 n 层渲染所有可见建筑层。
- 用户可以在素材放置前或放置后设置百变怪技能标记。
- 技能标记在画布和保存数据中保持一致，技能类型使用 `树叶`、`耕地`、`储水` 词表，并以一字标签辅助识别；预览不显示技能标记。
- 可染色素材在格子内显示染色入口和当前颜色；非默认朝向只在 90/180/270 度时显示旋转标记，默认 0 度不额外占用画布信息层。
- 大于 1x1 或 height 大于 1 的素材能够在画布、俯视预览、正视预览和图片导出中按 footprint 跨格或跨层表达；由 height 派生的上方阻塞格不可被保存为独立 state。
- 盘子、木盘子和派对拼盘能够承载食物；已审计底垫、地毯、嫩芽和低高度素材能够按 catalog rules 允许兼容叠放；承载/叠放关系不可被保存为独立 state。
- 独立预览/导出在按需打开时展示整体素材清单、逐层图形、逐层素材清单和层备注。
- 自动保存数据重新打开后，场景名称、Decor Dex Pokemon key、画布、建筑层、层备注、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、朝向、染色、技能标记和技能备注能够完整还原；footprint、阻塞状态和承载/叠放关系按当前 asset catalog 重新派生。
- 搜索词、分类/区域/技能筛选和 favorite-only 不会写入 SceneDocument payload，但会在同一浏览器的 localStorage 中恢复。预览网格、主体边界和技能标记不提供显示选项。
- 用户可以打开图片导出预览，并下载一张包含整体使用素材、每层图形、跨格素材 footprint、每层使用素材和每层备注的布景说明图片。

MVP 验收时应使用至少 1 个完整布景方案作为验收场景，包含 Decor Dex Pokemon key、场景名称、7×7 画布、默认 3 个建筑层、当前编辑建筑层、当前素材、选中坐标、主体区素材、外围装饰区素材、至少 1 个技能标记、可染色素材、非默认朝向素材、俯视图预览、正视图预览、自动保存和重新打开流程。验收通过标准是上述结果均可在同一 Open Design 工作台中复现，且重新打开的数据与自动保存前的 SceneDocument v1 payload 语义一致。

## Product Scope & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** 问题解决型 MVP。第一版必须证明用户可以用结构化方式完成一个可复现的 Pokopia 5×5 布景方案，而不是只做静态展示或概念原型。

**Resource Requirements:** MVP 至少需要前端实现能力、基础产品/交互判断能力，以及可维护素材数据结构的人。若资源有限，应优先保证编辑数据模型、画布交互、建筑层管理、技能标记、独立预览/导出、保存状态和重新打开恢复闭环。

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- 布景创作者完成一个完整 5×5 布景。
- 用户修正错误摆放和层级问题。
- 素材维护者能提供可搜索、可筛选、可展示的素材元数据。
- 用户能通过保存、自动保存状态和重新打开验证布景方案可复现。

**Must-Have Capabilities:**

- Open Design 工作台第一屏：顶部预览/导出主入口、低频文件操作菜单、右侧 Asset Picker、中央尺寸驱动画布、左侧 Building Level Panel 和底部紧凑 Selection Inspector；预览/导出通过独立模式打开。
- 默认 17×17 编辑画布，并兼容 legacy 7×7 恢复。
- 中心 15×15 主体区边界和外围装饰区显示。
- 主体区和外围装饰区的坐标、区域类型识别。
- 素材列表、缩略图、名称、分类、标签、适用区域和 `No.` 官方素材 ID 展示。
- 素材搜索、分类筛选、喜好素材筛选、适用区域筛选和技能相关筛选。
- 当前素材固定展示，素材结果计数使用稳定宽度，不因数字变化挤压布局。
- 当前素材选择、素材放置、删除、替换和旋转；所有素材均可旋转，且 90/270 度旋转会交换 footprint length/width 占用格。
- Asset catalog 提供素材 footprint 元数据；未覆盖素材默认 1x1x1，真实大素材通过 override 增补。
- 放置、替换和预览前反馈必须使用 footprint 计算同层占用、跨层阻塞和画布边界越界。
- Asset catalog 提供素材承载/叠放元数据；盘子、木盘子、派对拼盘可以承载食物，已审计的底垫、地毯、嫩芽和低高度素材可以允许兼容物品同层叠放或放到其上方。
- 建筑层创建、删除、重命名、复制和当前编辑层设置；MVP 不提供建筑层隐藏、显示、锁定或解锁。
- 按 0 层到 n 层维护建筑层；在工作台左侧按高层到低层视觉顺序展示，例如 L2、L1、L0。
- 每个建筑层可以维护多条层备注；层备注属于建筑层级别的场景数据，不恢复普通素材实例备注 `note`。
- 素材实例级百变怪技能标记、技能类型和技能备注。
- 技能类型词表限定为 `树叶`、`耕地`、`储水`，画布技能标记显示对应的一字标签。
- 可染色素材的格内染色入口、颜色选择和颜色状态显示。
- 非默认朝向的格内旋转标记；0 度默认状态不显示额外旋转标记。
- 选中格上下文区域或检查器字段，支持查看和编辑坐标、区域、素材、建筑层、朝向、技能标记、技能备注和当前建筑层备注。
- 独立预览/导出展示整体素材清单、逐层图形、逐层素材清单和层备注；预览内容从 SceneDocument 派生，不提供持久化显示选项。
- 自动保存和本地重新打开恢复；MVP 不提供手动保存入口，也不要求展示 dirty/saved/saveError 状态。
- SceneDocument v1 结构化序列化和恢复校验，用于保存、自动保存、恢复、roundtrip 校验和图片导出数据派生；图片导出必须从同一 SceneDocument v1 和 asset catalog 派生，不维护第二套导出业务状态或保存派生阻塞状态。
- 用户可以在导出前预览一张布景说明图片，并将该图片下载到本机；图片必须包含整体使用的素材、每层的图形、跨格 footprint 表达、每层使用的素材和每层备注。
- 重新打开自动保存数据后完整还原场景名称、Decor Dex Pokemon key、画布、建筑层、层备注、当前编辑建筑层、当前素材、选中坐标、素材、坐标、区域、朝向、染色、技能标记和技能备注。
- 素材搜索词、分类/区域/技能筛选和 favorite-only 使用 localStorage 保存为浏览器本地 UI 偏好，不进入 SceneDocument v1 payload。
- 基础恢复校验，字段缺失时给出明确错误提示。

### Post-MVP Features

**Phase 2 (Post-MVP):**

- pnpm workspace monorepo：`apps/web` 承载现有 React 浏览器工作台，`apps/worker` 承载 Cloudflare Worker HTTP API/MCP，`packages/scene-core` 承载共享领域逻辑。
- 无状态 Cloudflare Worker 服务，提供布景生成、校验、恢复、导出摘要、短字符串 encode/decode 和素材查询 API。
- Streamable HTTP MCP server 与 repo-scoped Codex skill，用于 agent 调用同一套 scene-core 规则。
- 素材批量导入。
- 布景模板。
- 显式 JSON 导出/导入 UI。
- 分享链接、云同步、账号、公开方案库和在线发布。
- 更完整的素材标签体系和高级筛选。
- 更复杂的正视图遮挡表达。
- 更多技能类型。
- 更多视角预览。
- 更大布景尺寸和可配置外围扩展格数。

**Phase 3 (Expansion):**

- 布景方案库。
- 分享链接。
- 协作编辑。
- 自动生成布景。
- 复杂遮挡关系计算。
- 围绕素材、技能和建筑层的高级布景规划能力。

### Out of Scope / Non-Goals

MVP 不包含账号系统、云端同步、协作编辑、公开方案库、分享链接、AI 自动生成完整布景、素材批量导入、显式 JSON 导出/导入 UI、从导出图片或 JSON 导入恢复布景、复杂遮挡关系计算、真实游戏视角模拟、更大布景尺寸、可配置外围扩展格数、移动端完整编辑体验、原生设备能力、推送通知、支付、隐私档案或后端管理控制台。

MVP 同样不包含：建筑层隐藏/显示/锁定/解锁、手动保存、dirty/saved/saveError 状态区分、Undo/Redo、素材空状态恢复动作、放置时素材适用区域阻断校验、任意/通用同层素材堆叠、素材实例移动、普通实例备注 `note`、按素材区分是否可旋转，以及预览网格/主体边界/技能标记显示开关。

MVP 的保存、自动保存、结构化序列化和恢复能力只覆盖单个布景方案的数据闭环，不承诺跨用户权限、在线发布、多人合并或版本历史。当前新增的导出入口只覆盖图片导出预览和图片下载；SceneDocument v1 作为内部事实来源参与导出数据派生，但 JSON 文件导出/导入 UI 仍是 Post-MVP，不作为 Epic 6 的用户可见交付。Epic 7 的 Worker/MCP/Codex skill 服务化也不得被解释为云保存、账号、分享链接、在线发布或服务端图片生成。Epic 8 的 footprint 占用和 height 阻塞属于规则化矩形占用，不等同于复杂真实视角遮挡模拟。Epic 11 的承载/叠放只覆盖 catalog 明确标记的兼容关系，不提供自由 z-index、手动排序、多对象组合绑定或复杂物理支撑模拟，也不得引入 `SceneDocument v2`、保存 stacking relation、保存 blocking cells、实例级 footprint override 或可配置画布尺寸，除非另行完成新的 course correction。

### Risk Mitigation Strategy

**Technical Risks:** 最大风险是编辑状态、预览状态和保存/恢复数据不一致。缓解方式是以单一场景数据结构作为状态来源，所有画布、上下文/属性字段、建筑层、预览和序列化结果都从同一数据模型派生。

**Market Risks:** 最大风险是工具虽然功能完整，但不符合 Pokopia 创作者真实搭建习惯。缓解方式是用第一版验证完整闭环：用户能否从空白画布创建、修正、预览、保存并复现一个真实布景方案。

**Resource Risks:** 如果资源不足，不应削减 7×7 画布、建筑层、技能标记、独立预览/导出、保存和恢复这些核心闭环。可以优先简化高级预览细节、显式导出/导入、批量导入、模板、分享和协作能力。

## User Journeys

### Journey 1: 布景创作者完成一个完整 5×5 布景

小林想把一个 Pokopia 布景灵感整理成可复现方案。她打开编辑器后直接进入 Open Design 工作台：顶部可选择 Pokemon 并编辑场景 `Name`，中央是 7×7 画布，中心 5×5 主体边界清晰标出，外围一圈被标记为装饰区。她从右侧浮动素材栏搜索地面、植物、家具和外立面素材，按分类或喜好筛选后逐个放置到当前建筑层。

当她需要表达屋顶、墙体边缘和遮挡物时，她创建更高建筑层，并在左侧建筑层面板中看到 L2、L1、L0 的高低关系。她在部分素材上勾选百变怪技能标记，选择 `树叶`、`耕地` 或 `储水` 之一；为可染色素材选择颜色；旋转素材时只在非默认方向看到旋转标记。完成后，她打开独立预览/导出确认整体素材清单、逐层图形、逐层素材清单和层备注，保存状态变为已保存，之后重新打开仍能恢复同一个结构化布景方案。

该旅程揭示的能力包括：7×7 网格编辑、5×5 主体边界、Pokemon/场景名上下文、素材搜索/分类/喜好筛选、素材放置、建筑层管理、技能标记、染色、旋转、独立预览/导出、保存状态和重新打开恢复。

### Journey 2: 用户修正错误摆放和层级问题

阿诚已经搭好一个布景草稿，但发现外围墙体放进了主体区，屋檐也被放在了错误建筑层。他选中问题格子后，上下文区域或检查器字段显示坐标、区域类型、当前建筑层、素材名称、朝向和技能标记。他将外围墙体移动到外圈坐标，把屋檐调整到更高建筑层，并删除一个误放的装饰素材。

修正过程中，他临时隐藏上层建筑层来检查底层地面，锁定已完成的 0 层避免误改。切换预览后，他发现某个隐藏层没有参与预览，从而确认隐藏/显示逻辑符合预期。完成修正后，他重新保存，下一次打开时所有坐标、层级和技能标记都能还原。

该旅程揭示的能力包括：选中格属性查看、素材移动/删除/替换、建筑层隐藏/显示/锁定、跨建筑层调整、预览状态反馈、保存数据完整还原。

### Journey 3: 素材库维护者补充和整理素材

维护者需要让右侧素材栏足够好用。他为素材维护官方素材 ID、名称、分类、标签、适用区域、喜好标记、默认技能需求、footprint、承载/叠放规则、是否可染色和缩略图地址。为了让用户能快速找到外立面、植物、路径和特殊素材，他检查分类筛选、喜好筛选、适用区域筛选、技能相关筛选和承载/叠放状态是否能正确命中素材，并确认素材行用 `No.` 展示官方素材 ID。

当素材数量增长时，他需要确认列表仍能快速搜索和筛选，必要时启用分页或虚拟滚动。若某个素材既可用于主体区又可用于外围区，他将适用区域标为通用，避免用户误以为只能放在一个区域。

该旅程揭示的能力包括：素材元数据结构、官方素材 ID、分类与标签体系、喜好字段、适用区域字段、默认技能标记、可染色字段、缩略图展示、搜索索引、筛选逻辑和大素材列表性能策略。

### Journey 4: 用户排查保存或恢复数据无法复现的问题

用户重新打开之前保存的布景后，发现层级或技能标记不一致。用户回到编辑器检查恢复状态，系统应能让她确认 sceneId、sceneName、selectedPokemonKey、sceneSize、canvasSize、outerPadding、buildingLevels、tileInstances、workspaceState.currentBuildingLevelId、workspaceState.selectedAssetId、workspaceState.selectedCoordinate、坐标、areaType、levelId、rotationDegrees、requiresSkill、skillType、skillNote 和 dyeColor 是否完整存在，并能解释 footprint、height blocking 与承载/叠放关系是由当前 catalog 重新派生的结果。

如果重新打开数据时发现字段缺失，系统需要给出明确错误提示，而不是静默丢失素材或错误渲染。用户修复数据或重新保存后，再次打开方案，确认场景名称、Pokemon、画布、建筑层、当前编辑上下文、素材、坐标、区域、朝向、染色、技能标记和备注全部还原。

该旅程揭示的能力包括：保存结构完整性、保存/恢复一致性、恢复校验、错误提示、字段缺失处理和数据可复现性验证。显式 JSON 导出/导入 UI 当前不属于 Open Design UI 的暴露能力；图片导出只从 SceneDocument v1 和 asset catalog 派生可阅读图片，不提供导入或从文件恢复场景。

### Journey Requirements Summary

这些旅程共同要求产品具备以下能力：稳定的 7×7 画布模型、明确的 5×5 主体区和外围装饰区判断、素材实例级数据记录、建筑层状态管理、可编辑上下文/检查器字段、技能标记生命周期、染色与旋转状态、独立预览/导出、素材库元数据、可扩展搜索筛选、保存/自动保存状态，以及可验证的数据还原机制。

MVP 应优先覆盖布景创作者的完整闭环和错误修正路径；素材库维护能力需要至少满足手动维护元数据和可筛选展示；排障能力在第一版至少应体现为保存结构稳定、重新打开可还原、字段缺失可提示。

## Web App Specific Requirements

### Project-Type Overview

Pokopia 布景编辑器应作为浏览器端 Web App 提供核心编辑体验。产品首要形态是单页应用，用户应能在一个页面内完成 Pokemon/场景名设置、素材搜索、画布编辑、建筑层管理、属性修改、独立预览/导出、保存状态确认和重新打开恢复，不需要在多个页面之间频繁跳转。

该 Web App 的核心交互是高频编辑型工作流，而不是内容浏览型网站。界面应优先保证中央尺寸驱动画布、右侧素材浏览栏、左侧建筑层面板、底部当前选择快捷栏和顶部预览/导出入口之间的操作效率、状态反馈和数据一致性。

### Technical Architecture Considerations

应用应采用客户端优先的数据模型管理尺寸驱动画布、建筑层、素材实例、技能标记和预览状态。MVP 可以优先使用本地状态和 SceneDocument 保存/恢复完成闭环；后续如引入显式导出/导入、分享、模板库或协作能力，再扩展文件入口、后端存储或同步机制。过滤、搜索、favorite-only 和预览显示选项属于浏览器本地 UI 偏好，应单独写入 localStorage，不污染 SceneDocument payload。

核心编辑状态应具有明确的单一数据来源，避免画布、上下文/属性字段、预览和保存数据之间出现分叉。所有用户操作，包括放置、删除、移动、替换素材、切换建筑层、修改技能标记、修改染色和更新备注，都应反映到同一个场景数据结构中。

### Browser Matrix

MVP 应支持当前主流桌面浏览器的现代版本，包括 Chrome、Edge、Safari 和 Firefox。优先优化桌面浏览器体验，因为编辑器包含多面板布局、网格画布、素材列表、建筑层面板、选择检查器和独立预览/导出，主要使用场景更接近桌面创作工具。

移动浏览器不是完整编辑目标。`<768px` 下进入 Mobile Preview Mode：系统读取本地保存布景并以内联下载预览形式展示；没有本地记录时显示“导入字符串”入口。移动端隐藏桌面工作台编辑控件、素材栏、建层、重置、上下文编辑和染色控件，保证页面不崩溃、布景说明内容可读、主要状态不重叠。

### Responsive Design

桌面端应采用 Open Design 工作台布局：右侧素材浏览栏、中央尺寸驱动编辑画布、左侧建筑层面板、底部当前选择快捷栏、顶部预览/导出和文件操作入口应同时可见或易于访问。默认 17×17 画布可使用内部滚动、缩放或稳定压缩；画布应保持稳定比例，避免因素材结果、建筑层状态或检查器详情变化导致网格尺寸跳动。

1024-1279px 时左侧建筑层仍应可见，右侧素材栏可收窄；768-1023px 时面板可变成 tabbed drawer，但画布和当前上下文仍保持可见；768px 以下进入 Mobile Preview Mode。移动端不再展示完整工作台，而是展示本地保存布景的 inline 下载预览内容，或在无记录时展示“导入字符串”入口。

### Performance Targets

默认 17×17 画布显著大于早期 7×7 基线，常规编辑操作仍应即时响应。素材放置、删除、选中格切换、建筑层切换、技能标记切换和预览模式切换应在用户感知上无明显延迟，具体性能目标以 NFR1、NFR2 和 NFR51 为准。

素材列表在数据量增长时必须避免拖慢编辑主流程。搜索和筛选应在输入后快速返回结果；当素材数量较多时，应支持分页、虚拟滚动或等效机制，避免一次性渲染大量缩略图造成卡顿。

### SEO Strategy

MVP 的主要价值在编辑工具本身，不依赖搜索引擎发现来完成核心体验。因此 SEO 不是核心功能要求。基础页面仍应提供明确标题、描述和项目名称，便于收藏、分享链接和浏览器标签识别。

如果后续引入公开布景方案、模板库或分享页面，再为这些可公开访问内容补充结构化标题、描述、预览图和可索引页面。

### Accessibility Level

MVP 应满足基础可访问性要求：所有主要按钮和表单控件应有可理解名称；图标按钮应有文本标签或可访问标签；键盘用户应能访问主要工具栏、素材搜索、筛选、建筑层列表和属性编辑控件。

画布类交互可以优先支持鼠标编辑，但关键数据不应只通过颜色表达。主体区、外围装饰区、选中格、锁定层和技能标记应通过视觉形态、图标、文本或状态说明组合表达，避免仅依赖单一颜色差异。

### Implementation Considerations

MVP 不需要原生设备能力、移动端权限、推送通知或 CLI 命令。实现重点应放在稳定的数据结构、可预测的编辑状态、清晰的 UI 状态反馈、SceneDocument 保存/恢复和基础恢复校验。

后续架构应为扩展能力留出空间，包括更大画布、可配置外围扩展格数、更多技能类型、批量素材导入、模板库、分享链接和协作编辑。

## Functional Requirements

### Scene & Canvas Model

- FR1: 用户可以创建一个标注为 5×5 布景的场景。
- FR2: 系统可以为新建场景默认提供 `sceneSize=15x15`、`outerPadding=1`、`canvasSize=17x17` 的实际编辑画布。
- FR3: 系统可以识别并区分中心 15×15 主体区和外围 1 圈装饰区；旧 7×7 场景按自身保存尺寸继续恢复。
- FR4: 系统可以为每个画布格子维护 0-based x/y 坐标。
- FR5: 用户可以在主体区和外围装饰区放置布景内容。
- FR6: 用户可以查看当前格子属于主体区还是外围装饰区。
- FR7: 用户可以选择画布格子作为当前编辑对象。

### Open Design Workbench Context

- FR56: 用户可以在工作台顶部左侧查看并切换当前 Pokemon，Pokemon 选择器支持搜索匹配和当前选择状态。
- FR57: 用户可以编辑场景 `Name`，并在同一上下文中看到 dirty/saved 状态和保存动作结果。
- FR58: 工作台必须以中央尺寸驱动画布和当前建筑层编辑为视觉中心；新建场景默认显示 17×17 画布，同时保留右侧素材浏览、左侧建筑层主面板、底部当前选择快捷栏和顶部预览/导出主入口。场景设置、文件操作、素材详情、层备注和预览/导出必须按需展开或进入独立模式，不再要求常驻预览面板。

### Asset Placement & Editing

- FR8: 用户可以选择当前要放置的素材。
- FR9: 用户可以将素材放置到当前建筑层的指定格子。
- FR10: 用户可以删除指定格子中的素材。
- FR11: 用户可以用新素材替换同一建筑层同一格子的已有素材。
- FR12: 用户可以在不同建筑层的同一坐标放置不同素材。
- FR13: [Removed from MVP 2026-05-19] 系统不根据素材属性提供同层堆叠能力；同一建筑层同一格子采用替换/删除语义。
- FR14: [Removed from MVP 2026-05-19] 用户不能移动已放置素材到其他格子；修正位置通过删除后重新放置完成。
- FR15: [Removed from MVP 2026-05-19] 用户不能将已放置素材移动到其他建筑层；跨建筑层修正通过删除后重新放置完成。
- FR16: 用户可以为所有已放置素材设置朝向，朝向值固定为 `0 | 90 | 180 | 270`。
- FR17: [Removed from MVP 2026-05-19] MVP 不提供素材移动，因此不要求移动时保留字段。
- FR18: [Removed from MVP 2026-05-19] MVP 不提供普通实例备注 `note` 维护。

### Building Level Management

- FR19: 用户可以创建新的建筑层。
- FR20: 系统可以在新建场景时默认创建 0 层、1 层、2 层三个建筑层，并为用户新增建筑层分配当前最高层号加 1 的层号。
- FR21: 用户可以删除建筑层。
- FR22: 用户可以重命名建筑层。
- FR23: 用户可以复制建筑层。
- FR24: 用户可以设置当前编辑建筑层。
- FR25: [Removed from MVP 2026-05-19] MVP 不提供建筑层隐藏或显示状态。
- FR26: [Removed from MVP 2026-05-19] MVP 不提供建筑层锁定或解锁状态。
- FR27: 系统可以按建筑层层号从 0 层到 n 层组织和展示布景内容。
- FR87: 用户可以为每个建筑层维护多条备注，备注按建筑层归属保存和列出。
- FR88: 每条层备注至少包含稳定 id 和正文 text；用户可以新增、编辑和删除备注，备注列表顺序必须稳定。

### Asset Catalog & Selection

- FR28: 用户可以浏览素材列表。
- FR29: 用户可以查看素材缩略图、名称、分类、标签、适用区域、footprint 和带 `No.` 前缀的官方素材 ID。
- FR30: 用户可以通过关键词搜索素材。
- FR31: 用户可以按素材分类筛选素材。
- FR32: 用户可以按适用区域筛选素材。
- FR33: 用户可以按技能相关条件筛选素材，包括是否默认需要百变怪技能、技能类型和是否可作为本次放置的技能标记候选。
- FR34: 用户可以查看素材详情，详情至少包含素材 ID、名称、分类、标签、适用区域、喜好状态、默认技能需求、footprint、承载/叠放能力、是否可染色和缩略图；所有素材均视为可旋转，MVP 不展示旧式通用可叠放开关。
- FR35: 素材维护者可以为素材维护分类、标签、适用区域、喜好状态、默认技能需求、可染色性、footprint、承载/叠放 surface metadata 和缩略图地址；MVP 不维护可旋转性差异或自由叠放开关。
- FR59: 用户可以只显示当前 Pokemon 喜好的素材，筛选结果计数应保持稳定宽度并通过可访问方式更新。
- FR124: `apps/web` desktop/tablet 编辑工作台的素材区域上方必须提供“素材暂存区”，允许用户从素材列表拖动素材进入暂存区；desktop/tablet read-only 不得允许写入暂存区或触发 scene edit command。
- FR125: 暂存区折叠状态必须显示最后放入的 3 个素材和暂存区素材总数；每个暂存素材只显示缩略图、名称和右上角删除按钮。删除只移出暂存区，不删除 scene 中已放置素材。
- FR126: 暂存区底部必须提供展开入口。点击后暂存区占据素材面板约 80% 高度，原素材区域下沉并占据约 20% 高度；展开状态必须可滚动且有可访问的收起入口。
- FR127: 暂存区展开后必须用与素材区一致的素材行/card 视觉和主要交互展示所有暂存素材，包括点击选择、连续放置表达、当前选中状态和非 1x1 素材的旋转按钮；暂存区不按 category/type 分组。
- FR128: 暂存区状态必须写入本地存储，至少保留暂存 `assetId` 顺序和展开/折叠状态；本地存储读取失败、版本不匹配或包含未知素材时必须安全回退或过滤。
- FR129: 暂存区状态不得写入 `SceneDocument v1`、scene autosave slot、scene saved slot、scene string codec、PSE 导出字符串、export summary 或任何 `scene-core` 领域状态。
- FR130: `<768px` Mobile Preview Mode 不得渲染素材暂存区、暂存区展开/收起入口、暂存删除按钮或暂存旋转按钮；mobile 不需要读取、恢复或写入暂存区 localStorage。

### Desktop Workbench Decluttering

- FR131: Desktop 顶部工具栏必须收敛低频文件操作：预览/导出作为高频主入口，导入字符串、导出字符串和重置仍需在 1-2 步内可达；重置必须作为危险操作与普通导入/导出区分。
- FR132: 左侧面板必须默认显示场景摘要，摘要至少表达场景名、当前 Pokemon 和画布尺寸；完整场景名输入、Pokemon 选择和画布宽高控件只在展开后显示。展开/折叠状态属于 UI-only preference，不进入 `SceneDocument`。
- FR133: 建筑层面板必须成为左侧主工作区，在 1280x720 desktop 下比完整场景表单默认展开时展示更多建筑层；当前层明显可见，非当前层降低视觉重量，并保留 Epic 16 整行拖拽排序和键盘 fallback。
- FR134: 底部检查器必须拆为稳定高度的当前选择快捷栏和可展开详情区。快捷栏展示当前素材/空状态、坐标/建筑层摘要、旋转、删除和树叶/耕地/储水技能按钮；层备注、技能备注和未来实例详情进入详情区。
- FR135: 右侧素材栏必须以浏览为主，并提供普通用户可见的素材详情入口。详情展示名称、缩略图、官方编号、assetId、分类、标签、Pokemon 喜好、footprint、可旋转、可染色、可叠放/特殊规则和当前待放置旋转状态；查看详情不得隐式选择素材。
- FR136: Desktop 编辑工作台不得常驻显示旧预览面板。预览/导出必须作为独立模式、modal 或页面内切换模式存在，并支持整体素材清单、逐层图形、逐层素材清单、下载整体图片和按层下载图片。
- FR137: SceneCanvas 必须支持“下层影子”辅助模式：编辑 L(n) 时显示直接下一层 L(n-1) 的半透明素材参考，L0 不显示。影子按 lower layer 的 footprint、rotation 和 dye 渲染，不显示技能标记或操作 affordance。
- FR138: 下层影子不可选中、不可删除、不可旋转、不可触发检查器；点击影子所在格仍按当前层选择/放置逻辑执行。影子和其开关状态不得写入 `SceneDocument`、PSE 字符串、export payload、autosave payload 或 scene-core 规则状态。

### SceneCanvas Zoom Viewport

- FR139: Desktop/Tablet 编辑工作台的中央 SceneCanvas 必须支持用户通过编辑区域内鼠标滚轮调整缩放比例；滚轮只在编辑区域内拦截，外部面板滚动不受影响。
- FR140: macOS 触控板缩放手势必须映射到同一套 zoom state；Chromium/Firefox 可使用 wheel pinch delta，Safari 需要通过受保护的 gesture 兼容路径或等效策略支持。
- FR141: 最小 zoom 必须完整显示当前画布长边。默认 17x17、legacy 7x7 和矩形画布都必须从 `scene.canvasSize` 派生 min zoom，不得写死 17 或 7。
- FR142: 最大 zoom 必须以“画面内显示约 6x6 格子”为上限；默认 17x17 场景最大 zoom factor 为 `17 / 6`，其他尺寸按 `max(canvas.width, canvas.height) / 6` 派生，并至少为 1。
- FR143: 超出编辑区域 viewport 的 SceneCanvas 内容必须被隐藏，不产生页面级横向滚动条；缩放不得改变坐标、素材实例、放置规则、selected/hover/focus 语义或 export preview 内容。

### Asset Footprint & Occupancy Rules

- FR78: Asset catalog 必须为每个可放置素材提供 `footprint.length`、`footprint.width`、`footprint.height` 三个正整数；现有素材默认 1x1x1，真实大素材通过集中 override 覆盖。
- FR79: `scene-core` 必须根据素材 footprint 和 `rotationDegrees` 派生有效占用尺寸；0/180 度使用原 length/width，90/270 度交换 length/width，height 不随旋转变化。
- FR80: 放置、替换、保存校验和恢复校验必须检查素材 footprint 的所有占用格均在当前 SceneDocument 的 `canvasSize` 内，并且同一建筑层内不同实例的 footprint cells 不得重叠，除非 Epic 11 stacking surface 规则明确允许。
- FR81: 当素材 footprint height 大于 1 时，`scene-core` 必须在上方建筑层对应 footprint cells 派生 blocking cells；这些 blocking cells 在画布中显示为不可放置，但不得写入 SceneDocument payload。
- FR82: 放置预览必须显示跨格 footprint、将被替换或阻塞的格子、越界原因和跨层阻塞来源；错误提示应包含阻塞 instance id、asset id、building level 和坐标。
- FR83: 编辑画布、俯视预览、正视预览和图片导出必须按 effective footprint 跨格渲染大素材；导出摘要 JSON 必须包含每个实例的 footprint、effectiveFootprint 和 occupiedCells。
- FR84: 保存/恢复和短字符串继续使用 `SceneDocument v1`；短字符串不得编码 footprint 或 blocking cells，decode 后必须通过当前 asset catalog 与 `scene-core` occupancy rules 重新派生。
- FR85: Worker validate/recover/export-summary、MCP tools/resources/prompts 和 Codex skill 必须调用同一套 `scene-core` footprint/occupancy helpers，不得复制 schema、catalog override、占用计算或跨层阻塞规则。
- FR86: 旧 SceneDocument v1 payload 和旧短字符串迁移时不改写 shape；若当前 catalog footprint 使旧场景产生越界、同层重叠或跨层阻塞冲突，恢复/校验必须返回结构化错误或修复建议，而不是静默调整坐标或保存派生状态。

### Asset Carrying & Stacking Surface Rules

- FR93: Asset catalog 必须为每个可放置素材提供默认 stacking metadata，默认值表示不可承载、不可被同层 overlap；明确 override 才能开启承载面或底垫/低高度叠放能力。
- FR94: `wooden-plate`、`plate`、`party-platter` 必须被标记为 food surface，只允许 `food` category 或等价已审计食物素材作为 top item 放置在其 footprint cells 上。
- FR95: 已审计的底垫、地毯、嫩芽和低高度素材可以被标记为 floor-cover 或 low-height surface；系统不得仅凭名称包含“垫”“地毯”“嫩芽”自动开放叠放，必须来自 catalog override。
- FR96: `scene-core` placement、save validation 和 recover validation 必须允许同层 occupied cell overlap 仅在 existing base instance 的 stacking metadata 允许 incoming asset category，且 incoming footprint 覆盖范围被 base surface 覆盖或规则明确允许时成立。
- FR97: 不兼容叠放必须返回结构化 conflict，至少区分 unsupported stack surface、surface capacity/conflict、same-level footprint overlap 和 height-blocked-by-lower-footprint。
- FR98: 承载/叠放关系必须从当前 SceneDocument v1 与 asset catalog 派生，不保存 parent/child stack id、surface id、z-index、stacking relation 或 catalog snapshot。
- FR99: Web 编辑画布、素材详情、选中实例检查器、俯视/正视预览和图片导出必须表达承载/被承载/可叠放/不兼容叠放状态；合法同格叠放应把原始格子或对应 footprint cell 拆成上下两部分，下半部分显示可叠放 base 素材，上半部分显示 top 素材；不兼容叠放应显示浅红/红色冲突提示并说明原因；选择同坐标多个实例时必须保持可理解。
- FR100: Worker validate/recover/export-summary、MCP tools/resources/prompts 和 Codex skill 必须复用同一套 `scene-core` stacking helpers；导出摘要可以包含 derived stacking relation，但不得把它写回 SceneDocument 或短字符串。

### Scene Size Expansion & Legacy Compatibility

- FR101: 新建默认场景必须使用 `sceneSize: { width: 15, height: 15 }`、`outerPadding: 1`，并派生 `canvasSize: { width: 17, height: 17 }`。
- FR102: `scene-core` 必须从 `SceneDocument.sceneSize`、`canvasSize` 和 `outerPadding` 派生坐标范围、`areaType`、main boundary、canvas cells、footprint bounds、occupancy、stacking relation 和 export summary，不得在业务路径写死 7x7。
- FR103: SceneDocument v1 JSON shape 保持不变；schema 必须校验 `canvasSize = sceneSize + outerPadding * 2`，并允许当前支持的 legacy 7x7 payload 与新默认 17x17 payload。
- FR104: 旧 7x7 SceneDocument v1 JSON payload 恢复时必须保留原尺寸和坐标，不得静默扩展到 17x17、重写 `areaType` 或移动实例；若旧 payload 本身冲突，仍返回结构化错误。
- FR105: PSE1 legacy 短字符串继续按 7x7 语义解码；新的短字符串必须编码 scene dimensions 或使用新的 codec revision，以免 17x17 场景被误解码为 legacy 7x7。
- FR106: Web 编辑画布、Selection Inspector、独立 Export Preview、Mobile inline preview、image export、i18n 文案和 aria label 必须使用 `{width}x{height}` 或 scene-derived labels，不得写死 7x7。
- FR107: Worker validate/recover/export-summary、MCP tools/resources/prompts 和 Codex skill 必须返回或保留 scene dimensions，并与 Web direct-call tests 对 7x7 legacy 和 17x17 default 得到一致结果。
- FR108: 16x16 不是本次目标；本次尺寸模型明确为 `sceneSize=15x15`、`outerPadding=1`、`canvasSize=17x17`。

### Ditto Skill Marking

- FR36: 用户可以在放置素材前设置本次放置是否需要百变怪技能。
- FR37: 用户可以在放置后修改素材实例的技能标记。
- FR38: 用户可以为素材实例维护技能类型。
- FR39: 用户可以为素材实例维护技能备注。
- FR40: 系统可以在画布中标识需要百变怪技能的素材实例；预览固定不显示技能标记。
- FR60: 技能类型词表必须使用 `树叶`、`耕地`、`储水`，画布中的技能标记应显示对应的一字标签。
- FR61: 用户可以为可染色素材实例选择颜色；系统应在格子中显示染色入口和当前颜色。
- FR62: 系统只在 90、180、270 度朝向时显示格内旋转标记，默认 0 度朝向不显示额外标记。

### Preview

- FR41: 用户可以在工作台中查看俯视图预览。
- FR42: 俯视图可以展示当前 SceneDocument 的完整画布内容；新建场景默认为完整 17×17 画布。
- FR43: [Removed from MVP 2026-05-19] 俯视图不展示 5×5 主体区边界；主体区边界由主画布表达。
- FR44: 用户可以在工作台中查看正视图预览。
- FR45: 正视图可以展示主体区、外围装饰区和建筑层高度关系。
- FR46: 用户可以选择预览当前建筑层或全部建筑层。
- FR47: [Removed from MVP 2026-05-19] 用户不能控制预览中是否显示网格、主体边界和技能标记；预览固定不显示这三类覆盖信息。
- FR63: 工作台预览/导出必须通过独立模式展示整体素材清单、逐层图形、逐层素材清单和层备注。

### Properties, Save & Recovery

- FR48: 用户可以查看选中格子的坐标、区域类型、建筑层、素材、朝向、染色、技能标记和技能备注。
- FR49: 用户可以在上下文/检查器字段中修改选中素材的素材选择、朝向、染色、技能标记和技能备注；MVP 不提供普通备注或建筑层归属移动。
- FR50: 系统可以自动保存当前布景数据并在重新打开时恢复最新有效草稿；自动保存必须写入与后续显式导出完全相同的 SceneDocument v1 payload。MVP 不提供手动保存入口，也不要求展示 dirty/saved/saveError 状态。
- FR51: 系统可以将当前布景数据序列化为结构化 SceneDocument v1，用于保存、自动保存、恢复、roundtrip 校验和后续显式导出；当前 Open Design 工作台不暴露显式导出入口，但不允许存在第二套导出数据结构。
- FR52: 系统可以在保存和序列化数据中包含 `sceneId`、`sceneName`、`selectedPokemonKey`、场景尺寸、画布尺寸、外围扩展格数和 `metadata` 时间戳；`selectedPokemonKey` 必须使用 Decor Dex 现有 Pokemon key。
- FR53: 系统可以在自动保存和序列化数据中包含建筑层、素材实例、坐标、区域类型、`rotationDegrees`、染色、技能标记和技能备注，以及 `workspaceState.currentBuildingLevelId`、`workspaceState.selectedAssetId` 和 `workspaceState.selectedCoordinate`。MVP payload 不要求普通实例备注 `note` 或 `workspaceState.saveStatus`。
- FR54: 用户可以重新打开保存数据并还原布景状态。
- FR55: 系统可以在恢复数据字段缺失、类型错误或坐标超出当前 `canvasSize` 范围时给出错误提示，提示必须包含问题字段、失败原因和用户可执行的修复方向。
- FR64: 系统可以将素材搜索词、分类/区域/技能筛选和 favorite-only 保存到 localStorage，并确保这些 UI 偏好不进入 SceneDocument v1 payload。预览显示选项不进入 MVP。
- FR89: 选中当前建筑层的空格时，层备注输入和列表必须显示在选中空格提示框下方；备注操作作用于当前建筑层，而不是当前格子或素材实例。
- FR90: 自动保存、恢复、结构化序列化和短字符串 roundtrip 必须保留 `buildingLevels[].notes`；旧 payload 或旧 PSE1 字符串缺少层备注时恢复为空数组。

### Image Export

- FR65: 用户可以从 Open Design 工作台打开图片导出预览，查看即将导出的布景说明图片。
- FR66: 导出图片必须包含整体使用的素材清单，至少包含素材名称、官方 No. 或 asset id、总使用数量。
- FR67: 导出图片必须按建筑层展示每层图形，并表达当前画布布局、主体区/外围区关系、素材位置和跨格 footprint；新建场景默认为 17×17 布局。
- FR68: 导出图片必须按建筑层展示每层使用的素材清单；导出预览和下载不得写入 SceneDocument、autosave storage、saved storage 或 UI preferences。
- FR91: 图片导出预览和下载图片必须在每个建筑层的素材清单下方显示该层备注；没有备注的层不得产生误导性的空备注内容。
- FR92: Worker export-summary、MCP `summarize_scene_export` 和 Web 图片导出必须使用同一层备注语义，按建筑层 id/name/levelNumber 关联备注。

### Mobile Preview / Import

- FR109: `<768px` 下系统必须进入 Mobile Preview Mode，而不是渲染完整 desktop workbench 或旧 mobile read-only workbench。
- FR110: Mobile startup 必须读取本地 scene storage 的最新有效 `SceneDocument`；读取成功时直接以内联方式展示与 desktop “下载预览”相同的布景说明内容。
- FR111: Mobile 没有本地有效记录时必须显示“导入字符串”按钮；invalid stored scene 不得静默成功，应显示可读错误并保留导入入口。
- FR112: Mobile “导入字符串”必须使用自定义 modal，包含字符串输入、确认、取消和关闭按钮；不得使用系统 `window.prompt` 或 `window.confirm`。
- FR113: Mobile 导入必须复用现有短字符串 decode、lossy recovery 和 `SceneDocument` recovery 逻辑；invalid string 显示错误且不得写 storage。
- FR114: Mobile 导入成功后必须写入现有 scene storage，使刷新或重新进入 mobile 后能直接显示导入的布景。
- FR115: Mobile inline preview 与 desktop 下载预览必须共享同一 scene-derived 内容，包括标题、Pokemon、canvas dimensions、整体素材清单、逐层图形、逐层素材清单、层备注、footprint/stacking 表达、安全文本和 i18n。
- FR116: Mobile 仍不得提供素材放置、删除、旋转、染色、技能编辑、建筑层编辑、层备注编辑、撤销/重做、JSON 文件导入/导出、分享链接、云同步或账号。

### Remote Scene ID Import

- FR117: 当 URL 带有 `scene_id` query 时，Web app 必须在 startup 读取该 id，并请求 scene API 获取可导入的布景字符串；没有 `scene_id` 时现有 localStorage/default startup 行为不变。
- FR118: Remote import 必须请求 `https://scene-api.pokokit.com/api/scenes/{id}` 的 production endpoint；`id` 必须安全拼接或编码，不能允许 path 注入。
- FR119: Remote import 成功取得 scene string 后必须复用现有 `decodeSceneDocumentStringWithLossyRecovery()`、`applyRecoveredSceneDocument()` 和 scene string import pipeline；不得创建第二套 decode/recovery 逻辑。
- FR120: Desktop remote import 成功后必须显示可编辑工作台中的导入 scene；Mobile remote import 成功后必须显示 inline 下载预览，并按现有 mobile import 规则写入 autosave slot。
- FR121: Remote fetch error、not found、invalid API response、invalid scene string 和 recovery failure 不得静默展示默认 scene 成功状态；系统必须显示可恢复错误，并保留用户可执行的手动导入或重试路径。
- FR122: Remote lossy recovery 不得无提示丢弃素材；必须列出 dropped material details，并要求用户确认后才应用兼容内容。
- FR123: `scene_id` 是 URL/import source，不是 SceneDocument 字段；不得写入 `SceneDocument v1`、UI preferences、export summary 或任何 footprint/stacking derived state。

### Scene Worker, MCP & Codex Skill

Superseded by Epic 13.3 on 2026-05-30: FR69-FR76 are historical requirements only and are no longer active backlog for this repository. Future API/MCP/Worker/skill projects must use the external handoff and depend on file-installed `@pokopia-scene-editor/scene-core` instead of restoring `apps/worker` or `.agents/skills/pokopia-scene-worker`.

- FR69: 系统可以迁移为 pnpm workspace monorepo：现有 React 浏览器 UI 放入 `apps/web`，Cloudflare Worker/MCP 放入 `apps/worker`，共享领域核心放入 `packages/scene-core`。
- FR70: 系统可以将 `SceneDocument v1` 类型、Zod schema、序列化/恢复、短字符串 codec、asset catalog 查询、footprint/occupancy helpers、selectors、导出摘要 JSON 和默认 scene 生成抽取为共享 `scene-core`。
- FR71: Worker 可以提供无状态 HTTP API：`/api/health`、`/api/scene/generate`、`/api/scene/validate`、`/api/scene/recover`、`/api/scene/export-summary`、`/api/scene/encode`、`/api/scene/decode` 和 `/api/assets`。
- FR72: Worker API 必须返回统一 result envelope，包含 `ok`、`data`、`errors`、`warnings` 和 `meta`；`meta` 至少暴露 service version、schema version 和 catalog version。
- FR73: Worker 第一阶段不得保存用户 scene，不引入 D1/KV/R2/Durable Objects 作为用户数据存储，不引入账号、权限、云同步、分享链接或在线发布。
- FR74: MCP server 可以暴露高语义 tools：`generate_scene_document`、`validate_scene_document`、`recover_scene_document`、`summarize_scene_export` 和 `search_pokopia_assets`；MCP tools 不得机械镜像所有 HTTP endpoints。
- FR75: MCP resources 可以提供 scene schema、asset catalog、Pokemon catalog、默认 scene 示例和服务版本信息；MCP prompts 可以封装修复 scene、准备导出摘要和按主题找素材等高频 workflow。
- FR76: Codex skill 必须通过 MCP 调用权威 Worker/scene-core 能力完成校验、摘要和素材搜索；skill 不得复制业务逻辑、schema、asset catalog、footprint/occupancy rules 或导出摘要实现。
- FR77: 现有 React UI 必须继续复用同一 `scene-core`，并保持当前编辑、自动保存、恢复、导出预览和图片下载体验不回退。

## Non-Functional Requirements

### Performance

- NFR1: 在桌面浏览器 1280×720 视口、1,000 个素材以内、10 个建筑层以内的测试场景中，默认 17×17 画布上的选中格子、放置素材、删除素材、切换技能标记和切换当前建筑层操作应在 150ms 内完成可见状态更新，使用浏览器性能标记或等效自动化计时测量。
- NFR2: 在 17×17 画布、10 个建筑层、每层最多 289 个素材实例以内的测试场景中，俯视图和基础正视图切换应在 500ms 内完成首个可见预览更新；测试场景必须包含至少一个 2x1、1x2、height > 1 的 footprint 素材和一个 stacking relation。
- NFR3: 素材搜索和筛选在 1,000 个素材以内时应在 200ms 内返回可见结果，测量范围从用户输入或筛选变更到结果列表完成首屏更新。
- NFR4: 素材列表达到 1,000 个素材时，搜索输入、筛选切换、列表滚动和画布选中操作的可见响应时间均应保持在 200ms 内；若一次性渲染超过 100 个素材卡片，应采用分页、虚拟滚动或等效机制限制首屏渲染量。
- NFR5: [Removed from MVP 2026-05-19] MVP 不提供建筑层隐藏、显示、锁定或解锁状态。

### Reliability & Data Integrity

- NFR6: 自动保存和序列化数据必须通过往返恢复测试完整还原场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、`rotationDegrees`、染色、技能标记和技能备注。
- NFR7: 保存、序列化、恢复或重新打开后的建筑层数量、素材实例数量和技能标记数量必须与原场景一致；若不一致，系统必须阻止静默成功并显示错误。
- NFR8: 恢复数据时，如果关键字段缺失、类型错误或坐标超出当前 `canvasSize` 范围，系统必须给出错误提示，提示至少包含字段路径、期望类型或范围、实际问题和修复方向。
- NFR9: 每次放置、删除、替换素材、切换建筑层、修改技能标记、修改染色或更新技能备注后，画布、上下文/属性字段、建筑层列表、预览和序列化结果必须从同一场景数据源派生；自动化一致性测试应验证五个视图读取的同一素材实例字段完全一致。
- NFR10: 删除建筑层等破坏性操作必须在执行前显示确认提示，提示至少包含建筑层名称、受影响素材实例数量、操作后果，以及确认或取消操作。
- NFR37: Footprint、effective footprint、occupied cells 和 height blocking cells 必须由 `scene-core` 纯函数确定性派生；任何端不得保存或缓存会与 SceneDocument/catalog 漂移的独立阻塞状态。
- NFR38: `SceneDocument v1` 仍是当前 schema；本次变更不得新增 `SceneDocument v2`、实例级 footprint 字段或 blocking cell 字段。若未来需要保存 catalog snapshot 或实例级 footprint override，必须先进行新的 PRD/Architecture/Epics 同步。
- NFR39: `scene-core`、web UI、Worker API、MCP tools 和 Codex skill 示例必须有契约测试覆盖同一个 footprint fixture，至少验证 90/270 度 length/width 交换、同层重叠、height 跨层阻塞、短字符串 roundtrip 和 export-summary parity。
- NFR40: Footprint 校验错误必须包含字段路径、冲突类型、触发实例、阻塞实例、建筑层和坐标集合；Worker/MCP/Codex skill 输出不得只给出 generic validation failed。
- NFR41: 层备注必须随 `BuildingLevel` 一起通过 scene-core 类型、Zod schema、serializer/parser、short string codec、default scene、fixtures 和 roundtrip tests 校验；不得作为 React-only state、localStorage UI preference 或 export-only state 保存。
- NFR44: Stacking surface compatibility、derived stacked relation 和 overlap exceptions 必须由 `scene-core` 纯函数确定性派生；任何端不得保存或缓存会与 SceneDocument/catalog 漂移的独立叠放状态。
- NFR45: `SceneDocument v1` 仍是当前 schema；本次变更不得新增 stacking relation、surface id、z-index、parent instance id、catalog snapshot 或 `SceneDocument v2`。若未来需要持久排序或绑定关系，必须先进行新的 PRD/Architecture/Epics 同步。
- NFR46: `scene-core`、web UI、Worker API、MCP tools 和 Codex skill 示例必须有契约测试覆盖 plate+food 成功、plate+non-food 阻断、rug/mat/shoot/low-height surface overlap、多格 surface bounds、短字符串 roundtrip 和 export-summary parity。
- NFR47: Stacking 校验错误必须包含字段路径、冲突类型、top instance/asset、base instance/asset、building level、坐标集合和用户可执行修复方向；Worker/MCP/Codex skill 输出不得只给出 generic validation failed。
- NFR48: Scene dimensions、coordinate bounds、main/outer area、footprint bounds、height blocking 和 stacking relation 必须由同一套 `scene-core` dimension helpers 派生；任何端不得继续写死 7x7 或 max coordinate 6。
- NFR49: 旧 7x7 JSON payload 与 legacy PSE1 短字符串必须有 roundtrip/contract tests；新 17x17 default scene 必须有 scene-core、web、Worker/MCP 和 export summary parity tests。
- NFR50: 17x17 画布在 1280px+ 桌面布局中不得让素材栏、建筑层面板、检查器或导出预览互相遮挡；允许使用缩放、滚动或稳定压缩，但不能破坏格子固定宽高比和坐标可读性。
- NFR51: 图片导出预览和图片生成在 17×17 画布、10 个建筑层、每层最多 289 个素材实例以内的测试场景中，应在用户感知上可接受；若生成超过 1 秒，应显示非阻塞进度或生成状态。
- NFR52: 新尺寸短字符串必须避免与 legacy PSE1 7x7 字符串歧义；解码错误必须说明 codec/version 或 dimensions 问题，并给出重新导出或使用完整 JSON 的修复方向。
- NFR53: Mobile 导入成功只能写入现有 scene storage，不得写 UI preferences，不得保存 `ImageExportSummary`、footprint/stacking derived state 或任何下载预览专用状态。
- NFR54: Mobile inline preview 和 desktop download preview 必须共用同一内容组件或等价共享渲染路径，防止素材清单、逐层图形、层备注或安全文本表达漂移。
- NFR64: 素材暂存区本地存储必须与 scene saved/autosave storage 分离；暂存区读取或写入失败不得阻止 SceneDocument recovery、autosave、导出预览或短字符串 encode/decode。
- NFR65: 暂存区本地存储恢复时必须过滤未知 `assetId`、重复项、错误 schema 和不可解析内容；恢复结果不得写回 `SceneDocument v1`、PSE 字符串、export summary 或 `scene-core`。
- NFR67: 场景摘要展开、底部详情展开、素材详情状态、下层影子开关和文件/更多菜单状态必须与 scene saved/autosave storage 分离；读取或写入失败不得阻止 SceneDocument recovery、autosave、导出预览或短字符串 encode/decode。
- NFR68: 下层影子必须以 UI projection 方式从当前 `SceneDocument` 和 asset catalog 派生，不得改变 `scene-core` occupancy、stacking、replacement confirmation、height blocking 或 placement preview 结果。
- NFR69: 1280x720 desktop 下，顶部工具栏、左侧摘要/建筑层、中央画布、底部快捷栏和右侧素材浏览不得重叠；快捷栏高度必须稳定，不能因选中内容变化导致画布明显跳动。
- NFR70: SceneCanvas zoom state 必须是 UI-only view state，不得写入 `SceneDocument v1`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core`。
- NFR71: 1280x720 desktop 和 1024x768 tablet 下，缩放到 min/max 都不得让顶部、左侧、底部或右侧面板重叠；页面不得出现横向滚动。
- NFR72: 缩放手势必须保持编辑响应；在 17x17 画布、10 个建筑层、每层最多 289 个素材实例以内，zoom scale 更新应在 100ms 内产生可见反馈。

### Usability

- NFR11: 在桌面编辑布局中，当前 Pokemon、场景名称、当前编辑建筑层、当前选中素材和当前选中格子坐标必须在不打开额外弹窗的情况下可见；未选择状态必须显示明确空状态。
- NFR12: 主体区、外围装饰区和技能标记必须分别使用至少两种视觉通道组合表达，例如边框、图标、透明度、角标、文本标签或状态说明。
- NFR13: 删除、旋转、染色和预览查看必须能从主编辑界面通过一次点击触发；桌面键盘快捷操作不作为 MVP 强制要求，显式导出入口若进入 MVP，也必须遵守同一可达性约束。
- NFR14: 用户不应需要理解内部 JSON 结构才能完成创建、编辑、预览、保存和恢复流程。
- NFR15: 错误提示必须说明问题字段或操作原因，并给出至少一个用户可执行的修复方向。
- NFR42: 层备注编辑不得挤压 7x7 画布或改变格子固定尺寸；在桌面布局中输入框位于选中空格提示框下方，在 `<768px` Mobile Preview Mode 中只能通过 inline 下载预览查看不能编辑。
- NFR55: Mobile 无本地记录、invalid stored scene、invalid import、lossy import、cancel 和 close 状态必须提供明确反馈；用户不应需要理解内部 JSON 才能完成 mobile 导入和预览。

### Accessibility

- NFR16: 所有主要按钮、输入框、筛选控件、建筑层操作和预览切换控件必须有可访问名称；可通过浏览器无障碍树检查或等效自动化测试验证。
- NFR17: 关键状态不得只依赖颜色表达；主体区、外围区、选中格和技能标记必须至少通过图标、边框、文本、角标或形态中的两种方式表达。
- NFR18: 桌面和平板编辑模式下的键盘快捷操作不作为 MVP 强制要求；现有键盘支持可以保留或删除。Mobile Preview Mode 下必须禁用应用级编辑键盘操作，不允许键盘触发选择、放置、删除、旋转、保存、撤销/重做、建筑层切换或任何 scene edit command；导入 modal 内的文本输入和按钮键盘操作必须保持可访问。
- NFR19: 在 Chrome、Edge、Safari 和 Firefox 的最新两个稳定大版本中，1280×720 桌面视口和 390×844 窄视口下，主要按钮、字段标签、建筑层名称、坐标和错误提示不得被截断到无法识别。

### Compatibility & Responsive Behavior

- NFR20: MVP 应支持发布时 Chrome、Edge、Safari 和 Firefox 的最新两个稳定大版本；发布验收必须在这些浏览器中完成核心创建、编辑、预览、保存/自动保存和重新打开流程。
- NFR21: 在 1280px 及以上桌面宽度下，右侧素材栏、中央尺寸驱动画布、左侧建筑层面板、底部当前选择快捷栏和顶部预览/导出入口必须同时可见或可通过一次点击切换显示；默认 17×17 画布可采用内部滚动或缩放，但页面不得出现横向滚动条。
- NFR22: 在 768px 以下宽度下，页面进入 Mobile Preview Mode；390×844 视口下不得出现控件重叠，且有本地布景时 scene name、Pokemon、canvas dimensions、整体素材清单和逐层图形必须可访问；无本地布景时“导入字符串”入口必须可访问。
- NFR66: 素材暂存区只在 `apps/web` desktop/tablet 编辑工作台渲染；`<768px` Mobile Preview Mode 不得渲染暂存区，也不需要读取、恢复或写入暂存区 localStorage。
- NFR56: Mobile import modal 必须有可访问名称，确认、取消和关闭按钮必须可通过键盘和屏幕阅读器识别；关闭和取消不得改变 scene 或写 storage。
- NFR57: Playwright/mobile smoke 必须覆盖 390×844 下 no-storage import path、stored-scene inline preview path、invalid import、无编辑控件和无布局重叠。
- NFR58: Remote scene id startup 必须有 loading、success、error 和 lossy confirmation 状态；状态反馈必须可访问，不能只依赖颜色。
- NFR59: `scene_id` 存在时，remote import loading/success/failure state 必须优先于 localStorage/default scene 成功展示；失败不得把默认 scene 标记为 remote import success。
- NFR60: Local dev 不得依赖 browser `fetch` 手写 `Origin` header；必须通过 Vite dev proxy 或本地 adapter 在 server-side upstream request 中设置 `Origin: "https://scene-editor.pokokit.com"`。Production browser fetch 不手写 Origin header。
- NFR61: Remote import adapter 和 AppShell tests 必须使用 mocked fetch/route，不依赖 live `scene-api.pokokit.com`，并分别覆盖 dev proxy endpoint 与 production endpoint 行为。
- NFR62: Remote import 必须保持 web-only/browser IO 边界；`packages/scene-core` 不得新增 `window`、URL、fetch、Vite env 或 dev proxy 依赖。
- NFR63: Playwright smoke 必须覆盖 desktop `?scene_id=fixture` 自动导入和 mobile 390×844 `?scene_id=fixture` 自动导入，验证成功显示、错误状态、无桌面编辑控件和刷新后的 autosave recovery。
- NFR23: 画布网格应保持固定宽高比；素材搜索结果、筛选项、上下文/属性字段、建筑层列表或检查器详情变化时，单格尺寸变化不得超过 1px。

### Security & Data Safety

- NFR24: MVP 不处理账号、支付、隐私档案或敏感个人数据。
- NFR25: 恢复数据或未来导入的 JSON 数据必须作为数据处理，不得作为脚本、HTML 或可执行内容执行；包含 `<script>`、事件处理属性或 HTML 标签的字符串只能作为普通文本保存和展示。
- NFR26: 用户自定义名称和技能说明在界面展示时必须进行文本安全处理；使用 `<script>`、`<img onerror>` 等字符串测试时不得破坏页面结构或执行脚本。
- NFR27: 动态 Pokemon 主题只能影响外层 shell 和少量强调色；主体区、外围区、当前层、选中格、技能标记、警告和错误必须继续使用稳定语义 tokens。
- NFR28: Open Design 工作台不得使用 landing page、hero-scale 字号、卡片套卡片或装饰性背景来承载核心编辑体验；面板、按钮、格子、预览单元和计数区域必须有稳定尺寸。
- NFR29: 图片导出预览和图片生成必须支持当前 SceneDocument 的画布尺寸；默认 17×17 场景按 NFR51 执行，legacy 7×7 场景仍保持现有可读导出。
- NFR30: 导出图片中的标题、整体素材清单、每层图形和每层素材清单必须在默认导出尺寸下可读；下载按钮、关闭操作和失败提示必须有可访问名称。
- NFR43: 层备注正文与场景名称、建筑层名称、技能备注一样必须作为纯文本渲染；包含 HTML-like 文本时，工作台、导出预览、下载图片和 Worker/MCP summary 不得执行或注入 HTML。

### Service, Tooling & Deployment

- NFR31: Worker/API/MCP 不得记录完整用户 scene payload；日志只能记录 request id、route/tool、status、error category、duration 和必要的 redacted metadata。
- NFR32: Worker 必须限制 request body、content type、tool timeout 和 output size；错误响应不得暴露 stack trace。
- NFR33: Worker bundle 不得包含 React、React DOM、`html-to-image`、Playwright、jsdom 或大型图片源。
- NFR34: `scene-core`、Worker API、MCP tools 和 Codex skill 必须有 contract tests；release gate 增加 Worker runtime tests、MCP smoke、`wrangler types` 和 `wrangler types --check`。
- NFR35: API/MCP 结果必须与浏览器 UI 当前 `SceneDocument v1`、asset catalog、footprint/occupancy rules、locale 显示规则和导出摘要语义一致。
- NFR36: 根 `package.json` 必须提供 pnpm monorepo orchestration scripts；Wrangler dev/types/deploy/dry-run 命令必须能通过 `pnpm run worker:*` 和 `pnpm run deploy` 执行。
