# Story 14.3: 自定义导入字符串 modal 与 mobile 导入落盘

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mobile 用户,
I want 通过自定义 modal 粘贴布景字符串并确认导入,
so that 没有本地记录时也能在手机上查看布景说明。

## Acceptance Criteria

1. Mobile empty 和 invalid state 的“导入字符串”按钮会打开自定义 modal；modal 包含 textarea、确认、取消和关闭按钮，并有可访问名称。
2. Mobile 导入 flow 不调用 `window.prompt` 或 `window.confirm`。如 desktop 继续保留“导入字符串”入口，也必须复用同一个 modal，不再保留 prompt/confirm 导入分支。
3. 确认导入时复用 `decodeSceneDocumentStringWithLossyRecovery(sceneString, now)` 和 `applyRecoveredSceneDocument(currentScene, decoded.payload, { interactionMode, source: "confirmed-user" })`；invalid string 在 modal 内显示错误，不关闭 modal，不写 storage，不改变 scene。
4. 有 `droppedTileInstances` 时，modal 内展示丢弃明细，并要求用户再次确认后才导入剩余兼容内容；用户取消 lossy confirmation 时不写 storage、不改变 scene。
5. Mobile 导入成功后使用现有 scene storage adapter 写入 autosave slot，清除 modal 状态，并在 mobile 页面立即进入 `preview-ready`，显示共享 `ExportPreviewContent` inline preview。
6. 取消、关闭或空输入不改变 scene，不写 saved storage，不写 autosave storage，不写 UI preferences，不保存 `ImageExportSummary` 或任何 footprint/stacking derived state。
7. Desktop 导入若迁移到同一 modal，必须保持现有 desktop import 语义：成功后替换当前编辑 scene、清理 recovery errors、展示 scene-string toast，并保持 desktop autosave/download preview/export 行为不回退。

## Tasks / Subtasks

- [x] 新增可复用 `SceneStringImportModal`（AC: 1, 2, 3, 4, 6, 7）
  - [x] 建议放在 `apps/web/src/components/scene-string-import-modal/`，或若本 repo 更偏向 colocate，可放在 `apps/web/src/components/app-shell/scene-string-import-modal.tsx`；文件名保持 `kebab-case`。
  - [x] Modal 使用自定义 React UI，不使用 `window.prompt` / `window.confirm`；提供 textarea、确认、取消、关闭、错误区、lossy warning 区和二次确认动作。
  - [x] Modal 必须有 `role="dialog"`、可访问名称、关闭按钮可聚焦、Escape close、基础 focus containment 或等价可访问行为；textarea 和按钮保留标准键盘操作。
  - [x] 错误区显示 decode/recovery errors 的 `fieldPath`、`reason`、`expected`、`actual`、`recoveryAction`。所有内容作为文本渲染，不使用 `dangerouslySetInnerHTML`。
  - [x] Lossy 区复用 `formatDroppedTileInstance()` 输出丢弃素材明细，避免创建第二套 dropped material 文案逻辑。

- [x] 抽出 scene string import 执行逻辑，替换 AppShell prompt/confirm 分支（AC: 2, 3, 4, 7）
  - [x] 将 `AppShell` 当前 `importSceneString()` 中的 decode、lossy details、`applyRecoveredSceneDocument()`、scene replacement、toast/recovery 状态更新拆成可由 modal confirm 调用的 handler。
  - [x] Desktop toolbar 的“导入字符串”改为打开同一 modal；删除或绕开 `window.prompt(t(locale, "sceneStringImportPrompt"))` 和 `window.confirm(...)` 导入路径。
  - [x] Export string 仍可保持当前 `window.prompt()` 复制展示行为，本 story 只要求 import 不使用 system prompt/confirm。
  - [x] Desktop import 成功后保持现有行为：`setScene(appliedRecovery.scene)`、清空 recovery errors、设置 recovery success、清 placement feedback、清 selected instance、重置 replacement confirmation、展示 success/warning toast。
  - [x] Desktop invalid import 保持当前 scene，不写 storage，并显示 recovery toast / scene-string error toast。

