---
title: '导出数据包含技能数量'
type: 'feature'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 导出数据包含技能数量

## Intent

**Problem:** 图片导出的 summary 只包含素材数量，素材实例上的技能和空格技能标记没有进入导出数据，导出预览和下载图片无法反映技能数量。

**Approach:** 在 `ImageExportSummary` 增加整体和逐层技能数量，并把空格技能标记纳入导出单元格数据。导出预览和 SVG 下载都显示“技能数量”，且空格技能格子在导出图形中不再显示为 empty。

## Suggested Review Order

1. 确认导出 summary 同时统计素材实例技能和空格技能标记，并按整体/逐层输出数量。
   [`export-summary.ts:20`](../../src/domain/scene/export-summary.ts#L20)
2. 确认导出预览在整体清单和逐层清单中显示技能数量，并用技能图标标出空格技能格子。
   [`ExportPreview.tsx:136`](../../src/components/export-preview/ExportPreview.tsx#L136)
3. 确认 SVG 下载文本包含技能数量，并为只有技能标记的格子绘制技能短标识且动态计算高度。
   [`image-export.ts:38`](../../src/io/image-export.ts#L38)
4. 确认导出模型、预览和 SVG 的回归测试覆盖了技能数量和空格技能标记。
   [`export-summary.test.ts:7`](../../src/domain/scene/export-summary.test.ts#L7)
