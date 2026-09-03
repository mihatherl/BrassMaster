# Authored cells — a pattern of your own, drilled

**Designed 2026-08-30 with the player, in conversation. Not built. Not yet
ratified as a document** — the three load-bearing rulings below are his,
made explicitly; the assembly around them is put up for his eye.

Read `course-plan.md`'s *Author-written cells* section first: this
supersedes it, and the note at its head says so. Read `rhythm-plan.md`
before building the rhythm-guide half of the builder.

## The use case, in the player's words

> I have a particularly difficult run of a few bars that I just need to get
> muscle memory on. I use the cell editor to create that pattern and save
> it. I want to pull it into Free Play mode, without having to structure it
> into a course.

And the free-play framing:

> In free play mode we play "major scale in C", which would be equivalent to
> selecting "MyCell in D", over and over again.

So: a **defined set of intervals, each described, with different note
lengths, including rests** — not a mathematically derived shape like the
eight built-in drills. New material, that *presents* like a drill.

## The three rulings (the player, 2026-08-30)

1. **New material, worn like a drill.** Not a ninth entry in `DRILLS` —
   those are formulas (semitones above a root); this is written music. But
   in the picker it sits where a drill sits, is chosen with a key, and
   plays over and over.
2. **Each authored cell carries its own time signature**, defined by the
   sort of rhythm it is. The `isPattern` 4/4 forcing is untouched, because
   this is not `kind: 'drills'` — the same road themes took: the material
   declares its own metre, and a `metre` axis or scalar on it is refused.
3. **Paid only.** *"The editor is going to be a big piece of work — more
   than I'd want to give away in a free app."* The builder and the library
   ship in the paid build alone, behind the same build-time line as My
   Music (`VITE_TARGET`, a `check:web` fingerprint), and the free web
   build contains none of it.

Plus one ruled earlier the same day, about courses:

4. **A course carries every cell it uses, by value.** The app's own cells
   *"can't be guaranteed to exist by name or reference, so any cell used
   needs to be individually defined within the course material itself."*
   This supersedes `course-plan.md`'s "the built-ins, the course's own, or
   both": a course that travels between people must mean the same thing on
   every machine. The same argument as the themes axis refusing a tune the
   app does not have — except a cell is small enough to embed rather than
   merely name.

## The discovery that makes this cheap: the format already exists

The plan's first draft assumed a new event format. **It is not needed.**
`ThemeNote` (`exercise/theme.ts`) is already:

- **degree-based** — *"degree of the major scale of whatever key is in
  force, 1–7"* — so a pattern is key-independent and realises in any key,
  exactly as the nursery collection already does;
- **chromatic** — `alter: -1 | +1` inflects a degree, so a difficult run
  with accidentals in it is writable. (It can even write the player's own
  nemesis deliberately: degree 4, alter −1, in G major *is* a C flat.);
- **rhythmic** — `beats`, dotted values, `tied`, and `ThemeRest`;
- **octave-aware** — `octave` offsets from the home octave;
- **realisable and playable today** — `realiseTheme` fits it to any
  instrument, clef and key, refusing where the compass will not hold it,
  and `exerciseFromTheme` makes it an `Exercise`.

So **an authored cell is a small Theme**, written by the player instead of
the corpus, stored in their own library, and played with drill semantics
(repetition, a key or a few keys) instead of theme semantics (a medley).
The composer's `Cell` type (`cells.ts` — one bar, open/move/close roles)
is a different thing and is untouched; the naming collision is real and
the code should probably say `pattern` where it means this feature, with
"cell" reserved for the player-facing name he actually uses. **Naming is
open — the player's word wins once he has seen both in a sentence.**

## Free play (paid app)

- The material picker gains the player's saved cells beside the drills —
  "MyCell", chosen with a key like any drill, honouring the same
  compass-fit greying the theme picker uses (offer only keys
  `realiseTheme` accepts).
- A run is the pattern **repeated**: the length unit is times-through,
  like a drill's cycles. Endless/horizon behaves as drills do.
- A "few keys" is the existing key tour: `keySet` walks the chosen keys
  across repetitions, machinery already in `generate.ts`.
- Storage is the phone's, beside My Music, under the v3 ruling that the
  phone owns the library. The HTTP-server plan for managing files from a
  laptop applies to these files as to any other.

