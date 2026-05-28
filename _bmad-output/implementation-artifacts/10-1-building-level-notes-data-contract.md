# Story 10.1: 在 scene-core 增加 BuildingLevel notes 数据契约

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 每个建筑层可以保存多条备注,
so that 我的搭建说明可以和层级结构一起恢复和导出。

## Acceptance Criteria

1. Given 默认 scene 被创建, When scene-core 生成 `buildingLevels`, Then 每个 `BuildingLevel` 都包含 `notes: []`。
2. Given 用户新增、编辑或删除层备注, When command layer 更新 scene, Then 只修改目标 `buildingLevels[].notes`, And 不创建或恢复 `TileInstance.note`。
3. Given 旧 `SceneDocument v1` payload 缺少 `buildingLevels[].notes`, When parse/recover 执行, Then 恢复为 `notes: []`, And 新 serializer 输出显式 `notes` 字段。
4. Given 层备注包含 HTML-like 文本, When schema、serializer、export summary 或 UI 展示该备注, Then 备注只能作为普通文本处理。

## Tasks / Subtasks

- [x] 增加 scene-core 层备注类型与默认值 (AC: 1, 3)
  - [x] 在 `packages/scene-core/src/domain/scene/types.ts` 增加 `BuildingLevelNote` 并把 `BuildingLevel.notes` 设为必备数组。
  - [x] 更新 `createBuildingLevel()` / 默认 demo scene，使所有新建 `buildingLevels` 显式包含 `notes: []`。
  - [x] 更新 level/default scene tests，所有 BuildingLevel 断言包含 notes。
- [x] 扩展 SceneDocument schema、serializer 和 recovery 兼容逻辑 (AC: 3, 4)
  - [x] 在 `scene-schema` 中校验 `notes: { id, text }[]`，保留备注正文为普通字符串。
  - [x] 对旧 payload 缺少 `buildingLevels[].notes` 的情况补 `notes: []`，不要放宽其它必需字段。
  - [x] 确认 `serializeSceneDocument()` 输出显式 `notes` 字段，并增加 roundtrip/recovery/schema 测试。
- [x] 增加层备注 command layer 操作 (AC: 2, 4)
  - [x] 在 `apps/web/src/state/building-layer-edit.ts` 支持新增、编辑、删除层备注，read-only、missing-layer、空备注要失败。
  - [x] 只更新目标 `buildingLevels[].notes` 和 metadata，不修改 `tileInstances`，不得引入 `TileInstance.note`。
  - [x] 复制建筑层时复制备注正文并生成新稳定 id；删除建筑层时备注随层删除，确认提示包含备注数量。
- [x] 验证安全文本和回归门禁 (AC: 1-4)
  - [x] 增加 HTML-like 备注测试，证明 schema/recovery/serializer/command 只保留文本，不创建 DOM/HTML 语义。
  - [x] 运行相关 Vitest：scene-core schema/recovery/serializer/default-scene/levels 和 web building-layer-edit。
  - [x] 运行 `pnpm run typecheck`、`pnpm run test`、`git diff --check`。

### Review Findings

- [x] [Review][Patch] PSE1 短字符串导出会丢弃 BuildingLevel notes — 已把 level notes 纳入 PSE1 level record 编码/解码，并补充 notes roundtrip 测试。
- [x] [Review][Patch] Schema 允许重复 note id，update/delete 会一次命中多条备注 — 已在 schema superRefine 增加层内 note id 唯一性校验，并补充 duplicate note id 测试。
- [x] [Review][Patch] Schema 接受空白 note text 但 command 会拒绝 — 已在 note schema 中拒绝空白正文，并补充 schema 测试。

## Dev Notes

