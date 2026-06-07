# Story 21.4: 矩形编辑回归测试与浏览器验证

Status: done

## Story

As a 维护者, I want 矩形编辑有 focused tests 和 browser smoke, So that 它不会破坏单格编辑、缩放平移、autosave 或 mobile preview。

## Acceptance Criteria

1. SceneCanvas component tests 覆盖 right-drag clear callback、locked left-drag fill callback、no-locked left-drag pan、locked non-cell left-drag pan、nearest-cell release 和 zoom/pan 后坐标映射。
2. Bulk command tests 覆盖 rectangle normalization、multi-cell footprint delete de-dupe、current-level-only clear、fill row-major、blocked skipped、replacement skipped、read-only no-op 和 metadata update。
3. AppShell tests 覆盖矩形清空/填充触发 scene mutation 和 autosave，不写 UI preferences、PSE string 或 export summary，不清除 continuous selected asset。
4. Existing SceneCanvas zoom tests、single click placement/delete tests、asset placement tests、mobile preview/import tests 继续通过。
5. Playwright desktop 1280x720 覆盖 zoom 后矩形填充和矩形清空。
6. Playwright tablet 1024x768 覆盖 nearest-cell release 和 pan fallback。
7. Playwright mobile 390x844 继续证明不渲染 desktop workbench / SceneCanvas rectangle edit surface。
8. 验证命令至少包含 focused web tests、web typecheck、web build 和 focused Playwright smoke。

## Tasks / Subtasks

- [x] Complete focused component and command regression coverage. (AC: 1-4)
  - [x] SceneCanvas gesture tests.
  - [x] Bulk command tests.
  - [x] AppShell storage/autosave boundary tests.
  - [x] Existing zoom, placement and mobile tests.
- [x] Add or update Playwright smoke coverage. (AC: 5-7)
  - [x] Desktop 1280x720: zoom, rectangle fill, rectangle clear.
  - [x] Tablet 1024x768: nearest-cell release and pan fallback.
  - [x] Mobile 390x844: no desktop workbench / rectangle edit surface.
- [x] Run release gate commands. (AC: 8)
  - [x] Focused web tests.
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`.
  - [x] `pnpm --filter @pokopia-scene-editor/web build`.
  - [x] Focused Playwright smoke.
- [x] Record evidence in the Dev Agent Record.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 21 / Story 21.4.
- Approved proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md`.
- Story 21.4 should be run after Story 21.2 and Story 21.3 implementation.

### Suggested Test Targets

- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/state/bulk-scene-edit.test.ts`
- Existing focused state tests such as `apps/web/src/state/asset-placement.test.ts` and `apps/web/src/state/asset-instance-edit.test.ts` as regression references.
- Existing Playwright workbench/mobile specs, or a new focused rectangle edit spec if the current smoke suite cannot express the interaction cleanly.

### Required Evidence Matrix

- SceneCanvas: prove right-drag and locked left-drag callbacks include normalized start/end coordinates; prove no-lock and locked-non-cell left drags pan the viewport; prove nearest-cell release works after zoom/pan.
- Command layer: prove clear deletes current-level footprint-intersecting instances once, preserves other layers and standalone skill markers, updates `metadata.updatedAt`, and returns readable summary counts.
- Fill command: prove row-major placement uses new instance ids, selected asset, rotation and `requiresSkill`; prove blocked and replacement-confirmation-required cells are skipped without implicit overwrite.
- AppShell/autosave: prove successful rectangle commands mutate the scene through `commitSceneEdit`, preserve continuous selected asset after fill, clear stale placement feedback, and do not write rectangle preview/summary into UI preferences, PSE strings or export summary.
- Mobile/read-only: prove mobile preview mode still hides the desktop SceneCanvas rectangle edit surface and read-only paths do not mutate scene.

### Validation Notes

- Browser smoke should verify real pointer hit testing after zoom/pan, because JSDOM tests cannot fully prove transformed DOM hit areas.
- Use the actual Vite URL from the dev server output if Playwright needs a running app.
- Keep screenshots or trace notes only if they are already part of existing workflow; do not add large binary artifacts to the repo.
- If adding a Playwright spec, prefer a focused rectangle-edit spec over expanding unrelated smoke coverage; do not require committed binary artifacts.

### Project Structure Notes

- Keep test-only fixtures local to the relevant test file unless reused by multiple web state tests.
- Browser smoke should target the existing Vite app surface and current workbench/mobile selectors; avoid adding production-only hooks.
- Do not modify product code only to make tests pass unless Story 21.2 or Story 21.3 implementation requires the product change.

### References

- `_bmad-output/planning-artifacts/epics.md` - Epic 21 / Story 21.4 AC.
- `_bmad-output/planning-artifacts/prd.md` - FR144-FR149 and NFR73-NFR76.
- `_bmad-output/planning-artifacts/architecture.md` - test responsibility and UI-transient storage boundary.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - desktop/tablet/mobile interaction expectations.
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md` - validation sequence and browser smoke matrix.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-07: `pnpm --filter @pokopia-scene-editor/web test -- src/state/bulk-scene-edit.test.ts src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx` -> 21 test files passed, 342 tests passed.
- 2026-06-07: `pnpm --filter @pokopia-scene-editor/web typecheck` -> passed.
- 2026-06-07: `pnpm --filter @pokopia-scene-editor/web build` -> passed; Vite reported the existing chunk-size warning and runtime asset verification passed with 1474 references checked.
- 2026-06-07: `pnpm --filter @pokopia-scene-editor/web exec playwright test --project=chromium --grep "rectangle edit"` -> 3 tests passed.
- 2026-06-07: `git diff --check` -> passed.

### Completion Notes List

- Component coverage now includes right-drag clear, locked left-drag fill, no-lock pan, locked non-cell pan, nearest-cell release, pointer cancel, read-only guard and stable preview range attributes.
- Command coverage now includes normalization, current-level effective-footprint clear de-dupe, row-major fill, wide-footprint threading, rotation, footprint-blocked skip, replacement skip, read-only no-op and empty-clear no autosave mutation.
- AppShell coverage now verifies scene mutation/autosave, continuous selected asset retention, UI preferences/PSE string/export preview boundaries and stale placement-feedback cleanup.
- Playwright smoke covers desktop zoom fill/clear, tablet nearest release plus pan fallback and mobile absence of desktop rectangle edit surface.

### File List

- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/state/bulk-scene-edit.test.ts`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/components/scene-canvas/SceneCanvas.tsx`
- `apps/web/src/state/bulk-scene-edit.ts`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-07: Story created and marked ready-for-dev.
- 2026-06-07: Create-story review added evidence matrix, references and Dev Agent Record skeleton.
- 2026-06-07: Added focused regression coverage, browser smoke and release-gate evidence; marked story done.
