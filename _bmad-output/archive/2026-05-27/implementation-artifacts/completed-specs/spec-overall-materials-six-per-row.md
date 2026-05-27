---
title: '整体使用素材一行展示六个'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 整体使用素材一行展示六个

## Intent

**Problem:** 图片导出预览顶部的整体使用素材清单使用自适应最小宽度，桌面弹窗中一行只能放 3 个素材卡，用户要求改为一行展示 6 个。

**Approach:** 将整体使用素材清单的桌面网格固定为 6 列，并在窄屏下回退到自适应列宽，避免移动端挤压。扩展 smoke 场景为 6 种整体素材，并用浏览器坐标断言 6 个缩略图卡位于同一行。

## Suggested Review Order

1. 确认整体素材清单桌面网格固定为 6 列，窄屏仍自适应。
   [`styles.css:471`](../../src/styles.css#L471)
2. 确认 smoke 场景包含 6 种整体素材并断言它们在同一行。
   [`workbench-smoke.spec.ts:132`](../../e2e/workbench-smoke.spec.ts#L132)
3. 确认导出 smoke 使用专用场景，不影响恢复 autosave 的场景覆盖。
   [`workbench-smoke.spec.ts:609`](../../e2e/workbench-smoke.spec.ts#L609)
