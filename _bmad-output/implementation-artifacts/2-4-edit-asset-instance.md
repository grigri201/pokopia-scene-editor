# Story 2.4: 删除、移动、旋转、染色与备注单个素材实例

Status: done

## Story

As a 布景编辑用户,
I want 对已放置素材执行删除、移动、旋转、染色和备注编辑,
So that 我可以调整布景而不丢失实例信息。

## Acceptance Criteria

1. Given 用户选中一个已放置素材实例, when 用户触发删除操作, then 系统通过 typed command layer 从所在建筑层和坐标删除该实例, and 画布、上下文/检查器字段、建筑层实例数量和 dirty state 从同一 scene state 更新。
2. Given 用户选中一个已放置素材实例, when 用户将其移动到同一建筑层的另一个合法格子, then 系统更新实例坐标, and 保留素材 ID、建筑层、技能标记、技能类型、技能备注、朝向、染色和备注。
3. Given 用户移动素材到已有实例的目标格, when 目标格存在叠放或替换风险, then 系统按素材可叠放属性判断是否允许移动, and 不允许时在执行前显示原因和可执行修复方向。
4. Given 用户选中支持方向的素材实例, when 用户设置朝向为默认 0 度、90 度、180 度或 270 度, then 实例朝向更新并立即反映到画布和上下文/检查器字段, and 默认 0 度不显示额外旋转标记，90/180/270 度应在格内以 Ditto-shaped 旋转标记显示；不支持方向的素材不显示可编辑朝向控件或返回明确只读原因。
5. Given 用户选中可染色素材实例, when 用户打开格内染色入口并选择颜色, then 实例染色状态更新并在格内染色图标上显示当前颜色, and 不支持染色的素材不显示染色入口或返回明确只读原因。
6. Given 用户为已放置素材维护备注, when 用户保存备注文本, then 备注作为普通文本写入该素材实例, and 使用 `<script>`、`<img onerror>` 等字符串测试时不得执行脚本或破坏页面结构。
7. Given 当前建筑层已锁定或处于 Mobile View-only Mode, when 用户尝试删除、移动、旋转、染色或修改备注, then 系统阻止写操作并说明锁定或只读原因, and 不修改 `SceneDocument`、dirty state 或 undo/redo history。

## Tasks / Subtasks

- [x] 建立 typed instance edit command helper (AC: 1-7)
  - [x] 支持删除、移动、旋转、染色和备注更新
  - [x] 校验实例存在、当前建筑层、read-only、锁定层、目标区域兼容和叠放/替换风险
  - [x] 成功时更新同一 `SceneDocument` 并标记 dirty；失败时不修改 scene
- [x] 接入选中实例编辑 UI (AC: 1, 4, 5, 6, 7)
  - [x] Selection Inspector 显示当前实例身份、坐标、朝向、染色、技能和备注
  - [x] 桌面 edit mode 暴露删除、移动、旋转、染色和备注控件
  - [x] 锁定层或 mobile/read-only 下控件只读或明确说明原因
- [x] 接入画布实例状态反馈 (AC: 2, 4, 5)
  - [x] 移动后画布、选中状态和建筑层实例数量同步更新
  - [x] 90/180/270 度显示旋转标记，0 度不显示
  - [x] 染色实例在格内显示当前颜色图标
- [x] 补充测试与 smoke 覆盖 (AC: 1-7)
  - [x] unit tests 覆盖 command success/failure/locked/read-only/stack move
  - [x] component tests 覆盖 Inspector 控件和 Canvas 标记
  - [x] Playwright smoke 覆盖删除、移动、旋转、染色、备注安全文本和 mobile read-only 阻断
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 2.3 已建立 `placeSelectedAsset`，可复用其 read-only、锁定层、区域兼容、叠放/替换语义作为移动实例时的判定参考。
- `TileInstance` 已包含 `rotationDegrees`、`dyeColor`、`requiresSkill`、`skillType`、`skillNote` 和 `note`。本 story 只编辑已放置实例，不改变素材模板。
- 选中同格多实例时，当前 UI 以同格最新实例作为画布主体；本 story 的编辑对象应明确绑定到一个 `instanceId`，避免误改同格其他实例。
- 备注必须作为 React 文本值渲染，不使用 `dangerouslySetInnerHTML`，并用脚本文本作为回归测试。
- Mobile View-only Mode 仍允许查看格子和实例信息，但任何删除、移动、旋转、染色或备注修改必须在 UI handler 和 command boundary 双重阻断。

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
- `npm run test` — passed, 16 test files / 93 tests
- `npm run build` — passed
- `npm run smoke` — passed, 2 Chromium smoke tests
- `git diff --check` — passed

### Completion Notes List

- 已新增 `editAssetInstance` typed command helper，支持删除、移动、旋转、染色和备注更新，并在失败时返回明确 reason/repairHint。
- 已将 Selection Inspector 扩展为选中实例编辑区，写操作绑定当前实例 `instanceId`，支持删除确认、移动坐标、旋转、染色和备注保存。
- 已让 Scene Canvas 显示实例旋转标记与染色图标，0 度不显示旋转标记。
- 已用 smoke 覆盖可旋转/可染色素材的旋转、染色、备注安全文本、移动、删除，以及 mobile read-only 阻断。
- Review 修复：移动非法坐标现在返回 typed failure，Inspector 不再静默 clamp；移动目标会在点击前显示 clear/stack/conflict/invalid 预览。
- Review 修复：同格多实例可通过实例下拉选择明确 `instanceId`；不支持旋转/染色时显示明确只读原因。
- Review 修复：mobile smoke 现在先创建已放置实例再验证实例编辑控件只读；长备注保存后验证实例编辑区不横向溢出。

### File List

- `_bmad-output/implementation-artifacts/2-4-edit-asset-instance.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/selection-inspector/SelectionInspector.test.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/state/asset-instance-edit.test.ts`
- `src/state/asset-instance-edit.ts`
- `src/state/index.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 2 Story 2.4 and moved to in-progress.
- 2026-05-16: Implemented instance edit command, inspector controls, canvas rotation/dye markers, tests, smoke coverage, and moved Story 2.4 to review.
- 2026-05-16: Fixed review findings for move preview/invalid input, explicit capability reasons, stacked instance selection, mobile instance edit coverage, long-note layout, and moved Story 2.4 to done.
