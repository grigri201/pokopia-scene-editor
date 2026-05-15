# Story 1.1: 从 Vite React TypeScript starter 初始化项目

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景作者,
I want 打开应用后直接看到可用的编辑工作台,
so that 我不需要经过 landing page 或说明页就能开始理解 5x5 布景规则。

## Acceptance Criteria

1. Given 仓库中尚未有完整前端应用骨架, when dev agent 初始化项目, then 应使用 Vite + React + TypeScript starter 建立客户端优先静态 Web App, 并完成依赖安装和初始配置, and 不得引入数据库、认证、后端 API、服务端运行时、路由或公开内容页。
2. Given 应用在 1280x720 或以上桌面视口启动, when 用户打开首页, then 第一屏应是 Open Design 编辑工作台, and 顶部 Pokemon/场景名/保存状态、右侧浮动素材栏、中央 7x7 画布区域、左侧建筑层面板和左下检查器预览区域应形成稳定工作台布局。
3. Given 项目完成初始化, when dev agent 检查源码结构, then 应建立 `src/domain/scene/`、`src/domain/assets/`、`src/state/`、`src/components/`、`src/io/`、`src/theme/`、`src/test/` 和 `e2e/` 边界, and domain modules 不得 import React、DOM 或 components。
4. Given 项目完成初始化, when dev agent 运行质量门禁, then `npm run typecheck`、unit test scaffold、`npm run build` 和 Playwright smoke scaffold 应可执行, and production build 输出应是静态 `dist/`, 运行时不得依赖 `_bmad-output/`、Node server APIs、数据库或 serverless functions。

## Tasks / Subtasks

- [x] 初始化 Vite React TypeScript 项目骨架并保留现有 BMAD/文档资产 (AC: 1)
  - [x] 创建 `package.json`、Vite/TS 配置、`index.html` 和 React entrypoint
  - [x] 使用客户端静态 SPA, 不添加 router、server runtime、数据库、认证或 API 目录
  - [x] 将 `npm run dev`、`npm run typecheck`、`npm run test`、`npm run build` 和 Playwright smoke 命令写入 scripts
- [x] 建立架构要求的源码边界 (AC: 3)
  - [x] 创建 `src/domain/scene/`、`src/domain/assets/`、`src/state/`、`src/components/`、`src/io/`、`src/theme/`、`src/test/` 和 `e2e/`
  - [x] 添加最小 domain module 和测试, 确认 domain 不 import React、DOM 或 components
  - [x] 保持 `_bmad-output/`、`docs/`、`assets/` 为构建输入外的文档/静态资产边界
- [x] 实现首屏 Open Design 工作台 scaffold (AC: 2)
  - [x] 首页直接渲染工具型编辑工作台, 不出现 landing page/hero/营销页
  - [x] 同屏呈现顶部 Pokemon/场景名/保存状态、右侧素材栏、中央 7x7 画布、左侧建筑层面板和左下检查器预览
  - [x] 画布和面板使用稳定尺寸, 1280px+ 不出现横向滚动条
- [x] 建立质量门禁 scaffold (AC: 4)
  - [x] Vitest 至少包含一个可运行的 domain test
  - [x] Playwright 至少包含一个桌面 smoke, 验证工作台和 49 个 canvas cells 可定位
  - [x] `npm run typecheck`、`npm run test`、`npm run build`、Playwright smoke 均可执行
- [x] 更新故事记录和 sprint 状态 (AC: 1-4)
  - [x] Dev Agent Record 记录执行命令、完成说明和文件列表
  - [x] 完成后将 story 状态推进到 `review`

### Review Findings

- [x] [Review][Patch] Playwright smoke should not reuse a stale dev server and should exercise built static output [`playwright.config.ts`, `package.json`] — fixed by running `npm run build && npm run preview -- --port 4173 --strictPort` and setting `reuseExistingServer: false`.
- [x] [Review][Patch] Static deployment under a non-root path can 404 assets [`vite.config.ts`] — fixed by setting Vite `base` from `VITE_PUBLIC_BASE_PATH` with `./` fallback.
- [x] [Review][Patch] ARIA grid lacks explicit row semantics [`src/components/scene-canvas/SceneCanvas.tsx`] — fixed by rendering `role="row"` wrappers plus row/column indices.
- [x] [Review][Patch] Mobile viewport still showed editable scaffold affordances [`src/components/app-shell/AppShell.tsx`, `src/components/pokemon-scene-controls/PokemonSceneControls.tsx`, `src/components/asset-picker/AssetPicker.tsx`] — fixed by wiring `interactionMode` into controls and adding mobile read-only smoke coverage.
- [x] [Review][Patch] Desktop grid can overflow around 981-1003px [`src/styles.css`] — fixed by raising the single-column breakpoint to 1023px.
- [x] [Review][Dismiss] Package lock absent from Blind Hunter diff — dismissed because the review diff intentionally excluded `package-lock.json`; the generated `package-lock.json` exists in the worktree and is included in the story file list for commit.

