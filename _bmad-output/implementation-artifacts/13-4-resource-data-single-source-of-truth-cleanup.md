# Story 13.4: 资源与数据 Single Source of Truth 清理

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want 明确 catalog 数据、override 和 runtime images 的权威来源,
so that 后续修改不会在 CSV/JSON/generated TS/runtime assets 之间漂移。

## Acceptance Criteria

1. `catalog` business metadata 的 canonical source 必须明确记录。`source-*.ts` 这类大型 snapshot 是否是 repo-local generated output、是否允许人工维护，必须在文档或脚本 guard 中写清楚。
2. Footprint、stacking、dimension、Pokemon preference、translation 和 runtime image references 每类业务数据只能有一个维护入口；`apps/web` 和测试必须继续从 `@pokopia-scene-editor/scene-core` 读取业务事实，不复制第二套 catalog/dimension/fixture 真相。
3. Runtime image assets 删除或移动前必须有可运行的 asset reference smoke。该 smoke 必须验证 core 导出的 asset thumbnails、Pokemon portraits 和 skill marker icon URLs 都能在 source runtime assets 与 Web build output 中找到。
4. 证明 Web 素材列表、缩略图、预览和图片导出不回退：至少保留或补强 Asset Picker、Export Preview 和 image export 相关 focused tests；必要时不要改 UI 行为。
5. 大型 raw/source snapshots 如仍保留在仓库中，必须在文档中标注为 reference-only 或 runtime source，并说明它们不应成为测试真相的第二来源。
6. 不改变终端用户 Web 行为，不改 `SceneDocument v1` schema shape，不新增 `SceneDocument v2`，不保存 footprint/stacking/dimension derived state。

## Tasks / Subtasks

- [x] 明确数据 SSoT 文档 (AC: 1, 2, 5)
  - [x] 新增 `docs/data-source-of-truth.md` 或同等文档，按数据类别列出 canonical source、维护方式、消费者和验证命令。
  - [x] 明确 `source-placeable-items.ts`、`source-placeable-item-translations.ts`、`source-pokemon-portraits.ts`、`source-pokemon-preferences.ts` 是当前 repo 内的 committed TS source snapshots；若没有 repo-local 生成脚本，不得把它们描述为可自动再生成。
  - [x] 标注大型 audit/source artifacts：`docs/placeable-asset-*-audit-checklist.html` 为 reference-only，`assets/pokopia_image_sources/**` 为 runtime image source；二者都不得成为测试事实的第二来源。
- [x] 补强 runtime asset reference smoke (AC: 3, 4)
  - [x] 更新 `scripts/verify-runtime-assets.mjs`：除目录计数外，读取 built `scene-core` public API，验证 `assetCatalog[].thumbnailUrl`、`pokemonThemeCatalog[].portraitUrl`、`getAssetSkillMarkerIconUrl(assetSkillTypes)` 指向的文件在 source 和 Web build output 中都存在。
  - [x] 给脚本添加清晰失败信息，能指出缺失 URL、source path 或 output path；缺少 built core 时提示先运行 `pnpm --filter @pokopia-scene-editor/scene-core build`。
  - [x] 在 root `package.json` 增加明确的 `asset-references:smoke` 脚本，作为删除/移动 runtime assets 前的入口。
- [x] 保持 Web/core 读取边界 (AC: 2, 4, 6)
  - [x] 确认 `apps/web` 仍只通过 `@pokopia-scene-editor/scene-core` 获取 catalog、Pokemon theme、dimension 和 export summary 事实。
  - [x] 不迁移或复制 catalog、dimension、footprint、stacking、translation 事实到 Web local fixtures；若发现测试硬编码可由 core 派生的业务事实，优先记录给 Story 13.6，除非本 story 的 asset reference smoke 需要直接修。
  - [x] 保持 `SceneDocument v1` 字段不变；如果实现过程中发现必须改 schema，停止并先发起 course correction。
- [x] 验证 (AC: 1-6)
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core test`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/web test src/components/asset-picker/AssetPicker.test.tsx src/components/export-preview/ExportPreview.test.tsx src/io/image-export.test.ts`
  - [x] `pnpm run asset-references:smoke`
  - [x] `git diff --check`

### Review Findings

