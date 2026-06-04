# 数据 Single Source Of Truth

本文记录 Scene Editor 当前可维护的数据入口。后续修改 catalog、图片、尺寸、footprint、stacking、Pokemon 偏好或翻译时，先改对应维护入口，再运行对应验证命令。

## Active Cross-Project Boundary

2026-06-04 的 approved course correction 已新增 sibling project `../pokopia-data`，用于承载 Pokopia 基础 item/Pokemon 数据，并让 `pokopia-scene-editor` 和 `../pokopia-color-pattern` 共同消费。基础 item/Pokemon records、translations、preferences、color-pattern base data、asset manifests、schema validators 和 data generation scripts 的维护入口是 `../pokopia-data`，两个 consumer 不再把本地 generated source 当作基础数据扩展入口。

本仓库的 `packages/scene-core` 继续拥有 `SceneDocument v1`、codec/recovery、editor category mapping、footprint/stacking overrides、occupancy、selectors 和 export summary。首轮不把 footprint/stacking 迁入 `pokopia-data`，除非后续单独批准它们属于共享基础数据 contract。

`../pokopia-color-pattern` 继续拥有 recommendation ranking、recommended item overrides、routing、SSG、hydrate smoke 和 UI projection。`pokopia-data` 可提供 color-pattern base JSON，但不拥有推荐排序、页面路由或部署。

跨项目验证顺序应为：

```sh
# In ../pokopia-data
npm run release:verify

# In pokopia-scene-editor
pnpm --filter @pokopia-scene-editor/scene-core test
pnpm --filter @pokopia-scene-editor/scene-core build
pnpm --filter @pokopia-scene-editor/web build
pnpm run scene-core:file-install:smoke

# In ../pokopia-color-pattern
npm run validate:data
npm run verify:release
```

部署仍由各 consumer 项目独立执行。`pokopia-data` 是数据 package，不直接部署 Web。

## 维护入口

