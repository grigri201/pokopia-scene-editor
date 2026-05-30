# Story 10.2: 在选中空格提示框下方编辑当前层备注

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景创作者,
I want 在选中空格提示框下方填写当前层备注,
so that 我不需要离开画布上下文就能记录这一层的搭建说明。

## Acceptance Criteria

1. Given 桌面或平板编辑模式下用户选中当前层空格, When Selection Inspector 渲染, Then 选中空格提示框下方显示当前层备注输入框、添加动作和备注列表。
2. Given 用户输入非空备注并提交, When command layer 接收新增备注, Then 当前建筑层新增一条备注, And 画布格子尺寸、选中状态和当前素材状态不发生布局跳动。
3. Given 当前层已有多条备注, When 用户查看备注列表, Then 备注按保存顺序列出，并支持编辑和删除。
4. Given `<768px` Mobile View-only Mode, When 用户查看选中格或当前层信息, Then 可以查看层备注, And 新增、编辑、删除备注操作被禁用或隐藏，不触发 scene mutation。

## Tasks / Subtasks

- [x] 在 Selection Inspector 显示当前层备注区域 (AC: 1, 3, 4)
  - [x] 在 `SelectionInspector` 接收当前 `buildingLevels`、`selectedContext` 和 read-only 状态后解析当前层 notes。
  - [x] 备注区域显示在当前选中条下方；有备注时按保存顺序列出，无备注时显示轻量空状态。
  - [x] 备注正文用 React 文本节点渲染，HTML-like 文本不得执行。
- [x] 接入备注新增、编辑、删除 UI (AC: 1, 2, 3)
  - [x] 添加备注输入框和添加按钮，非空提交后调用 command layer，并保持选中坐标和当前素材状态。
  - [x] 对每条备注提供编辑和删除控件；编辑保存后只改目标 note。
  - [x] 使用紧凑控制和滚动备注列表，避免扩大 canvas grid 或造成布局跳动。
- [x] 在 AppShell 串接 command layer 和 i18n (AC: 2, 4)
  - [x] 使用 `editBuildingLayer({ type: 'add-note' | 'update-note' | 'delete-note' })`，生成稳定 note id。
  - [x] read-only 下不触发 mutation，移动端只显示备注。
  - [x] 添加 zh-CN/en-US 文案，备注正文保持用户原文，不随 locale 翻译。
- [x] 更新回归测试和门禁 (AC: 1-4)
  - [x] 增加 SelectionInspector 测试：空格下方显示输入、添加、列表、编辑、删除、read-only 只读。
  - [x] 增加 AppShell 测试：添加备注后 autosave payload 的目标层 notes 更新，selected coordinate 和 selected asset 不变。
  - [x] 运行 `pnpm run typecheck`、`pnpm run test`、`pnpm run build`、`git diff --check`。

### Review Findings

- [x] [Review][Patch] 备注面板会出现在非空选择上 — 已限制编辑面板只在空格选择下出现，并补充已放置素材选择不显示备注编辑的测试。
- [x] [Review][Patch] 多个控件共享相同可访问名称 — 已拆分新增/编辑输入 aria-label，并给编辑/删除按钮增加包含序号的 aria-label。
- [x] [Review][Patch] 表单失败提交会丢弃备注草稿 — 已让 AppShell 回调返回 boolean，SelectionInspector 只在成功后清空草稿或退出编辑。
- [x] [Review][Patch] Mobile read-only 当前层信息缺少备注展示 — 已传入当前 BuildingLevel，并在 read-only 无选中格时显示只读备注。
- [x] [Review][Patch] Mobile read-only mutation 回归缺少 AppShell 覆盖 — 已补充 390px 预载备注场景测试，断言备注可见、编辑控件缺席、storage 不变。
- [x] [Review][Patch] 备注列表没有滚动边界 — 已给备注列表添加 `max-block-size` 和 `overflow-y: auto`。
- [x] [Review][Patch] 删除建筑层确认文案硬编码英文 — 已加入 zh-CN/en-US i18n key，并带 item/note count 参数。

## Dev Notes

