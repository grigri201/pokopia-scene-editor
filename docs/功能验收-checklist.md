# Pokopia Scene Editor 功能验收 Checklist

> 用于手动逐项检查当前实现情况。当前基线：新建场景默认 `sceneSize=15x15`、`outerPadding=1`、`canvasSize=17x17`；用户可在场景控制区选择 `6..17` 的画布宽高；legacy 5x5/7x7 场景仍按自身尺寸恢复。

## 工作台与基础布局

- [*] 首屏是工作台，不是 landing page。
- [*] 顶部工具栏、场景/Pokemon 控制、建筑层面板、中央 17x17 默认画布、右侧素材栏、底部检查器/预览共同组成主界面。
- [*] 中央 17x17 默认画布是主要视觉焦点；legacy 7x7 场景按保存尺寸显示。
- [*] 页面在桌面视口下没有横向滚动。
- [*] 工作台布局与 Open Design 方向一致：Pokemon/场景控制、建筑层、画布、素材、检查器都能被看到或访问。

## 场景与画布规则

- [*] 新场景标称为 15x15 布景。
- [*] 实际编辑画布为 17x17。
- [*] 中心 15x15 被识别为主体区。
- [*] 外围 1 圈被识别为装饰区。
- [*] legacy 5x5/7x7 场景恢复后保留原始 `sceneSize`、`canvasSize`、`outerPadding` 和坐标。
- [*] 场景控制区可分别选择 6-17 的画布宽度和高度。
- [*] 自定义尺寸保持 `outerPadding=1`，并从画布宽高派生 `sceneSize`。
- [*] 每个格子维护 0-based `x,y` 坐标。
- [*] 用户可以选择画布格子作为当前编辑对象。
- [*] 格子可显示主体区/外围区。
- [*] 格子可显示当前选中状态。
- [*] 格子可显示 hover/focus 目标状态。
- [-] 格子可显示当前层隐藏或锁定导致的不可编辑状态。
- [*] 主体区边界有明确视觉提示。
- [*] 外围区有明确视觉提示。
- [*] 主体区、外围区、选中格和技能标记不只依赖颜色表达。

## 键盘与可访问性

- [*] Tab / Shift+Tab 可以访问主要控件。
- [*] 方向键可以在画布格子间移动焦点。
- [?] Enter / Space 可以确认选择或放置。
- [*] Mobile 只读模式下方向键、Enter、Space、Escape、Delete、Backspace、Ctrl+S / Cmd+S 等应用级键盘操作不会修改场景或查看命令状态。
- [ ] 主要按钮、输入框、筛选控件、建筑层操作、预览控件有可访问名称。
- [*] 图标按钮有 tooltip 或可访问名称。

## Pokemon 与场景控制

- [*] Pokemon 可切换。
- [*] 当前种子 Pokemon 包含 `ditto`、`eevee`、`pikachu`。
- [?] Pokemon 切换会更新主题强调色。
- [?] Pokemon 主题不破坏主体区、外围区、选中、警告、错误等语义 token。
- [*] 场景名称可编辑。
- [?] 空场景名称被阻止或提示。 // 提醒会导致 UI 损坏
- [-] 保存按钮可以保存当前场景。
- [-] 保存状态可区分 dirty / saved / saveError。
- [*] 删除场景前有确认。// 确认不应该使用 alert，应该做一个自定义提示框
- [*] 删除场景确认后重置工作台。 // 重置后的数据应该只有一层，名字是0层，内容是空的
- [-] Undo 逻辑可用。
- [-] Redo 逻辑可用。
- [-] Undo / Redo 入口是否应可见符合产品预期。

## 建筑层

- [*] 新场景默认只创建 0层，且该层没有任何素材。
- [*] 语义使用“建筑层”，而不是泛化“图层”。
- [*] 建筑层表达为从 0层到 n层向上建造。
- [*] 建筑层列表按高到低展示。
- [*] 可以新建建筑层。
- [*] 新建建筑层编号为当前最高层号 + 1。
- [*] 可以切换当前编辑建筑层。
- [*] 可以重命名建筑层。
- [*] 可以复制建筑层。
- [*] 复制建筑层会复制该层素材实例。
- [*] 复制建筑层生成新的实例 id，不与原实例冲突。
- [*] 可以删除建筑层。
- [*] 删除建筑层前有确认。 // 删除确认不应该使用 alert，而是自定义提示框
- [*] 删除确认中包含建筑层名称、受影响素材实例数量和操作后果。
- [*] 删除建筑层会删除该层素材实例。
- [*] 阻止删除最后一层。 // 阻止信息应该用自定义提示框
- [-] 阻止删除最后可见层。
- [-] 阻止删除锁定层。
- [-] 可以隐藏建筑层。
- [-] 可以显示建筑层。
- [-] 可以锁定建筑层。
- [-] 可以解锁建筑层。
- [-] 隐藏/显示/锁定/解锁建筑层后，当前 scene dimensions 对应的画布尺寸和单格尺寸不明显跳动。
- [-] 隐藏层内容不在当前层画布中渲染。
- [-] 锁定层内容不可编辑。
- [*] 移动端只读模式下仍可切换查看建筑层，但不能修改建筑层。