| 数据类别 | 当前权威来源 | 消费者 | 验证 |
| --- | --- | --- | --- |
| Base item records | `../pokopia-data` package export `itemsData` / `items.json` | `packages/scene-core/src/domain/assets/catalog.ts`、`../pokopia-color-pattern` generation | `npm run release:verify` in `../pokopia-data`; then scene/color gates above |
| Placeable item Chinese names | `../pokopia-data` package export `translationsData` / `translations.json` | `catalog.ts`、`getAssetDisplay` | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts` |
| Pokemon portrait catalog | `../pokopia-data` package export `pokemonData` / `pokemon.json` | `packages/scene-core/src/domain/assets/pokemon.ts`、Web theme/export preview | `pnpm run asset-references:smoke` |
| Pokemon and item preference terms | `../pokopia-data` package exports `preferencesData` and `color-pattern/preferences.json` | scene-core favorite-only, color-pattern recommendation generation | `npm run validate:data` in `../pokopia-color-pattern`; `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts` |
| Color-pattern compact/color/Pokemon base data | `../pokopia-data` exports under `color-pattern/*` | `../pokopia-color-pattern/scripts/generate-data.ts` | `npm run validate:data && npm run build` in `../pokopia-color-pattern` |
| Runtime asset manifests | `../pokopia-data` exports `asset-manifest.json` and `color-pattern/runtime-asset-sources.json` | scene editor asset reference guard, color-pattern runtime asset generation | `npm run release:verify`; `pnpm run asset-references:smoke`; `npm run build` in color-pattern |
| Xzonn pinned txt snapshot | `../pokopia-data` bootstrap/source boundary; this repo's `assets/pokopia_data_sources/xzonn/*` is historical until removed by a separate cleanup | data package generation | `npm run release:verify` in `../pokopia-data` |
| Habitat generalized matching source | `packages/scene-core/src/domain/assets/source-habitat-matching-items.ts`，由 Xzonn `item.txt` 的 `10001-10056` 生成；当前不进入 runtime catalog | 未来 habitat matcher | `pnpm run data:xzonn:check` |
| Catalog category/search/dyeable/favorite merge logic | `packages/scene-core/src/domain/assets/catalog.ts` | Web Asset Picker、scene selectors、export summary | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts` |
| Footprint metadata | `packages/scene-core/src/domain/assets/footprint-overrides.ts`，默认值在同文件；audit checklist 只作为参考 | scene-core occupancy、Web placement/canvas/export | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/footprint.test.ts src/domain/scene/occupancy.test.ts` |
| Stacking metadata | `packages/scene-core/src/domain/assets/stacking-overrides.ts`，默认值在同文件；audit checklist 只作为参考 | scene-core occupancy/stacking、Web placement/canvas/export | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/occupancy.test.ts src/domain/scene/export-summary.test.ts` |
| Scene dimensions | `packages/scene-core/src/domain/scene/area.ts` | SceneDocument factories/schema/recovery/codec、Web canvas/export/tests | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/area.test.ts` |
| Locale display labels | `packages/scene-core/src/locale.ts` | Web i18n wrapper and export summary | `pnpm --filter @pokopia-scene-editor/web test src/components/export-preview/ExportPreview.test.tsx` |
| Runtime images | `assets/pokopia_image_sources/**` | Vite dev middleware/build copy, asset thumbnails, Pokemon portraits, skill marker icons | `pnpm run asset-references:smoke` |

## Data Extension Checklist

新增或修改基础数据时，先在 `../pokopia-data` 调整 source/generator/package exports，再回到两个 consumer 跑验证。不要直接编辑本仓库的 old generated snapshots 来扩展基础 item/Pokemon 数据。

- 新增 item：保持 `slug` 稳定；如会进入 scene string，确认 `assetId`、`officialId`、`sceneCodecOfficialId` 和 `legacyOfficialIds` 语义不变。
- 新增 Pokemon：保持 Pokemon slug 稳定；确认 color-pattern route slug、scene editor Pokemon key、portrait asset reference 都能解析。
- 修改 translation：通过 `../pokopia-data/translations.json` 进入 scene-core；跑 catalog tests 确认中文名、搜索词和 thumbnail alt 未回退。
- 修改 preference：通过 `../pokopia-data/preferences.json` 或 `color-pattern/preferences.json` 进入 consumer；scene-core favorite-only 和 color-pattern recommendations 都要验证。
- 修改 color override 或 body/furniture size metadata：基础 metadata 可进入 `pokopia-data`，但 color-pattern recommendation overrides/ranking 仍留在 `../pokopia-color-pattern/data/overrides/pokemon-metadata.json` 和 domain code。
- 修改 asset reference：更新 data package manifest/export 后，跑 `pnpm run asset-references:smoke` 和 color-pattern `npm run build`。

Compatibility-sensitive changes must run:

```sh
cd ../pokopia-data && npm run release:verify
cd ../pokopia-scene-editor && pnpm --filter @pokopia-scene-editor/scene-core test && pnpm --filter @pokopia-scene-editor/scene-core exec vitest run src/io/scene-string-codec.test.ts --environment node
cd ../pokopia-color-pattern && npm run validate:data && npm run build
```

`AssetDefinition.officialId` is the user-facing display number and may come from Xzonn `编号`. `scene-string-codec.ts` must encode/decode with `sceneCodecOfficialId`, which preserves the old exported string numbering so past `PSE1`/`PSE2` strings remain importable.

## Reference-Only Artifacts

`docs/placeable-asset-footprint-audit-checklist.html` and `docs/placeable-asset-stacking-audit-checklist.html` are review/audit artifacts. They can explain why a footprint or stacking override exists, but runtime code and tests must not scrape them as business truth.

`assets/pokopia_image_sources/*.csv`, `*.json`, `*.md`, and `*/manifest.csv` are upstream/source-data snapshots. They are useful for audit and image mapping, but current runtime behavior flows through `pokopia-data` exports, scene-core merge rules, and `assets/pokopia_image_sources/**` image files.

`assets/pokopia_data_sources/xzonn/habitat.txt` and `source-habitat-matching-items.ts` are pinned for future habitat work. They must not add current Web UI, `SceneDocument` fields, or Asset Picker-visible rows. Xzonn `item.txt` rows `10001-10056` are habitat generalized matching source data only.

`apps/web/public/assets/asset-thumbnails/*.svg` is legacy UI static artwork, not the runtime catalog image source. Runtime catalog thumbnails must come from `assetCatalog[].thumbnailUrl` and the root `assets/pokopia_image_sources` tree.

## Runtime Asset Guard

Before deleting or moving any file under `assets/pokopia_image_sources`, run:

```sh
pnpm run asset-references:smoke
```

The smoke builds `scene-core` and Web, then verifies that every runtime image URL exported by `assetCatalog`, `pokemonThemeCatalog`, and skill marker helpers exists in both the source image tree and `apps/web/dist/assets/pokopia_image_sources`.

Do not use raw image counts alone as proof of safety. A referenced file can be deleted and replaced by an unrelated image while directory counts still match.