- Story 10.1 已建立 `BuildingLevel.notes`、schema/recovery/serializer/PSE1 以及 `editBuildingLayer()` 的 add/update/delete note command。10.2 必须复用这些 command，不能直接 mutate `SceneDocument`。[Source: _bmad-output/implementation-artifacts/10-1-building-level-notes-data-contract.md]
- UX 规格要求：选中当前建筑层空格时，备注输入框显示在选中空格提示框下方，并列出当前层已有备注；图片导出预览由后续 story 处理。[Source: _bmad-output/planning-artifacts/ux-design-specification.md#Approved-Course-Correction-2026-05-28-建筑层备注]
- 移动端 `<768px` 是 View-only Mode，现有 AppShell 通过 `interactionMode === 'readOnly'` 和 `readOnly` props 阻止编辑。备注 UI 在 read-only 下只能查看，新增/编辑/删除要隐藏或禁用。[Source: apps/web/src/components/app-shell/AppShell.tsx; _bmad-output/planning-artifacts/epics.md#Story-10.2]
- `SelectionInspector` 当前是画布下方紧凑条，Story 10.2 不能改变 canvas cell 尺寸、选中状态或当前素材选择。备注控件应放在 inspector 内部，避免影响 `.scene-canvas` grid。[Source: apps/web/src/components/selection-inspector/SelectionInspector.tsx; apps/web/src/styles.css]
- 备注正文保持用户原文，不随语言切换自动翻译，并且在工作台中只能作为安全文本渲染。[Source: _bmad-output/planning-artifacts/prd.md#Approved-Course-Correction-2026-05-28-建筑层备注]

### Project Structure Notes

- Expected updates:
  - `apps/web/src/components/selection-inspector/SelectionInspector.tsx`
  - `apps/web/src/components/selection-inspector/SelectionInspector.test.tsx`
  - `apps/web/src/components/app-shell/AppShell.tsx`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/styles.css`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-10.2]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Approved-Course-Correction-2026-05-28-建筑层备注]
- [Source: apps/web/src/components/selection-inspector/SelectionInspector.tsx]
- [Source: apps/web/src/components/app-shell/AppShell.tsx]
- [Source: apps/web/src/state/building-layer-edit.ts]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-28: Story created after Story 10.1 commit `6d618e6`.
- 2026-05-28: Started dev-story implementation and marked tracker in-progress.
- 2026-05-28: Passed focused AppShell and SelectionInspector tests after review fixes.
- 2026-05-28: Optimized an existing Pokemon controls option-order assertion that became too slow in the full suite.
- 2026-05-28: Passed `pnpm run typecheck`.
- 2026-05-28: Passed `pnpm run test`.
- 2026-05-28: Passed `pnpm run build`.
- 2026-05-28: Passed `git diff --check`.

### Completion Notes List

- Added a layer-notes panel below the selection bar for empty selected cells, with add/edit/delete controls in edit mode and ordered safe-text note rendering.
- Added read-only current-layer note viewing, including mobile no-coordinate state, with mutation controls hidden.
- Wired AppShell to the 10.1 building-layer note commands and stable note id generation while preserving selected coordinate and selected asset state.
- Added zh-CN/en-US labels for layer notes and localized delete-layer confirmation with note counts.
- Added bounded scrolling for long/many notes to keep the canvas/workbench layout stable.

### Change Log

- 2026-05-28: Created Story 10.2 and moved status to ready-for-dev.
- 2026-05-28: Started implementation and moved status to in-progress.
- 2026-05-28: Implemented Story 10.2, fixed code review findings, and moved status to done.

### File List

- _bmad-output/implementation-artifacts/10-2-edit-layer-notes-under-empty-selection.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/web/src/components/app-shell/AppShell.test.tsx
- apps/web/src/components/app-shell/AppShell.tsx
- apps/web/src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx
- apps/web/src/components/selection-inspector/SelectionInspector.test.tsx
- apps/web/src/components/selection-inspector/SelectionInspector.tsx
- apps/web/src/i18n/index.ts
- apps/web/src/styles.css
