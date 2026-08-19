# Brass Master — the roadmap

*Settled with the player on 2026-08-19, in the first session that asked what
this is rather than what to build next.*

**Read this before proposing any feature.** It exists because development had
been opportunistic — sensible things built quickly because agentic coding made
them cheap — with no statement of what the product is to test them against.
Everything in `v2-design.md` § *The direction* is a backlog. This is the layer
above it, and where the two disagree, this wins.

---

## 1. What Brass Master is

**A practice tool that makes brass players fluent readers.**

It puts music in front of you at a tempo you choose, with a conductor beating
time and a reference tone in your ear, and tells you honestly whether you
played it. Every valved brass instrument, both clefs, offline, no accounts.

**Who it is for: any brass learner**, not only brass band players. Beginners
through advanced, in a band or not, in any genre. That is a deliberate widening
from what the app grew up as — it was built by a brass band player for brass
band use, and the conductor, the key dial and the band's treble-clef convention
all show it. Those stay. They are simply not the reason someone else would use
it.

**Revenue is a goal.** This is a product to be sold, not a private tool. That
decides several things that would otherwise be arguable: the App Store matters,
the free/paid line is load-bearing, and a Mac and the developer membership are
the cost of having a shop rather than the cost of any one feature.

## 2. The core job, and what it settles

**Reading fluency wins when features conflict.** Not fingering knowledge, not
rehearsal preparation, not intonation — those are all served, and none of them
is the tie-breaker.

Operationally, a fluent reader plays **unfamiliar** music **correctly**,
**first time**, **at tempo**, **without stopping**, and **finds their place
again** when they do. Each clause is a design instruction:

| The clause | What it demands |
|---|---|
| unfamiliar | material the player has not seen — corpus breadth and generation variety are product features, not polish |
| correctly | honest judging, and the microphone eventually, because buttons are a proxy for playing |
| first time | no second attempt in the measurement that matters |
| at tempo | progress means holding accuracy as the tempo rises, not accuracy alone |
| without stopping | endless play, and an input that can hear that you *have* stopped |
| finds their place | paged reading, and no cursor to lean on |

**The test to apply to any proposal:** does this make someone a more fluent
reader? A feature that makes practice more accurate but less like reading has
failed the test, however good it is.

**What this immediately exposes:** the app cannot currently say whether anyone
is improving. It tracks accuracy per note and per run; it has no measure of
reading fluency over time. For a product whose promise is fluency, that measure
*is* the product — it is what a player renews for and what a screenshot sells.
It is the largest gap on this roadmap and the least obvious.

## 3. What is free and what is paid

| | Free — the web app at brassmaster.net | Paid — the App Store app |
|---|---|---|
| Generated material | everything: all keys, difficulties, materials, endless play, paged and scrolling reading, weak-note drilling | the same |
| The band around you | metronome, conductor, tempo dial, key dial, reference tone | the same |
| Input | the on-screen valves | **the microphone** — you play, it listens |
| Intonation | — | **the tuner**, which knows which slide to move |
| Your own music | — | **My Music**: MusicXML import at all, and everything built on it |

**The line, stated once:** the free app is a complete practice tool that trains
reading with buttons. The paid app is the one that **hears you play** and
**reads your own music**. Both halves need the phone's hardware or the store,
which is what makes the line honest rather than artificial.

**Drawn at build time, never at runtime.** `__HAS_MICROPHONE__` and
`__HAS_MY_MUSIC__`, one flag per feature so either can cross the line with a
one-line edit. The free build does not *contain* the paid code, and
`npm run check:web` fails the deploy if it ever does. See `v3-library-plan.md`
for why a runtime flag was retired.

## 4. The phases

Each is useful on its own and roughly in dependency order. Versions are
indicative, not promises.

### Phase 1 — Make reading measurable, and feed it (no Mac needed)

The free app is complete but cannot show improvement, and sight-reading needs
material the player has not seen.

1. **A reading-fluency measure.** What it is, is an open question worth real
   thought — accuracy held at rising tempo is the obvious candidate, and the
   stats store already records per-note accuracy per instrument. It must
   survive a bad day and reward a harder attempt over an easy one.
2. **The theme corpus, stages 2 and 3.** Parked pending "the player's ear on
   the shape first"; that parking is now on the critical path, because
   unfamiliar material is the raw material of the whole product.
3. **The v2 fixes that touch reading**: the key-change collision on the
   scrolling line, the settings screen overflowing on a 360×740 phone, leaps
   per instrument rather than per difficulty.

### Phase 2 — The microphone (no Mac needed to build it)

The honest version of the exercise: the player plays, the app listens.

4. **The cents measurement** on a real instrument — how stable is a held note,
   and how long a window does a trustworthy reading need. Decides what the
   tuner can promise.
5. **The detector in TypeScript**, behind `PlayerInput`, against `spikefiles/`.
6. **Microphone as an input mode**, in every material.

