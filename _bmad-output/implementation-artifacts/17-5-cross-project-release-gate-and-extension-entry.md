# Story 17.5: 跨项目 Release Gate 与数据扩展入口

Status: done

## Story

As a 维护者, I want 一个跨项目验证和扩展流程, So that 后续新增 Pokopia 数据只需要改 `pokopia-data` 并能证明两个 consumer 未回退。

## Acceptance Criteria

1. 定义标准验证顺序：`pokopia-data` validate/build -> scene editor scene-core tests/build -> scene editor web build -> color pattern validate/build。
2. 增加数据扩展文档：新增 item、Pokemon、translation、preference、color override、asset reference 的入口和检查命令。
3. 给出 slug/id compatibility checklist，特别覆盖 scene string codec 和 legacy aliases。
4. 两个 consumer 的 docs 指向 `pokopia-data`，不再把本地 generated source 作为扩展入口。
5. 明确部署仍由各 consumer 项目独立执行；data package 不直接部署 Web。

## Tasks / Subtasks

- [x] Add or update cross-project release gate documentation. (AC: 1, 5)
  - [x] Document exact command order across `../pokopia-data`, `pokopia-scene-editor`, and `../pokopia-color-pattern`.
  - [x] State that deployment remains separate for each consumer and that `pokopia-data` has no Web deploy.
- [x] Update data extension entry documentation. (AC: 2, 4)
  - [x] Point base item/Pokemon/translation/preference/color/asset-manifest edits to `../pokopia-data`.
  - [x] Keep scene-core footprint/stacking and color-pattern recommendation ranking docs in their owning consumers.
- [x] Add slug/id compatibility checklist. (AC: 3)
  - [x] Cover `assetId`, `officialId`, `sceneCodecOfficialId`, `legacyOfficialIds`, Pokemon slugs, color-pattern routes, and old PSE1/PSE2 compatibility.
  - [x] Include required validation commands after any compatibility-sensitive data change.
- [x] Run the final cross-project gate. (AC: 1)
  - [x] `npm run release:verify` in `../pokopia-data`.
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core test`, `pnpm --filter @pokopia-scene-editor/scene-core build`, `pnpm --filter @pokopia-scene-editor/web build`, and `pnpm run scene-core:file-install:smoke` in this repo.
  - [x] `npm run validate:data` and `npm run verify:release` in `../pokopia-color-pattern`.

## Dev Notes

- Main doc to update in this repo: `docs/data-source-of-truth.md`.
- If `../pokopia-color-pattern` has an equivalent docs entry or README reference to local generated sources, update it to identify `../pokopia-data` as the base-data entry point while retaining recommendation-specific ownership.
- Avoid deleting consumer-local audit docs or generated outputs that are still used by builds.
- Do not add deployment automation to `pokopia-data`.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` Epic 17 Story 17.5]
- [Source: `_bmad-output/planning-artifacts/architecture.md` cross-project verification order]
- [Source: `docs/data-source-of-truth.md` current future boundary and generated snapshot policy]

## Dev Agent Record

### Debug Log

- 2026-06-04: Updated `docs/data-source-of-truth.md` to define the active cross-project data boundary, release order, data extension checklist, slug/id compatibility checklist, hydrate smoke coverage, and independent deployment ownership.
- 2026-06-04: Added `data:pokopia:verify` to the scene-editor release gate and made `release:verify` validate `../pokopia-data` first.
- 2026-06-04: Updated consumer regression expectations for current catalog rendering and inspector footprint output after the data-package migration.
- 2026-06-04: `npm run release:verify` in `../pokopia-data` passed.
- 2026-06-04: Code review found the default scene-editor release gate was not complete while smoke still ran with default worker count; changed Web smoke to run Chromium with `--workers=1`.
- 2026-06-04: `pnpm run release:verify` in this repo passed end-to-end, including data verification, typecheck, scene-core tests, web tests, legacy codec tests, build, packed scene-core file-install smoke, asset verification, and 23 Playwright smoke tests.
- 2026-06-04: `npm run verify:release` in `../pokopia-color-pattern` passed, including build and 10 hydrate smoke tests.

### Completion Notes

- Cross-project release order is documented and wired into the scene-editor root release gate for the data-package prerequisite.
- Base data extension entry is now `../pokopia-data`; scene-core keeps footprint/stacking ownership, and color-pattern keeps recommendation/routing ownership.
- `SceneDocument v1` stayed unchanged.
- The default scene-editor release gate now uses single-worker Playwright smoke and passes in this local environment.

### File List

- `docs/data-source-of-truth.md`
- `package.json`
- `apps/web/package.json`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/src/components/preview-inspector/PreviewInspector.test.tsx`
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `../pokopia-data/README.md`
- `../pokopia-color-pattern/README.md`

### Change Log

- 2026-06-04: Completed Story 17.5 cross-project release gate, documentation, and verification.
