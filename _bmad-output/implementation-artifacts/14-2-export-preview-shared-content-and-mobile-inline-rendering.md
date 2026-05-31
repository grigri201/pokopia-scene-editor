# Story 14.2: ExportPreview 内容拆分并支持 mobile inline 渲染

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile 用户,
I want mobile 页面显示和 desktop 下载预览完全一样的布景说明内容,
so that 我在手机上看到的素材清单和逐层图形与下载图一致。

## Acceptance Criteria

1. `ExportPreview` 拆出共享 content/presentation 层，desktop modal 和 mobile inline 共用同一内容组件。
2. Desktop `下载预览` 仍使用 modal/backdrop、`role="dialog"`、focus trap、Escape close、下载按钮和现有下载逻辑。
3. Mobile inline preview 不使用 backdrop，不设置 `aria-modal`，不 trap focus，不遮挡页面。
4. Mobile inline preview 展示与 desktop preview 同一份 scene-derived content：scene name、Pokemon、canvas dimensions、overall materials、per-layer graphics、per-layer materials、layer notes、footer。
5. Mobile inline preview 不写 `SceneDocument`、autosave、saved storage 或 UI preferences。
6. `ExportPreview` component tests 覆盖 modal 和 inline 两种容器。

## Tasks / Subtasks

- [x] 拆分 `ExportPreview` content 与 desktop dialog wrapper（AC: 1, 2, 4）
  - [x] 在 `apps/web/src/components/export-preview/ExportPreview.tsx` 中抽出可复用 `ExportPreviewContent`，保留并复用现有 header、Pokemon portrait、canvas dimensions、overall material list、per-layer graphics、per-layer material list、layer notes 和 footer。
  - [x] 让现有 exported `ExportPreview` 继续作为 desktop modal wrapper，对 AppShell 调用方保持兼容：backdrop、`role="dialog"`、`aria-modal="true"`、focus restore、Tab focus trap、Escape close、下载图片、按层下载图片、关闭按钮和 download status 行为都不变。
  - [x] 不要复制 `LayerPreview`、`ExportCell`、stacking/footprint overlay、`UsageList` 或 material color 逻辑；这些都必须通过共享 content 路径执行。

- [x] 将 Mobile Preview `preview-ready` surface 接到共享 content（AC: 1, 3, 4, 5）
  - [x] 用 `mobilePreviewState.summary` 渲染共享 `ExportPreviewContent`，替换 14.1 临时的 `PreviewReadyContent` 摘要列表。
  - [x] Mobile inline 容器可以是 `MobilePreviewMode` 内的 section/wrapper，但不得使用 `.export-preview-backdrop`、`role="dialog"`、`aria-modal`、dialog `tabIndex`、focus trap 或 Escape close 逻辑。
  - [x] Mobile inline preview 必须保留“导入字符串”入口，供 Story 14.3 接 custom modal；本 story 不实现 decode、lossy recovery、storage 写入或 custom modal。
  - [x] Mobile valid storage 和 desktop-to-mobile current draft preview 都必须通过同一 `ImageExportSummary` content 渲染，不另建 scene-derived material/layer 文本。

- [x] 调整样式以支持 inline preview 容器（AC: 3, 4）
  - [x] 复用现有 `.export-preview*` 内容样式时，拆出只属于 modal 的 fixed/backdrop/max-height/box-shadow 行为，避免 mobile inline 页面被当成弹层。
  - [x] 为 inline 模式增加稳定的 responsive constraints，390x844 下 scene name、Pokemon、canvas dimensions、overall materials 和逐层图形可读，且页面无横向溢出或控件重叠。
  - [x] 保持 export layer grid 的 square-cell 规则和 rectangular canvas behavior；不要回退已经通过 `--export-grid-*` 和 `outline` 保证的方格修复。

- [x] 更新 focused component tests（AC: 2, 3, 4, 5, 6）
  - [x] 扩展 `apps/web/src/components/export-preview/ExportPreview.test.tsx`：desktop modal 仍有 dialog/backdrop/download controls/focus behavior；inline content 渲染同一 heading、Pokemon、canvas dimensions、overall materials、layer graphics、layer materials、layer notes、footer，但没有 dialog/backdrop/aria-modal/download controls。
  - [x] 更新 `apps/web/src/components/app-shell/AppShell.test.tsx`：mobile valid storage 和 desktop-to-mobile draft case 断言 inline preview 内容来自共享 export content，例如整体素材清单、逐层图形和层备注，而不再只断言 14.1 的临时 summary labels。
  - [x] 继续断言 mobile inline preview 不写 `savedSceneStorageKey`、`autosavedSceneStorageKey`、`uiPreferencesStorageKey`，且点击“导入字符串”仍不调用 `window.prompt` / `window.confirm`。
  - [x] 保留 desktop `下载预览` modal、autosave、desktop scene string import/export 和 image download tests，不要通过弱化断言让测试通过。

