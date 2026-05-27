# Story 4.4: 恢复 SceneDocument 并失败时保护当前布景

Status: done

## Story

As a 布景编辑用户,
I want 恢复之前保存的布景数据,
So that 我可以可靠恢复完整场景而不会破坏当前工作。

## Acceptance Criteria

1. Given 系统读取一份合法的 SceneDocument v1 数据, when 用户确认恢复或应用启动恢复草稿, then 系统必须通过 Zod schema、`schemaVersion`、坐标范围和 `areaType` 重算比对后替换当前 scene, and 恢复成功后的布景必须恢复场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记、备注和 dirty/saved 状态。
2. Given 恢复数据缺失 `schemaVersion` 或使用未知 `schemaVersion`, when 系统尝试恢复, then 系统必须拒绝恢复并展示 Recovery Validator 错误, and 错误必须包含问题字段、失败原因、期望值、实际值和用户可执行的修复方向。
3. Given 恢复数据存在字段缺失、类型错误、非法枚举、坐标超出 7×7 范围或 `areaType` 与坐标重算结果不一致, when 系统尝试恢复, then 系统必须生成结构化 `RecoveryError` 项, and 每个 `RecoveryError` 必须包含字段路径、失败原因、期望值、实际值和修复方向。
4. Given 当前用户已有未保存的 scene, when 恢复校验失败或重新打开保存数据失败, then 系统不得覆盖当前 scene、不得创建 partial scene、不得修改 dirty state, and 用户必须可以重试、取消或查看错误详情。

## Tasks / Subtasks

- [x] 定义恢复替换结果边界 (AC: 1-4)
  - [x] 扩展 `scene-recovery` 或新增恢复命令 helper，合法 payload 返回完整 replacement scene
  - [x] 失败时返回当前 scene 原样引用、结构化 `RecoveryError[]`、可用动作 retry/cancel/view-details
  - [x] read-only 模式拒绝恢复替换并返回结构化错误
- [x] 强化 schemaVersion 与字段级错误 (AC: 2-3)
  - [x] 缺失 `schemaVersion` 和未知 `schemaVersion` 必须产生 `schemaVersion` 字段错误
  - [x] 字段缺失、类型错误、非法枚举、坐标越界、areaType 不一致均保留 fieldPath/expected/actual/reason/recoveryAction
- [x] 接入 AppShell 启动恢复失败保护 (AC: 2-4)
  - [x] localStorage 中最新 payload 无效时保留默认/current scene，不创建 partial scene
  - [x] 在 workbench 中展示最小 Recovery Validator 错误摘要和字段明细
  - [x] 提供 Retry 与 Cancel 操作；Cancel 只关闭错误，Retry 只在校验成功后替换 scene
- [x] 补充测试和记录
  - [x] recovery command 测试覆盖合法恢复、缺失/未知 schemaVersion、坐标越界、areaType 不一致、当前 dirty scene 保护、read-only 拒绝
  - [x] AppShell 测试覆盖启动时无效 storage 的错误展示、当前 scene 保留、取消不写 scene、重试成功后恢复
  - [x] Dev Agent Record 记录门禁命令、完成说明和文件列表

## Dev Notes

- 4.1 的 `parseSceneDocument`/`validateSceneDocument` 已输出 `fieldPath`、`expected`、`actual`、`reason`、`recoveryAction`；4.4 必须保留这些字段级错误，不要折叠成泛化错误。
- 4.2 的 `readLatestSceneDocumentFromStorage` 已返回合法 payload 或失败结果；AppShell 当前只在合法时恢复，4.4 需要把失败结果暴露给 Recovery Validator UI。
- 4.3 的 roundtrip helper 已证明 serializer/recovery 语义一致；4.4 应继续复用 `recoverSceneDocument` 和 SceneDocument v1 schema。
- Architecture 明确：恢复失败不得覆盖当前 scene，不得创建 partial scene，不得修改 dirty state；read-only 禁止 recover replace。
- 4.5 会强化 Recovery Validator UI 与 unsafe text；本 story 只需要最小错误摘要、字段列表、Retry/Cancel 和保护语义。

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
- `npm run test -- --run src/io/scene-recovery.test.ts src/components/app-shell/AppShell.test.tsx`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npm run smoke`
- Code review agents: recovery protection review and UI/test boundary review

### Completion Notes List

- 扩展 `scene-recovery`，新增恢复替换 result 边界：合法 payload 返回 replacement scene，失败返回当前 scene 原样引用、字段级 errors 和 retry/cancel/view-details 动作。
- read-only 模式下恢复替换被拒绝，返回结构化 recovery error，不修改当前 scene。
- AppShell 启动时若 localStorage 最新 payload 无效，会保留当前默认 scene，并显示最小 Recovery Validator 错误摘要和字段明细。
- Recovery Validator 提供 Retry/Cancel；Retry 仅在 storage payload 校验成功后替换 scene，Cancel 只关闭错误，不写 scene。
- 补充 recovery/AppShell 测试覆盖合法恢复、缺失/未知 schemaVersion、非法枚举、坐标越界、areaType 不一致、dirty scene 保护、只读拒绝和启动恢复失败保护。
- Review 修复：Retry 与启动恢复现在遵守 read-only 恢复边界；autosave slot 无效时优先展示错误，不会静默回退到 saved slot 覆盖当前场景。

### File List

- `_bmad-output/implementation-artifacts/4-4-restore-failure-protection.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/io/scene-recovery.ts`
- `src/io/scene-recovery.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 4 Story 4.4 and moved to in-progress for implementation.
- 2026-05-16: Implemented recovery failure protection, Recovery Validator status, tests, and moved story to review.
- 2026-05-16: Addressed code review findings, passed release gates, and moved story to done.
