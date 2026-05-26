# Story 8.1: 为 asset catalog 增加 footprint 元数据和真实大素材覆盖

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 素材维护者,
I want 在 asset catalog 中维护素材 footprint,
so that 编辑器可以知道素材真实占用格数和高度，而不是默认所有素材都是 1x1x1。

## Acceptance Criteria

1. Given 当前 catalog 已从 Pokopia placeable items 生成, When dev agent 执行 Story 8.1, Then `AssetDefinition` 必须包含 `footprint: { length, width, height }`, And 三个字段都是正整数。
2. Given 现有素材没有显式 footprint override, When catalog 构建 asset definition, Then 默认 footprint 必须为 `{ length: 1, width: 1, height: 1 }`, And 现有素材数量、官方 No.、名称、分类、标签、喜好和缩略图不应因为默认迁移而丢失。
3. Given 已知真实大素材清单可维护, When dev agent 增加 overrides, Then overrides 必须集中在 `packages/scene-core/src/domain/assets/` 的可审计结构中, And 至少覆盖 1x2x1、2x1x1、2x1x2 或等价大素材示例。
4. Given MCP resource `pokopia://assets/catalog` 或 HTTP `/api/assets` 返回 asset catalog, When 客户端读取素材, Then 结果必须包含 footprint metadata, And Codex skill 示例不得复制 override 列表。

## Tasks / Subtasks

- [x] 定义 catalog footprint 类型与默认迁移 (AC: 1, 2)
  - [x] 在 `packages/scene-core/src/domain/assets/catalog.ts` 中为 `AssetDefinition` 增加 `footprint` 字段，类型为 positive integer `length`、`width`、`height`。
  - [x] 为没有显式 override 的素材统一派生 `{ length: 1, width: 1, height: 1 }`，不改变现有 source generated file。
  - [x] 增加测试确认所有 catalog asset 均有正整数 footprint，且 catalog 长度、关键官方 ID、中文名、分类、标签、喜好和缩略图不回退。
- [x] 增加可审计真实大素材 overrides (AC: 3)
  - [x] 在 `packages/scene-core/src/domain/assets/` 下集中维护 footprint override，不把 override 写进 generated source placeable items。
  - [x] 至少覆盖一个 1x2x1、一个 2x1x1、一个 height > 1 的素材；如果同一素材满足 2x1x2，也可覆盖该等价示例。
  - [x] 增加测试通过 `getAssetById` 验证 override 生效，并确认未覆盖素材仍为默认 1x1x1。
- [x] 确认 HTTP API 和 MCP catalog 输出包含 footprint (AC: 4)
  - [x] 更新或补充 `apps/worker/src/index.test.ts`，验证 `/api/assets` 返回的 asset 带 footprint。
  - [x] 更新或补充 `apps/worker/src/mcp.test.ts`，验证 `pokopia://assets/catalog` resource 或 `search_pokopia_assets` tool 输出带 footprint。
  - [x] 确认 `.agents/skills/pokopia-scene-worker/` 示例不复制 override 列表或 footprint 规则；如需要，只更新措辞说明 MCP structuredContent 是权威来源。
- [x] 执行验证并更新 story/tracker (AC: 1-4)
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/scene-core test -- catalog`。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/worker test`。
  - [x] 运行 `pnpm run typecheck`。
  - [x] 将 story 状态推进到 `review`，并把 `sprint-status.yaml` 中 `8-1-asset-catalog-footprint-metadata` 更新为 `review`。

### Review Findings

- [x] [Review][Patch] Footprint override ids can silently miss the generated catalog [packages/scene-core/src/domain/assets/footprint-overrides.ts:13] — fixed by exporting override ids, asserting every override id exists in the generated catalog during module initialization, and pinning the invariant in catalog tests.

## Dev Notes

