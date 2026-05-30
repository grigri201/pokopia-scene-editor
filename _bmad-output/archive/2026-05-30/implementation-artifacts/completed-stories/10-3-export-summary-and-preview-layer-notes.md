# Story 10.3: 在导出摘要和图片导出预览中按层显示备注

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 导出预览在每层素材下方显示该层备注,
so that 其他人能按层阅读搭建说明。

## Acceptance Criteria

1. Given scene 中某个建筑层包含一条或多条备注, When build image export summary, Then 对应 layer summary 包含该层备注列表, And 备注按保存顺序输出。
2. Given 导出预览渲染某个有备注的建筑层, When 该层素材清单渲染完成, Then 素材清单下方显示该层备注区域。
3. Given 某层没有备注, When 导出预览和下载图片渲染该层, Then 不显示误导性的空备注内容。
4. Given Worker/MCP 调用 export summary, When scene 包含层备注, Then Web、Worker 和 MCP 的 layer notes 语义一致。

## Tasks / Subtasks

- [x] 在 export summary contract 中加入 layer notes (AC: 1, 3, 4)
  - [x] 扩展 `ImageExportLayerSummary`，按层输出 notes 列表。
  - [x] 备注保持用户原文和保存顺序，summary 构建不得 mutate `SceneDocument`。
  - [x] 无备注层输出空数组，避免 UI 或 API 产生假内容。
- [x] 在图片导出预览中显示层备注 (AC: 2, 3)
  - [x] 在每层素材清单下方渲染备注区，仅当该层有备注时显示。
  - [x] 备注正文以 React 文本节点渲染，HTML-like 文本不得执行或进入 alt/title。
  - [x] 补充 zh-CN/en-US 系统文案，备注正文不随 locale 翻译。
- [x] 覆盖 Web、Worker、MCP summary 语义一致性 (AC: 4)
  - [x] 增加 scene-core summary 单元测试。
  - [x] 增加 ExportPreview 测试，覆盖有备注、无备注和 unsafe text。
  - [x] 增加 Worker endpoint 与 MCP tool 测试，断言 summary notes 与 shared builder 一致。
- [x] 运行回归门禁 (AC: 1-4)
  - [x] 运行 `pnpm run typecheck`。
  - [x] 运行 `pnpm run test`。
  - [x] 运行 `pnpm run build`。
  - [x] 运行 `git diff --check`。

### Review Findings

- [x] [Review] shared export summary contract 无阻塞发现。
- [x] [Review] Web ExportPreview 安全渲染与 UX 无阻塞发现。
- [x] [Review] Worker/MCP parity 无阻塞发现。

## Dev Notes

- Story 10.1 已将 `BuildingLevel.notes` 纳入 `SceneDocument` schema、recovery、serializer 和 PSE1 短字符串；10.3 只能消费这个 contract，不再定义新字段。[Source: _bmad-output/implementation-artifacts/10-1-building-level-notes-data-contract.md]
- Story 10.2 已在编辑工作台通过 command layer 写入层备注，备注正文保持用户原文并以安全文本渲染；导出预览也要沿用同样的安全文本原则。[Source: _bmad-output/implementation-artifacts/10-2-edit-layer-notes-under-empty-selection.md]
- `buildImageExportSummary()` 位于 scene-core，Worker endpoint 和 MCP tool 已直接复用 shared builder；因此只要 summary contract 增加 layer notes，Web、Worker、MCP 应通过 shared tests 保持一致。[Source: packages/scene-core/src/domain/scene/export-summary.ts; apps/worker/src/index.ts; apps/worker/src/mcp.ts]
- `ExportPreview` 当前在每层图形右侧显示素材/技能清单，Story 10.3 的备注区应在 `.export-layer__materials` 下方，不应改变图形网格尺寸或在无备注层显示空备注内容。[Source: apps/web/src/components/export-preview/ExportPreview.tsx; apps/web/src/styles.css]
- UX 规格要求导出预览把层备注显示在该层素材清单下方，导出图片也应包含同样内容，因为下载图片使用 dialog DOM 作为截图来源。[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Approved-Course-Correction-2026-05-28-建筑层备注]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/domain/scene/export-summary.ts`
  - `packages/scene-core/src/domain/scene/export-summary.test.ts`
  - `apps/web/src/components/export-preview/ExportPreview.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/styles.css`
  - `apps/worker/src/index.test.ts`
  - `apps/worker/src/mcp.test.ts`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.3]
- [Source: packages/scene-core/src/domain/scene/export-summary.ts]
- [Source: apps/web/src/components/export-preview/ExportPreview.tsx]
- [Source: apps/worker/src/index.ts]
- [Source: apps/worker/src/mcp.ts]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created after Story 10.2 commit `9de1863`.
- 2026-05-28: Started dev-story implementation and marked tracker in-progress.
- 2026-05-28: Passed focused scene-core export-summary, web ExportPreview, and worker HTTP/MCP tests.
- 2026-05-28: Passed `pnpm run typecheck`.
- 2026-05-28: Passed `pnpm run test`.
- 2026-05-28: Passed `pnpm run build`.
- 2026-05-28: Passed `git diff --check`.

### Completion Notes List

- Added ordered, cloned layer notes to `ImageExportLayerSummary` so Web, Worker, and MCP summaries share the same contract.
- Rendered layer notes below each layer material list in export preview, only for layers with notes and using React text nodes for user content.
- Added zh-CN/en-US export-note labels and compact styling that wraps long note text.
- Added scene-core, ExportPreview, Worker endpoint, and MCP tool coverage for layer notes parity.

### Change Log

- 2026-05-28: Created Story 10.3 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented Story 10.3, completed code review with no blocking findings, and moved status to done.

### File List

- _bmad-output/implementation-artifacts/10-3-export-summary-and-preview-layer-notes.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/components/export-preview/ExportPreview.test.tsx
- apps/web/src/components/export-preview/ExportPreview.tsx
- apps/web/src/i18n/index.ts
- apps/web/src/styles.css
- apps/worker/src/index.test.ts
- apps/worker/src/mcp.test.ts
- packages/scene-core/src/domain/scene/export-summary.test.ts
- packages/scene-core/src/domain/scene/export-summary.ts
