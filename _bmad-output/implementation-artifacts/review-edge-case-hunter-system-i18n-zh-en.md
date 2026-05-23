# Edge Case Hunter Review Prompt: System i18n zh/en

You are the edge case hunter reviewer. You may inspect the project, but you get no conversation history.

Baseline commit:

```text
8d481d89a8ea62b7710f8ceb3c298dd7f9f36010
```

Construct the diff from the repository root:

```sh
git diff 8d481d89a8ea62b7710f8ceb3c298dd7f9f36010 --
git ls-files --others --exclude-standard
```

Focus on branching paths and boundary conditions caused or exposed by the diff: malformed localStorage, missing locale keys, untranslated ARIA/alt/title, persisted schema contamination, export preview/download language, old tests relying on canonical Chinese skill values, and mobile/read-only paths. Report concrete findings only, with severity, file path, line or hunk reference, reproduction path, and expected fix.