## 素材浏览与筛选

- [*] 素材栏可以浏览素材列表。
- [*] 素材显示缩略图。
- [*] 素材显示名称。
- [*] 素材显示分类。
- [*] 素材显示标签。
- [*] 素材显示带 `No.` 前缀的官方素材 ID。
- [?] 素材详情可查看。
- [?] 查看素材详情不会改变当前待放置素材。
- [?] 素材详情包含素材 ID、名称、分类、标签、喜好状态、是否可旋转、是否可叠放、是否可染色、缩略图。
- [*] 可以按关键词搜索素材。
- [*] 可以按素材分类筛选。
- [-] 不提供素材适用区域筛选。
- [-] 不提供素材级技能筛选。
- [?] 可以只显示当前 Pokemon 喜好的素材。
- [*] 筛选结果计数稳定显示。
- [*] 素材列表按每页 10 个分页展示。
- [*] 筛选无结果时显示空状态。 // 样式待调整
- [-] 空状态提供清除筛选或恢复列表的操作。
- [*] 素材搜索/筛选偏好写入 `localStorage`。
- [*] 素材搜索/筛选偏好不进入 SceneDocument payload。
- [*] 运行时素材 catalog 的种子数据满足当前 MVP 验收。
- [*] `assets/pokopia_image_sources/` 中保留完整参考数据，便于后续扩展素材 catalog。

## 素材放置与实例编辑

- [*] 选择素材后可以在当前建筑层指定格子放置。
- [-] 放置会校验素材适用区域。
- [-] 不适用区域会阻止放置并给出提示。
- [-] 当前层隐藏时阻止放置。
- [-] 当前层锁定时阻止放置。
- [?] 未选择素材时不会放置。
- [?] 未知素材 ID 会被拒绝。
- [*] 同一建筑层同一格子已有不可叠放内容时，替换前需要确认。
- [*] 用户取消替换时，场景保持不变。
- [*] 用户确认替换后，旧实例被替换。
- [?] 可叠放素材允许同层同格堆叠。
- [-] 堆叠后格子显示数量。
- [*] 不同建筑层的同一坐标可以放置不同素材。
- [?] 可以删除素材实例。 // 清除按钮总是灰色
- [?] 删除素材实例前有确认。
- [-] 可以把实例移动到其他格子。
- [-] 可以把实例移动到其他建筑层。
- [-] 移动时保留素材 ID、建筑层、技能标记、朝向、染色和备注。
- [-] 移动时校验目标区域适用性。
- [-] 移动时校验目标建筑层是否隐藏或锁定。
- [-] 移动到冲突格子时阻止或要求符合叠放规则。
- [*] 可以替换实例素材。
- [*] 替换实例素材时会重置新素材不支持的朝向或染色字段；技能标记仅属于实例。
- [-] 可以为实例维护备注。
- [*] 当前 UI 是否已经提供完整实例字段编辑入口符合产品预期。

## 朝向、染色与技能标记

- [*] 支持朝向值 `0 | 90 | 180 | 270`。
- [-] 可旋转素材可以旋转。
- [-] 不可旋转素材不能旋转。
- [*] 0 度默认不显示额外旋转标记。
- [*] 90 / 180 / 270 度会在格内显示旋转标记。
- [?] 可染色素材支持 `dyeColor`。
- [?] 不可染色素材不会保存无效染色。
- [?] 染色颜色必须是 6 位 hex 色值。
- [?] 格内能显示当前染色标记。
- [*] 百变怪技能词表使用 `树叶`、`耕地`、`储水`。
- [*] 放置前可设置本次放置是否需要百变怪技能。
- [*] 素材不携带默认技能；技能标记仅保存在实例上。
- [*] 放置后可设置技能标记。
- [*] 放置后可清除技能标记。 // 清除方法改为再点一次技能，现有的清除按钮改为删除格子内的素材
- [*] 可维护技能类型。
- [?] 可维护技能备注。
- [*] 画布中需要技能的实例有技能标记。
- [-] 预览中需要技能的实例有技能标记。
- [*] 画布技能标记显示对应一字标签或图标。
- [*] 旧技能值可被规范化或清除，不破坏当前场景。

