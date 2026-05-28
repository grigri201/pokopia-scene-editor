# Story 11.3: 更新 Web 放置预览、画布和实例检查器反馈

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 在放置前看懂当前素材能否放到盘子、地毯、底垫、嫩芽或低高度素材上,
so that 我能区分合法承载、合法叠放和真实冲突。

## Acceptance Criteria

1. Given 用户选择食物并悬停到盘子、木盘子或派对拼盘上, When surface rules 允许放置, Then 画布必须显示可承载/将被承载的预览状态, And 预览格必须拆成上下两个显示区，下半部分显示盘类 base surface，上半部分显示食物 top item, And 点击后 top item 与 base item 都可以被理解为独立实例。
2. Given 用户选择非食物素材并悬停到 food surface 上, When surface rules 不允许放置, Then 画布必须显示浅红不兼容叠放状态，视觉强度和位置应接近 Epic 8 的跨层 height 阻塞提示, And 错误说明包含 base asset、top asset、建筑层和坐标。
3. Given 同一坐标存在 base surface 和 top item, When 用户点击该坐标或查看实例检查器, Then UI 必须通过上下半格布局让用户选择或至少识别 base/top 两个实例, And 不得把两个实例误显示成一个重复素材或丢失删除/选择入口。
4. Given 用户在移动端 View-only Mode 查看叠放场景, When 点选叠放坐标, Then 只能查看承载/被承载关系, And 不允许通过触摸、键盘或快捷入口修改 scene。

## Tasks / Subtasks

- [x] 扩展 Web placement preview state (AC: 1-2)
  - [x] 在 `AssetPlacementPreview` 中透传 scene-core `stackingRelations` 和 structured stacking conflicts。
  - [x] 合法 stacking placement 使用 `ready`，但 message/repairHint/overwriteLabel 应表达 "will stack"/"supported by" 而不是普通 ready 或 replace。
  - [x] 非法 food surface stacking conflict 在预览中保留 base/top asset、building level、coordinates 和 surface kind。
- [x] 更新 SceneCanvas stacking cell 表达 (AC: 1-3)
  - [x] 从 `buildSceneOccupancy(scene).stackingRelations` 派生 active level 的 base/top relation view，不在 scene state 中保存关系字段。
  - [x] 同格合法 stacking 用上下半格显示：下半格 base surface，上半格 top item；placement preview 也使用同一契约。
  - [x] 不兼容 stacking placement 使用浅红 conflict 状态，复用 Epic 8 footprint/height-blocking 的视觉强度与 data attributes。
  - [x] 同格 base/top 必须保留两个独立实例 id 和 asset id，避免被当作 duplicate same-layer garbage 隐藏。
- [x] 更新实例选择/检查器反馈 (AC: 3-4)
  - [x] 点击 stacking 坐标时，UI 至少能识别 base/top 两个实例；如果只保持单坐标选择，也必须在 canvas/inspector 上暴露 base/top data。
  - [x] 选中 stacking 坐标时，selected-cell action bar 不得丢失删除/查看入口；删除语义仍只删除当前选择的实例或已有默认删除策略明确可测。
  - [x] View-only mode 只展示 stacking 关系，不允许触摸、键盘或快捷入口修改 scene。
- [x] 增加 Web 回归测试并验证 (AC: 1-4)
  - [x] `asset-placement.test.ts` 覆盖 legal stacking preview、unsupported stacking conflict、普通 replacement 流程不回退。
  - [x] `SceneCanvas.test.tsx` 覆盖上下半格 base/top data、legal stacking placement preview、unsupported conflict class/data。
  - [x] `AppShell.test.tsx` 或现有最小 UI 测试覆盖点击 stacking 坐标后两个实例可识别，移动端 view-only 不可修改。
  - [x] 运行 `pnpm --dir apps/web exec vitest run src/state/asset-placement.test.ts src/components/scene-canvas/SceneCanvas.test.tsx src/components/selection-inspector/SelectionInspector.test.tsx src/components/app-shell/AppShell.test.tsx`。
  - [x] 运行 `pnpm run typecheck` 和 `git diff --check`。

## Dev Notes

