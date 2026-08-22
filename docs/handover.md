# Handover — 2026-08-22/23, an unattended night on both halves

You are picking up **one half** of a two-app product, from a parent folder
holding both this repository and its sister. This half is *Brass Master*: the
practice app, free on the web at **brassmaster.net** and — from version 3 —
paid, **on Google Play first and the App Store after it**. The other half turns
photographs of band parts into MusicXML. They meet at one seam.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.** The failure mode of a
two-repository session is reading both test suites into context and having no
room left to think.

The previous handovers are `handover-2026-08-22.md` (the corpus, divisi and the
calibration redesign), `handover-2026-08-20.md` and `handover-2026-08-19.md`.
Read them only for the *why* of something this file assumes.

**This session ran unattended and both halves were worked.** That is unusual
and it shapes what is here: everything below was either named in the previous
handover as the next thing to do, or is a measurement. **No musical material
was added, no feature was designed, and nothing was decided that wanted the
player's ear** — see *What I did not do, and why* before assuming an omission
was an oversight.

## What to read, and what to leave alone

| | Lines | When |
|---|---|---|
| `handover.md` — this file | ~250 | Now, all of it |
| **`roadmap.md`** | 1,100 | **Now, and before proposing any feature.** What the product is, what is deliberately not on it, and the phases |
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

**v2.33.0, pushed, deployed and green.** 1,340 tests across 67 files.
brassmaster.net was confirmed serving 2.33.0 rather than assumed to be.

The gate before any push is `npm test && npm run build && npm run lint`, all
three, plus `npm run check:web` **and now `npm run check:channel`** when
anything touches the build split.

**`npx tsc --noEmit` checks nothing.** The root `tsconfig.json` is
`{ "files": [], "references": [...] }`, so that command silently passes on a
broken tree. Use **`npx tsc -b`**, which is what `npm run build` runs.

## What this session did

**All three "start here" items from the previous handover are done**, and one
of them turned out to be blocked behind a broken gate that nobody had noticed.

**The dev build says so.** `VITE_CHANNEL=dev` names the tailnet copy *Brass
Master — Dev*, with `BM Dev` as the home-screen label, in the manifest, the
`<title>` and the iOS tag. `npm run build:dev` builds it, `npm run
check:channel` proves it both ways, and CI runs the release direction. **The
tailnet preview on 4173 is now serving it** — that was done and verified, not
merely made possible.

**The audio lead reaches 750ms**, rewritten around the measurement that demands
it, and "zero for the phone's own speaker" is gone from all three places that
said it.

**Phase 4.1 now has to measure input latency**, with the round-trip method
written down, and the paragraph that named the tap calibration as the
mitigation for Android's input spread is corrected — that calibration was
removed the same evening it was cited.

**The suite's gate was red and flaky, and is now green.** See *Where I went
wrong* — it is the most useful thing in this file.

**The settings overflow is diagnosed and not fixed**, deliberately. `npm run
shots` gained a `phone-small` viewport (360×740, the Moto E32 in the room) and
the fault is plain in the photograph: `.actions--sticky` is drawn over the tail
of the list, slicing the Advanced panel and covering both credit lines. Nothing
is unreachable and Start stays reachable at every size measured. The fix is a
design choice, recorded in `roadmap.md` § 1.9 and left for you.

**The sister project had a productive night** — see
`../BrassMXMLGenerator/docs/handover-ml.md` § 14. The headline reaches back
here only as a caution about metrics: a census of every non-clean bar found
that **missed barlines cause 2.7% of the damage** while the project had spent
most of its nights on them. *Measure which population you are in before
optimising the total.*

## The rulings this session added

**The channel is not the target, and the default must be the safe one.**
`VITE_TARGET=app` is the tailnet copy's target *and* the paid release's, so a
dev name keyed off it would ship "Dev" to the Play listing. `VITE_CHANNEL` is a
signal of its own and defaults to production, exactly as `VITE_TARGET` defaults
to the free product: in both cases forgetting the variable gives the answer
that is embarrassing rather than the one that is expensive.

**A build-time check should read both ways.** `check:channel` fails a release
build carrying the dev mark — the guard — *and* fails a dev build that has lost
it. Without the second half the check passes for ever the day the rename
quietly stops firing, and two identically named icons come back with a green
tick over them. Both directions were mutation-tested by running each against
the other's build.

**An intermittently red gate is worse than a red one**, because it teaches you
to run it again. See below.

**A measurement outranks a comment that reasons from an assumption.** The
500ms ceiling and "zero for the phone's own speaker" were both written before
anyone had measured a handset; one iPhone had become a rule, and it cost every
Android player a third of a second with no way to correct it.

## Where I went wrong, so you need not

