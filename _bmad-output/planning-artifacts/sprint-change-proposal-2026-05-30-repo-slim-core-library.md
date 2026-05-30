# Sprint Change Proposal - 2026-05-30 仓库瘦身与 Scene Core 库化

## 1. Issue Summary

触发变更：Grigri 希望对现有代码库做一次结构性重构，使本仓库只保留 Web 页面和 core 代码；把 core 抽取成可被其他项目通过 `file:` / `file://` 用 pnpm 安装的库；移除 API、MCP 和 Codex skill 代码，这部分在新项目中重新设计；同时降低代码复杂度、代码量、资源重复和测试对固定配置的耦合。

问题类型：Polish 阶段的战略性技术边界收敛 + 已完成 Epic 的方向修正。

产品阶段描述：本产品已经不是 MVP。当前已具备主流程，用户可以完成布景编辑、保存/恢复、预览、导出，并生成所需攻略/导出说明图。下一阶段应按 Polish 阶段描述：目标是收敛仓库边界、降低维护复杂度、提升稳定性和可持续演进能力，而不是继续定义最小可用范围。

当前事实：

- `sprint-status.yaml` 显示 Epic 1-12 均已 done，Epic 7 是 Worker/API/MCP/skill 服务化，Epic 8-12 又把 Worker/MCP/skill parity 作为部分验收边界。已完成 epics 不需要回滚，可以归档为历史基线。
- 根 `package.json` 当前仍把 Worker、MCP smoke、skill verify、worker deploy/dry-run 纳入脚本面。
- 当前 repo 中存在 `apps/web`、`packages/scene-core`、`apps/worker`、`.agents/skills/pokopia-scene-worker`、API/MCP/Worker 验证脚本和大量源素材文件。
- 生产发布边界已在 Architecture 中收敛为 Cloudflare Pages static assets，Worker API/MCP 已被标注为本地适配层而非默认生产发布路径。
- 产品能力已经越过 MVP：主流程可用，并且能生成用户需要的攻略/导出说明；本次重构属于 Polish 阶段的维护性和架构收敛工作。

本 proposal 只规划变更，不修改源码、不修改现有 PRD/Architecture/Epics/tracker。

## 2. Impact Analysis

### Epic Impact

- Epic 7 需要被新的 course correction 覆盖：保留 Story 7.1 的核心抽取成果，但撤销或外迁 Story 7.2-7.5 在本仓库中的长期目标。
- Epic 8-12 中涉及 Web/Worker/MCP/skill parity 的验收语句需要重写为 Web + scene-core parity；Worker/MCP/skill parity 应迁移为新项目的目标。
- 已完成历史不应改写为未完成；应把 Epic 1-12 归档为完成基线，并新增 Epic 13 表达“在完成基线之上做仓库边界重构”。

### PRD Impact

需要新增 course correction 章节，明确：

- 产品阶段从 MVP 改为 Polish：已有主流程和攻略生成能力，当前重点是质量、维护性、复杂度和仓库边界。
- 本仓库目标从 “Web + local service adapters + repo-scoped skill” 收敛为 “Web app + file-installable scene-core library”。
- 终端用户可见 Web 行为不得回退：编辑、保存/恢复、17x17 默认画布、legacy 7x7 恢复、footprint、stacking、层备注、导出预览与图片下载均保持。
- API/MCP/skill 是 developer/agent surface，作为有意外迁的非 Web 用户面，不再由本仓库发布或验证。
- `SceneDocument v1` 继续保持；本次不需要 schema change。

### Architecture Impact

需要更新架构边界：