- [x] [Review][Patch] `asset-references:smoke` should explicitly execute the runtime asset verifier, not only rely on Web build coupling.
- [x] [Review][Patch] Runtime asset verifier should reject stale `scene-core` build output before comparing references.
- [x] [Review][Patch] Runtime asset verifier should handle malformed URL escapes and prevent `../` directory allowlist bypasses.

## Dev Notes

### Current State

- `packages/scene-core/src/domain/assets/catalog.ts` builds `assetCatalog` from `source-placeable-items.ts`, `source-placeable-item-translations.ts`, `source-pokemon-preferences.ts`, footprint overrides, stacking overrides and inline category/theme preference logic.
- `packages/scene-core/src/domain/assets/source-placeable-items.ts`, `source-placeable-item-translations.ts`, `source-pokemon-portraits.ts` and `source-pokemon-preferences.ts` are large committed TS snapshots. No repo-local generation script is currently tracked, so this story should document current reality instead of inventing a fake generated contract.
- `packages/scene-core/src/domain/scene/area.ts` owns dimension constants/helpers. Web tests and components should consume exported helpers instead of hardcoding 17x17 / 7x7 as standalone truth where practical; broad test de-duplication belongs to Story 13.6.
- `assets/pokopia_image_sources/**` is the runtime image source copied by `apps/web/vite.config.ts` into `apps/web/dist/assets/pokopia_image_sources/**` during build. `scripts/verify-runtime-assets.mjs` currently only compares image counts in known directories, so it can miss a catalog URL that points to a nonexistent file while counts still match.
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx` already proves catalog list and thumbnail rendering for selected/detail rows. `apps/web/src/components/export-preview/ExportPreview.test.tsx` already proves Pokemon portrait, material thumbnails, skill icons, preview grid and stacking/footprint export rendering. `apps/web/src/io/image-export.test.ts` covers DOM-to-image export options.

### Implementation Guardrails

- Prefer documentation and smoke coverage over moving business data in this story. Story 13.5 owns code-volume refactors, and Story 13.6 owns broad test de-duplication.
- Do not delete runtime image files unless the strengthened smoke and focused Web tests already prove no visible regression.
- Do not change `assetCatalog` ordering, filtering, asset ids, thumbnails, Pokemon keys, dimensions, footprint/stacking metadata, locale strings or export summary semantics unless an existing bug is discovered and covered by tests.
- Keep `scripts/verify-runtime-assets.mjs` dependency-free; it should run under Node after `scene-core` and Web build output exist.

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 13.4 AC and FR113/FR114 scope.
- `_bmad-output/planning-artifacts/prd.md` - Polish-stage repo boundary and no `SceneDocument v1` change constraint.
- `_bmad-output/planning-artifacts/architecture.md` - data and module boundary guidance for `apps/web` and `packages/scene-core`.
- `_bmad-output/implementation-artifacts/13-3-remove-worker-api-mcp-skill-code.md` - previous story completion; Worker/API/MCP/skill are gone and should not be restored for data cleanup.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-30T12:40:20+0800 - Created story from Epic 13.4 and moved tracker to `ready-for-dev`.
- 2026-05-30T12:40:52+0800 - Started `bmad-dev-story`; tracker moved to `in-progress`.
- 2026-05-30T12:43:13+0800 - Added data SSoT documentation, reference-aware runtime asset verification and root asset reference smoke; moved story to `review`.
- 2026-05-30T12:48:41+0800 - Addressed code review findings and moved story to `done`.

### Completion Notes List

- Added `docs/data-source-of-truth.md` with canonical data owners, snapshot policy, reference-only artifact rules and the runtime asset guard.
- `scripts/verify-runtime-assets.mjs` now validates asset catalog thumbnails, Pokemon portraits and skill marker icons against both source runtime images and Web build output, not just directory counts.
- Added `pnpm run asset-references:smoke` as the explicit pre-delete/pre-move runtime asset check.
- Code review fixes made the smoke explicitly execute the verifier and hardened stale-dist, malformed URL and directory traversal guardrails.
- No catalog data, asset ids, dimensions, Web UI behavior or `SceneDocument v1` schema shape were changed.

### File List

- `_bmad-output/implementation-artifacts/13-4-resource-data-single-source-of-truth-cleanup.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/data-source-of-truth.md`
- `package.json`
- `scripts/verify-runtime-assets.mjs`

### Change Log

- 2026-05-30: Created Story 13.4.
- 2026-05-30: Implemented Story 13.4 and moved status to `review`.
- 2026-05-30: Applied code review fixes and moved status to `done`.
