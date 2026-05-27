# Story 8.3: 更新 Web 放置、画布跨格显示和不可放置反馈

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 在编辑画布中看到大素材真实占用范围和上层阻塞,
so that 我不会把素材放进已经被 footprint 占用或被下层高度阻塞的位置。

## Acceptance Criteria

1. Given 用户选择一个 footprint 大于 1x1 的素材, When 悬停在可放置 anchor cell 上, Then 画布必须显示跨格放置预览, And 预览覆盖所有 effective footprint occupied cells。
2. Given 用户旋转当前素材到 90 或 270 度, When 再次悬停同一 anchor cell, Then 放置预览必须交换 length/width 方向, And 占用状态、越界状态和覆盖提示同步更新。
3. Given 下方建筑层存在 height 大于 1 的素材, When 用户切换到被阻塞的上方建筑层, Then 对应格子显示为不可放置, And 不可放置说明包含阻塞来源素材和建筑层。
4. Given 当前 scene 中已有大素材, When 用户查看主画布, Then 素材图片必须跨格显示且保持网格尺寸稳定, And 技能、染色、旋转和选中状态仍绑定到 anchor instance。

## Tasks / Subtasks

- [x] 扩展 Web 画布渲染输入，使用 scene-core footprint/occupancy 派生结果 (AC: 1, 3, 4)
  - [x] 在 `apps/web/src/components/scene-canvas/SceneCanvas.tsx` 或其附近增加只读 view model 层，把 `SceneDocument`/`CanvasCellContext` 转换为跨格素材、placement preview cells 和 height-blocked cells。
  - [x] view model 必须调用 `packages/scene-core` 的 `getEffectiveAssetFootprint`、`buildSceneOccupancy`、`evaluateScenePlacementFootprint` 或等价 helper；不得在 React 层重新实现 footprint/height 规则。
  - [x] 保持 7x7 grid 的 cell 数量和稳定尺寸，不因跨格素材 overlay 改变行列布局。
- [x] 实现跨格放置 preview 与状态反馈 (AC: 1, 2, 3)
  - [x] `targetPlacement.occupiedCells` 覆盖的所有格子都显示 preview 状态，anchor cell 与非 anchor occupied cell 可区分。
  - [x] `targetPlacement.footprintConflicts` 显示越界、覆盖或 lower-height blocking 状态；提示文案包含 conflict type、阻塞 instance/asset/level 和坐标集合。
  - [x] 预览必须跟随当前选中实例/素材的 rotation 语义；如果本 story 需要让 hover preview 使用已选中实例旋转，优先通过 command/state 层传递 rotation，不把 rotation 派生成保存字段。
- [x] 实现已放置大素材的跨格 overlay (AC: 4)
  - [x] 只有 anchor instance 渲染素材图片、技能、染色、旋转和选中标记；occupied 非 anchor cells 显示被同一实例占用，不显示重复素材卡。
  - [x] 跨格 overlay 的 `grid-column`/`grid-row` 或 CSS custom properties 必须从 effective footprint 派生，并在 90/270 度旋转后交换 length/width。
  - [x] 选择、删除、旋转、技能和染色操作仍以 anchor instance id 为目标；不允许用户把 occupied 非 anchor cell 当作独立实例编辑。
- [x] 实现 height blocking 可见反馈 (AC: 3)
  - [x] 上方被 lower footprint height 阻塞的 cells 显示不可放置状态，并在 aria label、dataset 或 inspector/feedback 中说明 blockedBy instance、asset 和 building level。
  - [x] blocked cells 是派生 UI 状态，不进入 `SceneDocument`、autosave、short string 或 reducer state。
