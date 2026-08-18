# Handover — 2026-08-18/19, the session that made Brass Master a product

You are picking up **one half** of a two-app product, from a parent folder
holding both this repository and its sister. This half is *Brass Master*: the
practice app, free on the web at **brassmaster.net** and — from version 3 —
paid on the App Store. The other half turns photographs of band parts into
MusicXML. They meet at one seam.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.** The failure mode of a
two-repository session is reading both test suites into context and having no
room left to think.

## What to read, and what to leave alone

| | Lines | When |
|---|---|---|
| `handover.md` — this file | ~250 | Now, all of it |
| `../CLAUDE.md` | ~60 | Now. The seam, and which remote is which |
| `v3-library-plan.md` | 130 | **Before any capture, library or v3 work.** The ruling the last session turned on |
| `app-store-plan.md` | 260 | Before version 3. What is free, what is paid, what the split costs |
| `v2-design.md` | 2,960 | **Never end to end.** Grep it for the noun you are touching |
| `musicxml-import-plan.md` | 477 | Only when touching `import/` |
| `tempo-map-plan.md` | 607 | Only when touching the clock or the conductor |
| `endless-play-plan.md` | 161 | Only when touching the offer or scoring |
| `tunes-plan.md` | 102 | Only when touching the theme composer |

22,000 lines of production TypeScript and 17,000 of tests. Do not survey it.
**Every "why is it like this?" has an answer in `v2-design.md`, and the way to
find it is to grep for the noun** — `grep -n "fourth valve"`, `grep -n "open
note"`. Its headings are a map: `grep -n "^## " docs/v2-design.md`.

## Where this stands

**v2.25.0, deployed at https://brassmaster.net and green.** 1,080 tests across
51 files. The gate before any push is `npm test && npm run build && npm run
lint`, all three, every time — and now `npm run check:web` as well when
anything touches the build split.

A brass-fingering trainer: it generates or imports notation, scrolls it past a
strike line, and judges whether the player had the right valve combination
down as each note arrived. Metronome, animated conductor, tempo dial, key dial
that re-keys mid-run, reference tone that follows the fingers, weak-note
drilling. No backend, no network at runtime, no accounts.

## What this session did, and it was mostly not code

**The two workspaces were reconciled.** Both halves had written handovers for a
combined session; they agreed on everything except who owns the music library,
and that one disagreement is now ruled on.

**The product forked in two, deliberately.**

- **The legacy app is frozen.** `mihatherl.github.io/BrassFingeringTrainer`
  still serves *Brass Fingering Trainer*, under its old name, with My Music
  intact, for the handful of band members using it. Its repository has a final
  commit reverting the rename and **must never be pushed to again** — it is the
  `legacy` remote here. Their histories have diverged, so an accidental push is
  rejected as non-fast-forward; the freeze protects itself.
- **Brass Master is a new origin.** `github.com/mihatherl/BrassMaster` →
  brassmaster.net, HTTPS enforced, full history and all 114 tags carried over.
  It began with **no users and no libraries**, which is what made the next
  decision cheap.

**Why fork rather than move.** A PWA's origin is its identity: installs and
IndexedDB do not follow the app to a new domain. Moving would have stranded
every install; forking strands nobody and leaves the old players undisturbed.

**Then two real pieces of code**, both merged and deployed:

- **The runtime entitlement tier is gone.** `entitlements.ts`, `licence.ts`,
  `constrainToEntitlements`, `FREE_TIER`, `VITE_GATED`, `.is-locked` and 21
  tests — 881 lines deleted. Nothing in the app now knows money exists.
- **The build split exists (v2.25.0).** `VITE_TARGET=web|app`, injected as
  `__HAS_MY_MUSIC__`. The free web build no longer *contains* My Music — not
  the screen, not `import/`'s 2,900 lines of parser. Verified in the deployed
  bundle, not merely locally.

## The rulings this session added

**The phone owns the library; the desktop library is bypassed.** The full
record is `v3-library-plan.md`, and it deprecates whole sections of the sister
project's integration spec. In brief: from v3 the paid app holds the music and
serves it VLC-style — phone shows a URL, laptop browses in, pulls a file out,
edits it in MuseScore, puts it back. The sister app becomes a stateless
converter: photographs in, review, one corrected MusicXML file out. No mirror,
no manifest, no sync protocol, no `folder` field, no IndexedDB migration.

**The paid line is drawn at build time and nowhere else.** A runtime flag was
the wrong tool for a paid *feature*: `isUnlocked` read a `localStorage` key
anyone could set, and withholding the microphone that way would mean shipping
it to the build that must not offer it.

**`web` is the default target, deliberately.** Forgetting the variable ships
the *smaller* product. A free app missing a paid feature is a bug found in a
minute; a paid feature leaking into the free build could go a release
unnoticed.

## Where I went wrong today

**I wrote the build flag twice in ways that shipped the paid code anyway, and
neither showed on screen.** First a constant imported from a `target.ts`
module: Vite substitutes `import.meta.env` per use site and the value does not
survive a module boundary, so Rollup kept the chunk. A static import would
have done the same. Both times the app *behaved* perfectly — the door was
hidden, the screens worked, every test passed — and the parser was sitting in
the bundle regardless.

**The lesson, and it generalises past this flag: a build-time rule needs a
build-time check.** No assertion in the suite can see what is in `dist/`. That
is why `tools/check-web-bundle.mjs` exists, why CI runs it on every deploy, and
why I mutation-tested it against both builds rather than trusting that it works.
If you add a second paid feature, add its fingerprint to that script's list.

