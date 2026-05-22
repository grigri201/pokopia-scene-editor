---
title: '建筑层标识增删后重排'
type: 'bugfix'
created: '2026-05-22'
status: 'done'
route: 'one-shot'
---

# 建筑层标识增删后重排

## Intent

**Problem:** 建筑层删除中间层后，左侧层标识会保留原始 `levelNumber`，导致界面出现 `L2/L0` 这类不连续标识；随后再新增层也可能继续沿用旧最大编号。浏览器批注明确要求层标识在添加和删除后重排。

**Approach:** 在建筑层状态命令层重排可见 `levelNumber` 和默认层名，保持 `id` 稳定以保护素材实例的 `buildingLevelId` 引用。新增和复制层使用独立的唯一 id 分配，避免重排后出现 `level-2` 这类 id 冲突；状态测试、AppShell 集成测试和浏览器验证覆盖删除中间层再新增的完整路径。

## Suggested Review Order

- 重排规则只改可见编号和默认层名，保留稳定 id。
  [`levels.ts:33`](../../src/domain/scene/levels.ts#L33)

- 创建/复制/删除都先经过重排，确保 UI 与导出一致。
  [`building-layer-edit.ts:64`](../../src/state/building-layer-edit.ts#L64)

- 新增层 id 与可见编号解耦，避免删除后再新增冲突。
  [`building-layer-edit.ts:211`](../../src/state/building-layer-edit.ts#L211)

- AppShell 测试覆盖 `L2/L1/L0 -> L1/L0 -> L2/L1/L0`。
  [`AppShell.test.tsx:255`](../../src/components/app-shell/AppShell.test.tsx#L255)

- 状态测试确认实例引用仍指向原稳定层 id。
  [`building-layer-edit.test.ts:248`](../../src/state/building-layer-edit.test.ts#L248)
