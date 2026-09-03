# Handover — 2026-09-03, the days rhythm mode became a workshop

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator. The third is
`../container-spike/`, run and closed; `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-08-30-themes.md` — the day the themes
named their tunes and rhythm began. Everything it says stands except where
this file says otherwise. This one covers **v2.66.0**: four days of working
with the player in tight conversation, twenty-two commits, almost all of them
inside rhythm mode — which went from "slice 1, printed count, no editor" to a
tool the player used on the real music he must play at the eisteddfod.

## What to read, and what to leave alone

| | When |
|---|---|
| `handover.md` — this file | Now, all of it |
| **`roadmap.md`** | Now, and before proposing any feature. Phase 2 (microphone) is deferred behind a sample corpus recorded **after the eisteddfod, mid-September 2026** |
| `../CLAUDE.md` | Now. The seam, and which remote is which |
| **`rhythm-plan.md`** | Before ANY rhythm/pattern/cell work. It is the living record: every ruling of these four days is written into it, dated, in order |
| `authored-cells-plan.md` | Mostly absorbed — its builder now exists inside rhythm mode; what it still owns is cells inside COURSES, and the Phase 6 note |
| `explicit-themes-plan.md`, `level-axes-plan.md` | Before course-schema or editor work |
| `handover-2026-08-30-themes.md` | For the themes axis, instruments, the editor fold — all still standing and still unplayed |
| `device-testing.md` | Before any session touching the shell or a phone |

## Where this stands

**v2.66.0, tagged with this handover; 1,763 tests across 93 files.** The
gate order matters and bit twice more: `build` → `build:web` → `check:web`
(it reads `dist/app`, which **`build:dev` deletes**) → `check:channel` →
**`build:dev` last**, restoring the tailnet copy on 4173. `npm run preview`
serves whatever sits in `dist/`; hard-reload before believing any page.

**The build order stands**: the player's playing pass → finish rhythm →
cells-in-courses → microphone (after the eisteddfod). Authored cells moved
early because the player kept pulling them forward, and the builder is now
DONE ahead of its plan's own phases.

## What rhythm mode is now — the shape, not the diff

