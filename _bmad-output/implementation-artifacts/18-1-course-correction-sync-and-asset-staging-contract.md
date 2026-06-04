# Story 18.1: Course Correction 同步与素材暂存区契约

Status: done

## Story

As a 维护者, I want PRD、Architecture、UX、Epics 和 tracker 明确素材暂存区的本地 UI 存储边界, So that 后续实现不会把暂存状态误写入 scene schema、导出字符串或 catalog。

## Acceptance Criteria

1. PRD 新增素材暂存区 functional requirements。
2. Architecture 新增 `asset-picker/` 暂存区 component/state boundary。
3. UX Design Specification 新增素材暂存区折叠/展开交互规格。
4. Epics 新增 Epic 18 和 stories。
5. sprint-status 新增 Epic 18 tracker entries。
6. 明确本次只新增本地 UI 存储，不改 `SceneDocument v1`、PSE string、scene autosave payload、scene saved payload、export summary 或 `packages/scene-core` catalog。

## Tasks / Subtasks

- [x] Verify and finalize Epic 18 planning sync. (AC: 1-5)
  - [x] Confirm PRD, Architecture, UX, Epics, proposal, and sprint-status all describe the same asset staging scope.
  - [x] Confirm sprint-status has Epic 18 tracker entries in backlog order.
- [x] Verify the data/storage contract. (AC: 6)
  - [x] Confirm the contract preserves `SceneDocument v1`.
  - [x] Confirm the contract excludes scene autosave, saved scene payload, PSE export string, export summary, and `packages/scene-core` catalog changes.

## Dev Notes

- Existing planning sync files are expected to be:
  - `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md`
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- The storage boundary is UI-only: use UI preferences or a dedicated localStorage key. Do not add fields to `SceneDocument`.
- Mobile preview/import remains read-only and does not render or hydrate the staging area.
- This story should not modify runtime code except to correct planning/tracker drift found during verification.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-04: Story created from approved BMAD Epic 18 planning surface.
- 2026-06-04: Verified Epic 18 planning sync across PRD, Architecture, UX, Epics, proposal, and sprint-status.
- 2026-06-04: Verified the asset staging contract remains UI-only and excludes `SceneDocument v1`, scene autosave/saved storage, PSE strings, export summary, and `packages/scene-core` catalog changes.

### Completion Notes

- Planning sync is present and consistent across BMAD artifacts.
- `SceneDocument v1` remains unchanged; asset staging is explicitly bounded to web UI preference/localStorage state.

## Senior Developer Review (AI)

### Review Outcome

Approved. No code-level findings applied to this planning-contract story.

### File List

- `_bmad-output/implementation-artifacts/18-1-course-correction-sync-and-asset-staging-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-asset-staging-area.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/epics.md`

## Change Log

- 2026-06-04: Story created and marked ready-for-dev.
- 2026-06-04: Verified planning sync and moved story to done.
