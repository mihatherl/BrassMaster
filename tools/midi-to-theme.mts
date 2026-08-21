/**
 * A MIDI file in, a `Theme` out — so borrowed music is verified rather than
 * recalled.
 *
 * Written after two attempts at transcribing by hand went wrong in ways only
 * an ear caught: Old MacDonald leapt a fifth up where the tune falls a fourth
 * down, and a minor theme came out a sixth upside down. Both were short and
 * famous enough to catch. The Two-Part Inventions are neither — twenty to
 * forty bars of two voices each — and plausible, wrong music is worse than
 * none, because finding the error costs a reviewer more than writing it saved.
 *
 *   npx tsx tools/midi-to-theme.mts jesu-joy.mid --fifths 1 --mode major --metre 3/4
 *   npx tsx tools/midi-to-theme.mts invention1.mid --track 1 --id bwv772-upper
 *
 * It prints `Theme` source ready to paste into a corpus file, and everything it
 * had to decide — a collapsed chord, a note that would not sit on the grid, a
 * bar that does not add up — on stderr where it cannot be mistaken for output.
 *
 * ## What it will not do
 *
 * **It does not decide the key.** A MIDI file carries a key signature only if
 * whoever wrote it bothered, and it is wrong often enough not to be trusted, so
 * `--fifths` and `--mode` are yours to state. Guessing here would produce a
 * theme that is right in every note and in the wrong key, which is the hardest
 * kind of error to see.
 *
 * **It does not make music monophonic.** A `Theme` is one voice. Where notes
 * overlap it keeps the highest and says how many it dropped — fine for a
 * two-voice invention where you want one line, misleading if pointed at a
 * hymn. Read the count before trusting the result.
 *
 * ## Licensing, which matters more here than the code
 *
 * The *notes* of a work by a composer long dead are public-domain facts, and
 * degrees carry none of a transcriber's engraving. But a particular file is
 * still somebody's work and may carry terms: Tobis Notenarchiv's inventions are
 * **CC BY-NC**, which a paid app cannot use whatever the underlying music is.
 * Check the source's licence before running this on it — the tool cannot, and
 * will not warn you.
 */

import { readFileSync } from 'node:fs';
import { spellInKey, tonicPitchClass } from '../src/domain/keys.ts';
import { LETTERS, type Letter } from '../src/domain/pitch.ts';
import { durationFromBeats } from '../src/domain/rhythm.ts';

// --- Reading the file ------------------------------------------------------

interface RawNote {
  midi: number;
  /** Ticks from the start of the file. */
  start: number;
  ticks: number;
}

/** A variable-length quantity, as every delta time in a MIDI file is. */
function readVar(data: Buffer, at: number): [value: number, next: number] {
  let value = 0;
  let i = at;
  for (;;) {
    const byte = data[i++];
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return [value, i];
  }
}

/**
 * Note events from one track, in ticks.
 *
 * Handles running status, which real files use constantly and a naive reader
 * silently mis-parses into nonsense rather than failing.
 */
/*
 * What the file says about itself.
 *
 * Neither field is obeyed — the key is still the caller's to give, and the
 * metre still the caller's to choose. They are read so that a disagreement can
 * be *reported*, which is the difference between a converter that is wrong and
 * one that says it might be.
 */
type Declared = { metre?: [number, number]; fifths?: number; minor?: boolean };

