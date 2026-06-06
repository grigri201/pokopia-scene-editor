---
date: 2026-06-06
status: approved
trigger: SceneCanvas editing area wheel and macOS trackpad zoom
recommended_path: Direct Adjustment / 新增 Epic 20
scope_classification: Moderate
schema_change: none
approval_status: approved
approved_at: 2026-06-06T12:01:27+0800
mode: Batch
---

# Sprint Change Proposal - SceneCanvas 缩放视口

## 1. Issue Summary

当前 Desktop/Tablet 编辑工作台的中央 SceneCanvas 已经支持默认 17x17、legacy 7x7 和矩形画布，但画布尺寸仍主要由 CSS 变量和视口约束静态决定。用户现在提出新的编辑体验要求：编辑区域可以通过鼠标滚轮或 macOS 触控板缩放手势缩放；最小缩放必须完整显示画布长边；最大缩放时画面内显示约 6x6 格子；超出编辑区域的画布内容必须隐藏。

触发点是新的 Polish 交互要求，不是 SceneDocument 或 scene-core 领域模型缺陷。该能力应作为 web UI-only viewport state 实现，不能写入 `SceneDocument v1`、PSE 字符串、scene autosave/saved payload、export payload、export summary 或 `packages/scene-core` 持久契约。

当前代码证据：

- `apps/web/src/components/scene-canvas/SceneCanvas.tsx` 通过 `--scene-canvas-width-large`、`--scene-canvas-width-medium` 和 `--scene-canvas-width-mobile` 计算静态画布宽度。
- `apps/web/src/styles.css` 中 `.canvas-stage` 已经 `overflow: hidden`，但没有显式的 zoom viewport、wheel/pinch handler 或 zoom bounds。
- `SceneCanvas` 目前没有 `onWheel`、macOS pinch/gesture handler、zoom scale、zoom origin 或 viewport clip contract。
- PRD/UX/Architecture 只允许“缩放、滚动或稳定压缩”作为 17x17 可读策略，尚未定义用户可控 zoom。
- `sprint-status.yaml` 已标记 Epic 19 done；因此本变更不应回改已完成 Epic 19，而应新增 Epic 20 承载 SceneCanvas zoom viewport。

## 2. Checklist Findings

- [x] 1.1 Triggering story: N/A。用户直接提出新的 Desktop/Tablet 编辑区交互要求，不是某个现有 story 实施失败。
- [x] 1.2 Core problem: New requirement emerged from stakeholder。当前画布只能静态适配视口，不能由用户通过滚轮/触控板缩放。
- [x] 1.3 Evidence: 当前 `SceneCanvas` 和 `.canvas-stage` 没有 zoom state/handler；PRD 只保留宽泛的 zoom/scroll allowance。
- [x] 2.1 Current epic impact: Epic 19 在 tracker 中为 done；不建议改成重新 in-progress。
- [x] 2.2 Epic-level change: 新增 Epic 20: SceneCanvas 缩放视口。
- [x] 2.3 Remaining epic impact: Epic 14 mobile preview/import、Epic 18 staging、Epic 19 declutter 不应回退。
- [x] 2.4 New epic need: 需要新增一个中等范围 UI polish epic。
- [x] 2.5 Priority/order: 建议 Epic 20 成为当前 active backlog。
- [x] 3.1 PRD impact: 新增 FR139-FR143 和 NFR70-NFR72；补充 2026-06-06 course correction。
- [x] 3.2 Architecture impact: `apps/web` only；AppShell/SceneCanvas/styles/ui-preferences/tests 受影响；scene-core 不受影响。
- [x] 3.3 UX impact: 需要定义 wheel/pinch interaction、zoom bounds、overflow clipping、focus/selection 可见性和可访问标签。
- [x] 3.4 Other artifacts: `epics.md`、`sprint-status.yaml`、Story files、focused tests 和 Playwright smoke 需要同步。
- [x] 4.1 Direct Adjustment: Viable。新增 Epic 20 + focused stories。
- [x] 4.2 Rollback: Not viable。无须回滚 Epic 19。
- [x] 4.3 PRD MVP Review: Not viable。该项目已进入 Polish，不需要重新定义 MVP。
- [x] 4.4 Recommended path: Direct Adjustment / 新增 Epic 20。

