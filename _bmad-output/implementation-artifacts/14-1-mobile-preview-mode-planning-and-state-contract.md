# Story 14.1: Mobile Preview Mode 规划与状态契约

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile 用户,
I want 打开 mobile 页面后直接看到本地保存布景的说明预览或导入入口,
so that 我不用进入桌面编辑器也能查看/恢复一个布景说明。

## Acceptance Criteria

1. PRD、Architecture、UX、Epics 和 sprint-status 已同步新增 Epic 14，并明确 mobile 从 View-only Workbench 改为 Preview Mode。实现 story 不应重新打开或回滚已归档 Epic 1-13。
2. `<768px` 下不再渲染完整 desktop workbench layout；不得显示素材选择、建筑层编辑、实例编辑、重置或 desktop 下载预览 modal 入口。
3. Mobile startup 使用 `readLatestSceneDocumentFromStorage()` 读取本地记录，而不是从默认空场景伪装成可编辑 workbench。
4. 有 valid stored scene 时，mobile 进入 `preview-ready` state，并从该 scene 成功生成 `ImageExportSummary`。14.1 可以只建立 inline preview surface/summary contract；完整 desktop preview content 复用在 14.2 完成。
5. 无 stored scene 时，mobile 进入 `empty` state，只显示 mobile preview 空状态和“导入字符串”入口；不得写 `SceneDocument`、autosave、saved storage 或 UI preferences。
6. Invalid stored scene 时，mobile 进入 `invalid` state，不静默成功、不回退展示默认 scene；显示可读错误和“导入字符串”入口，并保持 storage 原样。
7. 旧 desktop 编辑工作台、desktop autosave、desktop scene string import/export、desktop download preview modal 不回退。

## Tasks / Subtasks

- [x] 定义 Mobile Preview state contract（AC: 3, 4, 5, 6）
  - [x] 在 `apps/web/src/components/app-shell/` 下新增或拆分 `mobile-preview-state.ts` / `mobile-preview-mode.tsx`，使用 `kebab-case` 文件名。
  - [x] 定义明确 union：`empty`、`preview-ready`、`invalid`。`preview-ready` 必须携带 recovered `SceneDocument` 和 `ImageExportSummary`；`invalid` 必须携带 `RecoveryError[]` 或兼容当前 recovery error shape 的字段列表。
  - [x] 复用 `getBrowserStorage()`、`readLatestSceneDocumentFromStorage()`、`buildImageExportSummary(scene, locale)`；不要新增第二套 localStorage key、不要保存 summary、不要保存 footprint/stacking derived state。
  - [x] 如果 localStorage 不可用，按 `empty` 或明确 storage unavailable state 处理，并给出用户可读说明；不得创建 autosave payload。

- [x] 改造 `AppShell` mobile render 分支（AC: 2, 4, 5, 6）
  - [x] `interactionMode === "readOnly"` 时渲染 Mobile Preview Mode surface，而不是 `workbench-grid`、`SceneCanvas`、`AssetPicker`、`BuildingLevelPanel`、`SelectionInspector` 的缩窄版本。
  - [x] Mobile header 只保留安全的全局上下文，例如品牌和语言；不要渲染 `reset`、desktop `下载预览`、desktop `导出字符串` 或旧 desktop prompt-based `导入字符串`。
  - [x] `empty` 和 `invalid` state 都要显示“导入字符串”入口；14.1 只建立入口和 callback/state boundary，14.3 再实现自定义 modal/decode/storage 写入。不要在 mobile 调用 `window.prompt()` 或 `window.confirm()`。
  - [x] `preview-ready` state 使用 `ImageExportSummary` 暴露 scene name、Pokemon、canvas dimensions 等可测 summary 信号；不要复制 ExportPreview 内部内容。14.2 会把 `ExportPreview` 拆成共享 content 并替换该 surface。

- [x] 保留 desktop 行为和写入边界（AC: 7）
  - [x] Desktop `<768px` 以上仍使用现有 workbench、autosave、scene string import/export 和 `ExportPreview` modal。
  - [x] 保留 `interactionMode` / command guard，确保 mobile 普通编辑 command、canvas pointer mutation、应用级 keyboard handler 仍 no-op。
  - [x] Mobile startup valid/empty/invalid 不触发 autosave effect；只有 Story 14.3 的显式 mobile import success 可以写 autosave slot。

