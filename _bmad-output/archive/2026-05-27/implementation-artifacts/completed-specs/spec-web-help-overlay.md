---
title: 'Web 端遮罩说明'
type: 'feature'
created: '2026-05-26'
status: 'done'
baseline_commit: '9b90296a853dfb8bbee12d301f1f84ec4cca7c9c'
context:
  - '{project-root}/_bmad-output/planning-artifacts/prd.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-design-specification.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Web 编辑器缺少一个轻量的首次使用说明，用户需要在进入工作台时快速理解建筑层、素材选择/锁定放置、喜好筛选、Pokemon 与布景名称这些核心入口。说明不能变成新的页面或长期遮挡工具工作台。

**Approach:** 在 logo 右侧增加一个带原型边框风格的问号图标按钮；点击后显示单页指向式引导遮罩，同时对建筑层、素材选择、喜好筛选、左上 Pokemon/布景名称四个目标做镂空/高亮，并用 dashed 下划线文字和较长的橙色下弯曲线箭头分别指向具体控件边框，曲线起点贴近说明文字下划线。遮罩底部提供醒目的“明白了！”按钮关闭，桌面端宽度大于等于 1280px 且浏览器 storage 没有“已关闭/已看过”标记时默认显示一次；低于 1280px 和 mobile/read-only 模式不默认显示，也不渲染说明遮罩或问号入口。

## Boundaries & Constraints

**Always:** 遮罩状态属于 UI-only preference，必须保存在浏览器 localStorage 或同等现有 UI preference namespace 中，不进入 `SceneDocument`、autosave、saved scene、导出摘要或图片导出流程。遮罩必须使用当前 locale 文案，并且关闭、重新打开、默认显示都不能触发 scene mutation。问号入口必须在 logo 右侧，保留现有品牌链接、语言切换、导出/导入/重置操作。桌面端宽度大于等于 1280px 且 storage 无标记时默认显示；关闭后写入标记；以后刷新不再自动显示，但问号入口仍可手动打开。低于 1280px 和 Mobile View-only Mode 下不自动显示遮罩，且不得引入任何编辑能力。

**Ask First:** 如果需要改变 header 结构到 logo 之外、增加第三方图标库、把教程改回多步引导、或新增 import/share/cloud/account 相关能力，先停下来问用户。

**Never:** 不实现 landing/help page，不把教程内容写入 scene payload，不把 mobile 变成可编辑模式，不引入第三方 tour/highlight 库或跨页面引导，不覆盖导出预览弹窗的职责，不移除现有 toast、导出预览、i18n 或 autosave 行为。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| 首次桌面进入 | 1280px 桌面视口，localStorage 中没有教程已关闭标记 | 自动显示教程遮罩；四个目标同时有镂空/高亮、dashed 下划线文字和橙色下弯曲线箭头，箭头指向具体控件边框；header logo 右侧显示问号按钮；关闭后写入已关闭标记 | localStorage 不可用时仍可显示和关闭，写入失败静默处理 |
| 窄桌面进入 | 1279px 编辑视口，storage 无标记 | 不自动显示教程遮罩，不显示问号入口，不写入已关闭标记；其他编辑能力保持可用 | 无 |
| 手动打开 | 已有已关闭标记，用户点击问号按钮 | 重新显示同一单页指向式教程遮罩；再次关闭不改变 scene/autosave/export storage | 无 |
| Mobile 进入 | 390px mobile/read-only 视口，storage 无标记 | 不自动显示教程遮罩，不显示编辑教程弹层，不写入已关闭标记 | 无 |
| Locale 切换 | 用户在中文/英文 UI 中打开教程 | 标题、底部确认按钮、四条教程内容使用当前 locale；英文文案不挤压按钮 | 缺失文案由类型检查暴露 |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/app-shell/AppShell.tsx` -- header 结构、interaction mode、1280px 引导门槛、单页指向式引导 open/close 状态、四目标区域测量、具体控件箭头锚点测量、storage 标记读写和 mobile 边界。
- `apps/web/src/components/app-shell/AppShell.test.tsx` -- AppShell 级 storage、desktop/mobile、i18n 和“不写 scene storage”回归测试。
- `apps/web/src/io/ui-preferences.ts` -- 现有 `pokopia.uiPreferences.v1` UI-only localStorage namespace；可扩展教程已关闭标记并保持 schema fallback。
- `apps/web/src/io/ui-preferences.test.ts` -- UI preference normalization、坏数据 fallback、storage exception 覆盖。
- `apps/web/src/i18n/index.ts` -- zh-CN/en-US 文案字典和 `t()` 类型约束。
- `apps/web/src/styles.css` -- header 问号按钮、原型边框视觉、镂空 spotlight、dashed 下划线说明文字、橙色下弯曲线箭头、desktop/mobile responsive 样式。
- `apps/web/e2e/workbench-smoke.spec.ts` -- 桌面与 mobile smoke 可补充教程默认显示/隐藏检查。

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/io/ui-preferences.ts` -- 增加教程已关闭标记的默认值、读取归一化和写入 helper -- 让 storage 标记复用 UI-only preference 边界。
- [x] `apps/web/src/i18n/index.ts` -- 增加问号按钮、教程标题、底部确认按钮和四条教程文案的中英文消息 -- 保持现有 i18n 类型检查。
- [x] `apps/web/src/components/app-shell/AppShell.tsx` -- 增加 logo 右侧问号入口、1280px 及以上首次自动打开逻辑、四目标区域测量、关闭写入标记、单页指向式遮罩渲染和低宽度/mobile 隐藏边界 -- 实现用户可见行为。
- [x] `apps/web/src/styles.css` -- 给问号按钮、镂空 spotlight、dashed 下划线说明文字和橙色曲线箭头加原型 border 风格、稳定尺寸、响应式 mobile 隐藏规则 -- 避免 header 抖动和文字重叠。
- [x] `apps/web/src/components/app-shell/AppShell.test.tsx` 和 `apps/web/src/io/ui-preferences.test.ts` -- 覆盖 I/O Matrix 中首次桌面、手动打开、mobile 不显示、locale 和 storage 异常场景 -- 防止偏好写入或 read-only 回归。
- [x] `apps/web/e2e/workbench-smoke.spec.ts` -- 如现有 smoke 入口稳定，补充 desktop 默认教程与 mobile 不显示断言 -- 捕获真实浏览器布局风险。