- [x] 接入 Mobile Preview Mode 的 import entry 与 autosave 落盘（AC: 1, 3, 4, 5, 6）
  - [x] 将 `requestMobileImport` 从 no-op 改为打开同一 `SceneStringImportModal`。
  - [x] Mobile confirm 成功后使用当前有效 scene 作为 recovery base：若 `mobilePreviewState.status === "preview-ready"`，用其中的 `scene`；若是 `empty` 或 `invalid`，用当前 `scene` 作为 `applyRecoveredSceneDocument()` 的 base，但不得把该 base 当成成功预览展示。
  - [x] Mobile import 成功后调用 `writeSceneDocumentToStorage(storage, appliedRecovery.scene, "autosave")`；不要调用 `writeSceneDocumentToAllStorageSlots()`，不要写 saved slot。
  - [x] 成功后更新 React scene state 到 recovered scene，并关闭/重置 modal。下一次 render 的 `resolveMobilePreviewState()` 应能从 autosave 或 current scene 生成 `preview-ready` 与 `ExportPreviewContent`。
  - [x] 若 `getBrowserStorage()` 返回 null 或 `setItem` 抛错，modal/notification 显示可读错误，保持 modal 可重试，不报告导入成功。
  - [x] Mobile cancel、close、invalid、lossy cancel 和空 textarea 都不得写 `savedSceneStorageKey`、`autosavedSceneStorageKey` 或 `uiPreferencesStorageKey`。

- [x] 更新 i18n 和 styles（AC: 1, 3, 4, 6）
  - [x] 在 `apps/web/src/i18n/index.ts` 增加 zh-CN/en-US modal 文案：标题、textarea label、placeholder、确认、二次确认、取消、关闭、invalid summary、lossy summary、storage error、空输入提示。
  - [x] 保留既有 `sceneStringImported`、`sceneStringImportedWithLosses`、`sceneStringInvalid`、`sceneStringImportCanceled` 等 toast 文案，必要时复用而不是新增重复语义。
  - [x] 在 `apps/web/src/styles.css` 增加 modal/backdrop/content/textarea/error/lossy styles；390x844 下 modal 内容可滚动、按钮不重叠、textarea 可输入。
  - [x] 不把 modal 放入 `ExportPreviewContent`，不要让 mobile inline preview 获得 dialog/backdrop/focus trap。

- [x] 更新 focused component tests（AC: all）
  - [x] `AppShell.test.tsx` 覆盖 mobile empty -> open modal -> valid import -> autosave slot 写入 -> inline shared preview 可见。
  - [x] 覆盖 mobile invalid import：modal 留在打开状态、显示错误、不写 storage、不改变 scene、不调用 prompt/confirm。
  - [x] 覆盖 mobile lossy import：先显示 dropped details，第一次确认不直接写；二次确认后写 autosave 并展示 preview；lossy cancel 不写 storage。
  - [x] 覆盖 mobile cancel 和 close：不写 saved/autosave/UI preferences，不改变 scene。
  - [x] 覆盖 desktop import 入口使用同一 modal，成功/invalid/lossy semantics 与旧测试等价；删除或更新旧的 prompt/confirm expectations。
  - [x] 保留 14.1/14.2 断言：mobile 不渲染 desktop workbench；preview-ready 使用共享 `ExportPreviewContent`；desktop download preview modal 行为不变。

- [x] 运行验证（AC: all）
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`
  - [x] `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom`
  - [x] 若新增 modal 独立测试，运行对应 focused vitest 文件。
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `pnpm run build`
  - [x] 若本 story 修改 Playwright mobile import flow，运行 focused smoke，例如 `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|import" --project=chromium`。

## Dev Notes

### Epic Context