- [x] 验证（AC: all）
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm run build`
  - [x] 如本 story 修改 Playwright responsive expectations，运行 focused smoke：`pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|keeps default 17x17|keeps legacy 7x7" --project=chromium`

## Dev Notes

### Epic Context

- Epic 14 的目标是把 mobile 从缩窄只读工作台改为导入驱动的布景说明预览 surface。Mobile 有有效本地记录时以内联方式展示与 desktop 下载预览完全相同的内容；无记录时展示“导入字符串”入口；mobile 不提供编辑能力。[Source: `_bmad-output/planning-artifacts/epics.md:23-52`]
- Story 14.2 只负责共享 `ExportPreview` content 和 mobile inline 渲染。Story 14.3 才实现自定义导入字符串 modal、decode/lossy recovery 和 storage 写入；Story 14.4 补全更完整的回归和浏览器验证。[Source: `_bmad-output/planning-artifacts/epics.md:54-80`]
- Sprint proposal 明确风险：desktop 与 mobile 预览内容漂移。Mitigation 是拆共享 `ExportPreviewContent`，只分容器不分内容。[Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:298-304`]

### Product / UX Requirements

- PRD FR115 是本 story 的核心 contract：mobile inline preview 与 desktop 下载预览必须共享同一 scene-derived 内容，包括标题、Pokemon、canvas dimensions、整体素材清单、逐层图形、逐层素材清单、层备注、footprint/stacking 表达、安全文本和 i18n。[Source: `_bmad-output/planning-artifacts/prd.md:505-514`]
- NFR54 要求 mobile inline preview 和 desktop download preview 共用同一内容组件或等价共享渲染路径，防止素材清单、逐层图形、层备注或安全文本表达漂移。[Source: `_bmad-output/planning-artifacts/prd.md:561-563`]
- UX 规格要求 mobile inline preview 内容与 desktop “下载预览”一致，区别仅在容器：desktop 使用 modal，mobile 使用页面内 inline surface。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md:95-101`]
- 390x844 是必测目标；有本地布景时 scene name、Pokemon、canvas dimensions、整体素材清单和逐层图形必须可访问，且不出现控件重叠。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md:728-770`]

### Architecture Guardrails

- `ExportPreview` 必须拆出共享 content/presentation 层；desktop modal wrapper 与 mobile inline wrapper 共享同一 scene-derived 内容。Desktop 继续使用 modal/backdrop/focus trap/download controls；mobile inline surface 不使用 `aria-modal`、不 trap focus、不遮挡页面。[Source: `_bmad-output/planning-artifacts/architecture.md:121-127`]
- React components 不应拥有业务事实副本。Image Export Preview 和 Mobile Scene Preview 都读取 export summary/render data，区别只是 dialog vs inline 容器。[Source: `_bmad-output/planning-artifacts/architecture.md:432-448`]
- `<768px` 的 Mobile Preview Mode 是架构边界，不是 CSS-only 行为；普通 edit command、canvas mutation 和应用级 edit keyboard 仍必须 no-op。本 story 不应引入任何 mobile 编辑路径。[Source: `_bmad-output/planning-artifacts/architecture.md:482-490`]
- Mobile startup data flow 是 `readLatestSceneDocumentFromStorage -> buildImageExportSummary -> inline export preview content -> no autosave side effect`。不要保存 export summary、footprint/stacking derived state 或 UI preference。[Source: `_bmad-output/planning-artifacts/architecture.md:1094-1107`]

### Previous Story Intelligence

- Story 14.1 已完成 `MobilePreviewState`：`empty`、`preview-ready`、`invalid`。`preview-ready` 携带 recovered/current `SceneDocument` 和 `ImageExportSummary`；这正是本 story 接共享 content 的输入，不需要重新设计状态 union。[Source: `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md`]
- 14.1 的 AI review 已修复 desktop-to-mobile transition：直接 mobile startup 仍 storage-driven，但桌面编辑后缩到 mobile 可用 current in-memory draft 生成 preview。14.2 必须保留这个行为。[Source: `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md`]
- 14.1 当前实现中 `MobilePreviewMode` 的 `PreviewReadyContent` 只显示 scene name、Pokemon、canvas dimensions 和材料摘要；这是临时 surface。14.2 要用共享 export preview content 替换它，而不是在此临时组件中继续堆更多重复渲染。[Source: `apps/web/src/components/app-shell/mobile-preview-mode.tsx:30-95`]
- 14.1 当前 `requestMobileImport` 是 no-op，用于保留 mobile import entry boundary。不要在 14.2 中实现 prompt、confirm 或 custom modal；该 scope 属于 14.3。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1155`; `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:270-283`]

