# Story 21.3: 矩形填充与清空 Command Layer

Status: done

## Story

As a desktop/tablet 编辑用户, I want 矩形手势完成后能可靠批量清空或填充当前建筑层素材, So that 我不用逐格重复操作。

## Acceptance Criteria

1. 新增 bulk command helper，支持 normalized inclusive rectangle input。
2. 矩形清空只作用于当前编辑建筑层；其他层素材、层备注、scene fields、skillMarkers 和 UI preferences 不改变。
3. 矩形清空按 effective footprint intersection 命中素材实例；同一个多格实例只删除一次。
4. 矩形填充只在锁定素材状态下执行；使用当前 selected asset、placement rotation、requiresSkill 默认值和新的 instance ids。
5. 矩形填充逐格复用现有 placement/footprint/stacking validation，合法位置成功放置，blocked 或 replacement-confirmation-required 位置跳过并计数。
6. 矩形填充不隐式确认替换已有素材；用户需要覆盖时可先矩形清空再矩形填充。
7. 批量命令成功后更新 `metadata.updatedAt`，设置合理的 `workspaceState.selectedCoordinate`，并通过现有 autosave effect 保存。
8. 批量命令 read-only 时 no-op/failure，不修改 scene。
9. AppShell 执行后显示 placed/cleared/skipped summary，并清理过期 placement feedback。

## Tasks / Subtasks

- [x] Add bulk scene edit helpers. (AC: 1, 8)
  - [x] Add normalized inclusive rectangle utilities.
  - [x] Add command result types with summary counts and skipped reasons.
  - [x] Keep read-only as no-op/failure with no scene mutation.
- [x] Implement rectangle clear. (AC: 2, 3, 7)
  - [x] Use current building level only.
  - [x] Use scene-core occupancy/effective footprint data to identify intersecting instances.
  - [x] Delete each matching instance once.
  - [x] Preserve other layers, scene fields, notes, skillMarkers and UI preferences.
- [x] Implement rectangle fill. (AC: 4-7)
  - [x] Require locked selected asset context from AppShell.
  - [x] Iterate normalized rectangle coordinates in row-major order.
  - [x] Reuse `placeSelectedAsset()` or equivalent validation for footprint/stacking rules.
  - [x] Do not pass implicit `confirmReplace`; replacement-required targets count as skipped.
  - [x] Keep continuous selected asset active after fill.
- [x] Wire AppShell callbacks. (AC: 9)
  - [x] Pass fill/clear callbacks into SceneCanvas.
  - [x] Commit successful scenes through existing `commitSceneEdit`.
  - [x] Show summary feedback and clear stale placement feedback.
