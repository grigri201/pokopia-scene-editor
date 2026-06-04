# Story 17.2: 创建 pokopia-data 项目与基础 Contract

Status: done

## Story

As a data consumer developer, I want 一个可安装的 `pokopia-data` package, So that scene editor 和 color pattern 可以读取同一份 Pokopia 基础数据。

## Acceptance Criteria

- 在 sibling directory 创建 `../pokopia-data`，包含 package manifest、TypeScript config、schema/types、generation scripts、fixtures/tests。
- 导入当前两项目的基础源数据，生成 normalized item/Pokemon/color/asset manifest outputs。
- Data package 提供 ESM exports 和 JSON exports；外部 consumer 不需要编译 data project 源码。
- Validation 覆盖 item count、Pokemon count、slug uniqueness、id uniqueness、asset reference existence、schema version、size budget。
- 不引入 scene editor UI、React、SceneDocument、recommendation ranking 或 color pattern routing 依赖。

## Tasks / Subtasks

- [x] Create `../pokopia-data` package contract and exports.
- [x] Generate normalized item, Pokemon, translation, preference, color-pattern, and asset manifest outputs.
- [x] Add validation and package contract tests.
- [x] Run `pokopia-data` release verification.

## Dev Notes

- Source of truth: `_bmad-output/planning-artifacts/epics.md` Epic 17 and `docs/data-source-of-truth.md`.
- Preserve `SceneDocument v1`; this story must not import editor UI, React, codec, or placement rules into data.
- Initial package may consume the existing two sibling generated snapshots to bootstrap contract, then consumers migrate in 17.3 and 17.4.

## Dev Agent Record

### Debug Log

- 2026-06-04: `npm run release:verify` initially failed because generated TS snapshots are JS literals, not strict JSON; changed `scripts/build.mjs` to parse local generated literals.
- 2026-06-04: `npm run release:verify` initially failed on `dist/index.js` write ordering; ensured `dist/` exists before writing the ESM index.
- 2026-06-04: Validation exposed correct source contract: scene-editor source item records are 1220, color-pattern compact items are 1219, and Pokemon `pokedexNumber` is not unique because forms can share a number.
- 2026-06-04: Code review found the first build still depended on consumer snapshots; moved canonical package inputs into `../pokopia-data/source/**` and changed `scripts/build.mjs` to build only from package-owned source.
- 2026-06-04: Extended validation to cover color-pattern preferences, runtime asset sources, runtime asset manifest, base asset manifest summary/length, and runtime source/manifest path set parity.
- 2026-06-04: Generated `PokopiaPokemonKey` as a finite union and added structured color-pattern export types.
- 2026-06-04: `npm run release:verify` passed in `../pokopia-data`.

### Completion Notes

- Created a file-installable `pokopia-data` ESM/JSON package with normalized base item, Pokemon, translation, preference, color-pattern, and asset manifest outputs under `dist/`.
- Package-owned canonical input snapshots live under `source/`; build no longer reads consumer generated outputs.
- Added schema constants/types, self-contained generated declarations, validation, and package contract tests.
- Kept editor UI, React, SceneDocument, recommendation ranking, and color-pattern routing out of the data package.

### File List

- `../pokopia-data/README.md`
- `../pokopia-data/package.json`
- `../pokopia-data/tsconfig.json`
- `../pokopia-data/source/base/items.json`
- `../pokopia-data/source/base/pokemon.json`
- `../pokopia-data/source/base/translations.json`
- `../pokopia-data/source/base/preferences.json`
- `../pokopia-data/source/base/asset-manifest.json`
- `../pokopia-data/source/color-pattern/compact-items.json`
- `../pokopia-data/source/color-pattern/item-colors.json`
- `../pokopia-data/source/color-pattern/pokemon-index.json`
- `../pokopia-data/source/color-pattern/preferences.json`
- `../pokopia-data/source/color-pattern/runtime-asset-sources.json`
- `../pokopia-data/source/color-pattern/runtime-asset-manifest.json`
- `../pokopia-data/src/schema.ts`
- `../pokopia-data/scripts/build.mjs`
- `../pokopia-data/scripts/validate.mjs`
- `../pokopia-data/scripts/write-types.mjs`
- `../pokopia-data/test/package-contract.test.mjs`
- `../pokopia-data/dist/index.js`
- `../pokopia-data/dist/index.d.ts`
- `../pokopia-data/dist/data/items.json`
- `../pokopia-data/dist/data/pokemon.json`
- `../pokopia-data/dist/data/translations.json`
- `../pokopia-data/dist/data/preferences.json`
- `../pokopia-data/dist/data/asset-manifest.json`
- `../pokopia-data/dist/data/color-pattern/compact-items.json`
- `../pokopia-data/dist/data/color-pattern/item-colors.json`
- `../pokopia-data/dist/data/color-pattern/pokemon-index.json`
- `../pokopia-data/dist/data/color-pattern/preferences.json`
- `../pokopia-data/dist/data/color-pattern/runtime-asset-sources.json`
- `../pokopia-data/dist/data/color-pattern/runtime-asset-manifest.json`

### Change Log

- 2026-06-04: Completed Story 17.2 package bootstrap and release verification.
