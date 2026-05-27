# Story 7.5: Worker/MCP/Skill hardening、测试和发布门禁

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 维护者,
I want 完成 Worker/MCP/Codex skill 的安全、测试和部署门禁,
so that 服务化能力不会引入 schema 漂移、bundle 污染或日志泄漏。

## Acceptance Criteria

1. Given release gate 运行, When dev agent 执行验证, Then `pnpm run typecheck`、`pnpm run test`、`pnpm run build`、`pnpm run smoke`、`pnpm run worker:types:check` 和 `pnpm run worker:deploy:dry-run` 必须通过。
2. Given Worker bundle 已生成, When bundle 检查运行, Then bundle 不得包含 React、React DOM、`html-to-image`、Playwright、jsdom 或大型图片源。
3. Given Worker/API/MCP 错误发生, When 日志和响应生成, Then 响应不暴露 stack trace, And 日志不包含完整 scene payload。
4. Given MCP smoke 运行, When 调用 validate、recover、summarize 和 search tools, Then 返回结构化结果并与 `packages/scene-core` direct-call contract tests 一致。
5. Given Codex skill 已新增, When release gate 运行, Then skill wrapper verification 必须检查 frontmatter、example coverage 和不得复制 scene-core 业务实现。
6. Given Epic 7 完成, When sprint tracker 更新, Then Story 7.1-7.5 均为 done，`epic-7` 标记为 done。

## Tasks / Subtasks

- [x] 增加 release gate scripts (AC: 1, 2, 4, 5)
  - [x] 根 `package.json` 增加聚合 release verification script，串行运行 typecheck/test/build/smoke/Worker types/deploy dry-run/MCP smoke/bundle check/skill verify。
  - [x] Worker package 增加 MCP smoke 和 bundle check scripts，root scripts 通过 `pnpm --filter @pokopia-scene-editor/worker ...` 调用。
  - [x] 确保 build/smoke 不并发操作 `apps/web/dist`。
- [x] 增加 Worker bundle pollution 检查 (AC: 2)
  - [x] 使用 Wrangler dry-run `--outdir`/`--metafile` 或等效方式输出 Worker bundle。
  - [x] 检查 bundle/metafile 不包含 React、React DOM、`html-to-image`、Playwright、jsdom 或大型 runtime image source directories。
  - [x] 检查不得 import `apps/web/src/*` 或 browser-only image-export 路径。
- [x] 强化 MCP smoke / security coverage (AC: 3, 4)
  - [x] MCP smoke 覆盖 validate、recover、summarize 和 search tool calls。
  - [x] 确认现有 Worker tests 覆盖 stack trace/raw payload response redaction、API body/content-type limits、MCP log redaction。
  - [x] 如缺少 coverage，补最小测试；不新增账号、持久化、云同步、分享或服务端图片生成。
- [x] 更新 story/tracker 并完成 Epic 7 (AC: 6)
  - [x] Story 7.5 通过 review 后标记 done。
  - [x] 将 `sprint-status.yaml` 中 `7-5-worker-mcp-skill-hardening-and-release-gates` 标记 done。
  - [x] 确认 7.1-7.5 全 done 后将 `epic-7` 标记 done。

### Review Findings

- [x] Bundle output image scan included raster formats but omitted `.svg`; fixed to reject emitted SVG assets as well.

## Dev Notes

- Story 7.5 是 Epic 7 收口，不应新增用户可见 UI、账号、数据库、云保存、分享链接、在线发布或服务端 PNG 生成。[Source: _bmad-output/planning-artifacts/epics.md#Story-7.5]
- CI / release gate 至少包含 `pnpm run typecheck`、unit tests、`pnpm run build`、Playwright smoke、Worker runtime tests、MCP smoke、`pnpm run worker:types:check` 和 `pnpm run worker:deploy:dry-run`。[Source: _bmad-output/planning-artifacts/epics.md#Technical-Requirements]
- Worker bundle 不得包含 React、React DOM、`html-to-image`、Playwright、jsdom 或大型图片源。[Source: _bmad-output/planning-artifacts/prd.md#NFR33]
- Worker/API/MCP 不得记录完整用户 scene payload；日志只能记录 request id、route/tool、status、error category、duration 和必要 redacted metadata。错误响应不得暴露 stack trace。[Source: _bmad-output/planning-artifacts/prd.md#NFR31-NFR32]
- API/MCP 结果必须与浏览器 UI 当前 `SceneDocument v1`、asset catalog、locale 显示规则和导出摘要语义一致。[Source: _bmad-output/planning-artifacts/prd.md#NFR35]
- 7.2 已覆盖 HTTP API envelope、request body/content-type limits、raw payload/stack redaction 和 deploy dry-run；7.3 已覆盖 MCP tools/resources/prompts、MCP tool log redaction、schema resource；7.4 已覆盖 skill wrapper verification。[Source: _bmad-output/implementation-artifacts/7-2-worker-http-api-and-deploy-scripts.md; _bmad-output/implementation-artifacts/7-3-mcp-server-tools-resources-prompts.md; _bmad-output/implementation-artifacts/7-4-codex-skill-wrapper-and-examples.md]
- Wrangler supports `deploy --dry-run --outdir --metafile`; use that instead of ad hoc bundle scraping when possible.

### Project Structure Notes

- Likely updates:
  - `package.json`
  - `apps/worker/package.json`
  - `scripts/verify-worker-bundle.mjs`
  - `apps/worker/src/*.test.ts` if coverage gaps are found
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.5]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR31-NFR36]
- [Source: _bmad-output/planning-artifacts/architecture.md#Minimal-CI-release-gate]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md#Epic-7]
- [Source: _bmad-output/implementation-artifacts/7-2-worker-http-api-and-deploy-scripts.md]
- [Source: _bmad-output/implementation-artifacts/7-3-mcp-server-tools-resources-prompts.md]
- [Source: _bmad-output/implementation-artifacts/7-4-codex-skill-wrapper-and-examples.md]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-26: Story created after Story 7.4 commit `792bbb2`.
- 2026-05-26: Added root `release:verify`, Worker MCP smoke and Worker bundle pollution check scripts.
- 2026-05-26: Fixed Worker bundle check to call Wrangler dry-run with `--outdir`/`--metafile` directly and validate `dist/worker-bundle` from the Worker package directory.
- 2026-05-26: Added MCP validate tool parity smoke against `scene-core` direct validation errors.
- 2026-05-26: Review fixed SVG output coverage in bundle verification.

### Completion Notes List

- Added a serial `release:verify` gate covering typecheck, unit tests, build, Playwright smoke, Worker types, Worker deploy dry-run, MCP smoke, bundle pollution scan and Codex skill verification.
- Added Wrangler metafile-based Worker bundle verification that rejects React, React DOM, `html-to-image`, Playwright, jsdom, web source imports, browser-only image-export paths and image assets.
- Added MCP validate smoke coverage with direct `scene-core` contract parity; existing tests cover recover, summarize, search, API/MCP redaction and request guards.
- Marked Story 7.5 and Epic 7 done in the sprint tracker.

### Change Log

- 2026-05-26: Created Story 7.5 and moved status to ready-for-dev.
- 2026-05-26: Implemented release hardening, completed review fixes and marked Story 7.5 done.

### File List

- _bmad-output/implementation-artifacts/7-5-worker-mcp-skill-hardening-and-release-gates.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- apps/worker/package.json
- apps/worker/src/mcp.test.ts
- package.json
- scripts/verify-worker-bundle.mjs
