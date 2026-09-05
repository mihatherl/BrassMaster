# Handover — 2026-09-05, the day the modes became one hierarchy

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator. The third is
`../container-spike/`, run and closed; `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-09-04-phone-and-playlist.md` — the
long day the phone used the tool. Everything it says stands except where
this file says otherwise. This one covers **one conversation on
2026-09-05**, a design day with the player that ended in three commits and
a release: **v2.67.0**, the first push since 2.66.0, carrying the thirty
commits before it as well.

## THE FIRST THING TO KNOW: the settings screen has a new shape

**One plan document, `reading-tab-plan.md`, holds the whole day**: nine
rulings, three slices, two of them built. Read it before touching
`SettingsScreen`. In one paragraph:

The player opened with *"our interface is becoming a bamboozlement of modes
and selections"*. Five two-line tabs — Sight-reading, Themes, Rhythm, Drills,
My Music — answered the same five questions (what music, which keys, how
hard, what metre, what order) in three vocabularies. Now there are **three
tabs — Reading, Drills, My Music — and a What row under Reading: Phrases,
Tunes, Rhythms.** The kinds keep their ids (`phrases`, `themes`, `rhythm`),
so nothing stored migrated; only the names changed, in all seven packs.
**Sticky is the lowest level**: the What row under Reading, the tab strip
under Drills. Below the source box the order is fixed (Keys, Difficulty,
Time signature) and **a slot is never absent** — where the material has
already answered, its place says so ("Set by your playlist", "Follows the
tune", "Chosen by the pattern's stage").

**And a passage you wrote is a tune.** The player's ruling, mid-afternoon,
and the repository already held it in his words twice: an authored cell —
rhythm plus notes — is a difficult passage from a part, practised for its
own sake, and Rhythm mode's law (*hold the rhythm, vary the notes*) cannot
hold one. So the cells on the shelf are now a collection, **My tunes**,
under Tunes from (`myTunes()` in `exercise/rhythm.ts`, read from storage by
the callers and handed to `themesOf` and its kin as `extra`). A passage
plays **as written**: `Theme.written` carries the author's key,
`realiseTheme` opens in it whatever key the run tours and pins the register
to `cellWrittenMidi`'s rule instead of floating — one placement for the
editor, the rhythm run and the tunes run. The level filter admits it at
every level; the picker offers it its own key and no other; `sanitise`
keeps such a step though its key is not on the grid. `settings.ts` now
imports `rhythm.ts` behind the `__HAS_RHYTHM__` literal, and `check:web`
proved the free bundle still folds it away.

**The roadmap's "no notation editor" line changed.** The player: *"I'm
someone who has always struggled a lot with MuseScore. I think we have come
up with a really simple and fit-for-purpose passage editor which really
fits the bill for what this app is really all about."* § 6 now says "a
score editor", with his words, and points at the plan.

## What is deliberately not done — slice 2b and 3

- **The passage editor still opens from the Rhythms cards** ("+ Write
  notes", the ✎), and the cell chips there still play under the count band.
  Moving the editor to My tunes, giving tune steps the **ways** (as written,
  rhythm only, random notes, variations) and merging the two playlists into
  one component with one vocabulary (Shuffle / In order / Clear) is
  **slice 2b**. The Rhythms box then becomes the pattern library alone.
- **Mixed runs** — steps of different kinds in one run, count-first as a
  Beat option in the gate — are **slice 3**, and the bridge into the
  roadmap's planned session (§ 1.5).
- **Difficulty is not renamed Level**, on purpose: the course screens use
  "level" for a rung. Drills stays alone by the player's word, though it
  fits the same frame.
- The Reading tab, tapped from Drills, returns to whichever reading
  material was open last *during that visit to the screen*, and to Phrases
  otherwise — a `useRef`, not a setting. A remembered `readingKind` is the
  upgrade if his hands want it.

## Where I went wrong, so you need not

- **`npx vitest run` is not `npm test`.** The script sets `VITE_TARGET=app`;
  bare vitest builds the free target and every paid-side test fails with
  "Unable to find … Structured Learning", which reads like a broken screen
  and is nothing of the kind. Fifteen phantom failures before I noticed.
- **A test that throws mid-way leaves the URL where it was.** The Portuguese
  i18n screen test set `?lang=pt-PT`, failed on an old tab name, and never
  reset — so the two tests after it ran in Portuguese and failed too. One
  fault, three red tests.
- **`.field { display: block }` is declared late in `index.css`** and wins a
  tie with any `.field--x` declared earlier. The slot line needed
  `.field.field--slot`. Check the cascade order before trusting a new class.
- **Two python scripts asserted the wrong replacement count** and aborted
  after writing one file of three. Print what was written; do not chain
  asserts across files in one script.
- **The stale-copy question is unanswerable from the version line**:
  nothing bumped 2.66.0 for a week of builds. The tell is the build stamp
  in the gate's Preferences (`__BUILD_TIME__`, UTC), or the tab row itself.
  Now that 2.67.0 is out this is moot until the next quiet week.

## Deliberately open, and named

- **The new rhythm that did not appear** (the player, on 8450, before the
  release). Not reproduced: a scripted paint-and-save lands under My
  rhythms at once. Two candidates named to him — the metre filter hiding a
  rhythm in another signature, or a stale copy on the phone — neither
  confirmed. Ask again on the released build.
- **The Rhythms box overflows a 390 px phone** on the right: cards and stage
  headings both. Pre-existing (the 2026-09-04 screenshots show it), not
  from today, and unfixed.
- **THE PLAYING PASS, still**, plus today's: a passage under My tunes in a
  medley and in a defined list on a real instrument; the sticky What row
  under a thumb; the slots reading right on the E32.
- **The voice**, the E32 feel constants, playlist reorder, spine stages
  5–9, cells inside courses — all as the previous handover left them.
- **The keystore backup is STILL not done** — tenth handover to say so.
  `~/keystores/brassmaster/`, off this machine.
- **The i18n pile grew again**: nine new keys in seven machine-drafted
  packs today, and every pack still wants a native brass player's pass.

## The release

**v2.67.0**, cut at the end of this conversation: minor bump (the day
added features), the full gate in the stated order — `npm test`,
`build:web`, `check:web`, `lint`, `build:dev` last, exit codes deciding —
push to `origin` (NEVER `legacy`), tag, deploy confirmed on
brassmaster.net. What the free site gained: the Reading tab, the renamed
materials, the slots, and the accumulated free-side work of the thirty
commits before. What it did not: anything behind `__HAS_RHYTHM__`, which is
where My tunes lives.

## How to work here

Unchanged: small complete changes; the full gate with exit codes deciding;
mutation-test what guards; rulings into the plan document dated at the
section they amend (`reading-tab-plan.md` now, `rhythm-plan.md` for the
rhythm workshop); let the player use the thing and take his phrasing as
the diagnosis. Playwright against 4173 with element screenshots for your
own eyes before his — today that caught two faults the tests could not
see (a wrapped slot line, and a count that ignored My tunes). Push
`origin`, never `legacy`.
