# Story 3.2: 俯视图展示完整 7×7 画布与 5×5 主体边界

Status: done

## Story

As a 布景编辑用户,
I want 俯视图完整展示 7×7 画布并标出中心 5×5 主体区,
So that 我可以确认主体区与外围装饰区的布局是否正确。

## Acceptance Criteria

1. Given 用户打开俯视图预览, when 当前 scene 使用 7×7 实际画布, then 俯视图显示全部 49 个格子, and 每个格子的 0-based x/y 坐标、区域类型和可见素材状态与 `SceneDocument` 派生结果一致。
2. Given 用户打开俯视图预览, when 画布中存在中心 5×5 主体区和外围 1 圈装饰区, then 俯视图清楚标识 5×5 主体区边界, and 主体区、外围区和边界状态不得只依赖颜色，至少使用边框、纹理、标签、形状或其他视觉通道组合表达。
3. Given 用户在主画布中放置、删除、移动、替换素材或修改技能标记, when 俯视图重新渲染, then 俯视图在不读取独立缓存业务状态的情况下反映最新 scene state, and 自动化一致性测试验证画布、上下文/检查器字段、建筑层列表和俯视图读取的同一素材实例字段一致。

## Tasks / Subtasks

- [x] 渲染完整 7×7 俯视图格子 (AC: 1)
  - [x] Top preview 使用 `getCanvasCellContexts` 派生的 49 个 cell
  - [x] 每格暴露 0-based 坐标、area type、可见素材状态和实例数量
  - [x] 隐藏当前层时不显示隐藏素材状态
- [x] 标识中心 5×5 主体边界 (AC: 2)
  - [x] 主体区、外围区、边界分别有文本/形态/边框等多通道表达
  - [x] 俯视图格子使用独立 preview data 属性，避免污染 SceneCanvas 选择器
  - [x] 主体边界计算继续来自 shared selector，不在组件内重复规则
- [x] 保持俯视图与编辑闭环一致 (AC: 3)
  - [x] 放置、删除、移动、替换素材或技能修改后 Top preview 直接反映 scene state
  - [x] 不为俯视图维护素材实例、坐标或区域的业务缓存
  - [x] smoke 验证主画布、检查器和俯视图读取同一实例字段
- [x] 补充测试与 gates (AC: 1-3)
  - [x] component tests 覆盖 49 格、区域计数、主体边界和隐藏层
  - [x] smoke 覆盖放置后俯视图素材状态与坐标
  - [x] typecheck/test/build/smoke/diff check 全部通过
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 3.1 已将 Preview Inspector 接入 scene 和 shared preview selectors；本 story 应在该基础上细化 Top preview，而不是新建独立状态。
- `CanvasCellContext.mainBoundary` 已由 `isMainAreaBoundaryCell` 派生，直接用于主体边界展示。
- 预览格子的 data 属性应使用 `data-preview-*`，避免与中央 SceneCanvas 的 e2e selectors 混淆。
- Mobile/read-only 下 Top preview 仍只允许本地查看状态，不允许写 scene 或 dirty state。

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

- `npm run typecheck` - pass
- `npm run test -- --run` - pass, 18 files / 132 tests
- `npm run build` - pass
- `npm run smoke` - pass, 2 Chromium smoke tests
- `git diff --check` - pass

### Completion Notes List

- Top preview 现在渲染完整 49 个预览格子，并暴露 `data-preview-coordinate`、`data-preview-area`、`data-preview-main-boundary`、素材状态和实例数量。
- 每个预览格子显示坐标、区域标签和素材短标，主体边界通过 shared `mainBoundary` 派生并用边框表达。
- 隐藏当前层时预览格子和本地 focus 摘要都不显示隐藏素材状态。
- Top preview 暴露素材 ID、实例 ID、技能需求和技能标记短标，并随技能修改、undo/redo、移动、替换和删除直接从 scene state 更新。
- Smoke 覆盖首屏 49 格/区域/主体边界数量、主体/外围非颜色标签、边界实际视觉样式，以及编辑闭环中主画布、检查器和 Top preview 的同一实例状态。

### File List

- `_bmad-output/implementation-artifacts/3-2-top-view-preview.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 3 Story 3.2 and moved to in-progress.
- 2026-05-16: Implemented full top-view preview cells, main boundary styling and tests; moved story to review.
- 2026-05-16: Fixed review findings for hidden-layer focus, scoped smoke selectors, skill markers and edit-loop preview consistency; moved story to done.
