# Rhythm drills — the voice that teaches the beat

Drafted 2026-08-26 from the player's design, over two sessions of deliberate
requirements work; **ratified by the player the same day**. Read `roadmap.md` § 2 (the core job)
and `course-plan.md` first; this plan is written to be compatible with both,
and § *What the course document must keep optional* below is a constraint on
course-plan phase 2 that must be honoured **before** any course file exists.

**Scheduled 2026-08-30** — the player: *"rhythm is the concept that we need
to get on with next"* — when the microphone moved behind the eisteddfod's
sample corpus (roadmap Phase 2's deferral note) and the authored-cells
builder became this plan's first customer. **The first slice is built the
same day**: the pattern library (spine stages 1–4), the syllable mapping,
the demonstration-then-play generator, the printed count (1 e & a, centred,
greying with its demo bars), the paid flag with its tripwire, and the free-
play tab. Playable end to end with the voice silent. **The voice itself
waits on the player's clips** — eleven syllables, one phone session — and
the stage progression, the tolerance question and rounds-per-stage wait on
his playing, per this plan's own rules. The original scheduling note stands
below for the record.

*(As drafted:)* **Deliberately not scheduled.** The player raised it now
"not because I necessarily think we should build it now, but because if
there are any architectural decisions that need to be made now to later
support it, we should think about that." This document is that thinking. It
does not put rhythm drills into v3.0.

## The problem, in the player's words

Switching to paged reading ("read the page") is much harder than having the
notes fed one at a time — and in paged mode the app trains rhythm only
*indirectly*. A player who goes wrong there cannot tell **why** they went
wrong: the app says a note was missed, never that the dotted pair was the
problem. Teachers verbalise rhythm — "1-e-and-a", "taa te-te" — precisely
because the fall of notes is learnable as a thing of its own, before any
pitches are attached to it.

The gap is measurable in the app's own stores: `attributes.ts` already labels
every judged note with `rhythm:` (value, dot, triplet) and `beat:` (where in
the bar it fell), and `skills.ts` has tallied both in every build since
2026-08-19 — so the app can already *know* that dotted rhythms cost a player a
fifth of their accuracy, and has nothing that teaches to it. This mode is the
first thing that would.

## What it is

A new material: **Rhythm**. A run is a sequence of *rounds*, each round the
same shape:

    demonstration bars    the pattern spoken by a counting voice, over the
                          metronome or conductor. NOT judged, and nothing
                          sounds but the syllables and the beat.
    play bars             the player plays the pattern. Judged as any other
                          bars are.

The rhythm pattern holds still across the round — and across several rounds —
while the app varies what it may: first nothing, then the pitches. **Hold the
rhythm, vary the notes** is the ladder's own law aimed at this material: the
rhythm is the thing being learned, so it is the thing held still.

### The rulings, all the player's (2026-08-26)

1. **"1-e-and-a" is the first counting system**, with the architecture
   keeping a second, duration-based system ("taa te-te") as data — a clip set
   plus a mapping table, not a second implementation.
2. **The scaffold withdraws as a progression.** Early stages count under the
   player's own bars; later stages switch the voice off so the player plays
   against the metronome or conductor directly.
3. **Demonstration bars are syllables only.** No pitches sound under them —
   "lets not confuse the listener with the notes."
4. **Paid.** Its own build flag (`__HAS_RHYTHM__`), one flag per feature as
   `vite.config.ts` rules.
5. **The voice is never judged** (ruled in the first design pass): it is up
   to the player whether to speak along. The app teaches; it does not listen
   for speech.

## Why the pitches alternate, and why that is load-bearing

The player's own insight, sharpened by the judge's mechanics: **on buttons,
rhythm is only observable when consecutive notes force a state change.** The
valve input has no attack — `judgeNote` asks whether the right state was held
inside the note's window, and a state held from before the window counts as
on time. Hold one fingering through a bar of repeated Ds and every D judges
correct with perfect timing, whatever the player's rhythm was.

So the play bars alternate **two adjacent scale notes** (the player's example:
D and E), placed in a comfortable register for the instrument — and
**neither of them open** (ruled 2026-09-03, on playing it: *"G is open, so
doesn't actually require the user to do anything… something that requires
definite action"*). The open-note rule is this section's own argument
taken one step further: an open note has no state to change TO, so the
player stops pressing or never started, and half the alternation asks for
nothing. Seven of the eleven instrument-and-clef pairs picked an open note
before the rule — the picker asked only for adjacent white notes near the
middle, never what they cost the fingers. A test now walks every
instrument and clef and refuses a zero mask. Each note then
requires a fresh change of state, and the *time of the change* is what the
judge's window measures — which is the rhythm. Pitch load is deliberately
minimal; it exists only to make the timing honest.

**This is a buttons-era constraint and must be marked as one.** The microphone
hears attacks, so microphone mode can drill a rhythm on a single repeated note
— which is how a teacher would actually do it. When Phase 2 lands, this rule
relaxes rather than transfers.

Rests are trained implicitly: the app judges attacks, not releases, so a
rest's evidence is the next note landing where it should. Good enough on
buttons; the microphone can one day hear that a note was held through a rest.

## The voice

**Runtime speech synthesis is rejected, for timing rather than taste.** The
Web Speech API cannot be scheduled on the audio clock: it speaks when it
speaks, tens to hundreds of milliseconds late, varying by device. A counting
voice whose syllables miss the beat is worse than none.

So the voice is **recorded syllable clips, scheduled exactly as metronome
clicks are** — `AudioBufferSourceNode.start(time)` on the shared context,
carrying the same calibrated audio lead. The clip set for "1-e-and-a" is
small: the beat numbers (1–6 covers every metre the app writes), "e", "and",
"a", "trip", "let". Rests are silence — a rest is not spoken.

**One mapping drives both the screen and the voice.** A pure function from
(metre, beat position, duration) to syllables feeds the printed annotations
*and* the clip scheduler, so what the page shows and what the voice says
cannot disagree. The same shape as `hints.ts`, which derives fingerings from
the note rather than storing them.

**The player's voice is the default** (re-ruled twice on 2026-08-30 and
2026-08-31, and this is where it landed): he records the clips from a
scripted session (`~/Desktop/recording-script.txt` — phrases counted to a
60 bpm click in earphones, sliced on the grid afterwards, with isolated
words as insurance). The original reasoning stands restored — a person
counting sounds like teaching, and his own voice is licensing-clean by
definition.

The intervening day produced a **synthesized fallback that remains
auditioned and available**: Piper TTS, `en_GB-vctk-medium` (VCTK, CC BY
4.0 — attribution required if it ever ships), three candidate speakers at
`~/Desktop/syllable-audition.html`, playing real bars on the Web Audio
clock. Kept because the pipeline is reproducible and the licensing gate is
recorded: the rejection of synthesis was only ever of RUNTIME synthesis
(the Web Speech API cannot be scheduled), and a "free voice generator"
website is not an option for a paid app — the Essen-corpus lesson applied
to audio. His voice and the robots meet on the same audition page; the ear
rule picks.

**Positional it is** (the ruling's final form, 2026-08-31, an hour after
the pineapple discussion): *"let's stick to the positional arguments."*
The default system stays 1-e-&-a with 1-trip-let, because the count tells
you where you are in the bar. Pineapple — his tradition's grouping word,
where *"pine-app-le pine-app-le pine"* is a seven-note run — stands
recorded as a legitimate second system the data model already holds, built
whenever wanted, never by a new mechanism.

**Vocalisations are per-rhythm phrases, stored per-onset** (ruled
2026-08-31 with the annotation tool): the player records a rhythm's count
as one fluent phrase to a click — natural prosody, the reason isolated
words sound stilted — and the pipeline slices it on the grid into
per-onset clips. He records the packaged rhythms; a user may replace any
recording with their own. And because the system is positional, **a custom
rhythm nobody recorded still speaks**: the mapping derives its count and
assembles it from the default clip set. Recording is the better voice; the
derived one is the floor; no rhythm is ever silent.

**Feels are prepackaged and not user-editable** (ruled 2026-08-31,
confirming what the feel section below already designed): a feel belongs
to a time signature and warps the timing of pulses — swing moves the
off-beat quaver from 50% to ~66% of the beat — and shipping them as fixed
data is the whole of it. Still not in the first build: the judge must warp
its expectations by the same transform, which is its own careful step.

The syllable player is **not a `Voice`** — that interface is pitched
(`play(midi, …)`) and a syllable has no midi. It is a sibling of the
metronome: a scheduler that reads the exercise and speaks the demonstration
spans.

## The annotation tool — redesigned as a grid, 2026-09-01, and rebuilt

The chip editor below lived one day. The player, having played with it:

> Break each bar up into some number of divisions per beat… say 16
> divisions in a 4/4 bar. The user colors those divisions… play or rest…
> [with] a "rearticulation" marker. From what the user is drawing, some
> notes appear to identify how that would look, using combinations of
> dotted notes, tied notes, rests of various durations.

The step sequencer's model, and better than the chips for a reason worth
stating: **the grid makes the chip editor's validation unrepresentable
rather than checked** — a grid of whole bars cannot hold a partial bar or
write past its own edge. The rearticulation marker collapsed into the data
model itself: a cell is attack, hold or rest, and two crotchets against a
minim is `x-x-` against `x---`.

**The rulings, all the player's (2026-09-01):**

- **Gesture: paint and split.** Drag paints a note (attack plus holds),
  tap inside one splits it (the rearticulation), tap its start deletes.
  No marker mode, no modes at all.
- **Engrave with ties — show the beat.** A note splits at every beat
  boundary and ties back together; the syncopation shorthand (the
  off-beat crotchet) is deliberately not written, because this app
  teaches reading and what learners read should show them the beats.
  The permitted mergers are a named table (`mergedLength`): the whole
  bar, 4/4's half-bar (notes AND rests — the minim rest is how printed
  parts write it, where 3/4 keeps crotchet rests), 3/4's minim from
  either lower beat, and the dotted crotchet where it does not cross
  4/4's half-bar. Shorthands may join later, one at a time, by his eye.
