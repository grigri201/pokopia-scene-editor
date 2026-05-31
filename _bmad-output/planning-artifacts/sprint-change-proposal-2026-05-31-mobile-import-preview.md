# Sprint Change Proposal - 2026-05-31 Mobile 导入与下载预览模式重写

**项目:** pokopia-scene-editor
**日期:** 2026-05-31
**提出人:** Grigri
**模式:** Batch
**状态:** Approved - routed for Epic 14 planning and implementation

## 1. Issue Summary

触发变更：Grigri 要求完全重写 mobile 部分功能。新的 mobile 目标是：进入 mobile 后读取本地存储记录；有记录则直接显示保存的布景；无记录则显示“导入字符串”按钮；点击按钮打开自定义 modal 让用户粘贴字符串，modal 提供确认、取消和关闭；导入后 mobile 显示内容要和 desktop 中“下载预览”的内容完全一样，但不是弹出层。

问题类型：用户可见 mobile 产品目标重定义 + 既有 responsive/read-only contract 的 course correction。

现有状态与证据：

- 当前 active tracker 显示 Epic 1-13 均已完成并归档，当前没有 active implementation story；新 scope 应通过 BMAD planning flow 创建。
- 当前 PRD/UX/Architecture 把 `<768px` 定义为 Mobile View-only Mode，明确禁止导入覆盖、保存、自动保存和任何 scene mutation。
- 当前 AppShell 启动时已经会通过 `readLatestSceneDocumentFromStorage()` 读取 localStorage 中最新有效 `SceneDocument`；这部分可复用为 mobile 初始读取路径。
- 当前 `导入字符串` 只在非 mobile 时显示，并且使用 `window.prompt()` + `window.confirm()`。
- 当前 `ExportPreview` 已集中渲染下载预览内容，但它固定使用 backdrop + `role="dialog"` modal 形态。

本 proposal 已获批准，并用于同步 PRD、Architecture、UX、Epics 和 sprint-status。源码实现将通过后续 BMAD story 执行。

## 2. Impact Analysis

### Epic Impact

当前没有 active epic。建议新增 Epic 14：Mobile 导入与下载预览模式重写。

Epic 14 不应回滚 Epic 13，也不应把归档 story 重新打开。它是在已完成 Web/Core 边界之上新增一个用户可见 mobile surface。

### PRD Impact

需要新增 course correction 章节，明确 mobile 从“只读工作台检查器”调整为“导入驱动的移动端下载预览查看器”：

- Mobile 不再展示完整桌面工作台或只读工作台面板。
- Mobile 启动时读取本地 scene storage；有有效记录则展示与 desktop 下载预览相同的布景说明内容。
- 没有有效记录时展示“导入字符串”按钮。
- 用户显式导入字符串是 mobile 唯一允许的 scene replacement 行为；导入成功后写入现有 scene storage，使刷新/再次进入 mobile 可读取该记录。
- Mobile 仍不提供编辑、素材放置、建筑层修改、实例属性修改、层备注编辑、导出 JSON、分享、云同步或账号。
- `SceneDocument v1`、PSE string codec 和 export summary contract 不变。

### Architecture Impact

需要更新 mobile interaction boundary：

- 保留 `interactionMode = "edit" | "readOnly"` 对编辑命令的保护，但 mobile 新增一个独立 import command/flow，不应通过普通编辑 command 绕过 read-only guard。
- Mobile scene 初始化继续复用 `readLatestSceneDocumentFromStorage()`。
- Mobile import 成功后应使用现有 decode/recovery 逻辑和 scene storage adapter 写入 latest scene storage；不得写 UI preferences，不得保存 derived export summary。
- `ExportPreview` 应拆出可复用 presentation/content 层，支持 desktop modal 容器与 mobile inline 容器共享完全相同的预览内容。
- 自定义 import modal 应替代 system prompt/confirm。建议 desktop 和 mobile 共用同一 modal，以避免导入路径分叉。

### UX Impact

旧 mobile UX：

