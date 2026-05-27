# Story 8.5: 保存、短字符串、Worker/MCP/Codex skill 规则一致性门禁

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want 保存/恢复、短字符串、Worker、MCP 和 Codex skill 都通过同一组 footprint 契约测试,
so that 后续不会出现 schema 或规则漂移。

## Acceptance Criteria

1. Given 一个包含 1x1、2x1、1x2 和 height > 1 素材的 shared fixture, When scene-core unit tests、web tests、Worker tests 和 MCP smoke 运行, Then 它们必须对 occupied cells、blocking cells、validation errors 和 export summary 得到一致结果。
2. Given scene 被保存或自动保存, When 系统序列化 `SceneDocument v1`, Then payload 不包含 footprint、effectiveFootprint、occupiedCells 或 blocking cells, And roundtrip 后通过当前 catalog 重新派生相同结果。
3. Given scene 被编码为 PSE1 短字符串, When 用户 decode 该字符串, Then 字符串不包含 footprint 字段, And decode/recover 后仍通过当前 `scene-core` footprint rules 校验。
4. Given Codex skill 示例调用 MCP, When 执行 validate scene、recover scene、summarize export 或 search assets, Then skill 输出必须把 MCP structuredContent 作为权威结果, And 不得在 skill 文档或示例中复制 footprint 规则。
5. Given release gate 运行, When dev agent 完成 Epic 8, Then `pnpm run release:verify` 必须通过, And 覆盖 footprint catalog、occupancy helpers、web canvas、preview/export、Worker routes、MCP smoke、short string codec 和 skill examples。

## Tasks / Subtasks

- [x] 增加共享 footprint contract fixture (AC: 1)
  - [x] 在 `packages/scene-core` 可被 workspace consumers 导入的位置创建 fixture helper，包含 1x1、2x1、1x2、90/270 旋转交换和 height > 1 素材。
  - [x] fixture 必须是合法 `SceneDocument v1`，且 expected occupied/blocking/effective footprint 结果可被各端测试复用。
  - [x] 增加 invalid overlap / height-blocking variant，验证错误字段包含 conflict type、触发 instance、blocking instance、building level 和坐标集合。
- [x] 补齐 scene-core 保存、恢复、短字符串和 export-summary 契约测试 (AC: 1, 2, 3)
  - [x] `scene-core` occupancy/schema/export-summary tests 使用共享 fixture 校验 occupied cells、blocking cells、validation errors 和 export summary parity。
  - [x] serializer/roundtrip tests 校验保存 payload 不包含 `footprint`、`effectiveFootprint`、`occupiedCells`、`blockingCells`。
  - [x] short string tests 校验 PSE1 字符串不包含 footprint 派生字段，decode/recover 后重新派生相同 occupancy。
- [x] 补齐 Web storage / UI contract tests (AC: 1, 2)
  - [x] Web storage/autosave tests 使用共享 fixture 写入 saved/autosave slot，并确认 raw localStorage payload 不包含派生 footprint fields。
  - [x] Web component/E2E tests 对同一 fixture 至少覆盖 canvas footprint overlay、preview/export footprint overlay 或现有测试的共享 fixture 对齐。
- [x] 补齐 Worker HTTP / MCP parity tests (AC: 1, 3, 4)
  - [x] Worker HTTP tests 使用共享 fixture 调用 validate、recover、export-summary、encode/decode，并与 direct `scene-core` 结果对齐。
  - [x] MCP tests 使用同一 fixture 调用 validate/recover/summarize/search assets，并确认 structuredContent 使用 `scene-core` output，不返回 generic-only validation failed。
  - [x] tests 必须覆盖 90/270 旋转 length/width 交换、同层 overlap、height 跨层阻塞、短字符串 roundtrip 和 export-summary parity。
- [x] 加强 Codex skill 示例/verify 门禁 (AC: 4)
  - [x] `.agents/skills/pokopia-scene-worker` 示例继续要求调用 MCP structuredContent，不复制 schema、catalog override、occupancy 或 export summary 规则。
  - [x] `scripts/verify-pokopia-scene-worker-skill.mjs` 增加 footprint/structuredContent/no-copy 断言，避免 skill docs 漂移。
- [x] 跑完 release gate 并关闭 Epic 8 (AC: 5)
  - [x] 运行 `pnpm run typecheck`。
  - [x] 运行 `pnpm run test`。
  - [x] 运行 `pnpm run release:verify`。
  - [x] 将 story 状态推进到 `review`，并把 `sprint-status.yaml` 中 `8-5-footprint-contract-parity-gates` 更新为 `review`。
  - [x] code review 后如无未解决问题，将 `8-5-footprint-contract-parity-gates` 和 `epic-8` 更新为 `done`。