## 3. Impact Analysis

### PRD Impact

PRD 需要新增 2026-06-06 Approved Course Correction，用于明确 Desktop/Tablet 编辑区 zoom viewport 成为当前 Polish backlog。

新增功能要求建议：

- FR139: Desktop/Tablet 编辑工作台的中央 SceneCanvas 必须支持用户通过编辑区域内鼠标滚轮调整缩放比例；滚轮只在编辑区域内拦截，外部面板滚动不受影响。
- FR140: macOS 触控板缩放手势必须映射到同一套 zoom state。Chromium/Firefox 可使用 `WheelEvent` 的 pinch delta，Safari 需要通过受保护的 `gesturestart` / `gesturechange` 兼容路径或等效策略支持。
- FR141: 最小 zoom 必须完整显示当前画布长边。默认 17x17 场景、legacy 7x7 场景和矩形画布都必须从 `scene.canvasSize` 派生 min zoom，不得写死 17 或 7。
- FR142: 最大 zoom 必须以“画面内显示约 6x6 格子”为上限；默认 17x17 场景的最大 zoom factor 为 `17 / 6`，其他尺寸按 `max(canvas.width, canvas.height) / 6` 派生，并至少为 1。
- FR143: 超出编辑区域 viewport 的 SceneCanvas 内容必须被隐藏，不产生页面级横向滚动条；缩放不得改变坐标、素材实例、放置规则、selected/hover/focus 语义或 export preview 内容。

新增非功能要求建议：

