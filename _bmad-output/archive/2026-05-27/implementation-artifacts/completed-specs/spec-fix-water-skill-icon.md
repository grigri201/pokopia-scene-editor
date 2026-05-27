---
title: '修正储水技能图标'
type: 'bugfix'
created: '2026-05-22T17:09:40+08:00'
status: 'done'
route: 'one-shot'
---

# 修正储水技能图标

## Intent

**Problem:** 选择检查器里的 `蓄水` 技能按钮和共享技能标记把 `储水` 映射到了 Water basin 素材缩略图，和 Pokopia 的 Water specialty 图标不一致。

**Approach:** 从 PokopiaDex Water specialty 来源保存本地 `specialty_icons/water.png`，并把 `储水` 的共享技能图标路径切换到该水滴图标；保持 `储水` 为持久化 canonical skill type、`蓄水` 为按钮展示标签不变。

## Suggested Review Order

1. [src/domain/assets/catalog.ts](../../src/domain/assets/catalog.ts#L55) -- 确认 `储水` 技能图标映射到 `specialty_icons/water.png`，不再复用 Water basin。
2. [assets/pokopia_image_sources/specialty_icons/water.png](../../assets/pokopia_image_sources/specialty_icons/water.png) -- 确认本地水滴 specialty 图标存在。
3. [src/domain/assets/catalog.test.ts](../../src/domain/assets/catalog.test.ts#L86) -- 确认 legacy `water` 仍归一到 `储水` 且图标路径正确。
4. [src/components/selection-inspector/SelectionInspector.test.tsx](../../src/components/selection-inspector/SelectionInspector.test.tsx#L249) -- 确认 `蓄水` 按钮显示新图标，同时仍保存 canonical `储水`。
5. [assets/pokopia_image_sources/README.md](../../assets/pokopia_image_sources/README.md#L26) -- 确认 specialty icon 来源记录清楚。
