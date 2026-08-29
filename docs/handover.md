# Handover — 2026-08-28, after the week the course became real

> **Patched 2026-08-29, evening (v2.61.0): the axes build landed.** The whole
> of "What is next" below was built in one release, as ruled — schema,
> trichotomy, per-segment rules, interval pool, mid-run support switching,
> the timeline editor. See *The axes build* section further down for what a
> fresh session needs; the original text is kept beneath it for the record.

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator (its next hour is annotation, and
`train/annotate_bars.py` is the tool). The third is `../container-spike/`,
run and closed; `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-08-23-play.md` (the night the app
reached Google Play), patched through this week and now superseded. This one
covers 2026-08-24 to 28: seven releases, v2.48.0 through v2.54.0.

## What to read, and what to leave alone

| | When |
|---|---|
| `handover.md` — this file | Now, all of it |
| **`roadmap.md`** | Now, and before proposing any feature |
| `../CLAUDE.md` | Now. The seam, and which remote is which |
| **`level-axes-plan.md`** | **Now, if you are picking up the next task** — ratified 2026-08-29, unbuilt, and the whole of what comes next |
| **`course-plan.md`** | Before any pedagogy or course work — **ratified 2026-08-26**, revised twice since by playing, every revision dated in place |
| `rhythm-plan.md` | Before any rhythm-drills work — ratified, deliberately unscheduled, and it binds the course schema (optional keys) |
| `device-testing.md` | Before any session touching the shell or a phone |
| `../container-spike/FINDINGS.md` | Before any Phase 2/5 work |
| `v2-design.md` | Never end to end. Grep it for the noun you are touching |
| `difficulty-model-plan.md`, `app-store-plan.md`, `v3-library-plan.md`, `musicxml-import-plan.md`, `tempo-map-plan.md` | As their subjects come up |

## Where this stands

**v2.54.0, pushed, tagged, deployed and green** — and since then, unpushed
on this machine, the work below: **1,550 tests across 81 files**.
The gate before any push is `npm test && npm run build && npm run lint`,
plus `npm run check:web` and `npm run check:channel` when anything touches
the build split. **Gate order matters now**: a plain `build` empties
`dist/`, so run `build` → `build:web` → the checks → **`build:dev` last**,
which restores the tailnet copy on 4173 (`vite preview` serves whatever sits
in `dist/`, and this has bitten four sessions).

**The site has two halves**: a landing page at `/` — in English, German,
Dutch and French (`/de/` `/nl/` `/fr/`) — and the app at `/app/`. Only the
*web* build assembles this (`tools/site.mjs`, which explains everything,
including why `site/CNAME` failing to arrive fails the build and why
`site/sw.js` is a tombstone that must stay). **The landing copy and its packs
move together**: edit `site/index.html` and `site/translations.mjs` as a
pair, or the assembler refuses the build naming the language and the string.
`feedback@brassmaster.net` forwards via ImprovMX (MX + SPF at GoDaddy) to the
player's inbox, tested end to end.

**Courses are the product's spine now, and they are documents.**
`exercise/course.ts` replaced the ladder on the 26th and was reshaped twice by
the player playing it — the full arc is in `course-plan.md`, each revision
dated. As built:

- `readCourse` reads a plain document, forward-tolerant (unknown fields
  ignored), refusing loudly what it cannot trust. The bundled *Common Keys*
  course (`exercise/courses/common-keys.ts`, typed `unknown`) goes through
  the same reader a user's file does. **Its content is scaffolding — the
  curriculum is the player's to author, and editing that file is authorship.**
- **A step is written into the music.** `continueFrom` (in `rekey.ts` — the
  generalisation that file promised itself) splices the next level's material
  from a bar line; `Session.courseStep` does tempo, material and the label in
  one call at `keyChangeBeat`'s end-of-following-bar lead;
  `Transport.changeTempoAt` lands the tempo there. Manual presses and the
  author's rule both go in-stream; *Stay here* rewrites the future back; the
  transient veto lives at module scope in `ui/course-vetoes.ts`; **position
  commits when the playhead crosses the join** — mutation-tested, twice.
