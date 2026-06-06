# Story 20.3: Zoom 回归测试与浏览器布局验证

Status: done

## Story

As a 维护者, I want SceneCanvas zoom 有 focused tests 和 viewport smoke, So that 缩放不会破坏编辑、布局、导出或 mobile preview 边界。

## Acceptance Criteria

1. SceneCanvas/AppShell tests 覆盖 wheel zoom、pinch mapping、min/max clamp、canvasSize change clamp 和 zoom state 不进入 SceneDocument/autosave。
2. Tests 覆盖 selected/hover/focus/placement callbacks 在 zoom 后仍按原坐标工作。
3. Playwright 覆盖 1280x720 desktop 和 1024x768 tablet：min zoom 全长边可见、max zoom 约 6x6、超出内容隐藏、无面板重叠、页面无横向滚动。
4. Mobile 390x844 smoke 继续证明不渲染 desktop workbench / SceneCanvas zoom viewport。
5. 验证命令至少包含 web focused tests、web typecheck、web build 和 desktop/tablet/mobile smoke。

## Tasks / Subtasks

- [x] Extend focused unit/component coverage. (AC: 1, 2)
  - [x] Assert wheel zoom updates scale and clamps min/max.
  - [x] Assert pinch/gesture mapping reaches the same clamp path.
  - [x] Assert canvasSize change clamps or resets zoom safely.
  - [x] Assert selected/hover/focus/placement callbacks still emit original grid coordinates.
  - [x] Assert zoom state does not appear in SceneDocument or autosave payload.
- [x] Add or update Playwright smoke coverage. (AC: 3, 4)
  - [x] 1280x720 desktop min zoom: full long side visible, no overlap.
  - [x] 1280x720 desktop max zoom: viewport shows about 6x6 cells, overflow clipped.
  - [x] 1024x768 tablet max/min zoom: no panel overlap and no page horizontal scroll.
  - [x] 390x844 mobile: desktop workbench and zoom viewport absent.
- [x] Run validation commands. (AC: 5)
  - [x] Web focused tests.
  - [x] Web typecheck.
  - [x] Web build.
  - [x] Desktop/tablet/mobile Playwright smoke.

### Review Findings

- [x] [Review][Patch] Route Playwright wheel through a hit-tested target before dispatching [apps/web/e2e/workbench-smoke.spec.ts]
- [x] [Review][Patch] Directly assert viewport overflow clipping in max zoom smoke [apps/web/e2e/workbench-smoke.spec.ts]
- [x] [Review][Patch] Decode exported scene string and assert recovered SceneDocument has no zoom state [apps/web/src/components/app-shell/AppShell.test.tsx]
- [x] [Review][Patch] Cover canvasSize shrink clamp after zooming above the new max [apps/web/src/components/scene-canvas/SceneCanvas.test.tsx]
- [x] [Review][Patch] Cover placement keyboard confirm after zoom [apps/web/src/components/scene-canvas/SceneCanvas.test.tsx]
- [x] [Review][Patch] Require canvas viewport presence in expanded staging layout metrics [apps/web/e2e/workbench-smoke.spec.ts]
- [x] [Review][Patch] Keep zoom smoke checking header/workbench presence and primary rect bounds [apps/web/e2e/workbench-smoke.spec.ts]

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 20 / Story 20.3.
- Story 20.2 should implement the zoom viewport and input gestures before this story is closed.
- This story is a verification closeout and should not broaden zoom behavior beyond the approved 20.2 scope.

### Existing Test Map

- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
  - Existing tests already cover grid rendering, selected/hover/focus behavior, keyboard movement, footprint overlays and lower-layer ghost.
- `apps/web/src/components/app-shell/AppShell.test.tsx`
  - Existing tests cover storage boundaries, mobile absence of desktop workbench and AppShell integration behavior.
- `apps/web/e2e/workbench-smoke.spec.ts`
  - Existing smoke coverage measures workbench layout overlap and mobile absence of the editing workbench.

### Technical Constraints

