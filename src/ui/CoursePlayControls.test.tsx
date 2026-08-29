// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CoursePlayControls } from './CoursePlayControls';
import { clearVetoes } from './course-vetoes';
import { COURSES, ruleFor, runFor, startOf, stepForward } from '../exercise/course';
import { loadProgress, saveCourseDocument, saveProgress } from '../storage/course';
import type { Exercise } from '../exercise/types';

const COURSE = COURSES[0];
const RULE = ruleFor(startOf(COURSE));
const CLEAN = Array.from({ length: RULE.minBars }, () => 1);
const JOIN = { changeBeat: 8 };
const FAKE_EXERCISE = {} as Exercise;

function show(overrides: Partial<Parameters<typeof CoursePlayControls>[0]> = {}) {
  const props = {
    instrumentId: 'cornet',
    clef: 'treble' as const,
    barAccuracies: [] as readonly number[],
    lastJudgedBeat: -1,
    playing: true,
    courseStep: vi.fn(() => JOIN),
    buildRun: vi.fn(() => FAKE_EXERCISE),
    ...overrides,
  };
  const view = render(<CoursePlayControls {...props} />);
  return { ...props, rerender: (next: Partial<typeof props>) =>
    view.rerender(<CoursePlayControls {...props} {...next} />) };
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  clearVetoes();
});

