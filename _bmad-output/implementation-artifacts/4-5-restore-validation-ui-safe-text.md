# Story 4.5: 恢复校验 UI 与安全文本渲染

Status: done

## Story

As a 布景编辑用户,
I want 在保存或恢复失败时看到可信且安全的状态反馈,
So that 我可以理解问题并修复数据，而不会被恶意文本或错误提示误导。

## Acceptance Criteria

1. Given 用户打开 Recovery Validator, when 当前保存或恢复流程产生校验状态, then UI 必须展示成功、失败、待重试和取消状态, and 失败状态必须展示字段路径、失败原因、期望值、实际值、修复方向、重试和取消操作。
2. Given 恢复数据中的素材名称、技能备注、普通备注或错误字段值包含 HTML、脚本标签、事件属性或可疑文本, when UI 展示这些文本, then 所有用户来源文本必须通过 safe text rendering 显示为文本内容, and 不得通过 `innerHTML` 或等价不安全路径执行或插入用户来源标记。
3. Given 用户恢复失败后查看错误详情, when 用户选择取消, then 当前 scene、选中实例、建筑层状态和 dirty state 必须保持恢复前状态, and 错误详情关闭不得触发任何 scene 写操作。
4. Given 自动化测试覆盖恢复校验 UI, when 测试运行 roundtrip 和 unsafe text cases, then roundtrip 测试必须验证序列化后恢复再序列化的数据一致性, and unsafe text 测试必须验证备注、技能备注、素材可见字段和 RecoveryError 实际值均不会执行 HTML 或脚本。

## Tasks / Subtasks

- [x] 完善 Recovery Validator UI 状态 (AC: 1)
  - [x] 增加 idle/validating/success/error/canceled 或等价状态表达
  - [x] 失败状态展示字段路径、失败原因、期望值、实际值、修复方向、Retry、Cancel
  - [x] Retry 成功后展示成功状态或明确恢复反馈，Cancel 后展示取消语义或关闭错误
- [x] 增加 safe text 边界与 unsafe fixture (AC: 2, 4)
  - [x] 新增 `src/test/fixtures/unsafe-text.ts` 覆盖 `<script>`、`<img onerror>`、普通尖括号文本
  - [x] RecoveryError actual/reason/recoveryAction 使用 React 文本渲染，不使用 `innerHTML` 或 HTML parser
  - [x] 测试确认 unsafe note/skillNote/recovery actual 都不会生成可执行 DOM 节点
- [x] 验证取消不写 scene (AC: 3)
  - [x] AppShell 测试覆盖错误详情打开后 Cancel，sceneName、selectedCoordinate、building layer、dirty state 保持不变
- [x] 强化 roundtrip/unsafe 自动化测试 (AC: 4)
  - [x] roundtrip 测试覆盖 unsafe note 与 skillNote 恢复再序列化仍一致
  - [x] UI 测试覆盖 Recovery Validator 的 unsafe actual 文本
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录门禁命令、完成说明和文件列表
- [x] 完成 review 修复后推进到 `done`

## Dev Notes

- 4.4 已提供最小 Recovery Validator UI、Retry/Cancel 和失败保护；4.5 应在此基础上补状态和 unsafe text 测试，不重写恢复流程。
- Architecture 明确禁止 `dangerouslySetInnerHTML`、禁止把恢复字段传入 HTML parser。React children 文本渲染是当前安全路径。
- 当前 SelectionInspector、SceneCanvas 等组件已有部分 unsafe note 测试；本 story 要把恢复场景中的 note/skillNote 和 RecoveryError actual 也覆盖。
- 显式导入/导出 UI 仍不属于本 story；测试可直接通过 localStorage 注入 payload 或调用 IO helper。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npm run smoke`
- Code review agents: Recovery safety review and UI/test coverage review

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npm run test -- --run src/components/app-shell/AppShell.test.tsx src/io/scene-roundtrip.test.ts`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npm run smoke`

### Completion Notes List

- Recovery Validator 增加 `idle/error/success/canceled` 状态表达，错误状态继续展示字段路径、原因、期望值、实际值、修复方向、Retry 和 Cancel。
- Retry 成功后展示 success 状态；Cancel 后展示 canceled 状态，并保持当前 scene 不变。
- 新增 unsafe text fixture，覆盖 `<script>`、`<img onerror>` 和普通尖括号文本。
- AppShell 测试验证 RecoveryError actual 中的 unsafe 文本以 React 文本节点渲染，不生成 `script` 或 `img` DOM。
- roundtrip 测试验证 unsafe note/skillNote 恢复再序列化保持语义一致。
- Review 修复补充断言 unsafe skillNote 文本，并扩展 Cancel 场景对 sceneName、selected cell、当前建筑层和 dirty state 的保持校验。

### File List

- `_bmad-output/implementation-artifacts/4-5-restore-validation-ui-safe-text.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/io/scene-roundtrip.test.ts`
- `src/test/fixtures/unsafe-text.ts`

### Change Log

- 2026-05-16: Story created from Epic 4 Story 4.5 and moved to in-progress for implementation.
- 2026-05-16: Implemented Recovery Validator states, unsafe text fixtures/tests, roundtrip unsafe coverage, and moved story to review.
- 2026-05-16: Addressed code review findings, passed full gates, and moved story to done.
