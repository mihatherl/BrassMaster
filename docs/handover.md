# Handover — 2026-08-20/21, the sessions that built the corpus pipeline

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
| `handover.md` — this file | ~260 | Now, all of it |
| **`roadmap.md`** | 460 | **Now, and before proposing any feature.** What the product is, what is deliberately not on it, and § *Where the corpus actually is* |
| `../CLAUDE.md` | ~60 | Now. The seam, and which remote is which |
| `handover-2026-08-19.md` | 222 | For the product decisions that predate the corpus work |
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

**v2.27.0, pushed to origin and green.** 1,332 tests across 65 files.

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

**Tests that name what the corpus holds break every time it moves.** Three in
one file, three separate times. They now search for what they need — a theme
whose length is not the composer's, a pair at one level in different metres.

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
heard:

| | |
|---|---|
| 8 nursery tunes | written from memory; the Old MacDonald risk is live |
| 10 Bach themes | 5 inventions, Sheep, the Air, the Prelude, 2 fugue subjects |
| 14 nine-eight cells | rests inside the bar |
| tempos | set on compositions, adjusted on anything that sounds wrong |

**48 of 68 themes are playable**; the rest are unheard. Bach is down to two.

**The reclassification the player approved but which has not run.** Difficulty
should be judged on *seconds per note* rather than beats, now that themes carry
tempo. Do it as a dry run first — whole corpus, old level against new, with
note rates — before changing a label.

**Three gaps in the difficulty model, all the same shape.** It measures whether
a property *appears*, not how much of it there is. Fixed for note length
(`readingFloor`). Still open for **accidentals** — the Musical Offering is
chromatic in every bar and sits at easy — and for **leap density**, though the
corpus is already sorted correctly on that axis and the sheet now shows it.
Note that per-level `maxInterval` must *not* become a ceiling: twenty of
sixty-eight themes exceed their level's figure, including Twinkle.

**Repetition is invisible to the model.** A piece that repeats one figure is far
easier to read than one that does not at the same note rate. Measured but not
acted on; it would have made the Prelude worse, not better.

**Unbuilt, and on the roadmap:** run length following the material rather than
counting four themes; complete inventions now that within-bar ties work; the
variation engine; two-voice play-along, for which the inventions are already
two voices in two tracks.

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
