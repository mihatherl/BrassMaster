# Courses — authored levels, automated variation, honest scores

Drafted 2026-08-24 from the player's design input; **ratified 2026-08-26**,
with every open question answered — the answers are folded in below, each
dated.
Revised the same day, after he corrected the first draft: *"surely there needs
to be something within a level"*. It answers the gap named that morning —
Phase 1's machinery is built and the pedagogy is not, because a beginner who
chooses Structured Learning meets *a parameter space, not a first lesson*.

Read `roadmap.md` § 1 (teacher mode) and § 5.2 (the served page) first. This
document rules what a course **is**; it does not reopen what the product is.

## The ruling, in three parts

1. **A course is an authored, ordered list of levels, and the author's order is
   the progression.** One level differs from the next because the author says
   so — "based on nothing but their own intuition about what is easy and what
   is harder" — not because anything computed it.
2. **Inside a level, the machine varies the work and judges when to widen it.**
   A level is not one run; it is a small space — tempo, which thirds, up only
   or up and down — and the app walks the player through it, mixing things up
   when they are holding it. This is where automation belongs, and the only
   place it belongs.
3. **Between levels, the player decides, and the app's job is to show them
   their scores honestly.** *"All the player needs to do is be honest with
   themselves."* Which puts an obligation on the app it does not currently
   meet — see § *The scores are not yet honest*.

**The division, in one line:** the author owns *what is being practised and in
what order*; the machine owns *how it is drilled while you are there*.

## Why this way round

**The missing thing was never mechanism.** The skill model, the ladder, goals,
sessions and the progress screen were all built on 19–20 August, and none of
them tells a learner what to play on a Tuesday. An authored course does,
immediately, with no inference in it.

**But an authored list alone is too coarse to practise against.** "Exploring
3rds in C major" is not one exercise, and a course that presented it as one
would either bore a player who has it or strand one who does not. The
variation inside it — slower or faster, C to E or G to B, up only or up and
back — is exactly the kind of judgement a machine makes well and an author
cannot make in advance for a stranger.

**And the rules engine was built for precisely this.** `exercise/ladder.ts`
already argues the two rules this needs, and both survive intact, aimed one
level lower than they were written for:

- **Hold the parameters and vary the material.** Every run at a point in the
  level's space is music the player has not seen, so it is still sight-reading
  while the difficulty stays put. A fixed-repertoire app cannot offer this.
- **Exactly one thing moves.** "If one thing changed and accuracy dropped, the
  cause is known; change three and the result is uninterpretable." That was
  written about promoting between levels; it is a better rule *inside* one.

**One format for bundled and user courses.** The courses that ship are authored
in the same tool users get, which makes shipping a curriculum a data change
rather than a release, and gives the editor the hardest test it could have —
if it cannot express "Mastery of Common Keys", it is not finished.

**§ 1.3's *whose standard?* is answered: the author's.** § 1.2's *mastery
criterion* is **not** dissolved, as the first draft of this document wrongly
claimed. It moves — from "when may the player leave this level" to "when may
the machine widen this level" — and it is still open. See below.

## What a course is

    Course
      id, name, blurb
      schemaVersion            forward-tolerant; unknown fields are ignored
      levels[]                 ordered; the order is the progression

    Level
      id, name                 what the player is told they are on
      note?                    the author's words: why this level, what to watch
      base                     the run, fully specified — the fields below.
                               **A discriminated shape per material, with key,
                               key set, register and range OPTIONAL** — ruled
                               2026-08-26, because rhythm drills
                               (`rhythm-plan.md`) are a material with none of
                               them, and a shared document format cannot be
                               retrofitted once files exist
      axes[]                   what the machine may vary while the player is here
      advance?                 when it widens; the author may override the default

    Position (per player, per course)
      levelId, axis values, and the record of how the recent runs went

### The base run — all of it already exists

