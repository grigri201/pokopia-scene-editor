---
title: '系统级中英文 i18n'
type: 'feature'
created: '2026-05-22T21:24:12+08:00'
status: 'in-review'
route: 'quick-spec-fallback'
baseline_commit: '8d481d89a8ea62b7710f8ceb3c298dd7f9f36010'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/archive/2026-05-27/implementation-artifacts/completed-stories/4-6-localstorage-ui-preferences.md'
---

# 系统级中英文 i18n

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** 当前工作台的可见文案、ARIA、提示、错误、导出预览、素材/Pokemon 名称和技能词表混用中文与英文，系统没有用户可控的语言状态。新增中英文后，用户应能在同一单页工作台内切换语言，且不污染 `SceneDocument v1`。

**Approach:** 增加轻量、类型化的 i18n 层，支持 `zh-CN` 与 `en-US`；默认中文，语言选择写入 `pokopia.uiPreferences.v1`。系统提供的标签、按钮、状态、错误、素材/Pokemon/技能显示名和导出图片文本都从 locale 派生；用户自填的场景名、建筑层名和技能备注保持原文。

## Boundaries & Constraints

**Always:** 默认 `zh-CN`；语言偏好是 UI-only state，只能存入 `uiPreferences`，不得进入 `SceneDocument`、autosave、saved scene 或图片导出业务状态。实现必须使用集中类型和 helper，例如 `Locale`、`t(key, params)`、`formatAsset(asset, locale)`。英文模式下，系统提供的可见文本、ARIA、alt/title、导出预览和下载状态不得出现中文；用户输入原样显示。现有 canonical 数据键、`assetId`、Pokemon key、文件路径、`skillType` 保存值和 schema 不改名。

**Ask First:** 如果要把默认语言改成英文、根据浏览器语言或 URL 自动切换、引入第三方 i18n 库、改变 `SceneDocument` schema、重命名 `树叶/耕地/储水` 这些持久化技能枚举值，必须先暂停并确认。

**Never:** 不新增后端、账号、云同步、分享链接或在线翻译；不自动翻译用户已有中文输入；不手改生成源数据的大型条目；不改变图片资源路径、asset id、Pokemon key 或导出图片生成技术栈。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| 首次进入 | 无 UI preferences | 工作台中文显示，现有默认场景和测试入口行为不变 | 无需提示 |
| 切换英文 | Header 选择 English | 工作台、素材、Pokemon、画布、预览、导出相关系统文案切英文并持久化 | localStorage 不可用时仅本次会话生效 |
| 英文导出 | 英文模式打开下载预览 | modal、图片内容、素材名、技能名、Pokemon 名、alt/title/ARIA 均为英文；用户输入不改写 | 导出失败消息使用英文 |
| 恢复旧偏好 | 旧版 UI preferences 或 malformed locale | 保留可用 assetFilters，locale 回退 `zh-CN`，必要时写回规范化 preferences | 不阻止 SceneDocument recovery |

</frozen-after-approval>

## Code Map

- `src/io/ui-preferences.ts` -- 扩展 UI-only localStorage schema，兼容旧 preferences。
- `src/components/app-shell/AppShell.tsx` -- 顶层 locale 状态、header 语言控件、provider、恢复 toast 和导出入口。
- `src/domain/assets/catalog.ts` / `src/domain/assets/pokemon.ts` -- 素材、分类、标签、技能和 Pokemon 的 locale-aware display helpers。
- `src/domain/scene/default-scene.ts` / `src/domain/scene/levels.ts` / `src/domain/scene/export-summary.ts` -- 默认显示文本、建筑层 display label、导出摘要文本和排序。
- `src/components/asset-picker/AssetPicker.tsx`, `PokemonSceneControls.tsx`, `BuildingLevelPanel.tsx`, `SceneCanvas.tsx`, `SelectionInspector.tsx`, `PreviewInspector.tsx`, `ExportPreview.tsx` -- 迁移硬编码系统文案。
- `src/**/*.test.*`, `e2e/workbench-smoke.spec.ts` -- 覆盖中文默认、英文切换、storage 不污染和英文导出。

## Tasks & Acceptance

**Execution:**
- [x] `src/i18n/` -- 新增 locale 类型、message 字典、参数化 `t`、复数/计数 helper、asset/Pokemon/skill formatter，并让缺失 key 在测试中失败。
- [x] `src/io/ui-preferences.ts` 与测试 -- 在 schema v1 内兼容新增 `locale`；malformed preferences 保持旧 assetFilters 行为，语言偏好不得影响 SceneDocument storage。
- [x] `src/domain/assets/*` 与 `src/domain/scene/*` -- 保留 canonical 数据，新增 locale-aware display helpers；导出摘要接收 locale，不改变 payload schema 或 storage 不变性。
- [x] `src/components/**` -- 迁移硬编码系统文案，并在 header 增加中文/English 语言控件。
- [x] `src/**/*.test.*` 与 `e2e/workbench-smoke.spec.ts` -- 覆盖中文默认、英文模式、下载预览、storage 边界和英文系统文本无中文。

**Acceptance Criteria:**
- Given 没有 UI preferences, when 应用启动, then 界面默认中文且既有中文 smoke 路径仍通过。
- Given 用户选择 English 并刷新, when 页面重新渲染, then 语言保持英文，且 autosaved/saved `SceneDocument` payload 中没有 locale 字段。
- Given 英文模式打开图片导出预览, when 检查 modal、导出内容、素材、技能和 Pokemon 文案, then 系统提供文本均为英文，用户自定义中文内容不被改写。
- Given malformed `pokopia.uiPreferences.v1`, when 应用启动, then locale 回退中文、旧 assetFilters 兼容路径仍生效，SceneDocument recovery 不被阻塞。

## Spec Change Log

## Design Notes

建议保持本地轻量实现，不引入完整 i18n 框架：

```ts
export type Locale = 'zh-CN' | 'en-US';
export function t(locale: Locale, key: MessageKey, params?: MessageParams): string;
export function getAssetDisplay(asset: AssetDefinition, locale: Locale): LocalizedAssetDisplay;
```

`skillType` 的持久值继续是现有中文枚举；英文只在显示边界映射为 `Leaf`、`Tilled Soil`、`Water Storage`。`scene.sceneName`、`buildingLevel.name`、`skillNote` 是用户数据，不自动翻译。

## Verification

**Commands:**
- `npm run typecheck` -- expected: TypeScript passes with locale types and no missing message key errors.
- `npm test` -- expected: unit/component tests pass for Chinese default, English mode, preference migration and export summary localization.
- `npm run build` -- expected: production build succeeds.
- `npm run smoke` -- expected: Playwright covers default Chinese flow, English language switch, export preview, image download trigger and storage boundary.
- `git diff --check` -- expected: no whitespace errors.
