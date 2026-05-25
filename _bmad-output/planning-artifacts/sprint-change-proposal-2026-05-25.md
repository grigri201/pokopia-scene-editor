---
workflowType: 'bmad-correct-course'
date: '2026-05-25'
project: 'pokopia-scene-editor'
user: 'Grigri'
status: 'approved'
mode: 'batch'
trigger: '将当前 Scene Editor UI 已有的布景生成、校验、导出摘要能力提炼成后端 Worker 服务，并包装成 MCP 和 Codex skill'
approvedAt: '2026-05-25'
sourceArtifacts:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
  - _bmad-output/planning-artifacts/research/technical-pokopia-scene-editor-cloudflare-worker-mcp-server-codex-skill-research-2026-05-25.md
---

# Sprint Change Proposal - Scene Worker, MCP, and Codex Skill

## 1. Issue Summary

当前 Scene Editor 的核心领域能力已经集中在前端 TypeScript 代码中：`SceneDocument v1` 生成与序列化、Zod 校验、恢复/roundtrip、asset catalog 查询、导出摘要、selectors、以及部分 command/reducer 规则。这些能力已经可测试、JSON 友好，并且是布景数据可信闭环的事实来源。

新的变化触发点是：希望把这些已有能力从“只能被 React UI 间接使用”提升为一个可复用后端 Worker 服务，并进一步暴露为 MCP server 和 Codex skill，让浏览器、自动化脚本、agent 和 Codex 工作流都能调用同一套权威规则。

本次不是要求重做编辑 UI，也不是把当前图片导出迁到服务端。建议把“布景生成”限定为确定性的 `SceneDocument` 创建、默认场景生成、短字符串 decode/recover 和受控 command simulation；自动创作式“AI 生成完整布景”仍保持 Post-MVP，除非另行批准。

### Evidence

- `sprint-status.yaml` 显示 Epic 1-6 及所有 story 均为 `done`，因此不能把新范围塞回已完成 epic。
- PRD/UX/Architecture 当前明确写着 MVP 不引入后端 API、server route、auth、cloud storage、share URL 或在线发布；本次需求会改变这一架构边界。
- `wrangler.toml` 当前仍是 Pages 静态输出：`pages_build_output_dir = "./dist"`。
- `package.json` 当前没有 Wrangler/Workers/MCP/Agents 依赖；图片导出依赖 `html-to-image`，该路径是 DOM/browser-only，不适合第一阶段迁入 Worker。
- 技术研究文档已给出推荐路径：先抽取 `scene-core`，再包装 Worker HTTP API、MCP tools/resources/prompts 和 repo-scoped Codex skill。

## 2. Change Analysis Checklist

