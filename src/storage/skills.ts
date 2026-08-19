/**
 * Accuracy per *skill*, which is what a coach needs and note stats cannot give.
 *
 * `stats.ts` answers "which notes do they miss" and feeds weak-note drilling.
 * This answers "what makes them miss", by tallying every judged note against
 * the properties that made it hard — see `exercise/attributes.ts` for the
 * dimensions and `docs/roadmap.md` § 1.1 for why.
 *
 * Deliberately a store and nothing else. It records; it does not decide what to
 * practise, what counts as mastered, or when to make anything harder. Those are
 * teacher mode's business, they are paid, and none of them can be built before
 * this exists.
 *
 * **Kept beside the note stats rather than inside them.** The two have
 * different lifetimes and different customers: note stats feed generation on
 * every run and must stay small enough to read on every screen, while this
 * grows a row per bucket per instrument and is read when a report is drawn.
 * Merging them would make the hot path carry the cold one.
 */

import type { Clef } from '../domain/instruments';
import type { SkillKey } from '../exercise/attributes';
import type { NoteJudgement } from '../engine/judge';

export interface SkillStat {
  attempts: number;
  correct: number;
}

export type SkillStats = Map<SkillKey, SkillStat>;

const STORAGE_PREFIX = 'brass-trainer:skills:';

/*
 * The same decay and cap as the note stats, and for the same reasons: a skill
 * drilled to death in March should not outweigh last night, and an unbounded
 * tally would let one heroic session outvote every session after it.
 *
 * Held at the same values deliberately. Two histories decaying at different
 * rates would disagree about what is recent, and a report drawn from both would
 * be quietly incoherent.
 */
const DECAY = 0.98;
const MAX_ATTEMPTS = 60;

/** Below this, a bucket has not been seen often enough to say anything about. */
export const MIN_ATTEMPTS_TO_JUDGE = 5;

function keyFor(instrumentId: string, clef: Clef): string {
  return `${STORAGE_PREFIX}${instrumentId}:${clef}`;
}

export function loadSkills(instrumentId: string, clef: Clef): SkillStats {
  try {
    const raw = localStorage.getItem(keyFor(instrumentId, clef));
    if (!raw) return new Map();
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return new Map();
    const stats: SkillStats = new Map();
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value !== 'object' || value === null) continue;
      const { attempts, correct } = value as Partial<SkillStat>;
      if (typeof attempts !== 'number' || typeof correct !== 'number') continue;
      stats.set(key as SkillKey, { attempts, correct });
    }
    return stats;
  } catch {
    // Unreadable or unparseable history is not worth failing a session over;
    // starting again costs a few runs of drilling and nothing else.
    return new Map();
  }
}

export function saveSkills(instrumentId: string, clef: Clef, stats: SkillStats): void {
  try {
    localStorage.setItem(keyFor(instrumentId, clef), JSON.stringify(Object.fromEntries(stats)));
  } catch {
    // Private browsing, or a full store. Practice still works; it is just not
    // remembered.
  }
}

export function mergeSessionSkills(
  existing: SkillStats,
  session: ReadonlyMap<SkillKey, SkillStat>,
): SkillStats {
  const merged: SkillStats = new Map();

  for (const [key, stat] of existing) {
    merged.set(key, { attempts: stat.attempts * DECAY, correct: stat.correct * DECAY });
  }
  for (const [key, stat] of session) {
    const current = merged.get(key) ?? { attempts: 0, correct: 0 };
    merged.set(key, {
      attempts: Math.min(MAX_ATTEMPTS, current.attempts + stat.attempts),
      correct: Math.min(MAX_ATTEMPTS, current.correct + stat.correct),
    });
  }
  return merged;
}

/**
 * Tallies one run's verdicts against the labels of the notes they fell on.
 *
 * Driven by the *judgements* rather than by the notes, which is what keeps the
 * tally honest: a note the player could never have answered — one outside the
 * instrument's range, or the far side of a tie — is never judged, so it never
 * reaches here and cannot count against a skill. See `isUnplayable`.
 */
export function tallySession(
  attributes: readonly SkillKey[][],
  judgements: readonly NoteJudgement[],
): SkillStats {
  const session: SkillStats = new Map();

  for (const judgement of judgements) {
    const keys = attributes[judgement.noteIndex];
    if (!keys) continue;
    for (const key of keys) {
      const stat = session.get(key) ?? { attempts: 0, correct: 0 };
      stat.attempts++;
      if (judgement.verdict === 'correct') stat.correct++;
      session.set(key, stat);
    }
  }

  return session;
}

export function recordSkills(
  instrumentId: string,
  clef: Clef,
  session: ReadonlyMap<SkillKey, SkillStat>,
): SkillStats {
  const merged = mergeSessionSkills(loadSkills(instrumentId, clef), session);
  saveSkills(instrumentId, clef, merged);
  return merged;
}

/**
 * Accuracy for one bucket, or null where there is not enough evidence.
 *
 * Null rather than zero, because "never attempted" and "always wrong" are
 * opposite facts and a coach that confuses them would drill the thing the
 * player has never met instead of the thing they keep failing.
 */
export function accuracyOf(stats: SkillStats, key: SkillKey): number | null {
  const stat = stats.get(key);
  if (!stat || stat.attempts < MIN_ATTEMPTS_TO_JUDGE) return null;
  return stat.correct / stat.attempts;
}

/**
 * The weakest buckets of one dimension, worst first.
 *
 * One dimension at a time on purpose. Ranking every bucket together would put
 * `key:-4` against `rhythm:eighth.` as though they were competing, when what a
 * report wants to say is "of your keys, these are the weak ones".
 */
export function weakestIn(
  stats: SkillStats,
  dimension: string,
  limit = 3,
): Array<{ key: SkillKey; accuracy: number }> {
  const prefix = `${dimension}:`;
  return [...stats.keys()]
    .filter((key) => key.startsWith(prefix))
    .map((key) => ({ key, accuracy: accuracyOf(stats, key) }))
    .filter((entry): entry is { key: SkillKey; accuracy: number } => entry.accuracy !== null)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, limit);
}
