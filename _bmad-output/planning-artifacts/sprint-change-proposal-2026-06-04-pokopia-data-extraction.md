---
date: 2026-06-04
status: approved
mode: planning
trigger: 抽取 pokopia-scene-editor 与 ../pokopia-color-pattern 中关于 Pokopia 的基础数据，合并生成新项目 pokopia-data，并让现有项目引用新 data 项目后继续扩展数据。
scope_classification: major
recommended_path: Hybrid Adjustment
approved_at: 2026-06-04
---

# Sprint Change Proposal - Pokopia Data 独立项目抽取

## 1. Issue Summary

用户希望把 `pokopia-scene-editor` 中关于 Pokopia 的基础数据，和相邻项目 `../pokopia-color-pattern` 中的基础数据合并，生成新的 `pokopia-data` 项目。随后本项目引用新的 data 项目，再在统一数据源上继续做数据扩展。

当前事实：

- `pokopia-scene-editor` 已在 Epic 13 后收敛为 Web + `scene-core`，但 `scene-core` 仍直接内置大量 Pokopia asset/Pokemon 数据：`source-placeable-items.ts`、中文名、Pokemon 偏好、Pokemon portraits、footprint overrides、stacking overrides、图片路径和 Xzonn snapshot 同步脚本。
- `../pokopia-color-pattern` 已有另一套数据生成链路：`generated/data/pokemon-index.json`、`compact-items.json`、`item-colors.json`、recommendation data、runtime asset manifest，以及 `scripts/generate-data.ts` 中的 schema/validation/size budget。
- 两个项目都围绕同一批 Pokopia item/Pokemon/source assets 做派生，但维护入口、schema version、runtime path、中文名、偏好词、颜色、body/furniture size 和推荐字段分散。
- 当前没有 `../pokopia-data` 目录。此变更会新增一个 repo/project，并改变两个现有项目的数据依赖方向。

触发类型：Strategic technical boundary correction + shared data source extraction.

本 proposal 只规划变更，不修改源码、不创建新项目、不同步 PRD/Architecture/Epics/tracker。

## 2. Impact Analysis

### Checklist Status

- [x] 1.1 Trigger story: 当前没有 active story；Epic 14-16 均为 done。
- [x] 1.2 Core problem: Pokopia 基础数据在 scene editor 和 color pattern 两个项目中重复生成、重复校验和重复解释。
- [x] 1.3 Evidence: scene editor 的 `packages/scene-core/src/domain/assets/**` 和 `assets/pokopia_*`，color pattern 的 `generated/data/**`、`scripts/generate-data.ts`、`src/data/schemas.ts` 都承载基础数据。
- [x] 2.1 Current epic impact: Epic 16 已完成，不应 retroactively 修改。
- [x] 2.2 Epic-level changes: 需要新增 Epic 17，作为跨项目数据抽取和消费迁移。
- [x] 2.3 Future epic impact: 后续数据扩展应优先落到 `pokopia-data`，再由 consumer 引用。
- [x] 2.4 New project needed: 是。目标是新增 sibling project `../pokopia-data`。
- [x] 2.5 Priority/order: 应先建立数据项目 contract，再迁移 consumer；不能先在 scene editor 或 color pattern 继续扩展分散数据。
- [x] 3.1 PRD conflicts: 现有 PRD 仍把 `scene-core` 作为 asset catalog 事实源；需要改为 `scene-core` 消费 `pokopia-data` 后再派生编辑器规则。
- [x] 3.2 Architecture conflicts: `scene-core` 不应继续拥有全部 Pokopia raw/generated 基础数据；它应拥有编辑器领域规则和 SceneDocument contract。
- [x] 3.3 UX conflicts: 终端用户 UI 不应变化；素材列表、Pokemon 主题、导出预览和 color pattern 页面必须保持数据语义一致。
- [x] 3.4 Secondary artifacts: scripts、package graph、lockfiles、generated fixtures、asset reference checks、release gates、docs/data-source-of-truth 都受影响。
- [x] 4.1 Direct Adjustment: 不推荐。跨两个项目和新项目，直接改单仓库会留下半迁移状态。
- [x] 4.2 Rollback: 不适用。现有数据链路可作为迁移基线保留。
- [x] 4.3 Product stage review: 属于 Polish/architecture 阶段，不改变终端用户产品目标。
- [x] 4.4 Recommended path: Hybrid Adjustment，新建数据项目 contract + consumer 分阶段迁移。