## 选中检查器

- [ ] 未选择格子时显示明确空状态。
- [*] 选中格子后显示坐标。 // 优化坐标显示
- [*] 选中格子后显示区域类型。
- [*] 选中格子后显示建筑层。
- [*] 选中格子后显示素材状态。
- [*] 选中素材实例后显示素材名称。
- [*] 选中素材实例后显示所在坐标和层号。
- [*] 可从检查器触发旋转。
- [*] 可从检查器设置技能标记。
- [*] 可从检查器清除技能标记。
- [-] 只读模式下检查器编辑动作 disabled。
- [*] 当前 UI 暴露删除、换素材、染色、技能标记、技能备注等 MVP 检查器字段符合产品预期，不暴露跨层移动或普通备注入口。

## 预览检查器

- [*] 工作台中可以查看俯视图预览。
- [*] 俯视图展示完整当前尺寸画布：默认 17x17，legacy 7x7。
- [*] 俯视图展示当前建筑层内容。
- [-] 俯视图展示当前主体区边界：默认 15x15，legacy 5x5。
- [-] 俯视图隐藏当前层不可见内容。
- [*] 工作台中可以查看正视图预览。
- [*] 正视图展示主体区、外围装饰区和建筑层高度关系。
- [*] 正视图按全部可见建筑层投影。
- [*] 正视图展示多层时顺序符合建筑高度语义。
- [*] 正视图超过 7 层时支持独立纵向滚动。
- [-] 预览可以控制是否显示网格。  // 都不显示
- [-] 预览可以控制是否显示主体边界。
- [-] 预览可以控制是否显示技能标记。
- [-] 预览显示选项写入 `localStorage`。
- [*] 预览显示选项不进入 SceneDocument payload。
- [-] 切换预览选项不会把场景标记为 dirty。
- [*] 预览变化不会导致画布单格尺寸明显跳动。

## 保存、自动保存与恢复

- [-] 手动保存写入 `pokopia.sceneDocument.v1`。
- [-] 手动保存同时写入 `pokopia.sceneDocument.autosave.v1`。
- [*] 自动保存写入 `pokopia.sceneDocument.autosave.v1`。
- [-] 自动保存和显式保存使用同一个 SceneDocument v1 payload 结构。
- [*] 只读模式不会自动保存 dirty changes。
- [-] 只读模式不能手动保存 dirty changes。
- [*] 重新打开页面会恢复最新有效保存或自动保存数据。
- [-] autosave 和 saved 都有效时，按 `metadata.updatedAt` 选择最新。
- [-] autosave 无效时不会静默回退隐藏问题。
- [-] localStorage 不可用时保存失败会显示错误状态。
- [-] 保存失败后的下一次有效编辑会清除保存错误。
- [*] 删除/重置场景会清理保存槽位。
- [*] UI 偏好存储异常不会阻塞 SceneDocument 恢复。

## SceneDocument v1 Payload

- [ ] payload 包含 `schemaVersion: 1`。
- [ ] payload 包含 `sceneId`。
- [ ] payload 包含 `sceneName`。
- [ ] payload 包含 `selectedPokemonKey`。
- [ ] `selectedPokemonKey` 使用 Decor Dex 现有 Pokemon key。
- [ ] payload 包含 `sceneSize`；新建默认值为 15x15，legacy 旧 payload 可为 5x5。
- [ ] payload 包含 `canvasSize`；新建默认值为 17x17，legacy 旧 payload 可为 7x7。
- [ ] payload 包含 `outerPadding: 1`。
- [ ] payload 包含 `buildingLevels`。
- [ ] payload 包含 `tileInstances`。
- [ ] payload 包含 `workspaceState.currentBuildingLevelId`。
- [ ] payload 包含 `workspaceState.selectedAssetId`。
- [ ] payload 包含 `workspaceState.selectedCoordinate`。
- [-] payload 包含 `workspaceState.saveStatus`。
- [ ] payload 包含 `metadata.createdAt`。
- [ ] payload 包含 `metadata.updatedAt`。
- [ ] payload 包含 `metadata.lastSavedAt`。
- [ ] payload 包含 `metadata.lastAutosavedAt`。
- [ ] 素材实例包含 `instanceId`。
- [ ] 素材实例包含 `assetId`。
- [ ] 素材实例包含 `coordinate`。
- [ ] 素材实例包含 `areaType`。
- [ ] 素材实例包含 `buildingLevelId`。
- [ ] 素材实例包含 `rotationDegrees`。
- [ ] 素材实例包含 `dyeColor`。
- [ ] 素材实例包含 `requiresSkill`。
- [ ] 素材实例包含 `skillType`。
- [ ] 素材实例包含 `skillNote`。
- [-] 素材实例包含 `note`。
- [ ] serializer 会从坐标重新计算权威 `areaType`。
- [ ] 不支持染色的素材序列化时 `dyeColor` 为 `null`。
- [ ] saveError 等 UI-only 状态不进入 payload。
- [ ] 搜索词、筛选、favorite-only、预览显示选项不进入 payload。
- [ ] JSON 字段使用 camelCase。
- [ ] 日期使用 ISO 8601 UTC string。