| Item | Status | Finding |
| --- | --- | --- |
| 1.1 Triggering story | [N/A] | 不是某个开发 story 暴露的问题，而是 Epic 1-6 完成后的新产品/架构能力要求。 |
| 1.2 Core problem | [x] | 新 requirement：将浏览器内领域能力产品化为后端服务与 agent 工具。 |
| 1.3 Evidence | [x] | 当前 tracker 全 done；PRD/Architecture 禁止后端；代码已有纯领域候选模块；已有技术研究。 |
| 2.1 Current epic viability | [x] | Epic 6 仍完成，不需要回滚；它的导出摘要模型是 Worker 候选输入。 |
| 2.2 Epic-level changes | [!] | 需要新增 Epic 7，而不是修改 Epic 1-6 完成历史。 |
| 2.3 Remaining epics | [x] | 没有未完成 epic；新增 epic 排在 Epic 6 之后。 |
| 2.4 Future epic invalidation | [x] | 不废弃现有 epic；会把部分 Post-MVP “后端/分享/自动化”边界提前为 agent-facing service，但不包含云保存/账号。 |
| 2.5 Priority/order | [x] | 先 `scene-core`，再 Worker API，再 MCP，再 Codex skill，再 hardening/deploy。 |
| 3.1 PRD conflicts | [!] | 需要新增 Worker/MCP/Codex 需求，并修正“无后端 API”边界。 |
| 3.2 Architecture conflicts | [!] | 需要新增 shared core、Worker static assets、HTTP API、MCP、skill、tests、security/logging 约束。 |
| 3.3 UX conflicts | [!] | 终端用户 UI 基本不变；但需要新增 developer/agent UX 说明，避免把 MCP/skill 设计成普通 API 镜像。 |
| 3.4 Other artifacts | [!] | `wrangler.toml`、package scripts/deps、CI/release gate、docs/skill packaging、MCP smoke 需要后续更新。 |
| 4.1 Direct adjustment | Viable | 通过新增 Epic 7 和 story 可以完成，不需回滚。Effort: Medium/High; Risk: Medium. |
| 4.2 Rollback | Not viable | 回滚 Epic 6 会损失已完成价值，也不能解决服务化目标。 |
| 4.3 PRD MVP review | Not viable | 不需要削减 MVP；这是 MVP 后的能力扩展。 |
| 4.4 Recommended path | [x] | Hybrid: 新增 Epic 7 + 更新规划/架构边界 + 独立 worktree 实施。 |
| 5.1 Issue summary | [x] | 已完成。 |
| 5.2 Impact summary | [x] | 见下文 PRD/UX/Architecture/Epics/Sprint Plan 影响。 |
| 5.3 Recommended approach | [x] | 新增后端/agent tooling epic，保留浏览器优先 UI。 |
| 5.4 MVP impact | [x] | 不改 MVP 验收；新增 Post-MVP/Phase 2 service capability。 |
| 5.5 Handoff | [x] | PO/Architect/Developer 协同；后续按 story 执行。 |
| 6.1-6.2 Final review | [x] | 本文为草案，等待用户审阅。 |
| 6.3-6.5 Approval/update tracker | [!] | 未获批准前不得更新 PRD/UX/Architecture/Epics 或 `sprint-status.yaml`。 |

## 3. Impact Analysis

### PRD Impact

PRD 需要从“浏览器端编辑 MVP”扩展出一个新的服务化/agent-facing 能力层。建议新增 Course Correction 2026-05-25，并新增 FR69-FR77、NFR31-NFR36。

Proposed PRD change:

OLD:

```md
MVP 不包含账号系统、云端同步、协作编辑、公开方案库、分享链接、自动生成布景、素材批量导入、显式 JSON 导出/导入 UI、从导出图片或 JSON 导入恢复布景、复杂遮挡关系计算、真实游戏视角模拟、更大布景尺寸、可配置外围扩展格数、移动端完整编辑体验、原生设备能力、推送通知、支付、隐私档案或后端管理控制台。
```

NEW:

```md
MVP 仍不包含账号系统、云端同步、协作编辑、公开方案库、分享链接、在线发布或后端管理控制台。2026-05-25 后新增的服务化范围仅覆盖无状态 Worker 能力：布景数据生成/校验/恢复、导出摘要、素材查询、短字符串 encode/decode、MCP tools/resources/prompts 和 Codex skill workflow。该范围不保存用户 scene、不提供账号/权限、不生成服务端图片、不替代现有浏览器编辑 UI。
```

New FR candidates:

- FR69: 系统可以迁移为 pnpm workspace monorepo：现有 React 浏览器 UI 放入 `apps/web`，Cloudflare Worker/MCP 放入 `apps/worker`，共享领域核心放入 `packages/scene-core`。
- FR70: 系统可以将 `SceneDocument v1` 类型、Zod schema、序列化/恢复、短字符串 codec、asset catalog 查询、selectors、导出摘要 JSON 和默认 scene 生成抽取为共享 `scene-core`。
- FR71: Worker 可以提供无状态 HTTP API：`/api/health`、`/api/scene/generate`、`/api/scene/validate`、`/api/scene/recover`、`/api/scene/export-summary`、`/api/scene/encode`、`/api/scene/decode` 和 `/api/assets`。
- FR72: Worker API 必须返回统一 result envelope，包含 `ok`、`data`、`errors`、`warnings` 和 `meta`；`meta` 至少暴露 service version、schema version 和 catalog version。
- FR73: Worker 第一阶段不得保存用户 scene，不引入 D1/KV/R2/Durable Objects 作为用户数据存储，不引入账号、权限、云同步、分享链接或在线发布。
- FR74: MCP server 可以暴露高语义 tools：`generate_scene_document`、`validate_scene_document`、`recover_scene_document`、`summarize_scene_export` 和 `search_pokopia_assets`；MCP tools 不得机械镜像所有 HTTP endpoints。
- FR75: MCP resources 可以提供 scene schema、asset catalog、Pokemon catalog、默认 scene 示例和服务版本信息；MCP prompts 可以封装修复 scene、准备导出摘要和按主题找素材等高频 workflow。
- FR76: Codex skill 必须通过 MCP 调用权威 Worker/scene-core 能力完成校验、摘要和素材搜索；skill 不得复制业务逻辑、schema、asset catalog 或导出摘要实现。
- FR77: 现有 React UI 继续复用同一 `scene-core`，并保持当前编辑、保存、恢复和图片下载用户体验不回退。

