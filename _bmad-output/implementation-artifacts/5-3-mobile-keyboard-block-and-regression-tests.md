# Story 5.3: Mobile 键盘屏蔽与回归测试

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile 查看用户,
I want Mobile 模式下所有应用级键盘操作都无效,
So that 窄视口只读契约不会被键盘路径绕过。

## Acceptance Criteria

1. Given 视口宽度小于 768px, when 用户按方向键、Enter、Space、Escape、Delete、Backspace、Cmd/Ctrl+S 或任何现有应用级快捷键, then 应用级 keyboard handler 必须 no-op, and 不得选择格子、切换建筑层、放置、删除、旋转、保存、恢复覆盖、撤销/重做或改变 scene/view command state。
2. Given 视口宽度小于 768px, when dev agent 执行 unit/component/Playwright 回归测试, then mobile keyboard 测试必须证明 scene JSON 在操作前后完全一致, and 桌面/平板键盘支持不作为必须通过的功能验收项。
3. Given Story 5.1 和 5.2 已完成, when release gate 运行, then `npm run typecheck`、`npm test`、`npm run build`、`git diff --check` 和 `npm run smoke` 必须通过, and smoke 覆盖自动保存/恢复、被删除 UI 入口不存在、预览覆盖信息不显示，以及 mobile 键盘 no-op。

## Tasks / Subtasks

- [x] 屏蔽 Mobile read-only 下的 canvas keyboard 行为 (AC: 1, 2)
  - [x] 在 `src/components/scene-canvas/SceneCanvas.tsx` 中确保 `readOnly` 下所有应用级键盘输入直接 no-op：方向键、Enter、Space、Escape、Delete、Backspace、Cmd/Ctrl+S 与 Ctrl+S。
  - [x] Mobile/readOnly 下不得调用 `onSelectCoordinate`、`onViewCoordinate`、`onHoverCoordinate`、`onFocusCoordinate` 或写入 `data-keyboard-coordinate` 等 view command state；pointer 查看路径仍按现有产品契约保留。
  - [x] 桌面 edit mode 的现有键盘支持可以保留，但不是本 story 的产品验收目标；如果保留，必须确保其分支只在 `readOnly === false` 时执行。
- [x] 屏蔽 Mobile read-only 下其他组件的应用级键盘触发 (AC: 1, 2)
  - [x] 在 `BuildingLevelPanel` 中确保 readOnly row keydown 不会通过 Enter/Space 切换查看建筑层；pointer click 查看建筑层仍可保留。
  - [x] 在 `AssetPicker` 中确保 readOnly asset keydown 不会移动焦点后触发选中/放置或改变 view command state；只允许不改变 scene 的浏览器默认焦点行为。
  - [x] 确认 `AppShell` 没有全局 `keydown` 或隐藏快捷键路径会在 Mobile 模式触发删除场景、恢复覆盖、保存、撤销/重做或 scene command。
- [x] 增加回归测试证明 scene JSON 完全不变 (AC: 1, 2, 3)
  - [x] 更新 `SceneCanvas.test.tsx`：readOnly 下对方向键、Enter、Space、Escape、Delete、Backspace、Cmd/Ctrl+S、Ctrl+S 的 keydown 不调用 selection/view callbacks，也不改变 grid keyboard coordinate。
  - [x] 更新 `BuildingLevelPanel.test.tsx`：readOnly 下 Enter/Space 不调用 `onSelectLayer`。
  - [x] 更新 `AssetPicker.test.tsx`：readOnly 下 Enter/Space 和 ArrowUp/ArrowDown 不调用 `onAssetSelect`。
  - [x] 更新 `AppShell.test.tsx`：390px mobile 下对 canvas、建筑层 row、素材卡片和 document 发出应用级键盘事件后，`__pokopiaSceneSnapshot` 或等价 scene JSON 前后完全一致，且 autosave/saved localStorage 仍为 `null`。
  - [x] 更新 Playwright smoke：390x844 mobile 下执行方向键、Enter、Space、Escape、Delete、Backspace、Cmd/Ctrl+S、Ctrl+S 后，scene snapshot 前后完全一致，且 storage 不写入。
- [x] 运行并记录 release gate (AC: 3)
  - [x] 运行 `npm run typecheck`。
  - [x] 运行 `npm test`。
  - [x] 运行 `npm run build`。
  - [x] 运行 `git diff --check`。
  - [x] 运行 `npm run smoke`。
- [x] 修复 code-review 发现的问题 (AC: 1, 2, 3)
  - [x] 在 `AppShell` 增加 Mobile/readOnly 应用级 `keydown` capture guard，阻止键盘事件继续冒泡到全局快捷键或浏览器保存路径。
  - [x] Mobile/readOnly 启动时读取旧 UI preferences 不再写回迁移结果，避免只读模式产生 storage side effect。
  - [x] Desktop 切换到 Mobile/readOnly 时清理 canvas keyboard target、hover/focus view state。
  - [x] `AssetPicker` 隐藏的详情按钮在 readOnly 下禁用，避免键盘激活改变 viewed asset state。
  - [x] Playwright smoke 增加 saved storage 仍为 `null` 的断言。
  - [x] Playwright smoke 增加 autosaved SceneDocument v1 启动恢复覆盖。

