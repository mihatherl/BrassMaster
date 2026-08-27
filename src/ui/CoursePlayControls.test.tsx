// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CoursePlayControls } from './CoursePlayControls';
import { clearVetoes } from './course-vetoes';
import { advanceFor, COURSES, startOf, stepForward } from '../exercise/course';
import { loadProgress, saveProgress } from '../storage/course';
import type { Exercise } from '../exercise/types';

const COURSE = COURSES[0];
const ADVANCE = advanceFor(startOf(COURSE));
const CLEAN = Array.from({ length: ADVANCE.afterBars }, () => 1);
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
   * instantaneous, at the end of the following bar. Same level, so only the
   * clock and the label change; no material is built.
   */
  it('writes a manual step into the music rather than restarting', () => {
    const { courseStep, buildRun } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    const next = stepForward(startOf(COURSE))!;
    expect(courseStep).toHaveBeenCalledWith({ bpm: next.tempo, label: '1.2' });
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

  it('splices fresh material only when the step crosses a level', () => {
    const first = COURSE.levels[0];
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: first.id, tempo: first.tempo.ceiling },
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

  it('schedules the step itself when the author rule is met', () => {
    const { courseStep } = show({ barAccuracies: CLEAN });
    expect(courseStep).toHaveBeenCalledWith(expect.objectContaining({ label: '1.2' }));
    expect(screen.getByText(/at the bar line/i)).toBeTruthy();
  });

  it('needs the whole window clean, not a good average', () => {
    const { courseStep } = show({ barAccuracies: [...CLEAN.slice(0, -1), 0.5] });
    expect(courseStep).not.toHaveBeenCalled();
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

  it('offers nothing at the top of the course, and watches only live play', () => {
    const last = COURSE.levels[COURSE.levels.length - 1];
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: last.id, tempo: last.tempo.ceiling },
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
