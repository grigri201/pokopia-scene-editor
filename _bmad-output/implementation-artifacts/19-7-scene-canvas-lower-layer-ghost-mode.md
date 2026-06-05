# Story 19.7: SceneCanvas 下层影子辅助模式

Status: done

## Story

As a 多层布景编辑用户, I want 在当前层看到直接下一层的半透明素材影子, So that 我可以对齐家具、墙体和装饰而不频繁切层。

## Acceptance Criteria

1. 编辑 L0 时不显示下层影子。
2. 编辑 L1 时可看到 L0 的半透明影子；编辑 L2 时可看到 L1 的半透明影子。
3. 只显示直接下一层，不显示所有低层。
4. 影子透明度约 25%-35%，位于当前层真实素材之后，且不遮挡 placement preview、选中态和当前层操作标记。
5. 影子按 lower layer 的 footprint、rotation 和 dye 渲染；不显示技能标记、备注或可操作 affordance。
6. 影子不可选中、不可删除、不可旋转、不可触发检查器。
7. 点击影子所在格仍按当前层选择/放置逻辑执行。
8. 影子不参与 occupancy、stacking、replacement confirmation、footprint conflict、height blocking 或 scene-core placement semantics。
9. 下层影子开关默认开启；开关状态只写 UI preferences/localStorage，不进入 SceneDocument、PSE、export payload 或 autosave payload。
10. Tests 覆盖 L0 无影子、L1 显示 L0、点击影子不改变规则、placement preview 仍按当前层规则、toggle 不进入 SceneDocument。

## Tasks / Subtasks

- [x] Add lower-layer ghost projection as UI-only data. (AC: 1-5, 8)
  - [x] Derive the direct lower building level from sorted scene `buildingLevels` and the active editing level.
  - [x] Build ghost overlays from lower layer tile instances using catalog footprint, rotation and dye data.
  - [x] Render ghosts behind current-layer assets and placement overlays with opacity around 25%-35%.
  - [x] Do not include skill markers, layer notes, buttons, aria grid cells or editable affordances in the ghost layer.
- [x] Add a UI-only ghost toggle. (AC: 9)
  - [x] Default the toggle to enabled.
  - [x] Persist only the toggle in a UI-only localStorage preference, not SceneDocument or export data.
  - [x] Make storage read/write failures non-blocking for scene editing.
  - [x] Hide or disable the toggle in mobile read-only mode if it is not rendered with the desktop workbench.
- [x] Preserve current-layer interaction semantics. (AC: 6-8)
  - [x] Ensure ghost elements use `aria-hidden` and do not receive pointer events.
  - [x] Ensure clicking a ghost-covered cell selects/places on the current active layer only.
  - [x] Ensure placement preview, selected state, current-layer markers and footprint overlays remain above the ghost.
  - [x] Do not change `packages/scene-core` occupancy, stacking, replacement confirmation or placement preview functions.
- [x] Update focused tests. (AC: 1-10)
  - [x] SceneCanvas: L0 no ghost; L1 shows L0; L2 shows only L1.
  - [x] SceneCanvas: ghost renders footprint/rotation/dye attributes and no skill/note affordance.
  - [x] AppShell: clicking ghost-covered cells uses current-layer select/place semantics and does not mutate lower-layer instances.
  - [x] AppShell: toggle persists UI-only and does not write SceneDocument, PSE/export payload, saved storage or autosave payload.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 19 / Story 19.7.
- PRD NFR68 says lower-layer ghost must be a UI projection derived from current `SceneDocument` and asset catalog, without changing scene-core occupancy, stacking, replacement confirmation, height blocking or placement preview results.
- Architecture says `scene-canvas/` may receive or internally derive lower-layer ghost projection, but write operations must still dispatch commands and mobile keyboard handler remains no-op.

### Existing Implementation Map

- `apps/web/src/components/app-shell/AppShell.tsx`
  - Owns `scene`, `activeBuildingLevelId`, `canvasCells`, placement preview and UI-only preferences.
  - Currently passes `scene`, `cells`, `targetPlacement` and handlers into `SceneCanvas`.
  - Good place to own `lowerLayerGhostEnabled`, persistence and direct lower-layer projection wiring.
