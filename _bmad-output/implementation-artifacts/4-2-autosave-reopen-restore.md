# Story 4.2: 保存当前布景并重新打开恢复

Status: done

## Story

As a 布景编辑用户,
I want 保存当前布景并在之后重新打开,
So that 我可以继续编辑之前构建的 7×7 布景。

## Acceptance Criteria

1. Given 用户在桌面或平板编辑模式下修改了当前布景, when 用户执行保存操作或自动保存草稿触发, then 系统必须保存符合 SceneDocument v1 Zod schema 的当前布景数据, and 保存数据必须完整包含 sceneId、场景名称、Decor Dex Pokemon key、场景尺寸、画布尺寸、外围扩展格数、所有建筑层、当前编辑建筑层、当前素材、选中坐标、素材实例、坐标、区域类型、rotationDegrees、染色、技能标记、备注和 dirty/saved 状态, and 自动保存写入的 payload 必须与后续显式导出使用的 payload 完全相同。
2. Given 当前布景已经成功保存, when 用户重新打开保存数据, then 系统必须恢复相同的场景名称、Pokemon、建筑层、当前编辑建筑层、当前素材、选中坐标、可见性、锁定状态、素材实例、坐标、rotationDegrees、染色、技能状态、备注内容和 dirty/saved 状态, and 恢复后的 scene state 必须与保存前的可编辑状态等价。
3. Given 保存操作成功完成, when 用户继续查看当前布景, then dirty state 必须反映当前数据已经保存, and 不得因为保存序列化过程额外产生 undo/redo 编辑记录。
4. Given 用户处于 `<768px` Mobile View-only Mode, when 用户查看保存相关控件, then 保存操作不得改变 scene document 或 dirty state, and 界面必须明确表达移动端只读限制。

## Tasks / Subtasks

- [x] 创建本地 SceneDocument storage 边界 (AC: 1-2)
  - [x] 在 `src/io/scene-storage.ts` 定义 saved/autosave localStorage key、write/read API 和 latest restore 选择
  - [x] 所有写入必须通过 `serializeSceneDocument`，保证与后续显式导出共享同一 payload
  - [x] 读取时通过 SceneDocument v1 schema 恢复为 domain `SceneDocument`，并补回 UI-only `saveError: null`
- [x] 接入 AppShell 保存和启动恢复 (AC: 1-3)
  - [x] Save 按钮成功时先生成 saved scene，再写入 saved/autosave storage，最后更新 scene 为 `saved`
  - [x] 保存失败时保留当前 scene 内容并设置 `saveError`
  - [x] 应用启动时优先恢复最新合法 saved/autosave payload；Playwright 初始快照 hook 仍可覆盖 storage
  - [x] 保存/恢复不得推入 undo/redo history
- [x] 接入自动保存草稿 (AC: 1-2)
  - [x] scene 处于 dirty 且非 read-only 时自动保存 autosave payload
  - [x] autosave 不改变 scene document、dirty state 或 undo/redo history
  - [x] manual save 后 saved/autosave payload 保持同一语义数据，避免旧草稿覆盖新保存
- [x] 保持 Mobile read-only 保存保护 (AC: 4)
  - [x] read-only 模式下保存按钮保持 disabled，状态文案继续表达 `Read-only`
  - [x] 只读模式不得写入 localStorage 或改变 dirty state
- [x] 补充测试和记录
  - [x] storage/recovery 单元测试覆盖 saved/autosave 写入、latest restore、字段恢复和 saveError 排除
  - [x] AppShell 组件测试覆盖保存、重新挂载恢复、保存不创建 undo、mobile read-only 不保存
  - [x] Dev Agent Record 记录门禁命令、完成说明和文件列表

## Dev Notes

- Story 4.1 已提交 SceneDocument v1 契约：`src/io/scene-schema.ts`、`src/io/scene-serializer.ts`。4.2 必须复用这些 API，不能创建另一个 payload 结构。
- Architecture 指定 IO 边界为 `src/io/*`：schema validation、serialization、local scene storage、recovery。`src/components/*` 可以为了保存/恢复 UI 调用 IO，但 domain 不得 import React/DOM/components。
- 当前 `AppShell` 的 save 只调用 `sceneReducer(... save-scene ...)` 标记状态，尚未写 localStorage；保存成功不应使用 `commitSceneEdit`，避免保存动作进入 undo stack。
- 当前 `createInitialSceneDocument` 已有 Playwright-only `__pokopiaInitialSceneSnapshot` hook。恢复 storage 时应保留该 hook 的优先级，避免破坏已有 smoke/dense preview 测试。
- 当前 `PokemonSceneControls` 已在 read-only 下禁用 Save，并通过状态文本显示 `Read-only · Saved`。4.2 不需要新增恢复错误 UI；失败保护和 Recovery Validator 由 4.4/4.5 扩展。
- localStorage UI preferences 在 4.6 实现，4.2 不得把搜索、筛选、预览显示选项写入 SceneDocument。

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
- `npm run test -- --run src/io/scene-recovery.test.ts src/io/scene-storage.test.ts src/components/app-shell/AppShell.test.tsx`
- `npm run test`
- `npm run build`
- `git diff --check`
- Code review agents: save/read-only review and recovery/data-consistency review

### Completion Notes List

- 新增 `scene-recovery`，将合法 SceneDocument v1 payload 恢复为 domain `SceneDocument`，并补回 UI-only `saveError: null`。
- 新增 `scene-storage`，统一 saved/autosave localStorage key、写入、读取和按 `metadata.updatedAt` 选择最新合法 payload。
- AppShell Save 现在先生成 `saved` scene，再写 saved/autosave 两个 slot，保存成功不进入 undo history；失败时保留当前 scene 并显示 saveError。
- AppShell 在启动时恢复最新合法 saved/autosave payload，同时保留 Playwright initial snapshot hook 的覆盖优先级。
- dirty scene 在非 read-only 模式下自动写 autosave payload；autosave 不修改 scene、dirty state 或 undo/redo history。
- 补充 storage/recovery/AppShell 测试覆盖保存、重开恢复、autosave、undo 和 mobile read-only 保护。
- Review 修复：saved 状态下的 workspaceState 选择变化也会写入 autosave；Undo/Redo 应用历史快照时会与 saved payload 对比，不一致则重新标记 dirty，避免回到未保存内容却显示 Saved。

### File List

- `_bmad-output/implementation-artifacts/4-2-autosave-reopen-restore.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/app-shell/AppShell.tsx`
- `src/components/app-shell/AppShell.test.tsx`
- `src/io/index.ts`
- `src/io/scene-recovery.ts`
- `src/io/scene-recovery.test.ts`
- `src/io/scene-storage.ts`
- `src/io/scene-storage.test.ts`

### Change Log

- 2026-05-16: Story created from Epic 4 Story 4.2 and moved to in-progress for implementation.
- 2026-05-16: Implemented scene storage, startup recovery, autosave, tests, and moved story to review.
- 2026-05-16: Addressed code review findings, passed release gates, and moved story to done.