**The gate was already red at HEAD and I nearly pushed on top of it.** `npm
test` was exiting 1 while reporting 1,340 tests passing and naming no failure —
`Errors 5`, and nothing else. `calibration-warning.test.tsx` is the first UI
test to click *past* the "Tap to start" gate that `App.test.tsx` explicitly
stops at ("everything past that needs a real AudioContext"), happy-dom has no
Web Audio, and `beginRun` threw inside a promise nobody awaits — long after the
dialog under test had been drawn and asserted on. **Nothing failed; the suite
did.**

Worse, it was **intermittent**: three runs in five. My first fix stubbed
`AudioContext` per test and unstubbed it in `afterEach`, which made it *more*
intermittent — `unlockAudio` is awaited, so the construction lands on a timer
after the test that started it has finished, and the global had been taken away
underneath a call already in flight. Stubbing once for the file fixed it; eight
consecutive runs are green.

**Two lessons.** A test that passes is not a suite that passes — check the exit
code, not the summary line. And when a fix makes a flake *less* frequent rather
than absent, it is the wrong fix.

**I served the free build to the phone for half an hour without noticing.** The
tailnet preview on 4173 serves whatever is sitting in `dist/`, and every `npm
run build` in the gate overwrites it with a *web* build. So the dev app on the
phone silently lost My Music. **Run `npm run build:dev` after any gate run**,
or the tailnet copy is whatever the last command left behind. This is the same
family as the previous session's "I killed the dev server and did not notice
for hours".

**I could not reproduce the settings overflow for half an hour** because I was
looking for horizontal overflow and measuring the collapsed screen. It is
vertical, it needs a font scale or a shorter viewport to appear at all, and it
was invisible in every number until the screenshot. **Look at the picture** —
that is now three sessions running.

## What I did not do, and why

**6.2, two-voice themes, was not started.** The previous handover lists it as
ready and needing no hardware, and it is the obvious next feature. It was left
alone on purpose:

- its material must be **heard** before it ships, and nobody was here to hear it;
- it is **paid**, so it needs a build-time flag and `check:web` needles of its
  own, which is scope the roadmap entry does not mention;
- it carries genuine **UI decisions** — how the sounding voice is offered, what
  the app says when the player's own instrument cannot reach the line, how the
  swap announces which half it can offer — and those are the player's taste,
  not mine;
- and `realiseTheme` is exactly the code the previous session got wrong twice
  by wiring one of two construction sites.

Half-built, it would be worse than not built. It is still the right next thing
**with the player in the room**.

**The difficulty reclassification was not applied**, for the reason
`difficulty-model-plan.md` already gives: cross-rhythm is on no axis, and
adding one is a musical judgement.

**The `Session` refactor** — pulling `followFingers` and `applyVolume` out —
was not done. It is worth doing *before building on top*, and nothing was being
built on top; it is 945 lines of the most timing-sensitive code in the app and
the suite cannot see the screen it drives.

## Start here

**1. The settings strip.** The fault is photographed and diagnosed; only the
choice is open. `npm run shots -- --viewport phone-small --screen settings`,
then decide whether the strip shortens, stops sticking once the content
overflows, or the screen becomes a grid with the list and the strip as separate
rows.

**2. Then 6.2, with the player.** Everything above.

**3. And the container spike (roadmap 4.1)**, which is unblocked — there is a
second-hand Moto E32 in the room. Two questions: the microphone inside the real
wrapper *while the reference tone plays*, and an embedded HTTP server serving a
page, taking an upload, and surviving backgrounding. **It now has a third**:
the input-latency round trip. **Put Tailscale on the phone first.**

## What is left

- The Prelude's two waivers measure the **written** line; taking its offers, no
  leap exceeds an octave. The difficulty model measures the page, and a divisi
  page is not what one player performs.
- Run length still counts four themes rather than following the material: four
  of the Bach collection is 130 bars where four of the written corpus is 48.
- Most written themes carry no tempo, so for them seconds and beats are the
  same number in different units.
- The reclassification is run and not applied: `npx tsx
  tools/difficulty-dry-run.mts`.

## How to work here

Small, complete changes. Run the gate — **and check its exit code**. Write the
reasoning into the code where the next person will meet it; this codebase
explains itself in comments that say *why*, including what was tried and
abandoned, and that is deliberate.

**Mutation-test anything that guards.** Change the rule, watch the test fail,
put it back. `check:channel` was tested in both directions this way, and so was
the AudioContext stub.

**Look at the picture.** `npm run themes-sheet` builds the review sheet, `npm
run svg` renders an exercise, `npm run shots` photographs the app at six
viewports — `phone-small` is the new one and it is the one that found tonight's
fault.

**Push without asking** once the gate is green — standing permission since
2026-08-10 — then confirm the deploy rather than assuming it. **Push `origin`,
never `legacy`.** Tag every version and push with `--follow-tags`.

**Nothing ships to a player unheard.** A theme goes into its collection's
`unjudged` set in the same edit that adds it, and comes out when somebody has
heard it.