- Story 11.2 已提交 scene-core contract：`evaluateScenePlacementFootprint()` 对合法 overlap 返回 `stackingRelations`，对 `unsupported-stack-surface` / `surface-capacity-conflict` 返回 structured conflicts，且 `confirmReplace` 不能绕过 unsupported stacking surface。[Source: _bmad-output/implementation-artifacts/11-2-scene-core-stacking-compatibility-rules.md; packages/scene-core/src/domain/scene/occupancy.ts]
- Web placement state 入口是 `apps/web/src/state/asset-placement.ts`。当前 preview 只透传 `footprintConflicts`、`existingInstances`、`occupiedCells`，Story 11.3 需要把 stacking relation/conflict 从 scene-core 继续传给 canvas/UI，不要重新实现 stacking 规则。[Source: apps/web/src/state/asset-placement.ts]
- Scene canvas footprint view 位于 `apps/web/src/components/scene-canvas/SceneCanvas.tsx`。当前 `buildFootprintCanvasView()` 从 `buildSceneOccupancy(scene)` 派生 occupied cells、blocking cells 和 placement overlay；应在这里派生 stacking relation view，不要写入 `SceneDocument`。[Source: apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- 现有 duplicate same-layer 防护测试确保非法重复实例不会作为 stack UI 暴露。Story 11.3 必须只对 `occupancy.stackingRelations` 中的合法 relation 显示上下半格，不要把普通 duplicate overlap 误认为 stacking。[Source: apps/web/src/components/scene-canvas/SceneCanvas.test.tsx]
- Architecture 明确合法 stacking 的 Web canvas、preview、image export 需要同一显示契约：原始格子或 footprint cell 拆分为上/下两个显示区，下半部分 base surface，上半部分 top item；不兼容 stacking 必须复用 Epic 8 冲突反馈模式，浅红提示层、红色边框或状态标签、文本原因和结构化 conflict。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-Stacking-surface-rules-live-in-the-asset-catalog-while-stacking-relations-are-derived]
- Epic 11 不允许新增 `SceneDocument v2`、saved stacking relation、surface id、z-index、parent instance id 或 catalog snapshot。所有 base/top 关系必须从 current scene + catalog metadata 派生。[Source: _bmad-output/planning-artifacts/prd.md#Epic-List; _bmad-output/planning-artifacts/architecture.md]
- View-only mode 已在 AppShell/SceneCanvas 通过 interaction mode/read-only boundaries 控制。新增 stacking UI 只能展示关系，不得新增可修改入口或绕过 `interactionMode === 'readOnly'`。[Source: apps/web/src/state/asset-placement.ts; apps/web/src/components/app-shell/AppShell.test.tsx]

### Project Structure Notes

- Expected updates:
  - `apps/web/src/state/asset-placement.ts`
  - `apps/web/src/state/asset-placement.test.ts`
  - `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
  - `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/styles.css`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-11.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Stacking-surface-rules-live-in-the-asset-catalog-while-stacking-relations-are-derived]
- [Source: _bmad-output/implementation-artifacts/11-2-scene-core-stacking-compatibility-rules.md]
- [Source: apps/web/src/state/asset-placement.ts]
- [Source: apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [Source: apps/web/src/components/scene-canvas/SceneCanvas.test.tsx]
- [Source: apps/web/src/components/app-shell/AppShell.test.tsx]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created after Story 11.2 commit `beedd6d`.
- 2026-05-28: Started dev-story implementation and moved status to in-progress.
- 2026-05-28: Passed `pnpm --dir apps/web exec vitest run src/state/asset-placement.test.ts src/components/scene-canvas/SceneCanvas.test.tsx src/components/selection-inspector/SelectionInspector.test.tsx src/components/app-shell/AppShell.test.tsx`.
- 2026-05-28: Passed `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-05-28: Passed `pnpm run typecheck`.
- 2026-05-28: Passed `git diff --check`.
- 2026-05-28: `pnpm --filter @pokopia-scene-editor/web test -- asset-placement SceneCanvas SelectionInspector AppShell` did not narrow to the requested files in this workspace and ran all Web tests; an unrelated `PokemonSceneControls.test.tsx` timeout appeared. The exact-file Vitest command above passed.
- 2026-05-28: Code review found and fixed a legal stacking replacement-window bug; re-ran exact Web tests, full typecheck, and diff-check.

### Review Findings

- [x] [Review][Patch] Legal stacking placement could delete the base surface during an active replacement confirmation window [apps/web/src/state/asset-placement.ts] — fixed by skipping replacement filtering whenever the placement preview contains a derived stacking relation.

### Completion Notes List

- Web placement preview now carries derived stacking relations and presents legal stacking as stack-on-surface rather than replacement.
- SceneCanvas renders legal stacking and legal stacking placement preview as top/base split cells, and unsupported stacking as a shallow red conflict state with structured data attributes.
- SelectionInspector exposes top/base compact chips so a stacked coordinate can identify and switch between the two independent instances without saving relation fields.
- Mobile read-only startup can inspect stacked cells and switch viewed top/base chips without writing scene storage.
- Confirmed replacement windows no longer remove the base surface for legal stacking placements.

### Change Log

- 2026-05-28: Created Story 11.3 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented Web stacking feedback and moved status to review.
- 2026-05-28: Applied code-review fix and moved status to done.

### File List

- _bmad-output/implementation-artifacts/11-3-web-stacking-placement-feedback.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/components/app-shell/AppShell.test.tsx
- apps/web/src/components/app-shell/AppShell.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.test.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.tsx
- apps/web/src/components/selection-inspector/SelectionInspector.test.tsx
- apps/web/src/components/selection-inspector/SelectionInspector.tsx
- apps/web/src/state/asset-placement.test.ts
- apps/web/src/state/asset-placement.ts
- apps/web/src/styles.css