- [x] 更新测试与验证 (AC: 1-4)
  - [x] 更新 `SceneCanvas.test.tsx` 覆盖跨格 preview、已放置大素材只渲染一个实例、occupied cell 不显示重复素材。
  - [x] 更新 `AppShell.test.tsx` 或相关组件测试覆盖 rotate 后 preview 方向交换、height-blocked cell 提示和 replacement/blocked feedback。
  - [x] 保留 existing 49 gridcell、read-only、keyboard navigation、skill marker、dye、rotation marker 和 mobile read-only 测试。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/web test -- SceneCanvas AppShell`。
  - [x] 运行 `pnpm run typecheck` 和 `pnpm run test`。
  - [x] 将 story 状态推进到 `review`，并把 `sprint-status.yaml` 中 `8-3-web-placement-canvas-footprint-feedback` 更新为 `review`。

### Review Findings

- [x] [Review][Patch] Height-blocked cells still exposed placeable/editable state and occupied non-anchor keyboard activation could select the occupied coordinate instead of the anchor — fixed in `SceneCanvas` and covered by updated tests.

## Dev Notes

- Story 8.3 只负责 Web 放置、编辑画布跨格显示和不可放置反馈。不要修改 preview/export 图片、export summary、Worker/MCP/Codex skill parity；这些属于 8.4/8.5。[Source: _bmad-output/planning-artifacts/epics.md#Story-8.3]
- 8.1 已给 asset catalog 增加 `AssetDefinition.footprint`，真实 fixture 包括 `wooden-bench` 2x1x1、`large-narrow-rug` 1x2x1、`large-boulder` 2x1x2。[Source: _bmad-output/implementation-artifacts/8-1-asset-catalog-footprint-metadata.md]
- 8.2 已提供 shared helpers：`getEffectiveAssetFootprint`、`getFootprintCells`、`buildSceneOccupancy`、`evaluateScenePlacementFootprint`，并且 Web placement command 已返回 `effectiveFootprint`、`occupiedCells`、`footprintConflicts` 和 footprint-wide `existingInstances`。[Source: _bmad-output/implementation-artifacts/8-2-scene-core-footprint-occupancy-rules.md]
- `SceneDocument v1` 仍然只保存 anchor `coordinate`、`assetId`、`buildingLevelId`、`rotationDegrees`、dye 和 skill fields。不得保存 `effectiveFootprint`、`occupiedCells`、`blockingCells` 或 occupied-cell UI cache。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- UX 要求悬停时显示 anchor 坐标、区域、当前建筑层、effective footprint、放置合法性、越界风险、覆盖风险和跨层阻塞来源；大素材只能作为一个实例被选中，不能让用户误以为每个 occupied cell 都是独立素材。[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Scene-Canvas; _bmad-output/planning-artifacts/ux-design-specification.md#Feedback-Patterns]
- 当前 `SceneCanvas` 接收 `CanvasCellContext[]`，逐 cell 渲染 `<button role="gridcell">`，并用 `data-coordinate`、`data-selected`、`data-targeted`、`data-has-instance` 等属性支撑测试和键盘导航。实现跨格 overlay 时要保留这些 gridcell，不要把按钮替换成不可访问的 div。[Source: apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- 当前 `AppShell` 只向 `SceneCanvas` 传 `cells`、`selectedCoordinate` 和 `targetCoordinate`；`targetPlacementPreview` 已传给 `SelectionInspector` 但 inspector 目前没有使用该字段。8.3 可以调整 prop contract，让 canvas 直接拿到 `scene`/`targetPlacement`/active level，或在 AppShell 中派生 canvas view model，但规则必须来自 `scene-core`。[Source: apps/web/src/components/app-shell/AppShell.tsx; apps/web/src/components/selection-inspector/SelectionInspector.tsx]
- 当前 instance 旋转通过 `editAssetInstance(... { type: 'rotate' })` 修改已放置实例。若旋转后会造成 footprint 越界/overlap/height blocking，本 story 应至少让 UI feedback 可见；若需要阻止非法旋转，必须通过 command 层和 scene-core validation 做最小改动，并新增 tests。[Source: apps/web/src/state/asset-instance-edit.ts]
- Web CSS 当前使用 `.scene-canvas` 7x7 grid、`.scene-row` 子 grid、`.scene-cell` 相对定位和 `.cell-asset-token` absolute inset。跨格素材若使用 overlay，优先保持 cell grid 尺寸稳定，避免 hover/selected/skill marker 改变布局。[Source: apps/web/src/styles.css]

### Previous Story Intelligence

- Story 8.2 commit `1e7306d` replaced single-cell placement checks with shared footprint evaluation. Use `AssetPlacementPreview.occupiedCells` and `footprintConflicts` instead of deriving overlap from `getCellContext` in UI.
- Story 8.2 fixed the Open Design demo fixture to avoid invalid wooden-bench overlap/out-of-bounds; default demo should remain valid under footprint-aware render.
- Full validation after 8.2 passed: `pnpm run typecheck` and `pnpm run test`.

### Project Structure Notes

- Likely updates:
  - `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
  - `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
  - `apps/web/src/components/app-shell/AppShell.tsx`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/components/selection-inspector/SelectionInspector.tsx`
  - `apps/web/src/styles.css`
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/state/asset-instance-edit.ts` and tests only if illegal rotation must be blocked
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR79-FR83]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Scene-Canvas]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- [Source: packages/scene-core/src/domain/scene/footprint.ts]
- [Source: packages/scene-core/src/domain/scene/occupancy.ts]
- [Source: apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [Source: apps/web/src/state/asset-placement.ts]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-27: Story created after Story 8.2 commit `1e7306d`.
- 2026-05-27: Started dev-story implementation and marked tracker in-progress.
- 2026-05-27: Added red tests for footprint preview, placed overlay, height blocking and placement rotation.
- 2026-05-27: `pnpm --filter @pokopia-scene-editor/web test -- SceneCanvas AppShell asset-placement` passed.
- 2026-05-27: `pnpm run typecheck` passed.
- 2026-05-27: `pnpm run test` passed.
- 2026-05-27: bmad-code-review found one patch issue; fixed height-blocked editability and occupied-cell keyboard activation.
- 2026-05-27: Re-ran `pnpm --filter @pokopia-scene-editor/web test -- SceneCanvas AppShell asset-placement`, `pnpm run typecheck`, and `pnpm run test` after review fixes; all passed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Added SceneCanvas footprint view model and overlay layer using shared scene-core occupancy output.
- Added placement rotation state/control so hover preview and placed tile `rotationDegrees` use the same selected rotation.
- Height-derived blocking cells now surface through cell classes, aria labels and dataset source details without changing SceneDocument payloads.
- Review fix: derived height blocks now set cell placeable/editable state to false and occupied non-anchor keyboard activation routes back to the anchor instance coordinate.

### Change Log

- 2026-05-27: Created Story 8.3 and moved status to ready-for-dev.
- 2026-05-27: Started implementation and moved status to in-progress.
- 2026-05-27: Implemented Story 8.3 and moved status to review.
- 2026-05-27: Addressed code review finding and moved Story 8.3 to done.

### File List

- _bmad-output/implementation-artifacts/8-3-web-placement-canvas-footprint-feedback.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/components/app-shell/AppShell.test.tsx
- apps/web/src/components/app-shell/AppShell.tsx
- apps/web/src/components/asset-picker/AssetPicker.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.test.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.tsx
- apps/web/src/i18n/index.ts
- apps/web/src/state/asset-placement.test.ts
- apps/web/src/state/asset-placement.ts
- apps/web/src/styles.css