One tab, named **Rhythm**, structured as the player specced it 2026-09-03:
metre filter → **cards** (a pattern's name + first bar engraved) → a card
**expands in place** to offer *Rhythm only*, *Random notes*, or the **cells**
written on that pattern. Key is a **choice, not a filter** (cells are
degrees); a cell out of the instrument's compass in a key greys with the
reason, as the themes picker does. Still missing: **multi-select** (a
playlist of patterns/cells, like themes) and any way to EDIT an existing
cell (only rhythms have ✎).

**The editor** ("+ New rhythm"): a step-sequencer grid — drag paints a note,
tap inside splits it, tap its start deletes; a beat-wide toggle reads
"in 4"/"in 3" and cycles `GRID_DIVISIONS` (admitting "in 5" is an entry plus
its dues, written at the list). The engraved stave below is the truth of the
drawing, on one written C — or, in **Add notes** mode, the cell being
written: one note per attack, dragged in whole scale steps (or click to
select — amber — then arrows/keyboard), carrying past the seventh into the
next octave. **"Written in"** picks the transcriber's key: signature,
register and spellings follow; the cell stays degrees underneath and the
lens is stored on it (`AuthoredCell.fifths`). The stave **runs to multiple
lines** when the bars need them.

**Engraving is a ruled system now, all in `rhythm-plan.md`**: show the beat,
with ties; a named merger table (whole bar, 4/4's half-bar for notes AND
rests, 3/4's minim, the dotted crotchet with its half from a division-4
beat, the crotchet triplet on an aligned pair); rests never dot and triplet
silence is triplet-quaver rests; brackets cover the FIGURE, rests included,
closing on the figure's own length. The scrolling surface finally draws
tuplet numerals — a gap shipped since triplet cells existed, found by the
preview.

**The count**: one emission (`syllablesForBars`) serves editor and play
screen — every beat at its own finest level, bright where an attack speaks,
dimmed through silence AND sustain, restarting at every bar line, silent on
a crotchet triplet's off-beat members. The voice will read only the bright
entries. **Demonstration bars are written as one bar rest** with the count
above; the **answer highlight follows the playhead**, one bar at a time.

**The run**: the alternating pair must take valves on BOTH notes (G-open
asked nothing of the fingers — seven of eleven instrument/clef pairs were
wrong); a cell's line plays over the pattern in the chosen key, and only a
run WITH a line prints a signature. **The sampler** was why short notes
died: the release now scales (at most a third of a note) and a note shorter
than its sample's bloom joins the recording where it has spoken —
tuba-worst, measured at 115–245ms.

## Where I went wrong, so you need not

- **The drag fought its own redraw**: it re-read the pointer against the
  renderer's layout, and the layout rescales as notes climb into ledger
  lines. Anchor a gesture to the pointer's own travel, never to geometry
  the gesture itself moves.
- **`noteLayout` must mirror the stacked page** (per-system metrics,
  justified x) or every note on line two is untouchable.
- **The sheet's column flexbox shrank the grown canvas back** — inline
  height loses to flex-shrink. `flex-shrink: 0` on anything that sizes
  itself.
- **The JSX-evaluates-anyway leak, a third time**: the card grid referenced
  `RHYTHM_PATTERNS` outside the literal. Trust the tripwire, not
  reachability reasoning; `check:web` has caught every one.
- **`grep -c` exits 1 on zero matches** and silently kills `&&` chains —
  two commits nearly didn't happen. Terminate such chains with `|| true` or
  split lines.
- **My test expectations were wrong five times while the engraver was
  right.** When a received value disagrees, hand-compute before "fixing"
  the code — every real fault here was found by LOOKING at output, every
  false alarm by trusting my own arithmetic.
- **Multi-line exposed dormant bugs**: the count numbered beats absolutely
  ("1..6" then blank), invisible until a pattern was long enough. When a
  dimension grows, re-test the invariants that were only ever exercised
  small.

## What is deliberately left open

- **THE PLAYING PASS — now three sessions deep in unplayed machinery.**
  The bundled course parity check, a support-axis level, the themes tune
  picker, `~/Desktop/awkward-notes.json`, rhythm rounds, and now cells. The
  player HAS started using the editor on real music (that is where the last
  eight faults came from), but no full rhythm round has been played and
  nothing has been heard.
- **The counting voice**: his script is `~/Desktop/recording-script.txt`
  (positional; trip-let; pineapple recorded as a second system in the
  plan); the raw file lands at `~/Desktop/counting-raw`; three synthetic
  candidates wait at `~/Desktop/syllable-audition.html`. The **clip
  scheduler** (a metronome sibling) is unbuilt and waits on a chosen voice.
  The **voice-pack recorder** is designed in `rhythm-plan.md`, not built.
- **Multi-select** of patterns/cells; **editing an existing cell**; the
  **hover colour's** worth (only the player's hand can judge it); the E32
  touch pass on the grid gestures (`device-testing.md`).
- **Cells inside courses** — `authored-cells-plan.md`'s remaining scope: a
  `cells` LevelKind, embedded BY VALUE, editor verdicts against declared
  instruments.
- **`barsFromGrid`'s validation sentences are English** in every locale
  (exercise-layer strings the i18n guard cannot see); the rhythm i18n
  bucket is machine-drafted like the rest — the native-review item grows.
- **The keystore backup is STILL not done** — eighth handover to say so.
  `~/keystores/brassmaster/`, off this machine.
- **Spine stages 5–9** are unwritten pattern data; stage/difficulty filter
  on the cards is designed (packaged stage + computed density) but unbuilt.

## How to work here

Small, complete changes; the full gate in the stated order with exit codes
checked — and `check:web` before `build:dev`, never after. Mutation-test
what guards (these days: the engraver's mergers, tie emission, the valved
pair, demo blanking, figure-closure brackets, the cell snapshot, the octave
carry, the release scale, the bloom join — every one killed a test). Write
rulings into `rhythm-plan.md` dated, at the section they amend; the plan is
the memory and it works — four days of rulings were navigable because of
it. **Let the player use the thing**: every fault worth fixing came from
his hands or eyes on real music, and his reports are usually the diagnosis
("the drag delta y might be doing something funny" — it was). Playwright
against 4173, element screenshots not clips, hard reload, check the build's
exit before believing any picture. Push `origin`, never `legacy`; tag;
confirm the deploy; the tripwires now guard five features and have earned
their keep three times over. Nothing ships unheard — and now the tool
exists to make the music, that rule is about to matter daily.
