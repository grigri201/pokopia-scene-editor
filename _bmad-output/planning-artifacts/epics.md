---
stepsCompleted: []
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md
  - _bmad-output/archive/2026-05-31/planning-artifacts/epics-13-completed.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-pokopia-data-extraction.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-05-desktop-workbench-decluttering.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-06-scene-canvas-zoom.md
---

# pokopia-scene-editor - Active Epic Index

As of 2026-06-06, Epic 19 is complete and Epic 20 is the active SceneCanvas 缩放视口 backlog.

Completed planning history is archived here:

- `_bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md`: Epic 1-12 completed product/build history.
- `_bmad-output/archive/2026-05-31/planning-artifacts/epics-13-completed.md`: Epic 13 completed Polish-stage repo boundary, Scene Core libraryization, and data baseline work.

Archived content is historical evidence and must not be treated as active backlog.

## Epic 14: Mobile 导入与下载预览模式重写

Status: done.

Mobile 不再作为桌面工作台的缩窄只读版本，而是成为导入驱动的布景说明预览 surface。移动端进入后读取本地 scene storage；有有效记录时以内联方式展示与 desktop 下载预览完全相同的内容；没有记录时提供“导入字符串”按钮。导入使用自定义 modal，不使用系统 prompt/confirm；导入成功后保存到本地 scene storage。Mobile 仍不提供编辑器能力。

### Story 14.1: Mobile Preview Mode 规划与状态契约

As a mobile 用户, I want 打开 mobile 页面后直接看到本地保存布景的说明预览或导入入口, So that 我不用进入桌面编辑器也能查看/恢复一个布景说明。

Acceptance Criteria:

- PRD、Architecture、UX、Epics 和 sprint-status 同步新增 Epic 14，并明确 mobile 从 View-only Workbench 改为 Preview Mode。
- `<768px` 下不再渲染完整 desktop workbench layout；不得显示素材选择、建筑层编辑、实例编辑、重置或桌面导出 modal 入口。
- Mobile startup 使用 `readLatestSceneDocumentFromStorage()` 读取本地记录。
- 有 valid stored scene 时，mobile 进入 `preview-ready` state，并可生成 `ImageExportSummary`。
- 无 stored scene 时，mobile 进入 `empty` state，只显示“导入字符串”入口。
- Invalid stored scene 时，mobile 不静默成功；显示可读错误和“导入字符串”入口。
- 旧 desktop 编辑工作台、desktop autosave、desktop download preview modal 不回退。

### Story 14.2: ExportPreview 内容拆分并支持 mobile inline 渲染

As a mobile 用户, I want mobile 页面显示和 desktop 下载预览完全一样的布景说明内容, So that 我在手机上看到的素材清单和逐层图形与下载图一致。

Acceptance Criteria:

- `ExportPreview` 拆出共享 content/presentation 层，desktop modal 和 mobile inline 共用同一内容组件。
- Desktop `下载预览` 仍使用 modal/backdrop、`role="dialog"`、focus trap、Escape close、下载按钮和现有下载逻辑。
- Mobile inline preview 不使用 backdrop，不设置 `aria-modal`，不 trap focus，不遮挡页面。
- Mobile inline preview 展示与 desktop preview 同一份 scene-derived content：scene name、Pokemon、canvas dimensions、overall materials、per-layer graphics、per-layer materials、layer notes、footer。
- Mobile inline preview 不写 SceneDocument、autosave、saved storage 或 UI preferences。
- ExportPreview component tests 覆盖 modal 和 inline 两种容器。

### Story 14.3: 自定义导入字符串 modal 与 mobile 导入落盘

As a mobile 用户, I want 通过自定义 modal 粘贴布景字符串并确认导入, So that 没有本地记录时也能在手机上查看布景说明。

Acceptance Criteria:

- Mobile empty state 显示“导入字符串”按钮。
- 点击后打开自定义 modal，包含 textarea、确认、取消和关闭按钮。
- 导入 flow 不调用 `window.prompt` 或 `window.confirm`。
- 确认时复用 `decodeSceneDocumentStringWithLossyRecovery()` 和 `applyRecoveredSceneDocument()`；invalid string 显示错误，不关闭 modal，不写 storage。
- 有 dropped incompatible materials 时，modal 内展示丢弃明细，并要求用户再次确认导入剩余兼容内容。
- 导入成功后写入现有 scene storage 的 autosave slot，清除导入 modal 状态，并在 mobile 页面显示 inline preview。
- 取消或关闭 modal 不改变 scene，不写 scene storage，不写 UI preferences。
- 如 desktop 继续保留“导入字符串”入口，desktop 入口也应复用同一 modal，避免 system prompt/confirm 和 custom modal 两套导入逻辑并存。

