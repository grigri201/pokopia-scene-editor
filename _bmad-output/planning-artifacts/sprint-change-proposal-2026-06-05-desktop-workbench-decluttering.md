---
date: 2026-06-05
status: approved
trigger: Desktop 工作台 UI/UX 降噪 course correction
recommended_path: Direct Adjustment / 新增 Epic 19
scope_classification: Moderate
schema_change: none
approval_status: approved
approved_at: 2026-06-05T22:07:56+0800
---

# Sprint Change Proposal - Desktop 工作台 UI/UX 降噪

## 1. Issue Summary

Desktop 编辑器功能已经较完整，但首屏同时暴露顶部文件操作、左侧场景设置、建筑层列表、中央画布、底部检查器、右侧素材栏和旧预览规划，导致复杂场景编辑时扫描成本偏高。当前产品阶段已经从 MVP 进入 Polish，工作台需要从“所有能力同时展开”调整为“围绕当前建筑层编辑的分层工作台”。

触发点不是实现失败，而是新的产品方向：桌面工作台应减少默认可见信息量，让用户更专注当前建筑层，同时仍能快速访问预览/导出、导入/导出字符串、场景设置、层备注、素材详情和下层参考。

当前证据：

- PRD 与 Architecture 仍保留旧 Open Design 叙述：顶部/左右/底部与双预览检查器共同组成首屏工作台。
- `_bmad-output/planning-artifacts/ux-design-specification.md` 仍写明 `Preview Inspector` 需要保持；`docs/功能验收-checklist.md` 仍有“预览检查器”整段验收。
- `apps/web/src/components/preview-inspector/PreviewInspector.tsx` 和对应测试仍存在，但当前 `AppShell` 已主要依赖 `ExportPreview` / `MobilePreviewMode` 承载预览与下载。
- `AppShell` 顶部仍平铺“导出字符串 / 导入字符串 / 下载预览 / 语言 / 重置”，其中“重置”虽然有 danger class，但与普通文件操作仍处于同一横向动作区。
- `SelectionInspector` 已有快捷栏雏形，但层备注仍默认跟随显示，底部区域仍承担过多角色。
- `AssetPicker` 的素材详情入口目前是 sr-only，普通用户无法可靠查看 footprint、rotation、dye、stacking 等关键规则。

本 proposal 使用 batch 模式一次性给出影响分析和变更建议。用户已选择 A 批准；已同步 PRD/UX/Architecture/Epics/sprint-status 和 Story 19.1。未进入实现代码修改。

## 2. Impact Analysis

### PRD Impact

PRD 需要新增 2026-06-05 Approved Course Correction，用于明确 Desktop 工作台从“全功能同屏展示”转为“编辑当前建筑层优先”的 Polish 方向。

需要更新的 PRD 语义：

- Desktop 工作台首屏目标从“所有工具同时可见”调整为“当前层编辑上下文、画布、建筑层列表和素材浏览优先”。
- 顶部文件操作改成收敛入口：预览/导出作为高频主入口；导入字符串、导出字符串、重置进入文件/更多操作菜单或分组面板。
- 场景设置改为“场景摘要 + 按需展开编辑控件”；建筑层面板成为左侧主工作区。
- 底部检查器改为“紧凑快捷栏 + 可展开详情区”；层备注保留，但不占据默认主视线。
- 右侧素材栏改为浏览优先，素材详情按需展开，并向普通用户展示关键规则。
- 桌面工作台不再保留常驻 PreviewInspector；预览/导出进入独立模式、modal 或页面内模式。
- 新增“下层影子”作为 UI-only 画布辅助模式，用于显示直接下一层的半透明参考。

PRD 不需要改变：

- `SceneDocument v1`。
- PSE1/PSE2 scene string 兼容性。
- `scene-core` placement、occupancy、stacking 或 export summary 业务语义。
- Mobile Preview Mode 作为导入驱动预览 surface 的边界。
- Epic 14、Epic 16、Epic 18 已完成成果。

