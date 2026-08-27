# Handover — 2026-08-23, late: the night the app reached Google Play

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator. The third is
`../container-spike/`, roadmap 4.1, run and closed; its `FINDINGS.md` is the
record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-08-23-redesign.md` (the settings
redesign, the same day's daylight). Earlier ones go back through
`handover-2026-08-23-unattended.md` and `handover-2026-08-22.md`.

## What to read, and what to leave alone

| | When |
|---|---|
| `handover.md` — this file | Now, all of it |
| **`roadmap.md`** | Now, and before proposing any feature |
| `../CLAUDE.md` | Now. The seam, and which remote is which |
| `device-testing.md` | Before any session touching the shell or a phone |
| `android-shell-plan.md` | Before shell work — 4.2 is built; this is what it is built *to* |
| `../container-spike/FINDINGS.md` | Before any Phase 2/5 work |
| `musicxml-import-plan.md` | Before importer work — updated tonight, including a corrected tooling claim |
| `v2-design.md` | Never end to end. Grep it for the noun you are touching |
| **`course-plan.md`** | Before any pedagogy work — **ratified 2026-08-26**, every open question answered |
| `difficulty-model-plan.md`, `app-store-plan.md`, `v3-library-plan.md`, `tempo-map-plan.md`, `rhythm-plan.md` | As their subjects come up |

## Where this stands

**v2.53.0, pushed, tagged, deployed and green** — 1,386 tests across 70
files. **The course editor exists**: `/editor.html` on the paid build (the
tailnet copy serves it to a desktop), validation is `readCourse` live, Save
writes a file the practice screen imports — picker, export and delete
included. Built on the player's insistence over the file route, schema-rework
risk accepted; the phone server stays Phase 5. Course steps are now written into the music: a label at the end of the
following bar, the tempo changing there, fresh material spliced in mid-stream
for level joins (`continueFrom`, the generalisation `rekey.ts` promised
itself), Stay here rewriting the future back, position committing when the
playhead crosses. The countdown version lived one day —
`course-plan.md` § *The join is written into the music*. The gate before any push is `npm test && npm run build && npm run
lint`, plus `npm run check:web` and `npm run check:channel` when anything
touches the build split. **After any gate run, rebuild the tailnet copy:
`npm run build:dev`** — every plain build overwrites `dist/` with the wrong
flavour, and this has now bitten three sessions.

**The site has two halves since 2026-08-25**: a landing page at `/` and the app
at `/app/`. Only the *web* build moved — it clears `dist/`, writes the app to
`dist/app` with `VITE_BASE=/app/`, then copies `site/` over the root
(`tools/site.mjs`, which explains why). The app build still writes `dist/`, so
Capacitor's `webDir`, `npm run build:dev` and the tailnet preview on 4173 are
all untouched. Two things to know: **`site/CNAME` is the custom domain** and
the assemble step fails the build if it is missing, and `site/sw.js` is a
tombstone that unregisters the service worker every earlier visitor still has
at `/` — leave it there.

**Brass Master is on Google Play.** Internal testing track, app id
`net.brassmaster.app`, created tonight as **Paid** (the one-way door is
Free→Paid, so Paid was chosen; AU$14.99 placeholder, the real price is a
launch-day decision). The developer account exists and is verified — the
website step needed brassmaster.net in Search Console. The track currently
serves **v2.46.1**; the **v2.47.0 signed AAB is built and verified** at
`android/app/build/outputs/bundle/release/app-release.aab`, awaiting upload.

**The shell lives in this repo at `android/`** — Capacitor 8.5 wrapping the
`VITE_TARGET=app` build, versionName read from package.json and versionCode
derived (`major·100000 + minor·1000 + patch`), the audio-route capability
wired end to end, launcher icon from the PWA's own maskable icon. Scripts:
`android:sync` / `android:apk` / `android:install` / `android:aab`, each
rebuilding the app flavour itself rather than trusting `dist/`. They need
`JAVA_HOME=/home/mh/tools/jdk-21.0.12.1+1` (in `~/.bashrc`, but the
non-interactive shell may not load it — export it explicitly).

**The E32 right now**: carries the **debug** shell (installed to diagnose the
import bug — release builds are not CDP-debuggable), has the player's PWAs
uninstalled, is adb-authorised, and is set to stay awake on USB
(`adb shell settings put global stay_on_while_plugged_in 0` reverts). The
player's first move is the two-step below.

## What happened tonight, newest first

- **The device-testing log opened and closed its first entry in one night**
  (`device-testing.md`). My Music hung on "Reading…" in the Play build: the
  player pinned the symptom, CDP pinned the cause — `deflate-raw` reached
  Chromium at 103, System WebView 94 throws on it, and the throw left `busy`
  set forever. `container.ts` now falls back to a zlib-wrapped inflate
  verified against the entry's declared size — **measured on the E32 before
  being trusted** — and the import screen lands every failure as a message.
  Verified closed on the phone's own screen.
- **Tempo marks are read** from MusicXML, converted to the dial's unit,
  shown on the import summary — *noted, not obeyed*. How they should meet
  the player's dial is a ruling deliberately not made; see the plan doc.
- **The importer met its first real multi-part score** — `openscore-lieder.mxl`
  (CC0, real MuseScore export), which immediately found two faults: the
  fullness check fired on correct mid-bar split bars (short measure +
  implicit "X" continuation — now exempted), and a part name carried a line
  break (now collapsed).
- **Roadmap 4.2 ran plan-to-Play in one evening**: `android-shell-plan.md`
  written and ratified, scaffold, first install over adb, the route
  capability (plugin with change events, one seam module reading the bridge
  off `window` so the web bundle stays clean — measured on the live shell),
  upload keystore at `~/keystores/brassmaster/` (never in this public repo),
  signed AAB, account, listing, and the player installed from Play.
- **A defined run now chooses tune and key together** (v2.45.0, redesigned
  with the player after Invention 13 exposed the old shape — it fits seven
  signatures on an E♭ bass and one on a cornet, and independent selectors
  let a player ask for placements that do not exist). `themeSteps` replaced
  `themeIds`; the picker nominates keys on its own sheet and offers, per
  tune, only the keys whose placement holds it. Full ruling at
  `DefinedPicker`. The key dial and home key grid step aside for defined
  runs; medleys and composed material are untouched.
- **Three layout bugs, one mechanism**: a `1fr` grid track's *minimum* is
  auto, so the play bar's controls quietly widened every row (v2.44.5,
  `minmax(0, 1fr)` everywhere); the picker sheet ignored the iPhone's
  safe-area and let its lists rubber-band the window into a stuck scroll
  (v2.45.1 — `overscroll-behavior: contain` plus a pinned scroll reset); the
  tempo wheel centred in a growing box and sat mid-screen whenever the key
  dial was legitimately absent (v2.45.2 — anchored under Stop, where its own
  comment always promised).

## Where I went wrong, so you need not

- **A tooling claim was true everywhere it was checked and false on the
  floor device.** "`DecompressionStream` supports `deflate-raw`" held on
  desktop, in tests, on modern phones — and not on WebView 94, which is the
  engine the paid app actually ships to. Check the floor engine first; the
  E32 is the floor.
- **Release builds cannot be inspected.** The Play-installed app answers no
  CDP; diagnosis meant swapping in the debug shell. Plan for that swap; the
  player reinstalls from the Play link after.
- **DocumentsUI ignores injected taps on file rows.** Half an hour of
  screenshots proved only that. Drive the app's own `<input type=file>`
  instead: `DOM.setFileInputFiles` over raw CDP (playwright's CDP handshake
  is too new for WebView 94 — use a bare WebSocket), with the file staged
  into the app's own dir via `adb shell run-as`.
- **The mockup round earns its keep.** The tune-and-key picker went through
  two mockups against the real stylesheet before a line of it was built, and
  the player's corrections (keys on the same sheet; grey the unfittable, one
  open at a time) reshaped it both times.

## The Play track sleeps — ruling of 2026-08-24

**4.2 was a proof of concept about the player, not about the app**: that he
personally can enrol, sign, upload and install from the store with no blocker
left standing. It is proved, so **the internal testing track is no longer kept
current.** Do not build or upload an AAB, do not chase the version there, and
do not treat the deployed v2.46.1 as stale — it is a snapshot of a question
already answered. The morning two-step written here last night is cancelled;
so are the console finish-setting-up tasks, which belong with the release they
serve. Roadmap § 4.2 carries the same ruling.

**Two carve-outs survive it**, because neither is deployment work:

- **The keystore backup**, still not done: `upload.jks` plus the passphrase
  (`~/keystores/brassmaster/passphrase.txt`), off this machine. Ten minutes
  now against a support round-trip later — and *how bad* losing it would be
  depends on whether Play App Signing is enabled on this app, which is the
  default for new apps but has not been checked. A lost **upload** key under
  Play App Signing is resettable; a lost **app signing** key without it ends
  the app's update path for good. Worth confirming once, in the console,
  rather than assuming either way.
- **The QC45 route test**, ten minutes on the bench: calibrate the headphones
  in the shell (the name box should prefill "Bose QC45"), then
  disconnect/reconnect and watch the gate's status line follow. It is a
  capability 4.2 built and nobody has watched work.

## What is deliberately left open
- **How a piece's stated tempo meets the dial** — seed it? scale mid-piece
  marks against it? The facts now exist (`Imported.tempos`); the ruling is
  the player's.
- **A medley can still meet a key nothing fits and truncate there** — rare
  on the current corpus, recorded in roadmap § 5 as a choice, not an
  accident.
- **ImportScreen and ScorePicker still use pre-lesson sticky strips** —
  untouched since the strip rulings, still unreviewed.
- **The phone pass** across both phones, and **`REACTIVE_SOUND_MAX_LEAD`**
  (100ms, the player's first guess, his to tune) — both carried over from
  the redesign handover.

## What is next

**Building, then deployment — settled 2026-08-24.** The store work is done
being interesting. **v3.0 is teacher mode, the microphone with its calibration,
and My Music** (roadmap § 4.3, corrected the same day to name teacher mode).
My Music is done; the other two are not. **The tuner was ruled out of v3.0 the
same day** — it was drafted in as a dependency of the microphone and is not
one; what the microphone needs is § 2.4's recognition calibration, which is
smaller and has a different purpose.

1. **The pedagogy, and it is the bigger of the two.** *Course-plan phase 2
   is built (2026-08-26): the document reader, the bundled Common Keys course,
   decimal stepping and the suggestion bar — `exercise/course.ts`, the ladder
   deleted. What remains of this item is the curriculum itself (the player's
   to author, in `courses/common-keys.ts`) and the later phases: author
   cells, course-carried MusicXML, the interval pool, the served-page
   editor.* Phase 1's *machinery* is
   built — the skill model, the ladder, goals, sessions, the progress screen —
   and what is missing is the teaching: **something simple to start on**. A
   beginner who chooses Structured Learning today meets a parameter space, not
   a first lesson. Expect it to take what the themes work took, and expect it
   to be settled with the player rather than designed for him. The named
   unfinished pieces are roadmap § 1.2's **mastery criterion** (thresholds are
   still constants awaiting real practice data), § 1.3's **whose standard**
   (own ladder first, grades calibrated onto it later), § 1.5's planned
   multi-part session, and § 1.8's material to feed it.
2. **The microphone, with its calibration (Phase 2, including new § 2.4).**
   Proven in principle and not yet by use: it runs while the reference tone
   plays, input latency is ~100–140 ms and stable, and the tone bleeds back
   into the mic as a constant baseline the detector must expect. **The mic
   reports the fingering a pitch implies, not the pitch** (`player-input.ts`),
   which makes octave errors harmless — a harmonic shares its fingering — and
   leaves pitch class as the only thing needing calibration. The calibration is
   a scale the player plays once per instrument, skippable note by note, stored
   in *sounding* pitch because `transposition` is per clef. **Rules before
   judging anything: intonation error is not a reading error, and a cracked
   note during calibration is discarded rather than learned.** Effort here is
   genuinely unestimated — say so rather than guessing.

**6.2 — two-voice themes** stays specified and waits. The generator sleeps; its
next hour is annotation, not training, and `train/annotate_bars.py` is the tool
for it (handover-ml § 16).

## How to work here

Small, complete changes. Run the gate — and check its exit code. Write the
reasoning into the code where the next person will meet it. Mutation-test
anything that guards: tonight that was the sheet's scroll reset, the
split-bar exemption, the route rules, the inflate fallback — each pinned by
a test that mimics the real failure. **Measure the phone before theorising**:
tonight's whole arc — the WebView probe, the wrap experiment, the on-glass
verification — was one lesson applied three times, and it turned a "strange
limbo" bug report into a closed log entry in ninety minutes. Push without
asking once the gate is green; push `origin`, never `legacy`; tag every
version; confirm the deploy. Nothing ships to a player unheard.
