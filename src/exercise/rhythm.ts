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

/**
 * How one beat divides — in four (semiquavers, counted 1-e-&-a) or in
 * three (triplets, counted 1-trip-let). Per BEAT, not per bar or grid
 * (the player, 2026-09-01: triplets "superimposed on top of the
 * 1-e-and-a rhythm"): the counting system resets every beat, so the
 * grid's resolution may too, and a triplet sits beside semiquavers in
 * one bar exactly as it does on a printed part. The rejected
 * alternative — one fine grid of twelfths that both fit — would let the
 * user draw positions no stave can print, reopening the very hole the
 * grid exists to close: every cell must be a position the count can
 * name and the notation can write.
 */
export type GridDivision = 3 | 4;

export interface GridBeat {
  division: GridDivision;
  /** Exactly `division` cells. */
  cells: GridCell[];
}

/** All the metres here are x/4, so a beat is a crotchet and this is the top. */
export function beatsPerBar(metre: readonly [number, number]): number {
  return Math.round((4 / metre[1]) * metre[0]);
}

export function freshGrid(metre: readonly [number, number], bars = 1): GridBeat[] {
  return Array.from({ length: beatsPerBar(metre) * bars }, () => ({
    division: 4 as GridDivision,
    cells: Array<GridCell>(4).fill('rest'),
  }));
}

/** The grid's cells in play order — the gestures' address space. */
export function flattenGrid(grid: readonly GridBeat[]): GridCell[] {
  return grid.flatMap((beat) => beat.cells);
}

/** The same divisions, refilled — how a gesture's edit becomes a grid. */
export function rebuildGrid(grid: readonly GridBeat[], cells: readonly GridCell[]): GridBeat[] {
  let at = 0;
  return grid.map((beat) => {
    const slice = cells.slice(at, at + beat.division) as GridCell[];
    at += beat.division;
    return { division: beat.division, cells: slice };
  });
}

/**
 * The count over one beat's columns, positional as ruled: the numeral,
 * then the division's own syllables. The numeral doubles as the beat's
 * division toggle in the tool, because the numeral is the thing that
 * owns the beat.
 */
export function beatCountLabels(beatInBar: number, division: GridDivision): string[] {
  const numeral = String(beatInBar + 1);
  return division === 4 ? [numeral, 'e', '&', 'a'] : [numeral, 'trip', 'let'];
}

/**
 * The grid, engraved — the ruling unchanged (2026-09-01): **show the
 * beat, with ties.** Splits at every beat boundary; the mergers are the
 * named table in `mergedBeats`; rests never tie. New under triplets: a
 * piece inside a division-3 beat is a triplet quaver (one cell), a
 * triplet crotchet (two) or the beat itself (three tied triplet quavers
 * ARE a crotchet, so it engraves as one); and the dotted-crotchet merger
 * now also demands the half it borrows come from a division-4 beat,
 * because half of a triplet beat is not a place a note can end.
 */
export function barsFromGrid(
  grid: readonly GridBeat[],
  metre: readonly [number, number],
): { bars: string[] } | { error: string } {
  const perBar = beatsPerBar(metre);
  if (grid.length === 0 || grid.length % perBar !== 0) {
    return { error: 'The grid is not whole bars — this is a bug, not an input.' };
  }
  for (const beat of grid) {
    if (beat.cells.length !== beat.division) {
      return { error: 'A beat disagrees with its own division — this is a bug.' };
    }
  }
  const cells = flattenGrid(grid);
  if (!cells.includes('attack')) return { error: 'Nothing to play yet — paint a note.' };
  if (cells[0] === 'hold') return { error: 'The rhythm opens mid-note — start with an attack.' };

  /* Each flat cell's start (in beats from the top) and extent. */
  const starts: number[] = [];
  const extents: number[] = [];
  grid.forEach((beat, index) => {
    beat.cells.forEach((_, cell) => {
      starts.push(index + cell / beat.division);
      extents.push(1 / beat.division);
    });
  });

  interface Piece { startBeat: number; beats: number; rest: boolean; tieFrom: boolean }
  const pieces: Piece[] = [];
  let at = 0;
  while (at < cells.length) {
    const rest = cells[at] === 'rest';
    let end = at + 1;
    while (end < cells.length && cells[end] === (rest ? 'rest' : 'hold')) end++;
    const startBeat = starts[at];
    const endBeat = end < cells.length ? starts[end] : starts[at] + runBeats(at, end, extents);
    pieces.push(...engraveRun(startBeat, endBeat - startBeat, rest, grid, metre));
    at = end;
  }

  const bars: string[][] = Array.from({ length: grid.length / perBar }, () => []);
  for (const [index, piece] of pieces.entries()) {
    const division = grid[Math.floor(piece.startBeat + 1e-9)].division;
    const token = `${piece.rest ? 'r' : '0'}${codeFor(piece.beats, division)}${
      !piece.rest && index + 1 < pieces.length && pieces[index + 1].tieFrom ? '~' : ''
    }`;
    bars[Math.floor(piece.startBeat / perBar + 1e-9)].push(token);
  }
  return { bars: bars.map((bar) => bar.join(' ')) };
}

function runBeats(from: number, to: number, extents: readonly number[]): number {
  let total = 0;
  for (let i = from; i < to; i++) total += extents[i];
  return total;
}

function engraveRun(
  startBeat: number,
  beats: number,
  rest: boolean,
  grid: readonly GridBeat[],
  metre: readonly [number, number],
): Array<{ startBeat: number; beats: number; rest: boolean; tieFrom: boolean }> {
  const pieces: Array<{ startBeat: number; beats: number; rest: boolean; tieFrom: boolean }> = [];
  let at = startBeat;
  let left = beats;
  let first = true;
  while (left > 1e-9) {
    const take = mergedBeats(at, left, rest, grid, metre);
    pieces.push({ startBeat: at, beats: take, rest, tieFrom: !first && !rest });
    at += take;
    left -= take;
    first = false;
  }
  return pieces;
}

