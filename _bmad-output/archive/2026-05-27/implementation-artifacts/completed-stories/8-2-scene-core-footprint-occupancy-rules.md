# Story 8.2: 在 scene-core 实现 footprint 旋转、占用和跨层阻塞规则

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want `scene-core` 统一计算 footprint、occupied cells 和 blocking cells,
so that Web、Worker、MCP 和 skill 都使用同一套放置与恢复规则。

## Acceptance Criteria

1. Given 一个素材 footprint 为 length 2、width 1、height 1, When `rotationDegrees` 为 0 或 180, Then effective footprint 为 2x1x1, And 当 `rotationDegrees` 为 90 或 270 时 effective footprint 为 1x2x1。
2. Given 一个素材从 anchor coordinate 派生 occupied cells, When 任一 occupied cell 超出 7x7 canvas, Then validate/recover/placement 必须返回结构化错误, And 不得静默裁剪 footprint。
3. Given 同一建筑层已有实例 footprint cells, When 新实例 footprint 与其相交, Then placement preview 必须返回 blocked 或 will-replace 状态, And save/recover validation 必须拒绝同层 footprint overlap。
4. Given 一个素材 footprint height 大于 1, When scene-core 构建 occupancy map, Then 上方 `height - 1` 个 levelNumber 范围内的对应 footprint cells 必须派生为 blocked, And blocking cells 不得进入 `SceneDocument v1`、short string 或 autosave payload。
5. Given `SceneDocument v1` payload 或 PSE1 短字符串被恢复, When 当前 catalog footprint 产生越界、重叠或跨层阻塞冲突, Then recovery 必须返回字段路径、冲突类型、相关 instance id、asset id、buildingLevelId 和坐标集合, And 不得把 payload 升级为 `SceneDocument v2`。

## Tasks / Subtasks

- [x] 增加 footprint 几何 helper (AC: 1, 2)
  - [x] 新增 `packages/scene-core/src/domain/scene/footprint.ts`，提供 effective footprint 和 occupied cell 派生。
  - [x] 0/180 度保持 length/width，90/270 度交换 length/width，height 不变。
  - [x] 越界不裁剪，返回包含 conflict type、instance/asset/level 和 coordinates 的结构化结果。
- [x] 增加 occupancy map 与跨层 blocking helper (AC: 3, 4)
  - [x] 新增 `packages/scene-core/src/domain/scene/occupancy.ts`，统一构建 occupied cells、same-layer overlaps 和 height-derived blocking cells。
  - [x] 同层 footprint overlap 返回结构化冲突；被现有同层素材覆盖的 placement preview 可识别 will-replace，跨层 height block 返回 blocked。
  - [x] blocking cells 只作为派生输出，不写入 `SceneDocument` 类型、serializer、short string 或 autosave payload。
- [x] 接入 SceneDocument validate/recover 与 Web placement command (AC: 2, 3, 5)
  - [x] `scene-schema.ts` 使用 occupancy helper 拒绝 footprint 越界、同层 overlap 和 height blocking conflict，保留 SceneDocument v1 shape。
  - [x] `scene-recovery.ts` 和 `scene-string-codec.ts` 通过现有 parse/recover 路径返回同一类结构化错误，不新增 PSE1 footprint 编码。
  - [x] `apps/web/src/state/asset-placement.ts` 使用 scene-core placement/occupancy helper 判断 footprint 越界、same-layer replacement 和 cross-level blocking；不在 React/UI 层重写规则。
