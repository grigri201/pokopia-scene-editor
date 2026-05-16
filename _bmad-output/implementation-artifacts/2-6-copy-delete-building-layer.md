# Story 2.6: 复制和删除建筑层并保护破坏性操作

Status: done

## Story

As a 布景编辑用户,
I want 复制建筑层或安全删除建筑层,
So that 我可以快速复用结构并避免误删内容。

## Acceptance Criteria

1. Given 用户选择一个建筑层, when 用户触发复制建筑层, then 系统创建一个新建筑层并复制原层的素材实例、坐标、`rotationDegrees`、染色、技能标记、技能类型、技能备注和备注, and 新层获得新的层号并按 0 到 n 层顺序展示。
2. Given 用户删除空建筑层, when 用户确认删除, then 系统移除该建筑层, and 如果删除的是当前编辑层，系统切换到一个仍存在的可编辑或可查看建筑层并清楚显示当前层。
3. Given 用户删除非空建筑层, when 删除确认弹出, then 确认提示显示建筑层名称、受影响素材实例数量、操作后果、确认和取消操作, and 用户取消时 `SceneDocument`、dirty state 和 undo/redo history 不发生修改。
4. Given 用户确认删除非空建筑层, when 删除命令执行成功, then 该层及其中素材实例从 scene document 移除, and 建筑层列表、画布、上下文/检查器字段和序列化派生状态从同一 scene state 更新。
5. Given 用户尝试删除最后一个建筑层或违反层级规则的建筑层, when 删除命令被拒绝, then 系统返回 typed failure result, and 错误提示包含操作原因和至少一个修复方向。
6. Given 视口宽度小于 768px, when 用户尝试复制或删除建筑层, then command layer 阻止写操作, and 页面明确显示 Mobile View-only Mode 不允许修改建筑层。

## Tasks / Subtasks

- [x] 扩展 typed building layer command helper (AC: 1-6)
  - [x] 支持复制建筑层并复制层内实例字段
  - [x] 支持删除空层和非空层
  - [x] 校验 read-only、层存在、最后一层和确认要求
- [x] 接入 Building Level Panel 危险操作 UI (AC: 1-6)
  - [x] 桌面 edit mode 提供 Copy 和 Delete 操作
  - [x] 删除非空层必须显示名称、实例数量和后果并允许取消
  - [x] mobile/read-only 下禁用 Copy/Delete 并显示只读原因
- [x] 同步派生状态 (AC: 1, 2, 4)
  - [x] 删除当前层后切换到仍存在层
  - [x] 删除层后画布、上下文和层列表从同一 scene state 更新
  - [x] 复制层后新层按层号排序展示并成为当前层
- [x] 补充测试与 smoke 覆盖 (AC: 1-6)
  - [x] unit tests 覆盖 copy/delete/confirm/read-only/last-layer failure
  - [x] component tests 覆盖 Copy/Delete 控件和只读禁用
  - [x] Playwright smoke 覆盖复制、取消删除、确认删除、最后层失败和 mobile 阻断
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 2.5 已建立 `editBuildingLayer` command helper；本 story 应优先扩展同一 command boundary，避免层级写操作分裂。
- 复制层时必须保留实例的坐标、`rotationDegrees`、`dyeColor`、`requiresSkill`、`skillType`、`skillNote` 和 `note`，但新实例必须获得新的 `instanceId` 并归属新层。
- 删除非空层是破坏性操作；UI 可以使用浏览器 confirm，但 command helper 必须有 typed confirmation-required/failure 路径。
- Mobile View-only Mode 不允许复制或删除层，但仍允许 Story 2.5 已实现的本地查看层切换。

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
- `npm run test` - pass, 17 files / 104 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- 扩展 `editBuildingLayer`，新增 typed copy/delete 命令、非空删除确认要求、最后一层删除失败和复制实例新 id 归属。
- Building Level Panel 新增 Copy/Delete 操作；mobile/read-only 下禁用并保留 command 层 read-only guard。
- AppShell 接入非空层删除确认弹窗，取消时不修改 `SceneDocument` / dirty state。
- Code review 后修复：所有层删除统一确认；locked 层和最后可见层删除会 typed failure；复制实例 id 会避开已有 id；mobile 面板显示层编辑禁用状态。
- Smoke 覆盖复制、取消删除、确认删除、最后层失败和 mobile 阻断。

### File List

- `_bmad-output/implementation-artifacts/2-6-copy-delete-building-layer.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/state/building-layer-edit.ts`
- `src/state/building-layer-edit.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.6 and moved to in-progress.
- 2026-05-16: Implemented copy/delete building layer workflow and moved story to review.
- 2026-05-16: Addressed review findings and marked story done.