/**
 * The longest single value writable from here — the permission table, in
 * beats. Within a beat, anything the division can produce; the whole
 * bar; 4/4's half-bar for notes and rests alike (the minim rest is how
 * parts print half a bar of silence, where 3/4 keeps crotchet rests);
 * 3/4's minim from either lower beat; the dotted crotchet from a beat
 * whose borrowed half is a real place — a division-4 beat outside 4/4's
 * half-bar crossing. Everything else waits for the next boundary and
 * ties.
 */
function mergedBeats(
  at: number,
  want: number,
  rest: boolean,
  grid: readonly GridBeat[],
  metre: readonly [number, number],
): number {
  const perBar = beatsPerBar(metre);
  const inBar = at - Math.floor(at / perBar + 1e-9) * perBar;
  const onBeat = Math.abs(inBar - Math.round(inBar)) < 1e-9;
  const is44 = perBar === 4;
  const is34 = perBar === 3;
  if (Math.abs(inBar) < 1e-9 && want >= perBar - 1e-9) return perBar;
  if (is44 && onBeat && (Math.round(inBar) === 0 || Math.round(inBar) === 2) && want >= 2 - 1e-9) {
    return 2;
  }
  if (!rest) {
    if (is34 && onBeat && Math.round(inBar) <= 1 && want >= 2 - 1e-9) return 2;
    if (
      onBeat &&
      want >= 1.5 - 1e-9 &&
      (!is44 || Math.round(inBar) === 0 || Math.round(inBar) === 2) &&
      grid[Math.round(at) + 1]?.division === 4
    ) {
      return 1.5;
    }
  }
  // To the next boundary the beat's own division can name.
  const inBeat = at - Math.floor(at + 1e-9);
  const toBeat = 1 - inBeat;
  const take = Math.min(want, toBeat);
  /*
   * A dotted rest is not written in simple time: a note may dot off the
   * beat (the march's own s–e. figure), but a rest shows the subdivision
   * it silences — so three sixteenths of silence split at the half-beat,
   * whichever side of it they start.
   */
  if (rest && Math.abs(take - 0.75) < 1e-9) {
    return Math.abs(inBeat - Math.round(inBeat)) < 1e-9 ? 0.5 : 0.25;
  }
  return take;
}

/** Beats → one written value, per the division the piece began in. */
function codeFor(beats: number, division: GridDivision): string {
  const table: Array<[number, string]> =
    division === 3
      ? [[1 / 3, 't'], [2 / 3, 'T'], [1, 'q'], [1.5, 'q.'], [2, 'h'], [3, 'h.'], [4, 'w']]
      : [[0.25, 's'], [0.5, 'e'], [0.75, 'e.'], [1, 'q'], [1.5, 'q.'], [2, 'h'], [3, 'h.'], [4, 'w']];
  const hit = table.find(([b]) => Math.abs(b - beats) < 1e-9);
  if (!hit) throw new Error(`unwritable length ${beats} beats`);
  return hit[1];
}

/**
 * A stored pattern back onto the grid, or null where it cannot go. Each
 * beat's division is inferred from what lands inside it: boundaries on
 * quarters make a division-4 beat, boundaries on thirds a division-3
 * one, a beat nothing subdivides defaults to 4, and a beat that mixes
 * the two is nothing the grid can hold. A tie's far end lands as holds —
 * a tie IS the absence of a rearticulation.
 */
export function gridFromBars(bars: readonly string[]): GridBeat[] | null {
  interface Span { startBeat: number; beats: number; rest: boolean; tiedInto: boolean }
  const spans: Span[] = [];
  let at = 0;
  let tiedInto = false;
  for (const bar of bars) {
    for (const event of parseCell(bar)) {
      spans.push({ startBeat: at, beats: event.beats, rest: event.rest === true, tiedInto });
      tiedInto = event.rest ? false : event.tied === true;
      at += event.beats;
    }
  }
  const totalBeats = Math.round(at);
  if (Math.abs(at - totalBeats) > 1e-9) return null;

  const fits = (position: number, division: GridDivision) =>
    Math.abs(position * division - Math.round(position * division)) < 1e-6;
  const grid: GridBeat[] = [];
  for (let beat = 0; beat < totalBeats; beat++) {
    // Every span boundary that falls strictly inside this beat.
    const inside = spans
      .flatMap((span) => [span.startBeat, span.startBeat + span.beats])
      .map((boundary) => boundary - beat)
      .filter((position) => position > 1e-9 && position < 1 - 1e-9);
    const division: GridDivision | null = inside.every((position) => fits(position, 4))
      ? 4
      : inside.every((position) => fits(position, 3))
        ? 3
        : null;
    if (division === null) return null;
    grid.push({ division, cells: Array<GridCell>(division).fill('rest') });
  }

  for (const span of spans) {
    let covered = 0;
    let first = true;
    while (covered < span.beats - 1e-9) {
      const beat = Math.floor(span.startBeat + covered + 1e-9);
      const entry = grid[beat];
      const inBeat = span.startBeat + covered - beat;
      const cell = inBeat * entry.division;
      if (Math.abs(cell - Math.round(cell)) > 1e-6) return null;
      const index = Math.round(cell);
      entry.cells[index] = span.rest
        ? 'rest'
        : first && !span.tiedInto
          ? 'attack'
          : 'hold';
      first = false;
      covered += 1 / entry.division;
    }
  }
  return grid;
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
