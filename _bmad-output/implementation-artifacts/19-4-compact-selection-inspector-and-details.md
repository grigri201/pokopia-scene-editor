# Story 19.4: 底部检查器紧凑快捷栏与详情区

Status: done

## Story

As a desktop 编辑用户, I want 底部默认只显示当前选择和高频操作, So that 画布下方不再被完整表单占满。

## Acceptance Criteria

1. 第一层快捷栏高度稳定，选中/未选中状态不会导致画布明显跳动。
2. 快捷栏展示当前素材缩略图/名称、坐标、建筑层、旋转、删除、树叶/耕地/储水技能按钮。
3. 无选中素材时显示清晰空状态，不展示大量 disabled 按钮。
4. 第二层详情区可展开，包含层备注、技能备注和未来实例详情。
5. 层备注新增、编辑、删除能力保留。
6. 只读模式下编辑动作 disabled，查看信息仍可读。
7. 图标按钮都有 tooltip / aria-label。

## Tasks / Subtasks

- [x] Create expandable selection details area. (AC: 1, 4)
  - [x] Keep compact action bar as the stable first row.
  - [x] Add an expand/collapse control with `aria-expanded` and stable labels.
  - [x] Move layer notes into the expandable detail area.
- [x] Preserve selection quick actions. (AC: 2, 3, 6, 7)
  - [x] Keep selected asset thumbnail/name, coordinate, level and high-frequency action buttons visible in the compact bar.
  - [x] Keep empty state clean without bulk disabled action buttons.
  - [x] Keep read-only mutation buttons disabled while readable selection information remains visible.
- [x] Add detail content for notes and future instance facts. (AC: 4, 5)
  - [x] Preserve layer note add/edit/delete behavior.
  - [x] Surface current skill marker/note in the details area.
  - [x] Reserve a stable instance-details slot without adding SceneDocument fields.
- [x] Update focused tests. (AC: 1-7)
  - [x] Cover collapsed default, expanded details and no-selection empty state.
  - [x] Cover layer note add/edit/delete through the expanded detail area.
  - [x] Cover read-only details and compact action disabled states.

## Dev Notes

### Source Context

- Epic source: `_bmad-output/planning-artifacts/epics.md`, Epic 19 / Story 19.4.
- PRD/UX/Architecture require Desktop 工作台 bottom panel to prioritize current-layer editing and keep detail-heavy content on demand.
- This story must not alter `SceneDocument v1`, PSE string encoding, scene autosave/saved payload, export summary, staging storage or `packages/scene-core`.

### Existing Implementation Map

- `apps/web/src/components/selection-inspector/SelectionInspector.tsx`
  - Already renders a compact `current-selection-bar` and high-frequency rotate/delete/skill buttons.
  - Currently renders `LayerNotesPanel` directly under the bar, so layer notes consume vertical space by default.
  - Skill marker state is already derived from `selectedSkillMarker` or `selectedInstance`; note text is preserved through existing callbacks.
- `apps/web/src/components/selection-inspector/SelectionInspector.test.tsx`
  - Existing tests cover compact actions, layer notes, read-only mode, stacking chips and safe text.
  - Tests currently expect layer notes visible by default and must be updated to expand details first.
- `apps/web/src/styles.css`
  - `.selection-inspector`, `.current-selection-bar`, `.layer-notes-panel` and `.canvas-bottom-panels` own the bottom-panel layout.

### Technical Constraints

- Use component-local UI state only for detail expansion.
- Do not persist detail expansion to SceneDocument, storage, PSE strings or export payloads.
- Keep layer note mutation callbacks and payloads unchanged.
- Keep button labels/tooltips accessible and compatible with current i18n patterns.

### Testing Requirements

- `pnpm --filter @pokopia-scene-editor/web test -- src/components/selection-inspector/SelectionInspector.test.tsx src/components/app-shell/AppShell.test.tsx`
- `pnpm --filter @pokopia-scene-editor/web typecheck`
- `pnpm --filter @pokopia-scene-editor/web build`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-05: Created story context from Epic 19 AC, existing SelectionInspector implementation and focused component tests.
- 2026-06-05: Started implementation.
- 2026-06-05: Added component-local expandable selection details state and moved layer notes into the second-row details panel.
- 2026-06-05: Added compact bar coordinate/level/rotation metadata and kept empty state free of bulk disabled edit buttons.
- 2026-06-05: Added selection details summary with asset, coordinate, layer, rotation, dye, skill marker and skill note facts.
- 2026-06-05: Updated SelectionInspector and AppShell tests to expand details before layer-note workflows.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/selection-inspector/SelectionInspector.test.tsx src/components/app-shell/AppShell.test.tsx`: 20 files, 305 tests.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-05: Verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.
- 2026-06-05: Code review found unstable first-row height, hidden/unmounted details draft loss, read-only note mutation controls missing/active, missing stack-chip tooltip, unknown selected asset empty-copy fallback and English zh-CN detail labels.
- 2026-06-05: Fixed review findings by locking bottom-bar height, keeping hidden details mounted with `hidden`/`inert`, preserving unsaved note drafts across collapse, disabling read-only note controls, adding stack chip tooltips, using unknown asset ids in compact copy and localizing zh-CN labels.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/selection-inspector/SelectionInspector.test.tsx`: 20 files, 308 tests.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web test -- src/components/selection-inspector/SelectionInspector.test.tsx src/components/app-shell/AppShell.test.tsx`: 20 files, 308 tests.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web typecheck`.
- 2026-06-05: Re-verified `pnpm --filter @pokopia-scene-editor/web build`, including runtime asset verification.

### Completion Notes

- SelectionInspector now defaults to a compact first-row action bar.
- Details expand on demand and contain instance facts, skill marker/note facts and the existing layer note editor.
- Layer note add/edit/delete callbacks and payloads are unchanged.
- Details expansion is component-local UI state only and is not persisted.
- Collapsed details remain mounted but hidden/inert so layer-note drafts survive collapsing.
- Read-only mode keeps layer-note mutation controls visible but disabled.

## Senior Developer Review (AI)

Reviewed with Blind Hunter, Edge Case Hunter and Acceptance Auditor.

- Fixed: first-row quick bar now uses fixed 58px height and non-wrapping action buttons for AC1.
- Fixed: collapsed details remain mounted with `hidden`/`inert`, preserving unsaved note drafts.
- Fixed: read-only note mutation controls are disabled and editing state is cleared when read-only is entered.
- Fixed: stack chips now include tooltip/title metadata.
- Fixed: unknown selected assets display their asset id instead of empty-cell copy.
- Fixed: zh-CN details labels no longer show the new English copy.
- Added: AppShell integration coverage proves details expansion does not write scene storage or autosave.

### File List

- `_bmad-output/implementation-artifacts/19-4-compact-selection-inspector-and-details.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `apps/web/src/components/app-shell/AppShell.test.tsx`
- `apps/web/src/components/selection-inspector/SelectionInspector.tsx`
- `apps/web/src/components/selection-inspector/SelectionInspector.test.tsx`
- `apps/web/src/i18n/index.ts`
- `apps/web/src/styles.css`

## Change Log

- 2026-06-05: Story created and marked ready-for-dev.
- 2026-06-05: Story marked in-progress.
- 2026-06-05: Implemented and verified compact selection inspector details; story marked review.
- 2026-06-05: Applied code-review fixes and marked story done.
