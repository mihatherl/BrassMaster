// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { loadProgress, saveProgress } from './course';
import { COURSES, startOf } from '../exercise/course';

const COURSE = COURSES[0];
const FIRST = COURSE.levels[0];
const SECOND = COURSE.levels[1];

afterEach(() => localStorage.clear());

describe('remembering where the player got to', () => {
  it('opens a first session at the start of the course', () => {
    expect(loadProgress('cornet', 'treble')).toEqual({
      position: startOf(COURSE),
      recent: [],
    });
  });

  it('keeps a position across sittings', () => {
    const position = { courseId: COURSE.id, levelId: SECOND.id, segment: 1 };
    saveProgress('cornet', 'treble', { position, recent: [0.8] });
    expect(loadProgress('cornet', 'treble')).toEqual({ position, recent: [0.8] });
  });

  it('keeps instruments and clefs apart, because a position is not transferable', () => {
    const position = { courseId: COURSE.id, levelId: SECOND.id, segment: 1 };
    saveProgress('cornet', 'treble', { position, recent: [] });
    expect(loadProgress('eb-bass', 'treble').position.levelId).toBe(FIRST.id);
    expect(loadProgress('cornet', 'bass').position.levelId).toBe(FIRST.id);
  });

  it('clamps a stored segment rather than trusting it', () => {
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: FIRST.id, segment: 999 },
      recent: [],
    });
    expect(loadProgress('cornet', 'treble').position.segment).toBe(FIRST.segments.length - 1);
  });

  /*
   * A store written before the timeline (v2.60.0 and earlier) carries a
   * tempo. It lands on the segment that tempo meant — exact, because every
   * read-forward tempo axis holds the old band's own figures.
   */
  it('reads a pre-timeline position, mapping its tempo onto the segment it meant', () => {
    const tempo = FIRST.segments[2].values.tempo!;
    localStorage.setItem(
      'brass-trainer:course:cornet:treble',
      JSON.stringify({
        position: { courseId: COURSE.id, levelId: FIRST.id, tempo },
        recent: [0.8],
      }),
    );
    const { position } = loadProgress('cornet', 'treble');
    expect(position).toEqual({ courseId: COURSE.id, levelId: FIRST.id, segment: 2 });
  });

  it('lands an unknown level on the first, and an unknown course on the bundled one', () => {
    saveProgress('cornet', 'treble', {
      position: { courseId: 'gone', levelId: 'gone-too', segment: 400 },
      recent: [],
    });
    const { position } = loadProgress('cornet', 'treble');
    expect(position.courseId).toBe(COURSE.id);
    expect(position.levelId).toBe(FIRST.id);
  });

  it('starts again rather than throwing on unreadable history', () => {
    localStorage.setItem('brass-trainer:course:cornet:treble', '{not json');
    expect(loadProgress('cornet', 'treble').position).toEqual(startOf(COURSE));
  });

  it('ignores rubbish in the evidence rather than letting it reach the bar', () => {
    localStorage.setItem(
      'brass-trainer:course:cornet:treble',
      JSON.stringify({ position: startOf(COURSE), recent: [0.9, 'high', null, 0.7] }),
    );
    expect(loadProgress('cornet', 'treble').recent).toEqual([0.9, 0.7]);
  });

  it('keeps a goal across sittings, clamped like any other position', () => {
    saveProgress('cornet', 'treble', {
      position: startOf(COURSE),
      recent: [],
      goal: { courseId: COURSE.id, levelId: SECOND.id, segment: 999 },
      goalSetAt: startOf(COURSE),
    });
    const progress = loadProgress('cornet', 'treble');
    expect(progress.goal?.segment).toBe(SECOND.segments.length - 1);
    expect(progress.goalSetAt).toEqual(startOf(COURSE));
  });

  it('drops a goal that is not a position rather than storing rubbish', () => {
    localStorage.setItem(
      'brass-trainer:course:cornet:treble',
      JSON.stringify({ position: startOf(COURSE), recent: [], goal: 'level nine' }),
    );
    expect(loadProgress('cornet', 'treble').goal).toBeUndefined();
  });
});
