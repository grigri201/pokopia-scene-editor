# Sprint Change Proposal - Xzonn 数据重新基线

**项目:** pokopia-scene-editor
**日期:** 2026-05-30
**提出人:** Grigri
**模式:** Batch
**状态:** Approved - implementation in progress

**批准:** Grigri 于 2026-05-30 回复 `A` 批准本 Sprint Change Proposal，进入 Story 13.7 实施。

## 1. Issue Summary

当前系统依赖的素材与 Pokemon 数据主要来自本仓库内的 committed TypeScript snapshots：

- `packages/scene-core/src/domain/assets/source-placeable-items.ts`
- `packages/scene-core/src/domain/assets/source-placeable-item-translations.ts`
- `packages/scene-core/src/domain/assets/source-pokemon-preferences.ts`
- `packages/scene-core/src/domain/assets/source-pokemon-portraits.ts`

这些 snapshot 的上游来源混杂：PokopiaDex、Infipoke、本仓库 fallback、历史手工修正和 audit overrides。用户指出当前数据可能存在重复、翻译不准确、编号错误和错漏，需要以 `Xzonn/PokemonPokopiaDatabase` 为基准重新清理本地数据。

已确认 Xzonn 仓库的主要数据位于 `data/*.txt`，其中本次最相关的是：

- `data/item.txt`：物品编号、hash、中文名、日文名、英文名、图标、分类、标签、获得方式、交易价值、喜欢的类别。
- `data/pokemon.txt`：Pokemon 编号、形态编号、中文名、形态名、英文名、特长、环境、喜欢的东西等。
- `data/habitat.txt`：栖息地编号、中文名、日文名、英文名、图鉴说明、所需素材详情和关联 Pokemon。当前 Web/core 不直接消费，但应随本次数据源一起 pinned，避免未来 habitat 功能再引入第二套来源。

本次审计使用的上游快照为 `Xzonn/PokemonPokopiaDatabase` default branch clone，commit `579689ce05e6239b732141d5adee3b98922f602c`，提交日期 `2026-04-21`。

## 2. Evidence

初步差异审计结果：

- 本地 `source-placeable-items.ts` 有 1219 条 source item，过滤 kit 后当前 `assetCatalog` 测试期望为 1160 条。
- Xzonn `data/item.txt` 有 1251 条 item，其中 `编号 < 10000` 且有 icon 的普通条目为 1195 条；`10001-10056` 是用于 habitat 判定的泛化匹配数据，例如“草（任意）”“大树（任意）”，应纳入 source snapshot 和未来 habitat matcher，但不得显示在当前“素材”列表中。
- Xzonn `data/item.txt` 的 `分类` 字段包含 `食物`、`材料`、`自然`、`建筑`、`家具`、`实用`、`室外`、`方块`、`杂货`、`其他`、`套组`、`重要物品` 等取值；现有素材筛选 category 应改为使用该字段作为权威分类来源。
- Xzonn `data/habitat.txt` 有 213 条 habitat 数据行，当前本仓库未使用；它应作为 reference/generator input 纳入数据包，但本次不新增 habitat runtime API 或 Web UI。
- 用英文名归一化匹配，本地 1219 条中有 1111 条能匹配到 Xzonn item；匹配项里发现 809 条中文名差异。
- 本地 source item 当前没有重复 `id` 或重复 `slug`，但跨来源存在同一概念的编号/英文/中文不一致风险。
- 108 条本地 item 无法按英文名直接匹配 Xzonn，其中包含两类典型情况：
  - 本地较新的 PokopiaDex/Infipoke 条目，例如 `Cotton spores`、`Dandy flowers`、`Camping chair`。
  - Xzonn 使用 `(wallpaper)`，本地使用 `(interior)` 的室内墙纸类命名差异。
