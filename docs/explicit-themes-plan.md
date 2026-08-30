# Explicit themes — the tune list as an axis

**Built 2026-08-30**, in three gated pieces, after the player ratified the
design and settled all five open questions the same morning. The schema and
reader are in `exercise/course.ts` (`instruments`, the `themes` axis,
`ThemeStep`, `readThemeStep`); the run seam in `ui/course-run.ts` and
`ui/App.tsx`; the editor in `src/editor/` — the instruments control and its
warning in `main.tsx`, the tune stage, its stave and the picker in
`timeline/Timeline.tsx`, and the tune-length stage widths in
`timeline/layout.ts`.

The three pieces, in the order they landed and were gated:

1. **`instruments` at course scope** — the header setting, its four
   refusals, the editor's checkbox row and the undeclared warning.
2. **The metre narrowing** — `AXES.metre.kinds` to `['phrases']`, which
   fixed a live silent-ignore: a metre on a drills level was being accepted
   and then overwritten with 4/4 by the generator.
3. **The themes axis** — `themeCount` deleted, tunes named, the picker with
   the notes drawn, and stage widths taken from each tune's own `bars`.

Below is the design as ratified; the record of what changed under it is at
the foot.

Put up for the player's ruling, against his own concept stated the same
morning: *"The tune itself
isn't an axis. The axis needs to be the array of themes, which can be added
to, and the selection within each division is the theme itself."*

Read `level-axes-plan.md` first: the trichotomy, the bar as the x-axis, and
the block-as-stage drawing are all assumed here and none is reopened.

## The problem, in the player's words

> I was never really comfortable with the 'Random Selection of Themes',
> drawn from whatever is installed in the app. We don't know how long these
> themes are, we don't know if they involve notes that we haven't been
> practising already.

A themes level in a course today says `themeCount: 4` — *play four tunes*,
drawn at random from whatever collections are installed. The author cannot
say **which** four. So the level's actual musical content is unknown to the
person who wrote the level, which is the opposite of a curriculum.

Worse, it is a **regression against the player's own screen**. The Settings
picker already lets a *player* name their tunes and their keys
(`themeSteps`, `selection: 'defined'`), and `generate.ts` plays that list in
order, duplicates and all. The course author — the person doing the
pedagogy — has strictly less control than the player does. That is backwards.

## What already exists, and must not be rebuilt

Three quarters of this is built and shipping. The design is mostly about
**reaching** it from the course schema.

- **`themeSteps: ReadonlyArray<{ id: string; fifths: number }>`** with
  `selection: 'defined'` — `generate.ts:424`. A playlist: the tunes in the
  order given, each in the key its step names. It *maps* rather than
  filters, which is what makes duplicates and ordering work.
- **The level filter turns off** for a defined playlist, and the comment
  says why: *"somebody who has named the tunes has already answered the
  question the level exists to answer."* That reasoning is the whole of this
  plan, one scope up.
- **`realiseTheme(theme, {instrument, clef, fifths, metre})`** returns
  `null` where the tune will not fit. It is the fit oracle, already the one
  the picker uses.
- **The two-column picker** in `SettingsScreen.tsx`: available tunes grouped
  by collection on the left, the playlist on the right, click a tune to
  expand its playable keys. Unfittable tunes are shown **greyed with the
  reason**, never hidden — *"a player who can see the tune greyed can see
  that the keys are why, where a missing row is just a mystery."*
- **`detail(theme)`** already renders `16 bars · easy · 4/4`.

`Theme` carries `bars`, `difficulty`, `metres`, `mode`, optional `tempo`,
and its `events`. **A theme's length is known**, which is what makes the
axis below drawable.

## The model: one `themes` axis, tunes as its values

The player's ruling, taken literally and found to work:

- the axis is **`themes`**, a level's tune list;
- each **division** carries one tune — id plus the key it is played in;
- a **stage's width is that tune's own length in bars**, known from
  `Theme.bars`, so the stages are *fixed but variable* — the author does not
  set them, the music does;
