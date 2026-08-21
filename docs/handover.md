# Handover — 2026-08-20/22, the corpus pipeline and the pieces taken whole

You are picking up **one half** of a two-app product, from a parent folder
holding both this repository and its sister. This half is *Brass Master*: the
practice app, free on the web at **brassmaster.net** and — from version 3 —
paid on the App Store. The other half turns photographs of band parts into
MusicXML. They meet at one seam.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.** The failure mode of a
two-repository session is reading both test suites into context and having no
room left to think.

The previous handover, covering the sessions that made this a product at all,
is `handover-2026-08-19.md`. Read it if you need the *why* of the free/paid
split, the fork from the legacy app, or the App Store plan. This file covers
what has happened since, which is almost entirely about **material**.

## What to read, and what to leave alone

| | Lines | When |
|---|---|---|
| `handover.md` — this file | ~290 | Now, all of it |
| **`roadmap.md`** | 460 | **Now, and before proposing any feature.** What the product is, what is deliberately not on it, and § *Where the corpus actually is* |
| `../CLAUDE.md` | ~60 | Now. The seam, and which remote is which |
| `handover-2026-08-19.md` | 222 | For the product decisions that predate the corpus work |
| **`difficulty-model-plan.md`** | 130 | **Before touching a level, a tempo or `difficulty.ts`.** The dry run of 2026-08-21 and what it found |
| `v3-library-plan.md` | 130 | Before any capture, library or v3 work |
| `app-store-plan.md` | 260 | Before version 3 |
| `v2-design.md` | 2,960 | **Never end to end.** Grep it for the noun you are touching |
| `musicxml-import-plan.md` | 477 | Only when touching `import/` |
| `tempo-map-plan.md` | 607 | Only when touching the clock or the conductor |
| `tunes-plan.md` | 102 | Only when touching the theme composer |

**Every "why is it like this?" has an answer in `v2-design.md`, and the way to
find it is to grep for the noun** — `grep -n "fourth valve"`, `grep -n "open
note"`. Its headings are a map: `grep -n "^## " docs/v2-design.md`.

## Where this stands

**v2.28.0, pushed to origin, deployed and green.** 1,329 tests across 65 files.

The session of 2026-08-21/22 did two things and started a third:

- **Every Bach piece is now whole.** All six Two-Part Inventions and the
  Prelude in C run to their own endings, where they used to stop wherever a
  converter said a cut would validate. Two themes left the corpus — the Art of
  Fugue's subject and the Musical Offering's royal theme, withdrawn on the
  player's verdict.
- **The difficulty reclassification was run as a dry run and applied to
  nothing.** It confirmed the change it was asked to test and found two larger
  things beside it. `docs/difficulty-model-plan.md` is the report; read it
  before touching a level.
- **The generator was un-parked for one night of GPU time**, at the player's
  request, and its results are in `../BrassMXMLGenerator/docs/handover-ml.md`,
  not here.

The gate before any push is `npm test && npm run build && npm run lint`, all
three, plus `npm run check:web` when anything touches the build split.

**`npx tsc --noEmit` checks nothing.** The root `tsconfig.json` is
`{ "files": [], "references": [...] }`, so that command silently passes on a
broken tree. Use **`npx tsc -b`**, which is what `npm run build` runs. This
cost most of a session: tests pass, `tsc --noEmit` prints nothing, and the
build is red.

## What a session here actually looks like

Almost all of it is **material**, and material is settled by ear rather than by
argument. The loop is:

1. Convert or write a tune.
2. Regenerate the review sheet: `npm run themes-sheet`.
3. It is already served at `https://mh-system-product-name.tail5a7373.ts.net:8452/`
   over Tailscale, and the cells sheet at `:8451`, and the dev PWA at `:8450`.
4. **Wait for the player's verdict.** Do not skip this and do not infer it.

The player is a brass band player in Melbourne and the musical authority on
this project. Measurements are evidence for his judgement, never a substitute.
Three times this week a measurement said one thing and his ear said another,
and his ear was right every time — see *Where I went wrong* below.

## The pipeline, and the rules it obeys

`tools/midi-to-theme.mts` reads a public-domain MIDI and emits `Theme` degrees.
**Everything it does is a measurement, and it reports every place it had to
decide** — collapsed chords, off-grid notes, a metre or key the file declares
that disagrees with what it was told, which cuts would validate.

It refuses to choose a key. MIDI key signatures are wrong or absent often
enough that obeying one would put wrong accidentals into the corpus silently.

**Every fault it has ever had was the same shape: right notes on wrong beats,
silent because the wrong value is itself legal.** Rests dropped; a file
declaring 3/4 and filling it with triplets where the music is 9/8; a grid of
twelfths that could not hold a demisemiquaver and rounded every one to a
triplet; notes crossing bar lines untied. Assume there are more.