New NFR candidates:

- NFR31: Worker/API/MCP 不得记录完整用户 scene payload；日志只记录 request id、route/tool、status、error category、duration 和 redacted metadata。
- NFR32: Worker 必须限制 request body、content type、tool timeout 和 output size；错误响应不得暴露 stack trace。
- NFR33: Worker bundle 不得包含 React、React DOM、`html-to-image`、Playwright、jsdom 或大型图片源。
- NFR34: `scene-core`、Worker API、MCP tools 和 Codex skill 必须有 contract tests；release gate 增加 Worker runtime tests、MCP smoke 和 `wrangler types` 检查。
- NFR35: API/MCP 结果必须与浏览器 UI 当前 `SceneDocument v1`、asset catalog、locale 显示规则和导出摘要语义一致。
- NFR36: 根 `package.json` 必须提供 pnpm monorepo orchestration scripts；Wrangler dev/types/deploy/dry-run 命令必须能通过 `pnpm run worker:*` 和 `pnpm run deploy` 执行。

### UX Impact

终端用户编辑器 UX 不应新增复杂入口。当前工作台仍保持浏览器本地编辑、预览、自动保存和图片下载。Worker/MCP/Codex skill 是 developer/agent tooling，不应把用户界面变成 API 控制台。

Required UX updates:

- 在 UX spec 增加 “Developer / Agent Workflow UX” 小节，定义工具调用体验：清晰任务名、结构化结果、可解释错误、最小工具数量、避免暴露底层 endpoint 噪音。
- Image Export Preview 保持浏览器图片生成；Worker 第一阶段只返回 export summary JSON，不生成 PNG。
- 如果 UI 后续调用 Worker API，必须保持同域、失败可降级到本地 `scene-core` 或给出明确状态；不得让用户在编辑闭环中感知服务不可用为数据丢失。

Proposed UX change:

OLD:

```md
导出预览和下载从当前 scene 派生，不覆盖当前场景，不触发 autosave，不写入 saved storage 或 UI preferences。
```

NEW:

```md
导出预览和下载仍从当前 scene 派生，不覆盖当前场景，不触发 autosave，不写入 saved storage 或 UI preferences。后端 Worker 可以提供同语义的 export summary JSON 给 API/MCP/Codex 工作流，但第一阶段不替代浏览器内图片预览和下载体验。
```

### Architecture Impact

Architecture 的变化最大。当前文档多处明确 “MVP has no backend API / static assets only”。本次需要增加一个 Post-MVP service architecture，但不能推翻浏览器优先的编辑器边界。

Required Architecture updates:

- 将仓库明确迁移为 pnpm workspace monorepo，新增 `pnpm-workspace.yaml`，根 `package.json` 只保留 workspace orchestration scripts。
- 将现有浏览器前端从根目录迁入 `apps/web/`：当前 `src/`、`index.html`、`public/`、Vite/Vitest/Playwright/TS 配置中属于前端 app 的部分进入 `apps/web/`。
- 新增 `packages/scene-core/`：纯 TypeScript 领域核心，包含 scene types、schema、serializer、recovery、codec、selectors、asset filtering、export summary。
- 新增 `apps/worker/`：Cloudflare Worker app，提供 `/api/health`、`/api/scene/generate`、`/api/scene/validate`、`/api/scene/recover`、`/api/scene/export-summary`、`/api/scene/encode`、`/api/scene/decode`、`/api/assets`。
- 新增 `apps/worker/src/mcp.ts`：Streamable HTTP MCP server，初始使用无状态 handler。
- 新增 `.agents/skills/pokopia-scene-worker/` 或同等 repo-scoped skill：只写 workflow、examples、MCP dependency 和失败处理。
- `wrangler.toml` 从根 Pages-only 配置迁移到 `apps/worker/wrangler.toml` 的 Workers static assets 配置：Worker code 服务 `/api/*` 和 `/mcp`，`assets.directory` 指向 `../web/dist`。
- 保持第一阶段无数据库、无账号、无云保存、无服务端 PNG/图片生成。
- 新增 dependency direction：`apps/web` 和 `apps/worker` 都可依赖 `packages/scene-core`；`scene-core` 不得依赖 React、DOM、localStorage、Worker runtime 或 UI components。
- 新增 security rules：body limit、content-type allowlist、structured errors、redacted logs、no raw payload logging、no stack trace response。