- the **bar stays the x-axis unit**. Nothing in `layout.ts` is refounded.

This is the first axis whose stage widths are **not** the author's to drag,
and that is the point rather than a problem: a tune is as long as it is.
Dragging a themes divider is meaningless; reordering the list is the
gesture, and adding a tune lengthens the level by that tune's bars.

    bars        0        16          32                48        64
    themes      │ Ode to Joy │ Bist du bei mir │ Air        │ …
    tempo       │ 66     │ 72         │ 80                     │
    metronome   │ on                  │ off

Tempo and support axes cross a themes level exactly as they cross any other,
because they are measured in bars and the bars are known. **That is the
whole argument for keeping the bar as the unit**, and it survives here.

### `themeCount` is removed, not superseded

A `themes` axis and a `themeCount` scalar would be the same parameter in two
states, so the trichotomy would already forbid both. But the player ruled
further on 2026-08-30: **"any N" goes entirely.**

There is no `themeCount` scalar and no random draw from the installed
corpus. **A themes level names its tunes or it is not a themes level.** The
list *is* the count: four divisions is four tunes.

This is the plan's opening complaint carried to its conclusion. A level
saying "play four tunes, whichever" is precisely the thing that made a
course's musical content unknown to its author; keeping it as an option
would preserve the fault under a flag nobody should set.

**Consequence for the schema:** `themeCount` leaves `AxisId`,
`LENGTH_UNIT_FOR` and `CourseLevel`, and a document carrying it is **refused
by name** rather than ignored — the reader's own rule. The bundled *Common
Keys* has no themes level, so nothing shipped needs migrating. The player's
own Settings screen is untouched: a *player* may still ask for a medley, and
`selection: 'medley'` stays exactly as it is. This ruling is about what a
**course** may say.

## Keys: the part that needs care, and a precedent that decides it

The player flagged it: *"we need to be careful that we validate the
applicability of the key/instrument to the theme."*

**A step already carries its own key** (`{id, fifths}`), and the runtime
already draws the consequence: when a themes run is a defined playlist,
`App.tsx:636` **removes the key dial entirely** — *"the material has already
answered."*

So the ruling proposed is the one the runtime already makes:

> **On a themes level whose tunes are named, the key belongs to the step,
> and a `fifths` axis is refused by name.**

Not silently ignored — refused, with the reason, the way every other
material mismatch is. A key axis and a tune list are two answers to one
question. This is the `AXIS_MATERIALS` rule applied to a pair rather than to
a material, and it needs one new refusal in `readCourse`.

A themes level that does *not* name its tunes keeps its key axis, unchanged.

### The instrument problem, and the header setting that answers it

`realiseTheme` needs an **instrument** to judge fit, and until now **a course
has been instrument-agnostic** — `Timeline.tsx:285` states it, and the
preview-instrument selector exists precisely because of it. A course authored
on an Eb bass is played by a cornet, and the editor could therefore only ever
advise.

**The player reframed this on 2026-08-30, and it changes the answer:**

> If the point of this is to allow a music teacher to put together a body of
> work for students on a particular instrument or instruments, perhaps we
> need that as a header setting. That is, this course is guaranteed to be
> suitable for cornet, flugel and tenor horn, for example — and may work for
> others.

So the course **declares its instruments**, and that declaration is what
makes fit checkable rather than advisory. It is a header setting in the
strict sense of the trichotomy's header half: a scalar (here a set) the
course states once, never an axis, because a course does not change
instrument partway through.

    { id: 'brass-band-upper', name: '…',
      instruments: ['cornet', 'flugel', 'tenor-horn'],
      levels: [ … ] }

**The reason to declare is pedagogical, not technical** (the player,
2026-08-30, asked why a course should generally name its instruments):

> In general we should be naming instruments — not because the notes are not
> applicable or anything, but the type of material you should be engaging
> with as a tuba player is different from that of a cornet player, even at
> the early stages.

