---
title: 'Redesign help overlay for the current workbench'
type: 'feature'
created: '2026-06-07T13:50:04+0800'
status: 'done'
baseline_commit: '0624565227165c48de5fa0b3e680809e2a72f6b2'
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
| Desktop first open | 1280px+ editable workbench with no dismissal preference | Help overlay opens on step 1 with one guide note and one spotlight/arrow | If a target is missing, omit only that target instead of crashing |
| Step advance | User clicks Next on steps 1-3 | Overlay advances to the next region without closing or writing dismissal preference | No scene, autosave, saved scene, or staging storage writes |
| Dismiss | User clicks the final confirmation button on step 4 | Overlay closes and only `helpOverlayDismissed` is persisted in UI preferences | No scene, autosave, saved scene, or staging storage writes |
| Reopen | User dismissed previously, then clicks the header help button | Walkthrough starts again from step 1 | No duplicate preference writes until final confirmation |
| Narrow/mobile | Viewport below guide breakpoint or mobile preview mode | Help overlay is unavailable and no dismissal preference is written | N/A |
| Locale | Locale is `en-US` | Four-section guide uses English copy and the English confirm button | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/app-shell/help-guide.ts` -- guide target definitions and note/arrow positioning.
- `apps/web/src/components/app-shell/AppShell.tsx` -- help overlay rendering, target measurement, dismissal behavior.
- `apps/web/src/i18n/index.ts` -- zh-CN/en-US help overlay messages.
- `apps/web/src/styles.css` -- help overlay note, spotlight, arrow, and button styling.
- `apps/web/src/components/app-shell/AppShell.test.tsx` -- desktop help overlay behavior and i18n regression tests.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/src/components/app-shell/help-guide.ts` -- replace the three legacy targets with four current workbench targets and update layout rules.
- [x] `apps/web/src/i18n/index.ts` -- add four structured help guide copy entries in Chinese and English.
- [x] `apps/web/src/components/app-shell/AppShell.tsx` -- render the four-step walkthrough without changing scene state.
- [x] `apps/web/src/styles.css` -- style multi-line guide notes so content fits at desktop widths without overlap.
- [x] `apps/web/src/components/app-shell/AppShell.test.tsx` -- update stepper, copy, i18n, and storage isolation assertions.

**Acceptance Criteria:**
- Given an editable desktop workbench, when the help overlay opens, then it displays four guide sections covering left setup/layers, right assets/backpack, center canvas editing, and bottom skills/notes.
- Given the overlay is visible, when the user confirms, then only the UI preference dismissal marker is persisted.
- Given the locale is English, when the overlay opens, then all four guide sections use English copy.
- Given a narrow or mobile viewport, when the app loads, then the help overlay remains unavailable and does not persist dismissal.

## Spec Change Log

## Design Notes

Use the existing overlay shell rather than a new onboarding system. The four requested regions become focused steps so each spotlight explains one area cleanly while sharing the same measurement, breakpoint, i18n, and dismissal boundaries.

## Verification

**Commands:**
- `pnpm --filter @pokopia-scene-editor/web test -- src/components/app-shell/AppShell.test.tsx` -- passed, 342 tests.
- `pnpm --filter @pokopia-scene-editor/web typecheck` -- passed.
- `git diff --check` -- passed.
- Browser check at `http://127.0.0.1:5173/` -- passed: overlay advances through four focused steps at 1280px desktop with one spotlight/arrow/note per step and no note/button/spotlight overlap on the final step.

## Suggested Review Order

**Stepper State**

- Entry point for one-step-at-a-time guide state.
  [`AppShell.tsx:199`](../../apps/web/src/components/app-shell/AppShell.tsx#L199)

- Open, advance, and final-dismiss behavior.
  [`AppShell.tsx:1822`](../../apps/web/src/components/app-shell/AppShell.tsx#L1822)

- Renders only the active target, note, arrow, and button.
  [`AppShell.tsx:2035`](../../apps/web/src/components/app-shell/AppShell.tsx#L2035)

**Guide Targets**

- Defines the four requested workbench regions and copy keys.
  [`help-guide.ts:33`](../../apps/web/src/components/app-shell/help-guide.ts#L33)

- Positions step notes around each current UI region.
  [`help-guide.ts:99`](../../apps/web/src/components/app-shell/help-guide.ts#L99)

**Copy And Styling**

- Chinese guide copy for all four steps.
  [`index.ts:21`](../../apps/web/src/i18n/index.ts#L21)

- English guide copy for locale parity.
  [`index.ts:273`](../../apps/web/src/i18n/index.ts#L273)

- Note and final-step button placement.
  [`styles.css:530`](../../apps/web/src/styles.css#L530)

**Tests**

- Covers Chinese four-step flow and storage isolation.
  [`AppShell.test.tsx:57`](../../apps/web/src/components/app-shell/AppShell.test.tsx#L57)

- Covers English four-step copy.
  [`AppShell.test.tsx:152`](../../apps/web/src/components/app-shell/AppShell.test.tsx#L152)

- Keeps older tests compatible with the new stepper.
  [`AppShell.test.tsx:3445`](../../apps/web/src/components/app-shell/AppShell.test.tsx#L3445)
