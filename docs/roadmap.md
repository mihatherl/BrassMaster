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
| Teaching you | one or two bundled taster courses (decided 2026-08-26 — a first-steps course and a late-beginner course, to whet the appetite) | **Teacher mode**: goals, guided sessions, a progression that remembers between sittings, reporting, and the course builder |
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

### Phase 1 — Teacher mode, the coach (paid; no phone or Mac needed to build it)

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

**Reshaped 2026-08-23, in the settings redesign settled with the player.** The
doors stopped being a screen: the interstitial cost every player a tap per
session to answer a question most answer once, so the two ways in became
segments on one home — *Structured Learning* and *Free play*, side by side,
which honours "neither door is the poor relation" more literally than two
doors on a screen nobody wanted to be on. The choice is remembered
(`homeMode`), so each kind of returning player opens one tap from Start. The
same redesign moved everything about *how a run goes* to the Ready gate (see
`ReadyControls` and v2.37.0's commit), made the instrument a chip beside the
title, and filed "favour notes I get wrong" under Sight-reading where it
always belonged.

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

**The settings overflow, diagnosed 2026-08-22 — and it is not lost content.**
At 360×740 with the default font the screen fits *exactly*: content 740 in 740,
no slack at all. Any increase — Android's display-size setting, the browser's
URL bar taking height — pushes it over, and at 115% it is 80pt over, which is
the "70 points" first reported.

What then goes wrong is `.actions--sticky`: it is the last child of the
scroller with `position: sticky; bottom: 0`, so once the content overflows it
is pulled up off its natural place and drawn *over* the tail of the list. At
rest on a 360×640 viewport it covers the Advanced panel from its midpoint down
and both credit lines entirely, leaving the version line poking out below the
Start button. Every one of those is still reachable — scroll to the bottom and
the strip returns to its natural position — so this is a fault in what the
screen *looks like* at rest, not in what it can reach, and Start stays
reachable at every size and font scale measured.

The fix is a design choice and is deliberately not made here: shorten the
strip, stop it sticking once the content overflows, or make the screen a grid
with the list and the strip as separate rows. `npm run shots -- --viewport
phone-small` now photographs it, which is how it was found.

**1.9b Rhythm drills — designed, deliberately unscheduled.** The player's
concept of 2026-08-26, worked through as design-before-build:
**`rhythm-plan.md`** is the record. In one line: a paid material that teaches
the fall of notes as a thing of its own — a counting voice ("1-e-and-a",
recorded clips scheduled like metronome clicks, never runtime speech
synthesis) demonstrates a named pattern over the beat, then the player plays
it on two alternating notes, the scaffold withdrawing in stages. Raised now
for its architectural demands, which are settled and small: unjudged spans
already exist (`acceptedMasks: []`), the skill store already labels `rhythm:`
and `beat:`, and the one binding constraint — course levels whose material
carries no key — is pinned in `course-plan.md` phase 2. **Not in v3.0.**

**1.10 Divisi — two noteheads, all the way through.** ~~To build~~ — **built
2026-08-22, v2.29.0–v2.30.0.** A note may carry a second head, either
fingering is accepted, and placement needs only one of the two inside the
compass. The Prelude in C ships on it, in Bach's own register, reaching the
whole band. What follows is why it was needed.

A brass band part prints divisi constantly, and the app has never been able to
hold it: `Exercise` carries one pitch per slot, the renderer draws one
notehead, and the Import screen's "divisi" is not divisi at all — it is a
choice of *which line to read*, made once for the whole part and resolved away
before anything downstream sees it. So the second line is discarded at the
door, and a player who wants the other one re-imports the file.

What forced it is the Prelude. Its arpeggio starts on two low notes that most
of the band cannot reach, and the ways round that are all worse than the
problem: voiced closely it *"looks and sounds strange"*, because the bass has
been lifted into the middle of the figure; left alone it fits the euphonium and
the tubas and nobody else. The ask was the ordinary musical answer — print
both, and let the player take the one their instrument can reach.

The work, in the order it has to happen:

1. **A second pitch per slot** in `exercise/types.ts`, and every producer of
   an `Exercise` deciding what it means.
2. **The renderer**, which draws two noteheads on one stem — seconds offset,
   accidentals stacked, and the stem direction settled by the pair rather than
   by one note.
3. **The judge accepts either**, which is the rule that makes it safe. Octave
   pairs already pass, since the app judges any octave of the right note and
   octave pairs share a fingering; a divisi third does not, and has to be
   allowed explicitly.
4. **The tone and the count**, which need one of the two to sound.
5. **Themes may then carry it** — `ThemeNote` gains its alternative, the
   Prelude is written in its true register with the low notes marked, and it
   comes back to the review sheet.

It reaches the free app, unlike almost everything else here: it is notation,
and both builds read notation. It also pays for itself twice, since the same
mechanism is what lets an imported part keep both lines instead of throwing
one away.

### Phase 2 — The microphone (paid; buildable in the browser, provable only on a device)

The honest version of the exercise: the player plays, the app listens.

**2.1 The cents measurement** on a real instrument — how stable is a held note,
and how long a window does a trustworthy reading need. Decides what the
calibration can promise, and later what the tuner can.

**2.2 The detector in TypeScript**, behind `PlayerInput`, against `spikefiles/`.

**2.3 Microphone as an input mode**, in every material.

**Headphones are all but required in microphone mode — ruled 2026-08-24**, and
the spike had already measured why without drawing the conclusion. The player:
*"I really think headphones are more-or-less required if we are playing an
instrument into this thing. Even if we can hear the metronome, it will be
difficult to hear the instrumental accompaniment. By insisting that headphones
are in use we'll also get rid of the feedback loop from the phone speaker into
the microphone."*

Two independent reasons, and the second is measured:

- **Nothing on a phone speaker survives a brass instrument at playing volume.**
  The click was pitched loud enough to fight one — see `METRONOME_VOLUME_RANGE`
  — and the reference voice was never pitched to fight anything. A player who
  cannot hear the accompaniment is reading against silence.
- **The speaker feeds straight back into the microphone.**
  `../container-spike/FINDINGS.md` § 1: *"the tone bleeds into the microphone.
  The speaker's output arrives back through the mic as a constant baseline"* —
  measured on the E32 with the player's own tuba. § 1 filed that as a design
  input for the detector (notch the reference, gate on level, or choose echo
  cancellation deliberately). **Headphones delete the problem instead of
  managing it**, and a detector that does not have to hear past its own output
  is a materially easier detector.

**"All but", not "strictly".** The app cannot verify headphones — it can read
the *route* in the native shell (`platform/audio-route.ts`, proven in 4.2), so
it knows a wired or Bluetooth output is connected and can say so; it cannot
know they are on someone's head. So: microphone mode asks for them, says why,
and does not refuse to run without them.

**Consequences to settle when 2.3 is built:**

- **The metronome level almost certainly wants to differ by mode**, which the
  player raised in the same breath. It is one global number today. If the two
  modes want different levels, the honest fix is a level per *output* — the
  audio lead is already stored that way in `AudioOutput`, with `routeName`, and
  the shell already switches profiles when the route changes.
- **Bluetooth headphones' own microphone should not be used.** Recorded in
  `FINDINGS.md`: microphone mode "should almost certainly prefer the phone's
  own mic", because a headset mic drops the route to a call-quality profile and
  takes the playback with it.

**2.4 The calibration — "whatever sound is coming out of that instrument is
meant to be an E".** Added 2026-08-24, and it is what the tuner was wrongly
drafted in to do (§ 4.3). Not intonation: a per-player, per-instrument profile
so a heard pitch maps to the fingering the player meant.

**The exercise is a scale, and the reason is mispitching.** The player's ruling:
*"probably a scale, to prevent the possibility of mispitching."* Asked for
isolated notes, a learner can crack onto the wrong partial and the app would
faithfully record a wrong pitch as what their E sounds like. A scale gives them
stepwise context and they know where they are. It also needs no new material —
it is an existing drill, generated by the fingering engine over the
instrument's own `soundingRange`.

**Notes may be skipped.** Anything out of a player's reach is skipped rather
than fudged, which leaves the profile deliberately sparse. Consequences:
a global offset comes from whatever *was* measured, per-note refinements only
where they were; and **which notes were measured is itself recorded**, because
a note never played and a note measured at zero deviation are the same number
and opposite facts — the `AudioOutput.calibrations` lesson, again.

**A cracked note during calibration must be discarded, not learned.** The app
knows what it asked for, so a reading landing nearer a different pitch class is
a mispitch and not a datum: drop it and ask again. This is the third appearance
of one fault — see also the unplayed run and intonation-as-reading-error in
`course-plan.md` — and it is worth naming as a class. **The store must not
learn something false and then act on it.**

**Store the profile in sounding pitch, not written.** `domain/instruments.ts`
holds `transposition` as a `Partial<Record<Clef, number>>`, written→sounding
*per clef*, and bass clef is concert pitch while treble is not. The instrument
is physically the same instrument in either clef, so a profile kept in written
pitch would be silently wrong the day a player switches clef. Keep it in
sounding pitch and convert at the edges. This is where the quiet bug lives.

**2.5 The player's own range, which the calibration measures for free.** The
player, 2026-08-24: *"there is really no point trying to calibrate outside the
player's range, and the limitation on their range should be stored and
remembered in free play mode, at least."*

**The app has never known this.** `Instrument.soundingRange` is a fact about
the *instrument* — what an E♭ bass can do — and every generator decision has
been made against it. What a *person* can play is narrower, sometimes much
narrower, and § 2.4 discovers it as a by-product: the notes they played are
their range and the ones they skipped at the edges are beyond it.

**One funnel carries it everywhere.** `writtenRange(instrument, clef)` is the
single function converting the instrument's sounding range into the written
compass, and every compass decision in the app passes through it — theme
placement choosing "the octave that centres it in the compass", rekeying,
phrase generation, a drill's span, and the picker that offers only the keys
whose placement holds a tune. **A player range applied there reaches all of
them with no call site changed.**

**Which is exactly why it must be visible and revisable**, because the same
reach makes it silent: narrowing the compass quietly changes which tunes are
offered and which keys fit, and a player who cannot see why would experience it
as the app losing material.

- **A range is a measurement with a date, not a fact.** A learner's grows.
  Re-runnable, editable by hand, and never a one-way door.
- **"Can reach" is not "can read fluently at".** The core job is reading (§ 2),
  and material sitting permanently at the top of someone's range is miserable
  practice. `PatternSettings.keepReadable` already reasons this way at the
  easier levels — "hunting for a note four ledger lines below the stave is a
  different skill from the one being practised". So the calibration asks for
  the **comfortable** range: play until it gets hard, then skip.
- **Only skips at the edges say anything about range.** A note skipped in the
  middle is a cracked note or a lapse, not a hole in someone's compass.
- **Per instrument, per player, in sounding pitch** — the same storage rules as
  the profile it comes from.
- **Ruled 2026-08-26: a course overrides the range.** The app says plainly
  that the course exceeds what was measured, and the player judges — proceed,
  or work on the range first. Free play keeps respecting it. The full ruling
  is in `course-plan.md`.

**This whole phase is buildable without a Mac**, which matters given the
hardware is deferred. The seam (`PlayerInput`) is cut, the detector is
TypeScript that runs identically in a PWA and in a native shell, and it can be
tested on a real phone today over Tailscale with
`npm run build:app && npm run preview -- --host`. The pitch spike already runs
correctly in installed-PWA mode on iOS, confirmed 2026-08-19, so the largest
risk the container spike was meant to retire is already mostly retired.

### Phase 3 — The tuner (paid) — **deferred past v3.0, 2026-08-24**

**Out of the launch, and to be reconsidered on its own merits when there is
one.** It was drafted into v3.0 as a dependency of the microphone and is not
one: what microphone mode needs is § 2.4's recognition calibration, which is a
smaller thing with a different purpose. The full reasoning is § 4.3. The tuner
stays worth building — a chromatic tuner cannot say which slide to pull and
this one can — and § 2.4's readings are a subset of what it needs, so deferring
it costs nothing but time.

**3.1 Per-instrument slide data** in `domain/instruments.ts` — as data, not
prose.

**3.2 The tuner**, which must refuse to draw a conclusion from any note where
`Fingering.usesFourth` is true. See `app-store-plan.md`; this is the trap
most likely to ship quietly wrong.

### Phase 4 — Ship it, **Android first** (no Mac needed until 4.4)

**Reordered 2026-08-22**, and the reason is hardware rather than taste. The
player owns no Apple device of any kind — no phone, no computer — so the iOS
path begins with roughly AU$1,300 of Mac mini, second-hand iPhone and
enrolment before a single question is answered, and the enrolment itself is
already stuck, most likely because Apple steers individual sign-up through an
app that only runs on hardware he does not have. Android costs US$25 one-off,
builds from the Linux machine already in the room, and answers the same
questions.

**Nothing about the product changes.** The paid line is still drawn at build
time by `VITE_TARGET=app`, one codebase and one version; Android is a second
store for the same build, not a second product. The free web app stays free at
brassmaster.net.

**4.0 One cheap Android phone**, second-hand, perhaps AU$150. Established
2026-08-22 that there is no Android device either, and the emulator will not do
for this: it answers layout and plumbing questions well and audio questions
badly, which is exactly backwards for 4.1. See *What the emulator cannot
answer* below.

**4.1 The container spike, on Android** — ~~to run~~ **run, 2026-08-23, and
every question answered on glass in one day.** The full record is
`../container-spike/FINDINGS.md`; the wrapper itself is that folder, Capacitor
8 with two small native plugins, built and installed from this machine over
adb. In brief: the microphone runs while the reference tone plays (and the
tone bleeds into the mic — a Phase 2 design input); the round trip is 470ms
dead stable, so input latency is ~100–140ms and calibratable; the in-process
HTTP server serves and takes uploads over the tailnet, is frozen — not killed
— about 7–8 minutes after the phone comes off charge, and thaws intact on
wake, so Phase 5's foreground service exists to survive the screen timeout
and nothing grander; and the OS names the player's own headphones ("Bose
QC45") and signals their connection, which proves the 4.2 outputs-screen
capability. Everything below stands on measurements now, not assumptions.

The spike as originally scoped: the wrapper, the microphone inside it
*while the reference tone plays*, and an embedded HTTP server proving it can
serve a page, take an upload, and survive backgrounding. These are the two
questions the whole paid app rests on, and they can be asked today for nothing.
iOS will differ in the details of the audio session and the local-network
prompt; what transfers is the design, which is what a spike is for.

**And it must measure input latency, not only output.** Widened 2026-08-22.
The two are not the same problem and only one of them has a fix:

- **Output latency is correctable.** Schedule the sound earlier. That is what
  the audio lead does, and calibration now measures it per output — ~330ms on
  the Motorola E32's own speaker against ~20ms on an iPhone 15.
- **Input latency is not.** If the handset hands the app a note 300ms after it
  was played, no amount of scheduling recovers it: the event has already
  happened. Nothing can be honestly confirmed sooner than the app learns of
  it, so the only defensible response is to *know the number* and set the
  confirmation window from it. `v2-design.md` already puts the earliest honest
  confirmation at about 200ms in microphone mode, and that figure was reasoned
  on hardware nothing had measured.

**The measurement is one round trip**: play a click and hear it back through
the phone's own microphone. That gives output plus input in a single number,
and the output half is already known from calibration, so the input half falls
out by subtraction. It costs one page and no hardware beyond the handset the
spike already needs.

**Measured, 2026-08-23, in the real wrapper on the E32: 470ms round trip,
quartiles 470–470.** So input is roughly 100–140ms — and *stable*, which is
the finding that matters: deterministic buffering can be calibrated out of the
judge the way the audio lead is calibrated out of the schedule, where jitter
could not have been. Earliest honest confirmation lands at ~200ms on this
hardware, which is what `v2-design.md` guessed before any hardware existed.
Also measured: `outputLatency` reports **0ms** on this device — the API is
absent in practice, not merely imprecise. The full record is
`../container-spike/FINDINGS.md`, along with 4.1's first question answered
yes: the microphone runs while the reference tone plays, and the tone bleeds
into the microphone as a constant baseline, which is a design input for the
Phase 2 detector.

**4.2 The Android shell and the Play listing.** ~~To build~~ — **built
2026-08-23, v2.46.1, plan to Play in one evening.** `android/` in this
repository per `android-shell-plan.md` (which also ratified § 5's
shells-in-this-repository recommendation): Capacitor 8.5 wrapping the
`VITE_TARGET=app` build, versionCode derived from the package version, the
audio-route capability wired end to end (plugin with change events, one seam
module reading the bridge off `window` so the web bundle stays clean, name
prefill, and the calibration profile following the route), upload keystore
generated and the signed bundle verified, the Play developer account opened
and the app created — **Paid**, AU$14.99 placeholder, `net.brassmaster.app`
— and v2.46.1 installed on the E32 *from the internal testing track*.
Outstanding: the route auto-switch verified with the QC45s on glass, the
keystore backup off the machine, and the finish-setting-up console tasks
(content rating, data safety "no data collected", target audience 13+) that
retire the placeholder listing name.

**And the shell should read the audio route.** Found 2026-08-23: a player
chose the speaker while wearing headphones and heard no change, because no
browser the app runs on can route audio (`setSinkId` is desktop-only) — the
outputs screen declares what is in the ears rather than choosing it, and now
says so. The web app also cannot *name* the connected device: output labels
need the microphone permission and Android Chrome lists no outputs at all.
The native shell can do both, from the OS's own knowledge of the route
(`AudioDeviceInfo` on Android): prefill the name box when an output is added,
and — the better prize — notice the route changing and switch the calibration
profile with it, which retires the "forgot to switch, played a whole session
330ms late" failure instead of documenting it. Small, high-value, and only
possible in the shell; it belongs in the same pass as 4.2.

**4.2 is finished as a question, 2026-08-24 — and the Play track now sleeps.**
The player's ruling: *4.2 was a proof of concept about him, not about the app*
— that an individual developer can enrol, sign, upload and install from the
store with no blocker left standing. That proof is complete, so **the internal
testing track stops being kept current.** No more AABs, no more version chasing
there; the deployed build is a snapshot of a question already answered. Two
carve-outs, both cheap and neither a deployment: the **keystore backup**, which
is insurance rather than release work, and the **QC45 route test**, a 4.2
capability that was built and never watched work.

**And the order to v3.0 is settled: Phases 1, 2 and 3, then deployment.**
The things the store cannot fix — *the pedagogy is incomplete*, the microphone
is proven only in principle, and the tuner turns out to be part of making the
microphone work rather than a feature beside it (§ 4.3). My Music is the one
item of v3.0 already done. The Play console tasks (content rating, data safety,
target audience) belong with the release they serve, not with the proof.

**4.3 v3.0 ships with** everything free, plus **teacher mode, the microphone
with its calibration, and My Music** as it stands today. **The tuner is not in
v3.0** — see below.

**Teacher mode added to this list 2026-08-24, correcting an omission.** § 3
puts teaching *first* in what the paid app is — "it teaches you, hears you,
tunes you, and plays your own music" — and this line named the last three only,
which predates Phase 1 being built out on 19–20 August. The player's ruling of
the same day settles it: the pedagogy is pre-deployment work, not a v3.x
addition. This reconciles § 4.2's *"Phase 1 and Phase 2, then deployment"* with
what v3.0 is said to contain. **See `course-plan.md`** — Phase 1's machinery
exists and what it needs is a curriculum, which that plan rules is authored
rather than computed.

**The tuner drops out of v3.0, and what replaces it is smaller — ruled
2026-08-24, in two steps.**

The player first put the tuner in: *"if the instrument is out of tune, it is
less likely to detect the note."* Then he put it back out, with the better
version of his own argument: *"perhaps it isn't a tuner that we really want,
but something to calibrate my instrument against the system's note
recognition. There are already plenty of tuner apps out there — what we really
need is to understand that whatever sound is coming out of their instrument is
meant to be an E."*

**He is right, and `player-input.ts` said so before either of us:**

> A fingering rather than a pitch because that is what the app teaches and what
> the results screen shows. **A microphone hears pitch and would report the
> fingering it implies.**

The app never needs to name the player's note. It needs to know which valve
combination their sound means. Three things follow.

**Octave errors are free.** The classic failure of pitch detection on low brass
is locking onto a harmonic rather than a weak fundamental. Every note of a
harmonic series shares a fingering, so an octave error maps to the same answer
and cannot produce a wrong verdict. The largest technical risk in microphone
mode is neutralised by the seam's existing design.

**What is left to calibrate is pitch class**, because the neighbouring semitone
is 100 cents away and is usually a *different* fingering. That is the boundary
that matters — not A=440. Detection itself is not the worry: the spike named
the right note 19 of 19, zero wrong, across two takes.

**And the app has built this shape once already.** `AudioOutput` holds a
per-device profile the player measured themselves, with a `calibrations` count
that deliberately separates *never measured* from *measured as zero*, "because
a device nobody has measured and a device measured at nought sound identical to
the app and mean opposite things to a player." The instrument profile is the
same shape and inherits that lesson unchanged.

**So the tuner is judged on its own merits, later.** It remains a real
differentiator — a chromatic tuner cannot say which slide to pull, and this app
knows the fingering *and* the partial (`v2-design.md`) — but it is a feature,
not a dependency. Nothing is wasted by deferring it: the calibration's readings
are a strict subset of what its least-squares attribution needs.

**The consequence that must be ruled on before microphone mode judges
anything:** intonation error must never be recorded as a reading error. The
core job is reading fluency (§ 2). A learner who reads the right note and plays
it 40 cents sharp has succeeded at what was being asked, and marking it wrong
would teach the app they cannot read a note they read correctly — which then
feeds `noteWeights`, weak-note drilling, and the course's widening rule. That
is the same class of fault as the unplayed-run problem in `course-plan.md`:
**the store learning something false and acting on it.** Microphone mode judges
identity generously; the tuner judges intonation separately and on purpose.

**4.4 iOS, when the hardware exists.** The shell is the same wrapper; what is
Apple-specific is signing, the audio session, and the App Store listing. Buy
the Mac mini on the strength of a paid Android app that works, not on the hope
of one — and note that the bundle id `net.brassmaster.app` still cannot be
changed once it is on sale, so reserving the name stays worth doing early if
enrolment ever unblocks.

**What the emulator cannot answer.** It runs the wrapper, the layout, the
build and the Play upload perfectly well, and it is worth using for all of
those. But the spike exists to measure *audio*, and an emulator's audio path is
the host's, not a phone's — its latency figures mean nothing. Nor is its
network a phone's: the emulator sits behind NAT on 10.0.2.x, so "the laptop
browses to the URL the phone shows" needs `adb` port forwarding to work at all,
which is the one thing the HTTP server feature is *for*. Both questions need
glass.

**And a risk Android brings that iOS does not.** Audio input latency on Android
varies enormously between devices — it is the platform's oldest sore point —
where iPhones are consistent. The tuner barely cares, since a held note is
measured over a window. Microphone mode does care, because it judges an onset
against a clock. The mitigation already exists and is already trusted: the tap
calibration, which measures the round trip on the actual device rather than
believing what the device reports about itself. Phase 4.1 should measure the
spread on at least one real handset, and borrowing a band member's phone for an
afternoon is the cheapest second data point there will ever be.

**Correction, 2026-08-22: the mitigation named above no longer exists.** The
tap calibration was removed the same evening, because tapping folded the
touchscreen's own latency into the answer and then blamed the audio output for
it. What replaced it measures *output* only — a player judges a scrolling scale
against what they hear — and output is the half that was already fixable. So
this risk is currently unmitigated rather than handled, which is precisely why
4.1 now has to measure the round trip.

**A second measurement and a ruling, 2026-08-23.** With headphones the E32
needs the full 750ms the ceiling then allowed — the player sat exactly on the
ceiling, so it is now 1000, since a ceiling resting on a measurement hides
anything past it — and the iPhone about 200ms on headphones. The ruling that
follows is about honesty, not comfort: **reactive sound is withheld above
100ms of lead.** A scheduled note survives any latency, because the lead hands
it to the audio thread early; a reaction — the cushion swapping to the
instrument on a right fingering, the tone dipping on a wrong one — cannot be
handed over before the event it reacts to, so it reaches the ear a full
output-latency late. At 750ms the instrument "spoke" most of a bar after the
fingering it was confirming, which is not feedback but noise. Above
`REACTIVE_SOUND_MAX_LEAD` (`engine/session.ts`) the reference simply sounds
and the judgement stays on the screen, whose own lag is a frame or two; the
settings screen says so beside the cushion rather than letting the silence
read as a bug. The 100ms figure is the player's first guess and his to tune —
at that value an iPhone on headphones loses the cushion too.

**What this costs, stated plainly.** Play does not reserve names the way App
Store Connect does, so shipping first on Android does not protect the name on
either store. And Google closes dormant developer accounts — which was an
argument against opening one to sit on, and is no argument at all against
opening one to ship from.

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

### Phase 6 — Orchestration, in two variants (paid)

Split into two on 2026-08-22, because they had been one item and are not one
problem: *"someone may want to scan multiple parts and play them together,
which could be genuinely useful as a rehearsal mechanism. But the two-part
inventions and themes could also benefit from an extra dimension."*

They share a mechanism — the app sounding a line the player is not reading —
and almost nothing else. One is about *other people's parts*, arrives as a
file, and is a rehearsal tool. The other is about *the corpus*, needs no
import at all, and is a way of practising counterpoint. **6.2 is much the
smaller and its material already exists**, which is not the order the numbers
suggest.

Neither comes before **1.10 divisi**, ruled 2026-08-22. Divisi is smaller,
already decided, and unblocks a piece already asked for; nothing here depends
on it either way.

**6.1 The band around you — many parts, from a file.** Import a full score,
choose your part, and the app plays the others while you read yours. The
player's own idea and probably the most compelling thing on this roadmap: it
turns reading practice into playing music, which is the difference between a
drill and a rehearsal. It is also what would make a bandroom's own repertoire
usable, since the parts a player wants to rehearse are the ones on their own
stand.

Most of it exists — the sampler covers four brass voices, the clock and tempo
map are built, the importer parses MusicXML. Four things are genuinely open:

- **Multi-part parsing.** `import/` reads one part and resolves divisi to one
  line at the door. Reading all of them, and letting the player pick, is the
  same shape of change as 1.10 and wants doing after it rather than beside it.
- **`<transpose>`, which the output contract currently forbids.** This is the
  one that bites, and it is a seam between the two repositories. The importer
  ignores transposition entirely — the word does not appear anywhere in
  `import/` — because the app re-fingers *written* pitches for whichever
  instrument the player holds, and that is exactly right for reading one part.
  It is wrong for playing the others: a B flat cornet part written in C sounds
  a tone lower, an E flat bass part a major sixth lower again, so a score
  played from written pitch would come out in several keys at once.
  **Multi-part playback needs sounding pitch, which means the parts must carry
  their transposition and the importer must read it.**
  `prompts/schema-profile.md` in the sister repository states the opposite and
  would have to change with it.
- **Whether the app follows the player, or the player follows the app.** A
  backing track that keeps its own time is a metronome with better manners,
  and it is buildable today. Something that *waits* for a player who has
  slowed down is a different instrument altogether, and it needs the
  microphone — Phase 2 — to know where they are. Worth deciding which is being
  sold before either is built.
- **Where the parts come from.** MusicXML out of a notation editor works now.
  Photographing a stand's worth of parts is `BrassMXMLGenerator`, which is
  **parked by ruling** and stays parked; this item does not unpark it, but it
  is the first thing on this roadmap that would give it a reason to exist
  beyond one player's convenience.

*Erbarme dich, when it is transcribed, is barred as 6/8 rather than 12/8* —
each of Bach's bars becoming two, the notes untouched and only the bar lines
moving. Ruled 2026-08-22: *"i don't think anyone will complain that the 12/8
becomes a 6/8."* 6/8 is a metre the app offers and 12/8 is not, and adding one
wants cells written in it or Themes falls back to composed material while
still calling itself tunes.

**6.2 The other voice — two-line themes, from the corpus.** The app *sounds*
one line while the player reads the other, and then they swap. Never drawn:
see the ruling below. Raised 2026-08-20
as an open question and promoted here on 2026-08-22: *"i think it is best as a
duet if anything."*

It is better material than 6.1 rather than lesser, and the reason was recorded
when it was first raised: **an accompaniment part is dull to play where a
countersubject is not.** Fugues, the Two-Part Inventions and *Erbarme dich*
are two independent lines of equal interest, so both halves are worth reading
and swapping is worth doing.

**The material is already here.** All six inventions are complete in the
corpus and every one of their sources is two voices in two tracks; only the
upper voice was ever taken. The second line is one more run of the same
converter against track 2.

**Settled 2026-08-22, in conversation.** A `Theme` gains a **second voice on
the same theme**, rather than the two lines being separate themes linked by an
id.

What decided it was placement. `realiseTheme` chooses where a theme sits by
finding the octave that centres it in the instrument's compass, so two themes
placed independently would each be centred — both voices landing in the same
register, and the counterpoint collapsing into itself. Two voices have to
share **one** placement with the written interval between them intact, which
means a joint path would have been needed either way; the "leave `Theme`
alone" advantage was mostly imaginary. One theme also keeps the bookkeeping
honest: one id, one verdict on the review sheet, one entry in `unjudged`, one
digest. A duet with two ids arrives in the review queue as two half-pieces.

Two consequences fall out, which is usually the sign a shape is right. **The
judge is untouched** — it judges the read line and has never known anything
else existed. And **the pitch problem is already solved**: every note carries
`writtenMidi` and `soundingMidi`, so the app sounds the partner at concert
pitch while the player reads theirs transposed, and a cornet and a tuba both
hear it in the right key.

What it costs: a theme declares one `difficulty` and two voices may differ.
The level is validated against **both** lines, so it means "reading either of
these" — which is the honest reading for a duet and the only one that survives
swapping.

**Heard, never drawn.** Ruled 2026-08-22, and the reason is better than the
mechanism: *"in real life band playing, we don't see the other line, only hear
it."* So this is not a score on screen, and printing both staves is not a
later setting to get to — it is a different exercise from the one the app is
for. The player reads their line and hears the other, as they would in a
bandroom.

**Which voice sounds it, and the constraint that shapes it.** Asked for
2026-08-22: *"if i pick a 2-part invention, it may be that i want to hear it
as the same instrument as I am playing… some limitations on the choice are
that it would need to be in range."*

The constraint is right and it is **computed rather than stored**, because the
sounded voice's absolute pitch is not a property of the theme: the whole thing
is placed against the player's compass and the key in force, so the same
partner line sits in a different octave for a cornet in F than for an E flat
bass in C. `SAMPLE_MANIFEST` already declares what each voice can reach —
trumpet 46–88, french horn 39–78, trombone 29–74, tuba 21–65, anything between
samples reached by shifting no more than `SAMPLE_STEP` — so at realisation the
app knows exactly which of the four can sound the partner, and offers those.
"The same as mine" is one of the choices whenever it fits, which is what was
asked for; where the player's own voice cannot reach the line, the app says so
rather than substituting one quietly.

**The swap is offered only where both lines fit**, agreed the same day. The
sounded voice is bound by neither compass nor fingering — nobody plays it — so
a piece can be readable in one direction and not the other. Half a duet is
better than none, and it must say which half it is offering.

### Phase 7 — Being found (free, and it gates everything paid)

**Added 2026-08-25, on the player's ask**, and the roadmap had nothing about
distribution at all until now — a real gap for a document whose § 1 says
revenue is a goal.

**Read the Search Console numbers correctly first.** Zero clicks and zero
impressions looks like a verdict and is not one: the property was verified on
2026-08-23 for the Play developer account's website step, so the "3 months"
view holds two days. Nothing can be concluded from it, and nothing should be
optimised on the strength of it.

**What was actually wrong was that there was nothing to find.** A crawler got
`<div id="root"></div>`, an empty body, no `robots.txt` and no `sitemap.xml`;
the only words on the site were the title and one meta description. Even
indexed perfectly it could rank for "Brass Master" and nothing else — and
nobody types that. Learners type *tuba fingering chart*, *euphonium fingering
practice*, *brass sight reading app*, *how to read bass clef*.

**7.1 A front door** — ~~to build~~ **built 2026-08-25.** The app moved to
`/app/` and a landing page took the root, with `robots.txt`, a sitemap, and a
self-destroying service worker at the old scope. `tools/site.mjs` assembles it
and explains why. Affordable only because there were no installed copies to
orphan; it would not be affordable a second time.

**7.2 The words, and they are not marketing words.** The page has to contain
the sentences a learner would type, because that is the only way it can be
matched to them. This is a content job and it is the player's: he is the brass
player, and copy claiming things the app does not do would be worse than no
copy. Nothing on that page may promise a feature that is not shipped.

**7.3 The free channels, which are warmer than any advertisement.** The band
already plays the legacy app — real brass players with a reason to move. Brass
teachers, band associations, the brass corners of Reddit and Facebook. None of
this costs anything, and all of it reaches people who already know they want
this.

**7.4 Paid advertising, last, and only against something.** Google's starter
credits are spend-matched — the $600 is unlocked by spending $600 — so it is
real money, and today it would buy clicks to a free app that earns nothing,
with no figure to measure the spend against. **Ads make sense once the paid
Android app is on sale and a click has a value.** Doing it in the other order
buys traffic for the worst version of the product.

**7.6 Language packs — re-ruled the same day they were built, 2026-08-28.**
The morning's scope was "the various labels and buttons throughout the
different forms". By evening the player had played it in German and it had
not met even that: 52 keys, **six of twenty-three components calling `t()`**,
and *"Back" a button on six screens with one of them translating*. The
landing page, meanwhile, sent a German reader to a bare `/app/` and the app
opened in English — the two halves of the site had never been joined, so no
amount of pack coverage would have fixed what he saw first.

**Re-ruled: all static text that ships with the app, prose included.** What
still cannot change is what the player or the corpus wrote — course content,
tune and collection names, instrument names, the editor. Built the same
evening, three parts:

- **The handoff.** `site.mjs` writes `?lang=` into the translated pages'
  links; `loadSettings` reads it, and on a genuine first run falls back to
  `navigator.languages` matched on the primary subtag. Order is by freshness
  of intent — URL, then stored choice, then browser — and the browser gets no
  vote for a returning player, because weeks of using the app in English is a
  choice too.
- **The sweep.** 244 keys, every screen, **all three packs complete** — a
  partial pack is precisely how one screen came to disagree with the next.
  Placeholders (`{n}`) rather than concatenation, because word order is the
  first thing a translation changes; `tCount` for singular/plural. Domain
  labels (difficulty names, drills, registers, modes, conductor styles) keep
  their English in their tables — other guards pin those to what the
  generator can play — and render through keys derived from their ids.
- **The guard, which is the part that makes it stay done.**
  `i18n/coverage.test.ts` fails **by name** on a string that skipped `t()`, a
  key a pack lacks, a placeholder a translation dropped, or a domain label
  that has drifted from its key. The landing page has had this since it was
  built; the app had none, which is exactly why coverage rotted to a third
  inside one day. Mutation-tested on all four. Its `DELIBERATELY_ENGLISH` set
  is three entries — the product name, units, and a licence attribution —
  and adding to it is a decision not to translate something.

Standing obligations: **every pack wants a native brass player's pass** (the
ear rule's linguistic twin — drafted by the assistant, native in none of
them, and now four times as much text to get wrong); the **US-English
duration-name fork** (crotchet/quarter note) remains open and is the cheapest
locale with the largest audience; and `describeSkill`'s notation vocabulary
on the Progress report is **the one deliberate gap left**, because
translating "dotted quaver" is the same question the US fork asks and should
be answered once, for both.