- Epic 14 的目标是把 mobile 从缩窄只读工作台改为导入驱动的布景说明预览 surface：移动端读取本地 scene storage；有有效记录时 inline 展示与 desktop 下载预览相同内容；无记录时显示“导入字符串”；导入用自定义 modal；成功后保存到本地 scene storage；mobile 不提供编辑能力。[Source: `_bmad-output/planning-artifacts/epics.md:23-67`]
- Story 14.3 是 import/storage story。Story 14.1 已建立 mobile preview state contract；Story 14.2 已建立共享 preview content；Story 14.4 再补更完整回归和浏览器验证。[Source: `_bmad-output/planning-artifacts/epics.md:27-80`]
- Approved sprint change proposal 明确：自定义 import modal 应替代 system prompt/confirm，建议 desktop 和 mobile 共用同一 modal，以避免导入路径分叉。[Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:195-220`]

### Product / UX Requirements

- PRD FR112-FR114 是本 story 的核心 product contract：mobile import 必须使用自定义 modal，不得使用系统 `window.prompt` 或 `window.confirm`；必须复用短字符串 decode、lossy recovery 和 SceneDocument recovery；成功后写入现有 scene storage。[Source: `_bmad-output/planning-artifacts/prd.md:505-514`]
- PRD NFR53/NFR55/NFR56 要求 mobile 导入成功只能写现有 scene storage，不写 UI preferences，不保存 derived state；invalid/lossy/cancel/close 状态必须给出明确反馈；modal 控件必须可访问。[Source: `_bmad-output/planning-artifacts/prd.md:561-587`]
- UX 规格要求 modal 提供 textarea、确认、取消和关闭；invalid string 留在 modal 内显示错误；lossy recovery 列出丢弃素材并要求二次确认；导入成功后 mobile 直接进入 inline preview，不弹出下载预览层。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md:95-101`; `_bmad-output/planning-artifacts/ux-design-specification.md:761-767`]

### Architecture Guardrails

- `<768px` 仍进入 `readOnly` interaction mode；ordinary edit command、canvas pointer mutation 和 edit keyboard 仍必须 no-op。Mobile import 是独立 replacement flow，必须走 decode/recovery/storage adapter，不得直接 mutate scene object 或保存派生状态。[Source: `_bmad-output/planning-artifacts/architecture.md:482-490`]
- Mobile import data flow 是 `custom modal textarea -> decodeSceneDocumentStringWithLossyRecovery -> applyRecoveredSceneDocument with explicit import source -> write imported scene to scene storage -> buildImageExportSummary -> inline export preview content`。[Source: `_bmad-output/planning-artifacts/architecture.md:1094-1107`]
- Browser-only local scene storage adapter 属于 `apps/web/src/io/`；UI preferences namespace 与 SceneDocument 分离。不要新增 localStorage key，也不要把 import modal draft 或 export summary 写入 storage。[Source: `apps/web/src/io/scene-storage.ts:29-38`; `apps/web/src/io/scene-storage.ts:96-116`]
- 用户输入的 scene name、layer name、layer notes、skill notes、recovery errors 和 dropped material details 必须作为文本渲染，不使用 HTML parser 或 `dangerouslySetInnerHTML`。[Source: `_bmad-output/planning-artifacts/architecture.md:721-724`]

### Previous Story Intelligence

- Story 14.1 已完成 `MobilePreviewState` union：`empty`、`preview-ready`、`invalid`。`preview-ready` 携带 `scene` 和 `summary`；`invalid` 携带 recovery errors。14.3 应复用该 contract，不再新增一套 mobile storage state。[Source: `apps/web/src/components/app-shell/mobile-preview-state.ts:12-67`]
- Story 14.1 review follow-up 已修复 desktop-to-mobile current draft：直接 mobile startup storage-driven；桌面编辑后缩小到 mobile 可使用 current in-memory draft。14.3 成功导入后既要更新 scene state，也要写 autosave，使直接刷新和继续当前页面都正确。[Source: `apps/web/src/components/app-shell/AppShell.tsx:155-161`]
- Story 14.2 已把 `MobilePreviewMode` 的 `preview-ready` 渲染接到共享 `ExportPreviewContent`，并保留“导入字符串”按钮作为 14.3 entry boundary。[Source: `apps/web/src/components/app-shell/mobile-preview-mode.tsx:30-45`]
- Story 14.2 的 review 曾发现 Playwright 还在断言 14.1 临时 summary labels。14.3 如果改 mobile import smoke，断言应针对当前共享 export preview surface，而不是旧 `mobilePreviewSceneNameLabel` 等废弃临时 label。[Source: `_bmad-output/implementation-artifacts/14-2-export-preview-shared-content-and-mobile-inline-rendering.md`]

### Current Code State

