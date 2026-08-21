# The difficulty model — what a dry run of 2026-08-21 found

Run it yourself; it changes nothing:

    npx tsx tools/difficulty-dry-run.mts
    npx tsx tools/difficulty-dry-run.mts --csv > levels.csv

**No label was changed.** The reclassification was approved as a dry run
first, and the dry run says the approved change is right and not sufficient —
so what follows is a report and a recommendation, and the ear settles it.

## The question that started it

*"Why is Bach's Invention 10 only Medium?"*

Because the model reads note **values**, and Invention 10 is written in
quavers. Its reading floor is half a beat, which is exactly what Medium's own
rhythm pool holds, so it is not too fast for Medium; and nothing else about it
exceeds Easy by enough to earn Hard on the current axes. Label follows.

In time, which is what a reader actually meets:

| | metre | tempo | floor | notes a second |
|---|---|---|---|---|
| Invention 13 | 4/4 | ♩=70 | semiquaver | **4.67** |
| Invention 10 | 9/8 | ♩=140 | quaver | **4.67** |
| Menuett in G | 3/4 | ♩=140 | quaver | **4.67** |

The same speed, to three figures. Two are labelled Hard and two Medium, and
the only difference between them is how the note is *drawn*. A quaver at 140
and a semiquaver at 70 are the same demand and the model cannot see it.

**So the approved change is confirmed: seconds, not beats.** Under it,
Invention 10 and the Menuett both move to Hard, which is where they belong on
that axis.

## And now the part that was not expected

Judging on rate **alone** moves 22 of 69 themes and gets a dozen of them
wrong. The rate column in the dry run is what a single-axis model would do:

- *Twinkle centred* and *Twinkle figured*, both Hard, fall to Easy. They are
  slow. They are also a twelfth wide and built out of leaps, which is why they
  are Hard.
- *Air on the G string*, Hard, falls to Easy. At ♩=42 it is the slowest thing
  in the corpus. It also spans twenty semitones and carries an accidental in
  every ninth note.
- Medium empties out — 12 themes to 4 — because nine of them are cross-rhythm
  études whose difficulty is not speed at all.

Rate is a real axis and it is not the only one. **A theme earns its level on
whichever axis it is hard on**, which is what `validateTheme` already says in
the floor check and what a rate-only rule would throw away.

## Two modes, two difficulties — and the measurements agree

Your reading, which the dry run supports: *"there are differences based on
whether it is 'microphone mode' or 'tapping the screen' mode."*

They separate cleanly, because they are different instruments:

- **Tapping** asks for the right valve combination at the right instant. The
  pitch is given. What costs you is *rate* — and rests and ties, which are
  when to move rather than where.
- **Microphone** asks for the note to come out. Every leap is a partial to
  find and slot, every accidental is a lip adjustment, the top of the range is
  work before it is notes. What costs you is *interval, chromaticism and
  tessitura*, and the rate matters much less.

Measured across the corpus: **48 of 69 themes sit at a different level in the
two modes**, 16 of them harder to pitch than to finger. That is not noise —
that is two different exercises wearing one label.

Examples the table makes obvious:

| theme | tapping | microphone | why |
|---|---|---|---|
| `twos-and-threes` | hard | easy | semiquavers, but stepwise |
| `trad-old-macdonald` | beginner | medium | nursery tune with an octave in it |
| `bwv776-invention` (No. 5) | hard | easy | fast, but crotchets and quavers by step |
| `bwv846-prelude` | medium | hard | the leaps are the whole piece |
| `chromatic-climb` | hard | hard | both, which is the point of it |

**Recommendation, for your ear rather than my arithmetic:** keep one label,
computed as the harder of the two, until microphone mode exists — a player
tapping a Hard tune is not misled, only stretched. When the microphone ships,
the label follows the mode the player is in. The measurement is already
written and costs nothing to keep current.

## What the model still cannot see

Three gaps, all the same shape as the ones already recorded: the model asks
whether a property *appears*, not how much of it there is.

1. **Cross-rhythm and syncopation are on no axis at all.** `three-against`,
   `against-the-beat`, `off-the-beat`, `three-for-two`, `waltz-triplets` and
   `triplet-run` are the spine of Medium, and every one of them is measured as
   plain quavers. They are hard because of where the notes fall against the
   pulse, and nothing counts that. This is the largest hole, and it is why a
   rate-only reclassification empties Medium.
2. **`maxInterval` must not be used to measure.** It is a writing dial — the
   widest leap the generator will put on the page — and reading it as a ceiling
   calls Old MacDonald hard. The dry run bands leaps separately (a third, a
   fifth, a sixth, beyond an octave) and trims the widest twentieth, the same
   trim `readingFloor` applies to the fastest twentieth. Those four numbers are
   a brass judgement and want your ear, not mine.
3. **Repetition is measured and still unused.** It is on the table as `rep%` —
   the share of bar-shapes a reader has already played. The Menuett is 34% and
   the inventions are 0%, which is most of why the Menuett is the easier read
   at an identical note rate. Not banded: acting on it would have made the
   Prelude *worse*, since it repeats nearly everything and is nobody's easy
   piece.

## What the proposed combination does

Rate for the fingers, leap and chromaticism and span for the lip, the harder
of the two as the label. It moves 20 of 69 themes and lands closer to the
target spread than the current labels do:

| | beginner | easy | medium | hard |
|---|---|---|---|---|
| target | 25% | 30% | 25% | 20% |
| now | 17% | 36% | 17% | 29% |
| proposed | 14% | 38% | 22% | 26% |

**Do not apply it yet.** Two reasons, and neither is arithmetic: the
cross-rhythm gap would demote six themes that are correctly Medium today, and
the four leap bands are a guess about brass that one afternoon with the app
would settle better than another day of measuring.

## One measurement that is not about difficulty at all

**47 of 69 themes carry no tempo of their own** and are measured at the dial's
default of 84. For those, seconds and beats are the same number wearing
different units, and the reclassification cannot tell them anything. Every
theme that *does* carry a tempo is a borrowed one, where the tempo came from
the source and then from your ear.

If the rate axis is to mean anything for the written corpus, those 47 need
tempos — which is a listening job, not a measuring one.
