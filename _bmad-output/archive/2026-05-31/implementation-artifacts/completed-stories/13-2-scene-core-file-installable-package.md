# Story 13.2: Scene Core 可被 pnpm file 安装

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a 下游项目开发者,
I want 通过 `pnpm add file:../pokopia-scene-editor/packages/scene-core` 使用 core,
so that 新项目可以复用 SceneDocument、catalog、schema、codec、selectors 和 export summary，而不需要编译本仓库 TS 源码。

## Acceptance Criteria

1. `packages/scene-core/package.json` 暴露稳定的 package contract：`exports["."].import` 指向构建后的 JS，`exports["."].types` / `types` 指向构建后的 `.d.ts`，`files` 只允许发布/安装必要的构建产物和说明文件；不得继续把 `./src/index.ts` 当作外部安装契约。
2. `pnpm --filter @pokopia-scene-editor/scene-core build` 实际生成可消费的 runtime JS 和 type declarations。构建产物不得包含 `src/**/*.test.ts`、`src/test/**`、Worker/MCP/skill 代码或大型图片资源。
3. 新增外部 consumer smoke：在临时目录创建最小 ESM 项目，通过 `pnpm add file:<absolute path>/packages/scene-core` 安装，并用 Node import `@pokopia-scene-editor/scene-core` 验证关键 API 可用。consumer 不得依赖 workspace、Vite、ts-node、tsx 或本仓库源码编译。
4. Smoke 至少覆盖 SceneDocument v1 schema/parse、default scene factory、asset catalog helper、dimension/area helper、codec roundtrip、selector 或 export summary 中的代表 API。若 API 名称因现状不同需要调整，必须选择真实已导出的 API，不新增无意义 wrapper。
5. `scene-core` 继续是 DOM-free 领域库：不得依赖 React、DOM、localStorage、Worker runtime、Wrangler、MCP SDK、repo-scoped skill 或 web components。
6. `apps/web` 继续通过 workspace dependency 使用同一个 `scene-core`。`pnpm --filter @pokopia-scene-editor/web typecheck` 必须通过；Web dev/build 不能因为 core 改为 dist export 而需要手动 hack。
7. 不改变终端用户可见行为，不改 `SceneDocument v1` schema shape，不新增 `SceneDocument v2`，不保存 footprint/stacking/dimension derived state。

## Tasks / Subtasks

- [x] 收敛 `scene-core` package contract (AC: 1, 2)
  - [x] 更新 `packages/scene-core/package.json`：将 `exports` / `types` 指向 `dist`，补充 `files`，保留或调整 `private` 时写清 rationale。
  - [x] 拆分 `typecheck` 与 `build`：`typecheck` 继续 `--noEmit`，`build` 必须清理并生成 `dist/index.js` 与 `.d.ts`。
  - [x] 优先采用“bundle runtime ESM + tsc declarations”的实现，避免 Node ESM 因源码 extensionless relative imports 失败。若选择 tsc NodeNext 直出 JS，必须同步修正源码相对 import 的 `.js` 扩展名并验证 consumer smoke。
- [x] 新增 file-install consumer smoke (AC: 3, 4)
  - [x] 新建 `scripts/verify-scene-core-file-install.mjs` 或同等脚本。
  - [x] 脚本应使用临时目录、写入最小 `package.json`、执行 `pnpm add file:<absolute core path>`，再运行 `node` 导入测试。
  - [x] Smoke 必须先确保 core 已 build，或在缺少 `dist` 时给出明确错误；不要让外部 consumer 依赖 workspace 源码。
  - [x] 在根 `package.json` 增加可运行脚本，例如 `scene-core:file-install:smoke`。是否纳入 `release:verify` 可在 Story 13.6 统一收敛，但本 story 至少要能单独运行。
- [x] 保护领域库边界 (AC: 2, 5, 7)
  - [x] 检查 `packages/scene-core/src/**` 和构建配置，确认没有引入 React/DOM/Worker/MCP/Wrangler/localStorage 依赖。
  - [x] 确认 `dist` 不打包 `assets/pokopia_image_sources/**`。Core 可以继续返回 asset URL/path，但图片文件仍由 Web runtime asset pipeline 管理。
  - [x] 保持 `SceneDocument v1` 字段不变；如果实现过程中发现必须改 schema，停止并先发起 course correction。
