/**
 * The reclassification, run as a report and nothing else.
 *
 * Approved 2026-08-21 and deliberately not applied: difficulty should be
 * judged on **seconds per note** rather than beats, now that themes carry the
 * tempo a brass player takes them at. Beats were always a proxy for time, and
 * a proxy that fails in exactly the place this corpus lives — the Menuett's
 * quavers at 140 and Invention 13's semiquavers at 70 are the same 4.7 notes a
 * second, and the model calls one medium and the other hard.
 *
 * So this prints the whole corpus, old level against new, with the rates that
 * decide it, and changes nothing. Run it, read it, argue with it:
 *
 *   npx tsx tools/difficulty-dry-run.mts
 *   npx tsx tools/difficulty-dry-run.mts --csv > /tmp/levels.csv
 *
 * The proposed thresholds are in `BANDS` below, with the anchors that set
 * them. They are a starting position for an argument, not a result.
 */

import { instrumentById } from '../src/domain/instruments.ts';
import { metreFor } from '../src/domain/metre.ts';
import { DIFFICULTIES } from '../src/exercise/difficulty.ts';
import { COLLECTIONS } from '../src/exercise/collections.ts';
import { exerciseFromTheme, readingFloor, isRest } from '../src/exercise/theme.ts';

const csv = process.argv.includes('--csv');
/* Any instrument and any key will do: every measurement here is relative —
   intervals, spans and rates do not move when the tune is re-keyed. The E flat
   bass in C is what the review sheet opens on, so the numbers match it. */
const instrument = instrumentById('eb-bass');

/** What the tempo dial sits at when nothing has said otherwise. */
const DEFAULT_TEMPO = 84;

/**
 * The proposed bands, in notes a second at the reading floor.
 *
 * Derived rather than chosen: each level's own rhythm pool already states its
 * shortest note, and the dial's default of 84 turns that into a time. A level
 * reads at `1 / (shortest * 60 / 84)` notes a second —
 *
 * | | shortest | notes/sec at 84 |
 * |---|---|---|
 * | beginner | crotchet | 1.4 |
 * | easy | quaver | 2.8 |
 * | medium | quaver | 2.8 |
 * | hard | semiquaver | 5.6 |
 *
 * — which is the whole problem in one column: **easy and medium are the same
 * number**, so note length has never distinguished them and the borrowed
 * corpus piles up on the boundary. The bands below split that gap
 * geometrically and put the boundaries between the levels rather than on them.
 */
const BANDS: Array<{ id: string; upTo: number }> = [
  { id: 'beginner', upTo: 2.0 },
  { id: 'easy', upTo: 3.2 },
  { id: 'medium', upTo: 4.4 },
  { id: 'hard', upTo: Infinity },
];

function bandFor(rate: number): string {
  return BANDS.find((band) => rate <= band.upTo)!.id;
}

/**
 * The lowest level that admits a quantity, given what `difficulty.ts` already
 * states for generated material.
 *
 * This is the half of the model that works, and the reason the rate axis must
 * not replace it: a theme earns its level on *whichever* axis it is hard on.
 * Twinkle centred is slow and leaps a twelfth; the Air is slower still and
 * spans twenty semitones with an accidental in every ninth note. Judging
 * either by how fast it moves says easy, and a player meeting it disagrees.
 */
function levelFor(value: number, of: (d: (typeof DIFFICULTIES)[number]) => number): string {
  return (DIFFICULTIES.find((d) => value <= of(d)) ?? DIFFICULTIES[DIFFICULTIES.length - 1]).id;
}

const order = DIFFICULTIES.map((d) => d.id);
const highest = (...levels: string[]) =>
  levels.reduce((a, b) => (order.indexOf(b) > order.indexOf(a) ? b : a));

/**
 * How chromatic a line is, as a share of its notes — the gap named in the
 * roadmap and still open.
 *
 * `accidentalChance` is the generator's own dial, so a theme is banded against
 * the rate the level would itself produce. The royal theme of the Musical
 * Offering measures 21% and is written down as easy, which is the case that
 * found this.
 */