- `packages/scene-core` 从 workspace-internal package 提升为可被外部项目 `pnpm add file:../path/packages/scene-core` 安装的库。
- `scene-core` package manifest 需要从 `src/index.ts` source export 改成可消费的 build artifact、types、files 白名单和明确 exports。
- 根 workspace 只编排 `apps/web` 与 `packages/scene-core`。
- 删除或外迁 `apps/worker`、`.agents/skills/pokopia-scene-worker`、Worker/MCP/skill verification scripts、Wrangler 依赖和对应 root scripts。
- 数据边界需要从“多份源 CSV/JSON + generated TS + runtime images”收敛为一条可解释的 single source of truth：业务 catalog metadata/overrides 属于 `scene-core`，Web runtime image assets 属于 Web，生成产物不得成为手工维护源。

### UX Impact

终端用户 UX 不应变化。需要保留：

- 当前 Open Design 工作台布局和交互。
- Mobile View-only Mode。
- 图片导出预览和下载。
- 所有错误提示、安全文本、i18n、17x17/legacy 7x7 表达。

需要删除或改写的仅是 developer/agent workflow 文档，不应在终端用户 UI 中出现。

### Technical Impact

主要影响面：

- Package graph：root、`pnpm-workspace.yaml`、`apps/web/package.json`、`packages/scene-core/package.json`、lockfile。
- Build/test：root release scripts、scene-core build 输出、web build 对 core 的依赖方式、file-install smoke。
- Source deletion：`apps/worker/**`、`.agents/skills/pokopia-scene-worker/**`、Worker/MCP/skill scripts。
- Test migration：删除 Worker/MCP tests；把保留测试改为从 `scene-core` default scene、dimension helpers、asset catalog 和 exported constants 派生，不再硬编码某个固定配置作为唯一真相。
- Resource cleanup：审计 2,201 个 tracked asset source files，保留 Web 可见行为需要的 runtime assets；明确 canonical data files 与 generated TS 的生成/验证关系。

## 3. Checklist Status

- [x] 1.1 Trigger story: 无单一触发 story；这是完成 Epic 12 后的仓库方向修正。
- [x] 1.2 Core problem: 本仓库包含 Web、core、Worker/API/MCP、skill、服务化测试和资源源数据，边界超出下一阶段目标。
- [x] 1.3 Evidence: tracker、package scripts、workspace packages、planning docs 和源码目录均显示服务化代码仍在仓库内。
- [x] 2.1 Current epic: 所有现有 epics 已 done，不应在原 epic 内直接重开。
- [x] 2.2 Epic change: 归档 Epic 1-12 完成历史，新增 Epic 13 覆盖仓库瘦身与 core 库化。
- [N/A] 2.3 Remaining epics: 当前无 backlog/in-progress epic。
- [x] 2.4 Obsolete/gap: 本仓库内 Epic 7 的 Worker/API/MCP/skill 方向被外迁，新项目需要单独规划。
- [x] 2.5 Priority: Epic 13 应在任何新功能前执行，避免继续扩大已决定外迁的边界。
- [x] 3.1 PRD conflicts: FR69-FR77、NFR31-NFR36、NFR39/NFR46/NFR49 中的 Worker/MCP/skill parity 需要改写。
- [x] 3.2 Architecture conflicts: monorepo package boundary、deployment、API/MCP、test strategy、asset source strategy 需要更新。
- [x] 3.3 UX conflicts: 终端用户 UX 不变；developer/agent workflow section 需要标记外迁。
- [x] 3.4 Other artifacts: scripts、lockfile、README/docs、manual checklist、skill examples、release verify 均受影响。
- [x] 4.1 Direct adjustment: 可行，新增 Epic 13 并同步规划文档。
- [ ] 4.2 Rollback: 不回滚历史 epics；改为归档 Epic 1-12，并只删除/外迁当前代码和改写未来边界。
- [x] 4.3 Product stage review: 产品不再按 MVP 描述；当前是 Polish 阶段，不削减终端用户主流程，只重新定义 developer/agent surface 和仓库维护边界。
- [x] 4.4 Recommended path: Hybrid，新增重构 epic + 外迁 handoff，不改用户可见行为。
- [x] 5.1-5.5 Proposal components: 本文完成初稿。
- [x] 6.3-6.5 Approval/handoff: Grigri 已用 `A` 批准；已同步 PRD、Architecture、UX、Epics 和 sprint-status，并将 Epic 1-12 归档。

