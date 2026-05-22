---
stepsCompleted:
  - step-01-validate-prerequisites.md
  - step-02-design-epics.md
  - step-03-create-stories.md
  - step-04-final-validation.md
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-directions.html
  - _bmad-output/planning-artifacts/prd-validation-report.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-19.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-22.md
  - docs/需求文档.md
---

# pokopia-scene-editor - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for pokopia-scene-editor, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Approved Course Correction - 2026-05-19

`sprint-change-proposal-2026-05-19.md` 已批准。Epic 1-4 保留为已完成历史，但其中涉及以下能力的验收点不再代表当前 MVP 目标：建筑层隐藏/显示/锁定/解锁、手动保存、dirty/saved/saveError 状态区分、Undo/Redo、素材空状态恢复动作、素材适用区域的放置阻断校验、同层素材堆叠、素材实例移动、普通实例备注 `note`、按素材区分是否可旋转、预览网格/主体边界/技能标记显示开关，以及 Mobile 下应用级键盘操作。

Epic 5 已完成并保留为已完成历史。后续新功能不得通过重写 Epic 1-5 完成记录吸收。

## Approved Course Correction - 2026-05-22

`sprint-change-proposal-2026-05-22.md` 已批准。Epic 1-5 保留为已完成历史；当前新增 Epic 6，用于图片导出预览与图片导出。导出图片必须包含整体使用素材、每层图形和每层使用素材。当前不新增导入、JSON 文件导出、分享链接、云同步、账号或在线发布。

## Requirements Inventory

### Functional Requirements

FR1: 用户可以创建一个标注为 5×5 布景的场景。

FR2: 系统可以为每个 5×5 布景提供 7×7 实际编辑画布。

FR3: 系统可以识别并区分中心 5×5 主体区和外围 1 圈装饰区。

FR4: 系统可以为每个画布格子维护 0-based x/y 坐标。

FR5: 用户可以在主体区和外围装饰区放置布景内容。

FR6: 用户可以查看当前格子属于主体区还是外围装饰区。

FR7: 用户可以选择画布格子作为当前编辑对象。

FR56: 用户可以在工作台顶部左侧查看并切换当前 Pokemon，Pokemon 选择器支持搜索匹配和当前选择状态。

FR57: 用户可以编辑场景 `Name`，并在同一上下文中看到 dirty/saved 状态和保存动作结果。

FR58: 工作台必须以中央 7×7 画布为视觉中心，同时保留右侧浮动素材栏、左侧建筑层面板、左下双预览检查器和顶部场景控制。

FR8: 用户可以选择当前要放置的素材。

FR9: 用户可以将素材放置到当前建筑层的指定格子。

FR10: 用户可以删除指定格子中的素材。

FR11: 用户可以用新素材替换同一建筑层同一格子的已有素材。

FR12: 用户可以在不同建筑层的同一坐标放置不同素材。

FR13: 系统可以根据素材属性判断同一建筑层同一格子是否允许叠放。

FR14: 用户可以移动已放置素材到其他格子。

FR15: 用户可以将已放置素材移动到其他建筑层。

FR16: 用户可以为支持方向的素材设置朝向。

FR17: 系统可以在素材移动时保留素材 ID、建筑层、技能标记、朝向、染色和备注。

FR18: 用户可以为已放置素材维护备注。

FR19: 用户可以创建新的建筑层。

FR20: 系统可以在新建场景时默认创建 0 层、1 层、2 层三个建筑层，并为用户新增建筑层分配当前最高层号加 1 的层号。

FR21: 用户可以删除建筑层。

FR22: 用户可以重命名建筑层。

FR23: 用户可以复制建筑层。

FR24: 用户可以设置当前编辑建筑层。

FR25: 用户可以隐藏或显示建筑层。

FR26: 用户可以锁定或解锁建筑层。

FR27: 系统可以按建筑层层号从 0 层到 n 层组织和展示布景内容。

FR28: 用户可以浏览素材列表。

FR29: 用户可以查看素材缩略图、名称、分类、标签、适用区域和带 `No.` 前缀的官方素材 ID。

FR30: 用户可以通过关键词搜索素材。

FR31: 用户可以按素材分类筛选素材。

FR32: 用户可以按适用区域筛选素材。

FR33: 用户可以按技能相关条件筛选素材，包括是否默认需要百变怪技能、技能类型和是否可作为本次放置的技能标记候选。

FR34: 用户可以查看素材详情，详情至少包含素材 ID、名称、分类、标签、适用区域、喜好状态、默认技能需求、是否可旋转、是否可叠放、是否可染色和缩略图。

FR35: 素材维护者可以为素材维护分类、标签、适用区域、喜好状态、默认技能需求、可旋转性、可叠放性、可染色性和缩略图地址。

FR59: 用户可以只显示当前 Pokemon 喜好的素材，筛选结果计数应保持稳定宽度并通过可访问方式更新。

FR36: 用户可以在放置素材前设置本次放置是否需要百变怪技能。

FR37: 用户可以在放置后修改素材实例的技能标记。

FR38: 用户可以为素材实例维护技能类型。

FR39: 用户可以为素材实例维护技能备注。

FR40: 系统可以在画布和预览中标识需要百变怪技能的素材实例。

FR60: 技能类型词表必须使用 `树叶`、`耕地`、`储水`，画布和预览中的技能标记应显示对应的一字标签。

FR61: 用户可以为可染色素材实例选择颜色；系统应在格子中显示染色入口和当前颜色。

FR62: 系统只在 90、180、270 度朝向时显示格内旋转标记，默认 0 度朝向不显示额外标记。

FR41: 用户可以在工作台中查看俯视图预览。

FR42: 俯视图可以展示完整 7×7 画布内容。

FR43: 俯视图可以展示 5×5 主体区边界。

FR44: 用户可以在工作台中查看正视图预览。

FR45: 正视图可以展示主体区、外围装饰区和建筑层高度关系。

FR46: 用户可以选择预览当前建筑层或全部可见建筑层。

FR47: 用户可以控制预览中是否显示网格、主体边界和技能标记。

FR63: 工作台左下检查器必须同时展示正视图和俯视图缩略预览；正视图应支持独立纵向滚动。

FR48: 用户可以查看选中格子的坐标、区域类型、建筑层、素材、朝向、染色、技能标记和备注。

FR49: 用户可以在上下文/检查器字段中修改选中素材的素材选择、朝向、染色、技能标记、技能备注、格子备注和建筑层归属。

FR50: 用户可以保存当前布景数据，系统可以在编辑后更新 dirty/saved 状态并支持自动保存草稿；自动保存必须写入与后续显式导出完全相同的 SceneDocument v1 payload。

FR51: 系统可以将当前布景数据序列化为结构化 SceneDocument v1，用于保存、自动保存、恢复、roundtrip 校验和后续显式导出；当前 Open Design 工作台不暴露显式导出入口，但不允许存在第二套导出数据结构。

FR52: 系统可以在保存和序列化数据中包含 `sceneId`、`sceneName`、`selectedPokemonKey`、场景尺寸、画布尺寸、外围扩展格数和 `metadata` 时间戳；`selectedPokemonKey` 必须使用 Decor Dex 现有 Pokemon key。

FR53: 系统可以在保存和序列化数据中包含建筑层、素材实例、坐标、区域类型、`rotationDegrees`、染色、技能标记、备注，以及 `workspaceState.currentBuildingLevelId`、`workspaceState.selectedAssetId`、`workspaceState.selectedCoordinate` 和 `workspaceState.saveStatus`。

FR54: 用户可以重新打开保存数据并还原布景状态。

FR55: 系统可以在恢复数据字段缺失、类型错误或坐标超出 7×7 范围时给出错误提示，提示必须包含问题字段、失败原因和用户可执行的修复方向。

FR64: 系统可以将素材搜索词、分类/区域/技能筛选、favorite-only 和预览显示选项保存到 localStorage，并确保这些 UI 偏好不进入 SceneDocument v1 payload。

FR65: 用户可以从 Open Design 工作台打开图片导出预览，查看即将导出的布景说明图片。

FR66: 导出图片必须包含整体使用的素材清单，至少包含素材名称、官方 No. 或 asset id、总使用数量。

FR67: 导出图片必须按建筑层展示每层图形，并表达该层 7×7 布局、主体区/外围区关系和素材位置。

FR68: 导出图片必须按建筑层展示每层使用的素材清单；导出预览和下载不得写入 SceneDocument、autosave storage、saved storage 或 UI preferences。

### NonFunctional Requirements

NFR1: 在桌面浏览器 1280×720 视口、1,000 个素材以内、10 个建筑层以内的测试场景中，7×7 画布上的选中格子、放置素材、删除素材、切换技能标记和切换当前建筑层操作应在 100ms 内完成可见状态更新，使用浏览器性能标记或等效自动化计时测量。

NFR2: 在 7×7 画布、10 个建筑层、每层 49 个素材实例以内的测试场景中，俯视图和基础正视图切换应在 300ms 内完成首个可见预览更新，使用浏览器性能标记或等效自动化计时测量。

NFR3: 素材搜索和筛选在 1,000 个素材以内时应在 200ms 内返回可见结果，测量范围从用户输入或筛选变更到结果列表完成首屏更新。

NFR4: 素材列表达到 1,000 个素材时，搜索输入、筛选切换、列表滚动和画布选中操作的可见响应时间均应保持在 200ms 内；若一次性渲染超过 100 个素材卡片，应采用分页、虚拟滚动或等效机制限制首屏渲染量。

NFR5: 隐藏、显示、锁定和解锁建筑层后，7×7 画布的整体宽高和单格宽高变化不得超过 1px，当前选中格坐标不得被重置。

NFR6: 保存和序列化数据必须通过往返恢复测试完整还原场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、`rotationDegrees`、染色、技能标记、备注和 dirty/saved 状态。

NFR7: 保存、序列化、恢复或重新打开后的建筑层数量、素材实例数量和技能标记数量必须与原场景一致；若不一致，系统必须阻止静默成功并显示错误。

NFR8: 恢复数据时，如果关键字段缺失、类型错误或坐标超出 7×7 范围，系统必须给出错误提示，提示至少包含字段路径、期望类型或范围、实际问题和修复方向。

NFR9: 每次放置、删除、移动、替换素材、切换建筑层、修改技能标记、修改染色或更新备注后，画布、上下文/属性字段、建筑层列表、预览和序列化结果必须从同一场景数据源派生；自动化一致性测试应验证五个视图读取的同一素材实例字段完全一致。

NFR10: 删除建筑层等破坏性操作必须在执行前显示确认提示，提示至少包含建筑层名称、受影响素材实例数量、操作后果，以及确认或取消操作。

NFR11: 在桌面编辑布局中，当前 Pokemon、场景名称、dirty/saved 状态、当前编辑建筑层、当前选中素材和当前选中格子坐标必须在不打开额外弹窗的情况下可见；未选择状态必须显示明确空状态。

NFR12: 主体区、外围装饰区、锁定建筑层内容和技能标记必须分别使用至少两种视觉通道组合表达，例如边框、图标、透明度、角标、文本标签或状态说明。

NFR13: 保存、删除、旋转、染色、预览查看、网格显示、主体边界显示和技能标记显示必须能从主编辑界面通过一次点击或一次键盘确认触发；显式导出入口若进入 MVP，也必须遵守同一可达性约束。

NFR14: 用户不应需要理解内部 JSON 结构才能完成创建、编辑、预览、保存和恢复流程。

NFR15: 错误提示必须说明问题字段或操作原因，并给出至少一个用户可执行的修复方向。

NFR16: 所有主要按钮、输入框、筛选控件、建筑层操作和预览切换控件必须有可访问名称；可通过浏览器无障碍树检查或等效自动化测试验证。

NFR17: 关键状态不得只依赖颜色表达；主体区、外围区、选中格、锁定层和技能标记必须至少通过图标、边框、文本、角标或形态中的两种方式表达。

NFR18: 用户应能仅使用键盘通过 Tab、Shift+Tab、Enter、Space 和方向键访问素材搜索、筛选控件、工具栏、建筑层列表和上下文/检查器字段中的主要表单控件。

NFR19: 在 Chrome、Edge、Safari 和 Firefox 的最新两个稳定大版本中，1280×720 桌面视口和 390×844 窄视口下，主要按钮、字段标签、建筑层名称、坐标和错误提示不得被截断到无法识别。

