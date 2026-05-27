---
workflowType: 'bmad-correct-course'
date: '2026-05-27'
project: 'pokopia-scene-editor'
user: 'Grigri'
status: 'approved'
mode: 'batch'
trigger: '真实 Pokopia 素材可能占用多格和多层高度，需要统一 asset footprint、放置、旋转、跨层阻塞、预览、保存/恢复、导出摘要、Worker/MCP/Codex skill 规则'
approvedAt: '2026-05-27'
sourceArtifacts:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/implementation-artifacts/sprint-status.yaml
---

# Sprint Change Proposal - Asset Footprint and Occupancy Rules

## 1. Issue Summary

当前编辑器把每个素材实例默认当作 1x1x1 单格对象处理。真实 Pokopia 素材可能占用 1 长 x 2 宽 x 1 高、2 长 x 1 宽 x 2 高等 footprint。继续使用单格假设会导致放置校验、旋转、跨建筑层阻塞、俯视/正视预览、图片导出、Worker validate/recover/export-summary、MCP tools 和 Codex skill 对同一个 scene 得出不同结果。

本次变化的核心不是新增用户可编辑字段，而是把真实素材 footprint 建模为 asset catalog 元数据，并让 `scene-core` 成为所有端的唯一 footprint/occupancy 规则来源。

### SceneDocument v2 Decision

本次不需要 `SceneDocument v2`。

理由：

- 当前 `SceneDocument v1` 已保存足够实例事实：`assetId`、anchor `coordinate`、`buildingLevelId`、`rotationDegrees`、染色和技能字段。
- Footprint 属于 asset catalog metadata，不属于用户为单个实例编辑的 scene state。
- `height > 1` 的上层不可放置格是派生规则，不能作为独立保存状态。
- 短字符串也不应编码 footprint；decode 后应通过当前 catalog 和 `scene-core` 重新派生。

只有未来需要保存 catalog snapshot、历史 footprint 解释、实例级 footprint override 或兼容多套 footprint 规则时，才应启动新的 course correction 并设计 `SceneDocument v2`。

## 2. Change Analysis Checklist

| Item | Status | Finding |
| --- | --- | --- |
| 1.1 Triggering story | [N/A] | 不是某个 active story 暴露的问题；Epic 1-7 已完成，是新规则正确性缺口。 |
| 1.2 Core problem | [x] | 技术限制与真实素材数据不一致：单格假设无法表达大 footprint 和跨层阻塞。 |
| 1.3 Evidence | [x] | 当前 `AssetDefinition` 无 footprint；`TileInstance` 只存 anchor coordinate；schema 只防同层同坐标重复；selector/export summary 都按单格处理。 |
| 2.1 Current epic viability | [x] | Epic 7 仍完成；不应重写 Worker/MCP/Codex skill 历史。 |
| 2.2 Epic-level changes | [!] | 需要新增 Epic 8，而不是修改 Epic 1-7 完成记录。 |
| 2.3 Remaining epics | [x] | 当前没有未完成 epic；Epic 8 从 backlog 开始。 |
| 2.4 Future epic invalidation | [x] | 不废弃现有 epics；修正它们共享的单格规则假设。 |
| 2.5 Priority/order | [x] | 先 catalog metadata，再 scene-core rules，再 web UI，再 preview/export，再 Worker/MCP/skill parity gate。 |
| 3.1 PRD conflicts | [!] | PRD 需要新增 footprint requirements，并明确不引入 SceneDocument v2。 |
| 3.2 Architecture conflicts | [!] | Architecture 需要新增 catalog footprint、derived occupancy、cross-layer blocking 和 no-duplication boundaries。 |
| 3.3 UX conflicts | [!] | UX 需要定义跨格显示、旋转后预览、height 阻塞说明和 export 视觉表达。 |
| 3.4 Other artifacts | [!] | Sprint tracker 需要新增 Epic 8 backlog；release gate 需要加入 shared footprint fixture。 |
| 4.1 Direct adjustment | Viable | 新增 Epic 8 可解决，不需回滚。Effort: Medium; Risk: Medium/High. |
| 4.2 Rollback | Not viable | 回滚 Epic 7 或保存/导出工作不会解决真实素材规则问题。 |
| 4.3 PRD MVP review | Not viable | 核心目标不变；是规则精度提升，不是 MVP 削减。 |
| 4.4 Recommended path | [x] | Direct Adjustment with New Epic。 |
| 5.1-5.5 Proposal components | [x] | 本文包含问题、影响、推荐路径、具体改动和 handoff。 |
| 6.1-6.2 Final review | [x] | 用户已要求评估并同步 PRD、UX、Architecture、Epics 和 Sprint Plan。 |

## 3. Impact Analysis

### PRD Impact

PRD 需要新增 Course Correction 2026-05-27、FR78-FR86 和 NFR37-NFR40。

Key PRD changes:

- Asset catalog 增加 `footprint.length`、`footprint.width`、`footprint.height`。
- 未覆盖素材默认 1x1x1，真实大素材通过集中 override 补充。
- 90/270 度旋转交换 length/width。
- 同层 footprint overlap、画布越界和 height 跨层阻塞进入放置与恢复校验。
- `SceneDocument v1` 保持当前 schema；不保存 footprint、effectiveFootprint、occupiedCells 或 blockingCells。
- Worker/MCP/Codex skill 必须复用 `scene-core` footprint helpers。

