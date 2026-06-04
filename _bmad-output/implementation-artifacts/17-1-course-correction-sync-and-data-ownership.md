# Story 17.1: Course Correction 同步与 Data Ownership 定义

Status: done

## Story

As a maintainer, I want Epic 17 的 course correction、PRD、architecture、epic tracker 和 data ownership 文档保持一致, So that 后续 `pokopia-data` 抽取和 consumer 迁移有清晰边界。

## Acceptance Criteria

1. Planning artifacts 记录 `pokopia-data` 独立项目抽取的 course correction。
2. Epic 17 stories 覆盖 data package 创建、scene-core migration、color-pattern migration、cross-project release gate。
3. `docs/data-source-of-truth.md` 定义 data package 与两个 consumer 的 ownership boundary。
4. Sprint tracker 记录 Epic 17 的 active/done 状态，且 story 文件存在。

## Tasks / Subtasks

- [x] Sync course correction into planning artifacts. (AC: 1, 2)
- [x] Define Epic 17 story breakdown. (AC: 2)
- [x] Define data ownership boundary in docs. (AC: 3)
- [x] Register Story 17.1 in sprint tracking with a completed story artifact. (AC: 4)

## Dev Notes

- Source of truth: `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-pokopia-data-extraction.md`, `_bmad-output/planning-artifacts/epics.md`, `_bmad-output/planning-artifacts/architecture.md`, and `docs/data-source-of-truth.md`.
- This planning story must not change `SceneDocument v1`.

## Dev Agent Record

### Debug Log

- 2026-06-04: Course correction proposal, PRD/architecture/epic updates, and data ownership docs were synchronized before implementation stories 17.2-17.5.

### Completion Notes

- Epic 17 planning now has a completed Story 17.1 artifact matching the sprint tracker.
- The implementation boundary remains: base shared data in `../pokopia-data`, scene-core placement/codec rules in this repo, and recommendation/routing ownership in `../pokopia-color-pattern`.

### File List

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-04-pokopia-data-extraction.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `docs/data-source-of-truth.md`

### Change Log

- 2026-06-04: Completed Story 17.1 planning and ownership sync artifact.
