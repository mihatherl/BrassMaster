/**
 * Rhythm drills — the pattern library and the counting-syllable mapping.
 *
 * `docs/rhythm-plan.md` is the ratified design (2026-08-26; scheduled
 * 2026-08-30 when the microphone moved behind the eisteddfod's sample
 * corpus). This module is the mode's pure core: what a pattern *is*, which
 * patterns exist, and what the counting voice says about any onset. No
 * audio here, no React, no storage — the same layering as `cells.ts`.
 *
 * **One mapping drives both the screen and the voice** (the plan's ruling):
 * `syllableFor` feeds the printed annotations and, when the recorded clips
 * exist, the clip scheduler — so what the page shows and what the voice
 * says cannot disagree. The same shape as `hints.ts`, which derives
 * fingerings from the note rather than storing them.
 *
 * Paid (`__HAS_RHYTHM__`), but the flag lives at the screens and the
 * chooser, not here: this module is pure data and functions, kept out of
 * the free bundle by nothing importing it there — and `check:web` carries a
 * tripwire on this library's own pattern names so a forgotten guard fails
 * the deploy rather than leaking the feature.
 */

import { parseCell, type CellEvent } from './cells';
import { assembleExercise, type Slot } from './assemble';
import { durationFromBeats } from '../domain/rhythm';
import { metreFor } from '../domain/metre';
import type { Clef, Instrument } from '../domain/instruments';
import type { Exercise, LabelEvent } from './types';

/* ------------------------------------------------------------------ */
/* The counting system                                                 */
/* ------------------------------------------------------------------ */

/**
 * What the voice says at one onset, in the "1-e-and-a" system — the first
 * counting system, ruled 2026-08-26, with a second ("taa te-te") kept
 * expressible as data: a clip set plus another mapping like this one, never
 * a second implementation.
 *
 * The clip vocabulary is deliberately small: beat numbers (1–6 covers every
 * metre the app writes), "e", "and", "a", "trip", "let". Rests are silence
 * — a rest is not spoken — and return no syllable at all.
 */
export type Syllable = '1' | '2' | '3' | '4' | '5' | '6' | 'e' | 'and' | 'a' | 'trip' | 'let';

/**
 * The syllable for an onset at `beat` crotchets into the bar, or null where
 * the voice says nothing.
 *
 * The system resets every beat — which is why the pattern library's natural
 * unit is the one-beat cell — so only the position *within* the beat
 * matters, plus which beat it is:
 *
 *   0     → the beat number      0.25 → "e"
 *   0.5   → "and"                0.75 → "a"
 *   1/3   → "trip"               2/3  → "let"
 *
 * Anything else — the offbeat of a quintuplet, say — is null rather than a
 * guess: the voice stays silent sooner than say something false, and the
 * app writes none of those anyway.
 *
 * Positions are snapped to the same tolerance the generator's own bar
 * arithmetic uses (`snapBeat`'s 1e-9 era taught this): a third arrives as
 * 0.3333… and must still be "trip".
 */
export function syllableFor(beat: number): Syllable | null {
  const within = beat - Math.floor(beat + EPSILON);
  const at = (position: number) => Math.abs(within - position) < EPSILON;
  if (at(0) || at(1)) {
    const number = Math.round(beat) + 1;
    return number >= 1 && number <= 6 ? (String(number) as Syllable) : null;
  }
  if (at(0.25)) return 'e';
  if (at(0.5)) return 'and';
  if (at(0.75)) return 'a';
  if (at(1 / 3)) return 'trip';
  if (at(2 / 3)) return 'let';
  return null;
}

const EPSILON = 1e-6;

/**
 * How a syllable is PRINTED, against how it is spoken. The counting
 * convention writes "1 e & a" — the ampersand is the page's word for
 * "and" — and the short form is also what stops adjacent counts colliding
 * on a narrow paged stave, which is how the first cut failed.
 */
export function printedSyllable(syllable: Syllable): string {
  return syllable === 'and' ? '&' : syllable;
}

/**
 * The printed count for a whole bar of events: one entry per event, null
 * for rests (silence) and for positions the system does not name. `beats`
 * accumulate exactly as the generator plays them, so the annotations land
 * on the notes they describe.
 */
