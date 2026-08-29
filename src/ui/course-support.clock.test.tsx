// @vitest-environment happy-dom

/**
 * The support settings a course owns, reaching the *session* — and the
 * session surviving a segment crossing.
 *
 * Sibling of `course-tempo.clock.test.tsx` and for the same recorded reason:
 * the tempo fix's first version was covered only by label tests, and the one
 * line that actually broke — the line that builds the session — left every
 * test green. These tests read the constructor and the live session, not the
 * gate.
 *
 * The renderer is faked here as well as the audio: happy-dom has no 2D
 * canvas context, so with the real `StaveRenderer` the play surface dies in
 * the session effect and the error boundary eats the screen — which is why
 * the older clock tests could only ever watch the constructor. This file
 * needs the screen alive after the tap, to press the course's own buttons.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { saveCourseDocument, loadProgress } from '../storage/course';
import { DEFAULT_SETTINGS, saveSettings } from '../storage/settings';
import type { NoteJudgement } from '../engine/judge';

const fakeContext = { currentTime: 0 } as AudioContext;
vi.mock('../audio/context', () => ({
  getAudioContext: () => fakeContext,
  ensureRunning: async () => true,
  markStuck: () => {},
  unlockAudio: async () => fakeContext,
}));

/** Every `Session` built, with the options this file cares about. */
const built: Array<{
  tempo: number;
  metronomeEnabled: boolean;
  playbackMode: string;
}> = [];
/** The support changes applied to the live session mid-run. */
const supportCalls: Array<{ metronomeEnabled?: boolean; playbackMode?: string }> = [];
/** The judgement callback of the most recent session, for crossing a join. */
let judge: ((judgement: NoteJudgement) => void) | null = null;

vi.mock('../engine/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../engine/session')>()),
  Session: class {
    endBeat = 64;
    keyChangeBeat = 0;
    transport = {
      changeTempoAt: () => {},
      changeTempo: () => {},
      stop: () => {},
      visualBeat: () => 0,
      secondsBetween: () => 1,
    };
    constructor(options: {
      tempo: number;
      metronomeEnabled: boolean;
      playbackMode: string;
      onJudgement?: (judgement: NoteJudgement) => void;
    }) {
      built.push({
        tempo: options.tempo,
        metronomeEnabled: options.metronomeEnabled,
        playbackMode: options.playbackMode,
      });
      judge = options.onJudgement ?? null;
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
    courseStep() {
      return { changeBeat: 0, fromNoteIndex: 0, fifths: 0 };
    }
    setSupport(changes: { metronomeEnabled?: boolean; playbackMode?: string }) {
      supportCalls.push(changes);
    }
  },
}));

vi.mock('../render/surface', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../render/surface')>()),
  StaveRenderer: class {
    constructor() {}
    start() {}
    stop() {}
    resize() {}
    rekeyed() {}
    setTheme() {}
    setReadingMode() {}
    flashCorrect() {}
  },
}));

const { App } = await import('./App');
const { render } = await import('@testing-library/react');

/** New-format documents: axes and header scalars, no tempo bands. */
const PINNED_COURSE = {
  id: 'support-course',
  name: 'Support',
  blurb: 'The metronome is the course’s.',
  schemaVersion: 1,
  levels: [
    {
      id: 'cold',
      name: 'Cold reading',
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -1 },
      tempo: 66,
      metronomeEnabled: false,
    },
  ],
};

const OPEN_TEMPO_COURSE = {
  id: 'open-tempo-course',
  name: 'Open tempo',
  blurb: 'The dial is the player’s.',
  schemaVersion: 1,
  levels: [
    {
      id: 'free',
      name: 'At your own pace',
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -1 },
    },
  ],
};

const STEPPING_COURSE = {
  id: 'stepping-course',
  name: 'Stepping',
  blurb: 'Two segments of tempo.',
  schemaVersion: 1,
  levels: [
    {
      id: 'one',
      name: 'One',
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy', fifths: -1 },
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
};

async function startCourseRun(courseId: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: /structured learning/i }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), {
    target: { value: courseId },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  // The calibration prompt appears AFTER "Tap to start" — order recorded in
  // the handover, at the cost of two stalled sessions.
  fireEvent.click(screen.getByRole('button', { name: /tap to start/i }));
  const later = await screen.findByRole('button', { name: /later/i });
  fireEvent.click(later);
  await waitFor(() => expect(built.length).toBeGreaterThan(0));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  built.length = 0;
  supportCalls.length = 0;
  judge = null;
  vi.clearAllMocks();
});

describe('the support a course run is built with', () => {
  it('hands a pinned setting to the session', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, tempo: 132, metronomeEnabled: true });
    saveCourseDocument(PINNED_COURSE);
    render(<App />);
    await startCourseRun(PINNED_COURSE.id);
    expect(built.at(-1)).toEqual({ tempo: 66, metronomeEnabled: false, playbackMode: 'reference' });
  });

  it('leaves free play to the player’s own settings', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, tempo: 132, metronomeEnabled: true });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: /tap to start/i }));
    const later = await screen.findByRole('button', { name: /later/i });
    fireEvent.click(later);
    await waitFor(() => expect(built.length).toBeGreaterThan(0));
    expect(built.at(-1)?.metronomeEnabled).toBe(true);
    expect(built.at(-1)?.tempo).toBe(132);
  });

  it('leaves the clock to the player’s dial where the level names no tempo', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, tempo: 108 });
    saveCourseDocument(OPEN_TEMPO_COURSE);
    render(<App />);
    await startCourseRun(OPEN_TEMPO_COURSE.id);
    expect(built.at(-1)?.tempo).toBe(108);
  });

  /*
   * The regression the refs exist for: `runTempo` and `runSupport` now move
   * with the committed segment, and the session effect must NOT key on them —
   * a rebuilt session mid-note is the exact failure the effect's own
   * `settings`-identity note warns about. One session, however many
   * crossings.
   */
  it('commits a crossing without rebuilding the session', async () => {
    saveSettings({ ...DEFAULT_SETTINGS, tempo: 132 });
    saveCourseDocument(STEPPING_COURSE);
    render(<App />);
    await startCourseRun(STEPPING_COURSE.id);
    expect(built).toHaveLength(1);

    // The player steps forward; the join lands at beat 0 (the fake's answer).
    // Found asynchronously: the course controls arrive by dynamic import
    // behind the __HAS_TEACHER__ literal, a tick after the surface mounts.
    fireEvent.click(await screen.findByRole('button', { name: 'Forward' }));
    expect(loadProgress('eb-bass', 'treble').position.segment).toBe(0);

    // A judgement at or past the join crosses it: the position commits and
    // the run the new segment prescribes flows back into App.
    act(() => {
      judge?.({ noteIndex: 0, verdict: 'correct' } as unknown as NoteJudgement);
    });
    await waitFor(() =>
      expect(loadProgress('eb-bass', 'treble').position.segment).toBe(1),
    );
    expect(built).toHaveLength(1);
  });
});