- NFR70: SceneCanvas zoom state 必须是 UI-only view state，不得写入 `SceneDocument v1`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core`。
- NFR71: 1280x720 desktop 和 1024x768 tablet 下，缩放到 min/max 都不得让顶部、左侧、底部或右侧面板重叠；页面不得出现横向滚动。
- NFR72: 缩放手势必须保持编辑响应；在 17x17 画布、10 个建筑层、每层最多 289 个素材实例以内，zoom scale 更新应在 100ms 内产生可见反馈。

### UX Design Impact

UX Design Specification 需要补充一个 SceneCanvas Zoom Viewport 规格：

- 缩放入口：鼠标滚轮和 macOS 触控板 pinch gesture。
- 默认状态：进入工作台时使用 min zoom，即完整显示画布长边。
- 最小边界：完整显示画布长边，保证用户能随时看见全局结构。
- 最大边界：默认 17x17 场景中约显示 6x6 格子，允许用户放大检查局部格子、跨格 footprint、旋转、染色、技能标记、height block 和下层影子。
- 裁切行为：放大后超出编辑区域的部分隐藏在 canvas viewport 内；不能扩大页面、挤压侧栏或产生页面级横向滚动。
- 缩放焦点：推荐以指针/手势焦点为缩放中心，缺少坐标时回退为 viewport 中心。这样用户可以先缩小到完整画布，再在关注区域放大。
- 访问性：整体画布 aria label 继续表达 `{width}x{height}`；可增加 zoom scale 的 sr-only status 或测试属性，但不在界面新增说明性文案。
- 移动边界：`<768px` 仍进入 Mobile Preview Mode，不渲染完整 desktop SceneCanvas，也不新增 mobile 编辑 zoom。

开放假设：

- 本 proposal 把“最大显示 6x6 格子”解释为默认方形画布的明确上限；矩形画布按长边派生最大 zoom，长轴约显示 6 格。若产品要求矩形画布也严格显示 6 columns x 6 rows，需要另行定义 viewport aspect strategy。
- 本 proposal 不把独立 pan 纳入首轮 scope。被裁切区域通过“缩小到完整画布后在新焦点处放大”的方式访问。若用户希望放大后直接拖拽平移，应新增 Story 20.4 或扩展 Story 20.2。

### Architecture Impact

架构更新应保持在 `apps/web`：

- `apps/web/src/components/app-shell/`
  - 作为 zoom state owner 或把 zoom state 委托给 canvas viewport wrapper。
  - 在 scene change、canvasSize change 或进入/退出 preview/mobile state 时重置或 clamp zoom。

- `apps/web/src/components/scene-canvas/`
  - 增加 zoom-aware viewport wrapper 或 props：`zoomScale`、`zoomOrigin`、`onWheelZoom`、`onGestureZoom`。
  - 继续让 grid cells 承担现有 pointer、keyboard、hover、focus、selection 和 placement preview 语义。
  - 不修改 `getAssetPlacementPreview()`、occupancy、stacking、replacement confirmation 或 height blocking。

- `apps/web/src/styles.css`
  - 为中央编辑区增加稳定 viewport 尺寸和 `overflow: hidden` clip contract。
  - 用 CSS custom properties 表达 zoom scale 和 transform/width，避免内容变化导致 layout shift。
  - 保持格子固定宽高比、主体/外围区语义色、当前层、下层影子、placement preview 和 selection/focus 层级。

- `apps/web/src/io/ui-preferences.ts`
  - 首轮不强制持久化 zoom scale。若后续需要恢复 zoom，可作为 UI preference，但仍必须与 scene storage 分离。

- Tests
  - `SceneCanvas.test.tsx`: zoom bounds、wheel event clamp、pinch/gesture mapping、canvasSize change clamp、interaction callbacks 不变。
  - `AppShell.test.tsx`: zoom state 不进入 autosave/SceneDocument、mobile 不渲染 desktop zoom viewport。
  - Playwright: 1280x720、1024x768 下 min/max zoom 无重叠；max zoom 约显示 6x6；页面无横向滚动；被裁切内容不撑开 layout。

不应进入架构范围：

- 不新增 `SceneDocument v2`。
- 不把 zoom scale/origin 写入 scene autosave/saved slot。
- 不改变 PSE codec 或 export summary。
- 不改变 `packages/scene-core` dimension、footprint、occupancy、stacking 规则。
- 不改变 Cloudflare Pages deploy 边界。

## 4. Recommended Approach

推荐路径：Direct Adjustment / 新增 Epic 20。

理由：

- 该需求是中等范围 UI polish，不需要回滚已完成 Epic。
- 现有 PRD/UX/Architecture 已允许 17x17 使用缩放/滚动/压缩策略，但缺少用户可控 zoom 细节；新增 story 可以补齐而不改核心 schema。
- 影响集中在 `apps/web` SceneCanvas/AppShell/styles/tests，和 `scene-core` 持久领域契约无关。
- 最大风险是手势语义与裁切后可达性，需要在 UX/Architecture 中明确 min/max、focus-origin 和 no-pan 假设。

范围分类：Moderate。需要规划同步和 backlog 新增，但不需要 PM/Architect 级大重构。

## 5. Detailed Change Proposals

### PRD

Section: Approved Course Corrections

OLD:

```text
### Approved Course Correction - 2026-06-05 Desktop 工作台 UI/UX 降噪
...
```

NEW:

```text
### Approved Course Correction - 2026-06-06 SceneCanvas 缩放视口

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-06-scene-canvas-zoom.md` 增加 Epic 20，用于在 desktop/tablet 编辑工作台的中央 SceneCanvas 增加用户可控缩放。用户可以在编辑区域内通过鼠标滚轮或 macOS 触控板缩放手势调整画布缩放比例；最小缩放完整显示当前画布长边；最大缩放以默认 17x17 场景约显示 6x6 格子为上限；放大后超出编辑区域的内容在 viewport 内隐藏，不撑开页面或侧栏。

`SceneDocument v1` 继续保持。缩放比例、缩放焦点和裁切状态均为 UI-only view state，不进入 `SceneDocument`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core`。缩放不得改变 placement、occupancy、stacking、replacement confirmation、height blocking、下层影子 projection 或导出预览语义。
```

Rationale: 明确 zoom 是当前 Polish backlog，并保持 schema/UI-only 边界。

Section: Functional Requirements

OLD:

```text
- FR138: 下层影子不可选中、不可删除、不可旋转、不可触发检查器；点击影子所在格仍按当前层选择/放置逻辑执行。影子和其开关状态不得写入 `SceneDocument`、PSE 字符串、export payload、autosave payload 或 scene-core 规则状态。
```

NEW:

```text
- FR139: Desktop/Tablet 编辑工作台的中央 SceneCanvas 必须支持用户通过编辑区域内鼠标滚轮调整缩放比例；滚轮只在编辑区域内拦截，外部面板滚动不受影响。
- FR140: macOS 触控板缩放手势必须映射到同一套 zoom state；Chromium/Firefox 可使用 wheel pinch delta，Safari 需要通过受保护的 gesture 兼容路径或等效策略支持。
- FR141: 最小 zoom 必须完整显示当前画布长边。默认 17x17、legacy 7x7 和矩形画布都必须从 `scene.canvasSize` 派生 min zoom，不得写死 17 或 7。
- FR142: 最大 zoom 必须以“画面内显示约 6x6 格子”为上限；默认 17x17 场景最大 zoom factor 为 `17 / 6`，其他尺寸按 `max(canvas.width, canvas.height) / 6` 派生，并至少为 1。
- FR143: 超出编辑区域 viewport 的 SceneCanvas 内容必须被隐藏，不产生页面级横向滚动条；缩放不得改变坐标、素材实例、放置规则、selected/hover/focus 语义或 export preview 内容。
```

Rationale: 把用户提出的 min/max/hidden overflow 要求转成可验收条款。

Section: Non-Functional Requirements

OLD:

```text
- NFR69: 1280x720 desktop 下，顶部工具栏、左侧摘要/建筑层、中央画布、底部快捷栏和右侧素材浏览不得重叠；快捷栏高度必须稳定，不能因选中内容变化导致画布明显跳动。
```

NEW:

```text
- NFR70: SceneCanvas zoom state 必须是 UI-only view state，不得写入 `SceneDocument v1`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core`。
- NFR71: 1280x720 desktop 和 1024x768 tablet 下，缩放到 min/max 都不得让顶部、左侧、底部或右侧面板重叠；页面不得出现横向滚动。
- NFR72: 缩放手势必须保持编辑响应；在 17x17 画布、10 个建筑层、每层最多 289 个素材实例以内，zoom scale 更新应在 100ms 内产生可见反馈。
```

