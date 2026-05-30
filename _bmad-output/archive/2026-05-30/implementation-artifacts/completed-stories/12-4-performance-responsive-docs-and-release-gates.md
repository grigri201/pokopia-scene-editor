# Story 12.4: Performance、responsive、docs 与 release gates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 发布维护者,
I want 17x17 尺寸扩展经过性能、响应式、文档和 release gate 验证,
so that 新默认尺寸不会破坏现有发布质量或 legacy 7x7 兼容性。

## Acceptance Criteria

1. Given dev agent 完成 Epic 12 实现, When `pnpm run release:verify` 运行, Then 必须通过 scene-core/web typecheck、unit tests、build、Playwright smoke、Worker runtime tests、MCP smoke 和 short string codec tests, And 覆盖 legacy 7x7 JSON、legacy PSE1 string、default 17x17 scene、export summary parity 和 image export preview。
2. Given 17x17 场景包含 10 个建筑层且每层最多 289 个素材实例, When 用户执行常见编辑、预览切换和图片导出, Then 编辑反馈、预览首帧和导出体验必须满足 NFR1、NFR2、NFR51, And 超过 1 秒的图片生成必须显示非阻塞进度或生成状态。
3. Given 响应式验证运行, When 检查 1440x900、1280x720、1024x768、768x1024 和 390x844, Then legacy 7x7 与 default 17x17 场景都不得出现不可理解的文本截断、控件遮挡、页面级横向滚动或移动端编辑入口。
4. Given 文档和示例更新, When 维护者阅读 README、skill examples、manual QA checklist 或 planning handoff, Then 下一步必须明确指向 `12-1-scene-core-dimension-contract-and-legacy-recovery`, And 文案必须说明本次目标是 `sceneSize=15x15`、`outerPadding=1`、`canvasSize=17x17`，不是 16x16。

## Tasks / Subtasks

- [x] 更新 release gate (AC: 1)
  - [x] `pnpm run release:verify` 包含 scene-core/web/worker typecheck 和 unit tests。
  - [x] `pnpm run release:verify` 显式覆盖 Playwright smoke、Worker runtime tests、MCP smoke、short string codec tests 和 skill verifier。
  - [x] release gate 不引入生产 Worker deploy；生产仍是 Cloudflare Pages static web deploy。
- [x] 补齐 performance 与响应式覆盖 (AC: 2, 3)
  - [x] 17x17 dense scene performance smoke 使用 10 层、每层 289 个素材实例，并验证 selection 响应目标。
  - [x] image export preview/download 覆盖非阻塞生成状态或 download pending state。
  - [x] Playwright 覆盖 1440x900、1280x720、1024x768、768x1024、390x844 下 default 17x17 与 legacy 7x7 场景不产生页面级横向滚动、关键控件遮挡或移动端编辑入口。
- [x] 更新维护文档和 manual QA checklist (AC: 4)
  - [x] `docs/功能验收-checklist.md` 从历史 5x5/7x7 当前目标更新为 default 15x15/17x17 + legacy 5x5/7x7。
  - [x] 文档说明本次目标不是 16x16，并指向 `12-1-scene-core-dimension-contract-and-legacy-recovery` 作为后续上下文入口。
  - [x] 确认 skill examples / planning handoff 已包含 default 15x15/17x17、legacy 5x5/7x7、不是 16x16，并明确指向 `12-1-scene-core-dimension-contract-and-legacy-recovery`。
- [x] 验证 (AC: 1-4)
  - [x] 运行 focused Playwright smoke。
  - [x] 运行 Worker runtime tests 和 MCP smoke。
  - [x] 运行 short string codec tests 和 skill verifier。
  - [x] 运行 `pnpm run release:verify`。
  - [x] 运行 `git diff --check`。

## Dev Notes

- Story 12.1-12.3 已完成 dimension contract、Web rendering 和 Worker/MCP/skill parity；本 story 应收口验证和文档，不再扩大 schema 或新增 SceneDocument v2。
- `release:verify` 当前生产目标仍是 static Pages web build；不得把 Worker deploy/dry-run 加入默认生产发布路径。
- NFR1 的自动化路径已有 `scene-selection-duration` performance measure，可在 dense 17x17 smoke 中收紧并继续使用。
- 响应式检查应覆盖 legacy 7x7 和 default 17x17 两类 scene，避免只验证新默认路径。

### Project Structure Notes

- Expected updates:
  - `package.json`
  - `apps/web/e2e/workbench-smoke.spec.ts`
  - `docs/功能验收-checklist.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-12.4]
- [Source: _bmad-output/planning-artifacts/epics.md#FR106-FR107]
- [Source: _bmad-output/planning-artifacts/epics.md#NFR48-NFR52]
- [Source: _bmad-output/planning-artifacts/architecture.md#Deployment-Architecture]
- [Source: apps/web/e2e/workbench-smoke.spec.ts]
- [Source: docs/功能验收-checklist.md]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-29: Story created from Epic 12 Story 12.4 and moved to in-progress.
- 2026-05-29: `pnpm --dir apps/web exec playwright test e2e/workbench-smoke.spec.ts --project=chromium -g "1000-instance|dense 17x17|previews and downloads|release viewport matrix"` passed.
- 2026-05-29: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/state/asset-instance-edit.test.ts --environment jsdom` passed.
- 2026-05-29: `pnpm --filter @pokopia-scene-editor/web test` passed.
- 2026-05-29: `pnpm run release:verify` passed after fixing a 17x17 Playwright label ambiguity with exact matching.
- 2026-05-29: `git diff --check` passed.

### Completion Notes List

- Release gate now covers Worker types generation checks, scene-core/web/worker typecheck, unit tests, short string codec tests, build, Playwright smoke, Worker MCP smoke, and skill verification without adding Worker deploy to the default production path.
- Playwright smoke now exercises 1000-instance and dense 10-layer x 289-instance 17x17 scenes, image export pending state, and default/legacy responsive matrices across desktop, tablet, and mobile viewports.
- Maintenance docs, skill examples, and planning handoff now point to the Story 12.1 dimension contract and state the current target as default 15x15/17x17 with legacy 5x5/7x7 support, not 16x16.

### Change Log

- 2026-05-29: Created Story 12.4 and started implementation.
- 2026-05-29: Completed release gates, performance/responsive coverage, docs handoff, and Epic 12 tracker closeout.

### File List

- _bmad-output/implementation-artifacts/12-4-performance-responsive-docs-and-release-gates.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/implementation-artifacts/12-2-web-canvas-preview-export-17x17-rendering.md
- _bmad-output/implementation-artifacts/12-3-short-string-worker-mcp-dimension-parity.md
- .agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md
- .agents/skills/pokopia-scene-worker/examples/summarize-export.md
- .agents/skills/pokopia-scene-worker/examples/validate-scene.md
- apps/web/e2e/workbench-smoke.spec.ts
- apps/web/src/components/app-shell/AppShell.tsx
- apps/web/src/components/export-preview/ExportPreview.test.tsx
- apps/web/src/components/scene-canvas/SceneCanvas.test.tsx
- apps/web/src/state/asset-instance-edit.test.ts
- docs/功能验收-checklist.md
- package.json