### PRD Impact

需要新增 course correction，明确：

- `pokopia-data` 是 Pokopia 基础数据的共享来源。
- `pokopia-scene-editor` 继续维护 Web editor 和 `scene-core` 领域库；`scene-core` 消费 data package，不再手工维护重复基础数据。
- `SceneDocument v1` 保持不变。素材 `assetId`、`officialId`、`sceneCodecOfficialId`、`legacyOfficialIds` 的兼容性必须保持，旧 PSE1/PSE2 decode 不得被数据抽取破坏。
- 终端用户 Web 行为不得回退。

### Architecture Impact

需要重新定义数据 ownership：

- `pokopia-data`: raw snapshots、normalized item/Pokemon data、translations、preferences、colors、body/furniture size、runtime asset manifest、schema validators、generation scripts、fixture/size checks。
- `scene-core`: SceneDocument schema/codec/recovery、asset catalog adapter、editor-specific category normalization、footprint/stacking overrides、occupancy/export summary。若 footprint/stacking 被认为是 Pokopia game data，则后续可再迁入 `pokopia-data`，但首轮建议保留在 `scene-core`，避免把编辑器规则和基础数据一次性混合迁移。
- `pokopia-color-pattern`: recommendation/color UI 和 recommendation generation consumer，不再拥有基础 compact item/Pokemon index 生成真相。

### Technical Impact

主要影响面：

- 新项目 `../pokopia-data` 的 package name、exports、scripts、generated output 和 source layout。
- scene editor 的 `packages/scene-core/package.json` 依赖新增 data package，catalog build 改为从 data exports 读取。
- color pattern 的 scripts 改为从 data exports 或 data generated JSON 读取，保留 recommendation-specific logic。
- 两个 consumer 都需要锁定 count、slug/id compatibility、runtime image references 和 schema version。
- 需要跨项目 release gate：data validate -> scene-core tests/build -> scene editor web build -> color pattern validate/build。

### Risk

- `assetId` / slug 漂移会破坏旧场景字符串、autosave 恢复和 scene API 数据。
- 图片路径语义不同：scene editor 使用 `assets/pokopia_image_sources/...`，color pattern 使用 `/assets/runtime/...`。需要明确 source asset path 与 consumer runtime path 的区别。
- color pattern 的 generated JSON 已包含推荐字段和颜色字段；不是所有字段都应进入基础数据。
- 过早迁移 footprint/stacking 可能把 editor-specific 规则变成 data package 公共 contract，扩大 blast radius。

## 3. Recommended Approach

选择 Hybrid Adjustment：先创建 `pokopia-data` 的 contract 和生成/验证链路，再迁移两个 consumer，最后再做数据扩展。

不建议一次性把所有数据和规则搬入 `pokopia-data`。首轮边界应保守：

- `pokopia-data` 负责“基础事实与可复用派生”：item/Pokemon identity、names/translations、categories/tags、preferences、colors、body/furniture size、source/runtime asset manifest、schema validators。
- `scene-core` 负责“编辑器领域解释”：SceneDocument、codec compatibility、placement category mapping、footprint/stacking/occupancy/export summary。
- `pokopia-color-pattern` 负责“推荐产品解释”：harmony/recommendation ranking、pagination、static routes、UI metadata overrides。

Scope classification: Major. 原因是新增项目并改变两个现有项目的数据来源、package graph、build/test gate 和 source-of-truth 文档。

## 4. Detailed Change Proposals

### PRD

新增：

