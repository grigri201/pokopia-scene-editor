# Story 14.4: Mobile preview/import 回归测试与浏览器验证

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want mobile preview/import flow 有 focused tests 和 smoke 验证,
so that 后续不会把 mobile 重新变成旧只读工作台或打破导入落盘。

## Acceptance Criteria

1. `AppShell` / component tests 覆盖 mobile empty、valid storage、invalid storage、import success、invalid import、lossy import、cancel 和 close，并明确记录哪些断言来自既有 14.1-14.3 覆盖、哪些是本 story 新增或加固。
2. Tests 明确断言 mobile import 和 desktop import 不调用 `window.prompt` 或 `window.confirm`；不要把 reset/delete/replacement confirmation 或 export-string prompt 误判为本 AC 的失败。
3. Tests 明确断言 mobile inline preview 和 desktop modal preview 使用同一 scene summary 内容，至少覆盖 scene name、Pokemon、canvas dimensions、overall materials、per-layer graphics、per-layer materials、layer notes、footer，并保留 safe text 断言。
4. Playwright 390x844 browser verification 覆盖 no-storage import path、stored-scene preview path、invalid stored/import path、无编辑控件、无 dialog/backdrop 漂移和无布局重叠。
5. Existing desktop edit/autosave/download-preview/import/export tests 继续通过；不得为 mobile 回归弱化 desktop modal、autosave、download 或 scene string coverage。
6. 验证命令至少包含 web focused tests、web typecheck、web build 和 Playwright mobile smoke；最终在 story 的 Dev Agent Record 记录命令、结果、任何跳过项和 release readiness 判断。

## Tasks / Subtasks

- [x] Audit 当前 Epic 14 测试覆盖并建立覆盖矩阵（AC: 1, 2, 3, 5）
  - [x] 先阅读 `AppShell.test.tsx`、`ExportPreview.test.tsx` 和 `workbench-smoke.spec.ts` 中已有 14.1-14.3 覆盖，确认 empty、valid storage、invalid storage、import success、invalid import、lossy import、cancel、close、storage write failure、Escape/focus containment、desktop-to-mobile draft 和 keyboard no-op 是否已有强断言。
  - [x] 不要重复添加同义测试。如果某个 AC 已由现有断言完整覆盖，在本 story Completion Notes 中记录覆盖位置；只补缺口、弱断言或容易回退的 browser-level gaps。
  - [x] 保留 14.2 review 学到的规则：Playwright mobile `preview-ready` 断言必须面向共享 `ExportPreviewContent` 当前 surface，不要恢复已经废弃的 14.1 临时 summary aria labels。
  - [x] 保留 14.3 review 学到的规则：lossy warning 后修改 textarea 必须清空旧 lossy confirmation，并重新要求二次确认。

- [x] 加固 component regression tests（AC: 1, 2, 3, 5）
  - [x] `apps/web/src/components/app-shell/AppShell.test.tsx` 应覆盖或确认已覆盖：mobile empty 打开 custom modal 且不写 storage；valid storage 直接进入 shared inline preview 且不 autosave；invalid storage 显示错误和 import entry 且不展示默认 scene 成功；valid import 写 autosave slot 并展示 inline preview；invalid import 留在 modal 且不改 scene/storage；lossy import 先展示 dropped details、二次确认后才写 autosave；cancel/close/Escape 不改 scene/storage/UI preferences。
  - [x] 对 import flow 使用局部 `window.prompt` / `window.confirm` spy，断言 mobile import 和 desktop import 不调用系统 prompt/confirm。允许 export string 继续使用 prompt，也允许 reset/delete/replacement 继续使用 confirm。
  - [x] 如果 desktop import 已迁移到同一 modal，保留 desktop 成功/invalid/lossy 语义：成功替换当前编辑 scene、清理 recovery errors、展示 scene-string toast，并不破坏 autosave/download preview/export。
  - [x] `apps/web/src/components/export-preview/ExportPreview.test.tsx` 应继续证明 `ExportPreview` desktop wrapper 有 dialog/backdrop/`aria-modal`/focus/download controls，而 `ExportPreviewContent` inline 没有 dialog/backdrop/`aria-modal`/download controls。
  - [x] 用同一 fixture 或同一 `ImageExportSummary` 关键内容断言 desktop modal 和 mobile inline preview 的 scene-derived content 不漂移：heading、Pokemon image label、canvas dimensions、overall materials、per-layer graphics/materials、layer notes、footer、安全文本。

