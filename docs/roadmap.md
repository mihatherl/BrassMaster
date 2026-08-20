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

**What this immediately exposes** is bigger than a missing chart. The app has
no memory of a session, proposes nothing, and cannot say whether anyone is
improving. Its entire pedagogy is printing fingerings and biasing generation
toward notes you got wrong. There is no guided repetition, no progression, no
continuity between sittings and nowhere to say what you are aiming at. **That
gap is Phase 1, and it is the largest thing on this roadmap.**

## 3. What is free and what is paid

| | Free — the web app at brassmaster.net | Paid — the App Store app |
|---|---|---|
| Generated material | everything: all keys, difficulties, materials, endless play, paged and scrolling reading, weak-note drilling | the same |
| The band around you | metronome, conductor, tempo dial, key dial, reference tone | the same |
| Teaching you | — | **Teacher mode**: goals, guided sessions, a progression that remembers between sittings, and reporting |
| Input | the on-screen valves | **the microphone** — you play, it listens |
| Intonation | — | **the tuner**, which knows which slide to move |
| Your own music | — | **My Music**: MusicXML import at all, and everything built on it |

**The line, stated once:** the free app hands you music to read and judges it
honestly. The paid app **teaches you, hears you, tunes you, and plays your own
music.**

**Teacher mode being paid also dissolves a problem rather than solving it.**
The worry was that someone who practised on the free web app and then bought
the App Store app would arrive with an empty history — the worst first five
minutes for the only person who pays. But the difficulty was never the missing
data; it was the broken promise. History that the app was visibly keeping and
then loses feels like a fault. A history that never existed, because the
coaching is what you just bought, is simply the deal. Nothing has to migrate.

**Drawn at build time, never at runtime.** `__HAS_MICROPHONE__`,
`__HAS_MY_MUSIC__` and a flag for teacher mode — one per feature so any of them
can cross the line with a one-line edit. The free build does not *contain* the
paid code, and `npm run check:web` fails the deploy if it ever does. See
`v3-library-plan.md` for why a runtime flag was retired.

## 4. The phases

Each is useful on its own and roughly in dependency order. Versions are
indicative, not promises.

### Phase 1 — Teacher mode, the coach (paid; no Mac needed to build it)

**Knowing what the player can do, deciding what comes next, and remembering
between sittings.** This is what turns a practice tool into something worth
returning to and paying for, and it is where the product is thinnest today.

**Paid, and behind its own build flag** like the microphone and My Music, so
the free bundle does not contain it. That is what makes the free-to-paid move
painless: see § 3.

**1.1 Model skill, not just pitch.** ~~To build~~ — **built 2026-08-19**: `exercise/attributes.ts` labels each note and `storage/skills.ts` tallies the verdicts against those labels, recorded from every run. Nothing reads it yet; 1.2 onwards do. The ruling is in `v2-design.md` § *What made it hard, not which note it was*. What follows is why it was needed.

`storage/stats.ts` records
`{ attempts, correct }` against a MIDI note, per instrument and clef, decayed
so recent work dominates. That is the app's whole memory, and it collapses
every dimension of difficulty onto one. It can say you miss C♯5; it cannot say
that dotted rhythms cost you a fifth of your accuracy, that you hold together
until a leap passes a fifth, or that flat keys are where you come apart.

The taxonomy needed to fix this **already exists and nobody has to invent it**:
`exercise/difficulty.ts` parameterises every exercise by range, maximum
interval, accidental chance, rest chance, tie chance and a weighted rhythm
pool, and the settings add key, key set, metre, tempo, register and material.
Every exercise is already a point in a skill space. What is missing is the
join: the exercise knows what it asked for and the judge knows what happened,
so attribute each judged note to the properties that produced it — its
duration, its interval from the note before, whether it was accidental, where
it sat in the bar — and the run's context alongside. That single change turns
the stats store into a skill model, which is the input everything below needs.

