---
title: '导出预览左侧宝可梦全高度图片'
type: 'feature'
created: '2026-05-22T16:34:52+08:00'
status: 'done'
route: 'one-shot'
---

# 导出预览左侧宝可梦全高度图片

## Intent

**Problem:** 图片导出预览缺少当前布景宝可梦的视觉锚点，用户要求在预览左侧增加全高度宝可梦图片。

**Approach:** 使用导出摘要中的 `selectedPokemonKey` 解析宝可梦头像，在预览弹窗左侧渲染贴边全高度图片栏；保持原预览内容列宽和下载流程不变，并用组件测试、smoke 测试和本地 5173 测量覆盖。

## Suggested Review Order

1. [src/components/export-preview/ExportPreview.tsx](../../src/components/export-preview/ExportPreview.tsx#L30) -- 确认宝可梦定义解析、无障碍标签和侧栏插入位置。
2. [src/styles.css](../../src/styles.css#L400) -- 检查侧栏是否贴在弹窗左侧、跨越全高度，并在手机宽度隐藏。
3. [e2e/workbench-smoke.spec.ts](../../e2e/workbench-smoke.spec.ts#L125) -- 确认 590px 内容宽度、宝可梦图片可见、图片接近全高度且下载流程不变。
4. [src/components/export-preview/ExportPreview.test.tsx](../../src/components/export-preview/ExportPreview.test.tsx#L13) -- 确认组件层面的头像来源和可见性。
