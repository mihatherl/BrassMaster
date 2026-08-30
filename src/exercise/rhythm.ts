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
