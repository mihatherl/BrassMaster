# Handover — 2026-08-23, the day of the redesign

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator. The third is new today:
`../container-spike/`, the roadmap-4.1 spike, **run and closed** with every
answer measured on real hardware; its `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-08-23-unattended.md` (the overnight
session: GPU experiments on the sister project, and the first three fixes of
the morning). Earlier ones go back through `handover-2026-08-22.md`.

## What to read, and what to leave alone

| | When |
|---|---|
| `handover.md` — this file | Now, all of it |
| **`roadmap.md`** | Now, and before proposing any feature |
| `../CLAUDE.md` | Now. The seam, and which remote is which |
| `../container-spike/FINDINGS.md` | Before any Phase 2/4/5 work — it is what those phases now stand on |
| `../BrassMXMLGenerator/docs/handover-ml.md` § 14 | Only if touching the generator; **§ 14.0 first** |
| `v2-design.md` | Never end to end. Grep it for the noun you are touching |
| `difficulty-model-plan.md`, `app-store-plan.md`, `v3-library-plan.md`, `musicxml-import-plan.md`, `tempo-map-plan.md` | As their subjects come up |
| `android-shell-plan.md` | Before any 4.2 work — it is the plan for the task the *What is next* section names |

## Where this stands

**v2.44.4, pushed, deployed and green** — sixteen releases today, v2.34.0
through v2.44.4. 1,343 tests across 67 files. The gate before any push is
`npm test && npm run build && npm run lint`, plus `npm run check:web` and
`npm run check:channel` when anything touches the build split.

**After any gate run, rebuild the tailnet copy: `npm run build:dev`.** Every
plain build overwrites `dist/` with the wrong flavour, and the preview on 4173
serves whatever is sitting there. This bit the previous session for half an
hour; it will bite yours too. If 4173 is dead, `npm run preview` restarts it.

**The E32 is set up for adb** (udev rule installed, USB debugging authorised),
and — the day's best debugging discovery — **the installed PWA can be driven
live over CDP**:

    adb forward tcp:9222 localabstract:chrome_devtools_remote
    # then playwright chromium.connectOverCDP('http://localhost:9222')

One bug (v2.44.3) survived two plausible-theory releases and fell in a minute
of measuring the real phone this way. Do that first, not third.

## What the app is now

The redesign was iterated with the player across the whole day, one screenshot
round per ruling. Three screens, one question each:

- **Home** — *what to play.* Title and the instrument chip (identity, opens
  the instrument sheet); the Structured Learning / Free play segments (paid
  build; choice persists as `settings.homeMode`); **four mode tabs** — My
  Music · Drills · Sight-reading · Themes — sticky at the top, the chosen
  one's controls as the page; **Start pinned at the bottom** with the
  version/corpus line. Nothing scrolls but the page. My Music is a door
  wearing a tab: it navigates, never selects.
- **Ready** (the gate inside PlayScreen) — *how this run goes.* Tap to start
  first, tempo directly under it, then the accordion: Reading, Beat, Sound,
  Fingerings, Preferences — each collapsed line reciting its choice. The
  output and its calibration state on the face; credits and version behind
  Preferences. Gate edits write the one settings store; tempo/variableTempo
  regenerate the exercise same-seed (never imports, never course runs).