- [x] 增加契约测试与验证 (AC: 1-5)
  - [x] 新增 scene-core unit tests 覆盖 rotation 交换、occupied cells、越界、same-layer overlap、height blocking 和 no-payload persistence。
  - [x] 更新 schema/recovery/short-string tests 覆盖 footprint conflict errors 和 PSE1 不编码 footprint/blocking cells。
  - [x] 更新 web placement tests 覆盖大素材 will-replace、越界 blocked 和 lower-level height block。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/scene-core test -- footprint occupancy scene-schema scene-recovery scene-string-codec`。
  - [x] 运行 `pnpm --filter @pokopia-scene-editor/web test -- asset-placement`。
  - [x] 运行 `pnpm run typecheck` 和 `pnpm run test`。
  - [x] 将 story 状态推进到 `review`，并把 `sprint-status.yaml` 中 `8-2-scene-core-footprint-occupancy-rules` 更新为 `review`。

## Dev Notes

- Story 8.2 是 Epic 8 的 shared-domain rule layer。不要做 Web 跨格视觉渲染、预览/export 图片渲染或 skill 文档 parity gate；这些分别属于 8.3、8.4、8.5。[Source: _bmad-output/planning-artifacts/epics.md#Story-8.2]
- `coordinate` 是 footprint anchor，occupied cells 从 anchor 向正 x/y 展开；occupied cells 必须全部落在 7x7 canvas 内。同一 building level 的 occupied cells 不得重叠。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- `height > 1` 时，上方 `height - 1` 个 `levelNumber` 范围内对应 occupied cells 是 derived blocking cells；不得写入 SceneDocument v1、autosave payload 或短字符串。[Source: _bmad-output/planning-artifacts/prd.md#FR81; _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- Existing schema currently rejects duplicate same-layer anchor coordinate only; this story must replace/extend that with footprint-aware overlap and cross-layer blocking checks while preserving existing duplicate instance id、level references、areaType 和 dyeColor 校验。[Source: packages/scene-core/src/io/scene-schema.ts]
- Existing placement command only looks at a single target cell through `getCellContext`; this story should keep the current typed failure style while sourcing footprint overlap/blocking from `scene-core` helpers。[Source: apps/web/src/state/asset-placement.ts]
- Story 8.1 added known footprint overrides: `wooden-bench` 2x1x1, `large-narrow-rug` 1x2x1, `large-boulder` 2x1x2. Use these stable fixtures for contract tests。[Source: _bmad-output/implementation-artifacts/8-1-asset-catalog-footprint-metadata.md]
- PSE1 short strings encode official asset id、anchor coordinate、building level、rotation、dye 和 skill fields only; this story must keep footprint/blocking absent from string output and rely on recovery validation after decode。[Source: packages/scene-core/src/io/scene-string-codec.ts]

### Project Structure Notes

- Likely updates:
  - `packages/scene-core/src/domain/scene/footprint.ts`
  - `packages/scene-core/src/domain/scene/occupancy.ts`
  - `packages/scene-core/src/domain/scene/index.ts`
  - `packages/scene-core/src/io/scene-schema.ts`
  - `packages/scene-core/src/io/scene-schema.test.ts`
  - `packages/scene-core/src/io/scene-recovery.test.ts`
  - `packages/scene-core/src/io/scene-string-codec.test.ts`
  - `apps/web/src/state/asset-placement.ts`
  - `apps/web/src/state/asset-placement.test.ts`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-8.2]
- [Source: _bmad-output/planning-artifacts/prd.md#Asset-Footprint-&-Occupancy-Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Footprint-lives-in-the-asset-catalog-while-occupancy-is-derived]
- [Source: packages/scene-core/src/domain/assets/footprint-overrides.ts]
- [Source: packages/scene-core/src/io/scene-schema.ts]
- [Source: packages/scene-core/src/io/scene-string-codec.ts]
- [Source: apps/web/src/state/asset-placement.ts]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-27: Story created after Story 8.1 commit `74c1a82`.
- 2026-05-27: Implemented shared footprint geometry/occupancy helpers, schema recovery validation, and Web placement integration.
- 2026-05-27: `pnpm --filter @pokopia-scene-editor/scene-core test -- footprint occupancy scene-schema scene-recovery scene-string-codec` passed.
- 2026-05-27: `pnpm --filter @pokopia-scene-editor/web test -- asset-placement` passed.
- 2026-05-27: `pnpm run typecheck` passed.
- 2026-05-27: `pnpm run test` passed.
- 2026-05-27: bmad-code-review completed with no remaining patch findings.

### Completion Notes List

- Added scene-core footprint and occupancy helpers as the single source for rotation-aware occupied cells, footprint conflicts, and height-derived blocking.
- Scene validation/recovery now rejects current-catalog footprint conflicts without changing `SceneDocument v1` or adding footprint data to PSE1 short strings.
- Web placement uses the scene-core placement evaluation for multi-cell replacement, out-of-bounds blocks, and lower-level height blocking.

### Change Log

- 2026-05-27: Created Story 8.2 and moved status to ready-for-dev.
- 2026-05-27: Implemented Story 8.2 and moved status to review.
- 2026-05-27: Review completed clean and Story 8.2 moved to done.

### File List

- _bmad-output/implementation-artifacts/8-2-scene-core-footprint-occupancy-rules.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/state/asset-placement.test.ts
- apps/web/src/state/asset-placement.ts
- packages/scene-core/src/domain/scene/default-scene.ts
- packages/scene-core/src/domain/scene/footprint.test.ts
- packages/scene-core/src/domain/scene/footprint.ts
- packages/scene-core/src/domain/scene/index.ts
- packages/scene-core/src/domain/scene/occupancy.test.ts
- packages/scene-core/src/domain/scene/occupancy.ts
- packages/scene-core/src/io/scene-recovery.test.ts
- packages/scene-core/src/io/scene-schema.test.ts
- packages/scene-core/src/io/scene-schema.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
