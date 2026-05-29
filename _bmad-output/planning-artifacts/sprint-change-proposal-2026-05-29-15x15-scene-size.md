# Sprint Change Proposal - 15x15 Scene Size 与 17x17 编辑画布

**日期:** 2026-05-29
**项目:** pokopia-scene-editor
**触发方式:** 用户通过 `bmad-correct-course` / `bmad-current-course` 要求扩大编辑区域，并澄清目标为 `sceneSize=15x15`、`outerPadding=1`。
**执行模式:** Batch
**状态:** Approved by current user request

## 1. Issue Summary

当前产品、规划文档和实现都围绕固定 7x7 实际编辑画布建立：中心 5x5 主体区、外围 1 圈装饰区、`sceneSize=5x5`、`canvasSize=7x7`、`outerPadding=1`。现在需要把主体布景尺寸扩大到 `sceneSize=15x15`，并继续保留 `outerPadding=1`。

按现有尺寸公式 `canvasSize = sceneSize + outerPadding * 2`，该目标意味着实际可编辑画布应为 `17x17`，坐标范围从 `0..16`。这不是单纯 UI 尺寸调整。`packages/scene-core` 的 area/domain constants、Zod schema、坐标范围、默认 scene、PSE1 短字符串 codec、恢复校验、export summary、Web canvas、Preview/Export、Worker/MCP 和大量测试都显式或隐式依赖 7x7。

## 2. Impact Analysis

**Epic Impact:** Epic 1-11 已全部完成，不能重写历史完成记录。该变更应新增 Epic 12，作为完成基线后的尺寸扩展 course correction。

**Story Impact:** 需要新增尺寸模型/schema story、Web canvas/preview/export story、短字符串/Worker/MCP parity story、性能/文案/验收 story。旧 Story 1.3 的“固定 7x7”应保留为历史，不直接改写完成记录。

**PRD Impact:** 需要把产品定位从“5x5 布景 + 7x7 实际画布”更新为默认 `15x15 sceneSize + 17x17 canvasSize`，并明确主体区、外围区和旧 7x7 数据恢复策略。FR2/FR3/FR42/FR55/FR67/FR80 及相关 NFR1/NFR2/NFR8/NFR21/NFR29 需要调整。

**UX Impact:** 中央画布从 49 格变为 289 格，三栏工作台和左下预览不能再按 7x7 视觉密度设计。需要支持更小单格、滚动/缩放或稳定自适应，否则 1280x720 会挤压侧栏和检查器。画布、俯视图、导出图层图形和无障碍标签必须改为尺寸驱动文案。

**Architecture Impact:** 当前 `SceneDocument v1` 已包含 `sceneSize`、`canvasSize` 和 `outerPadding` 字段，因此可以不改变 JSON shape。但当前 schema 把这些值固定为 5/7/1，短字符串 codec 也没有编码尺寸。实现需要把维度变成 scene-core 的权威字段，并解决旧 PSE1 字符串的 legacy 解码。

**Technical Evidence:**

- `packages/scene-core/src/domain/scene/area.ts` 固定 `sceneSize=5`、`outerPadding=1`、`canvasSize=7`。
- `packages/scene-core/src/io/scene-schema.ts` 固定要求 5x5、7x7，并把坐标 max 固定为 6。
- `packages/scene-core/src/io/scene-string-codec.ts` 硬编码 5x5/7x7/1，短字符串不保存尺寸。
- `apps/web/src/theme/tokens.ts` 固定 `gridTokens.sceneSize=5`、`canvasSize=7`。
- Web i18n、AppShell aria-label、Preview/Export tests、SEO 文案和 docs 都有 7x7 字样。

## 3. Recommended Approach

选择 **新增 Epic 12：15x15 Scene Size 与 17x17 编辑画布兼容迁移**。

推荐尺寸解释：

- 新建 scene 默认使用 `sceneSize=15x15`、`outerPadding=1`。
- 按当前尺寸公式派生 `canvasSize=17x17`。
- 所有 17x17 格子仍可编辑；中心 15x15 为 `main`，外围 1 圈为 `outer`。
- `SceneDocument v1` JSON shape 保持不变，但 schema 从“固定 7x7”调整为“支持受控尺寸集合/尺寸一致性校验”。
- 旧 7x7 JSON payload 保持可恢复，不静默改写坐标或 areaType；新建场景默认 `sceneSize=15x15`、`canvasSize=17x17`。
- 新短字符串必须编码尺寸或使用新 codec revision；旧 PSE1 继续按 legacy 7x7 解码，避免把旧字符串误解释成 17x17。

不推荐直接把所有 7x7 常量改成 17x17 后收工，因为这会让旧保存数据、旧短字符串、areaType 校验和导出语义产生隐性破坏。

### Alternatives Considered

**Alternative A: 总画布 16x16。**
该方案不再适用，因为用户已澄清目标是 `sceneSize=15x15`、`outerPadding=1`。按当前模型这会自然派生 `canvasSize=17x17`，不是 16x16。

**Alternative B: 17x17 全部作为 main 区域，`outerPadding=0`。**
实现较直接，但会删除 main/outer 的核心产品语义，影响素材筛选、区域说明、预览和导出解释。

**Alternative C: 只改视觉显示，把 7x7 CSS 放大。**
不满足“`sceneSize=15x15`、`outerPadding=1`”，因为业务坐标、保存、恢复、导出和 Worker/MCP 仍是 7x7。

## 4. Detailed Change Proposals

### PRD

OLD:

```text
产品以 7×7 实际编辑画布承载中心 5×5 主体区和外围一圈装饰区。
```

NEW:

```text
产品默认以 17×17 实际编辑画布承载中心 15×15 主体区和外围一圈装饰区；旧 7×7 SceneDocument v1 数据仍可按保存时的尺寸恢复。
```

