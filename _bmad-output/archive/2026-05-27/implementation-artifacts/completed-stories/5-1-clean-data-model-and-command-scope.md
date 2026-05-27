# Story 5.1: 清理数据模型与 command 能力

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 布景编辑用户,
I want 编辑器的数据模型和 command 层只保留当前 MVP 能力,
so that 后续实现和验收不会继续维护已删除的复杂功能。

## Acceptance Criteria

1. Given dev agent 检查 `SceneDocument`、domain types、serializer、schema 和 roundtrip tests, when Story 5.1 完成, then `workspaceState.saveStatus` 和普通实例备注 `note` 不再是 MVP payload 必填字段, and `skillNote` 仍作为技能备注保留。
2. Given dev agent 检查 command layer 和 reducer, when Story 5.1 完成, then 不再存在或不再暴露素材实例移动、跨层移动、undo/redo history、建筑层 hidden/locked 写操作、同层堆叠、区域阻断校验或 canRotate 分支, and 保留放置、删除、替换、旋转、染色、技能标记、技能备注、建筑层创建/删除/重命名/复制/切换、自动保存和恢复。
3. Given 任意素材实例被旋转, when 用户选择 0/90/180/270 度, then 所有素材都遵守同一旋转规则, and 不再基于素材定义区分是否可旋转。
4. Given 用户在主体区或外围区放置素材, when 放置 command 执行, then 系统不因素材适用区域阻断放置, and 适用区域仍可作为素材展示/筛选元数据保留。

## Tasks / Subtasks

- [x] 收敛 `SceneDocument` v1 payload 与 domain types (AC: 1)
  - [x] 更新 `src/domain/scene/types.ts`、`default-scene.ts`、`tile-instance.ts` 和 `levels.ts`，移除 MVP 不再持久化的 `workspaceState.saveStatus` / `saveError`、普通实例 `note`、建筑层 `visible` / `locked` 业务状态；保留 `workspaceState.currentBuildingLevelId`、`selectedAssetId`、`selectedCoordinate`、`skillNote`、`rotationDegrees`、`dyeColor` 和自动保存所需 metadata。
  - [x] 更新 `src/io/scene-schema.ts`、`scene-serializer.ts`、`scene-recovery.ts`、`scene-roundtrip.ts` 及相关 tests，确保新的 strict `SceneDocument v1` payload 不包含 `workspaceState.saveStatus` 或 `note`，且缺失这些旧字段不再被当作恢复错误。
  - [x] 如果 UI 仍需要保存/恢复状态提示或 storage failure 文案，将其放在 `AppShell` local UI state 或 recovery status 中，不写回 `SceneDocument`、autosave payload 或 serializer。
- [x] 清理素材放置与实例编辑 command (AC: 2, 3, 4)
  - [x] 在 `src/state/asset-placement.ts` 中移除 `hidden-layer`、`locked-layer`、`area-incompatible` 和 `will-stack` 分支；放置 command 继续检查 `readOnly`、已选素材和替换确认，同一建筑层同一坐标只保留单实例替换/删除语义，不支持堆叠。
  - [x] 保留 `applicableAreas` 作为素材展示/筛选元数据，但不得在放置或替换 command 中用它阻断主体区/外围区放置。
  - [x] 在 `src/state/asset-instance-edit.ts` 中移除 `move` 和 `note` action、跨层移动逻辑、target conflict/area compatibility move failures、`not-rotatable` 分支；旋转只接受 `0 | 90 | 180 | 270` 并适用于所有素材。
  - [x] 替换素材时继续保留安全边界：未知素材失败、非染色素材的 `dyeColor` 归 `null`、非技能候选素材清空技能标记；不要因为旧 `rotatable` 字段重置 rotation。
