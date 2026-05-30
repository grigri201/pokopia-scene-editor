---
stepsCompleted:
  - step-01-validate-prerequisites.md
  - step-02-design-epics.md
  - step-03-create-stories.md
  - step-04-final-validation.md
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-30-repo-slim-core-library.md
  - _bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md
---

# pokopia-scene-editor - Active Epic Breakdown

## Overview

This document now tracks the active Polish-stage roadmap for pokopia-scene-editor.

Epic 1-12 are complete and archived. Their full historical epic/story breakdown lives at:

`_bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md`

The product is no longer an MVP. It already has the main creation flow and can generate the required strategy/export guide image. The active work is Polish-stage maintenance: repo boundary cleanup, lower code complexity, stronger data ownership, and a file-installable `scene-core` package.

## Approved Course Correction - 2026-05-30 仓库瘦身与 Scene Core 库化

`_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-30-repo-slim-core-library.md` 已批准。

Epic 1-12 保留为已完成历史并归档，不回滚。当前新增 Epic 13，用于把本仓库收敛为 Web app + file-installable `scene-core` library。API、MCP、Codex skill 和 Worker adapter 从本仓库移除，并通过 handoff 文档交给新项目重新设计。

本次继续保持 `SceneDocument v1`。除非后续 story 发现必须改 schema 并另行 course correction，否则不得新增 `SceneDocument v2`，不得改变终端用户可见行为。

## Requirements Inventory

### Functional Requirements

FR109: 产品阶段描述必须从 MVP 更新为 Polish：已有主流程，能生成所需攻略/导出说明图，当前目标是质量、维护性和仓库边界收敛。

FR110: 本仓库必须收敛为只维护浏览器 Web 工作台和可被其他项目通过 pnpm `file:` 安装的 `scene-core` 领域库。

FR111: Epic 1-12 的完整历史内容必须归档，active planning/tracker 只承载当前 Polish-stage Epic 13。

FR112: API、MCP、Codex skill 和 Worker adapter 必须从本仓库移除；新项目若需要这些能力，必须通过 file-installed `scene-core` 依赖重新设计。

FR113: Catalog 业务数据、footprint metadata、stacking metadata、dimension helpers、Pokemon preference/translation 和 runtime image references 必须有明确 single source of truth。

FR114: 测试必须优先从 `scene-core` factories、dimension helpers、catalog helpers 和 shared fixtures 读取事实，不得把当前配置复制成第二套测试真相。

### Non-Functional Requirements

NFR53: 本次重构不得改变终端用户 Web 行为，包括编辑、保存/恢复、17x17 默认画布、legacy 7x7 恢复、footprint、stacking、层备注、导出预览和图片下载。

NFR54: `SceneDocument v1` 继续作为当前 payload contract；本次不得新增 `SceneDocument v2` 或保存 derived footprint/stacking/dimension state。

NFR55: `packages/scene-core` 必须保持 DOM-free、React-free、localStorage-free、Worker-runtime-free，并能被外部项目通过 pnpm `file:` 安装后直接 import。

NFR56: Active release gate 必须聚焦 core/web/file-install smoke；Worker/MCP/skill gate 不再作为本仓库默认验证目标。

NFR57: 资源清理必须先证明 Web 素材列表、缩略图、预览和导出不回退；不得为降低体积而误删用户可见资源。

NFR58: 归档不得删除历史证据；完成历史应可从 dated archive 中恢复和审计。

## Epic 13: 仓库瘦身与 Scene Core 库化

产品已具备主流程和攻略/导出说明生成能力，当前进入 Polish 阶段。本仓库收敛为只维护浏览器 Web 工作台和可被其他项目通过 pnpm `file:` 安装的 `scene-core` 领域库。API、MCP、Codex skill 和 Worker adapter 从本仓库移除，并通过 handoff 文档交给新项目重新设计。终端用户 Web 行为、`SceneDocument v1`、默认 15x15 / 17x17 场景、legacy 7x7 恢复、footprint、stacking、层备注、自动保存和图片导出不得回退。

### Story 13.1: 规划归档与发布边界重写

