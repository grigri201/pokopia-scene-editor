# Story 11.4: 更新预览、图片导出、Worker/MCP/Codex skill parity

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want 预览、导出摘要、Worker、MCP 和 Codex skill 都复用同一套 stacking contract,
so that 承载/叠放关系不会在浏览器和 agent 工具之间漂移。

## Acceptance Criteria

1. Given scene 包含 plate+food 或 rug/mat/shoot/low-height surface overlap, When 用户打开俯视图、正视图或图片导出预览, Then 预览必须用上下半格或同等明确的上下分区表达 base/top 关系, And 每层素材清单仍按真实实例计数，不按 occupied cell 或 relation 计数。
2. Given Worker/MCP 调用 validate、recover 或 export summary, When scene 中存在合法 stacking relation, Then 响应必须包含与 web direct-call tests 一致的 derived stacking relation 或 summary field, And 不把 relation 写回 SceneDocument payload。
3. Given scene 被保存、自动保存或编码为 PSE1 短字符串, When 用户 roundtrip 或 decode/recover, Then payload/string 不包含 stacking relation、surface id、z-index 或 parent instance id, And recover 后通过当前 catalog 与 `scene-core` stacking helpers 重新派生相同结果。
4. Given release gate 运行, When dev agent 完成 Epic 11, Then `pnpm run release:verify` 必须通过, And 覆盖 catalog stacking metadata、scene-core compatibility helpers、web placement/canvas/inspector、preview/export、Worker routes、MCP smoke、short string codec 和 skill examples。

## Tasks / Subtasks

- [x] 扩展 scene-core export summary stacking contract (AC: 1-3)
  - [x] `buildImageExportSummary()` 从 `buildSceneOccupancy(scene).stackingRelations` 派生 summary 字段，不写入 SceneDocument。
  - [x] 每个 stacking relation 暴露 base/top instance id、asset id、building level、surface kind、coordinates 和显示素材信息。
  - [x] 每个 cell 能引用相关 stacking relation，供图片导出预览上下半格渲染。
  - [x] 单层 materialCount/materials 继续按真实实例计数。
- [x] 更新 Web preview/export 渲染 (AC: 1)
  - [x] `PreviewInspector` 俯视图使用上下半格表达当前层 stacking relation。
  - [x] `PreviewInspector` 正视图用明确上下分区表达投影中的 stacking relation。
  - [x] `ExportPreview` 图片导出格子使用 export summary 的 stacking cell 字段渲染上下半格。
- [x] 更新 Worker/MCP parity (AC: 2-3)
  - [x] HTTP validate/recover/export-summary 对合法 stacking scene 与 scene-core direct call 对齐。
  - [x] MCP validate/recover/summarize_scene_export 对合法 stacking scene 与 scene-core direct call 对齐。
  - [x] HTTP/MCP structured errors 继续透传 `surfaceKind` 等 stacking conflict 字段。
- [x] 更新 Codex skill examples/docs (AC: 2,4)
  - [x] skill workflow 文档说明 export summary 包含 derived `stackingRelations`。
  - [x] summarize export example 包含 stacking relation 字段边界。
- [x] 增加回归测试并验证 (AC: 1-4)
  - [x] scene-core export-summary tests 覆盖 legal stacking summary、cell relation、material count 不膨胀。
  - [x] Web PreviewInspector/ExportPreview tests 覆盖上下半格 stacking data。
  - [x] Worker HTTP/MCP tests 覆盖 validate/recover/export summary parity 和 payload 不写入 relation。
  - [x] 运行 targeted tests、`pnpm run typecheck`、`git diff --check`。
  - [x] Epic 11 完成前运行 `pnpm run release:verify`。

## Dev Notes