- Epic 10 的边界是“建筑层备注”，不是普通素材实例备注，也不是 UI preference。不得新增或恢复 `TileInstance.note`，不得把备注放入 `pokopia.uiPreferences.v1`。[Source: _bmad-output/planning-artifacts/epics.md#Epic-10]
- Architecture 已批准 `BuildingLevelNote { id: string; text: string }` 和 `BuildingLevel.notes: BuildingLevelNote[]`。`notes` 顺序就是显示顺序；空备注必须在 command 层阻止或过滤。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-Building-level-notes-are-persistent-scene-facts]
- `SceneDocument v1` 继续是当前 schema。唯一兼容例外是旧 payload / 后续旧 PSE1 缺少 `buildingLevels[].notes` 时恢复为空数组；其它必需字段仍必须严格失败。[Source: _bmad-output/planning-artifacts/architecture.md#Decision-SceneDocument-v1-is-a-strict-current-schema]
- 新增恢复字段必须同时更新 TypeScript type、Zod schema、serializer/parser、fixture 和 roundtrip test。Epic 10 后续 story 会补 PSE1、export summary、Worker/MCP 和 UI parity，本 story 先建立核心契约和 command 层。[Source: _bmad-output/planning-artifacts/architecture.md#All-AI-Agents-MUST]
- `packages/scene-core/src/io/scene-schema.ts` 目前对 scene root 使用 `.strict()`，对 level 使用 `.strip()`；兼容旧 `notes` 缺失建议在 parse 前 normalize building level records，而不是放宽整个 SceneDocument v1。[Source: packages/scene-core/src/io/scene-schema.ts]
- `apps/web/src/state/building-layer-edit.ts` 是建筑层创建、复制、删除、重命名、切层的 command layer；新增备注操作应复用这里的 read-only guard、dirty metadata 和缺层错误模式。[Source: apps/web/src/state/building-layer-edit.ts]

### Project Structure Notes

- Expected updates:
  - `packages/scene-core/src/domain/scene/types.ts`
  - `packages/scene-core/src/domain/scene/levels.ts`
  - `packages/scene-core/src/domain/scene/default-scene.test.ts`
  - `packages/scene-core/src/domain/scene/levels.test.ts`
  - `packages/scene-core/src/io/scene-schema.ts`
  - `packages/scene-core/src/io/scene-schema.test.ts`
  - `packages/scene-core/src/io/scene-serializer.ts`
  - `packages/scene-core/src/io/scene-serializer.test.ts`
  - `packages/scene-core/src/io/scene-recovery.test.ts`
  - `packages/scene-core/src/io/scene-roundtrip.test.ts`
  - `apps/web/src/state/building-layer-edit.ts`
  - `apps/web/src/state/building-layer-edit.test.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.1]
- [Source: _bmad-output/planning-artifacts/prd.md#Approved-Course-Correction-2026-05-28-建筑层备注]
- [Source: _bmad-output/planning-artifacts/architecture.md#Decision-Building-level-notes-are-persistent-scene-facts]
- [Source: packages/scene-core/src/domain/scene/types.ts]
- [Source: packages/scene-core/src/io/scene-schema.ts]
- [Source: apps/web/src/state/building-layer-edit.ts]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created from Epic 10 backlog and current architecture notes.
- 2026-05-28: Started dev-story implementation and marked tracker in-progress.
- 2026-05-28: Passed `pnpm run typecheck`.
- 2026-05-28: Passed `pnpm run test`.
- 2026-05-28: Passed `pnpm run build`.
- 2026-05-28: Passed `git diff --check`.
- 2026-05-28: bmad-code-review found 3 patch items; applied all and re-ran verification.

### Completion Notes List

- Added `BuildingLevelNote` and mandatory `BuildingLevel.notes`, with default `notes: []` for all newly created levels and Open Design demo levels.
- Extended SceneDocument v1 schema, serializer, recovery, roundtrip and PSE1 short string codec so layer notes are persisted, recovered, validated and encoded safely.
- Added building layer command actions for add/update/delete note, preserving user note text, blocking empty notes, enforcing stable unique note ids, and keeping `tileInstances` untouched.
- Copying a building layer now copies note text with new stable ids; deleting a layer deletes its notes and includes note count in the destructive confirmation.
- Review fixes added PSE1 note roundtrip, per-layer duplicate note id rejection and blank note text rejection.

### Change Log

- 2026-05-28: Created Story 10.1 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented Story 10.1, fixed code review findings, and moved status to done.

### File List

- _bmad-output/implementation-artifacts/10-1-building-level-notes-data-contract.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/components/app-shell/AppShell.test.tsx
- apps/web/src/state/building-layer-edit.test.ts
- apps/web/src/state/building-layer-edit.ts
- packages/scene-core/src/domain/scene/default-scene.test.ts
- packages/scene-core/src/domain/scene/levels.test.ts
- packages/scene-core/src/domain/scene/levels.ts
- packages/scene-core/src/domain/scene/selectors.test.ts
- packages/scene-core/src/domain/scene/types.ts
- packages/scene-core/src/io/scene-recovery.test.ts
- packages/scene-core/src/io/scene-roundtrip.test.ts
- packages/scene-core/src/io/scene-schema.test.ts
- packages/scene-core/src/io/scene-schema.ts
- packages/scene-core/src/io/scene-serializer.test.ts
- packages/scene-core/src/io/scene-serializer.ts
- packages/scene-core/src/io/scene-string-codec.test.ts
- packages/scene-core/src/io/scene-string-codec.ts