### UX Design Impact

UX Design Specification 需要同步 6 个方向：

1. 顶部工具栏收敛
   - 顶部只保留一个高频主入口，推荐命名为“预览/导出”或“分享预览”。
   - “导出字符串 / 导入字符串 / 重置”进入文件/更多操作菜单或分组面板。
   - “重置”必须作为危险操作，在视觉、分组和确认流程上与导入/导出区分。
   - 菜单必须定义打开/关闭、Escape、点击外部关闭、焦点进入/返回和可访问名称。
   - 语言选择可留在顶部，但视觉重量要低于编辑主动作。

2. 左侧“场景摘要 + 建筑层主面板”
   - 场景摘要默认紧凑展示场景名、Pokemon、画布尺寸，例如 `初始布景 / 百变怪 / 17x17`。
   - 展开后才显示场景名输入、Pokemon 选择、宽高选择。
   - 展开状态是 UI-only preference，可写 UI preferences/localStorage，不进入 SceneDocument。
   - 建筑层列表获得更多纵向空间；当前层显著，非当前层降权。
   - 行内操作按 hover/focus 或更多按钮浮现，同时保留 Epic 16 整行拖拽排序和键盘 fallback。

3. 底部检查器两层结构
   - 第一层是高度稳定的紧凑快捷栏：当前素材缩略图和名称、当前坐标/建筑层摘要、旋转、删除、树叶/耕地/储水技能按钮。
   - 无选中素材时，显示清晰空状态，不铺开不可用表单。
   - 第二层是可展开详情区：层备注、技能备注、未来素材实例详情。
   - 只读模式下编辑动作 disabled，但查看信息继续可读。
   - 图标按钮必须有 tooltip / aria-label。

4. 右侧素材栏浏览优先，详情按需展开
   - 默认展示搜索、分类、分页、素材列表和暂存区。
   - 详情入口需要普通用户可见，例如行内详情按钮、详情摘要、局部展开或底部抽屉。
   - 详情展示素材名称、缩略图、官方编号、assetId、分类、标签、Pokemon 喜好、footprint、可旋转、可染色、可叠放/特殊规则、当前待放置旋转状态。
   - 查看详情不得改变待放置素材，除非用户明确点击“使用/放置”。
   - 暂存区优化暂缓；只保证详情设计不破坏 Epic 18 的 web-only 边界。

5. 删除 PreviewInspector，预览变成独立模式
   - Desktop 编辑态不再常驻俯视/正视 PreviewInspector。
   - 预览/导出使用独立入口，可复用 `ExportPreview` / `MobilePreviewMode` 的 scene-derived content。
   - 预览态支持整体素材清单、逐层图形和素材清单、下载整体图片、按层下载图片。
   - 清理 `PreviewInspector` 组件、测试、样式、i18n 和 docs/checklist 旧描述。
   - 预览模式不得改变 SceneDocument。

6. 下层影子辅助模式
   - 推荐默认开启，但只在当前层存在直接下一层且下一层有素材时显示；L0 或无下层内容时不显示。
   - 提供 UI-only 开关“下层影子”，可保存到 UI preferences/localStorage，不能进入 SceneDocument。
   - 只显示直接下一层，不做所有低层叠加，避免视觉复杂度失控。
   - 影子透明度建议 25%-35%；显示素材缩略图、footprint、旋转和染色，因为这些影响对齐判断。
   - 不显示技能标记、备注、选择边框、删除/旋转 affordance 或 stacking 交互控制。
   - 影子不可选中、不可删除、不可触发检查器；点击影子所在格仍按当前层逻辑执行。

### Architecture Impact

架构更新应集中在 `apps/web`，保持 `packages/scene-core` 的业务契约稳定。

受影响模块：

