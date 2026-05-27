---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: []
workflowType: 'research'
lastStep: 6
research_type: 'technical'
research_topic: '将 Pokopia Scene Editor 现有前端领域能力抽取为 Cloudflare Worker 后端服务，并暴露 MCP server 与 Codex skill 的技术方案'
research_goals: '评估如何把现有浏览器端领域模型、资产目录、场景序列化、导出摘要等能力抽成可复用后端服务，并设计面向 Codex/MCP 的工具化调用、部署、测试、迁移和风险控制方案。'
user_name: 'Grigri'
date: '2026-05-25'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-05-25
**Author:** Grigri
**Research Type:** technical

---

## Research Overview

本研究围绕“将 Pokopia Scene Editor 现有前端领域能力抽取为 Cloudflare Worker 后端服务，并暴露 MCP server 与 Codex skill”展开，重点分析了当前仓库的 TypeScript/React/Vite 架构、`SceneDocument v1` 数据契约、asset catalog、scene schema、序列化/恢复、短字符串 codec、导出摘要和 command/reducer 边界。研究方法包括本地代码与 BMAD 架构文档审阅、Cloudflare/OpenAI/MCP/OWASP 等官方资料核验、npm registry 版本快照，以及对 API、MCP、部署、测试、成本和风险的交叉评估。

核心结论是：第一阶段不应把产品改造成账号化云平台，也不应把当前浏览器图片导出迁入 Worker。推荐路线是先抽出纯 TypeScript `scene-core`，再用 Cloudflare Workers static assets 提供同域 SPA、`/api/*` 和 `/mcp`，让 HTTP API、MCP tools、Codex skill 和 React UI 共同复用同一领域核心。完整的执行建议、风险清单和 source verification 见文末 `Comprehensive Technical Research Synthesis`。

---

<!-- Content will be appended sequentially through research workflow steps -->

## Technical Research Scope Confirmation

**Research Topic:** 将 Pokopia Scene Editor 现有前端领域能力抽取为 Cloudflare Worker 后端服务，并暴露 MCP server 与 Codex skill 的技术方案

**Research Goals:** 评估如何把现有浏览器端领域模型、资产目录、场景序列化、导出摘要等能力抽成可复用后端服务，并设计面向 Codex/MCP 的工具化调用、部署、测试、迁移和风险控制方案。

**Technical Research Scope:**

- Architecture Analysis - design patterns, frameworks, system architecture
- Implementation Approaches - development methodologies, coding patterns
- Technology Stack - languages, frameworks, tools, platforms
- Integration Patterns - APIs, protocols, interoperability
- Performance Considerations - scalability, optimization, patterns

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-05-25

## Technology Stack Analysis

### Programming Languages

Pokopia Scene Editor 当前已经以 TypeScript 作为主要语言，前端、领域模型、运行时 schema、selector、codec、reducer 和测试都在同一语言体系内。这对抽取 Worker 后端非常有利：`SceneDocument`、`TileInstance`、`BuildingLevel`、资产目录、短字符串 codec 和导出摘要等纯逻辑可先移动到共享 TypeScript 包，再由浏览器 UI 与 Worker/API/MCP 共同调用。Cloudflare Workers 官方也把 TypeScript 作为一等语言，并建议使用 `wrangler types` 生成与 compatibility date、compatibility flags、bindings 匹配的运行时类型；这意味着 Worker 端不应手写 `Env`，而应从 wrangler 配置生成类型。

本研究建议继续坚持 TypeScript，不引入 Python/Rust/Go 作为第一阶段后端语言。原因是当前要迁移的能力并不是 CPU 密集渲染或复杂持久化，而是数据校验、目录查询、场景派生和工具接口编排；语言统一能降低迁移风险，并保留现有 Vitest 覆盖。