- The author's rule (`advance`: afterBars / windowBars / accuracyAbove) has
  **evidence that resets at every crossing** unless the author sets
  `carryEvidence` — the player found the always-carry fault within hours of
  the join shipping, and the test replays his evening.
- **The graphical editor** is at `/editor.html` in the paid build only (its
  own Vite entry, excluded from the PWA precache like the spike pages).
  Validation is `readCourse` live, so a file that reads clean there imports
  clean on the phone — the practice screen has import (refusals quote the
  reader verbatim), a picker, export, and delete. Built on the player's
  insistence over the file route, schema-rework risk accepted and recorded.
  **The phone-hosted server is untouched, still Phase 5.**
- `pinned` (metronome/conductor so far) shows disabled at the gate with "Set
  by the course". The bundle fingerprint moved with the storage rename:
  `check:web` now trips on `brass-trainer:course:`.

**The honesty rulings, all live**: a run nobody played is never filed
(`wasAttempted`; the commit happens on the way *out* of the results screen
because the merged stores have no inverse); a played run can be disowned
there; an open note asks the whole run for engagement evidence, not two
notes (the Jingle Bells fix). The metronome has a player-set level with a
preview click that is the real `Metronome`, scheduled 80 ms ahead of its own
volume ramp.

**i18n, built and then rebuilt the same day** (roadmap § 7.6). The morning's
version was scoped to labels and buttons and did not reach even that; the
player played it in German that evening and found the fault the tests could
not: *"Back" was a button on six screens and one of them translated*, and the
German landing page dropped its reader into an English app. Now: **244 keys,
every screen, all three packs complete**, `?lang=` carried from `/de/` into
`/app/` and `navigator.languages` consulted on a first run only.

**The part to keep is the guard, not the translations.**
`i18n/coverage.test.ts` reads every `ui/*.tsx` and fails **by name** on a
string that skipped `t()` — plus a key a pack lacks, a placeholder a
translation dropped, and a domain label drifted from its key. Mutation-tested
on all four. The landing page has had this check since it was built
(`site.mjs` refuses to assemble on drift); the app had none, and that
asymmetry is the entire explanation for how coverage got to a third while
1,386 tests stayed green. **A build-time rule needs a build-time check** —
the same sentence `check:web` is there for.

Then four more languages the same day (v2.56.0): **Spanish, Italian and two
Portuguese** — `pt-PT` and `pt-BR` split on the player's ruling, because
ecrã/tela and telemóvel/celular sit on the screens a new player meets first.
**Eight locales, seven packs of 247 keys, seven landing pages**; `/pt/` and
`/pt-br/` are separate search surfaces linking to `?lang=pt-PT` and
`?lang=pt-BR`. Regional-subtag matching landed with them, which is the road
the US-English fork now only needs a pack to walk.

**The packs are also split by build target now.** They were plain objects
imported unconditionally, so the *free* bundle carried My Music and course
prose in every language — describing a product it has no code to run.
`i18n/paid.ts` holds those 488 strings behind `__HAS_MY_MUSIC__` and
`__HAS_TEACHER__`, and `check:web` fingerprints one string per bucket so the
fold is proven every deploy, not hoped. Two buckets rather than one, because
`vite.config.ts` refuses a single `__IS_PAID__` and the same argument applies.

Still deliberately untranslated: course content, tune and collection names,
instrument names, the editor. Still **awaiting a native brass player's
pass** — now seven languages of it, live. That obligation has grown with
every session and no session can discharge it.