- 进入 `<768px` 后仍渲染工作台，只是禁用编辑。
- 导入字符串和下载预览入口在 mobile 上不显示。
- 下载预览始终是 desktop modal。

新 mobile UX：

- 进入 mobile 后优先显示保存布景的 inline 下载预览内容。
- 无保存布景时只显示清晰的空状态和“导入字符串”按钮。
- 导入 modal 是自定义 UI，包含粘贴 textarea、确认、取消和关闭；确认前后展示 decode/recovery 错误或 lossy recovery 警告。
- 导入成功后页面直接显示 inline 下载预览内容，不弹出下载预览 modal。
- Mobile inline 预览的实际内容、素材清单、逐层图形、层备注、安全文本、i18n 和 17x17/legacy 7x7 表达必须与 desktop 下载预览一致。

### Technical Impact

主要影响面：

- `apps/web/src/components/app-shell/AppShell.tsx`
- `apps/web/src/components/export-preview/ExportPreview.tsx`
- 新增或拆分 `apps/web/src/components/scene-string-import-modal/`
- 可能新增 `apps/web/src/components/mobile-scene-preview/`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/export-preview/ExportPreview.test.tsx`
- `apps/web/e2e/workbench-smoke.spec.ts`

不应修改：

- `SceneDocument v1` schema shape
- `packages/scene-core` footprint/stacking/dimension rules
- PSE1/PSE2 codec semantics，除非实现发现 mobile 导入需要新的 codec behavior；若需要，应另开 course correction
- Cloudflare Pages deploy boundary

## 3. Checklist Status

- [x] 1.1 Trigger story: 无 active story；用户直接触发 mobile 产品目标重写。
- [x] 1.2 Core problem: 现有 mobile 是只读工作台且禁止导入，无法满足“无本地记录时导入字符串，并以内联下载预览显示”的目标。
- [x] 1.3 Evidence: PRD/UX/Architecture 禁止 mobile 导入覆盖；AppShell 现有 import 使用 `window.prompt/window.confirm`；ExportPreview 固定 modal 容器。
- [x] 2.1 Current epic: 当前无 active epic/story。
- [x] 2.2 Epic-level change: 新增 Epic 14 覆盖 mobile import preview surface。
- [x] 2.3 Remaining epics: 当前无 remaining active epics。
- [x] 2.4 Obsolete/gap: 旧 Mobile View-only Mode 中“禁止导入覆盖”的规则需要被新 mobile import exception 覆盖。
- [x] 2.5 Priority: 应先实现 mobile surface contract，再做细节 polish，避免在旧只读工作台上叠加临时按钮。
- [x] 3.1 PRD conflicts: mobile 禁止导入、导入属于 Post-MVP、下载预览只作为 modal 的旧描述需要更新。
- [x] 3.2 Architecture conflicts: mobile read-only command guard 仍要保留，但 import flow 成为单独允许的 replacement path。
- [x] 3.3 UX conflicts: 旧 mobile read-only workbench 替换为 mobile inline download preview viewer。
- [x] 3.4 Other artifacts: tests、i18n、styles、possibly screenshots/e2e 需要更新。
- [x] 4.1 Direct adjustment: 可行，但涉及产品 contract 更新和多组件拆分，不能作为无规划 hotfix。
- [N/A] 4.2 Rollback: 不回滚既有 desktop preview 或 mobile read-only guard；改为新增 mobile import exception 和 inline surface。
- [x] 4.3 PRD/product review: 需要更新 mobile 产品目标，但不改变 Web/Core 总体边界。
- [x] 4.4 Recommended path: 新增 Epic 14 + 4 个 stories。
- [x] 5.1-5.5 Proposal components: 本文完成。
- [x] 6.3-6.5 Approval/handoff: Grigri 已回复 `A` 批准；本 proposal 路由为 Moderate scope，交给 Product Owner / Developer 通过 Epic 14 stories 执行。

## 4. Recommended Approach

推荐路径：新增 Epic 14，按“mobile contract -> shared preview/import primitives -> tests/release gate”的顺序实现。

不建议在旧 mobile read-only workbench 上只补一个按钮，因为用户目标是“mobile 部分完全重写”，且最终显示内容应等同 desktop 下载预览而不是工作台检查器。正确边界是：desktop 保持编辑工作台；mobile 变成本地记录/导入字符串驱动的 inline download-preview viewer。

Scope classification：Moderate。

理由：

- 影响用户可见 mobile 行为和规划文档，但不改变 core schema、catalog、codec contract 或部署架构。
- 技术上集中在 `apps/web`，需要组件拆分和测试更新。
- 需要谨慎处理 mobile import 这个 read-only exception，避免重新开放编辑路径或污染 autosave/UI preferences。

## 5. Detailed Change Proposals

### PRD Changes

新增 `Approved Course Correction - 2026-05-31 Mobile 导入与下载预览模式重写`：

OLD:

```md
Mobile View-only Mode 下必须屏蔽所有应用级键盘操作。
导入、JSON 文件导出/导入、分享链接、云同步、账号、公开方案库和在线发布仍为 Post-MVP 或 out of scope。
```

NEW:

```md
Mobile 目标调整为导入驱动的布景说明预览。<768px 下，系统优先读取本地 scene storage 的最新有效 SceneDocument；存在记录时直接展示与 desktop 下载预览相同的布景说明内容；不存在记录时显示“导入字符串”按钮。

