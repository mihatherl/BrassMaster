# Handover — 2026-08-28, after the week the course became real

You are picking up **one third** of a workspace, from a parent folder holding
three repositories. This one is *Brass Master*: the practice app, free on the
web at **brassmaster.net** and — from version 3 — paid, on Google Play first.
The second is the parked MusicXML generator (its next hour is annotation, and
`train/annotate_bars.py` is the tool). The third is `../container-spike/`,
run and closed; `FINDINGS.md` is the record.

**Read this file, then `../CLAUDE.md`, then one plan document for the task in
front of you. Nothing else, until you need it.**

The previous handover is `handover-2026-08-23-play.md` (the night the app
reached Google Play), patched through this week and now superseded. This one
covers 2026-08-24 to 28: seven releases, v2.48.0 through v2.54.0.

## What to read, and what to leave alone

| | When |
|---|---|
| `handover.md` — this file | Now, all of it |
| **`roadmap.md`** | Now, and before proposing any feature |
| `../CLAUDE.md` | Now. The seam, and which remote is which |
| **`course-plan.md`** | Before any pedagogy or course work — **ratified 2026-08-26**, revised twice since by playing, every revision dated in place |
| `rhythm-plan.md` | Before any rhythm-drills work — ratified, deliberately unscheduled, and it binds the course schema (optional keys) |
| `device-testing.md` | Before any session touching the shell or a phone |
| `../container-spike/FINDINGS.md` | Before any Phase 2/5 work |
| `v2-design.md` | Never end to end. Grep it for the noun you are touching |
| `difficulty-model-plan.md`, `app-store-plan.md`, `v3-library-plan.md`, `musicxml-import-plan.md`, `tempo-map-plan.md` | As their subjects come up |

## Where this stands

**v2.54.0, pushed, tagged, deployed and green** — and since then, unpushed
on this machine, the work below: **1,525 tests across 76 files**.
The gate before any push is `npm test && npm run build && npm run lint`,
plus `npm run check:web` and `npm run check:channel` when anything touches
the build split. **Gate order matters now**: a plain `build` empties
`dist/`, so run `build` → `build:web` → the checks → **`build:dev` last**,
which restores the tailnet copy on 4173 (`vite preview` serves whatever sits
in `dist/`, and this has bitten four sessions).

**The site has two halves**: a landing page at `/` — in English, German,
Dutch and French (`/de/` `/nl/` `/fr/`) — and the app at `/app/`. Only the
*web* build assembles this (`tools/site.mjs`, which explains everything,
including why `site/CNAME` failing to arrive fails the build and why
`site/sw.js` is a tombstone that must stay). **The landing copy and its packs
move together**: edit `site/index.html` and `site/translations.mjs` as a
pair, or the assembler refuses the build naming the language and the string.
`feedback@brassmaster.net` forwards via ImprovMX (MX + SPF at GoDaddy) to the
player's inbox, tested end to end.

**Courses are the product's spine now, and they are documents.**
`exercise/course.ts` replaced the ladder on the 26th and was reshaped twice by
the player playing it — the full arc is in `course-plan.md`, each revision
dated. As built:

- `readCourse` reads a plain document, forward-tolerant (unknown fields
  ignored), refusing loudly what it cannot trust. The bundled *Common Keys*
  course (`exercise/courses/common-keys.ts`, typed `unknown`) goes through
  the same reader a user's file does. **Its content is scaffolding — the
  curriculum is the player's to author, and editing that file is authorship.**
- **A step is written into the music.** `continueFrom` (in `rekey.ts` — the
  generalisation that file promised itself) splices the next level's material
  from a bar line; `Session.courseStep` does tempo, material and the label in
  one call at `keyChangeBeat`'s end-of-following-bar lead;
  `Transport.changeTempoAt` lands the tempo there. Manual presses and the
  author's rule both go in-stream; *Stay here* rewrites the future back; the
  transient veto lives at module scope in `ui/course-vetoes.ts`; **position
  commits when the playhead crosses the join** — mutation-tested, twice.
- The author's rule (`advance`: afterBars / windowBars / accuracyAbove) has
  **evidence that resets at every crossing** unless the author sets
  `carryEvidence` — the player found the always-carry fault within hours of
  the join shipping, and the test replays his evening.
