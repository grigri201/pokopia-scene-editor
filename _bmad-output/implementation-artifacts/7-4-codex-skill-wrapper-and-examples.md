# Story 7.4: 新增 repo-scoped Codex skill wrapper 与示例

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Codex user,
I want 使用 repo-scoped Codex skill 调用 Pokopia Scene Worker MCP,
so that 我可以在仓库内稳定完成 scene 校验、导出摘要和素材查询工作流。

## Acceptance Criteria

1. Given MCP server 已存在, When dev agent 新增 `.agents/skills/pokopia-scene-worker/SKILL.md`, Then skill 必须说明何时使用 MCP tools、如何解释结果、如何处理失败和如何引用 repo-local 文件。
2. Given skill 需要访问领域能力, When 编写 skill 内容, Then 不得复制 scene schema、asset catalog、export summary 或业务规则, And 必须通过 MCP tools 获取权威结果。
3. Given skill examples 已编写, When Codex 执行示例 workflow, Then 至少覆盖 validate scene、summarize export 和 search assets / generate default scene 三类任务。
4. Given repo-scoped skill 被发现, When Codex 加载技能元数据, Then frontmatter `name`/`description` 必须能准确触发 Pokopia Scene Worker MCP 工作流。
5. Given skill 使用 MCP, When 本地 Worker 未运行或 MCP 请求失败, Then skill 必须说明先运行/确认 Worker MCP endpoint 的步骤和失败处理方式，不得回退到复制业务逻辑。

## Tasks / Subtasks

- [x] 创建 repo-scoped skill 结构 (AC: 1, 4)
  - [x] 新增 `.agents/skills/pokopia-scene-worker/SKILL.md`，包含清晰 frontmatter 和精简主体。
  - [x] 按 skill-creator 规范避免 README/安装指南等冗余文件；只添加直接服务 skill 的 references/examples。
  - [x] 如添加 `agents/openai.yaml`，内容必须与 `SKILL.md` 一致；否则不要创建无用 metadata。
- [x] 编写 MCP-first workflow 指令 (AC: 1, 2, 5)
  - [x] 说明触发场景：validate scene、recover scene、summarize export、search assets、generate default scene。
  - [x] 明确使用 MCP tools：`generate_scene_document`、`validate_scene_document`、`recover_scene_document`、`summarize_scene_export`、`search_pokopia_assets`。
  - [x] 说明如何解释 `structuredContent.ok/errors/warnings/fixSuggestions/meta`。
  - [x] 说明失败处理：先确认 Worker `/mcp` 可用；若 MCP 不可用，停止并报告，不复制 `scene-core` 业务规则。
  - [x] 说明引用 repo-local 文件时只引用用户提供或任务相关文件，避免把 `_bmad-output/` 当运行时依赖。
- [x] 编写 workflow examples (AC: 3)
  - [x] 至少提供 validate scene 示例。
  - [x] 至少提供 summarize export 示例。
  - [x] 至少提供 search assets / generate default scene 示例。
  - [x] 示例必须展示通过 MCP tool 获取权威结果，不内嵌 schema、catalog 或 export summary 实现。
- [x] 增加轻量验证 (AC: 1, 2, 3, 4, 5)
  - [x] 增加脚本或测试检查 skill 文件存在、frontmatter 可解析、示例覆盖三类 workflow。
  - [x] 检查 skill/examples 不包含复制的 scene schema/catalog/export summary 实现片段。
  - [x] 确认现有 `pnpm run typecheck/test/build/smoke` 不受 skill 文档影响。

### Review Findings

- [x] [Review][Patch] Skill verification script derived the repo root from `URL.pathname`, which breaks on escaped path characters such as spaces. Fixed by using `fileURLToPath()`.
- [x] [Review][Patch] Validation did not enforce the skill-creator rule against auxiliary README/installation/quick-reference files. Fixed by adding an explicit forbidden auxiliary file check.

## Dev Notes

