# Story 8.4: 更新俯视/正视预览、图片导出和导出摘要

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 预览和导出图片也能准确表达大素材 footprint,
so that 保存给他人的布景说明图不会把大素材误显示成单格素材。

## Acceptance Criteria

1. Given scene 包含 footprint 大于 1x1 的素材, When 用户打开俯视图预览, Then 预览必须跨格显示该素材, And 不重复渲染成多个独立素材实例。
2. Given scene 包含 height 大于 1 的素材, When 用户打开正视图预览, Then 正视图必须表达该素材占据多层高度, And 不把派生阻塞格误当作真实素材实例计数。
3. Given 用户打开图片导出预览或下载图片, When export render data 从 `SceneDocument v1` 和 catalog 派生, Then 导出图片必须按 footprint 跨格显示大素材, And 每层素材清单仍按真实实例计数，不按 occupied cell 计数。
4. Given Worker/MCP 调用 export summary, When scene 中存在大素材, Then summary 中每个实例必须包含 `footprint`、`effectiveFootprint`、`occupiedCells` 和由 height 派生的 blocking 信息或 warning, And Web 图片导出使用同一语义。

## Tasks / Subtasks

- [x] 扩展 `scene-core` export summary 的 footprint 语义 (AC: 3, 4)
  - [x] 在 `packages/scene-core/src/domain/scene/export-summary.ts` 中为每个真实 tile instance 输出 `footprint`、`effectiveFootprint`、`occupiedCells` 和 height 派生 blocking 信息或 warning。
  - [x] export summary 必须调用 `buildSceneOccupancy` / `getEffectiveAssetFootprint` / `getFootprintCells` 等 shared helpers；不得在 Worker、MCP 或 Web 层复制 footprint 规则。
  - [x] 保持每层素材清单按真实实例计数；occupied cells 和 blocking cells 只能作为派生摘要字段，不能增加实例数量。
- [x] 更新俯视图预览的跨格 footprint 表达 (AC: 1)
  - [x] 在 `apps/web/src/components/preview-inspector/PreviewInspector.tsx` 或相邻 view model 中按当前层 `SceneDocument` 和 catalog 派生跨格 overlay。
  - [x] 俯视预览必须保留 7x7 grid 的稳定尺寸；大素材只渲染一个 anchor-bound overlay，不在 occupied 非 anchor cells 重复显示素材实例。
  - [x] 预览只读，不创建独立编辑状态，不写入 `SceneDocument`、autosave、saved storage 或 UI preferences。
- [x] 更新正视图预览的 height footprint 表达 (AC: 2)
  - [x] 正视图必须表达 `height > 1` 素材跨建筑层占据的范围，至少能从 DOM/data 属性和视觉 overlay 中识别 instance、effective height 和 blocked levels。
  - [x] 派生 blocking cells 不得显示为真实素材实例，不得改变 layer/material 计数。
  - [x] 正视图实现仍保持基础投影视图，不引入复杂真实视角遮挡模拟。
- [x] 更新图片导出预览和下载用 render data (AC: 3)
  - [x] `apps/web/src/components/export-preview/ExportPreview.tsx` 必须使用 export summary 中的 footprint/effectiveFootprint/occupiedCells 渲染跨格素材。
  - [x] 每层素材清单继续显示真实实例清单，不按 occupied cell 或 blocking cell 重复计数。
  - [x] 导出预览/下载仍为浏览器内流程，不调用服务端图片生成，不写入 scene 或 storage。
- [x] 更新测试与验证 (AC: 1-4)
  - [x] 更新 `packages/scene-core/src/domain/scene/export-summary.test.ts` 覆盖 2x1、1x2 旋转后 effective footprint、height blocking 和真实实例计数。
  - [x] 更新 `apps/web/src/components/preview-inspector/PreviewInspector.test.tsx` 覆盖俯视跨格 overlay、正视 height overlay 和 blocking 不计为实例。
  - [x] 更新 `apps/web/src/components/export-preview/ExportPreview.test.tsx` 覆盖导出图层跨格 overlay 与每层素材清单计数。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/scene-core test -- export-summary`。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/web test -- PreviewInspector ExportPreview`。
  - [x] 运行 `pnpm run typecheck` 和 `pnpm run test`。
  - [x] 将 story 状态推进到 `review`，并把 `sprint-status.yaml` 中 `8-4-preview-export-footprint-rendering` 更新为 `review`。

## Dev Notes