## The builder: rhythm first, then pitches

> **The player's own framing of the payoff, worth keeping verbatim
> (2026-09-01):** *"when presented with a nasty 4-bar section of
> syncopated music, they might just place the rhythm right then and
> there, drag the notes to their right spot and off they go with a
> practice tool."* That is this plan's use case sharpened to a moment:
> transcription at the music stand, minutes before practising it. And
> one genuinely new thread grew from it: *"handy too if they could
> orchestrate some other melodic part against it, because that's what
> they'll be dealing with in real life"* — a SECOND part sounding
> against the player's own. Not this plan's scope, and not lost either:
> it is roadmap **Phase 6 (Orchestration)** arriving from a new
> direction, and the day authored cells meet Phase 6, an authored cell
> with a companion line is the join.

> **Built 2026-09-03: the whole builder, rhythm and pitch.** The
> rhythm mode's tool now writes cells — a grid for the rhythm, an *Add
> notes* mode that puts one note per attack on the engraved stave, and a
> drag in whole scale steps. Cells live under their patterns in the
> Pattern tab (`rhythm-plan.md` has the structure and the rulings), are
> stored as degrees so they play in any key, and carry a snapshot of
> their parent's bars. What this plan still owns: cells inside COURSES,
> by value, and the seam to Phase 6 noted above.
>
> **The rhythm half exists (2026-09-01).** The rhythm mode's annotation
> tool — a step grid engraved live onto a stave on one written C, per
> `rhythm-plan.md`'s redesigned tool section — is this builder's first
> phase built standalone. The cell designer's remaining work is the
> vertical axis: pitch handles on that same stave, dragged in diatonic
> steps. The section below predates the grid and reads accordingly.

The player's design, and the reason a MuseScore is not needed:

> If that builder was able to allow the user to select from a defined
> rhythm, then they could simply place their notes on top of the rhythm
> guide on the stave.

This decomposes the hard problem. Notation editing is hard because pitch
and duration are entangled; split them and both halves are easy:

1. **Choose a time signature, then a rhythm** for each bar from a named
   list — the bar becomes a fixed row of slots that already adds up, so a
   malformed bar is unreachable rather than validated away.
2. **Place a pitch on each slot** — on the stave, up/down by step, with an
   accidental toggle for the `alter`. A slot may be made a rest. Ties join
   equal-pitch neighbours.

The rhythm list is the seam to `rhythm-plan.md`'s pattern library
(ratified, unscheduled): the builder needs only a small named set per
metre to start, and grows when that plan is built.

**Audition is a button, not a feature**: `exerciseFromTheme` plus the
existing playback path. The ear rule is satisfied by construction — the
author hears their own pattern before saving it, and nothing here ships
Anthropic-authored music at all.

## Courses

- A new `LevelKind` (working name `cells`) joins the matrix. Meaningful
  axes: `tempo`, `fifths` (the pattern is key-independent, so a key axis
  is meaningful — unlike themes), the support five, and a length unit of
  times-through. `range`/`span`/`register`/`metre`/`intervals` refused.
- The level names which of the course's embedded cells it drills; the
  course document carries the cells themselves, by value (ruling 4). The
  course editor gains the same builder, or imports a cell from the
  player's library **by copying it in** — never by reference.
- The editor's live verdict checks each cell realises on the course's
  declared instruments, exactly as tune steps are checked.

## Build order

1. **Schema and player**: the pattern type (a constrained Theme), the
   paid-build library store, free-play pick-and-repeat in one key. No
   builder yet — one hand-written pattern proves the loop.
2. **The builder**: rhythm-first, in the paid app. This is the big piece.
3. **Key tour** across repetitions; feel later, with `rhythm-plan.md`.
4. **Courses**: the `cells` kind, embedding, editor verdicts.

Nothing ships to a player unheard; here that rule is enforced by the
feature's own shape.

## Open

- The **name**, given `Cell` already means the composer's bar.
- Whether an authored pattern may **modulate** (ThemeNote supports key
  changes; the builder almost certainly should not, at first).
- Whether the builder lives on the phone only, or in the desktop course
  editor too. The use case is the phone; the course editor can start with
  import-by-copy.