- [x] 更新 i18n 和 styles（AC: 2, 4, 5, 6）
  - [x] 在 `apps/web/src/i18n/index.ts` 增加 zh-CN/en-US 文案：Mobile Preview Mode label、empty state、invalid storage summary、导入入口 accessible name、preview-ready accessible labels。
  - [x] 在 `apps/web/src/styles.css` 添加 mobile preview surface 的专用布局。不要依赖旧 `@media (max-width: 767px)` 隐藏 desktop controls 来达成行为；行为分支应在 React render 层完成。
  - [x] 390x844 下文字和按钮不得重叠；导入入口必须可访问。

- [x] 更新 focused tests（AC: 2, 3, 4, 5, 6, 7）
  - [x] 更新 `apps/web/src/components/app-shell/AppShell.test.tsx` 中旧 mobile read-only workbench 断言：不再期望 mobile 上出现 scene canvas、asset picker、building layer row、selection inspector 或 disabled desktop controls。
  - [x] 新增 mobile empty storage test：`setViewportWidth(390)` + empty localStorage，只显示导入入口，不写 `savedSceneStorageKey`、`autosavedSceneStorageKey`、`uiPreferencesStorageKey`。
  - [x] 新增 mobile valid storage test：预置 autosave scene，期望 `preview-ready` surface 可见、summary metadata 可见、没有 dialog/backdrop、没有 desktop edit controls、不写 storage。
  - [x] 新增 mobile invalid storage test：预置 invalid autosave，期望 readable recovery errors + 导入入口，不显示默认 scene as success，不写 storage。
  - [x] 更新 `apps/web/e2e/workbench-smoke.spec.ts` 里 390x844 responsive helper 和旧 `switches scaffold controls to read-only below the mobile breakpoint` 测试，改为 Mobile Preview Mode contract。
  - [x] 保留 desktop tests 对 `下载预览` modal、autosave、desktop import/export 的覆盖。

- [x] 运行验证（AC: all）
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm run build`
  - [x] 如 E2E scope 已在本 story 修改，运行 `pnpm --filter @pokopia-scene-editor/web smoke` 或 focused Playwright mobile spec。

## Dev Notes

### Epic Context

- Epic 14 的产品方向是：mobile 不再作为桌面工作台的缩窄只读版本，而是导入驱动的布景说明预览 surface。移动端读取本地 scene storage；valid stored scene 显示和 desktop 下载预览一致的内容；没有记录时提供“导入字符串”入口；mobile 不提供编辑器能力。[Source: `_bmad-output/planning-artifacts/epics.md:23-39`]
- Story 14.2 会拆分 `ExportPreview` 的共享 content/presentation 层；Story 14.3 会实现自定义导入字符串 modal 和 mobile import 落盘；Story 14.4 会补齐完整回归和浏览器验证。14.1 不要提前实现全部 modal 或复制 preview 内容。[Source: `_bmad-output/planning-artifacts/epics.md:41-80`]
- Sprint change proposal 明确推荐按 “mobile contract -> shared preview/import primitives -> tests/release gate” 顺序实现，避免在旧 mobile read-only workbench 上只补按钮。[Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:112-124`]

### Product / UX Requirements

- PRD FR109-FR116 是本 story 的权威 product contract：`<768px` 必须进入 Mobile Preview Mode；startup 读取本地 scene storage；无有效记录或 invalid stored scene 显示导入入口；mobile 仍禁止完整编辑能力。[Source: `_bmad-output/planning-artifacts/prd.md:505-514`]
- NFR53-NFR57 要求 mobile import/preview 不写 UI preferences、不保存 `ImageExportSummary` 或 derived state，并在 390x844 下覆盖 no-storage、stored-scene、invalid import、无编辑控件和无重叠。[Source: `_bmad-output/planning-artifacts/prd.md:561-587`]
- UX 规格要求 `<768px` 只承担两个任务：读取本地保存布景并以内联下载预览形式展示；无记录时允许通过自定义导入 modal 粘贴布景字符串。Mobile 不再展示完整只读工作台。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md:728-740`]
- Mobile Preview Mode 不要求渲染 Scene Canvas；它要求 inline 下载预览和导入 modal 有明确可访问名称，且 mobile 键盘不能触发编辑。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md:742-770`]

### Architecture Guardrails