- [x] 清理建筑层 command 与历史状态 (AC: 2)
  - [x] 在 `src/state/building-layer-edit.ts` 中移除 `set-visible` / `set-locked` action 和对应 failure reason；保留 create、copy、delete、rename、set-current。
  - [x] 复制建筑层时复制实例并生成唯一 id，但不要复制旧 `visible` / `locked` 字段；删除建筑层仍需保护最后一个建筑层并要求 destructive confirmation。
  - [x] 在 `src/components/app-shell/AppShell.tsx` 和相关组件 contract 中移除 undo/redo stack 与已删除 command 的调用路径；如为了编译必须调整组件 props，可做最小同步，完整可见 UI 清理留给 Story 5.2。
- [x] 更新素材能力字段与派生 selectors (AC: 2, 3, 4)
  - [x] 在 `src/domain/assets/catalog.ts` 和 tests 中移除或停止使用 `rotatable`、`stackable` 作为 MVP 行为分支；`dyeable`、`skillCandidate`、`defaultSkillType`、`applicableAreas` 继续可用。
  - [x] 更新 `src/domain/scene/selectors.ts` 和 preview/canvas 派生逻辑，避免依赖 hidden/locked level state；所有建筑层都应按现有 level ordering 参与可见业务派生，除非具体 UI view state 在组件内另行限制。
- [x] 调整测试与验收门禁 (AC: 1, 2, 3, 4)
  - [x] 更新 unit tests：schema/serializer/recovery/roundtrip、`asset-placement.test.ts`、`asset-instance-edit.test.ts`、`building-layer-edit.test.ts`、`scene-reducer.test.ts` 和 selectors tests。
  - [x] 增加或改写断言证明：旧 payload 字段不再要求；`skillNote` 仍保留；主体/外围区放置不被 `applicableAreas` 阻断；同层同坐标不堆叠；所有素材可旋转；旧 move/note/hidden/locked/undo/redo command 不再存在或不可调用。
  - [x] 更新受类型变化影响的 component tests 和 Playwright smoke helper fixture，但不要把 5.2 的最终 UI 入口删除验收提前扩大到本 story。
  - [x] 运行 `npm run typecheck`、`npm run test`、`npm run build`、`git diff --check`；如果 component contract 或 smoke fixture 被改动，运行 `npm run smoke`。

## Dev Notes

- 本 story 来源于已批准的 `sprint-change-proposal-2026-05-19.md`，覆盖 Epic 5 中的数据模型和 command 层清理。Epic 1-4 是已完成历史，但其中关于隐藏/锁定、手动保存、保存状态、撤销/重做、区域阻断、堆叠、实例移动、普通备注、可旋转差异和预览覆盖开关的验收点不再代表当前 MVP。
- Story 5.1 只处理业务数据、schema、serializer、state command 和必要的编译同步。Story 5.2 负责最终移除可见 UI 入口、预览覆盖开关和空状态恢复动作；Story 5.3 负责 mobile application keyboard handler no-op 和对应回归。
- 当前代码和 architecture 命名有差异：architecture 多处提到 `src/state/scene-commands.ts`，但当前实现已经拆成 `src/state/scene-reducer.ts`、`asset-placement.ts`、`asset-instance-edit.ts`、`building-layer-edit.ts`。沿用当前文件边界，不要为本 story 新建空的 `scene-commands.ts` 汇总层。
- `SceneDocument` 仍是唯一业务事实来源。组件不得直接 mutate deep scene object；业务写操作必须经过 `src/state/*` command/reducer，serializer/schema/recovery 属于 `src/io/*`。
- `workspaceState.currentBuildingLevelId`、`workspaceState.selectedAssetId`、`workspaceState.selectedCoordinate` 仍属于 payload；`workspaceState.saveStatus` 不属于 payload。自动保存与未来显式导出继续共享同一个 `serializeSceneDocument()` 结果，不能出现第二套导出格式。
- 普通实例备注 `note` 被删除；技能备注 `skillNote` 保留，并继续只在技能标记相关 UI/command 中维护。安全文本渲染测试如果仍需要覆盖用户输入，应迁移到 `skillNote` 或 recovery error text，而不是继续依赖普通 `note`。
- `applicableAreas` 可继续用于 Asset Picker 展示和筛选；它不是放置 permission。`areaType` 仍由坐标和 7x7/5x5/outerPadding 规则派生，并在序列化中用于完整性校验。
- 同一建筑层同一坐标不支持堆叠。放置已占用格时应走替换确认或删除后再放置；跨建筑层同坐标仍可各有一个实例，因为建筑层是 scene model 的核心能力。
- 所有素材都遵守同一旋转规则。不要保留 `rotatable` / `canRotate` 分支、不可旋转提示、或替换素材时因不可旋转而强制重置 rotation。
- 删除 hidden/locked 是数据模型清理，不是只隐藏 UI 按钮。若 `BuildingLevel` 类型仍保留这些字段，schema/serializer/selector/test 仍会继续维护已删除复杂度。
- 自动保存保留。当前 `AppShell` 依赖 `saveStatus` 跳过 saveError 时的 autosave；移除此字段后需要用局部 UI/recovery 状态表达 storage failure，不能把 failure 状态写入 `SceneDocument`。

