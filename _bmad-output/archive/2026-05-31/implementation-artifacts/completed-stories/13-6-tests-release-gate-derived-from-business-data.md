# Story 13.6: 测试与 Release Gate 去配置耦合

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want 测试像前端一样从业务代码和数据读取事实,
so that 默认尺寸、catalog 或配置变化不会导致测试复制旧常量。

## Acceptance Criteria

1. 当测试需要默认尺寸、legacy 尺寸、catalog ids、footprint 或 stacking facts 时，应从 `createDefaultSceneDocument`、dimension helpers、catalog helpers 或 shared fixtures 派生，不把当前配置复制成第二套测试真相。
2. Worker/MCP/skill 已从本仓库移除后，测试套件不得保留 Worker/MCP/skill tests；保留的业务契约应在 `scene-core` direct-call tests 覆盖。
3. Web component/e2e tests 继续覆盖编辑、保存/恢复、导出、17x17 和 legacy 7x7 行为，且不依赖 API/MCP endpoint。
4. `pnpm run release:verify` 覆盖 core/web typecheck、unit tests、build、Playwright smoke、file-install smoke 和 asset-reference smoke；不默认运行 Worker runtime、MCP smoke 或 skill verify。

## Tasks / Subtasks

- [x] 收敛高风险尺寸测试常量 (AC: 1, 3)
  - [x] 在 `SceneCanvas.test.tsx` 中由 default/legacy scene dimensions 派生默认网格尺寸、cell 数量、边界坐标和 aria 文案；保留用户可见 `17x17` / `7x7` 断言但不要手写重复事实。
  - [x] 在 `ExportPreview.test.tsx` 中由 `buildImageExportSummary` / scene dimensions 派生默认网格 cell 数量、label 和 CSS variable 期望；保留导出 UI 行为覆盖。
  - [x] 在 `PokemonSceneControls.test.tsx` 或同等 Web component test 中由 `createDefaultSceneDocument().canvasSize` 派生默认 control 值，避免本地 `{ width: 17, height: 17 }` 常量。
- [x] 收敛 core 默认/legacy 断言 (AC: 1, 2)
  - [x] 在 `default-scene.test.ts` 中用 `getDefaultSceneDimensions()` / `defaultSceneDimensions` 派生默认 scene/canvas/outer padding 期望。
  - [x] 若触及 legacy 断言，用 `legacySceneDimensions` 派生 7x7/5x5 事实，避免复制旧常量。
  - [x] 确认 Worker/MCP/skill tests 不存在；若只剩 handoff/history 文档引用，记录检查结果。
- [x] 修正 release gate (AC: 4)
  - [x] 调整 root `release:verify`，显式覆盖 asset-reference smoke，并保持 typecheck、unit tests、build、file-install smoke、Web Playwright smoke。
  - [x] 确认 release gate 不运行 Worker runtime、MCP smoke 或 skill verify。
- [x] 验证 (AC: 1-4)
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/default-scene.test.ts src/domain/scene/area.test.ts`
  - [x] `pnpm --filter @pokopia-scene-editor/web test src/components/scene-canvas/SceneCanvas.test.tsx src/components/export-preview/ExportPreview.test.tsx src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
  - [x] `pnpm run release:verify`
  - [x] `git diff --check`

## Dev Notes

### Current State

