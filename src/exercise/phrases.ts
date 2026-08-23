/**
 * Themes, stitched from tunes — composed for the exercise, since v2.20.0, by
 * `compose.ts`; hand-written before that.
 *
 * Themes are laid end to end until the asked-for length is reached. The join is
 * why every theme starts and ends on a stable degree: two arbitrary phrases
 * butted together sound like a mistake, and one ending on the leading note
 * followed by one starting on the sixth sounds like a page turned two bars
 * early.
 *
 * Length is a count of themes, not a number of bars — the same reason a pattern
 * is measured in cycles. A theme is a written shape and how many bars it fills
 * is its own business, so asking for twelve bars of them asks for one and a
 * half of something meant to be played whole.
 *
 * The key set is dealt across those themes in contiguous blocks, exactly as a
 * pattern deals its keys across cycles, and a change lands only where one theme
 * ends and the next begins. Changing key inside a tune that was not written to
 * do so is a signature laid over somebody else's phrase.
 */

import type { Clef, Instrument } from '../domain/instruments';
import { tourKey, type KeyChange } from '../domain/keys';
import { metreFor, type Metre, type MetreChange } from '../domain/metre';
import { snapBeat } from '../domain/rhythm';
import type { Slot, SlotPitch } from './assemble';
import type { Rng } from './rng';
import { realiseTheme, type RealisedTheme, type Theme } from './theme';

export interface StitchOptions {
  instrument: Instrument;
  clef: Clef;
  /** Key the first theme opens in; later themes carry on from where it ends. */
  fifths: number;
  /**
   * Every key the exercise may move through, closest-ordered, `fifths` first.
   *
   * The set governs the joins and a theme governs its own inside: each theme
   * opens in the key the set has reached, and whatever it does internally is
   * part of the tune. Without this a player who picks four keys and
   * sight-reading gets none of them, which is worse than not offering it.
   */
  keys?: readonly number[];
  /**
   * The level themes are drawn at. Absent means the pool was chosen by hand —
   * a player who names the tunes has already answered the question the level
   * exists to answer, and filtering their picks by it would silently drop the
   * very things they asked for.
   */
  difficulty?: string;
  /**
   * The metre every theme must be in — or absent, and **the metre follows the
   * material**: each theme plays in a metre of its own, and the signature
   * changes at the join. That is how a printed medley works, and it is why a
   * collection holding a jig and a march is one collection rather than two
   * pools a time-signature control keeps apart.
   *
   * Composed material always passes one, because its tunes are built *for* a
   * metre rather than found in one.
   */
  metre?: Metre;
  /** Whole themes to play, end to end; where the white ends. */
  count: number;
  /**
   * Keep stitching whole themes at least this far, when the material has a
   * horizon. The cap is a floor for whole tunes, not a ceiling: the last
   * theme finishes wherever it finishes, because a cut-off tune is not a
   * tune and an approximate total is the agreed price of whole phrases.
   */
  horizonBeats?: number;
  rng: Rng;
  /**
   * The themes to draw from: composed for the exercise by `composeTune`, or
   * supplied by a test so that the stitching rules — do not repeat, carry the
   * key on, skip what will not fit — are exercised rather than assumed.
   */
  corpus: readonly Theme[];
  /**
   * A defined run: these exact tunes in these exact keys, in this order,
   * cycling back to the top if the run outlasts them.
   *
   * When present, the corpus, the key set and the difficulty are not
   * consulted — every step carries the whole answer, because the picker
   * built it against the real placement and refused to offer a combination
   * the compass will not hold. This replaced touring the key set over a list
   * of ids on 2026-08-23: a key chosen independently of a tune could name a
   * placement that does not exist (Invention 13 fits one key on a cornet),
   * and the run then truncated silently or fell back to composed material,
   * both of which read as bugs to the player who designed the feature.
   *
   * The no-repeat rule is suspended: declining to play the same tune twice
   * running is right when the app is choosing and wrong when somebody has
   * deliberately asked for it twice. A step whose placement no longer holds
   * (a list stored on one instrument, woken on another, before `sanitise`
   * has run) is skipped rather than ending the run.
   */
  steps?: ReadonlyArray<{ theme: Theme; fifths: number }>;
}

