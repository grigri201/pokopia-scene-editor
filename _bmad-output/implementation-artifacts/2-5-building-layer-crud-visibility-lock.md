# Story 2.5: 创建、重命名、切换、显示隐藏和锁定建筑层

Status: done

## Story

As a 布景编辑用户,
I want 管理建筑层的基本状态并设置当前编辑层,
So that 我可以按层组织复杂布景内容。

## Acceptance Criteria

1. Given 工作台已打开, when 用户查看 Building Level Panel, then 系统按数据层号从 0 层到 n 层维护建筑层，并在左侧面板按高层到低层视觉顺序展示，例如 L2、L1、L0, and 每层显示层号、层名、实例数量、可见状态、锁定状态和当前编辑层标识。
2. Given 用户创建新的建筑层, when 创建命令执行成功, then 系统分配当前最高层号加 1 的层号, and 新建筑层出现在正确排序位置并可设为当前编辑层。
3. Given 用户设置当前编辑建筑层, when 用户选择另一个建筑层, then 当前编辑层标识更新, and 同坐标其他层内容不会被误显示为被覆盖或丢失。
4. Given 用户隐藏建筑层, when 可见状态关闭, then 该层数据保留但不参与画布显示, and 当前选中格坐标不被重置，7x7 画布整体宽高和单格宽高变化不超过 1px。
5. Given 用户锁定建筑层, when 锁定状态开启, then 该层内容以边框、图标、透明度、文本标签或状态说明中的至少两种方式表达锁定, and 该层上的放置、删除、移动、旋转、属性修改和层内实例修改被 command layer 阻止。
6. Given 视口宽度小于 768px, when 用户尝试创建、重命名、隐藏、显示、锁定、解锁或切换当前编辑写状态, then 只读模式阻止会修改 scene document 的建筑层操作, and 仍允许查看建筑层、切换查看层和查看实例详情。

## Tasks / Subtasks

- [x] 建立 typed building layer command helper (AC: 2-6)
  - [x] 支持创建、重命名、设置当前层、显示隐藏和锁定解锁
  - [x] 校验 read-only、层存在、名称、最后可见层等失败路径
  - [x] 成功时更新 `SceneDocument`、dirty state 和 current layer
- [x] 接入 Building Level Panel 管理 UI (AC: 1-6)
  - [x] 保持高层到低层展示并显示实例数、可见/锁定/current 状态
  - [x] 桌面 edit mode 提供创建、重命名、设为当前、显示隐藏、锁定解锁控件
  - [x] mobile/read-only 下阻止写操作但允许查看层和实例详情
- [x] 同步画布与编辑命令边界 (AC: 3-5)
  - [x] 切换当前层后画布读取新当前层实例，不混入其他层同坐标实例
  - [x] 隐藏层数据保留但不显示在画布
  - [x] 锁定层阻止放置与实例编辑 command helper
- [x] 补充测试与 smoke 覆盖 (AC: 1-6)
  - [x] unit tests 覆盖 building layer command success/failure/read-only
  - [x] component tests 覆盖 panel 状态、按钮和只读禁用
  - [x] Playwright smoke 覆盖创建、重命名、切换、隐藏、锁定和 mobile read-only 阻断
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- 现有 `getBuildingLevelContexts` 已按高层到低层展示，并提供每层实例数量、可见、锁定和当前状态。
- 现有放置和实例编辑 command helper 已检查目标层锁定状态；本 story 需要保证层级 command 修改的是同一个 `SceneDocument`。
- 隐藏层不能删除数据；后续 Story 2.6 才处理复制/删除建筑层的破坏性操作。
- Mobile View-only Mode 可查看建筑层状态和实例详情，但所有会修改 scene 的层级操作必须在 UI handler 和 command boundary 阻断。

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

- `npm run typecheck` — passed
- `npm run test` — passed, 17 test files / 99 tests
- `npm run build` — passed
- `npm run smoke` — passed, 2 Chromium smoke tests
- `git diff --check` — passed

### Completion Notes List

- 已新增 `editBuildingLayer` typed command helper，支持创建、重命名、设为当前、显示隐藏和锁定解锁。
- 已将 Building Level Panel 从 reserved actions 升级为桌面可操作 UI，并在 read-only 下禁用写操作。
- 已让当前层隐藏时画布不渲染该层实例，并保留层数据和选中坐标。
- 已用 smoke 覆盖创建 L3、重命名、切回 L0、隐藏尺寸稳定、锁定视觉/编辑阻断和解锁。
- Review 修复：mobile/read-only 下 `Set` 变为本地 `View`，允许切换查看层但不写入 `SceneDocument`。
- Review 修复：`set-current`、`set-visible`、`set-locked` no-op 不再制造 dirty state。
- Review 修复：画布对 hidden/locked/non-editable 当前层增加透明度、边框和文本状态表达；mobile smoke 覆盖层级写控件禁用与 force-click 不改 scene。

### File List

- `_bmad-output/implementation-artifacts/2-5-building-layer-crud-visibility-lock.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/state/building-layer-edit.test.ts`
- `src/state/building-layer-edit.ts`
- `src/state/index.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.5 and moved to in-progress.
- 2026-05-16: Implemented building layer command helper, panel controls, hidden/locked canvas behavior, tests, smoke coverage, and moved Story 2.5 to review.
- 2026-05-16: Fixed review findings for mobile viewing layer, no-op dirty state, canvas hidden/locked cues, mobile layer-control smoke coverage, and moved Story 2.5 to done.
