---
title: '整体素材卡改为纵向排列'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 整体素材卡改为纵向排列

## Intent

**Problem:** 导出预览宽度减半后，顶部整体使用素材卡仍使用横向的缩略图加文字布局，单列宽度不足时素材名称会被挤成竖排。

**Approach:** 仅在整体使用素材清单中覆盖带缩略图素材卡的内部布局，让缩略图、素材名和数量纵向排列；保留一行 6 个整体素材卡、逐层素材两列和移动端自适应规则。扩展 smoke 通过几何关系验证整体素材卡文字位于缩略图下方。

## Suggested Review Order

1. 确认整体素材清单卡片内部改为纵向排列。
   [`styles.css:475`](../../src/styles.css#L475)
2. 确认纵向覆盖只作用于整体素材清单，不影响逐层素材紧凑两列。
   [`styles.css:552`](../../src/styles.css#L552)
3. 确认 smoke 继续验证整体素材一行 6 个，并新增文字在缩略图下方的断言。
   [`workbench-smoke.spec.ts:141`](../../e2e/workbench-smoke.spec.ts#L141)
