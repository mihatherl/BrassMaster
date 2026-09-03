# Handover — 2026-08-30, the day the themes named their tunes and rhythm began

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator. The third is
`../container-spike/`, run and closed; `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-08-30-axes.md` — the night the level
axes were built. Everything it says stands except where this file says
otherwise; it remains the place for the axes model's history, the editor's
x-axis arc and the gate order's reasoning. This one covers a single long day
of working *with* the player, in conversation: **v2.65.0**, one release
carrying ten distinct pieces, each gated as it landed.

## What to read, and what to leave alone

| | When |
|---|---|
| `handover.md` — this file | Now, all of it |
| **`roadmap.md`** | Now, and before proposing any feature. **Phase 2 (microphone) is deferred** behind a sample corpus the player records after the eisteddfod (mid-September 2026) |
| `../CLAUDE.md` | Now. The seam, and which remote is which |
| **`rhythm-plan.md`** | Before any rhythm work — **scheduled and slice 1 built** 2026-08-30; the header says what exists |
| **`explicit-themes-plan.md`** | Before touching themes levels, the tune picker or `instruments` — built, with the build's own corrections recorded at the foot |
| **`authored-cells-plan.md`** | Designed, not built, not formally ratified — the player's own concept, next after rhythm |
| `level-axes-plan.md` | Before any course-schema or editor work |
| `handover-2026-08-30-axes.md` | For anything about the axes build itself |
| `course-plan.md` | Pedagogy; its cells section is superseded and says so |
| `device-testing.md` | Before any session touching the shell or a phone |

## Where this stands

**v2.65.0, one commit for the whole day** — less granular than the house
style of a release per piece, and deliberately: the pieces interleave in the
same files and each intermediate state was gated live during the session,
but could not be re-gated retroactively as separate commits.
**1,720 tests across 88 files.** Gate order unchanged (build → build:web →
checks → **build:dev last**; `vite preview` serves whatever sits in `dist/`).

**The build order is now: the player's playing pass → rhythm (continue) →
authored cells → microphone (after the eisteddfod).** Ruled by the player
2026-08-30; the roadmap's Phase 2 note records why.

## The day's pieces, newest machinery first

- **Rhythm drills, slice 1** (`rhythm-plan.md` header lists it). The pattern
  library (spine stages 1–4) and syllable mapping in `exercise/rhythm.ts`;
  the demonstration-then-play generator in `generate.ts` (`rhythmExercise`);
  the printed count — **1 e & a, centred on the notehead, greying with its
  demo bars** — as `Exercise.syllables`, its own channel after riding
  `labels` collided; `__HAS_RHYTHM__` with a `check:web` tripwire that
  **caught two real leaks on its first day** (JSX evaluates whether rendered
  or not; the generator dispatch ships unless the literal folds it). Demo
  bars are unjudged BY DATA (`acceptedMasks: []`) and silent under reference
  playback (scoped to rhythm — imported unreachable notes still sound).
  Unplayable notes now draw in horizon grey. Rhythm's tab asks one question
  (which pattern): no key, no difficulty, no signature, no Reading control
  at the gate — the material answers all four. **The voice waits on the
  player's clips**: eleven syllables, one phone session, nothing sounds
  until they exist.
- **A themes level names its tunes** (`explicit-themes-plan.md`). The
  `themes` axis carries `{id, fifths}` steps; `themeCount` is deleted and
  refused by name; stage widths are each tune's own bars; the picker draws
  the actual notes (`ThemePicker`, a portalled modal — the stage clips
  overflow, the handover's own trap). A tune's key is the step's:
  `AXES.fifths.kinds` excludes themes, which refuses axis AND scalar
  through the one table.
- **`instruments` at course scope** — who a course is for, pedagogical
  before technical (a tuba player's material differs from a cornet
  player's even early on; **never render "suitable for"** — the check can
  only refute). Editor warns on an undeclared course; reader accepts.
- **Schema narrowings**: `metre` to phrases only (drills force 4/4 in the
  generator — a live silent-ignore fixed); Key and Difficulty gone from a
  themes level's header (`NEEDS_DIFFICULTY.themes: false` — and note the
  read-side fault it exposed: absence must stay absent, an empty
  `difficultyId` reaches `difficultyById`, which **throws**).