export function syllablesFor(events: readonly CellEvent[]): Array<Syllable | null> {
  let beat = 0;
  return events.map((event) => {
    const syllable = event.rest ? null : syllableFor(beat);
    beat += event.beats;
    return syllable;
  });
}

/* ------------------------------------------------------------------ */
/* The pattern library                                                 */
/* ------------------------------------------------------------------ */

/**
 * Where a pattern sits on the graded spine — the primary organisation,
 * ruled 2026-08-26 over cultural collections: the spine is one-beat cells
 * graded by what teaches, and named patterns are landmarks inside it, not
 * the organisation. The order is a hypothesis the skill store can test
 * (`rhythm:` and `beat:` labels are already recorded from every judged
 * note), so if stage 4 proves harder than stage 5 the levels reorder and
 * nothing else changes.
 */
export type SpineStage = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface RhythmPattern {
  /** Identifies the music, as a cell id does: change the notes, change the id. */
  id: string;
  /** What the picker calls it — teaching names, and real names for landmarks. */
  name: string;
  metre: readonly [number, number];
  stage: SpineStage;
  /**
   * The bars, in the cell notation's duration tokens with every step 0 —
   * the pitchless reading the plan named. Multi-bar patterns are allowed
   * (son clave is two bars); each entry is one bar and must fill it.
   */
  bars: readonly string[];
}

/** A pattern's bars, parsed. Steps are all zero and ignored by this mode. */
export function patternEvents(pattern: RhythmPattern): CellEvent[][] {
  return pattern.bars.map((bar) => parseCell(bar));
}

/**
 * The first stages of the spine, 4/4 unless the pattern says otherwise.
 *
 * Stages 1–4 only, deliberately: the plan's spine runs to nine, but the
 * exact pattern list within each stage was left "a list to write", and a
 * list this size is playable end to end before the semiquaver stages are
 * drafted. Extending it is data.
 */
export const RHYTHM_PATTERNS: readonly RhythmPattern[] = [
  // Stage 1 — on the beat: crotchets, minims, semibreves, their rests.
  { id: 'four-crotchets', name: 'Four crotchets', metre: [4, 4], stage: 1, bars: ['0q 0q 0q 0q'] },
  { id: 'minims', name: 'Two minims', metre: [4, 4], stage: 1, bars: ['0h 0h'] },
  { id: 'minim-crotchets', name: 'Minim and crotchets', metre: [4, 4], stage: 1, bars: ['0h 0q 0q'] },
  { id: 'crotchet-rests', name: 'Crotchets with rests', metre: [4, 4], stage: 1, bars: ['0q rq 0q rq'] },
  { id: 'semibreve', name: 'Semibreve', metre: [4, 4], stage: 1, bars: ['0w'] },
  { id: 'waltz-crotchets', name: 'Three in three', metre: [3, 4], stage: 1, bars: ['0q 0q 0q'] },
  // Stage 2 — the divided beat: quaver pairs among crotchets.
  { id: 'quaver-pairs', name: 'Quaver pairs', metre: [4, 4], stage: 2, bars: ['0e 0e 0e 0e 0e 0e 0e 0e'] },
  { id: 'pairs-and-crotchets', name: 'Pairs and crotchets', metre: [4, 4], stage: 2, bars: ['0q 0e 0e 0q 0e 0e'] },
  { id: 'pairs-leading', name: 'Pairs leading', metre: [4, 4], stage: 2, bars: ['0e 0e 0q 0e 0e 0q'] },
  { id: 'waltz-pairs', name: 'Pairs in three', metre: [3, 4], stage: 2, bars: ['0q 0e 0e 0q'] },
  // Stage 3 — the dotted pair: the most-cited stumbling point in the methods.
  { id: 'dotted-pair', name: 'Dotted pairs', metre: [4, 4], stage: 3, bars: ['0q. 0e 0q. 0e'] },
  { id: 'dotted-then-even', name: 'Dotted, then even', metre: [4, 4], stage: 3, bars: ['0q. 0e 0e 0e 0q'] },
  { id: 'dotted-minim-waltz', name: 'Dotted minim', metre: [3, 4], stage: 3, bars: ['0h.', '0q 0q 0q'] },
  // Stage 4 — off-beats and ties: quaver rest + quaver; ties across the beat.
  { id: 'off-beats', name: 'Off-beats', metre: [4, 4], stage: 4, bars: ['re 0e re 0e re 0e re 0e'] },
  { id: 'off-beat-answers', name: 'Off-beat answers', metre: [4, 4], stage: 4, bars: ['0q re 0e 0q re 0e'] },
  { id: 'tied-over-beat', name: 'Tied across the beat', metre: [4, 4], stage: 4, bars: ['0q 0e 0e~ 0e 0e 0q'] },
];

