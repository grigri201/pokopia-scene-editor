---
title: '移除逐层素材实例坐标列表'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 移除逐层素材实例坐标列表

## Intent

**Problem:** 图片导出预览的逐层素材清单在每个素材下展开显示所有实例坐标和复现备注，信息过密，用户要求去掉该坐标明细区域。

**Approach:** 保留逐层素材清单中的素材名称、编号和数量，移除 UI 中的实例坐标/备注列表；下载 SVG 的逐层素材清单同步改为同样的汇总行，保持预览和下载内容一致；补充组件、SVG 和 smoke 断言，确认实例列表不再渲染。

## Suggested Review Order

1. 确认逐层素材清单只调用汇总 `MaterialList`，不再渲染实例坐标列表。
   [`ExportPreview.tsx:167`](../../src/components/export-preview/ExportPreview.tsx#L167)
2. 确认 CSS 删除 `.export-instance-list` 专用样式，素材列表保留汇总行布局。
   [`styles.css:528`](../../src/styles.css#L528)
3. 确认下载 SVG 的逐层素材清单只输出素材汇总行，不再输出坐标/备注。
   [`image-export.ts:119`](../../src/io/image-export.ts#L119)
4. 确认测试覆盖 UI 和下载 SVG 都不再包含实例坐标/备注。
   [`ExportPreview.test.tsx:24`](../../src/components/export-preview/ExportPreview.test.tsx#L24)
