---
title: '高分辨率图片导出'
type: 'feature'
created: '2026-05-29T00:00:00+08:00'
status: 'done'
route: 'quick-spec-fallback'
baseline_commit: '2ff0ded99e97ce7e177f7c295614120df2f6ba3f'
context:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/archive/2026-05-27/implementation-artifacts/completed-stories/6-3-image-file-generation-download-and-regression-tests.md'
---

# 高分辨率图片导出

<frozen-after-approval reason="human-owned intent -- do not modify unless human renegotiates">

## Intent

**Problem:** 当前图片导出使用导出预览 DOM 的 CSS 像素尺寸生成 PNG，`html-to-image` 仍以 `pixelRatio: 1` 截图。导出预览宽度已收敛到约 590px 后，下载图在分享、放大或打印时容易显得分辨率偏低。

**Approach:** 保持浏览器端 DOM 图片导出技术栈和预览弹窗视觉尺寸不变，把下载 PNG 的默认栅格密度提升到确定性的 2x。导出仍从同一个展开后的 `.export-preview` DOM 生成，逻辑尺寸用于布局和完整滚动内容测量，实际 PNG bitmap 尺寸为逻辑宽高乘以导出 scale。

## Boundaries & Constraints

**Always:** 默认导出 scale 为 2x；`.export-preview` 在页面上的宽度、移动端布局和滚动行为不变；导出内容继续包含标题、整体素材、逐层 7x7 图形、逐层素材清单、层备注和 `pokokit` logo；控制按钮继续通过 `data-image-export-exclude` 排除；下载流程不得修改 `SceneDocument`、autosave、saved scene 或 `pokopia.uiPreferences.v1`；导出前展开预览、导出后恢复 style/scroll 的现有行为必须保留。

**Ask First:** 如果要提供用户可选倍率、超过 2x、改成 JPEG/WebP/PDF、改变文件名后缀、扩大导出预览弹窗宽度、引入服务端图片渲染、把图片导出搬进 Worker/R2/Browser Rendering，或改动 `SceneDocument v1` / export summary schema，必须暂停确认。

**Never:** 不新增第二套图片绘制器；不把 `html-to-image`、React DOM 或浏览器截图依赖放入 Worker bundle；不通过 CSS transform/zoom 改变用户看到的预览尺寸来伪造高分辨率；不减少导出图片内容以换取更高像素；不恢复 JSON 文件导出作为用户可见导出产物。

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| 默认下载 | 桌面端 `.export-preview` 逻辑宽度约 590px | 页面预览仍约 590px；下载 PNG bitmap 宽度约 1180px，高度为完整逻辑导出高度的 2x；文件名仍为 `<sanitized-scene-name>.pokopia-scene.png` | 无需提示倍率，成功 toast 维持现有语义 |
| 长内容导出 | 预览 body 有滚动内容或多层素材清单 | PNG 高度包含完整滚动内容并按 2x 输出；导出后预览 element 和 body 的 inline style、overflow、scrollTop 恢复 | 若预览隐藏或尺寸为 0，沿用现有 visible 错误 |
| 图片资源失败 | 某些素材缩略图加载失败 | 继续使用透明 placeholder，不让单个图片失败阻断整张导出 | 下载失败 toast 只在 renderer 无法返回 PNG blob 时出现 |
| Storage 边界 | 下载前后读取 scene snapshot 和 localStorage | scene、autosave、saved scene、UI preferences 均不变化 | 失败路径也不得写 storage |

</frozen-after-approval>

## Code Map

