// @vitest-environment happy-dom

/**
 * The tempo a course level asks for, and whether the clock hears it.
 *
 * Written for a fault found on 2026-08-29, while the player was authoring:
 * the gate carried a live tempo dial on a course run, which he objected to on
 * sight — *"the gate screen has a tempo dial, which we really don't want"*.
 * Probing it found worse than a redundant control. The dial was the **only**
 * thing setting the tempo: `startCourse` built the exercise from settings
 * carrying the level's band, but `PlayScreen` was handed the player's own
 * settings and started the session from those.
 *
 * A level whose band said 66 played at whatever free play was last left at,
 * while the practice screen said "at 66". Worse, `runAt.tempo` filed the run
 * under 66 for the skill tally — whose whole purpose is to record *what was
 * actually played* — so the `tempo` dimension was being poisoned with a band
 * nobody had played. It survived because stepping works: the first press of
 * Forward snaps the transport onto the band, so only the opening run of a
 * level was ever wrong.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './render-app';
import { saveCourseDocument } from '../storage/course';
import { DEFAULT_SETTINGS, saveSettings } from '../storage/settings';

/** Deliberately nothing like the player's own tempo, so a mix-up is visible. */
const SLOW_COURSE = {
  id: 'test-slow',
  name: 'Slow',
  blurb: 'One level, played slowly.',
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

const PLAYERS_OWN_TEMPO = 132;

const gateTempo = (): string =>
  [...document.querySelectorAll('.field__label')]
    .map((node) => node.textContent ?? '')
    .find((text) => text.startsWith('Tempo')) ?? '';

const slider = () =>
  document.querySelector('.tempo input[type="range"]') as HTMLInputElement | null;

function reachTheGate(): void {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /structured learning/i }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), {
    target: { value: SLOW_COURSE.id },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
}

beforeEach(() => {
  localStorage.clear();
  saveSettings({ ...DEFAULT_SETTINGS, tempo: PLAYERS_OWN_TEMPO });
  saveCourseDocument(SLOW_COURSE);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('a course level’s tempo', () => {
  it('is what the run opens at, not the player’s free-play tempo', () => {
    reachTheGate();
    expect(gateTempo()).toBe('Tempo 66 bpm');
    expect(slider()?.value).toBe('66');
  });

  it('is locked at the gate, and says who locked it', () => {
    // Disabled rather than hidden: on a course run the tempo is the axis, and
    // a player who found the dial missing would think the app had lost it.
    reachTheGate();
    expect(slider()?.disabled).toBe(true);
    /*
     * Scoped to the tempo's own field. This course names its key too, so the
     * Key section carries the same sentence — which is the point of sharing
     * the vocabulary, and the reason a screen-wide query cannot say which
     * control it is talking about.
     */
    const note = document.querySelector('.field.tempo .field__note')?.textContent ?? '';
    expect(note).toMatch(/set by the course/i);
  });

  it('leaves the player’s own tempo untouched for free play', () => {
    /*
     * The course's tempo is not the player's preference. Writing it through
     * would reset their free-play tempo every time they practised a slow
     * level — the same clobber `courseFifths` was created to avoid.
     */
    reachTheGate();
    const stored = JSON.parse(localStorage.getItem('brass-trainer:settings') ?? '{}');
    expect(stored.tempo).toBe(PLAYERS_OWN_TEMPO);
  });

  it('still leaves free play’s own dial live and at the player’s tempo', () => {
    // The lock belongs to the course, not to the gate: a free run must be
    // unaffected, or this fix has broken the screen it was not aimed at.
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(gateTempo()).toBe(`Tempo ${PLAYERS_OWN_TEMPO} bpm`);
    expect(slider()?.disabled).toBe(false);
    expect(screen.queryByText(/set by the course/i)).toBeNull();
  });
});