- Do not use live external APIs for these tests.
- Keep Playwright assertions deterministic: prefer data attributes, bounding rectangles and scroll width checks over pixel-perfect screenshots.
- Avoid adding browser-specific expectations that make Safari gesture support untestable in Chromium-only CI; unit-test feature-detected branches where possible.
- Do not touch `packages/scene-core` unless Story 20.2 unexpectedly introduced a shared-type change, which it should not.

### Testing Requirements

- Suggested focused command: `pnpm --filter @pokopia-scene-editor/web test -- src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx`
- Required closeout commands: `pnpm --filter @pokopia-scene-editor/web typecheck` and `pnpm --filter @pokopia-scene-editor/web build`.
- Required browser smoke: relevant `workbench-smoke.spec.ts` tests for desktop/tablet/mobile zoom layout.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-06: Extended SceneCanvas focused tests for hover/focus callbacks under zoom and placement preview under zoom.
- 2026-06-06: Added Playwright smoke for 1280x720 desktop and 1024x768 tablet min/max zoom viewport bounds.
- 2026-06-06: Updated mobile smoke coverage to assert `scene-canvas-viewport` is absent below 768px.
- 2026-06-06: Updated layout smoke helpers to measure the stable `scene-canvas-viewport` wrapper for panel overlap.
- 2026-06-06: Ran `pnpm --filter @pokopia-scene-editor/web test -- src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx`; Vitest executed 20 files / 319 tests successfully.
- 2026-06-06: Ran `pnpm --filter @pokopia-scene-editor/web typecheck` successfully.
- 2026-06-06: Ran `pnpm --filter @pokopia-scene-editor/scene-core build` to refresh build output required by Playwright webServer asset verification.
- 2026-06-06: Ran `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts --project=chromium --workers=1 -g "SceneCanvas zoom viewport|switches to Mobile Preview Mode below the mobile breakpoint"` successfully.
- 2026-06-06: Ran `pnpm --filter @pokopia-scene-editor/web build` successfully.
- 2026-06-06: Applied code-review fixes for hit-tested Playwright wheel dispatch, direct clipping assertions, semantic PSE export decode checks, canvasSize shrink clamp coverage and placement keyboard confirmation under zoom.
- 2026-06-06: Re-ran `pnpm --filter @pokopia-scene-editor/web test -- src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx`; Vitest executed 20 files / 319 tests successfully.
- 2026-06-06: Re-ran `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts --project=chromium --workers=1 -g "SceneCanvas zoom viewport|switches to Mobile Preview Mode below the mobile breakpoint"` successfully.
- 2026-06-06: Re-ran `pnpm --filter @pokopia-scene-editor/web typecheck` successfully.
- 2026-06-06: Re-ran `pnpm --filter @pokopia-scene-editor/web build` successfully.

### Completion Notes

- Focused component coverage now exercises wheel clamp, gesture mapping, canvasSize origin reset, selected/hover/focus callbacks, placement preview and storage/autosave boundaries under zoom.
- Browser smoke verifies desktop/tablet min and max zoom layout, approximate 6x6 max zoom visibility, viewport clipping and mobile absence of desktop zoom viewport.
- No runtime behavior beyond 20.2 zoom implementation was broadened.
- Code review patch findings were applied; no unresolved 20.3 action items remain.

### File List

- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `_bmad-output/implementation-artifacts/20-3-zoom-regression-tests-and-browser-layout-verification.md`

## Senior Developer Review (AI)

### Review Outcome

Approved after fixes.

### Review Summary

- Decision-needed: 0
- Patch findings: 7 fixed
- Deferred: 0
- Dismissed: 1 as already handled by suite-level `vi.restoreAllMocks()`

### Notes

- `window.prompt` mock cleanup is already covered by the AppShell suite `afterEach` using `vi.restoreAllMocks()`.

## Change Log

- 2026-06-06: Story created and marked ready-for-dev.
- 2026-06-06: Added focused and browser zoom regression coverage and marked ready for review.
- 2026-06-06: Completed code review fixes and marked Story 20.3 done.
