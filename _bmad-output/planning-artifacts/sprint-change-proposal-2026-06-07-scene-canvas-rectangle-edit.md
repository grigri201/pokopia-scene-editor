---
date: 2026-06-07
status: approved
trigger: SceneCanvas rectangular fill and clear drag gestures
recommended_path: Direct Adjustment / 新增 Epic 21
scope_classification: Moderate
schema_change: none
approval_status: approved
approved_at: 2026-06-07T11:58:52+0800
mode: Batch
---

# Sprint Change Proposal - SceneCanvas 矩形填充与清空

## 1. Issue Summary

用户提出新的 SceneCanvas 编辑效率要求：

1. 在一个编辑区格子中按下右键拖动，直到在编辑区格子中放开右键，可以清空这两点中框成的矩形区域中的所有素材。
2. 在锁定素材的状态下，可以通过在一个格子按住左键后拖动，直到在编辑区格子中放开左键，可以直接在编辑区的矩形区域中填充素材。
3. 在没有锁定素材的状态下，编辑区任意位置拖动都是拖动编辑画布。
4. 在锁定素材状态下，按下位置如果不是格子，就拖动编辑画布。
5. 进入矩形填充/矩形清空状态后，如果松开位置不是编辑区格子，就把落点认为是距离松开位置最近的编辑区格子，然后完成矩形编辑。

触发点是新的 Desktop/Tablet 编辑器操作需求，不是 `SceneDocument`、scene-core footprint/occupancy、autosave 或 export summary 的领域模型缺陷。该能力应作为 web 编辑 surface 的 gesture state 和 command-layer 批量编辑实现，保持 `SceneDocument v1` shape 不变。

当前代码证据：

- `apps/web/src/components/scene-canvas/SceneCanvas.tsx` 已拥有 zoom viewport、wheel/pinch zoom、left-pointer canvas pan state、cell click/contextmenu 单格编辑入口。
- `apps/web/src/components/app-shell/AppShell.tsx` 中 `selectCoordinate()` 在存在 `scene.workspaceState.selectedAssetId` 时立即调用 `placeCurrentAsset()`，单格右键通过 `deleteCoordinateMaterial()` 清除当前层目标格最上层素材。
- `apps/web/src/state/asset-placement.ts` 负责单格 placement preview 和 placement command，并复用 scene-core footprint/stacking validation。
- `apps/web/src/state/asset-instance-edit.ts` 负责单个素材实例删除、旋转、染色和技能字段编辑。
- 当前没有 rectangle gesture state、rectangle overlay、nearest-cell release helper、批量清空 command 或批量填充 command。
- `sprint-status.yaml` 已标记 Epic 20 complete，当前没有 active backlog；本需求不应回滚 Epic 20，而应新增 Epic 21 承载矩形编辑。

## 2. Checklist Findings

- [x] 1.1 Triggering story: N/A。用户直接提出新的编辑区矩形操作要求，不是某个现有 story 实施失败。
- [x] 1.2 Core problem: New requirement emerged from stakeholder。当前 SceneCanvas 支持单格放置/清空和拖动画布，但没有把格子起止点解释为矩形批量编辑。
- [x] 1.3 Evidence: 代码只有 cell click/contextmenu 单格入口和 viewport pan state；没有 rectangle edit state 或批量 scene command。
- [x] 2.1 Current epic impact: Epic 20 已完成；新增 gesture 需要延续其 zoom/pan viewport 语义，但不需要重新打开 Epic 20。
- [x] 2.2 Epic-level change: 新增 Epic 21: SceneCanvas 矩形填充与清空。
- [x] 2.3 Remaining epic impact: Epic 14 mobile preview/import、Epic 18 staging、Epic 19 workbench declutter、Epic 20 zoom/pan 都不得回退。
- [x] 2.4 New epic need: 需要新增一个中等范围 UI editing epic。
- [x] 2.5 Priority/order: 建议 Epic 21 成为当前 active backlog。
- [x] 3.1 PRD impact: 新增 2026-06-07 course correction、FR144-FR149 和 NFR73-NFR76。
- [x] 3.2 Architecture impact: `apps/web` command layer 和 SceneCanvas gesture state 受影响；`packages/scene-core` 不需要 schema change。
- [x] 3.3 UX impact: 需要定义 left/right pointer drag、rectangle preview、pan fallback、nearest-cell release 和 read-only/mobile guard。
- [x] 3.4 Other artifacts: `epics.md`、`sprint-status.yaml`、Story files、focused tests 和 browser smoke 需要同步。
- [x] 4.1 Direct Adjustment: Viable。新增 Epic 21 + focused stories。
- [x] 4.2 Rollback: Not viable。无须回滚 Epic 20。
- [x] 4.3 PRD MVP Review: Not viable。该项目已进入 Polish，不需要重新定义 MVP。
- [x] 4.4 Recommended path: Direct Adjustment / 新增 Epic 21。