describe('the in-stream course step', () => {
  it('shows the position, the level, and the buttons both ways', () => {
    show();
    expect(screen.getByText('1.1')).toBeTruthy();
    expect(screen.getByText(new RegExp(COURSE.levels[0].name))).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Back' }) as HTMLButtonElement).disabled).toBe(true);
  });

  /*
   * The player's ruling: a manual press goes into the music too — not
   * instantaneous, at the end of the following bar. A tempo-only step, so
   * only the clock and the label change; no material is built.
   */
  it('writes a manual step into the music rather than restarting', () => {
    const { courseStep, buildRun } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    const next = stepForward(startOf(COURSE))!;
    expect(courseStep).toHaveBeenCalledWith({ bpm: runFor(next).tempo, label: '1.2' });
    expect(buildRun).not.toHaveBeenCalled();
    expect(screen.getByText(/at the bar line/i)).toBeTruthy();
  });

  it('commits nothing until the playhead crosses the join', () => {
    const { rerender } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(loadProgress('cornet', 'treble').position).toEqual(startOf(COURSE));
    rerender({ lastJudgedBeat: JOIN.changeBeat });
    expect(loadProgress('cornet', 'treble').position).toEqual(stepForward(startOf(COURSE)));
    expect(screen.getByText('1.2')).toBeTruthy();
  });

  it('hands the committed run back at the crossing, and not before', () => {
    const onRunCommitted = vi.fn();
    const { rerender } = show({ onRunCommitted });
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(onRunCommitted).not.toHaveBeenCalled();
    rerender({ lastJudgedBeat: JOIN.changeBeat });
    expect(onRunCommitted).toHaveBeenCalledWith(runFor(stepForward(startOf(COURSE))!));
  });

  it('splices fresh material only when the step crosses a level', () => {
    const first = COURSE.levels[0];
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: first.id, segment: first.segments.length - 1 },
      recent: [],
    });
    const { courseStep, buildRun } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(buildRun).toHaveBeenCalled();
    expect(courseStep).toHaveBeenCalledWith(
      expect.objectContaining({
        fresh: FAKE_EXERCISE,
        label: expect.stringContaining(COURSE.levels[1].name),
      }),
    );
  });

  /*
   * The axes generalised the splice: a division inside a level that changes
   * what the paper says — a range widening here — is new material at the
   * join, exactly as a level crossing is; a division that changes only a
   * support setting leaves the paper alone. Both authored as a user course,
   * read through the same store a real import uses.
   */
  it('splices within a level when a division rewrites the music, and not when it only changes support', () => {
    saveCourseDocument({
      id: 'axes-course',
      name: 'Axes',
      blurb: '',
      schemaVersion: 1,
      levels: [
        {
          id: 'one',
          name: 'One',
          base: { kind: 'phrases', difficultyId: 'easy' },
          axes: [
            {
              axis: 'range',
              divisions: [
                { at: 0, value: { low: 60, high: 67 } },
                { at: 0.5, value: { low: 60, high: 72 } },
              ],
            },
          ],
        },
        {
          id: 'two',
          name: 'Two',
          base: { kind: 'phrases', difficultyId: 'easy' },
          axes: [
            {
              axis: 'metronomeEnabled',
              divisions: [
                { at: 0, value: true },
                { at: 0.5, value: false },
              ],
            },
          ],
        },
      ],
    });
    saveProgress('cornet', 'treble', {
      position: { courseId: 'axes-course', levelId: 'one', segment: 0 },
      recent: [],
    });
    const widened = show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(widened.buildRun).toHaveBeenCalled();
    expect(widened.courseStep).toHaveBeenCalledWith(
      expect.objectContaining({ fresh: FAKE_EXERCISE, label: '1.2' }),
    );

    cleanup();
    saveProgress('cornet', 'treble', {
      position: { courseId: 'axes-course', levelId: 'two', segment: 0 },
      recent: [],
    });
    const support = show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(support.buildRun).not.toHaveBeenCalled();
    expect(support.courseStep).toHaveBeenCalledWith({ label: '2.2' });
  });

  it('schedules the step itself when the author rule is met', () => {
    const { courseStep } = show({ barAccuracies: CLEAN });
    expect(courseStep).toHaveBeenCalledWith(expect.objectContaining({ label: '1.2' }));
    expect(screen.getByText(/at the bar line/i)).toBeTruthy();
  });

  it('needs the whole window clean, not a good average', () => {
    const { courseStep } = show({ barAccuracies: [...CLEAN.slice(0, -1), 0.5] });
    expect(courseStep).not.toHaveBeenCalled();
  });

  it('offers on time served alone where the segment rule asks no score', () => {
    saveCourseDocument({
      id: 'timed-course',
      name: 'Timed',
      blurb: '',
      schemaVersion: 1,
      levels: [
        {
          id: 'one',
          name: 'One',
          base: { kind: 'phrases', difficultyId: 'easy' },
          rules: { minBars: 2 },
          axes: [
            {
              axis: 'tempo',
              divisions: [
                { at: 0, value: 60 },
                { at: 0.5, value: 72 },
              ],
            },
          ],
        },
      ],
    });
    saveProgress('cornet', 'treble', {
      position: { courseId: 'timed-course', levelId: 'one', segment: 0 },
      recent: [],
    });
    const { courseStep } = show({ barAccuracies: [0.1, 0.2] });
    expect(courseStep).toHaveBeenCalledWith(expect.objectContaining({ label: '1.2' }));
  });

  /*
   * Stay here, in the new grammar: the future is rewritten back — a step with
   * no label — and the veto holds for the step. Nothing pauses and nothing
   * was ever committed, so there is nothing to undo.
   */
  it('Stay here rewrites the future back and vetoes the step', () => {
    const { courseStep, rerender } = show({ barAccuracies: CLEAN });
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    const calls = (courseStep as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1][0].label).toBeUndefined();
    expect(loadProgress('cornet', 'treble').position).toEqual(startOf(COURSE));
    // More clean bars at the vetoed step: the rule stays quiet.
    rerender({ barAccuracies: [...CLEAN, 1, 1] });
    expect(screen.queryByText(/at the bar line/i)).toBeNull();
  });

  it('a manual step after a veto still goes through, and re-arms the rule beyond it', () => {
    show({ barAccuracies: CLEAN });
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(screen.getByText(/at the bar line/i)).toBeTruthy();
  });

  /*
   * The bug the player found the day the join shipped: after a crossing the
   * rule kept reading the passage's whole history, so eight clean bars from
   * the step before offered him a new step every two bars. The evidence
   * resets at the crossing and the rule counts afresh — unconditionally now:
   * evidence belongs to a segment, and the segment just changed.
   */
  it('starts the evidence afresh after a crossing, rather than riding old bars', () => {
    const { rerender, courseStep } = show({ barAccuracies: CLEAN });
    // The rule fires and the step crosses.
    rerender({ lastJudgedBeat: JOIN.changeBeat });
    expect(screen.getByText('1.2')).toBeTruthy();
    (courseStep as ReturnType<typeof vi.fn>).mockClear();
    // Two more clean bars arrive: with the old bars carried this would fire
    // again — the reported fault. It must not.
    rerender({ barAccuracies: [...CLEAN, 1, 1], lastJudgedBeat: JOIN.changeBeat });
    expect(courseStep).not.toHaveBeenCalled();
    // A full fresh run of clean bars beyond the crossing earns the next offer.
    rerender({
      barAccuracies: [...CLEAN, ...CLEAN],
      lastJudgedBeat: JOIN.changeBeat,
    });
    expect(courseStep).toHaveBeenCalled();
  });

  it('offers nothing at the top of the course, and watches only live play', () => {
    const last = COURSE.levels[COURSE.levels.length - 1];
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: last.id, segment: last.segments.length - 1 },
      recent: [],
    });
    const top = show({ barAccuracies: CLEAN });
    expect(top.courseStep).not.toHaveBeenCalled();
    cleanup();
    localStorage.clear();
    const idle = show({ barAccuracies: CLEAN, playing: false });
    expect(idle.courseStep).not.toHaveBeenCalled();
  });
});