- [x] 保持 Web workspace 使用体验 (AC: 6)
  - [x] 验证 `apps/web` 的 `workspace:*` dependency 能解析到同一 package contract。
  - [x] 若 Web dev server 因 dist export 需要预构建，选择一个明确、可维护的策略：root build ordering、package `dev` condition/source alias，或 Vite alias。不得让开发者手工改 import。
  - [x] 不在本 story 删除 `apps/worker`、`.agents/skills/pokopia-scene-worker` 或 Worker scripts；这些属于 Story 13.3。
- [x] 验证 (AC: 1-7)
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core typecheck`
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core test`
  - [x] `pnpm --filter @pokopia-scene-editor/scene-core build`
  - [x] `pnpm run scene-core:file-install:smoke` 或实际新增的等价脚本
  - [x] `pnpm --filter @pokopia-scene-editor/web typecheck`
  - [x] `git diff --check`

### Review Findings

- [x] [Review][Patch] File-install smoke could validate stale `dist` and missed TypeScript NodeNext declaration consumers.
- [x] [Review][Patch] Generated `.d.ts.map` files pointed to source files excluded from package contents.
- [x] [Review][Patch] Catalog helper assertion used `assetCatalog[0].id`, producing a false-positive runtime smoke.
- [x] [Review][Patch] Package runtime floor and clean script portability were implicit.

## Dev Notes

### Current State

- `packages/scene-core/package.json` 当前把 `exports["."].types` 和 `exports["."].import` 都指向 `./src/index.ts`，`build` 只是运行 `typecheck`，没有输出 JS 或 declaration files。
- `packages/scene-core/tsconfig.json` 使用 `module: "ESNext"`、`moduleResolution: "Bundler"`、`composite: true`，当前适合 workspace/source consumption，不足以证明外部 Node consumer 可以直接运行。
- `packages/scene-core/src/index.ts` 是唯一 public barrel，导出 assets、scene、io 和 locale。优先保持单入口，不要在本 story 扩大 public subpath API。
- Core 源码大量使用 extensionless relative imports，例如 `export * from './domain/assets'`、`import { ... } from './catalog'`。Node ESM 不做 extension searching；如果构建后仍保留这些 relative specifier，外部 Node import 可能失败。
- `apps/web/package.json` 通过 `"@pokopia-scene-editor/scene-core": "workspace:*"` 消费 core；`apps/web/vite.config.ts` 的 chunk 分组仍匹配 `/src/domain/assets/source-/`，如果 core 输出路径改为 `dist`，实现时要确认这个分组不会造成构建错误或过时假设。
- 根 `package.json` 仍包含 Worker/MCP/skill 脚本和 release gate；本 story 只增加 core file-install smoke，不负责删除这些旧边界。

### Preferred Implementation Shape

- Runtime JS 推荐用已有生态的 bundler 产出单个 ESM entry，如 `dist/index.js`，将内部 extensionless relative imports 消除在 bundle 内。仓库 lockfile 已有 `esbuild`，且 `pnpm-workspace.yaml` 已允许 `esbuild` build scripts；若直接调用 CLI，应把所需 build tool 声明在 `packages/scene-core/package.json` 的 devDependencies 或使用 repo 已声明工具链的稳定入口。
- Types 推荐用 TypeScript declaration emit 产出 `.d.ts`。可以新增 `packages/scene-core/tsconfig.build.json`，与 `typecheck` 分离；注意排除 tests 和 `src/test/**`。
- `private: true` 只阻止 npm publish，不应替代 file-install smoke。若保留 `private: true`，可在 README 或 story completion note 中说明当前目标是 local file install，不是 registry publish。
- Package contents 用 `files` 控制，目标是小而明确。建议 smoke 或 pack check 验证不会把源码测试、临时目录、archive 或图片资源装进 consumer。

### Project Structure Notes

- Likely touched files:
  - `packages/scene-core/package.json`
  - `packages/scene-core/tsconfig.json`
  - `packages/scene-core/tsconfig.build.json` (new, if useful)
  - `packages/scene-core/README.md` (new, if documenting local install/build contract)
  - `scripts/verify-scene-core-file-install.mjs` (new)
  - `package.json`
  - `pnpm-lock.yaml` if a direct build dependency is added
- Do not touch in this story unless a blocker proves unavoidable:
  - `apps/worker/**`
  - `.agents/skills/pokopia-scene-worker/**`
  - Worker/MCP/skill removal scripts
  - `SceneDocument v1` schema shape

### Previous Story Intelligence