Required PRD edits:

- 新增 Approved Course Correction - 2026-05-29 15x15 scene size / 17x17 编辑画布。
- 更新 FR2/FR3/FR42/FR55/FR67/FR80 中的固定 7x7 说法。
- 新增 FR101-FR108，覆盖默认 15x15 scene size、17x17 canvas、受控尺寸恢复、PSE legacy 解码、Worker/MCP parity、导出/预览尺寸驱动文案。
- 新增 NFR48-NFR52，覆盖 289-cell 性能、响应式不重叠、旧 7x7 数据兼容、短字符串版本兼容和导出可读性。

### UX

OLD:

```text
Scene Canvas 承载固定 7×7 编辑画布，并持续表达中心 5×5 主体区和外围装饰区。
```

NEW:

```text
Scene Canvas 承载默认 17×17 编辑画布，并以尺寸驱动方式表达中心 15×15 主体区、外围装饰区、坐标、footprint、stacking 和 height blocking。
```

Required UX edits:

- 把“固定 7x7”替换为“默认 17x17 / 尺寸驱动画布”，同时明确 `sceneSize=15x15`、`outerPadding=1`。
- 为 289 格桌面编辑定义缩放、滚动或稳定压缩策略；不得让素材栏、层面板、检查器覆盖核心画布。
- Preview Inspector 和 Export Preview 使用 `{width}x{height}` 文案，不再写死 7x7。
- Mobile View-only Mode 允许查看/缩放 17x17，但仍禁止 scene mutation。

### Architecture

OLD:

```text
Scene & Canvas Model：固定 7x7 实际编辑画布、中心 5x5 主体区、外围 1 圈装饰区。
```

NEW:

```text
Scene & Canvas Model：SceneDocument v1 通过 sceneSize/canvasSize/outerPadding 表达尺寸；新建 scene 默认 15x15 scene、17x17 canvas、1 圈 outer，legacy 7x7 payload 按原尺寸恢复。
```

Required architecture edits:

- `scene-core` dimensions must be data-driven from `SceneDocument` for validation, area type, selectors, footprint bounds, occupancy, stacking and export summary.
- Zod schema must validate dimensions consistently instead of using coordinate max 6.
- `createTileInstance` / skill marker helpers must receive scene dimensions where needed, or avoid hardcoded default dimensions in paths that operate on non-default scenes.
- PSE short string must either add dimension fields or introduce a new codec revision; legacy PSE1 remains 7x7.
- Worker/MCP/Codex skill must report dimensions in structured output and avoid fixed 7x7 examples except legacy examples.

### Epics & Sprint Status

Add Epic 12:

```text
Epic 12: 15x15 Scene Size 与 17x17 编辑画布兼容迁移
```

Proposed stories:

```text
12-1-scene-core-dimension-contract-and-legacy-recovery
12-2-web-canvas-preview-export-17x17-rendering
12-3-short-string-worker-mcp-dimension-parity
12-4-performance-responsive-docs-and-release-gates
```

`sprint-status.yaml` should add `epic-12` and stories as `backlog` only after this proposal is approved.

## 5. Checklist Result

- [x] 1.1 Trigger story/context identified: no active story; this is a new stakeholder requirement after Epic 11 completion.
- [x] 1.2 Core problem defined: fixed 7x7 canvas no longer meets requested `sceneSize=15x15` and `outerPadding=1`.
- [x] 1.3 Evidence captured: planning docs and implementation hardcode 7x7 in domain constants, schema, codec, UX and tests.
- [x] 2.1 Current epic assessment: all existing epics are done; none should be reopened.
- [x] 2.2 Epic change needed: add Epic 12.
- [x] 2.3 Remaining epics reviewed: no active backlog exists after Epic 11.
- [x] 2.4 Future epics: Epic 12 fills the new size requirement.
- [x] 2.5 Priority: Epic 12 should become the next backlog item if approved.
- [x] 3.1 PRD conflicts identified: many fixed 5x5/7x7 requirements need revision.
- [x] 3.2 Architecture conflicts identified: fixed default dimensions, schema max 6, PSE codec hardcoding and helpers using default dimensions.
- [x] 3.3 UX conflicts identified: 289-cell canvas needs new layout/readability treatment.
- [x] 3.4 Secondary artifacts identified: docs, checklist, SEO/i18n copy, tests, Worker/MCP examples.
- [x] 4.1 Direct Adjustment viable: medium-high effort, medium-high risk.
- [x] 4.2 Rollback not viable: completed work remains valid as legacy behavior and should not be reverted.
- [x] 4.3 MVP review needed only for size semantics, not for reducing scope.
- [x] 4.4 Recommended path selected: new Epic 12 with v1 shape preservation and legacy compatibility.
- [x] 5.1-5.5 Proposal, impact, action plan and handoff documented.
- [x] 6.1-6.2 Proposal reviewed for consistency.
- [x] 6.3 Approval captured from current user confirmation (`C`).
- [x] 6.4 Sprint status update approved; planning artifacts and tracker must add Epic 12 backlog entries.

## 6. Implementation Handoff

If approved, update artifacts in this order:

1. PRD: add course correction, FR101-FR108, NFR48-NFR52, update fixed 7x7 language.
2. Architecture: update Scene & Canvas Model, data boundaries, codec/versioning, Worker/MCP parity and test gates.
3. UX: update Scene Canvas, Preview, Export, responsive strategy and accessibility language.
4. Epics: add Epic 12 and four stories.
5. Sprint Plan: add `epic-12` and story keys as `backlog`.

Recommended next command after approval:

```text
bmad-create-story 12-1-scene-core-dimension-contract-and-legacy-recovery
```