- [x] 加固 Playwright 390x844 browser verification（AC: 4）
  - [x] 在 `apps/web/e2e/workbench-smoke.spec.ts` 中覆盖 no-storage 进入 Mobile Preview Mode：只显示“导入字符串”入口，不显示 Scene Canvas、Asset Picker、Building Level Panel、Selection Inspector、重置、下载预览、导出字符串或 desktop workbench。
  - [x] 覆盖 mobile import happy path：390x844 下粘贴有效 scene string，modal 关闭，autosave slot 写入，saved slot 和 UI preferences 不写，页面进入 shared inline preview，并且没有 browser `dialog` 事件。
  - [x] 覆盖 stored-scene preview path：预置有效 autosave 或 saved scene，刷新/首次进入 mobile 后直接显示 shared inline preview，不打开 desktop 下载 preview modal，不出现 backdrop，不触发 autosave 写回。
  - [x] 覆盖 invalid stored scene 和 invalid import：invalid stored scene 保留原 payload、不显示默认 scene 成功；invalid import 留在 modal、不写 storage、不触发 browser prompt/confirm。
  - [x] 覆盖 layout readiness：390x844 下无横向 overflow，mobile preview/import modal/inline preview 的关键 controls 不互相遮挡；至少保留 `document.documentElement.scrollWidth <= window.innerWidth`，必要时增加针对 import button、modal actions、export content 的 bounding-box 检查。

- [x] Release readiness verification（AC: 5, 6）
  - [x] 运行 focused component tests：
    - `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`
    - `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom`
  - [x] 运行 web typecheck：`pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] 运行 web build：`pnpm --filter @pokopia-scene-editor/web build`
  - [x] 运行 focused mobile smoke：`pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|import|keeps default 17x17|keeps legacy 7x7" --project=chromium`
  - [x] 如 focused smoke 或 build 更改了 shared assets/dist 相关状态，隔离重跑失败命令，避免把并发 build/webServer asset verification transient 当成产品失败。
  - [x] 如时间允许且 focused gate 全绿，运行 `pnpm run release:verify` 作为最终 release readiness；若未运行，必须在 Dev Agent Record 写明原因和剩余风险。
  - [x] 不执行 deploy、push 或发布动作，除非用户另行明确要求。

## Dev Notes

### Epic Context

- Epic 14 的目标是把 mobile 从缩窄只读工作台改为导入驱动的布景说明预览 surface。Mobile 读取本地 scene storage；有有效记录时以内联方式展示与 desktop 下载预览相同内容；无记录时提供“导入字符串”；导入使用 custom modal；成功后写入现有 scene storage；mobile 仍不提供编辑能力。[Source: `_bmad-output/planning-artifacts/epics.md:23-80`]
- Story 14.4 是 Epic 14 的收口 story，范围是回归测试、browser verification 和 release readiness。不要重新实现 mobile preview、ExportPreview content split 或 import modal 这三块功能，除非测试发现 14.1-14.3 的实际回归需要窄修。[Source: `_bmad-output/planning-artifacts/epics.md:69-80`]
- Approved sprint change proposal 建议按 “mobile contract -> shared preview/import primitives -> tests/release gate” 顺序执行；14.4 正是最后的 tests/release gate 阶段。[Source: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:112-124`]

### Product / UX Requirements

- PRD FR109-FR116 是本 story 的验收边界：`<768px` 进入 Mobile Preview Mode；startup 读取最新有效 `SceneDocument`；无记录或 invalid storage 显示导入入口；导入 custom modal 不使用 `window.prompt`/`window.confirm`；导入复用短字符串 decode/lossy recovery；成功写现有 scene storage；mobile inline preview 与 desktop 下载预览共享同一 scene-derived 内容；mobile 不提供编辑能力。[Source: `_bmad-output/planning-artifacts/prd.md:505-514`]
- PRD NFR53-NFR57 要求：mobile import 成功只能写现有 scene storage，不写 UI preferences 或 derived state；mobile inline preview 与 desktop preview 共用同一内容路径；invalid/lossy/cancel/close 状态有明确反馈；modal 可访问；390x844 smoke 覆盖 no-storage、stored-scene、invalid import、无编辑控件和无重叠。[Source: `_bmad-output/planning-artifacts/prd.md:561-587`]
- UX 规格要求 390x844 是必测目标，并明确 mobile 只承担读取本地保存布景并 inline 展示、或通过自定义导入 modal 粘贴字符串这两个任务。禁止保留可触发的隐藏编辑路径。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md:728-770`]
- UX Testing Strategy 已列出 mobile preview/import 必测项：无 storage、valid storage、custom modal、no prompt/confirm、invalid import、lossy import、cancel/close、success autosave、快捷键不触发编辑、invalid recovery 不自动修复写回、desktop-to-mobile-to-desktop 不丢草稿。[Source: `_bmad-output/planning-artifacts/ux-design-specification.md:752-770`]

