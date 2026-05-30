# Story 10.4: 层备注短字符串、测试和发布门禁

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want 层备注在保存、短字符串、Worker/MCP 和导出中有一致测试,
so that 后续不会丢失用户填写的层级说明。

## Acceptance Criteria

1. Given scene 包含多层、多条层备注和 HTML-like 文本, When scene-core roundtrip、PSE1 encode/decode、web tests、Worker tests 和 MCP smoke 运行, Then 层备注数量、顺序和正文保持一致, And 不执行 HTML。
2. Given 旧 PSE1 短字符串不包含层备注字段, When decode/recover 执行, Then 每层恢复 `notes: []`, And 不破坏现有素材、技能、footprint 和 selected coordinate 语义。
3. Given release gate 运行, When dev agent 完成 Epic 10, Then `pnpm run release:verify` 必须通过, And 覆盖 scene-core schema、commands、short string codec、SelectionInspector、ExportPreview、Worker export summary、MCP summarize 和 i18n 文案。

## Tasks / Subtasks

- [x] 补齐 scene-core parity 测试 (AC: 1, 2)
  - [x] 增加多层、多备注、HTML-like 文本的 `SceneDocument v1` roundtrip 覆盖。
  - [x] 增加多层、多备注、HTML-like 文本的 PSE1 encode/decode 覆盖，确认备注顺序和正文保留。
  - [x] 增加旧 PSE1 无备注字段 decode 覆盖，确认 notes 默认 `[]` 且 selected coordinate / footprint 语义保留。
- [x] 补齐 Worker/MCP/Codex skill 摘要门禁 (AC: 1, 3)
  - [x] 加强 Worker export-summary 测试，覆盖多层、多备注和 HTML-like 文本。
  - [x] 加强 MCP summarize smoke 测试，覆盖多层、多备注和 HTML-like 文本。
  - [x] 更新 repo-scoped skill 摘要示例和 `skill:verify`，要求保留 layer summary `notes`。
- [x] 执行并记录 Epic 10 release gate (AC: 3)
  - [x] 运行 `pnpm run release:verify`。
  - [x] 运行 `git diff --check`。
  - [x] 完成 bmad-code-review 并修复发现。

### Review Findings

- [x] [Review] Worker/MCP parity gates 无阻塞发现。
- [x] [Review][Patch] Skill verify 对 `notes` 的检查过宽 — 已收紧为检查 `structuredContent.data.summary.layers[].notes` 出现在 summarize example 和 workflow reference。
- [x] [Review][Patch] legacy PSE1 测试依赖当前 encoder 无备注输出 — 已改为手动降级 level records 形成旧格式 fixture，并补充 unsafe image text 编码断言。

## Dev Notes

- Story 10.1 已实现 `BuildingLevel.notes` schema、recovery、serializer、PSE1 和 command layer；10.4 不应再改数据结构，只补 parity gate。[Source: _bmad-output/implementation-artifacts/10-1-building-level-notes-data-contract.md]
- Story 10.2 已覆盖 SelectionInspector/AppShell 编辑和只读展示，Story 10.3 已覆盖 ExportPreview、Worker endpoint 和 MCP summary；10.4 的重点是组合场景和 release gate。[Source: _bmad-output/implementation-artifacts/10-2-edit-layer-notes-under-empty-selection.md; _bmad-output/implementation-artifacts/10-3-export-summary-and-preview-layer-notes.md]
- `release:verify` 当前串联 typecheck、test、build、Playwright smoke、worker types/check、dry-run、MCP smoke、bundle check 和 skill verify；必须按 repo 脚本执行，不替换为局部命令。[Source: package.json]
- PSE1 旧 level record 没有 notes 段时必须恢复 `notes: []`；新 PSE1 备注段必须保留用户原文和顺序。[Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-28.md#Short-String-Worker-MCP]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/io/scene-roundtrip.test.ts`
  - `packages/scene-core/src/io/scene-string-codec.test.ts`
  - `apps/worker/src/index.test.ts`
  - `apps/worker/src/mcp.test.ts`
  - `.agents/skills/pokopia-scene-worker/examples/summarize-export.md`
  - `.agents/skills/pokopia-scene-worker/references/workflows.md`
  - `scripts/verify-pokopia-scene-worker-skill.mjs`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.4]
- [Source: package.json]
- [Source: packages/scene-core/src/io/scene-string-codec.test.ts]
- [Source: packages/scene-core/src/io/scene-roundtrip.test.ts]
- [Source: apps/worker/src/index.test.ts]
- [Source: apps/worker/src/mcp.test.ts]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created after Story 10.3 commit `782d38c`.
- 2026-05-28: Started dev-story implementation and marked tracker in-progress.
- 2026-05-28: Passed focused scene-core roundtrip/string-codec tests, Worker HTTP/MCP tests, and `pnpm run skill:verify`.
- 2026-05-28: First `pnpm run release:verify` exposed a stale Playwright smoke expectation for `buildingLevels[].notes`; updated the smoke assertion to the current SceneDocument v1 contract.
- 2026-05-28: Passed `pnpm run smoke`.
- 2026-05-28: Passed full `pnpm run release:verify`.
- 2026-05-28: Passed `git diff --check`.

### Completion Notes List

- Added combined multi-layer layer-note parity coverage across SceneDocument v1 roundtrip and PSE1 encode/decode, including HTML-like text and ordered notes.
- Added legacy PSE1 no-notes decode coverage that preserves selected coordinate and footprint-derived occupancy semantics.
- Strengthened Worker HTTP and MCP summary tests to assert multi-layer notes with HTML-like text match shared `buildImageExportSummary()`.
- Updated repo-scoped skill examples and verification so export summaries must preserve `structuredContent.data.summary.layers[].notes`.
- Updated Playwright smoke expectations for the current `BuildingLevel.notes: []` data contract and passed the full release gate.

### Change Log

- 2026-05-28: Created Story 10.4 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented Story 10.4, fixed code review findings, passed release gate, and moved status to done.

### File List

- _bmad-output/implementation-artifacts/10-4-layer-notes-parity-gates.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .agents/skills/pokopia-scene-worker/examples/summarize-export.md
- .agents/skills/pokopia-scene-worker/references/workflows.md
- apps/web/e2e/workbench-smoke.spec.ts
- apps/worker/src/index.test.ts
- apps/worker/src/mcp.test.ts
- packages/scene-core/src/io/scene-roundtrip.test.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
- scripts/verify-pokopia-scene-worker-skill.mjs