`--simplify` is the **one** thing in that tool that edits rather than measures,
which is why it must be asked for by name and prints that its output is an
arrangement. It exists for the Air on the G string, which is 13%
demisemiquavers and otherwise unusable.

## The rulings this fortnight added

**Collections, and they are curated by fame.** `exercise/collections.ts` holds
named collections with provenance; a player chooses one or several in Themes.
Bulk ingestion was tried and rejected: two Bach chorales converted perfectly,
validated at easy, and were withdrawn on hearing them — *"I'm not a church
choralist and aren't familiar with the two you put up already."* **A tune the
reader already knows is worth more than a better-made tune they do not**,
because knowing it is what tells them they played it wrong.

**The metre follows the material.** A collection plays each tune in its own
time signature, changing at the joins; the time-signature control disappears
for collections. Composed material still takes the chosen metre.

**A change of metre means two things.** Within a piece it is the composer's and
the note value carries across; between pieces the dial is re-read, because each
tune plays at its own pulse. The seams are the theme starts, which `labels`
names. Get this wrong and a 9/8 tune handing over to a 4/4 one runs half again
too fast.

**Difficulty is what a reader meets most of the time.** `readingFloor` is a
trimmed minimum — set aside the fastest twentieth, take the shortest of what is
left — and both the ceiling and the "earns its level" floor read it. A tie's
continuation is not counted, because nobody plays it. One in twenty was
calibrated against four real pieces, not chosen.

**Themes carry the tempo a brass player takes them at**, seeded from the source
and then brought to this instrument. Note values carry almost no information
about tempo — a median semiquaver is 42 bpm in the Air and 100 in Invention 13
— so it is never guessed. Keyboard sources are keyboard tempos: the inventions
arrived at 85–105 and were brought to 70, about 4.7 notes a second.

**No level above `hard`.** Advanced players have moved on from training apps,
so material that needs one is correctly out rather than waiting.

**Weight new material low.** Target roughly 25/30/25/20 across the four levels.
Medium is thinnest and cannot be filled from nursery tunes, which are beginner
material by nature.

## Where I went wrong, so you need not

**I argued from the wrong axis, twice, about the same piece.** The Prelude in C
measured hard on note rate; then looked easy on repetition, since only two of
its twelve bar-shapes are new. The player watched a tuba player and said
*"mispitching everywhere… the fingering isn't going to be the problem."* On
brass a leap is a partial to find and slot. Its median interval is a fourth
where everything else moves by step. **The review sheet now prints typical leap
beside widest leap**, because widest alone is what misled me.

**I cut it where the tool stopped.** Eight bars, because the converter said the
ends were stable — a melodic test, on a piece with no melody. Reading the
harmony bar by bar found the tonic returning at bar 19. The tool says where a
cut *may* fall; something that understands the music says where it *should*.

**I let unheard material ship for a week.** Three files said a collection's
`unjudged` set was what stood between an unheard tune and somebody's practice,
and it was read by the review sheet and nothing else. Found while checking what
a deploy would contain. `playableThemes` now enforces it — and the cells had it
right all along, because a candidate cell is excluded by `selectCells`.

**A fix overshot and looked like a success.** The browser's `outputLatency`
report was used to floor the audio lead; on the player's machine it exceeded
reality by most of a second, and because that error was about one pulse, the
count-in clicks landed back on the numbers and the overshoot looked like the
earlier fix working. Retracted. Only the tap calibration is trusted.

**I tried to fix a bar by moving other bars.** The Prelude would not come out
whole, and I spent three measurements shifting whole bars into a common
register — align on the opening note, align on the centre, a greedy walk with
seams — before measuring the thing that mattered: **one bar of it spans
forty-one semitones on its own**, because from bar 24 the left hand holds a
pedal while the right hand works two octaves above. No arrangement of bars can
fix a bar. Once that was measured the answer took ten minutes: voice each bar
closely, inside its own octave, which keeps every pitch class and every leap
under an octave. *Measure the unit you are actually failing on.*

**Every whole piece arrived a beat or two short, and for the same reason both
times.** A MIDI file carries no trailing rest, so Invention 8 lost the two
crotchet rests its final bar holds and Invention 10 lost a dotted crotchet. The
converter says so — *"does not fill its bars: 100.000 against 99.000"* — and
the LilyPond source beside the MIDI settles what the bar really holds. This is
the same shape as every fault that tool has ever had: right notes, wrong beats,
legal on their face.

**Tests that name what the corpus holds break every time it moves.** Three in
one file, three separate times. They now search for what they need — a theme
whose length is not the composer's, a pair at one level in different metres, a
pair of compound and simple. It happened again on 2026-08-21 in three more
files, because a completed piece goes *back* to being unheard and an unheard
tune is not offered: the medley silently became one tune and the metre never
changed. Name a property, never a tune.

## Rulings a newcomer breaks

