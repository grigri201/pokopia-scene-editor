---
title: '逐层素材清单改为带图两列'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 逐层素材清单改为带图两列

## Intent

**Problem:** 图片导出预览的逐层素材清单只显示文字，单个素材条目横向占满整列，用户要求加图片、缩短，并且一行放两个。

**Approach:** 让逐层素材清单复用带缩略图的素材列表渲染路径，并在逐层区域单独设置紧凑样式：36px 缩略图、较低卡片高度、桌面两列布局。窄屏下自动回退，避免小屏挤压。扩展组件测试和 smoke，验证逐层清单有缩略图、无编号、且两个条目同行排列。

## Suggested Review Order

1. 确认逐层素材清单调用带缩略图的 MaterialList。
   [`ExportPreview.tsx:168`](../../src/components/export-preview/ExportPreview.tsx#L168)
2. 确认逐层清单两列和紧凑缩略图样式只作用于逐层区域。
   [`styles.css:552`](../../src/styles.css#L552)
3. 确认 smoke 覆盖逐层清单的缩略图与两列排列。
   [`workbench-smoke.spec.ts:147`](../../e2e/workbench-smoke.spec.ts#L147)
