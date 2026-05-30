# Story 11.2: 在 scene-core 实现 stacking compatibility 与派生关系

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want `scene-core` 统一判断同层 overlap 是否被承载面规则允许,
so that Web、Worker、MCP 和 skill 都使用同一套承载/叠放规则。

## Acceptance Criteria

1. Given 同一建筑层已有 `wooden-plate`、`plate` 或 `party-platter`, When 用户把 `food` category 素材放到其 footprint cells 上, Then placement、save validation 和 recover validation 必须允许该 overlap, And derived relation 标记 top item 被对应 food surface 承载。
2. Given 同一建筑层已有 food surface, When 用户把非食物素材放到其 footprint cells 上, Then validation 必须返回 unsupported stack surface conflict, And 错误包含 top asset、base asset、building level 和坐标。
3. Given 同一建筑层已有已审计 floor-cover、rug、shoot 或 low-height surface, When incoming asset category 被该 surface metadata 允许, Then placement 可以通过, And derived relation 不写入 `SceneDocument v1`、short string 或 autosave payload。
4. Given incoming footprint 覆盖多个 cells, When 只有部分 cells 有兼容 base surface 或出现多个不兼容 base surfaces, Then validation 必须返回 surface capacity/conflict 或 same-level overlap conflict, And 不得静默选择一个 base instance 作为承载面。
5. Given lower level height blocking cells 与 stacking surface 同时存在, When incoming asset 触发上层阻塞, Then height-blocked-by-lower-footprint 仍优先阻止放置, And stacking rule 不得绕过 Epic 8 的跨层阻塞。

## Tasks / Subtasks

- [x] 扩展 scene-core stacking domain 输出 (AC: 1-4)
  - [x] 在 scene domain 中新增 derived stacking relation 类型，包含 top/base instance id、asset id、building level、surface kind 和 coordinates。
  - [x] 扩展 `FootprintConflictType` 与 `FootprintConflict`，加入 `unsupported-stack-surface` 与 `surface-capacity-conflict` 所需结构化字段。
  - [x] 保持 `SceneDocument`、serializer、schema payload 和 PSE1 codec 不新增 stacking relation、surface id、z-index 或 parent instance id 字段。
- [x] 在 `buildSceneOccupancy()` 中允许受控同层 overlap (AC: 1-5)
  - [x] 使用 `AssetDefinition.stacking` 判断 base surface 是否允许 top asset category。
  - [x] 只在 every top footprint cell 都由同一个 compatible base surface 覆盖时生成 derived relation。
  - [x] 对 food surface + non-food 返回 `unsupported-stack-surface`，包含 top/base asset、instance、building level、coordinates 和 surface kind。
  - [x] 对 partial surface coverage、多 base surface、已有 top item 占用等场景返回 `surface-capacity-conflict` 或保留 `same-level-footprint-overlap`。
  - [x] 保持 height blocking 在冲突列表中优先且不被 stacking rule 绕过。
- [x] 在 `evaluateScenePlacementFootprint()` 中复用同一 stacking 判断 (AC: 1, 3, 5)
  - [x] 合法 plate+food / rug/mat/shoot/low-height overlap 返回 `ready`，并带 derived relation 供 Web 后续 Story 11.3 使用。
  - [x] food surface + non-food 返回 `blocked` 和结构化 unsupported conflict。
  - [x] 普通已有实例的替换语义保持原状：非 stacking overlap 仍可走 `will-replace`。
- [x] 更新 validation/recovery 错误结构 (AC: 2, 4)
  - [x] `validateSceneDocument()` 和 `recoverSceneDocument()` 通过 existing schema refine 自动返回 stacking conflict details。
  - [x] `SceneDocumentValidationError` 保留 base/blocking fields，并新增 surface kind 字段。