- 对非 Interior/wallpaper 的本地新条目或命名差异，用户确认可以“本地为主”：若 Xzonn 没有唯一可信对应行，应保留本地名称、分类、编号和图片映射，只在审计报告中记录可能的 Xzonn 线索。
- Xzonn 中至少 84 条普通 icon item 未按英文名匹配到本地，主要是 wallpaper/music/特殊条目命名差异。
- 本地 Pokemon portrait snapshot 有 311 条，Xzonn `data/pokemon.txt` 有 312 条；形态和特殊角色需要显式映射，例如 `Peakychu`、`Mosslax`、`DJ Rotom`、`Chef Dente`、东西海形态等。其中 `peakychu` 的本地中文显示名按产品命名为“浅浅丘”，对应 Xzonn 行仍是 `皮卡丘` + `浅色`。
- 当前 `AssetDefinition.officialId` 被短字符串 codec 用于 encode/decode。若直接把它从 PokopiaDex id 切到 Xzonn `编号`，会影响旧短字符串恢复，必须设计兼容 alias 或保留 legacy id。
- 用户补充要求：本次数据清理后必须兼容过去已经导出的 `PSE1`/`PSE2` 短字符串；旧字符串中的素材编号、Pokemon key、楼层/坐标/技能信息必须继续能导入，不能因为改名、换编号或重排 catalog 而失效。

## 3. Impact Analysis

### Epic Impact

当前 active Epic 13 的 Story 13.4 已完成“数据 single source of truth 文档和 runtime asset smoke”。本次变更不是回滚 Story 13.4，而是在其基础上新增一次数据重新基线。

建议新增 Story 13.7：**Xzonn 数据重新基线与生成器**。

影响范围：

- FR113：继续强化 catalog、translation、Pokemon preference 的 single source of truth。
- FR114：测试仍必须从 `scene-core` 读取业务事实，不复制第二套真相。
- NFR53：不得回退 Web 编辑、保存/恢复、footprint、stacking、导出预览和图片下载。
- NFR54：不改变 `SceneDocument v1` shape。
- NFR57：素材缩略图和 runtime image references 仍需 smoke 验证。

### PRD Impact

PRD 需要增加一段 approved course correction，说明：

- Xzonn `data/item.txt` / `data/pokemon.txt` 成为本仓库数据清理的主要权威输入；但对 Xzonn 缺失或无法唯一确认的本地条目，以本地现有数据为权威 fallback。
- Xzonn `data/habitat.txt` 随同 pinned，作为未来 habitat/生态位功能的预备权威输入；当前不改变产品范围。
- 本次清理不改变 SceneDocument v1。
- 如调整 asset display number / official number，必须保持旧短字符串 decode 兼容；过去导出的 `PSE1`/`PSE2` 字符串是受支持输入，不得要求用户重新导出。

### Architecture Impact

Architecture 和 `docs/data-source-of-truth.md` 需要更新：

- 增加 pinned external source / vendored txt snapshot 的说明。
- 明确 generator 负责从 Xzonn txt 生成当前需要的 `source-*.ts`，并对暂未消费的 `habitat.txt` 保留 schema/checksum 校验。
- 明确 runtime 不联网、不读取外部仓库；build/test 使用 committed generated snapshot。
- 明确 `assetId` slug 是内部稳定持久 ID，不因上游编号变化直接重命名。

### UX Impact

用户可见变化主要是数据质量：

- 素材中文名、Pokemon 名称、分类、标签、喜好筛选结果会更新。
- Asset Picker 的 category 筛选应反映 Xzonn `分类`，而不是 PokopiaDex `menuCategory` 推断结果；显示文案可以继续本地化，但筛选事实必须来自 Xzonn。
- 如果采用 Xzonn `编号` 作为 UI 的 `No.`，素材详情、搜索编号和导出素材清单会变化。
- 素材缩略图、footprint、stacking、层备注、导出布局不应变化。

### Technical Impact

需要实现或更新：

- 新增 repo-local generator，例如 `scripts/sync-xzonn-data.mjs`。
- 新增 committed upstream snapshot，例如 `assets/pokopia_data_sources/xzonn/item.txt`、`pokemon.txt`、`habitat.txt` 和 source metadata。
- 重新生成：
  - `source-placeable-item-translations.ts`
  - `source-pokemon-preferences.ts`
  - 必要时 `source-pokemon-portraits.ts`
  - 必要时 `source-placeable-items.ts`