NFR20: MVP 应支持发布时 Chrome、Edge、Safari 和 Firefox 的最新两个稳定大版本；发布验收必须在这些浏览器中完成核心创建、编辑、预览、保存/自动保存和重新打开流程。

NFR21: 在 1280px 及以上桌面宽度下，右侧浮动素材栏、中央 7×7 画布、左侧建筑层面板、左下双预览检查器和顶部场景控制必须同时可见或可通过一次点击切换显示，页面不得出现横向滚动条。

NFR22: 在 768px 以下宽度下，页面进入 Mobile View-only Mode；390×844 视口下不得出现控件重叠，且当前 Pokemon、场景名、当前建筑层、选中素材、选中格子、主体区边界和技能标记状态必须在当前查看或预览区域中可访问。

NFR23: 画布网格应保持固定宽高比；素材搜索结果、筛选项、上下文/属性字段、建筑层列表或预览检查器内容变化时，单格尺寸变化不得超过 1px。

NFR24: MVP 不处理账号、支付、隐私档案或敏感个人数据。

NFR25: 恢复数据或未来导入的 JSON 数据必须作为数据处理，不得作为脚本、HTML 或可执行内容执行；包含 `<script>`、事件处理属性或 HTML 标签的字符串只能作为普通文本保存和展示。

NFR26: 用户自定义名称、备注和技能说明在界面展示时必须进行文本安全处理；使用 `<script>`、`<img onerror>` 等字符串测试时不得破坏页面结构或执行脚本。

NFR27: 动态 Pokemon 主题只能影响外层 shell 和少量强调色；主体区、外围区、当前层、选中格、技能标记、锁定、隐藏、警告和错误必须继续使用稳定语义 tokens。

NFR28: Open Design 工作台不得使用 landing page、hero-scale 字号、卡片套卡片或装饰性背景来承载核心编辑体验；面板、按钮、格子、预览单元和计数区域必须有稳定尺寸。

NFR29: 图片导出预览和图片生成在 7×7 画布、10 个建筑层、每层 49 个素材实例以内的测试场景中，应在用户感知上可接受；若生成超过 1 秒，应显示非阻塞进度或生成状态。

NFR30: 导出图片中的标题、整体素材清单、每层图形和每层素材清单必须在默认导出尺寸下可读；下载按钮、关闭操作和失败提示必须有可访问名称。

### Additional Requirements

- MVP 必须采用客户端优先静态 Web App，不引入数据库、认证、后端 API、服务端运行时、路由或公开内容页。

- Starter template 使用 Vite + React + TypeScript (`react-ts`)。第一条实施 story 应初始化该 starter，并建立 `typecheck`、build、Vitest 和 Playwright scaffold。

- `SceneDocument` 必须是唯一业务事实来源；画布、上下文/属性字段、建筑层列表、预览和保存/序列化校验必须从同一个 scene state 派生。

- 所有修改 `SceneDocument` 的行为必须经过 typed command layer，组件不得直接修改深层 scene object。

- `<768px` 必须进入 `interactionMode = "readOnly"`；只读限制必须在 command layer、canvas pointer handler 和 keyboard handler 三处生效。

- 只读模式允许查看场景、查看当前建筑层、点选格子或实例查看信息、缩放、平移和查看详情；禁止放置、移动、删除、旋转、染色、修改技能、修改建筑层、恢复替换、保存 dirty changes、自动保存、撤销/重做或改变 scene JSON。

- 领域类型使用 TypeScript；保存/恢复 runtime schema validation 使用 Zod 4.x；恢复失败不得覆盖当前 scene、不得创建 partial scene、不得修改 dirty state。当前导出能力只覆盖图片导出预览和图片下载；显式 JSON 导出/导入 UI 当前不暴露。

- 图片导出必须从 SceneDocument v1、asset catalog 和 preview/export selectors 派生整体素材清单、逐层图形和逐层素材清单；不得修改 SceneDocument、不得触发 autosave、不得写入 saved storage 或 UI preferences。

- MVP schema 固定为当前 `1`；恢复流程必须检查 `schemaVersion`，缺失或未知版本必须显示明确错误，不接受旧字段名、缺省字段或隐式迁移。

- 坐标的权威区域判断来自 `x/y + sceneSize + outerPadding` 的纯函数；恢复时必须重新计算 `areaType` 并比对，坐标与 `areaType` 不一致时不能静默接受。

- JSON 字段使用 `camelCase`；日期使用 ISO 8601 string；`areaType` 只允许 `main | outer`；朝向字段固定为 `rotationDegrees: 0 | 90 | 180 | 270`，UI 中默认 0 度不显示额外旋转标记；`skillType` 未设置时使用 `null`，`skillNote` 使用空字符串。

- 保存、恢复、command execution、validation 和 destructive confirmation 等用户可修复流程应返回 typed Result，不应把预期用户错误直接 throw。

- Recovery error 结构至少包含 `fieldPath`、`expected`、`actual`、`reason`、`recoveryAction`。

- 恢复数据或未来导入 JSON 中的素材名称、场景名称、备注和技能说明必须作为纯文本保存和展示，禁止 `dangerouslySetInnerHTML` 或将数据字段传入 HTML parser。

- 删除非空建筑层、恢复替换当前 scene、批量清空等破坏性操作必须在 command boundary 有明确确认流程，说明受影响对象名称、素材实例数量和操作后果。

- MVP asset catalog 使用 repo-local static data 或 bundled JSON/TS data，不引入外部服务；数据结构必须支持官方素材 ID、Pokemon 喜好、可染色性、后续批量导入、模板、更多技能类型和更大画布扩展。

- MVP 状态管理使用 React `useReducer` + command dispatcher + undo/redo history；Redux、Zustand 或其他外部状态库延后，只有在真实实现中出现明确订阅性能或组件边界问题时再引入。

- 业务派生数据必须通过 pure selectors 统一计算，例如 `selectVisibleLevels`、`selectTileAtCell`、`selectPreviewTiles`，不得在组件中重复实现 area、level ordering、preview ordering 或 recovery validation 规则。

- 项目结构必须遵守架构分层：`src/domain/scene/`、`src/domain/assets/`、`src/state/`、`src/components/`、`src/io/`、`src/theme/`、`src/test/` 和 `e2e/`。

- Domain modules 不得 import React、DOM 或 components；state modules 可以 import domain/io 类型但应避免 import components；components 可以 import selectors、dispatcher hooks、theme 和必要 IO UI entry；io 不得 import components。

- 文件和目录使用 `kebab-case`；React 组件、TypeScript 类型和 interfaces 使用 `PascalCase`；函数、变量、selectors 和 hooks 使用 `camelCase`；command type 使用全大写 snake case。

- CI / release gate 至少包含 `npm run typecheck`、unit tests、`npm run build` 和 Playwright smoke。

- Playwright 必须覆盖 1280×720 或以上桌面编辑闭环、390×844 mobile read-only guard、save/recovery roundtrip、dangerous text rendered as text，以及关键响应式视口无控件重叠。

- Vitest 必须覆盖领域模型、command reducer、schema validation、area calculation、level ordering 和 read-only command guard；React Testing Library 必须覆盖组件可访问名称和核心交互状态。

- Vite production build 输出静态文件到 `dist/`，运行时不得依赖 `_bmad-output/` planning files、Node server APIs、数据库或 serverless functions。

- 配置和 secret 范围必须保持最小；若需要 public base path、asset base path 或 feature flag，使用 Vite public env convention，不得包含 secret。

- 正视图在 MVP 中必须是结构化高度关系预览，不做真实游戏视角、复杂遮挡或高拟真渲染。

- Post-MVP 延后显式 JSON 导出/导入 UI、数据库、账号、云同步、分享链接、公开方案库、协作编辑、版本历史、复杂正视图遮挡、真实游戏视角、更大画布尺寸和可配置外围扩展格数。

### UX Design Requirements

UX-DR1: 使用 Open Design UI「Pokopia Scene Editor Workbench」作为默认设计方向：顶部左侧 Pokemon/场景 `Name`/保存状态，右侧浮动 Asset Picker，中央固定 7×7 编辑画布，左侧 Building Level Panel，左下 Preview Inspector 同时展示正视图和俯视图。

UX-DR2: 第一屏必须是可用编辑工作台，不做 landing page、营销页 hero、装饰性卡片说明或说明性页面跳转。

UX-DR3: 中心 7×7 画布必须是主视觉焦点，并持续区分中心 5×5 主体区与外围 1 圈装饰区。

UX-DR4: 右侧浮动素材栏必须提供搜索、固定宽度结果计数、分类筛选、喜好素材筛选、区域筛选、技能筛选、当前素材、素材行、缩略图、名称、分类、标签、官方 `No.` ID 和默认技能状态。

UX-DR5: 用户选择素材后，界面必须进入明确待放置状态，并显示当前素材、本次放置默认技能状态、当前建筑层和目标格放置上下文。

UX-DR6: 画布悬停必须显示目标坐标、区域类型、当前建筑层、放置合法性、技能状态和覆盖风险；能提前提示的问题应在执行前提示。

UX-DR7: 点击放置后，目标格必须出现素材实例、选中状态和必要技能标记，上下文/检查器字段必须同步显示该实例的完整字段。

UX-DR8: 百变怪技能标记必须清楚绑定到素材实例，而不是素材模板、全局坐标或建筑层；用户可在放置前设置默认值，也可在放置后修改单个实例。

UX-DR9: 建筑层必须作为一等上下文显示，左侧 Building Level Panel 视觉顺序为高层到低层，例如 L2、L1、L0；当前层、可见/隐藏、锁定、空层、删除确认、实例数量和当前编辑层标识必须可见或一次操作可达。

UX-DR10: 切换建筑层时不得让用户误以为其他层同坐标内容被覆盖或丢失；隐藏层应保留数据但不参与显示。

UX-DR11: Scene Canvas 组件必须表达 7×7 网格、主体边界、外围背景、格子坐标、放置预览、选中格、技能角标、染色入口、非默认旋转标记、锁定层视觉、不可放置和将覆盖状态。

UX-DR12: 选中上下文、检查器字段或后续属性抽屉必须按“实例身份 -> 位置 -> 建筑层 -> 朝向 -> 染色 -> 技能 -> 备注”的顺序展示和编辑字段，并区分只读字段、可编辑字段、字段错误和锁定层只读状态。

UX-DR13: Preview Inspector 必须在左下同屏展示正视图和俯视图缩略预览，支持当前层/全部可见层、显示网格、显示主体边界和显示技能标记；预览只能从同一场景状态派生，不得形成独立编辑状态。

UX-DR14: 正视图必须服务结构校验和复现，表达主体区、外围装饰区和建筑层高度关系，不追求真实游戏视角或复杂遮挡。

UX-DR15: Recovery Validator 必须展示校验状态、字段路径、失败原因、期望值、实际值、修复方向、重试/取消操作；校验失败时不得覆盖当前场景。显式 Import/Export Validator 可作为后续导出/导入 UI 扩展。

UX-DR16: Dynamic Pokemon Theme Shell 必须让页面背景和少量强调色跟随当前选中宝可梦主色变化，并在无选中宝可梦时使用 Ditto 或中性纸面 fallback。

UX-DR17: 动态宝可梦主题不得覆盖主体区、外围区、选中格、悬停格、技能标记、锁定层、错误状态等语义状态色。

UX-DR18: 动态背景必须根据主色亮度自动选择可读前景色，并遵守 `prefers-reduced-motion`，在减少动态效果模式下禁用或缩短背景过渡。

UX-DR19: 设计 tokens 必须包含布局 tokens、语义色 tokens、网格 tokens、动态宝可梦主题 tokens、纸面面板色和 typography tokens。

UX-DR20: 排版必须服务编辑效率：标题可使用 serif，UI/正文使用系统 sans-serif，坐标、层号、素材 ID、JSON 状态、计数和短标签使用 monospace；工具区域不使用 hero-scale 字号。

UX-DR21: 工具按钮、画布格子、状态角标、素材卡片和属性字段必须有稳定尺寸，避免侧栏内容、筛选结果或属性字段变化导致画布和网格跳动。

UX-DR22: 主操作按钮只用于保存、确认恢复、确认删除建筑层等关键推进动作；同一上下文最多一个主操作。显式导出入口若后续进入 MVP，也必须遵守同一主操作约束。

UX-DR23: 图标按钮用于保存、删除、旋转、染色、显示网格、显示主体边界、显示技能标记等高频工具，必须有可访问名称和悬停说明。