- Root `release:verify` currently runs typecheck, all unit tests, an extra scene-string codec node run, build, scene-core file-install smoke and Web smoke. It does not explicitly run `asset-references:smoke`, even though Story 13.4 introduced the runtime asset reference guard.
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx` derives the default scene with `createDefaultSceneDocument`, but repeats `17`, `289`, `225`, `64`, `56`, `16,16`, `15,15` and legacy `7x7` / `49` / `25` / `24` / `16` expectations inline.
- `apps/web/src/components/export-preview/ExportPreview.test.tsx` validates export behavior but repeats default `17x17` labels and `289` cells. Prefer deriving these from the export summary or source scene dimensions.
- `apps/web/src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx` uses a local `defaultCanvasSize = { width: 17, height: 17 }`; derive from `createDefaultSceneDocument().canvasSize` instead.
- `packages/scene-core/src/domain/scene/default-scene.test.ts` should keep contract assertions, but the dimension expectations should point to `getDefaultSceneDimensions()` or `defaultSceneDimensions` so future default-size edits have one source of truth.

### Implementation Guardrails

- Do not weaken user-visible assertions; derive expected text from the same production i18n/domain helpers where possible, but still assert the actual visible behavior.
- Do not replace intentionally invalid boundary values with derived helpers if the point of the test is the invalid value itself; derive those invalid values from dimensions, such as `defaultCanvas.width`.
- Do not add Worker/MCP/skill fixtures or endpoint mocks. Story 13.3 intentionally removed that surface.
- Keep `SceneDocument v1` schema, storage keys, catalog data and runtime behavior unchanged.
- If `release:verify` becomes slow because `asset-references:smoke` repeats build, prefer adding a no-build verifier script and composing the gate after the main build, instead of dropping coverage.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 13.6 AC and FR114/NFR53/NFR54/NFR56 scope.
- `_bmad-output/implementation-artifacts/13-3-remove-worker-api-mcp-skill-code.md` - removed Worker/MCP/skill test/script surface.
- `_bmad-output/implementation-artifacts/13-4-resource-data-single-source-of-truth-cleanup.md` - runtime asset reference guard.
- `_bmad-output/implementation-artifacts/13-5-web-core-complexity-and-code-volume-reduction.md` - large test split was deferred here.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-30T13:19:10+0800 - Created story from Epic 13.6 and moved tracker to `ready-for-dev`.
- 2026-05-30T13:19:46+0800 - Started `bmad-dev-story`; tracker moved to `in-progress`.
- 2026-05-30T13:26:13+0800 - Derived high-risk test constants from scene-core/default scenes, added asset-reference verification to release gate, and moved story to `review`.
- 2026-05-30T13:39:14+0800 - Fixed code-review findings by deriving footprint, stacking, summary metadata and selector expectations from scene data/contracts, then moved Story 13.6 and Epic 13 to `done`.

### Completion Notes List

- `SceneCanvas.test.tsx`, `ExportPreview.test.tsx`, `PokemonSceneControls.test.tsx`, Web smoke, `area.test.ts` and `default-scene.test.ts` now derive high-risk default/legacy dimensions, canvas cell counts, boundary labels or control defaults from scene-core helpers, generated scenes or export summaries.
- Root `release:verify` now runs `asset-references:verify` after the main build, so asset-reference coverage is explicit without repeating a full build inside the release gate. `asset-references:smoke` remains available as build + verify for standalone use.
- `apps/web` smoke now builds `scene-core` first because the Playwright smoke spec imports scene-core's built package contract for default/legacy dimensions.
- Active source search found no Worker/MCP/skill tests or scripts under `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `scripts`, `apps` or `packages`.
- Catalog audit tests were intentionally left mostly unchanged in this story because their hardcoded sample ids protect data curation; replacing them with helper-to-helper comparisons would weaken coverage.
- Code-review follow-up removed remaining duplicated business facts in ExportPreview, SceneCanvas, core export-summary/selectors tests and Web smoke by deriving expected cells, footprint ranges and stacking summaries from source scenes, export summaries, occupancy contracts or dimension helpers.
- Verified commands:
  - `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/default-scene.test.ts src/domain/scene/area.test.ts` (20 passed)
  - `pnpm --filter @pokopia-scene-editor/web test src/components/scene-canvas/SceneCanvas.test.tsx src/components/export-preview/ExportPreview.test.tsx src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx` (46 passed)
  - `pnpm --filter @pokopia-scene-editor/web test src/components/scene-canvas/SceneCanvas.test.tsx src/components/export-preview/ExportPreview.test.tsx src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx && pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/default-scene.test.ts src/domain/scene/area.test.ts src/domain/scene/export-summary.test.ts src/domain/scene/selectors.test.ts && pnpm run release:verify` (focused Web 46 passed, focused scene-core 38 passed, release gate passed)
  - `pnpm run typecheck`
  - `pnpm run release:verify` (scene-core 149 tests, web 233 tests, extra scene-string codec 13 tests, build, file-install smoke, asset-reference verify and Playwright smoke 16 tests passed)
  - `git diff --check`

### File List

- `_bmad-output/implementation-artifacts/13-6-tests-release-gate-derived-from-business-data.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `apps/web/package.json`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
- `packages/scene-core/src/domain/scene/default-scene.test.ts`
- `packages/scene-core/src/domain/scene/area.test.ts`
- `packages/scene-core/src/domain/scene/export-summary.test.ts`
- `packages/scene-core/src/domain/scene/selectors.test.ts`

### Change Log

- 2026-05-30: Created Story 13.6.
- 2026-05-30: Derived high-risk test expectations from business data and wired asset-reference verification into release gate.
- 2026-05-30: Fixed review findings and completed Epic 13.