**1.2 The ladder: repeat the challenge, not the music.** ~~To build~~ — **built 2026-08-19**: `exercise/ladder.ts` (rules) and `storage/ladder.ts` (position), behind `__HAS_TEACHER__`, with the mastery thresholds as named constants awaiting real practice data. No screen reads it yet; 1.4 wires it up. Ruling in `v2-design.md` § *Hold the challenge, vary the music*. What follows is why.

Guided repetition
looks as though it contradicts § 2 — sight-reading means *unfamiliar* material,
and replaying a passage until it is clean is technical practice, not reading.
It does not contradict it, because of something only a generator can do:
**hold the parameters and vary the material.** The player never sees the same
music twice, so it is genuinely sight-reading, while the difficulty stays put
until it is mastered. Then **exactly one parameter moves.**

One at a time is not merely gentler; it is what makes the measurement mean
anything. If one thing changed and accuracy dropped, the cause is known. Change
three and the result is uninterpretable. Literal repetition stays available for
consolidation — exercises rebuild from their seed, and *Repeat* already does
it — but it is the exception, not the ladder.

Still to settle: **the mastery criterion.** Something of the form "accuracy at
or above X% across N runs at these parameters", chosen so a bad day does not
demote anyone and a lucky run does not promote them.

**1.3 Goals as a standard to reach.** ~~To build~~ — **built 2026-08-19**: a goal is a `Rung` on the progress document, with `distanceTo`, `progressToward` and the ordinal arithmetic behind them in `exercise/ladder.ts`. No screen sets one yet; 1.4 does. Ruling in `v2-design.md` § *Hold the challenge, vary the music*. What follows is why.

A goal is a target point in the same
space: *play this standard, at this tempo, cleanly*. The coach plots the
distance from current ability and shows what remains.

The open question, and it is a real one: **whose standard?** Recognised grades
— AMEB here, ABRSM or Trinity elsewhere — mean something to a learner and to
their teacher, and "practise Grade 4 sight-reading" is a marketing line the
app's own ladder can never match. But it is a claim you have to back against a
syllabus: key range, metres, rhythms, length and tempo per grade. **Recommend
building the app's own ladder first** — it is needed either way, it makes no
claim it cannot support, and grades can be calibrated onto it later once there
is something to calibrate.

**1.4 Two front doors.** ~~To build~~ — **built 2026-08-19, v2.26.0**: `HomeScreen` and `PracticeScreen`, behind `__HAS_TEACHER__`. The course now actually drives a run and records the result. Ruling in `v2-design.md` § *Two doors, and a screen that shows its working*.

A guided path and the current free-driving app, given
equal billing on the way in.

**Keep the phone's course UI light.** See the course, see the step, capture a
new step from the settings screen — the full editor (rearranging, renaming,
setting bands and thresholds across a long course) is a desktop-shaped job and
belongs on the served page of § 5.2. Building it twice, and building the hard
half on a handset first, is the thing to avoid. The app opens on a settings screen today; it
should open on a choice. *Practice* leads to a planned session; *Free play*
leads to the settings screen exactly as it is now. Neither is the poor
relation, and the guided path must never become the only way to reach a
control.

**1.5 A session, with continuity.** ~~To build~~ — **built 2026-08-20, v2.27.0**: `storage/sessions.ts`, with the practice screen opening on what happened last time. A *planned* multi-part session (warm-up, then the weak thing, then new reading) still waits on levels carrying varied material. What follows is why.

There is no session concept at present —
each run is independent and nothing survives it but note stats. A session needs
a plan (warm-up, the thing that went badly last time, new reading), the runs
within it, a summary at the end, and a next session that knows what this one
did. *"Focusing a bit on what you achieved last time"* is the requirement, and
it is what makes the app worth opening on a Tuesday.

**1.6 Reporting.** ~~To build~~ — **built 2026-08-20, v2.27.0**: `ProgressScreen`, reached from Practice. Falls out of 1.1 almost for free once outcomes are attributed:
what improved, what did not, where the player sits against the goal, and the
trend over weeks. It is the visible half of the coach and the half that sells.

