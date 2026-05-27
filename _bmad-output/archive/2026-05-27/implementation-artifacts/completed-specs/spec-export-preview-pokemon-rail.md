---
title: '导出预览标题左侧宝可梦图片'
type: 'feature'
created: '2026-05-22T16:34:52+08:00'
status: 'done'
route: 'one-shot'
---

# 导出预览标题左侧宝可梦图片

## Intent

**Problem:** 图片导出预览缺少当前布景宝可梦的视觉锚点，但图片只应显示在标题左侧，不能占据整个导出层左侧。

**Approach:** 使用导出摘要中的 `selectedPokemonKey` 解析宝可梦头像，在预览标题文案左侧渲染受 header 约束的头像块；保持原预览内容列宽和下载流程不变，并用组件测试、smoke 测试和本地 5173 测量覆盖。

## Suggested Review Order

1. [src/components/export-preview/ExportPreview.tsx](../../src/components/export-preview/ExportPreview.tsx#L30) -- 确认宝可梦定义解析、无障碍标签和标题左侧插入位置。
2. [src/styles.css](../../src/styles.css#L400) -- 检查头像块只受标题 header 约束，不再形成导出层左侧全高栏。
3. [e2e/workbench-smoke.spec.ts](../../e2e/workbench-smoke.spec.ts#L125) -- 确认 590px 内容宽度、宝可梦图片在标题左侧且下载流程不变。
4. [src/components/export-preview/ExportPreview.test.tsx](../../src/components/export-preview/ExportPreview.test.tsx#L13) -- 确认组件层面的头像来源和可见性。
