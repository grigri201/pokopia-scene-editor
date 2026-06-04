# Story 17.4: pokopia-color-pattern 改为消费 pokopia-data

Status: done

## Story

As a color pattern maintainer, I want color pattern 的 compact item / Pokemon index 基础输入来自 `pokopia-data`, So that 推荐和静态页生成不再复制基础数据抓取/解析逻辑。

## Acceptance Criteria

1. color pattern scripts 从 `pokopia-data` 读取 item/Pokemon/color/asset manifest 基础数据。
2. `generated/data/compact-items.json`、`generated/data/pokemon-index.json`、`generated/data/item-colors.json` 的 public schema 尽量保持；必要字段变更需明确 schema version bump。
3. recommendation generation、route validation、SSG、dist validation 和 hydrate smoke 不回退。
4. Recommendation-specific overrides 和 ranking logic 仍留在 color pattern，不迁入基础 data package。

## Tasks / Subtasks

- [x] Add sibling `pokopia-data` dependency for `../pokopia-color-pattern`. (AC: 1)
  - [x] Use package ESM/JSON exports; do not import `pokopia-data/src`.
  - [x] Keep color-pattern project buildable without publishing the data package.
- [x] Update color-pattern generation inputs. (AC: 1, 2)
  - [x] Read compact items, Pokemon index, item colors, and runtime asset manifest base data from `pokopia-data` where the package already exports consumer-ready data.
  - [x] Keep recommendation generation output shape and route-visible data paths stable.
  - [x] Avoid moving recommendation ranking, override merge, routing, SSG, or UI projection into `pokopia-data`.
- [x] Preserve public schemas and release gates. (AC: 2, 3)
  - [x] Keep `compact-items.v4`, `pokemon-index.v2`, `item-colors.v1`, `recommendations.v4`, and `runtime-asset-manifest.v1` unless an explicit schema bump is justified.
  - [x] Verify generated outputs do not drift when switching source.
- [x] Run color-pattern verification. (AC: 3, 4)
  - [x] `npm run validate:data`
  - [x] `npm run validate:build`
  - [x] `npm run build`
  - [x] Run `npm run smoke:hydrate` if the local browser dependency state permits it.

## Dev Notes

- Work in sibling repo `/Users/grigri/side-project/pokopia/pokopia-color-pattern`.
- Current generation entry point is `scripts/generate-data.ts`.
- Current public outputs to preserve:
  - `generated/data/compact-items.json` with schema `compact-items.v4`
  - `generated/data/pokemon-index.json` with schema `pokemon-index.v2`
  - `generated/data/item-colors.json` with schema `item-colors.v1`
  - `generated/data/recommendations/{slug}.json` with schema `recommendations.v4`
  - `generated/assets/runtime/asset-manifest.json` with schema `runtime-asset-manifest.v1`
- Current recommendation-specific ownership stays in color-pattern:
  - `data/overrides/pokemon-metadata.json` recommended item append/replace overrides.
  - `src/domain/recommendation.ts` candidate filtering, preference matching, furniture-size compatibility, dyeable handling, OKLCH harmony filtering, and ranking.
  - `src/domain/recommendation-data.ts` recommendation dataset, override merge, pagination, diagnostics, and fallback generation.
- This story may use `pokopia-data` consumer-ready color-pattern JSON exports as bootstrap. Do not rewrite the full recommendation generator unless required by verification.

### References

- [Source: `_bmad-output/planning-artifacts/epics.md` Epic 17 Story 17.4]
- [Source: `_bmad-output/planning-artifacts/architecture.md` Approved Course Correction - 2026-06-04]
- [Source: `/Users/grigri/side-project/pokopia/pokopia-color-pattern/package.json` scripts]
- [Source: `/Users/grigri/side-project/pokopia/pokopia-color-pattern/scripts/generate-data.ts` data generation]

## Dev Agent Record

### Debug Log

- 2026-06-04: Added `pokopia-data` as a sibling file dependency for `../pokopia-color-pattern`.
- 2026-06-04: Rewired `scripts/generate-data.ts` to read compact items, item colors, Pokemon index, preferences, runtime asset sources, and runtime asset manifest from `pokopia-data` package exports.
- 2026-06-04: Kept recommendation overrides, recommendation ranking, route validation, SSG, and UI projection in color-pattern.
- 2026-06-04: `npm run build:data-script` passed.
- 2026-06-04: `npm run validate:data` passed.
- 2026-06-04: `npm run generate:data` passed with no generated output drift requiring commit.
- 2026-06-04: `npm run validate:build` passed.
- 2026-06-04: `npm run build` passed.
- 2026-06-04: Code review found hydrate smoke evidence was missing; updated the no-JS static page smoke assertion to the current English SSG contract and ran `npm run verify:release` successfully.

### Completion Notes

- `pokopia-color-pattern` now consumes base data from `pokopia-data` while retaining recommendation-specific ownership locally.
- Public schema versions stayed unchanged: `compact-items.v4`, `pokemon-index.v2`, `item-colors.v1`, `recommendations.v4`, and `runtime-asset-manifest.v1`.
- Added a README entry documenting `pokopia-data` as the base-data source and color-pattern as the recommendation/routing owner.
- `npm run verify:release` passed, including build, SSG/dist validation, and 10 hydrate smoke tests.

### File List

- `../pokopia-color-pattern/README.md`
- `../pokopia-color-pattern/package.json`
- `../pokopia-color-pattern/package-lock.json`
- `../pokopia-color-pattern/pnpm-lock.yaml`
- `../pokopia-color-pattern/scripts/generate-data.ts`
- `../pokopia-color-pattern/tests/smoke/pokemon-page.spec.ts`

### Change Log

- 2026-06-04: Completed Story 17.4 color-pattern data-package migration, hydrate smoke fix, and verification.