/**
 * The widest leap a reader *meets*, with the widest twentieth set aside —
 * the same trim `readingFloor` applies at the other end of the scale, and for
 * the same reason.
 *
 * Widest alone is what sent a whole argument down the wrong axis on the
 * Prelude, and it is wrong in the opposite direction on the nursery tunes:
 * Happy Birthday has one octave leap in twenty-five notes and Twinkle one
 * fifth, and neither is a hard tune to pitch. A trimmed maximum says so;
 * `Math.max` calls them both hard.
 */
function trimmedLeap(sortedGaps: readonly number[]): number {
  if (sortedGaps.length === 0) return 0;
  const index = Math.ceil(sortedGaps.length * (1 - ORNAMENT_TRIM)) - 1;
  return sortedGaps[Math.max(0, index)];
}

/** The same twentieth `readingFloor` trims, applied to leaps. */
const ORNAMENT_TRIM = 0.05;

function accidentalLevel(rate: number): string {
  return levelFor(rate, (d) => d.accidentalChance);
}

/**
 * What a trimmed leap costs a *lip*, banded on real tunes rather than on the
 * generator's `maxInterval`.
 *
 * `maxInterval` is a writing dial — the widest leap the generator will put on
 * the page — and using it to measure existing music says Old MacDonald is
 * hard, which is how this band got calibrated instead. Twenty of the corpus's
 * themes already exceed their level's figure, Twinkle among them, and the
 * handover says plainly that it must not become a ceiling.
 *
 * A third is where a beginner lives, a fifth is ordinary, a sixth is a tune
 * with a landmark leap in it, and beyond an octave every note is a partial to
 * hunt for. That is a brass judgement and wants the player's ear on it.
 */
function leapLevel(leap: number): string {
  if (leap <= 4) return 'beginner';
  if (leap <= 6) return 'easy';
  if (leap <= 9) return 'medium';
  return 'hard';
}

interface Row {
  collection: string;
  id: string;
  name: string;
  level: string;
  metre: string;
  tempo: number;
  sourced: boolean;
  unheard: boolean;
  floorBeats: number;
  floorSeconds: number;
  rate: number;
  /** What the note rate alone asks for — the axis this dry run is about. */
  byRate: string;
  /**
   * What the fingers meet: rate, plus the rhythmic properties a level admits
   * (rests, ties). **The level in tapping mode**, where the pitch is given and
   * the question is only whether the right valves are down in time.
   */
  tap: string;
  /**
   * What the lip meets: leap, span and chromaticism. **The level in microphone
   * mode**, where every note is a partial to find and slot, and where the note
   * rate matters far less than how far the line jumps to get there.
   */
  mic: string;
  /** The two together, which is what one label has to be. */
  proposed: string;
  notes: number;
  typical: number;
  widest: number;
  /** The widest leap with the widest twentieth set aside. See `trimmedLeap`. */
  trimmed: number;
  span: number;
  accidental: number;
  /** Share of steps that leap beyond a fifth — leap *density*, the open gap. */
  leapy: number;
  /** How much of the tune is figures it has already played. See `repetition`. */
  repeat: number;
}

/**
 * How repetitive a tune is: the share of its bar-length pitch-and-rhythm
 * shapes that have been seen before.
 *
 * Measured but not banded, because it is the axis the model is blindest to and
 * the one that would have made the Prelude *worse*: a piece that repeats one
 * figure is far easier to read than one that does not at the same note rate,
 * and the Prelude repeats almost everything while being nobody's easy piece.
 * On the table so the eye can do what the arithmetic should not.
 */
function repetition(shapes: string[]): number {
  const seen = new Set<string>();
  let repeats = 0;
  for (const shape of shapes) {
    if (seen.has(shape)) repeats++;
    else seen.add(shape);
  }
  return shapes.length ? repeats / shapes.length : 0;
}

const rows: Row[] = [];

