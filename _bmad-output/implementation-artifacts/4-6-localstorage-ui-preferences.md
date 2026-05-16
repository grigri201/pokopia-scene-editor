# Story 4.6: 将非 payload UI 偏好保存到 localStorage

Status: done

## Story

As a 布景编辑用户,
I want 搜索、筛选和预览显示偏好能在同一浏览器中恢复,
So that 我可以继续使用熟悉的工作台视图，而不会污染保存或导出的场景数据。

## Acceptance Criteria

1. Given 用户修改素材搜索词、分类筛选、区域筛选、技能筛选或 favorite-only 状态, when 用户刷新页面或稍后重新打开同一浏览器, then 系统必须从 localStorage 恢复这些素材列表 UI 偏好, and SceneDocument v1 payload 中不得包含这些搜索或筛选字段。
2. Given 用户修改预览显示选项，例如网格、主体边界、技能标记显示或预览层范围, when 用户刷新页面或稍后重新打开同一浏览器, then 系统必须从 localStorage 恢复这些预览 UI 偏好, and 自动保存 payload 与后续显式导出 payload 仍必须完全等于 SceneDocument v1 数据结构。
3. Given localStorage 中的 UI 偏好缺失、过期或格式错误, when 应用启动并加载 SceneDocument v1, then 系统必须回退到默认 UI 偏好, and 不得因此阻止 SceneDocument 恢复、不得修改 scene document、不得修改 dirty state。

## Tasks / Subtasks

- [x] 建立 UI preferences IO 边界 (AC: 1, 2, 3)
  - [x] 新增独立 localStorage key/namespace，不复用 `pokopia.sceneDocument.*`
  - [x] 定义 asset filters 与 preview options 的 typed defaults
  - [x] 读取缺失、过期 schemaVersion 或格式错误数据时回退 defaults，不抛出阻断错误
- [x] 持久化 Asset Picker 筛选偏好 (AC: 1)
  - [x] 搜索词、分类、区域、技能筛选、favorite-only 初始化时从 UI preferences 恢复
  - [x] 用户修改筛选时写回 UI preferences
  - [x] 搜索/筛选偏好不得触发 scene dirty/saved 改变
- [x] 持久化 Preview Inspector 显示偏好 (AC: 2)
  - [x] 网格、主体边界、技能标记和预览层范围初始化时从 UI preferences 恢复
  - [x] 用户修改预览偏好时写回 UI preferences
  - [x] 预览偏好不得进入 autosave/export payload
- [x] 强化测试覆盖 (AC: 1, 2, 3)
  - [x] 单测覆盖 UI preferences 读写、坏 JSON、旧 schemaVersion 和局部非法字段回退
  - [x] AssetPicker/PreviewInspector 或 AppShell 测试覆盖刷新后恢复 UI 偏好
  - [x] IO/roundtrip 测试断言 SceneDocument v1 payload 不包含 UI preferences 字段
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录门禁命令、完成说明和文件列表
  - [x] Review 修复完成后推进到 `done`

## Dev Notes

- Epic 4 Story 4.6 覆盖 FR64、NFR3、NFR9。核心边界是“浏览器本地 UI 偏好”与 `SceneDocument v1` 完全分离。
- Architecture 数据流明确：`UI preference change -> localStorage UI-preferences namespace -> no SceneDocument mutation`。
- 现有 scene storage key 为 `pokopia.sceneDocument.v1` 与 `pokopia.sceneDocument.autosave.v1`；本 story 必须使用独立 key，避免污染保存/自动保存 payload。
- `AssetPicker` 当前在组件内持有 `AssetFilterState`，默认值来自 `defaultAssetFilters`。
- `PreviewInspector` 当前在组件内持有 `previewScope` 和 `displayOptions`。本 story 只持久化显示偏好与预览层范围，不持久化 zoom/pan/focus。
- 4.1/4.2/4.3 已建立 serializer、storage 与 roundtrip 边界。新增测试应继续证明 UI-only 字段不进入 `serializeSceneDocument()`、autosave 或后续显式导出同源 payload。
- localStorage 不可用、坏 JSON 或未知字段不应显示 Recovery Validator 错误；Recovery Validator 只负责 SceneDocument 恢复问题。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npm run smoke`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npm run test -- --run src/io/ui-preferences.test.ts src/components/asset-picker/AssetPicker.test.tsx src/components/preview-inspector/PreviewInspector.test.tsx src/components/app-shell/AppShell.test.tsx`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npm run smoke`
- Code review agents: UI preferences IO review and component behavior review

### Completion Notes List

- 新增 `pokopia.uiPreferences.v1` 独立 namespace，用 typed defaults 保存 asset filters 与 preview preferences。
- AssetPicker 恢复并持久化搜索词、分类、区域、技能筛选和 favorite-only，不触发 scene state。
- PreviewInspector 恢复并持久化网格、主体边界、技能标记和预览层范围，不持久化 zoom/pan/focus。
- AppShell 测试验证 UI preference 改动不会 dirty scene、不会创建 scene autosave，保存后的 SceneDocument payload 不包含 UI-only 字段。
- Review 修复补充 localStorage `getItem`/`setItem` 抛异常时的 best-effort 回退测试。
- Smoke guardrail 用例清理 UI preferences key，避免持久化开关状态串扰响应式断言。

### File List

- `_bmad-output/implementation-artifacts/4-6-localstorage-ui-preferences.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.test.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/asset-picker/AssetPicker.test.tsx`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/io/index.ts`
- `src/io/ui-preferences.ts`
- `src/io/ui-preferences.test.ts`

### Change Log

- 2026-05-16: Story created from Epic 4 Story 4.6 and marked ready-for-dev.
- 2026-05-16: Moved to in-progress for implementation.
- 2026-05-16: Implemented localStorage UI preferences, focused tests, and moved story to review.
- 2026-05-16: Addressed code review feedback, passed full gates, and moved story to done.
