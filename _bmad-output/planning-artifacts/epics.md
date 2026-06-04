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
---

# pokopia-scene-editor - Active Epic Index

As of 2026-06-04, Epic 17 is the active BMAD planning surface.

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
