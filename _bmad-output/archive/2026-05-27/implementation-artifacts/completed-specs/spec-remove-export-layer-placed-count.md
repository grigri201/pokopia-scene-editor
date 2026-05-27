---
title: '去掉导出层素材数量副标题'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 去掉导出层素材数量副标题

## Intent

**Problem:** 图片导出预览的每个建筑层标题下会显示 `placed items` 数量副标题，用户要求去掉该文案。

**Approach:** 从导出预览层标题中移除素材数量段落，并从 SVG 下载输出中移除非空层的 `placed items` 数量文字；空层状态仍保留既有 `空层` 提示。补充组件、SVG 和 smoke 回归断言，确保预览与下载文件都不再出现该文案。

## Suggested Review Order

1. 确认导出层标题只保留建筑层编号和名称。
   [`ExportPreview.tsx:154`](../../src/components/export-preview/ExportPreview.tsx#L154)
2. 确认 SVG 下载只保留空层提示，不再输出非空层数量副标题。
   [`image-export.ts:88`](../../src/io/image-export.ts#L88)
3. 确认组件、SVG 和 smoke 断言都覆盖 `placed items` 已移除。
   [`ExportPreview.test.tsx:25`](../../src/components/export-preview/ExportPreview.test.tsx#L25)
