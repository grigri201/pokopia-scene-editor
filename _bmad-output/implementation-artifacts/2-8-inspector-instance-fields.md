# Story 2.8: 在上下文/检查器字段查看和编辑选中格子与实例属性

Status: done

## Story

As a 布景编辑用户,
I want 在选中上下文、检查器字段或属性抽屉中查看并修改选中格子和素材实例属性,
So that 我可以精确维护实例、技能和备注信息。

## Acceptance Criteria

1. Given 用户未选中任何格子或实例, when 用户查看选中上下文或检查器字段, then 面板显示可执行提示而不是空白, and 空场景仍展示 7×7 画布、默认建筑层和明确下一步。
2. Given 用户选中一个空格子, when 用户查看选中上下文或检查器字段, then 面板显示该格子的坐标、区域类型和当前建筑层, and 清楚说明当前格子没有素材实例。
3. Given 用户选中一个素材实例, when 用户查看选中上下文或检查器字段, then 字段按“实例身份 -> 位置 -> 建筑层 -> 朝向 -> 染色 -> 技能 -> 备注”的顺序展示, and 字段至少包含坐标、区域类型、建筑层、素材、朝向、染色、技能标记、技能类型、技能备注和格子备注。
4. Given 用户在上下文/检查器字段中修改选中实例的素材选择、朝向、染色、技能标记、技能类型、技能备注、格子备注或建筑层归属, when 字段值通过验证, then 系统通过 typed command layer 更新当前实例, and 技能标记只作用于当前实例，不修改素材模板、全局坐标或建筑层。
5. Given 用户在上下文/检查器字段中输入无效字段值或触发不允许的层归属变更, when command layer 拒绝修改, then 字段显示错误状态、原因和修复方向, and 错误状态不只依赖颜色表达。
6. Given 当前实例位于锁定建筑层或 Mobile View-only Mode, when 用户查看选中上下文或检查器字段, then 面板进入只读状态并仍显示完整实例字段, and 素材选择、朝向、染色、技能、备注和建筑层归属的写操作被禁止。

## Tasks / Subtasks

- [x] 扩展 typed instance command (AC: 4, 5, 6)
  - [x] 支持实例素材切换并校验素材存在、区域兼容和同层同格冲突
  - [x] 支持技能标记、技能类型和技能备注更新
  - [x] 保持 read-only、hidden/locked layer 和失败不变更 scene 的保护
- [x] 补全 Selection Inspector 字段 (AC: 1, 2, 3, 6)
  - [x] 未选中、空格、实例三种状态显示可执行提示
  - [x] 实例字段按身份、位置、建筑层、朝向、染色、技能、备注顺序展示
  - [x] locked/mobile 状态下完整展示字段但禁用写操作
- [x] 接入 AppShell handlers (AC: 4, 5)
  - [x] 素材切换走 `editAssetInstance`
  - [x] 技能保存走 `editAssetInstance`
  - [x] command failure 通过可见文本反馈原因和修复方向
- [x] 补充测试与 smoke 覆盖 (AC: 1-6)
  - [x] unit tests 覆盖 asset/skill command success 和 typed failures
  - [x] component tests 覆盖字段展示、禁用状态和 handler payload
  - [x] Playwright smoke 覆盖技能备注或素材字段编辑与序列化一致
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 2.4、2.7 已把删除、移动、旋转、染色、备注、跨层移动放进 `editAssetInstance`；本 story 应继续扩展该 command boundary。
- `SelectionInspector` 是属性字段唯一入口，不应在 React 层直接修改 `tileInstances`。
- 备注和技能备注必须作为纯文本保存和渲染；不得使用 HTML parser 或 `dangerouslySetInnerHTML`。
- Story 2.9 会进一步收紧百变怪技能词表和画布标识；本 story 先实现实例级 skill 字段维护和 command guard。
- Mobile `<768px` 仍为严格 read-only，属性字段可看不可改。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`
- `git diff --check`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck` - pass
- `npm run test` - pass, 17 files / 121 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- `editAssetInstance` 新增 `asset` 和 `skill` 命令，素材替换和技能字段保存均通过 typed command layer。
- Selection Inspector 展示坐标、区域、建筑层、素材、朝向、染色、技能标记、技能类型、技能备注和备注。
- Mobile/read-only 与 locked/hidden layer 状态继续禁用实例字段写操作，同时保留完整字段展示。
- Code review 后修复：空状态提示可执行下一步；stale skill 数据可清理；无变化保存不 dirty；长字段允许换行；Save skill 位于 skill note 后。
- Smoke 覆盖技能类型和技能备注编辑后，画布/检查器/序列化读取同一实例字段。

### File List

- `_bmad-output/implementation-artifacts/2-8-inspector-instance-fields.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/components/selection-inspector/SelectionInspector.test.tsx`
- `src/state/asset-instance-edit.ts`
- `src/state/asset-instance-edit.test.ts`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.8 and moved to in-progress.
- 2026-05-16: Implemented inspector instance fields and moved story to review.
- 2026-05-16: Addressed review findings and marked story done.
