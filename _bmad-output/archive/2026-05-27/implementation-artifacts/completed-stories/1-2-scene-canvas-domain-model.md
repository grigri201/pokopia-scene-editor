# Story 1.2: 建立 5x5 场景与 7x7 画布的领域模型

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景作者,
I want 新建场景时自动获得标注为 5x5 的布景和实际 7x7 编辑画布,
so that 我能在明确的规则边界内规划主体区与外围装饰区。

## Acceptance Criteria

1. Given 用户创建新的默认场景, when 系统生成 `SceneDocument`, then `sceneId`、`sceneName`、`selectedPokemonKey`、`sceneSize`、`canvasSize`、`outerPadding`、`workspaceState` 和 `metadata` 必须完整存在, and `selectedPokemonKey` 必须使用 Decor Dex 现有 Pokemon key, `sceneSize` 应为 5x5, `canvasSize` 应为 7x7, `outerPadding` 应为 1, and 场景名称或场景说明中应清楚标注这是 5x5 布景。
2. Given 系统生成默认 `SceneDocument`, when dev agent 检查建筑层数据, then 应默认创建 0 层、1 层、2 层三个建筑层, and 应提供纯函数或领域规则为后续新增建筑层分配当前最高层号加 1 的层号。
3. Given 任意画布格子坐标, when 系统计算格子区域, then x/y 坐标应使用 0-based 坐标并限制在 0..6, and x 为 0 或 6、或 y 为 0 或 6 的格子应计算为 `outer`, 其他格子应计算为 `main`。
4. Given 领域模型需要表达可放置区域, when dev agent 检查 area calculation 和可放置区域规则, then 主体区和外围装饰区都应被标记为 MVP 可放置区域, and 该规则应通过 pure domain function 暴露给后续素材放置 story 复用, 而不是写死在组件中。
5. Given 领域模型和默认场景规则已实现, when dev agent 运行 unit tests, then 测试应覆盖 sceneId、sceneName、selectedPokemonKey、workspaceState、metadata、scene size、canvas size、outer padding、0-based 坐标范围、main/outer 判断、默认 0/1/2 建筑层和新增层号规则, and 业务规则测试应位于 domain/state 边界内, 不依赖 React 渲染。

## Tasks / Subtasks

- [x] 定义 `SceneDocument` v1 的最小领域类型 (AC: 1)
  - [x] 在 `src/domain/scene/` 添加 scene document、workspace state、building level、coordinate、metadata 类型
  - [x] 默认 `selectedPokemonKey` 使用现有 Decor Dex key `ditto`
  - [x] `sceneName` 或说明字段明确包含 5x5 布景语义
- [x] 实现默认场景创建规则 (AC: 1, 2)
  - [x] 添加纯函数创建默认 `SceneDocument`
  - [x] 默认包含 0/1/2 三个建筑层、当前编辑层和 saved 状态
  - [x] 创建函数支持测试注入 `sceneId` 和时间, 避免 flaky tests
- [x] 完善画布与区域领域函数 (AC: 3, 4)
  - [x] 使用 0-based x/y 并限制在 0..6
  - [x] 主体区/外围区判断从尺寸规则派生, 不写死在组件中
  - [x] 暴露 `isPlaceableArea` 或等价 pure function, 主体区和外围区都返回可放置
- [x] 实现建筑层规则 (AC: 2)
  - [x] 默认层号为 0/1/2, 数据顺序保持从低到高
  - [x] 提供新增层号分配: 当前最高层号 + 1
  - [x] 提供 UI 展示排序 helper: 高层到低层
- [x] 添加 focused unit tests (AC: 5)
  - [x] 覆盖默认 scene 字段、metadata、workspaceState、尺寸和 selected Pokemon
  - [x] 覆盖 49 格、main/outer、越界抛错、主体/外围都可放置
  - [x] 覆盖默认 0/1/2 建筑层、新层号和展示排序
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录执行命令、完成说明和文件列表
  - [x] 完成实现后推进到 `review`

### Review Findings

- [x] [Review][Patch] Area calculation ignored `sceneSize` and insufficiently validated dimension invariants [`src/domain/scene/area.ts`] — fixed by validating positive integer scene/canvas sizes, enforcing `canvasSize = sceneSize + 2 * outerPadding`, and deriving `main` from `outerPadding + sceneSize`.
- [x] [Review][Patch] Default scene factory accepted invalid selected coordinates [`src/domain/scene/default-scene.ts`] — fixed by reusing `assertCanvasCoordinate` before writing `workspaceState.selectedCoordinate`.
- [x] [Review][Patch] Default scene factory accepted unknown Pokemon keys [`src/domain/scene/default-scene.ts`, `src/domain/assets/pokemon.ts`] — fixed with a Decor Dex seed key set and runtime assertion.
- [x] [Review][Patch] Custom scene names could omit the required 5x5 label [`src/domain/scene/default-scene.ts`] — fixed with scene name validation.
- [x] [Review][Patch] Metadata timestamps could be non-ISO strings [`src/domain/scene/default-scene.ts`] — fixed with ISO 8601 UTC validation.
- [x] [Review][Patch] Default dimensions were exposed as a mutable singleton [`src/domain/scene/default-scene.ts`] — fixed by returning a copy from `getDefaultSceneDimensions`.
- [x] [Review][Patch] Building level helper allowed negative or fractional level numbers [`src/domain/scene/levels.ts`] — fixed with level number validation and tests.
- [x] [Review][Patch] TileInstance fields did not align with SceneDocument v1 and areaType could diverge from coordinate [`src/domain/scene/types.ts`, `src/domain/scene/tile-instance.ts`] — fixed by aligning instance fields and adding `createTileInstance` to derive `areaType`.
- [x] [Review][Patch] Unit tests under-covered y-axis and generated coordinate range [`src/domain/scene/area.test.ts`, `src/domain/scene/default-scene.test.ts`] — fixed with y-boundary, min/max, default building-level, invalid override and tile instance tests.