**The key a course level does not name** (2026-08-29, v2.57.0). Found by the
player authoring a real course: the optional-key ruling was correct and
unreachable, because the key grid is on the free-play home screen and nothing
in the structured flow could answer it. The **Ready gate now owns the key on a
course run and says who chose it** — a *statement* in the accordion, locked
with "Set by the course", where the author named one; a *question*
**uncollapsed on the face** in the home screen's own key grid where they did
not (`KeyGrid`, shared so the two screens cannot drift). One key never a set;
`settings.courseFifths` keeps the answer apart from free play's tour; and
answering **regenerates the music**, which is the one exception to "never
rebuild a course run's exercise" and is the course's own instruction being
obeyed. The remembered key carries from a major level to a minor one
untranslated — the app stores a signature, so C major and A minor are one
number and only the label moves. Full reasoning in `course-plan.md`.

**The tempo a course level asks for never reached the clock** (2026-08-29,
v2.59.0) — found because the player objected to the gate's tempo dial being
there at all. It was not redundant; it was the only thing setting the tempo.
A level banded at 66 played at whatever free play was last left at while the
practice screen said "at 66", and `runAt.tempo` filed the run under 66 for the
skill tally. It hid for four days because stepping works, so only a level's
*opening* run was wrong. Now the course's tempo drives the clock (`runTempo`,
never written into settings) and the dial is **locked** with "Set by the
course". Reasoning in `course-plan.md`; the same entry argues that optional
`tempo` on a level is the natural next step and the first real customer for
the axes work.

**A course level now says how long a run is, and whether it stops there**
(2026-08-29, v2.60.0) — from the player's UAT, where *Continue* appeared to
fire at random across a course. It was the free-play horizon, built weeks
before courses and never reconsidered against them, ending each level
wherever `defaultLengthFor` happened to: four cycles for a scale, eight for an
arpeggio, sixteen bars for sight-reading. Worse, the advance rule counts bars
*within a run*, so material defaults were deciding how often the course could
step the player. Levels now name their length in the material's own unit
(`cycles`/`bars`/`themeCount`, wrong units refused by name), the horizon is
**off in a course** unless a level sets `endless`, and the editor has both
controls. Free play is untouched, with a test to say so.

**The road to v3.0, ruled this week**: teacher mode + the microphone *with
its calibration* + My Music. The tuner is out (deferred to v3.x — it was
drafted in as a mic dependency and is not one; § 2.4's recognition
calibration is what the mic needs, § 2.5 takes the player's own range from
it). Headphones all but required in mic mode. **The Play internal track
sleeps** — 4.2 was a proof about the player, proved; do not upload AABs.

## Where I went wrong, so you need not

- **`npx tsc --noEmit` checks nothing here** — the root config is
  `files: []` references. It passed while a test file missed three required
  props. `tsc -b`, always (it is what `npm run build` runs).
- **`git checkout -- <file>` cannot restore an untracked file.** A mutation
  test on a not-yet-committed module left the mutation in; the tests caught
  it, the checkout did not. Revert mutations by hand on new files.
- **The calibration prompt appears *after* "Tap to start".** Two playwright
  sessions stalled dismissing it before the tap. Tap first, then accept.
- **The countdown design lived one day.** Built to the ratified plan, played
  by its author, rejected ("stops mid note… freezes"). The lesson is the
  method: phase 2 shipped small precisely so playing it could correct it —
  twice. Build the playable version early; the player's evening is worth
  more than the plan's elegance.
- **A render prop's identity in a session effect's deps would tear the run
  down mid-note.** `courseControls` is read through refs inside `PlayScreen`'s
  session effect, deliberately — see the comment there before "fixing" it.
- **The transient veto must be module-scope**: every passage rebuilds the
  component, and a veto a rebuild forgot nags two bars later; storage would
  make permanent what the ruling says is transient.