- **The graphical editor** is at `/editor.html` in the paid build only (its
  own Vite entry, excluded from the PWA precache like the spike pages).
  Validation is `readCourse` live, so a file that reads clean there imports
  clean on the phone — the practice screen has import (refusals quote the
  reader verbatim), a picker, export, and delete. Built on the player's
  insistence over the file route, schema-rework risk accepted and recorded.
  **The phone-hosted server is untouched, still Phase 5.**
- `pinned` (metronome/conductor so far) shows disabled at the gate with "Set
  by the course". The bundle fingerprint moved with the storage rename:
  `check:web` now trips on `brass-trainer:course:`.

**The honesty rulings, all live**: a run nobody played is never filed
(`wasAttempted`; the commit happens on the way *out* of the results screen
because the merged stores have no inverse); a played run can be disowned
there; an open note asks the whole run for engagement evidence, not two
notes (the Jingle Bells fix). The metronome has a player-set level with a
preview click that is the real `Metronome`, scheduled 80 ms ahead of its own
volume ramp.

**i18n, built and then rebuilt the same day** (roadmap § 7.6). The morning's
version was scoped to labels and buttons and did not reach even that; the
player played it in German that evening and found the fault the tests could
not: *"Back" was a button on six screens and one of them translated*, and the
German landing page dropped its reader into an English app. Now: **244 keys,
every screen, all three packs complete**, `?lang=` carried from `/de/` into
`/app/` and `navigator.languages` consulted on a first run only.

**The part to keep is the guard, not the translations.**
`i18n/coverage.test.ts` reads every `ui/*.tsx` and fails **by name** on a
string that skipped `t()` — plus a key a pack lacks, a placeholder a
translation dropped, and a domain label drifted from its key. Mutation-tested
on all four. The landing page has had this check since it was built
(`site.mjs` refuses to assemble on drift); the app had none, and that
asymmetry is the entire explanation for how coverage got to a third while
1,386 tests stayed green. **A build-time rule needs a build-time check** —
the same sentence `check:web` is there for.

Then four more languages the same day (v2.56.0): **Spanish, Italian and two
Portuguese** — `pt-PT` and `pt-BR` split on the player's ruling, because
ecrã/tela and telemóvel/celular sit on the screens a new player meets first.
**Eight locales, seven packs of 247 keys, seven landing pages**; `/pt/` and
`/pt-br/` are separate search surfaces linking to `?lang=pt-PT` and
`?lang=pt-BR`. Regional-subtag matching landed with them, which is the road
the US-English fork now only needs a pack to walk.

**The packs are also split by build target now.** They were plain objects
imported unconditionally, so the *free* bundle carried My Music and course
prose in every language — describing a product it has no code to run.
`i18n/paid.ts` holds those 488 strings behind `__HAS_MY_MUSIC__` and
`__HAS_TEACHER__`, and `check:web` fingerprints one string per bucket so the
fold is proven every deploy, not hoped. Two buckets rather than one, because
`vite.config.ts` refuses a single `__IS_PAID__` and the same argument applies.

Still deliberately untranslated: course content, tune and collection names,
instrument names, the editor. Still **awaiting a native brass player's
pass** — now seven languages of it, live. That obligation has grown with
every session and no session can discharge it.

**The key a course level does not name** (2026-08-29, v2.57.0). Found by the
player authoring a real course: the optional-key ruling was correct and
unreachable, because the key grid is on the free-play home screen and nothing
in the structured flow could answer it. The **Ready gate now owns the key on a
course run and says who chose it** — locked with "Set by the course" where the
author named one, live where they did not. One key never a set;
`settings.courseFifths` keeps the answer apart from free play's tour; and
answering **regenerates the music**, which is the one exception to "never
rebuild a course run's exercise" and is the course's own instruction being
obeyed. The remembered key carries from a major level to a minor one
untranslated — the app stores a signature, so C major and A minor are one
number and only the label moves. Full reasoning in `course-plan.md`.

**The road to v3.0, ruled this week**: teacher mode + the microphone *with
its calibration* + My Music. The tuner is out (deferred to v3.x — it was
drafted in as a mic dependency and is not one; § 2.4's recognition
calibration is what the mic needs, § 2.5 takes the player's own range from
it). Headphones all but required in mic mode. **The Play internal track
sleeps** — 4.2 was a proof about the player, proved; do not upload AABs.

## Where I went wrong, so you need not

- **`npx tsc --noEmit` checks nothing here** — the root config is
  `files: []` references. It passed while a test file missed three required
  props. `tsc -b`, always (it is what `npm run build` runs).
- **`git checkout -- <file>` cannot restore an untracked file.** A mutation
  test on a not-yet-committed module left the mutation in; the tests caught
  it, the checkout did not. Revert mutations by hand on new files.
