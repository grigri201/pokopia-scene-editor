# Story 21.1: Course Correction 同步与矩形编辑契约

Status: done

## Story

As a 维护者, I want PRD、UX、Architecture、Epics 和 sprint-status 明确 SceneCanvas 矩形编辑边界, So that 后续实现不会把拖拽预览状态误写入 SceneDocument 或破坏 zoom/pan。

## Acceptance Criteria

1. PRD 新增 2026-06-07 SceneCanvas 矩形填充与清空 course correction、FR144-FR149 和 NFR73-NFR76。
2. UX Design Specification 新增 right-drag clear、locked left-drag fill、pan fallback、nearest-cell release 和 rectangle preview 交互规格。
3. Architecture 新增 SceneCanvas gesture state、AppShell callbacks、bulk command layer 和 tests responsibility。
4. Epics 新增 Epic 21 和 stories。
5. sprint-status 新增 Epic 21 tracker entries。
6. 明确本次不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、asset catalog 或 scene-core 持久契约。

## Tasks / Subtasks

- [x] Sync BMAD planning artifacts for Epic 21. (AC: 1-5)
  - [x] Update PRD with approved course correction, functional requirements and non-functional requirements.
  - [x] Update UX Design Specification with rectangle edit interaction behavior.
  - [x] Update Architecture with gesture state, command ownership and UI transient boundaries.
  - [x] Update Epics with Epic 21 and Story 21.1-21.4.
  - [x] Update sprint-status with Epic 21 tracker entries.
- [x] Verify the data/schema contract. (AC: 6)
  - [x] Confirm `SceneDocument v1` remains unchanged.
  - [x] Confirm rectangle gesture/preview state excludes scene autosave, saved scene payload, PSE strings, export summary and `packages/scene-core`.
  - [x] Confirm final rectangle fill/clear mutations route through web command/autosave boundaries.

## Dev Notes

- Source proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md`
- Planning sync files:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Story 21.2, Story 21.3 and Story 21.4 are now implemented and done.
- This story intentionally does not edit runtime code.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-07: Created proposed Epic 21 Sprint Change Proposal for SceneCanvas 矩形填充与清空.
- 2026-06-07: User approved with option A.
- 2026-06-07: Marked the proposal approved and synchronized PRD, UX, Architecture, Epics and sprint-status.
- 2026-06-07: Verified the boundary remains web UI transient state plus command-layer scene mutation, preserving `SceneDocument v1`.

### Completion Notes

- Epic 21 is complete in planning/tracker.
- Story 21.1 planning sync is complete.
- Implementation stories 21.2-21.4 are done.
- No runtime code was changed.

### File List

- `_bmad-output/implementation-artifacts/21-1-course-correction-sync-and-rectangle-edit-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-07-scene-canvas-rectangle-edit.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`

## Senior Developer Review (AI)

### Review Outcome

Approved. No code-level findings applied to this planning-contract story.

## Change Log

- 2026-06-07: Story created and completed for approved BMAD planning sync.
