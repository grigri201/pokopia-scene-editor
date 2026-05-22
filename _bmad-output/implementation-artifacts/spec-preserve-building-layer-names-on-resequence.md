---
title: '建筑层重排保留名称'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 建筑层重排保留名称

## Intent

**Problem:** 上一次层标识重排实现会在删除中间层后把默认名称同步改写，例如把原 `2层` 改成 `1层`。用户明确纠偏：重排不应该修改建筑层名称。

**Approach:** 将 `resequenceBuildingLevels` 收敛为只更新 `levelNumber`，所有既有 `name` 原样保留。同步更新状态测试和 AppShell 集成测试，确保删除中间层后显示标识连续，但 scene payload 中原建筑层名称不被改写。

## Suggested Review Order

- 重排函数现在只改 `levelNumber`，不触碰 `name`。
  [`levels.ts:33`](../../src/domain/scene/levels.ts#L33)

- 领域测试覆盖默认名和自定义名都原样保留。
  [`levels.test.ts:39`](../../src/domain/scene/levels.test.ts#L39)

- 状态测试确认删除中间层后 `level-2` 的名称仍是原名称。
  [`building-layer-edit.test.ts:235`](../../src/state/building-layer-edit.test.ts#L235)

- AppShell 测试确认 UI 标识重排但 payload 名称不改写。
  [`AppShell.test.tsx:255`](../../src/components/app-shell/AppShell.test.tsx#L255)
