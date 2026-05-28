# Story 11.1: 为 asset catalog 增加 stacking surface 元数据

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 素材维护者,
I want 在 asset catalog 中维护承载面和受控叠放 metadata,
so that 盘子、地毯、底垫、嫩芽和低高度素材的例外规则可以被审计和测试，而不是靠 UI 或名称猜测。

## Acceptance Criteria

1. Given 当前 asset catalog 构建 asset definitions, When 素材没有显式 stacking override, Then 默认 stacking metadata 必须表示不可承载、不可被同层 overlap, And 现有 asset id、official id、名称、分类、标签、喜好、footprint 和缩略图不应变化。
2. Given `wooden-plate`、`plate`、`party-platter`, When catalog 构建 stacking metadata, Then 三者必须被标记为 food surface, And allowed top category 只能覆盖 `food` 或等价已审计食物素材集合。
3. Given 已审计的底垫、地毯、嫩芽和低高度素材清单, When dev agent 增加 stacking overrides, Then overrides 必须集中在 `packages/scene-core/src/domain/assets/` 的可审计结构中, And 不得仅靠中文名、英文名或 slug 包含 `mat`、`rug`、`shoot` 自动开放叠放。
4. Given HTTP `/api/assets`、MCP resource `pokopia://assets/catalog` 或 Codex skill 查询素材, When 返回 asset catalog, Then 结果必须包含 stacking metadata 或可解释的 derived display fields, And Codex skill 示例不得复制 override 列表。

## Tasks / Subtasks

- [x] 定义 catalog stacking metadata 类型与默认值 (AC: 1)
  - [x] 在 `packages/scene-core/src/domain/assets/catalog.ts` 的 `AssetDefinition` 上新增稳定 `stacking` 字段。
  - [x] 新增可复用的默认 stacking metadata，语义必须是不可承载、不可同层 overlap。
  - [x] 确保 `buildAssetDefinition()` 为每个素材都返回 cloned/immutable-safe metadata，不共享可变数组引用。
- [x] 增加集中式 stacking override 数据结构 (AC: 2, 3)
  - [x] 在 `packages/scene-core/src/domain/assets/` 下新增或扩展一个可审计 override 文件；命名应与现有 `footprint-overrides.ts` 模式一致。
  - [x] 将 `wooden-plate`、`plate`、`party-platter` 标记为 food surface，且 `allowedTopCategories` 只包含 `food`。
  - [x] 从 `docs/placeable-asset-stacking-audit-checklist.html` 中使用已显式标记为 `can-support` 的底垫、地毯、嫩芽和低高度 surface；不得写任何按名称自动推断开放叠放的逻辑。
  - [x] 对 unknown override asset id、unknown allowed category、空 allowed categories 做启动期断言。
- [x] 保持 catalog/API/MCP 输出边界一致 (AC: 1, 4)
  - [x] HTTP `/api/assets` 搜索结果自然包含 `stacking` metadata，不额外维护 Worker 侧复制规则。
  - [x] MCP `search_pokopia_assets` 与 `pokopia://assets/catalog` resource 通过 shared `assetCatalog` 暴露同一字段。
  - [x] 更新 `apps/worker` 相关测试，覆盖 HTTP 与 MCP catalog 返回 stacking metadata。
- [x] 更新 Codex skill 示例边界 (AC: 4)
  - [x] 更新 `.agents/skills/pokopia-scene-worker` 示例或 workflow 说明，要求返回 `stacking` metadata/derived display fields。
  - [x] 不在 skill 文档中复制 food surface 或 low-height override 清单；继续要求以 MCP `structuredContent` 为权威。
- [x] 增加回归测试并验证 (AC: 1-4)
  - [x] `packages/scene-core/src/domain/assets/catalog.test.ts` 覆盖默认不可叠放、三种 food surface、至少一个 `can-support` audit surface 和至少一个明确不可叠放 audit item。
  - [x] 测试现有 catalog 长度、asset id、official id、分类、footprint 和缩略图字段不因 stacking metadata 改变。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/scene-core test -- catalog`。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/worker test -- index.test.ts mcp.test.ts`。
  - [x] 运行 `pnpm run typecheck` 和 `git diff --check`。

### Review Findings

- [x] [Review][Patch] Add runtime validation for stacking allowed top categories [packages/scene-core/src/domain/assets/catalog.ts]
- [x] [Review][Patch] Extend primary Codex skill boundary to cover stacking rules [.agents/skills/pokopia-scene-worker/SKILL.md]

## Dev Notes