## Dev Notes

### Previous Story Intelligence

- Story 1.1 已初始化 Vite + React + TypeScript 静态 SPA, 并建立 `src/domain/scene/`、`src/domain/assets/`、`src/state/`、`src/components/`、`src/io/`、`src/theme/`、`src/test/` 和 `e2e/` 边界。
- `src/domain/scene/area.ts` 已存在固定 7x7 canvas helper 和 Vitest。当前 story 应扩展这些 pure domain rules, 不应把领域判断移入组件。
- Playwright smoke 已改为对 production `dist` 跑 `vite preview`; 本 story 的主要验证应以 Vitest domain tests 为主, 但仍需保证全量 quality gates 通过。

### Architecture Guardrails

- `SceneDocument` 是唯一业务事实来源；画布、上下文/检查器字段、建筑层列表、预览和保存/恢复校验必须从同一个 scene state 派生。Source: `_bmad-output/planning-artifacts/architecture.md` `Scene Data Model`。
- 固定 MVP 规则: `sceneSize = 5x5`, `canvasSize = 7x7`, `outerPadding = 1`。MVP 只接受当前 SceneDocument v1 的完整字段集合。Source: `_bmad-output/planning-artifacts/architecture.md` `Data Model Decisions`。
- 坐标的权威判断来自 `x/y + sceneSize + outerPadding` 的纯函数。序列化可保留 `areaType`, 但恢复时必须重新计算和比对。Source: `_bmad-output/planning-artifacts/architecture.md` `Area Calculation`。
- Building Level Management: 默认 0/1/2 建筑层, 层号递增, 数据按 0 层到 n 层组织, UI 按 L2/L1/L0 高层到低层展示。Source: `_bmad-output/planning-artifacts/architecture.md` `Architecture Summary`。
- Domain modules 仍不得 import React、DOM 或 components。

### Scope Boundaries

- 本 story 不实现素材放置、删除、移动、染色、技能标记、保存/恢复 UI 或 Zod schema。只建立后续 story 复用的领域模型和 pure rules。
- 不引入后端、数据库、路由或外部状态库。
- UI 可以继续使用 Story 1.1 的 scaffold 数据；若为了使用新 domain model 做轻量接入, 不得扩大到 Epic 2 的编辑闭环。

### Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`

### References

- `_bmad-output/planning-artifacts/epics.md`: Story 1.2
- `_bmad-output/planning-artifacts/architecture.md`: Scene Data Model, Data Model Decisions, Area Calculation, Dependency Rules
- `_bmad-output/implementation-artifacts/1-1-vite-react-typescript-starter.md`: previous implementation patterns and review fixes

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck` passed.
- `npm run test` passed: 3 files, 11 tests.
- `npm run build` passed.
- `npm run smoke` passed: 2 Chromium smoke tests against production `dist`.
- Code review ran with Blind Hunter, Edge Case Hunter and Acceptance Auditor. Patch findings were applied.
- After review fixes, `npm run typecheck`, `npm run test`, `npm run build` and `npm run smoke` passed. Unit coverage is now 4 files, 21 tests.

### Completion Notes List

- Added `SceneDocument` v1 TypeScript model with workspace state, metadata, building levels and tile instance shape.
- Added deterministic `createDefaultSceneDocument` with injectable scene id, timestamp, selected Pokemon and selected coordinate.
- Extended canvas area rules to derive from scene dimensions and expose MVP `isPlaceableArea`.
- Added building level helpers for default 0/1/2 levels, next level number and high-to-low display sorting.
- Added focused Vitest coverage for default scene, area rules and building level rules.
- Applied review fixes for dimension invariants, selected coordinate validation, known Pokemon key validation, ISO metadata timestamps, tile instance v1 shape and stronger tests.

### File List

- `_bmad-output/implementation-artifacts/1-2-scene-canvas-domain-model.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/domain/scene/area.ts`
- `src/domain/scene/area.test.ts`
- `src/domain/assets/index.ts`
- `src/domain/assets/pokemon.ts`
- `src/domain/scene/default-scene.ts`
- `src/domain/scene/default-scene.test.ts`
- `src/domain/scene/index.ts`
- `src/domain/scene/levels.ts`
- `src/domain/scene/levels.test.ts`
- `src/domain/scene/tile-instance.ts`
- `src/domain/scene/tile-instance.test.ts`
- `src/domain/scene/types.ts`

### Change Log

- 2026-05-16: Story created from BMAD epics and architecture context.
- 2026-05-16: Implemented scene/canvas domain model and advanced story to review.
- 2026-05-16: Applied multi-agent code-review fixes and marked Story 1.2 done.