## 4. Recommended Approach

推荐路径：归档 Epic 1-12 已完成历史，把产品描述更新为 Polish 阶段，新增 Epic 13 “仓库瘦身与 Scene Core 库化”，在本仓库完成 Web/Core 边界重构；同时产出 API/MCP/skill 新项目 handoff，但不在本仓库继续实现服务化。

不回滚 Epic 7，因为 Story 7.1 抽出的 `scene-core` 是当前目标的基础；回滚会增加风险。正确做法是把 Epic 1-12 作为已完成历史归档，保留核心抽取成果，删除或外迁 Worker/API/MCP/skill adapter 层。

Scope classification：Major。原因是它改变项目边界、package contract、release gate、测试策略和规划文档，但不要求改变终端用户行为。

## 5. Detailed Change Proposals

### PRD Changes

新增 `Approved Course Correction - 2026-05-30 仓库瘦身与 Scene Core 库化`：

OLD:

```md
新增服务化范围只覆盖无状态 Worker 能力...
Worker/MCP/Codex skill 必须复用同一套 scene-core ...
```

NEW:

```md
本产品已经不是 MVP。主流程已经可用，并且可以生成用户需要的攻略/导出说明图；当前阶段是 Polish，重点是稳定性、维护性、复杂度收敛和仓库边界清理。
本仓库下一阶段收敛为 Web app + file-installable scene-core library。
Worker/API/MCP/Codex skill 从本仓库外迁到新项目重新设计。
终端用户 Web 行为、SceneDocument v1、默认 15x15 / 17x17 尺寸、legacy 7x7 恢复、footprint、stacking、层备注和图片导出体验不得回退。
developer/agent API surface 的兼容性不作为本仓库继续维护目标；外迁项由新项目 PRD/Architecture 定义。
```

### Architecture Changes

需要改写：

- Architecture Summary / Component responsibility。
- API & Communication Patterns。
- Deployment Architecture。
- Source Tree / Module boundaries。
- Testing Strategy。
- Asset / resource source strategy。

核心目标：

- `packages/scene-core` 是外部可安装库，不能依赖 workspace-only TS source export。
- `apps/web` 是唯一 app。
- `apps/worker` 和 `.agents/skills/pokopia-scene-worker` 不再属于本仓库目标结构。
- release gate 最少为 core typecheck/test/build、web typecheck/test/build、web smoke、file-install consumer smoke。

### UX Changes

删除或重写 Developer / Agent Workflow Surface：

- 终端用户工作台不变。
- API/MCP/skill failure 不再是本仓库 UX concern。
- 如需 agent workflow，引用新项目文档，不在本仓库复制规则。

### Epics Changes

归档 Epic 1-12，不改写它们的 done 历史。Active `epics.md` 应保留归档索引/摘要并只承载新的 Epic 13；`sprint-status.yaml` 应归档旧 done 状态后以 Epic 13 backlog 作为当前执行面。

建议归档路径：

- `_bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md`
- `_bmad-output/archive/2026-05-30/implementation-artifacts/sprint-status-epics-1-12-completed.yaml`
- `_bmad-output/archive/2026-05-30/README.md`

## 6. Proposed New Epic and Stories

## Epic 13: 仓库瘦身与 Scene Core 库化

产品已具备主流程和攻略/导出说明生成能力，当前进入 Polish 阶段。本仓库收敛为只维护浏览器 Web 工作台和可被其他项目通过 pnpm `file:` 安装的 `scene-core` 领域库。API、MCP、Codex skill 和 Worker adapter 从本仓库移除，并通过 handoff 文档交给新项目重新设计。终端用户 Web 行为、`SceneDocument v1`、默认 15x15 / 17x17 场景、legacy 7x7 恢复、footprint、stacking、层备注、自动保存和图片导出不得回退。

### Story 13.1: 规划归档与发布边界重写