- `AssetDefinition.category` 和素材筛选必须从 Xzonn `data/item.txt` 的 `分类` 派生。可保留内部 enum/slug 作为 UI 与 TypeScript 稳定层，但其映射必须由 Xzonn 分类驱动，并对未知分类 fail fast 或进入审计报告。
- 保留 `data/item.txt` 中 `10001-10056` 泛化匹配项作为 source/habitat matching input，但当前 `assetCatalog` 必须继续过滤它们，避免出现在 Asset Picker、导出素材清单或普通素材搜索结果中。
- 处理 Xzonn `编号` 与当前 `officialId` 的兼容关系。
- 保持旧导出字符串兼容：短字符串 codec 的 decode 逻辑必须能识别历史 `officialId`，并将其映射回稳定 `assetId`；Pokemon key、skill type、rotation、level 和 coordinate 的编码顺序不得因数据重基线而破坏。
- 更新 `catalog.test.ts`、`filters.test.ts`、Asset Picker/Export Preview focused tests 的期望。
- 运行 asset reference smoke，证明图片引用未断。

## 4. Recommended Approach

选择 **Option 1: Direct Adjustment**。

理由：

- 本次问题是数据来源和生成链漂移，不需要回滚已完成 Web/core 功能。
- 当前 Epic 13 正在收敛数据 ownership，新增一个 data baseline story 比修改已完成 Story 13.4 更清晰。
- 不需要 `SceneDocument v2`；资产名称、分类、喜好和编号显示属于 catalog metadata。
- 最大风险是 `officialId` 被短字符串 codec 使用，因此实施时必须把编号显示和 legacy decode 兼容作为第一等约束。

不建议 rollback：现有 Story 13.4 的 SSoT 文档和 asset smoke 是本次清理的基础。
不建议 MVP review：产品阶段已经是 Polish，本次不改变用户流程或核心功能范围。

## 5. Detailed Change Proposals

### Proposal A - Add Story 13.7

**Artifact:** `_bmad-output/planning-artifacts/epics.md`

**OLD:**

Epic 13 当前结束于 Story 13.6。

**NEW:**

新增：

```md
### Story 13.7: Xzonn 数据重新基线与生成器

As a 维护者,
I want 使用 Xzonn/PokemonPokopiaDatabase 的 data/*.txt 重新基线本地 catalog、translation、Pokemon preference，并 pinned habitat 数据,
So that 素材名称、编号、分类、标签、喜好筛选、未来 habitat 功能和后续数据维护有可复现的权威输入。

Acceptance Criteria:
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
```

### Proposal B - Update Data SSoT

**Artifact:** `docs/data-source-of-truth.md`

**OLD:**

`source-*.ts` 是 committed TS source snapshots；当前没有 repo-local generator。

**NEW:**

`source-*.ts` 由 repo-local generator 从 pinned Xzonn txt snapshot、runtime image manifests 和本仓库 audited overrides 生成。Xzonn `data/item.txt` / `data/pokemon.txt` 是名称、编号、分类、标签和喜好数据的主要权威输入；`data/habitat.txt` 作为未来 habitat 功能的 pinned reference/generator input，当前不进入 runtime catalog。PokopiaDex/Infipoke 和当前本地 snapshot 在 Xzonn 缺字段、缺条目、无法唯一匹配或图片映射缺失时作为权威 fallback。

### Proposal C - Preserve Codec Compatibility

**Artifact:** `packages/scene-core/src/domain/assets/catalog.ts` and `packages/scene-core/src/io/scene-string-codec.ts`

**OLD:**

`officialId = sourceItem.id.toString().padStart(3, '0')`，短字符串 encode/decode 只认这个 id。

**NEW:**

实施时二选一：

1. 保守路径：`officialId` 暂时继续保持旧 PokopiaDex id；新增内部 `sourceNumber`/metadata 只用于审计和未来 UI 变更。该路径天然保留大部分旧字符串素材编号兼容，但仍需保留 legacy fixture 防止 key/order 变化。
2. 推荐路径：UI/display 的 `officialId` 改用 Xzonn `编号`，同时保留 `legacyOfficialIds` 或 generated alias map，让旧短字符串仍可 decode 到同一 `assetId`。

推荐路径更符合“编号清理”，但需要覆盖 scene-string codec 回归测试。无论选择哪条路径，都不得改变已导出字符串的格式语义；如未来需要新编码格式，应新增 prefix/version，而不是破坏旧 prefix decode。

### Proposal D - Add Generator And Guard

**Artifacts:**

- `scripts/sync-xzonn-data.mjs`
- `assets/pokopia_data_sources/xzonn/item.txt`
- `assets/pokopia_data_sources/xzonn/pokemon.txt`
- `assets/pokopia_data_sources/xzonn/habitat.txt`
- `assets/pokopia_data_sources/xzonn/README.md`