- Story 13.1 archived Epic 1-12 and reset active planning/tracker to Polish-stage Epic 13. It made no source code changes.
- Current planning docs now state the repository target is only Web + `scene-core`; API/MCP/skill migration/removal follows in later stories.
- Story 13.1 explicitly requires a new course correction before any `SceneDocument v1` schema change.

### Git Intelligence

- Recent commits focus on export preview cell sizing, audited asset footprints, import compatibility, asset catalog ordering, and canvas controls. This story must not perturb those behaviors.
- Keep changes package/build/smoke focused. Do not combine Story 13.3 code removal or Story 13.4 data cleanup into this implementation.

### Latest Technical Information

- pnpm supports installing from local filesystem directories; directory installs create a symlink in the consumer `node_modules`, so the installed package must already have a valid package contract and build output. Reference: https://pnpm.io/package-sources
- Node package `exports` targets must be relative paths beginning with `./`; Node ESM relative/absolute import specifiers require explicit file extensions and do not perform extension searching. Reference: https://nodejs.org/api/packages.html
- TypeScript `declaration` emits `.d.ts` files that describe the module's external API. Reference: https://www.typescriptlang.org/tsconfig/declaration.html
- npm `private: true` prevents publishing to a registry; it is not a substitute for verifying local file install behavior. Reference: https://docs.npmjs.com/cli/v11/configuring-npm/package-json/

### References

- `_bmad-output/planning-artifacts/epics.md` - Story 13.2 AC and Epic 13 scope.
- `_bmad-output/planning-artifacts/prd.md` - 2026-05-30 course correction: product is Polish-stage, Web + file-installable core only, no `SceneDocument v1` change.
- `_bmad-output/planning-artifacts/architecture.md` - target structure `apps/web` + `packages/scene-core`; release gate should include file-install smoke.
- `_bmad-output/planning-artifacts/ux-design-specification.md` - user-visible Web workflow must not change during repo slimming.
- `_bmad-output/implementation-artifacts/13-1-planning-archive-and-release-boundary-rewrite.md` - previous story completion and next-story pointer.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-05-30T12:10:17+0800 - Started `bmad-dev-story` implementation; tracker moved to `in-progress`.
- 2026-05-30T12:11:00+0800 - Added file-install smoke first; it failed as expected because `dist/index.js` did not exist.
- 2026-05-30T12:12:00+0800 - Added `dist` package contract, esbuild runtime bundle, TypeScript declaration build, and README rationale for `private: true`.
- 2026-05-30T12:14:00+0800 - Added Web TypeScript/Vite source alias so workspace dev/typecheck does not require manual core prebuild.
- 2026-05-30T12:20:00+0800 - Code review found stale-dist, TypeScript declaration, declaration-map, smoke assertion, and portability/runtime-floor issues.
- 2026-05-30T12:24:11+0800 - Addressed code review findings and moved story to `done`.

### Completion Notes List

- `scene-core` package root now resolves external consumers to `dist/index.js` and `dist/index.d.ts`; `src/index.ts` is no longer the external install contract.
- `scene-core` build now cleans `dist`, bundles runtime ESM with esbuild, and emits declarations with a dedicated build tsconfig that excludes tests and `src/test/**`.
- Added `scene-core:file-install:smoke`, which installs the built package into a temporary ESM consumer and imports real public APIs covering schema/parse, default scene, catalog, dimensions, codec, selector, and export summary.
- The smoke now rebuilds `scene-core` first and also runs a temporary TypeScript NodeNext consumer against the installed package declarations.
- Declaration output now rewrites relative `.d.ts` specifiers to NodeNext-compatible `.js` / `index.js` targets and omits declaration maps that would point to unpacked source files.
- Web workspace consumption keeps the package name but uses a TS/Vite source alias for local development; root build still builds core before web.
- `SceneDocument v1` schema shape and user-visible Web behavior were not changed.

### File List

- `_bmad-output/implementation-artifacts/13-2-scene-core-file-installable-package.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/tsconfig.app.json`
- `apps/web/vite.config.ts`
- `package.json`
- `packages/scene-core/README.md`
- `packages/scene-core/package.json`
- `packages/scene-core/tsconfig.build.json`
- `pnpm-lock.yaml`
- `scripts/fix-scene-core-declarations.mjs`
- `scripts/verify-scene-core-file-install.mjs`

### Change Log

- 2026-05-30: Implemented Story 13.2 and moved status to `review`.
- 2026-05-30: Addressed code review findings and moved status to `done`.