### Story 14.4: Mobile preview/import 回归测试与浏览器验证

As a 维护者, I want mobile preview/import flow 有 focused tests 和 smoke 验证, So that 后续不会把 mobile 重新变成旧只读工作台或打破导入落盘。

Acceptance Criteria:

- AppShell/component tests 覆盖 mobile empty、valid storage、invalid storage、import success、invalid import、lossy import、cancel、close。
- Tests 明确断言 mobile import 不调用 system prompt/confirm。
- Tests 明确断言 mobile inline preview 和 desktop modal preview 使用同一 scene summary 内容。
- Playwright 390x844 覆盖 no-storage import path、stored-scene preview path、无编辑控件和无布局重叠。
- Existing desktop edit/autosave/download-preview tests 继续通过。
- 验证命令至少包含 web focused tests、web typecheck、web build 和 Playwright mobile smoke。

## Epic 15: `scene_id` URL 即时访问导入

用户打开 `/?scene_id={id}` 时，scene editor 自动从 scene API 获取导入字符串，并显示对应布景。该入口复用当前 scene string import pipeline，不引入 SceneDocument schema change、账号、云同步或公开方案库。

### Story 15.1: Remote scene import adapter 与 URL contract

As a scene editor maintainer, I want 一个 browser-only remote scene import adapter, So that URL-driven scene loading 与 scene-core 领域规则保持解耦。

Acceptance Criteria:

- 新增 IO adapter 读取并校验 `scene_id` query；空值、缺失、重复值或包含非法 URL path 字符时有确定行为。
- Adapter 请求 `https://scene-api.pokokit.com/api/scenes/{id}`，id 必须经过 `encodeURIComponent` 或等价安全拼接。
- Adapter 解析 API 响应得到 scene string；实现前必须确认并测试精确 response shape。
- Local dev 请求走 Vite dev proxy 或本地 adapter；proxy/server-side upstream request 附带 `Origin: "https://scene-editor.pokokit.com"`。
- Production browser request 直连 `https://scene-api.pokokit.com/api/scenes/{id}`，不手写 Origin header。
- Adapter 返回 typed result：loading/success/not-found/network-error/invalid-response 等，不直接修改 React scene state。
- `packages/scene-core` 不新增 fetch、URL、window 或 environment 依赖。

### Story 15.2: AppShell `scene_id` 启动自动导入 flow

As a scene editor user, I want 打开带 `scene_id` 的链接后自动看到对应布景, So that 我不需要手动复制粘贴导入字符串。

Acceptance Criteria:

- `scene_id` 存在时，startup remote import 优先于 localStorage/default scene 的成功展示；没有 `scene_id` 时现有行为不变。
- Fetch 成功后复用现有 `decodeSceneDocumentStringWithLossyRecovery()` 和 `applyRecoveredSceneDocument()`。
- Desktop 成功后显示可编辑工作台中的导入 scene，并重置选择/placement transient state，行为与手动 import 一致。
- Mobile 成功后显示 inline preview，并按现有 mobile import 规则写入 autosave slot。
- Invalid string / invalid API response / fetch error 不把 default scene 当作 remote success；UI 必须显示错误和可恢复入口。
- Lossy remote import 必须展示 dropped material details，并要求用户确认后才应用兼容内容。
- 远程导入不写 UI preferences，不保存 export summary，不保存 derived footprint/stacking state。
- 成功导入后是否清理 URL query 不在本 story 强制；如清理，必须不破坏 browser back/refresh 预期。

### Story 15.3: Remote import 回归测试与浏览器验证

As a maintainer, I want remote import 有 focused tests 和 smoke coverage, So that scene_id link 不会破坏已有 desktop/mobile import/storage contract。

Acceptance Criteria:

- AppShell/component tests 覆盖 no-query baseline、desktop success、desktop fetch failure、desktop invalid scene string、mobile success、mobile failure、lossy confirmation。
- Tests 断言 local dev 使用 proxy/adapted endpoint，proxy upstream header 包含 Origin；production 使用远程 API URL 且 client fetch 不手写 Origin header。
- Tests 使用 mocked fetch/route，不依赖 live `scene-api.pokokit.com`。
- Playwright desktop 覆盖 `?scene_id=fixture` 自动导入并显示 scene name/Pokemon/material summary。
- Playwright mobile `390x844` 覆盖 `?scene_id=fixture` 自动导入后显示 inline preview、无桌面编辑控件、刷新后仍可从 storage 读取。
- Existing Epic 14 mobile manual import tests 继续通过。
- 验证命令至少包含 focused web tests、web typecheck、web build 和 focused Playwright smoke。

## Epic 16: 建筑层拖动排序

Status: done.

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

## Epic 17: Pokopia Data 独立项目抽取与 Consumer 迁移

把 Pokopia 基础 item/Pokemon 数据从 `pokopia-scene-editor` 和 `../pokopia-color-pattern` 中抽取到新的 sibling project `../pokopia-data`，并让两个 consumer 通过明确 package contract 使用同一份基础数据。首轮迁移不改变终端用户 UI，不改变 `SceneDocument v1`，不破坏旧 PSE1/PSE2、旧 autosave、`assetId`、`sceneCodecOfficialId` 或 `legacyOfficialIds` 兼容。

### Story 17.1: Course Correction 同步与 Data Ownership 定义

As a 维护者, I want 同步 PRD、Architecture、Epics 和 sprint-status 的 data ownership, So that 后续实现不会继续在两个项目里扩展重复数据源。

Acceptance Criteria:

- PRD 新增 2026-06-04 course correction。
- Architecture 新增 `pokopia-data` / `scene-core` / `pokopia-color-pattern` ownership boundary。
- Epics 新增 Epic 17，tracker 新增 Story 17.1-17.5。
- `docs/data-source-of-truth.md` 更新为跨项目数据来源说明。
- 明确本次不改 `SceneDocument v1`；如未来必须改 schema，需要单独 course correction。

### Story 17.2: 创建 `../pokopia-data` 项目与基础 Contract

As a data consumer developer, I want 一个可安装的 `pokopia-data` package, So that scene editor 和 color pattern 可以读取同一份 Pokopia 基础数据。

Acceptance Criteria:

- 在 sibling directory 创建 `../pokopia-data`，包含 package manifest、TypeScript config、schema/types、generation scripts、fixtures/tests。
- 导入当前两项目的基础源数据，生成 normalized item/Pokemon/color/asset manifest outputs。
- Data package 提供 ESM exports 和 JSON exports；外部 consumer 不需要编译 data project 源码。
- Validation 覆盖 item count、Pokemon count、slug uniqueness、id uniqueness、asset reference existence、schema version、size budget。
- 不引入 scene editor UI、React、SceneDocument、recommendation ranking 或 color pattern routing 依赖。

### Story 17.3: `scene-core` 改为消费 `pokopia-data`

As a scene editor maintainer, I want `scene-core` 从 `pokopia-data` 读取基础数据, So that 编辑器 catalog 不再维护重复 item/Pokemon snapshots。

Acceptance Criteria:

- `packages/scene-core` 新增对 `pokopia-data` 的 package dependency。
- `source-placeable-items.ts`、`source-pokemon-preferences.ts`、`source-pokemon-portraits.ts` 等基础数据改为由 data exports 生成或直接消费。
- `assetCatalog` 输出的 `assetId`、`officialId`、`sceneCodecOfficialId`、`legacyOfficialIds`、name、category、thumbnailUrl 与迁移前兼容。
- Footprint/stacking overrides 首轮保留在 `scene-core`，并继续通过现有 catalog tests 锁定。
- 旧 PSE1/PSE2 codec tests、asset catalog tests、web build 和 file-install smoke 通过。

### Story 17.4: `pokopia-color-pattern` 改为消费 `pokopia-data`

As a color pattern maintainer, I want color pattern 的 compact item / Pokemon index 基础输入来自 `pokopia-data`, So that 推荐和静态页生成不再复制基础数据抓取/解析逻辑。

Acceptance Criteria:

- color pattern scripts 从 `pokopia-data` 读取 item/Pokemon/color/asset manifest 基础数据。
- `generated/data/compact-items.json`、`pokemon-index.json`、`item-colors.json` 的 public schema 尽量保持；必要字段变更需明确 schema version bump。
- recommendation generation、route validation、SSG、dist validation 和 hydrate smoke 不回退。
- Recommendation-specific overrides 和 ranking logic 仍留在 color pattern，不迁入基础 data package。