明确目录结构变化：

```text
pokopia-scene-editor/
├── apps/
│   ├── web/
│   │   ├── index.html
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   ├── state/
│   │   │   ├── theme/
│   │   │   ├── i18n/
│   │   │   └── io/
│   │   │       ├── image-export.ts
│   │   │       ├── scene-storage.ts
│   │   │       └── ui-preferences.ts
│   │   ├── vite.config.ts
│   │   ├── vitest.config.ts
│   │   ├── playwright.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── worker/
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   ├── mcp.ts
│       │   └── api-result.ts
│       ├── wrangler.toml
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── scene-core/
│       ├── src/
│       │   ├── domain/
│       │   ├── assets/
│       │   ├── io/
│       │   ├── export-summary/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── .agents/
│   └── skills/
│       └── pokopia-scene-worker/
│           └── SKILL.md
├── pnpm-workspace.yaml
├── package.json
├── pnpm-lock.yaml
└── _bmad-output/
```

目录归属规则：

- `apps/web/src/` 保存现有纯前端界面代码：React app shell、组件、CSS/theme、浏览器事件、`localStorage` UI preferences、图片预览 modal、浏览器下载和 `html-to-image` PNG 生成。
- `packages/scene-core/` 只接收可在浏览器、Node/Vitest 和 Worker 中共同运行的纯 TypeScript 能力：`SceneDocument` 类型、Zod schema、serializer/recovery、short code codec、asset catalog 查询、selectors、导出摘要 JSON、默认 scene 生成。
- `apps/worker/` 只做 HTTP/MCP adapter、request parsing、result envelope、cache/header/security/logging 和 Wrangler 部署配置；不得重新实现 scene 业务规则。
- `.agents/skills/pokopia-scene-worker/` 只放 Codex skill workflow、示例和 MCP dependency；不得复制 schema、asset catalog 或导出摘要逻辑。
- 当前 `src/domain/scene/export-summary.ts` 这类纯逻辑应迁入 `packages/scene-core/`；当前 `src/io/image-export.ts` 依赖 DOM 和 `html-to-image`，迁到 `apps/web/src/io/image-export.ts` 后继续保留在 web app。

根 `package.json` scripts 应作为 monorepo orchestration 层，可通过 `pnpm run ...` 执行。建议根 scripts：

```json
{
  "scripts": {
    "dev": "pnpm --filter @pokopia-scene-editor/web dev",
    "preview": "pnpm --filter @pokopia-scene-editor/web preview",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "build": "pnpm --filter @pokopia-scene-editor/scene-core build && pnpm --filter @pokopia-scene-editor/web build && pnpm --filter @pokopia-scene-editor/worker build",
    "smoke": "pnpm --filter @pokopia-scene-editor/web smoke",
    "worker:dev": "pnpm --filter @pokopia-scene-editor/worker dev",
    "worker:types": "pnpm --filter @pokopia-scene-editor/worker types",
    "worker:types:check": "pnpm --filter @pokopia-scene-editor/worker types:check",
    "worker:deploy:dry-run": "pnpm --filter @pokopia-scene-editor/worker deploy:dry-run",
    "worker:deploy": "pnpm --filter @pokopia-scene-editor/worker deploy",
    "deploy": "pnpm run worker:deploy"
  }
}
```

