# Rhythm drills — the voice that teaches the beat

Drafted 2026-08-26 from the player's design, over two sessions of deliberate
requirements work; **ratified by the player the same day**. Read `roadmap.md` § 2 (the core job)
and `course-plan.md` first; this plan is written to be compatible with both,
and § *What the course document must keep optional* below is a constraint on
course-plan phase 2 that must be honoured **before** any course file exists.

**Deliberately not scheduled.** The player raised it now "not because I
necessarily think we should build it now, but because if there are any
architectural decisions that need to be made now to later support it, we
should think about that." This document is that thinking. It does not put
rhythm drills into v3.0.

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
D and E), placed in a comfortable register for the instrument. Each note then
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

**The player records the clips.** It is the ear rule applied to a voice, it is
licensing-clean, and a person counting sounds like teaching where a robot
sounds like a toy. One session with a phone microphone covers a syllable set;
a second counting system is a second session.

The syllable player is **not a `Voice`** — that interface is pitched
(`play(midi, …)`) and a syllable has no midi. It is a sibling of the
metronome: a scheduler that reads the exercise and speaks the demonstration
spans.

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
