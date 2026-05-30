# Sprint Change Proposal - 2026-05-30 按层导出多张图片

**项目:** pokopia-scene-editor
**日期:** 2026-05-30
**提出人:** Grigri
**模式:** Batch
**状态:** Implemented - minor direct adjustment

## 1. Issue Summary

触发变更：Grigri 希望在导出预览界面增加“按层导出多张图片”的能力。导出的第一张图片只显示整体使用素材，之后每张图片只显示对应建筑层内容，并且每张图片都保留导出图顶部和底部。

问题类型：Polish 阶段的用户可见导出体验增强。

现有导出预览已经能生成一张包含整体素材、逐层图形、逐层素材清单、顶部标题区和底部 pokokit 标识的图片。本次变更不需要改变 `SceneDocument v1`，也不需要改变 scene-core export summary contract；它可以复用现有预览 DOM 和浏览器内图片生成路径。

## 2. Impact Analysis

### Epic Impact

当前 Epic 13 已完成。本次不需要新增大型 epic，也不需要回滚已完成故事。它属于 Web 导出体验的小范围直接调整。

### PRD Impact

现有 PRD/UX 已要求图片导出预览和图片下载可读、可信、由当前 SceneDocument 派生。本次新增“按层多图下载”是同一能力的增强，不改变产品边界。

### Architecture Impact

影响范围限定在 `apps/web`：

- `apps/web/src/components/export-preview/ExportPreview.tsx`
- `apps/web/src/io/image-export.ts`
- `apps/web/src/components/app-shell/AppShell.tsx`
- web i18n 和 focused tests

不修改 `packages/scene-core` schema、codec、catalog、export summary 或保存 payload。

### UX Impact

导出预览新增第二个下载按钮：

- `下载图片`：保持原行为，导出当前完整预览为一张图片。
- `按层下载图片`：生成多张图片，顺序为整体素材页、L1、L2、...。

每张分图都复用同一个导出预览顶部标题区和底部 pokokit 标识。导出期间按钮禁用并显示下载状态；导出完成后恢复原预览布局。

## 3. Recommended Approach

选择 **Option 1: Direct Adjustment**。

理由：

- 需求清晰且局限于浏览器 Web 导出路径。
- 现有 `buildImageExportSummary` 已提供整体素材和逐层内容，无需新增业务数据结构。
- 复用现有 DOM 并在导出时临时隐藏/显示页面，比维护第二套隐藏模板更低风险。
- 不触发 autosave，不修改 SceneDocument，不改变单图下载行为。

Rollback 不适用；MVP Review 不适用。

## 4. Detailed Change Proposals

### Web Export Preview

新增导出页标记：

- 整体素材 section 标记为 `data-image-export-page="overall"`。
- 每个层 article 标记为 `data-image-export-page="layer"`，文件片段使用层显示 ID，例如 `L1`。
- 层容器标记为 `data-image-export-layer-container="true"`。

新增 `onDownloadLayerImages` prop 和按钮 `按层下载图片`。

### Image Export IO

新增 `createLayeredImageExportFiles()`：

- 发现 overall page 和所有 layer pages。
- 第一轮只显示 overall page，并隐藏层容器。
- 后续每轮只显示一个 layer page，并隐藏 overall page 和其他层。
- 每轮调用现有 `createImageExportFile()`。
- finally 恢复原 display 和 export mode。

文件命名：

- 单图保持 `{scene}.pokopia-scene.png`。
- 分图为 `{scene}.overall.pokopia-scene.png`、`{scene}.L1.pokopia-scene.png`、`{scene}.L2.pokopia-scene.png`。

### App Shell

新增 `downloadLayeredExportImages()`，顺序创建多张 PNG Blob URL 并触发下载。成功后显示“分层图片已准备下载”。

## 5. Checklist Status

- [x] 1.1 Trigger story: 无单一 story；用户直接提出导出体验增强。
- [x] 1.2 Core problem: 现有导出只能一次生成完整长图，不能拆成整体素材页和逐层页。
- [x] 1.3 Evidence: 现有 `ExportPreview` 已集中渲染整体素材和逐层内容，`image-export.ts` 已负责 DOM capture。
- [x] 2.1 Current epic impact: Epic 13 已完成，本次无需重排。
- [x] 2.2 Epic-level change: 不需要新增 epic。
- [x] 2.3 Remaining epics: 当前无 active backlog epic。
- [x] 3.1 PRD impact: 不改变现有产品范围。
- [x] 3.2 Architecture impact: Web-only，保持 scene-core contract。
- [x] 3.3 UX impact: 新增按钮和多图下载反馈，保持原单图下载。
- [x] 3.4 Other artifacts: 更新 focused tests 和 i18n。
- [x] 4.1 Direct adjustment: 可行，低风险。
- [N/A] 4.2 Rollback: 不适用。
- [N/A] 4.3 MVP review: 不适用。
- [x] 4.4 Recommended path: Direct Adjustment。
- [x] 5.1-5.5 Proposal components: 本文完成，并已实现。

## 6. Implementation Handoff

Scope classification：Minor。

执行者：Developer agent。

成功标准：

- 导出预览显示 `下载图片` 和 `按层下载图片`。
- 单图下载行为保持。
- 按层下载生成 `overall` + 每个建筑层各一张图片。
- 每张图片保留顶部标题区和底部 pokokit 标识。
- 导出后预览 DOM 恢复为完整整体 + 所有层显示。
- Focused tests、typecheck、web build 和浏览器核验通过。