As a 维护者, I want 归档已完成 epics 并同步 PRD、Architecture、UX、Epics 和 sprint-status 的新仓库边界, So that 后续实现不会继续把 Worker/API/MCP/skill 当成本仓库目标。

Acceptance Criteria:

- Epic 1-12 的完整历史内容从 active `epics.md` 归档到 dated archive，active `epics.md` 只保留归档索引/摘要和 Epic 13。
- 当前 `sprint-status.yaml` 中 Epic 1-12 的 done 状态归档到 dated archive；active tracker 只保留当前项目元信息、归档指针、Epic 13 和 Story 13.1-13.6。
- PRD/Architecture/UX 的产品阶段描述必须从 MVP 更新为 Polish：已有主流程，能够生成所需攻略/导出说明，当前目标是质量和维护性收敛。
- PRD 明确本仓库目标为 Web + scene-core library，并标记 API/MCP/skill 外迁。
- Architecture 删除 Worker/API/MCP 作为本仓库模块的目标结构，保留生产 static Pages 部署边界。
- UX 删除本仓库内 developer/agent workflow surface 的交付要求。
- 文档明确本次不改变 `SceneDocument v1`，除非后续 story 发现必须改 schema 并另行 course correction。

### Story 13.2: Scene Core 可被 pnpm file 安装

As a 下游项目开发者, I want 通过 `pnpm add file:../pokopia-scene-editor/packages/scene-core` 使用 core, So that 新项目可以复用 SceneDocument、catalog、schema、codec、selectors 和 export summary。

Acceptance Criteria:

- `packages/scene-core/package.json` 取消 workspace-only source export，提供可消费的 `exports`、`types`、`files` 和 build output。
- `scene-core` build 生成 JS 和 `.d.ts`，外部消费者不需要编译本仓库 TS 源。
- 保留纯领域边界：不得依赖 React、DOM、localStorage、Worker runtime、Wrangler、MCP SDK 或 web components。
- 新增 file-install smoke，在临时目录用 pnpm 安装 `scene-core` 并 import 关键 API。
- Web app 继续通过 workspace dependency 使用同一 package，不复制 core 规则。

### Story 13.3: 移除本仓库 Worker/API/MCP/Skill 代码

As a 仓库维护者, I want 从本仓库移除 API、MCP、Worker 和 repo-scoped skill, So that 仓库边界和依赖图只服务 Web 与 core。

Acceptance Criteria:

- 删除 `apps/worker/**`、`.agents/skills/pokopia-scene-worker/**`、Worker/MCP/skill 专用验证脚本和 Wrangler/MCP/agents 依赖。
- 根 `package.json` 删除 `worker:*`、`skill:verify`、`worker:mcp:smoke`、`worker:bundle:check` 等脚本；`typecheck`、`test`、`build`、`release:verify` 只覆盖 core/web/file-install smoke。
- `pnpm-workspace.yaml` 仍可保留 `apps/*` / `packages/*` pattern，但实际 tracked app 只有 `apps/web`。
- Web dev/build/deploy 行为保持；Cloudflare Pages static deploy 不回退。
- 生成 handoff 文档列出被移除 endpoint/tool/resource/prompt/script，供新项目重设 API/MCP/skill。

### Story 13.4: 资源与数据 Single Source of Truth 清理

As a 维护者, I want 明确 catalog 数据、override 和 runtime images 的权威来源, So that 后续修改不会在 CSV/JSON/generated TS/runtime assets 之间漂移。

Acceptance Criteria:

- 明确 catalog business metadata 的 canonical source，并记录 generated TS 是否只可由脚本生成。
- Footprint、stacking、dimension、Pokemon preference、translation 等业务数据只允许一个维护入口；Web 和 tests 从 core 读取。
- Runtime image assets 只保留 Web 可见行为需要的文件；任何移除必须先证明素材列表、缩略图和导出不回退。
- 资源校验脚本验证 catalog image references 与 runtime assets 一致。
- 大型 raw/source snapshots 如仍需保留，必须标注为 reference-only，不参与运行时导入和测试真相。

