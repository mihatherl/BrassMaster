# Handover — 2026-08-21/22, the session that finished the corpus and built divisi

You are picking up **one half** of a two-app product, from a parent folder
holding both this repository and its sister. This half is *Brass Master*: the
practice app, free on the web at **brassmaster.net** and — from version 3 —
paid, **on Google Play first and the App Store after it**. The other half turns
photographs of band parts into MusicXML. They meet at one seam.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.** The failure mode of a
two-repository session is reading both test suites into context and having no
room left to think.

The previous handovers are `handover-2026-08-20.md` (the corpus pipeline) and
`handover-2026-08-19.md` (the free/paid split and the fork). Read them only for
the *why* of something this file assumes.

## What to read, and what to leave alone

| | Lines | When |
|---|---|---|
| `handover.md` — this file | ~300 | Now, all of it |
| **`roadmap.md`** | 1,070 | **Now, and before proposing any feature.** What the product is, what is deliberately not on it, and the phases |
| `../CLAUDE.md` | ~60 | Now. The seam, and which remote is which |
| `difficulty-model-plan.md` | 145 | Before touching a level, a tempo or `difficulty.ts` |
| `app-store-plan.md` | 295 | Before version 3 |
| `v3-library-plan.md` | 149 | Before any capture or library work |
| `v2-design.md` | 3,540 | **Never end to end.** Grep it for the noun you are touching |
| `musicxml-import-plan.md` | 477 | Only when touching `import/` |
| `tempo-map-plan.md` | 607 | Only when touching the clock or the conductor |

**Every "why is it like this?" has an answer in `v2-design.md`, and the way to
find it is to grep for the noun** — `grep -n "fourth valve"`, `grep -n "open
note"`. Its headings are a map: `grep -n "^## " docs/v2-design.md`.

## Where this stands

**v2.32.0, pushed, deployed and green.** 1,340 tests across 68 files.

The gate before any push is `npm test && npm run build && npm run lint`, all
three, plus `npm run check:web` when anything touches the build split.

**`npx tsc --noEmit` checks nothing.** The root `tsconfig.json` is
`{ "files": [], "references": [...] }`, so that command silently passes on a
broken tree. Use **`npx tsc -b`**, which is what `npm run build` runs.

**The corpus is 64 of 64 heard**, for the first time since the rule was
written. Nothing is held back. Every nursery tune is now *derived from a
source* rather than written from memory, which closes the last place in the
repository that was still doing that.

## What this session did

**The Bach is whole.** All six Two-Part Inventions and the Prelude in C run to
their own endings, where they used to stop wherever the converter said a cut
would validate — *"some are just artlessly cut off without resolution."* Two
themes left the corpus entirely: the Art of Fugue's subject and the Musical
Offering's royal theme, withdrawn on the ear.

**The nursery tunes were re-read from sources.** Five were cut on the ear and
four of the five came with the same instruction — *"what i'm really asking for
most of the time is a review of the source material."* Old MacDonald and Three
Blind Mice from public-domain and CC0 files on Wikimedia Commons, the Saints
from the ABC in a Wikipedia article, Baa Baa from the LilyPond in another. Two
were then cut anyway: the Air on the G string on the ear, and Three Blind Mice
because no score of it exists anywhere reachable.

**Divisi, roadmap 1.10, built.** A note may carry a second head; either
fingering is accepted; placement needs only one of the two inside the compass.
The Prelude in C ships on it — fifteen bars, in Bach's own register, reaching
the whole band.

**Calibration was redesigned twice.** First the device's own speaker became an
output like any other, with a warning before a session on one nobody has
measured. Then the whole method changed: tapping is gone, and a player now
judges a scrolling scale against what they hear.

**The roadmap gained two rulings**: Android ships before iOS, and orchestration
is two items rather than one.

**And a phone found a bug that had broken the app on every un-updated
WebView.** See *Where I went wrong*.

## The rulings this session added

**A complete piece has the range it has.** `allowWideRange` waives a level's
`rangeSemitones` for one theme, on a person's say-so — the sibling of
`allowWideLeaps`, and for the same reason. What is never waived is the compass:
`realiseTheme` still declines an instrument the theme will not fit, so a wide
piece reaches fewer of the band and the material count says so.

**Divisi is at the octave, and only the octave.** Letting the app take
whichever octave fitted reached one more instrument and printed pairs nearly
three octaves apart, ledger lines running off both ends of the stave. That is a
range check pretending to be notation. Where one octave will not do, the honest
answers are a different instrument or a shorter piece — which is why the
Prelude is fifteen bars and not thirty-five.

**Material that cannot be heard cannot be judged.** Inventions 8 and 10 came
back from a review with no verdict of any kind, because both carry
`allowWideRange`, neither fits an E flat bass in C, and the review sheet
printed "would not fit the instrument" and no music at all. The sheet now draws
such a theme on an instrument that can take it and says which.

**The notation path must hold to old APIs.** It is the one part of the app that
runs every frame and the one whose failure looks like a bug in the music rather
than in the browser. Every fake canvas context in the suite is deliberately
missing `roundRect` so a renderer reaching for a modern method fails there
rather than on somebody's phone.

**Calibration measures a coincidence, not a reaction.** Tapping folded the
touchscreen's own latency into the answer and blamed the audio output for it —
tens of milliseconds on a budget handset, all in one direction. A player now
watches a scale cross the strike line and moves the sound until the two land
together. The display's own lag *cancels*, because the app is not chasing a
physical truth: it is making what you see and what you hear arrive together on
the screen you will be reading from.

