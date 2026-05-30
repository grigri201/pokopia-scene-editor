# 数据 Single Source Of Truth

本文记录 Scene Editor 当前可维护的数据入口。后续修改 catalog、图片、尺寸、footprint、stacking、Pokemon 偏好或翻译时，先改对应维护入口，再运行对应验证命令。

## 维护入口

| 数据类别 | 当前权威来源 | 消费者 | 验证 |
| --- | --- | --- | --- |
| Placeable item catalog snapshot | `packages/scene-core/src/domain/assets/source-placeable-items.ts`，内容来自 `assets/pokopia_image_sources/pokopiadex_placeable_items.json` 的 committed TS snapshot | `packages/scene-core/src/domain/assets/catalog.ts` | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts` |
| Placeable item Chinese names | `packages/scene-core/src/domain/assets/source-placeable-item-translations.ts`，内容来自 `assets/pokopia_image_sources/infipoke_items_zh_hans.csv`、`decorative_item_images.csv` 和本仓库 fallback 的 committed TS snapshot | `catalog.ts`、`getAssetDisplay` | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts` |
| Pokemon portrait catalog | `packages/scene-core/src/domain/assets/source-pokemon-portraits.ts` | `packages/scene-core/src/domain/assets/pokemon.ts`、Web theme/export preview | `pnpm run asset-references:smoke` |
| Pokemon preference terms | `packages/scene-core/src/domain/assets/source-pokemon-preferences.ts` | `catalog.ts` 的 favorite 计算、Asset Picker favorite-only | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts` |
| Catalog category/search/dyeable/favorite merge logic | `packages/scene-core/src/domain/assets/catalog.ts` | Web Asset Picker、scene selectors、export summary | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts` |
| Footprint metadata | `packages/scene-core/src/domain/assets/footprint-overrides.ts`，默认值在同文件；audit checklist 只作为参考 | scene-core occupancy、Web placement/canvas/export | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/footprint.test.ts src/domain/scene/occupancy.test.ts` |
| Stacking metadata | `packages/scene-core/src/domain/assets/stacking-overrides.ts`，默认值在同文件；audit checklist 只作为参考 | scene-core occupancy/stacking、Web placement/canvas/export | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/occupancy.test.ts src/domain/scene/export-summary.test.ts` |
| Scene dimensions | `packages/scene-core/src/domain/scene/area.ts` | SceneDocument factories/schema/recovery/codec、Web canvas/export/tests | `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/scene/area.test.ts` |
| Locale display labels | `packages/scene-core/src/locale.ts` | Web i18n wrapper and export summary | `pnpm --filter @pokopia-scene-editor/web test src/components/export-preview/ExportPreview.test.tsx` |
| Runtime images | `assets/pokopia_image_sources/**` | Vite dev middleware/build copy, asset thumbnails, Pokemon portraits, skill marker icons | `pnpm run asset-references:smoke` |

## Generated Snapshot Policy

The `source-*.ts` files are committed TypeScript source snapshots. They include comments that describe upstream inputs, but this repository currently does not track a generator script that can safely recreate them. Until such a script is added, maintain them as audited source snapshots and do not call them disposable build output.

If a future story adds a generator, it must:

- read a documented input under this repository or a pinned external artifact;
- regenerate all affected `source-*.ts` files deterministically;
- include a guard command that fails when committed snapshots are stale;
- preserve the public `scene-core` exports used by Web and downstream file-install consumers.

## Reference-Only Artifacts

`docs/placeable-asset-footprint-audit-checklist.html` and `docs/placeable-asset-stacking-audit-checklist.html` are review/audit artifacts. They can explain why a footprint or stacking override exists, but runtime code and tests must not scrape them as business truth.

`assets/pokopia_image_sources/*.csv`, `*.json`, `*.md`, and `*/manifest.csv` are upstream/source-data snapshots. They are useful for audit and future regeneration, but current runtime behavior flows through `scene-core` source snapshots and `assets/pokopia_image_sources/**` image files.

`apps/web/public/assets/asset-thumbnails/*.svg` is legacy UI static artwork, not the runtime catalog image source. Runtime catalog thumbnails must come from `assetCatalog[].thumbnailUrl` and the root `assets/pokopia_image_sources` tree.

## Runtime Asset Guard

Before deleting or moving any file under `assets/pokopia_image_sources`, run:

```sh
pnpm run asset-references:smoke
```

The smoke builds `scene-core` and Web, then verifies that every runtime image URL exported by `assetCatalog`, `pokemonThemeCatalog`, and skill marker helpers exists in both the source image tree and `apps/web/dist/assets/pokopia_image_sources`.

Do not use raw image counts alone as proof of safety. A referenced file can be deleted and replaced by an unrelated image while directory counts still match.