- `interactionMode = "edit" | "readOnly"` 仍是权限边界；mobile import 是独立 replacement flow，不是普通 edit command。普通 scene edit command、canvas pointer mutation 和应用级 edit keyboard 都必须 no-op。[Source: `_bmad-output/planning-artifacts/architecture.md:482-490`]
- React components 不应拥有业务事实副本。Mobile Scene Preview 应读取和 Image Export Preview 相同的 export summary/render data，但 inline 渲染，而不是 dialog。[Source: `_bmad-output/planning-artifacts/architecture.md:432-448`]
- Browser integrations 允许 localStorage scene storage adapter 用于 mobile startup restore 和 explicit mobile import persistence；UI preferences namespace 仍然与 SceneDocument 分离。[Source: `_bmad-output/planning-artifacts/architecture.md:1034-1056`]
- Data flow 要求 mobile startup: `readLatestSceneDocumentFromStorage -> valid scene: buildImageExportSummary -> inline export preview content -> no autosave side effect`。[Source: `_bmad-output/planning-artifacts/architecture.md:1094-1098`]

### Current Code State

- `apps/web/src/state/interaction-mode.ts` 已有 `getInteractionMode(viewportWidth)`，`viewportWidth < 768` 返回 `readOnly`。不要新增另一套 breakpoint helper。[Source: `apps/web/src/state/interaction-mode.ts:1-5`]
- `AppShell` 当前在 startup 调用 `createInitialSceneState()`，该函数已通过 `readLatestSceneDocumentFromStorage(storage)` 读取 valid/invalid storage；valid 返回 scene，invalid 返回 default scene + recovery errors，无 storage 返回 default scene。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1717-1770`]
- `AppShell` 当前仍然总是渲染 `workbench-grid`，在 mobile 只是隐藏 header action buttons 并把 `PokemonSceneControls`、`BuildingLevelPanel`、`SceneCanvas`、`SelectionInspector`、`AssetPicker` 设置 read-only/disabled。14.1 必须替换这个 mobile render shape。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1308-1708`; `apps/web/src/styles.css:3250-3328`]
- `AppShell` 现有 autosave effect 在 `isReadOnly` 时 dismiss autosave toast 并 return；这个行为要保留，防止 mobile startup 写 autosave。[Source: `apps/web/src/components/app-shell/AppShell.tsx:433-471`]
- `readLatestSceneDocumentFromStorage()` 的语义已符合需求：优先读取 autosave；invalid autosave 会被直接报告，不静默 fallback 到 saved；saved/autosave 都 valid 时按 `metadata.updatedAt` 选最新。[Source: `apps/web/src/io/scene-storage.ts:96-116`; `apps/web/src/io/scene-storage.test.ts:101-152`]
- `ExportPreview` 当前固定是 backdrop + `role="dialog"` + `aria-modal="true"` + focus restore/trap + download buttons。14.1 不要把它直接嵌进 mobile；14.2 会拆共享 content。[Source: `apps/web/src/components/export-preview/ExportPreview.tsx:34-125`]
- `buildImageExportSummary(scene, locale)` 已在 `packages/scene-core` 中提供，返回 scene name、Pokemon key、dimensions、overall materials、skills、stacking relations 和 per-layer summaries。Mobile state contract 应复用它。[Source: `packages/scene-core/src/domain/scene/export-summary.ts:35-46`; `packages/scene-core/src/domain/scene/export-summary.ts:171-191`]
- 现有 desktop scene string import 使用 `window.prompt()` + `window.confirm()`，并且 mobile 直接 return。14.1 不必完成 custom modal，但 mobile 新入口不得调用这些 system APIs。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1013-1113`]

### Existing Tests To Change Carefully

- `AppShell.test.tsx` 目前有旧断言：mobile 隐藏 export/import action、保留 read-only workbench、显示 read-only scene canvas、building layer row 和 layer notes。14.1 应更新这些断言为 Mobile Preview Mode surface。[Source: `apps/web/src/components/app-shell/AppShell.test.tsx:632-645`; `apps/web/src/components/app-shell/AppShell.test.tsx:1356-1427`; `apps/web/src/components/app-shell/AppShell.test.tsx:1532-1591`]
- `workbench-smoke.spec.ts` 的 responsive helper 目前要求 390x844 仍有 scene cells，并检查 disabled desktop controls。14.1 应改为不渲染 workbench/canvas，并检查 empty/preview-ready/invalid surface。[Source: `apps/web/e2e/workbench-smoke.spec.ts:607-745`; `apps/web/e2e/workbench-smoke.spec.ts:874-902`]
- Desktop export preview tests already verify modal/backdrop/content/download/storage boundaries; keep them passing rather than weakening assertions.[Source: `apps/web/src/components/export-preview/ExportPreview.test.tsx:23-198`; `apps/web/src/components/app-shell/AppShell.test.tsx:361-390`]

### File Structure Guidance

- Likely UPDATE files:
  - `apps/web/src/components/app-shell/AppShell.tsx`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/components/app-shell/app-shell-helpers.ts`
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/styles.css`
  - `apps/web/e2e/workbench-smoke.spec.ts`
- Likely NEW files:
  - `apps/web/src/components/mobile-preview-mode/mobile-preview-mode.tsx`
  - `apps/web/src/components/mobile-preview-mode/mobile-preview-mode.test.tsx` if the UI grows beyond simple AppShell tests
  - or `apps/web/src/components/app-shell/mobile-preview-state.ts` if state resolution stays AppShell-owned
- Do not modify `packages/scene-core` for this story unless `buildImageExportSummary()` cannot express required preview-ready metadata. No schema, codec, catalog, footprint, stacking, or dimension contract change is expected.

### Technical Constraints

- Use existing stack versions from repo manifests: React 19.2.6, Vite 8.0.13, TypeScript 6.0.3, Vitest 4.1.6, Playwright 1.60.0, Zod 4.4.3. Do not add external state libraries or UI component libraries.
- Keep `SceneDocument v1`, PSE1/PSE2 codec semantics, footprint/stacking/dimension derived rules and export summary contract unchanged.
- Keep user text safe: scene names, layer names, layer notes, skill notes and recovery errors must render as text, not HTML.
- Do not rely on CSS-only hiding for mobile behavior. React render branch must prevent desktop workbench components and edit entrypoints from existing on the mobile page.

### Definition Of Done

- Mobile `empty`, `preview-ready`, and `invalid` states are explicit and covered by tests.
- Mobile no longer renders the desktop workbench layout or old read-only canvas under `<768px`.
- Mobile valid storage can build `ImageExportSummary` without writing storage.
- Mobile invalid storage shows readable errors and import entry without default-scene false success.
- Desktop edit/autosave/download preview/import/export tests still pass.
- Story 14.2 can reuse the state contract to insert shared `ExportPreviewContent`; Story 14.3 can attach a custom import modal to the import entry without changing the state model again.

## Project Structure Notes

- Active repo structure is monorepo: `apps/web` owns browser React UI, `packages/scene-core` owns DOM-free domain/schema/selectors/export summary, root scripts orchestrate workspace commands.
- This story is web/UI state work. Keep shared business rules in `packages/scene-core` and browser-only localStorage/rendering in `apps/web`.
- `project-context.md` was not present in this checkout, so no persistent project-context file was loaded.

## References

- `_bmad-output/planning-artifacts/epics.md:23-39`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:11-23`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:157-174`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:222-235`
- `_bmad-output/planning-artifacts/prd.md:123-129`
- `_bmad-output/planning-artifacts/prd.md:505-514`
- `_bmad-output/planning-artifacts/prd.md:561-587`
- `_bmad-output/planning-artifacts/architecture.md:121-127`
- `_bmad-output/planning-artifacts/architecture.md:482-490`
- `_bmad-output/planning-artifacts/architecture.md:1094-1107`
- `_bmad-output/planning-artifacts/ux-design-specification.md:95-101`
- `_bmad-output/planning-artifacts/ux-design-specification.md:728-770`
- `apps/web/src/components/app-shell/AppShell.tsx:433-471`
- `apps/web/src/components/app-shell/AppShell.tsx:1013-1113`
- `apps/web/src/components/app-shell/AppShell.tsx:1308-1708`
- `apps/web/src/components/app-shell/AppShell.tsx:1717-1770`
- `apps/web/src/io/scene-storage.ts:96-116`
- `apps/web/src/components/export-preview/ExportPreview.tsx:34-125`
- `packages/scene-core/src/domain/scene/export-summary.ts:35-46`
- `packages/scene-core/src/domain/scene/export-summary.ts:171-191`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-31: Red phase `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` failed on old mobile read-only workbench expectations before implementation.
- 2026-05-31: Green/refactor validation passed for AppShell focused tests, ExportPreview focused tests, web typecheck, root build, and web smoke.
- 2026-05-31: Review follow-up validation passed for AppShell focused tests, ExportPreview focused tests, web typecheck, root build, and focused Playwright mobile smoke including invalid storage.