**Android before iOS.** Not taste — hardware. There is no Apple device here at
all, so iOS-first spends about AU$1,300 before the first question is answered,
where Android costs US$25 and builds from the Linux machine in the room. iOS is
Phase 4.4 rather than cancelled.

**Orchestration is two things.** 6.1 is other people's parts arriving as a file
— a rehearsal tool, and the one item that would give the parked sister project
a reason to exist. 6.2 is the corpus: the app sounds one line while the player
reads the other. 6.2 is much the smaller and its material already exists.

## Where I went wrong, so you need not

**One missing canvas method took the app down in three ways that looked like
three bugs.** `ctx.roundRect` arrived in Chrome 99; a 2022 Motorola whose
System WebView is older throws on it, and the notation renderer used it to draw
the fingering hint's capsule. So the play surface's frame loop died mid-run
while the metronome played on, paged mode drew nothing at all, and the results
screen's chart threw into React and — with no error boundary anywhere —
unmounted the tree to a white screen. **The suite could not have caught it,
because every fake context in it provided `roundRect`.** There is now an error
boundary at the root, because "it went white" is not a bug report and a line of
stack is.

**I wired one of two construction sites and shipped it.** `LayoutNote` is built
in `render/surface.ts` *and* in `render/system.ts`; the first is the play
screen, the second is the review sheet, the SVG renderer and the engraving
snapshots. Divisi went into the first only, so the reviewer opened the sheet and
saw the Prelude in its true register with none of its offers — the piece at its
least readable. Grep for the type before assuming there is one place.

**I unfolded a round and it ate the repeats.** Recovering one voice from a
three-voice round works by subtracting what the earlier voices are replaying —
and where a phrase *repeats*, voice 1's repeat and voice 2's first statement are
the same notes at the same instant, so the file cannot say there were two. Three
Blind Mice came out with its stutter removed. It sounded almost right, which is
the worst way to be wrong.

**I killed the dev server and did not notice for hours.** A Playwright script I
wrote to reproduce a bug spawns `npm run dev` and kills it on the way out; the
tailnet's `:8450` proxies to a Vite *preview* on 4173, and it went dark. If the
dev site 502s, that is why. It serves a **built** bundle: `npm run build:app`
then restart the preview.

**And a conclusion I drew about the sister project was measured wrongly** — see
its own handover. Two data experiments were run at a step count later shown to
be half of what the model wants, which makes their null results unsafe.

## What is left

**Next, and it is the one the paid app rests on: the container spike (roadmap
4.1).** It was blocked on hardware for weeks and is not any more — there is a
second-hand Moto E32 in the room. Two questions: the microphone inside the real
wrapper *while the reference tone plays*, and an embedded HTTP server serving a
page, taking an upload, and surviving backgrounding. Everything from Phase 2 on
is built on assumptions it tests. **Put Tailscale on the phone first** — the
tailnet is how the dev site and the builds reach it, and the serve is
tailnet-only.

**Ready and needing no hardware: 6.2, two-voice themes.** The shape is settled
— a second voice on one theme, heard and never drawn, the sounding voice chosen
from what `SAMPLE_MANIFEST` can actually reach. The material is already here:
all six inventions are two voices in two tracks in their sources and only the
upper was ever taken, so the second line is one converter run against track 2.
*Erbarme dich* waits on this, and is to be barred as 6/8 rather than 12/8.

**The reclassification is run and not applied.** `npx tsx
tools/difficulty-dry-run.mts` prints the whole corpus, old level against new.
Seconds beat beats — Invention 10's quavers at 140 and Invention 13's
semiquavers at 70 are the same 4.67 notes a second. What stops it being applied
is in `difficulty-model-plan.md`: rate alone moves a fifth of the corpus and
gets a dozen wrong, and **cross-rhythm is on no axis at all** although six of
Medium's themes are made of nothing else.

**Still open, and each recorded where it will be met:**

- The Prelude's two waivers measure the **written** line; taking its offers, no
  leap exceeds an octave. The difficulty model measures the page, and a divisi
  page is not what one player performs.
- Run length still counts four themes rather than following the material: four
  of the Bach collection is 130 bars where four of the written corpus is 48.
- The settings screen overflows on a 360×740 phone — **now reproducible**, on
  the device that will be doing the spike.
- Most written themes carry no tempo, so for them seconds and beats are the
  same number in different units.

## How to work here

Small, complete changes. Run the gate. Write the reasoning into the code where
the next person will meet it — this codebase explains itself in comments that
say *why*, including what was tried and abandoned, and that is deliberate.

**Mutation-test anything that guards.** Change the rule, watch the test fail,
put it back. Everything added this session was: the range waiver, the key-reach
floor, the divisi drawing, the fingering union, the placement rule, the
calibration count, and the movable audio lead.

**Look at the picture.** `npm run themes-sheet` builds the review sheet,
`npm run svg` renders an exercise, `npm run shots` photographs the app at five
viewports. Two of this session's worst faults were invisible to every
assertion and obvious in a screenshot — and one of them was found by the player
looking at the sheet, not by me.

**Push without asking** once the gate is green — standing permission since
2026-08-10 — then confirm the deploy rather than assuming it. **Push `origin`,
never `legacy`.** Tag every version and push with `--follow-tags`.

**Nothing ships to a player unheard.** A theme goes into its collection's
`unjudged` set in the same edit that adds it, and comes out when somebody has
heard it. Completing or re-sourcing a piece makes it a *different* piece: it
goes back in, because a verdict on six bars cannot cover thirty-four.