- **Never push to the `legacy` remote.** `BrassFingeringTrainer` is frozen and
  still used by the player's band. Push `origin` only.
- **`BrassMXMLGenerator` is parked** and holds uncommitted work. Do not sweep it
  into a commit.
- **CC BY-SA and CC BY-NC are unusable** in a sold app. Four of the fifteen
  Mutopia inventions are CC BY-SA; KernScores is CCARH, which forbids
  commercial derivatives. Mutopia's `.rdf` states each piece's licence — read it
  before converting.
- **A theme is a shape, not a key.** Do not add a "home key": it solves nothing
  (every theme fits every instrument in every key) and the composer's keys are
  keyboard keys, which would hand brass players sharps they never asked for.
- **Adding a theme means adding its id to `unjudged` in the same edit.**
- **Back up with `cp` before mutating a file**, never `git checkout`.

## What is left

**Waiting on the player's ear** — nothing here should be built on until it is
heard, and after 2026-08-22 that is nearly the whole Bach collection:

| | |
|---|---|
| 8 nursery tunes | written from memory; the Old MacDonald risk is live |
| **10 Bach themes** | six inventions and the Prelude now *complete* rather than cut, plus Sheep, the Air and the Menuett |
| 14 nine-eight cells | rests inside the bar |
| tempos | set on compositions, adjusted on anything that sounds wrong |

**The Bach collection has one heard tune in it** — Jesu, Joy — because
completing a piece makes it a different piece, and a verdict on six bars
cannot cover thirty-four. That is the cost of the rule and it is the right
cost; it also means the collection is thin on the deployed site until the
review sheet has been through.

**47 of 67 themes are playable.** The sheet is at `:8452` as always.

**Three of the whole pieces reach only part of the band.** Inventions 8, 10
and 13 and the Prelude carry `allowWideRange` and get as far as the euphonium
and the two tubas; the guard now asks a declared-wide theme to reach three
quarters of the keys rather than all of them. If the player would rather have
them on every instrument than have them whole, the alternative is measured and
in the code comments: one octave displacement of bars 2–26 brings Invention 8
to twenty-six semitones with seams of nought and five.

**The reclassification, run and not applied.** `npx tsx
tools/difficulty-dry-run.mts` prints the whole corpus, old level against new,
with the rates that decide it. It confirms that seconds beat beats — Invention
10's quavers at 140 and Invention 13's semiquavers at 70 are the same 4.67
notes a second, and the model called one medium and the other hard purely on
how the note is drawn. **Only that one label has moved**, and it moved because
the piece was taken whole rather than because the model changed.

What stopped the rest being applied is in `difficulty-model-plan.md`: rate
alone moves 22 of 69 themes and gets a dozen of them wrong, because a theme
earns its level on whichever axis it is hard on. The player's own reading is
measured there too — that microphone mode and tapping mode are different
exercises — and the corpus agrees, at 48 themes of 69 sitting at a different
level under the two.

**47 of the written themes carry no tempo**, so for most of the corpus seconds
and beats are the same number in different units. Giving them tempos is a
listening job and it gates the rest of this.

**Four gaps in the difficulty model, all the same shape.** It measures whether
a property *appears*, not how much of it there is. Fixed for note length
(`readingFloor`). Still open for **accidentals**; for **leap density**, though
the corpus is already sorted correctly on that axis and the sheet shows it;
and — the largest, found 2026-08-21 — for **cross-rhythm and syncopation**,
which are on no axis at all although six of Medium's themes are made of
nothing else. That is why a rate-only reclassification empties Medium.

Note that per-level `maxInterval` must *not* become a ceiling: twenty themes
exceed their level's figure, Twinkle among them. The dry run bands leaps
separately for exactly that reason, and its four numbers are a brass judgement
that wants an ear rather than more arithmetic.

**Repetition is invisible to the model.** A piece that repeats one figure is far
easier to read than one that does not at the same note rate. Measured but not
acted on; it would have made the Prelude worse, not better.

**Unbuilt, and on the roadmap:** run length following the material — now
pressing rather than tidy, because four themes of the Bach collection is 126
bars where four of the written corpus is 48; the variation engine; two-voice
play-along, for which the inventions are already two voices in two tracks and
now complete on both.

## How to work here

Small, complete changes. Run the gate. Write the reasoning into the code where
the next person will meet it — this codebase explains itself in comments that
say *why*, including what was tried and abandoned, and that is deliberate.

**Mutation-test anything that guards.** Three tests in this repository have
turned out unable to fail, and the ornament tolerance, the corpus digest, the
alignment suite and the collection seam were all mutation-tested precisely
because a guard that cannot fire is worse than none.

**Measure before arguing.** Every disagreement this fortnight was settled by
running the numbers — and where the numbers and the player's ear disagreed, the
ear won, and the numbers turned out to be measuring the wrong thing.
