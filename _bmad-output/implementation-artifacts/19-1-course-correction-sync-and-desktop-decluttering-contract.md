# Story 19.1: Course Correction 同步与 Desktop 降噪契约

Status: done

## Story

As a 维护者, I want PRD、UX、Architecture、Epics 和 tracker 明确 Desktop 工作台降噪边界, So that 后续实现不会把 UI-only 状态误写入 SceneDocument 或回退已完成功能。

## Acceptance Criteria

1. PRD 新增 2026-06-05 Desktop 工作台 UI/UX 降噪 course correction 和 functional requirements。
2. UX Design Specification 新增顶部、左侧、底部、右侧、独立预览、下层影子交互规格。
3. Architecture 新增 AppShell / SceneCanvas / AssetPicker / SelectionInspector / ExportPreview / MobilePreviewMode / PreviewInspector 清理边界。
4. Epics 新增 Epic 19 和 stories。
5. sprint-status 新增 Epic 19 tracker entries。
6. 明确本次不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、scene-core 持久契约或 Cloudflare deploy 边界。

## Tasks / Subtasks

- [x] Sync BMAD planning artifacts for Epic 19. (AC: 1-5)
  - [x] Update PRD with approved course correction, functional requirements and non-functional requirements.
  - [x] Update UX Design Specification with the six desktop decluttering directions.
  - [x] Update Architecture with UI-only state boundaries, component ownership and lower-layer ghost projection rules.
  - [x] Update Epics with Epic 19 and Story 19.1-19.8.
  - [x] Update sprint-status with Epic 19 tracker entries.
  - [x] Update acceptance checklist wording so PreviewInspector is no longer a desktop workbench requirement.
- [x] Verify the data/schema contract. (AC: 6)
  - [x] Confirm `SceneDocument v1` remains unchanged.
  - [x] Confirm UI-only state excludes scene autosave, saved scene payload, PSE strings, export summary and `packages/scene-core`.
  - [x] Confirm lower-layer ghost is only a visual projection and does not participate in placement, occupancy, stacking, replacement confirmation or height blocking.

## Dev Notes

- Source proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-05-desktop-workbench-decluttering.md`
- Planning sync files:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
  - `docs/功能验收-checklist.md`
- Story 19.2-19.8 are implementation stories and remain backlog.
- This story intentionally does not edit runtime code.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-05: Created approved Epic 19 planning sync after user selected option A.
- 2026-06-05: Synchronized PRD, UX, Architecture, Epics and sprint-status around Desktop 工作台 UI/UX 降噪.
- 2026-06-05: Verified the boundary remains UI-only and preserves `SceneDocument v1`.

### Completion Notes

- Epic 19 is active in planning/tracker.
- Story 19.1 planning sync is complete.
- Implementation stories 19.2-19.8 remain backlog and should be executed separately.
- No runtime code was changed.

## Senior Developer Review (AI)

### Review Outcome

Approved. No code-level findings applied to this planning-contract story.

### File List

- `_bmad-output/implementation-artifacts/19-1-course-correction-sync-and-desktop-decluttering-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-05-desktop-workbench-decluttering.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `docs/功能验收-checklist.md`

## Change Log

- 2026-06-05: Story created and completed for approved BMAD planning sync.