### Completion Notes List

- Story context created from Epic 14 planning, PRD, Architecture, UX, sprint change proposal, current AppShell/storage/export-preview code, and focused existing tests.
- Added explicit Mobile Preview state contract with `empty`, `preview-ready`, and `invalid`; valid storage resolves `SceneDocument` + `ImageExportSummary`, invalid storage preserves `RecoveryError[]`, and unavailable storage stays non-writing.
- Replaced mobile `readOnly` rendering with a dedicated Mobile Preview Mode surface and kept the mobile header to brand + language only; desktop workbench/import/export/autosave/download preview behavior remains covered.
- Added zh-CN/en-US mobile preview copy and dedicated responsive styles for the mobile preview surface and import entry.
- Updated unit and Playwright smoke coverage for mobile empty, valid, invalid/no-default-success, no desktop controls, no prompt/confirm import boundary, and no storage writes.
- Addressed code review follow-ups by preserving the current in-memory desktop draft when resizing into Mobile Preview Mode and adding invalid-storage Playwright coverage.

### File List

- `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx`
- `apps/web/src/components/app-shell/mobile-preview-state.ts`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

### Change Log

- 2026-05-31: Implemented Story 14.1 Mobile Preview Mode planning/state contract and moved status to review.
- 2026-05-31: Addressed AI review follow-ups for desktop-to-mobile current draft preview and invalid-storage mobile smoke coverage.