**7.5 The Play listing is a discovery surface too**, and it is not ready to be
one: internal track, placeholder name, and the content rating, data safety and
target-audience tasks outstanding (§ 4.2). The landing page will link to it
when there is something to link to, and not before.


## 5. Releases, and where things run

### What the free app actually gets

Worth stating plainly, because the phase list hides it: **almost everything on
this roadmap is paid.** Of Phase 1, only the material (1.8) and the reading
fixes (1.9) reach the free app at all; 1.1 is recorded there but shows nothing.
Phases 2 to 6 are entirely paid.

| Roadmap item | Free web app | Paid app |
|---|---|---|
| 1.1 skill model | recorded, invisible | recorded, and read by everything below |
| 1.2–1.7 teacher mode | taster courses only (2026-08-26) | ✓ |
| 1.8 theme corpus | ✓ | ✓ |
| 1.9 reading fixes | ✓ | ✓ |
| 1.10 divisi | ✓ | ✓ |
| 2 microphone | — | ✓ |
| 3 tuner | — | ✓ |
| 5 phone library | — | ✓ |
| 6.1 many parts from a file | — | ✓ |
| 6.2 two-line themes | — | ✓ |

That is a deliberate consequence of the free/paid line in § 3, but it means the
free app stands still for a long time while the paid one grows. It is the same
risk named in § 7 — *whether the free app has any reason to come back
tomorrow* — seen from the other end, and it is the argument for eventually
letting something across the line. **Anything built for the free app should be
recorded here as it is decided**, or the answer to "what did the free app gain
this year" will be "nothing" without anyone having chosen that.

