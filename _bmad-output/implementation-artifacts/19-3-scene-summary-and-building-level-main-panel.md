# Story 19.3: 左侧场景摘要与建筑层主面板

Status: done

## Story

As a desktop 编辑用户, I want 左侧默认展示紧凑场景摘要并把建筑层列表作为主工作区, So that 多层布景中我能看到更多建筑层并快速切层。

## Acceptance Criteria

1. 场景摘要默认只展示场景名、Pokemon、画布尺寸摘要。
2. 展开后显示场景名输入、Pokemon 选择、画布宽高控件。
3. 展开/折叠状态只写 UI preferences/localStorage，不写 SceneDocument。
4. 1280x720 下建筑层列表可见高度增加。
5. 当前层明显可见，非当前层降低视觉重量。
6. 行内重命名、复制、删除等操作按需浮现，但 hover/focus/keyboard 均可访问。
7. Epic 16 整行拖拽排序、edge drop、键盘 fallback 和 autosave 行为不回退。

## Tasks / Subtasks

- [x] Add compact scene summary controls. (AC: 1, 2)
  - [x] Render default scene summary with scene name, Pokemon and canvas summary.
  - [x] Add an expand/collapse button with `aria-expanded` and stable labels.
  - [x] Keep full scene name, Pokemon and canvas controls available when expanded.
- [x] Persist expansion as UI-only state. (AC: 3)
  - [x] Initialize AppShell from localStorage/UI preferences.
  - [x] Persist toggles without writing scene autosave/saved storage, PSE strings or SceneDocument.
  - [x] Treat storage failures as best-effort UI behavior.
- [x] Improve left-panel density and building-level emphasis. (AC: 4-6)
  - [x] Reduce collapsed scene controls height so the level panel receives more vertical room.
  - [x] Make current layer visually stronger and non-current layers quieter.
  - [x] Make copy/delete actions appear on hover/focus/current row while remaining keyboard accessible.
- [x] Preserve Epic 16 behavior. (AC: 7)
  - [x] Do not modify reorder command semantics.
  - [x] Keep AppShell drag reorder tests passing.
  - [x] Keep autosave payload expectations unchanged.
- [x] Update focused tests. (AC: 1-7)
  - [x] Add PokemonSceneControls collapsed/expanded tests.
  - [x] Add AppShell UI-only persistence/isolation tests.
  - [x] Add or update BuildingLevelPanel style/accessibility assertions for action affordances.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 19 / Story 19.3.
- PRD/UX/Architecture require Desktop 工作台 “编辑当前建筑层优先”: scene settings should become an on-demand summary, while building levels become the left panel's primary surface.
- This story must not alter `SceneDocument v1`, PSE string encoding, scene autosave/saved payload, export summary or `packages/scene-core`.

### Existing Implementation Map