- `AppShell` 当前 desktop import 仍在 `importSceneString()` 中调用 `window.prompt()` 和 `window.confirm()`，然后执行 `decodeSceneDocumentStringWithLossyRecovery()`、`formatDroppedTileInstance()`、`applyRecoveredSceneDocument()`、`setScene()` 和 toast/recovery 状态更新。14.3 应保留这些业务步骤，替换输入/确认 UI。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1052-1131`]
- `requestMobileImport` 当前是 no-op，传入 `MobilePreviewMode` 的 import 按钮。14.3 的 mobile 接入点就是这里。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1155`; `apps/web/src/components/app-shell/AppShell.tsx:1631-1636`]
- `writeSceneDocumentToStorage(storage, scene, "autosave")` 是单 slot 写入 API；`readLatestSceneDocumentFromStorage(storage)` 优先报告 invalid autosave，valid saved/autosave 同时存在时按 `updatedAt` 选最新。Mobile import 成功应写 autosave slot，并让刷新后 startup 能读取。[Source: `apps/web/src/io/scene-storage.ts:29-38`; `apps/web/src/io/scene-storage.ts:96-116`]
- `SceneStringDroppedTileInstance` 和 lossy decode result 已由 `scene-core` 暴露；`formatDroppedTileInstance()` 已把 dropped item、坐标、冲突类型、阻挡素材等格式化为 zh/en 文案。Modal 不应重复实现 dropped detail formatting。[Source: `packages/scene-core/src/io/scene-string-codec.ts:38-64`; `apps/web/src/components/app-shell/app-shell-helpers.ts:16-52`]
- 现有 desktop tests 仍期望 prompt/confirm import。14.3 必须更新这些测试为 custom modal 操作，同时保留 success、invalid 和 lossy import 的行为断言。[Source: `apps/web/src/components/app-shell/AppShell.test.tsx:217-305`]
- 14.1/14.2 tests 已覆盖 mobile empty import button currently does not call prompt、mobile valid storage inline preview、invalid storage import entry 和 no storage writes。14.3 要把 no-op click 改成 modal 打开，并扩展为实际 import/storage tests。[Source: `apps/web/src/components/app-shell/AppShell.test.tsx:632-662`; `apps/web/src/components/app-shell/AppShell.test.tsx:1610-1668`]

### File Structure Guidance