### Current Code State

- `AppShell` 只在 `isReadOnly` 时计算 `mobilePreviewState`，并把 current draft scene 传给 `resolveMobilePreviewState` 以支持桌面缩小到 mobile 的草稿预览。[Source: `apps/web/src/components/app-shell/AppShell.tsx:151-161`]
- Desktop `下载预览` 仍通过 `openExportPreview()` 调用 `buildImageExportSummary(scene, locale)`，并在 `exportPreviewSummary` 存在时渲染 `ExportPreview`。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1133-1153`; `apps/web/src/components/app-shell/AppShell.tsx:1620-1629`]
- Mobile 分支目前渲染 `MobilePreviewMode`；desktop workbench 只在没有 `mobilePreviewState` 时渲染。14.2 应保持这个 render branch，不要把 workbench/canvas 重新带回 mobile。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1631-1715`]
- `ExportPreview.tsx` 当前把 dialog wrapper、focus trap、download controls 和全部 preview content 放在一个组件内。可复用内容包括 header、overall summary、layers、footer；helper functions 包括 `LayerPreview`、`LayerNotes`、`ExportCell`、stacking/footprint overlay、`getExportGridStyle`、`UsageList` 和 material color map。[Source: `apps/web/src/components/export-preview/ExportPreview.tsx:34-223`; `apps/web/src/components/export-preview/ExportPreview.tsx:237-620`]
- `ExportPreview.test.tsx` 已覆盖 title、Pokemon portrait、canvas dimensions、overall materials、layer graphics、layer materials、layer notes、安全文本、英文 i18n、rectangular square-cell behavior、footprint overlays 和 stacking split rendering。Inline tests should reuse these expectations instead of creating a weaker duplicate test surface。[Source: `apps/web/src/components/export-preview/ExportPreview.test.tsx:23-198`; `apps/web/src/components/export-preview/ExportPreview.test.tsx:200-280`]
- Existing CSS has modal-specific `.export-preview-backdrop` and `.export-preview` rules, plus mobile media rules for the old modal. Inline mode needs a non-fixed/non-backdrop variant while preserving export content styles.[Source: `apps/web/src/styles.css:874-1005`; `apps/web/src/styles.css:3332-3351`; `apps/web/src/styles.css:3373-3393`]
- 14.1 mobile tests already assert no desktop workbench, no dialog/backdrop, no storage writes and no system prompt in empty/valid/invalid states. Update these tests to assert full shared content when `preview-ready`.[Source: `apps/web/src/components/app-shell/AppShell.test.tsx:632-662`; `apps/web/src/components/app-shell/AppShell.test.tsx:1448-1478`; `apps/web/src/components/app-shell/AppShell.test.tsx:1584-1665`]

### Git Intelligence

- Recent relevant commits show the planning handoff and preview/export work pattern: `f2734ed docs: approve mobile preview BMAD plan`, `39f8be6 feat: add layered image export`, and earlier export preview square-cell work. Keep this story scoped to `apps/web` presentation/tests and do not reopen archived Epic 1-13 work.
- Prior export preview fix made rectangular layer graphics derive grid variables from `canvasSize` and keep the edge as `outline` instead of layout-affecting border. Do not change this behavior while adapting inline styles.

### File Structure Guidance

- Likely UPDATE files:
  - `apps/web/src/components/export-preview/ExportPreview.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - `apps/web/src/components/app-shell/mobile-preview-mode.tsx`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/styles.css`
  - `apps/web/e2e/workbench-smoke.spec.ts` only if responsive smoke expectations need to assert shared inline content.
- Optional NEW files if the split becomes clearer:
  - `apps/web/src/components/export-preview/ExportPreviewContent.tsx`
  - `apps/web/src/components/export-preview/ExportPreviewContent.test.tsx`
- Do not modify `packages/scene-core` for this story unless an existing `ImageExportSummary` field is truly missing. No schema, codec, catalog, footprint, stacking, dimension or storage contract change is expected.

