// @vitest-environment happy-dom

/**
 * The exercise a course run actually generates: how long, and whether there
 * is anything past the end.
 *
 * The schema and the shape are unit-tested elsewhere; this is the part that
 * cannot be seen from either — that `horizonBars: 0` reaches the generator
 * and produces an exercise with no grey, and that a level's own length is
 * honoured over `defaultLengthFor`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { saveCourseDocument } from '../storage/course';
import { DEFAULT_SETTINGS, saveSettings } from '../storage/settings';
import type { Exercise } from '../exercise/types';

const fakeContext = { currentTime: 0 } as AudioContext;
vi.mock('../audio/context', () => ({
  getAudioContext: () => fakeContext,
  ensureRunning: async () => true,
  markStuck: () => {},
  unlockAudio: async () => fakeContext,
}));

/** Every exercise the session was handed, in order. */
const played: Exercise[] = [];
vi.mock('../engine/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../engine/session')>()),
  Session: class {
    endBeat = 0;
    judgements: unknown[] = [];
    keyChangeBeat = 0;
    transport = { changeTempoAt: () => {}, stop: () => {} };
    constructor(options: { exercise: Exercise }) {
      played.push(options.exercise);
    }
    start() {}
    stop() {}
    pause() {}
    resume() {}
    isPaused() {
      return false;
    }
    continuePlaying() {}
    finishNow() {}
    changeKey() {
      return null;
    }
    courseStep() {}
  },
}));

const { App } = await import('./App');
const { render } = await import('@testing-library/react');

const course = (level: Record<string, unknown>) => ({
  id: 'shape-course',
  name: 'Shape',
  blurb: '',
  schemaVersion: 1,
  levels: [
    {
      id: 'l',
      name: 'L',
      tempo: { floor: 72, ceiling: 96, step: 6 },
      ...level,
    },
  ],
});

/** Past the gate and the calibration warning — the prompt comes *after* the tap. */
async function play(): Promise<void> {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /structured learning/i }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), {
    target: { value: 'shape-course' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: /tap to start/i }));
  fireEvent.click(await screen.findByRole('button', { name: /later/i }));
  await waitFor(() => expect(played.length).toBeGreaterThan(0));
}

beforeEach(() => {
  localStorage.clear();
  saveSettings({ ...DEFAULT_SETTINGS });
  played.length = 0;
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

describe('the exercise a course level generates', () => {
  it('has nothing past its end, so no Continue is ever offered', async () => {
    saveCourseDocument(
      course({ base: { kind: 'phrases', difficultyId: 'easy', fifths: -1, bars: 8 } }),
    );
    await play();
    const exercise = played.at(-1)!;
    /*
     * The whole point. Equal means the grey is empty: `PlayScreen` has no
     * boundary to offer at, the run ends where the author said, and the
     * player goes out to results to repeat or move on.
     */
    expect(exercise.chosenBeats).toBe(exercise.totalBeats);
  });

  it('is as long as the level says, not as long as the material’s default', async () => {
    // Sight-reading defaults to 16 bars; this level asks for 8. In four-four
    // that is 32 crotchets against the default's 64.
    saveCourseDocument(
      course({ base: { kind: 'phrases', difficultyId: 'easy', fifths: -1, bars: 8 } }),
    );
    await play();
    expect(played.at(-1)!.chosenBeats).toBe(32);
  });

  it('leaves free play’s horizon exactly as it was', async () => {
    /*
     * The regression that would matter most. Endless play is free play's
     * feature and the reason it exists — the player decides when to stop.
     * Turning it off inside a course must not reach the screen it was
     * designed for.
     */
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: /tap to start/i }));
    fireEvent.click(await screen.findByRole('button', { name: /later/i }));
    await waitFor(() => expect(played.length).toBeGreaterThan(0));
    const exercise = played.at(-1)!;
    expect(exercise.totalBeats).toBeGreaterThan(exercise.chosenBeats);
  });

  it('carries on past the end where the author asked for endless', async () => {
    saveCourseDocument(
      course({
        base: { kind: 'phrases', difficultyId: 'easy', fifths: -1, bars: 8 },
        endless: true,
      }),
    );
    await play();
    const exercise = played.at(-1)!;
    expect(exercise.chosenBeats).toBe(32);
    expect(exercise.totalBeats).toBeGreaterThan(exercise.chosenBeats);
  });
});