function readTrack(data: Buffer, at: number, end: number, declared: Declared): RawNote[] {
  const notes: RawNote[] = [];
  const sounding = new Map<number, { start: number }>();
  let time = 0;
  let status = 0;
  let i = at;

  while (i < end) {
    const [delta, next] = readVar(data, i);
    time += delta;
    i = next;

    let byte = data[i];
    if (byte & 0x80) {
      status = byte;
      i++;
    } else {
      byte = status; // running status: the last one still applies
    }

    if (status === 0xff) {
      const type = data[i++];
      const [length, afterLength] = readVar(data, i);
      // Only the first of each is kept: a file that changes metre partway is
      // beyond a tool that writes one `metres` entry, and the report will say so
      // by disagreeing with whatever the caller passed.
      if (type === 0x58 && length >= 2 && !declared.metre) {
        declared.metre = [data[afterLength], 2 ** data[afterLength + 1]];
      } else if (type === 0x59 && length >= 2 && declared.fifths === undefined) {
        declared.fifths = data.readInt8(afterLength);
        declared.minor = data[afterLength + 1] === 1;
      }
      i = afterLength + length;
      continue;
    }
    if (status === 0xf0 || status === 0xf7) {
      const [length, afterLength] = readVar(data, i);
      i = afterLength + length;
      continue;
    }

    const kind = status & 0xf0;
    if (kind === 0x90 || kind === 0x80) {
      const midi = data[i];
      const velocity = data[i + 1];
      i += 2;
      // A note-on of zero velocity is a note-off, and most files write it so.
      if (kind === 0x90 && velocity > 0) {
        sounding.set(midi, { start: time });
      } else {
        const open = sounding.get(midi);
        if (open) {
          notes.push({ midi, start: open.start, ticks: time - open.start });
          sounding.delete(midi);
        }
      }
    } else if (kind === 0xc0 || kind === 0xd0) {
      i += 1;
    } else {
      i += 2;
    }
  }

  return notes.sort((a, b) => a.start - b.start || a.midi - b.midi);
}

function readMidi(path: string): { division: number; tracks: RawNote[][]; declared: Declared } {
  const data = readFileSync(path);
  if (data.toString('ascii', 0, 4) !== 'MThd') throw new Error(`${path} is not a MIDI file`);
  const division = data.readInt16BE(12);
  if (division <= 0) throw new Error('SMPTE timing is not supported; needs ticks per quarter note');

  const tracks: RawNote[][] = [];
  const declared: Declared = {};
  let at = 8 + data.readUInt32BE(4);
  while (at < data.length) {
    const length = data.readUInt32BE(at + 4);
    if (data.toString('ascii', at, at + 4) === 'MTrk') {
      tracks.push(readTrack(data, at + 8, at + 8 + length, declared));
    }
    at += 8 + length;
  }
  return { division, tracks, declared };
}

// --- Turning pitches into degrees ------------------------------------------

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

/**
 * A pitch as a degree of the theme's own scale.
 *
 * Spelled by the app's own `spellInKey` rather than by arithmetic here, so a
 * borrowed theme is spelled exactly as a generated one would be — and so the
 * ruling against double accidentals holds without this file knowing about it.
 * The letter then gives the degree directly: degrees are diatonic steps, and a
 * letter *is* a diatonic step.
 */
function toDegree(midi: number, fifths: number, mode: 'major' | 'minor', tonicIndex: number) {
  const spelled = spellInKey(midi, fifths);
  const letterIndex = LETTERS.indexOf(spelled.letter as Letter);
  const diatonic = spelled.octave * 7 + letterIndex;
  const steps = diatonic - tonicIndex;
  const degree = (((steps % 7) + 7) % 7) + 1;
  const octave = Math.floor(steps / 7);

  const scale = mode === 'minor' ? MINOR : MAJOR;
  const natural = scale[degree - 1];
  const actual = midi - (tonicMidiFor(fifths, mode) + octave * 12);
  return { degree, alter: actual - natural, octave };
}

function tonicMidiFor(fifths: number, mode: 'major' | 'minor'): number {
  const pc = (((tonicPitchClass(fifths) + (mode === 'minor' ? 9 : 0)) % 12) + 12) % 12;
  return 60 + ((pc - 0 + 12) % 12); // an octave containing the tonic; only its class matters
}

// --- The command -----------------------------------------------------------

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? fallback) : fallback;
}