**1.7 History lives on the phone, and nowhere else.** No server, no accounts —
see § 6 for the full reasoning, which is now written down so it need not be had
again. Teacher mode being paid means there is no web-to-app migration to
build: the free app never kept a coaching history, so none is lost.

What remains is making the history durable on the device that holds it. In the
native app, keep it as **a file in the app's Documents directory** rather than
in `localStorage`: it then rides along with the phone's own backup, survives a
reinstall and a new handset, and appears in the Files app for anyone who wants
a copy — all of it Apple's problem rather than yours.

Whatever the store, **write it as one versioned, mergeable document** rather
than scattered keys. That costs nothing now, makes export and import a few
lines if ever wanted, and is the only thing that would keep a server possible
without a rewrite should the ruling in § 6 ever be revisited.

**1.8 Material to feed it.** The theme composer's stages 2 and 3, parked
pending "the player's ear on the shape first". Unfamiliar material is the raw
material of the entire product, so that parking is now on the critical path.

**1.9 The v2 fixes that touch reading**: the key-change collision on the
scrolling line, the settings screen overflowing on a 360×740 phone, leaps per
instrument rather than per difficulty.

### Phase 2 — The microphone (paid; no Mac needed to build it)

The honest version of the exercise: the player plays, the app listens.

**2.1 The cents measurement** on a real instrument — how stable is a held note,
and how long a window does a trustworthy reading need. Decides what the
tuner can promise.

**2.2 The detector in TypeScript**, behind `PlayerInput`, against `spikefiles/`.

**2.3 Microphone as an input mode**, in every material.

**This whole phase is buildable without a Mac**, which matters given the
hardware is deferred. The seam (`PlayerInput`) is cut, the detector is
TypeScript that runs identically in a PWA and in a native shell, and it can be
tested on a real phone today over Tailscale with
`npm run build:app && npm run preview -- --host`. The pitch spike already runs
correctly in installed-PWA mode on iOS, confirmed 2026-08-19, so the largest
risk the container spike was meant to retire is already mostly retired.

### Phase 3 — The tuner (paid)

**3.1 Per-instrument slide data** in `domain/instruments.ts` — as data, not
prose.

**3.2 The tuner**, which must refuse to draw a conclusion from any note where
`Fingering.usesFourth` is true. See `app-store-plan.md`; this is the trap
most likely to ship quietly wrong.

### Phase 4 — Ship it (Mac and enrolment needed here, and not before)

**4.1 The container spike** — the wrapper, the microphone inside it, and an
embedded HTTP server proving it can serve a page and take an upload.

**4.2 The native shell**, `VITE_TARGET=app`, App Store submission.

**4.3 v3.0 ships with** everything free, plus the microphone, the tuner, and My
Music as it stands today.

### Phase 5 — My Music becomes the reason to buy (paid)

**5.1 The phone-hosted library.** The phone runs an HTTP server; a laptop
browses to it and manages MusicXML files in folders; the same folder
structure appears in the app. This is the VLC model and it is a selling
point, not plumbing. Note that `folder` returns to `PieceRecord` — what
`v3-library-plan.md` deprecated was mirroring a *desktop* library, and its
core ruling (the phone owns the library) is exactly what this is.

**5.2 The served page is the app's big-screen companion, not a file browser.**
Realised on 2026-08-19 and worth planning for from the start: once the phone
serves a page to a laptop, *anything fiddly on a phone can live there* —
authoring and rearranging courses, reviewing progress over weeks, editing
settings that are cramped on a handset. Authoring is a desktop-shaped job
(keyboard, whole course visible at once); practising is a phone-shaped one.

Nothing about the architecture changes: the page is served by the phone over
plain HTTP on the LAN, the data stays on the phone, and there is still no
server of ours, no account and no mixed-content problem. The laptop is a view,
not a copy.

**The division that falls out**, and it should shape how much phone UI gets
built:

| On the phone | On the laptop |
|---|---|
| Capture a step from the settings screen — you have to *hear* it to know it is right | Arrange, rename, reorder, set tempo bands and thresholds |
| Practise | Review progress; import and export a course file |
| See the course, and where you are in it | Build a long course comfortably |