- **A feature with no guard is a feature that decays, and i18n proved it in
  under a day.** The morning shipped a translation mechanism whose own design
  note explained why partial coverage was acceptable ("degrades to mixed,
  never broken"); by evening the coverage was a third and the note was
  excusing the rot rather than describing it. Nothing failed, because nothing
  was checking. The landing page could not have this bug — `site.mjs` had a
  drift check from its first commit. **When a rule lives outside the type
  system, write the check in the same sitting as the rule**, or the next
  session inherits a claim rather than a fact.

## What is deliberately left open

- **The keystore backup is STILL not done** — `~/keystores/brassmaster/`
  (`upload.jks` + passphrase), off this machine. Fifth handover to say so.
  Also worth one look in the Play console: whether Play App Signing is on
  decides whether a lost upload key is a reset or a catastrophe.
- **The curriculum.** The editor exists; *Common Keys* is scaffolding; the
  levels and their order are the player's intuition, in the editor or in
  `courses/common-keys.ts`. Nothing ships unheard — satisfied by
  construction if he authors them.
- **Native review of the seven language packs** — 247 keys each, plus 40
  landing-page strings apiece, all live on brassmaster.net. This is the
  largest open item in the repository that no session can discharge, and it
  has grown at every step. The open **US-English fork** (crotchet → quarter
  note) is still the smallest pack and the largest Play audience; regional
  matching exists now, so it is a pack and two lines. Answer it together with
  `describeSkill`'s notation vocabulary on the Progress report — the one
  string set the sweep deliberately left English, because both ask the same
  question.
- **Request indexing** for `/de/` `/nl/` `/fr/` in Search Console (the
  sitemap lists them; a nudge is faster).
- ~~**Pins do not switch mid-stream**~~ — closed by the axes build
  (2026-08-29): support values apply at the crossing commit.
- **Switching courses discards the old course's position** (one Progress per
  instrument/clef). Cheap to live with; noted so it is a choice.
- ~~**`carryEvidence` is per rule, not per step-kind**~~ — dissolved by the
  axes build: evidence is per-segment by construction, and an author whose
  steps are trivial writes a trivial per-segment rule instead.
- **The QC45 route test** — still the one 4.2 capability never watched
  working. Bench-only.
- **The advance/mastery constants are provisional** and must be tuned only by
  the player playing a real course, per the plan's own law.

## The axes build (2026-08-29, v2.61.0) — what the section below asked for, done

Built in one release per the ruling, with two further rulings taken from the
player at the design session that morning, both recorded in
`level-axes-plan.md` where they belong:

- **No composite support axis** — each help setting individually header-level
  or its own axis; the open "rungs" question dissolved rather than answered.
- **The trichotomy, universal**: every axis-capable parameter is the
  player's, pinned in the header, or on an axis — never both, refused by
  name. `TempoBand` is gone; a level may leave the tempo to the dial.
- **Rules stick to their left boundary** under editing (the plan's open
  question) — carry on move, copy-on-split, merge-keeps-left; pure and
  unit-tested in `editor/timeline/axis-model.ts`.

The state of things: **1,631 tests across 84 files**, gate green both
targets, fingerprints in place. `Position` is a segment index; old documents
and old stored positions read forward (the bundled course is the living
fixture, a frozen old-format copy lives in `course.test.ts`). The three
player-found-bug guards — crossing commit, whole-window, evidence reset —
survived re-aimed at segments, and the evidence reset is now unconditional
(`carryEvidence` is gone, as the plan ruled). Two real faults were found and
closed in passing: **pins never reached the opening run's gate** (Start
hand-built the run; `runFor` is now the one function both paths use, and the
gate shows the course's *values*, not the player's values merely disabled),
and the session effect would have **torn the run down mid-note** the first
time a crossing changed `runTempo` (now read through refs; pinned by a
regression test in `course-support.clock.test.tsx` that fakes the renderer —
happy-dom has no 2D canvas, which is also why the older clock tests could
only ever watch constructors).

