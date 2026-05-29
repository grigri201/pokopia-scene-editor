# Story 12.1: Scene-core dimension contract 与 legacy recovery

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want `scene-core` 把 scene dimensions 变成唯一尺寸事实来源,
so that 新建 17x17 场景和 legacy 7x7 数据都能被同一套 schema、area、occupancy 和 codec 规则正确处理。

## Acceptance Criteria

1. Given 用户创建默认新场景, When `createDefaultSceneDocument` 或等效 factory 执行, Then SceneDocument 必须包含 `sceneSize: { width: 15, height: 15 }`、`outerPadding: 1` 和 `canvasSize: { width: 17, height: 17 }`, And 默认 coordinate range 为 `0..16`，主体区为 `1..15`。
2. Given schema 校验 SceneDocument v1, When payload 包含 scene dimensions, Then schema 必须校验 `canvasSize = sceneSize + outerPadding * 2`, And coordinate bounds、areaType 比对、footprint bounds、height blocking 和 stacking relation 都必须从 dimension helpers 派生，不得使用 hardcoded 7x7 或 max coordinate 6。
3. Given legacy 7x7 SceneDocument v1 JSON, When recover/validate 执行, Then 系统必须按其保存的 7x7 尺寸恢复和校验, And 不得静默改写坐标、`areaType`、`sceneSize`、`canvasSize` 或 `outerPadding`。
4. Given legacy PSE1 短字符串, When decode/recover 执行, Then 结果必须继续按 7x7 legacy dimensions 解码, And 新 17x17 场景的短字符串必须编码 dimensions 或使用新的 codec revision，不能与 PSE1 产生歧义。

## Tasks / Subtasks

- [x] 更新 scene-core dimension defaults 与 helpers (AC: 1, 2)
  - [x] 将默认新建场景尺寸改为 15x15 scene、17x17 canvas、outerPadding 1，并保留 legacy 5x5/7x7 dimension 常量用于恢复和 PSE1。
  - [x] 确保 `createCanvasCells()`、`calculateAreaType()`、`assertCanvasCoordinate()`、`isMainAreaBoundaryCell()` 继续从传入 dimensions 派生坐标和区域。
  - [x] 更新 default scene factory 与 Open Design demo，不能再把 5x5/7x7 当新建默认值。
- [x] 放宽并强化 SceneDocument v1 schema (AC: 2, 3)
  - [x] `sceneDocumentV1Schema` 接受 dimension 字段，并在 `superRefine` 中校验 `canvasSize = sceneSize + outerPadding * 2`。
  - [x] coordinate schema 不再写死 `.max(6)`；tile instances、skill markers、workspace selected coordinate 均按当前 payload dimensions 校验 bounds。
  - [x] `areaType`、footprint bounds、height blocking、stacking conflicts 必须使用 payload dimensions；错误信息保留 fieldPath、conflict fields 和当前 bounds。
- [x] 保持 legacy JSON recovery 原样恢复 (AC: 3)
  - [x] 添加 legacy 7x7 SceneDocument v1 fixture/test，验证 recover 后 dimensions、坐标和 areaType 不被改写。
  - [x] 验证 legacy 7x7 与 default 17x17 export summary 都保留各自 `sceneSize`、`canvasSize`、`outerPadding`。
- [x] 扩展 short string codec 兼容策略 (AC: 4)
  - [x] PSE1 decode 继续强制 legacy 5x5/7x7 dimensions。
  - [x] default 17x17 encode 必须输出不会被 PSE1 解码器误认的新版 revision 或明确 dimension header。
  - [x] 新版 decode 必须还原 dimensions，并继续通过 `recoverSceneDocument` 校验。
- [x] 增加回归测试并验证 (AC: 1-4)
  - [x] 更新 `area`、`default-scene`、`scene-schema`、`scene-recovery`、`scene-string-codec`、`scene-roundtrip`、`occupancy` 和 `export-summary` 相关测试。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/scene-core test -- area default-scene scene-schema scene-recovery scene-string-codec scene-roundtrip occupancy export-summary`。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/scene-core typecheck` 和 `git diff --check`。