export interface StitchedPhrases {
  slots: Slot[];
  pitches: SlotPitch[];
  /** Divisi offers, parallel to `pitches`; `null` where a note has one head. */
  alternatives: (SlotPitch | null)[];
  keys: KeyChange[];
  totalBeats: number;
  /** Which themes were used, in order. For tests and for the results screen. */
  used: string[];
  /**
   * The time signature in force from the top, and every change of it.
   *
   * One metre per theme, entered at the theme's first beat and deduplicated
   * while consecutive themes agree — the same discipline as `keys`, and for
   * the same reason: a signature restating what is already true is the page
   * announcing nothing. A single-metre stitch is a list of one.
   */
  metres: MetreChange[];
  /**
   * The beat each used theme begins at, aligned with `used`; the first is 0.
   *
   * The joins are where the exercise has boundaries, and a boundary is where
   * a tempo may change — a theme is a whole thought, and changing speed inside
   * one that was not written for it would be the same trespass as changing its
   * key. Every entry lands on a bar line by construction, since each theme is
   * a whole number of bars.
   */
  starts: number[];
  /** Where the chosen count of themes ends; `totalBeats` without a horizon. */
  chosenBeats: number;
}

/** The metre a theme plays in when nothing was imposed: the first it names. */
function ownMetre(theme: Theme): Metre {
  return metreFor(theme.metres[0][0], theme.metres[0][1]);
}

/** Themes this instrument, difficulty and metre can actually take. */
export function themesFor(options: Omit<StitchOptions, 'rng' | 'count' | 'keys'>): Theme[] {
  return options.corpus.filter((theme) => {
    if (options.difficulty !== undefined && theme.difficulty !== options.difficulty) return false;
    if (options.metre) {
      const { beatsPerBar, beatUnit } = options.metre;
      if (!theme.metres.some(([n, d]) => n === beatsPerBar && d === beatUnit)) return false;
    }
    // Range is asked of the real placement rather than guessed at: a theme is a
    // fixed shape, so a compass that will not hold it means another theme.
    return realiseTheme(theme, { ...options, metre: options.metre ?? ownMetre(theme) }) !== null;
  });
}

/**
 * Lays themes end to end until the asked-for length is met.
 *
 * Returns null when nothing fits, which is a real answer and not a failure:
 * the caller falls back to generated material, the way a pattern that will not
 * fit the instrument does.
 */