## 3. Recommended Semantics

本 proposal 先采用以下保守语义，避免矩形操作引入隐式破坏性行为：

- “锁定素材状态”解释为现有连续放置语义：`assetSelectionMode === 'continuous'` 且 `scene.workspaceState.selectedAssetId` 非空。一次性选择素材但未进入连续/锁定状态时，保留现有单格点击放置行为。
- 矩形清空只清空当前编辑建筑层内的素材实例，不清空其他建筑层、建筑层备注、场景字段或独立 cell skill marker。被删除实例自带的 skill 字段随实例一起删除。
- 矩形清空按 effective footprint 判断区域命中：当前层中任一 occupied cell 与矩形相交的素材实例都被整体删除；同一个多格素材只删除一次。
- 矩形填充使用当前锁定素材、当前 `placementRotationDegrees` 和当前 `placementRequiresSkill`，把矩形内每个格子作为候选 anchor，按 row-major 顺序尝试放置。
- 矩形填充复用现有 placement/footprint/stacking 规则，不隐式确认替换已有素材。会正常放置合法空位或合法 stack；遇到 footprint blocked、replace-confirmation-required 或 unknown asset 时跳过该格，并在结果反馈中汇总 placed/skipped count。
- 如果用户希望“矩形填充自动覆盖已有素材”，建议先右键矩形清空再左键矩形填充；或单独批准把 fill command 改成 destructive replace mode。
- 进入矩形编辑后，松开位置不是格子时，用 SceneCanvas grid DOM rect 计算最近格子并 clamp 到当前 `canvasSize` 边界；这包含松开在 viewport 空白、被裁切区域外、grid 外侧或 overlay 上的情况。

## 4. Impact Analysis

### PRD Impact

PRD 需要新增 2026-06-07 Approved Course Correction，说明 SceneCanvas 增加矩形填充与清空作为 Desktop/Tablet 编辑效率能力。

新增功能要求建议：

- FR144: Desktop/Tablet 编辑工作台中，用户从一个可编辑格子按住右键拖动并松开时，系统必须清空起点和终点框成的矩形区域内当前建筑层的素材实例。
- FR145: 矩形清空必须按素材 effective footprint 去重处理；任一 footprint cell 与矩形相交的当前层素材实例都应被整体删除，且不得影响其他建筑层、层备注、场景字段或 scene-core derived state。
- FR146: 在锁定素材状态下，用户从一个可编辑格子按住左键拖动并松开时，系统必须把起点和终点框成的矩形区域作为批量填充区域，使用当前锁定素材、当前放置旋转和技能默认值逐格尝试放置。
- FR147: 矩形填充必须复用现有 placement/footprint/stacking validation，不得绕过越界、height blocking、stacking surface、replacement confirmation 或 read-only guard；默认不隐式替换已有素材。
- FR148: 没有锁定素材时，编辑区内左键拖动必须拖动画布，不得进入矩形填充；锁定素材时，如果左键按下目标不是格子，也必须拖动画布。
- FR149: 进入矩形填充或矩形清空后，如果松开位置不是编辑区格子，系统必须用距离松开位置最近的编辑区格子作为终点并完成矩形编辑。

新增非功能要求建议：

