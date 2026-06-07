---
title: 'Redesign help overlay for the current workbench'
type: 'feature'
created: '2026-06-07T13:50:04+0800'
status: 'done'
baseline_commit: '711213a7684d7b559ccb66a39c48609a62ebea45'
context:
  - '{project-root}/_bmad-output/planning-artifacts/ux-design-specification.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** The desktop help overlay still explains an older three-area workbench and misses current high-value flows: file actions, canvas size, layer drag sorting, asset staging, canvas zoom/pan, rectangle editing, skills, and layer notes.

**Approach:** Replace the overlay with a four-step walkthrough that matches the current UI: left setup/layers, right assets/backpack, center canvas editing, and bottom skills/notes. Use a Next button between steps and keep only final dismissal in preferences.

## Boundaries & Constraints

**Always:** Preserve the existing desktop-only help behavior and breakpoint. Keep all help overlay state out of `SceneDocument`, autosave, saved scene storage, scene strings, export summaries, and `scene-core`. Support `zh-CN` and `en-US` copy through the existing i18n helper. The overlay must show one focused guide step at a time, advance with Next, and dismiss only on the final confirmation button.

**Ask First:** Ask before changing mobile behavior, adding persisted guide progress, adding back/skip controls, changing the workbench layout, or adding new product copy outside the help overlay.

**Never:** Do not modify placement, layer, asset staging, skill, note, export, import, autosave, or schema behavior. Do not add a new dependency or a separate onboarding system.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Desktop first open | 1280px+ editable workbench with no dismissal preference | Help overlay opens on step 1 with separate callout sentences/arrows for download, file actions, scene size, add-layer, and layer select/sort | If a target is missing, omit only that target instead of crashing |
| Step advance | User clicks Next on steps 1-3 | Overlay advances to the next region, preserving per-control callouts and arrows, without closing or writing dismissal preference | No scene, autosave, saved scene, or staging storage writes |
| Dismiss | User clicks the final confirmation button on step 4 | Overlay closes and only `helpOverlayDismissed` is persisted in UI preferences | No scene, autosave, saved scene, or staging storage writes |
| Reopen | User dismissed previously, then clicks the header help button | Walkthrough starts again from step 1 | No duplicate preference writes until final confirmation |
| Narrow/mobile | Viewport below guide breakpoint or mobile preview mode | Help overlay is unavailable and no dismissal preference is written | N/A |
| Locale | Locale is `en-US` | Four-section guide uses English copy for every callout sentence and the English confirm button | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/app-shell/help-guide.ts` -- guide target definitions and note/arrow positioning.
- `apps/web/src/components/app-shell/AppShell.tsx` -- help overlay rendering, target measurement, dismissal behavior.
- `apps/web/src/i18n/index.ts` -- zh-CN/en-US help overlay messages.
- `apps/web/src/styles.css` -- help overlay note, spotlight, arrow, and button styling.
- `apps/web/src/components/app-shell/AppShell.test.tsx` -- desktop help overlay behavior and i18n regression tests.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/components/app-shell/help-guide.ts` -- define four current workbench steps with per-control callouts, target selectors, arrow selectors, and layout rules.
- [x] `apps/web/src/i18n/index.ts` -- add short Chinese and English callout sentences for every explained control/function.
- [x] `apps/web/src/components/app-shell/AppShell.tsx` -- render all callouts for the active step without changing scene state.
- [x] `apps/web/src/styles.css` -- style compact callout notes so multiple sentences fit at desktop widths without overlap.
- [x] `apps/web/src/components/app-shell/AppShell.test.tsx` -- update stepper, per-step callout counts, copy, i18n, and storage isolation assertions.

**Acceptance Criteria:**
- Given an editable desktop workbench, when the help overlay opens, then it displays four guide sections covering left setup/layers, right assets/backpack, center canvas editing, and bottom skills/notes, with each section split into separate short callout sentences and arrows by button position/function.
- Given the overlay is visible, when the user confirms, then only the UI preference dismissal marker is persisted.
- Given the locale is English, when the overlay opens, then every guide callout uses English copy.
- Given a narrow or mobile viewport, when the app loads, then the help overlay remains unavailable and does not persist dismissal.

## Spec Change Log

## Design Notes

Use the existing overlay shell rather than a new onboarding system. The four requested regions become focused steps, and each step can contain multiple callouts so button location and button function are explained by separate short sentences and arrows.

## Verification

**Commands:**
- `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx` -- passed, 342 tests.
- `pnpm --filter @pokopia-scene-editor/web typecheck` -- passed.
- `git diff --check` -- passed.
- Browser check at `http://127.0.0.1:5173/` -- passed: overlay advances through four steps at 1280px desktop with 5/3/2/2 notes, spotlights, and arrows by step; no note/button/spotlight overlaps detected.

## Suggested Review Order

**Stepper State**

- Entry point for one-step-at-a-time guide state.
  [`AppShell.tsx:230`](../../apps/web/src/components/app-shell/AppShell.tsx#L230)

- Open, advance, and final-dismiss behavior.
  [`AppShell.tsx:1822`](../../apps/web/src/components/app-shell/AppShell.tsx#L1822)

- Renders all callout spotlights, arrows, notes, and the step button for the active step.
  [`AppShell.tsx:2036`](../../apps/web/src/components/app-shell/AppShell.tsx#L2036)

**Guide Targets**

- Defines the four requested workbench steps and their per-control callouts.
  [`help-guide.ts:57`](../../apps/web/src/components/app-shell/help-guide.ts#L57)

- Positions each callout note and arrow around the current UI controls.
  [`help-guide.ts:182`](../../apps/web/src/components/app-shell/help-guide.ts#L182)

**Copy And Styling**

- Chinese callout copy for all four steps.
  [`index.ts:26`](../../apps/web/src/i18n/index.ts#L26)

- English callout copy for locale parity.
  [`index.ts:276`](../../apps/web/src/i18n/index.ts#L276)

- Compact note and final-step button placement.
  [`styles.css:530`](../../apps/web/src/styles.css#L530)

**Tests**

- Covers Chinese four-step flow, per-step callout counts, and storage isolation.
  [`AppShell.test.tsx:57`](../../apps/web/src/components/app-shell/AppShell.test.tsx#L57)

- Covers English callout copy.
  [`AppShell.test.tsx:156`](../../apps/web/src/components/app-shell/AppShell.test.tsx#L156)

- Keeps older tests compatible with the new stepper.
  [`AppShell.test.tsx:3445`](../../apps/web/src/components/app-shell/AppShell.test.tsx#L3445)