- Epic 11 只引入 catalog-driven 承载面与受控叠放例外。`SceneDocument v1`、autosave、PSE1 短字符串、Worker API 和 MCP 输入输出不得保存 stacking relation、surface id、z-index、parent instance id 或 catalog snapshot。[Source: _bmad-output/planning-artifacts/epics.md#Epic-11; _bmad-output/planning-artifacts/architecture.md#Decision-Stacking-surface-rules-live-in-the-asset-catalog-while-stacking-relations-are-derived]
- Story 11.1 的实现层级是 asset catalog metadata，不实现 placement compatibility、derived relation、canvas 上下半格、export summary stacking relation 或 conflict 类型；这些属于 Story 11.2-11.4。[Source: _bmad-output/planning-artifacts/epics.md#Story-11.1; _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28-stacking-surface-rules.md#4-Detailed-Change-Proposals]
- 现有 catalog 源文件是 `packages/scene-core/src/domain/assets/catalog.ts`。`AssetDefinition` 当前包含 `assetId`、`officialId`、中英文名称、`category`、tags、search keywords、favorites、`dyeable`、`footprint`、thumbnail；新增字段必须追加，不要重命名或移除现有字段。[Source: packages/scene-core/src/domain/assets/catalog.ts]
- 现有 footprint override 模式集中在 `packages/scene-core/src/domain/assets/footprint-overrides.ts`，并由 `catalog.ts` 用 `getAssetFootprint(assetId)` 注入。Stacking override 应采用同类集中结构，并导出 override asset id 供 catalog 启动期校验。[Source: packages/scene-core/src/domain/assets/footprint-overrides.ts; packages/scene-core/src/domain/assets/catalog.ts]
- `docs/placeable-asset-stacking-audit-checklist.html` 是本 story 的人工审计输入。盘类 `plate`、`wooden-plate`、`party-platter` 默认标记为 `supports-food`；Section 2 中 `can-support` 表示可作为受控 surface；`not-stackable` 条目必须保持默认不可叠放。[Source: docs/placeable-asset-stacking-audit-checklist.html]
- Worker `/api/assets`、MCP `search_pokopia_assets` 和 `pokopia://assets/catalog` 都直接返回 shared `assetCatalog` 或 filter 结果。Story 11.1 不应在 Worker 层复制 override 规则，只需要测试 shared catalog 字段被透传。[Source: apps/worker/src/routes/assets.ts; apps/worker/src/mcp.ts]
- Repo-scoped `pokopia-scene-worker` skill 要求 asset search/default scene workflows 以 MCP `structuredContent` 为权威，不能复制 scene-core catalog 或 footprint/stacking rule tables。更新示例时只描述字段，不列出 override 清单。[Source: .agents/skills/pokopia-scene-worker/SKILL.md]
- 当前验证脚本来自 root `package.json`。Story 11.1 可先跑 scene-core catalog test、worker assets/MCP tests、`pnpm run typecheck` 和 `git diff --check`；Epic 11 完成时 Story 11.4 必须跑 `pnpm run release:verify`。[Source: package.json; _bmad-output/planning-artifacts/epics.md#Story-11.4]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/domain/assets/catalog.ts`
  - `packages/scene-core/src/domain/assets/catalog.test.ts`
  - `packages/scene-core/src/domain/assets/stacking-overrides.ts` or equivalent centralized override file
  - `packages/scene-core/src/domain/assets/index.ts` if a new file exports public helpers
  - `apps/worker/src/index.test.ts`
  - `apps/worker/src/mcp.test.ts`
  - `.agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md`
  - `.agents/skills/pokopia-scene-worker/references/workflows.md`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-11.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Stacking-surface-rules-live-in-the-asset-catalog-while-stacking-relations-are-derived]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28-stacking-surface-rules.md]
- [Source: docs/placeable-asset-stacking-audit-checklist.html]
- [Source: packages/scene-core/src/domain/assets/catalog.ts]
- [Source: packages/scene-core/src/domain/assets/footprint-overrides.ts]
- [Source: apps/worker/src/routes/assets.ts]
- [Source: apps/worker/src/mcp.ts]
- [Source: .agents/skills/pokopia-scene-worker/SKILL.md]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created from approved Epic 11 planning in isolated worktree `codex/epic-11-stacking-surfaces`.
- 2026-05-28: Started dev-story implementation and moved status to in-progress.
- 2026-05-28: Installed workspace dependencies in the new worktree after Vitest was missing.
- 2026-05-28: Passed `pnpm --filter @pokopia-scene-editor/scene-core test -- catalog`.
- 2026-05-28: Passed `pnpm --filter @pokopia-scene-editor/worker test -- index.test.ts mcp.test.ts`.
- 2026-05-28: Passed `pnpm run typecheck`.
- 2026-05-28: Passed `git diff --check`.
- 2026-05-28: bmad-code-review found two patch items; fixed runtime stacking category validation and skill boundary wording.
- 2026-05-28: Re-ran `pnpm --filter @pokopia-scene-editor/scene-core test -- catalog`, `pnpm --filter @pokopia-scene-editor/worker test -- index.test.ts mcp.test.ts`, `pnpm run typecheck`, and `git diff --check` after review fixes.

### Completion Notes List

- Added `AssetDefinition.stacking` with default non-stackable metadata for every asset and centralized audited overrides in `stacking-overrides.ts`.
- Marked `plate`, `wooden-plate` and `party-platter` as food-only surfaces; added audited `can-support` floor-cover/low-height surfaces from the checklist without name-based inference.
- Kept Worker HTTP/MCP behavior rule-free by relying on shared `assetCatalog`, and added tests proving stacking metadata is exposed through HTTP search, MCP search and the catalog resource.
- Updated the repo-scoped Codex skill examples to consume `structuredContent.data.assets[].stacking` without copying override lists.
- Code review follow-ups are fixed: catalog startup now checks stacking `allowedTopCategories` against known asset categories, and the primary Codex skill instructions now forbid reconstructing stacking rules.

### Change Log

- 2026-05-28: Created Story 11.1 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented catalog stacking metadata and moved status to review.
- 2026-05-28: Fixed code review findings for Story 11.1.
- 2026-05-28: Code review patches fixed and moved Story 11.1 to done.

### File List

- .agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md
- .agents/skills/pokopia-scene-worker/SKILL.md
- .agents/skills/pokopia-scene-worker/references/workflows.md
- _bmad-output/implementation-artifacts/11-1-asset-catalog-stacking-surface-metadata.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/worker/src/index.test.ts
- apps/worker/src/mcp.test.ts
- packages/scene-core/src/domain/assets/catalog.test.ts
- packages/scene-core/src/domain/assets/catalog.ts
- packages/scene-core/src/domain/assets/index.ts
- packages/scene-core/src/domain/assets/stacking-overrides.ts