const path = process.argv[2];
if (!path || path.startsWith('--')) {
  process.stderr.write(
    'usage: midi-to-theme <file.mid> [--track N] [--fifths N] [--mode major|minor]\n' +
      '                     [--metre 4/4] [--scale N] [--bars N] [--from N] [--id name]\n',
  );
  process.exit(2);
}

const fifths = Number(arg('fifths', '0'));
const mode = arg('mode', 'major') as 'major' | 'minor';
const [beatsPerBar, beatUnit] = arg('metre', '4/4').split('/').map(Number);
const id = arg('id', 'borrowed');
/* Escaped, because this repertoire is full of apostrophes — "Jesu, Joy of
   Man's Desiring" emitted raw closes the string and breaks the file it is
   pasted into. */
const name = arg('name', id).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const wantTrack = Number(arg('track', '-1'));
/*
 * How many bars to take, from the start or from `--from`.
 *
 * A whole invention is thirty-odd bars where the corpus works in eight to
 * sixteen, and a subject is usually stated in the first few. Taking the whole
 * piece is still the default, because play-along wants all of it.
 */
const wantBars = Number(arg('bars', '0'));
const fromBar = Number(arg('from', '1'));
/*
 * Rewrites note values without changing what is heard.
 *
 * Sequencers write compound time as simple time full of triplets: the Jesu Joy
 * files declare 3/4, so its nine quavers to the bar arrive as thirds of a beat
 * and a 9/8 bar comes out a third short. `--scale 1.5` turns those thirds into
 * halves, which is what a quaver is worth in 9/8. Purely notational — the
 * printed tempo absorbs it, since 9/8 at a dotted crotchet is 3/4 at a crotchet.
 */
const scale = Number(arg('scale', '1'));

const { division, tracks, declared } = readMidi(path);
const notes = wantTrack >= 0 ? (tracks[wantTrack] ?? []) : tracks.flat().sort((a, b) => a.start - b.start);

if (notes.length === 0) {
  process.stderr.write(`no notes${wantTrack >= 0 ? ` in track ${wantTrack}` : ''}. Tracks: ${tracks.map((t, i) => `${i}:${t.length}`).join(' ')}\n`);
  process.exit(1);
}

/*
 * One voice only. Where notes overlap, the highest wins — the melody sits on
 * top in almost everything worth borrowing — and the count is reported, since
 * a large one means this was pointed at the wrong material rather than that it
 * tidied something up.
 */
let collapsed = 0;
const single: RawNote[] = [];
for (const note of notes) {
  const last = single[single.length - 1];
  if (last && note.start < last.start + last.ticks) {
    collapsed++;
    if (note.midi > last.midi) single[single.length - 1] = { ...note, start: last.start };
    continue;
  }
  single.push(note);
}

/*
 * Snapped to twenty-fourths of a beat.
 *
 * Twelfths held triplets and semiquavers and looked sufficient, and quietly
 * were not: a demisemiquaver is an eighth of a beat, which is not a twelfth of
 * anything, so every one of them rounded to a triplet semiquaver. Right notes,
 * wrong beats again — and silent, because the rounded value is itself a legal
 * duration. Twenty-fourths divide by three and by eight, so triplets,
 * semiquavers and demisemiquavers all land exactly.
 *
 * Anything that still will not sit on the grid is named rather than rounded
 * away.
 */
const GRID = 24;
const offGrid: string[] = [];
const beatsOf = (ticks: number, what: string) => {
  const exact = (ticks / division) * scale;
  const snapped = Math.round(exact * GRID) / GRID;
  if (Math.abs(exact - snapped) > 0.02) offGrid.push(`${what} ${exact.toFixed(3)} beats`);
  return snapped;
};

const barBeats = (beatsPerBar * 4) / beatUnit;
const tonicIndex = (() => {
  const spelled = spellInKey(tonicMidiFor(fifths, mode), fifths);
  return spelled.octave * 7 + LETTERS.indexOf(spelled.letter as Letter);
})();