- `apps/web/src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
  - Currently renders the full scene name, Pokemon combobox and canvas size controls by default.
  - Existing component tests assert those controls and Pokemon search behavior.
- `apps/web/src/components/app-shell/AppShell.tsx`
  - Owns scene state and passes scene controls callbacks.
  - Can own UI-only expanded/collapsed state and persist via localStorage.
- `apps/web/src/io/ui-preferences.ts`
  - Existing UI preference storage is schema-versioned and used for locale/help/asset filters.
  - A separate best-effort localStorage key is acceptable for this story to avoid mixing scene facts into SceneDocument.
- `apps/web/src/components/building-level-panel/BuildingLevelPanel.tsx`
  - Epic 16 row drag, edge drop and keyboard reorder are already implemented.
  - Avoid changing reorder logic; focus on CSS emphasis/action affordances.
- `apps/web/src/styles.css`
  - `.workbench-left` uses `grid-template-rows: auto minmax(0, 1fr)`, so reducing `.scene-controls` collapsed height directly gives the level panel more visible height.

### Previous Story Intelligence

- Story 19.2 established the pattern for transient UI state in AppShell, reviewed label-in-name/focus behavior, and kept header/menu state out of storage unless explicitly UI-only.
- Code review for 19.2 emphasized keyboard/focus lifecycle. Apply the same standard to the scene summary expand/collapse control.

### Technical Constraints

- Use existing React/Vitest/Testing Library stack; do not add state or UI libraries.
- Do not edit `packages/scene-core`.
- Do not persist scene summary expanded state in `SceneDocument`, scene autosave/saved storage, PSE string or export summary.
- Keep the form controls mounted or otherwise preserve existing AppShell tests unless a test specifically asserts visibility.

### Testing Requirements

- `pnpm --filter @pokopia-scene-editor/web test -- src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx src/components/app-shell/AppShell.test.tsx src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `pnpm --filter @pokopia-scene-editor/web typecheck`
- `pnpm --filter @pokopia-scene-editor/web build`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-05: Created story context from Epic 19 planning artifacts, existing scene controls, UI preference helpers and Epic 16 building level panel implementation.
- 2026-06-05: Started implementation.
- 2026-06-05: Added failing tests for compact summary, expanded controls and UI-only AppShell persistence.
- 2026-06-05: Added `scene-summary-preferences` storage helper with independent localStorage key.
- 2026-06-05: Updated `PokemonSceneControls` to render a compact summary and on-demand full settings surface.
- 2026-06-05: Wired AppShell scene summary expansion to UI-only localStorage and passed building-level count for summary copy.
- 2026-06-05: Updated CSS to reduce collapsed scene controls height, emphasize current level, mute standby rows and reveal level actions on hover/focus/current row.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx src/components/app-shell/AppShell.test.tsx src/components/building-level-panel/BuildingLevelPanel.test.tsx`: 20 files, 303 tests.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.
- 2026-06-05: Code review found summary copy included building-layer count, folded controls were only CSS-hidden, UI storage failure coverage was thin, and Epic 16 keyboard reorder fallback was absent.
- 2026-06-05: Fixed review findings by using a canvas-only summary, adding `hidden`/`inert` to collapsed fields, covering storage failure, restoring move up/down layer controls and adding action accessibility assertions.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx src/components/app-shell/AppShell.test.tsx src/components/building-level-panel/BuildingLevelPanel.test.tsx`: 20 files, 305 tests.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.

### Completion Notes

- Left scene controls now default to a compact scene summary in AppShell.
- Expanding reveals the existing scene name, Pokemon and canvas controls without changing SceneDocument semantics.
- Expansion state is persisted in `pokopia.sceneSummary.v1`, not scene storage.
- Building level panel receives more room when collapsed and rows now visually prioritize the current layer.
- Compact summary now limits visible facts to scene name, Pokemon and canvas size.
- Epic 16 row drag, edge drop and keyboard move up/down fallback are covered through the same reorder command path.

## Senior Developer Review (AI)

Reviewed with Blind Hunter, Edge Case Hunter and Acceptance Auditor.

- Fixed: summary copy no longer includes building-layer count, satisfying AC1.
- Fixed: collapsed scene settings now use `hidden` and `inert`, preventing keyboard/a11y access while folded.
- Fixed: AppShell storage failure coverage now verifies scene summary toggles remain UI-only and best-effort.
- Fixed: BuildingLevelPanel restores keyboard-reachable move up/down controls and keeps copy/delete/reorder actions accessible through focus.
- Dismissed: Blind Hunter reported missing `scene-summary-preferences` diff because the file was untracked during review; the file is included in the File List and must be staged with the story.

### File List

- `_bmad-output/implementation-artifacts/19-3-scene-summary-and-building-level-main-panel.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/building-level-panel/BuildingLevelPanel.tsx`
- `apps/web/src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `apps/web/src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
- `apps/web/src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
- `apps/web/src/io/index.ts`
- `apps/web/src/io/scene-summary-preferences.ts`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-05: Story created and marked ready-for-dev.
- 2026-06-05: Implemented and verified scene summary and building-level main panel updates; story marked review.
- 2026-06-05: Applied code-review fixes, restored keyboard reorder fallback and marked story done.