## Dev Notes

### Story 来源

- Story 1.1 来自 `_bmad-output/planning-artifacts/epics.md` 的 `Epic 1: 规则可见的 7x7 布景工作台` / `Story 1.1: 从 Vite React TypeScript starter 初始化项目`。
- Requirements covered: FR1, FR58, NFR20, NFR21, UX-DR1, UX-DR2, Architecture starter setup。

### 架构约束

- 技术栈选择为 Vite + React + TypeScript。架构文档指定 MVP 是客户端优先静态 Web App, 不需要账号系统、后端 API、服务端渲染、支付、实时协作或公开内容页。Source: `_bmad-output/planning-artifacts/architecture.md` sections `Selected Starter`, `Technology Baseline`, `MVP Boundary`。
- 目录边界必须保留:
  - `src/domain/scene/`: scene document 类型、area 计算、building level 规则、tile instance 规则。
  - `src/domain/assets/`: asset catalog 类型、搜索筛选和适用区域规则。
  - `src/state/`: scene state、command dispatch、undo/redo、dirty state、autosave state、interactionMode。
  - `src/components/`: Scene Canvas、Asset Picker、Building Level Panel、Selection Inspector、Preview Inspector、Pokemon Scene Controls、Recovery Validator。
  - `src/io/`: scene storage、scene serialization、schema validation、safe text handling。
  - `src/theme/`: 动态宝可梦主题 tokens 和语义色 tokens。
  - `e2e/`: Playwright specs。
- Domain modules must not import React、DOM 或 components。后续 story 会依赖这个边界扩展领域模型和 command layer。Source: `_bmad-output/planning-artifacts/architecture.md` `Unified Project Structure`, `Dependency Rules`。
- MVP 不引入 React Router。首页就是单页工作台。Source: `_bmad-output/planning-artifacts/architecture.md` `Routing Decision`。
- Production build 必须输出静态 `dist/`, 且运行时不得依赖 `_bmad-output/`、Node server APIs、database server 或 serverless functions。Source: `_bmad-output/planning-artifacts/architecture.md` `Static Deployment`。

### UX / Open Design 约束

- 第一屏应直接是 Direction A / Decor Dex Workbench: 左侧素材与搜索, 中央 7x7 编辑画布, 右侧选中实例属性和预览状态, 顶部工具栏承载保存、撤销、重做、网格、主体边界和技能标记等高频操作。Source: `_bmad-output/planning-artifacts/ux-design-specification.md` `Selected Direction`。
- 该 story 只需要可运行 scaffold, 但视觉结构必须已经表达: 当前 Pokemon、场景 Name、保存状态、右侧素材栏、中央 7x7 画布、左侧建筑层面板、左下俯视/正视预览检查器。Source: `_bmad-output/planning-artifacts/prd.md` `Open Design Workbench Context`。
- 不要做 landing page、hero-scale 字号、卡片套卡片或装饰性背景。工作台必须像工具, 不是营销页。Source: `_bmad-output/planning-artifacts/prd.md` NFR28。
- `<768px` 的严格只读边界在 Story 1.6 完整实现；本 story 的 scaffold 不应引入会阻碍后续 read-only command guard 的设计。

### 测试要求

- `npm run typecheck` 必须通过。
- Vitest scaffold 必须可运行, 至少覆盖一个 domain helper 或架构边界 helper。
- `npm run build` 必须通过并输出静态 `dist/`。
- Playwright smoke scaffold 必须可执行, 至少验证桌面首页不是 landing page、工作台区域存在、7x7 画布有 49 个可定位格子。

### 实现注意事项

