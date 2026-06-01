---
stepsCompleted: []
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md
  - _bmad-output/archive/2026-05-31/planning-artifacts/epics-13-completed.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-31-mobile-import-preview.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md
---

# pokopia-scene-editor - Active Epic Index

As of 2026-06-01, Epic 15 is the active BMAD planning surface.

Completed planning history is archived here:

- `_bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md`: Epic 1-12 completed product/build history.
- `_bmad-output/archive/2026-05-31/planning-artifacts/epics-13-completed.md`: Epic 13 completed Polish-stage repo boundary, Scene Core libraryization, and data baseline work.

Archived content is historical evidence and must not be treated as active backlog.

## Epic 14: Mobile 导入与下载预览模式重写

Status: done.

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

## Epic 15: `scene_id` URL 即时访问导入

用户打开 `/?scene_id={id}` 时，scene editor 自动从 scene API 获取导入字符串，并显示对应布景。该入口复用当前 scene string import pipeline，不引入 SceneDocument schema change、账号、云同步或公开方案库。

### Story 15.1: Remote scene import adapter 与 URL contract

As a scene editor maintainer, I want 一个 browser-only remote scene import adapter, So that URL-driven scene loading 与 scene-core 领域规则保持解耦。

Acceptance Criteria:

- 新增 IO adapter 读取并校验 `scene_id` query；空值、缺失、重复值或包含非法 URL path 字符时有确定行为。
- Adapter 请求 `https://scene-api.pokokit.com/api/scenes/{id}`，id 必须经过 `encodeURIComponent` 或等价安全拼接。
- Adapter 解析 API 响应得到 scene string；实现前必须确认并测试精确 response shape。
- Local dev 请求走 Vite dev proxy 或本地 adapter；proxy/server-side upstream request 附带 `Origin: "https://scene-editor.pokokit.com"`。
- Production browser request 直连 `https://scene-api.pokokit.com/api/scenes/{id}`，不手写 Origin header。
- Adapter 返回 typed result：loading/success/not-found/network-error/invalid-response 等，不直接修改 React scene state。
- `packages/scene-core` 不新增 fetch、URL、window 或 environment 依赖。

### Story 15.2: AppShell `scene_id` 启动自动导入 flow

As a scene editor user, I want 打开带 `scene_id` 的链接后自动看到对应布景, So that 我不需要手动复制粘贴导入字符串。

Acceptance Criteria:

- `scene_id` 存在时，startup remote import 优先于 localStorage/default scene 的成功展示；没有 `scene_id` 时现有行为不变。
- Fetch 成功后复用现有 `decodeSceneDocumentStringWithLossyRecovery()` 和 `applyRecoveredSceneDocument()`。
- Desktop 成功后显示可编辑工作台中的导入 scene，并重置选择/placement transient state，行为与手动 import 一致。
- Mobile 成功后显示 inline preview，并按现有 mobile import 规则写入 autosave slot。
- Invalid string / invalid API response / fetch error 不把 default scene 当作 remote success；UI 必须显示错误和可恢复入口。
- Lossy remote import 必须展示 dropped material details，并要求用户确认后才应用兼容内容。
- 远程导入不写 UI preferences，不保存 export summary，不保存 derived footprint/stacking state。
- 成功导入后是否清理 URL query 不在本 story 强制；如清理，必须不破坏 browser back/refresh 预期。

### Story 15.3: Remote import 回归测试与浏览器验证

As a maintainer, I want remote import 有 focused tests 和 smoke coverage, So that scene_id link 不会破坏已有 desktop/mobile import/storage contract。

Acceptance Criteria:

- AppShell/component tests 覆盖 no-query baseline、desktop success、desktop fetch failure、desktop invalid scene string、mobile success、mobile failure、lossy confirmation。
- Tests 断言 local dev 使用 proxy/adapted endpoint，proxy upstream header 包含 Origin；production 使用远程 API URL 且 client fetch 不手写 Origin header。
- Tests 使用 mocked fetch/route，不依赖 live `scene-api.pokokit.com`。
- Playwright desktop 覆盖 `?scene_id=fixture` 自动导入并显示 scene name/Pokemon/material summary。
- Playwright mobile `390x844` 覆盖 `?scene_id=fixture` 自动导入后显示 inline preview、无桌面编辑控件、刷新后仍可从 storage 读取。
- Existing Epic 14 mobile manual import tests 继续通过。
- 验证命令至少包含 focused web tests、web typecheck、web build 和 focused Playwright smoke。
