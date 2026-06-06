# Story 20.2: SceneCanvas Zoom Viewport 与输入手势

Status: done

## Story

As a desktop/tablet 编辑用户, I want 用鼠标滚轮或 macOS 触控板缩放编辑区, So that 我可以在完整画布和局部 6x6 细节之间切换。

## Acceptance Criteria

1. SceneCanvas 外层有稳定 viewport，默认完整显示当前画布长边。
2. 编辑区域内鼠标滚轮调整 zoom；外部素材栏、建筑层面板和底部检查器滚动不被拦截。
3. macOS trackpad pinch 映射到同一 zoom state；Safari 兼容路径受 feature detection 保护。
4. Zoom scale clamp 为 `[1, max(1, max(canvas.width, canvas.height) / 6)]`。
5. 默认 17x17 场景最大 zoom 约显示 6x6 格；legacy 7x7 最大 zoom 约显示 6x6；6x6 画布不额外放大。
6. 放大后超出 viewport 的内容隐藏，不产生页面级横向滚动。
7. 缩放不改变选中格、hover target、placement preview、下层影子、当前层或 scene command 行为。

## Tasks / Subtasks

- [x] Add a zoom viewport around SceneCanvas. (AC: 1, 4, 6)
  - [x] Keep the default/min zoom at full long-side fit.
  - [x] Clamp max zoom with `max(1, max(canvas.width, canvas.height) / 6)`.
  - [x] Ensure the viewport clips overflow without expanding the page or side panels.
- [x] Wire wheel and pinch input. (AC: 2, 3)
  - [x] Handle wheel zoom only inside the canvas editing area.
  - [x] Do not intercept external panel scrolling.
  - [x] Map trackpad pinch to the same zoom state and guard Safari gesture compatibility with feature detection.
- [x] Preserve scene and interaction semantics. (AC: 7)
  - [x] Keep selected coordinate, hover coordinate, focus coordinate and placement preview callbacks unchanged.
  - [x] Keep lower-layer ghost and footprint overlays visually aligned with the scaled grid.
  - [x] Do not write zoom state to scene storage, scene autosave, PSE strings, export summary or `packages/scene-core`.
- [x] Add focused tests. (AC: 1-7)
  - [x] Unit/component tests for zoom clamp and wheel/pinch handling.
  - [x] AppShell or SceneCanvas tests proving zoom state does not alter SceneDocument/autosave payloads.

### Review Findings

