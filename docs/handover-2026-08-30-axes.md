# Handover — 2026-08-30, after the night the axes were built

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator (its next hour is annotation, and
`train/annotate_bars.py` is the tool). The third is `../container-spike/`,
run and closed; `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-08-28-course.md` — the week courses
became the product's spine. It is superseded but not wrong: everything it
says about the app *outside* the course schema still stands, and it is the
place to look for the site, the i18n guard, the honesty rulings and the road
to Play. This one covers one long night: **ten releases, v2.61.0 through
v2.64.2**, which built the level axes and then reshaped them five times by
looking at them.

## What to read, and what to leave alone

| | When |
|---|---|
| `handover.md` — this file | Now, all of it |
| **`roadmap.md`** | Now, and before proposing any feature |
| `../CLAUDE.md` | Now. The seam, and which remote is which |
| **`level-axes-plan.md`** | Before any course-schema or editor work. **Built** — the plan and every ruling that reshaped it, dated in place |
| `course-plan.md` | Before any pedagogy work. Ratified 2026-08-26; its `advance`/`pinned`/tempo-band sections are superseded, and say so at the top |
| `handover-2026-08-28-course.md` | For anything this file does not cover — the site, i18n, sessions, Play |
| `rhythm-plan.md` | Before any rhythm-drills work — ratified, deliberately unscheduled |
| `device-testing.md` | Before any session touching the shell or a phone |
| `../container-spike/FINDINGS.md` | Before any Phase 2/5 work |
| `v2-design.md` | Never end to end. Grep it for the noun you are touching |
| `difficulty-model-plan.md`, `app-store-plan.md`, `v3-library-plan.md`, `musicxml-import-plan.md`, `tempo-map-plan.md` | As their subjects come up |

## Where this stands

**v2.64.2, pushed, tagged and green — nothing unpushed on this machine.**
**1,660 tests across 85 files.** The last deploy confirmed live was v2.61.0;
the editor releases since then are paid-build only, so the free site is
unaffected either way, but **confirm the deploy** if you push again.

The gate before any push is `npm test && npm run build && npm run lint`,
plus `npm run check:web` and `npm run check:channel`. **Gate order matters**:
a plain `build` empties `dist/`, so run `build` → `build:web` → the checks →
**`build:dev` last**, which restores the tailnet copy on 4173. `vite preview`
serves whatever sits in `dist/`, and this has bitten five sessions.

## The axes build, and the five corrections that followed

`docs/level-axes-plan.md` is the whole record, with every ruling dated in
place. What a fresh session needs:

**A level is a timeline.** Each axis a level moves is a step function over
the level; a **segment** is the space between two consecutive divisions
across all axes at once; `Position` is a segment index and the buttons move
one segment. `exercise/course.ts` holds the schema, the reader, `segmentsOf`,
`runFor` and `ruleFor`. Old documents read forward — a tempo band becomes a
tempo axis, `pinned` becomes header scalars, `advance` becomes the level's
default rule — and old stored positions map their tempo onto the segment it
meant. `carryEvidence` is **gone**: evidence is per-segment by construction.

**The trichotomy.** Every axis-capable parameter is (a) absent — the
player's own setting or the gate's question; (b) a header scalar — pinned,
shown locked at the gate; or (c) an axis — it progresses. **Never two at
once**, refused by name. There is no composite "support" axis: each help
setting (metronome, conductor, fingerings, playback, reading mode) is its
own, because one axis moves one thing.

**A course may say anything a level says, once** (v2.64.0). Defaults resolve
in `resolveLevelDocument`, on the plain document *before* validation — so
**the runtime never learns inheritance exists**. A level that states a
parameter states it entirely. Name, note and `segmentRules` never inherit.

**Support switches mid-stream** at the crossing commit: `Session.setSupport`,
`Hints.setMode`, `StaveRenderer.setReadingMode`, and the conductor by ref.
`runSupport` rides the `runTempo` doctrine — **never through `settings`**,
which would tear the session down mid-note.

**The interval pool** (`intervalStep` in `generate.ts`) is diatonic-degree
based with an optional degree fence, so *"Exploring 3rds in C major"* is
authorable. The absent path is byte-identical, and the engraving snapshots
proved it by catching a refactor that reordered the RNG draws.

**The editor's timeline** (`src/editor/timeline/`) went through four
x-axes before it was right, and the arc is worth knowing because each
correction came from the player looking at the thing:

1. **percent** — a lie once rules were per-segment: two stages needing eight
   bars could be drawn at 25% and 5%;
2. **time** — true, but one derivation too far, and it made dragging
   meaningless *and impossible* (a divider alone in its gap had nowhere to
   go, so the tempo dividers could not be moved at all);
3. **bars** — the unit the rules are written in, the player plays, and an
   author can act on. A stage's width is the bars its rule asks for; the
   level's length is their sum. **Dragging moves bars across a divider**
   (level length unchanged, both rules rewritten); **editing a rule** changes
   the length; add/delete adds or removes a stage of its own length;
4. and then the fences came off: **the only fence is the axis's own
   neighbours** — every other axis's boundary is a place to land, not a wall
   — and **a score window is not a wall either** (`fitRule` bends it down
   with the stage; one bar is the only floor).

A stage is a coloured rounded block carrying its own value and delete
button; an inherited axis is the same block, **ghosted, with an Override
button** that takes a copy into the level. Boundaries are ticked in the
ruler rather than drawn through the colour.