```text
### Approved Course Correction - 2026-06-04 Pokopia Data 独立项目抽取

本 PRD 增加 Epic 17，用于把 Pokopia 基础数据从本仓库和 `pokopia-color-pattern` 抽取为新的 sibling project `pokopia-data`。本仓库继续维护 Web editor 与 `scene-core` 领域库；`scene-core` 通过 data package 消费基础 item/Pokemon 数据，并继续负责 SceneDocument v1、codec、footprint/stacking、occupancy 和 export summary。

`SceneDocument v1` 继续保持。旧 PSE1/PSE2、旧 autosave、`assetId`、`sceneCodecOfficialId` 和 `legacyOfficialIds` 兼容性不得回退。终端用户 Web 行为不变。
```

### Architecture

新增 Data Boundary：

```text
- `pokopia-data`: authoritative shared Pokopia base data package. Owns raw snapshots, normalized item/Pokemon records, translations, preferences, color metadata, body/furniture size metadata, asset manifests, schema validation, and data generation scripts.
- `packages/scene-core`: consumes `pokopia-data` and adapts it into editor catalog definitions. Owns SceneDocument v1, codec/recovery, editor category mapping, footprint/stacking overrides, occupancy, selectors, and export summary.
- `pokopia-color-pattern`: consumes `pokopia-data` and owns color-pattern-specific recommendation/routing/UI projections.
```

### Data Contract

Suggested first public exports:

- `items`: stable `id`, `sourceNumber`, `displayNumber`, `slug`, `name`, `nameZh`, `category`, `tags`, `favoriteCategoryIds`, `preferenceTerms`, `imageFileName`, `sourceImagePath`, optional `runtimeImagePath`.
- `pokemon`: stable `slug`, `dexNumber` / `sequence`, `name`, `nameZh`, `portraitFileName`, `sourcePortraitPath`, preferences, body size, optional palette/color metadata.
- `itemColors`: `slug`, primary color, palette if available, source/fallback metadata.
- `schemas`: TypeScript types plus runtime validators for generated JSON.
- `manifests`: item/pokemon asset references and checksums or dimensions where available.

Compatibility constraints:

- Slug and numeric id changes require explicit migration notes.
- `sceneCodecOfficialId` and `legacyOfficialIds` must remain derivable or explicitly exported for scene editor compatibility.
- Generated JSON schema versions should be package-level and consumer-visible.

## 5. Proposed New Epic and Stories

## Epic 17: Pokopia Data 独立项目抽取与 Consumer 迁移

把 Pokopia 基础 item/Pokemon 数据从 `pokopia-scene-editor` 和 `pokopia-color-pattern` 中抽取到新的 sibling project `pokopia-data`，并让两个 consumer 通过明确 package contract 使用同一份基础数据。首轮迁移不改变终端用户 UI，不改变 `SceneDocument v1`，不破坏旧 PSE1/PSE2 兼容。

### Story 17.1: Course Correction 同步与 Data Ownership 定义

As a 维护者, I want 同步 PRD、Architecture、Epics 和 sprint-status 的 data ownership, So that 后续实现不会继续在两个项目里扩展重复数据源。

Acceptance Criteria:

- PRD 新增 2026-06-04 course correction。
- Architecture 新增 `pokopia-data` / `scene-core` / `pokopia-color-pattern` ownership boundary。
- Epics 新增 Epic 17，tracker 新增 Story 17.1-17.5。
- `docs/data-source-of-truth.md` 更新为跨项目数据来源说明。
- 明确本次不改 `SceneDocument v1`；如未来必须改 schema，需要单独 course correction。

### Story 17.2: 创建 `../pokopia-data` 项目与基础 Contract

As a data consumer developer, I want 一个可安装的 `pokopia-data` package, So that scene editor 和 color pattern 可以读取同一份 Pokopia 基础数据。

Acceptance Criteria:

- 在 sibling directory 创建 `../pokopia-data`，包含 package manifest、TypeScript config、schema/types、generation scripts、fixtures/tests。
- 导入当前两项目的基础源数据，生成 normalized item/Pokemon/color/asset manifest outputs。
- Data package 提供 ESM exports 和 JSON exports；外部 consumer 不需要编译 data project 源码。
- Validation 覆盖 item count、Pokemon count、slug uniqueness、id uniqueness、asset reference existence、schema version、size budget。
- 不引入 scene editor UI、React、SceneDocument、recommendation ranking 或 color pattern routing 依赖。

### Story 17.3: `scene-core` 改为消费 `pokopia-data`

As a scene editor maintainer, I want `scene-core` 从 `pokopia-data` 读取基础数据, So that 编辑器 catalog 不再维护重复 item/Pokemon snapshots。

Acceptance Criteria:

- `packages/scene-core` 新增对 `pokopia-data` 的 package dependency。
- `source-placeable-items.ts`、`source-pokemon-preferences.ts`、`source-pokemon-portraits.ts` 等基础数据改为由 data exports 生成或直接消费。
- `assetCatalog` 输出的 `assetId`、`officialId`、`sceneCodecOfficialId`、`legacyOfficialIds`、name、category、thumbnailUrl 与迁移前兼容。
- Footprint/stacking overrides 首轮保留在 `scene-core`，并继续通过现有 catalog tests 锁定。
- 旧 PSE1/PSE2 codec tests、asset catalog tests、web build 和 file-install smoke 通过。

### Story 17.4: `pokopia-color-pattern` 改为消费 `pokopia-data`

As a color pattern maintainer, I want color pattern 的 compact item / Pokemon index 基础输入来自 `pokopia-data`, So that 推荐和静态页生成不再复制基础数据抓取/解析逻辑。

Acceptance Criteria:

- color pattern scripts 从 `pokopia-data` 读取 item/Pokemon/color/asset manifest 基础数据。
- `generated/data/compact-items.json`、`pokemon-index.json`、`item-colors.json` 的 public schema 尽量保持；必要字段变更需明确 schema version bump。
- recommendation generation、route validation、SSG、dist validation 和 hydrate smoke 不回退。
- Recommendation-specific overrides 和 ranking logic 仍留在 color pattern，不迁入基础 data package。

### Story 17.5: 跨项目 Release Gate 与数据扩展入口

As a 维护者, I want 一个跨项目验证和扩展流程, So that 后续新增 Pokopia 数据只需要改 `pokopia-data` 并能证明两个 consumer 未回退。

Acceptance Criteria:

- 定义标准验证顺序：`pokopia-data` validate/build -> scene editor scene-core tests/build -> scene editor web build -> color pattern validate/build。
- 增加数据扩展文档：新增 item、Pokemon、translation、preference、color override、asset reference 的入口和检查命令。
- 给出 slug/id compatibility checklist，特别覆盖 scene string codec 和 legacy aliases。
- 两个 consumer 的 docs 指向 `pokopia-data`，不再把本地 generated source 作为扩展入口。
- 明确部署仍由各 consumer 项目独立执行；data package 不直接部署 Web。

## 6. Open Questions

- `pokopia-data` 首轮是否应作为独立 git repo，还是 sibling workspace package？建议独立 repo/project，便于两个 consumer 解耦发布；本地开发可用 `file:` 依赖。
- `footprint` / `stacking` 是否属于基础游戏数据？建议首轮不迁移，等基础数据稳定后再评估是否作为 optional editor metadata 输出。
- 图片资产是否也移动到 `pokopia-data`？建议首轮移动 manifest/metadata，不移动所有 runtime image files；consumer 仍负责自己的 runtime asset copy/deploy。
- color metadata 是基础数据还是 color-pattern 派生？建议 `itemColors` / Pokemon palette 可以进入 `pokopia-data`，recommendation ranking 留在 color pattern。

## 7. Approval / Next Step

待 Grigri 确认后执行：

1. 同步本仓库 PRD、Architecture、Epics、sprint-status 和 data source docs。
2. 创建 Story 17.1，进入 `bmad-create-story` / `bmad-dev-story` 实施。
3. Story 17.2 之后再实际创建 `../pokopia-data` 并迁移 consumer。
