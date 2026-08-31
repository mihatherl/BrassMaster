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

/* ------------------------------------------------------------------ */
/* Custom rhythms — the annotation tool's data                         */
/* ------------------------------------------------------------------ */

/**
 * One event as the annotation tool edits it: a length, a dot, note or
 * rest. No stave and no pitch — the player's own framing of the tool
 * (2026-08-31): "there is no stave, just a note length indicator and a
 * rest length indicator."
 *
 * Deliberately narrower than `parseCell`'s grammar: no triplets (they
 * come in threes and the editor cannot yet keep that honest) and no
 * dotted semiquaver (its off-positions fall between the counting
 * system's syllables, and a note the voice cannot count does not belong
 * in a counting tool). Every position this grammar can produce is a
 * multiple of a semiquaver, which the 1-e-&-a mapping names in full.
 */
export interface RhythmToken {
  code: 'w' | 'h' | 'q' | 'e' | 's';
  dotted?: boolean;
  rest?: boolean;
}

const TOKEN_BEATS: Record<RhythmToken['code'], number> = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };

export function tokenBeats(token: RhythmToken): number {
  return TOKEN_BEATS[token.code] * (token.dotted ? 1.5 : 1);
}

/**
 * Turns the editor's token list into the library's bar strings, or says
 * exactly why it cannot.
 *
 * The rules are the ones that keep a pattern playable and speakable:
 * whole bars only ("the rhythm goes for at least one, or otherwise a
 * whole number, of bars" — the player's spec), no event across a bar
 * line (unwritable without a tie, which the tool does not yet draw), a
 * dotted semiquaver nowhere (unspeakable), and something in it at all.
 */
export function barsFromTokens(
  tokens: readonly RhythmToken[],
  metre: readonly [number, number],
): { bars: string[] } | { error: string } {
  if (tokens.length === 0) return { error: 'Nothing here yet — add a note.' };
  const barBeats = (4 / metre[1]) * metre[0];
  const bars: string[][] = [];
  let at = 0;
  for (const token of tokens) {
    if (token.code === 's' && token.dotted) {
      return { error: 'A dotted semiquaver lands between the count’s syllables.' };
    }
    const beats = tokenBeats(token);
    const bar = Math.floor(at / barBeats + 1e-9);
    const end = at + beats;
    if (end > (bar + 1) * barBeats + 1e-9) {
      return {
        error: `Bar ${bar + 1} cannot hold that: it crosses the bar line.`,
      };
    }
    while (bars.length <= bar) bars.push([]);
    bars[bar].push(`${token.rest ? 'r' : '0'}${token.code}${token.dotted ? '.' : ''}`);
    at = end;
  }
  const whole = Math.round(at / barBeats);
  if (Math.abs(at - whole * barBeats) > 1e-9 || whole === 0) {
    const filled = at / barBeats;
    return {
      error: `Fills ${filled % 1 === 0 ? filled : filled.toFixed(2)} bars — a rhythm is a whole number of them.`,
    };
  }
  if (bars.every((bar) => bar.every((token) => token.startsWith('r')))) {
    return { error: 'All rests — there is nothing to play.' };
  }
  return { bars: bars.map((bar) => bar.join(' ')) };
}

/** The editor's reading of a stored bar, for editing a pattern again. */
export function tokensFromBars(bars: readonly string[]): RhythmToken[] | null {
  const tokens: RhythmToken[] = [];
  for (const bar of bars) {
    for (const event of parseCell(bar)) {
      const code = (Object.entries(TOKEN_BEATS).find(
        ([, beats]) => Math.abs(event.beats - beats) < 1e-9,
      ) ?? Object.entries(TOKEN_BEATS).find(
        ([, beats]) => Math.abs(event.beats - beats * 1.5) < 1e-9,
      ))?.[0] as RhythmToken['code'] | undefined;
      // A packaged pattern may use grammar the editor does not speak yet —
      // triplets, ties. Null says "copy it by ear, not by button".
      if (!code || event.tied) return null;
      const dotted = Math.abs(event.beats - TOKEN_BEATS[code] * 1.5) < 1e-9;
      tokens.push({ code, ...(dotted ? { dotted: true } : {}), ...(event.rest ? { rest: true } : {}) });
    }
  }
  return tokens;
}

/**
 * The printed count for the editor's token list, one entry per token —
 * the same mapping the play screen speaks from, read live as the author
 * builds, so the tool can never show a rhythm whose count differs from
 * what the run will print. Null over rests and over any position the
 * system does not name (which the editor's grammar cannot produce, but
 * the function does not assume that).
 */
export function parsePatternForCount(tokens: readonly RhythmToken[]): Array<string | null> {
  let beat = 0;
  return tokens.map((token) => {
    const syllable = token.rest ? null : syllableFor(beat);
    beat += tokenBeats(token);
    return syllable === null ? null : printedSyllable(syllable);
  });
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
