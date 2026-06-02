# Sprint Change Proposal - 2026-06-01 `scene_id` URL 即时访问导入

Status: Approved - 2026-06-01
Owner: Grigri
Prepared by: Codex via `bmad-correct-course`

## 1. Issue Summary

触发变更：Grigri 希望给 scene editor 增加即时访问能力：当 URL 带有 `?scene_id={id}` query 时，scene editor 自动请求 `https://scene-api.pokokit.com/api/scenes/{id}`，从响应中取得可导入的布景字符串，并自动导入显示。由于 scene API 有 Origin 限制，本地调试时 fetch 需要带：

```ts
headers: {
  Origin: "https://scene-editor.pokokit.com"
}
```

生产环境不需要该 header。

问题类型：新用户入口 / 远程 scene import requirement，叠加已有 mobile import/preview contract 与 desktop scene string import flow。

核心问题：当前编辑器只支持本地 storage 恢复、desktop 手动导入字符串、mobile 自定义 modal 导入和本地 inline preview。它没有 URL query 驱动的远程导入入口，也没有 browser fetch adapter / dev proxy 处理 scene API 的本地调试 Origin 限制、远程加载状态、错误状态或自动导入后的 storage/preview 行为。

证据与当前状态：

- Active planning surface 显示 Epic 14 已完成，当前 mobile 入口是本地 scene storage 或手动导入字符串。
- `AppShell` 启动时通过 `createInitialSceneState()` 同步读取 localStorage；没有 URL query / fetch flow。
- `submitSceneStringImport()` 已集中复用 `decodeSceneDocumentStringWithLossyRecovery()`、`applyRecoveredSceneDocument()`、mobile storage 写入和 desktop scene replacement 行为，适合作为远程字符串导入的内部复用点。
- `MobilePreviewMode` 已能在 `<768px` 下展示 inline `ExportPreviewContent`，但 state resolver 当前来源是 storage/current draft，不包含 remote loading/source。
- 本变更不要求修改 `SceneDocument v1`、PSE1/PSE2 codec、asset catalog、footprint/stacking 派生规则或生产部署架构。

Open item:

- API 响应 body 的精确 shape 尚未在本请求中说明。实现 story 需要确认它是 plain text，还是 JSON 字段如 `sceneString` / `scene_string` / `importString`。建议新增一个小型 browser adapter，先以受测 fixture 锁定解析规则；如果 API 已固定字段，以该字段为唯一 contract，避免宽松猜测导致错误导入。

## 2. Impact Analysis

### Epic Impact

当前 active tracker 表示 Epic 1-14 均已完成。此需求不是 Epic 14 的 bug fix，而是在完成的 mobile preview/import 能力之上新增一个可分享/即时访问入口。建议新增 Epic 15：`scene_id` URL 即时访问导入。

不建议回滚 Epic 14。Epic 14 已提供可复用的导入 modal、decode/recovery、mobile inline preview 和测试框架；本次应复用这些能力，补齐远程读取和 URL-driven startup。

Epic 15 应保持范围窄：

- URL `scene_id` query 识别和 sanitization。
- Remote scene API fetch adapter。
- Dev-only Origin header 策略。
- 自动导入 scene string 后在 desktop/mobile 显示。
- Loading/error UI、storage 写入边界和 focused tests。

### PRD Impact

需要新增 approved course correction section，说明当前产品支持 `?scene_id={id}` 远程打开场景。该入口是“导入字符串的远程来源”，不是云同步、账号、公开方案库或在线编辑服务。

PRD 应补充：

- `scene_id` query 在 app startup 被读取；缺失时沿用当前 localStorage/default flow。
- fetch 成功后取得 scene string，并复用当前 PSE decode/recovery/import pipeline。
- Desktop 成功后进入可编辑工作台，scene 成为当前 scene；是否写 autosave 应与现有 scene import 行为一致。
- Mobile 成功后进入 inline preview；允许写现有 autosave slot，以刷新后继续显示该 scene。
- 远程加载失败、404/权限/CORS/invalid string/lossy recovery 必须显示可恢复错误，不静默回退为默认 scene success。
- `scene_id` 不是 SceneDocument schema 字段，不进入 `SceneDocument v1`。

### Architecture Impact

需要新增 browser-only adapter，建议放在 `apps/web/src/io/remote-scene-import.ts` 或相邻 IO 模块；不要放进 `packages/scene-core`，因为它依赖 browser/runtime fetch、URL query 和环境判断。

架构边界：

- `packages/scene-core` 继续只负责 decode/recovery/schema/export summary。
- `apps/web` 负责 URL parsing、API fetch、dev proxy/header strategy、loading/error UI 和 storage side effects。
- Production fetch 不应发送手写 `Origin` header；浏览器会自动携带真实 Origin。
- Local dev 不能依赖浏览器 `fetch` 手写 `Origin` header；`Origin` 是受限制请求头，实际实现应使用 Vite dev proxy 或本地 adapter endpoint，由 dev server 向 `scene-api.pokokit.com` 发送 `Origin: "https://scene-editor.pokokit.com"`。
- 实现应通过 `import.meta.env.DEV` 或 existing local host helper 显式区分 dev/prod endpoint，并由 tests 锁定。