for (const collection of COLLECTIONS) {
  const unjudged = collection.unjudged ?? new Set<string>();
  for (const theme of collection.themes) {
    const [metreSpec] = theme.metres;
    const metre = metreFor(metreSpec[0], metreSpec[1]);
    const exercise = exerciseFromTheme(theme, { instrument, clef: 'treble', fifths: 0, metre });
    if (!exercise) {
      process.stderr.write(`${theme.id}: will not realise on an E flat bass in C — skipped\n`);
      continue;
    }

    const midis = exercise.notes.map((note) => note.writtenMidi);
    const gaps: number[] = [];
    for (let i = 1; i < midis.length; i++) gaps.push(Math.abs(midis[i] - midis[i - 1]));
    const sorted = [...gaps].sort((a, b) => a - b);

    const tempo = theme.tempo ?? DEFAULT_TEMPO;
    const floorBeats = readingFloor(theme.events);
    const floorSeconds = (floorBeats * 60) / tempo;

    /* One shape per bar of the written line: the pitches relative to the bar's
       first note, with the lengths. Transposed repeats count as repeats, which
       is right for reading — a sequence is easier the second time. */
    const perBar = new Map<number, Array<{ midi: number; beats: number }>>();
    const beatsPerBar = (metreSpec[0] * 4) / metreSpec[1];
    for (const note of exercise.notes) {
      const bar = Math.floor(note.startBeat / beatsPerBar);
      if (!perBar.has(bar)) perBar.set(bar, []);
      perBar.get(bar)!.push({ midi: note.writtenMidi, beats: 0 });
    }
    const shapes = [...perBar.values()].map((bar) =>
      bar.map((note) => note.midi - bar[0].midi).join(','),
    );

    rows.push({
      collection: collection.name,
      id: theme.id,
      name: theme.name,
      level: theme.difficulty,
      metre: `${metreSpec[0]}/${metreSpec[1]}`,
      tempo,
      sourced: theme.tempo !== undefined,
      unheard: unjudged.has(theme.id),
      floorBeats,
      floorSeconds,
      rate: 1 / floorSeconds,
      byRate: bandFor(1 / floorSeconds),
      tap: highest(
        bandFor(1 / floorSeconds),
        theme.events.some(isRest) ? 'easy' : 'beginner',
        exercise.notes.some((note) => note.tiedToNext) ? 'easy' : 'beginner',
      ),
      mic: highest(
        leapLevel(trimmedLeap(sorted)),
        levelFor(
          midis.length ? Math.max(...midis) - Math.min(...midis) : 0,
          (d) => d.rangeSemitones,
        ),
        accidentalLevel(
          midis.length
            ? exercise.notes.filter((note) => note.showAccidental).length / midis.length
            : 0,
        ),
      ),
      proposed: '',
      notes: exercise.notes.length,
      typical: sorted.length ? sorted[sorted.length >> 1] : 0,
      widest: sorted.length ? sorted[sorted.length - 1] : 0,
      trimmed: trimmedLeap(sorted),
      span: midis.length ? Math.max(...midis) - Math.min(...midis) : 0,
      accidental: midis.length
        ? exercise.notes.filter((note) => note.showAccidental).length / midis.length
        : 0,
      leapy: gaps.length ? gaps.filter((gap) => gap > 7).length / gaps.length : 0,
      repeat: repetition(shapes),
    });
  }
}

for (const row of rows) row.proposed = highest(row.tap, row.mic);

rows.sort((a, b) => a.rate - b.rate);