- Likely UPDATE files:
  - `apps/web/src/components/app-shell/AppShell.tsx`
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/components/app-shell/app-shell-helpers.ts` only if import helper extraction needs shared formatting/status helpers
  - `apps/web/src/i18n/index.ts`
  - `apps/web/src/styles.css`
  - `apps/web/e2e/workbench-smoke.spec.ts` if browser smoke is extended for mobile import
- Likely NEW files:
  - `apps/web/src/components/scene-string-import-modal/SceneStringImportModal.tsx` is not preferred because repo files use kebab-case; prefer `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx`.
  - `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.test.tsx` if the modal gets meaningful standalone state; otherwise keep tests in `AppShell.test.tsx`.
- Do not modify `packages/scene-core` for this story unless an implementation blocker proves decode/lossy/recovery APIs cannot express the required behavior. No schema, codec, catalog, footprint, stacking or dimension contract change is expected.

### Technical Constraints

- Use existing repo stack: React 19.2.6, Vite 8.0.13, TypeScript 6.0.3, Vitest 4.1.6, Playwright 1.60.0. Do not add external modal, focus-trap, state, form or validation libraries.
- Keep `SceneDocument v1`, PSE1/PSE2 codec semantics, `decodeSceneDocumentStringWithLossyRecovery()`, `applyRecoveredSceneDocument()`, `buildImageExportSummary()`, footprint/stacking/dimension derived rules and localStorage adapter semantics unchanged.
- Mobile import is the only allowed replacement flow in read-only mobile mode. Do not enable place/delete/rotate/dye/skill/layer note/level mutation, undo/redo, JSON import/export, share links, cloud sync or accounts.
- Do not save import textarea draft, lossy confirmation state, `ImageExportSummary`, footprint/stacking relation, catalog snapshot, or UI preference as part of this story.
- If storage write succeeds but `buildImageExportSummary()` fails on the imported scene, treat that as an invalid preview preparation error and surface a readable error. Do not silently show default scene as success.

### Testing Requirements

- Component tests should spy on `window.prompt` and `window.confirm` and assert neither is called by mobile import or desktop import after migration.
- Tests must check exact storage boundaries:
  - invalid import: no saved/autosave/UI preference writes
  - cancel/close: no saved/autosave/UI preference writes
  - lossy cancel: no saved/autosave/UI preference writes
  - mobile success: autosave written, saved remains unchanged/null, UI preferences unchanged/null
  - desktop success: scene state replacement still works; autosave may be handled by existing desktop autosave effect, not by modal-specific saved slot writes
- Tests should verify modal stays open for invalid input and closes on success/cancel/close.
- Tests should verify mobile success renders current shared inline preview content: heading/scene name, Pokemon image label, canvas dimensions, overall materials, layer graphics/materials, and no dialog/backdrop.
- Existing desktop download preview tests in `ExportPreview.test.tsx` should keep passing unchanged.

### Git Intelligence

- Recent relevant commits are `f2734ed docs: approve mobile preview BMAD plan` and `39f8be6 feat: add layered image export`. Keep this story scoped to `apps/web` UI/storage/tests and do not reopen archived Epic 1-13 or `scene-core` data work.
- Story 14.2 full regression surfaced a stale AssetPicker count expectation due to unrelated catalog size drift. Avoid hard-coding catalog totals in any new tests.

### Definition Of Done

- Mobile “导入字符串” opens a custom modal from empty, invalid and preview-ready states.
- Import string flow no longer uses `window.prompt` or `window.confirm`; desktop import either uses the same modal or no longer exposes a separate prompt-based import path.
- Invalid import and failed recovery remain in modal, show actionable errors, keep scene/storage unchanged.
- Lossy import shows dropped material details and requires explicit second confirmation before importing compatible content.
- Mobile import success writes only autosave slot, clears modal state, and immediately shows shared inline export preview content.
- Cancel and close are side-effect-free.
- Desktop edit/autosave/download-preview/export/import behavior stays covered and does not regress.

## Project Structure Notes

- Active repo structure is monorepo: `apps/web` owns browser React UI, localStorage and image/download rendering; `packages/scene-core` owns DOM-free schema, recovery, codec, selectors and export summary.
- This story is web UI/storage orchestration. Shared domain behavior should stay in `packages/scene-core`; browser modal and storage effects should stay in `apps/web`.
- `project-context.md` was not present in this checkout, so no persistent project-context file was loaded.
- No latest external web research was needed because this story does not add or upgrade libraries; repo-pinned versions and local APIs are the source of truth.

## References

- `_bmad-output/planning-artifacts/epics.md:23-80`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:157-220`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:222-235`
- `_bmad-output/planning-artifacts/prd.md:505-514`
- `_bmad-output/planning-artifacts/prd.md:561-587`
- `_bmad-output/planning-artifacts/architecture.md:482-490`
- `_bmad-output/planning-artifacts/architecture.md:709-724`
- `_bmad-output/planning-artifacts/architecture.md:1094-1107`
- `_bmad-output/planning-artifacts/ux-design-specification.md:95-101`
- `_bmad-output/planning-artifacts/ux-design-specification.md:728-770`
- `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md`
- `_bmad-output/implementation-artifacts/14-2-export-preview-shared-content-and-mobile-inline-rendering.md`
- `apps/web/src/components/app-shell/AppShell.tsx:155-161`
- `apps/web/src/components/app-shell/AppShell.tsx:1052-1131`
- `apps/web/src/components/app-shell/AppShell.tsx:1155`
- `apps/web/src/components/app-shell/AppShell.tsx:1631-1636`
- `apps/web/src/components/app-shell/mobile-preview-state.ts:12-67`
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx:30-45`
- `apps/web/src/components/export-preview/ExportPreview.tsx:41-167`
- `apps/web/src/components/export-preview/ExportPreview.tsx:171-190`
- `apps/web/src/io/scene-storage.ts:29-38`
- `apps/web/src/io/scene-storage.ts:96-116`
- `apps/web/src/components/app-shell/app-shell-helpers.ts:16-52`
- `packages/scene-core/src/io/scene-string-codec.ts:38-64`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-31T18:54:31+0800: Loaded repo-local `bmad-dev-story` workflow, resolved customization, confirmed no `project-context.md`, and marked 14.3 `in-progress` in sprint status.
- 2026-05-31T18:58:00+0800: Added failing AppShell coverage for desktop/mobile custom import modal, no import prompt/confirm, mobile autosave, invalid/lossy/cancel/close storage boundaries; initial focused AppShell run failed on old prompt/no-op import path as expected.
- 2026-05-31T19:01:58+0800: Implemented `SceneStringImportModal`, migrated AppShell import submit handling, wired mobile import to autosave slot, and updated i18n/styles.
- 2026-05-31T19:03:43+0800: Validation passed: AppShell focused suite 65/65, ExportPreview focused suite 14/14, web typecheck, and full `pnpm run build`.
- 2026-05-31T19:17:45+0800: Addressed code review findings: clearing stale lossy/error state on textarea edits, added lossy-edit/storage-failure/Escape/focus containment component coverage, added Playwright mobile import success smoke, and reran focused validation.

