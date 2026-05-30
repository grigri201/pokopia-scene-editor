# Story 13.7: Xzonn 数据重新基线与生成器

Status: done

<!-- Note: Created from approved Sprint Change Proposal `sprint-change-proposal-2026-05-30-xzonn-data-cleanup.md`. -->

## Story

As a 维护者,
I want 使用 Xzonn/PokemonPokopiaDatabase 的 `data/*.txt` 重新基线本地 catalog、translation、Pokemon preference，并 pinned habitat 数据,
so that 素材名称、编号、分类、标签、喜好筛选、未来 habitat 功能和后续数据维护有可复现的权威输入。

## Acceptance Criteria

1. 将 Xzonn `data/item.txt`、`data/pokemon.txt` 和 `data/habitat.txt` 作为 pinned upstream snapshot 或 generator 输入记录在仓库中，并记录 upstream commit。
2. 生成器可复现输出受影响的 `source-*.ts`，并提供 stale check。
3. 可唯一匹配到 Xzonn 的条目，其中文名、Pokemon 喜好、item 喜好类别和素材筛选 category 必须使用 Xzonn txt 数据；`AssetDefinition.category` 可保留内部枚举，但必须由 Xzonn `分类` 字段映射生成。
4. `assetId` 保持稳定；如果 UI `officialId` 改用 Xzonn 编号，旧 PokopiaDex id 必须仍可用于短字符串 decode。
5. `data/item.txt` 的 `10001-10056` 泛化匹配项必须进入 source/habitat matching input，但不得进入当前 `assetCatalog`、Asset Picker、导出素材清单或普通素材搜索结果。
6. Pokemon 特殊 form 必须有显式 Xzonn row mapping；`peakychu` 对应 Xzonn `皮卡丘`/`浅色`，但 Web 显示名使用“浅浅丘”。
7. `habitat.txt` 当前只做 pinned snapshot、schema/checksum 校验和未来 generator 输入，不新增 Web UI、SceneDocument 字段或 runtime catalog 消费。
8. 保留无法安全匹配的本地条目，并在审计报告中列出待人工确认项，不静默删除；非 Interior/wallpaper 的本地新条目或命名差异以本地数据为准，Xzonn fuzzy match 只作为审计线索。
9. Web 素材列表、缩略图、导出预览、scene-string roundtrip、asset reference smoke 和 core/web tests 通过。
10. 新增或保留 legacy exported string fixtures，覆盖过去导出的 `PSE1` 和 `PSE2` 字符串；数据清理后这些 fixture 必须 decode 成相同的 `assetId`、Pokemon、坐标、楼层、技能和尺寸语义。

## Tasks / Subtasks

- [x] 固化 Xzonn source snapshot (AC: 1, 5, 7)
  - [x] 将 `data/item.txt`、`data/pokemon.txt`、`data/habitat.txt` 复制到 repo-local source snapshot 目录。
  - [x] 记录 upstream commit、同步日期、字段语义和 `10001-10056` 的 habitat-only 约束。
  - [x] 对 `habitat.txt` 做 schema/checksum 校验，但不新增 runtime Web 消费。
- [x] 实现生成器和审计报告 (AC: 2, 3, 5, 8)
  - [x] 解析 Xzonn TSV，生成或检查受影响的 source snapshot。
  - [x] 对 exact/confirmed match 使用 Xzonn 名称、编号、分类、标签和喜好。
  - [x] 对无法唯一匹配的本地条目保留本地数据，并输出 fallback audit。
  - [x] 确保 `10001-10056` 不进入普通 `assetCatalog`。
- [x] 保持 scene-string 兼容 (AC: 4, 10)
  - [x] 如果显示编号切到 Xzonn，生成旧编号到稳定 `assetId` 的 decode alias。
  - [x] 在 `scene-string-codec.test.ts` 加入或保留真实旧导出字符串 fixture。
  - [x] 验证旧 `PSE1`/`PSE2` 字符串 decode 语义不变。
- [x] 清理 Pokemon 特殊形态 (AC: 6)
  - [x] 显式 pin 本地特殊 form 与 Xzonn 行的映射。
  - [x] 保持 `peakychu` Web 显示名为“浅浅丘”。