- `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
  - Renders grid cells and scene footprint overlays.
  - Receives `cells` for current layer; `cell.otherVisibleLayerInstances` is all non-current layers and must not be reused directly because AC3 requires only direct lower layer.
  - Existing overlays use `scene-footprint-layer`; ghost overlay should be a separate non-interactive layer behind current overlays.
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
  - Already has current-layer/other-layer context tests and placement preview tests.
  - Add ghost-specific tests without changing existing current-layer occupancy expectations.
- `apps/web/src/io/scene-summary-preferences.ts`
  - Pattern for dedicated UI-only preference storage with non-blocking read/write.
  - A similar `lower-layer-ghost-preferences.ts` is acceptable if kept out of scene storage and export contracts.
- `apps/web/src/i18n/index.ts` / `apps/web/src/styles.css`
  - Add small toggle labels and ghost overlay styles.

### Technical Constraints

- Do not modify `SceneDocument v1`, PSE codec, export summary schema, `packages/scene-core` placement/occupancy/stacking semantics, Worker routes or deployment behavior.
- Do not feed ghost instances into `getCanvasCellContexts()`, `getAssetPlacementPreview()`, `buildSceneOccupancy()` or export summary builders.
- Ghost UI state must stay out of autosave/saved storage, PSE strings, export summaries and mobile preview/import state.
- Ghost rendering should not add focusable elements or affect screen-reader cell names; current cell labels may continue to include existing `otherVisibleLayerInstances` counts.

### Testing Requirements

- `pnpm --filter @pokopia-scene-editor/web test -- src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx`
- `pnpm --filter @pokopia-scene-editor/web typecheck`
- `pnpm --filter @pokopia-scene-editor/web build`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-06: Created story context from Epic 19 AC, SceneCanvas current overlays, AppShell active level wiring and UI-only preference patterns.
- 2026-06-06: Started implementation.
- 2026-06-06: Added SceneCanvas direct lower-layer ghost projection, UI-only preference storage and AppShell toggle.
- 2026-06-06: Ran multi-agent review; fixed visible rotation/dye ghost cues, selected/preview z-order cues, read-only gating and malformed duplicate level-number handling.
- 2026-06-06: Validated with focused tests, typecheck and production build.

### Completion Notes

Implemented a UI-only lower-layer ghost mode for desktop editing. SceneCanvas now derives the strict direct lower level from `SceneDocument` and renders non-interactive ghost overlays with effective footprint, rotation and dye cues. AppShell owns a default-on UI-only toggle persisted to `pokopia.lowerLayerGhost.v1`; the preference is isolated from SceneDocument, autosave, saved scene storage, PSE strings and export payloads. Current-layer selection, placement preview, placement click, occupancy, height blocking and stacking semantics remain unchanged.

## Senior Developer Review (AI)

Outcome: Approved after fixes.

Review method: three read-only sub-agents reviewed the Story 19.7 diff as Blind Hunter, Acceptance Auditor and Edge Case Hunter. Focused tests and typecheck/build were also run locally.

Findings addressed:

- P2: Ghost rotation and dye were initially represented only as data attributes. Fixed by rotating the ghost image with a CSS variable and adding non-interactive rotation/dye visual cues; tests now assert cue DOM/style.
- P2: Ghost overlays could visually sit above selected/target/placement cues on single-cell interactions. Fixed by adding high-z-index non-interactive cell cue pseudo-elements above the ghost layer.
- P3: SceneCanvas direct usage in read-only mode could still render ghosts if the parent forgot to gate the prop. Fixed with component-level `!readOnly` gating and a direct SceneCanvas test.
- P3: Duplicate malformed `levelNumber` peers could be treated as direct lower context. Fixed by selecting only levels with `levelNumber` strictly below the active level, with deterministic sorting and coverage.

### File List

- `_bmad-output/implementation-artifacts/19-7-scene-canvas-lower-layer-ghost-mode.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/io/index.ts`
- `apps/web/src/io/lower-layer-ghost-preferences.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-06: Story created and marked ready-for-dev.
- 2026-06-06: Story marked in-progress.
- 2026-06-06: Implemented, reviewed, fixed review findings and marked done.