**Requirements covered:** FR109, FR110, FR111, FR112, NFR53, NFR54, NFR56, NFR58.

As a 维护者,
I want 归档已完成 epics 并同步 PRD、Architecture、UX、Epics 和 sprint-status 的新仓库边界,
So that 后续实现不会继续把 Worker/API/MCP/skill 当成本仓库目标。

**Acceptance Criteria:**

**Given** Epic 1-12 已完成
**When** active planning 更新
**Then** Epic 1-12 的完整历史内容从 active `epics.md` 归档到 dated archive
**And** active `epics.md` 只保留归档索引/摘要和 Epic 13。

**Given** 当前 `sprint-status.yaml` 包含 Epic 1-12 done 状态
**When** tracker 更新
**Then** 旧 done 状态归档到 dated archive
**And** active tracker 只保留当前项目元信息、归档指针、Epic 13 和 Story 13.1-13.6。

**Given** PRD、Architecture 和 UX 仍包含旧 MVP 阶段描述
**When** Story 13.1 完成
**Then** 当前产品阶段必须更新为 Polish
**And** 文档必须说明主流程已可用，能够生成所需攻略/导出说明，当前目标是质量和维护性收敛。

**Given** 本仓库边界收敛
**When** 文档同步完成
**Then** PRD 明确本仓库目标为 Web + `scene-core` library
**And** Architecture 删除 Worker/API/MCP 作为本仓库模块的目标结构
**And** UX 删除本仓库内 developer/agent workflow surface 的交付要求。

**Given** 本次重构不面向 payload 变更
**When** 文档同步完成
**Then** 必须明确本次不改变 `SceneDocument v1`
**And** 如后续必须改 schema，必须另行 course correction。

### Story 13.2: Scene Core 可被 pnpm file 安装

**Requirements covered:** FR110, FR112, NFR54, NFR55.

As a 下游项目开发者,
I want 通过 `pnpm add file:../pokopia-scene-editor/packages/scene-core` 使用 core,
So that 新项目可以复用 SceneDocument、catalog、schema、codec、selectors 和 export summary。

**Acceptance Criteria:**

**Given** `packages/scene-core` 目前是 workspace package
**When** Story 13.2 完成
**Then** `package.json` 提供可消费的 `exports`、`types`、`files` 和 build output
**And** 不再依赖 workspace-only TS source export 作为外部安装契约。

**Given** 外部项目通过 pnpm `file:` 安装 `scene-core`
**When** consumer smoke import 关键 API
**Then** 可以使用 SceneDocument types/schema、default scene factory、catalog helpers、dimension helpers、codec、selectors 和 export summary
**And** consumer 不需要编译本仓库 TS 源。

**Given** `scene-core` 是领域库
**When** dependency boundary 检查运行
**Then** 不得依赖 React、DOM、localStorage、Worker runtime、Wrangler、MCP SDK 或 web components。

**Given** Web app 继续存在
**When** root build/test 运行
**Then** `apps/web` 继续通过 workspace dependency 使用同一 `scene-core`
**And** 不复制 core 规则。

### Story 13.3: 移除本仓库 Worker/API/MCP/Skill 代码

**Requirements covered:** FR110, FR112, NFR53, NFR56.

As a 仓库维护者,
I want 从本仓库移除 API、MCP、Worker 和 repo-scoped skill,
So that 仓库边界和依赖图只服务 Web 与 core。

**Acceptance Criteria:**

**Given** 本仓库不再维护 API/MCP/skill surface
**When** Story 13.3 完成
**Then** 删除 `apps/worker/**`、`.agents/skills/pokopia-scene-worker/**`、Worker/MCP/skill 专用验证脚本和 Wrangler/MCP/agents 依赖。

**Given** root package scripts 更新
**When** 维护者查看 `package.json`
**Then** `worker:*`、`skill:verify`、`worker:mcp:smoke`、`worker:bundle:check` 等脚本不存在
**And** `typecheck`、`test`、`build`、`release:verify` 只覆盖 core/web/file-install smoke。

**Given** 新项目未来需要 API/MCP/skill
**When** Story 13.3 完成
**Then** 生成 handoff 文档列出被移除 endpoint/tool/resource/prompt/script
**And** handoff 明确新项目必须依赖 file-installable `scene-core`，不得复制业务规则。