UX-DR24: 危险操作如删除非空建筑层、删除当前选择、覆盖已有实例、恢复替换当前场景必须显示影响范围和明确确认/取消，不得用普通轻提示替代。

UX-DR25: 素材搜索无结果或筛选无结果时必须显示空状态和恢复动作，例如清除筛选、显示全部或切换分类。

UX-DR26: 空场景必须仍展示 7×7 画布、默认建筑层和清楚的下一步；未选中实例时，上下文/检查器字段应显示可执行提示，而不是空白。

UX-DR27: `<1280px` 响应式布局必须保持当前 Pokemon、场景名、当前素材、选中格、当前建筑层、主体区边界和技能状态可访问；`1280px+` 必须支持完整浮动工作台且无横向滚动。

UX-DR28: `1024-1279px` 左侧建筑层保持可见，右侧素材栏可收窄；`768-1023px` 面板可压缩为 tabbed drawers 但仍允许编辑；`<768px` 必须进入 Mobile View-only Mode，并明确显示“只读模式/桌面端编辑”状态。

UX-DR29: Mobile View-only Mode 允许查看场景、查看建筑层、点选格子或实例查看属性、查看素材信息、缩放和平移画布、查看恢复校验结果。

UX-DR30: Mobile View-only Mode 禁止放置、移动、旋转、删除、染色、修改属性、修改楼层、切换技能状态、保存、自动保存、恢复覆盖、撤销/重做、批量清空以及任何会改变 scene document 或 dirty state 的行为，并隐藏素材栏、保存/删除、建层、上下文操作和染色控件。

UX-DR31: 从桌面缩小到 Mobile 时必须保留草稿并进入只读预览；从 Mobile 放大回桌面后恢复编辑能力，不能丢失查看位置、选中实例或未保存状态。

UX-DR32: 可访问性基线为 WCAG 2.2 AA；所有工具栏、筛选、楼层、预览、恢复控件都有可访问名称。

UX-DR33: 键盘用户在桌面/平板编辑模式下可用方向键移动选区，`Enter` / `Space` 确认，`Escape` 取消；Mobile 下键盘只能移动查看焦点或选择查看对象，不能触发编辑。

UX-DR34: 主体区、外围区、悬停、选中、锁定、隐藏、技能标记和错误状态不得只依赖颜色，至少使用两种视觉通道组合表达。

UX-DR35: 恢复失败、重新打开失败或 JSON 校验失败时必须保护当前数据，提供重试、取消和查看错误详情，不能静默覆盖或降级。

UX-DR36: 页面视觉应克制、工具化、低饱和语义优先；使用 Open Design 纸面、细线和紧凑信息密度，不得使用卡片套卡片、营销页式说明区块、高拟真视觉替代结构表达或装饰性背景干扰状态识别。

### FR Coverage Map

FR1: Epic 1 - 创建标注为 5×5 的布景场景。

FR2: Epic 1 - 提供 7×7 实际编辑画布。

FR3: Epic 1 - 区分中心 5×5 主体区和外围 1 圈装饰区。

FR4: Epic 1 - 为每个画布格子维护 0-based x/y 坐标。

FR5: Epic 1 - 支持主体区和外围装饰区作为可放置区域。

FR6: Epic 1 - 显示当前格子的主体/外围区域类型。

FR7: Epic 1 - 支持选择画布格子作为当前编辑对象。

FR56: Epic 1 - 顶部 Pokemon 选择器和搜索匹配。

FR57: Epic 1 - 场景 `Name` 编辑、dirty/saved 状态和保存动作结果。

FR58: Epic 1 - Open Design 浮动工作台布局。

FR8: Epic 2 - 选择当前要放置的素材。

FR9: Epic 2 - 将素材放置到当前建筑层的指定格子。

FR10: Epic 2 - 删除指定格子中的素材。

FR11: Epic 2 - 替换同一建筑层同一格子的已有素材。

FR12: Epic 2 - 在不同建筑层的同一坐标放置不同素材。

FR13: Epic 2 - 根据素材属性判断同层同格是否允许叠放。

FR14: Epic 2 - 移动已放置素材到其他格子。

FR15: Epic 2 - 移动已放置素材到其他建筑层。

FR16: Epic 2 - 为支持方向的素材设置朝向。

FR17: Epic 2 - 移动素材时保留素材 ID、建筑层、技能标记、朝向、染色和备注。

FR18: Epic 2 - 为已放置素材维护备注。

FR19: Epic 2 - 创建新的建筑层。

FR20: Epic 1 - 新建场景默认创建 0/1/2 三个建筑层，并定义新增层号规则。

FR21: Epic 2 - 删除建筑层。

FR22: Epic 2 - 重命名建筑层。

FR23: Epic 2 - 复制建筑层。

FR24: Epic 2 - 设置当前编辑建筑层。

FR25: Epic 2 - 隐藏或显示建筑层。

FR26: Epic 2 - 锁定或解锁建筑层。

FR27: Epic 2 - 按建筑层层号从 0 层到 n 层组织和展示布景内容。

FR28: Epic 2 - 浏览素材列表。

FR29: Epic 2 - 查看素材缩略图、名称、分类、标签、适用区域和官方 `No.` ID。

FR30: Epic 2 - 通过关键词搜索素材。

FR31: Epic 2 - 按素材分类筛选素材。

FR32: Epic 2 - 按适用区域筛选素材。

FR33: Epic 2 - 按技能相关条件筛选素材。

FR34: Epic 2 - 查看素材详情及最小详情字段。

FR35: Epic 2 - 维护素材分类、标签、适用区域、喜好状态、默认技能需求、可旋转性、可叠放性、可染色性和缩略图地址。

FR59: Epic 2 - 只显示当前 Pokemon 喜好素材和稳定结果计数。

FR36: Epic 2 - 放置素材前设置本次放置是否需要百变怪技能。

FR37: Epic 2 - 放置后修改素材实例的技能标记。

FR38: Epic 2 - 为素材实例维护技能类型。

FR39: Epic 2 - 为素材实例维护技能备注。

FR40: Epic 2 - 在画布中标识需要百变怪技能的素材实例。

FR60: Epic 2 - 使用 `树叶`、`耕地`、`储水` 技能词表和一字标签。

FR61: Epic 2 - 可染色素材实例的颜色选择和格内颜色状态。

FR62: Epic 2 - 非默认朝向的格内旋转标记。

FR41: Epic 3 - 在工作台中查看俯视图预览。

FR42: Epic 3 - 俯视图展示完整 7×7 画布内容。

FR43: Epic 3 - 俯视图展示 5×5 主体区边界。

FR44: Epic 3 - 在工作台中查看正视图预览。

FR45: Epic 3 - 正视图展示主体区、外围装饰区和建筑层高度关系。

FR46: Epic 3 - 选择预览当前建筑层或全部可见建筑层。

FR47: Epic 3 - 控制预览中是否显示网格、主体边界和技能标记。

FR63: Epic 3 - 左下检查器同时展示正视图和俯视图缩略预览。

FR48: Epic 2 - 查看选中格子的坐标、区域类型、建筑层、素材、朝向、染色、技能标记和备注。

FR49: Epic 2 - 在上下文/属性字段中修改选中素材的素材选择、朝向、染色、技能标记、技能备注、格子备注和建筑层归属。

FR50: Epic 4 - 保存当前布景数据、自动保存草稿、dirty/saved 状态，并与后续显式导出共用同一 SceneDocument v1 payload。

FR51: Epic 4 - SceneDocument v1 结构化序列化、保存/自动保存/恢复和后续显式导出的唯一 payload 契约。

FR52: Epic 4 - 在保存和序列化数据中包含 sceneId、sceneName、selectedPokemonKey、场景尺寸、画布尺寸、外围扩展格数和 metadata 时间戳。

FR53: Epic 4 - 在保存和序列化数据中包含建筑层、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记、备注和 workspaceState。

FR54: Epic 4 - 重新打开保存数据并还原布景状态。

FR55: Epic 4 - 恢复数据异常时给出字段、原因和修复方向。

FR64: Epic 4 - 将素材搜索/筛选/favorite-only/预览显示选项持久化到 localStorage，且不写入 SceneDocument payload。

FR65: Epic 6 - 从工作台打开图片导出预览。

FR66: Epic 6 - 导出图片包含整体使用素材清单。

FR67: Epic 6 - 导出图片按建筑层展示每层图形。

FR68: Epic 6 - 导出图片按建筑层展示每层使用素材清单，且预览/下载不写入 SceneDocument 或 storage。

## Epic List

### Epic 1: 规则可见的 7×7 布景工作台

用户可以打开一个可运行的 Open Design 工作台，创建标注为 5×5 的场景，看到实际 7×7 画布、中心 5×5 主体区、外围装饰区、0-based 坐标、默认 0/1/2 建筑层、Pokemon/场景名上下文、保存状态和固定浮动面板布局，并能选择格子和理解当前区域。

**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR20, FR56, FR57, FR58.

**Implementation notes:** 该 epic 承载 Vite + React + TypeScript starter、基础项目结构、`SceneDocument` 初始 schema、area calculation、默认建筑层、Open Design 浮动工作台布局、顶部 Pokemon/场景名/保存状态、语义 tokens、移动端 read-only 边界入口和最小测试门禁。它交付的是可见规则与可编辑场景基础，而不是纯技术搭建。

### Epic 2: 素材、建筑层与技能的完整编辑闭环

用户可以通过右侧浮动素材栏搜索、分类和喜好筛选选择素材，在当前建筑层放置、删除、替换、移动、旋转和染色素材，管理建筑层，编辑实例属性，并为具体素材实例维护百变怪技能标记、技能类型、技能备注和普通备注。

**FRs covered:** FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR21, FR22, FR23, FR24, FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR38, FR39, FR40, FR48, FR49, FR59, FR60, FR61, FR62.

**Implementation notes:** 该 epic 将素材库、建筑层、实例属性、染色、朝向和技能标记合并在同一用户价值边界内，因为它们共享 `SceneDocument`、command layer、selectors、Scene Canvas、右侧 Asset Picker、左侧 Building Level Panel 和选中上下文/检查器字段。所有 scene 写操作必须走 typed command layer，并覆盖 locked level、stackability、area compatibility、dirty state、undo/redo 和 mobile read-only guard。

### Epic 3: 俯视图与正视图结构校验

用户可以通过左下 Preview Inspector 同时查看俯视图和基础正视图，校验完整 7×7 布景、5×5 主体边界、外围装饰区、建筑层高度关系、当前层/全部可见层范围、网格显示和技能标记显示。

**FRs covered:** FR41, FR42, FR43, FR44, FR45, FR46, FR47, FR63.

**Implementation notes:** 该 epic 聚焦“预览用于校验”的用户价值。Preview Inspector 和预览渲染必须从同一 scene state 与 shared selectors 派生，不形成独立编辑状态。正视图只表达结构化高度关系，不做真实游戏视角、复杂遮挡或高拟真渲染。

### Epic 4: 保存、恢复与数据可信闭环

用户可以保存、自动保存、重新打开和恢复布景数据；系统能完整保留 sceneId、场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记、备注和 dirty/saved 状态，并在字段缺失、类型错误或坐标越界时给出可执行修复方向。当前 Open Design UI 不暴露显式导出入口，但自动保存和后续显式导出必须共享同一个 SceneDocument v1 payload。

**FRs covered:** FR50, FR51, FR52, FR53, FR54, FR55, FR64.

**Implementation notes:** 该 epic 承载 Recovery Validator、Zod runtime schema、`schemaVersion = 1`、areaType 重算比对、`rotationDegrees` 契约、localStorage UI 偏好边界、safe text rendering、roundtrip tests、dangerous text tests 和恢复失败保护。恢复失败不得覆盖当前 scene、不得创建 partial scene、不得修改 dirty state。显式 Import/Export Validator 可作为后续 UI 扩展，但不得引入不同于自动保存的 payload。

### Epic 5: MVP 范围删减与交互清理

用户可以使用一个更轻量的 Pokopia 布景编辑 MVP：保留 7×7 画布、建筑层、素材放置/删除/替换/旋转/染色、技能标记、双预览、自动保存和恢复；删除建筑层隐藏/锁定、手动保存、保存状态区分、Undo/Redo、素材空状态恢复动作、素材区域阻断校验、堆叠、实例移动、普通备注、可旋转性差异和预览覆盖开关。