- Story 11.1 已将 stacking metadata 放入 catalog，并要求 Codex skill 不复制规则。[Source: _bmad-output/implementation-artifacts/11-1-asset-catalog-stacking-surface-metadata.md]
- Story 11.2 已将合法 relation 与 stacking conflict 统一派生在 `scene-core` occupancy helpers，`SceneDocument` 不保存 relation 字段。[Source: _bmad-output/implementation-artifacts/11-2-scene-core-stacking-compatibility-rules.md]
- Story 11.3 已在 Web placement/canvas/inspector 使用上下半格显示 active canvas stacking relation；11.4 应复用同一契约到 preview/export/Worker/MCP，不重新实现 stacking 判断。[Source: _bmad-output/implementation-artifacts/11-3-web-stacking-placement-feedback.md]
- Export summary 当前入口是 `packages/scene-core/src/domain/scene/export-summary.ts`，Worker HTTP/MCP 都调用 `buildImageExportSummary()`，因此 derived summary 字段应优先在 scene-core 中添加。[Source: packages/scene-core/src/domain/scene/export-summary.ts; apps/worker/src/routes/scene.ts; apps/worker/src/mcp.ts]
- Preview inspector 当前从 `buildSceneOccupancy(scene)` 派生 footprint/height-blocking overlay，可在同一视图模型中加入 stacking relation，不写入 UI preferences 或 scene storage。[Source: apps/web/src/components/preview-inspector/PreviewInspector.tsx]
- Image export preview 当前消费 `ImageExportSummary`，每层素材清单来自 layer materials，图形格来自 `cells`。新增 stacking cell 字段不得改变 materials/materialCount 计数语义。[Source: apps/web/src/components/export-preview/ExportPreview.tsx]
- PSE1 string codec 和 roundtrip 已覆盖不保存 stacking relation；11.4 应通过 Worker/MCP parity tests 证明 recover/export re-derives relation。[Source: packages/scene-core/src/io/scene-string-codec.test.ts; packages/scene-core/src/io/scene-roundtrip.test.ts]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/domain/scene/export-summary.ts`
  - `packages/scene-core/src/domain/scene/export-summary.test.ts`
  - `apps/web/src/components/preview-inspector/PreviewInspector.tsx`
  - `apps/web/src/components/preview-inspector/PreviewInspector.test.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - `apps/web/src/styles.css`
  - `apps/worker/src/api-result.ts`
  - `apps/worker/src/routes/scene.ts`
  - `apps/worker/src/index.test.ts`
  - `apps/worker/src/mcp.ts`
  - `apps/worker/src/mcp.test.ts`
  - `.agents/skills/pokopia-scene-worker/references/workflows.md`
  - `.agents/skills/pokopia-scene-worker/examples/summarize-export.md`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-11.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Stacking-surface-rules-live-in-the-asset-catalog-while-stacking-relations-are-derived]
- [Source: _bmad-output/implementation-artifacts/11-1-asset-catalog-stacking-surface-metadata.md]
- [Source: _bmad-output/implementation-artifacts/11-2-scene-core-stacking-compatibility-rules.md]
- [Source: _bmad-output/implementation-artifacts/11-3-web-stacking-placement-feedback.md]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created after Story 11.3 commit `f1c8ec0`.
- 2026-05-28: Started dev-story implementation and moved status to in-progress.
- 2026-05-28: Passed `pnpm --filter @pokopia-scene-editor/scene-core test -- export-summary`.
- 2026-05-28: Passed `pnpm --dir apps/web exec vitest run src/components/preview-inspector/PreviewInspector.test.tsx src/components/export-preview/ExportPreview.test.tsx`.
- 2026-05-28: Passed `pnpm --filter @pokopia-scene-editor/worker test -- index.test.ts mcp.test.ts`.
- 2026-05-28: Passed `pnpm run typecheck` and `git diff --check`.
- 2026-05-28: Code review found and fixed a front-view projection bug where a lower stacking relation could be shown while another same-column instance was the projected item.
- 2026-05-28: First `pnpm run release:verify` passed typecheck, tests, build, and Worker dry-run, then failed at smoke because `127.0.0.1:4173` was already in use.
- 2026-05-28: Passed standalone `pnpm run smoke` after the port was clear.
- 2026-05-28: Passed full second-run `pnpm run release:verify`.

### Review Findings

- [x] [Review][Patch] Front projection could show a stacking split for a lower-y relation even when another instance in the same x column was the projected item [apps/web/src/components/preview-inspector/PreviewInspector.tsx] — fixed by selecting a front stacking state only when the projected instance participates in that relation.

### Completion Notes List

- Export summary now exposes derived `stackingRelations` at summary/layer/cell levels while keeping material counts instance-based.
- PreviewInspector and ExportPreview render legal stacking as top/base split cells without storing relation fields in scene payloads.
- Worker HTTP and MCP routes return the shared export summary relation fields and preserve `surfaceKind` in structured validation errors.
- Pokopia Scene Worker skill docs/examples now direct agents to use MCP-provided `stackingRelations` instead of reconstructing base/top logic.
- Epic 11 release gate passed with `pnpm run release:verify`.

### Change Log

- 2026-05-28: Created Story 11.4 and moved status to in-progress.
- 2026-05-28: Implemented preview/export/Worker/MCP parity, applied code-review fix, and moved status to done.

### File List

- _bmad-output/implementation-artifacts/11-4-stacking-preview-export-worker-mcp-parity.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .agents/skills/pokopia-scene-worker/examples/summarize-export.md
- .agents/skills/pokopia-scene-worker/references/workflows.md
- apps/web/src/components/export-preview/ExportPreview.test.tsx
- apps/web/src/components/export-preview/ExportPreview.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.test.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.tsx
- apps/web/src/styles.css
- apps/worker/src/api-result.ts
- apps/worker/src/index.test.ts
- apps/worker/src/mcp.test.ts
- apps/worker/src/mcp.ts
- apps/worker/src/routes/scene.ts
- packages/scene-core/src/domain/scene/export-summary.test.ts
- packages/scene-core/src/domain/scene/export-summary.ts