- NFR73: 矩形编辑 gesture state、drag preview 和 hover target 属于 web UI transient state，不得写入 `SceneDocument v1`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core`。
- NFR74: 矩形清空/填充的最终 scene mutation 必须通过 web command layer 执行，成功编辑后只触发现有 autosave 链路，不新增第二套保存机制。
- NFR75: 在默认 17x17 画布、矩形覆盖全画布、10 个建筑层、每层最多 289 个素材实例以内，矩形清空/填充应在用户感知上保持即时响应；批量结果反馈应可读。
- NFR76: 矩形编辑必须在 zoom/pan 后保持坐标正确；nearest-cell release、rectangle overlay、placement preview 和 canvas pan 不得因缩放比例或 pan offset 错位。

### UX Design Impact

UX Design Specification 需要补充 SceneCanvas rectangle edit interaction：

- Right-drag clear: 从格子右键按下开始，拖动中显示矩形清空预览，松开后清空当前层矩形区域素材。单格右键不拖动时保留现有单格清空语义。
- Locked left-drag fill: 在锁定素材状态下，从格子左键按下开始，拖动中显示矩形填充预览，松开后逐格尝试填充当前素材。
- Pan fallback: 没有锁定素材时，编辑区内左键拖动永远拖动画布；锁定素材但左键按下不在格子上，也拖动画布。
- Gesture threshold: 小于移动阈值的 left click / right click 保留现有单格行为；超过阈值或终点变化后进入矩形编辑。
- Nearest release: 如果已进入矩形编辑，松开点不是格子，使用最近格子作为终点。预览应在拖动期间使用同一计算逻辑。
- Visual preview: 矩形区域需要用半透明 overlay 或 cell class 表达；fill 与 clear 应有不同 visual treatment，且不遮挡 current-layer placement preview、selection/focus、lower-layer ghost 和 multi-cell footprint overlay 的可读性。
- Feedback: 批量执行后用现有 toast/placement feedback 汇总结果，例如清空 N 个素材，或填充 N 个格子、跳过 M 个格子。
- Mobile boundary: `<768px` 仍为 Mobile Preview Mode，不渲染 desktop SceneCanvas rectangle edit surface。

### Architecture Impact

架构更新集中在 `apps/web`：

- `apps/web/src/components/scene-canvas/`
  - 增加 rectangle edit gesture state：idle / panning / rectangle-fill / rectangle-clear。
  - 在 pointerdown 时区分 button、target 是否为 scene cell、是否锁定素材、是否 read-only。
  - 增加 nearest-cell helper：从 pointer client coordinate + grid DOM rect + `canvasSize` 得到 clamped coordinate。
  - 增加 rectangle preview render/data attributes，便于 component tests 和 browser smoke 验证。
  - 保留现有 wheel/pinch zoom、fit reset、canvas pan 和 cell keyboard/focus 语义。

- `apps/web/src/components/app-shell/`
  - 向 SceneCanvas 传入明确的锁定素材状态，建议为 `rectangleFillEnabled={assetSelectionMode === 'continuous' && Boolean(selectedAssetId) && !isReadOnly}`。
  - 新增 `onFillRectangle(start, end)` 和 `onClearRectangle(start, end)` callbacks。
  - 批量执行后清理 hover/focus/placement feedback 并显示结果 toast；连续锁定素材状态不应被矩形填充清除。

- `apps/web/src/state/`
  - 新增 focused command helper，例如 `bulk-scene-edit.ts`。
  - `clearRectangleMaterials(scene, input)`：从 current building level 和 scene-core occupancy/effective footprint 派生命中实例，去重删除，更新 `metadata.updatedAt` 和 `workspaceState.selectedCoordinate`。
  - `fillRectangleWithSelectedAsset(scene, input)`：生成 inclusive rectangle coordinates，逐格调用或等价复用 `placeSelectedAsset()` validation，使用新的 instance id factory，每格不隐式 confirm replace，返回 placed/skipped summary。
  - read-only guard 返回 no-op/failure，不直接 mutate scene。

- `apps/web/src/styles.css`
  - 增加 rectangle preview overlay/cell states。
  - 确保 overlay 在 zoom/pan 下跟随 grid，并且不撑开 layout。

- Tests
  - `SceneCanvas.test.tsx`: pointer gesture classification、right-drag clear callback、locked left-drag fill callback、no-locked drag pan、locked non-cell drag pan、nearest-cell release、zoom/pan 后坐标准确。
  - `bulk-scene-edit.test.ts`: rectangle normalization、multi-cell footprint delete de-dupe、current-level-only clear、fill row-major、blocked/replacement skipped、read-only no-op、metadata/autosave boundary。
  - `AppShell.test.tsx`: rectangle fill/clear 触发 scene mutation/autosave，不写 UI preferences/PSE/export summary，不破坏 single-click placement/delete。
  - Playwright: desktop 1280x720 和 tablet 1024x768 覆盖 zoom 后 rectangle fill/clear、nearest release、pan fallback；mobile 390x844 继续不渲染 desktop edit surface。

不应进入架构范围：

- 不新增 `SceneDocument v2`。
- 不把 rectangle drag state、preview rectangle、fill/clear summary 写入 scene storage 或 PSE string。
- 不改变 asset catalog、footprint、stacking metadata 或 scene-core persisted schema。
- 不改变 Cloudflare Pages deploy 边界。

## 5. Detailed Change Proposals

### PRD

Section: Approved Course Corrections

OLD:

```text
### Approved Course Correction - 2026-06-06 SceneCanvas 缩放视口
...
```

NEW:

```text
### Approved Course Correction - 2026-06-07 SceneCanvas 矩形填充与清空