**FRs covered:** Approved Course Correction 2026-05-19, FR13 removed, FR14 removed, FR15 removed, FR17 removed, FR18 removed, FR25 removed, FR26 removed, FR47 removed, FR50 updated, FR53 updated, FR64 updated.

**Implementation notes:** 该 epic 承接已批准的 course correction，不改写 Epic 1-4 的完成历史，而是通过 cleanup stories 删除已不属于 MVP 的数据字段、command、UI 入口和测试预期。

### Epic 6: 图片导出预览与图片导出闭环

用户可以在当前 Open Design 工作台中预览一张将要导出的布景图片，并下载该图片作为本地文件。导出图片必须包含整体使用的素材、每层的图形和每层使用的素材；导出不引入导入、JSON 文件导出、分享链接、云同步、账号或在线发布，也不改变 scene state、autosave 或 UI preferences。

**FRs covered:** FR65, FR66, FR67, FR68, NFR29, NFR30.

**Implementation notes:** 该 epic 承接 Epic 3 的 preview selectors、Epic 4 的 `SceneDocument v1` 数据契约和 Epic 5 的简化 MVP 边界。图片导出必须从同一 `SceneDocument` 和 asset catalog 派生整体素材清单、逐层图形和逐层素材清单。该 epic 不新增 import parser、JSON export UI、server route、auth、cloud storage、share URL 或 image upload。

## Epic 1: 规则可见的 7×7 布景工作台

用户可以打开一个可运行的 Open Design 工作台，创建标注为 5×5 的场景，看到实际 7×7 画布、中心 5×5 主体区、外围装饰区、0-based 坐标、默认 0/1/2 建筑层、Pokemon/场景名上下文、保存状态和固定浮动面板布局，并能选择格子和理解当前区域。

### Story 1.1: 从 Vite React TypeScript starter 初始化项目

**Requirements covered:** FR1, FR58, NFR20, NFR21, UX-DR1, UX-DR2, Architecture starter setup.

As a 布景作者,
I want 打开应用后直接看到可用的编辑工作台,
So that 我不需要经过 landing page 或说明页就能开始理解 5×5 布景规则。

**Acceptance Criteria:**

**Given** 仓库中尚未有完整前端应用骨架
**When** dev agent 初始化项目
**Then** 应使用 Vite + React + TypeScript starter 建立客户端优先静态 Web App，并完成依赖安装和初始配置
**And** 不得引入数据库、认证、后端 API、服务端运行时、路由或公开内容页。

**Given** 应用在 1280×720 或以上桌面视口启动
**When** 用户打开首页
**Then** 第一屏应是 Open Design 编辑工作台
**And** 顶部 Pokemon/场景名/保存状态、右侧浮动素材栏、中央 7×7 画布区域、左侧建筑层面板和左下检查器预览区域应形成稳定工作台布局。

**Given** 项目完成初始化
**When** dev agent 检查源码结构
**Then** 应建立 `src/domain/scene/`、`src/domain/assets/`、`src/state/`、`src/components/`、`src/io/`、`src/theme/`、`src/test/` 和 `e2e/` 边界
**And** domain modules 不得 import React、DOM 或 components。

**Given** 项目完成初始化
**When** dev agent 运行质量门禁
**Then** `npm run typecheck`、unit test scaffold、`npm run build` 和 Playwright smoke scaffold 应可执行
**And** production build 输出应是静态 `dist/`，运行时不得依赖 `_bmad-output/`、Node server APIs、数据库或 serverless functions。

### Story 1.2: 建立 5×5 场景与 7×7 画布的领域模型

**Requirements covered:** FR1, FR2, FR3, FR4, FR5, FR20, NFR6, NFR9.

As a 布景作者,
I want 新建场景时自动获得标注为 5×5 的布景和实际 7×7 编辑画布,
So that 我能在明确的规则边界内规划主体区与外围装饰区。

**Acceptance Criteria:**

**Given** 用户创建新的默认场景
**When** 系统生成 `SceneDocument`
**Then** `sceneId`、`sceneName`、`selectedPokemonKey`、`sceneSize`、`canvasSize`、`outerPadding`、`workspaceState` 和 `metadata` 必须完整存在
**And** `selectedPokemonKey` 必须使用 Decor Dex 现有 Pokemon key，`sceneSize` 应为 5×5，`canvasSize` 应为 7×7，`outerPadding` 应为 1。
**And** 场景名称或场景说明中应清楚标注这是 5×5 布景。

**Given** 系统生成默认 `SceneDocument`
**When** dev agent 检查建筑层数据
**Then** 应默认创建 0 层、1 层、2 层三个建筑层
**And** 应提供纯函数或领域规则为后续新增建筑层分配当前最高层号加 1 的层号。

**Given** 任意画布格子坐标
**When** 系统计算格子区域
**Then** x/y 坐标应使用 0-based 坐标并限制在 0..6
**And** x 为 0 或 6、或 y 为 0 或 6 的格子应计算为 `outer`，其他格子应计算为 `main`。

**Given** 领域模型需要表达可放置区域
**When** dev agent 检查 area calculation 和可放置区域规则
**Then** 主体区和外围装饰区都应被标记为 MVP 可放置区域
**And** 该规则应通过 pure domain function 暴露给后续素材放置 story 复用，而不是写死在组件中。

**Given** 领域模型和默认场景规则已实现
**When** dev agent 运行 unit tests
**Then** 测试应覆盖 sceneId、sceneName、selectedPokemonKey、workspaceState、metadata、scene size、canvas size、outer padding、0-based 坐标范围、main/outer 判断、默认 0/1/2 建筑层和新增层号规则
**And** 业务规则测试应位于 domain/state 边界内，不依赖 React 渲染。

### Story 1.3: 渲染规则可见的固定 7×7 画布

**Requirements covered:** FR2, FR3, FR4, FR5, FR6, NFR5, NFR12, NFR17, UX-DR3, UX-DR11.

As a 布景作者,
I want 在中央画布中看到 7×7 网格、中心 5×5 主体区和外围 1 圈装饰区,
So that 我能直观看出哪些格子属于主体布景，哪些格子属于外围装饰。

**Acceptance Criteria:**

**Given** 默认场景已创建
**When** 用户打开桌面工作台
**Then** 中央画布应渲染完整 7×7 网格
**And** 每个格子应稳定映射到唯一 0-based x/y 坐标。

**Given** 7×7 画布已渲染
**When** 用户查看画布
**Then** 中心 5×5 主体区和外围 1 圈装饰区应持续可区分
**And** 区分方式不得只依赖颜色，必须至少结合边框、背景、标签、角标、形态或说明中的两种视觉通道。

**Given** 画布格子处于空场景状态
**When** 用户查看任意主体区或外围区格子
**Then** 格子应表现为可放置区域
**And** 不应暗示外围装饰区不可编辑或不可用于后续放置。

**Given** 右侧素材栏、左下检查器或建筑层区域内容发生变化
**When** 工作台重新渲染
**Then** 7×7 画布整体宽高和单格宽高变化不得超过 1px
**And** 画布网格应保持固定宽高比，页面在 1280px 及以上不应出现横向滚动条。

**Given** dev agent 验证画布组件
**When** 运行组件测试或 Playwright smoke
**Then** 应验证 49 个格子均可被定位，主体区边界可见，外围区可见
**And** 主要画布交互元素应有可访问名称或可被无障碍树识别的标签。

### Story 1.4: 支持格子选择与当前区域上下文

**Requirements covered:** FR6, FR7, NFR1, NFR11, NFR16, NFR18, UX-DR6, UX-DR26, UX-DR33.

As a 布景作者,
I want 点击或键盘移动选择一个画布格子,
So that 我能知道当前编辑对象的坐标、区域类型和建筑层上下文。

**Acceptance Criteria:**

**Given** 用户在桌面编辑模式下看到 7×7 画布
**When** 用户点击任意格子
**Then** 该格子应成为当前选中格子
**And** 选中状态不得只依赖颜色，必须至少结合边框、焦点样式、角标、形态或文本状态中的两种视觉通道。

**Given** 用户选中了任意格子
**When** 上下文/检查器或状态区域更新
**Then** 应显示选中格子的 0-based x/y 坐标、区域类型 `main` 或 `outer`、当前建筑层
**And** 未放置素材时应显示明确空状态，而不是空白面板。

**Given** 用户悬停或聚焦一个格子
**When** 画布展示目标上下文
**Then** 应显示目标坐标、区域类型、当前建筑层和可放置区域状态
**And** 这些信息应从同一个 `SceneDocument` 与 selector 派生，不得在组件中重复实现 area 判断。

**Given** 用户使用键盘操作画布
**When** 用户按 Tab、Shift+Tab、方向键、Enter 或 Space
**Then** 应能访问画布并移动或确认当前选中格
**And** 键盘选择不得改变 scene document 中的素材实例、建筑层或 dirty state。

**Given** 1280×720 桌面视口下的默认场景
**When** 用户选择格子
**Then** 可见状态更新应在 100ms 内完成
**And** 应使用浏览器性能标记、测试辅助函数或等效自动化计时为该交互留下可验证路径。

### Story 1.5: 显示默认建筑层与当前编辑层上下文

**Requirements covered:** FR20, NFR11, NFR19, UX-DR9, UX-DR10.

As a 布景作者,
I want 在工作台中看到默认 0/1/2 建筑层和当前编辑层,
So that 我能理解布景从一开始就是按建筑层组织的。

**Acceptance Criteria:**

**Given** 默认场景已创建
**When** 用户打开工作台
**Then** 建筑层区域应显示 0 层、1 层、2 层
**And** 应清楚标识当前编辑建筑层，默认当前层应来自 scene state 的单一事实来源。

**Given** 用户查看建筑层区域
**When** 建筑层列表渲染
**Then** 数据层号仍按 0 层到 2 层定义，但工作台视觉顺序应按 L2、L1、L0 从高到低展示
**And** 层号、层名称、实例数量、可见/锁定状态和当前层标识不得在 1280×720 桌面视口和 390×844 窄视口下截断到无法识别。

**Given** 默认建筑层规则已实现
**When** dev agent 检查 state 和 domain 边界
**Then** 建筑层列表、当前层状态和画布当前层显示应从同一个 `SceneDocument` 或统一 selector 派生
**And** 组件不得复制建筑层业务字段作为独立 truth。

**Given** 当前层发生变化的能力在后续 epic 中扩展
**When** 本 story 提供建筑层领域规则
**Then** 新增层号分配、层排序和默认层创建规则应已经可由 unit tests 验证
**And** 不应在本 story 实现删除、重命名、复制、隐藏、锁定或素材跨层移动等 Epic 2 范围行为。

**Given** dev agent 运行测试
**When** 测试建筑层默认状态
**Then** 应验证默认层数量为 3、层号为 0/1/2、排序稳定、当前编辑层可见
**And** 建筑层操作入口应具备可访问名称或为后续 story 预留明确的可访问结构。

### Story 1.6: 建立移动端只读边界与响应式规则可见性

**Requirements covered:** NFR19, NFR22, UX-DR27, UX-DR28, UX-DR29, UX-DR30, UX-DR31.

As a 布景作者,
I want 在窄屏设备上仍能查看 7×7 画布、选中格和建筑层上下文,
So that 我可以检查场景规则而不会误触发编辑行为。

**Acceptance Criteria:**

**Given** 视口宽度小于 768px
**When** 用户打开应用或从桌面缩小到移动视口
**Then** 系统应进入 `interactionMode = "readOnly"`
**And** 界面应明确显示只读模式或桌面端编辑状态。

**Given** 系统处于 mobile read-only mode
**When** 用户查看工作台
**Then** 编辑控件、右侧素材栏、保存/删除、建层、上下文操作和染色控件应隐藏或禁用
**And** 只读查看所需的场景、画布、建筑层上下文和预览仍应可访问。

**Given** 系统处于 mobile read-only mode
**When** 用户查看画布
**Then** 7×7 画布、主体区边界、外围区、当前建筑层和选中格状态仍应可访问
**And** 390×844 视口下不得出现控件重叠或关键坐标无法识别。

**Given** 系统处于 read-only mode
**When** 用户点击格子、移动查看焦点或查看当前层上下文
**Then** 应允许选择格子和查看信息
**And** 不得修改 `SceneDocument`、dirty state、undo/redo history、素材实例、染色状态或建筑层数据。

