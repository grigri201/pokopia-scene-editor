# Story 6.1: 图片导出摘要模型与逐层导出数据

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 系统能从当前 SceneDocument 生成图片导出所需的整体素材和逐层摘要,
So that 导出的图片能准确表达整个布景和每一层的素材使用。

## Acceptance Criteria

1. Given 当前 scene 包含多个建筑层和素材实例, when 系统生成 export summary, then 输出整体素材清单，包含素材名称、官方 No. 或 asset id、总使用数量。
2. Given 当前 scene 包含多个建筑层, when 系统生成 layer export summaries, then 每个建筑层都有独立图形数据和该层素材清单。
3. Given 素材实例包含技能、染色或非默认旋转, when 生成每层素材清单, then 清单至少保留能帮助用户复现的技能、染色和旋转摘要。
4. Given 用户修改 scene 后再次打开导出预览, then export summary 必须反映最新 SceneDocument，不使用过期缓存。
5. Given export summary 生成, then 不修改 SceneDocument、autosave storage、saved storage 或 UI preferences。

## Tasks / Subtasks

- [x] 建立图片导出摘要领域模型 (AC: 1, 2, 3)
  - [x] 新增只读 export summary 类型，覆盖整体素材清单、逐层摘要、逐层图形 cell 数据、空层状态和用于复现的实例摘要。
  - [x] 整体素材清单按 asset 聚合，包含 `assetId`、素材名称、官方 No. 和总使用数量；未知素材不得静默导致崩溃。
  - [x] 逐层素材清单按建筑层聚合，并保留技能、染色和非默认旋转摘要。
- [x] 从 SceneDocument 和 asset catalog 派生逐层图形数据 (AC: 2, 4)
  - [x] 复用现有 scene selector / area / building layer 排序规则，确保每个建筑层都有 7x7 cell 图形数据。
  - [x] 空建筑层必须出现在 layer summaries 中，并提供明确空层状态。
  - [x] 每次调用都从传入的 SceneDocument 重新派生，不使用模块级缓存或 React state。
- [x] 保护数据只读边界 (AC: 4, 5)
  - [x] export summary 生成不得调用 scene reducer、storage writer、UI preference writer 或任何 autosave 相关 API。
  - [x] 生成前后 SceneDocument 深比较等价；不得修改 `metadata`、`workspaceState`、`tileInstances` 或 `buildingLevels`。
  - [x] 该 story 不替换 AppShell 顶部 `导出` 按钮，不创建预览 modal，也不触发下载；这些属于 Story 6.2/6.3。
- [x] 增加 focused regression tests (AC: 1, 2, 3, 4, 5)
  - [x] 新增或更新 domain tests，覆盖多建筑层、多素材聚合、技能/染色/旋转摘要、空层、未知 asset fallback 和重新生成反映最新 scene。
  - [x] 增加 no-mutation/no-storage 边界测试，证明 summary 生成不写 `pokopia.sceneDocument.v1`、`pokopia.sceneDocument.autosave.v1` 或 `pokopia.uiPreferences.v1`。
- [x] 运行并记录验证门禁 (AC: 5)
  - [x] 运行 `npm run typecheck`。
  - [x] 运行 `npm test`。
  - [x] 运行 `npm run build`。
  - [x] 运行 `git diff --check`。

### Review Findings

- [x] [Review][Patch] Overall material totals could diverge from layer cell graphics if an instance cannot be represented in exported cells [src/domain/scene/export-summary.ts] — Added an export consistency guard and regression coverage for unexportable tile instances.
- [x] [Review][Patch] Layer material list reused the same instance summary objects as graphical cell data [src/domain/scene/export-summary.ts] — Cloned layer material instance summaries and added a mutation-isolation regression test.

## Dev Notes