Support settings now switch **mid-stream at the crossing commit**:
metronome/playback per scheduling window (`Session.setSupport`), conductor
via a live ref, fingerings via `Hints.setMode`, reading mode via
`StaveRenderer.setReadingMode` (re-lays like `rekeyed`; the riskiest item —
**first on the device UAT list**, E32, mid-note flip). The interval pool is
diatonic-degree–based (`IntervalWeight.interval`: 2 a second, 3 a third) with
an optional `degrees` fence — *"Exploring 3rds in C major"* is now
authorable; the absent path is byte-identical, snapshot-proven, and one
refactor that reordered the RNG draws was caught by exactly those snapshots.
The editor's timeline is the concept drawing working: draggable divisions
(snap to other axes' boundaries = deliberate segment merging), from|to|steps
generators (range walks `keyLadder`, down-biased), the per-segment rules
table, and the drag-down gesture — picking a pinned parameter in the
add-axis picker unpins it into the graph atomically. Opening an old file
modernises it through `readCourse` itself (`editor/document.ts`); the editor
saves new-format only.

**First UAT round (v2.61.1), same evening:** the player's pass reshaped the
timeline into a true grid — panel column left with each axis's parameters on
one line, one shared bar column so every bar starts and ends together, faint
boundary lines through bars and rules table alike, and a Visio-style
full-height drag guide that lights up when a divider snaps onto another
axis's boundary (radius widened to 2%). The build's first version had the
bars stacking under the panels: the lines overlay was explicitly placed into
the grid's second column, and auto-placed items refuse to share cells with
an explicitly placed one — everything now carries explicit coordinates.
Reach also stopped speaking semitones: its divisions and header are named
intervals (a fifth / one octave / an octave and a fifth / two octaves), and
its from/to generator row is gone, because a linear run of semitone counts
wrote figures like "16 semitones" that are legal and musically odd.

**Second UAT round (v2.61.2), same evening — the x-axis became TIME.** The
player caught the percent ruler lying: with per-segment rules, a segment
spanning 25% of the bar and one spanning 5% could both need eight bars. The
stored `at` fractions never meant anything at runtime (only order and shared
boundaries are real), so the editor now draws every segment at its estimated
duration — minimum bars × the tempo and metre in force, `ASSUMED_TEMPO` (80)
where nothing names one, the score window as the floor where wider — with a
m:ss ruler, a total in the corner, and constant seconds-per-pixel that
re-lays on every edit (`editor/timeline/layout.ts`, pure and tested).
Dragging followed: position between boundaries is meaningless under derived
widths, so a drop either JOINS a boundary (snap, lit guide) or SPLITS the
gap at its stored midpoint — a drag can no longer mint a sliver segment.
The rules row became chips ("8 bars · 85%/4 · ≈0:27", width = cost) opening
a callout editor with room to breathe.

**Callout clipping (v2.61.3):** the rules callout opened upward and lost its
head. `.tl__scroll` carries `overflow-x: auto` for the sideways scrolling,
and CSS forces the other axis to `auto` with it — a scroller clips
vertically whatever its overflow-y says, with no opt-out. It opens downward
now, into room the scroller reserves while one is up and gives back on
close; the room is **measured from the callout** (a first fix guessed
13.5rem and was one pixel short of the plainest variant, and half short of
the tallest), and late segments anchor their callout to the right edge.
Guarded in `editor.test.tsx`, mutation-tested.

**A warning worth the handover's space:** `git checkout -- <file>` to revert
a hand mutation **discarded an hour of uncommitted work** in the same file.
The handover already said a checkout cannot restore an untracked file; the
sharper rule is that it cannot restore *anything* uncommitted. Revert
mutations by hand — a reversing `sed`, not a checkout — whenever the file
carries work that is not yet in a commit.

**Third UAT round (v2.62.0): the x-axis became BARS.** The time axis was
honest but left dragging meaningless — and in fact impossible: a divider
alone between its own neighbours had nowhere to go under the join-or-split
drop, so the tempo dividers could not be moved at all. Bars are the unit
the rules are written in and the only one an author can act on, so widths
are bars now: **dragging moves bars across a divider** (writing both rules,
level length unchanged), **editing a rule changes the level's length**, and
add/delete adds or removes a stage of its own length. Merging two axes'
dividers is squeezing the stage between them to nothing — the alignment
gesture, in the music's own unit. Values draw as **blocks spanning until
their own axis changes**, which fixes the reported "gap" where another
axis's division made a tempo look inapplicable. Full reasoning in
`level-axes-plan.md` § *The x-axis, ruled twice in one evening*.

**The drag's only fence is its own axis (v2.63.0).** A conductor divider
could not be moved past the tempo steps either side of it — the drag was
bounded by the adjacent *timeline* segments rather than by the axis's own
neighbours. One operation now covers every drag (take the divider out, put
it back where it was dropped), so a divider crosses foreign boundaries
freely and lands on them to align. Stages are **coloured rounded blocks
carrying their own value, spinner and delete button**, double height, in
place of the red marks and loose labels.

**A score window is not a wall (v2.62.1).** It used to floor the drag, so a
divider could not be brought within four bars — the level default's window —
of its neighbour, stopped by a figure the author never set. `fitRule` bends
the window down with the stage instead; one bar is the only floor. Safe
because `carryEvidence` is gone: a window is only ever filled by bars played
inside its own stage.

**Left alone deliberately:** the fresh level's six tempo stages (6 bpm
apart — the noticeable-step doctrine: ~8% at the bottom of the range, ~4%
at the top) and the eight bars a stage defaults to (`DEFAULT_RULE`, which
the plan's own law says is tuned by playing, not by argument). The 48-bar
total those produce is now visible in the corner and draggable, which is
the honest answer to "is that right?".

**What is actually next now: the curriculum.** The machinery is built and
green but UNPLAYED — the checkpoint the build plan named still stands: the
player plays the bundled course for parity (it should feel identical), then
authors a real level with a support axis and hears the metronome drop out at
a crossing. Nothing ships unheard. After his pass: the microphone with its
§ 2.4 calibration, per the roadmap below.

## What is next

**Level axes, the timeline model — ratified 2026-08-29 and entirely unbuilt.**
`level-axes-plan.md` is the specification and
`docs/level-progression-concept.png` is the player's own drawing of the
editor. Ruled to land **in one release**: the `axes` schema, seven axes
(tempo, length, keys, range, reach, metre, support), the interval-pool
generator work, per-segment progression rules, and the graphical timeline
editor. It supersedes `CourseLevel.tempo`, `Advance` and `carryEvidence`; it
leaves `Mastery` and the honesty rulings alone.

Two things to settle *with the player* before building the parts that depend
on them: **what the support axis's rungs are**, and **what happens to a
segment's rule when a division moves**. Both are named in the plan. Neither
blocks the schema.

The old plan's own next step still stands behind it:



**The pedagogy's content, then Phase 2.** The machinery — courses, stepping,
the editor, the honest stores — is built and played. What no session can do
is the curriculum: that is authorship, in the editor, with the player's ear.
After that the roadmap's build order is the **microphone with its § 2.4
calibration** (detection is proven; the fingering-not-pitch seam makes octave
errors free; the scale-based calibration and § 2.5's player range are
designed and waiting), with `course-plan.md` phase 3 (author cells) and the
free-taster flag split as the nearer, smaller items. The generator sleeps;
its next hour is a musician's, in `train/annotate_bars.py`.

## How to work here

Small, complete changes. Run the gate in the order above and check exit
codes. Write the reasoning into the code where the next person will meet it —
this week's rulings all live at their sites, dated. **Mutation-test anything
that guards** (this week: the crossing commit, the whole-window rule, the
evidence reset, `wasAttempted`, the volume clamp — each pinned by a test that
replays the real failure). Design before building, and then **let the player
play it before believing it**: the week's two best corrections came from his
evening, not the plan. Push without asking once the gate is green; push
`origin`, never `legacy`; tag every version; confirm the deploy on the live
site, including that the paid fingerprints stayed out of the free bundle.
Nothing ships to a player unheard — and now, in any language, unreviewed.