- Story 8.4 只负责俯视/正视预览、图片导出和 export summary。保存/短字符串/Worker/MCP/Codex skill 全端契约门禁属于 8.5；本 story 只保证 export summary shape 作为 Web 与 Worker/MCP 共享语义来源。[Source: _bmad-output/planning-artifacts/epics.md#Story-8.4; _bmad-output/planning-artifacts/epics.md#Story-8.5]
- 8.1 已为 `AssetDefinition` 增加 `footprint`，默认 1x1x1，并提供真实大素材 fixture：`wooden-bench` 2x1x1、`large-narrow-rug` 1x2x1、`large-boulder` 2x1x2。[Source: _bmad-output/implementation-artifacts/8-1-asset-catalog-footprint-metadata.md]
- 8.2 已提供 shared helpers：`getEffectiveAssetFootprint`、`getFootprintCells`、`buildSceneOccupancy`、`evaluateScenePlacementFootprint`，并要求 validation/recovery/short string 通过当前 catalog 派生 occupancy。[Source: _bmad-output/implementation-artifacts/8-2-scene-core-footprint-occupancy-rules.md]
- 8.3 已在编辑画布实现 footprint overlay、placement preview、height-blocked cell feedback 和 placement rotation；预览/导出可以复用其 overlay 思路，但不要把编辑画布的交互状态搬进只读预览。[Source: _bmad-output/implementation-artifacts/8-3-web-placement-canvas-footprint-feedback.md]
- `SceneDocument v1` 仍然只保存 anchor `coordinate`、`assetId`、`buildingLevelId`、`rotationDegrees`、dye 和 skill fields。不得保存 `effectiveFootprint`、`occupiedCells`、`blockingCells` 或 preview/export cache。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- UX 要求俯视图校验 7x7 平面结构，正视图校验建筑层高度关系；预览必须从同一 scene state 和 asset catalog footprint 派生，不允许形成独立编辑状态，派生 blocking cells 只用于解释不可放置，不计入真实素材数量。[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Preview-Inspector]
- 图片导出预览 anatomy 包括标题区、整体素材清单、逐层图形、跨格 footprint 表达、逐层素材清单、下载和关闭。预览/下载不得修改当前场景，不触发 autosave，不写入 saved storage 或 UI preferences。[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Image-Export-Preview]
- 当前 `buildImageExportSummary(scene, locale)` 位于 `packages/scene-core/src/domain/scene/export-summary.ts`。`apps/web/src/components/app-shell/AppShell.tsx` 的 `openExportPreview` 直接调用它；Worker `/api/scene/export-summary` 和 MCP summarize 工具也通过 `scene-core` 使用同一摘要语义。[Source: packages/scene-core/src/domain/scene/export-summary.ts; apps/web/src/components/app-shell/AppShell.tsx; apps/worker/src/index.ts]
- 当前 `PreviewInspector` 通过 `getCurrentLayerPreviewCellContexts` 和 `getAllVisibleFrontProjectionCellContexts` 渲染只读预览；实现 footprint overlay 时应保留现有可访问标签、隐藏层排除和 cell 数量约束。[Source: apps/web/src/components/preview-inspector/PreviewInspector.tsx; packages/scene-core/src/domain/scene/selectors.ts]
- 当前 `ExportPreview` 逐 layer 渲染 49 个 export cells，并从 summary 的 `materials.instances` 显示素材清单。跨格 overlay 应从 summary instance fields 派生，不应让 occupied cell 增加 `materials[].count`。[Source: apps/web/src/components/export-preview/ExportPreview.tsx; packages/scene-core/src/domain/scene/export-summary.ts]

### Previous Story Intelligence

- Story 8.3 review 曾发现派生占用格如果仍暴露为可编辑/可放置，会产生误选 anchor 之外坐标的问题；本 story 的预览/导出应明确 occupied/blocking 为只读派生状态。
- Story 8.2 full validation 已通过 `pnpm run typecheck` 和 `pnpm run test`；本 story 修改 export summary shape 后要关注 Worker/MCP existing tests 的类型和快照断言。
- Story 8.3 full validation 已通过 `pnpm --filter @pokopia-scene-editor/web test -- SceneCanvas AppShell asset-placement`、`pnpm run typecheck` 和 `pnpm run test`。

### Project Structure Notes

- Likely updates:
  - `packages/scene-core/src/domain/scene/export-summary.ts`
  - `packages/scene-core/src/domain/scene/export-summary.test.ts`
  - `apps/web/src/components/preview-inspector/PreviewInspector.tsx`
  - `apps/web/src/components/preview-inspector/PreviewInspector.test.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - `apps/web/src/styles.css`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR67-FR68-FR83-FR85]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Preview-Inspector]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Image-Export-Preview]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- [Source: packages/scene-core/src/domain/scene/export-summary.ts]
- [Source: packages/scene-core/src/domain/scene/occupancy.ts]
- [Source: apps/web/src/components/preview-inspector/PreviewInspector.tsx]
- [Source: apps/web/src/components/export-preview/ExportPreview.tsx]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-27: Story created after Story 8.3 commit `502be06`.
- 2026-05-27: Started dev-story implementation and marked tracker in-progress.
- 2026-05-27: Added export summary footprint fields and tests for 2x1, rotated 1x2 and height blocking.
- 2026-05-27: Added top/front preview footprint overlays and image export footprint overlays.
- 2026-05-27: `pnpm --filter @pokopia-scene-editor/scene-core test -- export-summary` passed.
- 2026-05-27: `pnpm --filter @pokopia-scene-editor/web test -- PreviewInspector ExportPreview` passed.
- 2026-05-27: `pnpm run typecheck` passed.
- 2026-05-27: `pnpm run test` passed.
- 2026-05-27: bmad-code-review completed with clean review; no patch findings.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Export summary instances now include catalog footprint, effective footprint, occupied cells, derived blocking cells and conflict warnings without changing `SceneDocument v1`.
- PreviewInspector renders top-view multi-cell overlays and front-view height overlays from `buildSceneOccupancy`.
- ExportPreview renders layer graphics with footprint overlays while layer material lists continue to count true instances.

### Change Log

- 2026-05-27: Created Story 8.4 and moved status to ready-for-dev.
- 2026-05-27: Started implementation and moved status to in-progress.
- 2026-05-27: Implemented Story 8.4 and moved status to review.
- 2026-05-27: Code review passed and moved Story 8.4 to done.

### File List

- _bmad-output/implementation-artifacts/8-4-preview-export-footprint-rendering.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/components/export-preview/ExportPreview.test.tsx
- apps/web/src/components/export-preview/ExportPreview.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.test.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.tsx
- apps/web/src/styles.css
- packages/scene-core/src/domain/scene/export-summary.test.ts
- packages/scene-core/src/domain/scene/export-summary.ts