- Epic 6 来自已批准的 `sprint-change-proposal-2026-05-22.md`。Epic 1-5 保留已完成历史；本 story 是新增图片导出能力的第一步，不改写旧 epic 状态。
- 当前用户可见导出产物应从 JSON 文件导出转为图片导出预览/图片下载。Story 6.1 只建立图片导出所需的纯派生数据模型；不要在本 story 中改变 `AppShell` 的导出按钮行为，以免把 6.2/6.3 的 UI/download 范围混入。
- Architecture 明确 `SceneDocument`、asset catalog 和 preview/export selectors 是图片导出的唯一业务数据源。图片导出不得维护第二套业务状态，不得修改 `SceneDocument`，不得触发 autosave，不得写入 `pokopia.sceneDocument.v1` 或 `pokopia.sceneDocument.autosave.v1`。
- 当前可复用基础包括 `src/domain/scene/selectors.ts` 的 building level / preview cell / front preview 派生函数、`src/domain/assets/catalog.ts` 的 `assetCatalog`、`getAssetById()`、`AssetDefinition.officialId/name/thumbnailUrl`，以及 `TileInstance` 中的 `rotationDegrees`、`dyeColor`、`requiresSkill`、`skillType`、`skillNote`。
- Story 6.1 应优先放在 domain 层，例如 `src/domain/scene/export-summary.ts` 与 `src/domain/scene/export-summary.test.ts`，并从 `src/domain/scene/index.ts` re-export，供后续 UI 和下载实现复用。
- Unknown asset fallback 只用于健壮性：清单至少应显示 `assetId`，官方 No. 和名称可为空或使用 fallback 文案。不要把未知素材写回 catalog 或 scene。
- No-storage 测试可以在 jsdom localStorage 中预填 sentinel 值或清空后调用 summary builder，断言 saved/autosave/UI preference keys 未新增或未改变。该 story 不需要引入新依赖。

### Expected Touch Points

- `src/domain/scene/export-summary.ts`
- `src/domain/scene/export-summary.test.ts`
- `src/domain/scene/index.ts`
- `_bmad-output/implementation-artifacts/6-1-image-export-summary-and-layer-data.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-6.1]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-22.md#Epics-and-Story-Impact]
- [Source: _bmad-output/planning-artifacts/prd.md#Approved-Course-Correction-2026-05-22]
- [Source: _bmad-output/planning-artifacts/architecture.md#Approved-Course-Correction-2026-05-22]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Approved-Course-Correction-2026-05-22]
- [Source: src/domain/scene/selectors.ts]
- [Source: src/domain/assets/catalog.ts]
- [Source: src/domain/scene/types.ts]

## Testing Requirements

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-22: `npm test -- src/domain/scene/export-summary.test.ts` (initial red phase failed because `src/domain/scene/export-summary.ts` did not exist)
- 2026-05-22: `npm test -- src/domain/scene/export-summary.test.ts`
- 2026-05-22: `npm run typecheck`
- 2026-05-22: `npm test`
- 2026-05-22: `npm run build`
- 2026-05-22: `git diff --check`
- 2026-05-22: Multi-agent code review (Blind Hunter clean; Edge Case Hunter found 2 patch findings; Acceptance Auditor clean)
- 2026-05-22: Review follow-up `npm test -- src/domain/scene/export-summary.test.ts`
- 2026-05-22: Review follow-up `npm run typecheck`
- 2026-05-22: Review follow-up `npm test`
- 2026-05-22: Review follow-up `npm run build`
- 2026-05-22: Review follow-up `git diff --check`

### Completion Notes List

- Added a pure `buildImageExportSummary(scene)` domain selector that derives overall material counts, per-layer material summaries, and 7x7 per-layer cell graphics from the current `SceneDocument` and asset catalog.
- Preserved Story 6.1 scope by leaving the existing `导出` UI and download behavior untouched for Story 6.2/6.3.
- Added regression coverage for skill, dye, rotation, empty layers, unknown asset fallback, latest-scene regeneration, no scene mutation, and no saved/autosave/UI preference storage writes.
- Addressed multi-agent review findings by adding an export consistency guard and cloning material-list instance summaries away from graphical cell summaries.

### File List

- `_bmad-output/implementation-artifacts/6-1-image-export-summary-and-layer-data.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/domain/scene/export-summary.ts`
- `src/domain/scene/export-summary.test.ts`
- `src/domain/scene/index.ts`

### Change Log

- 2026-05-22: Story created from Epic 6 Story 6.1 and marked ready-for-dev.
- 2026-05-22: Implemented image export summary domain model and moved Story 6.1 to review.
- 2026-05-22: Addressed code-review findings, re-ran full gates, and marked Story 6.1 done.