- `apps/web/src/components/app-shell/`
  - 顶部文件/分享入口从平铺按钮调整为收敛菜单或分组面板。
  - `AppShell` 继续是 modal、preview、导入、导出、locale、UI preference 和 command wiring 的 owner。
  - 新增 UI-only 状态：场景摘要展开、底部详情展开、素材详情展开、下层影子开关。

- `apps/web/src/components/pokemon-scene-controls/`
  - 由默认完整表单改成摘要/展开结构，或被包进新的 `SceneSummaryPanel`。
  - 编辑控件仍调用现有 scene commands，展开状态不写 scene。

- `apps/web/src/components/building-level-panel/`
  - 保留 Epic 16 行拖拽排序能力。
  - 行内操作视觉收敛，但 keyboard/focus 操作不可丢失。

- `apps/web/src/components/selection-inspector/`
  - 明确拆成 compact quick bar 与 details panel。
  - 层备注从默认主线降为详情区内容。
  - 只读状态下保留信息读取，禁用 edit command。

- `apps/web/src/components/asset-picker/`
  - 素材详情从 sr-only 改为可见的按需 surface。
  - 详情 state 是 UI-only，不写 SceneDocument，不触发 scene autosave。
  - 继续保护 Epic 18 staging order/expanded state 的 UI-only localStorage 边界。

- `apps/web/src/components/preview-inspector/`
  - 实施故事中应删除或废弃该目录、对应测试和样式引用。
  - 如果当前没有 `AppShell` 引用，也要清理规划文档和验收清单，避免误导后续 backlog。

- `apps/web/src/components/export-preview/` 与 `apps/web/src/components/app-shell/mobile-preview-mode.tsx`
  - 作为独立预览/导出模式的内容基础。
  - 不新增 scene write path。

- `apps/web/src/components/scene-canvas/`
  - 增加可选 lower-layer ghost 渲染层。
  - 推荐渲染层级：grid/background -> lower-layer ghost -> current-layer placed assets -> current-layer skill/rotation/height markers -> placement preview/footprint overlay -> selection/focus states。
  - Ghost 数据由 `AppShell` 从当前 `SceneDocument` 和 active level 派生，或由 web-only projection helper 计算；不能改变 `getAssetPlacementPreview()`、occupancy、replacement confirmation、stacking 或 height blocking 规则。
  - 多格 footprint 的 ghost 应按 lower layer 的 effective footprint 渲染为同一个半透明 footprint overlay，而不是每格重复完整素材。

- `apps/web/src/io/ui-preferences.ts`
  - 可扩展 UI-only preferences：scene summary expanded、bottom details expanded、asset detail mode/viewed asset id、lower-layer ghost enabled。
  - 这些 preference 不属于 scene storage、PSE string、export summary 或 `packages/scene-core`。

不应进入架构范围：

- 不新增 `SceneDocument v2`。
- 不把 UI-only 状态写入 scene autosave/saved slot。
- 不改变 `packages/scene-core` placement/occupancy/stacking 规则。
- 不改变 Cloudflare deployment 或 runtime data ownership。

### Epics / Stories Impact

建议新增 Epic 19：Desktop 工作台 UI/UX 降噪。

不回滚 Epic 14、Epic 16、Epic 18。Epic 14 提供独立 preview/export 内容基础；Epic 16 的建筑层排序必须保留；Epic 18 暂存区保持 web-only 候选素材边界，本次不扩大暂存区功能。

建议 Story 拆分：

#### Story 19.1: Course Correction 同步与 Desktop 降噪契约

As a 维护者, I want PRD、UX、Architecture、Epics 和 sprint-status 明确 Desktop 工作台降噪边界, So that 后续实现不会把 UI-only 状态误写入 SceneDocument 或回退已完成功能。

Acceptance Criteria:

- PRD 新增 2026-06-05 Desktop 工作台 UI/UX 降噪 course correction。
- UX Design Specification 新增顶部、左侧、底部、右侧、独立预览、下层影子交互规格。
- Architecture 新增 AppShell / SceneCanvas / AssetPicker / SelectionInspector / ExportPreview / MobilePreviewMode / PreviewInspector 清理边界。
- Epics 新增 Epic 19 和 Story 19.1-19.8。
- sprint-status 新增 Epic 19 entries。
- 明确本次不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、scene-core 持久契约或 Cloudflare deploy 边界。

#### Story 19.2: 顶部文件/分享工具栏收敛

As a desktop 编辑用户, I want 顶部只保留高频预览/导出入口并把低频文件操作收进菜单, So that 首屏横向动作区更容易扫描且危险操作不易误触。

Acceptance Criteria:

- 1280px desktop 下顶部不再平铺导出字符串、导入字符串、下载预览、语言、重置五类操作。
- “预览/导出”或“分享预览”作为高频主入口，1 步打开独立预览/导出模式。
- “导出字符串 / 导入字符串 / 重置”仍可在 1-2 步内访问。
- “重置”在视觉、分组和确认流程上作为危险操作处理。
- 菜单支持 Escape、点击外部关闭、焦点进入/返回、aria-label、aria-expanded 和键盘导航。
- 不改变导入/导出字符串业务语义。

#### Story 19.3: 左侧场景摘要与建筑层主面板

As a desktop 编辑用户, I want 左侧默认展示紧凑场景摘要并把建筑层列表作为主工作区, So that 多层布景中我能看到更多建筑层并快速切层。

Acceptance Criteria:

- 场景摘要默认只展示场景名、Pokemon、画布尺寸摘要。
- 展开后显示场景名输入、Pokemon 选择、画布宽高控件。
- 展开/折叠状态只写 UI preferences/localStorage，不写 SceneDocument。
- 1280x720 下建筑层列表可见高度增加。
- 当前层明显可见，非当前层降低视觉重量。
- 行内重命名、复制、删除等操作按需浮现，但 hover/focus/keyboard 均可访问。
- Epic 16 整行拖拽排序、edge drop、键盘 fallback 和 autosave 行为不回退。

#### Story 19.4: 底部检查器紧凑快捷栏与详情区

As a desktop 编辑用户, I want 底部默认只显示当前选择和高频操作, So that 画布下方不再被完整表单占满。

Acceptance Criteria:

- 第一层快捷栏高度稳定，选中/未选中状态不会导致画布明显跳动。
- 快捷栏展示当前素材缩略图/名称、坐标、建筑层、旋转、删除、树叶/耕地/储水技能按钮。
- 无选中素材时显示清晰空状态，不展示大量 disabled 按钮。
- 第二层详情区可展开，包含层备注、技能备注和未来实例详情。
- 层备注新增、编辑、删除能力保留。
- 只读模式下编辑动作 disabled，查看信息仍可读。
- 图标按钮都有 tooltip / aria-label。

#### Story 19.5: 右侧素材详情按需展开

As a desktop 编辑用户, I want 在浏览素材时按需查看关键规则, So that 我能理解 footprint、rotation、dye 和叠放规则而不靠试错。

Acceptance Criteria:

- 素材列表默认仍以搜索、分类、分页、素材浏览为优先。
- 素材详情入口对普通用户可见，不再只存在于 sr-only 区域。
- 详情展示名称、缩略图、官方编号、assetId、分类、标签、Pokemon 喜好、footprint、可旋转、可染色、可叠放/特殊规则和当前待放置旋转状态。
- 打开详情不改变当前待放置素材；只有明确“使用/放置”才选择素材。
- 详情 surface 不长期挤压素材列表过多空间。
- 新详情状态只属于 UI-only，不进入 SceneDocument、PSE、export summary 或 staging storage contract。

#### Story 19.6: 独立预览模式与 PreviewInspector 清理

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

#### Story 19.7: SceneCanvas 下层影子辅助模式

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

#### Story 19.8: 降噪回归测试与浏览器布局验证

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