/*
 * Silence is music, and dropping it moves everything after it.
 *
 * A voice in a two-part invention rests while the other announces the subject,
 * so the upper line of BWV 779 begins half a beat in and rests for two and a
 * half in the middle. Without these, every note after a rest lands early and
 * the whole line is displaced against the barline — correct notes, wrong
 * rhythm, which reads as a subtly wrong piece rather than as an error.
 */
type Raw =
  | { beats: number; rest: true }
  | ({ beats: number; tied?: true } & ReturnType<typeof toDegree>);

/*
 * Durations the app can actually draw, longest first.
 *
 * Asked of the app rather than listed here, so the tool cannot drift from what
 * the renderer will accept — and derived over the same twelfths the grid uses,
 * which is what makes both triplets and semiquavers members of it.
 */
const WRITABLE = Array.from({ length: GRID * 4 }, (_, i) => (GRID * 4 - i) / GRID).filter(
  (beats) => durationFromBeats(beats) !== null,
);

/*
 * A length broken into values that can actually be drawn.
 *
 * Bach leaves a voice quiet for a beat and a quarter while the other answers,
 * and holds a note for a beat and a quarter just as often — and no single rest
 * or note is a beat and a quarter long. Both become a crotchet and a
 * semiquaver, which is what a score prints; the notes are then joined by a tie
 * and the rests simply follow one another.
 *
 * Greedy from the longest, which is also how a copyist fills a bar. It is not
 * the whole of notation's rules about which subdivisions a value may straddle,
 * and it does not need to be: what it must never do is emit a length the
 * renderer cannot draw.
 */
function writablePieces(beats: number): number[] {
  const out: number[] = [];
  let left = beats;
  while (left > 1 / (GRID * 2)) {
    const piece = WRITABLE.find((value) => value <= left + 1e-9);
    // Nothing fits: hand back what is left so the report can name it rather
    // than dropping the time and silently shortening the bar.
    if (piece === undefined) {
      out.push(left);
      break;
    }
    out.push(piece);
    left = Math.round((left - piece) * GRID) / GRID;
  }
  return out;
}


const raw: Raw[] = [];
let expected = 0;
single.forEach((note, index) => {
  const silence = ((note.start - expected) / division) * scale;
  if (silence > 1 / (GRID * 2)) {
    for (const rest of writablePieces(Math.round(silence * GRID) / GRID)) {
      raw.push({ beats: rest, rest: true });
    }
  }
  const beats = beatsOf(note.ticks, `note ${index}`);
  raw.push({
    beats,
    ...toDegree(note.midi, fifths, mode, tonicIndex),
  });
  expected = note.start + note.ticks;
});

/*
 * Notes broken at the bar line, and joined by a tie.
 *
 * Counterpoint holds a note across the bar constantly — a suspension is
 * precisely that — and the format writes it the way a score does: two notes of
 * the same degree, the first marked `tied`. Without this the note sits astride
 * the line, which the validator rejects and a renderer could not draw.
 *
 * Done before the slice, so a cut by bar never has to divide an event, and the
 * bars it takes are full ones. Rests are split at the line too and simply not
 * tied, because a rest either side of a bar line is two rests.
 *
 * A piece that lands on the line is left alone: only an event that would
 * *cross* it is divided. And a piece that is still unwritable after the split
 * is reported rather than emitted quietly — a note of a beat and a quarter
 * inside one bar needs a tie this format does not take, and a wrong duration is
 * worse than a refusal.
 */
