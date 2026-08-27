// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PracticeScreen } from './PracticeScreen';
import { COURSES, DEFAULT_MASTERY, startOf } from '../exercise/course';
import { loadProgress, saveProgress } from '../storage/course';
import { saveSessions } from '../storage/sessions';

const COURSE = COURSES[0];
const FIRST = COURSE.levels[0];
const SECOND = COURSE.levels[1];
const LAST = COURSE.levels[COURSE.levels.length - 1];

function show(overrides: Partial<Parameters<typeof PracticeScreen>[0]> = {}) {
  const props = {
    instrumentId: 'cornet',
    clef: 'treble' as const,
    pendingAccuracy: null,
    onAccuracyApplied: vi.fn(),
    onStart: vi.fn(),
    onProgress: vi.fn(),
    onBack: vi.fn(),
    ...overrides,
  };
  render(<PracticeScreen {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('the practice screen', () => {
  it('opens at the start of the course, naming the level and the position', () => {
    show();
    expect(screen.getByRole('heading', { name: FIRST.name })).toBeTruthy();
    expect(screen.getByText('1.1')).toBeTruthy();
  });

  /*
   * The seam that keeps the course out of `App`: what crosses is the run a
   * level prescribes in plain settings words, never a position. If this ever
   * hands over something course-shaped, the free build is one careless import
   * away from carrying teacher mode.
   */
  it('hands the run up as plain settings, the level base included', () => {
    const tempo = FIRST.tempo.floor + FIRST.tempo.step * 2;
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: FIRST.id, tempo },
      recent: [],
    });
    const { onStart } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(onStart).toHaveBeenCalledWith({
      ...FIRST.base,
      tempo,
      levelId: FIRST.id,
    });
  });

  it('shows a slot for every run the bar reads, filled or not', () => {
    saveProgress('cornet', 'treble', { position: startOf(COURSE), recent: [0.9] });
    show();
    const slots = document.querySelectorAll('.practice__run');
    expect(slots).toHaveLength(DEFAULT_MASTERY.runsToJudge);
    expect(screen.getByText('90%')).toBeTruthy();
  });

  /*
   * The ratified ruling on this screen: a finished run feeds the suggestion
   * and MOVES NOBODY. The ladder this replaced would have promoted here.
   */
  it('folds a finished run into the evidence without moving the player', () => {
    saveProgress('cornet', 'treble', { position: startOf(COURSE), recent: [0.95] });
    const applied = vi.fn();
    show({ pendingAccuracy: 0.97, onAccuracyApplied: applied });
    expect(applied).toHaveBeenCalled();
    const kept = loadProgress('cornet', 'treble');
    expect(kept.position).toEqual(startOf(COURSE));
    expect(kept.recent).toEqual([0.95, 0.97]);
    expect(screen.getByText(/ready to move on/i)).toBeTruthy();
    expect(screen.getByText(/the step is yours to take/i)).toBeTruthy();
  });

  it('says when the evidence points the other way, without demoting anyone', () => {
    saveProgress('cornet', 'treble', { position: startOf(COURSE), recent: [0.4, 0.5] });
    show();
    expect(screen.getByText(/easing back is no failure/i)).toBeTruthy();
    expect(loadProgress('cornet', 'treble').position).toEqual(startOf(COURSE));
  });

  it('moves only when the player presses, and remembers the step', () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward a step' }));
    expect(screen.getByText('1.2')).toBeTruthy();
    expect(loadProgress('cornet', 'treble').position.tempo).toBe(
      FIRST.tempo.floor + FIRST.tempo.step,
    );
  });

  it('clears the evidence on a step, because it was about the old one', () => {
    saveProgress('cornet', 'treble', { position: startOf(COURSE), recent: [0.9, 0.95] });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Forward a step' }));
    expect(loadProgress('cornet', 'treble').recent).toEqual([]);
  });

  it('disables the buttons at the ends rather than hiding the edge', () => {
    show();
    expect(
      (screen.getByRole('button', { name: 'Back a step' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    cleanup();
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: LAST.id, tempo: LAST.tempo.ceiling },
      recent: [],
    });
    show();
    expect(
      (screen.getByRole('button', { name: 'Forward a step' }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('applies a run once, not on every render', () => {
    const applied = vi.fn();
    show({ pendingAccuracy: 0.9, onAccuracyApplied: applied });
    expect(applied).toHaveBeenCalledTimes(1);
    expect(loadProgress('cornet', 'treble').recent).toEqual([0.9]);
  });

  it('offers only the levels above as somewhere to aim, and keeps the choice', () => {
    show();
    expect(screen.queryByRole('button', { name: FIRST.name })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: SECOND.name }));
    expect(loadProgress('cornet', 'treble').goal).toEqual({
      courseId: COURSE.id,
      levelId: SECOND.id,
      tempo: SECOND.tempo.floor,
    });
    expect(screen.getByText(new RegExp(`${SECOND.name} at ${SECOND.tempo.floor}`))).toBeTruthy();
  });

  it('lets a goal be cleared again', () => {
    saveProgress('cornet', 'treble', {
      position: startOf(COURSE),
      recent: [],
      goal: { courseId: COURSE.id, levelId: SECOND.id, tempo: SECOND.tempo.floor },
      goalSetAt: startOf(COURSE),
    });
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Clear it' }));
    expect(loadProgress('cornet', 'treble').goal).toBeUndefined();
  });

  it('says there is nothing above the top rather than inventing a level', () => {
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: LAST.id, tempo: LAST.tempo.floor },
      recent: [],
    });
    show();
    expect(screen.getByText(/nothing further up this course/i)).toBeTruthy();
  });

  it('goes back when asked', () => {
    const { onBack } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalled();
  });

  it('opens by saying what happened last time', () => {
    saveSessions('cornet', 'treble', [
      {
        startedAt: Date.now() - 26 * 60 * 60 * 1000,
        runs: [
          { at: Date.now() - 26 * 60 * 60 * 1000, accuracy: 0.8, tempo: 72 },
          { at: Date.now() - 26 * 60 * 60 * 1000, accuracy: 0.9, tempo: 72 },
        ],
      },
    ]);
    show();
    expect(screen.getByText(/yesterday: 2 runs, averaging 85%/i)).toBeTruthy();
  });

  it('says nothing about last time when there was no last time', () => {
    show();
    expect(screen.queryByText(/averaging/i)).toBeNull();
  });

  /*
   * The editor loop's phone half. The import goes through the same
   * `readCourse` the editor validated with, so a refusal here carries the
   * reader's own sentence — verbatim, because a summarised error sends the
   * author hunting for a fault the sentence already names.
   */
  it('imports a course file, switches to it, and offers it in the picker', async () => {
    show();
    const doc = {
      id: 'teachers-own',
      name: "Teacher's own",
      schemaVersion: 1,
      levels: [
        {
          id: 'warm',
          name: 'Warm up',
          base: { kind: 'phrases', difficultyId: 'easy' },
          tempo: { floor: 60, ceiling: 72, step: 6 },
        },
      ],
    };
    const file = new File([JSON.stringify(doc)], 'teachers-own.json', {
      type: 'application/json',
    });
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await Promise.resolve();
    });
    expect(screen.getByRole('heading', { name: 'Warm up' })).toBeTruthy();
    expect(loadProgress('cornet', 'treble').position.courseId).toBe('teachers-own');
    expect((screen.getByLabelText('Course') as HTMLSelectElement).value).toBe('teachers-own');
  });

  it('refuses a bad file with the reader’s own sentence, changing nothing', async () => {
    show();
    const file = new File(
      [JSON.stringify({ id: 'broken', name: 'Broken', schemaVersion: 1, levels: [] })],
      'broken.json',
    );
    const input = document.querySelector('input[type=file]') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
      await Promise.resolve();
    });
    expect(screen.getByText(/course "broken" has no levels/i)).toBeTruthy();
    expect(loadProgress('cornet', 'treble').position.courseId).toBe(COURSE.id);
  });
});
