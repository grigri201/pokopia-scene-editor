# Story 20.1: Course Correction 同步与 SceneCanvas Zoom 契约

Status: done

## Story

As a 维护者, I want PRD、UX、Architecture、Epics 和 tracker 明确 SceneCanvas zoom viewport 边界, So that 后续实现不会把 zoom state 写入 SceneDocument 或破坏已完成工作台布局。

## Acceptance Criteria

1. PRD 新增 2026-06-06 SceneCanvas 缩放视口 course correction、FR139-FR143 和 NFR70-NFR72。
2. UX Design Specification 新增 wheel/pinch、min/max、裁切和移动端边界。
3. Architecture 新增 AppShell/SceneCanvas/styles/ui-preferences/test responsibility。
4. Epics 新增 Epic 20 和 stories。
5. sprint-status 新增 Epic 20 tracker entries。
6. 明确不改 `SceneDocument v1`、PSE string、scene autosave/saved payload、export summary、scene-core 持久契约或 Cloudflare deploy 边界。

## Tasks / Subtasks

- [x] Sync BMAD planning artifacts for Epic 20. (AC: 1-5)
  - [x] Update PRD with approved course correction, functional requirements and non-functional requirements.
  - [x] Update UX Design Specification with wheel/pinch zoom viewport behavior.
  - [x] Update Architecture with UI-only zoom state ownership, component boundaries and clip responsibilities.
  - [x] Update Epics with Epic 20 and Story 20.1-20.3.
  - [x] Update sprint-status with Epic 20 tracker entries.
- [x] Verify the data/schema contract. (AC: 6)
  - [x] Confirm `SceneDocument v1` remains unchanged.
  - [x] Confirm zoom scale/origin/clip state excludes scene autosave, saved scene payload, PSE strings, export summary and `packages/scene-core`.
  - [x] Confirm zoom is only a visual viewport transform and does not participate in placement, occupancy, stacking, replacement confirmation, height blocking, lower-layer ghost or export preview semantics.

## Dev Notes

- Source proposal: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-06-scene-canvas-zoom.md`
- Planning sync files:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Story 20.2 and Story 20.3 are implementation/verification stories and remain ready-for-dev.
- This story intentionally does not edit runtime code.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log

- 2026-06-06: Created approved Epic 20 planning sync after user selected option A.
- 2026-06-06: Synchronized PRD, UX, Architecture, Epics and sprint-status around SceneCanvas 缩放视口.
- 2026-06-06: Verified the boundary remains UI-only and preserves `SceneDocument v1`.

### Completion Notes

- Epic 20 is active in planning/tracker.
- Story 20.1 planning sync is complete.
- Implementation stories 20.2-20.3 are ready-for-dev.
- No runtime code was changed.

## Senior Developer Review (AI)

### Review Outcome

Approved. No code-level findings applied to this planning-contract story.

### File List

- `_bmad-output/implementation-artifacts/20-1-course-correction-sync-and-scene-canvas-zoom-contract.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-06-scene-canvas-zoom.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`

## Change Log

- 2026-06-06: Story created and completed for approved BMAD planning sync.