- [x] [Review][Patch] Avoid trapping wheel input when zoom cannot change [apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [x] [Review][Patch] Clamp extreme wheel deltas to max zoom instead of resetting to min [apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [x] [Review][Patch] Reset zoom origin when canvas dimensions change [apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [x] [Review][Patch] Do not apply zoom handlers to read-only canvases [apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [x] [Review][Patch] Use stable non-passive Safari gesture listeners during continuous pinch [apps/web/src/components/scene-canvas/SceneCanvas.tsx]
- [x] [Review][Patch] Add cursor-origin, clamp-boundary and feature-detection tests [apps/web/src/components/scene-canvas/SceneCanvas.test.tsx]
- [x] [Review][Patch] Add external panel wheel isolation coverage [apps/web/src/components/app-shell/AppShell.test.tsx]
- [x] [Review][Patch] Verify zoom stays out of a real autosave payload [apps/web/src/components/app-shell/AppShell.test.tsx]

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 20 / Story 20.2.
- Approved proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-06-scene-canvas-zoom.md`.
- PRD FR139-FR143 and NFR70-NFR72 define input gestures, min/max zoom, hidden overflow and UI-only state boundaries.
- UX states zoom focus should follow pointer/gesture focus when possible and fall back to viewport center.
- Architecture assigns the implementation to `apps/web` only.

### Existing Implementation Map

- `apps/web/src/components/app-shell/AppShell.tsx`
  - Renders `.canvas-stage` and passes scene/cells/callbacks into `SceneCanvas`.
  - Owns top-level workspace state and is a reasonable owner for zoom state if the wrapper cannot own it locally.
- `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
  - Computes CSS variables from `canvasSize`.
  - Handles gridcell click, context menu, hover, focus and keyboard movement.
  - Does not currently handle wheel, pinch, zoom scale or zoom origin.
- `apps/web/src/styles.css`
  - `.canvas-stage` already has `overflow: hidden`; implementation should make the clip contract explicit for zoomed content.
  - `.scene-canvas` uses aspect ratio and width CSS variables that need to remain stable under zoom.

### Technical Constraints

- Use existing React / TypeScript / CSS patterns; do not add gesture, pan/zoom or state libraries.
- Keep the change in `apps/web`; do not modify `packages/scene-core`.
- Do not persist zoom by default. If persistence becomes necessary, it must use UI preferences and stay separate from scene storage.
- `<768px` Mobile Preview Mode must continue not to render the desktop workbench or SceneCanvas zoom viewport.
- This story does not include independent drag-pan. Access to other clipped areas is through zooming out and refocusing.

### Testing Requirements

- Focused component tests for `SceneCanvas` and/or `AppShell`.
- Run `pnpm --filter @pokopia-scene-editor/web typecheck`.
- If CSS or responsive layout changes are nontrivial, run the relevant Playwright workbench smoke for desktop/tablet before Story 20.3.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-06: Added `SceneCanvas` local zoom viewport state with wheel zoom and guarded Safari `gesturestart` / `gesturechange` mapping.
- 2026-06-06: Added CSS clip viewport so scaled canvas content is hidden inside the central editing area without resizing panels.
- 2026-06-06: Added focused SceneCanvas tests for max zoom clamp, wheel zoom, Safari gesture mapping, 17x17 / 7x7 / 6x17 / 6x6 bounds and unchanged coordinate callbacks.
- 2026-06-06: Added AppShell storage/export boundary test proving zoom remains outside saved scene, autosave, UI preferences and exported scene strings.
- 2026-06-06: Ran `pnpm --filter @pokopia-scene-editor/web typecheck` successfully.
- 2026-06-06: Ran `pnpm --filter @pokopia-scene-editor/web test -- src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx`; Vitest executed 20 files / 312 tests successfully.
- 2026-06-06: Applied code-review fixes for clamped wheel events, extreme wheel deltas, canvasSize origin reset, read-only zoom guards and stable Safari gesture listeners.
- 2026-06-06: Added review follow-up coverage for cursor-origin math, feature-detection negative path, external panel wheel isolation and real autosave payload boundaries.
- 2026-06-06: Re-ran `pnpm --filter @pokopia-scene-editor/web typecheck` successfully.
- 2026-06-06: Re-ran `pnpm --filter @pokopia-scene-editor/web test -- src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx`; Vitest executed 20 files / 318 tests successfully.

### Completion Notes

- SceneCanvas now renders a stable `scene-canvas-viewport` wrapper with `data-zoom-scale`, min/max zoom data attributes and overflow clipping.
- Mouse wheel zoom is scoped to the canvas viewport; external panels do not receive new handlers.
- Safari gesture events are only registered behind `ongesturechange` feature detection.
- Zoom state is React UI-only state in `apps/web`; no `packages/scene-core`, `SceneDocument v1`, storage schema or PSE codec changes were made.
- Code review patch findings were applied; no unresolved 20.2 action items remain.

### File List

- `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
- `apps/web/src/styles.css`
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`

## Senior Developer Review (AI)

### Review Outcome

Approved after fixes.

### Review Summary

- Decision-needed: 0
- Patch findings: 8 fixed
- Deferred: 0
- Dismissed: 4 as out of scope or already covered by Story 20.3 browser verification

### Notes

- Non-WebKit touch pinch fallback was dismissed because Story 20.2 targets mouse wheel and macOS trackpad pinch; Chromium/Firefox trackpad pinch arrives through wheel events and Safari is covered by guarded gesture events.
- Transform hit-testing in a real browser is assigned to Story 20.3 Playwright layout verification.

## Change Log

- 2026-06-06: Story created and marked ready-for-dev.
- 2026-06-06: Implemented SceneCanvas zoom viewport, wheel/pinch input handling and focused tests.
- 2026-06-06: Completed code review fixes and marked Story 20.2 done.