### Story 17.5: 跨项目 Release Gate 与数据扩展入口

As a 维护者, I want 一个跨项目验证和扩展流程, So that 后续新增 Pokopia 数据只需要改 `pokopia-data` 并能证明两个 consumer 未回退。

Acceptance Criteria:

- 定义标准验证顺序：`pokopia-data` validate/build -> scene editor scene-core tests/build -> scene editor web build -> color pattern validate/build。
- 增加数据扩展文档：新增 item、Pokemon、translation、preference、color override、asset reference 的入口和检查命令。
- 给出 slug/id compatibility checklist，特别覆盖 scene string codec 和 legacy aliases。
- 两个 consumer 的 docs 指向 `pokopia-data`，不再把本地 generated source 作为扩展入口。
- 明确部署仍由各 consumer 项目独立执行；data package 不直接部署 Web。

## Epic 18: 素材暂存区与快速候选素材选择

Status: done.

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

## Epic 19: Desktop 工作台 UI/UX 降噪

Status: done.

Desktop 工作台从“所有能力默认展开”调整为“编辑当前建筑层优先”。顶部文件操作收敛为预览/导出主入口和低频文件/危险操作菜单；左侧变为场景摘要 + 建筑层主面板；底部检查器变为紧凑快捷栏 + 可展开详情区；右侧素材栏浏览优先并按需展示素材详情；常驻 PreviewInspector 清理为独立预览/导出模式；SceneCanvas 新增直接下一层的半透明影子辅助对齐。该能力不改变 `SceneDocument v1`、PSE 字符串、scene autosave/saved payload、export summary、scene-core placement/occupancy/stacking 规则或 Cloudflare deployment 边界。

### Story 19.1: Course Correction 同步与 Desktop 降噪契约

Status: done.

As a 维护者, I want PRD、UX、Architecture、Epics 和 tracker 明确 Desktop 工作台降噪边界, So that 后续实现不会把 UI-only 状态误写入 SceneDocument 或回退已完成功能。

Acceptance Criteria:

- PRD 新增 2026-06-05 Desktop 工作台 UI/UX 降噪 course correction 和 functional requirements。
- UX Design Specification 新增顶部、左侧、底部、右侧、独立预览、下层影子交互规格。
- Architecture 新增 AppShell / SceneCanvas / AssetPicker / SelectionInspector / ExportPreview / MobilePreviewMode / PreviewInspector 清理边界。
- Epics 新增 Epic 19 和 stories。
- sprint-status 新增 Epic 19 tracker entries。
- 明确本次不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、scene-core 持久契约或 Cloudflare deploy 边界。

### Story 19.2: 顶部文件/分享工具栏收敛

As a desktop 编辑用户, I want 顶部只保留高频预览/导出入口并把低频文件操作收进菜单, So that 首屏横向动作区更容易扫描且危险操作不易误触。

Acceptance Criteria:

- 1280px desktop 下顶部不再平铺导出字符串、导入字符串、下载预览、语言、重置五类操作。
- “预览/导出”或“分享预览”作为高频主入口，1 步打开独立预览/导出模式。
- “导出字符串 / 导入字符串 / 重置”仍可在 1-2 步内访问。
- “重置”在视觉、分组和确认流程上作为危险操作处理。
- 菜单支持 Escape、点击外部关闭、焦点进入/返回、aria-label、aria-expanded 和键盘导航。
- 不改变导入/导出字符串业务语义。

### Story 19.3: 左侧场景摘要与建筑层主面板

As a desktop 编辑用户, I want 左侧默认展示紧凑场景摘要并把建筑层列表作为主工作区, So that 多层布景中我能看到更多建筑层并快速切层。

Acceptance Criteria:

- 场景摘要默认只展示场景名、Pokemon、画布尺寸摘要。
- 展开后显示场景名输入、Pokemon 选择、画布宽高控件。
- 展开/折叠状态只写 UI preferences/localStorage，不写 SceneDocument。
- 1280x720 下建筑层列表可见高度增加。
- 当前层明显可见，非当前层降低视觉重量。
- 行内重命名、复制、删除等操作按需浮现，但 hover/focus/keyboard 均可访问。
- Epic 16 整行拖拽排序、edge drop、键盘 fallback 和 autosave 行为不回退。