_Popular Languages:_ TypeScript 是第一选择；JavaScript 仅作为编译输出；Python/Rust 暂不适合第一阶段。  
_Emerging Languages:_ Cloudflare 已支持 Python Workers、Rust/Wasm 等方向，但本项目没有足够动机在首轮引入。  
_Language Evolution:_ 从浏览器 TypeScript 迁移为 isomorphic/shared TypeScript，然后由 Worker 暴露 HTTP/MCP。  
_Performance Characteristics:_ 当前领域数据规模小于架构文档约束的 1000 个素材、10 个建筑层，TypeScript Worker 足够；PNG 生成中的 DOM/`html-to-image` 不能直接迁移为 Worker 纯逻辑。  
_Sources:_ Local `package.json`; Local `src/domain/scene/types.ts`; Local `src/io/scene-schema.ts`; [Cloudflare Workers TypeScript docs](https://developers.cloudflare.com/workers/languages/typescript/).

### Development Frameworks and Libraries

当前前端栈是 Vite + React + TypeScript，核心运行依赖为 React、React DOM、Zod 和 `html-to-image`，测试依赖为 Vitest、React Testing Library、Playwright 和 TypeScript。Cloudflare Workers 静态资产文档支持将 Worker code 与静态 assets 一起部署，也支持 API 路径先由 Worker 处理、其余请求交给 assets binding；这与现有 Vite SPA 迁移成“同域静态前端 + `/api/*` + `/mcp`”的部署形态匹配。

Worker 端建议分三层：`packages/scene-core` 放纯领域逻辑，`worker/` 放 HTTP API 和 Cloudflare bindings，`mcp/` 或 `worker/mcp.ts` 放 MCP 工具注册。MCP 层可使用官方 TypeScript SDK 的 `McpServer`；部署在 Cloudflare 时优先使用 Agents SDK 的 `createMcpHandler` 提供无状态 Streamable HTTP MCP server。若后续需要跨请求会话、缓存工具调用状态或用户级状态，再评估 `McpAgent` 和 Durable Object。

Hono 等 Worker Web 框架可作为可选项，但第一阶段并非必需。原生 `fetch(request, env, ctx)` + 小型路由已足够承载 `POST /api/scene/validate`、`POST /api/scene/export-summary`、`GET /api/assets` 和 `/mcp`。这样可降低新依赖和 Worker bundle 体积风险。

_Major Frameworks:_ 现有 UI 保持 React/Vite；Worker 侧使用 Wrangler、Cloudflare Workers runtime、`@modelcontextprotocol/sdk`、Cloudflare Agents SDK。  
_Micro-frameworks:_ Hono 可选；首轮建议原生 Fetch handler 或极薄 router。  
_Evolution Trends:_ 从 Cloudflare Pages 静态配置迁移到 Worker static assets + API Worker；MCP 远程连接以 Streamable HTTP 为主。  
_Ecosystem Maturity:_ MCP TypeScript SDK 是官方 Tier 1 SDK；Cloudflare Agents 文档提供 `createMcpHandler` 和 `McpAgent` 两条路径。  
_Sources:_ Local `wrangler.toml`; Local `package.json`; [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare Pages to Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/); [MCP SDKs](https://modelcontextprotocol.io/docs/sdk); [Cloudflare createMcpHandler](https://developers.cloudflare.com/agents/api-reference/mcp-handler-api/); [Cloudflare McpAgent](https://developers.cloudflare.com/agents/api-reference/mcp-agent-api/).

### Database and Storage Technologies

当前目标不是把 Scene Editor 变成账号化云存储产品，而是把前端领域能力抽成服务。第一阶段应保持无数据库：请求携带 `SceneDocument` 或短字符串，Worker 返回 validation、normalized payload、asset query result 或 export summary。这样可以复用现有 `sceneDocumentV1Schema`、`serializeSceneDocument`、`decodeSceneDocumentString`、`buildImageExportSummary`，同时避免引入用户数据保管、鉴权、删除和合规边界。

如果后续需要服务端状态，存储应按用途选择。KV 适合配置、只读索引、版本 manifest 或轻量缓存；R2 适合图片/导出文件/大型资产；D1 适合用户 profile、方案列表、发布记录或可查询元数据；Durable Objects 适合强一致会话、协作编辑、长会话 MCP 状态或需要 SQL-backed per-instance state 的 `McpAgent`。这与 Cloudflare 官方 storage option 的用途划分一致。

_Relational Databases:_ D1 可作为后续方案库、发布记录、用户元数据的 SQLite 关系型存储；第一阶段不需要。  
_NoSQL Databases:_ KV 可保存 catalog version、feature flags、schema metadata 或 MCP session-lite 缓存；不适合强一致编辑状态。  
_In-Memory Databases:_ 不建议在 Worker module global 存放请求状态；Cloudflare Worker 实例复用不等于可靠持久化。  
_Data Warehousing:_ 与当前目标无关；仅在后续做 usage analytics 时考虑 Analytics Engine/Logpush。  
_Sources:_ Local `src/io/scene-schema.ts`; Local `src/io/scene-string-codec.ts`; [Cloudflare storage options](https://developers.cloudflare.com/workers/platform/storage-options/); [Cloudflare KV](https://developers.cloudflare.com/kv/); [Cloudflare D1](https://developers.cloudflare.com/d1/); [Cloudflare R2](https://developers.cloudflare.com/r2/).

### Development Tools and Platforms

本仓库已有可复用质量门禁：`npm run typecheck`、`npm test`、`npm run build`、`npm run smoke`。Worker 化后需要增加两类门禁：一类是共享领域包的 Node/Vitest 单元测试，另一类是 Worker 运行时测试，例如 Wrangler local dev、Cloudflare Workers Vitest integration 或 Miniflare 风格测试。Cloudflare 官方建议 Worker 类型由 `wrangler types` 根据实际配置生成；因此新增 Worker 项目后，应把生成的 `worker-configuration.d.ts` 或等价类型生成步骤纳入 `typecheck`。

工具链版本在 2026-05-25 的本地与 npm 快照：本地 React 19.2.6、Vite 8.0.13、TypeScript 6.0.3、Vitest 4.1.6、Playwright 1.60.0、Zod 4.4.3；npm 查询显示 Wrangler 4.94.0、`@cloudflare/vite-plugin` 1.38.0、`agents` 0.13.2、`@modelcontextprotocol/sdk` 1.29.0、`@cloudflare/workers-types` 4.20260525.1。版本会漂移，实施时以 lockfile 与当日 `npm view`/官方文档为准。

_IDE and Editors:_ 继续使用 TypeScript language service；Cloudflare 类型由 Wrangler 生成，减少 runtime binding 漂移。  
_Version Control:_ 由于当前工作树已有 SEO 未提交改动，后续实施建议为 Worker/MCP 抽取开独立 worktree 或至少独立分支，避免混入。  
_Build Systems:_ 现有 Vite build 保持；新增 Worker build/deploy 由 Wrangler 或 Cloudflare Vite plugin 驱动。  
_Testing Frameworks:_ Vitest 继续覆盖领域逻辑；Playwright 继续覆盖前端；新增 MCP inspector/evals 或工具调用测试验证 MCP schema 与描述质量。  
_Sources:_ Local `package.json`; [Cloudflare Workers TypeScript docs](https://developers.cloudflare.com/workers/languages/typescript/); [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [MCP TypeScript SDK docs](https://ts.sdk.modelcontextprotocol.io/); npm registry queries on 2026-05-25.

### Cloud Infrastructure and Deployment

当前 `wrangler.toml` 只有 `pages_build_output_dir = "./dist"`，说明项目仍是 Pages 静态部署形态。要提供后端服务和远程 MCP，更合理的目标是 Workers static assets：`main = "worker/index.ts"`、`compatibility_date = "2026-05-25"`、`assets.directory = "./dist"`、`assets.binding = "ASSETS"`，并配置 SPA fallback。API 请求由 Worker 处理，静态前端由 assets binding 服务。Cloudflare 文档也明确 Worker 可在同一次部署中组合 Worker code 与静态 assets，并可对未命中 assets 的请求执行 Worker。

远程 MCP 端点建议使用 `/mcp` 或 `/api/mcp`，优先无状态 `createMcpHandler`。这符合 Cloudflare Transport 文档对新 MCP server 的推荐：远程 MCP 使用 Streamable HTTP，SSE 已偏 legacy；如果需要 legacy SSE 或持久会话，再评估 `McpAgent`。内部多 Worker 拆分时，Cloudflare Service Bindings/RPC 可让 Worker 间像调用 JS 方法一样调用，不需要公开 HTTP 绕路；但首轮可以保持单 Worker，等 API/MCP/静态前端边界稳定后再拆。

_Major Cloud Providers:_ Cloudflare Workers 是目标平台；AWS/Azure/GCP 不作为本方案首选。  
_Container Technologies:_ 不需要容器；Worker 的部署和 cold-start/bundle 限制比容器更适合轻量领域服务。  
_Serverless Platforms:_ Workers 承载 API 与 MCP；Pages 形态迁移为 Workers static assets。  
_CDN and Edge Computing:_ 静态素材与 API 同域边缘部署；大图片或导出文件后续可放 R2。  
_Sources:_ Local `wrangler.toml`; [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare Pages to Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/); [Cloudflare MCP overview](https://developers.cloudflare.com/agents/model-context-protocol/); [Cloudflare MCP transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/); [Cloudflare Workers RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/).

### Technology Adoption Trends

本项目的技术采纳不应从“全面后端化”开始，而应从“领域能力产品化”开始。当前最适合抽取的能力是无副作用、可测试、可 JSON 化的函数：资产搜索/过滤、SceneDocument 校验与恢复、短字符串编码/解码、building level/cell selectors、export summary、command simulation。暂不适合抽取的是 DOM 依赖的 PNG 生成、本地 `localStorage` UI preferences、React 组件交互和浏览器事件处理。

Codex skill 层不应复制整个 API schema，而应包装 2-3 个高价值工作流：例如“validate scene payload and explain fixes”、“generate export summary from scene document”、“query catalog assets for a Pokemon/theme”。OpenAI Codex 文档强调 skill 是 `SKILL.md` 加可选 scripts/references/assets 的可复用工作流，并支持与 MCP 搭配；Cloudflare MCP 文档也建议不要把 MCP server 当完整 API schema wrapper，而是围绕具体用户目标设计少量可靠工具。

_Migration Patterns:_ 先 shared package，再 Worker HTTP API，再 MCP tools，再 Codex skill；每一步都复用同一领域测试。  
_Emerging Technologies:_ Remote MCP + Agent Skills 是新集成层；Cloudflare 已提供 Workers 上的 MCP server patterns。  
_Legacy Technology:_ 仅 Pages 静态部署会限制后端能力；SSE MCP transport 仅作为旧客户端兼容选项。  
_Community Trends:_ 对 agent 工具而言，少量高语义工具比大量端点更稳定；skill 用于 Codex 侧工作流编排，MCP 用于外部系统调用。  
_Sources:_ Local `src/domain/`; Local `src/io/`; [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills); [OpenAI Codex customization: Skills](https://developers.openai.com/codex/concepts/customization#skills); [Cloudflare MCP overview](https://developers.cloudflare.com/agents/model-context-protocol/); [MCP SDKs](https://modelcontextprotocol.io/docs/sdk).

## Integration Patterns Analysis

本阶段核验了 Cloudflare Workers 静态资产与 Agents MCP 文档、MCP server concepts/security 文档、OpenAI Codex Skills/MCP 配置文档，以及 GraphQL/gRPC 官方资料。结论是：Pokopia Scene Editor 的后端化不应先追求“完整平台 API”，而应把现有前端领域能力沉淀为一个共享 `scene-core`，再由三类集成层共同调用：浏览器同域 HTTP API、远程 MCP server、Codex skill 工作流。

### API Design Patterns

HTTP API 应采用粗粒度、任务导向的 JSON 端点，而不是围绕数据库实体设计 CRUD。当前仓库的核心能力已经体现在 `src/io/scene-schema.ts`、`src/io/scene-serializer.ts`、`src/io/scene-string-codec.ts`、`src/domain/scene/export-summary.ts`、`src/domain/assets/filters.ts` 和 reducer/command 相关模块里；这些能力天然适合被包装成“校验、恢复、摘要、查询、模拟”接口。

建议第一阶段 API 面如下：

- `POST /api/scene/validate`：输入 `SceneDocument` 或候选 JSON，返回 `ok`、normalized document、errors、warnings、schema version。
- `POST /api/scene/recover`：输入 JSON 文本、对象或短字符串，尝试解析、升级、修复轻微结构问题，返回可解释的修复结果。
- `POST /api/scene/export-summary`：输入 `SceneDocument` 和 locale，返回材料、技能、楼层、网格占用等导出摘要；复用现有 `buildImageExportSummary`。
- `POST /api/scene/encode` 与 `POST /api/scene/decode`：暴露短字符串 codec，用于分享、调试和 agent 传递场景。
- `GET /api/assets?query=&category=&pokemon=&favoriteOnly=&page=`：暴露只读素材目录检索，返回分页结果、catalog version 和可缓存 header。
- 可选 `POST /api/scene/commands/simulate`：输入受限 command 与 scene，返回新 scene/diff；仅在命令 schema 稳定、测试覆盖足够后开放。

MCP 不应机械镜像所有 HTTP 端点，而应暴露更少、更语义化的 agent 工具：

- `validate_scene_document`
- `recover_scene_document`
- `summarize_scene_export`
- `search_pokopia_assets`
- 后续受控加入 `simulate_scene_command`

MCP resources 可作为 agent 上下文入口：`pokopia://schema/scene-document-v1`、`pokopia://catalog/assets`、`pokopia://catalog/pokemon`、`pokopia://examples/default-scene`。MCP prompts 则适合封装高频任务：`repair-scene-document`、`prepare-export-summary`、`find-assets-for-pokemon-room`。OpenAI Codex skill 只负责说明何时调用这些工具、如何解释结果、如何把输出落到项目文件；具体领域判断仍由 Worker/MCP 调用 `scene-core` 完成。

_RESTful APIs:_ 第一阶段采用 HTTPS + JSON 的资源/任务混合风格；读 catalog 用 GET，scene 派生能力用 POST，避免为无状态计算伪造持久资源。  
_GraphQL APIs:_ GraphQL 的强项是灵活查询和 schema introspection，但本项目查询面小、工具消费端更需要稳定 task contracts；第一阶段不建议引入 GraphQL。  
_RPC and gRPC:_ gRPC 适合高性能跨服务 RPC 和多语言生态，但浏览器、Codex MCP、Worker 同域 API 的集成成本不匹配；Cloudflare 内部拆分时可优先评估 Workers RPC/Service Bindings。  
_Webhook Patterns:_ 当前没有外部系统回调需求；仅在后续做异步导出完成通知、发布流程或第三方集成时再引入。  
_Source:_ Local `src/io/scene-schema.ts`; Local `src/domain/scene/export-summary.ts`; [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare MCP Tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/); [MCP server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills); [GraphQL Learn](https://graphql.org/learn/); [gRPC introduction](https://grpc.io/docs/what-is-grpc/introduction/).

### Communication Protocols

主通信协议应保持简单：浏览器 UI 与 Worker 用同源 HTTPS/Fetch；Codex 与远程 MCP server 用 Streamable HTTP；本地调试或早期原型可用 STDIO MCP server，但最终部署目标应是 Cloudflare Worker 上的 `/mcp`。Cloudflare 的 MCP transport 文档将 Streamable HTTP 描述为远程 MCP 的标准方式，并建议新 MCP server 使用 `createMcpHandler`；SSE 仅作为旧客户端兼容路径。

前端请求不需要 WebSocket。现有 Scene Editor 的核心工作流是用户本地交互与同步计算，后端只是校验、摘要、查询和编码；引入长连接会增加状态和恢复复杂度。若未来加入多人协作或长任务进度，再评估 WebSocket、Durable Objects 或 Workflows。

MCP endpoint 建议使用：

- `POST /mcp` 或 `/api/mcp`：Streamable HTTP MCP server，由 `createMcpHandler` 承接。
- `GET /api/health`：部署健康检查，返回 service version、catalog version、schema version。
- 可选 `/api/internal/*`：仅供 Cloudflare service binding/RPC 或后台任务使用，不暴露给公网客户端。

_HTTP/HTTPS Protocols:_ 同源 HTTPS 是前端和 API 的默认协议，可复用浏览器安全模型、Cloudflare cache、Workers static assets。  
_WebSocket Protocols:_ 第一阶段不需要；协作编辑、长会话 agent 或实时进度才有必要。  
_Message Queue Protocols:_ 首轮无异步队列；后续导出渲染、catalog 重建、usage analytics 可考虑 Cloudflare Queues/Workflows。  
_grpc and Protocol Buffers:_ 不建议作为公开集成协议；若将来拆成内部高吞吐服务，优先比较 Workers RPC 与 gRPC 的实际运行边界。  
_Source:_ [Cloudflare MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/); [Cloudflare createMcpHandler](https://developers.cloudflare.com/agents/api-reference/mcp-handler-api/); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp); [Cloudflare Workers RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/).

### Data Formats and Standards

数据格式应以 `SceneDocument` v1 JSON 作为唯一业务真相。当前 Zod schema 已经覆盖 metadata、building levels、tile instances、skill markers、workspace state 以及素材/宝可梦引用校验；Worker 化时应把 schema、serializer、codec 与测试一起迁到共享包，HTTP API 和 MCP 工具都只接受/返回同一套结构。

建议补充两个标准化产物：

- `scene-document-v1.schema.json`：从 Zod 或源码生成/维护，用于 MCP resource、外部文档和客户端校验参考。
- `scene-api-result` envelope：统一返回 `{ ok, data?, errors?, warnings?, meta }`，其中 `meta` 包含 `schemaVersion`、`catalogVersion`、`serviceVersion`、`locale`。

短字符串 codec 仍应作为项目自定义格式保留，但定位是“传输/分享/调试格式”，不是新的领域模型。API 层应在 decode 后立即回到 `SceneDocument` JSON，并通过同一 schema 校验。导出摘要也应是纯 JSON，避免在 Worker 第一阶段生成 PNG、HTML 或二进制文件；现有 `html-to-image` 依赖 DOM，不适合直接迁入 Worker。

_JSON and XML:_ JSON 是主格式；XML 没有本项目消费端需求，不建议引入。  
_Protobuf and MessagePack:_ 二进制序列化对当前场景规模收益不足，会削弱可调试性和 Codex/MCP 可读性。  
_CSV and Flat Files:_ 可用于后续 catalog 离线检查或数据导出，不作为 API 主格式。  
_Custom Data Formats:_ 保留 scene short code，但它必须是 `SceneDocument` JSON 的可逆编码层，而不是分叉模型。  
_Source:_ Local `src/io/scene-schema.ts`; Local `src/io/scene-string-codec.ts`; Local `src/io/image-export.ts`; [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/); [Cloudflare MCP Tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/).

### System Interoperability Approaches

系统互操作应采用“共享核心 + 薄适配器”。`packages/scene-core` 提供纯 TypeScript 函数；`worker/` 把函数包装成 HTTP API；`worker/mcp.ts` 或 `mcp/` 把同一函数包装成 MCP tools/resources/prompts；`.agents/skills/pokopia-scene-worker` 或未来插件中的 Codex skill 只描述工作流和调用策略。这样可以避免三层接口各自实现校验、摘要和检索逻辑。

部署上，Cloudflare Worker 可同时处理静态 assets 和 API routing：`/api/*` 与 `/mcp` 由 Worker 处理，其他路径走 SPA 静态资源与 fallback。这比继续停留在 Pages-only 配置更适合后端能力暴露，也能保持同域调用，减少 CORS 与环境配置复杂度。

MCP interoperability 设计：

- Tools 只执行明确动作，返回结构化 JSON 和简短 explanation。
- Resources 提供稳定只读上下文，避免每次 tool call 都重复传大 schema/catalog。
- Prompts 封装高频 agent 工作流，但不替代工具输入校验。
- Codex skill 的 `agents/openai.yaml` 可声明 MCP dependency，让用户安装/启用时知道需要远程 MCP server。

_Point-to-Point Integration:_ SPA 直接调用同域 Worker API；Codex 直接连远程 MCP endpoint。  
_API Gateway Patterns:_ 单 Worker 充当轻量 gateway，统一路由、校验、cache、auth 和错误 envelope。  
_Service Mesh:_ 不适合第一阶段；服务数量和网络拓扑都不足以支持该复杂度。  
_Enterprise Service Bus:_ 与本产品规模和目标不匹配。  
_Source:_ [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare Pages to Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/); [MCP server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills).

### Microservices Integration Patterns

第一阶段不应拆成多服务，而应采用模块化单 Worker：`scene-core` 是共享领域库，Worker 是唯一部署单元，API 和 MCP 是两个入口。这比提前拆 `catalog-service`、`scene-service`、`mcp-service` 更容易保持 schema 一致和测试闭环。

未来只有在以下条件出现时才拆服务：

- catalog 生成/索引变成独立发布流水线，需要缓存、增量构建或后台任务。
- PNG/图片导出迁移到服务端，需要 R2、Browser Rendering、队列或独立渲染 worker。
- 多人协作或持久 session 需要 Durable Object 分区。
- MCP 需要长期 session state、elicitation/sampling 或用户级工具权限。

拆分后，公开 API 仍应保持单一入口；内部 Worker 间优先使用 Cloudflare Service Bindings/RPC，而不是经公网 HTTP 回环。这样能把公共 API 稳定性和内部模块演进分开。

_API Gateway Pattern:_ 单 Worker 入口承担 gateway 职责；后续内部服务通过 binding 隐藏在网关后。  
_Service Discovery:_ Cloudflare bindings 静态配置即可；无需运行时 service discovery。  
_Circuit Breaker Pattern:_ 第一阶段无下游依赖；后续调用 R2/D1/外部模型或渲染服务时再加 timeout、retry budget 和降级结果。  
_Saga Pattern:_ 当前无跨服务事务；仅当出现账号化保存、发布、异步导出等多步骤持久流程时再考虑。  
_Source:_ [Cloudflare Workers RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/); [Cloudflare storage options](https://developers.cloudflare.com/workers/platform/storage-options/); [Cloudflare McpAgent](https://developers.cloudflare.com/agents/api-reference/mcp-agent-api/).

### Event-Driven Integration

当前目标是把前端领域能力服务化，并给 Codex/MCP 可调用接口；它本质是同步请求/响应，不需要事件驱动架构。过早加入 pub/sub、event sourcing 或 CQRS 会扩大状态面，也会把一个可验证的纯函数迁移任务变成分布式系统设计。

后续可以引入事件的场景很明确：

- 异步服务端图片/压缩包导出：API 创建任务，Queue/Workflow 执行，R2 保存结果。
- catalog 重新生成：素材源变更后触发索引任务，更新 KV/R2 manifest。
- usage analytics：只记录匿名聚合事件，不记录 raw scene payload。
- 发布/分享流程：用户发布 scene 时生成 audit event 和可回滚记录。

即使引入事件，也应保持 `SceneDocument` 为事实输入，event payload 只包含任务 id、版本、引用和最小元数据，避免在日志/队列里复制完整用户场景。

_Publish-Subscribe Patterns:_ 暂不需要；后续可用于 catalog 更新通知或导出完成通知。  
_Event Sourcing:_ 不适合第一阶段；SceneDocument 已是当前状态模型，事件溯源会增加编辑历史和迁移成本。  
_Message Broker Patterns:_ Cloudflare Queues/Workflows 可作为后续异步任务基础，但不是首轮依赖。  
_CQRS Patterns:_ 当前查询和命令都很轻；只在持久化、多用户、复杂索引出现后评估。  
_Source:_ [Cloudflare Agents queue tasks](https://developers.cloudflare.com/agents/api-reference/queue-tasks/); [Cloudflare Workflows](https://developers.cloudflare.com/workflows/); [Cloudflare R2](https://developers.cloudflare.com/r2/).

### Integration Security Patterns

安全边界应按数据敏感度分层。素材目录、schema、示例 scene 等只读公共资源可以匿名访问并强缓存；`validate`、`export-summary`、`encode/decode` 如果不持久化、不调用外部系统，也可以匿名开放，但必须限制 body size、严格 Zod 校验、统一错误返回、禁止默认记录 raw scene payload。任何会写入、发布、保存、生成可公开 URL 或访问用户私有数据的端点都需要鉴权。

MCP 的安全边界更严格，因为 agent 工具可能被自动调用。远程 MCP server 若只暴露只读 catalog/search/schema，可允许无鉴权或低风险 bearer token；一旦加入 scene 修改、持久保存、发布、删除或私有数据访问，应使用 OAuth 或 Cloudflare Access/JWT，并在 Codex 配置中通过 `enabled_tools`、`disabled_tools`、`default_tools_approval_mode`、per-tool approval 控制工具权限。MCP 官方安全建议也要求服务端防范 confused deputy、token passthrough、session hijacking 和未验证 redirect 等问题；因此不能把用户 token 原样转发给下游服务，也不应在 URL query 中传密钥。

实施建议：

- 对所有 POST 设置 body size 上限，例如首轮 256KB 或按 SceneDocument 实测放宽。
- 对 scene 输入运行 schema parse + domain validation，不信任客户端传来的 asset id、pokemon id、level ref。
- 对错误消息做结构化但不泄露内部堆栈。
- 对公共 GET 设置 cache policy，并用 catalog/schema version 作为 invalidation 基础。
- 不在 `wrangler.toml` 明文提交 secrets；使用 Cloudflare secrets 或平台绑定。
- 记录审计日志时只存 request id、schema version、工具名、错误类别和耗时，默认不存完整 scene。

_OAuth 2.0 and JWT:_ 适合远程 MCP 私有工具、账号化保存和发布流程；Codex Streamable HTTP MCP 支持 bearer token 与 OAuth。  
_API Key Management:_ 可用于内部或早期受限访问，但要通过环境变量/secrets 管理并支持轮换。  
_Mutual TLS:_ 第一阶段不需要；如果未来做企业私有部署或服务间强身份认证再评估。  
_Data Encryption:_ 公网传输依赖 HTTPS；持久化前再评估 R2/D1/KV 数据最小化、访问控制和 retention。  
_Source:_ [OpenAI Codex MCP](https://developers.openai.com/codex/mcp); [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices); [Cloudflare MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/); [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/).

## Architectural Patterns and Design

本阶段的架构研究覆盖三类资料：本仓库已批准的 Architecture/Course Correction、Cloudflare Workers/Static Assets/Durable Objects/MCP 官方文档、MCP 与 Codex skill 官方文档，以及 ports-and-adapters、云设计模式和 OWASP API Security 的权威资料。关键判断是：这不是一次“把 SPA 改成全栈产品”的架构重写，而是一次领域核心抽取。最小可行架构应让现有前端继续工作，同时新增一个无状态 Worker 服务面和一个远程 MCP 面，三者共享同一套领域核心。

### System Architecture Patterns

推荐目标架构是 **modular monolith at the edge + ports and adapters**：`scene-core` 作为领域核心，HTTP API、MCP server、Codex skill 和 React UI 都是外层 adapter。Alistair Cockburn 的 ports-and-adapters 模式强调应用核心应能脱离 UI 和数据库运行、测试，并通过多个 port 被不同 adapter 驱动；这与 Pokopia 的现状高度吻合，因为 `SceneDocument` 校验、资产查询、序列化、短码 codec 和导出摘要本来就是纯 TypeScript 能力。

建议分层如下：

- `packages/scene-core/`：领域模型、Zod schema、serializer/recovery、asset filtering、export summary、command simulation use cases；不得 import React、DOM、Cloudflare runtime、MCP SDK。
- `src/`：保留现有 React/Vite SPA，逐步改为从 `scene-core` 读取领域函数；UI-only state、localStorage preferences、DOM image export 仍留在浏览器。
- `worker/`：Cloudflare Worker adapter，负责 request routing、body limit、auth/cache headers、error envelope、assets fallback。
- `worker/mcp.ts` 或 `mcp/`：MCP adapter，注册 tools/resources/prompts，并调用 `scene-core` use cases。
- `.agents/skills/pokopia-scene-editor/` 或未来 plugin skill：Codex 工作流说明，声明 MCP 依赖，约束 agent 如何使用工具和解释结果。

第一阶段应保持单 Worker 部署单元，而不是拆微服务。Cloudflare Workers Static Assets 支持 Worker code 与静态 assets 一起部署，并可对 `/api/*`、`/mcp` 等路径先运行 Worker；这适合把当前 Pages-only 静态部署迁移为“同域 SPA + API + MCP”。只有当服务端图片渲染、协作编辑、持久 session 或 catalog 构建变成独立扩展压力时，才考虑 Durable Objects、R2、KV、D1、Queues 或多 Worker。

_Source:_ Local `_bmad-output/planning-artifacts/architecture.md`; Local `src/domain/`; Local `src/io/`; [Alistair Cockburn: Hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture); [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/).

### Design Principles and Best Practices

核心设计原则是 **单一领域事实、薄适配器、显式边界、可测试迁移**。

`SceneDocument` 继续作为业务事实来源。当前 Architecture 已要求画布、检查器、建筑层、预览、保存/恢复和图片导出都从同一个 scene state 派生；后端化后也应保持这个约束。Worker 不应引入一个“服务端 Scene 模型”，MCP 也不应定义一套 agent-only schema。所有接口都应回到 `SceneDocument v1`、asset catalog 和 shared selectors/use cases。

领域核心应以 use case 为中心，而不是暴露内部模块细节。可定义如下应用层函数：

- `validateSceneDocument(input): Result<ValidatedScene, SceneValidationError[]>`
- `recoverSceneDocumentInput(input): Result<RecoveredScene, RecoveryError[]>`
- `summarizeSceneExport(scene, options): Result<ExportSummary, ExportError[]>`
- `searchAssets(query): AssetSearchResult`
- `encodeSceneDocument(scene): Result<SceneCode, CodecError[]>`
- `decodeSceneDocument(code): Result<SceneDocument, CodecError[]>`
- `simulateSceneCommand(scene, command, context): Result<SceneCommandPreview, CommandError[]>`

适配器只做转换：HTTP adapter 把 `Request` 转成 use case input；MCP adapter 把 tool call 转成 use case input；Codex skill 把用户意图转成工具调用步骤。错误模型沿用现有 typed Result 思路，避免把用户可修复错误变成异常。所有 adapter 都必须共享同一个 Zod schema 和 domain validation，防止“浏览器能过、Worker 失败”或“MCP 能产出但 UI 无法恢复”的分叉。

_Source:_ Local `_bmad-output/planning-artifacts/architecture.md`; Local `src/io/scene-schema.ts`; Local `src/state/scene-reducer.ts`; [MCP server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills); [Alistair Cockburn: Hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture).

### Scalability and Performance Patterns

第一阶段的扩展模式应是无状态横向扩展：每个请求携带 scene 或查询参数，Worker 计算后返回结果，不写数据库。Cloudflare Workers 会在边缘处理请求，静态 assets 由 Cloudflare 自动缓存；对本项目来说，catalog/schema/examples 这类只读资源是最有价值的缓存对象，scene validation/export summary 这类用户 payload POST 不应默认缓存。

性能边界应围绕现有 NFR 和 Workers 限制设计：

- `scene-core` 函数保持 O(levels * cells + instances) 或 O(catalog) 的可解释复杂度。
- `GET /api/assets` 返回分页或 top-N 结果，避免把整个 catalog 每次发给 agent。
- `POST /api/scene/*` 设置项目级 body size 上限，虽然 Cloudflare plan 级 request body 限制远高于当前需求。
- Worker bundle 不应打入 DOM/image export、React、Playwright fixtures 或大量原始图片；Cloudflare Workers limits 文档也建议大配置、静态资产和二进制数据放 KV/R2/D1/Static Assets，而不是塞进 Worker bundle。
- Cache API 可用于精细缓存，但其缓存是数据中心本地，不应被当成全局一致存储；catalog version/ETag 与静态 assets cache 更适合首轮。

如果后续出现更大 catalog 或服务端导出，扩展路径应先选择合适的 Cloudflare 原生存储：KV 放 manifest/只读索引，R2 放图片或导出文件，D1 放可查询 metadata，Durable Objects 放协作会话或 MCP session state。不要在无持久化需求前引入这些服务。

_Source:_ Local `_bmad-output/planning-artifacts/architecture.md`; [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/); [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/); [Cloudflare storage options](https://developers.cloudflare.com/workers/platform/storage-options/).

### Integration and Communication Patterns

集成架构应保持两条公开入口和一个共享核心：

- Browser -> `/api/*` -> HTTP adapter -> `scene-core`
- Codex/MCP client -> `/mcp` -> MCP adapter -> `scene-core`
- Browser local UI -> direct import from `scene-core`

Cloudflare MCP transport 文档明确把 Streamable HTTP 作为远程 MCP 的标准传输，并建议新 MCP server 使用 `createMcpHandler`；因此 `/mcp` 应优先无状态 `McpServer + createMcpHandler`。如果后续需要跨请求 session state、elicitation、sampling 或长期 agent 会话，再引入 `McpAgent` 和 Durable Object storage。Cloudflare 文档也把 RPC transport 定位为 Cloudflare 内部 agent/MCP 之间的连接；它不支持 auth，不应作为 Codex 外部连接入口。

HTTP API 与 MCP tools 的职责不同。HTTP API 适合前端和自动化脚本稳定调用；MCP tools 适合 agent 语义操作。两者可以有一对多映射，例如 `recover_scene_document` MCP tool 可能内部调用 decode、parse、validate、normalize 多个 use case，但不应把内部步骤暴露给用户。

_Source:_ [Cloudflare MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/); [Cloudflare createMcpHandler](https://developers.cloudflare.com/agents/api-reference/mcp-handler-api/); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp); [MCP server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts); [Cloudflare Workers RPC](https://developers.cloudflare.com/workers/runtime-apis/rpc/).

### Security Architecture Patterns

安全架构应采用最小权限和最小数据保留。公开只读资源如 schema、examples、catalog search 可以匿名访问并强缓存；涉及用户 scene payload 的 POST 可以在无持久化阶段匿名开放，但必须默认不记录 raw payload，并有 body size、content-type、schema parse、domain validation、错误脱敏和 rate limiting 策略。任何持久化、发布、删除、账号化或私有资源访问都应作为新的安全边界单独设计，不应随手接到现有匿名 API 上。

MCP server 的风险高于普通 API，因为工具可能由 agent 调用并组合执行。MCP 安全实践要求防范 confused deputy、token passthrough、session hijacking 和不安全 redirect；Codex MCP 配置则支持 bearer token、OAuth、tool allow/deny list 和 approval mode。架构上应把工具分级：

- Public/read-only：`search_pokopia_assets`、schema/catalog resources，可匿名或低风险 token。
- User payload/no persistence：`validate_scene_document`、`summarize_scene_export`，可匿名但严格限制 payload 和日志。
- Mutating/persistent：`simulate_scene_command` 的真实写入版、保存、发布、删除，必须鉴权且默认需要 Codex approval。

OWASP API Security Top 10 2023 也提示 API 架构要关注 broken authorization、resource consumption、security misconfiguration、SSRF 和 unsafe consumption of APIs。本项目首轮不应允许 Worker 根据用户输入任意 fetch URL，不应把 scene 中的 URL 当可信资源抓取，也不应在错误里暴露堆栈或内部配置。

_Source:_ [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp); [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x00-header/); [OWASP API10 Unsafe Consumption of APIs](https://owasp.org/API-Security/editions/2023/en/0xaa-unsafe-consumption-of-apis/); [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/).

### Data Architecture Patterns

数据架构仍以 `SceneDocument v1` 为中心，不引入数据库作为第一阶段依赖。需要明确三类数据：

- Canonical domain data：`SceneDocument`、asset catalog、pokemon catalog、schema version、catalog version。
- Derived data：export summary、asset search result、preview/render input、validation diagnostics。
- UI-only/client data：panel state、search text、favorite-only、localStorage preferences、export modal open state。

Worker 和 MCP 只能接收 canonical input 并返回 derived output；UI-only data 不应进入 API、MCP 或 `SceneDocument`。图片导出仍是浏览器 DOM/Blob/download 能力，Worker 第一阶段只提供摘要和 render input，不提供 `html-to-image` 等 DOM 依赖生成。

建议为数据架构新增版本化约束：

- `SCENE_SCHEMA_VERSION = 1`
- `CATALOG_VERSION` 从 asset/pokemon source 生成或手动维护
- `SERVICE_VERSION` 来自 package version 或 git sha
- API/MCP 每个响应都返回 `meta.schemaVersion`、`meta.catalogVersion`、`meta.serviceVersion`

如果未来引入持久化，仍应先保留 `SceneDocument` 作为用户可携带 payload；D1/R2/KV 只是存储和索引实现，不改变领域模型。Durable Objects 只适合需要强一致会话或协作协调的边界，不适合作为普通 scene validation 的默认存储。

_Source:_ Local `src/domain/scene/types.ts`; Local `src/io/scene-schema.ts`; Local `src/domain/scene/export-summary.ts`; [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/); [Cloudflare D1](https://developers.cloudflare.com/d1/); [Cloudflare KV](https://developers.cloudflare.com/kv/); [Cloudflare R2](https://developers.cloudflare.com/r2/).

### Deployment and Operations Architecture

部署架构建议从当前 `pages_build_output_dir = "./dist"` 迁移到 Workers static assets 配置：`main = "worker/index.ts"`、`compatibility_date` 固定到实施日期、`assets.directory = "./dist"`、`assets.binding = "ASSETS"`、`assets.not_found_handling = "single-page-application"`，并用 `assets.run_worker_first = ["/api/*", "/mcp"]` 或等价路由确保 API/MCP 先进入 Worker。这样可以保留 SPA fallback，并让前端、API、MCP 同域发布。

运营门禁应在现有质量门禁上增加 Worker/MCP 专项检查：

- `npm run typecheck` 覆盖 shared core、worker env 类型和 MCP tool schema。
- `npm test` 覆盖 scene-core use cases、HTTP adapter、MCP tool handler。
- `npm run build` 继续产出 Vite `dist/` 并运行 runtime asset verification。
- `wrangler deploy --dry-run --outdir ...` 或等价命令检查 Worker bundle size、bindings 和 static assets。
- MCP smoke 测试至少调用 `search_pokopia_assets`、`validate_scene_document`、`summarize_scene_export`。
- Playwright 继续验证浏览器端编辑/导出行为，确保迁移 shared core 后 UI 语义未漂移。

可观测性保持克制：`GET /api/health` 返回版本、schema、catalog 和 deployment metadata；日志记录 request id、route、tool name、status、duration、error code，不记录完整 scene。Cloudflare Workers 的 log size 有限制，且 raw scene payload 可能含用户自定义文本；因此日志默认做摘要化。

上线策略应分阶段：先把 shared core 提取并保持前端 green；再以 Worker local/dev 暴露 API；再加 MCP endpoint；最后写 Codex skill。每一阶段都要能回滚到上一阶段，避免把 UI 迁移、部署迁移、MCP 工具和 skill 分发压成一个不可验证的大改动。

_Source:_ Local `wrangler.toml`; Local `package.json`; [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare Pages to Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/); [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/); [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills).

## Implementation Approaches and Technology Adoption

本阶段核验了 Cloudflare Workers Vite plugin、Workers TypeScript、Workers Vitest integration、Cloudflare remote MCP testing、OpenAI Codex Skills/MCP 配置、Strangler Fig 迁移模式，以及本仓库当前 `package.json`、Vite/Vitest/Playwright 配置和领域模块测试分布。结论是：实施应采用渐进式抽取，而不是一次性把 Scene Editor 改成全栈系统。

### Technology Adoption Strategies

采用 **Strangler Fig / incremental modernization** 策略：先在现有系统里建立可替换边界，再逐步把边界内能力迁到新运行环境。Microsoft Azure Architecture Center 对 Strangler Fig 的描述是逐步替换具体功能、让旧系统继续服务未迁移能力；Martin Fowler 也强调应先明确目标、拆小、交付小块并调整组织/开发方式。对 Pokopia Scene Editor 来说，“旧系统”不是遗留后端，而是浏览器内的领域能力；迁移目标不是替换 UI，而是把可复用能力从 UI 环境中抽出来。

建议采用 5 个阶段：

1. **Domain inventory and purity audit**：确认哪些模块可迁移到 Worker。优先候选是 `src/domain/scene/*`、`src/domain/assets/*`、`src/io/scene-schema.ts`、`scene-serializer`、`scene-string-codec`、`scene-recovery`、`scene-roundtrip`、`export-summary`。暂不迁移 `src/io/image-export.ts` 中依赖 `html-to-image`/DOM 的能力。
2. **Shared core extraction**：创建 `packages/scene-core` 或先用 `src/scene-core` 过渡，把纯领域函数从浏览器路径中抽出；React UI 和测试都改为从 shared core import，保持现有 UI 行为不变。
3. **Worker HTTP API adapter**：新增 `worker/index.ts` 和 `/api/*`，只做 JSON parsing、body limit、result envelope、cache/auth headers 与 `scene-core` 调用。
4. **Remote MCP adapter**：新增 `/mcp`，使用 `McpServer` 和 Cloudflare Agents `createMcpHandler` 注册少量工具、资源和 prompts。
5. **Codex skill packaging**：新增 repo skill 或插件化 skill，描述 workflow、引用 MCP tools，并提供示例输入/输出和失败处理说明。

不建议第一阶段同时引入数据库、账号、分享链接、云保存、多人协作或服务端图片渲染。这些属于新的产品能力，会扩大合规、安全和状态边界。

_Source:_ Local `src/domain/`; Local `src/io/`; [Microsoft Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig); [Martin Fowler: Strangler Fig](https://martinfowler.com/bliki/StranglerFigApplication.html); [Cloudflare React SPA with an API](https://developers.cloudflare.com/workers/vite-plugin/tutorial/); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills).

### Development Workflows and Tooling

本仓库当前脚本为 `dev`、`preview`、`typecheck`、`test`、`build`、`smoke`，且 Vite build 已包含 runtime asset verification。实施 Worker/MCP 后应扩展而不是替换这些门禁。

建议新增开发脚本：

- `generate:worker-types`: `wrangler types`
- `typecheck`: 先运行或校验 generated Worker types，再运行 `tsc -b`
- `test:worker`: 运行 Cloudflare Workers Vitest integration 覆盖 Worker adapter
- `test:mcp`: 以本地 Worker endpoint 或 handler 测试 MCP tools/resources
- `dev:worker`: 使用 Cloudflare Vite plugin 或 Wrangler 本地运行同域 SPA + API + MCP
- `deploy:dry-run`: 使用 Wrangler dry-run/outdir 类命令检查 bundle 与 bindings

依赖建议：

- `wrangler`
- `@cloudflare/vite-plugin`
- `agents`
- `@modelcontextprotocol/sdk`
- `@cloudflare/vitest-pool-workers`

2026-05-25 npm registry 快照：`wrangler 4.94.0`、`@cloudflare/vite-plugin 1.38.0`、`agents 0.13.2`、`@modelcontextprotocol/sdk 1.29.0`、`@cloudflare/vitest-pool-workers 0.16.9`。实际实施时应以 lockfile 和当天 npm/官方文档为准。

Cloudflare TypeScript 文档建议通过 `wrangler types` 根据 Wrangler 配置生成运行时和 Env 类型，并在 CI 中运行 `wrangler types --check` 或生成后再 build/test。Cloudflare Vite plugin 的 React SPA with API 教程也说明可给现有 Vite/React 项目加入 `@cloudflare/vite-plugin` 和 `wrangler`，并让插件读取根目录的 Wrangler 配置。

_Source:_ Local `package.json`; Local `vite.config.ts`; Local `tsconfig*.json`; [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/); [Cloudflare React SPA with an API](https://developers.cloudflare.com/workers/vite-plugin/tutorial/); [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).

### Testing and Quality Assurance

测试策略应按边界分层：

- **scene-core unit tests**：继续使用 Vitest，迁移现有 `src/domain/**.test.ts`、`src/io/scene-*.test.ts`、`src/state/*.test.ts` 中与 React/DOM 无关的用例。
- **browser component/e2e tests**：继续使用 jsdom/React Testing Library 与 Playwright，确认 UI 在引用 shared core 后没有行为漂移。
- **Worker adapter tests**：使用 Cloudflare Workers Vitest integration，在 Workers runtime 内测试 `fetch` handler、bindings、headers、body limit、error envelope。
- **MCP tool tests**：直接测试 tool handler 的 input schema、output shape、error reporting；再用 MCP Inspector 对本地 `/mcp` 做连接和 list tools smoke。
- **contract tests**：用固定 fixtures 覆盖 `SceneDocument v1`、short code、catalog search、export summary 的 HTTP API 与 MCP 工具输出一致性。

Cloudflare Workers Vitest integration 官方说明它可在 Workers runtime 内运行 unit/integration tests，提供 runtime APIs/bindings、per-test-file isolated storage，并基于 Miniflare 本地运行。Cloudflare remote MCP testing 文档则推荐用 `npx @modelcontextprotocol/inspector` 连接本地或远程 `/mcp`，查看 tools 是否暴露并执行调用。

需要新增的关键验收用例：

- `validate_scene_document` 与 `POST /api/scene/validate` 对同一 fixture 返回一致 errors/warnings。
- `summarize_scene_export` 与 `buildImageExportSummary` 对多层、有技能、有染色、有外围区素材的 scene 一致。
- `search_pokopia_assets` 不返回超出 page/top-N 限制的大 payload。
- Worker 不把 React、`html-to-image`、Playwright 或大型图片源打入后端 bundle。
- 错误响应不包含 stack trace、不记录 raw scene payload。

_Source:_ Local `src/domain/**/*test.ts`; Local `src/io/**/*test.ts`; Local `e2e/workbench-smoke.spec.ts`; [Cloudflare Workers Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/); [Cloudflare Test a Remote MCP Server](https://developers.cloudflare.com/agents/guides/test-remote-mcp-server/); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp).

### Deployment and Operations Practices

部署实践建议从 “Pages-only static site” 迁移到 “Workers static assets + Worker script”。当前 `wrangler.toml` 只有 `pages_build_output_dir = "./dist"`；目标应改为一个 Worker 入口、static assets directory、SPA fallback，以及 `/api/*`、`/mcp` 的 Worker-first routing。

推荐部署步骤：

1. 本地先保持现有 Pages/static build green。
2. 新增 Worker entry 和 static assets 配置，但 Worker 只实现 `/api/health`。
3. 接入 `/api/scene/validate` 和 `/api/assets`，在本地和 preview 环境验证。
4. 接入 `/mcp`，先暴露只读 tools/resources。
5. 用 Cloudflare gradual deployments/rollback 能力或分支环境降低发布风险。

运行期可观测性保持低成本：

- `GET /api/health` 返回 service version、schema version、catalog version。
- 日志记录 route/tool、status、duration、error code、request id，不记录完整 scene。
- 对公开 GET 设置 cache headers；POST 默认 no-store。
- 对 Worker bundle size、CPU duration、error rate 和 request count 建基本观察。

CI/CD 可用 GitHub Actions 加 Cloudflare `wrangler-action` 部署，但应把 Cloudflare token/account id 保存在 GitHub secrets，不进入 repo。若只是本地或手动部署阶段，可以先保留 `npm run deploy` 手动命令，等 API/MCP 稳定后再加入 CI 部署。

_Source:_ Local `wrangler.toml`; Local `scripts/verify-runtime-assets.mjs`; [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [Cloudflare Pages to Workers migration](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/); [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/); [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

### Team Organization and Skills

实施需要的技能组合不大，但边界要求严格：

- **Frontend/domain maintainer**：理解现有 `SceneDocument`、selector、reducer、export summary 和 UI-only state 边界。
- **Cloudflare Worker implementer**：熟悉 Wrangler、Worker runtime、static assets、bindings、body/cache/header、安全限制。
- **MCP/tool designer**：能把 API 能力改写成少量 agent 友好的 tools/resources/prompts，而不是直接暴露完整内部 API。
- **Codex skill author**：能写清楚触发条件、输入输出、工具依赖、失败处理和示例 prompt。
- **QA/release owner**：维护 fixture、contract tests、Playwright smoke 和 deployment checks。

初期可以由同一名工程师承担多个角色，但必须通过文档和测试把决策固定下来。Codex skill 本身建议保持 repo-scoped，先放 `.agents/skills`；当 MCP server 稳定、想给其他项目或团队复用时，再按 OpenAI 文档建议打包为 plugin。

_Source:_ Local `_bmad-output/planning-artifacts/architecture.md`; [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp); [Cloudflare Remote MCP server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/).

### Cost Optimization and Resource Management

成本优化的核心是避免把简单无状态服务设计成有状态平台。Cloudflare Workers pricing 文档显示 static assets 请求免费且不限量；动态 Worker 请求和 CPU 才是主要计费面。因此第一阶段应让静态 UI、图片资产和 catalog 静态资源尽量走 static assets/cache，只让 `/api/*` 和 `/mcp` 进入 Worker code。

具体策略：

- 不引入 D1/KV/R2/DO，除非出现明确持久化、索引或文件存储需求。
- catalog/search 使用构建时静态数据和 HTTP cache，避免每次请求读取外部存储。
- POST payload 限制在 SceneDocument 合理范围内，避免 agent 误传大文件。
- MCP tools 返回摘要和分页结果，不返回整个 catalog 或完整图片资源。
- Worker bundle 排除 React、DOM image export、测试 fixtures 和 runtime source images。
- server-side image rendering 延后；当前图片导出仍留在浏览器，Worker 只负责 JSON 摘要。

如果未来加入服务端图片导出，成本评估要单独覆盖 Browser Rendering/Images/R2/Queues/Workflows，而不是混入当前无状态 API 成本模型。

_Source:_ [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/); [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/); [Cloudflare storage options](https://developers.cloudflare.com/workers/platform/storage-options/); Local `vite.config.ts`.

### Risk Assessment and Mitigation

主要风险和缓解方案：

- **领域逻辑双写**：HTTP、MCP、React 各自实现校验/摘要。缓解：所有 adapter 只调用 `scene-core`；新增 contract tests。
- **迁移破坏现有 UI**：抽 core 时改动 import 和模块边界导致行为漂移。缓解：先只搬纯函数，保留现有组件测试和 Playwright smoke。
- **Worker bundle 污染**：把 React、`html-to-image`、DOM 或图片源打入 Worker。缓解：单独 `tsconfig.worker.json`、bundle analyzer/dry-run、import lint。
- **MCP tool 过细**：agent 需要多轮低级调用才能完成任务。缓解：以 use case 设计工具，少量高语义工具优先。
- **安全与隐私外溢**：日志记录 raw scene、错误暴露 stack、MCP 无权限边界。缓解：结构化错误、日志最小化、tool allowlist、mutating tools 延后并加鉴权。
- **过早持久化**：为了“后端服务”引入数据库/账号/云保存。缓解：第一阶段明确无状态；持久化作为新 epic/PRD 处理。
- **版本漂移**：Cloudflare/MCP/Codex API 更新较快。缓解：锁定依赖、记录 compatibility date、`wrangler types --check`、在实施当天复核官方文档。

_Source:_ [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices); [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x00-header/); [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/); [Cloudflare Test a Remote MCP Server](https://developers.cloudflare.com/agents/guides/test-remote-mcp-server/).

## Technical Research Recommendations

### Implementation Roadmap

推荐路线：

1. **Preparation**：开独立 branch/worktree，冻结当前 SEO/静态资源改动影响；建立 `docs/worker-mcp-implementation-plan.md` 或 BMAD epic/story。
2. **Core extraction**：抽出 `scene-core`，迁移领域/IO/state 纯函数和 tests；前端仍直接 import shared core。
3. **HTTP API MVP**：新增 Worker entry、`/api/health`、`/api/assets`、`/api/scene/validate`、`/api/scene/export-summary`、`/api/scene/encode`、`/api/scene/decode`。
4. **MCP MVP**：新增 `/mcp`，暴露 `validate_scene_document`、`recover_scene_document`、`summarize_scene_export`、`search_pokopia_assets` 和 schema/catalog resources。
5. **Codex skill**：新增 repo skill，声明 Streamable HTTP MCP dependency，写入示例 workflows 和失败处理。
6. **Release hardening**：加 body limits、headers/cache、logging redaction、MCP Inspector smoke、deploy dry-run 和 CI checks。

### Technology Stack Recommendations

保留 TypeScript、React、Vite、Vitest、Playwright、Zod。新增 Cloudflare Worker 相关依赖时优先选择官方栈：Wrangler、Cloudflare Vite plugin、Workers Vitest integration、Agents SDK、MCP TypeScript SDK。Hono 可作为后续选择，但第一阶段原生 Fetch router 足够。

### Skill Development Requirements

Codex skill 应聚焦三类任务：

- 检查或修复 SceneDocument payload。
- 生成图片导出摘要或解释导出内容。
- 按 Pokemon/主题/区域搜索素材并给出可放置建议。

Skill 不应包含完整业务逻辑，也不应要求 Codex 直接手写 scene schema。它应通过 MCP tools 获取权威结果，并把结果解释成可操作建议或 repo-local 文件变更。

### Success Metrics and KPIs

建议验收指标：

- `scene-core` 被 React、Worker API、MCP tools 共同复用，无重复 schema/summary implementation。
- 现有 `npm run typecheck`、`npm test`、`npm run build`、`npm run smoke` 全绿。
- 新增 Worker tests、MCP smoke、`wrangler types --check` 全绿。
- `/api/scene/validate` 和 `validate_scene_document` 对同一 fixtures 输出一致。
- Worker bundle 不包含 React、`html-to-image`、Playwright、大型图片源。
- 无 raw scene payload 默认日志。
- Codex skill 可通过 MCP 完成至少 3 个端到端任务：validate、summarize export、search assets。

# Comprehensive Technical Research Synthesis: Pokopia Scene Editor Cloudflare Worker, MCP Server, and Codex Skill Architecture

## Executive Summary

Pokopia Scene Editor 当前已经具备一批可服务化的前端领域能力：`SceneDocument v1` schema validation、scene recovery/roundtrip、asset catalog search/filtering、short string codec、export summary、scene selectors 和受 `interactionMode` 约束的 command/reducer 逻辑。这些能力的共同特点是 TypeScript、可测试、JSON 友好、基本无 DOM 依赖。它们适合抽取为共享 `scene-core`，再由浏览器、Cloudflare Worker HTTP API、Remote MCP server 和 Codex skill 共同调用。

战略上最重要的判断是：第一阶段应做“领域能力产品化”，不是“全栈产品重写”。Cloudflare Workers static assets 能在同一次部署中提供 Worker code 与静态 assets；Remote MCP 在 Cloudflare 上以 Streamable HTTP 为主；Codex skills 可以声明 MCP 依赖并把工具调用组织成稳定工作流。三者组合后，Pokopia 可以保持当前 React/Vite 编辑器体验，同时为自动化、验证、导出摘要和 agent 协作提供服务端入口。

**Key Technical Findings:**

- 目标架构应采用 `scene-core` + thin adapters：React UI、HTTP API、MCP tools 和 Codex skill 都不能复制业务逻辑。
- Cloudflare Worker 第一阶段应保持无状态：不引入 D1/KV/R2/Durable Objects，除非出现持久化、索引、文件或协作需求。
- API 应是任务型 JSON endpoints：validate、recover、export-summary、encode/decode、asset search，而不是 CRUD。
- MCP tools 应少而高语义：`validate_scene_document`、`recover_scene_document`、`summarize_scene_export`、`search_pokopia_assets`。
- `html-to-image`、DOM download、React components、localStorage preferences 和浏览器事件处理不应迁入 Worker。
- 安全边界的重点是 body size、schema validation、日志脱敏、tool allowlist 和 mutating tools 延后鉴权。

**Technical Recommendations:**

- 先在独立 branch/worktree 中抽取 `packages/scene-core`，并保持现有 UI 和测试全绿。
- 用 Workers static assets 迁移部署形态：SPA 静态资源、`/api/*` 和 `/mcp` 同域服务。
- 使用官方 Cloudflare/Agents/MCP/Codex 工具链：Wrangler、Cloudflare Vite plugin、Workers Vitest integration、Agents SDK、MCP TypeScript SDK。
- 把 Codex skill 设计为 workflow wrapper，而不是业务逻辑实现；skill 通过 MCP 调用权威服务。
- 将持久化、账号、云保存、分享链接、多人协作、服务端图片渲染作为后续独立产品决策。

## Table of Contents

1. Technical Research Introduction and Methodology
2. Technical Landscape and Architecture Analysis
3. Implementation Approaches and Best Practices
4. Technology Stack Evolution and Current Trends
5. Integration and Interoperability Patterns
6. Performance and Scalability Analysis
7. Security and Compliance Considerations
8. Strategic Technical Recommendations
9. Implementation Roadmap and Risk Assessment
10. Future Technical Outlook and Innovation Opportunities
11. Technical Research Methodology and Source Verification
12. Technical Appendices and Reference Materials

## 1. Technical Research Introduction and Methodology

### Technical Research Significance

Pokopia Scene Editor 的关键技术价值不在于新增一个普通 REST 后端，而在于把当前前端已经沉淀出的领域知识转化为可复用服务。`SceneDocument`、asset catalog、schema validation、export summary 和 selectors 本质上已经是一个领域内核；Cloudflare Workers 和 MCP 让这个内核可以被浏览器、自动化脚本、agent 和 Codex skill 使用。

_Technical Importance:_ Remote MCP 正在成为 agent 调用外部工具和上下文的标准接口；Cloudflare 官方已提供在 Workers 上构建和部署 MCP server 的路径，OpenAI Codex 支持 Streamable HTTP MCP server 与 skill 依赖声明。  
_Business Impact:_ 服务化后可以降低手工调试 scene JSON、导出摘要、素材检索和 agent 协作成本，为后续模板、验证、发布、分享或数据管线留下边界。  
_Source:_ [Cloudflare MCP overview](https://developers.cloudflare.com/agents/model-context-protocol/); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills).

### Technical Research Methodology

- **Technical Scope:** Cloudflare Workers、static assets、MCP server、Codex skill、TypeScript shared core、API design、testing、deployment、security、cost and risk.
- **Data Sources:** repo-local source, BMAD architecture artifacts, Cloudflare docs, MCP docs, OpenAI Codex docs, OWASP, npm registry snapshots.
- **Analysis Framework:** 以领域边界为中心，分别评估可迁移能力、不可迁移浏览器能力、adapter responsibilities、security boundary 和 delivery sequence。
- **Time Period:** 所有外部技术事实按 2026-05-25 当前资料核验；版本号需在实施当天重新确认。
- **Technical Depth:** 重点落在可执行架构和迁移策略，而非泛化 serverless 介绍。

### Technical Research Goals and Objectives

**Original Technical Goals:** 评估如何把现有浏览器端领域模型、资产目录、场景序列化、导出摘要等能力抽成可复用后端服务，并设计面向 Codex/MCP 的工具化调用、部署、测试、迁移和风险控制方案。

**Achieved Technical Objectives:**

- 已识别可抽取模块：`src/domain/scene/*`、`src/domain/assets/*`、`src/io/scene-schema.ts`、`scene-serializer`、`scene-recovery`、`scene-string-codec`、`export-summary`。
- 已识别不可直接抽取模块：`html-to-image`、DOM download、React components、localStorage UI preferences、browser event handlers。
- 已设计 Worker API、MCP tools/resources/prompts、Codex skill packaging 和 deployment topology。
- 已给出测试、CI、成本、安全和分阶段实施路线。

## 2. Technical Landscape and Architecture Analysis

### Current Technical Architecture Patterns

当前架构是客户端优先静态 SPA，`SceneDocument` 是唯一业务事实来源，React reducer 与 typed command dispatcher 负责 scene mutation，Zod 负责 runtime schema validation，Vitest/Playwright 覆盖领域和 UI 行为。BMAD Architecture 明确当前 MVP 不包含后端 API、账号、云同步或分享链接；图片导出是 browser-only rendered artifact。

推荐目标架构是 **modular monolith at the edge + ports and adapters**：

- `packages/scene-core`: pure domain logic
- `src/`: React/Vite UI adapter
- `worker/`: HTTP API adapter and static assets routing
- `worker/mcp.ts`: MCP adapter
- `.agents/skills/*`: Codex workflow adapter

_Dominant Patterns:_ TypeScript shared core, static SPA, Cloudflare Worker adapter, Remote MCP, repository-scoped skill.  
_Architectural Evolution:_ 从 purely client-side 到同域 edge service，不改变 `SceneDocument` 的权威地位。  
_Architectural Trade-offs:_ 单 Worker 部署降低复杂度；不提前拆微服务会牺牲部分独立扩展弹性，但显著降低初期风险。  
_Source:_ Local `_bmad-output/planning-artifacts/architecture.md`; [Alistair Cockburn: Hexagonal architecture](https://alistair.cockburn.us/hexagonal-architecture); [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/).

### System Design Principles and Best Practices

核心原则是：单一领域事实、薄 adapter、无状态优先、schema-first validation、agent tool 最小暴露。HTTP API 与 MCP tools 只做输入输出适配，所有业务判断由 `scene-core` 执行。Codex skill 只说明任务流程、工具依赖和失败处理，不实现校验或摘要逻辑。

_Design Principles:_ `SceneDocument v1` is canonical; derived outputs are disposable; UI-only state must stay out of API/MCP.  
_Best Practice Patterns:_ use case functions + typed Result + shared fixtures + contract tests.  
_Architectural Quality Attributes:_ maintainability and consistency are higher priority than premature persistence or service decomposition.  
_Source:_ Local `src/io/scene-schema.ts`; Local `src/state/scene-reducer.ts`; [MCP server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills).

## 3. Implementation Approaches and Best Practices

### Current Implementation Methodologies

推荐采用 Strangler Fig 风格的渐进迁移：先建立 `scene-core` 边界，再把浏览器和 Worker/MCP 都接到该边界上。不要一次性替换 UI、部署、API、MCP、skill 和 CI。

_Development Approaches:_ staged extraction, fixture-driven contracts, adapter tests.  
_Code Organization Patterns:_ `packages/scene-core`, `worker`, `src`, `.agents/skills`.  
_Quality Assurance Practices:_ existing Vitest/Playwright plus Workers Vitest and MCP Inspector smoke.  
_Deployment Strategies:_ health endpoint first, read-only API second, MCP third, authenticated/persistent tools later.  
_Source:_ [Microsoft Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig); [Cloudflare Workers Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/); [Cloudflare Test a Remote MCP Server](https://developers.cloudflare.com/agents/guides/test-remote-mcp-server/).

### Implementation Framework and Tooling

保留现有 TypeScript、React、Vite、Vitest、Playwright 和 Zod。新增官方工具链：Wrangler、Cloudflare Vite plugin、Workers Vitest integration、Agents SDK 和 MCP TypeScript SDK。Hono 可作为后续 routing helper，但第一阶段原生 Fetch handler 足够。

_Development Frameworks:_ React/Vite for UI; Cloudflare Workers for API/MCP; Agents SDK for remote MCP handler.  
_Tool Ecosystem:_ Wrangler types, Cloudflare Vite plugin, MCP Inspector, Codex skill metadata.  
_Build and Deployment Systems:_ Vite build + Worker bundle + static assets deploy + dry-run checks.  
_Source:_ [Cloudflare React SPA with an API](https://developers.cloudflare.com/workers/vite-plugin/tutorial/); [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/); [Cloudflare createMcpHandler](https://developers.cloudflare.com/agents/api-reference/mcp-handler-api/).

## 4. Technology Stack Evolution and Current Trends

### Current Technology Stack Landscape

TypeScript 是自然选择，因为现有领域逻辑和 tests 已经使用 TypeScript。Cloudflare Workers 官方支持 TypeScript 并推荐 `wrangler types` 生成 runtime/Env 类型。MCP TypeScript SDK 是官方 SDK，Codex skills 也是文件化 workflow 标准，适合和 repo-local 开发流程结合。

_Programming Languages:_ TypeScript first; no Python/Rust/Go in first phase.  
_Frameworks and Libraries:_ React/Vite remain UI stack; Workers runtime and Agents SDK become service layer.  
_Database and Storage Technologies:_ none in first phase; KV/D1/R2/DO are optional future tools.  
_API and Communication Technologies:_ HTTPS JSON API + Streamable HTTP MCP.  
_Source:_ Local `package.json`; [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/); [MCP SDKs](https://modelcontextprotocol.io/docs/sdk).

### Technology Adoption Patterns

当前行业趋势是把 agent-facing tools 设计成高语义、低数量、可靠的工具，而不是把每个 HTTP endpoint 机械暴露为一个 MCP tool。Cloudflare 自身 MCP server 文档也提示，完整 API schema 直接映射成工具会消耗过多上下文；本项目更应围绕 scene validation、recovery、summary 和 asset search 设计工具。

_Adoption Trends:_ Remote MCP and skills are becoming practical integration layers for coding agents.  
_Migration Patterns:_ shared core first, adapters second, persistence later.  
_Emerging Technologies:_ MCP resources/prompts/tool approval, Cloudflare Workers static assets, Agents SDK.  
_Source:_ [Cloudflare MCP servers for Cloudflare](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp).

## 5. Integration and Interoperability Patterns

### Current Integration Approaches

HTTP API 面向浏览器和脚本，MCP 面向 agent，Codex skill 面向人机工作流。三者的共同依赖只能是 `scene-core`。

推荐 API:

- `POST /api/scene/validate`
- `POST /api/scene/recover`
- `POST /api/scene/export-summary`
- `POST /api/scene/encode`
- `POST /api/scene/decode`
- `GET /api/assets`

推荐 MCP tools:

- `validate_scene_document`
- `recover_scene_document`
- `summarize_scene_export`
- `search_pokopia_assets`

_API Design Patterns:_ task endpoints, not CRUD.  
_Service Integration:_ single Worker gateway; Service Bindings/RPC only if later split internal services.  
_Data Integration:_ `SceneDocument v1` JSON, typed Result envelope, schema/catalog/service version metadata.  
_Source:_ [Cloudflare MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp).

### Interoperability Standards and Protocols

选择 JSON/HTTPS 与 Streamable HTTP MCP 是最符合当前消费端的组合。GraphQL/gRPC/WebSocket/Queue 不是第一阶段默认技术。

_Standards Compliance:_ MCP tools/resources/prompts, OAuth/bearer token support when needed.  
_Protocol Selection:_ HTTPS JSON for browser/API; Streamable HTTP for remote MCP; STDIO only for local prototype.  
_Integration Challenges:_ tool schema drift, payload bloat, overexposed tool sets, auth/session complexity.  
_Source:_ [MCP server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts); [Cloudflare MCP Transport](https://developers.cloudflare.com/agents/model-context-protocol/transport/).

## 6. Performance and Scalability Analysis

### Performance Characteristics and Optimization

当前领域规模较小：BMAD 架构约束约为 1000 个素材以内、10 个建筑层以内，常见编辑反馈目标在 100ms 量级，素材筛选 200ms 内。Worker 端计算 validate/export-summary/search 足够轻量，核心风险不是 CPU，而是 bundle 污染、payload 过大和日志/错误处理不当。

_Performance Benchmarks:_ 以现有 NFR 和 fixtures 为基准，新增 Worker/API latency smoke。  
_Optimization Strategies:_ top-N/pagination for asset search, no React/DOM bundle in Worker, cache public catalog/schema.  
_Monitoring and Measurement:_ route/tool duration, error code, CPU duration, bundle size, no raw scene logging.  
_Source:_ Local `_bmad-output/planning-artifacts/architecture.md`; [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/); [Cloudflare Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/).

### Scalability Patterns and Approaches

第一阶段是无状态横向扩展。请求携带输入，Worker 返回派生结果。只读 catalog/schema/examples 可以缓存；POST scene payload 默认 no-store。

_Scalability Patterns:_ stateless compute, edge static assets, cacheable catalog resources.  
_Capacity Planning:_ body size limit, output size cap, MCP tool timeout, pagination.  
_Elasticity and Auto-scaling:_ Cloudflare Workers runtime handles request scaling; storage products added only by use case.  
_Source:_ [Cloudflare storage options](https://developers.cloudflare.com/workers/platform/storage-options/); [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

## 7. Security and Compliance Considerations

### Security Best Practices and Frameworks

最小安全架构：anonymous read-only resources 可以公开；scene POST 在无持久化阶段可匿名，但需要 body limit、content-type check、Zod validation、domain validation、structured errors、no raw payload logs。所有 mutating/persistent/private tools 必须另行鉴权。

_Security Frameworks:_ OWASP API Security Top 10, MCP security best practices, Codex tool approval policy.  
_Threat Landscape:_ prompt/tool misuse, payload bloat, token passthrough, confused deputy, unsafe external fetch, logging leakage.  
_Secure Development Practices:_ allowlist tools, deny raw URL fetch, no stack traces in responses, secrets outside source.  
_Source:_ [OWASP API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x00-header/); [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices); [OpenAI Codex MCP](https://developers.openai.com/codex/mcp).

### Compliance and Regulatory Considerations

第一阶段不保存用户 scene、不引入账号、不发布内容，因此合规面较小。关键是默认不持久化用户 payload，不把 scene 写入日志，不把 secrets 写入 repo，不把 OAuth/auth 做成半成品。

_Industry Standards:_ HTTPS, OAuth/bearer token for private MCP, structured audit logs if persistence appears.  
_Regulatory Compliance:_ 当前无明显 PII/data retention 扩展，但未来云保存/账号/发布需要重新评估。  
_Audit and Governance:_ request id, route/tool, status, error category, duration; no complete scene by default.  
_Source:_ [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/); [Cloudflare Remote MCP server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/).

## 8. Strategic Technical Recommendations

### Technical Strategy and Decision Framework

推荐的决策框架：

- 能否脱离 DOM/React/localStorage 运行？能，则候选进入 `scene-core`。
- 是否需要持久化？否，则不要引入 DB/storage。
- 是否面向 agent？是，则设计 MCP use case tool，而不是 endpoint mirror。
- 是否会改变 SceneDocument？是，则必须走 command/use case schema 和更严格权限。
- 是否影响用户可见 UI？是，则必须保留 Playwright/RTL 回归。

_Architecture Recommendations:_ edge modular monolith, `scene-core`, thin adapters.  
_Technology Selection:_ TypeScript, Workers static assets, Streamable HTTP MCP, Codex repo skill.  
_Implementation Strategy:_ extract, contract-test, wrap, expose, harden.  
_Source:_ [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/); [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills).

### Competitive Technical Advantage

该方案的差异化不在“有一个 API”，而在于把 Pokopia 特有的 scene/domain rules 转成 agent 可调用能力。Codex 可以通过 MCP 可靠校验 scene、解释导出摘要、搜索素材并生成 repo-local 建议，减少靠自然语言猜 schema 的不确定性。

_Technology Differentiation:_ domain-specific MCP tools over generic JSON endpoints.  
_Innovation Opportunities:_ agent-assisted scene repair, template recommendation, export audit, catalog search assistant.  
_Strategic Technology Investments:_ fixtures/contracts, MCP tool descriptions, skill examples, shared schema docs.  
_Source:_ [MCP server concepts](https://modelcontextprotocol.io/docs/learn/server-concepts); [Cloudflare MCP Tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/).

## 9. Implementation Roadmap and Risk Assessment

### Technical Implementation Framework

**Phase 0: Planning and isolation**

- 在独立 branch/worktree 中执行，避免混入当前 SEO/静态资源改动。
- 新增 BMAD epic/story 或 implementation plan。

**Phase 1: scene-core extraction**

- 抽出领域/IO 纯函数。
- 保持 React UI 仍从 shared core 读取。
- 跑 `typecheck/test/build/smoke`。

**Phase 2: Worker HTTP MVP**

- 新增 Worker entry、`/api/health`、validate、export-summary、encode/decode、assets。
- 新增 worker tests 和 contract tests。

**Phase 3: MCP MVP**

- 新增 `/mcp`。
- 暴露 4 个 tools 和 3-4 个 resources/prompts。
- 用 MCP Inspector smoke。

**Phase 4: Codex skill**

- 新增 repo-scoped skill。
- 声明 MCP dependency。
- 写任务流程、示例和失败处理。

**Phase 5: hardening and deploy**

- body limit、cache headers、logging redaction、tool approval guidance、dry-run deploy。

_Implementation Phases:_ core, API, MCP, skill, hardening.  
_Technology Migration Strategy:_ keep browser behavior stable while adding server adapters.  
_Resource Planning:_ one domain/frontend owner plus Worker/MCP review is enough for first phase.  
_Source:_ [Cloudflare React SPA with an API](https://developers.cloudflare.com/workers/vite-plugin/tutorial/); [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/).

### Technical Risk Management

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Business logic duplication | High | `scene-core` only, adapter contract tests |
| Worker imports browser code | High | separate tsconfig, import lint, bundle dry-run |
| MCP tool overexposure | Medium | 4 initial tools, resources for context |
| Raw scene logging | High | redacted logs, no payload persistence |
| Premature storage/auth | Medium | separate product decision and epic |
| Version drift | Medium | lockfile, compatibility date, `wrangler types --check` |

_Technical Risks:_ duplication, bundle pollution, tool misuse, privacy leakage.  
_Implementation Risks:_ migration breaks UI, tests miss adapter behavior.  
_Business Impact Risks:_ service boundary grows into unplanned cloud product.  
_Source:_ [MCP security best practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices); [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

## 10. Future Technical Outlook and Innovation Opportunities

### Emerging Technology Trends

Near term, remote MCP and repo skills are most useful for developer/agent workflows rather than end-user product UI. Medium term, if users need sharing, persistence or public templates, Cloudflare D1/KV/R2/DO can be introduced deliberately. Long term, MCP tools could become the stable automation surface for scene generation, validation, recommendation and export workflows.

_Near-term Technical Evolution:_ MCP validate/recover/summarize/search tools.  
_Medium-term Technology Trends:_ persistent templates, server-generated assets, authenticated private tools.  
_Long-term Technical Vision:_ domain-specific Pokopia scene service used by UI, build tools, agents and content pipelines.  
_Source:_ [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects/); [Cloudflare D1](https://developers.cloudflare.com/d1/); [Cloudflare R2](https://developers.cloudflare.com/r2/).

### Innovation and Research Opportunities

Future research areas:

- Scene auto-repair explainability and deterministic patch suggestions.
- Asset recommendation by Pokemon preferences, room theme and skill needs.
- Export audit: detect missing per-layer materials, inaccessible labels or unsafe text.
- Shared scene schema package and public examples.
- Authenticated MCP tools for private workspace templates, only after security design.

_Research Opportunities:_ deterministic scene patching and recommendations.  
_Emerging Technology Adoption:_ MCP prompts/resources, OAuth-scoped remote tools, Workers AI only if actual AI inference appears.  
_Innovation Framework:_ ship read-only tools first, measure utility, then expand to guarded command simulation.  
_Source:_ [OpenAI Codex Agent Skills](https://developers.openai.com/codex/skills); [Cloudflare Remote MCP server](https://developers.cloudflare.com/agents/guides/remote-mcp-server/).

## 11. Technical Research Methodology and Source Verification

### Comprehensive Technical Source Documentation

_Primary Technical Sources:_

- Repo-local: `package.json`, `wrangler.toml`, `vite.config.ts`, `tsconfig*.json`, `src/domain`, `src/io`, `src/state`, `_bmad-output/planning-artifacts/architecture.md`.
- Cloudflare: Workers Static Assets, Pages to Workers migration, TypeScript, Vite plugin, Vitest integration, Workers limits, pricing, storage options, Agents MCP docs.
- OpenAI: Codex Skills and Codex MCP official docs.
- MCP: server concepts, SDK docs, security best practices.

_Secondary Technical Sources:_

- Microsoft Azure Strangler Fig pattern.
- Martin Fowler Strangler Fig.
- OWASP API Security Top 10 2023.
- npm registry version queries on 2026-05-25.

_Technical Web Search Queries:_

- Cloudflare Workers static assets Worker code API full stack applications official.
- Cloudflare Agents Model Context Protocol remote MCP server official.
- OpenAI Codex skills MCP server dependencies official.
- MCP server concepts tools resources prompts official.
- technology adoption strategies migration.
- software development workflows tooling.
- DevOps operations best practices.

### Technical Research Quality Assurance

_Technical Source Verification:_ Cloudflare/OpenAI/MCP claims rely on official docs; project-specific claims rely on checked repo files.  
_Technical Confidence Levels:_ High for architecture direction and first-phase scope; medium for exact npm versions because they drift; medium for future storage/auth roadmap because it depends on product decisions.  
_Technical Limitations:_ No live prototype was implemented in this research; performance numbers should be measured once Worker endpoints exist.  
_Methodology Transparency:_ All recommendations explicitly separate local fact, official-source fact, and inference.

## 12. Technical Appendices and Reference Materials

### Detailed Technical Data Tables

| Capability | Current Location | Worker Candidate | Notes |
| --- | --- | --- | --- |
| Scene schema validation | `src/io/scene-schema.ts` | Yes | Core API/MCP candidate |
| Scene serialization | `src/io/scene-serializer.ts` | Yes | Shared core |
| Short code codec | `src/io/scene-string-codec.ts` | Yes | API/MCP candidate |
| Export summary | `src/domain/scene/export-summary.ts` | Yes | Pure derived data |
| Asset filtering | `src/domain/assets/filters.ts` | Yes | Cacheable GET/API tool |
| Command simulation | `src/state/*` | Later | Guard with schema and tests |
| PNG/image export | `src/io/image-export.ts` | No first phase | DOM and `html-to-image` |
| UI preferences | `src/io/ui-preferences.ts` | No | Client-only localStorage |

| Endpoint/Tool | First Phase | Auth | Cache |
| --- | --- | --- | --- |
| `GET /api/assets` | Yes | No | Yes |
| `POST /api/scene/validate` | Yes | No, if no persistence | No |
| `POST /api/scene/export-summary` | Yes | No, if no persistence | No |
| `/mcp search_pokopia_assets` | Yes | Optional | Tool-level |
| `/mcp simulate_scene_command` | Later | Yes if mutating | No |

### Technical Resources and References

_Technical Standards:_ Model Context Protocol, HTTPS, JSON, OAuth/bearer token where needed.  
_Open Source Projects:_ `@modelcontextprotocol/sdk`, `agents`, `wrangler`, `@cloudflare/vite-plugin`, `@cloudflare/vitest-pool-workers`.  
_Research Papers and Publications:_ Not required for first-phase implementation; official vendor/protocol docs are sufficient.  
_Technical Communities:_ Cloudflare Workers docs/community, MCP docs, OpenAI Codex docs.

---

## Technical Research Conclusion

### Summary of Key Technical Findings

Pokopia Scene Editor 已经具备后端服务化所需的领域内核，最合理的技术路径是抽出 `scene-core`，再用 Cloudflare Worker、MCP server 和 Codex skill 提供不同调用面。第一阶段保持无状态、无数据库、无账号、无服务端图片渲染，可以最大限度降低风险，同时为 agent 工作流提供实际价值。

### Strategic Technical Impact Assessment

该方案会把 Pokopia 的领域规则从“只能在浏览器 UI 内被间接使用”提升为“可被 UI、API、MCP 和 Codex 共同使用的产品能力”。这能减少 schema 漂移、提升自动化可测性，并为后续公开模板、分享、发布、协作或 AI-assisted scene authoring 留出清晰边界。

### Next Steps Technical Recommendations

1. 创建独立 BMAD epic/story 或 implementation plan，保持与当前脏工作树隔离。
2. 实施 `scene-core` 抽取并跑完现有质量门禁。
3. 新增 Worker `/api/health` 和只读/无状态 API MVP。
4. 新增 `/mcp` 与 4 个高语义 tools。
5. 新增 repo-scoped Codex skill，声明 MCP dependency 和任务流程。

---

**Technical Research Completion Date:** 2026-05-25  
**Research Period:** current comprehensive technical analysis  
**Source Verification:** All technical facts cited with current official or repo-local sources  
**Technical Confidence Level:** High for first-phase architecture and migration strategy; medium for future product/storage/auth expansion

_This comprehensive technical research document serves as the authoritative technical reference for extracting Pokopia Scene Editor front-end domain capabilities into Cloudflare Worker services, remote MCP tools, and Codex skill workflows._
