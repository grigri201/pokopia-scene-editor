---
title: '清除选中格子素材'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 清除选中格子素材

## Intent

**Problem:** 选中格子底部操作条的清除按钮被标记为“清除技能标记”，但浏览器批注确认该按钮应清除选中格子中的素材。旧实现会误导可访问名称，并且实际执行清技能标记而不是删除当前素材实例。

**Approach:** 将该按钮改为“清除选中格子中的素材”，接入已有素材实例删除 command，并保留独立的技能标记按钮行为。用 SelectionInspector 单元测试和 AppShell 集成测试覆盖文案、启用状态和实际删除路径。

## Suggested Review Order

- 从操作条入口确认按钮语义和回调已经改为清当前素材实例。
  [`SelectionInspector.tsx:104`](../../src/components/selection-inspector/SelectionInspector.tsx#L104)

- AppShell 复用既有实例删除 command，保持 read-only 边界。
  [`AppShell.tsx:392`](../../src/components/app-shell/AppShell.tsx#L392)

- SelectionInspector 测试覆盖新 accessible name、tooltip 和回调。
  [`SelectionInspector.test.tsx:137`](../../src/components/selection-inspector/SelectionInspector.test.tsx#L137)

- AppShell 集成测试确认点击按钮会删除格子素材并保留选中格。
  [`AppShell.test.tsx:393`](../../src/components/app-shell/AppShell.test.tsx#L393)