- **The stave replaced the chips outright.** *"Just plonk all the notes
  onto the stave as a C"* — the derived notation, on one written pitch
  (C5 treble, C3 bass, inside every compass), with the count above it,
  IS the viewer. And it is the bridge: the cell designer opens the
  vertical axis of this same stave, dragging notes to steps — which is
  `authored-cells-plan.md`'s "rhythm first, then pitches" landing on
  ground that now exists.

**Ties became authorable** — across beats and across bar lines — which
stage 4 of the spine needs and the chip grammar never could. Storage is
unchanged — the grid engraves to the same bars-of-tokens the library and
generator already read, so every custom made in the chip editor loads in
the grid.

**Triplets landed the next day (2026-09-01), as the per-beat division the
model was shaped for.** A beat divides in four (counted 1-e-&-a) or in
three (1-trip-let) — the counting system resets per beat, so the grid's
resolution does too, and a triplet sits beside semiquavers in one bar as
it does on a printed part. The player's word for it — *"superimposed on
top of the 1-e-and-a rhythm"* — is musically exact: the beat stays the
unit, which is precisely why the rejected alternative (one fine grid of
twelfths both fit into) was rejected: it would let the user draw
positions no stave can print, reopening the hole the grid closes. **The toggle is a beat-wide button reading "in 4" / "in 3"**, cycling an
ordered list (`GRID_DIVISIONS`) — the player's own generalisation,
reached in two steps the same day: first away from the numeral (*"click
on beat number isn't quite intuitive"*), then past "triplet"/"1 e & a"
to the number itself, *"or perhaps even 'in 5'"*. The count lives INSIDE
the cells, so the button can afford to be a number: the cells say what
the division means. The flip still resets its beat's cells — states
cannot map honestly across divisions.

**The printed count is complete: every beat, at each beat's own level**
(the player, 2026-09-01, correcting the first cut the same day — a mark
per engraved symbol under-counted, ending a 4/4 bar's count at "3"). His
spec, now the rule in `syllablesForBars`: every beat gets its number, so
a two-beat rest reads "3 4" and a semibreve counts on under its own
tail; within a beat the level is the beat's finest onset — one
semiquaver anywhere makes the whole beat read "n e & a"; **bright means
an attack speaks here, dimmed means the count continues**, through
silence and sustain alike. The VOICE is untouched: it reads only the
bright entries, and a rest is still not spoken. The crotchet triplet
floats against plain dimmed numbers, its off-beat members joining
neither the level nor the marks — which is how the figure is actually
counted. One emission serves the preview and the play screen, so the
tool and the run cannot disagree about the count.

**A bracket covers the figure, rests included** (the player, 2026-09-01:
one painted cell in a triplet beat *"probably still needs the bracket
beneath with the 3"*). The tuplet grouping was rebuilt from a run of
noteheads to the figure itself: notes and rests on one merged timeline,
a bracket closing where the accumulated tuplet length reaches a whole
number of beats — which is also what keeps two triplet beats from
reading as a sextuplet, by the figure's own arithmetic rather than a
notehead count. Rests carry `tupletGroup` now, both surfaces stretch the
bracket over them, and a lone triplet quaver between triplet rests
prints exactly as a part would print it.

**"In 5" is an entry on that list plus its dues, and the dues are the
design**: a new division must have writable durations (`Duration.tuplet`
is typed `3`, so a fifth of a beat cannot currently be spelled at all),
engraving values and a tuplet numeral, an answer from the counting
system even if that answer is deliberate silence, and a reason from real
band parts — which for quintuplets is thin. "In 2" and every even split
are already trivial inside division 4, as the player noted himself. Engraving additions, each in
the test table: one cell is a triplet quaver, two a triplet crotchet,
all three held ARE a crotchet and engrave as one; ties run into and out
of a triplet beat; the dotted-crotchet merger demands its borrowed half
come from a division-4 beat, since half a triplet beat is not a place a
note can end. A second rest rule came from the player misreading the
engraver's output as bad arithmetic (2026-09-01): **silence inside a
triplet figure is written in triplet-quaver rests, one per third, never
a triplet-crotchet rest** — that glyph is a crotchet rest whose value
depends on noticing the bracket, which is precisely how it misreads. A
fully silent triplet beat is no figure at all and keeps its plain
crotchet rest. And one rule found by the engraver's own output: **a rest
never dots in simple time** — a note may (the march's own s–e. figure),
but a rest shows the subdivision it silences, so three sixteenths of
silence split at the half-beat. `gridFromBars` infers each beat's
division from what lands inside it, so the packaged triplet patterns of
stage 7, when written, open in the grid instead of declining.

**The crotchet triplet — three in the time of two — followed the same day**
(the player: *"is it feasible that a triplet would be applied over two
beats?"*), and it is the shorthand list's first entry: an ALIGNED pair of
triplet beats (the pair a minim could sit on, never straddling 4/4's
half-bar) whose onsets sit on the two-thirds grid engraves as triplet
crotchets under one bracket, not as tied triplet quavers — which is how
every printed part writes it. Drawing it needs no new gesture: flip both
beats of the pair and paint across them. Its off-beat members take **no
count syllable** (`countableSyllable`): "trip" and "let" are one beat's
own subdivisions, and the voice stays silent sooner than say something
false — which is honestly how the figure is taught, floated against a
two-beat frame. Half-bar (minim) triplets are out until asked for.

**And the preview's eye found a renderer gap older than this mode**: the
scrolling surface never drew tuplet numerals at all — `drawTuplet` lived
only in the paged system — so free play in scrolling mode has been
printing triplets as ordinary notes with no 3 on them since triplet
cells first shipped. Both surfaces draw the bracket now. The rhythm
tool's one-system preview routes through the scrolling line (`stacked()`
wants more than one system), which is how the gap surfaced.

## The chip editor (the first design, 2026-08-31 — superseded above)

> Build an annotation tool which allows the user to specify a rhythm…
> prepopulate a few. There is no stave, just a note length indicator and
> rest length indicator. The rhythm goes for at least one (or otherwise a
> whole number) of bars.

Built as `ui/RhythmPatternEditor.tsx` over a pure core in
`exercise/rhythm.ts`: duration chips with the live derived count printed
above each note (the same `syllablesFor` the run speaks from, so the tool
cannot promise a count the run will not print), appended by length button,
removed by tap. `barsFromTokens` holds the rules — whole bars only, no
event across a bar line (the tool draws no ties yet), no dotted semiquaver
(its position falls between the count's syllables), not all rests — each
mutation-tested. The player's shelf lives at `brass-trainer:rhythms`
(also `check:web`'s third rhythm tripwire), resolves ahead of the library
by id, and a stale id falls back to the library's first, the drillId
grace. The editor's grammar is narrower than `parseCell` — no triplets,
no ties — and `tokensFromBars` returns null for a packaged pattern it
cannot re-edit rather than mangling it. Editor-facing validation
sentences are English pending the native-review sweep, noted there.

## The voice-pack recorder (proposed by the player, 2026-08-31; not built)

> Let's also create an editor on top of that, so any user can record their
> voice and their words in their language as a replacement, at a variety of
> speeds etc. I could even use that tool to create the default packaged
> vocalisation of the rhythm patterns.

The annotation-tool pattern again: build the tool, and the human records
the content — first the player making the shipped default, then any user
making their own. What it settles and what it opens:

- **A pack is recordings per SLOT of an existing counting system.** The
  mapping (position → slot) is the system's and stays data authored with
  the app; the pack fills the slots with a voice. A German player
  recording "und" into the `and` slot has translated the count without
  touching a mapping — which is how "their words in their language" stays
  a recording job rather than a schema job.
- **The recorder is the slicing pipeline with a face.** The desktop script
  already counts phrases to a click and slices on the grid; the in-app
  tool does the same with the metronome it already has — count along, and
  the slots fill themselves. Re-record one slot by tapping it.
- **Speed variants are real, not "etc."**: a syllable spoken naturally at
  60 bpm is too long at 160. Two recordings per slot (a spoken and a
  clipped one), the scheduler choosing by tempo, beats time-stretching —
  which mangles consonants exactly where a count lives.
- **Paid, on the phone, stored with the library** (the v3 ruling: the
  phone owns it), and it uses the microphone — `getUserMedia` is already
  `check:web`'s tripwire for Phase 2, so the free build is already fenced
  against it leaking. This does NOT wait for Phase 2's detector: recording
  is capture, not pitch detection.
- **The ear rule, per pack**: a user's own pack is theirs and ships
  nowhere; the DEFAULT pack the player records with this tool goes through
  his ear like everything else.

**Build order unchanged**: the scripted session gets the default voice NOW
without the tool; the recorder replaces the desktop pipeline when it is
built, and slots into the paid app beside the authored-cells builder —
both are "record/author your own material" tools and should feel like
siblings.

## The progression

Scaffold withdrawal, in stages — the count under the player's first attempts
is what a teacher gives and then takes away:

    stage 1   demo bars spoken · play bars with the voice counting underneath
    stage 2   demo bars spoken · play bars against metronome or conductor only
    stage 3   no demo bars · the player reads the pattern cold

The stage is the player's to choose (and later the course's to walk — it is
an axis in exactly `course-plan.md`'s sense). How many rounds a stage holds,
and whether stage 3 belongs in the mode at all or *is* just sight-reading,
are settled by playing it, not by this document.

## The pattern library

Named rhythm patterns, selectable the way drills are — a picker leading the
box. A pattern is data:

    id, name          "Dotted pairs", "Son clave", "Scotch snap" — some named
                      from teaching, some landmarks with real-world names
    metre             matched exactly, as cells are
    bars              in the cell notation's duration tokens, pitchless:
                      `q ee q r` — the notation already exists in
                      `cells.ts` (`parseCell`), steps ignored or zero
    level             its place on the graded spine below

Multi-bar patterns are allowed (son clave is two bars). The Drills blurb
guard's law applies unchanged: the box's blurb claims only what the list
delivers, enforced in tests.

### Organised by what teaches, not where it came from

Ruled 2026-08-26, on the player's question — cultural collections ("the
American South… western Africa") against one general brass-banding set — and
answered from standard pedagogy at his own request: he names himself poor at
rhythm, which is why the mode exists, so for once the ordering is not his ear's
to invent, only to veto.

**The primary organisation is a graded spine of one-beat cells.** Three
reasons, each about this app rather than taste: the core job (roadmap § 2) is
reading fluency, and *does this order make a more fluent reader* is a test
difficulty-grading passes and geography does not; the chosen counting system
resets every beat, so the vocabulary's natural unit is the one-beat cell and a
bar is cells combined; and one new cell at a time against mastered ones is the
ladder's own law — *exactly one thing moves* — which is also how the standard
methods (Ted Reed's *Syncopation*, the Kodály sequence, the band method books)
all proceed.

**The spine, proposed** — a hypothesis for the player's veto, and deliberately
testable (see below):

    1  on the beat            crotchets, minims, semibreves, their rests
    2  the divided beat       quaver pairs among crotchets
    3  the dotted pair        dotted crotchet + quaver — the most-cited
                              stumbling point in every method
    4  off-beats and ties     quaver rest + quaver; ties across the beat
    5  semiquaver cells       four semis; quaver + two semis; two semis + quaver
    6  the march cells        dotted quaver + semiquaver, and the Scotch snap
                              — hornpipes, squarely this band's repertoire
    7  triplets               in simple time
    8  compound time          6/8, the march's home: ♩♪ and ♪♩ against the
                              dotted-crotchet beat
    9  cross-beat landmarks   tresillo (3+3+2), habanera, son clave,
                              hemiola in 3/4

**Named patterns are landmarks inside the spine, not the organisation.** A
famous combination wears its name — names are memory hooks — but sits at its
difficulty, not in a geography.

**The order is a hypothesis the store can test.** `rhythm:` and `beat:` labels
are recorded from every judged note already, so once real players run this
material the data can say whether the spine's order is right — which no method
book can. If stage 4 proves harder than stage 5, the levels reorder and
nothing else changes; the spine is data.

**Cultural collections are deferred, with the reason recorded.** Curating an
authentic West African set is a scholarship job neither the player nor the
assistant can do honestly, and those patterns are mostly bell timelines that
mean what they mean *against* the polyrhythm around them — a single notated
line strips exactly that. The gate for any later genre pack: **does this
rhythm appear on printed parts a brass player will actually read?** The Latin
figures pass it (they are all over show and film arrangements); march and hymn
figures are the core; a pack claiming a tradition waits for someone qualified
to build it.

**A future hook, noted and not committed:** a pattern is duration tokens,
derivable from any part — so the paid app could one day offer *the rhythms of
an imported piece* as drills. Practise Tuesday's march figures before Tuesday.
It costs nothing now beyond this sentence.

## Presentation

**The demonstration is written as rests, and the answer bars are
highlighted** (ruled 2026-09-03, on playing it: greyed demonstration
notes *"can be confusing for a user who is used to seeing the grey zone
as meaning a bit they can optionally play in"*). The grey already means
the horizon — optional, play on if you like — so borrowing it for
"listen, do not play" said the opposite of what it meant. Rests are not a
display trick but the truth: through the demonstration the player IS
silent. The count still prints the whole figure above them, so the eye
reads the rhythm while the ear hears it, which is the teaching. And the
marking is **positive** — the app says which bar is yours rather than
dimming the ones that are not — a soft wash behind the stave
(`theme.answer`, defined in both themes) over `Exercise.playSpans`.

Sharpened the same day: the wash lights **the bar being played now**,
one at a time, following the playhead — before the run it names the
first ask, so the request is legible while the demonstration plays, and
during a demonstration it names none. And a demonstration bar is **one
bar rest**, not the figure's own rests one for one: the small rests are
the notation of a figure being read, and belong in the bars the player
is reading; a bar where nothing is played says its nothing once, as a
printed part does.

Paged, never scrolling: one bar (or one pattern) large on the screen, the
syllables printed above each note — derived, like the fingering hints below
are — and the repetitions written out so what is judged is what is shown.
The demonstration bars are on screen while they are spoken, which **is** the
teaching: eye on the notation, ear on the count, the association forming
before the player plays a thing.

## What already absorbs it, so nobody rebuilds these

- **Unjudged spans**: `acceptedMasks: []` (`isUnplayable`) — demonstration
  notes sound in no totals and produce no judgements. `wasAttempted` is
  unaffected: demo bars yield no verdicts at all, so a run of demos the
  player never answered still records nothing.
- **Timing machinery**: `toleranceFor`, `timingOffset`, the calibrated lead —
  all shared. Whether rhythm mode wants a *tighter* tolerance (rhythm is the
  skill here) is tunable by ear, not decided here.
- **The skill store**: `rhythm:` and `beat:` labels are already recorded from
  every run. This mode feeds the same store and later reads it.
- **Tempo**: the dial, and eventually the course's tempo axis, unchanged.

## The build split

- `__HAS_RHYTHM__`, injected as the others are, `true` only for
  `VITE_TARGET=app`. Read as a literal, never through a constant.
- **The syllable clips are imported assets, not `public/` files.** `public/`
  is copied wholesale into both targets, so clips there would ship in the
  free bundle regardless of flags. Imported behind the dynamic-import that
  the flag guards, they are emitted only when referenced — the exact
  mechanism that keeps `import/`'s 2,900 lines out of the web build.
- `check:web` gains a tripwire: a string specific to this code (the storage
  key, or a clip filename) so the day someone wires a screen and forgets the
  flag, the deploy fails rather than the paid feature leaking.

## What the course document must keep optional — a constraint on phase 2

Rhythm is the first concrete instance of the material `course-plan.md` was
told to leave room for: **a level with no key, no key set, no register and no
pitch range.** Its remembered choices are a pattern (or pattern set), a
counting system and a stage — not `{ keySet, difficultyId }`, which is what
`MaterialChoices` assumes today. Phase 2's document schema must make the
level's material a discriminated shape with those fields optional **before
any course file exists**, because a shared document format cannot be
retrofitted once files are in the wild.

## Naming, recorded as the player's choice to make

The player proposed "Rhythm drills", with the existing Drills perhaps
becoming "Note drills". Recommendation, held loosely: the new tab wears
**"Rhythm"** and Drills keeps its name — tab labels live on a 360px bar where
short survives and long wraps (the settings-overflow lesson), and the
existing drills are about fingering and shape rather than notes, which their
own blurb ("Scales and arpeggios.") already claims precisely. The symmetry
the player wants can live in the blurbs. His alternative stands recorded
here; whichever way it goes, the blurb guard keeps the claim honest.

## Feel — the rhythm the page does not show

Raised by the player at ratification: *"if my score says 'bluesy doo-wop' at
the start, does that mean something that just reading the notes would not
provide?"* It does, and the biggest case is **swing**: a chart marked Swing or
Shuffle prints straight quavers and every player performs them long-short, the
offbeat landing near two-thirds of the beat. The notation is a deliberately
lossy projection — writing the real rhythm would be unreadable — and the feel
is transmitted aurally, which is precisely the channel this mode owns: the
counting voice is the app's one aural teacher, and it can speak a pattern
*swung* over the same printed straight quavers, showing the learner exactly
what the page cannot.

**Deliberately not in the first build**, but the design must not foreclose it,
and it does not: **swing is a timing transform, not new material.** The
syllable mapping, the clips and the printed pattern are all untouched — only
the scheduled times of within-beat positions warp, and one transform feeds
both the voice's schedule and the judge's expectations, so they cannot
disagree. Two consequences worth recording now:

- **The judge judges literal notation today**, so a player correctly swinging
  a swing chart would read as late on every offbeat (~80 ms at 120 bpm) —
  inside or outside tolerance by luck. Latent until swung music meets the
  microphone; a known fault class, not a surprise.
- **The importer discards direction text by contract**, so a Swing marking on
  an imported part is invisible. If feel ever ships, the marking becomes worth
  keeping.

**How feel would be taught, and where it may not apply** (the player's
question, 2026-08-26, second pass). Taught the way rhythm is, one layer up:
the same printed bar, the voice counting it straight and then swung, the
notation held still so the learner sees that nothing on the page moved — and
in course terms feel is an **axis**, straight to swung, moved only after the
straight version is mastered. Applicability is mechanical, not curated: **a
feel applies to a pattern iff the transform moves at least one of its
onsets**, plus a metre gate — swing displaces offbeat quavers, so an
on-the-beat pattern is invariant under it, and compound time already contains
the lilt (a shuffle is close to a straight pattern performed as written in
12/8), so swing declares itself for simple metres and the picker simply does
not offer it where it would change nothing. One honest limit: feel is timing
plus weight, and the buttons judge only timing — accent and note length are
inaudible to a valve press, so that half of feel waits for the microphone.

## Short notes and the instrument's own speech (2026-09-03)

The player wrote a rhythm and it *"[didn't] come out as expected… the
notes being too quick/short for (especially the tuba) to be able to
sound them"*, and asked whether that was a limit of the samples. It was
not; it was two faults in the sampler, both measured:

- **The release tail did not scale.** A fixed 120ms fade is a fine shape
  for a crotchet and ruinous for anything short: at 120bpm a semiquaver
  lasts 115ms, so the fade began before the attack finished and the note
  had *zero* milliseconds at full volume. The tail now takes at most a
  third of a note (`releaseFor`), so every note keeps a majority of
  itself, and long notes are untouched.
- **Short notes played the instrument's bloom instead of its pitch.**
  The shipped recordings reach full volume 115–245ms in — low brass
  slowest, the tuba worst — so a note shorter than its own attack was
  over before the instrument spoke: breath, no pitch. A short note now
  joins the recording where it has already bloomed (`joinsAtBloom`), the
  same door `spokenAt` opens for a late re-attack, opened here for a
  different reason. The threshold is the sample's own bloom rather than a
  figure: a note that cannot contain its instrument's attack does not
  get it.

**What is genuinely a limit**, and is not being papered over: the colour
of a real attack cannot be heard in a note shorter than the attack. What
the fix buys is the *pitch* arriving — the player hearing which note it
was and when — which is what the mode is for.

## Open, and named so they are not forgotten

- **The clip recordings**: who records them is settled (the player); when is
  not. Nothing sounds until they exist — the ear rule, satisfied by
  construction.
- **Rounds per stage, and whether stage 3 exists** — settled by playing.
- **Tolerance tightness in rhythm mode** — the player's ear, with the
  constant named and findable.
- **The spine's ordering** — proposed above from standard pedagogy, awaiting
  the player's veto first and the skill store's evidence after. The exact
  pattern list within each stage is still a list to write.
- **Whether the demonstration repeats a fixed count or until the player
  starts** — the second needs the engagement machinery to notice a first
  press; the first is simpler and probably right.
- **Metres beyond 4/4 and 3/4 in the first library** — the mapping supports
  any metre the app writes; the clip set caps the beat numbers spoken.