This is the ruling that decides the field's *meaning*, and it is a larger
claim than fit. Fit asks "can this be played"; the player is saying that even
where the answer is yes, it may still be **the wrong material** — a tuba
player and a cornet player at the same stage should be practising different
things, not the same things transposed. The declaration is therefore an
**editorial statement about who the course is for**, and the compass check is
only its machinery.

Two consequences follow, and they are the reason this is recorded rather than
assumed:

- **Passing the fit check is not evidence a course suits an instrument.**
  The check can only ever refute, never confirm. A course that realises
  cleanly on all eleven pairs has proved nothing about whether its material
  is right for a tuba, and the editor must not imply otherwise — no green
  tick reading "suitable for", because that is a musician's judgement and the
  app cannot make it.
- **The default should be to name them.** Not because an unnamed course is
  broken, but because declining to say who a course is for is nearly always
  an omission rather than a decision. See the open question below.

**What the declaration buys, in order of worth:**

1. **The editor can now refuse, not merely warn.** A tune-and-key pairing
   that will not realise on every declared instrument is an error the author
   can see and fix, in the same live verdict that already reports every
   other refusal. The reach question stops being "who might this reach" and
   becomes "does this meet what the course promised".
2. **The preview instrument stops being a guess.** Today it defaults to
   `eb-bass` and the author picks. Declared instruments make the preview a
   choice *among the course's own*, and the stave figure can be drawn for
   each in turn — which is the honest way to look at a tune that must suit
   three.

   **And there is no reach figure** (ruled 2026-08-30). The "reaches 9 of 11
   instruments" advisory in the first draft existed only because a course
   could not say who it was for; once it can, a count of unpromised
   instruments is noise. What replaces it is a refusal naming the declared
   instrument that fails.
3. **It states the promise to the player**, before they start. A course
   listing cornet, flugel and tenor horn tells a Bb bass player that this was
   not written for them — which is information they currently cannot get.

**Guaranteed for, and may work for others** — the player's own two-tier
phrasing, and it is the right shape. The declared set is a **promise the
editor enforces**; every other instrument is unpromised and still allowed to
play. Nothing is locked out, because a course that happens to suit a
euphonium should not refuse one. So:

- **declared instruments**: every named tune must realise on all of them, in
  every clef they read. Failure is an authoring error, reported by name.
- **undeclared instruments**: the app computes fit at play time as it does
  today, and a step that does not realise is dropped by the existing
  playlist filter. No promise was made and none is broken.

**A course may decline to declare**, and then it is instrument-agnostic
exactly as today — but with **no advisory in its place**. That keeps every
existing course reading forward unchanged: `instruments` absent means what
absence has always meant, and the editor says so plainly rather than
computing a figure to fill the silence.

**The unit of fit is the (instrument, clef) pair, not the instrument.**
Cornet, flugel and tenor horn read treble only; baritone, euphonium and both
basses read treble *and* bass, with different transpositions
(`instruments.ts` — `transposition` is keyed by clef). Seven instruments are
therefore eleven pairs, and a course declaring the lower four is promising
eight of them. The check walks pairs.

**This generalises past themes**, which is the argument for doing it here
rather than bolting it on. A declared instrument set makes the **range axis**
checkable in the same way — a range division above the cornet's written
compass is an error against a course that promised cornet, where today it is
silently a level nobody can play. `range` and `themes` are the two axes whose
values are pitches, and both want this. Building it for themes alone would
mean building it twice.

## The picker: what the author needs that the player's does not have

The player asked for two things the Settings picker does not do:

> the selector should show the notes or give the opportunity to play it back,
> so the author knows what they are selecting.

Both are real work and both are the point of this plan — an author choosing
blind is the thing being fixed.

- **Show the notes.** The theme's `events` are present and `realiseTheme`
  renders them. The stave preview draws the tune in the chosen key on the
  preview instrument. `drawRangeStave` is the precedent for a small stave
  figure in the editor, but this is a real line of music, so the honest
  route is the existing renderer at a small size.
