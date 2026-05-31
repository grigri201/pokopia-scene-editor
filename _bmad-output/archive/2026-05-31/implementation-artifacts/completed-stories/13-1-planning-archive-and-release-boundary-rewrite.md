# Story 13.1: 规划归档与发布边界重写

Status: done

## Summary

Epic 1-12 已归档为完成历史，active planning/tracker 已收敛到 Polish-stage Epic 13。PRD、Architecture 和 UX 已明确产品不再是 MVP：主流程已可用，并能生成用户需要的攻略/导出说明图。当前阶段是 Polish，目标是仓库边界、维护性和稳定性收敛。

## Acceptance Criteria

- [x] Epic 1-12 的完整历史内容从 active `epics.md` 归档到 `_bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md`。
- [x] Active `epics.md` 只保留归档索引/摘要和 Epic 13。
- [x] 旧 `sprint-status.yaml` 归档到 `_bmad-output/archive/2026-05-30/implementation-artifacts/sprint-status-epics-1-12-completed.yaml`。
- [x] Active tracker 只保留当前项目元信息、归档指针、Epic 13 和 Story 13.1-13.6。
- [x] Active implementation root 中遗留的 Epic 9-12 story 文件归档到 `_bmad-output/archive/2026-05-30/implementation-artifacts/completed-stories/`。
- [x] PRD、Architecture、UX 的产品阶段描述更新为 Polish。
- [x] PRD 明确本仓库目标为 Web + `scene-core` library，并标记 API/MCP/skill 外迁。
- [x] Architecture 明确 Worker/API/MCP 不再属于本仓库 active 架构。
- [x] UX 明确 Developer / Agent Workflow Surface 从本仓库外迁，终端用户工作台不因仓库瘦身改变。
- [x] 文档明确本次不改变 `SceneDocument v1`；如后续必须改 schema，必须另行 course correction。

## Files Updated

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-30-repo-slim-core-library.md`
- `_bmad-output/planning-artifacts/prd.md`
- `_bmad-output/planning-artifacts/architecture.md`
- `_bmad-output/planning-artifacts/ux-design-specification.md`
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `_bmad-output/archive/2026-05-30/README.md`
- `_bmad-output/archive/2026-05-30/planning-artifacts/epics-1-12-completed.md`
- `_bmad-output/archive/2026-05-30/implementation-artifacts/sprint-status-epics-1-12-completed.yaml`
- `_bmad-output/archive/2026-05-30/implementation-artifacts/completed-stories/`

## Verification

- `ruby -e "require 'yaml'; data = YAML.load_file('_bmad-output/implementation-artifacts/sprint-status.yaml'); raise 'missing epic13' unless data['development_status']['epic-13']"`
- `git diff --check`

## Next

Next active implementation story: `13-2-scene-core-file-installable-package`.