**Gained 2026-08-23, v2.45.0: a defined run chooses tune and key together.**
A step is now a tune *in a key*, built in a picker that nominates keys at the
top of the sheet and offers, per tune, only the nominated keys whose placement
holds it on the current instrument — a tune fitting none is greyed with the
reason, never hidden. What forced it: Invention 13 spans thirty semitones,
fits seven signatures on an E♭ bass and one on a cornet, and the old
independent key-and-tune selectors let a player ask for placements that do not
exist, which surfaced as runs silently truncating or falling back to composed
material. The player's ruling, recorded at `DefinedPicker`: guided selection
for defined runs, while *"simply choose a random melody in a key"* — medleys
and composed material — keeps the plain key grid untouched. Medleys can still
in principle meet a key nothing fits (rare on the current corpus: no Bach key
is empty on any low-brass instrument at any level) and still truncate there;
that residue is accepted for now and noted here so it is a choice, not an
accident.

### Versions

**One codebase, one version number, both builds carrying it.** The version
identifies the code, not the feature set, so the free app's version rises when
a paid feature lands and nothing it shows has changed. That is correct and
should not be "fixed".

| | |
|---|---|
| **v2.x** | now until the App Store. Paid features land here as **minors** — the codebase gained a feature even though only one build exposes it. Free-app work lands here too. |
| **v3.0.0** | **the App Store launch.** A major, on the repository's own rule that majors mark a change of category: one product becomes two, and one of them is sold. |
| **v3.x** | after launch — the tuner (Phase 3, deferred 2026-08-24), the phone-hosted library (Phase 5), then orchestration (Phase 6), whose two halves may well ship apart: 6.2 needs no import and its material already exists. |

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