### Architecture Guardrails

- `interactionMode = "edit" | "readOnly"` 仍是权限边界。`<768px` 进入 `readOnly`，但 visible surface 是 Mobile Preview Mode，不是完整只读工作台。普通 edit command、canvas pointer mutation 和应用级 edit keyboard 必须 no-op；mobile import 是唯一允许的 replacement flow。[Source: `_bmad-output/planning-artifacts/architecture.md:482-490`]
- Mobile startup/import data flow 必须保持：`readLatestSceneDocumentFromStorage -> buildImageExportSummary -> inline export preview content -> no autosave side effect`；mobile import 是 `custom modal -> decodeSceneDocumentStringWithLossyRecovery -> applyRecoveredSceneDocument -> write autosave -> buildImageExportSummary -> inline preview`；不写 UI preferences，不保存 derived state。[Source: `_bmad-output/planning-artifacts/architecture.md:1094-1107`]
- Safe text remains mandatory. scene name、asset/layer names、layer notes、skill notes、recovery errors 和 dropped material details 只能作为文本渲染，不得使用 `dangerouslySetInnerHTML` 或 HTML parser。[Source: `_bmad-output/planning-artifacts/architecture.md:709-724`]
- Production release target 是 Cloudflare Pages static web assets；本 story 只验证 web/browser release readiness，不恢复 Worker/MCP 为默认发布路径。[Source: `_bmad-output/planning-artifacts/architecture.md:494-498`]

### Previous Story Intelligence

- Story 14.1 已完成 Mobile Preview state contract 和 render branch：mobile 不再渲染 desktop workbench/canvas；`empty`、`preview-ready`、`invalid` 是显式状态；valid storage 可构建 `ImageExportSummary`；invalid storage 不展示默认 scene 成功；desktop-to-mobile current draft regression 已修复。[Source: `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md:173-180`; `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md:207-241`]
- Story 14.2 已抽出 `ExportPreviewContent` 并让 mobile `preview-ready` 使用 shared content。14.2 review 曾发现 Playwright 仍断言废弃临时 labels；14.4 的 browser verification 必须继续断言当前 shared export preview surface。[Source: `_bmad-output/implementation-artifacts/14-2-export-preview-shared-content-and-mobile-inline-rendering.md:188-189`; `_bmad-output/implementation-artifacts/14-2-export-preview-shared-content-and-mobile-inline-rendering.md:219-247`]
- Story 14.3 已新增 `SceneStringImportModal`、迁移 desktop import prompt/confirm 分支、接入 mobile autosave import，并补了 stale lossy confirmation、storage failure、Escape/focus containment 和 mobile import happy-path smoke 的 follow-up 覆盖。14.4 不要重做这些实现，应通过 coverage audit 和 final smoke 确认它们不会回退。[Source: `_bmad-output/implementation-artifacts/14-3-custom-scene-string-import-modal-and-mobile-storage.md:204-210`; `_bmad-output/implementation-artifacts/14-3-custom-scene-string-import-modal-and-mobile-storage.md:249-276`]
- Story 14.2 full regression 曾因 catalog size drift 暴露 stale AssetPicker count expectation。14.4 新增测试不要硬编码素材总数或分页总页数；应从 `assetCatalog` / `assetPageSize` 等源数据派生或选择稳定 fixture。[Source: `_bmad-output/implementation-artifacts/14-3-custom-scene-string-import-modal-and-mobile-storage.md:143-144`]

### Current Code State

