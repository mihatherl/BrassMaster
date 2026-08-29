# Level axes — the timeline model

**Ratified 2026-08-29**, in one sitting, by the player. Every decision below
is his; the reasoning is recorded so it can be re-examined, not so it can be
quoted back at him. Read `course-plan.md` first — this replaces one section of
it and leaves the rest standing.

**Build it in one release, in a fresh session.** That was the ruling too: the
schema, the six axes, the interval-pool generator work and the graphical
editor land together, because a schema authored against twice is a schema
written twice.

## The problem

A level is not one run — it is a small space, and the app walks the player
through it. `course-plan.md` designed six axes for that space in August and
built exactly one: **tempo**. So today a level varies in speed and in nothing
else, and every other dimension of "a harder version of this" is either fixed
by the author or falls out of a default nobody chose.

## The model: a timeline, not an odometer

The first design put to the player was a **mixed-radix odometer** — axes
ordered, one moving at a time, carrying into the next. He replaced it with
something better, sketched in `docs/level-progression-concept.png`:

**Level progression is one scalar, 0% to 100%. Each axis is a step function
over it. The author places the divisions.**

    level progression   0% ─────────────── 50% ─────────────── 100%
    Axis 1: tempo       60 │ 65 │      70    │  75    │   80
    Axis 2: range       g1 │    g2     │  g3   │  g4
    Axis 3: support     scrolling            │ read the page
    ─────────────────────────────────────────────────────────────
    progression rules   ▲    ▲     ▲    ▲  ▲   ▲   ▲  ▲    ▲
                        one rule per segment

Why this is better than the odometer, in the player's terms: the whole shape
of a level is visible at once, axes may move at different rates and at points
the author chooses, and nothing is hidden in a carry rule the picture cannot
draw.

**A segment is the space between two consecutive divisions, taken across all
axes at once.** Segments are *derived*, never authored directly: add a
division to any axis and a segment splits. The player's position in a level is
a segment index; Forward and Back move one segment.

**Percentages are an authoring device, not a runtime unit.** The author places
divisions along a proportional bar because that is how the shape reads; what
the app stores and steps is the ordered list of segments.

## The rulings

**1. Every division carries a value the author may set.** `from`, `to` and
`steps` generate a starting sequence; any division's value is then editable.

This supersedes the carry rule ratified thirty minutes earlier in the same
sitting ("tempo resets to the floor when a wider axis steps"). It is not
abandoned — it is **expressible**: an author who wants the ladder's oldest
argument writes `60, 65, 70, 60, 65, 70, 75, 80` and the timeline draws it
truthfully. A reset becomes a shape you author rather than a mechanism you
inherit, and the alternative — a hidden `restart` flag — was refused
precisely because the picture would stop matching what plays.

Same principle as the range ruling below, and the same as the editor's
existing philosophy: **generate a sensible default, then let the author edit
it.**

**2. Range steps are stored as an explicit list.** The editor offers "give me
N steps from this anchor, biased up / down / both" and writes the result,
which the author may then adjust by hand.

Not an anchor-plus-rule in the document: a rule cannot know the instrument or
the level, and it would re-interpret itself when the key changed — so what a
step meant could shift under a player mid-course. And not symmetric widening,
because a brass range does not grow symmetrically: **upward is embouchure and
effort, downward is comparatively free until the pedal register.**

Interpolation walks the key ladder, not semitones — `keyLadder` and
`stepOnLadder` in `domain/ladder.ts` already do exactly this for the range
dials, including the awkward case the comment there names: *"a range chosen in
E flat and then read in C leaves its bounds sitting between two rungs."*

**3. Support is one composite axis**, ordered named levels, not four separate
ones. Fewer bars, and it reads as a progression rather than as four unrelated
switches. **Open: what its rungs are** — see below.

**4. Progression rules are a level default with a per-segment override.** Two
figures per rule, from the drawing: a **minimum number of bars** the segment
must be played for, and optionally a **minimum score over N bars** before the
step is offered. The player's own table is mostly "n/a", which is the argument
for defaults — filling in nine columns by hand for a simple level would be a
chore that teaches nothing.

This supersedes `Advance` and **`carryEvidence` disappears**: evidence is
per-segment by construction, which is what `carryEvidence` was invented to
approximate after the player found the always-carry fault on 28 August.

**5. One `axes` list; tempo is not special.** Existing documents keep working
— their `tempo: { floor, ceiling, step }` is read forward into a tempo axis.
The editor then has one component rather than a special case, which is what
the drawing implies: tempo is a bar like any other.

## The axes

