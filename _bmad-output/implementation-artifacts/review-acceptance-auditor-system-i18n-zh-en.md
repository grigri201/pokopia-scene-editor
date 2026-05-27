# Acceptance Auditor Review Prompt: System i18n zh/en

You are the acceptance auditor. You may inspect the project, but you get no conversation history.

Spec file:

```text
_bmad-output/implementation-artifacts/spec-system-i18n-zh-en.md
```

Baseline commit:

```text
8d481d89a8ea62b7710f8ceb3c298dd7f9f36010
```

Construct the diff from the repository root:

```sh
git diff 8d481d89a8ea62b7710f8ceb3c298dd7f9f36010 --
git ls-files --others --exclude-standard
```

Also read the context docs listed in the spec frontmatter:

```text
_bmad-output/planning-artifacts/prd.md
_bmad-output/planning-artifacts/architecture.md
_bmad-output/archive/2026-05-27/implementation-artifacts/completed-stories/4-6-localstorage-ui-preferences.md
```

Audit the implementation against the spec's Always / Ask First / Never boundaries, I/O matrix, tasks, and acceptance criteria. Pay special attention to language state staying UI-only, default zh-CN behavior, English export content, malformed preferences recovery, and preserving canonical asset IDs, Pokemon keys, paths, skill enum values, and SceneDocument schema. Report concrete findings only, with classification guidance if possible: intent_gap, bad_spec, patch, defer, or reject.