**Given** read-only guard 已实现
**When** dev agent 检查 command layer、canvas pointer handler 和 keyboard handler
**Then** 三处都应检查 `interactionMode`
**And** 禁止放置、移动、删除、旋转、染色、修改技能、修改建筑层、恢复替换、保存 dirty changes、自动保存和撤销/重做等会改变场景的行为。

**Given** dev agent 运行 Playwright smoke
**When** 测试 390×844 mobile read-only flow
**Then** 应验证用户可以查看 7×7 画布、选择格子并看到坐标/区域/建筑层
**And** 应验证任何写入型命令不会改变 scene JSON 或 dirty state。

### Story 1.7: 建立 Pokemon 场景控制、动态主题与语义视觉 tokens

**Requirements covered:** FR56, FR57, UX-DR16, UX-DR17, UX-DR18, UX-DR19, UX-DR20, UX-DR36.

As a 布景作者,
I want 在顶部选择 Pokemon、编辑场景名称并看到保存状态，同时页面背景和少量强调色可以跟随当前 Pokemon 主题变化,
So that 编辑器与 Pokopia Decor Dex 保持产品连续性，同时不影响规则状态识别。

**Acceptance Criteria:**

**Given** 用户打开 Open Design 工作台
**When** 顶部左侧场景控制渲染
**Then** 应显示当前 Pokemon、可搜索的 Pokemon 选择器、场景 `Name` 输入框和 dirty/saved 状态
**And** 这些控件不得遮挡中央 7×7 画布、左侧建筑层面板或右侧素材栏。

**Given** 用户修改场景 `Name` 或切换 Pokemon
**When** 变更成功进入 scene/control state
**Then** dirty/saved 状态应更新
**And** 保存动作成功或失败应通过可访问的状态文本反馈。

**Given** 用户没有选择宝可梦主题
**When** 工作台首次渲染
**Then** 系统使用 Ditto 或中性纸面主题作为 fallback
**And** 该 fallback 不影响 7×7 画布、主体区、外围区和建筑层状态识别。

**Given** 用户选择或系统设置当前宝可梦主题
**When** Dynamic Pokemon Theme Shell 更新页面背景和少量强调色
**Then** `pokemonBackground`、`pokemonBackgroundInk` 和 `pokemonAccent` tokens 应更新
**And** 文字前景色必须根据背景亮度保持可读。

**Given** 动态主题色发生变化
**When** 主体区、外围区、选中格、悬停格、技能标记、锁定层或错误状态渲染
**Then** 这些语义状态继续使用稳定 semantic tokens
**And** 不得被宝可梦主题色覆盖或混淆。

**Given** 用户开启 `prefers-reduced-motion`
**When** 宝可梦主题变化
**Then** 背景过渡应被禁用或缩短
**And** 不得影响键盘焦点、画布尺寸或当前选中格状态。

**Given** dev agent 检查视觉基础样式
**When** 查看 tokens 和基础 CSS
**Then** 应包含布局 tokens、语义色 tokens、网格 tokens、动态宝可梦主题 tokens、纸面面板色、Open Design 色板和 typography tokens
**And** 工具区域不得使用 hero-scale 字号、营销页式说明区块或卡片套卡片结构。

## Epic 2: 素材、建筑层与技能的完整编辑闭环

用户可以通过素材搜索和筛选选择素材，在当前建筑层放置、删除、替换、移动和旋转素材，管理建筑层，编辑实例属性，并为具体素材实例维护百变怪技能标记、技能类型、技能备注和普通备注。

### Story 2.1: 浏览素材并选择当前放置素材

**Requirements covered:** FR8, FR28, FR29, FR34, FR35, FR59, NFR16, NFR21, UX-DR4, UX-DR5.

As a 布景编辑用户,
I want 浏览素材列表并选择当前要放置的素材,
So that 我可以从可理解的素材信息开始编辑布景。

**Acceptance Criteria:**

**Given** 工作台已打开且素材目录来自 repo-local static data 或 bundled JSON/TS data
**When** 用户查看右侧浮动 Asset Picker
**Then** 系统显示素材列表、固定宽度结果计数、缩略图、名称、分类、标签、适用区域、官方 `No.` 素材 ID 和默认技能状态
**And** 素材目录数据结构包含素材 ID、名称、分类、标签、适用区域、喜好状态、默认技能需求、可旋转性、可叠放性、可染色性和缩略图地址。

**Given** 用户聚焦或点击任一素材卡片
**When** 用户选择该素材
**Then** 该素材成为当前待放置素材
**And** 右侧素材栏固定显示当前素材、本次放置默认技能状态、当前建筑层和待放置上下文。

**Given** 用户查看某个素材详情
**When** 用户打开或展开素材详情
**Then** 系统至少显示素材 ID、名称、分类、标签、适用区域、喜好状态、默认技能需求、是否可旋转、是否可叠放、是否可染色和缩略图
**And** 详情中的素材元数据不修改 `SceneDocument`。

**Given** 用户仅使用键盘操作素材列表
**When** 用户通过 Tab、方向键、Enter 或 Space 选择素材
**Then** 素材选择状态与鼠标选择一致
**And** 搜索框、结果计数和素材卡片具备可访问名称或可读说明。

**Given** 用户勾选只显示喜好素材
**When** 当前 Pokemon 有喜好匹配
**Then** Asset Picker 只显示匹配当前 Pokemon 喜好的素材
**And** 结果计数区域保持稳定宽度，不挤压搜索框、筛选项或当前素材区。

**Given** 视口宽度小于 768px
**When** 用户选择素材卡片
**Then** 系统允许查看素材信息
**And** 不允许进入会修改 scene document 或 dirty state 的放置编辑状态。

### Story 2.2: 搜索、分类、喜好、区域与技能筛选素材

**Requirements covered:** FR30, FR31, FR32, FR33, FR59, NFR3, NFR4, UX-DR4, UX-DR25.

As a 布景编辑用户,
I want 按关键词、分类、Pokemon 喜好、适用区域和技能条件筛选素材,
So that 我可以快速找到适合当前格子和编辑意图的素材。

**Acceptance Criteria:**

**Given** 素材目录已加载
**When** 用户输入关键词
**Then** Asset Picker 按素材名称、ID、分类或标签返回匹配结果
**And** 结果计数通过可访问方式更新。

**Given** 用户选择素材分类筛选项
**When** 筛选条件生效
**Then** 列表只显示符合所选分类的素材
**And** 用户可以清除筛选恢复全部结果。

**Given** 用户开启只显示喜好素材
**When** 当前 Pokemon 与素材喜好字段匹配
**Then** 列表只显示当前 Pokemon 喜好的素材
**And** 若没有喜好匹配，空状态应提供关闭喜好筛选或显示全部素材的恢复动作。

**Given** 用户选择适用区域筛选项
**When** 筛选条件生效
**Then** 列表只显示适用于主体区、外围区或全部区域的素材
**And** 素材卡片仍显示其适用区域，避免用户误解放置范围。

**Given** 用户选择技能相关筛选项
**When** 用户按默认需要百变怪技能、技能类型或本次放置技能候选筛选
**Then** 列表只显示符合技能条件的素材
**And** 默认技能状态在每个素材卡片上可见。

**Given** 用户组合关键词、分类、喜好、区域和技能筛选
**When** 没有素材匹配
**Then** 系统显示空状态
**And** 空状态提供清除筛选、显示全部或切换分类的恢复动作。

**Given** 素材目录包含 1,000 个以内素材
**When** 用户输入搜索词、切换筛选或滚动列表
**Then** 首屏可见结果更新在 200ms 目标内完成
**And** 如果一次性渲染超过 100 个素材卡片，列表采用分页、虚拟滚动或等效机制限制首屏渲染量。

### Story 2.3: 将素材放置到当前建筑层并处理覆盖与叠放

**Requirements covered:** FR5, FR9, FR11, FR13, FR36, NFR1, NFR9, NFR10, UX-DR5, UX-DR6, UX-DR7, UX-DR24.

As a 布景编辑用户,
I want 将当前素材放置到当前建筑层的指定格子,
So that 我可以在画布上建立实际布景内容。

**Acceptance Criteria:**

**Given** 用户已选择当前素材和当前编辑建筑层
**When** 用户悬停 7×7 画布中的目标格
**Then** Scene Canvas 显示目标坐标、区域类型、当前建筑层、放置合法性、技能状态和覆盖风险
**And** 主体区、外围区、悬停、不可放置和将覆盖状态不只依赖颜色表达。

**Given** 当前素材适用于目标格区域且当前建筑层未锁定
**When** 用户点击目标格或用键盘确认放置
**Then** 系统通过 typed command layer 在当前建筑层创建素材实例
**And** 画布显示该素材实例、选中状态和必要的技能角标。

**Given** 用户在放置前切换本次放置是否需要百变怪技能
**When** 用户完成放置
**Then** 新实例的技能标记使用本次放置设置
**And** 技能标记绑定到该素材实例，而不是素材模板、全局坐标或建筑层。

**Given** 同一建筑层同一格子已有素材实例
**When** 新素材不可与现有实例叠放
**Then** 系统在执行前提示将替换的影响范围
**And** 用户确认后才用新素材替换已有实例。

**Given** 当前建筑层已锁定或目标区域不兼容
**When** 用户尝试放置素材
**Then** command layer 返回 typed failure result，画布显示原因和修复方向
**And** `SceneDocument`、dirty state 和 undo/redo history 不发生修改。

**Given** 视口宽度小于 768px
**When** 用户通过鼠标、触控或键盘尝试放置素材
**Then** command layer、canvas pointer handler 和 keyboard handler 都阻止该写操作
**And** 用户仍可选择格子查看信息。

### Story 2.4: 删除、移动、旋转、染色与备注单个素材实例

**Requirements covered:** FR10, FR14, FR16, FR17, FR18, FR61, FR62, NFR9, NFR13, NFR25, NFR26.

As a 布景编辑用户,
I want 对已放置素材执行删除、移动、旋转、染色和备注编辑,
So that 我可以调整布景而不丢失实例信息。

**Acceptance Criteria:**

**Given** 用户选中一个已放置素材实例
**When** 用户触发删除操作
**Then** 系统通过 typed command layer 从所在建筑层和坐标删除该实例
**And** 画布、上下文/检查器字段、建筑层实例数量和 dirty state 从同一 scene state 更新。

**Given** 用户选中一个已放置素材实例
**When** 用户将其移动到同一建筑层的另一个合法格子
**Then** 系统更新实例坐标
**And** 保留素材 ID、建筑层、技能标记、技能类型、技能备注、朝向、染色和备注。

**Given** 用户移动素材到已有实例的目标格
**When** 目标格存在叠放或替换风险
**Then** 系统按素材可叠放属性判断是否允许移动
**And** 不允许时在执行前显示原因和可执行修复方向。

**Given** 用户选中支持方向的素材实例
**When** 用户设置朝向为默认 0 度、90 度、180 度或 270 度
**Then** 实例朝向更新并立即反映到画布和上下文/检查器字段
**And** 默认 0 度不显示额外旋转标记，90/180/270 度应在格内以 Ditto-shaped 旋转标记显示；不支持方向的素材不显示可编辑朝向控件或返回明确只读原因。

**Given** 用户选中可染色素材实例
**When** 用户打开格内染色入口并选择颜色
**Then** 实例染色状态更新并在格内染色图标上显示当前颜色
**And** 不支持染色的素材不显示染色入口或返回明确只读原因。

**Given** 用户为已放置素材维护备注
**When** 用户保存备注文本
**Then** 备注作为普通文本写入该素材实例
**And** 使用 `<script>`、`<img onerror>` 等字符串测试时不得执行脚本或破坏页面结构。

**Given** 当前建筑层已锁定或处于 Mobile View-only Mode
**When** 用户尝试删除、移动、旋转、染色或修改备注
**Then** 系统阻止写操作并说明锁定或只读原因
**And** 不修改 `SceneDocument`、dirty state 或 undo/redo history。

### Story 2.5: 创建、重命名、切换、显示隐藏和锁定建筑层

**Requirements covered:** FR19, FR22, FR24, FR25, FR26, FR27, NFR5, NFR12, UX-DR9, UX-DR10.

As a 布景编辑用户,
I want 管理建筑层的基本状态并设置当前编辑层,
So that 我可以按层组织复杂布景内容。

**Acceptance Criteria:**

