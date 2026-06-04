# Story 17.3: scene-core 改为消费 pokopia-data

Status: done

## Story

As a scene editor maintainer, I want `scene-core` 从 `pokopia-data` 读取基础数据, So that 编辑器 catalog 不再维护重复 item/Pokemon snapshots。

## Acceptance Criteria

1. `packages/scene-core` 新增对 `pokopia-data` 的 package dependency。
2. `source-placeable-items.ts`、`source-placeable-item-translations.ts`、`source-pokemon-preferences.ts`、`source-pokemon-portraits.ts` 等基础数据改为由 `pokopia-data` exports 生成或直接消费。
3. `assetCatalog` 输出的 `assetId`、`officialId`、`sceneCodecOfficialId`、`legacyOfficialIds`、`name`、`category`、`thumbnailUrl` 与迁移前兼容。
4. Footprint/stacking overrides 首轮保留在 `scene-core`，并继续通过现有 catalog tests 锁定。
5. 旧 PSE1/PSE2 codec tests、asset catalog tests、web build 和 file-install smoke 通过。

## Tasks / Subtasks

- [x] Add `pokopia-data` dependency and import base data from package exports. (AC: 1, 2)
  - [x] Ensure workspace/package manager can resolve sibling `../pokopia-data` without publishing.
  - [x] Prefer direct ESM exports from `pokopia-data`; avoid importing its `src/` or requiring consumer-side compilation.
- [x] Replace scene-core generated snapshot ownership with thin adapters or direct data imports. (AC: 2)
  - [x] Update `catalog.ts` to use item, translation, and preference data from `pokopia-data`.
  - [x] Update `pokemon.ts` to use Pokemon portrait data from `pokopia-data`.
  - [x] Keep `source-habitat-matching-items.ts` out of runtime catalog unless it is explicitly used; document future ownership if not migrated in this story.
- [x] Preserve public scene-core catalog behavior. (AC: 3, 4)
  - [x] Keep editor-owned category mapping, kit filtering, favorite merge, search keywords, dyeable inference, footprint overrides, and stacking overrides in `scene-core`.
  - [x] Add an explicit `legacyOfficialIds` fixture assertion for at least `wooden-bench`, `ditto-doll`, and `leppa-berry`.
- [x] Run scene-core and consumer gates. (AC: 5)
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core test`
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core build`
  - [x] `pnpm --filter @pokopia-scene-editor/web build`
  - [x] `pnpm run scene-core:file-install:smoke`

## Dev Notes

- Source of truth: `_bmad-output/planning-artifacts/epics.md` Epic 17, `_bmad-output/planning-artifacts/architecture.md` Approved Course Correction 2026-06-04, and `docs/data-source-of-truth.md`.
- `SceneDocument v1` must not change. Do not add data fields for data provenance, footprints, stacking, colors, or habitat data.
- Current scene-core source snapshots are:
  - `packages/scene-core/src/domain/assets/source-placeable-items.ts`
  - `packages/scene-core/src/domain/assets/source-placeable-item-translations.ts`
  - `packages/scene-core/src/domain/assets/source-pokemon-preferences.ts`
  - `packages/scene-core/src/domain/assets/source-pokemon-portraits.ts`
  - `packages/scene-core/src/domain/assets/source-habitat-matching-items.ts` is future habitat data and currently not runtime catalog.
- Runtime assembly remains in `packages/scene-core/src/domain/assets/catalog.ts` and `packages/scene-core/src/domain/assets/pokemon.ts`.
- Must preserve existing catalog fixture behavior:
  - `assetCatalog` length remains 1161 after kit/key-item filtering.
  - `wooden-bench`: `officialId` `277`, `sceneCodecOfficialId` `047`, `name` `木长椅`.
  - `ditto-doll`: `officialId` `448`, `sceneCodecOfficialId` `979`, `name` `百变怪玩偶`.
  - `leppa-berry`: `officialId` `001`, `sceneCodecOfficialId` `197`, `name` `苹野果`.
  - `leafy-plant`: keeps `officialId` `336`, `sceneCodecOfficialId` `1052`.
  - `vine`: remains local fallback-compatible with `officialId`/`sceneCodecOfficialId` `2374`.
- `legacyOfficialIds` is indirectly covered by codec tests today; add direct assertions because this migration changes source plumbing.
- Do not migrate `footprint-overrides.ts` or `stacking-overrides.ts` to `pokopia-data` in this story.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` Epic 17 Story 17.3]
- [Source: `_bmad-output/planning-artifacts/architecture.md` Approved Course Correction - 2026-06-04]
- [Source: `docs/data-source-of-truth.md` Approved Future Boundary]
- [Source: `packages/scene-core/src/domain/assets/catalog.test.ts` catalog compatibility fixtures]
- [Source: `packages/scene-core/src/io/scene-string-codec.test.ts` legacy codec compatibility]

## Dev Agent Record

### Debug Log

- 2026-06-04: Added `pokopia-data` as a sibling development dependency for `packages/scene-core`; runtime output bundles data and package consumers do not need the sibling path.
- 2026-06-04: Rewired `catalog.ts` to import item, translation, and preference base data from `pokopia-data` while retaining scene-core category, favorite, search, footprint, and stacking ownership.
- 2026-06-04: Rewired `pokemon.ts` to derive Pokemon catalog entries from `pokopia-data`.
- 2026-06-04: Added direct `legacyOfficialIds` assertions for `wooden-bench`, `ditto-doll`, and `leppa-berry`.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/scene-core test` passed.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/scene-core typecheck` passed.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/scene-core build` passed.
- 2026-06-04: `pnpm --filter @pokopia-scene-editor/web build` passed as part of the release gate before Playwright smoke.
- 2026-06-04: Code review found source-directory install smoke missed packaged `.d.ts` dependency risk; changed `scene-core:file-install:smoke` to pack a tarball first, then install and typecheck it in a temp consumer.
- 2026-06-04: `pnpm run scene-core:file-install:smoke` passed with the packed tarball path.

### Completion Notes

- `scene-core` now consumes base item, translation, preference, and Pokemon data from `pokopia-data` package exports instead of owning duplicate generated snapshots.
- `SceneDocument v1` stayed unchanged.
- Footprint and stacking overrides remain in `scene-core`.
- Catalog compatibility is covered by existing fixture assertions plus new direct `legacyOfficialIds` assertions.
- Published declarations are self-contained for `PokemonKey`; they no longer import `pokopia-data`.

### File List

- `package.json`
- `pnpm-lock.yaml`
- `packages/scene-core/package.json`
- `packages/scene-core/src/domain/assets/catalog.ts`
- `packages/scene-core/src/domain/assets/pokemon.ts`
- `packages/scene-core/src/domain/assets/catalog.test.ts`
- `scripts/fix-scene-core-declarations.mjs`
- `scripts/verify-scene-core-file-install.mjs`

### Change Log

- 2026-06-04: Completed Story 17.3 scene-core data-package migration, packaged type fix, and verification.
