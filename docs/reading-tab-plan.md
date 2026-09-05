# The Reading tab — one hierarchy for the reading materials

**Designed 2026-09-05 with the player, over mockups he judged as they were
drawn** (the canvas "Reading Tab"; the rulings below are the record, the
mockups were the argument). Read `roadmap.md` § 2 first, then
`rhythm-plan.md`'s selection-phase section and `authored-cells-plan.md`:
this plan amends both, and says where.

## The problem, in the player's words

> The work we have recently done on rhythm is really good, but I'm concerned
> our interface is becoming a bamboozlement of modes and selections. "My
> Music" and "Drills" are two modes that really stand alone, but I think the
> other three — Sight-reading, Themes and Rhythms — can be consolidated.

What the inventory found (the settings screen photographed tab by tab,
2026-09-05): the three tabs answer the same five questions — what music, in
which keys, how hard, in what metre, in what order — in three vocabularies
built weeks apart. The key grid meant a tour set, a nomination set and a
single key; "Time signature" meant the composer's metre, nothing, and a
filter; Difficulty and Stage were one idea with two names; two playlists
spoke two languages ("Random medley / Defined" in a sheet, "Shuffle / In
order / Clear" in a strip); and the control order changed per tab, so the
eye never learned where anything was.

## The rulings

1. **One tab, Reading, beside Drills and My Music.** Its first question is
   **What**: Phrases, Tunes, Rhythms. The three kinds are unchanged in
   storage (`phrases`, `themes`, `rhythm`); only the screen groups them.
   "Sight-reading" was the wrong name for a tab in an app that is all
   sight-reading; "Phrases" is what the generator always called them.
   "Themes" became "Tunes" to match "Tunes from" beneath it.
2. **Source-specific above the line, uniform below.** Everything a source
   alone needs — the collections and their tunes, the pattern cards and
   their filter, a phrase's range — lives in the box under What. Below it
   the order is the same for every source: Keys, Difficulty, Time
   signature, then the playlist where the source has one.
3. **A slot is never absent.** Where a source has already answered a
   question, the control's place holds one line saying so ("Set by your
   playlist", "Follows the tune", "Chosen by the pattern's stage") — the
   Ready gate's own pattern for course-pinned values, brought home.
4. **What sticks is the lowest level of the hierarchy.** Under Reading the
   What row alone stays pinned as the page scrolls, one line; the levels
   above (Free play, the tab) scroll away and are found by scrolling back
   to the top, where they were last seen. Under Drills the tab strip stays
   pinned, as it was, because there the tab is the lowest level. The
   player considered a breadcrumb that kept every level on one line and
   thought better of it: *"users should know that there are higher level
   options that they can find by scrolling back to the top of the page."*
5. **A passage you wrote is a tune.** Ruled the same day, and the
   repository already said so in his words twice (`authored-cells-plan.md`
   § *The use case*; `rhythm-plan.md`, the "As written" ruling of
   2026-09-04): an authored cell — rhythm plus notes — is a difficult
   passage from a part, practised for its own sake. Rhythm mode's law is
   *hold the rhythm, vary the notes*; a passage holds both, so it is not
   that mode's material. It belongs under Tunes as **My tunes**, paid, the
   phone-shaped half of My Music (import is desktop-shaped; writing eight
   bars in the band hall is not). Its editor moves with it.
6. **The way is orthogonal to the source.** A tune has a rhythm; strip the
   notes and a pattern remains. So the ways — *as written, rhythm only,
   random notes, variations* — apply to any tune step, Bach included, and
   the Rhythms source becomes the pattern library alone: rhythms with no
   notes, the same ways minus *as written*. "As written" as a chip
   dissolves: it is the authored key leading a passage card's key list.
7. **One playlist, one vocabulary, one step type.** Shuffle / In order /
   Clear everywhere; a step is an item, a key, and a way — the record a
   course level already writes (`CourseRun`) without its level id. A tune
   card opens to its keys and a pattern card to its ways, and + adds a
   step in both, greyed with a reason where the instrument cannot reach
   it. The payoff is the mixed run — a warm-up rhythm, the hard passage,
   fresh phrases — which is the roadmap's planned session (§ 1.5).
8. **Count-first is a way of running material, not a kind of it.** The
   demonstration bars, the count band and the voice are what Rhythm mode
   really owns, and a teacher counts a hard bar exactly this way. They
   want to become a Beat option in the Ready gate, on by default for
   rhythms and available for a passage. Not in the first slice.
9. **The passage editor stays, and the roadmap's line about it changes.**
   Roadmap § 6 said "a notation editor: correction belongs in MuseScore",
   and the cell editor is a small one, built inside the rhythm workshop.
   The player: *"I'm someone who has always struggled a lot with MuseScore.
   I think we have come up with a really simple and fit-for-purpose passage
   editor which really fits the bill for what this app is really all
   about."* The entry now reads "a passage editor, not a score editor".

## The slices

**Slice 1 — built 2026-09-05, screen only.** The three tabs, the What row,
the sticky rule moved to the lowest level, one-line tabs, the blurb under
What, the uniform order and the slots for Tunes and Rhythms. No engine
change and nothing stored migrates: `settings.kind` is the whole state, as
it was. Rhythm's own box (filter, Play in, playlist strip, cards) is
untouched inside its source box, pending slice 2. The Reading tab, tapped
from Drills, returns to the reading material open last during that visit
to the screen, and to Phrases otherwise — a remembered `readingKind` in
settings is the obvious upgrade if his hands want it.

**Slice 2 — the model.** My tunes under Tunes (authored cells become a
collection of the player's own; the note editor opens from there); ways on
tune steps; one playlist component and one step type serving Tunes and
Rhythms; the themes sheet retired in favour of cards that open. Engine work:
`stitchThemes` learns the ways (`rhythm only` is the alternating pair over
the tune's rhythm, `random notes` the walk over it, `variations` the
existing registry against a theme), and the rhythm step gains an optional
key.

**Slice 3 — mixed runs.** Steps of different kinds in one run: demonstration
bars and the count band inside a run that also carries tunes and phrases;
count-first as a gate option. Decides whether the beat-shading memory is
per source or per run.

## What it deliberately does not do

- **Difficulty is not renamed Level.** The mockups said Level; the course
  screens already use "level" for a rung, and one word meaning two things
  is the fault this plan exists to remove.
- **Drills stays alone.** It fits the same frame — a drill is a source
  with a shape for a browse — and can join it later if the player wants;
  he said it stands alone, and it does.
- **The free build's What row has two answers**, Phrases and Tunes, since
  Rhythms is paid; one conditional at the composition root, as
  `vite.config.ts` rules.
