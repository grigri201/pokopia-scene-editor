# Story 1.3: 渲染规则可见的固定 7x7 画布

Status: done

## Story

As a 布景作者,
I want 在中央画布中看到 7x7 网格、中心 5x5 主体区和外围 1 圈装饰区,
so that 我能直观看出哪些格子属于主体布景, 哪些格子属于外围装饰。

## Acceptance Criteria

1. Given 默认场景已创建, when 用户打开桌面工作台, then 中央画布应渲染完整 7x7 网格, and 每个格子应稳定映射到唯一 0-based x/y 坐标。
2. Given 7x7 画布已渲染, when 用户查看画布, then 中心 5x5 主体区和外围 1 圈装饰区应持续可区分, and 区分方式不得只依赖颜色, 必须至少结合边框、背景、标签、角标、形态或说明中的两种视觉通道。
3. Given 画布格子处于空场景状态, when 用户查看任意主体区或外围区格子, then 格子应表现为可放置区域, and 不应暗示外围装饰区不可编辑或不可用于后续放置。
4. Given 右侧素材栏、左下检查器或建筑层区域内容发生变化, when 工作台重新渲染, then 7x7 画布整体宽高和单格宽高变化不得超过 1px, and 画布网格应保持固定宽高比, 页面在 1280px 及以上不应出现横向滚动条。
5. Given dev agent 验证画布组件, when 运行组件测试或 Playwright smoke, then 应验证 49 个格子均可被定位, 主体区边界可见, 外围区可见, and 主要画布交互元素应有可访问名称或可被无障碍树识别的标签。

## Tasks / Subtasks

- [x] 强化 `SceneCanvas` 的规则可见渲染 (AC: 1, 2, 3)
  - [x] 每个格子暴露唯一 0-based 坐标、area type、placeable 状态和 accessible name
  - [x] 主体区、外围区和主体边界至少使用背景、边框/形态、标签/角标中的两种视觉通道
  - [x] 外围区不得显示禁用、锁定或不可放置心智
- [x] 添加画布稳定性与可访问性验证 (AC: 4, 5)
  - [x] 组件测试覆盖 49 cells、main/outer 数量、row/column/coordinate 映射和 placeable 状态
  - [x] Playwright smoke 覆盖 1280px 无横向滚动、canvas 正方形、主体边界/外围区可定位
  - [x] 保持 mobile read-only scaffold 测试通过
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明、文件列表
  - [x] 完成后推进到 `review`

### Review Findings

- [x] [Review][Patch] Read-only canvas cells still exposed a place affordance [`src/components/scene-canvas/SceneCanvas.tsx`] — fixed by separating domain `data-placeable` from current `data-editable`, adding `aria-disabled`, and using read-only labels/cues.
- [x] [Review][Patch] Smoke asserted data attributes but not visible main/outer boundary channels [`e2e/workbench-smoke.spec.ts`] — fixed by asserting representative computed `box-shadow`, dashed border style and visible area labels.
- [x] [Review][Patch] 1280px horizontal-scroll assertion was viewport-specific and not repeated after content mutation [`e2e/workbench-smoke.spec.ts`] — fixed by setting the viewport explicitly and asserting `scrollWidth <= clientWidth` before and after sidebar input changes.
- [x] [Review][Patch] Canvas stability test missed per-cell drift [`e2e/workbench-smoke.spec.ts`] — fixed by comparing representative cell width/height before and after sidebar input changes.
- [x] [Review][Patch] Component coordinate coverage did not prove complete unique mapping [`src/components/scene-canvas/SceneCanvas.test.tsx`] — fixed by comparing all expected `0,0` through `6,6` coordinates.
- [x] [Review][Patch] Narrow 390px cells could overlap area and place labels [`src/styles.css`] — fixed by hiding the secondary place/view cue under 420px while preserving area and coordinate labels.

## Dev Notes

### Previous Story Intelligence

- Story 1.1 已建立 Vite/React/TS、production smoke 和 mobile read-only scaffold。
- Story 1.2 已提供 `createCanvasCells`, `calculateAreaType`, `isPlaceableArea`, `SceneDocument` 和默认尺寸不变量。
- 本 story 应消费 Story 1.2 的 domain helpers, 不在组件中重新实现 main/outer 判断。

### Architecture / UX Guardrails

- 7x7 画布与 5x5 主体区、外围 1 圈装饰区必须持续可见。Source: `_bmad-output/planning-artifacts/epics.md` Story 1.3。
- 主体区、外围区、锁定层和技能标记等关键状态不得只依赖颜色表达, 至少需要图标、边框、文本、角标或形态中的两种。Source: `_bmad-output/planning-artifacts/prd.md` NFR12/NFR17。
- 画布整体和单格尺寸需要稳定, 1280px+ 不应横向滚动。Source: `_bmad-output/planning-artifacts/epics.md` Story 1.3 AC4。
- 本 story 不实现格子选择状态、键盘移动、素材放置或 dirty state；这些属于 Story 1.4+。

### Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`

### References

- `_bmad-output/planning-artifacts/epics.md`: Story 1.3
- `_bmad-output/planning-artifacts/prd.md`: NFR12, NFR17, NFR21
- `_bmad-output/implementation-artifacts/1-2-scene-canvas-domain-model.md`: domain helpers and review fixes

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck` passed.
- `npm run test` passed: 5 files, 24 tests.
- `npm run build` passed.
- `npm run smoke` passed: 2 Chromium smoke tests against production `dist`.
- Code review ran with Blind Hunter, Edge Case Hunter and Acceptance Auditor. Acceptance Auditor was clean; patch findings were applied.
- After review fixes, `npm run typecheck`, `npm run test`, `npm run build` and `npm run smoke` passed. Unit coverage is now 5 files, 25 tests.

### Completion Notes List

- Added `isMainAreaBoundaryCell` domain helper for rule-visible 5x5 boundary styling.
- Extended `SceneCanvas` cells with coordinate, area, placeable and main-boundary data attributes plus accessible labels.
- Added visual boundary and placeable cues using background, border/shape, labels and corner text.
- Added component coverage for 49 cells, main/outer counts, main-boundary count and placeable state.
- Expanded Playwright smoke to verify no horizontal scroll, square canvas, main/outer counts, placeable state and canvas size stability after sidebar input changes.
- Applied review fixes for read-only cell semantics, visible channel assertions, complete coordinate coverage, post-change scroll checks and per-cell stability checks.

### File List

- `_bmad-output/implementation-artifacts/1-3-fixed-seven-by-seven-canvas.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/domain/scene/area.ts`
- `src/domain/scene/area.test.ts`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/styles.css`
- `e2e/workbench-smoke.spec.ts`

### Change Log

- 2026-05-16: Story created from BMAD epics and prior domain model context.
- 2026-05-16: Implemented fixed 7x7 canvas visibility and advanced story to review.
- 2026-05-16: Applied multi-agent code-review fixes and marked Story 1.3 done.