**Acceptance Criteria:**
- Given 桌面浏览器 storage 没有教程标记, when 用户打开 web 工作台, then 教程遮罩默认显示，并通过镂空/高亮、dashed 下划线文字和橙色下弯曲线箭头同时指向布景名称 input、建筑层 input、喜好筛选 checkbox 和首个素材按钮的边框。
- Given 1279px 或更窄的编辑视口, when 用户打开 web 工作台, then 教程遮罩和问号入口都不显示，并且不会写入教程标记。
- Given 教程遮罩已显示, then 建筑层、喜好筛选、素材选择、左上 Pokemon/布景名称四类说明必须在同一页同时可见，不提供上一步/下一步切换。
- Given 教程遮罩已显示, when 用户点击遮罩底部的“明白了！”按钮, then 遮罩关闭并写入 UI preference 标记，scene/autosave/saved/export storage 不被修改。
- Given 已写入教程已关闭标记, when 用户刷新或重新渲染 AppShell, then 遮罩不自动显示，但点击 logo 右侧问号入口仍可显示。
- Given mobile/read-only 视口, when storage 没有教程标记, then 遮罩不自动显示，且不会写入教程标记或 scene storage。
- Given 用户切换到英文, when 打开教程, then 按钮和遮罩文案使用英文且 header/遮罩文本不溢出。

## Spec Change Log

## Verification

**Commands:**
- `npm run typecheck -w apps/web` -- expected: TypeScript passes.
- `npm test -w apps/web -- AppShell ui-preferences` -- expected: targeted Vitest tests pass.
- `npm run build -w apps/web` -- expected: Vite build and runtime asset verification pass.
- `npm run smoke -w apps/web` -- expected: Chromium smoke passes.
- Browser check at local Vite URL -- expected: desktop shows first-run overlay and question entry; mobile does not show overlay or overlapping header controls.

## Suggested Review Order

1. `../../apps/web/src/components/app-shell/AppShell.tsx` -- review help guide target definitions, 1280px availability threshold, desktop auto-open, multi-target measurement, close handler, header question entry, and single-page guide rendering.
2. `../../apps/web/src/styles.css` -- review question button styling, SVG spotlight holes, curved orange arrows, underlined note text, and mobile hiding rules.
3. `../../apps/web/src/io/ui-preferences.ts` -- review the UI-only `helpOverlayDismissed` preference default, normalization, and write helper.
4. `../../apps/web/src/i18n/index.ts` -- review zh-CN/en-US tutorial copy and button labels.
5. `../../apps/web/src/components/app-shell/AppShell.test.tsx`, `../../apps/web/src/io/ui-preferences.test.ts`, and `../../apps/web/e2e/workbench-smoke.spec.ts` -- review desktop default guide, manual reopen, mobile hidden state, locale, and browser smoke coverage.
