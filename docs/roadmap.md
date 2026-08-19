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

**1.1 Model skill, not just pitch.** `storage/stats.ts` records
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

**1.2 The ladder: repeat the challenge, not the music.** Guided repetition
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

**1.3 Goals as a standard to reach.** A goal is a target point in the same
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

**1.4 Two front doors.** A guided path and the current free-driving app, given
equal billing on the way in. The app opens on a settings screen today; it
should open on a choice. *Practice* leads to a planned session; *Free play*
leads to the settings screen exactly as it is now. Neither is the poor
relation, and the guided path must never become the only way to reach a
control.

**1.5 A session, with continuity.** There is no session concept at present —
each run is independent and nothing survives it but note stats. A session needs
a plan (warm-up, the thing that went badly last time, new reading), the runs
within it, a summary at the end, and a next session that knows what this one
did. *"Focusing a bit on what you achieved last time"* is the requirement, and
it is what makes the app worth opening on a Tuesday.

**1.6 Reporting.** Falls out of 1.1 almost for free once outcomes are attributed:
what improved, what did not, where the player sits against the goal, and the
trend over weeks. It is the visible half of the coach and the half that sells.

**1.7 History lives on the phone, and nowhere else.** No server, no accounts —
see § 5 for the full reasoning, which is now written down so it need not be had
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
without a rewrite should the ruling in § 5 ever be revisited.

**1.8 Material to feed it.** The theme composer's stages 2 and 3, parked
pending "the player's ear on the shape first". Unfamiliar material is the raw
material of the entire product, so that parking is now on the critical path.

**1.9 The v2 fixes that touch reading**: the key-change collision on the
scrolling line, the settings screen overflowing on a 360×740 phone, leaps per
instrument rather than per difficulty.

### Phase 2 — The microphone (no Mac needed to build it)

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

### Phase 3 — The tuner

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

### Phase 5 — My Music becomes the reason to buy

**5.1 The phone-hosted library.** The phone runs an HTTP server; a laptop
browses to it and manages MusicXML files in folders; the same folder
structure appears in the app. This is the VLC model and it is a selling
point, not plumbing. Note that `folder` returns to `PieceRecord` — what
`v3-library-plan.md` deprecated was mirroring a *desktop* library, and its
core ruling (the phone owns the library) is exactly what this is.

**5.2 Multi-part import**, which the importer does not do today and which
everything below needs.

### Phase 6 — Orchestration, and the band around you

**6.1 Play along with the rest of the score.** Import a full score, choose your
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

## 6. Open questions, named so they are not forgotten

- **The mastery criterion.** How much evidence promotes a player, and how much
  demotes them. Gets the whole ladder wrong if it is wrong: too strict and it
  never advances, too loose and it advances past them. Wants measuring against
  real practice rather than choosing from an armchair.
- **Whose standard a goal names** — the app's own ladder, or recognised grades
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
  but this roadmap also rules out a teaching *platform* (§ 5), and a name
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

## 7. How to use this

- **Before proposing a feature**, check §2's test and §5's list.
- **When a feature is built**, tick it here and write the ruling into
  `v2-design.md` in the same release.
- **When something here turns out to be wrong**, change it here and say why —
  this file is meant to be edited, not obeyed. What it must never be is
  silently ignored.
- `v2-design.md` § *The direction* is now subordinate to this file. Where they
  disagree, this is current.