/** The pattern, by id — or the first, so a stale stored id still plays. */
export function rhythmPatternById(id: string): RhythmPattern {
  return RHYTHM_PATTERNS.find((pattern) => pattern.id === id) ?? RHYTHM_PATTERNS[0];
}

/* ------------------------------------------------------------------ */
/* Custom rhythms — the annotation tool's data                         */
/* ------------------------------------------------------------------ */

/**
 * The annotation tool's grid — the player's redesign, 2026-08-31/09-01:
 *
 * > Break each bar up into some number of divisions per beat… say 16
 * > divisions in a 4/4 bar. The user colors those divisions… either play
 * > or rest. [With] a "rearticulation" marker. From what the user is
 * > drawing, some notes appear to identify how that would look, using
 * > combinations of dotted notes, tied notes, rests of various durations.
 *
 * A cell is one of three states — the rearticulation marker turned out to
 * be the whole data model: "play" paints an attack followed by holds, and
 * the marker is just "this cell attacks rather than holds". Two crotchets
 * against a minim is `x-x-` against `x---`. The step sequencer's model,
 * because fifty years of drum machines prove the musically untrained can
 * program rhythms with it — and because the grid makes yesterday's
 * validation UNREPRESENTABLE rather than checked: a grid of whole bars
 * cannot hold a partial bar or cross past its own edge.
 *
 * Four cells per beat, semiquaver resolution. Triplets need a per-beat
 * division and are deliberately absent from the first grid; the packaged
 * triplet patterns simply decline to open in it (`gridFromBars` → null)
 * rather than being mangled.
 */
export type GridCell = 'attack' | 'hold' | 'rest';

export const CELLS_PER_BEAT = 4;

export function gridBarCells(metre: readonly [number, number]): number {
  return Math.round((4 / metre[1]) * metre[0] * CELLS_PER_BEAT);
}

/**
 * The grid, engraved — the derivation the player asked to SEE, and the
 * ruling that governs it (2026-09-01): **show the beat, with ties.** A
 * note is split at every beat boundary and tied back together; the only
 * mergers are the ones engraving practice treats as transparent, each
 * named below. A syncopation shorthand (the off-beat crotchet) is
 * deliberately NOT written: this app teaches reading, and what learners
 * read here should show them where the beats fall. Shorthands can join a
 * curated list later, one at a time, by the player's eye on the preview.
 *
 * Rests never tie; a rest run is written per beat, largest value first,
 * with the whole-bar rest as the one merger (the semibreve-rest
 * convention, spelled per metre because the bar's length is the point).
 */
export function barsFromGrid(
  cells: readonly GridCell[],
  metre: readonly [number, number],
): { bars: string[] } | { error: string } {
  const perBar = gridBarCells(metre);
  if (cells.length === 0 || cells.length % perBar !== 0) {
    return { error: 'The grid is not whole bars — this is a bug, not an input.' };
  }
  if (!cells.includes('attack')) return { error: 'Nothing to play yet — paint a note.' };
  if (cells[0] === 'hold') return { error: 'The rhythm opens mid-note — start with an attack.' };

  interface Piece { cell: number; len: number; rest: boolean; tieFrom: boolean }
  const pieces: Piece[] = [];
  let at = 0;
  while (at < cells.length) {
    const rest = cells[at] === 'rest';
    let end = at + 1;
    while (
      end < cells.length &&
      (rest ? cells[end] === 'rest' : cells[end] === 'hold') &&
      // A run never leaves its own bar here; bar-crossing shows as a tie.
      end % perBar !== 0
    ) {
      end++;
    }
    // A note run may continue into the next bar as holds; take them too,
    // marking the border so the engraver ties across it.
    while (!rest && end < cells.length && cells[end] === 'hold') end++;
    pieces.push(...engravePieces(at, end - at, rest, metre));
    at = end;
  }

  const bars: string[][] = Array.from({ length: cells.length / perBar }, () => []);
  for (const [index, piece] of pieces.entries()) {
    const token = `${piece.rest ? 'r' : '0'}${codeFor(piece.len)}${
      !piece.rest && index + 1 < pieces.length && pieces[index + 1].tieFrom ? '~' : ''
    }`;
    bars[Math.floor(piece.cell / perBar)].push(token);
  }
  return { bars: bars.map((bar) => bar.join(' ')) };
}