### UX Impact

新增远程导入状态，不新增 landing page：

- Desktop: 进入 `/?scene_id=abc` 后可在工作台上方或 toast 区显示“正在加载远程布景”；成功后直接显示导入 scene；失败时保留当前可用 scene/default scene，但用错误 toast/recovery panel 明确说明失败原因。
- Mobile: `?scene_id=abc` 应优先于本地 storage，成功后直接显示 inline preview；失败时显示错误和“导入字符串”入口，不把默认 scene 当作成功 preview。
- Lossy recovery: 远程自动导入不应无提示丢弃素材。推荐做法是：如果 remote decode 返回 dropped incompatible materials，显示现有 lossy confirmation modal/notice；用户确认后再应用兼容内容。
- Accessibility: loading、success、error 状态必须使用 `role="status"` / `role="alert"` 或既有 toast 机制；不能只靠颜色。

### Testing / Release Impact

需要 focused tests，不需要新增 release infrastructure。

最低验证：

- Unit/component: no `scene_id` 时现有 startup 不回退。
- Unit/component: `?scene_id=id` 调用正确 endpoint。
- Unit/component: dev mode 使用本地 proxy/adapted URL；production 使用 `https://scene-api.pokokit.com/api/scenes/{id}`。
- Config/adapter test: dev proxy 或 local adapter 会向上游附带 `Origin: "https://scene-editor.pokokit.com"`；production client fetch 不手写 Origin header。
- Unit/component: successful remote scene string applies scene through existing import pipeline。
- Unit/component: invalid remote response / invalid scene string shows error and does not silently overwrite current scene as success。
- Unit/component: mobile success writes autosave and renders inline preview; mobile failure keeps import entry.
- Unit/component: lossy remote import requires explicit confirmation before applying.
- Playwright: desktop `?scene_id=fixture` path and mobile `390x844 ?scene_id=fixture` path, using mocked route/fixture.
- Existing web typecheck, focused web tests, web build, and focused Playwright smoke continue passing.

## 3. Recommended Approach

推荐路径：Option 1 Direct Adjustment，新建 Epic 15 和 3 个故事。范围中等、风险中等偏低，主要风险集中在远程 API response contract、browser Origin header 限制和自动导入不能静默覆盖。

不推荐 rollback：Epic 14 的 mobile import/preview 正是本次复用基础。

不需要 PRD MVP Review：当前产品已进入 Polish/迭代阶段；这不是 MVP 缩减，而是新增入口。

实施顺序：

1. 新增 remote scene import IO adapter 和 URL query state contract。
2. 接入 AppShell startup，复用现有 decode/recovery/apply import pipeline。
3. 补齐 desktop/mobile loading/error/lossy UI 与测试。

## 4. Detailed Change Proposals

### PRD - 新增 Course Correction

Section: Course Corrections / Approved Course Correction

NEW:

```md
### Approved Course Correction - 2026-06-01 `scene_id` URL 即时访问导入

本 PRD 增加 `?scene_id={id}` 即时访问入口。用户打开带 `scene_id` query 的 scene editor URL 时，Web app 会请求 `https://scene-api.pokokit.com/api/scenes/{id}`，取得可导入的布景字符串，并复用现有 PSE scene string decode/recovery/import pipeline 自动显示该布景。

该入口是导入字符串的远程来源，不新增账号、云同步、公开方案库、在线编辑服务或 SceneDocument schema 字段。`SceneDocument v1`、PSE1/PSE2 codec、footprint/stacking/dimension 派生规则继续保持。

本地调试时，因为 scene API Origin 限制，dev server/proxy 需要向上游带 `Origin: "https://scene-editor.pokokit.com"`；生产环境 browser fetch 不手写该 header。远程加载失败、无效响应、无效 scene string 和 lossy recovery 都必须给出可恢复反馈，不能静默把默认 scene 当作远程 scene 成功显示。
```

### Architecture - 新增 Browser Remote Import Boundary

Section: Browser integrations / Data flow

NEW:

```md
新增 browser-only remote scene import adapter。`apps/web` 负责读取 `window.location.search` 中的 `scene_id`、解析 remote endpoint、执行 fetch、解析响应中的 scene string，并把字符串交给现有 scene string import pipeline。Production endpoint 是 `https://scene-api.pokokit.com/api/scenes/{id}`；local dev endpoint 应走 Vite dev proxy 或本地 adapter，由 dev server 向上游附带 `Origin: "https://scene-editor.pokokit.com"`。

该 adapter 不属于 `packages/scene-core`，因为它依赖 browser URL、fetch 和环境判断。`scene-core` 继续只提供 DOM-free decode、recovery、schema、export summary 和规则派生。