**This whole phase is buildable without a Mac**, which matters given the
hardware is deferred. The seam (`PlayerInput`) is cut, the detector is
TypeScript that runs identically in a PWA and in a native shell, and it can be
tested on a real phone today over Tailscale with
`npm run build:app && npm run preview -- --host`. The pitch spike already runs
correctly in installed-PWA mode on iOS, confirmed 2026-08-19, so the largest
risk the container spike was meant to retire is already mostly retired.

### Phase 3 — The tuner

7. **Per-instrument slide data** in `domain/instruments.ts` — as data, not
   prose.
8. **The tuner**, which must refuse to draw a conclusion from any note where
   `Fingering.usesFourth` is true. See `app-store-plan.md`; this is the trap
   most likely to ship quietly wrong.

### Phase 4 — Ship it (Mac and enrolment needed here, and not before)

9. **The container spike** — the wrapper, the microphone inside it, and an
   embedded HTTP server proving it can serve a page and take an upload.
10. **The native shell**, `VITE_TARGET=app`, App Store submission.
11. **v3.0 ships with** everything free, plus the microphone, the tuner, and My
    Music as it stands today.

### Phase 5 — My Music becomes the reason to buy

12. **The phone-hosted library.** The phone runs an HTTP server; a laptop
    browses to it and manages MusicXML files in folders; the same folder
    structure appears in the app. This is the VLC model and it is a selling
    point, not plumbing. Note that `folder` returns to `PieceRecord` — what
    `v3-library-plan.md` deprecated was mirroring a *desktop* library, and its
    core ruling (the phone owns the library) is exactly what this is.
13. **Multi-part import**, which the importer does not do today and which
    everything below needs.

### Phase 6 — Orchestration, and the band around you

14. **Play along with the rest of the score.** Import a full score, choose your
    part, and the app plays the others while you read yours. The player's own
    idea and probably the most compelling thing on this roadmap: it turns
    reading practice into playing music, which is the difference between a
    drill and a rehearsal.

    Most of it exists already — the sampler covers four brass voices, the clock
    and tempo map are built, the importer parses MusicXML. The genuine work is
    multi-part parsing, mixing, and deciding what happens when the player's
    part and the accompaniment disagree about where they are.

## 5. Not on the roadmap, and why

**This section is the point of the document.** Each of these is a reasonable
idea that has been considered and declined; re-proposing one needs a reason
that engages with the reason recorded here.

- **Trombone, and any slide instrument.** Ruled out 2026-08-19: stay valved and
  deepen instead. Worth knowing what it would cost — the engine's model is
  *harmonic series plus something that lowers the pitch by fixed semitones*,
  and slide positions fit that (seven positions, six semitones), so the theory
  is not the obstacle. The *input* is: you cannot express fourth position on
  three buttons. **What would change the answer** is the microphone: judged by
  pitch rather than by buttons, trombone becomes nearly free. Revisit after
  Phase 2, not before.
- **Photo-to-MusicXML transcription.** `BrassMXMLGenerator` is **parked** by
  ruling. Manual import already works, the models clear "worth fixing" rather
  than "right", and the corpus it is trained on forbids commercial use. Not
  deleted, not being improved.
- **The desktop library and sync.** Superseded by the phone-hosted library in
  Phase 5. See `v3-library-plan.md`.
- **Accounts, backends, network at runtime.** The app is offline, private and
  sold once. This is a commercial asset as much as a technical one — no hosting
  to fund, nothing to keep running, no privacy policy — and a subscription for
  content would cost all of it.
- **A teaching platform.** No assignments, no multiple players per install, no
  progress shared with a tutor. A different product.
- **A score reader or navigator.** Import unfolds repeats into a straight read;
  scanning is not this app's problem.
- **A notation editor.** Correction belongs in MuseScore.
- **Android natively.** The PWA already serves Android well. See the reasoning
  recorded 2026-08-19: Google closes dormant accounts, Play does not reserve
  names, and the free web app is already installable there.

## 6. Open questions, named so they are not forgotten

- **What the fluency measure actually is.** The largest unknown in Phase 1.
- **Whether the microphone should be free after all.** For a product whose job
  is reading, playing your instrument *is* the exercise, and buttons are the
  proxy. There is a real argument that the microphone is what makes people
  choose this app and should therefore be how they find it. The flags are split
  so this stays a one-line decision.
- **Whether gating import hides the best feature.** Play-along may be the most
  compelling thing here, and if import is paid, nobody in the free app ever
  sees it exist. A demo, a screenshot or one free imported piece may be needed.
- **Paid up front, or a trial.** `app-store-plan.md` argues up front is far
  simpler — no StoreKit, no receipt check, no network, clean privacy label.
  Still unconfirmed.
- **Whether the App Store seller name being a personal name matters**, given
  enrolment is as an individual.

## 7. How to use this

- **Before proposing a feature**, check §2's test and §5's list.
- **When a feature is built**, tick it here and write the ruling into
  `v2-design.md` in the same release.
- **When something here turns out to be wrong**, change it here and say why —
  this file is meant to be edited, not obeyed. What it must never be is
  silently ignored.
- `v2-design.md` § *The direction* is now subordinate to this file. Where they
  disagree, this is current.