### Completion Notes List

- Story context created from Epic 14 planning, PRD, Architecture, UX, approved sprint change proposal, completed Story 14.1/14.2 implementation notes, current mobile preview state/code, current shared ExportPreviewContent, scene storage adapter and existing AppShell import tests.
- Added reusable custom React import modal with textarea, close/cancel/confirm controls, Escape close, focus containment, inline invalid/recovery errors, and lossy dropped-material confirmation using `formatDroppedTileInstance()`.
- Replaced AppShell scene-string import prompt/confirm path with modal submit handling while leaving export-string prompt behavior unchanged.
- Wired mobile import to decode/recovery, preview-summary validation, single autosave-slot write, modal reset, and immediate shared inline `ExportPreviewContent` rendering.
- Expanded focused AppShell coverage for desktop import migration and mobile empty/valid/invalid/lossy/cancel/close storage boundaries; existing ExportPreview focused coverage still passes.

### File List

- `_bmad-output/implementation-artifacts/14-3-custom-scene-string-import-modal-and-mobile-storage.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

### Change Log

- 2026-05-31: Implemented custom scene-string import modal, desktop import modal migration, mobile autosave import flow, i18n/styles, and focused tests for Story 14.3.
- 2026-05-31: Code review requested follow-up for stale lossy confirmation state and missing import-specific browser/storage edge coverage.
- 2026-05-31: Fixed review findings for stale lossy confirmation state and added import-specific component/browser coverage.

## Senior Developer Review (AI)

Review date: 2026-05-31
Reviewer: bmad-code-review agent
Decision: Changes requested; not approved.

### Findings

- [ ] [Review][Patch][High] Editing the textarea after a lossy warning keeps the old lossy-confirmed state. `SceneStringImportModal` derives `showLossyConfirmation` from `droppedTileDetails.length`, submits with `handleSubmit(showLossyConfirmation)`, but the textarea `onChange` only clears empty/storage errors and leaves `droppedTileDetails` intact. A user can paste a lossy string, reach the warning, edit the textarea to a different lossy payload, and submit with `allowLossy=true` without seeing dropped details for the new payload. This violates AC4's lossy two-step confirmation and can import dropped-content changes under stale confirmation. Evidence: `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx:132`, `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx:145`, `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx:167`.
- [ ] [Review][Patch][Medium] Import-specific edge coverage is incomplete for the behavior this story owns. Component tests cover valid/invalid/lossy/cancel/close, but they do not cover lossy-warning-then-edit, mobile storage write failure, Escape close, or focus containment; the focused Playwright command currently exercises mobile mode and invalid stored state only, not a real mobile import success/autosave/inline-preview transition. This leaves AC4, AC5, AC6, and the modal a11y requirement without direct regression proof. Evidence: `apps/web/src/components/app-shell/AppShell.test.tsx:726`, `apps/web/src/components/app-shell/AppShell.test.tsx:770`, `apps/web/e2e/workbench-smoke.spec.ts:738`, `apps/web/e2e/workbench-smoke.spec.ts:750`.

### Validation Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (65 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` (14 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: `pnpm run build`
- PASS: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|import" --project=chromium` (2 tests; does not cover successful mobile import)

## Review Follow-ups

- [x] Clear invalid/lossy confirmation state when textarea content changes, and add a focused regression that proves a changed lossy payload must re-enter the first-confirmation state with current dropped details.
- [x] Add import-specific coverage for mobile autosave storage failure, Escape close/focus containment, and a Playwright mobile happy-path smoke that pastes a valid scene string, writes only autosave, and reaches shared inline preview.

### Follow-up Validation

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (68 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` (14 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: `pnpm run build`
- PASS: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|import" --project=chromium` (3 tests)

## Senior Developer Review Follow-up (AI)

Review date: 2026-05-31
Reviewer: bmad-code-review agent
Decision: Approved.

### Findings

- None. Clean review; prior High/Medium follow-up items are resolved.

### Verification Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (68 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|import" --project=chromium` (3 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` (14 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: `pnpm run build`