## 恢复校验与安全

- [ ] 缺失 `schemaVersion` 会被拒绝。
- [ ] 未知 `schemaVersion` 会被拒绝。
- [ ] 缺失必填字段会被拒绝。
- [ ] 字段类型错误会被拒绝。
- [ ] unknown Pokemon key 会被拒绝。
- [ ] unknown asset id 会被拒绝。
- [ ] 当前 `canvasSize` 范围外坐标会被拒绝：默认 17x17 为 `0..16`，legacy 7x7 为 `0..6`。
- [ ] `areaType` 与坐标推导不一致会被拒绝。
- [ ] 重复 tile instance id 会被拒绝。
- [ ] tile instance 引用不存在建筑层会被拒绝。
- [ ] 非法 ISO 时间会被拒绝。
- [ ] 非法染色值会被拒绝。
- [ ] 不可染色素材带染色值会被拒绝。
- [ ] 恢复失败不会覆盖当前场景。
- [ ] 恢复失败不会创建 partial scene。
- [ ] 恢复失败不会修改 dirty state。
- [ ] 错误提示包含 `fieldPath`。
- [ ] 错误提示包含 `expected`。
- [ ] 错误提示包含 `actual`。
- [ ] 错误提示包含 `reason`。
- [ ] 错误提示包含 `recoveryAction`。
- [ ] Retry 可以在存储变为有效后恢复场景。
- [ ] Cancel 保持当前场景不变。
- [ ] 移动端只读模式不能用恢复数据替换当前场景。
- [ ] 包含 `<script>` 的场景名称/备注/技能说明按纯文本展示。
- [ ] 包含事件处理属性或 HTML 标签的字符串不会执行。

## Mobile View-only Mode

- [*] 宽度小于 768px 时进入 Mobile View-only Mode。
- [*] 390x844 是关键验收视口。
- [*] 移动端不允许放置素材。
- [*] 移动端不允许移动素材。
- [*] 移动端不允许删除素材。
- [*] 移动端不允许旋转素材。
- [*] 移动端不允许染色。
- [*] 移动端不允许修改技能。
- [*] 移动端不允许修改建筑层。
- [*] 移动端不允许恢复替换当前 scene。
- [*] 移动端不允许保存 dirty changes。
- [*] 移动端不允许自动保存。
- [*] 移动端不允许 undo/redo 修改 scene。
- [*] 移动端允许查看场景。
- [*] 移动端允许查看当前建筑层。
- [*] 移动端允许点选格子或实例查看信息。
- [*] 移动端允许查看素材详情。
- [*] 移动端当前 Pokemon、场景名、当前建筑层、选中素材、选中格子、主体区边界、技能标记状态可访问。
- [*] 移动端控件不重叠。

## 当前已知验证状态

- [x] `pnpm --filter @pokopia-scene-editor/scene-core typecheck` 通过。
- [x] `pnpm --filter @pokopia-scene-editor/web typecheck` 通过。
- [x] `pnpm --filter @pokopia-scene-editor/scene-core test` 覆盖默认 17x17、legacy 7x7、PSE1/PSE2 和 export summary。
- [x] `pnpm --filter @pokopia-scene-editor/web test` 覆盖 17x17 Web canvas、preview、export preview 和 image export pending state。
- [x] `pnpm run scene-core:file-install:smoke` 覆盖外部 file-install consumer 的 runtime import 与 TypeScript NodeNext declaration contract。
- [x] `pnpm run smoke` 覆盖默认 17x17、legacy 7x7、dense 10 层 performance 和响应式关键视口。
- [ ] `pnpm run release:verify` 在 Epic 13 closeout 时运行。

## Epic 12 交接

- 当前尺寸事实入口：`12-1-scene-core-dimension-contract-and-legacy-recovery`。
- Web 渲染与导出入口：`12-2-web-canvas-preview-export-17x17-rendering`。
- 已删除 API/MCP/Codex skill surface；外迁参考见 `docs/worker-api-mcp-skill-handoff.md`。
- 发布前必须确认默认目标为 `sceneSize=15x15`、`outerPadding=1`、`canvasSize=17x17`，并确认自定义画布宽高 `6..17` 仍能保存、恢复、导出。