### sprint-status Impact

批准后建议在 `_bmad-output/implementation-artifacts/sprint-status.yaml` 增加：

```yaml
  epic_19:
    status: backlog
    title: Desktop 工作台 UI/UX 降噪
    proposal: /Users/grigri/side-project/pokopia/pokopia-scene-editor/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-05-desktop-workbench-decluttering.md
    stories:
      19-1-course-correction-sync-and-desktop-decluttering-contract:
        status: backlog
        title: Course Correction 同步与 Desktop 降噪契约
      19-2-top-file-share-toolbar-consolidation:
        status: backlog
        title: 顶部文件/分享工具栏收敛
      19-3-scene-summary-and-building-level-main-panel:
        status: backlog
        title: 左侧场景摘要与建筑层主面板
      19-4-compact-selection-inspector-and-details:
        status: backlog
        title: 底部检查器紧凑快捷栏与详情区
      19-5-browse-first-asset-details:
        status: backlog
        title: 右侧素材详情按需展开
      19-6-independent-preview-mode-and-preview-inspector-cleanup:
        status: backlog
        title: 独立预览模式与 PreviewInspector 清理
      19-7-scene-canvas-lower-layer-ghost-mode:
        status: backlog
        title: SceneCanvas 下层影子辅助模式
      19-8-decluttering-regression-tests-and-browser-smoke:
        status: backlog
        title: 降噪回归测试与浏览器布局验证
```

## 3. Recommended Approach

推荐 Direct Adjustment / 新增 Epic 19。

理由：

- 这是 Polish 阶段的桌面体验重组，不需要 rollback 已完成能力。
- Epic 14 的 `ExportPreview` / `MobilePreviewMode` 已经为独立预览模式提供基础。
- Epic 16 的建筑层排序正好支撑“建筑层主面板”方向，必须保留而不是重做。
- Epic 18 的暂存区是 web-only UI state，本次右侧详情可以在不扩大暂存区 scope 的情况下并行规划。
- 下层影子可作为 SceneCanvas 的 UI-only projection 实现，不需要修改 `SceneDocument v1` 或 scene-core placement 语义。
- 风险主要来自布局复杂度、焦点管理、ghost layer 视觉误解和回归测试规模，适合用一个 Moderate epic 拆分推进。

不推荐 rollback：

- 回滚 Preview/Export、建筑层排序或暂存区会损失已完成用户价值。
- 当前问题是信息层级和首屏拥挤，不是核心能力错误。

不推荐 PRD MVP Review：

- 产品已进入 Polish 阶段，当前主流程不是不可达。
- 需要的是新增降噪 epic，而不是缩减核心产品目标。

## 4. Detailed Change Proposals

### PRD Proposed Edit

Section: Executive Summary / Approved Course Corrections

OLD:

> 最新 Open Design UI 将第一屏锁定为一个直接可用的编辑工作台：顶部左侧显示当前 Pokemon、场景 `Name` 和保存状态；右侧浮动素材栏提供搜索、分类、喜好筛选、当前素材和固定结果计数；中央保持尺寸驱动画布，新建场景默认 17×17；左侧浮动建筑层面板按 L2/L1/L0 的视觉顺序靠近画布；左下角检查器同时展示正视图和俯视图缩略预览。PRD、Epics 和 Stories 应以该工作台形态为当前实施基准。

NEW:

> Desktop 工作台进入 Polish 降噪阶段。第一屏仍是可用编辑工作台，但默认视觉重点调整为“当前建筑层编辑”：中央尺寸驱动画布、左侧建筑层主面板和右侧素材浏览保持主导；场景设置、文件操作、素材详情、层备注和预览/导出改为摘要、菜单、详情区或独立模式按需展开。常驻 PreviewInspector 不再作为桌面编辑态基准；预览/导出通过独立入口展示整体素材清单、逐层图形、逐层素材清单和下载操作。

