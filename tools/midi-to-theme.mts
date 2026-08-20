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
function readTrack(data: Buffer, at: number, end: number): RawNote[] {
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
      i++; // meta type
      const [length, afterLength] = readVar(data, i);
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

function readMidi(path: string): { division: number; tracks: RawNote[][] } {
  const data = readFileSync(path);
  if (data.toString('ascii', 0, 4) !== 'MThd') throw new Error(`${path} is not a MIDI file`);
  const division = data.readInt16BE(12);
  if (division <= 0) throw new Error('SMPTE timing is not supported; needs ticks per quarter note');

  const tracks: RawNote[][] = [];
  let at = 8 + data.readUInt32BE(4);
  while (at < data.length) {
    const length = data.readUInt32BE(at + 4);
    if (data.toString('ascii', at, at + 4) === 'MTrk') {
      tracks.push(readTrack(data, at + 8, at + 8 + length));
    }
    at += 8 + length;
  }
  return { division, tracks };
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
  process.stderr.write('usage: midi-to-theme <file.mid> [--track N] [--fifths N] [--mode major|minor] [--metre 4/4] [--id name]\n');
  process.exit(2);
}

const fifths = Number(arg('fifths', '0'));
const mode = arg('mode', 'major') as 'major' | 'minor';
const [beatsPerBar, beatUnit] = arg('metre', '4/4').split('/').map(Number);
const id = arg('id', 'borrowed');
const wantTrack = Number(arg('track', '-1'));

const { division, tracks } = readMidi(path);
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

/* Snapped to twelfths of a beat, which holds both triplets and semiquavers.
   Anything that will not sit on that grid is named rather than rounded away. */
const GRID = 12;
const offGrid: string[] = [];
const beatsOf = (ticks: number, what: string) => {
  const exact = ticks / division;
  const snapped = Math.round(exact * GRID) / GRID;
  if (Math.abs(exact - snapped) > 0.02) offGrid.push(`${what} ${exact.toFixed(3)} beats`);
  return snapped;
};

const barBeats = (beatsPerBar * 4) / beatUnit;
const tonicIndex = (() => {
  const spelled = spellInKey(tonicMidiFor(fifths, mode), fifths);
  return spelled.octave * 7 + LETTERS.indexOf(spelled.letter as Letter);
})();

const raw = single.map((note, index) => ({
  beats: beatsOf(note.ticks, `note ${index}`),
  ...toDegree(note.midi, fifths, mode, tonicIndex),
}));

/*
 * Octaves are stated relative to wherever the theme's tonic is placed, and
 * `realiseTheme` places it — so shifting every note by the same octave changes
 * nothing about the music. Shifted to whichever octave most notes are already
 * in, which leaves the fewest markers on the page: a tune sitting entirely
 * below the reference otherwise carries `octave: -1` on every single note, and
 * a reader has to hold that in their head to see the shape.
 */
const commonest = [...raw.reduce((counts, note) => counts.set(note.octave, (counts.get(note.octave) ?? 0) + 1), new Map<number, number>())]
  .sort((a, b) => b[1] - a[1])[0][0];

/** Twelfths reduced, so a triplet reads `1 / 3` rather than `4 / 12`. */
function beatSource(beats: number): string {
  if (beats === Math.round(beats)) return String(beats);
  const numerator = Math.round(beats * GRID);
  const divide = (a: number, b: number): number => (b ? divide(b, a % b) : a);
  const by = divide(numerator, GRID);
  return `${numerator / by} / ${GRID / by}`;
}

const events = raw.map(({ beats, degree, alter, octave }) => {
  const shifted = octave - commonest;
  const extra = [alter ? `alter: ${alter}` : '', shifted ? `octave: ${shifted}` : '']
    .filter(Boolean)
    .join(', ');
  return { line: `n(${degree}, ${beatSource(beats)}${extra ? `, { ${extra} }` : ''})`, beats };
});

const total = events.reduce((sum, e) => sum + e.beats, 0);
const bars = Math.round(total / barBeats);

// Laid out a bar to a line, which is how a reviewer reads it back.
const lines: string[] = [];
let running = 0;
let current: string[] = [];
for (const event of events) {
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
    name: '${id}',
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
if (collapsed) process.stderr.write(`  ${collapsed} overlapping note(s) dropped — one voice was kept\n`);
if (Math.abs(total - bars * barBeats) > 1e-6) {
  process.stderr.write(`  does not fill its bars: ${total.toFixed(3)} against ${(bars * barBeats).toFixed(3)}\n`);
}
if (offGrid.length) {
  process.stderr.write(`  ${offGrid.length} note(s) off the grid: ${offGrid.slice(0, 5).join('; ')}\n`);
}