if (csv) {
  const head = 'collection,id,name,level,byRate,tap,mic,proposed,metre,tempo,sourced,unheard,floorBeats,floorSeconds,rate,notes,typical,trimmedLeap,widest,span,leapRate,accidentalRate,repeatRate';
  const lines = rows.map((r) =>
    [r.collection, r.id, `"${r.name}"`, r.level, r.byRate, r.tap, r.mic, r.proposed, r.metre, r.tempo, r.sourced ? 1 : 0,
      r.unheard ? 1 : 0, r.floorBeats.toFixed(4), r.floorSeconds.toFixed(3), r.rate.toFixed(2),
      r.notes, r.typical, r.trimmed, r.widest, r.span, r.leapy.toFixed(3),
      r.accidental.toFixed(3), r.repeat.toFixed(3)].join(','),
  );
  process.stdout.write([head, ...lines].join('\n') + '\n');
} else {
  const pad = (text: string, width: number) => text.padEnd(width).slice(0, width);
  const num = (value: number, width: number, places = 1) =>
    value.toFixed(places).padStart(width);

  process.stdout.write(
    `\nThe corpus by reading rate — ${rows.length} themes, sorted by notes a second\n` +
      `Rate is one over the trimmed floor in seconds: what a reader meets most of the time.\n` +
      `"T?" marks a tempo the theme does not carry (dial default ${DEFAULT_TEMPO}); "·" an unheard tune.\n\n`,
  );
  process.stdout.write(
    `${pad('id', 22)}${pad('level', 9)}${pad('rate', 9)}${pad('tap', 9)}${pad('mic', 9)}${pad('→ both', 11)}` +
      `${'tempo'.padStart(6)}${'notes/s'.padStart(9)}` +
      `${'typ'.padStart(5)}${'trim'.padStart(6)}${'wide'.padStart(6)}${'span'.padStart(6)}${'leap%'.padStart(7)}${'acc%'.padStart(6)}${'rep%'.padStart(6)}\n`,
  );

  for (const r of rows) {
    const moved = r.level === r.proposed ? '' : order.indexOf(r.proposed) > order.indexOf(r.level) ? ' ↑' : ' ↓';
    process.stdout.write(
      `${pad((r.unheard ? '·' : ' ') + r.id, 22)}${pad(r.level, 9)}${pad(r.byRate, 9)}${pad(r.tap, 9)}` +
        `${pad(r.mic, 9)}${pad(r.proposed + moved, 11)}` +
        `${(r.tempo + (r.sourced ? '' : 'T?')).padStart(6)}` +
        `${num(r.rate, 9, 2)}${num(r.typical, 5, 0)}${num(r.trimmed, 6, 0)}` +
        `${num(r.widest, 6, 0)}${num(r.span, 6, 0)}${num(r.leapy * 100, 7, 0)}${num(r.accidental * 100, 6, 0)}${num(r.repeat * 100, 6, 0)}\n`,
    );
  }

  const moved = rows.filter((r) => r.level !== r.proposed);
  process.stdout.write(`\n${moved.length} of ${rows.length} themes change level.\n\n`);

  const counts = (pick: (r: Row) => string) =>
    order.map((id) => `${id} ${rows.filter((r) => pick(r) === id).length}`).join('   ');
  process.stdout.write(`now:      ${counts((r) => r.level)}\n`);
  process.stdout.write(`by rate:  ${counts((r) => r.byRate)}\n`);
  process.stdout.write(`tapping:  ${counts((r) => r.tap)}\n`);
  process.stdout.write(`mic:      ${counts((r) => r.mic)}\n`);
  process.stdout.write(`proposed: ${counts((r) => r.proposed)}\n`);

  const share = (pick: (r: Row) => string) =>
    order
      .map((id) => `${Math.round((rows.filter((r) => pick(r) === id).length / rows.length) * 100)}%`)
      .join('  ');
  process.stdout.write(`\ntarget    25%  30%  25%  20%\n`);
  process.stdout.write(`now       ${share((r) => r.level)}\n`);
  process.stdout.write(`proposed  ${share((r) => r.proposed)}\n`);

  /* Where the two modes disagree, which is the interesting column: a tune the
     fingers find easy and the lip does not, or the other way about. */
  const split = rows.filter((r) => r.tap !== r.mic);
  process.stdout.write(
    `\n${split.length} themes are a different level in the two modes ` +
      `(${split.filter((r) => order.indexOf(r.mic) > order.indexOf(r.tap)).length} harder to pitch than to finger).\n`,
  );
}