**I also deployed the rename to the legacy address before the fork was
decided**, so its users briefly saw "Brass Master" before the revert put it
back. Harmless, but it was avoidable: the cutover question — *what happens to
existing installs?* — should have been asked before the first deploy carrying a
new name, not after.

## Rulings a newcomer breaks

- **The fourth valve stays invisible, everywhere.** Five notes on an E flat
  bass are fourth-valve notes wearing three-valve clothes. `Fingering.usesFourth`
  exists for this, and **the intelligent tuner is the first feature that has to
  read it** — a tuner that blames the first slide after hearing an F3 is telling
  the player to bend a slide that was never in the sound.
- **The clef shows once, on the first line only** — not on the topmost visible
  line. Got wrong in 1.2.1, fixed urgently in 1.2.2.
- **Import unfolds, it does not navigate.** Repeats are expanded into a
  straight read; scanning is explicitly not this app's problem.
- **An open note asks for evidence** — and that rule belongs to the buttons,
  inside `ValveInput.answers`, not to the judge.
- **The clock is the truth and the sound moves.** Every sound is handed over
  early by the output's lead; notation and judging read the clock unchanged.
- **Nothing is inferred from silence.** Carrying on past the end is something a
  player *asks* for, by pressing or by playing on.
- **No double accidentals**, anywhere in spelling.
- **No network requests at runtime.** It is what makes the app offline,
  private, and cheap to sell once. Protect it deliberately.
- **Silently ignoring a choice is worse than refusing it.** The retired tier's
  one good property: a player given a substitute without being told concludes
  the app is broken rather than limited.

## What is left, carried forward

**Version 3, in the order `app-store-plan.md` argues for** — steps 1 to 3 are
now done, so what remains is:

1. **The container spike**, and it now has two questions rather than one: the
   microphone inside the real wrapper *playing the reference tone while
   listening*, and **an embedded HTTP server** in the same wrapper — serving a
   page, accepting an upload, the `NSLocalNetworkUsageDescription` prompt at
   the moment the user reaches for it, and what backgrounding does to the
   socket. Do this before the detector; it can change the detector's design.
2. **The cents measurement** on the player's own instrument, which decides
   whether the tuner can promise what it says.
3. **The detector in TypeScript** against `spikefiles/`, behind `PlayerInput`.
4. **The tuner**, reading `usesFourth` and per-instrument slide data.
5. **The phone's server API** — what the laptop may ask of the library. Write
   it as `CONTRACT.md` at the workspace root *before* either side builds to it.
   Also open: whether the v3 library is real files in the app's Documents
   directory (which gets AirDrop and the Files app for free) or IndexedDB.

**Version 2, none of it blocking version 3:** the theme composer's stages 2 and
3; the settings screen overflowing by 70 points on a 360×740 phone; the
key-change collision on the scrolling line; leaps per instrument rather than
per difficulty; the conductor's compound-time verdict and its two guessed
thresholds; the importer's four gaps (tempo marks, `<transpose>`, a real
multi-part score, the long-rest skip); and the v2.16.1 sample-early fix,
withdrawn and not asked for back.

**Refactorings worth doing before building on top:** the *Monitor* — pulling
`followFingers` and `applyVolume` out of `Session`; `SettingsScreen.tsx`, still
over a thousand lines even after this session took 170 out of it; `generate.ts`
at over sixteen hundred, most of it the walk, with the drills waiting to be cut
out as `compose.ts` already was.

**On the player's desk, not mine:** create the app record in App Store Connect
to reserve the name — the bundle identifier is **`net.brassmaster.app`** and it
can never be changed once on sale.

## How to work here

**The gate is three commands and all of them count**: `npm test`, `npm run
build`, `npm run lint`. Check the build's own exit status, not a grep of its
output. Anything touching the free/paid split adds `npm run build:web && npm
run check:web`.

**Push without asking** once the gate is green — standing permission since
2026-08-10 — then confirm the deploy rather than assuming it. **Push to
`origin`, never to `legacy`.** Tag every version on its last commit at that
version, and push with `--follow-tags`; note that `--follow-tags` carries only
*annotated* tags, which is how 65 of this repository's 114 tags were missed on
the first push. Patch for pure corrections, minor for features, major only for
a change of category. A refactor with no player-visible change gets no bump.

**Write the ruling into `v2-design.md` in the same release as the code.** Plans
live in `docs/*-plan.md`. This file is replaced each session; move the durable
things out of it before that happens.

**Mutation-test every new rule.** Change the rule, watch the test fail, put it
back. **Back up with `cp` before mutating, never with git** — `git checkout
<path>` on unstaged work is oblivion, and it cost an hour of work last session.

**Measure before deciding, and put the number in the docs.** The theme gap, the
tuba bloom, the headset lead, the response time, the pitch settle — all were
numbers before they were fixes.

**Look at the picture.** `npm run svg` renders an exercise to SVG, `npm run
shots` drives the real app at five viewports and photographs it, `npm run
tunes` engraves composed music by the dozen. Notation faults are positional and
no assertion sees them.

**Ship trials behind the URL** — `?voice=plain` — so a phone can try something
without a second deployment. (`?tier=free` is gone with the entitlement tier.)

**When the player is at the other end of the line, ask before you instrument.**
Last session six settings combinations were probed on a deployed app before the
one question that resolved it in a sentence — the phone's silent switch, which
iOS applies to Web Audio and not to media elements.