- `MobilePreviewMode` 当前在 `preview-ready` 时直接渲染 `ExportPreviewContent`，并在所有 mobile states 保留“导入字符串”按钮。[Source: `apps/web/src/components/app-shell/mobile-preview-mode.tsx:30-45`]
- `ExportPreview` 仍是 desktop modal wrapper，保留 backdrop、`role="dialog"`、`aria-modal`、focus restore/trap、Escape close 和 download controls；`ExportPreviewContent` 是共享 scene-derived content。[Source: `apps/web/src/components/export-preview/ExportPreview.tsx:41-130`; `apps/web/src/components/export-preview/ExportPreview.tsx:171-190`]
- `SceneStringImportModal` 是自定义 dialog，包含 textarea、错误、lossy warning、Escape close 和 focus containment；textarea change 会清除 errors、dropped details 和 storage error。[Source: `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx:22-48`; `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx:132-230`]
- AppShell mobile import submit 在 read-only 模式下先验证 `buildImageExportSummary()`，再用 `writeSceneDocumentToStorage(storage, scene, "autosave")` 写 autosave slot；storage unavailable/failure 时返回 modal error，不报告成功。[Source: `apps/web/src/components/app-shell/AppShell.tsx:1128-1182`; `apps/web/src/io/scene-storage.ts:29-38`]
- `readLatestSceneDocumentFromStorage()` 优先读取 autosave，invalid autosave 会直接报告，不静默 fallback 到 saved；valid saved/autosave 同时存在时按 `metadata.updatedAt` 选择最新。[Source: `apps/web/src/io/scene-storage.ts:96-116`]
- Current component tests 已覆盖多个 14.4 目标：mobile empty/no desktop/no storage writes/no prompt-confirm、mobile import success autosave、invalid import、lossy import/cancel、lossy textarea edit、storage failure、Escape/focus containment、cancel/close、desktop-to-mobile draft、valid storage shared inline preview、invalid storage no default success。[Source: `apps/web/src/components/app-shell/AppShell.test.tsx:635-929`; `apps/web/src/components/app-shell/AppShell.test.tsx:1664-1920`]
- Current export preview tests 已覆盖 desktop modal content 和 inline content 无 dialog/backdrop/download controls，并包含 safe text、layer notes、overall/per-layer materials 和 layer graphics assertions。[Source: `apps/web/src/components/export-preview/ExportPreview.test.tsx:23-186`]
- Current Playwright smoke 已有 390x844 Mobile Preview Mode、mobile import happy path、invalid stored scene 和 responsive helper 的 no-overflow/no desktop control assertions；14.4 应 audit 是否还缺 stored-scene direct preview、invalid import browser path 或 stronger layout assertions。[Source: `apps/web/e2e/workbench-smoke.spec.ts:710-825`; `apps/web/e2e/workbench-smoke.spec.ts:955-982`]

### File Structure Guidance