`apps/worker/package.json` 应包含 Wrangler 本地命令，并显式先构建 web 静态资源：

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "types": "wrangler types",
    "types:check": "wrangler types --check",
    "build": "wrangler deploy --dry-run",
    "deploy:dry-run": "pnpm --filter @pokopia-scene-editor/web build && wrangler deploy --dry-run",
    "deploy": "pnpm --filter @pokopia-scene-editor/web build && wrangler deploy"
  }
}
```

正式改用 pnpm workspace 时，实施 story 需要新增 `pnpm-workspace.yaml` 和 `pnpm-lock.yaml`，移除或冻结旧 `package-lock.json` 策略，更新 CI/package-manager 文档，并避免同时维护 npm 与 pnpm 两套安装路径。

Proposed Architecture change:

OLD:

```md
MVP 没有后端 API。所有 scene create/edit/save/recover/serialize 操作都在浏览器内完成。
```

NEW:

```md
已完成 MVP 的浏览器编辑闭环仍保持客户端优先。2026-05-25 后新增 Post-MVP service layer：把可脱离 DOM/React/localStorage 的领域能力抽取到 `scene-core`，由 React UI、Cloudflare Worker HTTP API、MCP tools 和 Codex skill 共同复用。Worker 第一阶段无状态、无数据库、无账号、无服务端图片生成。
```

### Epics Impact

Epic 1-6 应保留为完成历史，不改写。需要新增 Epic 7。

Proposed Epic 7:

```md
## Epic 7: Scene Core Worker、MCP 与 Codex Skill 服务化

用户和 agent 可以通过一个无状态 Worker 服务调用 Scene Editor 已有的布景生成、校验、恢复、素材查询和导出摘要能力；Codex 可以通过 MCP 和 repo-scoped skill 使用同一套权威 `scene-core`，而不会复制业务规则或污染当前浏览器编辑体验。

FRs covered: FR69, FR70, FR71, FR72, FR73, FR74, FR75, FR76, FR77, NFR31, NFR32, NFR33, NFR34, NFR35, NFR36.

Implementation notes: 该 epic 承接 Epic 4 的 `SceneDocument v1` 契约、Epic 6 的 export summary 和当前技术研究。第一阶段不引入账号、数据库、云保存、分享链接、服务端图片渲染或 AI 自动生成布景。所有 adapter 必须复用 `scene-core`。
```

Proposed stories:

- Story 7.1: 抽取 `packages/scene-core` 并保持现有 UI/测试不回退。
- Story 7.2: 新增 Cloudflare Worker static assets、HTTP API MVP 和 `pnpm run worker:*` / `pnpm run deploy` scripts。
- Story 7.3: 新增 Streamable HTTP MCP server、tools、resources 和 prompts。
- Story 7.4: 新增 repo-scoped Codex skill，声明 MCP dependency 和工作流示例。
- Story 7.5: Worker/MCP/Skill hardening、测试、日志脱敏、bundle 检查和部署 dry-run。

### Sprint Plan Impact

`sprint-status.yaml` 当前全部为 `done`。批准后应只追加新条目，不改动 Epic 1-6 状态：

```yaml
development_status:
  epic-7: backlog
  7-1-extract-scene-core-shared-package: backlog
  7-2-worker-http-api-and-deploy-scripts: backlog
  7-3-mcp-server-tools-resources-prompts: backlog
  7-4-codex-skill-wrapper-and-examples: backlog
  7-5-worker-mcp-skill-hardening-and-release-gates: backlog
  epic-7-retrospective: optional