- Story 8.1 只做 asset catalog footprint metadata，不实现 effective footprint、occupied cells、same-layer collision 或 height blocking；这些属于 Story 8.2。[Source: _bmad-output/planning-artifacts/epics.md#Story-8.1]
- `AssetDefinition.footprint` 必须是 `{ length, width, height }` 三个正整数。没有 override 的素材默认 1x1x1，真实大素材通过集中 override 覆盖。[Source: _bmad-output/planning-artifacts/prd.md#Asset-Footprint-&-Occupancy-Rules]
- Footprint 属于 asset catalog metadata，不属于 SceneDocument tile instance。不得新增 `SceneDocument v2`、实例级 footprint 字段、blocking cell 字段或短字符串 footprint 编码。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- 当前 catalog 从 `packages/scene-core/src/domain/assets/source-placeable-items.ts` 的 generated source 构建；该文件标注不要手改。应在 `catalog.ts` 或同目录新的 override 模块中组合 metadata。[Source: packages/scene-core/src/domain/assets/source-placeable-items.ts; packages/scene-core/src/domain/assets/catalog.ts]
- Existing catalog tests expect 1160 non-kit assets and verify key IDs such as `leafy-plant`、`wooden-fencing`、`wooden-bench`、`ditto-doll` plus favorite filtering counts. Keep these stable unless source data intentionally changes。[Source: packages/scene-core/src/domain/assets/catalog.test.ts]
- `/api/assets` 和 MCP `pokopia://assets/catalog` already return `AssetDefinition` objects from `assetCatalog`; adding the field in scene-core should flow through automatically, but tests must pin that behavior。[Source: apps/worker/src/routes/assets.ts; apps/worker/src/mcp.ts]
- Codex skill boundary says MCP tools/resources are authoritative and skill must not copy scene-core schema, catalog, export or recovery rules. For this story, do not duplicate footprint override tables in skill docs/examples。[Source: .agents/skills/pokopia-scene-worker/SKILL.md]

### Project Structure Notes

- Likely updates:
  - `packages/scene-core/src/domain/assets/catalog.ts`
  - `packages/scene-core/src/domain/assets/footprint-overrides.ts` or equivalent colocated override module
  - `packages/scene-core/src/domain/assets/catalog.test.ts`
  - `apps/worker/src/index.test.ts`
  - `apps/worker/src/mcp.test.ts`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Asset-Footprint-&-Occupancy-Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Asset-Picker]
- [Source: packages/scene-core/src/domain/assets/catalog.ts]
- [Source: packages/scene-core/src/domain/assets/catalog.test.ts]
- [Source: apps/worker/src/routes/assets.ts]
- [Source: apps/worker/src/mcp.ts]
- [Source: .agents/skills/pokopia-scene-worker/SKILL.md]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-27: Story created after Epic 8 planning commit `bf2a7ec`.
- 2026-05-27: Started implementation and moved sprint tracker status to in-progress.
- 2026-05-27: Added failing catalog/Worker tests for footprint metadata, then implemented catalog footprint defaults and audited overrides.
- 2026-05-27: Verified `pnpm --filter @pokopia-scene-editor/scene-core test -- catalog`, `pnpm --filter @pokopia-scene-editor/worker test -- index.test.ts mcp.test.ts`, `pnpm run typecheck`, and `pnpm run test`.
- 2026-05-27: Code review found silent footprint override id misses; fixed with catalog-known override assertions and re-verified catalog tests, typecheck, and full test suite.

### Completion Notes List

- Added `AssetDefinition.footprint` with default 1x1x1 metadata for all generated catalog assets without editing generated source data.
- Added centralized footprint overrides for `wooden-bench` (2x1x1), `large-narrow-rug` (1x2x1), and `large-boulder` (2x1x2-equivalent height coverage as 2x1x2).
- Pinned HTTP `/api/assets`, MCP `search_pokopia_assets`, and MCP `pokopia://assets/catalog` output coverage so footprint metadata flows through adapters.
- Review fix prevents typoed footprint override asset ids from silently falling back to default 1x1x1.

### Change Log

- 2026-05-27: Created Story 8.1 and moved status to ready-for-dev.
- 2026-05-27: Started Story 8.1 implementation.
- 2026-05-27: Implemented asset catalog footprint metadata and moved status to review.
- 2026-05-27: Addressed code review finding and marked Story 8.1 done.

### File List

- _bmad-output/implementation-artifacts/8-1-asset-catalog-footprint-metadata.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/worker/src/index.test.ts
- apps/worker/src/mcp.test.ts
- packages/scene-core/src/domain/assets/catalog.test.ts
- packages/scene-core/src/domain/assets/catalog.ts
- packages/scene-core/src/domain/assets/footprint-overrides.ts
- packages/scene-core/src/domain/assets/index.ts