const atBarLines = (() => {
  const out: Raw[] = [];
  let at = 0;
  for (const event of raw) {
    let left = event.beats;
    while (left > 1e-9) {
      const toLine = barBeats - (at % barBeats);
      const piece = Math.min(left, toLine > 1e-9 ? toLine : barBeats);
      const rounded = Math.round(piece * GRID) / GRID;
      const crosses = rounded < left - 1e-9;
      /*
       * And each bar's worth broken again into values that can be drawn, the
       * notes joined by ties — which is what a score does inside a bar as
       * readily as across one. The format was documented as tying only across
       * a bar line; that was a description of *generated* material, where a
       * note is never written longer than one value, and it was never a rule
       * the validator or the renderer enforced. Real music ties inside a bar
       * constantly, and BWV 773 was turned away for exactly that.
       *
       * A piece that carries on into the next bar is tied at its end as well
       * as between its own parts, so the join survives the split.
       */
      const pieces = writablePieces(rounded);
      pieces.forEach((part, index) => {
        const lastOfPiece = index === pieces.length - 1;
        out.push(
          'rest' in event
            ? { beats: part, rest: true }
            : {
                ...event,
                beats: part,
                ...(!lastOfPiece || crosses ? { tied: true } : {}),
              },
        );
      });
      at = Math.round((at + rounded) * GRID) / GRID;
      left = Math.round((left - rounded) * GRID) / GRID;
    }
  }
  return out;
})();


/*
 * Octaves are stated relative to wherever the theme's tonic is placed, and
 * `realiseTheme` places it — so shifting every note by the same octave changes
 * nothing about the music. Shifted to whichever octave most notes are already
 * in, which leaves the fewest markers on the page: a tune sitting entirely
 * below the reference otherwise carries `octave: -1` on every single note, and
 * a reader has to hold that in their head to see the shape.
 */
const commonest = [
  ...atBarLines.reduce(
    (counts, note) =>
      'rest' in note ? counts : counts.set(note.octave, (counts.get(note.octave) ?? 0) + 1),
    new Map<number, number>(),
  ),
].sort((a, b) => b[1] - a[1])[0][0];

/** Twelfths reduced, so a triplet reads `1 / 3` rather than `4 / 12`. */
function beatSource(beats: number): string {
  if (beats === Math.round(beats)) return String(beats);
  const numerator = Math.round(beats * GRID);
  const divide = (a: number, b: number): number => (b ? divide(b, a % b) : a);
  const by = divide(numerator, GRID);
  return `${numerator / by} / ${GRID / by}`;
}

const events = atBarLines.map((event) => {
  if ('rest' in event) return { line: `r(${beatSource(event.beats)})`, beats: event.beats };
  const shifted = event.octave - commonest;
  const extra = [event.alter ? `alter: ${event.alter}` : '', shifted ? `octave: ${shifted}` : '']
    .filter(Boolean)
    .join(', ');
  const parts = [extra, event.tied ? 'tied: true' : ''].filter(Boolean).join(', ');
  return {
    line: `n(${event.degree}, ${beatSource(event.beats)}${parts ? `, { ${parts} }` : ''})`,
    beats: event.beats,
  };
});

/* Sliced by bar before anything is counted, so the report describes what was
   actually taken rather than what was read. */
const sliced = (() => {
  if (!wantBars) return events;
  const start = (fromBar - 1) * barBeats;
  const stop = start + wantBars * barBeats;
  const out: typeof events = [];
  let at = 0;
  for (const event of events) {
    if (at >= start && at + event.beats <= stop + 1e-9) out.push(event);
    at += event.beats;
  }
  return out;
})();

const total = sliced.reduce((sum, e) => sum + e.beats, 0);
const bars = Math.round(total / barBeats);

// Laid out a bar to a line, which is how a reviewer reads it back.
const lines: string[] = [];
let running = 0;
let current: string[] = [];
for (const event of sliced) {
  current.push(event.line);
  running += event.beats;
  if (running >= barBeats - 1e-9) {
    lines.push('      ' + current.join(', ') + ',');
    current = [];
    running = 0;
  }
}
if (current.length) lines.push('      ' + current.join(', ') + ',');

