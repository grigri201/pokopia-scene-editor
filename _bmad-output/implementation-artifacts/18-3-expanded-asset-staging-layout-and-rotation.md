# Story 18.3: 展开暂存区与素材区 80/20 布局

Status: done

## Story

As a 布景编辑用户, I want 展开暂存区后像素材区一样浏览和操作所有候选素材, So that 我可以在候选列表中继续选择、连续放置和旋转大素材。

## Acceptance Criteria

1. 暂存区底部提供向下箭头展开入口；展开后提供可访问的收起入口。
2. 展开时暂存区占据 Asset Picker 内容高度约 80%，素材区域占据约 20%；布局不得导致搜索框、分类筛选、分页或素材行重叠。
3. 展开暂存区显示所有暂存素材，使用与素材区一致的素材行/card 视觉、当前选中状态、连续放置状态和非 1x1 素材旋转按钮。
4. 暂存区不按 category/type 分组，不显示分类 tab；所有暂存素材在一个可滚动列表中按最近顺序排列。
5. 展开暂存区的选择和旋转通过既有 `onAssetSelect`、`onPlacementRotationChange` callbacks 生效；不得新增 scene write path。
6. 在 1280x720 desktop 和 768-1279px tablet 单列布局下，展开状态不遮挡画布、建筑层面板或当前选择检查器。

## Tasks / Subtasks

- [x] Extract reusable asset row presentation. (AC: 3, 5)
  - [x] Share selection, continuous placement, thumbnail/name/meta, detail, and rotation button rendering between catalog results and expanded staging.
  - [x] Preserve keyboard activation and arrow navigation within each list.
- [x] Add expanded/collapsed staging controls and persistence. (AC: 1, 4, 5)
  - [x] Add accessible expand/collapse buttons with stable labels and state.
  - [x] Persist expanded/collapsed state through the same UI preference boundary as Story 18.2.
  - [x] Render all staged assets in recent-first order without category grouping.
- [x] Implement 80/20 layout state. (AC: 2, 6)
  - [x] Add CSS classes/data attributes for expanded mode.
  - [x] Keep search, filters, pagination, staged list, asset list, and picker detail accessible without overlap on desktop and tablet widths.
- [x] Add focused expanded-state tests. (AC: 1-6)
  - [x] Cover expand/collapse persistence, expanded list contents/order, selected/continuous state, rotation button behavior, scroll container class/state, and read-only/mobile absence.

## Dev Notes

- Continue using `apps/web/src/components/asset-picker/AssetPicker.tsx` unless extraction into a local helper component reduces duplication.
- Reuse existing callbacks:
  - `onAssetSelect(assetId, 'single' | 'continuous')`
  - `onPlacementRotationChange(assetId)`
- Non-1x1 rotatable logic already exists in `isRotatableBeforePlacement()`.
- Expanded staging is still UI-only; no scene command, autosave, saved storage, PSE string, or export summary changes.
- CSS lives in `apps/web/src/styles.css`; use responsive constraints instead of viewport-scaling font sizes.
- Browser smoke belongs to Story 18.4, but this story should add deterministic class/data state that smoke can assert.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-04: Story created from approved BMAD Epic 18 planning surface.
- 2026-06-04: Refactored catalog row rendering through shared `renderAssetRow()` so expanded staging and catalog rows use the same selection, continuous-placement, detail, and rotation wiring.
- 2026-06-04: Added accessible expand/collapse controls and persisted expanded state in `pokopia.assetStaging.v1`.
- 2026-06-04: Added expanded layout classes/data attributes and adjusted CSS after Playwright caught a zero-height catalog list at 1280x720.
- 2026-06-04: Focused component tests and desktop/tablet Playwright layout smoke passed.
- 2026-06-04: Code review fix: expanded staging rows now include the same remove action as collapsed staging cards.
- 2026-06-04: Code review fix: single-page catalog results retain a scrollable grid row when pagination is absent.
- 2026-06-04: Code review fix: expanded staging uses a 4:1 grid with a 64px minimum catalog area so 1280x720 desktop and 1000x720 tablet satisfy the 80/20 layout target.

### Completion Notes

- Expanded staging renders all staged assets in recent-first order without category grouping.
- Expanded staged rows share catalog row visuals and callbacks for single selection, continuous placement, and non-1x1 rotation.
- Expanded layout keeps the original asset results visible and scrollable on desktop and tablet smoke viewports.

## Senior Developer Review (AI)

### Review Outcome

Approved after fixes.

### Findings Resolved

- [x] Expanded staging rows expose a remove button so users can delete staged assets without collapsing.
- [x] Single-page catalog results keep a dedicated scrollable row.
- [x] Expanded desktop/tablet layout now meets the 80/20 target while short-height guard viewports remain non-overlapping and scrollable.

### File List

- `_bmad-output/implementation-artifacts/18-3-expanded-asset-staging-layout-and-rotation.md`
- `apps/web/src/components/asset-picker/AssetPicker.tsx`
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-04: Story created and marked ready-for-dev.
- 2026-06-04: Implemented expanded staging layout, shared row behavior, rotation wiring, layout smoke, review fixes, and moved story to done.