Mobile 允许用户通过显式“导入字符串”操作替换当前本地布景记录。该操作必须使用自定义 modal 输入和确认，不使用系统 prompt/confirm；导入成功后写入现有 scene storage，以便刷新后继续显示该布景。

Mobile 仍不提供完整编辑体验，不允许素材放置、删除、旋转、染色、技能编辑、建筑层编辑、层备注编辑、撤销/重做、JSON 文件导入/导出、分享链接、云同步或账号。
```

### Architecture Changes

需要更新：

- Mobile read-only mode section：改为 mobile preview/import mode，明确 ordinary edit commands 仍被 `interactionMode` 阻断。
- Frontend component boundary：新增 mobile inline preview surface 和 reusable scene-string import modal。
- Data flow：新增 mobile import flow。

建议新增 data flow：

```text
Mobile startup
        -> readLatestSceneDocumentFromStorage
        -> valid scene: buildImageExportSummary
        -> inline ExportPreview content
        -> no autosave side effect

Mobile no stored scene
        -> show Import String button
        -> custom modal textarea
        -> decodeSceneDocumentStringWithLossyRecovery
        -> applyRecoveredSceneDocument with explicit import source
        -> write imported scene to scene storage
        -> buildImageExportSummary
        -> inline ExportPreview content
```

### UX Changes

OLD:

```md
<768px 进入 Mobile View-only Mode。Mobile 不是简化编辑器，而是只读检查器/预览器。允许查看场景、切换楼层、点选格子或实例查看属性...
禁止 ... 导入覆盖 ...
```

NEW:

```md
<768px 进入 Mobile Preview Mode。Mobile 不是编辑器，也不再展示完整只读工作台。它只承担两个任务：读取本地保存布景并以内联下载预览形式展示；无记录时允许通过自定义导入 modal 粘贴布景字符串。