/** A run in cells → engraved pieces, split at beats, merged where named. */
function engravePieces(
  cell: number,
  len: number,
  rest: boolean,
  metre: readonly [number, number],
): Array<{ cell: number; len: number; rest: boolean; tieFrom: boolean }> {
  const perBar = gridBarCells(metre);
  const pieces: Array<{ cell: number; len: number; rest: boolean; tieFrom: boolean }> = [];
  let at = cell;
  let left = len;
  let first = true;
  while (left > 0) {
    const inBar = at % perBar;
    const take = mergedLength(inBar, Math.min(left, perBar - inBar), rest, metre);
    pieces.push({ cell: at, len: take, rest, tieFrom: !first && !rest });
    at += take;
    left -= take;
    first = false;
  }
  return pieces;
}

/**
 * The longest single value that may be written from this in-bar position —
 * the whole of the show-the-beat ruling, as a table of permissions:
 *
 * - within a beat, anything (1–4 cells is s, e, e., q);
 * - the whole bar (semibreve in 4/4, dotted minim in 3/4, minim in 2/4);
 * - the half bar of 4/4, from either half's start — never from beat 2,
 *   which would hide the middle of the bar;
 * - the minim in 3/4 from beat 1 or 2, which convention reads clean;
 * - the dotted crotchet from a beat that does not carry it across 4/4's
 *   half-bar — stage 3's own figure, printed as itself.
 *
 * Everything longer or elsewhere waits for the next boundary and ties.
 */
function mergedLength(
  inBar: number,
  want: number,
  rest: boolean,
  metre: readonly [number, number],
): number {
  const perBar = gridBarCells(metre);
  const beat = CELLS_PER_BEAT;
  const onBeat = inBar % beat === 0;
  if (inBar === 0 && want >= perBar) return perBar;
  const is44 = perBar === 16;
  const is34 = perBar === 12;
  /* The half-bar of 4/4 merges for notes AND rests — the minim rest is
     how a half-bar of silence is actually printed — where 3/4 keeps its
     rests in crotchets, as convention does: a minim rest means "half of a
     bar that divides in two", which 3/4 is not. */
  if (is44 && (inBar === 0 || inBar === 8) && want >= 8) return 8;
  if (!rest) {
    if (is34 && (inBar === 0 || inBar === 4) && want >= 8) return 8;
    if (onBeat && want >= 6 && (!is44 || inBar === 0 || inBar === 8)) return 6;
  }
  const toBeat = beat - (inBar % beat);
  return Math.min(want, toBeat);
}

/** Cells → one written value. The grid can only produce these lengths. */
function codeFor(len: number): string {
  const codes: Record<number, string> = {
    1: 's', 2: 'e', 3: 'e.', 4: 'q', 6: 'q.', 8: 'h', 12: 'h.', 16: 'w',
  };
  const code = codes[len];
  if (!code) throw new Error(`unwritable length ${len} cells`);
  return code;
}

/**
 * A stored pattern back onto the grid, or null where it cannot go — a
 * triplet or any off-grid position. Null means "this one is played, not
 * edited", never a mangling. A tie's far end lands as holds: a tie IS the
 * absence of a rearticulation, which is the grid saying what the notation
 * says.
 */
export function gridFromBars(bars: readonly string[]): GridCell[] | null {
  const cells: GridCell[] = [];
  let tiedInto = false;
  for (const bar of bars) {
    for (const event of parseCell(bar)) {
      const span = event.beats * CELLS_PER_BEAT;
      if (Math.abs(span - Math.round(span)) > 1e-9) return null;
      const len = Math.round(span);
      if (event.rest) {
        for (let i = 0; i < len; i++) cells.push('rest');
        tiedInto = false;
      } else {
        cells.push(tiedInto ? 'hold' : 'attack');
        for (let i = 1; i < len; i++) cells.push('hold');
        tiedInto = event.tied === true;
      }
    }
  }
  return cells;
}