## Where I went wrong, so you need not

- **`git checkout -- <file>` to revert a hand mutation discarded an hour of
  uncommitted work.** The old warning said a checkout cannot restore an
  *untracked* file; the sharper rule is that it cannot restore *anything*
  uncommitted. Revert mutations with a reversing `sed`, never a checkout,
  whenever the file carries work not yet in a commit. The full gate caught
  it — two tests red rather than green — which is the argument for running
  the whole gate rather than the file you were touching.
- **Two CSS rules were silently lost** when a later edit rewrote the block
  they sat in, and *nothing failed*: an inherited stage lost its ghosting,
  and a `fieldset` reset went with it, putting a value 21px from an edge
  that should have been 4. The test asserted the **class**, not the look, so
  an unstyled ghost passed. **Where a look is the feature, measure the
  look** — a `getComputedStyle` assertion, or a browser measurement.
- **`overflow-x: auto` clips vertically too.** CSS forces the other axis to
  `auto` with it, with no opt-out, which is how a callout opening upward
  lost its head. It opens downward now into room the scroller reserves —
  and the room is *measured from the callout*, because the first fix
  guessed a figure and was one pixel short of the plainest variant.
- **An explicitly-placed grid item makes auto-placed siblings cascade.** The
  timeline's overlay was placed in column 2, and every auto-placed row fled
  to column 1 — which is why the bars stacked under the panels. Every cell
  carries explicit coordinates now.
- **Backticks inside a CSS comment terminate the template literal** holding
  the editor's stylesheet. `tsc` caught it — but the build had already
  failed silently in the same breath, and I nearly screenshotted a stale
  page believing it was the new one.
- **The editor page caches.** `vite preview` serves `editor.html` from
  Firefox's cache on a soft reload, so the player can be looking at the
  previous build while you are looking at the new one. When a UAT report
  contradicts a DOM measurement, suspect this first and ask for a
  hard reload.

## What is deliberately left open

- **The keystore backup is STILL not done** — `~/keystores/brassmaster/`
  (`upload.jks` + passphrase), off this machine. Sixth handover to say so.
  Also worth one look in the Play console: whether Play App Signing is on
  decides whether a lost upload key is a reset or a catastrophe.
- **The curriculum — and it is now the only thing between here and a real
  course.** The machinery is built, green and *unplayed*. The editor is good
  enough to author in; *Common Keys* is scaffolding. Nothing ships unheard.
- **Native review of the seven language packs** — 247 keys each plus 40
  landing-page strings apiece, all live. The largest open item no session
  can discharge. The **US-English fork** (crotchet → quarter note) is still
  a pack and two lines, and answers together with `describeSkill`'s notation
  vocabulary on the Progress report.
- **Request indexing** for `/de/` `/nl/` `/fr/` in Search Console.
- **A level that inherits an axis and sets its own per-segment rules is
  fragile**: moving that axis in the course can leave those rules keyed to
  boundaries that no longer exist, and the reader refuses by name. It
  surfaces in the editor's live verdict rather than silently, so it is
  visible and fixable — but it is a trap that has not been designed away.
- **While a level carries an inherited axis, a drag does not renumber
  stored positions** — they belong to the course document.
- **Switching courses discards the old course's position** (one Progress per
  instrument/clef). Cheap to live with; noted so it is a choice.
- **The QC45 route test** — the one 4.2 capability never watched working.
- **The advance/mastery constants are provisional** and must be tuned only
  by the player playing a real course, per the plan's own law. The fresh
  level's six tempo stages and eight-bar default were left alone for exactly
  this reason; the 48 bars they produce are now visible and draggable.

## What is next

**The curriculum, and it is authorship rather than code.** The checkpoint
the build plan named still stands and has not been taken: play the bundled
course for parity, then author a real level with a support axis and hear the
metronome drop out at a crossing. **First on the device list:** a
`readingMode` flip at a join on the E32 — `StaveRenderer.setReadingMode`
re-lays the whole surface at the crossing, which is real work on the slow
renderer and has only ever been seen on a desktop.

After his pass, the roadmap's build order is the **microphone with its
§ 2.4 calibration** (detection is proven; the fingering-not-pitch seam makes
octave errors free; § 2.5 takes the player's range from it), with
`course-plan.md` phase 3 (author cells) and the free-taster flag split as
the nearer, smaller items. The generator sleeps; its next hour is a
musician's, in `train/annotate_bars.py`.

## How to work here

Small, complete changes. Run the gate in the order above and check exit
codes. Write the reasoning into the code where the next person will meet it
— this night's rulings all live at their sites, dated. **Mutation-test
anything that guards** (this night: the crossing commit, the whole-window
rule, the evidence reset, the trichotomy refusal, the rule-carrying move —
each reverted by hand, never by checkout). **Design before building, and let
the player play it before believing it**: every correction above came from
his eye on the built thing, not from the plan. Drive the editor in a real
browser before claiming a visual change — Playwright against
`localhost:4173` is how four of these faults were found, and it is
`node_modules/playwright-core` with an absolute import path, run from the
scratchpad. Push without asking once the gate is green; push `origin`,
never `legacy`; tag every version; confirm the deploy on the live site,
including that the paid fingerprints stayed out of the free bundle.
Nothing ships to a player unheard — and now, in any language, unreviewed.
