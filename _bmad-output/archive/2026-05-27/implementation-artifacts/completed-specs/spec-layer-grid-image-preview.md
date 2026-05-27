---
title: '逐层图形改为素材图片预览'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 逐层图形改为素材图片预览

## Intent

**Problem:** 图片导出预览的逐层 7x7 图形使用素材名称缩写展示格子内容，用户在视觉检查时无法直接确认素材外观。

**Approach:** 在 export summary 的 cell instance 中保留素材缩略图 URL 和 alt 文案，逐层 7x7 图形改为渲染素材图片；格子继续保留原有 aria-label，未知素材不回退显示文字。同步补充 domain、组件和 smoke 测试，确认图形格子不再显示文本缩写。

## Suggested Review Order

1. 确认 cell instance summary 携带缩略图数据，供预览层复用同一份导出数据。
   [`export-summary.ts:53`](../../src/domain/scene/export-summary.ts#L53)
2. 确认逐层图形格子渲染图片而非素材名缩写，同时保留格子 aria-label。
   [`ExportPreview.tsx:180`](../../src/components/export-preview/ExportPreview.tsx#L180)
3. 确认格子图片在 7x7 网格内按比例收敛，避免图片撑开格子。
   [`styles.css:505`](../../src/styles.css#L505)
4. 确认测试覆盖缩略图字段、无可见文字缩写和 smoke 预览行为。
   [`ExportPreview.test.tsx:20`](../../src/components/export-preview/ExportPreview.test.tsx#L20)
