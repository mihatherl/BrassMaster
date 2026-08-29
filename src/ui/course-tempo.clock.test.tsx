// @vitest-environment happy-dom

/**
 * The tempo the *clock* is started at — not the tempo on the label.
 *
 * A separate file because it needs the audio context faked to get past "Tap
 * to start", which is the pattern `audio-gate.test.tsx` established.
 *
 * It exists because a mutation test embarrassed its predecessor. The first
 * version of the tempo fix was covered only by a test reading the gate's
 * label, and changing the line that builds the session — the one line that
 * actually broke — left every test green. That is the original fault exactly:
 * *the label said 66 while the clock ran at 132*. A fix for it that can only
 * see labels is not a fix that can be trusted to stay fixed.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { saveCourseDocument } from '../storage/course';
import { DEFAULT_SETTINGS, saveSettings } from '../storage/settings';

const fakeContext = { currentTime: 0 } as AudioContext;
vi.mock('../audio/context', () => ({
  getAudioContext: () => fakeContext,
  ensureRunning: async () => true,
  markStuck: () => {},
  unlockAudio: async () => fakeContext,
}));

/** Every `Session` built, in the order they were built, with their options. */
const built: Array<{ tempo: number }> = [];

vi.mock('../engine/session', async (importOriginal) => ({
  // The module's constants stay real — `ReadyControls` reads one of them, and
  // faking the whole module would have this test quietly answering about a
  // gate built from invented numbers.
  ...(await importOriginal<typeof import('../engine/session')>()),
  Session: class {
    // Enough surface for the play screen to hold one without falling over;
    // this test is about the single number handed to the constructor.
    endBeat = 0;
    judgements: unknown[] = [];
    keyChangeBeat = 0;
    transport = { changeTempoAt: () => {}, stop: () => {} };
    constructor(options: { tempo: number }) {
      built.push({ tempo: options.tempo });
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

const COURSE = {
  id: 'clock-course',
  name: 'Clock',
  blurb: 'One slow level.',
  schemaVersion: 1,
  levels: [
    {
      id: 'slow',
      name: 'Slowly',
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -1 },
      tempo: { floor: 66, ceiling: 96, step: 6 },
    },
  ],
};

/**
 * Past the gate and the calibration warning, in that order.
 *
 * The order is not negotiable and is written down in the handover because it
 * has cost two sessions already: **the calibration prompt appears *after*
 * "Tap to start"**, so a test that tries to dismiss it first finds nothing to
 * dismiss and then stalls on a modal it never expected.
 */
async function tapAndAccept(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /tap to start/i }));
  const later = await screen.findByRole('button', { name: /later/i });
  fireEvent.click(later);
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  built.length = 0;
  vi.clearAllMocks();
});

describe('the clock a course run starts', () => {
  it('runs at the level’s tempo, not at free play’s', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, tempo: 132 });
    saveCourseDocument(COURSE);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /structured learning/i }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), {
      target: { value: COURSE.id },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await tapAndAccept();

    await waitFor(() => expect(built.length).toBeGreaterThan(0));
    expect(built.at(-1)?.tempo).toBe(66);
  });

  it('runs at the player’s tempo in free play, which is unaffected', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, tempo: 132 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    await tapAndAccept();

    await waitFor(() => expect(built.length).toBeGreaterThan(0));
    expect(built.at(-1)?.tempo).toBe(132);
  });
});
