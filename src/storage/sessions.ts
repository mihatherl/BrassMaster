/**
 * What was practised, and when — the app's memory of a sitting.
 *
 * Until now every run was an island: the note stats and the skill model
 * remembered *what* went wrong and the ladder remembered where the player had
 * got to, but nothing remembered that a Tuesday evening happened at all. That
 * is what `docs/roadmap.md` § 1.5 asks for, and it is what makes the app worth
 * opening on a Wednesday: *"focusing a bit on what you achieved last time."*
 *
 * **A sitting is inferred from the clock, not declared.** There is no start or
 * end button and no session lifecycle to get wrong — a run joins the sitting
 * before it if one was recent, and begins a new one otherwise. Anything with a
 * beginning and an end would need to survive the app being closed mid-session,
 * a phone call, and a player who puts the instrument down for twenty minutes;
 * a gap is simply what those all look like from here.
 *
 * Paid, and part of teacher mode — but it records **every** run, free play
 * included, because a report that quietly omitted half of someone's practice
 * would be worse than no report.
 */

import type { Clef } from '../domain/instruments';

export interface Run {
  /** Milliseconds since the epoch, as `Date.now()` gives them. */
  at: number;
  /** The run's accuracy, 0 to 1, exactly as the summary reported it. */
  accuracy: number;
  tempo: number;
  /** Which level, when the run came from a course. Absent for free play. */
  levelId?: string;
}

export interface Session {
  startedAt: number;
  runs: Run[];
}

const STORAGE_PREFIX = 'brass-trainer:sessions:';

/**
 * How long a gap ends a sitting.
 *
 * Two hours: long enough to cover a break, a phone call and putting the
 * instrument down to answer the door, short enough that a morning and an
 * evening are two sittings rather than one very patient one.
 */
export const SESSION_GAP_MS = 2 * 60 * 60 * 1000;

/**
 * How many sittings are kept.
 *
 * Enough to show a season's shape without the store growing forever. Trimmed
 * on write, oldest first — a player who has practised for two years does not
 * need last March on their phone to be told they are improving.
 */
export const SESSIONS_KEPT = 40;

function keyFor(instrumentId: string, clef: Clef): string {
  return `${STORAGE_PREFIX}${instrumentId}:${clef}`;
}

function isRun(value: unknown): value is Run {
  if (typeof value !== 'object' || value === null) return false;
  const { at, accuracy, tempo } = value as Partial<Run>;
  return typeof at === 'number' && typeof accuracy === 'number' && typeof tempo === 'number';
}

/** Sittings, oldest first. */
export function loadSessions(instrumentId: string, clef: Clef): Session[] {
  try {
    const raw = localStorage.getItem(keyFor(instrumentId, clef));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (session): session is Session =>
          typeof session === 'object' &&
          session !== null &&
          typeof (session as Session).startedAt === 'number' &&
          Array.isArray((session as Session).runs),
      )
      .map((session) => ({ startedAt: session.startedAt, runs: session.runs.filter(isRun) }))
      .filter((session) => session.runs.length > 0);
  } catch {
    return [];
  }
}

export function saveSessions(instrumentId: string, clef: Clef, sessions: Session[]): void {
  try {
    localStorage.setItem(
      keyFor(instrumentId, clef),
      JSON.stringify(sessions.slice(-SESSIONS_KEPT)),
    );
  } catch {
    // Private browsing, or a full store. The practice still counted; it is
    // only the record of it that is lost.
  }
}

/**
 * Files a run into the sitting it belongs to, starting one where needed.
 *
 * Pure, so the rule about what joins what can be tested without a clock or a
 * store. `now` is the run's own time.
 */
export function withRun(sessions: readonly Session[], run: Run): Session[] {
  const previous = sessions[sessions.length - 1];
  const latest = previous?.runs[previous.runs.length - 1]?.at ?? -Infinity;

  if (previous && run.at - latest < SESSION_GAP_MS) {
    return [...sessions.slice(0, -1), { ...previous, runs: [...previous.runs, run] }];
  }
  return [...sessions, { startedAt: run.at, runs: [run] }].slice(-SESSIONS_KEPT);
}

export function recordRun(instrumentId: string, clef: Clef, run: Run): Session[] {
  const sessions = withRun(loadSessions(instrumentId, clef), run);
  saveSessions(instrumentId, clef, sessions);
  return sessions;
}

/** A sitting's mean accuracy, or null when it holds no runs. */
export function meanAccuracy(session: Session): number | null {
  if (session.runs.length === 0) return null;
  return session.runs.reduce((total, run) => total + run.accuracy, 0) / session.runs.length;
}