- `apps/web/src/io/image-export.ts` -- 当前 `createImageExportFile` 计算逻辑尺寸、展开 DOM，并把 `pixelRatio: 1` 传给 `html-to-image`。
- `apps/web/src/io/image-export.test.ts` -- 覆盖文件名、DOM capture options、完整滚动高度、filter 和隐藏预览错误。
- `apps/web/src/components/app-shell/AppShell.tsx` -- 调用 `createImageExportFile`、创建 Blob URL、触发下载并显示成功/失败 toast。
- `apps/web/src/components/app-shell/AppShell.test.tsx` -- mock `html-to-image`，断言下载选项、Blob URL 清理和 storage 不变。
- `apps/web/e2e/workbench-smoke.spec.ts` -- 打开导出预览、下载 PNG、读取 PNG IHDR 尺寸并断言 storage 不变。
- `apps/web/src/components/export-preview/ExportPreview.tsx` 和 `apps/web/src/styles.css` -- 预览 DOM/样式来源；本 spec 不要求改变视觉宽度或内容结构。

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/io/image-export.ts` -- 增加单一导出倍率常量，例如 `imageExportPixelRatio = 2`，并在 `toBlob` options 使用该值；保持 `canvasWidth`、`canvasHeight`、`width`、`height` 为逻辑尺寸，避免同时手动放大 canvas size 和 `pixelRatio` 造成 4x 输出。
- [x] `apps/web/src/io/image-export.ts` -- 让 `ImageExportFile.width` / `height` 表示实际 PNG bitmap 像素尺寸，或显式新增 `logicalWidth` / `logicalHeight` 与 `pixelWidth` / `pixelHeight`；测试必须防止返回 metadata 仍假装是 1x。
- [x] `apps/web/src/io/image-export.test.ts` -- 更新导出 helper 测试：逻辑尺寸仍来自 preview box/full scroll body，`toBlob` 收到 `pixelRatio: 2`，返回文件尺寸为逻辑尺寸的 2x，filter/placeholder/restore 行为不回退。
- [x] `apps/web/src/components/app-shell/AppShell.test.tsx` -- 更新下载测试对 `pixelRatio` 的断言，并继续证明 Blob URL 释放、成功 toast 和 scene/storage 不变。
- [x] `apps/web/e2e/workbench-smoke.spec.ts` -- 将 PNG IHDR 尺寸断言改为逻辑导出尺寸乘以 2，同时保留预览弹窗视觉宽度仍为 590px、完整滚动内容高度、文件名和 storage boundary 断言。

**Acceptance Criteria:**
- Given 用户在桌面端打开图片导出预览, when 下载图片, then 页面上的导出预览宽度仍约 590px，但下载 PNG 的实际像素宽度为逻辑导出宽度的 2x。
- Given 导出预览内容高度超过可视区域, when 下载图片, then PNG 包含完整预览内容且实际像素高度为完整逻辑导出高度的 2x。
- Given 下载成功或失败, when 对比下载前后的 scene snapshot 与 localStorage, then `SceneDocument`、autosave、saved scene 和 UI preferences 都不变化。
- Given release gate 运行, then typecheck、unit/component tests、build、smoke 和 whitespace check 均通过。

## Spec Change Log

## Design Notes

`html-to-image` 会以 `canvas.width = canvasWidth * pixelRatio` 和 `canvas.height = canvasHeight * pixelRatio` 输出 bitmap。实现时应把 DOM 展开的逻辑尺寸继续传给 `canvasWidth` / `canvasHeight`，只把 `pixelRatio` 从 1 提到 2；否则同时把尺寸乘 2 再设置 `pixelRatio: 2` 会得到 4x 输出并增加内存风险。

## Verification

**Commands:**
- `pnpm --filter @pokopia-scene-editor/web test -- src/io/image-export.test.ts src/components/app-shell/AppShell.test.tsx` -- expected: focused export tests pass with 2x pixel ratio.
- `pnpm run typecheck` -- expected: TypeScript passes across scene-core, web and worker.
- `pnpm test` -- expected: full unit/component suite passes.
- `pnpm run build` -- expected: production build succeeds.
- `pnpm run smoke` -- expected: Playwright confirms visual preview width unchanged and downloaded PNG dimensions are 2x.
- `git diff --check` -- expected: no whitespace errors.

## Suggested Review Order

**导出倍率**

- 统一 2x 倍率，避免各处硬编码。
  [`image-export.ts:16`](../../apps/web/src/io/image-export.ts#L16)

- 保持逻辑尺寸不变，只提高 bitmap 密度。
  [`image-export.ts:29`](../../apps/web/src/io/image-export.ts#L29)

- 返回 metadata 反映实际 PNG 像素尺寸。
  [`image-export.ts:50`](../../apps/web/src/io/image-export.ts#L50)

**回归覆盖**

- 锁定 helper 的 2x 输出和完整滚动高度。
  [`image-export.test.ts:31`](../../apps/web/src/io/image-export.test.ts#L31)

- 证明 AppShell 下载路径使用 2x renderer。
  [`AppShell.test.tsx:450`](../../apps/web/src/components/app-shell/AppShell.test.tsx#L450)

- 真实下载 PNG IHDR 断言乘以 2x。
  [`workbench-smoke.spec.ts:377`](../../apps/web/e2e/workbench-smoke.spec.ts#L377)