新增 Approved Course Correction:

> ### Approved Course Correction - 2026-06-05 Desktop 工作台 UI/UX 降噪
>
> 本 PRD 增加 Epic 19，用于在 desktop/tablet 编辑工作台中降低默认信息密度。顶部文件操作收敛为预览/导出主入口和低频文件/危险操作菜单；左侧改为场景摘要 + 建筑层主面板；底部检查器改为紧凑快捷栏 + 可展开详情区；右侧素材栏以浏览为主，素材详情按需展开；桌面工作台删除常驻 PreviewInspector，预览/导出进入独立模式；SceneCanvas 新增直接下一层的半透明影子作为 UI-only 辅助参考。
>
> `SceneDocument v1` 继续保持。场景摘要展开、底部详情展开、素材详情状态、下层影子开关和文件菜单状态均为 UI-only 状态，不进入 SceneDocument、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core` 持久契约。下层影子只作为视觉投影，不参与 placement、occupancy、stacking、replacement confirmation、height blocking 或 scene-core 规则派生。

Rationale: PRD 必须把产品方向从旧“同屏完整展示”改成“编辑当前层优先”，并提前锁定 no schema change。

### UX Proposed Edit

Section: Approved Course Corrections / Key Design Challenges / Core User Experience

OLD:

> 必须在有限空间中同时呈现素材选择、画布、建筑层、属性和预览状态，避免编辑工具变成分散的多页面流程。

NEW:

> 必须在有限空间中优先呈现当前建筑层编辑所需的信息：画布、当前层、建筑层列表、当前选中对象和素材浏览。低频文件操作、完整场景设置、层备注、素材详情和预览/导出应通过摘要、菜单、详情区或独立模式按需展开，避免默认首屏把所有信息同时摊开。

新增 UX section:

> Desktop 工作台降噪采用信息分层：顶部只保留预览/导出主入口和低重量语言选择；低频导入/导出字符串与危险重置进入可访问菜单。左侧默认显示场景摘要，建筑层列表成为主面板。底部默认显示稳定高度的当前选择快捷栏，详情区按需展开。右侧以素材浏览为主，素材详情按需打开且不隐式选择素材。预览/导出从编辑态拆出为独立模式。SceneCanvas 可显示直接下一层半透明影子，默认开启但可 UI-only 关闭。

Rationale: UX 文档需要从“全上下文不隐藏”更新为“核心上下文可见，低频细节可达”。

### Architecture Proposed Edit

Section: Approved Course Corrections / Component Ownership

OLD:

> `preview-inspector/`：左下正视图/俯视图、当前层/全部层；不提供网格/边界/技能标记显示选项。

NEW:

> `preview-inspector/`：不再作为 desktop 编辑工作台常驻组件。Epic 19 实施时应删除或废弃该目录、测试和样式引用，并把文档验收改为独立预览/导出模式。预览内容继续由 `export-preview/` 和 mobile inline preview 共享的 scene-derived content 承载。

新增 component ownership:

> `scene-canvas/`：可接收 web-only lower-layer ghost projection，用于渲染直接下一层半透明素材参考。Ghost projection 不改变 `SceneDocument`，不调用 scene write command，不参与 `getAssetPlacementPreview()`、occupancy、stacking、replacement confirmation 或 height blocking。点击 ghost 所在格仍走当前层 pointer/keyboard 逻辑。

> `app-shell/`：拥有文件/分享菜单、独立预览模式开关、场景摘要展开、底部详情展开、素材详情展开和下层影子开关等 UI-only state wiring。允许通过 UI preferences/localStorage 持久化这些偏好，但不得写入 scene storage 或 export summary。

Rationale: Architecture 需要把 UI projection 与 scene truth 分开，避免下层影子被误当作 occupancy/schema change。

### Epics Proposed Edit

Section: Active Epic Index

OLD:

> As of 2026-06-04, Epic 18 is complete.

NEW:

> As of 2026-06-05, Epic 18 is complete and Epic 19 is proposed for Desktop 工作台 UI/UX 降噪. Epic 19 remains backlog until this Sprint Change Proposal is approved.

新增 Epic 19 和 Story 19.1-19.8，内容见本 proposal 的 Epics / Stories Impact。

Rationale: 当前 active backlog 已无未完成桌面降噪 epic，需要新 epic 承载，不应 retroactively 修改 done epics。

### sprint-status Proposed Edit

Section: `development_status`

OLD:

> Epic 18 is complete.

NEW:

> Epic 18 is complete. Epic 19 is backlog after proposal approval.

新增 `epic_19` entries，见本 proposal 的 sprint-status Impact。

Rationale: sprint-status 只能在 proposal 获批后同步，否则会把 pending proposal 误标成 active tracker。

### Secondary Docs Proposed Edit

Section: `docs/功能验收-checklist.md`

OLD:

> ## 预览检查器
>
> - [*] 工作台中可以查看俯视图预览。
> - [*] 工作台中可以查看正视图预览。

NEW:

> ## 独立预览/导出模式
>
> - [ ] Desktop 编辑工作台不常驻显示 PreviewInspector。
> - [ ] 用户可通过预览/导出入口打开独立预览模式。
> - [ ] 独立预览展示整体素材清单、逐层图形、逐层素材清单和层备注。
> - [ ] 独立预览支持下载整体图片和按层下载图片。
> - [ ] 预览模式不改变 SceneDocument、不触发 autosave、不保存 export summary。

Rationale: 验收清单不能继续把常驻 PreviewInspector 当作目标，否则会与新产品方向冲突。

## 5. SceneDocument v1 Boundary

本次 proposal 明确不修改 `SceneDocument v1` schema。

不需要 schema change 的原因：

- 顶部菜单、场景摘要展开、详情区展开、素材详情 surface、下层影子开关都是 UI-only preference。
- 下层影子完全可以从现有 `buildingLevels`、`tileInstances`、`assetId`、`coordinate`、`buildingLevelId`、`rotationDegrees`、`dyeColor` 和 catalog metadata 派生。
- Preview/export mode 继续从当前 SceneDocument 和 export summary 派生，不保存第二套预览状态。
- 素材详情展示的是现有 catalog metadata 和当前 placement transient state，不是新的 scene fact。

如果未来出现以下需求，才需要单独 schema course correction：

- 用户要保存每个场景独立的 ghost visibility，而不是全局 UI preference。
- 用户要保存预览模式配置到导出 payload 或 share payload。
- 用户要保存素材详情批注、实例详情备注或手动层间对齐关系。
- 用户要把所有低层可见性、透明度或图层锁定作为 scene fact。

## 6. Checklist Findings

- [x] 1.1 Trigger story: N/A。当前没有 in-progress story；Epic 14/16/18 已完成，需求来自新的 Desktop Polish 方向。
- [x] 1.2 Core problem: Desktop 首屏信息密度过高，编辑当前建筑层的主任务被文件操作、默认展开表单、底部详情、素材详情不可见和旧预览规划分散。
- [x] 1.3 Evidence: PRD/UX/Architecture/docs/checklist 仍有旧工作台/PreviewInspector 语义；代码中 `PreviewInspector` 组件和测试仍存在；`AssetPicker` 详情目前 sr-only；顶部文件动作平铺。
- [x] 2.1 Current epic impact: Epic 18 已完成，不应修改其 done story；本次应新增 Epic 19。
- [x] 2.2 Epic-level changes: 新增 Desktop 工作台 UI/UX 降噪 epic，拆 8 个 stories。
- [x] 2.3 Remaining epics: Epic 14/16/18 需要被保留并作为依赖；Epic 17 数据边界不受影响。
- [x] 2.4 New epic needed: 是。范围横跨 AppShell、SceneCanvas、AssetPicker、SelectionInspector、Preview/Export、文档和测试。
- [x] 2.5 Priority/order: Epic 19 应排在 Epic 18 之后，作为新的 backlog polish epic。
- [x] 3.1 PRD conflicts: 与旧“首屏完整展示/PreviewInspector 常驻”描述冲突，需要更新。
- [x] 3.2 Architecture conflicts: 需要更新 component ownership、PreviewInspector 清理、UI-only state boundary、SceneCanvas ghost projection。
- [x] 3.3 UX conflicts: 需要更新顶部、左侧、底部、右侧、预览、ghost layer 交互规格。
- [x] 3.4 Secondary artifacts: 需要更新 docs checklist、i18n、component tests、AppShell tests、Playwright smoke；不需要 deploy script 或 Cloudflare runtime 更新。
- [x] 4.1 Direct Adjustment: Viable。Effort Medium/High，Risk Medium。
- [x] 4.2 Potential Rollback: Not viable。回滚会损失已完成预览、排序和暂存价值。
- [x] 4.3 PRD MVP Review: Not needed。产品已是 Polish 阶段。
- [x] 4.4 Recommended path: Direct Adjustment / 新增 Epic 19。
- [x] 5.1 Issue summary complete.
- [x] 5.2 Epic/artifact impact complete.
- [x] 5.3 Recommended path complete.
- [x] 5.4 PRD MVP impact: MVP 不缩减；Polish 方向调整。
- [x] 5.5 Handoff plan defined below.
- [x] 6.1 Checklist reviewed.
- [x] 6.2 Proposal accuracy reviewed.
- [x] 6.3 User approval obtained: user selected A on 2026-06-05.
- [x] 6.4 sprint-status updated with Epic 19.
- [x] 6.5 Next steps and handoff defined.

## 7. Implementation Handoff

Scope classification: Moderate.

Recommended route:

- Product Owner / Developer: 批准 proposal 后同步 PRD、UX、Architecture、Epics、sprint-status，并创建 Story 19.1。
- UX Designer: 细化顶部菜单、左侧摘要、底部 quick bar/details、素材详情、独立预览模式和下层影子视觉层级。
- Solution Architect: 审核 UI-only state boundary、SceneCanvas ghost projection 和 PreviewInspector cleanup 是否保持 SceneDocument v1。
- Developer: 按 Story 19.2-19.8 分阶段实现，每个 story 保持 focused tests。

Sequencing:

1. Story 19.1 同步规划工件和 tracker。
2. Story 19.2 顶部工具栏收敛，先降低首屏横向拥挤。
3. Story 19.3 左侧摘要/建筑层主面板，保护 Epic 16 排序。
4. Story 19.4 底部检查器两层结构，保护层备注。
5. Story 19.5 素材详情按需展开，保护 Epic 18 暂存区。
6. Story 19.6 独立预览模式与 PreviewInspector cleanup。
7. Story 19.7 下层影子辅助模式。
8. Story 19.8 回归测试和浏览器验证补齐。

Success criteria:

- 1280x720 desktop 首屏明显减少默认表单和按钮堆叠。
- 用户仍能在 1-2 步内找到导入、导出字符串和重置。
- 当前建筑层、当前选择、素材浏览和画布成为默认主视觉。
- PreviewInspector 不再作为 desktop 常驻工作台要求。
- 下层影子能帮助 L1/L2 对齐但不影响任何放置规则。
- `SceneDocument v1`、PSE strings、export summary、scene-core rules 和 mobile preview/import 边界不变。

## 8. Approval Request

本 proposal 当前为 approved。

建议下一步选择：

- Approved: PRD / UX / Architecture / Epics / sprint-status 已同步，并已创建 Story 19.1。
- Edit: 调整 epic 拆分、ghost 默认状态、预览模式形态或 toolbar 信息架构。
- Hold: 只保留 proposal 文件，不进入 planning artifact sync。