## Senior Developer Review (AI)

Reviewer: GPT-5 Codex
Date: 2026-05-31
Decision: Changes requested

### Findings

- [x] [Review][Patch][Medium] Mobile breakpoint transition can show stale or empty preview instead of the current desktop draft. `AppShell` resolves `mobilePreviewState` only from `getBrowserStorage()`/`readLatestSceneDocumentFromStorage()` while the autosave effect exits early once `isReadOnly` is true. A desktop edit followed by an immediate resize below 768px can skip autosave and make Mobile Preview Mode ignore the in-memory `scene`, violating the UX requirement that desktop-to-mobile preserves the current draft and shows the current available scene/storage. Evidence: `apps/web/src/components/app-shell/AppShell.tsx:154`, `apps/web/src/components/app-shell/AppShell.tsx:440`, `_bmad-output/planning-artifacts/ux-design-specification.md:740`. Resolved in Round 2.
- [x] [Review][Patch][Low] Playwright mobile smoke does not cover invalid stored scene state. Unit coverage checks invalid storage, but the Story 14.1 E2E contract risk remains because `workbench-smoke.spec.ts` only covers mobile empty and stored valid states under 390px; it does not preload invalid autosave and assert `data-mobile-preview-state="invalid"`, readable errors, import entry, no default-scene success, and unchanged storage. Evidence: `apps/web/e2e/workbench-smoke.spec.ts:607`, `apps/web/e2e/workbench-smoke.spec.ts:622`, `apps/web/e2e/workbench-smoke.spec.ts:705`. Resolved in Round 2.

### Verification

- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` passed.
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` passed.
- `pnpm --filter @pokopia-scene-editor/web typecheck` passed.
- `pnpm run build` passed.
- `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "switches to Mobile Preview Mode|keeps default 17x17|keeps legacy 7x7" --project=chromium` passed.

## Review Follow-ups

- [x] Add a desktop-to-mobile transition test that changes scene state on desktop, resizes to `<768px` before relying on autosave, and expects Mobile Preview Mode to preview the current in-memory draft without writing scene storage.
- [x] Update the mobile preview state resolution so direct mobile startup remains storage-driven, while desktop-to-mobile transition can use the current `scene` as the current available draft when storage is absent or stale.
- [x] Add a focused Playwright smoke case for invalid mobile stored scene state at 390x844.

## Senior Developer Review (AI) - Round 2

Reviewer: GPT-5 Codex
Date: 2026-05-31
Decision: Approved

### Findings

- None. The prior desktop-to-mobile current draft finding is closed by passing the current in-memory `scene` into mobile preview resolution after the session has entered desktop edit mode, while direct mobile startup remains storage-driven.
- None. The prior invalid mobile smoke gap is closed by the focused Playwright case for invalid stored scene state at 390x844.

### Verification

- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` passed.
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` passed.
- `pnpm --filter @pokopia-scene-editor/web typecheck` passed.
- `pnpm run build` passed.
- `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "switches to Mobile Preview Mode|shows invalid stored scene state|keeps default 17x17|keeps legacy 7x7" --project=chromium` passed on rerun. The first attempt was run concurrently with `pnpm run build` and webServer failed during asset verification with a transient missing `dist` asset; the asset existed immediately afterward and the isolated rerun passed.