### Technical Constraints

- Use existing repo stack: React 19.2.6, Vite 8.0.13, TypeScript 6.0.3, Vitest 4.1.6, Playwright 1.60.0. Do not add new UI libraries or state libraries.
- Keep `SceneDocument v1`, PSE1/PSE2 codec semantics, `buildImageExportSummary()`, footprint/stacking/dimension derived rules and localStorage adapter semantics unchanged.
- All user-controlled text in scene names, layer names, layer notes, asset names, skill notes and recovery errors must render as text, never via `dangerouslySetInnerHTML` or an HTML parser.
- Download buttons and `data-image-export-exclude="true"` stay desktop dialog concerns. Inline mobile content should not expose download controls unless a later story explicitly changes the product scope.
- Avoid a prop/API that lets callers pass custom child renderers for material/layer rows; that would reintroduce content drift. Prefer one shared content component fed by `ImageExportSummary`.

### Definition Of Done

- `ExportPreview` desktop modal behavior is unchanged from the user's perspective and tests still prove dialog/backdrop/focus/download behavior.
- Mobile `preview-ready` renders the same content component as desktop preview and includes scene name, Pokemon, canvas dimensions, overall materials, per-layer graphics, per-layer materials, layer notes and footer.
- Mobile inline preview has no backdrop, no dialog role, no `aria-modal`, no focus trap, no Escape-close behavior, no download controls, and no layout overlap at 390x844.
- Mobile inline preview does not write SceneDocument, autosave, saved storage or UI preferences.
- Existing desktop edit/autosave/download preview/import/export behavior and tests continue passing.
- Story 14.3 can attach custom import modal behavior to the existing mobile import entry without changing the shared preview content again.

## Project Structure Notes

- Active repo structure is monorepo: `apps/web` owns browser React UI and localStorage/rendering; `packages/scene-core` owns DOM-free domain/schema/selectors/export summary; root scripts orchestrate workspace commands.
- This story is web presentation/refactor work. Shared business rules remain in `packages/scene-core`; shared preview rendering should live under `apps/web/src/components/export-preview/`.
- `project-context.md` was not present in this checkout, so no persistent project-context file was loaded.

## References

- `_bmad-output/planning-artifacts/epics.md:23-52`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:157-199`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:257-268`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:298-304`
- `_bmad-output/planning-artifacts/prd.md:123-129`
- `_bmad-output/planning-artifacts/prd.md:505-514`
- `_bmad-output/planning-artifacts/prd.md:561-587`
- `_bmad-output/planning-artifacts/architecture.md:121-127`
- `_bmad-output/planning-artifacts/architecture.md:432-448`
- `_bmad-output/planning-artifacts/architecture.md:482-490`
- `_bmad-output/planning-artifacts/architecture.md:1094-1107`
- `_bmad-output/planning-artifacts/ux-design-specification.md:95-101`
- `_bmad-output/planning-artifacts/ux-design-specification.md:728-770`
- `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md`
- `apps/web/src/components/app-shell/mobile-preview-state.ts:12-67`
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx:30-95`
- `apps/web/src/components/app-shell/AppShell.tsx:151-161`
- `apps/web/src/components/app-shell/AppShell.tsx:1133-1155`
- `apps/web/src/components/app-shell/AppShell.tsx:1620-1637`
- `apps/web/src/components/export-preview/ExportPreview.tsx:34-223`
- `apps/web/src/components/export-preview/ExportPreview.tsx:237-620`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx:23-198`
- `apps/web/src/styles.css:874-1005`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Implementation Plan

- Keep `ExportPreview` as the desktop modal API and move scene-derived rendering into one exported `ExportPreviewContent` component.
- Feed mobile `preview-ready` from the existing 14.1 `ImageExportSummary` state instead of deriving local scene/material/layer text in `MobilePreviewMode`.
- Move fixed/backdrop/max-height/shadow behavior to the dialog variant and keep inline preview content in normal page flow.
- Prove desktop modal behavior and mobile inline behavior with focused component tests, then run story validations and full regression.

### Debug Log References

- RED: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` failed because `ExportPreviewContent` was not exported yet; AppShell focused test failed because mobile still rendered 14.1 temporary summary labels.
- GREEN: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` passed with 14 tests.
- GREEN: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` passed with 61 tests.
- Verification: `pnpm --filter @pokopia-scene-editor/web typecheck` passed.
- Verification: `pnpm run build` passed, including runtime asset verification with 1474 references checked.
- Full regression: first `pnpm run test` surfaced stale AssetPicker catalog count expectations after catalog size changed to 1161; updated that focused regression test to derive total/page count from `assetCatalog` and `assetPageSize`.
- Full regression: final `pnpm run test` passed with scene-core 16 files / 153 tests and web 18 files / 237 tests.
- Playwright focused smoke initially failed after review because mobile preview-ready expectations still targeted removed 14.1 summary labels. Updated the smoke assertions to target shared `ExportPreviewContent`; the focused smoke now passes.

