# Story 7.1: 抽取 scene-core 共享领域包并保持 Web UI 不回退

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 开发者,
I want 将可脱离 DOM/React/localStorage 的领域能力抽取到 `packages/scene-core`,
so that Web UI、Worker API、MCP tools 和 Codex skill 可以复用同一套权威规则。

## Acceptance Criteria

1. Given 当前仓库仍是单 app 结构, When dev agent 执行 Story 7.1, Then 仓库必须新增 `pnpm-workspace.yaml`、`apps/web`、`packages/scene-core` 和 workspace package manifests, And 当前 React UI、Vite 配置、public assets、Playwright/Vitest web 配置迁入 `apps/web`。
2. Given 当前存在 `SceneDocument` schema、serializer/recovery、short code codec、asset catalog 查询、selectors 和 export summary, When 这些能力可脱离 DOM/React/localStorage 运行, Then 它们必须迁入 `packages/scene-core`, And `apps/web` 通过 workspace dependency 复用它们。
3. Given 当前存在 `src/io/image-export.ts`, When 它依赖 DOM、HTMLElement、Blob、browser download 或 `html-to-image`, Then 它必须保留在 `apps/web/src/io/image-export.ts`, And 不得进入 `packages/scene-core` 或 `apps/worker` bundle。
4. Given release gate 运行, When dev agent 执行验证, Then `pnpm run typecheck`、`pnpm run test`、`pnpm run build` 和 `pnpm run smoke` 必须通过, And Web UI 的编辑、恢复和图片导出预览行为不回退。

## Tasks / Subtasks

- [x] 建立 pnpm workspace 和 package 边界 (AC: 1)
  - [x] 新增根 `pnpm-workspace.yaml`，根 `package.json` 改为 workspace orchestration，不再直接承载 Vite app。
  - [x] 新增 `apps/web/package.json`、`apps/web/tsconfig*.json`、`apps/web/vite.config.ts`、`apps/web/playwright.config.ts`，保留当前 Web scripts 的行为。
  - [x] 新增 `packages/scene-core/package.json`、`packages/scene-core/tsconfig.json` 和 `packages/scene-core/src/index.ts`。
- [x] 迁移 Web app 文件到 `apps/web`，保持浏览器体验不变 (AC: 1, 3, 4)
  - [x] 将 `index.html`、`src/App.tsx`、`src/main.tsx`、`src/components/`、`src/state/`、`src/theme/`、`src/i18n/`、`src/io/`、`src/test/`、`src/styles.css`、`src/vite-env.d.ts`、`public/` 和 `e2e/` 迁入 `apps/web`。
  - [x] 更新 `apps/web` 的 Vite runtime asset copy，使构建继续从 repo 根的 `assets/pokopia_image_sources` 复制图片源到 Web dist。
  - [x] 保持 `apps/web/src/io/image-export.ts`、`scene-storage.ts`、`ui-preferences.ts` 在 Web app 内，不迁入 `scene-core`。
- [x] 抽取纯领域能力到 `packages/scene-core` (AC: 2, 3)
  - [x] 将 `src/domain/assets/*` 和 `src/domain/scene/*` 迁入 `packages/scene-core/src/domain/*`。
  - [x] 将纯数据 IO `scene-schema.ts`、`scene-recovery.ts`、`scene-roundtrip.ts`、`scene-serializer.ts`、`scene-string-codec.ts` 迁入 `packages/scene-core/src/io/`。
  - [x] 将对应单元测试迁入 `packages/scene-core/src/**`，并把涉及 browser storage 的 export summary storage 不变性测试留给 Web 层或改写为 core 纯断言。
  - [x] `scene-core` 不能 import React、DOM、localStorage、Worker runtime、`html-to-image`、`apps/web/src/*` 或 UI components。
- [x] 更新 imports、测试配置和 release gate (AC: 2, 4)
  - [x] Web app 改为从 `@pokopia-scene-editor/scene-core` 引用 shared domain/io 能力。
  - [x] 根 `pnpm run typecheck/test/build/smoke` 委派到 workspace packages，并确保 `pnpm --filter @pokopia-scene-editor/web build` 仍执行 runtime asset verification。
  - [x] 更新 `scripts/verify-runtime-assets.mjs` 或调用参数，使迁移后的 `apps/web/dist/assets/pokopia_image_sources/` 被验证。
  - [x] 保留 `npm` 旧锁文件之外不新增 runtime 依赖；Story 7.1 不引入 Worker、MCP 或 Wrangler 新依赖。

### Review Findings

- [x] [Review][Patch] Web locale/display helpers duplicated core rules, risking drift between Web and future Worker/MCP outputs. Fixed by re-exporting shared display helpers from `@pokopia-scene-editor/scene-core` in `apps/web/src/i18n/index.ts`.
- [x] [Review][Patch] `setPokopiaAssetBaseUrl` implied runtime asset URL configurability after catalog construction, but catalog thumbnails are computed at module load. Fixed by removing the setter and keeping a single deterministic root asset URL helper in core.

## Dev Notes