- Story 7.4 只新增 repo-scoped Codex skill wrapper 和示例；不要改 MCP tools 本身，除非发现 7.3 的实际缺陷需要最小修复。[Source: _bmad-output/planning-artifacts/epics.md#Story-7.4]
- `.agents/skills/pokopia-scene-worker/` 只放 Codex skill workflow、示例和 MCP dependency；不得复制 schema、asset catalog 或导出摘要逻辑。[Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md#Recommended-Path-Forward]
- Codex skill 必须通过 MCP 调用权威 Worker/scene-core 能力完成校验、摘要和素材搜索；skill 不得复制业务逻辑、schema、asset catalog 或导出摘要实现。[Source: _bmad-output/planning-artifacts/prd.md#FR76]
- Architecture 指定 `.agents/skills/pokopia-scene-worker -> MCP tools only`，MCP clients/Codex connect to Streamable HTTP MCP endpoint；Codex skill does not implement business logic itself。[Source: _bmad-output/planning-artifacts/architecture.md#Data-Flow]
- 7.3 已提供 `/mcp`、tools/resources/prompts，并在 `apps/worker/src/mcp.test.ts` 覆盖 MCP contract；7.4 应引用这些 tool names 和 result shapes，不重新定义其业务语义。[Source: _bmad-output/implementation-artifacts/7-3-mcp-server-tools-resources-prompts.md]
- skill-creator 规范：每个 skill 必须有 `SKILL.md` frontmatter `name` 和 `description`；主体保持精简，详细示例可放 references/examples；不要创建 README、INSTALLATION_GUIDE、QUICK_REFERENCE 等额外文档。[Source: /Users/grigri/.codex/skills/.system/skill-creator/SKILL.md]

### Project Structure Notes

- 目标目录：
  - `.agents/skills/pokopia-scene-worker/SKILL.md`
  - `.agents/skills/pokopia-scene-worker/references/workflows.md`（如需要）
  - `.agents/skills/pokopia-scene-worker/examples/validate-scene.md`
  - `.agents/skills/pokopia-scene-worker/examples/summarize-export.md`
  - `.agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md`
- 轻量验证可放在 `scripts/` 或 worker tests；优先选择不会让 runtime bundle 依赖 skill 文档的方式。

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR76]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Flow]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md#Epic-7]
- [Source: _bmad-output/implementation-artifacts/7-3-mcp-server-tools-resources-prompts.md]
- [Source: /Users/grigri/.codex/skills/.system/skill-creator/SKILL.md]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-26: Story created after Story 7.3 commit `5a63073`.
- 2026-05-26: Added repo-scoped `pokopia-scene-worker` skill, workflow reference, three examples, and `skill:verify` script.
- 2026-05-26: Verified `pnpm run skill:verify`, `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, and `pnpm run smoke`.
- 2026-05-26: Applied code-review fixes to skill verification path handling and auxiliary-file enforcement; re-ran `pnpm run skill:verify`.

### Completion Notes List

- Story context created for repo-scoped Codex skill wrapper, MCP-first workflow guidance, examples and lightweight validation.
- Skill frontmatter and body now route validate/recover/summarize/search/generate tasks through MCP tools only.
- Examples cover validate scene, summarize export, and asset search/default scene generation workflows.
- `scripts/verify-pokopia-scene-worker-skill.mjs` checks required metadata, tool mentions, example coverage, and absence of copied scene-core implementations.
- Review fixes make the verification script robust for escaped repo paths and ensure the skill directory stays free of auxiliary documentation files.

### Change Log

- 2026-05-26: Created Story 7.4 and moved status to ready-for-dev.
- 2026-05-26: Implemented Story 7.4 and moved status to review.
- 2026-05-26: Completed Story 7.4 review fixes and moved status to done.

### File List

- _bmad-output/implementation-artifacts/7-4-codex-skill-wrapper-and-examples.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- .agents/skills/pokopia-scene-worker/SKILL.md
- .agents/skills/pokopia-scene-worker/references/workflows.md
- .agents/skills/pokopia-scene-worker/examples/validate-scene.md
- .agents/skills/pokopia-scene-worker/examples/summarize-export.md
- .agents/skills/pokopia-scene-worker/examples/search-assets-and-generate.md
- scripts/verify-pokopia-scene-worker-skill.mjs
- package.json