- **The calibration prompt appears *after* "Tap to start".** Two playwright
  sessions stalled dismissing it before the tap. Tap first, then accept.
- **The countdown design lived one day.** Built to the ratified plan, played
  by its author, rejected ("stops mid note… freezes"). The lesson is the
  method: phase 2 shipped small precisely so playing it could correct it —
  twice. Build the playable version early; the player's evening is worth
  more than the plan's elegance.
- **A render prop's identity in a session effect's deps would tear the run
  down mid-note.** `courseControls` is read through refs inside `PlayScreen`'s
  session effect, deliberately — see the comment there before "fixing" it.
- **The transient veto must be module-scope**: every passage rebuilds the
  component, and a veto a rebuild forgot nags two bars later; storage would
  make permanent what the ruling says is transient.
- **A feature with no guard is a feature that decays, and i18n proved it in
  under a day.** The morning shipped a translation mechanism whose own design
  note explained why partial coverage was acceptable ("degrades to mixed,
  never broken"); by evening the coverage was a third and the note was
  excusing the rot rather than describing it. Nothing failed, because nothing
  was checking. The landing page could not have this bug — `site.mjs` had a
  drift check from its first commit. **When a rule lives outside the type
  system, write the check in the same sitting as the rule**, or the next
  session inherits a claim rather than a fact.

## What is deliberately left open

- **The keystore backup is STILL not done** — `~/keystores/brassmaster/`
  (`upload.jks` + passphrase), off this machine. Fifth handover to say so.
  Also worth one look in the Play console: whether Play App Signing is on
  decides whether a lost upload key is a reset or a catastrophe.
- **The curriculum.** The editor exists; *Common Keys* is scaffolding; the
  levels and their order are the player's intuition, in the editor or in
  `courses/common-keys.ts`. Nothing ships unheard — satisfied by
  construction if he authors them.
- **Native review of the seven language packs** — 247 keys each, plus 40
  landing-page strings apiece, all live on brassmaster.net. This is the
  largest open item in the repository that no session can discharge, and it
  has grown at every step. The open **US-English fork** (crotchet → quarter
  note) is still the smallest pack and the largest Play audience; regional
  matching exists now, so it is a pack and two lines. Answer it together with
  `describeSkill`'s notation vocabulary on the Progress report — the one
  string set the sweep deliberately left English, because both ask the same
  question.
- **Request indexing** for `/de/` `/nl/` `/fr/` in Search Console (the
  sitemap lists them; a nudge is faster).
- **Pins do not switch mid-stream**: a level join changes pinned options only
  from the next pass of the gate. Fix when playing shows it matters.
- **Switching courses discards the old course's position** (one Progress per
  instrument/clef). Cheap to live with; noted so it is a choice.
- **`carryEvidence` is per rule, not per step-kind** — an author cannot yet
  say "carry across tempo steps, reset at level joins". The cells axis is
  where this question will return.
- **The QC45 route test** — still the one 4.2 capability never watched
  working. Bench-only.
- **The advance/mastery constants are provisional** and must be tuned only by
  the player playing a real course, per the plan's own law.

## What is next

**The pedagogy's content, then Phase 2.** The machinery — courses, stepping,
the editor, the honest stores — is built and played. What no session can do
is the curriculum: that is authorship, in the editor, with the player's ear.
After that the roadmap's build order is the **microphone with its § 2.4
calibration** (detection is proven; the fingering-not-pitch seam makes octave
errors free; the scale-based calibration and § 2.5's player range are
designed and waiting), with `course-plan.md` phase 3 (author cells) and the
free-taster flag split as the nearer, smaller items. The generator sleeps;
its next hour is a musician's, in `train/annotate_bars.py`.

## How to work here

Small, complete changes. Run the gate in the order above and check exit
codes. Write the reasoning into the code where the next person will meet it —
this week's rulings all live at their sites, dated. **Mutation-test anything
that guards** (this week: the crossing commit, the whole-window rule, the
evidence reset, `wasAttempted`, the volume clamp — each pinned by a test that
replays the real failure). Design before building, and then **let the player
play it before believing it**: the week's two best corrections came from his
evening, not the plan. Push without asking once the gate is green; push
`origin`, never `legacy`; tag every version; confirm the deploy on the live
site, including that the paid fingerprints stayed out of the free bundle.
Nothing ships to a player unheard — and now, in any language, unreviewed.