process.stdout.write(`  {
    id: '${id}',
    name: '${name}',
    difficulty: 'medium',${mode === 'minor' ? "\n    mode: 'minor'," : ''}
    metres: [[${beatsPerBar}, ${beatUnit}]],
    bars: ${bars},
    events: [
${lines.join('\n')}
    ],
  },
`);

process.stderr.write(
  `${path}: ${single.length} notes, ${bars} bars of ${beatsPerBar}/${beatUnit}` +
    ` (${total.toFixed(2)} beats)\n`,
);
if (collapsed) {
  process.stderr.write(
    `  ${collapsed} overlapping note(s) dropped across the whole track — one voice was kept` +
      `${wantBars ? ', not only the bars taken' : ''}\n`,
  );
}
if (Math.abs(total - bars * barBeats) > 1e-6) {
  process.stderr.write(`  does not fill its bars: ${total.toFixed(3)} against ${(bars * barBeats).toFixed(3)}\n`);
}
/*
 * What the file claims, against what it was told.
 *
 * The tool still refuses to pick a key — MIDI key signatures are wrong or
 * absent often enough that trusting one would put wrong accidentals into the
 * corpus silently. But saying what the file claims costs nothing and turns two
 * of the caller's guesses into a check.
 */
const { metre: statedMetre, fifths: statedFifths, minor: statedMinor } = declared;
if (statedMetre) {
  const statedBar = (statedMetre[0] * 4) / statedMetre[1];
  if (Math.abs(statedBar * scale - barBeats) > 1e-9) {
    process.stderr.write(
      `  the file declares ${statedMetre[0]}/${statedMetre[1]} but ${beatsPerBar}/${beatUnit} was asked for` +
        `${scale === 1 ? ' — try --scale ' + (barBeats / statedBar).toFixed(3).replace(/0+$/, '') : ''}\n`,
    );
  }
}
if (statedFifths !== undefined && (statedFifths !== fifths || statedMinor !== (mode === 'minor'))) {
  process.stderr.write(
    `  the file declares ${statedFifths} sharps/flats ${statedMinor ? 'minor' : 'major'},` +
      ` read as ${fifths} ${mode} — check which is right\n`,
  );
}


/*
 * Whether the bars taken can actually be written.
 *
 * Asked of the slice rather than of the file, because a fault forty bars past
 * the cut says nothing about the excerpt — and the earlier version, which
 * counted the whole track, made clean cuts look broken. A note of a beat and a
 * quarter inside one bar is the usual offender: a score ties it, and this
 * format ties only across a bar line.
 */
const unwritable = sliced.filter((event) => durationFromBeats(event.beats) === null);
if (unwritable.length) {
  process.stderr.write(
    `  ${unwritable.length} event(s) in these bars no single value can write: ` +
      `${[...new Set(unwritable.map((e) => `${e.beats} beats`))].slice(0, 4).join('; ')}` +
      ` — a score would tie these inside the bar, which this format does not take\n`,
  );
}

if (offGrid.length) {
  process.stderr.write(`  ${offGrid.length} note(s) off the grid: ${offGrid.slice(0, 5).join('; ')}\n`);
}

/*
 * Whether the excerpt could be a theme at all.
 *
 * Themes abut, so both ends must be the tonic, mediant or dominant — and where
 * a piece is cut is a musical judgement no tool should make. Saying which cuts
 * would validate turns that judgement from a guess into a short list.
 */
const degreesOf = (line: string) => Number(/^n\((\d)/.exec(line)?.[1] ?? 0);
const sounded = sliced.filter((event) => event.line.startsWith('n('));
if (sounded.length) {
  const ends = [degreesOf(sounded[0].line), degreesOf(sounded[sounded.length - 1].line)];
  const stable = ends.every((degree) => [1, 3, 5].includes(degree));
  process.stderr.write(
    `  ends on degrees ${ends.join(' and ')} — ${stable ? 'a theme may start and end here' : 'not stable, so this cut will not validate'}\n`,
  );
}