**Given** Web app 是唯一 app
**When** deploy 脚本运行
**Then** Cloudflare Pages static deploy 行为保持
**And** 终端用户 Web 行为不回退。

### Story 13.4: 资源与数据 Single Source of Truth 清理

**Requirements covered:** FR113, FR114, NFR53, NFR57.

As a 维护者,
I want 明确 catalog 数据、override 和 runtime images 的权威来源,
So that 后续修改不会在 CSV/JSON/generated TS/runtime assets 之间漂移。

**Acceptance Criteria:**

**Given** catalog business metadata 分布在 source files、generated TS 和 overrides
**When** Story 13.4 完成
**Then** 必须明确 canonical source
**And** generated TS 是否只可由脚本生成必须写入文档或脚本 guard。

**Given** footprint、stacking、dimension、Pokemon preference 和 translation 都会影响 Web 行为
**When** 数据边界更新
**Then** 每类业务数据只允许一个维护入口
**And** Web 和 tests 必须从 core 读取。

**Given** runtime images 影响素材列表、缩略图和导出
**When** 删除或移动资源
**Then** 必须先通过 asset reference smoke
**And** 证明 Web 素材列表、缩略图、预览和导出不回退。

**Given** 大型 raw/source snapshots 仍可能有审计价值
**When** 它们保留在仓库中
**Then** 必须标注为 reference-only
**And** 不得参与运行时导入或测试真相。

### Story 13.5: Web/Core 复杂度与代码量收敛

**Requirements covered:** FR110, FR113, FR114, NFR53, NFR54.

As a 维护者,
I want 在不改变用户可见行为的前提下降低 Web 和 core 的复杂度,
So that 后续功能和 bugfix 不再集中到少数超大文件。

**Acceptance Criteria:**

**Given** Web 存在超大组件、样式和测试文件
**When** Story 13.5 完成
**Then** 拆分或收敛 `AppShell.tsx`、`styles.css`、大型 component tests 等热点
**And** 不改变 UI 行为。

**Given** dimension、catalog、fixture、i18n display 和 derived selector 逻辑存在重复
**When** 重构完成
**Then** 可共享领域逻辑下沉到 `scene-core`
**And** Web-only 展示逻辑收敛到 web-local helpers。

**Given** Worker-only compatibility wrappers 或 obsolete fixtures 不再可达
**When** dead-code cleanup 运行
**Then** 删除这些代码
**And** 保持 `SceneDocument v1` payload 与 storage key 行为不变。

**Given** 每个拆分点可能影响用户行为
**When** Story 13.5 完成
**Then** 必须有 focused tests 或 existing tests 证明行为不变。

### Story 13.6: 测试与 Release Gate 去配置耦合

**Requirements covered:** FR114, NFR53, NFR54, NFR56.

As a 维护者,
I want 测试像前端一样从业务代码和数据读取事实,
So that 默认尺寸、catalog 或配置变化不会导致测试复制旧常量。

**Acceptance Criteria:**

**Given** 测试需要默认尺寸、legacy 尺寸、catalog ids、footprint 或 stacking facts
**When** Story 13.6 完成
**Then** 测试应从 `createDefaultSceneDocument`、dimension helpers、catalog helpers 或 shared fixtures 派生
**And** 不把当前配置复制成第二套测试真相。

**Given** Worker/MCP/skill 已从本仓库移除
**When** 测试套件更新
**Then** 删除 Worker/MCP/skill tests
**And** 保留的业务契约迁移到 `scene-core` direct-call tests。

**Given** Web component/e2e tests 验证用户可见行为
**When** Story 13.6 完成
**Then** 它们继续覆盖编辑、保存/恢复、导出、17x17 和 legacy 7x7 行为
**And** 不依赖 API/MCP endpoint。

**Given** release gate 运行
**When** `pnpm run release:verify` 执行
**Then** 覆盖 core/web typecheck、unit tests、build、Playwright smoke、file-install smoke 和 asset-reference smoke
**And** 不再默认运行 Worker runtime、MCP smoke 或 skill verify。