Five are plumbing over knobs `generateExercise` already honours. The sixth is
real generator work and the player ruled it **in**.

| Axis | Knob | Materials | Work |
|---|---|---|---|
| **Tempo** | `tempo` | all | built; becomes an axis |
| **Length** | `bars` / `cycles` / `themeCount` | all | on the base since v2.60.0 |
| **Keys** | `keySet` — already an ordered tour | all | plumbing |
| **Range** | `range: {low, high}` | sight-reading | plumbing + editor generator |
| **Reach** | `patterns.spanSemitones`, `register` | drills | plumbing |
| **Metre** | `metre` | not drills (always 4/4) | plumbing |
| **Support** | `fingerings`, `playbackMode`, `metronomeEnabled`, `conductorEnabled` | all | plumbing; rungs undesigned |
| **Interval pool** | *does not exist* | sight-reading | **generator work** |

**Every axis declares which materials it is meaningful for, and `readCourse`
refuses the rest by name.** This generalises the rule already proved on length
units in v2.60.0 — *a field the app quietly ignores is worse than an absent
one*. A range axis on a themes level is refused; a metre axis on a drills
level is refused.

**Difficulty is deliberately not an axis.** Stepping `beginner → easy → medium
→ hard` is a one-line change and it was argued against and left out: a
`Difficulty` bundles six parameters, so moving it moves all six, and
`ladder.ts`'s own law says *"if one thing changed and accuracy dropped, the
cause is known; change three and the result is uninterpretable."* If
difficulty is to widen, its **components** are the axes — which is what the
interval pool and `span` are for.

**The interval pool**, from `course-plan.md`'s two generator changes: a
weighted pool of intervals (`rhythms: RhythmWeight[]` is the shape to copy,
one axis over), then constraining which degrees an interval is drawn from.
The first makes "favour thirds" expressible; the second is what the designed
`span` axis needs, and what makes the plan's own worked example — *"Exploring
3rds in C major"* — expressible at last.

## The editor

The concept drawing is the specification. `docs/level-progression-concept.png`
is a copy kept in the repository because `input/` is gitignored and the
original would not survive a clone.

- **Left panel, per axis**: the axis's name, and `from | to | steps`. For a
  qualitative axis (support) the bounds and step count are predefined and the
  columns read n/a.
- **An "add new axis" button**, from which the author picks which axis to add.
- **Right panel**: one bar per axis across the progression, with divisions the
  author drags left and right, each labelled with the value that begins there.
  Range divisions draw the little stave indicator the settings screen already
  uses (`drawRangeStave`).
- **Below**: the progression-rules table, one column per *segment*, two rows —
  minimum duration in bars, and minimum score over N bars.

**Unresolved and needing a decision when it is built: what happens to a
segment's rule when a division moves, or is added, or is deleted.** Rules are
keyed to derived segments, so any edit re-shapes the table. The obvious
candidates are attaching a rule to its left-hand boundary, or re-interpolating.
Neither is obviously right and the player should see both before choosing.

## What this supersedes

- `course-plan.md`'s **odometer** proposal (28 August, never built) and the
  ordering question that went with it — "who decides which axis moves first"
  does not arise when the author places divisions on a shared bar.
- `CourseLevel.tempo` as a special field, read forward into an axis.
- `Advance` and `carryEvidence`, replaced by per-segment rules with a level
  default.

**Standing, untouched:** `Mastery` and the suggestion bar (between runs, not
within a level); the honesty rulings; the key and tempo gate work of
v2.57.0–v2.59.0; the length and horizon work of v2.60.0.

## Open, and named so they are not forgotten

- **The support axis's rungs.** "One composite axis, ordered" is ruled; what
  the levels *are* is not. The drawing shows scrolling line → read the page;
  `rhythm-plan.md`'s stages show voice → metronome only → cold. Both are the
  same idea and the rungs should be designed once, with the player, before
  either is built.
- **Segment rules under editing** — above.
- **Whether a level may have no axes at all.** `course-plan.md` says yes and
  calls it "a legitimate thing to want"; the timeline should still draw it.
- **`difficultyId` on a rhythm level.** Required today, and `rhythm-plan.md`
  wants it optional for a material with no difficulty. Not urgent — every
  existing file carries it, so nothing breaks — but this schema pass is the
  cheap moment to do it.
- **Feel** (`rhythm-plan.md`'s own section) is an axis in waiting: straight →
  swung, *"moved only after the straight version is mastered"*. Out of this
  build. Note that `conductorStyle` is already a feel dial that touches
  neither the audio nor the judge, so a cheap version exists whenever it is
  wanted.
