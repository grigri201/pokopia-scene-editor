---
title: '导出层顺序改为从低到高'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 导出层顺序改为从低到高

## Intent

**Problem:** 图片导出预览复用了工作台建筑层面板的高到低展示顺序，导致导出内容从 L3/L2 开始展示，不符合用户要求的低层到高层阅读顺序。

**Approach:** 在 `buildImageExportSummary` 边界将建筑层上下文按 `levelNumber` 升序排序，保持左侧建筑层面板逻辑不变；导出预览和下载 SVG 共用该 summary，因此二者同步改为 L0 到 Ln。补充 domain、组件、smoke 和 SVG 顺序断言。

## Suggested Review Order

1. 确认 export summary 在构建层摘要前按 `levelNumber` 升序排序。
   [`export-summary.ts:72`](../../src/domain/scene/export-summary.ts#L72)
2. 确认 domain 和组件测试覆盖 L0、L1、L2 顺序。
   [`export-summary.test.ts:26`](../../src/domain/scene/export-summary.test.ts#L26)
3. 确认 smoke 和 SVG 高度测试随低到高顺序更新。
   [`workbench-smoke.spec.ts:127`](../../e2e/workbench-smoke.spec.ts#L127)