- **Play it back.** The audio path exists. Authoring is a desktop activity
  with no latency budget, so this is a play button per tune, not a session.

Plus, carried over free from the player's picker: bars, difficulty, metre,
the greyed-with-reason treatment for unfittable tunes, and the two-column
add/remove. Where the course declares instruments, **the greying is against
the declared set** and its reason names the instrument that fails — *"won't
fit Eb tenor horn in B flat"* — which is a far more useful sentence than a
count, and is only sayable because the course said who it is for.

**One addition the author needs and the player does not: the running total.**
The tune list's stage widths sum to the level's length, so the picker should
say *"4 tunes · 62 bars · ≈3:10 at 80"* as tunes go in. That is the
author's actual question.

## Metre leaves the schema for two materials (ruled 2026-08-30)

The player's ruling: *"let's not make metre an option if the material type is
tunes — or drills for that matter, where I guess the metre is defined by the
type of drill selected."*

Both halves check out in the code, and the drills half is a fault already
shipping:

- **Drills already force 4/4 unconditionally.** `generate.ts:366` is
  `isPattern(options.kind) ? metreFor(4, 4) : options.metre`, and
  `isPattern` is true exactly for drills. The comment at the site gives the
  reason — *"a scale is not a piece of music with a metre; it is a shape
  played against a click"* — and notes it is forced there rather than on the
  settings screen so that a stored setting cannot leave a pattern in a metre
  it never wanted. So `metre` on a drills level **is silently ignored
  today**. That is precisely the failure the refuse-by-name rule exists to
  prevent, and `AXES.metre` already excludes drills from its `kinds` — but
  the *scalar* is not excluded, and the Prescription panel offers it.
- **Themes from a collection are played in their tunes' own signatures.**
  `generate.ts:451` is `metre: playing ? undefined : metre` — the stitcher
  is told nothing, and each tune brings its own. The comment: *"asking for
  the Bach should bring the whole Bach, not the slice of it that happens to
  share a signature with a control set for something else."* Once every
  themes level names its tunes (ruling 1), `playing` is always true, so the
  chosen metre can **never** reach the music.

So `metre` is meaningful for **`phrases` alone**:

- removed from `AXES.metre.kinds`, leaving `['phrases']`;
- removed as a header scalar for `drills` and `themes`, refused by name at
  both scopes;
- and gone from the Prescription panel for those two materials — the panel's
  current condition is `kind !== 'drills'`, which lets it through for themes.

**A theme's `metres` field stays**, and is the tune's own declaration of what
it is legal in. It was never the author's to set; it is the corpus's.

This is a small schema narrowing that removes a real silent-ignore, and it
lands with the themes work because that is what makes the themes half true.

## Schema

    // The course declares who it is for; the level names its tunes.
    {
      instruments: ['cornet', 'flugel', 'tenor-horn'],   // header, course scope
      levels: [{
      base: { kind: 'themes', difficultyId: 'easy', collectionIds: ['bach'] },
      axes: [
        { axis: 'themes', divisions: [
            { at: 0,    value: { id: 'ode-to-joy',      fifths: -1 } },
            { at: 0.25, value: { id: 'bist-du-bei-mir', fifths: -1 } },
        ]},
        { axis: 'tempo', divisions: [ … ] },
      ],
      }],
    }

- **`instruments?: readonly InstrumentId[]`** at course scope — a header
  scalar, not an axis, absent by default and read forward as "agnostic";
  refused by name if it lists an id the app does not know;
- one new `AxisId`, `themes`, `kinds: ['themes']`, `home: 'base'`;
- its `read` validates `{id, fifths}` and that `themeById(id)` exists —
  **a named tune that is not installed is refused by name**, which is the
  same rule as everything else and matters more here, because a course file
  may outlive a collection;
- `collectionIds` reaches the course schema at last (it is absent today);
- **`themeCount` is deleted** from `AxisId`, `LENGTH_UNIT_FOR` and
  `CourseLevel`, and refused by name where a document still carries it;
