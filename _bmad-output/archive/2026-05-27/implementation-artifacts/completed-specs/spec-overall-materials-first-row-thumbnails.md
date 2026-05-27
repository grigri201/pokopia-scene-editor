---
title: '整体素材预览移到首行并显示配图'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 整体素材预览移到首行并显示配图

## Intent

**Problem:** 图片导出预览中的“整体使用素材”清单以侧栏形式显示，缺少素材配图，不符合用户希望它作为第一行摘要并带缩略图的预览方式。

**Approach:** 将导出预览主体改为先显示整体素材摘要、再显示逐层图形和素材清单；整体素材条目复用 export summary 中已有的素材缩略图数据，逐层素材清单保持原有文本密度；同步补充组件测试和 smoke 断言。

## Suggested Review Order

1. 确认整体素材清单仍是 `Export image content` 的第一个区块，并只在整体摘要中显示缩略图。
   [`ExportPreview.tsx:119`](../../src/components/export-preview/ExportPreview.tsx#L119)
2. 确认导出预览 CSS 从侧栏布局变为首行摘要，并让整体素材条目以带缩略图的响应式卡片排列。
   [`styles.css:450`](../../src/styles.css#L450)
3. 确认组件测试和 smoke 覆盖首行位置与缩略图可见性。
   [`ExportPreview.test.tsx:14`](../../src/components/export-preview/ExportPreview.test.tsx#L14)