### Story 19.4: 底部检查器紧凑快捷栏与详情区

As a desktop 编辑用户, I want 底部默认只显示当前选择和高频操作, So that 画布下方不再被完整表单占满。

Acceptance Criteria:

- 第一层快捷栏高度稳定，选中/未选中状态不会导致画布明显跳动。
- 快捷栏展示当前素材缩略图/名称、坐标、建筑层、旋转、删除、树叶/耕地/储水技能按钮。
- 无选中素材时显示清晰空状态，不展示大量 disabled 按钮。
- 第二层详情区可展开，包含层备注、技能备注和未来实例详情。
- 层备注新增、编辑、删除能力保留。
- 只读模式下编辑动作 disabled，查看信息仍可读。
- 图标按钮都有 tooltip / aria-label。

### Story 19.5: 右侧素材详情按需展开

As a desktop 编辑用户, I want 在浏览素材时按需查看关键规则, So that 我能理解 footprint、rotation、dye 和叠放规则而不靠试错。

Acceptance Criteria:

- 素材列表默认仍以搜索、分类、分页、素材浏览为优先。
- 素材详情入口对普通用户可见，不再只存在于 sr-only 区域。
- 详情展示名称、缩略图、官方编号、assetId、分类、标签、Pokemon 喜好、footprint、可旋转、可染色、可叠放/特殊规则和当前待放置旋转状态。
- 打开详情不改变当前待放置素材；只有明确“使用/放置”才选择素材。
- 详情 surface 不长期挤压素材列表过多空间。
- 新详情状态只属于 UI-only，不进入 SceneDocument、PSE、export summary 或 staging storage contract。

### Story 19.6: 独立预览模式与 PreviewInspector 清理

As a desktop 编辑用户, I want 通过独立入口进入预览/导出模式, So that 编辑态保持专注但我仍能检查整体和逐层导出内容。

Acceptance Criteria:

- Desktop 工作台不再常驻显示 PreviewInspector。
- 预览/导出入口打开独立模式、modal 或页面内切换模式。
- 独立预览展示整体素材清单、逐层图形、逐层素材清单和层备注。
- 支持下载整体图片和按层下载图片。
- `ExportPreview` / `MobilePreviewMode` 已有内容不回退。
- 删除或废弃 `PreviewInspector` 组件、测试、样式、i18n 和规划文档旧描述。
- `docs/功能验收-checklist.md` 中“预览检查器”改为“独立预览/导出模式”验收。
- 预览模式不写 SceneDocument、不触发 scene autosave、不保存 export summary。

### Story 19.7: SceneCanvas 下层影子辅助模式

As a 多层布景编辑用户, I want 在当前层看到直接下一层的半透明素材影子, So that 我可以对齐家具、墙体和装饰而不频繁切层。

Acceptance Criteria:

- 编辑 L0 时不显示下层影子。
- 编辑 L1 时可看到 L0 的半透明影子；编辑 L2 时可看到 L1 的半透明影子。
- 只显示直接下一层，不显示所有低层。
- 影子透明度约 25%-35%，位于当前层真实素材之后，且不遮挡 placement preview、选中态和当前层操作标记。
- 影子按 lower layer 的 footprint、rotation 和 dye 渲染；不显示技能标记、备注或可操作 affordance。
- 影子不可选中、不可删除、不可旋转、不可触发检查器。
- 点击影子所在格仍按当前层选择/放置逻辑执行。
- 影子不参与 occupancy、stacking、replacement confirmation、footprint conflict、height blocking 或 scene-core placement semantics。
- 下层影子开关默认开启；开关状态只写 UI preferences/localStorage，不进入 SceneDocument、PSE、export payload 或 autosave payload。
- Tests 覆盖 L0 无影子、L1 显示 L0、点击影子不改变规则、placement preview 仍按当前层规则、toggle 不进入 SceneDocument。

### Story 19.8: 降噪回归测试与浏览器布局验证

As a 维护者, I want Desktop 降噪改造有 focused tests 和 viewport smoke, So that UI 收敛不会破坏现有编辑、导入、导出、暂存、排序和 mobile preview。

Acceptance Criteria:

- AppShell tests 覆盖顶部菜单焦点管理、危险重置分组、导入/导出字符串仍可访问、预览/导出入口仍可打开。
- BuildingLevelPanel / Scene summary tests 覆盖摘要展开、UI-only persistence、建筑层排序不回退。
- SelectionInspector tests 覆盖快捷栏、详情区、只读模式、层备注保留。
- AssetPicker tests 覆盖可见详情入口、详情不选择素材、staging 边界不回退。
- SceneCanvas tests 覆盖 lower-layer ghost 渲染层级和不参与交互/placement semantics。
- ExportPreview / MobilePreviewMode tests 继续证明 desktop modal 和 mobile inline content 一致。
- Playwright 覆盖 1280x720 desktop、1000px tablet 和 390x844 mobile：无重叠、桌面可编辑、mobile 不出现编辑工作台。
- 验证命令至少包含 web focused tests、scene-core focused tests、web typecheck、web build 和 desktop/mobile smoke。

## Epic 20: SceneCanvas 缩放视口

Status: in-progress.

Desktop/Tablet 编辑工作台的中央 SceneCanvas 支持用户通过鼠标滚轮和 macOS 触控板缩放手势调整 zoom。最小 zoom 完整显示画布长边；最大 zoom 在默认 17x17 场景中约显示 6x6 格；放大后超出编辑区域的内容被 viewport 隐藏，不撑开页面或侧栏。该能力是 web UI-only view state，不改变 `SceneDocument v1`、PSE 字符串、scene autosave/saved payload、export summary、scene-core placement/occupancy/stacking 规则或 Cloudflare deployment 边界。

### Story 20.1: Course Correction 同步与 SceneCanvas Zoom 契约

Status: done.

As a 维护者, I want PRD、UX、Architecture、Epics 和 tracker 明确 SceneCanvas zoom viewport 边界, So that 后续实现不会把 zoom state 写入 SceneDocument 或破坏已完成工作台布局。

Acceptance Criteria:

- PRD 新增 2026-06-06 SceneCanvas 缩放视口 course correction、FR139-FR143 和 NFR70-NFR72。
- UX Design Specification 新增 wheel/pinch、min/max、裁切和移动端边界。
- Architecture 新增 AppShell/SceneCanvas/styles/ui-preferences/test responsibility。
- Epics 新增 Epic 20 和 stories。
- sprint-status 新增 Epic 20 tracker entries。
- 明确不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、scene-core 持久契约或 Cloudflare deploy 边界。

### Story 20.2: SceneCanvas Zoom Viewport 与输入手势

Status: ready-for-dev.

As a desktop/tablet 编辑用户, I want 用鼠标滚轮或 macOS 触控板缩放编辑区, So that 我可以在完整画布和局部 6x6 细节之间切换。

Acceptance Criteria:

- SceneCanvas 外层有稳定 viewport，默认完整显示当前画布长边。
- 编辑区域内鼠标滚轮调整 zoom；外部素材栏、建筑层面板和底部检查器滚动不被拦截。
- macOS trackpad pinch 映射到同一 zoom state；Safari 兼容路径受 feature detection 保护。
- Zoom scale clamp 为 `[1, max(1, max(canvas.width, canvas.height) / 6)]`。
- 默认 17x17 场景最大 zoom 约显示 6x6 格；legacy 7x7 最大 zoom 约显示 6x6；6x6 画布不额外放大。
- 放大后超出 viewport 的内容隐藏，不产生页面级横向滚动。
- 缩放不改变选中格、hover target、placement preview、下层影子、当前层或 scene command 行为。

### Story 20.3: Zoom 回归测试与浏览器布局验证

Status: ready-for-dev.

As a 维护者, I want SceneCanvas zoom 有 focused tests 和 viewport smoke, So that 缩放不会破坏编辑、布局、导出或 mobile preview 边界。

Acceptance Criteria:

- SceneCanvas/AppShell tests 覆盖 wheel zoom、pinch mapping、min/max clamp、canvasSize change clamp 和 zoom state 不进入 SceneDocument/autosave。
- Tests 覆盖 selected/hover/focus/placement callbacks 在 zoom 后仍按原坐标工作。
- Playwright 覆盖 1280x720 desktop 和 1024x768 tablet：min zoom 全长边可见、max zoom 约 6x6、超出内容隐藏、无面板重叠、页面无横向滚动。
- Mobile 390x844 smoke 继续证明不渲染 desktop workbench / SceneCanvas zoom viewport。
- 验证命令至少包含 web focused tests、web typecheck、web build 和 desktop/tablet/mobile smoke。