本 PRD 已按 `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md` 增加 Epic 21，用于在 desktop/tablet 编辑工作台的中央 SceneCanvas 支持矩形填充和矩形清空。用户可以从格子右键拖动到另一个格子，清空两点框成矩形区域内当前建筑层的素材；在锁定素材状态下，可以从格子左键拖动到另一个格子，使用当前锁定素材批量填充矩形区域。

`SceneDocument v1` 继续保持。矩形拖拽状态、矩形预览和最近落点推导均为 web UI transient state，不进入 `SceneDocument`、scene autosave/saved payload、PSE 字符串、export payload、export summary 或 `packages/scene-core`。最终填充/清空结果仍通过现有 scene command/autosave 边界写入当前 scene，不新增第二套保存机制。
```

Rationale: 明确新需求是 desktop/tablet 编辑效率能力，并保留 schema/UI-only 边界。

Section: Functional Requirements

OLD:

```text
- FR143: 超出编辑区域 viewport 的 SceneCanvas 内容必须被隐藏，不产生页面级横向滚动条；缩放不得改变坐标、素材实例、放置规则、selected/hover/focus 语义或 export preview 内容。
```

NEW:

```text
- FR144: Desktop/Tablet 编辑工作台中，用户从一个可编辑格子按住右键拖动并松开时，系统必须清空起点和终点框成的矩形区域内当前建筑层的素材实例。
- FR145: 矩形清空必须按素材 effective footprint 去重处理；任一 footprint cell 与矩形相交的当前层素材实例都应被整体删除，且不得影响其他建筑层、层备注、场景字段或 scene-core derived state。
- FR146: 在锁定素材状态下，用户从一个可编辑格子按住左键拖动并松开时，系统必须把起点和终点框成的矩形区域作为批量填充区域，使用当前锁定素材、当前放置旋转和技能默认值逐格尝试放置。
- FR147: 矩形填充必须复用现有 placement/footprint/stacking validation，不得绕过越界、height blocking、stacking surface、replacement confirmation 或 read-only guard；默认不隐式替换已有素材。
- FR148: 没有锁定素材时，编辑区内左键拖动必须拖动画布，不得进入矩形填充；锁定素材时，如果左键按下目标不是格子，也必须拖动画布。
- FR149: 进入矩形填充或矩形清空后，如果松开位置不是编辑区格子，系统必须用距离松开位置最近的编辑区格子作为终点并完成矩形编辑。
```

Rationale: 把用户列出的五条行为转成可验收条款，并补足多格素材和 validation 边界。

### UX Design Specification

Section: Scene Canvas Interaction Behavior

OLD:

```text
Desktop/tablet 编辑区域内的鼠标滚轮和 macOS 触控板缩放手势只改变 UI-only zoom viewport...
```

NEW:

```text
SceneCanvas 还支持矩形编辑手势。用户从格子右键按下并拖动时进入矩形清空预览，松开后清空起点和终点框成的矩形区域内当前建筑层素材；用户在锁定素材状态下从格子左键按下并拖动时进入矩形填充预览，松开后使用当前锁定素材、旋转和技能默认值逐格尝试填充。没有锁定素材时，编辑区内左键拖动始终拖动画布；锁定素材但按下位置不是格子时，也拖动画布。