**Given** 工作台已打开
**When** 用户查看 Building Level Panel
**Then** 系统按数据层号从 0 层到 n 层维护建筑层，并在左侧面板按高层到低层视觉顺序展示，例如 L2、L1、L0
**And** 每层显示层号、层名、实例数量、可见状态、锁定状态和当前编辑层标识。

**Given** 用户创建新的建筑层
**When** 创建命令执行成功
**Then** 系统分配当前最高层号加 1 的层号
**And** 新建筑层出现在正确排序位置并可设为当前编辑层。

**Given** 用户设置当前编辑建筑层
**When** 用户选择另一个建筑层
**Then** 当前编辑层标识更新
**And** 同坐标其他层内容不会被误显示为被覆盖或丢失。

**Given** 用户隐藏建筑层
**When** 可见状态关闭
**Then** 该层数据保留但不参与画布显示
**And** 当前选中格坐标不被重置，7×7 画布整体宽高和单格宽高变化不超过 1px。

**Given** 用户锁定建筑层
**When** 锁定状态开启
**Then** 该层内容以边框、图标、透明度、文本标签或状态说明中的至少两种方式表达锁定
**And** 该层上的放置、删除、移动、旋转、属性修改和层内实例修改被 command layer 阻止。

**Given** 视口宽度小于 768px
**When** 用户尝试创建、重命名、隐藏、显示、锁定、解锁或切换当前编辑写状态
**Then** 只读模式阻止会修改 scene document 的建筑层操作
**And** 仍允许查看建筑层、切换查看层和查看实例详情。

### Story 2.6: 复制和删除建筑层并保护破坏性操作

**Requirements covered:** FR21, FR23, NFR10, NFR15, UX-DR24.

As a 布景编辑用户,
I want 复制建筑层或安全删除建筑层,
So that 我可以快速复用结构并避免误删内容。

**Acceptance Criteria:**

**Given** 用户选择一个建筑层
**When** 用户触发复制建筑层
**Then** 系统创建一个新建筑层并复制原层的素材实例、坐标、`rotationDegrees`、染色、技能标记、技能类型、技能备注和备注
**And** 新层获得新的层号并按 0 到 n 层顺序展示。

**Given** 用户删除空建筑层
**When** 用户确认删除
**Then** 系统移除该建筑层
**And** 如果删除的是当前编辑层，系统切换到一个仍存在的可编辑或可查看建筑层并清楚显示当前层。

**Given** 用户删除非空建筑层
**When** 删除确认弹出
**Then** 确认提示显示建筑层名称、受影响素材实例数量、操作后果、确认和取消操作
**And** 用户取消时 `SceneDocument`、dirty state 和 undo/redo history 不发生修改。

**Given** 用户确认删除非空建筑层
**When** 删除命令执行成功
**Then** 该层及其中素材实例从 scene document 移除
**And** 建筑层列表、画布、上下文/检查器字段和序列化派生状态从同一 scene state 更新。

**Given** 用户尝试删除最后一个建筑层或违反层级规则的建筑层
**When** 删除命令被拒绝
**Then** 系统返回 typed failure result
**And** 错误提示包含操作原因和至少一个修复方向。

**Given** 视口宽度小于 768px
**When** 用户尝试复制或删除建筑层
**Then** command layer 阻止写操作
**And** 页面明确显示 Mobile View-only Mode 不允许修改建筑层。

### Story 2.7: 支持同坐标跨建筑层放置与跨层移动

**Requirements covered:** FR12, FR15, FR17, FR27, NFR9, UX-DR10.

As a 布景编辑用户,
I want 在不同建筑层的同一坐标放置和移动不同素材,
So that 我可以表达垂直层级关系而不是被单层规则限制。

**Acceptance Criteria:**

**Given** 当前场景有多个建筑层
**When** 用户在不同建筑层的同一 x/y 坐标放置不同素材
**Then** 系统允许每个建筑层各自保存该坐标的素材实例
**And** 同层同格叠放规则不错误地应用到不同建筑层之间。

**Given** 用户切换当前编辑建筑层
**When** 同坐标在其他层已有内容
**Then** 画布清楚表达当前层内容和其他可见层内容的关系
**And** 用户不会误以为其他层内容被覆盖或删除。

**Given** 用户选中一个已放置素材实例
**When** 用户将其移动到另一个建筑层
**Then** 系统更新该实例的建筑层归属
**And** 保留素材 ID、坐标、技能标记、技能类型、技能备注、朝向、染色和备注。

**Given** 用户跨层移动素材到目标层同坐标
**When** 目标层同格存在素材
**Then** 系统按目标层内素材可叠放属性判断允许叠放、需要替换确认或拒绝移动
**And** 判断结果在执行前可见。

**Given** 目标建筑层已锁定
**When** 用户尝试移动素材到该层或从该层移出
**Then** command layer 拒绝操作并说明锁定原因
**And** 原实例保持在原建筑层、原坐标和原属性状态。

### Story 2.8: 在上下文/检查器字段查看和编辑选中格子与实例属性

**Requirements covered:** FR48, FR49, NFR11, NFR15, NFR16, UX-DR12, UX-DR26.

As a 布景编辑用户,
I want 在选中上下文、检查器字段或属性抽屉中查看并修改选中格子和素材实例属性,
So that 我可以精确维护实例、技能和备注信息。

**Acceptance Criteria:**

**Given** 用户未选中任何格子或实例
**When** 用户查看选中上下文或检查器字段
**Then** 面板显示可执行提示而不是空白
**And** 空场景仍展示 7×7 画布、默认建筑层和明确下一步。

**Given** 用户选中一个空格子
**When** 用户查看选中上下文或检查器字段
**Then** 面板显示该格子的坐标、区域类型和当前建筑层
**And** 清楚说明当前格子没有素材实例。

**Given** 用户选中一个素材实例
**When** 用户查看选中上下文或检查器字段
**Then** 字段按“实例身份 -> 位置 -> 建筑层 -> 朝向 -> 染色 -> 技能 -> 备注”的顺序展示
**And** 字段至少包含坐标、区域类型、建筑层、素材、朝向、染色、技能标记、技能类型、技能备注和格子备注。

**Given** 用户在上下文/检查器字段中修改选中实例的素材选择、朝向、染色、技能标记、技能类型、技能备注、格子备注或建筑层归属
**When** 字段值通过验证
**Then** 系统通过 typed command layer 更新当前实例
**And** 技能标记只作用于当前实例，不修改素材模板、全局坐标或建筑层。

**Given** 用户在上下文/检查器字段中输入无效字段值或触发不允许的层归属变更
**When** command layer 拒绝修改
**Then** 字段显示错误状态、原因和修复方向
**And** 错误状态不只依赖颜色表达。

**Given** 当前实例位于锁定建筑层或 Mobile View-only Mode
**When** 用户查看选中上下文或检查器字段
**Then** 面板进入只读状态并仍显示完整实例字段
**And** 素材选择、朝向、染色、技能、备注和建筑层归属的写操作被禁止。

### Story 2.9: 在画布和编辑闭环中稳定标识百变怪技能实例

**Requirements covered:** FR36, FR37, FR38, FR39, FR40, FR60, NFR12, NFR17, UX-DR8, UX-DR34.

As a 布景编辑用户,
I want 在放置前后清楚看到并维护需要百变怪技能的素材实例,
So that 我可以准确复现哪些实例需要特殊技能。

**Acceptance Criteria:**

**Given** 用户选择一个默认需要百变怪技能的素材
**When** 该素材进入待放置状态
**Then** 工作台显示本次放置默认技能状态
**And** 用户可以在放置前覆盖本次放置是否需要技能。

**Given** 用户放置一个需要百变怪技能的实例
**When** 画布渲染该实例
**Then** Scene Canvas 在该实例上显示技能角标或等效标识
**And** 标识结合图标、形态、文本、边框或角标中的至少两种视觉通道，不只依赖颜色。

**Given** 用户设置或编辑技能类型
**When** 技能类型控件渲染
**Then** 可选词表只能包含 `树叶`、`耕地`、`储水`
**And** 画布和预览中的技能标记分别显示一字标签 `树`、`耕`、`水` 或等效可访问文本。

**Given** 用户在上下文/检查器字段中切换技能标记、技能类型或技能备注
**When** 修改成功
**Then** 画布中的技能标识立即更新
**And** 同一素材模板的其他实例不受影响。

**Given** 用户为实例清除技能类型或技能备注
**When** 系统保存实例字段
**Then** `skillType` 未设置时使用 `null`
**And** `skillNote` 为空时使用空字符串。

**Given** 用户关闭技能标记显示相关视图选项或隐藏所在建筑层
**When** 画布重新渲染
**Then** 技能实例数据仍保留在 `SceneDocument` 中
**And** 仅显示状态变化，不删除或改写实例字段。

**Given** 用户执行放置、修改技能、移动、跨层移动、删除、撤销或重做
**When** 系统重新派生画布、上下文/检查器字段、建筑层列表和序列化状态
**Then** 技能标记、技能类型和技能备注保持一致
**And** 自动化测试验证这些视图读取同一素材实例字段一致。

## Epic 3: 俯视图与正视图结构校验

用户可以通过左下 Preview Inspector 同时查看俯视图和基础正视图，校验完整 7×7 布景、5×5 主体边界、外围装饰区、建筑层高度关系、当前层/全部可见层范围、网格显示和技能标记显示。

### Story 3.1: 渲染左下双预览检查器

**Requirements covered:** FR41, FR44, FR63, NFR9, UX-DR13.

As a 布景编辑用户,
I want 在工作台左下同时看到俯视图和正视图预览,
So that 我可以在不离开画布的情况下校验当前布景结构。

**Acceptance Criteria:**

**Given** 用户位于桌面或平板编辑工作台，且当前存在有效 `SceneDocument`
**When** Preview Inspector 渲染
**Then** 左下检查器同时显示正视图和俯视图缩略预览
**And** 预览区域不得遮挡中央 7×7 画布、左侧建筑层面板或当前素材上下文。

**Given** 用户查看 Preview Inspector
**When** 场景中已有素材实例、当前建筑层、选中格子或选中实例
**Then** 双预览内容从同一 scene state 和 shared selectors 派生
**And** 预览不得维护独立的素材实例、坐标、建筑层或选中状态副本。

**Given** 用户处于只读模式或 Mobile View-only Mode
**When** 用户查看 Preview Inspector
**Then** 系统允许查看、选择格子或实例、缩放和平移
**And** 不允许通过预览触发放置、移动、删除、旋转、染色、修改技能、保存或 dirty state 变化。

### Story 3.2: 俯视图展示完整 7×7 画布与 5×5 主体边界

**Requirements covered:** FR42, FR43, NFR9, NFR12, UX-DR13, UX-DR34.

As a 布景编辑用户,
I want 俯视图完整展示 7×7 画布并标出中心 5×5 主体区,
So that 我可以确认主体区与外围装饰区的布局是否正确。

**Acceptance Criteria:**

**Given** 用户打开俯视图预览
**When** 当前 scene 使用 7×7 实际画布
**Then** 俯视图显示全部 49 个格子
**And** 每个格子的 0-based x/y 坐标、区域类型和可见素材状态与 `SceneDocument` 派生结果一致。

**Given** 用户打开俯视图预览
**When** 画布中存在中心 5×5 主体区和外围 1 圈装饰区
**Then** 俯视图清楚标识 5×5 主体区边界
**And** 主体区、外围区和边界状态不得只依赖颜色，至少使用边框、纹理、标签、形状或其他视觉通道组合表达。

**Given** 用户在主画布中放置、删除、移动、替换素材或修改技能标记
**When** 俯视图重新渲染
**Then** 俯视图在不读取独立缓存业务状态的情况下反映最新 scene state
**And** 自动化一致性测试验证画布、上下文/检查器字段、建筑层列表和俯视图读取的同一素材实例字段一致。

### Story 3.3: 选择预览当前建筑层或全部可见建筑层

**Requirements covered:** FR46, NFR9, UX-DR13.

As a 布景编辑用户,
I want 控制预览范围为当前建筑层或全部可见建筑层,
So that 我可以分别校验单层细节和多层整体布景。

**Acceptance Criteria:**

**Given** 场景包含多个建筑层，且至少一个建筑层可见
**When** 用户在 Preview Inspector 控制中选择“当前层”
**Then** 预览只显示当前编辑建筑层中可见且未被隐藏层排除的内容
**And** 预览区域明确显示当前层号、层名和当前层预览状态。