So the phone's course UI can stay light — see the course, see the step, capture
a new one — and the full editor waits for 5.2 rather than being squeezed onto
a handset first. Mockups of both, drawn against the real tokens, exist from
2026-08-19.

**5.3 Multi-part import**, which the importer does not do today and which
everything below needs.

### Phase 6 — Orchestration, and the band around you (paid)

**6.1 Play along with the rest of the score.** Import a full score, choose your
part, and the app plays the others while you read yours. The player's own
idea and probably the most compelling thing on this roadmap: it turns
reading practice into playing music, which is the difference between a
drill and a rehearsal.

Most of it exists already — the sampler covers four brass voices, the clock
and tempo map are built, the importer parses MusicXML. The genuine work is
multi-part parsing, mixing, and deciding what happens when the player's
part and the accompaniment disagree about where they are.

## 5. Releases, and where things run

### What the free app actually gets

Worth stating plainly, because the phase list hides it: **almost everything on
this roadmap is paid.** Of Phase 1, only the material (1.8) and the reading
fixes (1.9) reach the free app at all; 1.1 is recorded there but shows nothing.
Phases 2 to 6 are entirely paid.

| Roadmap item | Free web app | Paid app |
|---|---|---|
| 1.1 skill model | recorded, invisible | recorded, and read by everything below |
| 1.2–1.7 teacher mode | — | ✓ |
| 1.8 theme corpus | ✓ | ✓ |
| 1.9 reading fixes | ✓ | ✓ |
| 2 microphone | — | ✓ |
| 3 tuner | — | ✓ |
| 5 phone library | — | ✓ |
| 6 orchestration | — | ✓ |

That is a deliberate consequence of the free/paid line in § 3, but it means the
free app stands still for a long time while the paid one grows. It is the same
risk named in § 7 — *whether the free app has any reason to come back
tomorrow* — seen from the other end, and it is the argument for eventually
letting something across the line. **Anything built for the free app should be
recorded here as it is decided**, or the answer to "what did the free app gain
this year" will be "nothing" without anyone having chosen that.

### Versions

**One codebase, one version number, both builds carrying it.** The version
identifies the code, not the feature set, so the free app's version rises when
a paid feature lands and nothing it shows has changed. That is correct and
should not be "fixed".

| | |
|---|---|
| **v2.x** | now until the App Store. Paid features land here as **minors** — the codebase gained a feature even though only one build exposes it. Free-app work lands here too. |
| **v3.0.0** | **the App Store launch.** A major, on the repository's own rule that majors mark a change of category: one product becomes two, and one of them is sold. |
| **v3.x** | after launch — the phone-hosted library (Phase 5), then orchestration (Phase 6). |

#### The corpus has its own number

Decided 2026-08-20, from the observation that *"doing this would run the
versioning of the product upward in itself"* — a fair objection, because the
release number is a promise about **behaviour**, and accepting a batch of cells
changes none of it. Material is a second axis and gets a second number:
`2.27.0 · corpus 1`, shown together in Settings.

`CORPUS_REVISION` in `exercise/corpus.ts` is set by hand, since it is the number
a person cites. A hand-set number drifts, and a version that silently lies about
its contents is worse than none because it is believed — so each revision
records the digest of the material it described, and the suite fails the moment
they disagree, naming the number to bump and the digest to write. The hand-set
number stays human; the derived one keeps it honest.

**The corpus is the accepted cells** — what a player is actually handed, from
which `compose.ts` builds every tune. Deliberately not `themes.ts`,
`tunes-traditional.ts` or `tunes-borrowed.ts`: none is imported by the app or
enters a bundle, so counting them would make the number describe the repository
rather than the build. A candidate is not material until it has been heard.

Phase 4 is what v3.0.0 *is*, so it earns no minors of its own.

### Where each build runs

| Build | Where | Who can reach it |
|---|---|---|
| `web` | **brassmaster.net**, GitHub Pages, deployed by CI on every push to `main` | everyone |
| `app` — development | **the tailnet**, served from the desktop | your own devices |
| `app` — beta | **TestFlight**, from Phase 4 | testers you invite |
| `app` — release | **the App Store**, from Phase 4 | customers |

