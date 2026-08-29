// @vitest-environment happy-dom

/**
 * The key gate, end to end, on a course that leaves the key open.
 *
 * The rules are unit-tested in `course-run.test.ts`; this is the part no unit
 * test can see — that the control reaches the screen at all, on a real course
 * document, through the real practice screen. The bundled *Common Keys*
 * course names a key on every level, so the case the player hit while
 * authoring could not be reached with it: this installs a course that leaves
 * the key open, which is the shape the editor writes when the author picks
 * "Player chooses, at the gate".
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './render-app';
import { saveCourseDocument } from '../storage/course';

const OPEN_KEY_COURSE = {
  id: 'test-open-key',
  name: 'Open Key',
  blurb: 'One level, no key named.',
  schemaVersion: 1,
  levels: [
    {
      id: 'open',
      name: 'Whatever key you like',
      // No `fifths`: the ratified optional-key ruling, and the case the gate
      // was built for.
      base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy' },
      tempo: { floor: 66, ceiling: 96, step: 6 },
    },
  ],
};

/** The key named on the gate's face, where the question is asked. */
const asked = (): string =>
  [...document.querySelectorAll('.field__label')]
    .map((node) => node.textContent ?? '')
    .find((text) => text.startsWith('Key ')) ?? '';

/** A key's chip in the grid on the face. */
const chip = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });

/**
 * Into the course and up to the gate, which is where the key is asked.
 *
 * The course has to be *chosen*: bundled courses come first from
 * `allCourses()`, so the practice screen opens on *Common Keys*, whose every
 * level names its key — which is exactly why the open-key case went unnoticed
 * until an author wrote a course without one.
 */
function reachTheGate(): void {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /structured learning/i }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Course' }), {
    target: { value: OPEN_KEY_COURSE.id },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
}

beforeEach(() => {
  localStorage.clear();
  saveCourseDocument(OPEN_KEY_COURSE);
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('a course level that leaves the key to the player', () => {
  it('asks at the gate, rather than silently taking free play’s key', () => {
    reachTheGate();
    expect(screen.getByText(/yours to choose/i)).toBeTruthy();
    /*
     * No *Key* section, which is the locked shape. Scoped to the section
     * titles rather than asking whether "Set by the course" appears anywhere:
     * since 2026-08-29 the tempo is locked on every course run and says so in
     * those very words, so a screen-wide query now answers about the tempo.
     */
    const sections = [...document.querySelectorAll('.panel__title')].map((n) => n.textContent);
    expect(sections).not.toContain('Key');
    // On the face and uncollapsed — not behind an accordion the player would
    // have to know to open (the player's instruction, 2026-08-29).
    expect(chip('Eb major').closest('details')).toBeNull();
  });

  it('opens on the player’s free-play key the first time', () => {
    // Eb major is the default and brass band home turf; the point is that the
    // gate opens somewhere honest rather than on an app default nobody chose.
    reachTheGate();
    expect(asked()).toBe('Key Eb major');
  });

  it('remembers the answer for the next time the question is asked', () => {
    reachTheGate();
    fireEvent.click(chip('F major'));
    expect(asked()).toBe('Key F major');

    // Leave the run entirely and come back: the answer is the player's, and
    // it is kept apart from free play's key set on purpose.
    cleanup();
    reachTheGate();
    expect(asked()).toBe('Key F major');
  });

  it('leaves the free-play key set alone, rather than flattening it', () => {
    /*
     * The bug this design avoids. `keySet` is a *tour* in free play; writing
     * the gate's answer through to it would silently reduce a player's
     * four-key tour to one every time they answered a course level.
     */
    reachTheGate();
    fireEvent.click(chip('A major'));
    const stored = JSON.parse(localStorage.getItem('brass-trainer:settings') ?? '{}');
    expect(stored.courseFifths).toBe(3);
    expect(stored.keySet).toEqual([-3]);
  });
});
