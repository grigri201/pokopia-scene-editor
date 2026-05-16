# Story 3.6: 预览性能、响应式与可访问性保障

Status: done

## Story

As a 布景编辑用户,
I want 预览在不同视口和常见浏览器中保持快速、可访问且不遮挡关键状态,
So that 我可以稳定完成布景结构校验。

## Acceptance Criteria

1. Given 桌面浏览器视口为 1280×720 或以上，场景包含 7×7 画布、10 个建筑层且每层最多 49 个素材实例, when 用户在俯视图和基础正视图之间切换, then 系统在 300ms 内完成首个可见预览更新, and 使用浏览器性能标记或等效自动化计时测量该约束。
2. Given 用户在 1280px 及以上视口使用工作台, when 用户打开任一预览模式并切换当前层、全部可见层、网格、主体边界或技能标记, then 完整浮动工作台无横向滚动，且预览控件、当前建筑层、选中格、主体区边界和技能状态均可访问, and 右侧素材栏、中央画布、左侧建筑层面板和左下双预览检查器的稳定尺寸避免切换状态导致网格跳动。
3. Given 用户在 768px 以下宽度或 390×844 视口使用 Mobile View-only Mode, when 用户打开俯视图或正视图预览, then 页面不得出现控件重叠, and 当前建筑层、选中素材、选中格子、主体区边界和技能标记状态必须在当前预览区域或一次操作可达的详情区域中可访问。
4. Given 用户使用键盘、屏幕阅读器或减少动态效果设置, when 用户访问 Preview Inspector、预览范围控制和显示选项, then 所有主要预览控件具有可访问名称、可见焦点和 WCAG 2.2 AA 基线可读性, and 动态背景或主题过渡不得干扰主体区、外围区、选中、技能标记、锁定层或错误状态识别。

## Tasks / Subtasks

- [x] 建立预览性能保障 (AC: 1)
  - [x] 构造 10 个建筑层 × 每层 49 个实例的 dense preview fixture
  - [x] 覆盖 selector 或 PreviewInspector 更新在 300ms 内完成的自动化计时
  - [x] 保持性能测试不依赖真实后端、外部网络或非确定性数据
- [x] 补强桌面响应式稳定性 (AC: 2)
  - [x] 覆盖 1280×720 下预览范围和显示选项切换后页面无横向滚动
  - [x] 验证 7×7 画布和单格尺寸在预览切换后变化不超过 1px
  - [x] 验证当前建筑层、选中格、主体边界、技能状态在预览区仍可通过 data/accessible name 获取
- [x] 补强 mobile/read-only 预览可达性 (AC: 3)
  - [x] 覆盖 390×844 下 Preview Inspector 不产生横向溢出或控件重叠
  - [x] 验证 mobile 下可切换预览范围和显示选项，但不改变 SceneDocument、dirty state、undo/redo 或保存状态
  - [x] 验证主体边界和技能标记状态仍在预览区域或详情区域可达
- [x] 补强键盘、焦点和减少动态效果保障 (AC: 4)
  - [x] 主要预览按钮保留可访问名称、pressed 状态和键盘触发路径
  - [x] 可交互控件有可见 `focus-visible` 样式，不只依赖浏览器默认不可控表现
  - [x] `prefers-reduced-motion: reduce` 下主题过渡不干扰语义状态识别
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进 Epic 3 和 story 状态

## Dev Notes

- Story 3.1-3.5 已建立双预览检查器、完整 7×7 俯视图、当前层/全部可见层范围、结构化正视图和网格/主体边界/技能标记显示选项。
- `PreviewInspector` 当前从 `src/domain/scene/selectors.ts` 的 `getCurrentLayerPreviewCellContexts`、`getAllVisiblePreviewCellContexts`、`getCurrentLayerFrontPreviewContexts` 和 `getAllVisibleFrontPreviewContexts` 派生数据；本 story 不应复制 area、level ordering、preview ordering 或 skill marker 规则。
- Story 3.5 review 已修复两个相关风险：隐藏网格时 1px cell gap 仍显示格线，以及 Front structure 在窄列下横向溢出。本 story 的响应式断言应防止这些回归。
- `AppShell` 已通过本地 preview host 暴露 `__pokopiaSceneSnapshot` 供 smoke 比对；mobile/read-only 允许 selection、preview mode、current visible level、zoom/pan 和查看详情，但禁止任何 scene 写入。
- `src/styles.css` 已有 `@media (prefers-reduced-motion: reduce)` 关闭 `.app-shell` transition；可在此基础上补强通用 focus-visible 样式。
- 性能覆盖可使用浏览器 `performance.mark` / `performance.measure` 或等效自动化计时；避免把测试写成需要真实 1,000 素材库或网络请求。

## Architecture Guardrails

- `SceneDocument` 仍是唯一业务事实来源；Preview display options、zoom/pan、preview focus 和 performance marks 都是 view/test state，不得进入 scene payload。
- 组件不得直接 mutate scene；新增可见状态必须通过 props、local state 或 selectors 派生。
- `<768px` read-only 是权限边界，不能因为测试或预览优化绕过 command layer / canvas handler / keyboard handler。
- 不引入数据库、后端 API、router、外部状态库或重型 UI 组件库。

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

- `npm run typecheck`
- `npm run test -- --run src/domain/scene/selectors.test.ts src/components/preview-inspector/PreviewInspector.test.tsx`
- `npm run test -- --run`
- `npm run build`
- `npm run smoke`
- `git diff --check`

### Completion Notes List

- Added dense 10-layer / 490-instance preview selector performance coverage under the 300ms budget.
- Added browser performance marks for preview scope and display toggle updates in smoke coverage, including dense 10-layer / 490-instance visible preview updates.
- Added guardrail viewport smoke coverage for 1280×720, 1024×768, 768×1024 and 390×844 preview readability/no-overflow.
- Added visible focus style for core form/button controls, shortened compact preview control labels while preserving full accessible labels, and moved 1024px layouts to the compact single-column path.
- Code review follow-ups removed the runtime scene-writing test hook, switched dense scene loading to Playwright init-only state, and made performance measurement wait for target UI conditions before double-RAF timing.

### File List

- `_bmad-output/implementation-artifacts/3-6-preview-performance-responsive-a11y.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/domain/scene/selectors.test.ts`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 3 Story 3.6 and moved to ready-for-dev.
- 2026-05-16: Story moved to in-progress for implementation.
- 2026-05-16: Story implementation completed and moved to review.
- 2026-05-16: Story reviewed, fixed, and marked done; Epic 3 completed.