| A level's base says | Today's generator option |
|---|---|
| which material | `kind` — drills · phrases · themes |
| which drill | `drillId` — major / harmonic minor / melodic minor scale, tonic / subdominant / dominant arpeggio |
| which key, and any it moves through | `fifths`, `keySet` |
| how far a pattern reaches | the difficulty's `patterns.spanSemitones` — a fifth, an octave, two |
| how hard the reading is | `difficulty` — range, max interval, accidentals, rests, ties, rhythm pool |
| how long | in the material's own unit: `bars`, `cycles`, `themeCount` |
| where in the horn | `register` |
| metre and tempo | `metre`, `tempo` |
| **a named tune in a named key** | `selection: 'defined'` + `themeSteps: [{ id, fifths }]` |
| *how often a given interval appears* | **does not exist — see below** |

A theme step **cannot name a key the tune does not fit**: the defined picker
built on 23 August offers, per tune, only the keys whose placement holds it.
That property must survive into the editor.

### The axes — what varies inside a level

An axis is a named dimension with an ordered set of values, and the author
declares which are in play. The machine holds all but one and moves that one.

    tempo        an ordered band — 72, 80, 88, 96 …   (from ladder.ts's TempoBand)
    span         which degrees the interval is taken from: C–E only, then
                 adding G–B, then any degree of the scale
    direction    ascending only, then ascending and descending
    length       4 bars, then 8, then 16
    cells        an ordered list of the course's own cells — Cell A, then B,
                 then C — for a flourish an author teaches that no interval
                 setting can describe (ruled 2026-08-26)
    rhythm       an ordered list of named rhythm patterns, the same notes
                 walked through progressively harder rhythms — the seam to
                 `rhythm-plan.md`'s pattern library (ruled 2026-08-26)

**Tempo moves first, and the widening axes after it**, which is the order
`ladder.ts` already argues: get it fluent at speed before making the notes
harder, then drop the speed and climb again.

**The author declares the axes; the machine walks them.** That keeps faith with
both halves of the ruling — the author's intuition decides *what a harder
version of this level looks like*, and the app decides *when the player is
ready for it*. An author who declares no axes gets a level that is one run,
repeated, which is a legitimate thing to want.

### Worked example — "Mastery of Common Keys", opening levels

    1  "F major, the shape"    drills · major-scale · F · one octave · 4 cycles
                               axes: tempo 66→96
    2  "F major, the chord"    drills · tonic-arpeggio · F · one octave · 8 cycles
                               axes: tempo 66→96
    3  "Something in F"        themes · defined · [{ id: <tune>, fifths: -1 }]
                               axes: tempo 60→84
    4  "B flat, the shape"     drills · major-scale · B♭ · one octave · 4 cycles
    …

### Worked example — "Exploring 3rds in C major", one level

    base   phrases · C major · 8 bars · Easy · 72
           intervals: thirds heavily weighted
    axes   tempo      72, 80, 88, 96
           span       degrees 1–3 → 1–3 and 5–7 → any degree
           direction  ascending → ascending and descending

Four tempi × three spans × two directions is twenty-four runs' worth of
material inside one authored line, none of it repeated music.

## The two generator changes

Neither exists today, and `ladder.ts`'s own rule governs the order: **declare
nothing on a level that the generator does not honour**, because *a field the
app quietly ignores is worse than an absent one*.

**1. A weighted interval pool.** The generator has `maxInterval`, a *ceiling*
on leaps, and `noteWeights`, a per-pitch bias — nothing that says *favour
thirds*. The shape is already in the file: `rhythms: RhythmWeight[]` is a
weighted pool of durations, and an interval pool is the same idea one axis
over. `generate.ts` already carries a note asking for this: *"a question of how
far a line may leap and how often, which belongs to difficulty rather than to a
mode of its own — and the player has asked for that to be reconsidered against
what is plausible on a given instrument."*

**2. Constraining which degrees an interval is taken from** — "C to E or G to
B" — which is finer than favouring thirds at all, and is what the `span` axis
above needs.

**Both are generated content, ruled 2026-08-24.** An interval study is *not* a
new family of drills. `DRILLS` stays what it is — the six scales and arpeggios
— and everything else a level asks for is written by the generator, which keeps
the product's core job intact: every run of a level is music the player has not
seen. A fixed interval pattern, practised until it is memorised, would be
technical practice wearing a reading exercise's clothes.

## Bespoke drills come in as MusicXML

**Ruled 2026-08-24.** If an author wants a drill that is not one of the six
built-in scales and arpeggios, they write it themselves and **import it into
the course as MusicXML**. The app gains no drill editor and no second pattern
language: it already has a parser, and notation software is better at writing
notation than anything that could be built here.

**And imported material declares what it is: a theme or a cell** (ruled
2026-08-26). A *theme* is played as written — the literal drill. A *cell* is
one bar handed to the composer's vocabulary: the author writes it in notation
software in some key, declares that key on import, and the app converts the
concrete pitches to diatonic steps from an anchor — after which it is
key-independent like every built-in cell, placeable anywhere, and usable as a
`cells` axis. The conversion is mechanical (pitch minus key, expressed in
scale steps); what it cannot survive is chromaticism outside the declared
key, which the import should refuse loudly rather than approximate.

**That material belongs to the course, not to My Music.** The two stores stay
separate, and the reasons are worth writing down before someone economises them
together:

- **A course must not break because a player tidied their library.** If course
  material lived in My Music, deleting a piece would silently gut a level.
- **My Music is the player's own music** — the v3 ruling puts the library in
  their pocket and makes them its owner. A course's exercises are the
  *author's*, arrive with the course and leave with it.
- **A course must travel as one thing.** A teacher emailing a course cannot
  email a JSON file and separately ask for four MusicXML attachments to be
  filed in the right place.

**So a course document is a container, not a flat file.** There is precedent
twice over: `.mxl` is itself a zip, `src/import/container.ts` already inflates
one, and the overlay bundle already travels as a single file carrying score
plus page photographs plus bar zones.

**A level built on imported material is deliberately literal.** Fixed music
cannot vary, so *hold the parameters and vary the material* does not apply:
the axes reduce to tempo, and every run is the same notes. That is the one
place a course stops being sight-reading, it is exactly what a bespoke drill is
*for*, and it should be named rather than discovered.

### Two build-flag consequences, and neither is cosmetic

**The parser is behind the wrong flag for this.** `__HAS_MY_MUSIC__` guards the
whole of `src/import/` — "some 2,900 lines of parser it has no way to reach",
dropped from the free bundle by Rollup and checked by `npm run check:web`. If a
course may carry MusicXML, **teacher mode now depends on the parser**, and
`vite.config.ts` is explicit that one flag per paid feature exists precisely
because "either could move across the line on its own". A hidden dependency
between two flags defeats that.

The fix is small and in the spirit of the existing design: give the parser its
own capability flag — `__HAS_IMPORT__` — set true when either feature is in the
build. One flag per paid *feature* is preserved; the shared *capability*
becomes explicit instead of accidental.

**And `Material` excludes `'imported'`.** `storage/settings.ts` defines
`Material = Exclude<ExerciseKind, 'imported'>`, and `switchMaterial` ignores
`'imported'` outright — imported music is deliberately not one of the
choosable materials. A level naming course material is therefore a genuinely
new case rather than an existing one with a different id, and that is where a
quiet bug would otherwise live.

**Bundled course material must be the author's own or public domain.** A course
that ships in the app ships its notation with it. The standing rule applies
unchanged: nothing musical ships unheard, and here nothing ships unowned
either.

### Bars, not whole pieces — and it is nearly free

**Ruled 2026-08-24: a level may name the bars it wants.** The mechanism already
exists and is already user-facing. `src/import/part.ts` carries `ImportedBar`
with the bar's number *as printed*, written for exactly this reason —

> Choosing bars needs the numbers on the player's own page — "from 17 to 24"
> has to mean the bars printed 17 and 24, not the seventeenth and twenty-fourth
> things that happen to be played.

— and `ScorePicker` already lets a player select `BarSpan[]`, plural, and
practise them. A level naming spans stores the same structure and hands it down
the same path.

**Which makes span a widening axis, at no cost.** Bars 1–8, then 1–16, then the
whole study, is a progression an author can declare and the machine can walk,
and unlike the interval axes it needs nothing from the generator at all. It is
the second axis to build after tempo.

## Author-written cells — the composer's vocabulary, extended

**Asked 2026-08-24: can an author add their own cells, independent of key?**
Yes, and the design already assumes it. Three properties make this the cheapest
powerful feature in this document:

**Cells are already key-independent.** `exercise/cells.ts` writes a cell in
*diatonic steps from an anchor* rather than in degrees, precisely so "a figure
that climbs a third is the same figure on the tonic and on the dominant, and a
sequence is the same cell a step along". An authored flourish is written once
and the composer places it anywhere, in any key, at any degree.

**The seam is already cut.** `selectCells(cells, metre, level, role)` takes the
cell list as an argument; `cellsFor` is nothing but the wrapper that passes the
built-in corpus. Handing the composer a course's own cells alongside — or
instead of — the built-ins is a parameter, not a refactor.

**Authoring is a short string.** `parseCell` reads `<step><duration>` tokens:
`0q` the anchor as a crotchet, `2e` two steps above as a quaver, `-1h` a step
below as a minim, `r` a rest, `~` a tie, `t`/`T` triplets. A cell is one bar.
That is a text field in the editor, not a notation editor.

**And the ear rule is already in the type system.** `CellStatus` is
`'accepted' | 'candidate'`, and *candidate cells never reach a player* —
`selectCells` filters them out. An authored cell arrives as a candidate and
becomes accepted when its author has heard it, which is the standing rule
enforced by the corpus rather than by discipline. `cellAsTheme(cell, anchor)`
already renders one as a playable theme, so the editor's audition button is a
call to a function that exists.

### What a course's cell set must satisfy

The constraints are real and the editor must check them at authoring time,
because the failure is otherwise silent — a level that cannot compose anything:

- **Metre is matched exactly**, not converted. A cell is `[4, 4]` or `[3, 4]`,
  and a set used by a 3/4 level needs 3/4 cells.
- **Roles must be complete.** Cells are `open`, `move` or `close`, and a phrase
  needs all three. A set of six lovely flourishes that are all `move` cells
  cannot start or finish a phrase, so a level restricted to it composes
  nothing.
- **Level gates apply.** A level uses cells at or below its own, so a cell
  written `hard` is invisible to an `easy` level — which is a feature, and a
  confusing one if the editor does not say so.

**So a level says which cells it draws on**: the built-ins, the course's own,
or both. "Both" is the safe default and the only one that cannot fail to
compose; "the course's own only" is how a level teaches a specific idiom, and
the editor must refuse to save one whose set is incomplete.

**Ids matter more once cells are shared.** `cells.ts` already rules *change the
notes, change the id*, because a review verdict is recorded against an id. A
course that travels between people makes that rule load-bearing rather than
tidy.

## The join is written into the music — revised again 2026-08-27, after playing the countdown — **and built the same day**

Built: `continueFrom` in `rekey.ts` (the "own design" that file promised
itself — different music joining from a bar line, the paper changing length),
`Session.courseStep` (tempo, material, label and the revert in one call, on
`keyChangeBeat`'s existing end-of-following-bar lead),
`Transport.changeTempoAt`, and `CoursePlayControls` rewritten: nothing pauses,
nothing restarts, the crossing commits. Mutation-tested: committing at
schedule time instead of at the crossing fails two tests. Verified on glass —
the banner beside running music, and the position following the playhead over
the join.

The pause-and-countdown below was built, played, and rejected the same day:
*"it just stops mid note… sort of freezes and then resets into another page."*
The player's replacement, and the machinery it stands on:

- **A step is written into the paper, not announced over it.** The score gains
  a label at the join — the position, or the level's name — exactly as a
  medley names its next tune (`LabelEvent` is that mechanism), and the tempo
  change is scheduled at the same beat. The player reads it coming and keeps
  playing. Nothing freezes; nothing resets.
- **Every step lands at the end of the following bar** — finish the bar in
  hand, one full bar of preparation, join at the bar line. Manual presses too,
  by the player's ruling: *"they should [go in-stream], but not
  instantaneous — placed at the end of the following bar, to give some prep
  time."* This supersedes restart-with-count-in.
- **Stay here rewrites the future back** — *"revert to a continuation of what
  they are already playing"* — a second splice, removing the label. The veto
  stays transient as ruled.
- **The evidence resets at every step, unless the author says otherwise**
  (`carryEvidence`, ruled 2026-08-28 after the player found the fault it
  fixes: carried old bars offered him a new step every two bars). Reset is
  the default because a step usually changes what is being practised; an
  author whose steps are trivial — a nudge of tempo — may carry, and one
  whose steps bring a new flourish through a custom cell must not.
- **Position commits when the playhead crosses the join**, which is when the
  evidence clears: before the join a cancel restores everything, because
  nothing has happened yet.
- **The machinery is the key dial's.** `rekey.ts` already rewrites a running
  exercise from a bar line ahead — one piece of paper, spliced in place, the
  confirmations resized — and its own comment names the generalisation this
  needs: material change "wants its own design". Tempo-only steps are cheaper
  still: `changeTempo` already schedules at a future beat; the material never
  changes.

### The countdown version, built and superseded the same day (kept for the record)

Built: `ui/CoursePlayControls.tsx` (paid, reached through a dynamic import
behind the literal, like `ImportScreen`), the `advance` and `pinned` document
fields, the pause-countdown-resume gap on the session's own pause machinery,
and the tempo dial stepping aside. The veto is module-scope — passages rebuild
the component, storage would make it permanent, and the ruling says it is
neither. The whole-window rule and the never-moves rule are mutation-tested.
Verified on glass: 1.1 on the play surface, Forward mid-play lands on 1.2 with
a fresh count-in. Pins currently cover metronome and conductor — the first
increment of "all of the gate's options"; the reader ignores pins it does not
yet honour, so documents may already carry more.

The built screen taught what no draft could: **going home to step is a
navigation tax on the thing a course does most often.** The player's verdict,
and the model that replaces the ratified one below it:

- **Stepping lives on the play screen.** Forward and back are always there
  during a course run; a press restarts immediately at the new step, with a
  bar's count-in. The partial passage is discarded, not filed — the same
  contract as the key dial's mid-run rebuild, and the store stays clean.
- **The machine may move the player again — but only after announcing it.**
  The author configures the rule: after **X bars played** and **Y% over the
  last Z bars** (the window `SCORE_WINDOW_BARS` machinery already computes),
  the music pauses at a bar end and a banner counts down — "Moving to 1.4 in
  3…2…1" — beside a **Stay here** button. The countdown lives in a gap the
  app makes, because a player mid-phrase has both hands on the valves; a veto
  nobody can reach is not a veto.
- **Stay here is transient.** It disarms auto-progression at that step for
  the sitting, and nothing more — "it isn't expensive for the user to reset
  it." Arriving at any step, by any means, re-arms the rule.
- **The tempo dial leaves the play screen for course runs** — the course owns
  the tempo, it is the axis. This supersedes the designed-but-unwired
  "one-run tempo override at the gate" (roadmap § 1): the ever-present back
  button does that job in the course's own terms.
- **The author may pin the Ready gate's options** — metronome, conductor,
  playback, reading mode — per course or per level. Pinned controls show
  disabled rather than hidden: a player who cannot find the switch thinks the
  app is broken; one who sees it locked knows the course chose. This is the
  same mechanism `rhythm-plan.md`'s progression stages need (voice on, then
  off), and there is deliberately one of it.

The home screen's course panel keeps the suggestion bar as a between-sittings
summary; the countdown is its in-play voice.

## When the machine widens — the ratified model this revises (kept for the reasoning)

**Ruled 2026-08-26, and it is stronger than the draft's "suggestion, not a
gate": the machine never moves the player at all.** Position in a course is a
decimal — level 3, step 2, shown as **3.2** — with **forward and back buttons
that are the player's**, in both directions. Narrowing is allowed for the
same reason everything else is: "we're leaving it up to the player to decide
on where they want to be." The widening rule becomes a **suggestion bar** —
the machine's opinion of readiness, visible beside the controls, moving
nothing.

This resolves the draft's worry about oscillation by dissolving it: a player
who steps back has decided to, which is the system working. What remains of
the old criterion:

- **The suggestion is of the form "accuracy at or above X% across N runs at
  this step"**, chosen so a bad day does not suggest retreat and a lucky run
  does not urge haste.
- **The author may override it per level.** `Level.mastery` already exists in
  `ladder.ts` for exactly this.
- **It must degrade honestly when there is no data**: two runs in, the bar
  shows nothing rather than a guess.

**Do not tune the numbers before there is practice data.** They are constants
with a named home, and the first real course played through by a real player is
what sets them.

## The scores are not yet honest

**Measured 2026-08-24, and it is a fault in the shipping app, not only a
question for courses.** The player reported that loading a piece and letting it
run without touching the keys yields a low score that misrepresents what he can
do. It is worse than a wrong number on a screen:

- Every note the run passes is judged. Unplayed notes come back `missed`, which
  counts in `total` and in `byNote.attempts` (`engine/judge.ts`, `summarise`).
- So accuracy is 0, the per-note store gains attempts with no successes, the
  skill tally gains attempts against every label in the run, and — in the paid
  build — a 0% run is filed in the session history.
- `storage/stats.ts` then reads those attempts into `noteWeights`, which scales
  a poorly-played note's likelihood **up to 4×**. *"Favour notes I get wrong"*
  ships default-on.

**One listen-through therefore teaches the app that the player cannot play any
of those notes, and biases the next several sessions toward them.**

**The revision above raises the stakes on this.** A polluted score no longer
merely misleads the player — it now drives the automation, holding them at a
point in a level they have already mastered, or worse, reading a listen-through
as evidence they are struggling. **The honesty fix is a precondition for the
widening rule, not a tidy-up beside it.**

**The fix, in two parts.** The codebase already reasons this way twice — a note
the player could never have answered is *passed over rather than judged*, and
the screen going dark ends the run because *nothing is judged unseen*. The same
principle, one level up:

1. **A run with no player input at all is not an attempt.** Record nothing —
   not stats, not skills, not the session, and nothing the widening rule reads.
   Unambiguous, needs no heuristic, and catches exactly the reported case.
2. **An explicit "this wasn't an attempt" on the results screen**, for the
   partial cases automation should not guess at: stopped half way, demonstrating
   to someone, playing the phone through a speaker. This is the honesty the
   ruling asks of the player, given a button to be honest *with*.

Deliberately **not** attempted: inferring intent from a low score. A genuinely
bad run and a run nobody played look identical to arithmetic, and guessing
would eventually discard the very runs a struggling learner most needs counted.

## What this supersedes

**Re-aimed rather than deleted.** `exercise/ladder.ts` is not removed: its
tempo bands, its one-axis-at-a-time rule, its mastery shape and its ordering
argument all move from *between levels* to *within a level*. What goes is the
assumption that the ladder's own four difficulties **are** the progression —
the author's list is, and the difficulties become one thing a level may name.

**Superseded — delete deliberately, with the reasoning left at the site:**

- The derived `BRASS_MASTER` ladder as *the* course, and `LADDERS` as a
  hard-coded list. Courses are data loaded from documents.
- `storage/ladder.ts`'s position-in-a-ladder, replaced by position-in-a-course,
  which must also carry the axis values.
- Roadmap § 1.3's *whose standard?*

**Standing:**

- `ladder.ts`'s "why ladders are data" reasoning is vindicated — it predicted a
  player-defined ladder should be "a question about a screen rather than about
  this file", and this is that screen.
- `storage/skills.ts` and `storage/stats.ts` keep recording, and now feed the
  widening rule as well as the player's own judgement — which is why the
  honesty fix comes first.
- `storage/sessions.ts` and the progress screen.
- Teacher mode stays paid, behind `__HAS_TEACHER__`, proven by
  `npm run check:web`.

## Where it runs

Unchanged from roadmap § 5.2, and the division falls out of the same argument:

| On the phone | On the laptop, on the served page |
|---|---|
| See the course, see the level, play it | Author, reorder, rename, set keys and tempi |
| Read the author's note; see where you are in the level | Declare the axes and their values |
| See your scores; decide to move on | Import and export a course file |

**Before any server exists, a course is a file.** Import and export of a course
document is the whole *"modifiable by any user"* story until Phase 5 lands, and
it is what lets a teacher hand a student a course by email. It costs a file
picker and a download, both of which My Music already does.

## Phasing, cheapest first

1. ~~The honesty fix.~~ — **built 2026-08-24.** `wasAttempted` in
   `engine/judge.ts` is the rule; `App` defers every write until the player
   leaves the results screen, because `mergeSessionStats` and
   `mergeSessionSkills` fold a run into a decayed aggregate and no inverse
   exists — recording and then undoing is unimplementable. The results screen
   states plainly that an unplayed run is not counted, and offers *"Don't count
   this run"* on one that was played. Verified on glass, all three cases: a
   listen-through leaves the stores empty, a played run writes stats, skills
   and sessions, and a disowned one writes nothing.
2. ~~The course document and one bundled course.~~ — **built 2026-08-26.**
   `exercise/course.ts` replaces the ladder: a `Course` is read from a plain
   document by `readCourse` (forward-tolerant, refusals whole and loud, the
   tempo ceiling snapped onto the grid), and the bundled *Common Keys* course
   goes through the same reader a user's file will. Position is the ratified
   decimal ("3.2"), the buttons are the player's both ways, evidence clears on
   a step, and `noteRun` **cannot** move anyone — mutation-tested at the rules
   and at the screen. The bundle fingerprint moved with the storage key
   (`brass-trainer:course:`), deliberately. **The bundled content is
   scaffolding from this plan's worked example and says so in the document —
   the curriculum is the author's, and editing `courses/common-keys.ts` is
   authorship, not programming.** Verified on glass: step, persist, and a run
   started from the course reaching the gate.
3. **Author-written cells.** The seam exists (`selectCells` takes the list),
   the notation exists (`parseCell`), the audition exists (`cellAsTheme`) and
   the ear rule exists (`candidate`). Mostly a cell set on the document, the
   completeness check, and passing a different list. **Cheapest large win here,
   and it needs no editor** — cells can be authored in the document by hand
   before the served page exists.
4. **Course material as MusicXML, with bar spans** — the container format, the
   course-owned store, `__HAS_IMPORT__`, and a level that may name an imported
   piece and its `BarSpan[]`. The parser and the span structure both already
   exist, so most of this is plumbing. Span then becomes the second axis.
5. **The interval pool**, then the degree constraint, then the axes that need
   them. This is what makes "Exploring 3rds" expressible, and it is the only
   item here that is real generator work.
6. ~~The editor on the served page, with Phase 5.~~ — **built early,
   2026-08-28, on the player's insistence** — the file route was offered and
   refused: *"I just can't see myself hand-editing the JSON and then debugging
   it when I try to import"* — with the rework risk of an unsettled schema
   accepted and recorded. `src/editor/main.tsx`, its own Vite entry in the
   paid build only, served today by the tailnet copy at `/editor.html` and by
   Phase 5's phone server when it exists — the page does not change, only who
   serves it. **Validation is `readCourse` itself, live**, so a file that
   reads clean in the editor imports clean on the phone; the practice screen
   gained the other half — import (refusals showing the reader's sentence
   verbatim), a course picker, export, and delete for imported courses, with
   documents stored verbatim so forward-tolerant fields survive the round
   trip. The cell-set completeness check still lands here when cells do.
   **The phone-hosted server remains Phase 5, unmoved.**

Phase 2 is the one that puts a first lesson in front of a beginner. It is also
the one that will teach us whether the widening rule feels right, which is why
it deliberately ships with one axis rather than four.

## Ratified 2026-08-26 — the open questions, answered

- **A course overrides the measured range.** If a player cannot reach a
  course's material, that is theirs to see and judge — "proceed with it, or
  work on their range first". The app's duty is honesty, not protection: say
  plainly that the course exceeds the measured range, and change nothing.
  Free play keeps respecting the range (roadmap § 2.5).
- **Bar spans stand as drafted**: a course may nominate bars *x* to *y* of an
  imported piece.
- **"Done" for a level is the player stepping past it** — the same call they
  make for every increment within it. No tick, no gate, no ceremony.
- **Narrowing is allowed** — folded into the stepping ruling above.
- **`schemaVersion` confirmed**: forward-tolerant reading, unknown fields
  ignored, cheap now and impossible to retrofit.
- **The free build gets a taste.** The course *builder* and import ship only
  in the paid app — but **one or two authored courses ship in the free app**:
  one for a child just starting, one for a late-stage beginner "like myself",
  to whet the appetite for the rest. Part of the free app's job is to feed
  the paid one. **Consequences for phase 2, named now**: course *playback*
  crosses the build line while authoring stays paid, so the flag cannot be
  `__HAS_TEACHER__` alone — the split needs its own flag and a decision
  about position storage, because `check:web` currently fails the free build
  on the `brass-trainer:ladder:` and `brass-trainer:sessions:` keys. The
  tripwires move deliberately or the feature cannot ship; they must not be
  loosened in passing. Roadmap § 3's table is updated to match.
- **Nothing ships unheard** — confirmed; satisfied by construction while the
  player authors the bundled courses, including the free ones.

## The key a level does not name — ruled and built 2026-08-29, from authoring

The optional-key ruling ("absent means the player's own key stands") was
correct and unreachable. Found by the author writing a real course: **the key
grid lives on the free-play home screen**, so a course level that named no key
took whatever was last set in the *other* mode, changeable only by leaving the
course. The author could not tell what they were specifying and the player was
never told what they were in — and a level that *did* name a key never said so
either.

- **The Ready gate owns the key on a course run**, and says who chose it. It
  earns its place by the gate's own admission rule — *changed often, and
  changes the run about to start* — because on a course that leaves the key
  open it is touched every level.
- **A question goes on the face; a statement goes in the accordion** (the
  player, revising the first build the same day: *"this should be prominent at
  the gate… in the same format as is on the setting screen"*). Where the author
  named the key it is a section, showing it, locked, with "Set by the course" —
  the pinned switches' vocabulary and their recorded reason: *a player who
  cannot find the control thinks the app is broken; one who sees it locked
  knows the course chose*. Where the author left it open it is **uncollapsed on
  the face, under the tempo**, in the home screen's own three-by-five grid. A
  question the course is asking must not be behind an accordion the player has
  to know to open. `KeyGrid` is shared by both screens so they cannot drift
  into looking different; only the rules differ, the home screen building an
  ordered set with a cap and the gate answering with exactly one key.
- **One key, never a set.** "The player's own key" is singular. Inheriting free
  play's `keySet` had a level touring several keys and changing key mid-run
  because of a setting made on another screen.
- **The answer has its own home**, `settings.courseFifths`, and does not write
  through to `keySet`. Those are two different statements: free play's set is a
  *tour*. Writing through would have flattened a player's four-key tour to one
  every time they answered a course level — a setting destroyed as a side effect
  of an unrelated screen. `materials` already set the precedent that a context
  remembers its own choices.
- **Answering regenerates the music.** A key recorded and not honoured is this
  plan's own forbidden shape — *a field the app quietly ignores is worse than an
  absent one*: the player would pick B flat, be told B flat, and read E flat.
  The one narrow exception to "never rebuild a course run's exercise", and it is
  the course's own instruction being carried out.
- **The remembered key carries from a major level to a minor one untranslated**,
  because the app stores a **signature** and not a tonic: `fifths: 0` is C major
  over a major drill and A minor over a minor one. The player's choice survives
  with the reading difficulty unchanged, and only the label moves. Ruled over
  carrying the tonic (C major → C minor), which would have jumped the signature
  three flats at a join that was only meant to change the mode.

`keyNameFor` moved to `domain/keys.ts` so the gate and the home screen cannot
name the same signature differently. `courseKeyOf`, `isMinorRun` and
`keyAnswerChanged` live in `ui/course-run.ts` — the seam that names no course
module, so `App` may import them in both builds. All three mutation-tested.

## Still open, and honestly so

- **The suggestion bar's thresholds** — constants with a named home, tuned
  only after a real course has been played through.
- **Cell import's chromatic edge** — what exactly the importer refuses, and
  with what message, when a would-be cell steps outside its declared key.
- **The free-build flag split** — ruled above, designed in phase 2.