**Behavior:**

- 解析 TSV，不依赖运行时网络。
- 根据稳定规则合并 Xzonn item、现有 image manifests、现有 footprint/stacking overrides。
- 对 exact/confirmed match 使用 Xzonn 名称、编号、分类、标签和喜好；对非 Interior/wallpaper 且 Xzonn 无唯一可信对应行的本地条目，保留本地数据并输出 fallback audit。
- 将 Xzonn `data/item.txt` 的 `分类` 映射为当前 Asset Picker 使用的 category；不要再从 PokopiaDex `menuCategory` 推断筛选分类。
- 将 `10001-10056` 这类 habitat 泛化匹配项输出到 future habitat source/matcher 输入，而不是普通 placeable asset source。
- 生成旧编号到稳定 `assetId` 的 alias map，并在 `scene-string-codec.ts` decode 路径使用；encode 可以使用新的 display/source number，但 decode 必须同时接受旧编号。
- 将当前 release 前真实导出的短字符串加入 `scene-string-codec.test.ts` fixture，至少覆盖 `PSE1` legacy dimensions、`PSE2` default dimensions、普通素材、特殊 footprint 素材、Pokemon key 和 skill marker。
- 对 `habitat.txt` 做字段/schema/checksum 校验并保留在 source metadata 中；除非后续 story 明确启用 habitat runtime API，否则不生成 Web 可见 habitat catalog。
- 对无法唯一匹配的条目输出 audit report，而不是猜测删除。
- 提供 `--check` 模式，CI/release gate 可发现 stale generated snapshot。

## 6. Checklist Status

- [x] 1.1 Trigger story identified: active Epic 13 data ownership scope; this is a new Story 13.7 candidate.
- [x] 1.2 Core problem defined: data source drift across translations, numbering, favorites and source snapshots.
- [x] 1.3 Evidence gathered: local snapshots compared with Xzonn `data/item.txt` / `data/pokemon.txt`, and `data/habitat.txt` inspected for future pinned input.
- [x] 2.1 Current epic impact assessed: Epic 13 remains valid.
- [x] 2.2 Epic-level change needed: add Story 13.7.
- [x] 2.3 Remaining epics reviewed: only active Epic 13 is affected.
- [x] 2.4 New epic not required: existing Epic 13 covers Polish data cleanup.
- [x] 2.5 Priority: should run before further asset-data fixes to avoid rework.
- [x] 3.1 PRD impact: add course-correction note.
- [x] 3.2 Architecture impact: update SSoT/generator/codec compatibility guidance.
- [x] 3.3 UX impact: data labels and favorite filtering can change; workflows stay unchanged.
- [x] 3.4 Other artifacts: docs, tests, release gate and asset smoke affected.
- [x] 4.1 Direct Adjustment: viable, medium effort, medium risk.
- [x] 4.2 Rollback: not viable.
- [x] 4.3 MVP Review: not needed.
- [x] 4.4 Recommendation selected: Direct Adjustment.
- [x] 5.1-5.5 Proposal components drafted.
- [!] 6.3 User approval pending.
- [!] 6.4 sprint-status update pending approval.

## 7. Implementation Handoff

**Scope classification:** Moderate.

**Route to:** Developer agent, with Product Owner-style approval for the new story and numbering compatibility choice.

**Success criteria:**

- Generated snapshots are reproducible from committed Xzonn txt inputs.
- No duplicate `assetId`, display number, or generated alias conflict is introduced.
- Translation changes are traceable to Xzonn rows or explicitly listed fallback rows.
- Old exported `PSE1`/`PSE2` scene short strings still decode to the same stable scene semantics.
- `pnpm --filter @pokopia-scene-editor/scene-core test`
- `pnpm --filter @pokopia-scene-editor/web test src/components/asset-picker/AssetPicker.test.tsx src/components/export-preview/ExportPreview.test.tsx`
- `pnpm run asset-references:smoke`
- `pnpm run release:verify` if the generated diff is large.

## 8. Approval Question

Approve this proposal for implementation?

Recommended implementation choice: use Xzonn `编号` as the user-facing/display item number, but keep legacy PokopiaDex ids as decode aliases so existing short strings remain compatible.