进入矩形填充或清空后，如果松开位置不是格子，系统把松开位置映射到距离最近的编辑区格子并 clamp 到当前画布边界后完成矩形编辑。矩形预览必须跟随 zoom/pan 后的真实 grid 坐标，不遮挡 selection/focus、placement preview、lower-layer ghost 或 multi-cell footprint 的关键状态。
```

Rationale: UX 需要定义 gesture priority、preview、pan fallback 和 nearest-cell release。

### Architecture

Section: Component Ownership

OLD:

```text
- `scene-canvas/`：17x17/legacy canvas rendering、hover/selection UI、pointer handler、桌面可选 keyboard handler 和 UI-only lower-layer ghost projection...
```

NEW:

```text
- `scene-canvas/`：17x17/legacy canvas rendering、hover/selection UI、keyboard handler、zoom/pan viewport、rectangle edit gesture state、rectangle preview 和 UI-only lower-layer ghost projection。SceneCanvas 负责把 pointer gesture 分类为 canvas pan、rectangle clear 或 rectangle fill，并通过 callbacks 把最终 rectangle command 交给 AppShell/state 层；组件不得直接修改 `SceneDocument`。
- `apps/web/src/state/bulk-scene-edit.ts`：承载矩形清空和矩形填充 command helper。清空按 current level + effective footprint intersection 去重删除；填充按 inclusive rectangle row-major 复用 placement validation。该 state helper 只返回新的 `SceneDocument` 和 summary，不保存 UI transient state。
```

Rationale: 保持 SceneCanvas 是交互/预览层，真正 scene mutation 留在 command layer。

### Epics

Section: Active Epic Index

OLD:

```text
As of 2026-06-06, Epic 19 is complete and Epic 20 is the active SceneCanvas 缩放视口 backlog.
```

NEW:

```text
As of 2026-06-07, Epic 20 is complete and Epic 21 is the active SceneCanvas 矩形填充与清空 backlog.
```

Add:

```text
## Epic 21: SceneCanvas 矩形填充与清空

Desktop/Tablet 编辑工作台的中央 SceneCanvas 支持右键矩形清空和锁定素材状态下的左键矩形填充。该能力延续 Epic 20 zoom/pan viewport：没有锁定素材时左键拖动继续拖动画布；锁定素材但按下位置不是格子时也拖动画布。矩形编辑只改变最终 scene material instances，不保存拖拽状态、预览状态或 nearest-cell 计算结果。
```

Rationale: 新需求需要成为当前 active backlog，不应回滚已完成 Epic。

### Sprint Status

Section: `development_status`

OLD:

```yaml
  epic_20:
    status: done
    title: SceneCanvas 缩放视口
```

NEW:

```yaml
  epic_21:
    status: backlog
    title: SceneCanvas 矩形填充与清空
    proposal: /Users/grigri/side-project/pokopia/pokopia-scene-editor/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md
    stories:
      21-1-course-correction-sync-and-rectangle-edit-contract:
        status: backlog
        title: Course Correction 同步与矩形编辑契约
      21-2-scene-canvas-rectangle-gesture-and-preview:
        status: backlog
        title: SceneCanvas 矩形手势状态与预览
      21-3-rectangle-fill-clear-command-layer:
        status: backlog
        title: 矩形填充与清空 Command Layer
      21-4-rectangle-edit-regression-tests-and-browser-smoke:
        status: backlog
        title: 矩形编辑回归测试与浏览器验证