- [x] Add focused command/AppShell tests. (AC: 1-9)

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 21 / Story 21.3.
- Approved proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md`.
- PRD FR144-FR149 and NFR73-NFR76 define command scope and persistence boundaries.

### Existing Implementation Map

- `apps/web/src/state/asset-placement.ts`
  - `placeSelectedAsset()` evaluates selected asset placement with scene-core footprint/stacking rules.
  - Replacement currently requires explicit confirmation.
- `apps/web/src/state/asset-instance-edit.ts`
  - Existing delete command deletes one instance by id.
  - Bulk delete should avoid calling single delete repeatedly if that obscures current-level/effective-footprint de-dupe behavior.
- `apps/web/src/components/app-shell/AppShell.tsx`
  - `deleteCoordinateMaterial()` currently deletes the top current-level instance for one coordinate.
  - `placeCurrentAsset()` handles one-coordinate placement and replacement confirmation.
  - Bulk fill/clear should share timestamp/instance id conventions through existing helpers.
- `packages/scene-core`
  - Use occupancy/effective footprint helpers already consumed by SceneCanvas; do not add persisted schema fields.

### Previous Story Intelligence

- Story 21.1 completed the planning sync and explicitly preserved `SceneDocument v1`, PSE strings, export summary, asset catalog and scene-core persisted contracts.
- Story 21.2 defines the gesture callback contract. The command layer should accept normalized inclusive rectangle coordinates from SceneCanvas/AppShell and should not recalculate pointer semantics.

### Current Code Guardrails

- Add a focused helper such as `apps/web/src/state/bulk-scene-edit.ts`; export types from `apps/web/src/state/index.ts` only if AppShell/tests need them.
- Reuse `placeSelectedAsset(scene, { coordinate, interactionMode, now, instanceId, requiresSkill, rotationDegrees })` for each fill anchor so footprint, height-blocking, stacking and replacement behavior stays identical to single-cell placement.
- Do not pass `confirmReplace: true` from rectangle fill. Treat `replace-confirmation-required` as a skipped cell and include it in the summary.
- Clear should derive current-level hits by effective footprint intersection, not only by anchor coordinate. Use `buildSceneOccupancy()` / scene-core occupancy data or equivalent existing derived helpers; delete each matching `instanceId` once.
- Existing `editAssetInstance(type: 'delete')` updates `metadata.updatedAt` but preserves `selectedCoordinate` when deleting; bulk clear must set a deliberate selected coordinate after the batch.
- `commitPlacedScene()` clears selected asset for single placement unless `assetSelectionMode === 'continuous'`; rectangle fill must preserve continuous locked state and should not clear `scene.workspaceState.selectedAssetId`.
- Bulk command result should include at least `placed`, `cleared`, `skipped`, and skipped reasons so AppShell can show a readable summary without inspecting internals.

### Technical Constraints

- Keep this change in `apps/web/src/state` and AppShell wiring unless a tiny reusable scene-core selector is strictly necessary.
- Do not change `SceneDocument v1`, scene schema, PSE codec, export summary or asset catalog.
- Do not implicitly overwrite existing materials during fill.
- Keep cell skill markers independent unless an instance being deleted carries its own skill fields.

### Testing Requirements

- Unit tests for rectangle normalization and command results.
- Command tests for multi-cell footprint delete de-dupe, current-level-only clear, row-major fill, blocked skipped, replacement skipped and read-only no-op.
- AppShell tests for autosave scene mutation and continuous selected asset retention.
- Run `pnpm --filter @pokopia-scene-editor/web test -- src/state src/components/app-shell/AppShell.test.tsx`.

### Project Structure Notes

- Primary state work belongs in `apps/web/src/state/bulk-scene-edit.ts` plus a matching `bulk-scene-edit.test.ts`.
- AppShell wiring belongs near `placeCurrentAsset()`, `deleteCoordinateMaterial()` and the `<SceneCanvas />` prop block in `apps/web/src/components/app-shell/AppShell.tsx`.
- Keep SceneCanvas command callbacks narrow: it should emit rectangle intent only; AppShell/state own scene mutation, summaries and autosave-triggering `setScene`.
- Do not move shared placement logic into `packages/scene-core` unless an existing reusable selector is impossible to consume from web state.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 21 / Story 21.3 AC.
- `_bmad-output/planning-artifacts/prd.md` - FR145, FR147, NFR73, NFR74, NFR75.
- `_bmad-output/planning-artifacts/architecture.md` - command-layer ownership and autosave boundary.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md` - row-major fill, lock-state, current-layer clear and destructive replacement assumptions.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-07: Added `bulk-scene-edit` helper with normalized inclusive rectangles, current-level footprint-intersection clear and row-major fill using `placeSelectedAsset()`.
- 2026-06-07: Wired AppShell rectangle callbacks through `commitSceneEdit`, summary toasts and placement-feedback cleanup while preserving continuous selected asset state.
- 2026-06-07: Code review follow-up kept zero-cleared rectangle clears as no-op scene results to avoid misleading autosave writes; mutation success paths still update `metadata.updatedAt` and selected coordinate.

### Completion Notes List

- Rectangle clear deletes current-level instances once by scene-core occupancy/effective footprint intersection; other levels and standalone skill markers are preserved.
- Rectangle fill uses selected asset, placement rotation, `requiresSkill`, new instance ids and existing placement validation; replacement-required and footprint-blocked cells are counted as skipped.
- Read-only commands return no-op failures; empty clear returns original scene and an informational summary rather than writing autosave.

### File List

- `apps/web/src/state/bulk-scene-edit.ts`
- `apps/web/src/state/bulk-scene-edit.test.ts`
- `apps/web/src/state/index.ts`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`

## Change Log

- 2026-06-07: Story created and marked ready-for-dev.
- 2026-06-07: Create-story review added implementation guardrails, references and Dev Agent Record skeleton.
- 2026-06-07: Implemented rectangle command layer and marked story done.
