# Story 3.5: 控制预览网格、主体边界和技能标记显示

Status: done

## Story

As a 布景编辑用户,
I want 分别控制预览中的网格、主体边界和技能标记是否显示,
So that 我可以按校验任务减少干扰或突出关键结构信息。

## Acceptance Criteria

1. Given 用户打开俯视图或正视图预览, when 用户切换“显示网格”, then 当前预览显示或隐藏网格线, and 该切换只影响预览表现，不改变 scene document、素材实例或 dirty state。
2. Given 用户打开俯视图或正视图预览, when 用户切换“显示主体边界”, then 当前预览显示或隐藏中心 5×5 主体区边界, and 主体区边界的计算仍来自 shared area selectors，而不是预览组件内的重复规则。
3. Given 用户打开俯视图或正视图预览，且场景中存在需要百变怪技能的素材实例, when 用户切换“显示技能标记”, then 当前预览显示或隐藏绑定到具体素材实例的技能标记, and 技能标记不得绑定到素材模板、全局坐标或建筑层本身。
4. Given 用户使用键盘或辅助技术访问预览切换控件, when 焦点移动到网格、主体边界或技能标记显示控制, then 每个控件都有可访问名称，并可通过一次点击或一次键盘确认触发, and 控件状态可被自动化无障碍树检查或等效测试验证。

## Tasks / Subtasks

- [x] 增加本地显示选项控制 (AC: 1-4)
  - [x] 提供“显示网格”“显示主体边界”“显示技能标记”三个可访问 toggle 控件
  - [x] 控件状态只保存在 Preview Inspector 本地 view state
  - [x] 切换不写 `SceneDocument`、dirty state 或 undo/redo history
- [x] 应用 Top/Front preview 显示选项 (AC: 1-3)
  - [x] 网格显示选项影响 Top preview 7×7 网格和 Front structure 条带视觉
  - [x] 主体边界显示选项继续基于 shared `mainBoundary` / area selector 派生状态，只隐藏或显示表现
  - [x] 技能标记显示选项只影响具体素材实例的技能 marker 和技能统计表现
- [x] 保持语义与可访问性 (AC: 2-4)
  - [x] 控件使用可访问名称、pressed/checked 状态和键盘可触发按钮
  - [x] 隐藏表现时仍保留 data 属性用于自动化校验，不改变业务事实
  - [x] 不引入真实透视、复杂遮挡或新的 preview business cache
- [x] 补充自动化覆盖 (AC: 1-4)
  - [x] component tests 覆盖三个 toggle 的 pressed 状态、data 属性和 scene 不变
  - [x] smoke 覆盖桌面和 mobile/read-only 下切换显示选项不改变 snapshot/dirty state
  - [x] gates 覆盖 typecheck/test/build/smoke/diff check
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成 review 修复后推进到 `done`

## Dev Notes

- Story 3.2 已经让 Top preview 使用 `data-preview-main-boundary`、`data-preview-skill-marker-label` 等派生属性表达业务事实；Story 3.4 已让 Front structure 暴露 `data-front-layer-main-count`、`data-front-layer-outer-count` 和 `data-front-layer-skill-count`。
- 本 story 不应改变 selector 的业务输出，只控制显示表现。隐藏网格/边界/技能标记时，不应删除 data 属性或业务 summary。
- 主体边界计算必须继续来自 shared area selectors；技能标记必须继续绑定到 `TileInstance.requiresSkill` 与 `TileInstance.skillType`，不得绑定到素材模板或全局坐标。
- Mobile/read-only 下这些显示选项仍属于查看状态，允许切换，但禁止改变 scene、dirty state、undo/redo 或保存状态。

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
- `npm run test -- --run src/components/preview-inspector/PreviewInspector.test.tsx`
- `npm run test -- --run`
- `npm run build`
- `npm run smoke`
- `git diff --check`

### Completion Notes List

- Preview Inspector 新增三个本地显示选项 toggle：网格、主体边界、技能标记。
- Top/Front preview 通过 data 属性和 CSS 控制显示表现，保留 selector 派生的业务事实与统计属性。
- Component 与 smoke 覆盖桌面、键盘触发、mobile/read-only 下切换显示选项不改变 scene snapshot 或 dirty/save state。
- Code review 后修复 Top 网格隐藏时的 1px gap 残留，并调整 Front structure/显示开关布局，避免窄列横向溢出。

### File List

- `_bmad-output/implementation-artifacts/3-5-preview-overlays.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/preview-inspector/PreviewInspector.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/styles.css`

### Change Log

- 2026-05-16: Story created from Epic 3 Story 3.5 and moved to ready-for-dev.
- 2026-05-16: Story moved to in-progress for implementation.
- 2026-05-16: Story implementation completed, reviewed, fixed, and marked done.