- 当前仓库已有 `_bmad-output/`、`docs/` 和 `assets/pokopia_image_sources/`。不要删除、搬移或把规划文档作为运行时依赖。
- `assets/pokopia_image_sources/` 是后续素材 story 的数据源。本 story 可以不消费完整素材数据, 但不要破坏其路径。
- 可以参考 `_bmad-output/planning-artifacts/open-design-ui/index.html` 的布局方向, 但实现应进入 React/Vite 源码, 不应把原型 HTML 当运行时主页面照搬。
- 若安装依赖, 保持 package manager 一致。当前仓库没有 lockfile, 可以使用 npm 并提交生成的 `package-lock.json`。

### Project Structure Notes

- 本 story 是后续所有 story 的基础。不要预先实现 Epic 2-4 的完整业务, 但可以提供清晰 placeholder 与 typed boundary, 方便后续 story 增量填充。
- `src/domain/*` 的测试不应依赖 React 渲染。组件测试和 Playwright 在后续 story 可逐步扩展。

### References

- `_bmad-output/planning-artifacts/epics.md`: Epic 1 / Story 1.1
- `_bmad-output/planning-artifacts/architecture.md`: Selected Starter, Unified Project Structure, Dependency Rules, Static Deployment
- `_bmad-output/planning-artifacts/prd.md`: Open Design Workbench Context, MVP Scope, NFR20, NFR21, NFR28
- `_bmad-output/planning-artifacts/ux-design-specification.md`: Direction A / Decor Dex Workbench, responsive rules
- `_bmad-output/planning-artifacts/open-design-ui/index.html`: visual prototype reference only

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm install` passed; 118 packages installed, 0 vulnerabilities.
- `npm run typecheck` passed.
- `npm run test` initially failed because Vitest discovered `e2e/workbench-smoke.spec.ts`; fixed by restricting Vitest to `src/**/*.test.{ts,tsx}` and excluding `e2e/**`.
- `npm run test` passed: 1 file, 3 tests.
- `npm run build` passed; Vite generated static `dist/`.
- `npm run smoke` initially failed because Playwright lacked `baseURL`; fixed `playwright.config.ts`.
- `npm run smoke` initially failed a strict label lookup for Preview Inspector; fixed the smoke test to use complementary landmarks.
- `npm run smoke` passed: 1 Chromium smoke test.
- Code review ran with Blind Hunter, Edge Case Hunter and Acceptance Auditor. Acceptance Auditor was clean; patch findings were applied.
- After review fixes, `npm run typecheck`, `npm run test`, `npm run build` and `npm run smoke` passed. Smoke now runs against built `dist/` via `vite preview` and covers desktop workbench plus mobile read-only scaffold.

### Completion Notes List

- Initialized a Vite 8 + React 19 + TypeScript 6 static SPA using npm and committed lockfile-ready dependency metadata.
- Added the first-screen Open Design workbench scaffold with Pokemon/scene controls, left building level panel, central 7x7 canvas, left-bottom preview inspector, and right asset picker.
- Added domain-only 7x7 area rules and Vitest coverage to establish the `src/domain/scene/` boundary without React/DOM imports.
- Added Playwright Chromium smoke coverage for the first-screen workbench and 49 addressable canvas cells.
- Added `.gitignore` so generated build, test output and `node_modules/` stay out of commits.
- Applied review fixes for production smoke, static base path, ARIA grid rows, mobile read-only scaffold and 1023px responsive breakpoint.

### File List

- `.gitignore`
- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `playwright.config.ts`
- `public/assets/.gitkeep`
- `src/main.tsx`
- `src/App.tsx`
- `src/vite-env.d.ts`
- `src/styles.css`
- `src/domain/scene/area.ts`
- `src/domain/scene/area.test.ts`
- `src/domain/scene/index.ts`
- `src/domain/assets/index.ts`
- `src/state/interaction-mode.ts`
- `src/state/index.ts`
- `src/io/index.ts`
- `src/theme/tokens.ts`
- `src/theme/index.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/test/setup.ts`
- `e2e/workbench-smoke.spec.ts`

### Change Log

- 2026-05-16: Story created from BMAD epics, PRD, architecture and UX artifacts.
- 2026-05-16: Implemented Vite React TypeScript starter, workbench scaffold, source boundaries, unit test and Playwright smoke scaffold.
- 2026-05-16: Applied multi-agent code-review fixes and marked Story 1.1 done.