Rationale: 明确性能、布局和数据安全边界。

### UX Design Specification

Section: Approved Course Corrections

OLD:

```text
SceneCanvas 新增“下层影子”辅助模式...
```

NEW:

```text
SceneCanvas 新增用户可控缩放视口：desktop/tablet 编辑区域内，鼠标滚轮和 macOS 触控板缩放手势可以调整画布缩放比例。默认进入完整长边显示；最小缩放完整显示画布长边；最大缩放在默认 17x17 场景中约显示 6x6 格子。放大后超出编辑区域的画布内容在 viewport 内隐藏，不挤压顶部、左侧、底部或右侧面板，也不产生页面级横向滚动。

缩放焦点推荐跟随指针或手势焦点，缺少焦点时回退到 viewport 中心。缩放不新增 scene edit command，不改变当前层、选中格、hover target、placement preview、下层影子或导出预览语义。`<768px` 仍进入 Mobile Preview Mode，不渲染完整 desktop SceneCanvas zoom viewport。
```

Rationale: UX 需要定义用户可感知的手势、边界和裁切效果。

### Architecture

Section: Approved Course Correction / Open Design Workbench Context

OLD:

```text
默认 17x17 画布可以使用内部缩放、滚动或稳定压缩，但不得破坏格子固定宽高比、坐标可读性、主/外围区语义或移动端只读边界。
```

NEW:

```text
默认 17x17 画布必须支持 web UI-only zoom viewport：min zoom 完整显示画布长边，max zoom 按 `max(canvas.width, canvas.height) / 6` 派生，使默认 17x17 场景最大时约显示 6x6 格。`apps/web/src/components/app-shell/` 或 SceneCanvas wrapper 拥有 zoom scale/origin state；`apps/web/src/components/scene-canvas/` 继续拥有格子 pointer/keyboard/hover/focus 和 placement visual state；`apps/web/src/styles.css` 负责 viewport clip 和稳定尺寸。Zoom state 不进入 scene storage、PSE、export payload 或 `packages/scene-core`。
```

Rationale: 把宽泛的“可缩放”转成具体模块责任。

### Epics

Section: Active Epic Index

OLD:

```text
Epic 19: Desktop 工作台 UI/UX 降噪
Status: done.
```

NEW:

```text
## Epic 20: SceneCanvas 缩放视口

Status: backlog.

Desktop/Tablet 编辑工作台的中央 SceneCanvas 支持用户通过鼠标滚轮和 macOS 触控板缩放手势调整 zoom。最小 zoom 完整显示画布长边；最大 zoom 在默认 17x17 场景中约显示 6x6 格；放大后超出编辑区域的内容被 viewport 隐藏，不撑开页面或侧栏。该能力是 web UI-only view state，不改变 `SceneDocument v1`、PSE 字符串、scene autosave/saved payload、export summary、scene-core placement/occupancy/stacking 规则或 Cloudflare deployment 边界。
```

Suggested Stories:

#### Story 20.1: Course Correction 同步与 SceneCanvas Zoom 契约

As a 维护者, I want PRD、UX、Architecture、Epics 和 tracker 明确 SceneCanvas zoom viewport 边界, So that 后续实现不会把 zoom state 写入 SceneDocument 或破坏已完成工作台布局。

Acceptance Criteria:

- PRD 新增 2026-06-06 SceneCanvas 缩放视口 course correction、FR139-FR143 和 NFR70-NFR72。
- UX Design Specification 新增 wheel/pinch、min/max、裁切和移动端边界。
- Architecture 新增 AppShell/SceneCanvas/styles/ui-preferences/test responsibility。
- Epics 新增 Epic 20 和 stories。
- sprint-status 新增 Epic 20 tracker entries。
- 明确不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、scene-core 持久契约或 Cloudflare deploy 边界。

#### Story 20.2: SceneCanvas Zoom Viewport 与输入手势

As a desktop/tablet 编辑用户, I want 用鼠标滚轮或 macOS 触控板缩放编辑区, So that 我可以在完整画布和局部 6x6 细节之间切换。

Acceptance Criteria:

- SceneCanvas 外层有稳定 viewport，默认完整显示当前画布长边。
- 编辑区域内鼠标滚轮调整 zoom；外部素材栏、建筑层面板和底部检查器滚动不被拦截。
- macOS trackpad pinch 映射到同一 zoom state；Safari 兼容路径受 feature detection 保护。
- Zoom scale clamp 为 `[1, max(1, max(canvas.width, canvas.height) / 6)]`。
- 默认 17x17 场景最大 zoom 约显示 6x6 格；legacy 7x7 最大 zoom 约显示 6x6；6x6 画布不额外放大。
- 放大后超出 viewport 的内容隐藏，不产生页面级横向滚动。
- 缩放不改变选中格、hover target、placement preview、下层影子、当前层或 scene command 行为。

#### Story 20.3: Zoom 回归测试与浏览器布局验证

As a 维护者, I want SceneCanvas zoom 有 focused tests 和 viewport smoke, So that 缩放不会破坏编辑、布局、导出或 mobile preview 边界。

Acceptance Criteria:

- SceneCanvas/AppShell tests 覆盖 wheel zoom、pinch mapping、min/max clamp、canvasSize change clamp 和 zoom state 不进入 SceneDocument/autosave。
- Tests 覆盖 selected/hover/focus/placement callbacks 在 zoom 后仍按原坐标工作。
- Playwright 覆盖 1280x720 desktop 和 1024x768 tablet：min zoom 全长边可见、max zoom 约 6x6、超出内容隐藏、无面板重叠、页面无横向滚动。
- Mobile 390x844 smoke 继续证明不渲染 desktop workbench / SceneCanvas zoom viewport。
- 验证命令至少包含 web focused tests、web typecheck、web build 和 desktop/tablet/mobile smoke。

## 6. Implementation Handoff

Scope classification: Moderate.

Recommended route:

- Product/Planning: 用户批准后，同步 PRD、UX、Architecture、Epics、sprint-status，并创建 Story 20.1-20.3 文件。
- Developer agent: 按 Story 20.2 实现 `apps/web` zoom viewport、input handling、CSS clip 和 tests。
- Reviewer agent: 按 Story 20.3 检查 schema boundary、UI-only state、browser smoke 和 no-regression。

Success criteria:

- `SceneDocument v1` 不变。
- wheel/pinch 缩放可用。
- min zoom 完整显示长边。
- max zoom 默认 17x17 约显示 6x6。
- overflow hidden 生效且不撑开页面。
- 桌面/平板无重叠，mobile preview/import 不回退。

Approval:

- Approved by user with `A` on 2026-06-06T12:01:27+0800.
- Planning sync should update PRD、UX、Architecture、Epics、sprint-status and create Epic 20 story files.