**brassmaster.net must never serve the `app` build.** It is not a policy but a
mechanism: the deploy workflow builds `web` and `npm run check:web` fails it if
paid code is present. Nothing needs remembering.

### Testing the paid build, today

The tailnet already does this and needs nothing built. HTTPS is required — a
PWA will not install or run a service worker without it — and Tailscale issues
a real certificate for the machine's own name, so an install from it behaves
exactly as one from brassmaster.net would.

    npm run build:app && npm run preview        # serves on 4173
    tailscale serve --bg --https=8445 http://localhost:4173

Then open `https://<machine>.<tailnet>.ts.net:8445` on the phone and add it to
the home screen. It is reachable only by devices signed into the tailnet, which
is the gating — no login screen, nothing published, nothing to leak. Ports 443
and 8444 are already in use on the desktop, hence 8445.

**This is also the only honest way to test the microphone work**, which needs a
real handset and a real instrument rather than a simulator.

A gated *public* beta — band members who are not on the tailnet — is a
different problem and does not arise until there is something to give them. Do
it with TestFlight from Phase 4, not by publishing a web build; Cloudflare
Access on a subdomain is the fallback if web testers are ever needed sooner.

### One codebase, and never a fork

**A change to the free app is not a special kind of change.** It is an ordinary
commit to shared code, and it reaches both builds because nothing hides it. A
paid feature goes behind its flag and reaches one. The only decision per change
is *free, paid, or both*, and it is expressed by whether a flag goes round it —
nothing is cherry-picked and nothing is merged between lines.

**Forking the free and paid apps would be a mistake**, and this project already
holds the cautionary example: `BrassFingeringTrainer` is a fork, and it is
frozen, because a fork you maintain is a codebase you pay for twice. Two live
ones would mean every bug fixed twice with one eventually forgotten, tests
passing on one side while rotting on the other, versions drifting apart, and
merges becoming archaeology. It is the same argument that retired the runtime
tier. A fork is right only when one side is being abandoned, which is exactly
what that one was for. Feature branches are a different thing and are fine: a
branch converges, a fork diverges.

**Where the builds must behave differently, use a conditional at the
composition root, not a divergent component.** The established pattern is
`SettingsScreen`'s optional `onImport`: `App` passes it only in the build that
has My Music, and the screen itself knows nothing about any flag — the absence
of the callback is the whole instruction. That keeps components testable from
both sides in one run, which is how `target.test.tsx` covers both without two
builds. The same applies to the larger divergences coming: the paid app opening
on a choice between *Practice* and *Free play* while the free app goes straight
to the settings screen is one conditional, not two apps.

**A known, accepted oddity:** every push to `main` deploys the free app, so
paid-only work redeploys brassmaster.net with nothing a free user can see, and
`autoUpdate` gives them a quiet reload for it. Cheaper to live with than to
engineer around.

### Where the iPhone app is built from

**Recommendation, not yet ratified:** the native shell lives in **this
repository**, in an `ios/` directory, sharing the version, the gate and the
history. A separate repository would let the shell and the web build it wraps
drift apart, and they are one product with one version number.

Two consequences to plan for: **signing certificates and provisioning profiles
must never be committed** — this repository is public, so they belong in GitHub
Secrets; and macOS runners are free for public repositories, so the release
build and upload can be automated without owning a Mac, even though developing
the shell cannot.