### Story 13.5: Web/Core 复杂度与代码量收敛

As a 维护者, I want 在不改变用户可见行为的前提下降低 Web 和 core 的复杂度, So that 后续功能和 bugfix 不再集中到少数超大文件。

Acceptance Criteria:

- 拆分或收敛超大 Web 组件/测试，例如 `AppShell.tsx`、`styles.css`、大型 component tests，但不改变 UI 行为。
- 重复的 dimension、catalog、fixture、i18n display 和 derived selector 逻辑下沉到 core 或 web-local helper。
- 删除不再可达的 dead code、obsolete fixtures、worker-only compatibility wrappers。
- 保持 `SceneDocument v1` payload 与 storage key 行为不变。
- 每个拆分点有 focused tests 或 existing tests 证明行为不变。

### Story 13.6: 测试与 Release Gate 去配置耦合

As a 维护者, I want 测试像前端一样从业务代码和数据读取事实, So that 默认尺寸、catalog 或配置变化不会导致测试复制旧常量。

Acceptance Criteria:

- 测试不把 15x15、17x17、legacy 7x7、catalog ids、footprint/stacking fixtures 当作手写唯一真相；能从 `createDefaultSceneDocument`、dimension helpers、catalog helpers 或 shared fixtures 派生时必须派生。
- 删除 Worker/MCP/skill tests；保留或迁移其业务契约到 scene-core direct-call tests。
- Web component/e2e tests 继续验证用户可见行为，不依赖 API/MCP endpoint。
- `release:verify` 覆盖 core/web typecheck、unit tests、build、Playwright smoke、file-install smoke 和 asset-reference smoke。
- 测试更新后总量和执行时间有明确目标，避免为了兼容已删除边界保留无效测试。

## 7. New Project Handoff

API/MCP/skill 不在本仓库继续设计。建议新项目单独启动：

- 暂定目标：`pokopia-scene-service` 或 `pokopia-scene-agent-tools`。
- 输入：本仓库 file-installable `scene-core`、Story 13.3 的 endpoint/tool/resource/prompt handoff、当前业务 contract tests。
- 新项目重新决定 HTTP API、MCP transport、auth/rate limit、deployment、logging、versioning 和 skill distribution。
- 新项目不得复制本仓库 core 规则；必须通过 `scene-core` package 依赖调用。

## 8. Risks and Mitigations

- 风险：删除 Worker/MCP/skill 会破坏现有开发者工作流。Mitigation：明确这是有意外迁；先产出 handoff，再删代码。
- 风险：core 改成 build artifact 后 Web 开发体验变差。Mitigation：保留 workspace dev path，新增 watch/build 或 TypeScript project references。
- 风险：资源清理误删素材图片。Mitigation：先做 asset reference smoke 和 Web screenshot/manual QA，再移除。
- 风险：测试去硬编码时覆盖下降。Mitigation：用 shared fixture factories 替代复制常量，不减少用户行为覆盖。
- 风险：SceneDocument schema 被误改。Mitigation：Story 13.1/13.2/13.6 明确要求 v1 roundtrip、legacy recovery 和 storage tests 保持。

## 9. Approval Record

Grigri 已回复 `A` 批准本 Sprint Change Proposal。

已执行：

- 将产品阶段描述更新为 Polish：主流程已可用，并可生成所需攻略/导出说明图。
- 将 Epic 1-12 完成历史归档。
- 将 active implementation root 中遗留的 Epic 9-12 story 文件归档到 `implementation-artifacts/completed-stories/`。
- 将 active `epics.md` 和 `sprint-status.yaml` 收敛到 Epic 13。
- 将 PRD、Architecture 和 UX 同步到 Web + file-installable `scene-core` library 的仓库边界。

Story 13.1 已随本次 course-correction 同步完成；后续实现应从 `13-2-scene-core-file-installable-package` 开始。