Production browser fetch 不手写 `Origin` header；local dev 不在 browser fetch headers 中设置 Origin，而是通过 Vite dev proxy 或本地 adapter 满足 scene API 的 Origin 限制。Proxy 配置和测试纳入同一 story。
```

### UX - 新增 URL Import States

Section: Responsive Design / Mobile Preview Mode / Error Feedback

NEW:

```md
当 URL 带有 `scene_id` query 时，remote import 优先于本地 storage/default scene 展示。Desktop 显示远程加载状态，成功后进入可编辑工作台；Mobile 显示远程加载状态，成功后进入 inline 下载预览。失败时显示错误说明和可恢复入口，不静默回退为默认 scene 成功状态。

远程 scene string 如果需要 lossy recovery，必须向用户列出将丢弃的素材，并要求确认后再应用兼容内容。用户取消时不得写 scene storage，不得改变当前 scene。
```

### Sprint Status / Epics

Approval 后新增 Epic 15 到 active epics 和 sprint-status：

```yaml
development_status:
  epic_15:
    status: backlog
    title: scene_id URL 即时访问导入
    proposal: /Users/grigri/side-project/pokopia/pokopia-scene-editor/_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01-scene-id-url-import.md
    stories:
      15-1-remote-scene-import-adapter-and-url-contract:
        status: backlog
        title: Remote scene import adapter 与 URL contract
      15-2-appshell-scene-id-startup-import-flow:
        status: backlog
        title: AppShell scene_id 启动自动导入 flow
      15-3-remote-import-regression-tests-and-browser-smoke:
        status: backlog
        title: Remote import 回归测试与浏览器验证
```

## 5. Proposed Epic 15

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

## 6. Risk Assessment

- API response contract 未明确。Mitigation：Story 15.1 必须先确认 response shape，用 adapter fixture 测试锁定；不在 UI 里散落响应解析。
- Browser 禁止或不可靠支持手写 `Origin` header。Mitigation：本地调试通过 Vite dev proxy / local adapter 在 server-side upstream request 设置 Origin，不把该 header 放进 production client fetch。
- 自动导入可能静默覆盖当前工作台 scene。Mitigation：`scene_id` startup 才自动应用；lossy 必须确认；错误不得作为成功；tests 覆盖 storage/scene mutation 边界。
- Desktop/mobile import behavior 可能分叉。Mitigation：复用现有 import pipeline，把 remote source 作为 scene string source，而不是复制 decode/apply logic。
- Mobile preview 可能被本地 storage 抢先展示旧 scene。Mitigation：`scene_id` 存在时 remote loading/success/failure state 优先于 storage success。

## 7. Checklist Status

- [x] 1.1 Trigger story: 无 active story；用户直接触发 `scene_id` URL remote import 新需求。
- [x] 1.2 Core problem: 当前只有本地 storage 和手动导入字符串，没有 query-driven remote fetch/import。
- [x] 1.3 Evidence: `AppShell` startup 只读 storage；现有 import pipeline 可复用；Epic 14 mobile import/preview 已完成。
- [x] 2.1 Current epic: Epic 14 已完成，不建议重开为 bug。
- [x] 2.2 Epic-level change: 新增 Epic 15。
- [x] 2.3 Remaining epics: 当前无 active future epics；新增 Epic 15 不依赖归档 Epic rollback。
- [x] 2.4 Obsolete/gap: 需要补 remote scene import gap。
- [x] 2.5 Priority: 先 adapter/contract，再 AppShell flow，再 tests/smoke。
- [x] 3.1 PRD conflicts: 旧 out-of-scope 云同步/分享仍保持；新增入口应定义为 remote scene string source。
- [x] 3.2 Architecture conflicts: 新增 browser fetch adapter；不污染 scene-core。
- [x] 3.3 UX conflicts: 新增 remote loading/error/lossy 状态，mobile `scene_id` 优先于 storage。
- [x] 3.4 Other artifacts: Tests/Playwright/build gates 需要更新；deploy infra 不变。
- [x] 4.1 Direct Adjustment: Viable；effort Medium；risk Medium-Low after API/header spike。
- [N/A] 4.2 Rollback: 不需要。
- [x] 4.3 PRD MVP Review: 不需要缩减 MVP；这是 Polish/iteration entrypoint。
- [x] 4.4 Recommended path: Option 1 Direct Adjustment。
- [x] 5.1 Issue summary: Done。
- [x] 5.2 Epic/artifact impacts: Done。
- [x] 5.3 Recommended path: Done。
- [x] 5.4 PRD impact/action plan: Done。
- [x] 5.5 Agent handoff: Developer handles implementation; PM/Architect sync planning after approval if needed。
- [x] 6.1 Checklist review: Done。
- [x] 6.2 Proposal accuracy: Draft ready for approval。
- [x] 6.3 User approval: Approved by Grigri with `A` on 2026-06-01。
- [x] 6.4 sprint-status update: Done; Epic 15 and Stories 15.1-15.3 routed to backlog/ready-for-dev tracking。
- [x] 6.5 Handoff plan: Use `bmad-create-story` / `bmad-dev-story` after approval。

## 8. Approval Outcome

Grigri approved option A on 2026-06-01. Planning artifacts, sprint status and implementation story files are synchronized for Epic 15.