## 6. Not on the roadmap, and why

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
- **Accounts, backends, network at runtime.** Proposed properly on 2026-08-19
  — a server behind both apps, sign in with Google or Facebook, history kept
  server-side — and declined the same day after costing it out. The reasoning,
  so nobody has to rediscover it:

  - **The hard part is not auth or a database, it is staying offline.** The app
    works with no network today, and it has to: practice rooms and band halls
    have bad signal, and a reading app that stalls waiting for a server is
    broken. Adding a server to an offline app means queued local writes, merge
    and conflict resolution — the same "synchronised pair is a much larger
    project" that killed the desktop-mirror design a day earlier, but against
    every device rather than two in a room.
  - **A server is a permanent obligation.** Once a player's history lives on
    it, it can never be taken down without destroying their data. Hosting is
    cheap; the commitment is not, and it cannot be handed back.
  - **Social login drags in more than it looks.** App Store Review Guideline
    4.8: using Google or Facebook to create a primary account obliges you to
    offer an equivalent privacy-preserving option too. The exemption is for
    apps using only their own account system.
  - **Children.** "Any brass learner" includes school beginners under 13.
    Accounts for them engage COPPA and its equivalents, and the mitigation —
    an age gate refusing under-13 signups — is a compliance posture you own
    forever.
  - **It would cost the privacy label.** *Data Not Collected* is true today and
    is a genuine differentiator, alongside a mandatory privacy policy and GDPR
    duties for any European user.
  - **And the decisive one: accounts on the free app are all obligation and no
    revenue.** A server earns its keep when it enables income — subscriptions,
    teacher dashboards, a paid web tier. The chosen model is paid up front on
    the App Store, which is precisely the model that does not need one.

  **What would reopen it:** an ambition to run a business rather than sell an
  app. If recurring revenue, teachers managing students, or a paid web tier
  ever become the goal, the server is the foundation and retrofitting it is
  worse than building it. That is a different product from the one this
  document describes. Ruled out 2026-08-19: *"I don't think my ambition is a
  business."*

  **Kept cheap in the meantime:** the progress document is versioned and
  mergeable (§ 1.7), so this stays an addition rather than a rewrite. And if
  the want is really *analytics* rather than accounts — knowing whether people
  return and where they give up — anonymous aggregate telemetry gives most of
  that for a fraction of the burden, with no identity, no login and no
  children's-data problem. Not currently planned, but it is the cheaper answer
  to that question and should be considered before a server ever is.
- **A teaching platform.** No assignments, no multiple players per install, no
  progress shared with a tutor. A different product.
- **A score reader or navigator.** Import unfolds repeats into a straight read;
  scanning is not this app's problem.
- **A notation editor.** Correction belongs in MuseScore.
- **Android natively.** The PWA already serves Android well. See the reasoning
  recorded 2026-08-19: Google closes dormant accounts, Play does not reserve
  names, and the free web app is already installable there.

## 7. Open questions, named so they are not forgotten

- **Chromaticism does not count toward difficulty, and it should.** Found
  2026-08-20 by measuring the royal theme of *The Musical Offering*: written
  down as hard, measured as **easy**. `validateTheme`'s "no harder than the
  level below" check asks whether a theme does anything that level never does,
  and accidentals are tested as a *yes or no* — so once the level below allows
  any accidental, a subject chromatic in every bar and one with a single
  passing note are indistinguishable. Note length, widest leap and span are all
  measured as quantities; chromaticism alone is not, and it is the thing that
  actually makes that subject hard to read. Wants an accidental *rate* beside
  the others.
- **Two-part counterpoint is the play-along material, and the format cannot
  hold it.** Raised 2026-08-20: fugues and the Two-Part Inventions are two
  independent lines of equal interest, so the app could play one while the
  player takes the other, and then swap. That is Phase 6's orchestration
  arriving from a completely different direction — and better than it, because
  an accompaniment part is dull to play where a countersubject is not. A
  `Theme` is one voice; this needs either two linked themes or a second voice
  on one, and the decision wants making before any counterpoint is transcribed.