## Dev Notes

- Story 5.3 承接 Story 5.1 commit `bf193d2 feat: clean scene model command scope` 与 Story 5.2 commit `9d8fa70 feat: clean workbench ui preview controls`。数据模型、手动保存 UI、undo/redo、preview toggle 和已删除编辑入口不应被恢复。
- PRD NFR18 要求 Mobile View-only Mode 下禁用应用级键盘操作，不允许键盘触发选择、放置、删除、旋转、保存、撤销/重做、建筑层切换或任何 scene/view command。
- Architecture 明确 `<768px` 进入 `readOnly`，只读限制必须覆盖 command layer、canvas pointer handler 和 keyboard handler；Story 5.3 的重点是 keyboard handler。现有 command layer 已普遍检查 `interactionMode === 'readOnly'`，不要绕过该边界。
- UX 规格中旧句子“Mobile 下键盘只能移动查看焦点或选择查看对象”已被 course correction 覆盖；本 story 以 `sprint-change-proposal-2026-05-19.md`、PRD/Architecture Approved Course Correction 和 `epics.md` Story 5.3 为准。
- 当前 `SceneCanvas` 已有 `handleCellKeyDown(readOnly, ...)`，但 readOnly 仅阻挡 Delete/Backspace/Cmd/Ctrl+S，方向键与 Enter/Space 仍可能调用 view/select callbacks 或写入 keyboard coordinate。Story 5.3 必须收紧为 Mobile/readOnly 全 no-op。
- 当前 `BuildingLevelPanel` row keydown 对 Enter/Space 调用 `onSelectLayer`，在 Mobile readOnly 下这会改变 `readOnlyViewingLevelId` view command state；应屏蔽 keyboard path，保留 pointer click view path。
- 当前 `AssetPicker` asset keydown 对 ArrowUp/ArrowDown 调整焦点、Enter/Space 调用 `handleAssetActivation`；在 readOnly 下虽不选中素材，但仍可能改变 viewed asset/focus 状态。Story 5.3 需要使 readOnly keyboard path no-op。
- `AppShell` 已通过 `getInteractionMode(window.innerWidth)` 统一 `<768px` readOnly，并提供 `__pokopiaSceneSnapshot` 供本地/Playwright 读取 scene JSON；优先复用该边界做 before/after snapshot 比对。

### Expected Touch Points

- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `e2e/workbench-smoke.spec.ts`
- `docs/功能验收-checklist.md`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-19.md#Issue-Summary]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR18]
- [Source: _bmad-output/planning-artifacts/architecture.md#Mobile-read-only-mode]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Mobile-View-only-Mode]
- [Source: src/components/scene-canvas/SceneCanvas.tsx]
- [Source: src/components/building-level-panel/BuildingLevelPanel.tsx]
- [Source: src/components/asset-picker/AssetPicker.tsx]
- [Source: e2e/workbench-smoke.spec.ts]

## Testing Requirements

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`
- `npm run smoke`

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-19: `npm run typecheck`
- 2026-05-19: `npm test`
- 2026-05-19: `npm run build`
- 2026-05-19: `git diff --check`
- 2026-05-19: `npm run smoke`
- 2026-05-19: `npm test -- src/components/app-shell/AppShell.test.tsx src/components/asset-picker/AssetPicker.test.tsx src/components/building-level-panel/BuildingLevelPanel.test.tsx src/components/scene-canvas/SceneCanvas.test.tsx`
- 2026-05-19: `npm run smoke`
- 2026-05-19: Multi-agent final read-only review found no blocking findings after review fixes.

### Completion Notes List

- SceneCanvas readOnly keyboard path now no-ops for arrows, Enter, Space, Escape, Delete, Backspace, Cmd/Ctrl+S without selection/view callbacks or keyboard target writes.
- BuildingLevelPanel readOnly row keydown no longer changes viewing layer; pointer click viewing path is preserved.
- AssetPicker readOnly keyboard path no longer moves focus or activates asset cards; readOnly filters and hidden detail controls cannot write preferences or change keyboard-only view state.
- AppShell blocks Mobile/readOnly application keys at capture phase, avoids legacy UI preference migration writes, and clears stale desktop keyboard target state when entering Mobile mode.
- AppShell unit and Playwright smoke compare full scene JSON before/after mobile keyboard events and assert saved/autosave storage remains empty.
- Playwright smoke now covers autosaved SceneDocument v1 startup recovery.

### File List

- `_bmad-output/implementation-artifacts/5-3-mobile-keyboard-block-and-regression-tests.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/功能验收-checklist.md`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/io/ui-preferences.ts`

### Change Log

- 2026-05-19: Story created from Epic 5 Story 5.3 and marked ready-for-dev.
- 2026-05-19: Implemented mobile read-only keyboard no-op behavior, added unit/smoke regression coverage, and moved story to review.
- 2026-05-19: Addressed code-review findings, added storage/recovery smoke coverage, and marked story done.
