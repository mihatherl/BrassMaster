# Handover — 2026-09-04, the day the phone used the tool and the tool grew a playlist

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator. The third is
`../container-spike/`, run and closed; `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-09-03-rhythm-workshop.md` — the days
rhythm mode became a workshop. Everything it says stands except where this
file says otherwise. This one covers **one long conversation, 2026-09-03
evening into 09-04**: twenty-odd commits, in tight dialogue with the player,
who spent much of it with the phone in his hand in exactly the band-hall
posture the paid app is for. The pattern held all day: he plays, he reports
in one or two sentences, the report is usually the diagnosis.

## THE FIRST THING TO KNOW: nothing is pushed

Every commit of this conversation is **local only**. No push, no tag, no
version bump, no deploy — `package.json` still says 2.66.0 under a tree
that is well past it. The player has not asked for a release; when he does,
it is a minor bump (2.67.0 at least — the day added features, not only
fixes), the full gate in the stated order, push `origin` (NEVER `legacy`),
tag, confirm the deploy. **1,818 tests across 91 files** at the last gate.
Also: the preview on 4173 was restarted from inside the assistant session as
a background task and DIES WITH IT — if 4173 is down, `npm run preview --
--host` from this directory (`--host` matters: the tailnet and the phone).

## What the conversation built, the shape

**The cell editor grew up.** Accidentals (letter first, then ♯/♭ — a
half-step increment was argued down because it cannot know the spelling the
copied page shows); a grid-less **note editor** (`CellEditor.tsx`) opened
from every card ("+ Write notes") and from a ✎ on every authored line — the
edit-a-cell gap is closed, delete lives there too; the ✎-chip shelf beside
"+ New rhythm" is gone. The stave preview is its own module
(`RhythmStavePreview.tsx`), shared by both sheets so they cannot drift.

**The count moved below the stave** into the **count band**
(`render/count-band.ts` + `drawCountBand`): per-pulse tinted ribbons over
the engraved music curving down to a label bar of even divisions; sustain
loops (his shape — a capsule grouping a sound's marks, tied chains one
loop); note-less bars print bare dimmed numbers (the demo-bar mush fix);
edges follow the engraver (`cellEdgeX`: bar-line setback, midpoints
between); the answer wash was aligned to the same rule. The fingering
collision above the stave dissolved by construction. **Beat shading** is a
run option in the gate's beat section — on by default in rhythm, off
elsewhere, two stored memories (`beatBandsFor`).

**The phone pass** (all built from his hands, all still to be verified on
the E32 per `device-testing.md`'s own rule): `touch-action: pan-y` with a
tight touch claim so the sheet scrolls; a keyboard-style callout naming the
dragged note above the finger; drag hysteresis (`walkSteps` — the note
commits past a boundary, so a lifting fingertip moves nothing) with lower
touch gain; floating ♯/♭ above-left of the selected note (left because the
hand works left-to-right); ↑/↓/←/→ riding the right margin of the note's own
system, ←/→ walking the selection through the line.

**The run became honest about cells.** One placement rule
(`cellWrittenMidi`/`cellSlotPitch`): the editor draws it, the run plays it,
`cellFitsKeys` greys against it — before this, three authorities placed one
page and an authored A3 played an octave adrift. The **"Play in" grid**
landed on the tab (ruled 2026-09-03, never wired), with **"As written"**
leading it: a cell plays in its authored key by default
(`rhythmAsWritten`). The written-in lens **re-keys the page, not the notes**
(`rewrittenIn`): set the signature late and nothing you placed moves. The
silent **demonstration statement is skipped** (`DEMONSTRATION_STATEMENTS =
0`) until the voice's clips exist.

**Variations** (`variedLine`): a pluggable framework — registries of named
**transforms** (transpose, invert, retrograde, rotate — the isorhythmic
colour against the held talea — tail-shift) and **critics** (leap-recovery,
span, one-climax, judged RELATIVE to the theme), candidates refused by the
run's own fitness including the valved rule for bare lines; theme first,
fresh line per round; the ≈ chip is a modifier of whatever line is active.
The theory ladder's next rungs (structural skeleton, harmonic frame,
contour resampler) are recorded in `rhythm-plan.md` as registry entries to
come, not rewrites.