- **~~The Two-Part Inventions need a converter, not a transcriber.~~** Built
  2026-08-20 as `tools/midi-to-theme.mts`: reads a public-domain MIDI, spells it
  with the app's own `spellInKey`, and emits `Theme` degrees. It refuses to
  choose a key — a MIDI key signature is wrong or absent often enough that
  obeying one would put wrong accidentals into the corpus silently — but reports
  what the file claims, so a caller's guess becomes a check. It also names which
  cuts could be themes, since both ends must be tonic, mediant or dominant and
  where to cut is a judgement no tool should make.

  Every fault it has had was found by running real music rather than by
  reasoning about it, and all were the same shape: **right notes on wrong
  beats**, which reads as a subtly odd piece rather than as an error. Rests
  dropped (a voice resting while the other states the subject); a file declaring
  3/4 and filling it with triplets where the music is 9/8. Assume more of that
  shape, and keep the ear in the loop — the converted output goes on the review
  sheet like everything else. Nothing in the app imports the borrowed corpus.

  Still open: the app parses MusicXML in `import/` but yields pitches rather
  than degrees, so a MusicXML path would need the key read back out. Mutopia's
  LilyPond is unread. Of the fifteen inventions there, **eleven are plain public
  domain and four (BWV 772, 777, 780, 783) are CC BY-SA**, which a paid app
  cannot use.
- **Whether a variation engine can be trusted.** Raised 2026-08-20 from
  listening: *"things that might mathematically seem like variations don't seem
  to land properly."* A transformation that is formally a variation —
  arpeggiate, ornament, diminish — is not necessarily *heard* as one, and the
  difference is not recoverable from the notes. So a variation engine needs the
  same ear in the loop the corpus now has, and its output belongs on the review
  sheet beside its source before any of it reaches a player. Tradition offers a
  clue: Twinkle, Baa baa black sheep and the Alphabet Song are one contour with
  three rhythmic settings, so what survives may be **rhythmic and ornamental
  rather than contour-altering**. A hypothesis to test, not a rule.
- **The mastery criterion.** How much evidence promotes a player, and how much
  demotes them. Gets the whole ladder wrong if it is wrong: too strict and it
  never advances, too loose and it advances past them. Wants measuring against
  real practice rather than choosing from an armchair.
- **Whose standard a goal names** — *the mechanism is settled, the content is
  not.* Ladders became data on 2026-08-19, so a graded ladder is an entry
  beside the app's own rather than a rewrite. Two things still stand in the
  way, and neither is data entry: the generator cannot yet take per-level key,
  metre and length constraints, which a grade is largely made of; and naming a
  ladder after a real board implies an affiliation you do not have — the facts
  about what a grade requires are not copyrightable, the board's name is
  another matter. Generic framing ("Grade 1–8") avoids the second entirely.
- **Whose standard a goal names — the original note** — the app's own ladder, or recognised grades
  (AMEB, ABRSM, Trinity). Recommendation in Phase 1.3: build the ladder, calibrate
  to grades later. But grades are the more saleable promise, so this is a
  marketing decision as much as a design one.
- **Whether the coach becomes the app's centre of gravity.** Two front doors is
  the ruling, but a coach that plans your practice is arguably a different
  product from a reading trainer, and the App Store listing has to pick one
  sentence.
- **Whether the free app now has any reason to come back tomorrow.** This is
  the cost of teacher mode being paid, and it is worth watching. With no goal,
  no streak and no sense of progress, the free app is a good tool with nothing
  that says *return*. A player who never feels themselves improving may simply
  drift off and never buy anything. A possible answer that keeps the line
  intact: let the free app show a *little* — this week's accuracy, say — enough
  to build the habit and to prove that tracking exists, while the goals, the
  progression and the planned session stay behind the paywall. Show the value,
  withhold the depth. Not decided.
- **What "teacher mode" is called.** The name is evocative and sells itself,
  but this roadmap also rules out a teaching *platform* (§ 6), and a name
  implying a human teacher's dashboard may set the wrong expectation. *Coach*,
  *Practice plan* and *Guided* are the alternatives.
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

## 8. How to use this

- **Before proposing a feature**, check § 2's test and § 6's list.
- **When a feature is built**, tick it here and write the ruling into
  `v2-design.md` in the same release.
- **When something here turns out to be wrong**, change it here and say why —
  this file is meant to be edited, not obeyed. What it must never be is
  silently ignored.
- `v2-design.md` § *The direction* is now subordinate to this file. Where they
  disagree, this is current.