### Previous Story Intelligence

- Story 4.6 建立了 `pokopia.uiPreferences.v1`，证明搜索/筛选等 UI-only preferences 必须和 `SceneDocument` 分离。保留这个边界；不要把新 UI 状态塞进 autosave/export payload。
- Story 4.6 的“预览显示偏好”已被 Epic 5 改写：网格、主体边界和技能标记显示选项不再进入 MVP。5.1 不需要完成 UI 删除，但测试和类型调整不能继续把这些字段当作 scene payload。
- 既有验证门禁是 `npm run typecheck`、`npm run test`、`npm run build`、`git diff --check`、`npm run smoke`。本 story 改动 schema/state/tests，至少必须通过前四项；涉及 AppShell/component/smoke fixture 时跑 smoke。

### Git Intelligence Summary

- 最近提交 `bf40be3 feat: align scene editor open design UI` 大量改动 `AppShell`、`BuildingLevelPanel`、`SelectionInspector`、`PreviewInspector`、asset catalog 和 state tests。实现前先读目标组件当前 props，不要按旧 planning 文档臆造文件结构。
- 最近提交 `00ee8cb feat: persist ui preferences locally` 新增 `src/io/ui-preferences.ts` 与相关 tests。该 namespace 是 UI-only，不能混入 `SceneDocument` schema/serializer/recovery。
- 当前 `package.json` 已固定 Vite/React/TypeScript/Vitest/Playwright/Zod 版本；本 story 不需要新增或升级依赖。

### Project Structure Notes