Mobile inline preview 的内容必须与 desktop 下载预览一致，包括标题、Pokemon、canvas dimensions、整体素材清单、逐层图形、逐层素材清单、层备注、stacking/footprint 表达、安全文本和 i18n。区别仅在容器：desktop 使用 modal，mobile 使用页面内 inline surface。
```

### Component Changes

`ExportPreview` 建议拆分：

- `ExportPreviewContent`: 只渲染标题、整体素材、逐层内容、footer；不拥有 backdrop、dialog role、focus trap。
- `ExportPreviewDialog`: desktop modal wrapper，继续使用 backdrop、`role="dialog"`、Escape close、focus restore、下载按钮。
- `MobileScenePreview`: mobile inline wrapper，调用同一 `ExportPreviewContent`，不设置 `aria-modal`，不 trap focus，不遮挡页面。

`SceneStringImportModal` 建议新增：

- `textarea` 粘贴字符串。
- `确认`：decode + recover + optional lossy confirmation state。
- `取消`：关闭且不改变 scene/storage。
- `关闭`：等同取消。
- 错误区：显示 decode/recovery 错误，包含字段/原因/修复方向。
- lossy recovery 区：列出 dropped incompatible materials，要求二次确认。

### Storage Changes

读取：

- 继续用 `readLatestSceneDocumentFromStorage(storage)`，保持 saved/autosave 最新记录选择逻辑。

写入：

- mobile 导入成功后使用现有 storage adapter 写入 autosave slot，确保 refresh/mobile reopen 能读取。
- 不写 `pokopia.uiPreferences.v1`。
- 不保存 `ImageExportSummary`、footprint/stacking derived state 或任何下载预览专用状态。

### Test Changes

新增或更新 tests：

- 390x844 无 storage：只显示“导入字符串”，不显示桌面工作台编辑控件。
- 390x844 有 valid storage：显示 inline download preview content；不显示 dialog/backdrop。
- 390x844 invalid storage：不覆盖默认 scene，显示导入入口和恢复错误。
- mobile import modal：有确认、取消、关闭；不调用 `window.prompt` 或 `window.confirm`。
- mobile import success：decode PSE2，写入 scene storage，页面变为 inline download preview。
- mobile import cancel/close：不写 storage，不改变 scene。
- mobile lossy import：列出 dropped materials，用户确认后导入兼容内容；取消后不写 storage。
- desktop download preview modal 保持现有行为。
- desktop import 若迁移到同一 modal：保持 existing import semantics，并删除 prompt/confirm 断言。
- Playwright 390x844：验证 inline preview 可见、无控件重叠、没有编辑路径、刷新后仍读取导入 scene。

## 6. Proposed New Epic and Stories

## Epic 14: Mobile 导入与下载预览模式重写

Mobile 不再作为桌面工作台的缩窄只读版本，而是成为导入驱动的布景说明预览 surface。移动端进入后读取本地 scene storage；有有效记录时以内联方式展示与 desktop 下载预览完全相同的内容；没有记录时提供“导入字符串”按钮。导入使用自定义 modal，不使用系统 prompt/confirm；导入成功后保存到本地 scene storage。Mobile 仍不提供编辑器能力。

### Story 14.1: Mobile Preview Mode 规划与状态契约

As a mobile 用户, I want 打开 mobile 页面后直接看到本地保存布景的说明预览或导入入口, So that 我不用进入桌面编辑器也能查看/恢复一个布景说明。

Acceptance Criteria:

- PRD、Architecture、UX、Epics 和 sprint-status 同步新增 Epic 14，并明确 mobile 从 View-only Workbench 改为 Preview Mode。
- `<768px` 下不再渲染完整 desktop workbench layout；不得显示素材选择、建筑层编辑、实例编辑、重置或桌面导出 modal 入口。
- Mobile startup 使用 `readLatestSceneDocumentFromStorage()` 读取本地记录。
- 有 valid stored scene 时，mobile 进入 `preview-ready` state，并可生成 `ImageExportSummary`。
- 无 stored scene 时，mobile 进入 `empty` state，只显示“导入字符串”入口。
- Invalid stored scene 时，mobile 不静默成功；显示可读错误和“导入字符串”入口。
- 旧 desktop 编辑工作台、desktop autosave、desktop download preview modal 不回退。

### Story 14.2: ExportPreview 内容拆分并支持 mobile inline 渲染

As a mobile 用户, I want mobile 页面显示和 desktop 下载预览完全一样的布景说明内容, So that 我在手机上看到的素材清单和逐层图形与下载图一致。

Acceptance Criteria:

- `ExportPreview` 拆出共享 content/presentation 层，desktop modal 和 mobile inline 共用同一内容组件。
- Desktop `下载预览` 仍使用 modal/backdrop、`role="dialog"`、focus trap、Escape close、下载按钮和现有下载逻辑。
- Mobile inline preview 不使用 backdrop，不设置 `aria-modal`，不 trap focus，不遮挡页面。
- Mobile inline preview 展示与 desktop preview 同一份 scene-derived content：scene name、Pokemon、canvas dimensions、overall materials、per-layer graphics、per-layer materials、layer notes、footer。
- Mobile inline preview 不写 SceneDocument、autosave、saved storage 或 UI preferences。
- ExportPreview component tests 覆盖 modal 和 inline 两种容器。

### Story 14.3: 自定义导入字符串 modal 与 mobile 导入落盘

As a mobile 用户, I want 通过自定义 modal 粘贴布景字符串并确认导入, So that 没有本地记录时也能在手机上查看布景说明。

Acceptance Criteria:

- Mobile empty state 显示“导入字符串”按钮。
- 点击后打开自定义 modal，包含 textarea、确认、取消和关闭按钮。
- 导入 flow 不调用 `window.prompt` 或 `window.confirm`。
- 确认时复用 `decodeSceneDocumentStringWithLossyRecovery()` 和 `applyRecoveredSceneDocument()`；invalid string 显示错误，不关闭 modal，不写 storage。
- 有 dropped incompatible materials 时，modal 内展示丢弃明细，并要求用户再次确认导入剩余兼容内容。
- 导入成功后写入现有 scene storage 的 autosave slot，清除导入 modal 状态，并在 mobile 页面显示 inline preview。
- 取消或关闭 modal 不改变 scene，不写 scene storage，不写 UI preferences。
- 如 desktop 继续保留“导入字符串”入口，desktop 入口也应复用同一 modal，避免 system prompt/confirm 和 custom modal 两套导入逻辑并存。

### Story 14.4: Mobile preview/import 回归测试与浏览器验证

As a 维护者, I want mobile preview/import flow 有 focused tests 和 smoke 验证, So that 后续不会把 mobile 重新变成旧只读工作台或打破导入落盘。

Acceptance Criteria:

- AppShell/component tests 覆盖 mobile empty、valid storage、invalid storage、import success、invalid import、lossy import、cancel、close。
- Tests 明确断言 mobile import 不调用 system prompt/confirm。
- Tests 明确断言 mobile inline preview 和 desktop modal preview 使用同一 scene summary 内容。
- Playwright 390x844 覆盖 no-storage import path、stored-scene preview path、无编辑控件和无布局重叠。
- Existing desktop edit/autosave/download-preview tests 继续通过。
- 验证命令至少包含 web focused tests、web typecheck、web build 和 Playwright mobile smoke。

## 7. Risks and Mitigations

- 风险：mobile import exception 破坏 read-only guard。Mitigation：import 是独立显式 replacement flow；普通 edit commands 继续受 `interactionMode` 阻断，并用 mobile tests 比对 scene snapshot。
- 风险：desktop 和 mobile 预览内容漂移。Mitigation：拆共享 `ExportPreviewContent`，只分容器不分内容。
- 风险：导入成功后刷新丢失。Mitigation：成功导入后写入现有 autosave storage slot，并用 `readLatestSceneDocumentFromStorage()` 验证重进页面。
- 风险：自定义 modal 重新实现 decode/recovery 导致兼容性差。Mitigation：只封装 UI 状态，decode/recovery 仍调用现有 IO helpers。
- 风险：把下载预览内容嵌进 mobile 后布局不可读。Mitigation：mobile CSS 为 export content 定义 inline responsive constraints，并用 390x844 Playwright screenshot/smoke 验证。

## 8. Approval Record

Grigri 已回复 `A` 批准本 Sprint Change Proposal。

已执行：

- PRD、Architecture、UX、Epics 和 sprint-status 同步新增 Epic 14 mobile preview/import 边界。
- 本 proposal 路由为 Moderate scope：Product Owner / Developer 通过 Epic 14 stories 推进。

下一步：通过 `bmad-create-story` / `bmad-dev-story` 从 Story 14.1 开始实现。
