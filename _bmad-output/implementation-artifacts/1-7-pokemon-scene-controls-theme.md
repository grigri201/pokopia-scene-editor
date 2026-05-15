# Story 1.7: 建立 Pokemon 场景控制、动态主题与语义视觉 tokens

Status: done

## Story

As a 布景作者,
I want 在顶部选择 Pokemon、编辑场景名称并看到保存状态，同时页面背景和少量强调色可以跟随当前 Pokemon 主题变化,
so that 编辑器与 Pokopia Decor Dex 保持产品连续性，同时不影响规则状态识别。

## Acceptance Criteria

1. Given 用户打开 Open Design 工作台, when 顶部左侧场景控制渲染, then 应显示当前 Pokemon、可搜索的 Pokemon 选择器、场景 `Name` 输入框和 dirty/saved 状态, and 这些控件不得遮挡中央 7x7 画布、左侧建筑层面板或右侧素材栏。
2. Given 用户修改场景 `Name` 或切换 Pokemon, when 变更成功进入 scene/control state, then dirty/saved 状态应更新, and 保存动作成功或失败应通过可访问的状态文本反馈。
3. Given 用户没有选择宝可梦主题, when 工作台首次渲染, then 系统使用 Ditto 或中性纸面主题作为 fallback, and 该 fallback 不影响 7x7 画布、主体区、外围区和建筑层状态识别。
4. Given 用户选择或系统设置当前宝可梦主题, when Dynamic Pokemon Theme Shell 更新页面背景和少量强调色, then `pokemonBackground`、`pokemonBackgroundInk` 和 `pokemonAccent` tokens 应更新, and 文字前景色必须根据背景亮度保持可读。
5. Given 动态主题色发生变化, when 主体区、外围区、选中格、悬停格、技能标记、锁定层或错误状态渲染, then 这些语义状态继续使用稳定 semantic tokens, and 不得被宝可梦主题色覆盖或混淆。
6. Given 用户开启 `prefers-reduced-motion`, when 宝可梦主题变化, then 背景过渡应被禁用或缩短, and 不得影响键盘焦点、画布尺寸或当前选中格状态。
7. Given dev agent 检查视觉基础样式, when 查看 tokens 和基础 CSS, then 应包含布局 tokens、语义色 tokens、网格 tokens、动态宝可梦主题 tokens、纸面面板色、Open Design 色板和 typography tokens, and 工具区域不得使用 hero-scale 字号、营销页式说明区块或卡片套卡片结构。

## Tasks / Subtasks

- [x] 接入 scene controls 到 `SceneDocument` (AC: 1, 2)
  - [x] Pokemon 控制展示当前 `selectedPokemonKey`
  - [x] Scene Name 输入写入 scene state 并标记 dirty
  - [x] 保存动作更新 saved 状态和可访问状态文本
- [x] 建立 Pokemon theme 数据和 shell tokens (AC: 3, 4, 5, 6, 7)
  - [x] 为 Ditto/Eevee/Pikachu 提供 theme colors 和 fallback
  - [x] 根据背景亮度选择 `pokemonBackgroundInk`
  - [x] App shell 应用 `pokemonBackground`、`pokemonBackgroundInk`、`pokemonAccent`
  - [x] 语义色 tokens 保持独立
- [x] 补充测试与 smoke 覆盖 (AC: 1-7)
  - [x] unit tests 覆盖 scene control reducer 和 theme contrast
  - [x] component tests 覆盖 PokemonSceneControls dirty/save/read-only
  - [x] Playwright smoke 覆盖 Pokemon 切换、Name dirty、save、theme token 更新和语义色稳定
- [x] 更新故事记录和 sprint 状态
  - [x] Dev Agent Record 记录命令、完成说明和文件列表
  - [x] 完成实现后推进到 `review`

## Dev Notes

- Story 1.6 已要求所有 scene 写操作携带 `interactionMode`; 本 story 的 scene name、Pokemon 和 save 操作也必须遵守 read-only guard。
- 动态 Pokemon theme 只能影响外层 shell 和少量强调色, 不能覆盖主体区、外围区、选中格、锁定层、技能标记等语义状态。
- 当前已存在 `src/domain/assets/pokemon.ts` 和 `src/theme/tokens.ts`; 优先扩展这些边界。

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `npm run smoke`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck` — passed
- `npm run test` — passed, 10 test files / 54 tests
- `npm run build` — passed
- `npm run smoke` — passed, 2 Chromium smoke tests
- `git diff --check` — passed

### Completion Notes List

- 已将顶部 Pokemon/Name/Save controls 接入 `SceneDocument`，并通过 reducer 守住 desktop edit 与 mobile read-only 写入边界。
- 已新增 Ditto/Eevee/Pikachu theme catalog、fallback、动态 shell CSS variables 和基于对比度的 ink 选择。
- 已补齐 save failure 可访问 live status、Pokemon 搜索前缀匹配、无效输入回退/阻断、Name 必须包含 5x5 的 UI 与 domain 校验。
- 已将语义视觉 token 与 Pokemon 主题拆开，并让 hover、skill marker、locked/hidden、error 状态使用稳定 token；同时移除工具面板内卡片套卡片样式。
- 已用多 agent code review 发现并修复保存失败、read-only dirty 状态、输入草稿错配、Eevee 对比度、read-only grid、语义 token、mobile smoke 和 reduced-motion 覆盖问题。

### File List

- `_bmad-output/implementation-artifacts/1-7-pokemon-scene-controls-theme.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.test.tsx`
- `src/domain/assets/pokemon.ts`
- `src/domain/scene/default-scene.test.ts`
- `src/domain/scene/default-scene.ts`
- `src/domain/scene/types.ts`
- `src/state/scene-reducer.test.ts`
- `src/state/scene-reducer.ts`
- `src/styles.css`
- `src/theme/index.ts`
- `src/theme/pokemon-theme.test.ts`
- `src/theme/pokemon-theme.ts`
- `src/theme/tokens.ts`

### Change Log

- 2026-05-16: Story created from Epic 1 Story 1.7 and moved into development.
- 2026-05-16: Implemented Pokemon scene controls, dynamic theme shell, semantic visual tokens, accessibility states, tests, review fixes, and marked Story 1.7 done.