- [x] 验证 (AC: 2, 9, 10)
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core test src/domain/assets/catalog.test.ts src/domain/assets/pokemon.test.ts src/io/scene-string-codec.test.ts`
  - [x] `pnpm --filter @pokopia-scene-editor/web test src/components/asset-picker/AssetPicker.test.tsx src/components/export-preview/ExportPreview.test.tsx`
  - [x] `pnpm run asset-references:smoke` equivalent covered by `pnpm run build` and `pnpm run asset-references:verify`.
  - [x] `pnpm run release:verify` if generated diff is large.
  - [x] `git diff --check`

### Review Findings

- [x] [Review][Patch] Add Xzonn stale check to `release:verify`.
- [x] [Review][Patch] Hard-isolate habitat-only item rows from ordinary item matching and assert no generated placeable item uses source number `10001-10056`.
- [x] [Review][Patch] Validate Xzonn TSV headers, row widths, required numeric fields, duplicate item/habitat numbers, duplicate Pokemon form rows, and exact habitat generalized row set.
- [x] [Review][Patch] Fail fast on unknown Xzonn/local category values instead of silently mapping to `misc`.
- [x] [Review][Patch] Pin explicit Pokemon row labels and assert `peakychu` remains the local display exception “浅浅丘”.
- [x] [Review][Patch] Index all scene codec id aliases and keep `AssetDefinition` codec metadata optional for downstream TypeScript consumers.
- [x] [Review][Patch] Add a static legacy `PSE2` fixture using pre-Xzonn asset numbers, Pokemon, coordinates, levels, rotation, skill, and default dimensions.
- [x] [Review][Defer] Keep human-assigned fallback display numbers `9001-9013` for local-first items whose legacy ids conflict with Xzonn display ids; this is documented in the audit report.
- [x] [Review][Defer] Keep legacy scene codec ids out of ordinary numeric search to avoid ambiguous results where an old id is now another Xzonn display number.

## Dev Notes

### Current State

- 本地 placeable source snapshot 当前由 `source-placeable-items.ts`、`source-placeable-item-translations.ts` 和 `catalog.ts` 合并。`officialId` 来自旧 `sourceItem.id`，并被 `scene-string-codec.ts` 编码到短字符串中。
- Xzonn `data/item.txt` 有 1251 条，`10001-10056` 是 habitat 泛化匹配项，不是当前素材列表条目。
- Xzonn `data/habitat.txt` 当前只作为未来 habitat 功能 input；本 story 不新增 Web UI、SceneDocument 字段或 runtime catalog。
- 108 条本地 item 无法按英文名直接匹配 Xzonn。非 Interior/wallpaper 本地新条目或命名差异以本地为主；Interior/wallpaper 是系统性命名差异，需要单独映射。
- Pokemon 特殊 form 需要显式映射；`peakychu` 对应 Xzonn `皮卡丘` + `浅色`，但本地显示名是“浅浅丘”。

### Implementation Guardrails

- 不删除无法唯一匹配的本地条目。
- 不让 `10001-10056` 出现在 Asset Picker、导出素材清单或普通素材搜索中。
- 不改变 `SceneDocument v1` shape。
- 旧导出短字符串是受支持输入；如果 display number 变更，decode 必须接受旧编号 alias。
- `assetId` 是稳定内部 ID，不因为 Xzonn 编号或翻译变化而重命名。
- 对 Xzonn 没有唯一可信对应的本地新条目，优先保持本地名称、分类、编号和图片映射。

### References

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-30-xzonn-data-cleanup.md`
- `_bmad-output/planning-artifacts/epics.md`
- `docs/data-source-of-truth.md`
- `packages/scene-core/src/domain/assets/catalog.ts`
- `packages/scene-core/src/io/scene-string-codec.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-30T15:42:46+0800 - User approved Sprint Change Proposal with `A`; created Story 13.7 and moved tracker to `in-progress`.
- 2026-05-30T16:13:02+0800 - Generated Xzonn-backed source snapshots and audit report; `pnpm run release:verify` passed.
- 2026-05-30T16:38:01+0800 - Multi-agent review findings addressed; `pnpm run release:verify` passed with `data:xzonn:check` in the release gate.

### Completion Notes List

- Vendored Xzonn snapshot at upstream commit `579689ce05e6239b732141d5adee3b98922f602c` with `item.txt`, `pokemon.txt`, and `habitat.txt` checksums recorded.
- Added `data:xzonn:sync` / `data:xzonn:check` generator flow, including `source-habitat-matching-items.ts` for rows `10001-10056`.
- Rebuilt item names, display official numbers, Xzonn categories/tags, Pokemon preferences, and item preference terms from Xzonn where matched.
- Kept 26 local fallback items local-first and documented them in `_bmad-output/implementation-artifacts/xzonn-data-audit.md`.
- Confirmed no unmatched Pokemon; pinned 18 explicit special/duplicate-form mappings, including `peakychu` -> Xzonn `皮卡丘` / `浅色` with local display name “浅浅丘”.
- Preserved old short-string compatibility by separating display `officialId` from stable `sceneCodecOfficialId` and adding codec regression coverage.
- Addressed code-review hardening: release stale guard, TSV/schema validation, habitat-only isolation, exact reserved-range validation, explicit Pokemon row drift guards, optional public codec metadata, full codec alias indexing, and legacy `PSE2` fixture coverage.

### File List

- `.gitattributes`
- `_bmad-output/implementation-artifacts/13-7-xzonn-data-baseline-and-generator.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/xzonn-data-audit.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-30-xzonn-data-cleanup.md`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
- `apps/web/src/components/selection-inspector/SelectionInspector.test.tsx`
- `apps/web/src/state/asset-placement.test.ts`
- `assets/pokopia_data_sources/xzonn/README.md`
- `assets/pokopia_data_sources/xzonn/habitat.txt`
- `assets/pokopia_data_sources/xzonn/item.txt`
- `assets/pokopia_data_sources/xzonn/pokemon.txt`
- `docs/data-source-of-truth.md`
- `package.json`
- `packages/scene-core/src/domain/assets/catalog.ts`
- `packages/scene-core/src/domain/assets/catalog.test.ts`
- `packages/scene-core/src/domain/assets/filters.test.ts`
- `packages/scene-core/src/domain/assets/pokemon.test.ts`
- `packages/scene-core/src/domain/assets/source-habitat-matching-items.ts`
- `packages/scene-core/src/domain/assets/source-placeable-item-translations.ts`
- `packages/scene-core/src/domain/assets/source-placeable-items.ts`
- `packages/scene-core/src/domain/assets/source-pokemon-portraits.ts`
- `packages/scene-core/src/domain/assets/source-pokemon-preferences.ts`
- `packages/scene-core/src/domain/scene/export-summary.test.ts`
- `packages/scene-core/src/io/scene-string-codec.ts`
- `packages/scene-core/src/io/scene-string-codec.test.ts`
- `scripts/sync-xzonn-data.mjs`

### Change Log

- 2026-05-30: Created Story 13.7 from approved course correction.
- 2026-05-30: Implemented Xzonn data generator, generated snapshots, audit report, compatibility codec mapping, Pokemon special-form mapping, and regression updates.
- 2026-05-30: Addressed multi-agent code review findings and marked Story 13.7 done.
