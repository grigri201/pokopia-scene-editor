# Story 19.5: 右侧素材详情按需展开

Status: done

## Story

As a desktop 编辑用户, I want 在浏览素材时按需查看关键规则, So that 我能理解 footprint、rotation、dye 和叠放规则而不靠试错。

## Acceptance Criteria

1. 素材列表默认仍以搜索、分类、分页、素材浏览为优先。
2. 素材详情入口对普通用户可见，不再只存在于 sr-only 区域。
3. 详情展示名称、缩略图、官方编号、assetId、分类、标签、Pokemon 喜好、footprint、可旋转、可染色、可叠放/特殊规则和当前待放置旋转状态。
4. 打开详情不改变当前待放置素材；只有明确“使用/放置”才选择素材。
5. 详情 surface 不长期挤压素材列表过多空间。
6. 新详情状态只属于 UI-only，不进入 SceneDocument、PSE、export summary 或 staging storage contract。

## Tasks / Subtasks

- [x] Make asset details visible on demand. (AC: 1, 2, 5)
  - [x] Replace sr-only detail triggers with visible compact icon/text buttons.
  - [x] Keep catalog search/category/pagination and row browsing as the dominant surface.
  - [x] Keep detail surface compact and dismissible/collapsible.
- [x] Fill detail content. (AC: 3)
  - [x] Show name, thumbnail, official id, assetId, category and tags.
  - [x] Show Pokemon favorite match, footprint, rotatable, dyeable, stacking/special rules and current placement rotation.
- [x] Preserve selection/storage boundaries. (AC: 4, 6)
  - [x] Opening details updates UI-only viewed state only.
  - [x] Keep asset selection controlled by row select/double-click/use action only.
  - [x] Do not write detail state into SceneDocument, PSE strings, export summary or staging preferences.
- [x] Update focused tests. (AC: 1-6)
  - [x] Cover visible detail trigger and detail content.
  - [x] Cover opening details does not call `onAssetSelect`.
  - [x] Cover read-only browsing behavior and storage boundary.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 19 / Story 19.5.
- The right panel should remain browse-first; details are a visible, on-demand support surface rather than a permanent catalog replacement.
- This story must not alter `SceneDocument v1`, PSE string encoding, export summaries, staging storage contract or `packages/scene-core`.

### Existing Implementation Map

- `apps/web/src/components/asset-picker/AssetPicker.tsx`
  - Already has `viewedAssetId` UI state and an `AssetDetail` component.
  - Current detail trigger is `className="sr-only"`, so ordinary users cannot discover it visually.
  - Current detail panel is wrapped in `.sr-only`; it is test-visible but not user-visible.
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
  - Existing tests already prove `View ... details` does not call `onAssetSelect`.
  - Tests currently assume the detail trigger is disabled in read-only mode and detail content is screen-reader-only.
- `apps/web/src/styles.css`
  - `.asset-detail`, `.asset-detail-button`, `.asset-sidebar`, `.asset-list` own the detail and browse layout.

### Technical Constraints

- Keep `viewedAssetId` component-local.
- Do not persist detail-open/viewed state.
- Keep staging preferences isolated to staged asset ids and expanded state.
- Avoid adding new libraries or scene-core fields.

### Testing Requirements

- `pnpm --filter @pokopia-scene-editor/web test -- src/components/asset-picker/AssetPicker.test.tsx src/components/app-shell/AppShell.test.tsx`
- `pnpm --filter @pokopia-scene-editor/web typecheck`
- `pnpm --filter @pokopia-scene-editor/web build`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-05: Created story context from Epic 19 AC, existing AssetPicker viewed-detail state, detail component and tests.
- 2026-06-05: Started implementation.
- 2026-06-05: Made asset detail triggers visible per asset row and opened a compact dismissible detail surface on demand.
- 2026-06-05: Expanded detail content with official id, assetId, category, tags, favorite match, footprint, rotatable, dyeable, stacking rules and placement rotation.
- 2026-06-05: Kept detail open/viewed state component-local and verified it does not write UI/staging storage.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/asset-picker/AssetPicker.test.tsx`: 20 files, 308 tests.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/asset-picker/AssetPicker.test.tsx src/components/app-shell/AppShell.test.tsx`: 20 files, 308 tests.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.
- 2026-06-05: Reviewed with multi-agent code review; fixed localized stacking summary, top-eligible stacking text, detail header CSS scope, non-zero rotation test coverage and AppShell storage-boundary coverage.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/asset-picker/AssetPicker.test.tsx src/components/app-shell/AppShell.test.tsx`: 20 files, 309 tests.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.

### Completion Notes

- Asset details are now discoverable from visible row buttons.
- Opening details does not select or change placement asset.
- Detail surface is compact, scrollable and dismissible.
- Detail state remains UI-only component state.
- Stacking summaries now distinguish localized surface kinds from assets that can sit on compatible surfaces.

## Senior Developer Review (AI)

Completed.

- P2: Localized raw stacking `surfaceKind` labels and added top-eligible stacking text for non-surface assets that can be placed on compatible surfaces.
- P3: Scoped `.asset-detail` definition list layout so the dismissible header keeps its flex layout.
- P3: Added focused coverage for non-zero placement rotation and AppShell-level SceneDocument/storage boundaries when opening asset details.

### File List

- `_bmad-output/implementation-artifacts/19-5-browse-first-asset-details.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/components/asset-picker/AssetPicker.tsx`
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-05: Story created and marked ready-for-dev.
- 2026-06-05: Story marked in-progress.
- 2026-06-05: Implemented and verified browse-first asset details; story marked review.
- 2026-06-05: Fixed review findings, re-verified, and marked done.
