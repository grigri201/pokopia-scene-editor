---
title: '技能标记按钮二次点击取消'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 技能标记按钮二次点击取消

## Intent

**Problem:** 底部操作条的技能按钮只能把实例设置为对应技能，无法在当前技能已激活时通过第二次点击取消标识。浏览器批注明确要求技能按钮第一次点击添加技能标识，第二次点击删除技能标识。

**Approach:** 保持技能按钮的 accessible name 稳定为“设置技能标记：...”并继续用 `aria-pressed` 表达激活状态；点击当前已激活技能时改为调用清除技能标记路径。补 SelectionInspector 单元测试和 AppShell 集成测试，覆盖第一次添加、第二次取消以及 `skillNote` 清空。

## Suggested Review Order

- 技能按钮以当前 pressed 状态决定设置或取消。
  [`SelectionInspector.tsx:121`](../../src/components/selection-inspector/SelectionInspector.tsx#L121)

- 组件测试覆盖 active 技能按钮二次点击调用清除路径。
  [`SelectionInspector.test.tsx:200`](../../src/components/selection-inspector/SelectionInspector.test.tsx#L200)

- AppShell 集成测试验证真实 scene payload 从添加回到清空。
  [`AppShell.test.tsx:424`](../../src/components/app-shell/AppShell.test.tsx#L424)