- Expected touch points: `src/domain/scene/types.ts`, `src/domain/scene/default-scene.ts`, `src/domain/scene/tile-instance.ts`, `src/domain/scene/levels.ts`, `src/domain/scene/selectors.ts`, `src/domain/assets/catalog.ts`, `src/state/scene-reducer.ts`, `src/state/asset-placement.ts`, `src/state/asset-instance-edit.ts`, `src/state/building-layer-edit.ts`, `src/io/scene-schema.ts`, `src/io/scene-serializer.ts`, `src/io/scene-recovery.ts`, `src/io/scene-roundtrip.ts`, affected component contracts/tests, and `e2e/workbench-smoke.spec.ts` fixtures if they still construct old payloads.
- Avoid introducing backend/service/repository layers. The MVP is a static Vite SPA with local state, localStorage autosave/recovery, Zod validation, React Testing Library/Vitest, and Playwright smoke.
- No `project-context.md` file was present in this checkout during story creation; use the current planning artifacts and source tree as source of truth.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.1]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-19.md#SceneDocument-Payload]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-19.md#Asset-Rules]
- [Source: _bmad-output/planning-artifacts/prd.md#Properties-Save-Recovery]
- [Source: _bmad-output/planning-artifacts/prd.md#Accessibility]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Model]
- [Source: _bmad-output/planning-artifacts/architecture.md#State-Management-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Structure]
- [Source: src/domain/scene/types.ts]
- [Source: src/state/asset-placement.ts]
- [Source: src/state/asset-instance-edit.ts]
- [Source: src/state/building-layer-edit.ts]
- [Source: src/io/scene-schema.ts]
- [Source: src/io/scene-serializer.ts]
- [Source: src/components/app-shell/AppShell.tsx]

## Testing Requirements

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `git diff --check`
- `npm run smoke` if component contracts, Playwright fixtures, or browser-visible behavior change

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`
- `npm run smoke`

### Completion Notes List

- `SceneDocument v1` payload no longer carries `workspaceState.saveStatus/saveError`, `TileInstance.note`, or `BuildingLevel.visible/locked`; schema/recovery/serializer now strip or omit those legacy nested fields while retaining `skillNote`.
- Command scope removed move/note edits, hidden/locked branches, area permission blocking, stacking, not-rotatable checks, set-visible/set-locked layer commands, and undo/redo wiring; all assets now share the same 0/90/180/270 rotation rule.
- Save status is local UI state only; autosave/export continue to share `serializeSceneDocument()` and the Playwright smoke suite now verifies current MVP payload boundaries instead of stale legacy UI.
- Code review fixes added same-layer coordinate uniqueness in schema/recovery, removed residual same-layer stack UI, preserved autosave-only drafts as local dirty state after restore, and strengthened rotation/smoke coverage.

### File List

- `_bmad-output/implementation-artifacts/5-1-clean-data-model-and-command-scope.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `e2e/workbench-smoke.spec.ts`
- `src/components/app-shell/AppShell.test.tsx`
- `src/components/app-shell/AppShell.tsx`
- `src/components/asset-picker/AssetPicker.tsx`
- `src/components/building-level-panel/BuildingLevelPanel.test.tsx`
- `src/components/pokemon-scene-controls/PokemonSceneControls.tsx`
- `src/components/preview-inspector/PreviewInspector.test.tsx`
- `src/components/scene-canvas/SceneCanvas.test.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/styles.css`
- `src/domain/assets/catalog.test.ts`
- `src/domain/assets/catalog.ts`
- `src/domain/scene/default-scene.test.ts`
- `src/domain/scene/default-scene.ts`
- `src/domain/scene/levels.test.ts`
- `src/domain/scene/levels.ts`
- `src/domain/scene/selectors.test.ts`
- `src/domain/scene/selectors.ts`
- `src/domain/scene/tile-instance.test.ts`
- `src/domain/scene/tile-instance.ts`
- `src/domain/scene/types.ts`
- `src/io/scene-recovery.test.ts`
- `src/io/scene-recovery.ts`
- `src/io/scene-roundtrip.test.ts`
- `src/io/scene-schema.test.ts`
- `src/io/scene-schema.ts`
- `src/io/scene-serializer.test.ts`
- `src/io/scene-serializer.ts`
- `src/io/scene-storage.test.ts`
- `src/state/asset-instance-edit.test.ts`
- `src/state/asset-instance-edit.ts`
- `src/state/asset-placement.test.ts`
- `src/state/asset-placement.ts`
- `src/state/building-layer-edit.test.ts`
- `src/state/building-layer-edit.ts`
- `src/state/scene-reducer.test.ts`
- `src/state/scene-reducer.ts`

### Change Log

- 2026-05-19: Story created from Epic 5 Story 5.1 and marked ready-for-dev.
- 2026-05-19: Implemented Story 5.1 and moved to review.
- 2026-05-19: Fixed code-review findings, reran full gate, and marked Story 5.1 done.

## Senior Developer Review (AI)

### Review Date

2026-05-19

### Reviewer

GPT-5 Codex multi-agent code review

### Outcome

Approved after fixes.

### Findings Fixed

- Removed residual same-layer stack presentation from `SceneCanvas` and rejected duplicate `buildingLevelId + coordinate` instances in `scene-schema`.
- Preserved autosave-only recovered drafts as local `dirty` state so users can save them into the saved slot.
- Strengthened rotation coverage across the catalog and added Playwright coverage for retained edit command wiring and dense preview timing/layout.

### Final Verification

- `npm run typecheck`
- `npm test`
- `npm run build`
- `git diff --check`
- `npm run smoke`