export function stitchThemes(options: StitchOptions): StitchedPhrases | null {
  const steps = options.steps;
  const available = steps ? [] : themesFor(options);
  if (steps ? steps.length === 0 : available.length === 0) return null;

  const slots: Slot[] = [];
  const pitches: SlotPitch[] = [];
  const alternatives: (SlotPitch | null)[] = [];
  const keys: KeyChange[] = [];
  const metres: MetreChange[] = [];
  const used: string[] = [];
  const starts: number[] = [];

  const set = options.keys?.length ? options.keys : [options.fifths];

  let beat = 0;
  let fifths = options.fifths;
  let last: string | undefined;
  let chosenBeats: number | undefined;
  /* The defined run's place in its own list. Its own counter rather than
     `played`, so a skipped step advances the list without spending one of the
     themes asked for. */
  let cursor = 0;

  for (
    let played = 0;
    played < options.count ||
    (options.horizonBeats !== undefined && beat < options.horizonBeats - 1e-9);
    played++
  ) {
    // The white ends where the chosen count did; the grey stitches on.
    if (played === options.count) chosenBeats = beat;

    // In the imposed metre where there is one, or the theme's own where the
    // metre follows the material — a join is then also where a signature may
    // change, and only there, exactly as it is the only place a key may.
    const place = (theme: Theme) =>
      realiseTheme(theme, {
        instrument: options.instrument,
        clef: options.clef,
        fifths,
        metre: options.metre ?? ownMetre(theme),
        fromBeat: beat,
      });

    let theme: Theme;
    let realised: RealisedTheme;
    if (steps) {
      /*
       * The next step whose placement holds. Every step names its own key, so
       * there is no tour and nothing to filter — only the safety net for a
       * list that predates the current instrument, which skips rather than
       * ends the run. One full cycle finding nothing is the honest stop.
       */
      let placed: RealisedTheme | null = null;
      let stepped: Theme | undefined;
      for (let tries = 0; tries < steps.length && !placed; tries++) {
        const step = steps[cursor % steps.length];
        cursor++;
        fifths = step.fifths;
        placed = place(step.theme);
        if (placed) stepped = step.theme;
      }
      if (!placed) break;
      theme = stepped!;
      realised = placed;
    } else {
      /*
       * Which key this theme is played in.
       *
       * Dealt across the themes in contiguous blocks, exactly as a pattern
       * deals its keys across cycles: a key is finished with before the next
       * is taken up, and a set too large for the exercise simply uses fewer of
       * its keys rather than hurrying through them. A theme is where a key
       * change may land, and a theme is the only place — the tune is a whole
       * thought, and changing key inside one that was not written to would be
       * a change of signature laid over somebody else's phrase.
       */
      // The set toured across the themes asked for, and round again for as
      // long as the player keeps playing; see `tourKey`.
      fifths = tourKey(set, played, options.count);

      /*
       * Only themes that fit *this* key. The list was built against the key
       * the exercise opens in, and a later key can put a wide theme out of
       * reach — so it is asked again rather than assumed, and a theme that
       * will not go is never picked instead of being picked and skipped, which
       * would quietly spend one of the themes asked for.
       */
      const fitting = available.filter((t) => place(t) !== null);
      if (fitting.length === 0) break;

      /*
       * Not the same theme twice running where there is a choice. Repetition
       * inside a theme is the point of the material; repetition *of* a theme
       * is how eight bars of practice becomes the same eight bars again, and
       * the player stops reading and starts remembering.
       */
      const choices = fitting.length > 1 ? fitting.filter((t) => t.id !== last) : fitting;
      theme = options.rng.pick(choices);
      realised = place(theme)!;
    }

    slots.push(...realised.slots);
    pitches.push(...realised.pitches);
    alternatives.push(...realised.alternatives);
    /*
     * Kept only where the signature actually moves, exactly as the keys are
     * below. Every theme is a whole number of its own bars and begins where
     * the last one ended, so a change always lands on the bar line it draws.
     */
    const playedIn = options.metre ?? ownMetre(theme);
    const inForce = metres[metres.length - 1]?.metre;
    if (
      !inForce ||
      inForce.beatsPerBar !== playedIn.beatsPerBar ||
      inForce.beatUnit !== playedIn.beatUnit
    ) {
      metres.push({ fromBeat: beat, metre: playedIn });
    }
    /*
     * Kept only where the key actually moves. A theme states the key it opens
     * in, which is usually the one the previous theme left off in — and a
     * change to the key already in force draws a double bar and a signature
     * restating what is already true. Dropping the first entry outright is the
     * obvious version of this and is wrong: when the set moves the key at a
     * join, that first entry *is* the change.
     */
    for (const key of realised.keys) {
      if (keys[keys.length - 1]?.fifths !== key.fifths) keys.push(key);
    }
    used.push(theme.id);
    starts.push(beat);
    // Every theme's length is exact; the running total has to stay so, or the
    // join after a theme of triplets is no longer a bar line.
    beat = snapBeat(beat + realised.beats);
    last = theme.id;
  }

  if (slots.length === 0) return null;
  return {
    slots,
    pitches,
    alternatives,
    keys,
    metres,
    totalBeats: beat,
    used,
    starts,
    chosenBeats: chosenBeats ?? beat,
  };
}
