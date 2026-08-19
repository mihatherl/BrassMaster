// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import {
  loadSessions,
  meanAccuracy,
  recordRun,
  saveSessions,
  SESSION_GAP_MS,
  SESSIONS_KEPT,
  withRun,
  type Run,
  type Session,
} from './sessions';

const T0 = Date.UTC(2026, 7, 19, 19, 0, 0);

const run = (at: number, accuracy = 0.9, levelId?: string): Run => ({
  at,
  accuracy,
  tempo: 90,
  ...(levelId ? { levelId } : {}),
});

afterEach(() => localStorage.clear());

describe('what counts as one sitting', () => {
  it('starts a sitting with the first run there has ever been', () => {
    const sessions = withRun([], run(T0));
    expect(sessions).toHaveLength(1);
    expect(sessions[0].startedAt).toBe(T0);
  });

  it('joins a run to the sitting before it when it is soon after', () => {
    const sessions = withRun(withRun([], run(T0)), run(T0 + 60_000));
    expect(sessions).toHaveLength(1);
    expect(sessions[0].runs).toHaveLength(2);
  });

  /*
   * A gap is what a break, a phone call and an instrument put down all look
   * like from here, which is why a sitting is inferred rather than declared —
   * there is no lifecycle to survive any of them.
   */
  it('starts a new sitting after a long enough gap', () => {
    const sessions = withRun(withRun([], run(T0)), run(T0 + SESSION_GAP_MS + 1));
    expect(sessions).toHaveLength(2);
  });

  it('measures the gap from the last run, not from when the sitting began', () => {
    // Four runs an hour apart is one long evening, not four evenings.
    let sessions: Session[] = [];
    for (let i = 0; i < 4; i++) sessions = withRun(sessions, run(T0 + i * 60 * 60 * 1000));
    expect(sessions).toHaveLength(1);
    expect(sessions[0].runs).toHaveLength(4);
  });

  it('does not mutate the sittings it was given', () => {
    const before = withRun([], run(T0));
    const runsBefore = before[0].runs.length;
    withRun(before, run(T0 + 1000));
    expect(before[0].runs).toHaveLength(runsBefore);
  });

  it('keeps a season of sittings and no more', () => {
    let sessions: Session[] = [];
    for (let i = 0; i < SESSIONS_KEPT + 10; i++) {
      sessions = withRun(sessions, run(T0 + i * (SESSION_GAP_MS + 1)));
    }
    expect(sessions).toHaveLength(SESSIONS_KEPT);
    // The ones kept are the recent ones.
    expect(sessions[sessions.length - 1].startedAt).toBeGreaterThan(sessions[0].startedAt);
  });
});

describe('keeping the record', () => {
  it('remembers a run across a reload', () => {
    recordRun('cornet', 'treble', run(T0, 0.8, 'easy'));
    const [session] = loadSessions('cornet', 'treble');
    expect(session.runs[0].accuracy).toBe(0.8);
    expect(session.runs[0].levelId).toBe('easy');
  });

  it('keeps instruments and clefs apart', () => {
    recordRun('cornet', 'treble', run(T0));
    expect(loadSessions('eb-bass', 'treble')).toEqual([]);
    expect(loadSessions('cornet', 'bass')).toEqual([]);
  });

  it('records free play too, since a report that hid half the practice would lie', () => {
    recordRun('cornet', 'treble', run(T0));
    expect(loadSessions('cornet', 'treble')[0].runs[0].levelId).toBeUndefined();
  });

  it('starts again rather than throwing on unreadable history', () => {
    localStorage.setItem('brass-trainer:sessions:cornet:treble', 'not json');
    expect(loadSessions('cornet', 'treble')).toEqual([]);
  });

  it('drops entries that are not runs rather than letting them reach a report', () => {
    saveSessions('cornet', 'treble', [
      { startedAt: T0, runs: [run(T0), { at: T0 } as Run, 'nonsense' as unknown as Run] },
    ]);
    expect(loadSessions('cornet', 'treble')[0].runs).toHaveLength(1);
  });

  it('drops a sitting left with no runs at all', () => {
    saveSessions('cornet', 'treble', [{ startedAt: T0, runs: ['rubbish' as unknown as Run] }]);
    expect(loadSessions('cornet', 'treble')).toEqual([]);
  });

  it('trims on the way out as well as on the way in', () => {
    const many: Session[] = Array.from({ length: SESSIONS_KEPT + 5 }, (_, i) => ({
      startedAt: T0 + i,
      runs: [run(T0 + i)],
    }));
    saveSessions('cornet', 'treble', many);
    expect(loadSessions('cornet', 'treble')).toHaveLength(SESSIONS_KEPT);
  });
});

describe('reading a sitting back', () => {
  it('averages the runs in it', () => {
    expect(meanAccuracy({ startedAt: T0, runs: [run(T0, 0.8), run(T0, 1)] })).toBeCloseTo(0.9);
  });

  it('says nothing rather than zero for a sitting with no runs', () => {
    expect(meanAccuracy({ startedAt: T0, runs: [] })).toBeNull();
  });
});