- **Editor readability**: levels are cards with solid header bars, folding
  to name + one summary chip + controls; collapse keyed by id, not index.
  A fresh level states **only its name** — the material and tempo axis
  moved to course defaults, where inheritance already carries them.
- **The bars axis drives stage widths now** (it drew the rule's figure and
  lied); a drag writes the AXIS, not the rules, or the level silently grew.
  Cycles deliberately excluded — no honest static bars-per-cycle exists.
- **Range rows** got their own height; the figure shrinks to fit rather
  than cropping; fingerings off in the editor (`fingerings: false` on
  `drawRangeStave`) and a fixed `height` option, because the callout's
  height fed `inkExtent` and the stave resized under a moving bound.

## Where I went wrong, so you need not

- **The backtick-in-a-CSS-comment fault, twice in one day** — the previous
  handover documents it and I hit it anyway, both times when a comment
  quoted a code identifier. Both times the failed build meant the next
  browser test ran a STALE bundle and reported the bug as still present.
  Check the build's exit before believing any screenshot.
- **`npx vitest run` without `VITE_TARGET=app` folds every `__HAS_` flag
  false** — flag-gated code silently takes the free path and a mutation run
  reports nonsense. `npm test` sets the target; bare vitest does not.
- **JSX evaluates whether rendered or not.** A flag-gated *render* does not
  tree-shake the data it references; the expression itself must fold
  (`__HAS_RHYTHM__ ? (...) : null`). The tripwire caught it; trust the
  tripwire over reachability reasoning.
- **The tools import `src` with no defines**, so a bare flag read in shared
  modules throws under tsx. `typeof __HAS_X__ !== 'undefined' && __HAS_X__`
  folds identically under Vite and survives the tools.
- **A second session in one engine test anchors at the clock the first
  left behind** — reset `audioTime` or the run plays backwards.

## What is deliberately left open

- **The keystore backup is STILL not done** — seventh handover to say so.
- **Nothing from this day has been played or heard.** The playing pass in
  front of everything: the bundled course for parity, a support-axis level,
  the themes picker, the awkward-notes course (`~/Desktop/awkward-notes.json`,
  sight-reading G flat for Eb bass treble — 21% of notes are C flat), and
  now rhythm's first patterns. The player's ear settles rounds-per-stage,
  tolerance, and the spine's order.
- **The syllable clips** — the player's own voice is the default again
  (re-ruled 2026-08-31; the day's full arc is in `rhythm-plan.md`'s voice
  section). His script is `~/Desktop/recording-script.txt`; his raw file
  arrives at `~/Desktop/counting-raw` and is sliced on the 60 bpm grid.
  Triplets say **pine-app-le** (his tradition), with 1-trip-let kept as an
  alternative set. The synthesized candidates remain auditioned fallbacks.
  A **voice-pack recorder** is designed in the same section — any user's
  voice and language over a system's slots, paid, on the phone — and the
  player would use it to make future defaults. Until a voice is chosen,
  the count is print.
- **Rhythm slices 2+**: the clip scheduler (a metronome sibling, not a
  `Voice`), stages 1–3 withdrawal, spine stages 5–9, courses (`LevelKind`
  deliberately still excludes rhythm — the discriminated-material schema
  question in the plan must be answered first).
- **Native review of the seven language packs** — now including the rhythm
  bucket's three strings ×7, machine-drafted like the rest.
- **The authored-cells build** (plan exists; the format is a small Theme).
- The **note picker** parked in roadmap § 7 with its spelling catch.

## How to work here

Small, complete changes; the full gate in order, exit codes checked.
Mutation-test anything that guards — this day: the instruments refusals,
the metre narrowing, themeCount's refusal, the tune-step reader, the width
rule, the drag's axis-write, demo blanking, alternation, the pattern metre,
the playback skip. Write rulings into the code at their sites, dated.
Design before building, and **let the player play it before believing it**:
every visual fault this day was found by a screenshot or by his eye, never
by the DOM. Playwright against `localhost:4173`, hard-reload before
trusting the editor page. Push `origin`, never `legacy`; tag; confirm the
deploy; the paid fingerprints stay out of the free bundle — the tripwires
now prove five features' worth. Nothing ships unheard.