**Given** 场景包含多个可见建筑层
**When** 用户在 Preview Inspector 控制中选择“全部可见层”
**Then** 预览按建筑层层号从 0 到 n 的顺序展示所有可见层内容
**And** 隐藏层保留数据但不参与预览显示。

**Given** 用户切换当前建筑层、显示/隐藏建筑层或锁定/解锁建筑层
**When** 当前预览范围为“当前层”或“全部可见层”
**Then** 预览通过 `selectVisibleLevels`、`selectPreviewTiles` 或等效 shared selectors 更新
**And** 不在预览组件中重复实现 level ordering、visibility 或 area 规则。

### Story 3.4: 渲染正视图结构化高度预览

**Requirements covered:** FR44, FR45, UX-DR14.

As a 布景编辑用户,
I want 在左下检查器中查看正视图预览里的主体区、外围区和建筑层高度关系,
So that 我可以校验布景的层级结构是否便于复现。

**Acceptance Criteria:**

**Given** 用户位于编辑工作台且当前存在有效场景
**When** Preview Inspector 渲染
**Then** 正视图作为左下双预览的一部分持续可见
**And** 正视图区域支持独立纵向滚动，不改变中央画布尺寸。

**Given** 用户打开正视图预览
**When** 场景包含主体区、外围装饰区和多个建筑层
**Then** 正视图以结构化方式展示区域分组、层号顺序和高度关系
**And** 正视图不实现真实游戏视角、复杂遮挡、高拟真渲染或会误导用户的透视效果。

**Given** 用户在 scene 中修改建筑层、素材实例位置、可见层或当前层
**When** 正视图重新渲染
**Then** 正视图从同一 scene state 和 shared selectors 派生结构数据
**And** 正视图不得形成可编辑的独立预览状态或写回 scene JSON。

### Story 3.5: 控制预览网格、主体边界和技能标记显示

**Requirements covered:** FR47, NFR13, NFR16, UX-DR13.

As a 布景编辑用户,
I want 分别控制预览中的网格、主体边界和技能标记是否显示,
So that 我可以按校验任务减少干扰或突出关键结构信息。

**Acceptance Criteria:**

**Given** 用户打开俯视图或正视图预览
**When** 用户切换“显示网格”
**Then** 当前预览显示或隐藏网格线
**And** 该切换只影响预览表现，不改变 scene document、素材实例或 dirty state。

**Given** 用户打开俯视图或正视图预览
**When** 用户切换“显示主体边界”
**Then** 当前预览显示或隐藏中心 5×5 主体区边界
**And** 主体区边界的计算仍来自 shared area selectors，而不是预览组件内的重复规则。

**Given** 用户打开俯视图或正视图预览，且场景中存在需要百变怪技能的素材实例
**When** 用户切换“显示技能标记”
**Then** 当前预览显示或隐藏绑定到具体素材实例的技能标记
**And** 技能标记不得绑定到素材模板、全局坐标或建筑层本身。

**Given** 用户使用键盘或辅助技术访问预览切换控件
**When** 焦点移动到网格、主体边界或技能标记显示控制
**Then** 每个控件都有可访问名称，并可通过一次点击或一次键盘确认触发
**And** 控件状态可被自动化无障碍树检查或等效测试验证。

### Story 3.6: 预览性能、响应式与可访问性保障

**Requirements covered:** NFR2, NFR19, NFR20, NFR21, NFR22, NFR23, UX-DR27, UX-DR32, UX-DR33.

As a 布景编辑用户,
I want 预览在不同视口和常见浏览器中保持快速、可访问且不遮挡关键状态,
So that 我可以稳定完成布景结构校验。

**Acceptance Criteria:**

**Given** 桌面浏览器视口为 1280×720 或以上，场景包含 7×7 画布、10 个建筑层且每层最多 49 个素材实例
**When** 用户在俯视图和基础正视图之间切换
**Then** 系统在 300ms 内完成首个可见预览更新
**And** 使用浏览器性能标记或等效自动化计时测量该约束。

**Given** 用户在 1280px 及以上视口使用工作台
**When** 用户打开任一预览模式并切换当前层、全部可见层、网格、主体边界或技能标记
**Then** 完整浮动工作台无横向滚动，且预览控件、当前建筑层、选中格、主体区边界和技能状态均可访问
**And** 右侧素材栏、中央画布、左侧建筑层面板和左下双预览检查器的稳定尺寸避免切换状态导致网格跳动。

**Given** 用户在 768px 以下宽度或 390×844 视口使用 Mobile View-only Mode
**When** 用户打开俯视图或正视图预览
**Then** 页面不得出现控件重叠
**And** 当前建筑层、选中素材、选中格子、主体区边界和技能标记状态必须在当前预览区域或一次操作可达的详情区域中可访问。

**Given** 用户使用键盘、屏幕阅读器或减少动态效果设置
**When** 用户访问 Preview Inspector、预览范围控制和显示选项
**Then** 所有主要预览控件具有可访问名称、可见焦点和 WCAG 2.2 AA 基线可读性
**And** 动态背景或主题过渡不得干扰主体区、外围区、选中、技能标记、锁定层或错误状态识别。

## Epic 4: 保存、恢复与数据可信闭环

用户可以保存、自动保存、重新打开和恢复布景数据；系统能完整保留 sceneId、场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记、备注和 dirty/saved 状态，并在字段缺失、类型错误或坐标越界时给出可执行修复方向。当前 Open Design UI 不暴露显式导出入口，但自动保存和后续显式导出必须共享同一个 SceneDocument v1 payload。

### Story 4.1: 定义 SceneDocument v1 保存数据契约

**Requirements covered:** FR52, FR53, NFR6, NFR8, Additional schema requirements.

As a 布景编辑用户,
I want 系统用稳定的数据契约表达当前布景,
So that 保存、序列化和恢复时不会丢失关键场景信息。

**Acceptance Criteria:**

**Given** 当前编辑器中存在一个 scene state，包含场景名称、当前 Pokemon、场景尺寸、画布尺寸、外围扩展格数、建筑层、素材实例和工作台上下文
**When** 系统将 scene state 序列化为可保存的 SceneDocument
**Then** 输出数据必须包含 `schemaVersion: 1`、`sceneId`、`sceneName`、`selectedPokemonKey`、`sceneSize`、`canvasSize`、`outerPadding`、`buildingLevels`、`tileInstances`、`workspaceState` 和 `metadata`
**And** `selectedPokemonKey` 必须使用 Decor Dex 现有 Pokemon key。
**And** `workspaceState` 必须包含 `currentBuildingLevelId`、`selectedAssetId`、`selectedCoordinate` 和 `saveStatus`，其中 `saveStatus` 只允许 `dirty | saved`。
**And** `metadata` 至少包含 `createdAt`、`updatedAt`、`lastSavedAt` 和 `lastAutosavedAt`。
**And** 每个实例必须包含 `instanceId`、`assetId`、坐标、`areaType`、建筑层归属、`rotationDegrees`、染色状态、技能标记、技能类型、技能备注和普通备注。

**Given** SceneDocument v1 数据契约已经定义
**When** 开发或测试代码校验任意保存/序列化数据
**Then** 必须通过 Zod runtime schema 校验字段存在性、字段类型、枚举值和坐标范围
**And** JSON 字段必须使用 `camelCase`，日期必须使用 ISO 8601 string，所有必需字段缺失时必须校验失败，不得通过缺省规则静默补齐。

**Given** 一个素材实例包含 `x/y` 坐标和传入的 `areaType`
**When** 系统校验或序列化该实例
**Then** 必须使用 `x/y + sceneSize + outerPadding` 的纯函数重新计算权威 `areaType`
**And** `areaType` 只允许 `main | outer`，与重算结果不一致的数据不得被视为可信数据。

**Given** 一个实例未设置技能类型或技能备注
**When** 系统生成 SceneDocument v1
**Then** `skillType` 必须保存为 `null`
**And** `skillNote` 与普通备注必须保存为空字符串而不是缺失字段。

**Given** 一个实例不支持染色或尚未选择颜色
**When** 系统生成 SceneDocument v1
**Then** `dyeColor` 字段必须显式保存为 `null`
**And** 支持染色且已选择颜色的实例必须保留可恢复的颜色值。

### Story 4.2: 保存当前布景并重新打开恢复

**Requirements covered:** FR50, FR54, NFR6, NFR7, NFR14.

As a 布景编辑用户,
I want 保存当前布景并在之后重新打开,
So that 我可以继续编辑之前构建的 7×7 布景。

**Acceptance Criteria:**

**Given** 用户在桌面或平板编辑模式下修改了当前布景
**When** 用户执行保存操作或自动保存草稿触发
**Then** 系统必须保存符合 SceneDocument v1 Zod schema 的当前布景数据
**And** 保存数据必须完整包含 sceneId、场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、所有建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记、备注和 dirty/saved 状态。
**And** 自动保存写入的 payload 必须与后续显式导出使用的 payload 完全相同。

**Given** 当前布景已经成功保存
**When** 用户重新打开保存数据
**Then** 系统必须恢复相同的场景名称、Pokemon、建筑层、当前编辑建筑层、当前素材、选中坐标、可见性、锁定状态、素材实例、坐标、rotationDegrees、染色、技能状态、备注内容和 dirty/saved 状态
**And** 恢复后的 scene state 必须与保存前的可编辑状态等价。

**Given** 保存操作成功完成
**When** 用户继续查看当前布景
**Then** dirty state 必须反映当前数据已经保存
**And** 不得因为保存序列化过程额外产生 undo/redo 编辑记录。

**Given** 用户处于 `<768px` Mobile View-only Mode
**When** 用户查看保存相关控件
**Then** 保存操作不得改变 scene document 或 dirty state
**And** 界面必须明确表达移动端只读限制。

### Story 4.3: 序列化 SceneDocument 并支持 roundtrip 校验

**Requirements covered:** FR51, FR52, FR53, NFR6, NFR7.

As a 布景编辑用户,
I want 系统能将当前布景序列化为结构化数据,
So that 保存、自动保存、恢复和后续显式导出都能使用同一个可信数据契约。

**Acceptance Criteria:**

**Given** 当前 scene state 中存在一个或多个建筑层和素材实例
**When** 系统执行保存、自动保存、未来显式导出、恢复前校验或 roundtrip 测试
**Then** 系统必须生成结构化 SceneDocument v1 JSON-compatible 数据
**And** 序列化数据必须通过同一个 Zod runtime schema 校验。

**Given** 序列化数据包含场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数和 workspaceState
**When** 恢复流程或测试读取数据
**Then** 这些字段必须以明确字段名保存并可被恢复流程直接使用
**And** 不得依赖 UI 默认值补全这些核心尺寸字段。

**Given** 序列化数据包含素材实例
**When** 恢复流程或测试读取数据
**Then** 每个实例必须保留建筑层归属、素材 ID、坐标、重算一致的 `areaType`、`rotationDegrees`、染色字段、技能标记、`skillType`、`skillNote` 和普通备注
**And** `rotationDegrees` 只允许 `0 | 90 | 180 | 270`；UI 中默认 0 度不显示旋转标记，但数据中必须显式保存 `0`。

**Given** 一份由序列化流程生成的 SceneDocument v1 数据
**When** 自动化测试将其恢复后再次序列化
**Then** roundtrip 测试必须证明两次序列化的语义数据一致
**And** 测试必须覆盖空场景、场景名称、Decor Dex Pokemon key、workspaceState、单层多实例、多建筑层、外围格实例、染色、rotationDegrees、技能标记和备注字段。

### Story 4.4: 恢复 SceneDocument 并失败时保护当前布景

**Requirements covered:** FR54, FR55, NFR7, NFR8, NFR15, UX-DR15, UX-DR35.

As a 布景编辑用户,
I want 恢复之前保存的布景数据,
So that 我可以可靠恢复完整场景而不会破坏当前工作。

**Acceptance Criteria:**

**Given** 系统读取一份合法的 SceneDocument v1 数据
**When** 用户确认恢复或应用启动恢复草稿
**Then** 系统必须通过 Zod schema、`schemaVersion`、坐标范围和 `areaType` 重算比对后替换当前 scene
**And** 恢复成功后的布景必须恢复场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记、备注和 dirty/saved 状态。

**Given** 恢复数据缺失 `schemaVersion` 或使用未知 `schemaVersion`
**When** 系统尝试恢复
**Then** 系统必须拒绝恢复并展示 Recovery Validator 错误
**And** 错误必须包含问题字段、失败原因、期望值、实际值和用户可执行的修复方向。