- **`metre` narrows to `phrases`**, at both scopes, as above;
- **a repeated tune is a second division**, carrying the same `id`: the
  playlist already allows duplicates and maps rather than filters, so this
  needs no schema support at all — it draws as two blocks of that tune's
  length, which is what the level does;
- `at` stays a fraction on disk for consistency with every other axis, but
  it is **derived from the tunes' own bar lengths** rather than authored —
  the reader recomputes it, and the editor never lets it be dragged.

## What this does not do

- **It does not make the tune an axis of its own**, which the player
  explicitly rejected. One axis, tunes as its values.
- **It does not touch `phrases` or `drills`.**
- **It does not compose or alter any music**, so nothing ships unheard: the
  tunes are the installed corpus, and the author hears each one before
  choosing it — which is the feature.
- **It does not resolve the cycles-vs-bars question** for drills. Separate.

## Settled by the player, 2026-08-30

All five questions this design opened were ruled the same morning:

1. **"Any N" is removed entirely** — a themes level names its tunes. See the
   `themeCount` section above.
2. **Declaring instruments is expected, not required** — the middle path.
   `readCourse` accepts an undeclared course exactly as today; the **editor**
   warns that the course has not said who it is for. The nudge goes where the
   author is rather than where the player is, and not one existing document
   breaks. A schema that refused would refuse the bundled *Common Keys*.
3. **A repeated tune is a second stage**, drawn as its own block. Simpler
   than a stage marked ×2, needs no schema support, and draws truthfully.
4. **The reach figure is dropped**, superseded by the declared set.
5. **Metre narrows to `phrases`**, removed for drills and themes at both
   scopes. See the section above — the drills half fixes a live silent-ignore.

## Still open

Nothing blocking. Two questions the build will raise rather than the design:

- **What the editor's undeclared-course warning says**, exactly. It must not
  imply the app can judge suitability — the pedagogical ruling above forbids
  a green tick reading "suitable for". Likely: *"This course does not say who
  it is for."*
- **Whether the notes preview and the playback button are one release or
  two.** They are the genuinely new work; everything else is plumbing to
  machinery that exists.

## What the build changed under the design

Three things the design did not foresee, found by building it:

- **The key exclusion belongs in the `AXES` table, not in a special case.**
  The first cut refused a `fifths` axis on a themes level with its own named
  check. The refuse-by-name matrix test then failed, correctly: it walks
  `AXIS_MATERIALS`, and the table still claimed `fifths` was meaningful for
  themes. Narrowing `AXES.fifths.kinds` to `['drills', 'phrases']` refuses
  the axis *and* the header scalar through the paths that already exist, and
  leaves one table as the source of truth for the editor's picker too.
- **A pinned `base.fifths` was slipping past.** `fifths` was validated on its
  own line rather than in the kinds-checked scalar loop, so the axis was
  refused and the scalar was not. Caught by a test written from the ruling
  rather than from the code.
- **The stave preview needed its backing store sized from the laid-out box.**
  Left to the canvas default it drew at 300px and sat in the left third of a
  wide stage. Found by screenshot, not by assertion — the DOM said the
  element was there and 99% of the fault was invisible to it. The tunes row
  also needed its own taller class: at the ordinary 2.9rem height the tune's
  name was clipped out of the block by the stave beneath it.

**Verified in a real browser** at `localhost:4173`, measured rather than
eyeballed: the name inside its block, the stave at 99% of the stage width,
the backing store matching its CSS box. The fit warning was checked for
truthfulness rather than presence — Invention 8 spans 31 semitones and fits
neither a cornet nor an Eb bass in C, which is exactly the authoring error
the declaration exists to catch.

**Left for the player:** the tune list is authorable and audible on screen,
but **no course has been authored with it and nothing has been heard**. The
playback button the design calls for is not built — the notes are drawn, and
hearing a tune still means playing the level. That is the next hour's work
and it is his, per the standing rule that nothing ships unheard.