**The selection phase**: a **playlist** (`rhythmSteps` — a step is a
pattern plus a way, NO key), rounds drawn from steps with metre and
signature changes at the seams, medley or in order, nothing truncated,
deleted cells dropped never silently bare; the strip-above-the-cards UI
(the themes SHEET deliberately not reproduced — the cards are the browse —
an adaptation asserted for his hands to judge); **Built-in** collapsed by
spine stage over trimming it, **My rhythms** beneath.

**Infrastructure**: the dev channel ships a **self-destroying service
worker** (a stale worker had cached the SPA fallback UNDER A SAMPLE'S KEY
and "Loading instrument…" hung forever); the editor preview is
`fitContent` (width alone sizes the stave — the grown canvas fed the fitted
layout its own consequence and flip-flopped at boundary widths).

## Where I went wrong, so you need not

- **`git checkout -- <file>` wiped uncommitted work TWICE** (a mutation
  revert, then again). Mutations are reverted by hand-edit, never by
  checkout. If it happens: the lost text is usually still in your context.
- **`set -e` is not honoured** through this harness's shell wrapper, and a
  failed python heredoc does NOT stop the lines after it — two commits ran
  after their plan-doc edit had already failed its anchor assert. Verify
  each scripted step's output explicitly; chain with `&&` inside ONE
  statement when order matters.
- **`npx tsc --noEmit` checks NOTHING here** (solution-style tsconfig). The
  real typecheck is `npm run build`. Several "clean" tsc runs were lies.
- **devicePixelRatio 1 hides coordinate bugs**: the hit test multiplied the
  pointer by the ratio and every headless check passed; the player's zoomed
  desktop failed. Probe at ratio 2 when gestures act oddly.
- **My test expectations were wrong twice while the code was right** (the
  walk's commit arithmetic; the rekey invariance passing different keys to
  its two sides). The standing rule again: hand-compute before "fixing".
- A grep in a gate pipeline let a red suite through once. Exit codes decide,
  grep never.

## Deliberately open, and named

- **THE PLAYING PASS, still.** Everything in the previous handover's list —
  plus now: a playlist with mixed metres/keys on a real instrument, medley
  vs in-order, variation rates (constants in `variedLine`), Random notes'
  redundancy (his call), the count band at practice tempo.
- **The E32 pass** on every phone behaviour above; then the feel constants
  (`TOUCH_RADIUS`, `TOUCH_DRAG_GAIN`, `TOUCH_COMMIT`, float sizes).
- **Playlist reorder** is remove-and-re-add; the themes-style sheet is the
  recorded fallback if the strip strains.
- **The voice**: unchanged from the previous handover (script, audition
  page, recorder design). `DEMONSTRATION_STATEMENTS` returns to 1 with the
  clips — and demo length against LONG authored patterns then needs its own
  ruling; the design was ratified against one-bar spine cells.
- **Variation rungs**: skeleton, harmonic frame, contour — plugin points
  waiting on his ear getting bored; per-transform weights likewise.
- **`rhythm.playInNote`** undersells "As written"; the machine-drafted i18n
  pile grew a lot this session — the native-review item compounds.
- **Spine stages 5–9**; packaged-pattern trims are his to name as data.
- **Cells inside courses** (`authored-cells-plan.md`) untouched.
- **The keystore backup is STILL not done** — ninth handover to say so.
  `~/keystores/brassmaster/`, off this machine.

## How to work here

Unchanged in spirit from the previous handover, sharpened by this session:
small complete changes; the full gate with exit codes deciding,
`check:web` before `build:dev`, `build:dev` last; mutation-test what
guards, revert mutations BY HAND; rulings into `rhythm-plan.md` dated at
the section they amend — it held twenty commits of context across one
conversation and never lost a decision. Let the player use the thing: every
fault this session came from his hands, and his phrasing usually named the
mechanism ("an uncertain state of whether it wants to give me a new line").
Playwright against 4173 with element screenshots for your own eyes before
his; probe coordinates at devicePixelRatio 2; the i18n guard and the
`check:web` tripwires catch what reasoning misses — trust them. Push
`origin`, never `legacy`; and remember nothing here is pushed yet.