- Likely UPDATE files:
  - `apps/web/src/components/app-shell/AppShell.test.tsx`
  - `apps/web/src/components/export-preview/ExportPreview.test.tsx`
  - `apps/web/e2e/workbench-smoke.spec.ts`
  - `_bmad-output/implementation-artifacts/14-4-mobile-preview-import-regression-tests-and-browser-verification.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Avoid business-code updates. If tests reveal a real regression in `AppShell.tsx`, `mobile-preview-mode.tsx`, `ExportPreview.tsx`, `scene-string-import-modal.tsx`, styles, i18n or storage handling, keep the fix narrow and explain why it is required for release readiness. If the failure implies new product behavior beyond Epic 14, stop and create a follow-up instead of expanding 14.4.
- Do not modify `packages/scene-core` unless a release-blocking bug proves shared decode/recovery/export summary APIs are wrong. No schema, codec, catalog, footprint, stacking, dimension or storage contract change is expected.

### Technical Constraints

- Use existing repo stack: React 19.2.6, Vite 8.0.13, TypeScript 6.0.3, Vitest 4.1.6, Playwright 1.60.0. Do not add external modal, focus-trap, state, form, assertion or browser-testing libraries.
- Keep `SceneDocument v1`, PSE1/PSE2 codec semantics, `decodeSceneDocumentStringWithLossyRecovery()`, `applyRecoveredSceneDocument()`, `buildImageExportSummary()`, footprint/stacking/dimension derived rules and localStorage adapter semantics unchanged.
- Prompt/confirm rule is specific to import flow. Export string may still use `window.prompt()` for copy display, and destructive desktop actions may still use `window.confirm()` where already required.
- Browser verification must use the actual Playwright webServer/Vite URL from the test runner. If running a manual dev server for debugging, read the printed URL because the requested port can fall back.
- No deploy, push or production publish is part of this story.

### Definition Of Done

- Coverage matrix confirms mobile preview/import ACs are covered by focused component tests and Playwright smoke, with no duplicate low-value tests.
- Mobile no-storage, valid storage, invalid storage, valid import, invalid import, lossy import, cancel, close, storage failure and keyboard no-op regressions are covered or explicitly mapped to existing tests.
- Import no longer has any system prompt/confirm path in mobile or desktop import tests, while unrelated export/reset/delete/replacement prompt/confirm behavior is not broken.
- Mobile inline preview and desktop modal preview content parity is protected by shared content tests and at least one AppShell/mobile assertion using the shared export preview surface.
- Playwright 390x844 validates no desktop edit controls, no layout overflow, no dialog/backdrop drift, successful import autosave, direct stored-scene preview, and invalid state behavior.
- Web focused tests, web typecheck, web build and focused mobile smoke pass. Any skipped full `release:verify` is documented with rationale and residual risk.

## Project Structure Notes

- Active repo structure is monorepo: `apps/web` owns browser React UI, localStorage, image/download rendering and browser tests; `packages/scene-core` owns DOM-free schema, recovery, codec, selectors and export summary; root scripts orchestrate workspace commands.
- This story is test/browser/release-readiness work. Keep shared business rules in `packages/scene-core`; keep browser regression coverage in `apps/web/src/components/**.test.tsx` and `apps/web/e2e/workbench-smoke.spec.ts`.
- `project-context.md` was not present in this checkout, so no persistent project-context file was loaded.
- No latest external web research was needed because this story does not add or upgrade libraries; repo-pinned versions and local APIs are the source of truth.

## References

- `_bmad-output/planning-artifacts/epics.md:23-80`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:112-124`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md:157-235`
- `_bmad-output/planning-artifacts/prd.md:505-514`
- `_bmad-output/planning-artifacts/prd.md:561-587`
- `_bmad-output/planning-artifacts/architecture.md:482-490`
- `_bmad-output/planning-artifacts/architecture.md:709-724`
- `_bmad-output/planning-artifacts/architecture.md:1094-1107`
- `_bmad-output/planning-artifacts/ux-design-specification.md:728-770`
- `_bmad-output/implementation-artifacts/14-1-mobile-preview-mode-planning-and-state-contract.md`
- `_bmad-output/implementation-artifacts/14-2-export-preview-shared-content-and-mobile-inline-rendering.md`
- `_bmad-output/implementation-artifacts/14-3-custom-scene-string-import-modal-and-mobile-storage.md`
- `apps/web/src/components/app-shell/AppShell.test.tsx:635-929`
- `apps/web/src/components/app-shell/AppShell.test.tsx:1664-1920`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx:23-186`
- `apps/web/e2e/workbench-smoke.spec.ts:710-825`
- `apps/web/e2e/workbench-smoke.spec.ts:955-982`
- `apps/web/src/components/app-shell/mobile-preview-mode.tsx:30-45`
- `apps/web/src/components/export-preview/ExportPreview.tsx:41-130`
- `apps/web/src/components/scene-string-import-modal/scene-string-import-modal.tsx:22-230`
- `apps/web/src/io/scene-storage.ts:29-38`
- `apps/web/src/io/scene-storage.ts:96-116`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-31T19:28:54+0800：解析 repo-local `bmad-dev-story` workflow，确认 `project-context.md` 不存在，读取目标 story 与 sprint tracker，并将 tracker 中 14-4 从 `ready-for-dev` 标为 `in-progress`。
- 覆盖审计：`AppShell.test.tsx` 已覆盖 mobile empty/no desktop/no storage writes/no prompt-confirm、mobile import success autosave、invalid import、lossy import/cancel、stale lossy textarea reset、storage write failure、Escape/focus containment、cancel/close、desktop-to-mobile draft、keyboard no-op、valid storage shared inline preview、invalid storage no default success。
- 覆盖审计：`ExportPreview.test.tsx` 已覆盖 desktop modal wrapper、inline `ExportPreviewContent` wrapper 边界、safe text、overall/per-layer materials、per-layer graphics、layer notes、footer；本 story 新增同一 `ImageExportSummary` 的 desktop/inline parity snapshot。
- 覆盖审计：`workbench-smoke.spec.ts` 已覆盖 390x844 Mobile Preview Mode、mobile import happy path、invalid stored scene 和 responsive no-overflow helper；本 story 新增强化 no-storage desktop-control absence、stored-scene direct preview、invalid import browser path、no dialog/backdrop drift 和关键控件无遮挡检查。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom`：通过，1 file / 15 tests。
- `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom`：通过，1 file / 68 tests。
- `pnpm --filter @pokopia-scene-editor/web typecheck`：通过。
- `pnpm --filter @pokopia-scene-editor/web build`：通过，Vite build 完成，runtime asset verification passed（1474 references checked）。
- `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|import|keeps default 17x17|keeps legacy 7x7" --project=chromium`：通过，6 tests。Playwright webServer 输出了 npm unknown env config 与 `NO_COLOR`/`FORCE_COLOR` warning，未影响结果。
- `pnpm run release:verify`：通过。覆盖 Xzonn stale check、root typecheck、scene-core tests（16 files / 153 tests）、web tests（18 files / 245 tests）、scene-string-codec focused test（15 tests）、build、scene-core file-install smoke、asset reference verification、Chromium smoke（19 tests）。同样存在非阻塞 npm env config 与 `NO_COLOR`/`FORCE_COLOR` warning。
- 2026-05-31T19:34:10+0800：所有任务/subtasks 已完成，story status 和 sprint tracker 14-4 均更新为 `review`。

### Completion Notes List

- 已完成 14.1-14.3 覆盖审计，没有重复添加已充分覆盖的 AppShell component cases；AppShell 现有覆盖继续作为 mobile empty、valid/invalid storage、import success/invalid/lossy、cancel/close、storage failure、Escape/focus、draft resize 和 keyboard no-op 的主证据。
- 新增 `ExportPreview` shared content parity test，使用同一 `ImageExportSummary` 比较 desktop modal 与 inline content 的 scene name、Pokemon image label、canvas dimensions、overall materials、per-layer graphics/materials、layer notes、footer，并保留 unsafe text 不注入 DOM 的断言。
- 加固 Playwright 390x844 browser verification：no-storage path 明确无 desktop edit controls；mobile import success 断言 autosave-only、无 browser dialog、无下载 preview/backdrop；stored-scene path 断言直达 inline preview 且不重写 autosave；invalid stored/import path 断言原 payload 保留、modal 不关闭、不触发 prompt/confirm；关键控件增加无遮挡和无横向 overflow 检查。
- Release readiness：focused tests/typecheck/build/mobile smoke 与完整 `pnpm run release:verify` 全部通过；无跳过项；未执行 deploy、push 或发布动作。

### File List

- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`
- `_bmad-output/implementation-artifacts/14-4-mobile-preview-import-regression-tests-and-browser-verification.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

### Change Log

- 2026-05-31：完成 Story 14.4 测试覆盖审计、component/browser regression 补强和 release readiness verification，story 状态更新为 `review`。

## Senior Developer Review (AI)

Review date: 2026-05-31
Reviewer: GPT-5 Codex
Decision: Approved.

### Findings

- None. Clean review: Story 14.4 is limited to test/browser/release-readiness files, and I did not find unnecessary business-code changes in the story file list.
- None. The AC coverage matrix is backed by focused component tests, shared `ExportPreviewContent` parity coverage, and 390x844 Playwright smoke coverage for no-storage, stored-scene, invalid stored/import, and successful import autosave/inline preview paths.

### Verification Performed

- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/app-shell/AppShell.test.tsx --environment jsdom` (68 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web exec vitest run src/components/export-preview/ExportPreview.test.tsx --environment jsdom` (15 tests)
- PASS: `pnpm --filter @pokopia-scene-editor/web typecheck`
- PASS: `pnpm --filter @pokopia-scene-editor/web build`
- PASS: `pnpm --filter @pokopia-scene-editor/web exec playwright test e2e/workbench-smoke.spec.ts -g "Mobile Preview Mode|import|keeps default 17x17|keeps legacy 7x7" --project=chromium` (6 tests; non-blocking npm env / NO_COLOR warnings only)
