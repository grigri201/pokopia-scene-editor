---
title: '默认布景名称去掉宝可梦名'
type: 'bugfix'
created: '2026-05-22T16:58:53+08:00'
status: 'done'
route: 'one-shot'
---

# 默认布景名称去掉宝可梦名

## Intent

**Problem:** 新建默认布景会使用当前宝可梦名生成 `百变怪的布景`、`伊布的布景` 这类名称，和用户要求的中性默认布景名不一致。

**Approach:** 将默认场景名称集中为 `5x5 布景`，保留显式传入的自定义名称和 Open Design demo 名称；恢复旧数据时，仅把历史默认名和与当前 `selectedPokemonKey` 匹配的旧自动生成名迁移为中性默认名。

## Suggested Review Order

1. [src/domain/scene/default-scene.ts](../../src/domain/scene/default-scene.ts#L14) -- 确认默认名称常量和默认创建逻辑不再读取宝可梦中文名。
2. [src/io/scene-recovery.ts](../../src/io/scene-recovery.ts#L97) -- 确认旧自动生成名会迁移，自定义名称不会被覆盖。
3. [src/domain/scene/default-scene.test.ts](../../src/domain/scene/default-scene.test.ts#L14) -- 确认默认名和指定 `selectedPokemonKey` 的场景都保持中性名称。
4. [src/io/scene-recovery.test.ts](../../src/io/scene-recovery.test.ts#L100) -- 确认历史默认名和旧宝可梦生成名迁移为 `5x5 布景`。
5. [e2e/workbench-smoke.spec.ts](../../e2e/workbench-smoke.spec.ts#L19) -- 确认首屏输入框和快照中的默认布景名称不含宝可梦名。
