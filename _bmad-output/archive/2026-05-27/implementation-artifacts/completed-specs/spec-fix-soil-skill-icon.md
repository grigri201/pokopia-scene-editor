---
title: '修正耕地技能图标'
type: 'bugfix'
created: '2026-05-22T17:21:43+08:00'
status: 'done'
route: 'one-shot'
---

# 修正耕地技能图标

## Intent

**Problem:** 选择检查器里的 `耕地` 技能按钮和共享技能标记把 `耕地` 映射到了 Farm Soil Ridge 素材缩略图，和 Pokopia 的 Rototiller ability 图标不一致。

**Approach:** 从 PokopiaDex Rototiller ability 来源保存本地 `ability_icons/rototiller.png`，并把 `耕地` 的共享技能图标路径切换到该锄地图标；保持 `耕地` 为持久化 canonical skill type 和按钮展示标签不变。

## Suggested Review Order

1. [src/domain/assets/catalog.ts](../../src/domain/assets/catalog.ts#L55) -- 确认 `耕地` 技能图标映射到 `ability_icons/rototiller.png`，不再复用 Farm Soil Ridge。
2. [assets/pokopia_image_sources/ability_icons/rototiller.png](../../assets/pokopia_image_sources/ability_icons/rototiller.png) -- 确认本地 Rototiller ability 图标存在。
3. [src/domain/assets/catalog.test.ts](../../src/domain/assets/catalog.test.ts#L86) -- 确认 legacy `soil` 仍归一到 `耕地` 且图标路径正确。
4. [src/components/selection-inspector/SelectionInspector.test.tsx](../../src/components/selection-inspector/SelectionInspector.test.tsx#L139) -- 确认 `耕地` 按钮显示新图标。
5. [src/components/scene-canvas/SceneCanvas.test.tsx](../../src/components/scene-canvas/SceneCanvas.test.tsx#L340) -- 确认 canvas 上的 `耕地` 技能角标也使用同一图标。
6. [assets/pokopia_image_sources/README.md](../../assets/pokopia_image_sources/README.md#L29) -- 确认 ability icon 来源记录清楚。