- Epic 7 的 approved sequence 是 7.1 `scene-core` -> 7.2 Worker API -> 7.3 MCP -> 7.4 Codex skill -> 7.5 hardening/release gates。不要提前实现 Worker/MCP/skill。[Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md#Proposed-Epic-7]
- Approved target structure: `apps/web` owns React/browser UI, `packages/scene-core` owns pure domain logic, future `apps/worker` owns Worker/MCP adapters, and `.agents/skills/pokopia-scene-worker/` owns the Codex skill wrapper。[Source: _bmad-output/planning-artifacts/architecture.md#Approved-Epic-7-target-structure]
- `scene-core` 的允许范围是 `SceneDocument` 类型、Zod schema、serializer/recovery、short code codec、asset catalog 查询、selectors、导出摘要 JSON 和默认 scene 生成。[Source: _bmad-output/planning-artifacts/prd.md#Scene-Worker-MCP-Codex-Skill]
- `image-export.ts` 依赖 DOM/`HTMLElement`/`Blob`/`html-to-image`，必须留在 Web app。不要为了“共享”而把 PNG 生成迁入 Worker 或 core。[Source: _bmad-output/planning-artifacts/epics.md#Story-7.1]
- 当前 `src/domain/scene/export-summary.ts` 仍 import `../../i18n`，抽取时必须移除对 Web i18n 的依赖。可选择让 core 返回 locale-neutral identifiers/labels，或把必须的显示文本函数一并做成 DOM-free core helper；但不得从 core import Web `i18n`。
- 当前 `src/io/ui-preferences.ts` 使用 `window.localStorage` 和 Web locale preference，应留在 `apps/web/src/io/`。当前 `src/io/scene-storage.ts` 依赖 Storage/localStorage contract，也应留在 Web 层，但可继续使用 core 的 serializer/recovery/types。
- 当前 root 有 `wrangler.toml` 和最近 commit `Add Cloudflare Pages Wrangler config`，Story 7.1 不迁移到 Worker static assets；如需保证当前 Pages config 不误指根 dist，可最小调整为 Web dist，但不要实现 7.2 的 Worker config。

### Project Structure Notes

- 目标 package names:
  - Root: `pokopia-scene-editor`
  - Web app: `@pokopia-scene-editor/web`
  - Shared core: `@pokopia-scene-editor/scene-core`
- `packages/scene-core` TypeScript 应使用 DOM-free lib，例如 `ES2024`，并开启 strict/noUnused。
- `apps/web` 的 tests 继续使用 jsdom；`packages/scene-core` tests 应使用 node environment，除非具体测试确实需要 DOM。不要让 core 测试依赖 `window.localStorage`。
- Vite config 迁入 `apps/web` 后，`config.root` 会变成 `apps/web`；runtime asset source 需要用 repo 根路径 `../../assets/pokopia_image_sources`。

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-7.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Approved-Epic-7-target-structure]
- [Source: _bmad-output/planning-artifacts/prd.md#Scene-Worker-MCP-Codex-Skill]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-05-25.md#Epic-7]

## Dev Agent Record

### Agent Model Used

GPT-5

### Debug Log References

- 2026-05-26: Story created from Epic 7 tracker backlog and current planning artifacts.
- 2026-05-26: Migrated repository into pnpm workspace with `apps/web` and `packages/scene-core`.
- 2026-05-26: Removed Vite `import.meta.env` dependency from core asset URL generation and kept browser-only image/storage IO in Web.
- 2026-05-26: Verified `pnpm run typecheck`, `pnpm run test`, `pnpm run build`, and `pnpm run smoke`.
- 2026-05-26: Addressed code review findings by centralizing display helpers in core and simplifying asset URL base handling.

### Completion Notes List

- Story context created for 7.1 with monorepo, core extraction, browser-only boundary, and release gate requirements.
- Root scripts now orchestrate workspace package scripts through pnpm.
- Existing React/Vite/Playwright app moved under `apps/web`; public assets and smoke tests moved with it.
- Pure domain, asset catalog, scene selectors, schema, serializer/recovery, roundtrip, short string codec, and export summary moved under `packages/scene-core`.
- Browser-only `image-export`, `scene-storage`, and `ui-preferences` remain in `apps/web/src/io`.
- `scene-core` uses DOM-free TypeScript config and node Vitest environment; Web tests keep jsdom and explicit jest-dom matcher setup.
- Code review patches resolved; final verification repeated after fixes.

### Change Log

- 2026-05-26: Implemented Story 7.1 and moved status to review.

### File List

- _bmad-output/implementation-artifacts/7-1-extract-scene-core-shared-package.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- package.json
- pnpm-lock.yaml
- pnpm-workspace.yaml
- tsconfig.json
- wrangler.toml
- scripts/verify-runtime-assets.mjs
- apps/web/package.json
- apps/web/tsconfig.json
- apps/web/tsconfig.app.json
- apps/web/tsconfig.node.json
- apps/web/vite.config.ts
- apps/web/playwright.config.ts
- apps/web/index.html
- apps/web/public/
- apps/web/e2e/
- apps/web/src/
- packages/scene-core/package.json
- packages/scene-core/tsconfig.json
- packages/scene-core/src/index.ts
- packages/scene-core/src/locale.ts
- packages/scene-core/src/domain/
- packages/scene-core/src/io/
- packages/scene-core/src/test/fixtures/unsafe-text.ts
