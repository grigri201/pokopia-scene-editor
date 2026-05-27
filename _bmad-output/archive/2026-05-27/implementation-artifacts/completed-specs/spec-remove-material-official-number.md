---
title: '移除导出素材编号显示'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 移除导出素材编号显示

## Intent

**Problem:** 图片导出预览的素材清单仍显示 `No. ...` 官方编号，用户要求去掉该字段，让素材行更聚焦于名称和数量。

**Approach:** 从导出预览的统一素材行中移除官方编号，只保留素材名和数量；下载 SVG 的整体素材与逐层素材清单同步去掉 `No. ...`，保持预览与下载内容一致；更新组件、SVG 和 smoke 测试，确认编号不再渲染。

## Suggested Review Order

1. 确认预览素材行只显示素材名和数量，不再显示官方编号。
   [`ExportPreview.tsx:219`](../../src/components/export-preview/ExportPreview.tsx#L219)
2. 确认下载 SVG 的整体素材和逐层素材清单也不再输出 `No. ...`。
   [`image-export.ts:55`](../../src/io/image-export.ts#L55)
3. 确认测试覆盖预览 UI、下载 SVG 和 smoke 流程里的编号移除。
   [`ExportPreview.test.tsx:16`](../../src/components/export-preview/ExportPreview.test.tsx#L16)
