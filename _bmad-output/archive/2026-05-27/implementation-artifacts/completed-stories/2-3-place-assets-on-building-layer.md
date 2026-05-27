# Story 2.3: 将素材放置到当前建筑层并处理覆盖与叠放

Status: done

## Story

As a 布景编辑用户,
I want 将当前素材放置到当前建筑层的指定格子,
So that 我可以在画布上建立实际布景内容。

## Acceptance Criteria

1. Given 用户已选择当前素材和当前编辑建筑层, when 用户悬停 7x7 画布中的目标格, then Scene Canvas 显示目标坐标、区域类型、当前建筑层、放置合法性、技能状态和覆盖风险, and 主体区、外围区、悬停、不可放置和将覆盖状态不只依赖颜色表达。
2. Given 当前素材适用于目标格区域且当前建筑层未锁定, when 用户点击目标格或用键盘确认放置, then 系统通过 typed command layer 在当前建筑层创建素材实例, and 画布显示该素材实例、选中状态和必要的技能角标。
3. Given 用户在放置前切换本次放置是否需要百变怪技能, when 用户完成放置, then 新实例的技能标记使用本次放置设置, and 技能标记绑定到该素材实例，而不是素材模板、全局坐标或建筑层。
4. Given 同一建筑层同一格子已有素材实例, when 新素材不可与现有实例叠放, then 系统在执行前提示将替换的影响范围, and 用户确认后才用新素材替换已有实例。
5. Given 当前建筑层已锁定或目标区域不兼容, when 用户尝试放置素材, then command layer 返回 typed failure result，画布显示原因和修复方向, and `SceneDocument`、dirty state 和 undo/redo history 不发生修改。
6. Given 视口宽度小于 768px, when 用户通过鼠标、触控或键盘尝试放置素材, then command layer、canvas pointer handler 和 keyboard handler 都阻止该写操作, and 用户仍可选择格子查看信息。

## Tasks / Subtasks

- [x] 建立 typed placement command helper (AC: 1-6)
  - [x] 返回 success/failure/confirmation-required result
  - [x] 校验当前素材、当前建筑层、read-only、区域兼容、锁定层和叠放/替换规则
  - [x] 成功时创建 `TileInstance` 并标记 dirty；失败时不修改 scene
- [x] 接入放置交互与本次技能设置 (AC: 2, 3, 6)
  - [x] Asset Picker 暴露本次放置是否需要百变怪技能 toggle
  - [x] 鼠标点击和键盘 Enter/Space 在 desktop edit 下执行放置
  - [x] mobile/read-only 下仅选择格子查看，不写入 scene
- [x] 显示目标格放置上下文 (AC: 1, 4, 5)
  - [x] 悬停/聚焦目标显示坐标、区域、当前层、合法性、技能状态和覆盖风险
  - [x] 画布格子显示已放置素材实例和技能角标
  - [x] 覆盖或失败原因以文本/状态属性表达，不只依赖颜色
- [x] 覆盖与不兼容处理 (AC: 4, 5)
  - [x] 不可叠放时先提示替换影响范围
  - [x] 用户确认后替换同层同格实例
  - [x] 锁定层或区域不兼容返回 typed failure 并保留 scene/dirty state
- [x] 补充测试与 smoke 覆盖 (AC: 1-6)
  - [x] unit tests 覆盖 placement command success/failure/replace/read-only
  - [x] component tests 覆盖 canvas instance/skill marker 和 keyboard placement
  - [x] Playwright smoke 覆盖选择素材、toggle skill、放置、替换确认、失败不变和 mobile read-only 阻断
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 2.1/2.2 已建立 `AssetPicker`、`workspaceState.selectedAssetId` 和筛选 UI-only state。本 story 只能把实际放置写入 `SceneDocument.tileInstances`，筛选状态仍不得进入 scene payload。
- 当前 `createTileInstance` 位于 `src/domain/scene/tile-instance.ts`，应复用它创建完整 v1 字段。
- 区域兼容来自 asset catalog 的 `applicableAreas`；默认技能来自 asset metadata，但本次放置 toggle 可以覆盖 `requiresSkill`。
- 不可叠放/替换必须在执行前确认；可以使用浏览器 confirm 作为 MVP 确认提示，但 command helper 必须先返回 typed confirmation-required result。
- 失败结果应作为本地 UI feedback 呈现，不应写入 `SceneDocument` 或 dirty state。
- Mobile View-only Mode 仍允许点选格子查看信息，但 pointer/keyboard handlers 和 command helper 都必须阻止写操作。

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
- `npm run test` — passed, 14 test files / 84 tests
- `npm run build` — passed
- `npm run smoke` — passed, 2 Chromium smoke tests
- `git diff --check` — passed

### Completion Notes List

- 已新增 typed placement command helper，覆盖 success、failure、replace-confirmation-required、read-only、锁定层和区域不兼容结果。
- 已将当前素材放置接入 AppShell，desktop edit 下点击或 Enter/Space 创建 `TileInstance` 并标记 dirty；失败只显示本地 feedback。
- 已在 Asset Picker 中加入本次放置百变怪技能 toggle，并在新实例上写入实例级 `requiresSkill` / `skillType`。
- 已让 Scene Canvas 显示已放置素材名和技能角标，Selection Inspector 显示目标放置合法性、技能状态、覆盖风险和修复提示。
- 已用 smoke 覆盖放置、替换确认、不兼容失败不改 scene 和 mobile read-only 键盘查看/阻断。
- Review 修复：叠放 preview 明确区分 `will-stack` 与 `will-replace`；同格多实例以最新实例作为画布主体并显示堆叠数量，Inspector 列出同格实例栈。
- Review 修复：键盘 Arrow 后立即 Enter 使用最新键盘目标放置；mobile read-only 下 pointerdown 即记录查看坐标，避免 focus 触发布局移动导致 click 丢失。
- Review 修复：非技能候选素材禁用本次技能 toggle，command helper 也会在边界层忽略不合法的 `requiresSkill`。

### File List

- `_bmad-output/implementation-artifacts/2-3-place-assets-on-building-layer.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/domain/assets/catalog.ts`
- `src/domain/scene/selectors.ts`
- `src/state/asset-placement.test.ts`
- `src/state/asset-placement.ts`
- `src/state/index.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.3 and marked ready for development.
- 2026-05-16: Implemented asset placement command, scene canvas instance rendering, skill toggle, placement feedback, replacement confirmation, tests, smoke coverage, and moved Story 2.3 to review.
- 2026-05-16: Fixed review findings for stack visibility/preview, keyboard target confirmation, mobile read-only pointer handling, skill toggle eligibility, and moved Story 2.3 to done.