```

Rationale: tracker 需要新增 backlog entries，后续才能按 BMAD story flow 执行。

## 6. Proposed Stories

### Story 21.1: Course Correction 同步与矩形编辑契约

As a 维护者, I want PRD、UX、Architecture、Epics 和 sprint-status 明确 SceneCanvas 矩形编辑边界, So that 后续实现不会把拖拽预览状态误写入 SceneDocument 或破坏 zoom/pan。

Acceptance Criteria:

- PRD 新增 2026-06-07 SceneCanvas 矩形填充与清空 course correction、FR144-FR149 和 NFR73-NFR76。
- UX Design Specification 新增 right-drag clear、locked left-drag fill、pan fallback、nearest-cell release 和 rectangle preview 交互规格。
- Architecture 新增 SceneCanvas gesture state、AppShell callbacks、bulk command layer 和 tests responsibility。
- Epics 新增 Epic 21 和 stories。
- sprint-status 新增 Epic 21 tracker entries。
- 明确本次不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、asset catalog 或 scene-core 持久契约。

### Story 21.2: SceneCanvas 矩形手势状态与预览

As a desktop/tablet 编辑用户, I want SceneCanvas 能区分右键矩形清空、锁定素材左键矩形填充和普通拖动画布, So that 我可以批量编辑格子，同时仍能平移放大后的画布。

Acceptance Criteria:

- 从格子右键按下并拖动进入 rectangle-clear state；拖动中显示矩形清空预览。
- 在锁定素材状态下，从格子左键按下并拖动进入 rectangle-fill state；拖动中显示矩形填充预览。
- 没有锁定素材时，编辑区内左键拖动始终进入 canvas pan state，不触发矩形填充。
- 锁定素材但左键按下目标不是格子时，进入 canvas pan state，不触发矩形填充。
- 单格左键点击、单格右键清空、cell hover、cell focus、keyboard selection 和 zoom/pan reset 行为不回退。
- 矩形编辑状态下松开位置不是格子时，使用 nearest-cell helper 得到终点并触发对应 callback。
- Rectangle preview 在 zoom/pan 后仍覆盖正确 cell range，不撑开 `.canvas-stage`，不产生页面横向滚动。
- read-only/mobile 不进入 rectangle-fill 或 rectangle-clear state。

### Story 21.3: 矩形填充与清空 Command Layer

As a desktop/tablet 编辑用户, I want 矩形手势完成后能可靠批量清空或填充当前建筑层素材, So that 我不用逐格重复操作。

Acceptance Criteria:

- 新增 bulk command helper，支持 normalized inclusive rectangle input。
- 矩形清空只作用于当前编辑建筑层；其他层素材、层备注、scene fields、skillMarkers 和 UI preferences 不改变。
- 矩形清空按 effective footprint intersection 命中素材实例；同一个多格实例只删除一次。
- 矩形填充只在锁定素材状态下执行；使用当前 selected asset、placement rotation、requiresSkill 默认值和新的 instance ids。
- 矩形填充逐格复用现有 placement/footprint/stacking validation，合法位置成功放置，blocked 或 replacement-confirmation-required 位置跳过并计数。
- 矩形填充不隐式确认替换已有素材；用户需要覆盖时可先矩形清空再矩形填充。
- 批量命令成功后更新 `metadata.updatedAt`，设置合理的 `workspaceState.selectedCoordinate`，并通过现有 autosave effect 保存。
- 批量命令 read-only 时 no-op/failure，不修改 scene。
- AppShell 执行后显示 placed/cleared/skipped summary，并清理过期 placement feedback。

### Story 21.4: 矩形编辑回归测试与浏览器验证

As a 维护者, I want 矩形编辑有 focused tests 和 browser smoke, So that 它不会破坏单格编辑、缩放平移、autosave 或 mobile preview。

Acceptance Criteria:

- SceneCanvas component tests 覆盖 right-drag clear callback、locked left-drag fill callback、no-locked left-drag pan、locked non-cell left-drag pan、nearest-cell release 和 zoom/pan 后坐标映射。
- Bulk command tests 覆盖 rectangle normalization、multi-cell footprint delete de-dupe、current-level-only clear、fill row-major、blocked skipped、replacement skipped、read-only no-op 和 metadata update。
- AppShell tests 覆盖矩形清空/填充触发 scene mutation 和 autosave，不写 UI preferences、PSE string 或 export summary，不清除 continuous selected asset。
- Existing SceneCanvas zoom tests、single click placement/delete tests、asset placement tests、mobile preview/import tests 继续通过。
- Playwright desktop 1280x720 覆盖 zoom 后矩形填充和矩形清空。
- Playwright tablet 1024x768 覆盖 nearest-cell release 和 pan fallback。
- Playwright mobile 390x844 继续证明不渲染 desktop workbench / SceneCanvas rectangle edit surface。
- 验证命令至少包含 focused web tests、web typecheck、web build 和 focused Playwright smoke。

## 7. Implementation Handoff

Scope classification: Moderate.

Recommended route: Product Owner / Developer coordination, then Developer implementation through BMAD story flow.

Suggested sequence:

1. Approve this Sprint Change Proposal.
2. Sync PRD、UX、Architecture、Epics 和 sprint-status.
3. Create Story 21.1-21.4 files.
4. Implement Story 21.2 and 21.3 together or in order, because gesture callbacks need command-layer contracts.
5. Run Story 21.4 validation before commit/build/deploy.

Success criteria:

- Right-drag from a grid cell clears the current-layer rectangle.
- Locked left-drag from a grid cell fills the rectangle with the locked asset.
- No locked asset left-drag pans the canvas from any editing-area location.
- Locked asset left-drag from a non-cell pans the canvas.
- Rectangle release outside a cell resolves to the nearest cell and completes the edit.
- `SceneDocument v1` schema, PSE strings, export summary, mobile preview/import, zoom/pan and existing single-cell placement/delete remain stable.

Open assumption requiring user approval:

- 本 proposal 默认“锁定素材状态”是 continuous placement mode，不是普通一次性 selected asset。
- 本 proposal 默认矩形填充不隐式替换已有素材；需要覆盖时先矩形清空。
- 本 proposal 默认矩形清空只清空当前编辑建筑层素材，不跨层清空。