/**
 * The count over the grid's columns — one entry per cell, the syllable
 * where the counting system names that position, blank elsewhere. The
 * header row of the tool, and the same mapping everything else speaks.
 */
export function gridCount(metre: readonly [number, number]): Array<string | null> {
  return Array.from({ length: gridBarCells(metre) }, (_, cell) => {
    const syllable = syllableFor(cell / CELLS_PER_BEAT);
    return syllable === null ? null : printedSyllable(syllable);
  });
}

/**
 * The grid's bars as a small engraved exercise — the stave the tool shows
 * in place of yesterday's chips (the player, 2026-09-01: *"just plonk all
 * the notes onto the stave as a C"*). One written pitch per clef, chosen
 * to sit mid-stave and inside every instrument's compass so the preview
 * never greys as unplayable; the count rides along on the same channel
 * the play screen prints. This is also the bridge the cell designer will
 * cross: the same stave, with the vertical axis unlocked.
 */
export function previewExerciseFromBars(
  bars: readonly string[],
  metrePair: readonly [number, number],
  instrument: Instrument,
  clef: Clef,
): Exercise {
  const metre = metreFor(metrePair[0], metrePair[1]);
  const pitch = clef === 'treble' ? 72 : 48;
  const slots: Slot[] = [];
  const pitches: number[] = [];
  const syllables: LabelEvent[] = [];
  let at = 0;
  let tiedInto = false;
  for (const bar of bars) {
    let barBeat = 0;
    for (const event of parseCell(bar)) {
      const duration = durationFromBeats(event.beats);
      if (!duration) throw new Error(`unwritable duration in preview: ${bar}`);
      if (event.rest) {
        slots.push({ startBeat: at + barBeat, duration, isRest: true, tiedFromPrevious: false });
        tiedInto = false;
      } else {
        slots.push({ startBeat: at + barBeat, duration, isRest: false, tiedFromPrevious: tiedInto });
        if (!tiedInto) {
          pitches.push(pitch);
          const syllable = syllableFor(barBeat);
          if (syllable) syllables.push({ atBeat: at + barBeat, text: printedSyllable(syllable) });
        }
        tiedInto = event.tied === true;
      }
      barBeat += event.beats;
    }
    at += metre.barBeats;
  }
  const exercise = assembleExercise(slots, pitches, {
    instrument,
    clef,
    keys: [{ fromBeat: 0, fifths: 0 }],
    metres: [{ fromBeat: 0, metre }],
    totalBeats: at,
    chosenBeats: at,
    seed: 0,
    kind: 'rhythm',
    labels: [],
    tempo: [],
  });
  exercise.syllables = syllables;
  return exercise;
}

/**
 * The player's own rhythms, on the phone — the paid line's storage, and
 * `check:web`'s tripwire for the annotation tool. Read fresh each time:
 * the store is small and a stale cache across the settings screen and
 * the generator would be two answers to "what did I write".
 */
export const CUSTOM_RHYTHMS_KEY = 'brass-trainer:rhythms';

export function loadCustomRhythms(): RhythmPattern[] {
  try {
    const raw = localStorage.getItem(CUSTOM_RHYTHMS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is RhythmPattern =>
        typeof entry === 'object' && entry !== null &&
        typeof (entry as RhythmPattern).id === 'string' &&
        typeof (entry as RhythmPattern).name === 'string' &&
        Array.isArray((entry as RhythmPattern).bars),
    );
  } catch {
    return [];
  }
}

export function saveCustomRhythm(pattern: RhythmPattern): void {
  const rest = loadCustomRhythms().filter((entry) => entry.id !== pattern.id);
  localStorage.setItem(CUSTOM_RHYTHMS_KEY, JSON.stringify([...rest, pattern]));
}

export function deleteCustomRhythm(id: string): void {
  const rest = loadCustomRhythms().filter((entry) => entry.id !== id);
  localStorage.setItem(CUSTOM_RHYTHMS_KEY, JSON.stringify(rest));
}

/**
 * A pattern by id from EITHER shelf — the player's own first, so a custom
 * may not shadow-and-lose to a packaged id — falling back to the library's
 * first for an id nobody knows, the same grace a stale drillId gets.
 */
export function resolveRhythmPattern(id: string): RhythmPattern {
  return loadCustomRhythms().find((pattern) => pattern.id === id) ?? rhythmPatternById(id);
}