### Completion Notes List

- Story context created from Epic 14 planning, PRD, Architecture, UX, approved sprint change proposal, completed Story 14.1 implementation notes, current mobile preview state/code, current ExportPreview implementation/tests, and recent git history.
- No latest external web research was needed because this story does not require library upgrades or new external APIs; repo-pinned versions are the source of truth.
- Extracted shared `ExportPreviewContent` from the desktop modal while preserving `ExportPreview` backdrop, `role="dialog"`, `aria-modal`, focus restore/trap, Escape close, download buttons, layer download, close button, and download status behavior.
- Replaced 14.1 mobile `PreviewReadyContent` summary with inline `ExportPreviewContent` fed by `mobilePreviewState.summary`; the mobile import button remains as the Story 14.3 entry boundary and no decode/storage-write behavior was added.
- Split modal-only export preview CSS into the dialog variant and added inline/mobile constraints so the shared preview content renders as page content without backdrop/focus trap/download controls.
- Expanded focused tests for inline export content, mobile valid-storage preview, desktop-to-mobile draft preview, storage no-write behavior, layer notes, and no dialog/backdrop/aria-modal/download controls.
- Addressed code review follow-up by updating mobile `preview-ready` Playwright assertions to target the shared export preview heading, canvas text, image export content, overall material list and layer graphics/material lists.

### File List

- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/implementation-artifacts/14-2-export-preview-shared-content-and-mobile-inline-rendering.md`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx`
- `apps/web/src/components/asset-picker/AssetPicker.test.tsx`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/src/components/export-preview/ExportPreview.tsx`
- `apps/web/src/styles.css`

### Change Log

- 2026-05-31: Created Story 14.2 context and marked it ready for dev.
- 2026-05-31: Implemented shared ExportPreview content, wired mobile inline preview to ImageExportSummary content, added inline styles/tests, fixed stale AssetPicker catalog-count regression, and marked story ready for review.
- 2026-05-31: Fixed Story 14.2 review finding by updating focused Playwright mobile preview-ready assertions and rerunning the responsive smoke.

## Senior Developer Review (AI)

Review date: 2026-05-31
Reviewer: bmad-code-review agent
Decision: Changes requested; not approved.

### Findings

- [x] [Review][Patch][P1] Focused Playwright responsive smoke fails after the shared inline content change. `apps/web/e2e/workbench-smoke.spec.ts:937` still asserts the removed 14.1 summary labels `Mobile preview scene name` and `Mobile preview canvas dimensions`, but `MobilePreviewMode` now renders shared `ExportPreviewContent` directly at `apps/web/src/components/app-shell/mobile-preview-mode.tsx:30`. This contradicts the story's verification note that Playwright was not needed because responsive expectations were not modified: this file was modified, and the focused command fails with `element(s) not found` for `getByLabel('Mobile preview scene name')`. Update the smoke assertions to target the shared export preview content, or intentionally restore equivalent accessible labels without duplicating scene-derived content, then rerun the focused smoke. Resolved by updating the smoke helper to assert shared export preview heading, canvas text and content sections.

### Validation Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` (14 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (61 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: `pnpm run build`
- FAIL: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "keeps legacy 7x7" --project=chromium`

## Review Follow-ups

- [x] Fix the Playwright responsive smoke expectations for mobile `preview-ready` so they assert the shared `ExportPreviewContent` surface instead of obsolete mobile summary aria labels, then rerun the Story 14.2 focused smoke.

## Senior Developer Review (AI) - Round 2

Review date: 2026-05-31
Reviewer: bmad-code-review agent
Decision: Approved.

### Findings

- None. The previous Playwright mobile preview-ready finding is closed: the smoke helper now asserts the shared `ExportPreviewContent` surface instead of the removed 14.1 summary aria labels, and the focused responsive smoke passes.

### Validation Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` (14 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (61 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|keeps default 17x17|keeps legacy 7x7" --project=chromium` (4 tests)
