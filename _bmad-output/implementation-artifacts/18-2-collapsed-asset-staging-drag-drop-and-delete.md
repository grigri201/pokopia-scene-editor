# Story 18.2: 折叠暂存区、拖入与删除

Status: done

## Story

As a 布景编辑用户, I want 从素材列表拖动素材到暂存区并在折叠状态看到最近 3 个素材, So that 我可以快速保留候选素材而不丢失当前搜索上下文。

## Acceptance Criteria

1. 素材区域上方显示“素材暂存区”。
2. 用户可从素材列表拖动素材到暂存区；desktop/tablet read-only 不允许写入暂存区；mobile preview/import 不渲染暂存区。
3. 暂存区按 `assetId` 去重；重复拖入同一素材只移动到最近位置。
4. 折叠状态只显示最后放入的 3 个素材和暂存区总数。
5. 每个暂存素材只显示缩略图、名称和右上角删除按钮；删除只移出暂存区，不删除 scene 中已放置素材。
6. 折叠暂存素材点击后可选择为待放置素材，并沿用现有 selected/continuous placement state。
7. 拖入、删除和折叠/展开写入本地 UI 存储；不得写 `SceneDocument`、scene autosave slot、scene saved slot、PSE 导出字符串或 export summary。

## Tasks / Subtasks

- [x] Add asset staging UI preference state. (AC: 2, 3, 7)
  - [x] Add normalized staged `assetIds` and expanded/collapsed state to UI preferences or a dedicated localStorage contract.
  - [x] Filter unknown `assetId` values while preserving recent-first order.
  - [x] Ensure read-only storage access does not normalize/persist staging data.
- [x] Add collapsed staging area above asset results. (AC: 1, 4, 5)
  - [x] Render the staging header, total count, drop target, and recent 3 staged assets.
  - [x] Use compact thumbnail/name/delete controls only for collapsed staged assets.
  - [x] Keep stable dimensions so the asset list, search, filters, and pagination do not shift unpredictably.
- [x] Wire drag/drop, dedupe, delete, and selection. (AC: 2, 3, 5, 6, 7)
  - [x] Make asset rows draggable in edit mode only.
  - [x] Drop into staging writes UI preferences only and dedupes by moving the asset to most recent.
  - [x] Delete removes only the staging entry.
  - [x] Clicking a collapsed staged asset calls existing `onAssetSelect(assetId, 'single')`.
- [x] Add focused collapsed-state tests. (AC: 1-7)
  - [x] Cover drag-in, dedupe, recent 3 display, total count, delete, click select, read-only guard, and storage isolation.

## Dev Notes

- Main implementation surface: `apps/web/src/components/asset-picker/AssetPicker.tsx`.
- Existing selected asset and placement mode wiring is `onAssetSelect(assetId, placementMode)`.
- Existing pre-placement rotation is `onPlacementRotationChange?.(asset.assetId)`.
- Existing UI preference IO is `apps/web/src/io/ui-preferences.ts`; preserve best-effort storage semantics.
- `AssetPicker` receives `readOnly`; desktop/tablet edit mode passes `false`, mobile preview/import does not render `AssetPicker`.
- Do not call AppShell scene command paths from staging actions. The staging state is not a scene edit and must not trigger scene autosave.
- Existing tests to extend:
  - `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
  - `apps/web/src/io/ui-preferences.test.ts`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-04: Story created from approved BMAD Epic 18 planning surface.
- 2026-06-04: Added dedicated `pokopia.assetStaging.v1` storage with normalization, unknown-id filtering, duplicate removal, and best-effort read/write behavior.
- 2026-06-04: Added collapsed asset staging UI above catalog results with drag/drop, distinct recent-first ordering, recent 3 display, total count, compact cards, delete, and click-to-select.
- 2026-06-04: Confirmed staging drag/drop/delete writes only the dedicated UI-only storage key and not scene saved/autosave storage.
- 2026-06-04: Focused `AssetPicker` and asset-staging storage tests passed.
- 2026-06-04: Code review fix: restricted staging drops to internal/custom asset payloads instead of accepting arbitrary `text/plain`.
- 2026-06-04: Code review fix: confirmed read-only mode cannot write or normalize staging storage.

### Completion Notes

- Collapsed asset staging is available above the catalog results in edit mode.
- Dragging catalog rows into staging dedupes by `assetId` and moves repeated assets to most recent.
- Deleting staged cards only removes the staging entry; clicking staged cards reuses existing single-placement selection.
- Read-only startup does not normalize or mutate staging storage.

## Senior Developer Review (AI)

### Review Outcome

Approved after fixes.

### Findings Resolved

- [x] Drop handling no longer accepts arbitrary external text payloads as staged asset IDs.
- [x] Read-only staging paths remain disabled and do not persist normalized staging state.

### File List

- `_bmad-output/implementation-artifacts/18-2-collapsed-asset-staging-drag-drop-and-delete.md`
- `apps/web/src/io/asset-staging-preferences.ts`
- `apps/web/src/io/asset-staging-preferences.test.ts`
- `apps/web/src/io/index.ts`
- `apps/web/src/components/asset-picker/AssetPicker.tsx`
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-04: Story created and marked ready-for-dev.
- 2026-06-04: Implemented collapsed asset staging, dedicated UI-only storage, focused tests, review fixes, and moved story to done.
