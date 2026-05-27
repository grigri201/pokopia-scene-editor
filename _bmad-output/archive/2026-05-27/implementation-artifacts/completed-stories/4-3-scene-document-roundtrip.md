# Story 4.3: 序列化 SceneDocument 并支持 roundtrip 校验

Status: done

## Story

As a 布景编辑用户,
I want 系统能将当前布景序列化为结构化数据,
So that 保存、自动保存、恢复和后续显式导出都能使用同一个可信数据契约。

## Acceptance Criteria

1. Given 当前 scene state 中存在一个或多个建筑层和素材实例, when 系统执行保存、自动保存、未来显式导出、恢复前校验或 roundtrip 测试, then 系统必须生成结构化 SceneDocument v1 JSON-compatible 数据, and 序列化数据必须通过同一个 Zod runtime schema 校验。
2. Given 序列化数据包含场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数和 workspaceState, when 恢复流程或测试读取数据, then 这些字段必须以明确字段名保存并可被恢复流程直接使用, and 不得依赖 UI 默认值补全这些核心尺寸字段。
3. Given 序列化数据包含素材实例, when 恢复流程或测试读取数据, then 每个实例必须保留建筑层归属、素材 ID、坐标、重算一致的 `areaType`、`rotationDegrees`、染色字段、技能标记、`skillType`、`skillNote` 和普通备注, and `rotationDegrees` 只允许 `0 | 90 | 180 | 270`；UI 中默认 0 度不显示旋转标记，但数据中必须显式保存 `0`。
4. Given 一份由序列化流程生成的 SceneDocument v1 数据, when 自动化测试将其恢复后再次序列化, then roundtrip 测试必须证明两次序列化的语义数据一致, and 测试必须覆盖空场景、场景名称、Decor Dex Pokemon key、workspaceState、单层多实例、多建筑层、外围格实例、染色、rotationDegrees、技能标记和备注字段。

## Tasks / Subtasks

- [x] 增加 roundtrip IO helper (AC: 1, 4)
  - [x] 在 `src/io/scene-roundtrip.ts` 提供 `roundtripSceneDocument` 或等价 API
  - [x] helper 必须使用 `serializeSceneDocument -> recoverSceneDocument -> serializeSceneDocument`
  - [x] 返回原始 payload、恢复 scene、再次序列化 payload，并确保失败时暴露结构化错误
- [x] 强化语义一致性测试 (AC: 1-4)
  - [x] 空场景 roundtrip 覆盖 schemaVersion、sceneId、sceneName、Pokemon、sceneSize、canvasSize、outerPadding、metadata
  - [x] workspaceState roundtrip 覆盖 currentBuildingLevelId、selectedAssetId、selectedCoordinate、dirty/saved 状态
  - [x] 素材实例 roundtrip 覆盖单层多实例、多建筑层、外围格、rotation 0/90、染色、技能标记、skillType、skillNote、note
  - [x] 测试确认默认 0 度也显式保存在 payload 中
- [x] 维护导出边界
  - [x] `src/io/index.ts` 导出 roundtrip helper，供后续恢复/导出测试复用
  - [x] 不引入 UI 默认值补全，不新增独立 payload 结构
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- 4.1 已提供 `SceneDocumentV1`、`parseSceneDocument`、`validateSceneDocument` 和 `serializeSceneDocument`。
- 4.2 已提供 `recoverSceneDocument`、`sceneFromPayload` 和 localStorage storage API；4.3 应复用这些 IO 入口，而不是复制恢复逻辑。
- 当前 schema 会校验 known Pokemon、known asset、严格 camelCase、ISO datetime、building level 关联、instanceId 唯一、areaType 重算、dyeable 语义和 rotation 枚举。roundtrip 测试应覆盖这些语义数据能完整保留。
- 本 story 不需要新增显式 export/import UI，也不需要 Recovery Validator UI；这些属于后续 4.4/4.5。

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
- `npm run test -- --run src/io/scene-roundtrip.test.ts`
- `npm run test`
- `npm run build`
- `git diff --check`
- Code review agents: roundtrip contract review and test coverage review

### Completion Notes List

- 新增 `roundtripSceneDocument`，统一执行 `serializeSceneDocument -> recoverSceneDocument -> serializeSceneDocument`，并返回 source payload、recovered scene 和 roundtripped payload。
- roundtrip helper 失败时返回结构化错误，方便后续 Recovery Validator/导出测试复用。
- 新增 roundtrip 测试覆盖空场景核心字段、workspaceState、单层多实例、多建筑层、外围格实例、染色、rotation 0/90、技能标记、skillNote 和 note。
- `src/io/index.ts` 导出 roundtrip helper，保持后续保存、autosave、恢复和显式导出共享同一 SceneDocument v1 契约。
- Review 修复：roundtrip 失败路径现在基于 serializer 生成的 payload input 执行 schema parse，保留 `selectedPokemonKey` 等字段级结构化错误，同时避免把 domain-only `workspaceState.saveError` 当作 payload 字段。

### File List

- `_bmad-output/implementation-artifacts/4-3-scene-document-roundtrip.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/io/index.ts`
- `src/io/scene-serializer.ts`
- `src/io/scene-roundtrip.ts`
- `src/io/scene-roundtrip.test.ts`

### Change Log

- 2026-05-16: Story created from Epic 4 Story 4.3 and moved to in-progress for implementation.
- 2026-05-16: Implemented SceneDocument v1 roundtrip helper, tests, and moved story to review.
- 2026-05-16: Addressed code review findings, passed release gates, and moved story to done.