#### And it is chunked into collections

Added 2026-08-20: *"I really think we need to chunk up the corpuses to have the
'Bach corpus', 'carols corpus', 'default corpus (ie the 47)'."* Now
`exercise/collections.ts` — three today (the 36 written themes, 12 traditional
tunes, 4 Bach), each with its own provenance and its own revision.

**Provenance is the load-bearing part.** It is a fact about a collection rather
than any tune in it, and it decides what a *sold* app may carry: four of the
fifteen Mutopia inventions are CC BY-SA, and the generator's models are trained
on a corpus forbidding commercial use. `restricted` marks a collection a paid
build must not ship, and the suite enforces it. This is where the licensing
tripwires in `CLAUDE.md` stop being something to remember.

**Settled 2026-08-20: collections are selectable material.** Themes asks where
its tunes come from — composed from cells, as before, or a named collection —
and the choice leads that box the way the drill leads Drills. Two routes were
declined: seeding the composer with collection tunes (which is the variation
engine's job, and unbuilt), and keeping them as a reference set only.

The seam was already there: `stitchThemes` takes the corpus it lays end to end,
so a collection's themes go where composed tunes did and the key tour, the
no-repeat rule and the fallback are untouched. Two consequences worth knowing:

- **A written collection repeats within a run.** Four Bach against an endless
  supply of composed tunes — the stitcher declines to play the same tune twice
  running wherever it has a choice, and with one theme it has none. That is the
  bargain of asking for *this* music rather than for more music.
- **The count beside each collection is load-bearing.** Falling back to composed
  material is correct where nothing fits, and indistinguishable on screen from
  being handed Bach — so the control counts what actually fits, against the real
  placement, and says so in words at zero. A player who asked for particular
  music must not be quietly given other music.

Extended 2026-08-20, on the observation that nobody limits their listening to
one time signature: **the metre follows the material.** A collection plays each
tune in its own signature, changing at the joins the way a printed medley does —
the time-signature control disappears for collections, and only composed
material still takes one, because its tunes are built *for* a metre rather than
found in one. Each tune's name is printed over the bar where it begins
(`LabelEvent`, the same shape of addition as tempo marks). And a medley can be
picked by hand: naming tunes turns the level filter off, since the player has
already answered the question the level exists to answer. What made all of this
cheap is that `metres` has been a list since imported music needed it — the
renderer could already draw a mid-line signature change, and the feature was
wiring, not machinery.

#### Where the corpus actually is, and the shape it should be

Scanned 2026-08-21, because the collections had been growing by whatever
occurred to us next rather than against any statement of what was needed.

| | beginner | easy | medium | hard | total |
|---|---|---|---|---|---|
| Inbuilt | 4 | 10 | 9 | 13 | 36 |
| Nursery | 5 | 7 | — | — | 12 |
| Bach | — | 2 | 2 | 5 | 9 |
| **all** | **9** | **19** | **11** | **18** | **57** |

Three findings, and only the first is a surprise.

**The corpus is shaped like the interests of the people building it, not like
the people using it.** Hard outnumbers beginner two to one, because Bach is
interesting to source and nursery tunes are not. A run is four themes, so a
beginner meets the same tune every other sitting while an advanced player has
eighteen to draw on — which is exactly backwards.

**The metre gaps sit where the content is thinnest.** Six of the twenty
level-by-metre boxes are empty, and they are beginner and easy in everything
but four-four: 3/4 has nothing below medium, 6/8 nothing at beginner, 9/8
nothing below medium. Composed material covers all twenty (the cells are
healthy — 5 to 19 per box), so the hole is in the *named* collections, where a
player who has chosen "Nursery" and three-four gets composed tunes instead.

**Compass is not a constraint.** Every theme fits every instrument in every
key, bar one hard theme at five flats. That is worth knowing because it was the
constraint we designed most carefully around, and it has never once bitten.

**The ruling that shapes what comes next**, from the player 2026-08-21: *"the
majority of our content should be aimed at beginner-easy and medium levels, as
more advanced people probably have moved on from training apps."* That is a
statement about who this is for, and it settles two things at once.

- **Weight new material low.** A rough target of 25 / 30 / 25 / 20 across the
  four levels, against today's 16 / 33 / 19 / 32 — so beginner and medium are
  where the next hundred themes should land, and hard needs nothing added for
  its own sake.
- **Do not build a level above `hard`.** It has been tempting twice: BWV 778
  and 785 were rejected for running in demisemiquavers, which the app can draw
  but no level admits. Under this ruling that is the right outcome rather than
  a gap — the players who could read them are not the players this is for.

#### Complete pieces, not excerpts

Also asked for 2026-08-21: *"I'd love to see more of it — even complete scores,
seeing as Jesu Joy and the inventions don't seem to go through to conclusion."*
Right, and cheaper than it sounds: a whole piece **passes the stable-ends rule
more easily than an excerpt**, because a piece ends on its tonic by
construction. Cutting is what was hard.

Two things stand in the way, and both are worth building.

1. **Ties inside a bar.** The format ties only across a bar line — a rule that
   was true of generated material and is false of real music. It is what
   stopped BWV 773 (a note of a beat and a quarter mid-bar, which a score
   writes with a tie). Complete pieces will meet it constantly.
2. **Run length against piece length.** A run is four themes; four complete
   inventions is a hundred and twenty bars, which is a recital rather than a
   sitting. Length should follow what was chosen rather than counting tunes
   blindly.

#### The collection to build next: Bach's chorales

The model generalises, and the best next use of it answers both of the above at
once. Bach harmonised some 370 Lutheran chorales; their soprano lines are
complete hymn tunes of eight to sixteen bars, mostly crotchets and quavers,
stepwise, ending on a proper cadence.

- They land in **easy and medium**, which is exactly where the corpus is
  thinnest, rather than adding to hard.
- They are **complete pieces**, which is what was asked for.
- Brass bands play hymn tunes constantly; this is core repertoire rather than a
  curiosity, and the melodies are older and more plainly public domain than
  Bach's harmonisation of them.
- There are enough of them to change the corpus's shape on their own.
- They make the two-voice play-along idea concrete: a chorale's bass is a real
  part, and hymn-tune playing is how a band already rehearses together.

**Licensing tripwire to walk around:** the obvious bulk source for chorales is
KernScores, which is CCARH — the same terms that already forbid the generator's
Essen-trained models from anything commercial. Source from somewhere else.

#### Superseded the same day: recognisable beats well-made

Two chorales were converted, validated at easy, fitted every instrument in
every key — and were withdrawn on hearing them: *"I'm not a church choralist
and aren't familiar with the two you put up already, and I'd leave them rather
than take them. Select only for the more well known pieces (Sheep may safely
graze, for instance)."*

That overturns the criterion rather than the plan. **A tune the reader already
knows is worth more than a better-made tune they do not**, because knowing it
is what tells them they have played it wrong — which is the whole feedback loop
this app exists to close. It is also why the nursery tunes work and why they
were always a fair calibration: nobody has to be told whether Twinkle came out
right.

So no bulk ingestion of anything. Collections are **curated by fame**, one
piece at a time, and the question to ask of a candidate is not "is this good
material" but "would a player recognise it". Mutopia turns out to hold exactly
that kind of Bach under a plain Public Domain licence — Sheep may safely graze,
Air on the G string, Bist du bei mir, the Toccata and Fugue — which is a better
source than the 371 ever were.

#### The difficulty model gates on its shortest note, and that is too crude

Found while converting those: `Air on the G string` and `Bist du bei mir` are
both refused, each for containing notes shorter than a semiquaver, which no
level admits. The counts say these are two different situations that the model
cannot tell apart:

| | notes | shorter than a semiquaver |
|---|---|---|
| Air on the G string | 145 | 19 (13%) |
| Bist du bei mir | 171 | 4 (2%) |

The Air really does run in demisemiquavers and refusing it is right. *Bist du
bei mir* is a slow aria — 77 quavers, 27 crotchets — turned away for four
ornamental notes, and that is the model being wrong rather than strict.

**It is the same fault already recorded against accidentals**: the level is
decided by whether a property appears at all, never by how much of it there is.
A proportion would fix both — a level tolerating a small fraction of notes
below its floor, and grading chromaticism by density rather than presence.
Worth doing before the next curated batch, since it decides what can be taken.

Note what it is *not* an argument for: a level above `hard` is still ruled out.
The point is that these pieces are not above hard — one of them is easy with
four ornaments on top.

Phase 4 is what v3.0.0 *is*, so it earns no minors of its own.

### Where each build runs

| Build | Where | Who can reach it |
|---|---|---|
| `web` | **brassmaster.net**, GitHub Pages, deployed by CI on every push to `main` | everyone |
| `app` — development | **the tailnet**, served from the desktop | your own devices |
| `app` — beta | **Play internal testing**, from Phase 4; TestFlight from 4.4 | testers you invite |
| `app` — release | **Google Play**, from Phase 4; the App Store from 4.4 | customers |

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

### Where the native shells are built from

**Recommendation, not yet ratified:** the shells live in **this repository**,
in `android/` and later `ios/`, sharing the version, the gate and the history.
A separate repository would let a shell and the web build it wraps drift apart,
and they are one product with one version number.

**Android builds from Linux, start to finish** — Gradle, signing and the Play
upload all run on the machine that is already here, which is most of why Phase
4 starts there.

Two consequences to plan for. **No signing key of either platform may ever be
committed**: this repository is public, so the Android keystore and its
passwords, and later the Apple certificates and provisioning profiles, belong
in GitHub Secrets — and an Android upload key cannot be replaced without
Google's help, so it wants a backup somewhere that is not this machine. And
**macOS runners are free for public repositories**, so when iOS comes the
release build and upload can be automated without owning a Mac, even though
developing the shell cannot.

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
- **~~Android natively.~~ Moved onto the roadmap 2026-08-22, and it now goes
  *first* — see Phase 4.** The 2026-08-19 reasoning was that the PWA already
  serves Android, that Google closes dormant accounts and that Play does not
  reserve names. All three are still true and none of them was ever an argument
  about *where the paid app should ship*: they were arguments against opening
  an account to sit on, at a time when nobody had priced the alternative. The
  fact that changed the answer is that the player owns no Apple hardware, so
  iOS-first means about AU$1,300 spent before the first question is answered,
  and the questions can be answered on Android for US$25 on the machine he
  already has. iOS is not cancelled; it is 4.4 instead of 4.1.

  **The first hard evidence about that platform, 2026-08-22.** Measured with
  the new calibration screen, on one pair of hands: the Motorola E32 is ~330ms
  late on its own speaker where an iPhone 15 is ~20ms. Sixteen times, and it
  cuts both ways. It confirms the Android audio spread this roadmap warns
  about a few sections up — and it means that before this date *every Android
  player heard every note a third of a second late with no way to correct it*,
  because the audio lead was fixed at nought on the strength of one iPhone.
  Choosing Android first is what surfaced it; choosing iOS first would have
  shipped it.

## 7. Open questions, named so they are not forgotten

- **A level means two different things, and the app will soon have to say
  which.** Raised 2026-08-21: *"there are differences based on whether it is
  'microphone mode' or 'tapping the screen' mode."* Measured the same evening
  and the corpus agrees — the two modes are different exercises. Tapping asks
  for the right valves at the right instant, so what costs you is note rate,
  rests and ties; the microphone asks for the note to come out, so what costs
  you is leap, chromaticism and where the line sits. **48 of 69 themes sit at
  a different level under the two**, sixteen of them harder to pitch than to
  finger. `tools/difficulty-dry-run.mts` prints both columns.

  Until the microphone exists, one label computed as the harder of the two is
  right: a player tapping a Hard tune is stretched rather than misled. When it
  ships, the label follows the mode. See `difficulty-model-plan.md` for the
  whole measurement, including the two other axes the model cannot see —
  cross-rhythm, which is most of what Medium actually is, and repetition.

- **Run length has to follow the material now, not count four themes.**
  Already on the list; completing the Bach pieces on 2026-08-21 made it press.
  Four themes of the written corpus is 48 bars, of the nursery corpus 53, and
  of the Bach corpus **126** — the Prelude alone is 35 bars where it used to be
  8. Nothing is broken, and a player asking for a short practice can be handed
  a quarter of an hour of Bach without being told.

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
- **~~Two-part counterpoint is the play-along material, and the format cannot
  hold it.~~ Promoted to Phase 6.2 on 2026-08-22**, where the decision it was
  waiting for — two linked themes, or a second voice on one — is written down
  as the thing to settle before any more counterpoint is transcribed. It was
  raised 2026-08-20 and is still the better half of orchestration.
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