- [x] 按 code-review 建议修复 12.1 回归风险 (AC: 2, 3, 4)
  - [x] Web placement 与 skill marker edit 创建实例时传入当前 scene dimensions，避免 recovered 7x7 场景边缘格 areaType 写错。
  - [x] schema 与 PSE2 codec 拒绝 unsupported but internally consistent dimensions，Epic 12 只支持 legacy 5x5/7x7 与 default 15x15/17x17。
  - [x] 增加 recovery-layer legacy 7x7 JSON 测试，确认 dimensions、坐标和 areaType 原样恢复。
  - [x] legacy generated default name 在 legacy payload 中迁移为 `5x5 布景`，Open Design demo 坐标映射到 17x17 canvas。

## Dev Notes

- Epic 12 目标是新建场景默认 `sceneSize=15x15`、`outerPadding=1`、`canvasSize=17x17`，同时继续保持 `SceneDocument v1` JSON shape；不得引入 `SceneDocument v2` 或隐藏第二套尺寸模型。[Source: _bmad-output/planning-artifacts/epics.md#Epic-12-15x15-Scene-Size-与-17x17-编辑画布兼容迁移]
- 当前 `packages/scene-core/src/domain/scene/area.ts` 已有 `SceneDimensions`、`getCanvasSizeForScene()`、`assertSceneDimensions()`、`calculateAreaType()` 和 `createCanvasCells()`；应收敛这里作为唯一尺寸事实来源，而不是在 schema、codec、Worker 或 Web 中复制常量。[Source: packages/scene-core/src/domain/scene/area.ts; _bmad-output/planning-artifacts/architecture.md#Approved-Course-Correction-2026-05-29-15x15-Scene-Size-17x17-编辑画布]
- 当前 `packages/scene-core/src/io/scene-schema.ts` 仍写死 `sceneSize` 为 5x5、`canvasSize` 为 7x7、coordinate max 为 6；这是本 story 的核心修复点。Zod schema 需要先结构化接收坐标，再在 document-level refine 中用 payload dimensions 做 bounds 和 area 校验。[Source: packages/scene-core/src/io/scene-schema.ts]
- 当前 `packages/scene-core/src/domain/scene/default-scene.ts` 的 default scene name、selected coordinate 校验、Open Design demo 坐标和 dimensions 仍是 5x5/7x7 语义；默认值应改成 15x15/17x17，legacy 只用于旧 payload 和 PSE1 decode。[Source: packages/scene-core/src/domain/scene/default-scene.ts]
- 当前 short string codec 使用 `PSE1` prefix 并在 `scene-string-codec.ts` 内部写死 5x5/7x7 `sceneDimensions`。PSE1 必须保持 legacy decode；新 17x17 string 必须使用新版 prefix/revision 或 header，避免被 PSE1 当作 7x7 成功恢复。[Source: packages/scene-core/src/io/scene-string-codec.ts]
- `buildSceneOccupancy()`、`evaluateScenePlacementFootprint()`、`buildImageExportSummary()` 已从 scene 获取 dimensions，并会通过 `getFootprintBoundsConflict()` 和 selectors 派生 occupied/blocking/stacking。实现应优先修正 upstream dimensions/schema，而不是复制 bounds 逻辑。[Source: packages/scene-core/src/domain/scene/occupancy.ts; packages/scene-core/src/domain/scene/export-summary.ts; packages/scene-core/src/domain/scene/selectors.ts]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/domain/scene/area.ts`
  - `packages/scene-core/src/domain/scene/area.test.ts`
  - `packages/scene-core/src/domain/scene/default-scene.ts`
  - `packages/scene-core/src/domain/scene/default-scene.test.ts`
  - `packages/scene-core/src/io/scene-schema.ts`
  - `packages/scene-core/src/io/scene-schema.test.ts`
  - `packages/scene-core/src/io/scene-recovery.test.ts`
  - `packages/scene-core/src/io/scene-roundtrip.test.ts`
  - `packages/scene-core/src/io/scene-string-codec.ts`
  - `packages/scene-core/src/io/scene-string-codec.test.ts`
  - `packages/scene-core/src/domain/scene/occupancy.test.ts`
  - `packages/scene-core/src/domain/scene/export-summary.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-12.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Approved-Course-Correction-2026-05-29-15x15-Scene-Size-17x17-编辑画布]
- [Source: _bmad-output/planning-artifacts/prd.md#FR101-FR108]
- [Source: packages/scene-core/src/domain/scene/area.ts]
- [Source: packages/scene-core/src/domain/scene/default-scene.ts]
- [Source: packages/scene-core/src/io/scene-schema.ts]
- [Source: packages/scene-core/src/io/scene-string-codec.ts]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-29: Story created from approved Epic 12 planning and sprint tracker backlog.
- 2026-05-29: Started dev-story implementation and moved status to in-progress.
- 2026-05-29: Confirmed red tests failed against existing hardcoded 5x5/7x7 behavior.
- 2026-05-29: Passed `pnpm --filter @pokopia-scene-editor/scene-core test -- area default-scene scene-schema scene-recovery scene-string-codec scene-roundtrip scene-serializer footprint occupancy selectors export-summary tile-instance`.
- 2026-05-29: Passed `pnpm --filter @pokopia-scene-editor/scene-core typecheck`.
- 2026-05-29: Passed `git diff --check`.
- 2026-05-29: Code review found legacy edit areaType, unsupported dimensions, recovery coverage, default-name, and Open Design demo coordinate issues.
- 2026-05-29: Passed `pnpm --filter @pokopia-scene-editor/scene-core test`.
- 2026-05-29: Passed `pnpm exec vitest run src/state/asset-placement.test.ts src/state/skill-marker-edit.test.ts` from `apps/web`.
- 2026-05-29: Passed `git diff --check` after review fixes.

### Completion Notes List

- Default scene dimensions now use `sceneSize=15x15`, `outerPadding=1`, and `canvasSize=17x17`; legacy 5x5/7x7 dimensions remain explicit for old contracts and PSE1 decode.
- SceneDocument v1 schema now validates dimension consistency and checks coordinates/areaType/footprint/stacking from payload dimensions instead of fixed max coordinate 6.
- Short string codec now emits `PSE2` with encoded dimensions for default 17x17 scenes while keeping `PSE1` as a legacy 7x7 decoder/encoder for legacy-dimension scenes.
- Scene-core fixtures and tests now distinguish legacy 7x7 contract fixtures from default 17x17 scenes.
- Review fixes preserve legacy 7x7 edit semantics in web state commands, reject unsupported dimension contracts, and cover recovery/PSE2 edge cases directly.

### Change Log

- 2026-05-29: Created Story 12.1 and moved status to ready-for-dev.
- 2026-05-29: Implemented scene-core dimension contract, legacy recovery and PSE2 codec; moved status to review.
- 2026-05-29: Applied code-review fixes and moved status to done.

### File List

- _bmad-output/implementation-artifacts/12-1-scene-core-dimension-contract-and-legacy-recovery.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/state/asset-placement.test.ts
- apps/web/src/state/asset-placement.ts
- apps/web/src/state/skill-marker-edit.test.ts
- apps/web/src/state/skill-marker-edit.ts
- packages/scene-core/src/domain/scene/area.ts
- packages/scene-core/src/domain/scene/area.test.ts
- packages/scene-core/src/domain/scene/default-scene.ts
- packages/scene-core/src/domain/scene/default-scene.test.ts
- packages/scene-core/src/domain/scene/export-summary.test.ts
- packages/scene-core/src/domain/scene/footprint-contract-fixture.ts
- packages/scene-core/src/domain/scene/footprint.test.ts
- packages/scene-core/src/domain/scene/occupancy.test.ts
- packages/scene-core/src/domain/scene/selectors.test.ts
- packages/scene-core/src/domain/scene/skill-marker.ts
- packages/scene-core/src/domain/scene/stacking-contract-fixture.ts
- packages/scene-core/src/domain/scene/tile-instance.ts
- packages/scene-core/src/domain/scene/tile-instance.test.ts
- packages/scene-core/src/io/scene-recovery.test.ts
- packages/scene-core/src/io/scene-roundtrip.test.ts
- packages/scene-core/src/io/scene-schema.ts
- packages/scene-core/src/io/scene-schema.test.ts
- packages/scene-core/src/io/scene-serializer.test.ts
- packages/scene-core/src/io/scene-string-codec.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