- [x] 增加回归测试并验证 (AC: 1-5)
  - [x] `occupancy.test.ts` 覆盖 plate+food 成功、plate+non-food 阻断、rug/mat/shoot/low-height 成功、partial/multi-surface capacity conflict、height blocking 优先。
  - [x] schema/recovery/string/roundtrip tests 覆盖合法 stacking scene 可 validate/recover/roundtrip 且 payload/string 不包含 derived relation 字段。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/scene-core test -- occupancy scene-schema scene-recovery scene-string-codec scene-roundtrip`。
  - [x] 运行 `pnpm run typecheck` 和 `git diff --check`。

## Dev Notes

- Story 11.1 已提交 `AssetDefinition.stacking`、`stacking-overrides.ts` 和 Worker/MCP catalog 透传测试。11.2 必须复用这些 metadata，不要新增第二套 plate/rug/shoot 列表。[Source: _bmad-output/implementation-artifacts/11-1-asset-catalog-stacking-surface-metadata.md; packages/scene-core/src/domain/assets/stacking-overrides.ts]
- 当前 occupancy 入口是 `packages/scene-core/src/domain/scene/occupancy.ts`：`buildSceneOccupancy(scene)` 负责 save/recover validation 的 derived occupancy/conflicts，`evaluateScenePlacementFootprint(scene, input)` 负责 Web placement preview。两者必须共享 stacking 判断，避免 Web 和 schema validate 行为漂移。[Source: packages/scene-core/src/domain/scene/occupancy.ts]
- 当前 conflict 类型在 `packages/scene-core/src/domain/scene/footprint.ts`。新增 stacking conflict 时应继续使用 `coordinates`、`blockingInstanceId`、`blockingAssetId`、`blockingBuildingLevelId` 表达 base surface，必要时追加 `surfaceKind`。[Source: packages/scene-core/src/domain/scene/footprint.ts]
- `validateSceneDocument()` 在 schema superRefine 中调用 `validateSceneOccupancy(scene)` 并把 conflict params 映射到 `SceneDocumentValidationError`。只要 occupancy 输出结构化 conflict，save/recover validation 就会共用该规则。[Source: packages/scene-core/src/io/scene-schema.ts]
- Current replacement behavior matters: `evaluateScenePlacementFootprint()` 对普通 overlap 返回 `will-replace`，这是 Web 现有放置交互依赖。只把 stacking surface 的合法/不兼容 overlap 改为 ready/blocked，不要把所有 overlap 都改成 blocked。[Source: packages/scene-core/src/domain/scene/occupancy.test.ts]
- Height blocking 优先于 stacking compatibility。下层高素材阻塞上层时，即使目标坐标有 compatible surface，也必须返回 `height-blocked-by-lower-footprint`。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-Stacking-surface-rules-live-in-the-asset-catalog-while-stacking-relations-are-derived]
- Derived relation 不能写入 `SceneDocument v1`、autosave、short string 或 payload。相关 guard tests 现有位置包括 scene serializer、scene roundtrip、scene string codec 和 web scene storage tests。[Source: packages/scene-core/src/io/scene-serializer.test.ts; packages/scene-core/src/io/scene-roundtrip.test.ts; packages/scene-core/src/io/scene-string-codec.test.ts; apps/web/src/io/scene-storage.test.ts]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/domain/scene/footprint.ts`
  - `packages/scene-core/src/domain/scene/occupancy.ts`
  - `packages/scene-core/src/domain/scene/occupancy.test.ts`
  - `packages/scene-core/src/io/scene-schema.ts`
  - `packages/scene-core/src/io/scene-schema.test.ts`
  - `packages/scene-core/src/io/scene-recovery.test.ts`
  - `packages/scene-core/src/io/scene-string-codec.test.ts`
  - `packages/scene-core/src/io/scene-roundtrip.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-11.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Stacking-surface-rules-live-in-the-asset-catalog-while-stacking-relations-are-derived]
- [Source: _bmad-output/implementation-artifacts/11-1-asset-catalog-stacking-surface-metadata.md]
- [Source: packages/scene-core/src/domain/assets/stacking-overrides.ts]
- [Source: packages/scene-core/src/domain/scene/occupancy.ts]
- [Source: packages/scene-core/src/domain/scene/footprint.ts]
- [Source: packages/scene-core/src/io/scene-schema.ts]
- [Source: package.json]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created after Story 11.1 commit `e35e167`.
- 2026-05-28: Started dev-story implementation and moved status to in-progress.
- 2026-05-28: Passed `pnpm --filter @pokopia-scene-editor/scene-core test -- occupancy scene-schema scene-recovery scene-string-codec scene-roundtrip`.
- 2026-05-28: Passed `pnpm run typecheck`.
- 2026-05-28: Passed `git diff --check`.
- 2026-05-28: Added order-independent stacking derivation for payloads where top item appears before base surface; re-ran the same test/typecheck/diff-check gates.
- 2026-05-28: Code review found and fixed a `confirmReplace` bypass for unsupported stacking surface placement; re-ran scene-core tests, typecheck, and diff-check.

### Review Findings

- [x] [Review][Patch] Unsupported stacking placement could bypass validation after a replacement confirmation [packages/scene-core/src/domain/scene/occupancy.ts] — fixed by evaluating stacking-surface conflicts even when `confirmReplace` is true, while preserving confirmed replacement for ordinary same-level overlap.

### Completion Notes List

- Added derived `StackingRelation` output to scene occupancy and placement evaluation without adding any SceneDocument payload fields.
- Added `unsupported-stack-surface` and `surface-capacity-conflict` structured conflicts with base/top asset and surface details.
- Updated scene occupancy and placement evaluation so compatible plate/food and floor-cover/low-height overlaps pass, incompatible food-surface overlaps block, partial/multi-surface stacking blocks, and ordinary replacement remains `will-replace`.
- Added shared stacking contract fixtures and schema/recovery/PSE1/roundtrip tests proving derived relation is re-computed and not serialized.
- Stacking relation derivation is order-independent for compatible base/top scenes, so relation recovery does not depend on tileInstances array order.
- Replacement confirmation can no longer turn an unsupported stacking-surface overlap into a valid placement.

### Change Log

- 2026-05-28: Created Story 11.2 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented scene-core stacking compatibility and moved status to review.
- 2026-05-28: Applied code-review fix and moved status to done.

### File List

- _bmad-output/implementation-artifacts/11-2-scene-core-stacking-compatibility-rules.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- packages/scene-core/src/domain/scene/footprint.ts
- packages/scene-core/src/domain/scene/index.ts
- packages/scene-core/src/domain/scene/occupancy.test.ts
- packages/scene-core/src/domain/scene/occupancy.ts
- packages/scene-core/src/domain/scene/stacking-contract-fixture.ts
- packages/scene-core/src/io/scene-recovery.test.ts
- packages/scene-core/src/io/scene-roundtrip.test.ts
- packages/scene-core/src/io/scene-schema.test.ts
- packages/scene-core/src/io/scene-schema.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
