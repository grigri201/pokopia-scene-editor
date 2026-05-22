# 空格技能标记

## 背景

用户反馈：空的格子也应该可以设置技能。此前技能按钮只作用于已经放置素材的格子，空格无法记录“耕地 / 储水 / 树叶”等技能需求。

## 实现

- 新增 `SceneDocument.skillMarkers`，用于保存独立的格子技能标记。
- 空格技能标记不创建 `tileInstances`，因此不会污染素材清单、建筑层素材数量或素材删除语义。
- 选中空格后，技能按钮可点击；第一次点击添加当前技能标记，第二次点击同一技能清除标记。
- 选中已有素材时，技能按钮仍按原有素材实例技能逻辑工作。
- 画布空格会显示独立技能标记，并通过 `data-requires-skill`、`data-skill-marker-label` 和 aria label 暴露状态。
- SceneDocument v1 解析、序列化、roundtrip、恢复入口都兼容 `skillMarkers`；旧 payload 缺失字段时默认恢复为空数组。

## 关键文件

- `src/domain/scene/types.ts`
- `src/domain/scene/skill-marker.ts`
- `src/state/skill-marker-edit.ts`
- `src/components/selection-inspector/SelectionInspector.tsx`
- `src/components/scene-canvas/SceneCanvas.tsx`
- `src/components/app-shell/AppShell.tsx`
- `src/io/scene-schema.ts`
- `src/io/scene-serializer.ts`

## 验证

- `npm test -- src/state/skill-marker-edit.test.ts src/components/selection-inspector/SelectionInspector.test.tsx src/components/scene-canvas/SceneCanvas.test.tsx src/components/app-shell/AppShell.test.tsx src/io/scene-schema.test.ts src/io/scene-serializer.test.ts src/io/scene-roundtrip.test.ts src/domain/scene/default-scene.test.ts`
- `npm test`
- `npm run build`
- `npm run typecheck`
- `npm run smoke`
- `git diff --check`
- Playwright 页面验证 `http://127.0.0.1:5173/`：空格添加“耕地”后 `skillMarkers.length === 1`、`tileInstances.length === 0`，再次点击后 `skillMarkers.length === 0`。
