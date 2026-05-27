---
title: '右键删除格子素材'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 右键删除格子素材

## Intent

**Problem:** 画布已有左键放置/选择路径，但删除素材只能通过底部操作条触发。浏览器批注明确要求画布格子支持快捷操作：左键添加，右键删除；右键删除时不能依赖当前选中的素材。

**Approach:** 在 `SceneCanvas` 的 editable 格子上拦截 `contextmenu`，向 AppShell 发送纯坐标删除意图，不走左键选择/放置路径。AppShell 按当前建筑层和右键坐标查找该格顶部素材实例并复用 `editAssetInstance(type: 'delete')` 删除，同时保留当前选中素材，方便继续左键添加。

## Suggested Review Order

- 画布格子新增右键删除坐标回调，不混入左键选择逻辑。
  [`SceneCanvas.tsx:107`](../../src/components/scene-canvas/SceneCanvas.tsx#L107)

- 右键只在 editable 模式阻止默认菜单并发出删除意图。
  [`SceneCanvas.tsx:293`](../../src/components/scene-canvas/SceneCanvas.tsx#L293)

- AppShell 按当前建筑层和右键坐标直接删除目标素材实例。
  [`AppShell.tsx:407`](../../src/components/app-shell/AppShell.tsx#L407)

- 集成测试确认选中其他素材时右键只删除、不替换、不清空素材选择。
  [`AppShell.test.tsx:462`](../../src/components/app-shell/AppShell.test.tsx#L462)

- SceneCanvas 测试确认右键不会触发 select/view 边界。
  [`SceneCanvas.test.tsx:94`](../../src/components/scene-canvas/SceneCanvas.test.tsx#L94)
