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
    const position = { courseId: COURSE.id, levelId: SECOND.id, tempo: SECOND.tempo.floor };
    saveProgress('cornet', 'treble', { position, recent: [0.8] });
    expect(loadProgress('cornet', 'treble')).toEqual({ position, recent: [0.8] });
  });

  it('keeps instruments and clefs apart, because a position is not transferable', () => {
    const position = { courseId: COURSE.id, levelId: SECOND.id, tempo: SECOND.tempo.floor };
    saveProgress('cornet', 'treble', { position, recent: [] });
    expect(loadProgress('eb-bass', 'treble').position.levelId).toBe(FIRST.id);
    expect(loadProgress('cornet', 'bass').position.levelId).toBe(FIRST.id);
  });

  it('re-snaps a stored position rather than trusting it', () => {
    saveProgress('cornet', 'treble', {
      position: { courseId: COURSE.id, levelId: FIRST.id, tempo: FIRST.tempo.floor + 2 },
      recent: [],
    });
    expect(loadProgress('cornet', 'treble').position.tempo).toBe(FIRST.tempo.floor);
  });

  it('lands an unknown level on the first, and an unknown course on the bundled one', () => {
    saveProgress('cornet', 'treble', {
      position: { courseId: 'gone', levelId: 'gone-too', tempo: 400 },
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

  it('keeps a goal across sittings, snapped like any other position', () => {
    saveProgress('cornet', 'treble', {
      position: startOf(COURSE),
      recent: [],
      goal: { courseId: COURSE.id, levelId: SECOND.id, tempo: SECOND.tempo.floor + 2 },
      goalSetAt: startOf(COURSE),
    });
    const progress = loadProgress('cornet', 'treble');
    expect(progress.goal?.tempo).toBe(SECOND.tempo.floor);
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
