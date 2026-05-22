---
title: '导出入口改为下载预览'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 导出入口改为下载预览

## Intent

**Problem:** 顶部入口仍显示“导出”，与用户对该按钮作为下载前预览入口的文案要求不一致。

**Approach:** 将 AppShell 顶部按钮文案改为“下载预览”，保持其行为为打开图片导出预览；同步更新 AppShell 单元测试和 Playwright smoke 对按钮可访问名称的断言。

## Suggested Review Order

1. 顶部入口文案改为“下载预览”，行为仍打开图片导出预览。
   [`AppShell.tsx:713`](../../src/components/app-shell/AppShell.tsx#L713)
2. 单元测试按新按钮名称打开预览并验证移动端隐藏。
   [`AppShell.test.tsx:32`](../../src/components/app-shell/AppShell.test.tsx#L32)
3. Smoke 测试按新入口文案覆盖预览与下载流程。
   [`workbench-smoke.spec.ts:32`](../../e2e/workbench-smoke.spec.ts#L32)
