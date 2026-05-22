---
title: '导出预览宽度减半'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 导出预览宽度减半

## Intent

**Problem:** 图片导出预览弹窗仍使用约 1180px 的宽度，用户要求将导出预览的宽度改为当前宽度的一半。

**Approach:** 将 `.export-preview` 的桌面宽度从 `min(1180px, 100%)` 调整为 `min(590px, 100%)`，保留移动端可用的 100% 上限。扩展 smoke，直接测量导出预览弹窗宽度为 590px，同时保留已有素材清单、层顺序、下载和安全文本断言。

## Suggested Review Order

1. 确认导出预览弹窗宽度从 1180px 改为 590px。
   [`styles.css:400`](../../src/styles.css#L400)
2. 确认 smoke 直接测量弹窗宽度，避免后续回退。
   [`workbench-smoke.spec.ts:124`](../../e2e/workbench-smoke.spec.ts#L124)
3. 确认同一个 smoke 仍覆盖导出预览内容、下载 SVG 和 payload 不变。
   [`workbench-smoke.spec.ts:128`](../../e2e/workbench-smoke.spec.ts#L128)