```

建议执行顺序严格保持 7.1 -> 7.2 -> 7.3 -> 7.4 -> 7.5。原因是 Worker、MCP 和 skill 都必须依赖同一个 `scene-core`；提前做 MCP/skill 会造成 schema 与业务逻辑复制。

## 4. Recommended Approach

推荐路径：**Direct Adjustment with New Epic**。

不回滚、不削减 MVP、不改写 Epic 1-6 历史。新增 Epic 7，并在批准后同步更新 PRD、UX、Architecture、Epics 和 `sprint-status.yaml`。

Scope classification: **Moderate, architecture-heavy**。

理由：

- 产品目标没有根本改变；核心 Scene Editor UI 不需要推倒重来。
- 需要明显的 backlog 重组和 architecture 更新，因为当前规划明确禁止后端 API。
- 风险主要来自业务逻辑复制、Worker bundle 污染、MCP tool 过度暴露、日志泄漏和当前脏工作树混入。
- 可通过分阶段 story、独立 worktree、contract tests 和 release gates 控制。

Implementation assumptions:

- 第一阶段使用独立 git worktree 或独立 branch，避免混入当前未提交 SEO/静态资源改动。
- 不引入账号、云保存、公开方案库、分享链接或数据库。
- 不把 `html-to-image` / DOM 图片生成迁入 Worker。
- Codex skill 是 workflow wrapper，不实现业务规则。

## 5. Detailed Change Proposals

### PRD Edits

Add:

- Course Correction 2026-05-25 section.
- FR69-FR77.
- NFR31-NFR36.
- Post-MVP/Phase 2 capability note for Worker/MCP/Codex.

Do not remove:

- Existing MVP browser editing requirements.
- Epic 6 browser image preview/download requirements.
- Existing out-of-scope constraints for accounts/cloud/collaboration unless separately approved.

### UX Edits

Add:

- Developer/Agent Workflow UX section.
- Clarify Worker export summary does not replace browser image preview.
- Add MCP/Codex output principles: concise tool names, structured errors, schema references, safe text, no raw endpoint mirroring.

Do not add:

- End-user API console.
- New visible cloud/save/login UI.
- Server-generated image states in current workbench.

### Architecture Edits

Add:

- `scene-core` shared package boundary.
- Explicit pnpm workspace monorepo directory structure showing `apps/web/src/` owns the React/browser UI, `apps/worker/` owns Worker/MCP adapters and Wrangler config, `packages/scene-core/` owns pure domain logic, and `.agents/skills/pokopia-scene-worker/` owns the Codex skill.
- Worker static assets deployment target.
- HTTP API contract and result envelope.
- MCP tools/resources/prompts boundary.
- Codex skill package boundary.
- `package.json` scripts runnable through `pnpm`, including `worker:dev`, `worker:types`, `worker:deploy:dry-run`, `worker:deploy`, and `deploy`.
- Security, logging, testing and bundle constraints.
- Updated directory structure and dependency graph.

Revise:

- “MVP has no backend API” to “completed MVP remains browser-first; approved Post-MVP Worker layer is allowed under explicit no-persistence/no-auth constraints.”

### Epics and Sprint Plan Edits

Add:

- Epic 7 and five backlog stories.
- `sprint-status.yaml` backlog entries only after approval.

Do not change:

- Existing story statuses for Epic 1-6.
- Existing completed story files.

## 6. Implementation Handoff

Recommended handoff:

- Product/PO: Approve whether this is Epic 7 and whether “布景生成” is deterministic scene generation only, not AI auto-generation.
- Architect: Update architecture and API/MCP boundaries.
- Developer: Implement Story 7.1 first in isolated branch/worktree.
- Reviewer: Verify no duplicated schema/business logic and no Worker browser bundle contamination.

Success criteria:

- `scene-core` is reused by React UI, Worker API and MCP tools.
- Existing pure frontend UI code is migrated from root `src/` to `apps/web/src/`; only DOM-free domain/IO/export-summary logic moves to `packages/scene-core`.
- Worker exposes health, generate/default, validate/recover, export-summary, encode/decode and asset search.
- `pnpm run worker:deploy` and `pnpm run deploy` invoke Wrangler deployment after the production build; `pnpm run worker:deploy:dry-run` is available for release checks.
- MCP exposes a small high-semantic tool set and useful resources/prompts.
- Codex skill can complete at least three workflows through MCP: validate scene, summarize export, search assets/generate default scene.
- Existing UI behavior, autosave/recovery, image export preview/download and smoke tests do not regress.
- New release gate includes typecheck, unit/component tests, build, smoke, Worker runtime tests, MCP smoke, `wrangler types`, bundle pollution check and logging/body-limit checks.

## 7. Approval Gate

This proposal is a draft. No PRD, UX, Architecture, Epics, story files or `sprint-status.yaml` updates should be applied until Grigri explicitly approves.

Recommended next response:

- `C` / `继续` / `approve`: approve the proposal and proceed to synchronize planning artifacts.
- `Edit`: revise the proposal before artifact updates.
- `Skip`: do not proceed with this course correction.
