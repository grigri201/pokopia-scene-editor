# Story 21.2: SceneCanvas 矩形手势状态与预览

Status: done

## Story

As a desktop/tablet 编辑用户, I want SceneCanvas 能区分右键矩形清空、锁定素材左键矩形填充和普通拖动画布, So that 我可以批量编辑格子，同时仍能平移放大后的画布。

## Acceptance Criteria

1. 从格子右键按下并拖动进入 rectangle-clear state；拖动中显示矩形清空预览。
2. 在锁定素材状态下，从格子左键按下并拖动进入 rectangle-fill state；拖动中显示矩形填充预览。
3. 没有锁定素材时，编辑区内左键拖动始终进入 canvas pan state，不触发矩形填充。
4. 锁定素材但左键按下目标不是格子时，进入 canvas pan state，不触发矩形填充。
5. 单格左键点击、单格右键清空、cell hover、cell focus、keyboard selection 和 zoom/pan reset 行为不回退。
6. 矩形编辑状态下松开位置不是格子时，使用 nearest-cell helper 得到终点并触发对应 callback。
7. Rectangle preview 在 zoom/pan 后仍覆盖正确 cell range，不撑开 `.canvas-stage`，不产生页面横向滚动。
8. read-only/mobile 不进入 rectangle-fill 或 rectangle-clear state。

## Tasks / Subtasks

- [x] Add SceneCanvas rectangle gesture state. (AC: 1-4, 8)
  - [x] Track idle / panning / rectangle-clear / rectangle-fill modes.
  - [x] Start rectangle-clear only from right-button down on a scene cell.
  - [x] Start rectangle-fill only from left-button down on a scene cell while rectangle fill is enabled.
  - [x] Keep left-button non-cell starts and non-locked starts on the canvas pan path.
- [x] Add nearest-cell release support. (AC: 6)
  - [x] Derive nearest coordinate from pointer client position and SceneCanvas grid DOM rect.
  - [x] Clamp nearest coordinate to current `canvasSize`.
  - [x] Reuse the helper for preview updates and pointer release.
- [x] Render rectangle preview. (AC: 1, 2, 7)
  - [x] Add fill and clear visual states with distinct class/data attributes.
  - [x] Keep preview aligned with zoom/pan and grid cells.
  - [x] Avoid blocking selection/focus, placement preview, lower-layer ghost or footprint overlays.
- [x] Preserve existing interactions. (AC: 5, 8)
  - [x] Keep single-click placement/selection behavior.
  - [x] Keep single-cell right-click clear behavior.
  - [x] Keep keyboard movement/focus behavior.
  - [x] Keep read-only/mobile no-op guards.
- [x] Add focused SceneCanvas tests. (AC: 1-8)

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 21 / Story 21.2.
- Approved proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md`.
- PRD FR144-FR149 and NFR73-NFR76 define gesture behavior, pan fallback, nearest-cell release and UI transient boundaries.
- UX states that rectangle preview must follow zoom/pan grid coordinates and stay out of mobile preview mode.

### Existing Implementation Map

- `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
  - Owns zoom viewport, canvas pan state, cell pointer/click/contextmenu/hover/focus/keyboard behavior.
  - Currently calls `onSelectCoordinate` for single cell selection/placement and `onDeleteCoordinate` for right-click deletion.
  - Has viewport pointer state for canvas pan; rectangle gesture state should integrate with that path.
- `apps/web/src/components/app-shell/AppShell.tsx`
  - Owns selected asset state and should pass an explicit boolean such as `rectangleFillEnabled={assetSelectionMode === 'continuous' && Boolean(scene.workspaceState.selectedAssetId) && !isReadOnly}`.
  - Should receive final rectangle callbacks from SceneCanvas and forward them to the command layer; it must not own low-level pointer classification.
- `apps/web/src/styles.css`
  - Already contains SceneCanvas viewport and grid styling.
  - Add rectangle preview classes without expanding layout.

### Current Code Guardrails

- `SceneCanvas` currently starts canvas pan in `handleViewportPointerDown()` only for left button events on the viewport; rectangle gestures must not break this path or `data-dragging-canvas` assertions.
- Cell interactions currently use button-level `onClick`, `onContextMenu`, `onFocus`, `onMouseEnter`, `onMouseLeave` and `onKeyDown`; add pointer drag handling without causing single-click placement/select or context-menu delete to double fire after a drag.
- `getInteractionCoordinate()` maps occupied footprint cells back to the anchor during placement mode. Rectangle gesture start/end should use actual grid coordinates for rectangle bounds unless the implementation deliberately documents why anchor remapping is needed.
- The preview should be rendered in the existing grid/overlay coordinate system with stable `data-testid` / `data-rectangle-mode` / `data-rectangle-range` style attributes so component and browser tests can inspect it after zoom/pan.
- Prevent the native context menu only while a right-button rectangle clear is being handled; preserve existing single-cell right-click clear behavior.

### Technical Constraints

- Do not add gesture libraries.
- Keep rectangle gesture state local/transient.
- Do not mutate `SceneDocument` inside `SceneCanvas`.
- Use stable test attributes for preview range and gesture state.
- Preserve Epic 20 zoom/pan data attributes and tests.

### Testing Requirements

- Focused SceneCanvas component tests for right-drag clear, locked left-drag fill, pan fallback and nearest-cell release.
- Existing SceneCanvas zoom tests should continue to pass.
- Run `pnpm --filter @pokopia-scene-editor/web test -- src/components/scene-canvas/SceneCanvas.test.tsx`.

### Project Structure Notes

- Primary updates belong in `apps/web/src/components/scene-canvas/SceneCanvas.tsx` and `apps/web/src/styles.css`.
- AppShell changes in this story should be limited to passing the lock-state boolean and rectangle callback props needed by SceneCanvas; command-layer scene mutation is Story 21.3 scope.
- Do not edit `packages/scene-core`, scene schema, PSE codec, export code or asset catalog for gesture/preview state.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 21 / Story 21.2 AC.
- `_bmad-output/planning-artifacts/prd.md` - FR144, FR146, FR148, FR149, NFR73, NFR76.
- `_bmad-output/planning-artifacts/architecture.md` - SceneCanvas pointer classification, callback dispatch and UI-transient boundary.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - rectangle preview, pan fallback and mobile boundary.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md` - approved lock-state and nearest-cell assumptions.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-07: Added SceneCanvas transient rectangle gesture state, preview range attributes, right-drag context-menu suppression and pointer-cancel cleanup.
- 2026-06-07: Added focused SceneCanvas tests for locked fill drag, right-drag clear, nearest-cell release, read-only guard, pointer cancel, no-lock pan fallback and locked non-cell pan fallback.
- 2026-06-07: Code review follow-up changed nearest-cell release to prefer actual hit targets / rendered cell centers before grid-ratio fallback.

### Completion Notes List

- SceneCanvas now emits rectangle intent only through callbacks; it does not mutate `SceneDocument`.
- Preview state remains transient and is exposed via `data-rectangle-gesture`, `data-rectangle-range` and per-cell `data-rectangle-preview`.
- Existing click, contextmenu delete, keyboard/focus/hover and zoom/pan reset paths remain covered by the existing SceneCanvas suite.

### File List

- `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`

## Change Log

- 2026-06-07: Story created and marked ready-for-dev.
- 2026-06-07: Create-story review added implementation guardrails, references and Dev Agent Record skeleton.
- 2026-06-07: Implemented SceneCanvas rectangle gesture/preview and marked story done.
