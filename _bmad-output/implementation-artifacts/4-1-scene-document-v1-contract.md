# Story 4.1: 定义 SceneDocument v1 保存数据契约

Status: done

## Story

As a 布景编辑用户,
I want 系统用稳定的数据契约表达当前布景,
So that 保存、序列化和恢复时不会丢失关键场景信息。

## Acceptance Criteria

1. Given 当前编辑器中存在一个 scene state，包含场景名称、当前 Pokemon、场景尺寸、画布尺寸、外围扩展格数、建筑层、素材实例和工作台上下文, when 系统将 scene state 序列化为可保存的 SceneDocument, then 输出数据必须包含 `schemaVersion: 1`、`sceneId`、`sceneName`、`selectedPokemonKey`、`sceneSize`、`canvasSize`、`outerPadding`、`buildingLevels`、`tileInstances`、`workspaceState` 和 `metadata`, and `selectedPokemonKey` 必须使用 Decor Dex 现有 Pokemon key, and `workspaceState` 必须包含 `currentBuildingLevelId`、`selectedAssetId`、`selectedCoordinate` 和 `saveStatus`，其中 `saveStatus` 只允许 `dirty | saved`, and `metadata` 至少包含 `createdAt`、`updatedAt`、`lastSavedAt` 和 `lastAutosavedAt`, and 每个实例必须包含 `instanceId`、`assetId`、坐标、`areaType`、建筑层归属、`rotationDegrees`、染色状态、技能标记、技能类型、技能备注和普通备注。
2. Given SceneDocument v1 数据契约已经定义, when 开发或测试代码校验任意保存/序列化数据, then 必须通过 Zod runtime schema 校验字段存在性、字段类型、枚举值和坐标范围, and JSON 字段必须使用 `camelCase`，日期必须使用 ISO 8601 string，所有必需字段缺失时必须校验失败，不得通过缺省规则静默补齐。
3. Given 一个素材实例包含 `x/y` 坐标和传入的 `areaType`, when 系统校验或序列化该实例, then 必须使用 `x/y + sceneSize + outerPadding` 的纯函数重新计算权威 `areaType`, and `areaType` 只允许 `main | outer`，与重算结果不一致的数据不得被视为可信数据。
4. Given 一个实例未设置技能类型或技能备注, when 系统生成 SceneDocument v1, then `skillType` 必须保存为 `null`, and `skillNote` 与普通备注必须保存为空字符串而不是缺失字段。
5. Given 一个实例不支持染色或尚未选择颜色, when 系统生成 SceneDocument v1, then `dyeColor` 字段必须显式保存为 `null`, and 支持染色且已选择颜色的实例必须保留可恢复的颜色值。

## Tasks / Subtasks

- [x] 定义 SceneDocument v1 runtime schema (AC: 1-5)
  - [x] 引入 Zod 4.x 作为 runtime schema 依赖
  - [x] 在 `src/io/` 定义 `SceneDocumentV1`、schema、parse/validate API 和错误结构
  - [x] schema 严格校验必需字段、枚举、ISO 日期、坐标范围和 camelCase 字段
- [x] 实现序列化契约 (AC: 1, 3-5)
  - [x] 提供 `serializeSceneDocument`，从当前 `SceneDocument` 生成保存 payload
  - [x] 序列化时将 `saveError` 等 UI 错误状态排除在 payload 之外
  - [x] 序列化时重新计算实例 `areaType`，并保留 `skillType: null`、空字符串 note、`dyeColor: null`
- [x] 实现校验和错误输出 (AC: 2-3)
  - [x] `parseSceneDocument`/`validateSceneDocument` 对不可信输入执行 schema 校验
  - [x] areaType 与坐标重算不一致时校验失败
  - [x] 返回包含 fieldPath、expected、actual、reason、recoveryAction 的错误结构
- [x] 补充单元测试 (AC: 1-5)
  - [x] roundtrip/serialization 测试覆盖完整字段、保存状态限制和 UI 偏好排除
  - [x] schema 测试覆盖缺失字段、错误类型、未知 Pokemon、坐标越界、错误 areaType
  - [x] null/空字符串/dyeColor 语义测试覆盖恢复所需字段
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- 当前 domain `SceneDocument` 包含 UI 编辑态字段 `workspaceState.saveError` 和 `SaveStatus = dirty | saved | saveError`；本 story 的保存 payload 必须只允许 `dirty | saved`，并排除 `saveError`。
- `src/domain/scene/default-scene.ts` 已创建完整默认 scene，并校验 scene name、Pokemon key、坐标和 ISO 时间；schema 仍需要对不可信 JSON 做 runtime 校验。
- `createTileInstance` 已根据默认 5×5/7×7 规则生成 `areaType`，但恢复/校验必须用 payload 自身的 `sceneSize + outerPadding + coordinate` 重算并比对，不能信任传入字段。
- Architecture 指定 IO 边界为 `src/io/scene-schema.ts`、`scene-serializer.ts` 及对应测试；domain modules 不应 import React，IO 可以 import domain types 和 Zod schema。
- Story 4.2 会在此契约上实现保存/重新打开；本 story 不需要实现 localStorage save/reopen UI，只需要稳定 schema、serialize、parse/validate API 和测试。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npm run test -- --run src/io/scene-schema.test.ts src/io/scene-serializer.test.ts`
- `npm run test`
- `npm run build`
- `git diff --check`
- Code review agents: contract review and recovery/boundary review

### Completion Notes List

- 引入 Zod 4.x 并定义严格的 SceneDocument v1 runtime schema、parse/validate API 和结构化恢复错误。
- 实现 `serializeSceneDocument`/`stringifySceneDocument`，保存 payload 排除 `workspaceState.saveError`，并把 `saveError` 状态降级为可保存的 `dirty`。
- 序列化和校验均基于坐标、sceneSize、canvasSize、outerPadding 重新计算/比对权威 `areaType`。
- 单元测试覆盖字段缺失、错误类型、未知 Decor Dex key、未知素材、坐标越界、错误 areaType、null/空字符串恢复字段、染色字段和保存状态限制。
- Review 修复：`dyeColor` 现在按素材 `dyeable` 与 6 位 hex 约束校验/归一化，ISO 日期改用 Zod ISO datetime 语义校验，`tileInstances.instanceId` 增加唯一性校验。

### File List

- `_bmad-output/implementation-artifacts/4-1-scene-document-v1-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `package.json`
- `package-lock.json`
- `src/io/index.ts`
- `src/io/scene-schema.ts`
- `src/io/scene-schema.test.ts`
- `src/io/scene-serializer.ts`
- `src/io/scene-serializer.test.ts`

### Change Log

- 2026-05-16: Story created from Epic 4 Story 4.1 and moved to ready-for-dev.
- 2026-05-16: Story moved to in-progress for implementation.
- 2026-05-16: Implemented SceneDocument v1 schema, serializer, tests, and moved story to review.
- 2026-05-16: Addressed code review findings, passed release gates, and moved story to done.