## Dev Notes

- Story 8.5 是 Epic 8 的 parity/release gate story。不要新增 `SceneDocument v2`、保存 blocking cells、实例级 footprint override、服务端图片生成、账号、云保存或分享功能。[Source: _bmad-output/planning-artifacts/epics.md#Story-8.5; _bmad-output/planning-artifacts/architecture.md#Implementation-Handoff]
- 8.1 已加入 catalog-level `AssetDefinition.footprint`，真实 fixture 可使用 `leafy-plant` 1x1x1、`wooden-bench` 2x1x1、`large-narrow-rug` 1x2x1、`large-boulder` 2x1x2。[Source: _bmad-output/implementation-artifacts/8-1-asset-catalog-footprint-metadata.md]
- 8.2 已实现 `buildSceneOccupancy`、`validateSceneOccupancy`、`evaluateScenePlacementFootprint` 和恢复/短字符串 footprint validation。8.5 应复用这些 helpers，不在 Worker/MCP/Codex skill 中复制规则。[Source: _bmad-output/implementation-artifacts/8-2-scene-core-footprint-occupancy-rules.md]
- 8.3/8.4 已让 Web canvas、preview inspector、export preview 和 export summary 使用 footprint/occupancy 语义。8.5 应把这些结果锁进跨端测试和 release gate，而不是重做渲染。[Source: _bmad-output/implementation-artifacts/8-3-web-placement-canvas-footprint-feedback.md; _bmad-output/implementation-artifacts/8-4-preview-export-footprint-rendering.md]
- PRD 要求 `SceneDocument v1` 仍是当前 schema；保存/恢复和 PSE1 短字符串不得编码 footprint 或 blocking cells，decode 后通过当前 catalog 和 `scene-core` occupancy rules 重新派生。[Source: _bmad-output/planning-artifacts/prd.md#FR84; _bmad-output/planning-artifacts/prd.md#NFR37-NFR38]
- PRD 要求 Worker validate/recover/export-summary、MCP tools/resources/prompts 和 Codex skill 调同一套 `scene-core` helpers，不得复制 schema、catalog override、占用计算或跨层阻塞规则。[Source: _bmad-output/planning-artifacts/prd.md#FR85]
- NFR39/NFR40 明确要求同一个 footprint fixture 覆盖 90/270 度 length/width 交换、同层重叠、height 跨层阻塞、短字符串 roundtrip 和 export-summary parity，且错误不能只有 generic validation failed。[Source: _bmad-output/planning-artifacts/prd.md#NFR39-NFR40]
- 当前 release gate 是 `pnpm run release:verify`，会串行执行 typecheck、test、build、smoke、worker types check、worker dry-run、MCP smoke、bundle check 和 skill verify。[Source: package.json]
- 当前 skill verifier 已检查 `.agents/skills/pokopia-scene-worker` 不导入 scene-core、不定义 copied schema/catalog/export-summary；8.5 可扩展它检查 footprint/no-copy/structuredContent 文案。[Source: scripts/verify-pokopia-scene-worker-skill.mjs]

### Previous Story Intelligence

- Story 8.4 commit `a8a5d3a` 已让 export summary 每个实例包含 `footprint`、`effectiveFootprint`、`occupiedCells`、`blockingCells` 和 `footprintWarnings`。
- Story 8.4 full validation 已通过 `pnpm --filter @pokopia-scene-editor/scene-core test -- export-summary`、`pnpm --filter @pokopia-scene-editor/web test -- PreviewInspector ExportPreview`、`pnpm run typecheck` 和 `pnpm run test`。
- Story 8.4 页面级检查使用 Vite dev server 验证导出预览 dialog、49 格 layer grid 和无 alert。

### Project Structure Notes

- Likely updates:
  - `packages/scene-core/src/domain/scene/footprint-contract-fixture.ts`
  - `packages/scene-core/src/domain/scene/index.ts`
  - `packages/scene-core/src/domain/scene/occupancy.test.ts`
  - `packages/scene-core/src/domain/scene/export-summary.test.ts`
  - `packages/scene-core/src/io/scene-serializer.test.ts`
  - `packages/scene-core/src/io/scene-roundtrip.test.ts`
  - `packages/scene-core/src/io/scene-string-codec.test.ts`
  - `apps/web/src/io/scene-storage.test.ts`
  - `apps/web/src/components/scene-canvas/SceneCanvas.test.tsx`
  - `apps/web/src/components/preview-inspector/PreviewInspector.test.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - `apps/worker/src/index.test.ts`
  - `apps/worker/src/mcp.test.ts`
  - `.agents/skills/pokopia-scene-worker/examples/*.md`
  - `scripts/verify-pokopia-scene-worker-skill.mjs`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.5]
- [Source: _bmad-output/planning-artifacts/prd.md#FR84-FR86]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR34-NFR35-NFR37-NFR40]
- [Source: _bmad-output/planning-artifacts/architecture.md#API-Communication-Patterns]
- [Source: packages/scene-core/src/domain/scene/occupancy.ts]
- [Source: packages/scene-core/src/io/scene-serializer.ts]
- [Source: packages/scene-core/src/io/scene-string-codec.ts]
- [Source: apps/worker/src/index.test.ts]
- [Source: apps/worker/src/mcp.test.ts]
- [Source: scripts/verify-pokopia-scene-worker-skill.mjs]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-27: Story created after Story 8.4 commit `a8a5d3a`.
- 2026-05-27: Started dev-story implementation and marked tracker in-progress.
- 2026-05-27: Added shared scene-core footprint contract fixture with legal, overlap, and height-blocked variants.
- 2026-05-27: Passed `pnpm --filter @pokopia-scene-editor/scene-core test -- occupancy export-summary scene-serializer scene-roundtrip scene-string-codec`.
- 2026-05-27: Passed `pnpm --filter @pokopia-scene-editor/web test -- scene-storage PreviewInspector ExportPreview`.
- 2026-05-27: Passed `pnpm --filter @pokopia-scene-editor/worker test -- index mcp`.
- 2026-05-27: Passed `pnpm run skill:verify`.
- 2026-05-27: Passed `pnpm run typecheck`.
- 2026-05-27: Passed `pnpm run test`.
- 2026-05-27: Passed `pnpm run release:verify`.
- 2026-05-27: bmad-code-review found HTTP validation envelope, validate redaction, skill conflict-field, and verifier false-positive risks.
- 2026-05-27: Fixed review findings by preserving all HTTP validation errors, redacting validate responses, preserving full MCP error objects in skill docs, narrowing verifier forbidden patterns, and adding 270-degree fixture coverage.
- 2026-05-27: Passed `pnpm --filter @pokopia-scene-editor/worker test -- index mcp`.
- 2026-05-27: Passed `pnpm --filter @pokopia-scene-editor/web test -- scene-storage PreviewInspector ExportPreview`.
- 2026-05-27: Re-ran and passed `pnpm run release:verify` after review fixes.

### Completion Notes List

- Added a shared footprint contract fixture exported from `scene-core`, including valid, overlap-conflict, and height-blocking scenes.
- Locked scene-core serialization, roundtrip, short-string, occupancy, and export-summary behavior against the shared fixture without persisting derived footprint fields.
- Aligned Web storage, preview inspector, and export preview tests to the same contract fixture.
- Extended Worker HTTP and MCP tests so validate/recover/export-summary/encode/decode preserve structured footprint results and validation details, including multi-conflict HTTP error envelopes.
- Hardened the Pokopia Scene Worker skill docs and verifier so skill examples rely on MCP `structuredContent`, preserve full `errors[]`, and avoid copied footprint rules.
- Resolved all code-review findings and closed Epic 8.
- Completed full release verification for Epic 8.

### Change Log

- 2026-05-27: Created Story 8.5 and moved status to ready-for-dev.
- 2026-05-27: Started implementation and moved status to in-progress.
- 2026-05-27: Implemented footprint contract parity gates and moved status to review.
- 2026-05-27: Fixed code-review findings and moved status to done.

### File List

- .agents/skills/pokopia-scene-worker/SKILL.md
- .agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md
- .agents/skills/pokopia-scene-worker/examples/summarize-export.md
- .agents/skills/pokopia-scene-worker/examples/validate-scene.md
- .agents/skills/pokopia-scene-worker/references/workflows.md
- _bmad-output/implementation-artifacts/8-5-footprint-contract-parity-gates.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/components/export-preview/ExportPreview.test.tsx
- apps/web/src/components/preview-inspector/PreviewInspector.test.tsx
- apps/web/src/io/scene-storage.test.ts
- apps/worker/src/api-result.ts
- apps/worker/src/index.ts
- apps/worker/src/index.test.ts
- apps/worker/src/mcp.test.ts
- apps/worker/src/mcp.ts
- apps/worker/src/request.ts
- apps/worker/src/routes/scene.ts
- packages/scene-core/src/domain/scene/export-summary.test.ts
- packages/scene-core/src/domain/scene/footprint-contract-fixture.ts
- packages/scene-core/src/domain/scene/index.ts
- packages/scene-core/src/domain/scene/occupancy.test.ts
- packages/scene-core/src/io/scene-roundtrip.test.ts
- packages/scene-core/src/io/scene-serializer.test.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
- scripts/verify-pokopia-scene-worker-skill.mjs