**Given** 恢复数据存在字段缺失、类型错误、非法枚举、坐标超出 7×7 范围或 `areaType` 与坐标重算结果不一致
**When** 系统尝试恢复
**Then** 系统必须生成结构化 `RecoveryError` 项
**And** 每个 `RecoveryError` 必须包含字段路径、失败原因、期望值、实际值和修复方向。

**Given** 当前用户已有未保存的 scene
**When** 恢复校验失败或重新打开保存数据失败
**Then** 系统不得覆盖当前 scene、不得创建 partial scene、不得修改 dirty state
**And** 用户必须可以重试、取消或查看错误详情。

### Story 4.5: 恢复校验 UI 与安全文本渲染

**Requirements covered:** FR55, NFR15, NFR16, NFR25, NFR26, UX-DR15, UX-DR35.

As a 布景编辑用户,
I want 在保存或恢复失败时看到可信且安全的状态反馈,
So that 我可以理解问题并修复数据，而不会被恶意文本或错误提示误导。

**Acceptance Criteria:**

**Given** 用户打开 Recovery Validator
**When** 当前保存或恢复流程产生校验状态
**Then** UI 必须展示成功、失败、待重试和取消状态
**And** 失败状态必须展示字段路径、失败原因、期望值、实际值、修复方向、重试和取消操作。

**Given** 恢复数据中的素材名称、技能备注、普通备注或错误字段值包含 HTML、脚本标签、事件属性或可疑文本
**When** UI 展示这些文本
**Then** 所有用户来源文本必须通过 safe text rendering 显示为文本内容
**And** 不得通过 `innerHTML` 或等价不安全路径执行或插入用户来源标记。

**Given** 用户恢复失败后查看错误详情
**When** 用户选择取消
**Then** 当前 scene、选中实例、建筑层状态和 dirty state 必须保持恢复前状态
**And** 错误详情关闭不得触发任何 scene 写操作。

**Given** 自动化测试覆盖恢复校验 UI
**When** 测试运行 roundtrip 和 unsafe text cases
**Then** roundtrip 测试必须验证序列化后恢复再序列化的数据一致性
**And** unsafe text 测试必须验证备注、技能备注、素材可见字段和 RecoveryError 实际值均不会执行 HTML 或脚本。

### Story 4.6: 将非 payload UI 偏好保存到 localStorage

**Requirements covered:** FR64, NFR3, NFR9.

As a 布景编辑用户,
I want 搜索、筛选和预览显示偏好能在同一浏览器中恢复,
So that 我可以继续使用熟悉的工作台视图，而不会污染保存或导出的场景数据。

**Acceptance Criteria:**

**Given** 用户修改素材搜索词、分类筛选、区域筛选、技能筛选或 favorite-only 状态
**When** 用户刷新页面或稍后重新打开同一浏览器
**Then** 系统必须从 localStorage 恢复这些素材列表 UI 偏好
**And** SceneDocument v1 payload 中不得包含这些搜索或筛选字段。

**Given** 用户修改预览显示选项，例如网格、主体边界、技能标记显示或预览层范围
**When** 用户刷新页面或稍后重新打开同一浏览器
**Then** 系统必须从 localStorage 恢复这些预览 UI 偏好
**And** 自动保存 payload 与后续显式导出 payload 仍必须完全等于 SceneDocument v1 数据结构。

**Given** localStorage 中的 UI 偏好缺失、过期或格式错误
**When** 应用启动并加载 SceneDocument v1
**Then** 系统必须回退到默认 UI 偏好
**And** 不得因此阻止 SceneDocument 恢复、不得修改 scene document、不得修改 dirty state。

## Epic 5: MVP 范围删减与交互清理

用户可以使用一个更轻量的 Pokopia 布景编辑 MVP：保留 7×7 画布、建筑层、素材放置/删除/替换/旋转/染色、技能标记、双预览、自动保存和恢复；删除建筑层隐藏/锁定、手动保存、保存状态区分、Undo/Redo、素材空状态恢复动作、素材区域阻断校验、堆叠、实例移动、普通备注、可旋转性差异和预览覆盖开关。

### Story 5.1: 清理数据模型与 command 能力

**Requirements covered:** Approved Course Correction 2026-05-19; FR13 removed, FR14 removed, FR15 removed, FR17 removed, FR18 removed, FR25 removed, FR26 removed, FR47 removed, FR50 updated, FR53 updated, FR64 updated, NFR18 updated.

As a 布景编辑用户,
I want 编辑器的数据模型和 command 层只保留当前 MVP 能力,
So that 后续实现和验收不会继续维护已删除的复杂功能。

**Acceptance Criteria:**

**Given** dev agent 检查 `SceneDocument`、domain types、serializer、schema 和 roundtrip tests
**When** Story 5.1 完成
**Then** `workspaceState.saveStatus` 和普通实例备注 `note` 不再是 MVP payload 必填字段
**And** `skillNote` 仍作为技能备注保留。

**Given** dev agent 检查 command layer 和 reducer
**When** Story 5.1 完成
**Then** 不再存在或不再暴露素材实例移动、跨层移动、undo/redo history、建筑层 hidden/locked 写操作、同层堆叠、区域阻断校验或 canRotate 分支
**And** 保留放置、删除、替换、旋转、染色、技能标记、技能备注、建筑层创建/删除/重命名/复制/切换、自动保存和恢复。

**Given** 任意素材实例被旋转
**When** 用户选择 0/90/180/270 度
**Then** 所有素材都遵守同一旋转规则
**And** 不再基于素材定义区分是否可旋转。

**Given** 用户在主体区或外围区放置素材
**When** 放置 command 执行
**Then** 系统不因素材适用区域阻断放置
**And** 适用区域仍可作为素材展示/筛选元数据保留。

### Story 5.2: 清理工作台 UI 与预览交互

**Requirements covered:** Approved Course Correction 2026-05-19; UX/PRD UI cleanup; FR47 removed; FR64 updated.

As a 布景编辑用户,
I want 工作台界面不再显示已删除功能入口,
So that MVP 编辑流程更直接、更少误导。

**Acceptance Criteria:**

**Given** 用户打开桌面工作台
**When** 页面渲染
**Then** 不显示手动保存、撤销、重做、建筑层隐藏/锁定、实例移动、普通备注、素材堆叠数量、不可旋转提示、预览网格开关、预览主体边界开关或预览技能标记开关。

**Given** 素材搜索或筛选没有结果
**When** 空状态渲染
**Then** 只显示明确空状态
**And** 不提供清除筛选、显示全部或切换分类等恢复动作。

**Given** 用户查看 Preview Inspector
**When** 俯视图或正视图渲染
**Then** 预览固定不显示网格、5×5 主体边界和技能标记
**And** 不向 localStorage 写入这三类预览显示偏好。

**Given** 用户选中素材实例
**When** Selection Inspector 渲染
**Then** 仍可查看坐标、区域、建筑层、素材、朝向、染色、技能标记和技能备注
**And** 不提供普通备注或建筑层归属移动入口。

### Story 5.3: Mobile 键盘屏蔽与回归测试

**Requirements covered:** Approved Course Correction 2026-05-19; NFR18 updated; Mobile View-only Mode.

As a mobile 查看用户,
I want Mobile 模式下所有应用级键盘操作都无效,
So that 窄视口只读契约不会被键盘路径绕过。

**Acceptance Criteria:**

**Given** 视口宽度小于 768px
**When** 用户按方向键、Enter、Space、Escape、Delete、Backspace、Cmd/Ctrl+S 或任何现有应用级快捷键
**Then** 应用级 keyboard handler 必须 no-op
**And** 不得选择格子、切换建筑层、放置、删除、旋转、保存、恢复覆盖、撤销/重做或改变 scene/view command state。

**Given** 视口宽度小于 768px
**When** dev agent 执行 unit/component/Playwright 回归测试
**Then** mobile keyboard 测试必须证明 scene JSON 在操作前后完全一致
**And** 桌面/平板键盘支持不作为必须通过的功能验收项。

**Given** Story 5.1 和 5.2 已完成
**When** release gate 运行
**Then** `npm run typecheck`、unit tests、`npm run build` 和 Playwright smoke 必须通过
**And** smoke 覆盖自动保存/恢复、被删除 UI 入口不存在、预览覆盖信息不显示，以及 mobile 键盘 no-op。

## Epic 6: 图片导出预览与图片导出闭环

用户可以在当前 Open Design 工作台中预览一张将要导出的布景图片，并下载该图片作为本地文件。导出图片必须包含整体使用的素材、每层的图形和每层使用的素材；导出不引入导入、JSON 文件导出、分享链接、云同步、账号或在线发布，也不改变 scene state、autosave 或 UI preferences。

### Story 6.1: 图片导出摘要模型与逐层导出数据

**Requirements covered:** FR65, FR66, FR67, FR68, NFR29.

As a 布景创作者,
I want 系统能从当前 SceneDocument 生成图片导出所需的整体素材和逐层摘要,
So that 导出的图片能准确表达整个布景和每一层的素材使用。

**Acceptance Criteria:**

**Given** 当前 scene 包含多个建筑层和素材实例
**When** 系统生成 export summary
**Then** 输出整体素材清单，包含素材名称、官方 No. 或 asset id、总使用数量。

**Given** 当前 scene 包含多个建筑层
**When** 系统生成 layer export summaries
**Then** 每个建筑层都有独立图形数据和该层素材清单。

**Given** 素材实例包含技能、染色或非默认旋转
**When** 生成每层素材清单
**Then** 清单至少保留能帮助用户复现的技能、染色和旋转摘要。

**Given** 用户修改 scene 后再次打开导出预览
**When** export summary 重新生成
**Then** export summary 必须反映最新 SceneDocument，不使用过期缓存。

**Given** export summary 生成
**When** 系统完成派生
**Then** 不修改 SceneDocument、autosave storage、saved storage 或 UI preferences。

### Story 6.2: 图片导出预览 UI

**Requirements covered:** FR65, FR66, FR67, FR68, NFR30.

As a 布景创作者,
I want 在下载前预览即将导出的图片,
So that 我能确认图片中包含整体素材、每层图形和每层素材清单。

**Acceptance Criteria:**

**Given** 桌面或平板编辑模式下存在有效 scene
**When** 用户点击 `导出`
**Then** 系统打开图片导出预览面板或 modal。

**Given** 导出预览已打开
**When** 预览内容渲染
**Then** 预览中显示标题区、整体使用素材清单、逐层图形和逐层素材清单。

**Given** 某一层没有素材
**When** 导出预览渲染该层
**Then** 图片预览仍展示该层，并明确显示空层状态。

**Given** sceneName、assetName 或 skillNote 包含 HTML-like 文本
**When** 导出预览渲染
**Then** UI 只能按普通文本显示，不执行 HTML 或脚本。

**Given** 导出预览打开或关闭
**When** 用户不执行下载
**Then** SceneDocument、autosave storage、saved storage 和 UI preferences 均不得改变。

### Story 6.3: 图片文件生成、下载与回归测试

**Requirements covered:** FR66, FR67, FR68, NFR29, NFR30.

As a 布景创作者,
I want 将预览确认过的布景导出图片下载到本机,
So that 我可以分享或保存一个无需导入功能也能阅读的布景说明图。

**Acceptance Criteria:**

**Given** 导出预览有效
**When** 用户点击 `下载图片`
**Then** 浏览器下载 `<sanitized-scene-name>.pokopia-scene.png` 或规划批准的图片格式。

**Given** 用户执行图片下载
**When** 下载完成
**Then** 下载内容必须与预览中的图片语义一致，包含整体使用素材、每层图形和每层使用素材。

**Given** 用户执行图片下载
**When** 系统完成下载触发
**Then** 系统显示轻量成功反馈
**And** 不写入 `pokopia.sceneDocument.v1`、不写入 `pokopia.sceneDocument.autosave.v1`、不改变 SceneDocument。

**Given** `<768px` Mobile View-only Mode
**When** 导出入口被隐藏、禁用或只读渲染
**Then** 不允许任何 scene mutation 或 storage write。

**Given** release gate 运行
**When** dev agent 执行验证
**Then** `npm run typecheck`、unit tests、`npm run build` 和 Playwright smoke 必须通过
**And** 覆盖导出预览、图片下载触发、逐层内容存在和 storage 不变性。