### UX Impact

终端用户体验需要让规则可见，但不新增复杂编辑器：

- 素材卡/详情可显示 footprint。
- 悬停放置预览跨格显示 effective footprint。
- 旋转 90/270 度后，预览和已放置素材方向同步交换。
- height 大于 1 的素材在上层对应格显示为不可放置，并说明阻塞来源。
- 大素材作为一个实例被选中，技能、染色和旋转仍绑定 anchor instance。
- 图片导出和俯视/正视预览必须跨格表达大素材，不按 occupied cell 重复计数。

### Architecture Impact

Architecture 需要增加一个明确规则边界：

- `packages/scene-core/src/domain/assets/` 持有 catalog footprint metadata 和 overrides。
- `packages/scene-core/src/domain/scene/footprint.ts` 派生 effective footprint 和 occupied cells。
- `packages/scene-core/src/domain/scene/occupancy.ts` 派生 same-layer occupancy、height blocking cells、blockedBy 关系和 placement validation。
- `scene-schema.ts` 保持 `SceneDocument v1` shape，但 superRefine 增加 footprint semantic validation。
- `scene-string-codec.ts` 保持 PSE1 格式，不编码 footprint。
- `export-summary.ts` 输出每个实例的 footprint、effectiveFootprint 和 occupiedCells。
- `apps/web` 只消费 scene-core helpers，不在 React component 中重写 occupancy。
- `apps/worker` 和 MCP tools 只做 adapter，不复制规则。
- `.agents/skills/pokopia-scene-worker/` 继续把 MCP structuredContent 当作权威结果。

### Epics and Sprint Plan Impact

Epic 1-7 保留完成历史。新增 Epic 8：

- Story 8.1: asset catalog footprint metadata。
- Story 8.2: scene-core footprint/occupancy rules。
- Story 8.3: Web placement/canvas footprint feedback。
- Story 8.4: Preview/export footprint rendering。
- Story 8.5: save/string/Worker/MCP/Codex parity gates。

`sprint-status.yaml` 只追加 Epic 8 backlog 项，不改动 Epic 1-7 状态。

## 4. Recommended Approach

推荐路径：**Direct Adjustment with New Epic**。

Scope classification: **Moderate, shared-domain rule change**。

不回滚、不削减 MVP、不改写已完成 Epic 1-7。新增 Epic 8 并同步 PRD、UX、Architecture、Epics 和 Sprint Plan。

关键取舍：

- 保持 `SceneDocument v1`，避免把 catalog metadata 固化进用户 scene。
- 把迁移定义为 catalog migration：现有素材默认 1x1x1，再补充真实大素材 override。
- 把旧 scene migration 定义为 re-interpretation：旧 payload/短字符串 shape 不变，通过当前 catalog 派生规则；若产生冲突，返回结构化错误，而不是静默修复。
- 把 blocking cells 定义为 derived view/rule，不保存到 payload。

## 5. Detailed Change Proposals

### PRD Edits

Applied:

- 新增 Approved Course Correction - 2026-05-27。
- 更新 Technical Success、Measurable Outcomes、MVP capabilities 和 Out of Scope。
- 新增 FR78-FR86。
- 新增 NFR37-NFR40。
- 更新 FR29/34/35/67/70/76 和 NFR2/NFR35 以包含 footprint 规则。

### UX Edits

Applied:

- 新增 Approved Course Correction - 2026-05-27。
- 更新核心体验、放置反馈、critical moments、Scene Canvas、Asset Picker、Instance Inspector、Preview、Image Export 和 Developer/Agent workflow。
- 明确跨格素材作为一个实例选中，height blocking 是派生不可放置状态。

### Architecture Edits

Applied:

- 新增 Epic 8 architecture boundary。
- 新增 “Footprint lives in the asset catalog, while occupancy is derived” decision。
- 更新 `scene-core` ownership、format patterns、enforcement guidelines、requirements mapping 和 validation summary。
- 明确不新增 SceneDocument v2，除非未来需要保存 catalog snapshot 或实例级 footprint override。

### Epics and Sprint Plan Edits

Applied:

- 新增 Approved Course Correction - 2026-05-27。
- 新增 FR78-FR86、NFR37-NFR40。
- 新增 Epic 8 和 5 个 stories。
- `sprint-status.yaml` 追加 Epic 8 backlog 条目。

## 6. Implementation Handoff

Recommended next implementation route:

```text
bmad-create-story 8-1-asset-catalog-footprint-metadata
```

Success criteria for Epic 8:

- Asset catalog exposes footprint with default 1x1x1 and audited overrides.
- `scene-core` owns effective footprint, occupied cells, same-layer collision and height blocking.
- Web canvas, preview inspector and image export render large assets across cells.
- Save/recovery and PSE1 short strings stay SceneDocument v1 and do not persist derived occupancy.
- Worker validate/recover/export-summary and MCP tools match direct scene-core contract tests.
- Codex skill docs/examples do not copy footprint rules.

## 7. Workflow Completion

Artifacts synchronized:

- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

Correct Course workflow complete.