- **Play** — unchanged, plus: **the screen going dark ends the run** ("nothing
  is judged unseen"), and the visual clock survives a coarse Android audio
  clock (v2.34.0's slew).

Two structural components died happily: the Panel accordion machinery and the
keys/drills scroll windows with their centring effects.

## The rulings that moved, and where their history lives

Several of this codebase's recorded rulings were reversed today by the player,
and each reversal is written **at the site**, alongside what it reversed:

- **The tempo has had four homes**; the law extracted from the journey is in
  `ReadyControls.tsx`: *every other setting is occasional, the tempo is every
  session — wherever Start lives, the tempo belongs in its shadow.*
- **The Start strip has had three rulings** (tall-and-translucent → unstick on
  overflow → fixed as part of the frame); the full history is at the strip in
  `SettingsScreen.tsx`. It is `position: fixed` — sticky never leaves the
  flow, which is exactly why it failed.
- **My Music has had three homes** (footer → top door → material tab).
- **The Drills blurb guard** ("nothing claims what it doesn't deliver",
  2026-08-15) survived the blurb shrinking to "Scales and arpeggios." by
  moving up a level: every drill must belong to a claimed category, enforced
  at compile time. `generate.test.ts`.

## Where I went wrong, so you need not

**I shipped two wrong theories for one bug before measuring the phone that
had it.** The E32 could not scroll the drills clear of the pinned strip.
Theory one: old engines don't scroll to a container's own padding (true fact,
wrong diagnosis — v2.44.2). The real cause, found via CDP on the live device:
**the strip's height is variable** — it carries the output-lead note only
when a lead is in force, and the E32 wears a two-line "brought forward
750 ms" note that **no desktop test browser ever has**, because test browsers
have no calibrated outputs. The clearance is now measured from the strip
(`--strip-clearance`). The class of bug to remember: *state that only real
devices accumulate makes layouts that only real devices break.*

**Each phone fails in its own dialect.** The E32 (WebView 94) failed on old
engine behaviour — the `roundRect` lesson again, now recorded in `index.css`
too. The iPhone failed on modern geometry: sticky `top: 0` is the viewport's
top, which is under the clock on a notched phone; Android's zero inset hid it.
Tabs stick at `var(--safe-top)` with a scrim behind the status bar.

**`git checkout <file>` wiped my own uncommitted work. Twice.** Both times
while restoring a deliberate mutation after mutation-testing. Stash the real
edit, or re-apply the mutation by hand — never checkout a file carrying
unpushed surgery.

**The suite still cannot see any of this.** Today's visual faults — the
ghosting band above the tabs, the strip overlap, the notch collision — were
all found in screenshots or on glass, never by an assertion. `npm run shots`
photographs; simulated notch insets can be forced with
`--safe-top: 47px` on the document element.

## What is deliberately left open

- **The phone pass.** Sixteen releases deserve one end-to-end session on both
  phones before the redesign is called settled. The version line under Start
  exists so a stale cached copy cannot impersonate a fix.
- **`REACTIVE_SOUND_MAX_LEAD` is 100ms, the player's first guess.** It also
  withholds the cushion from an iPhone on headphones (~200ms measured). His
  to tune by ear; the constant is in `engine/session.ts`.
- **"Favour notes I get wrong" ships default-on**, newly visible inside
  Sight-reading. Whether a beginner's first exercise should be biased by an
  empty history was flagged and deliberately not changed.
- **The course's one-run tempo override at the gate** (drag it down for one
  tired run without rewriting the ladder) is designed, not wired — the gate
  currently leaves course runs' generation alone entirely.
- **The structured side of the frame**: the embedded PracticeScreen keeps its
  own in-flow Start; only Free play has the pinned strip. Asymmetry accepted
  today, unexamined.
- **ScorePicker and ImportScreen still use sticky strips** — untouched, and
  possibly fine, but they have not been looked at since the strip lessons.

## What is next

**4.2 — the real Android shell.** The spike left it nothing but green lights:
Capacitor toolchain installed and proven on this machine (JDK 21, SDK 35,
first APK built and run on the E32), microphone-in-wrapper works, input
latency ~100–140ms and stable, the in-process HTTP server freezes ~7–8 min
off charge and thaws intact (so Phase 5's foreground service exists to
survive the screen timeout, nothing grander), and the OS names the player's
Bose QC45s — so the shell should read the audio route: prefill output names,
and switch the calibration profile when the route changes.
`../container-spike/` is its own small git repo, local only.

**6.2 — two-voice themes**, fully specified in the roadmap, needing the
player's ear in the room.

**The generator** sleeps again. Its § 14 ends with the honest instruction:
the next hour there is annotation (which bars hold a rest; note-level ground
truth on a few pages), not another training arm — six axes failed to move a
population nobody has opened. One adoption candidate waits: `--head-weight
15` (+1.2 notehead precision, free), pending a second seed by its own rule.

## How to work here

Small, complete changes. Run the gate — and check its exit code. Write the
reasoning into the code where the next person will meet it, including what
was tried and abandoned; today added several long site-histories and they are
the map of the player's taste.

**Mutation-test anything that guards.** Everything shipped today was: the
clock slew (both directions), the visibility stop, the channel checks before
that. **Look at the picture** — and when a picture disagrees with a phone,
**measure the phone**; adb plus CDP turns an argument into a number in one
minute. Push without asking once the gate is green; push `origin`, never
`legacy`; tag every version; confirm the deploy. Nothing ships to a player
unheard.
