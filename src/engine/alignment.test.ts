// @vitest-environment happy-dom

/*
 * Everything that sounds agrees with the clock, across everything a medley can
 * now do to an exercise.
 *
 * Written while chasing a report of audio drifting against the metronome and
 * the strike line in Themes. The chase found no fault — every path measured
 * exact — but it also found that nothing *proved* alignment for the exercises
 * the medley work made possible: metre changes mid-run, a compound opening,
 * and tempo events over both. Each of those is a way the beat↔time arithmetic
 * could silently split between the schedulers and the clock, and the session
 * constructor's own comment had warned that metre changes were the case
 * nothing generated yet. Now something does, so the proof runs on every push.
 *
 * The method is the session tests': a real Session against a mocked audio
 * clock, reading back where the sounds were actually scheduled. Three readers
 * are held to the one map — the synth's note times, the metronome's click
 * times, and `timeForBeat`, which is what the notation surfaces and the judge
 * read. If these agree, a misalignment on screen can only be a stale build or
 * a device's audio latency, not the arithmetic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Voice } from '../audio/sampler';
import { barAt, beatOfBar, changesMetre, metreAt, metreFor } from '../domain/metre';
import { instrumentById } from '../domain/instruments';
import { difficultyById } from '../exercise/difficulty';
import { generateExercise } from '../exercise/generate';
import type { Exercise } from '../exercise/types';
import { ValveInput } from './input';
import { Session } from './session';

let audioTime = 0;
let played: Array<{ midi: number; startTime: number; duration: number }> = [];

const context = {
  get currentTime() {
    return audioTime;
  },
  get destination() {
    return {} as AudioNode;
  },
  createGain: () => ({ gain: { value: 0 }, connect: () => {} }),
} as unknown as AudioContext;

const voice: Voice = {
  play: (midi, startTime, duration) => played.push({ midi, startTime, duration }),
  setVolume: () => {},
  stop: () => {},
};

beforeEach(() => {
  vi.useFakeTimers();
  audioTime = 0;
  played = [];
});
afterEach(() => vi.useRealTimers());

function themesRun(options: {
  collectionId: string;
  difficultyId: string;
  metre: readonly [number, number];
  themeIds?: string[];
  variableTempo?: boolean;
}): Exercise {
  return generateExercise({
    instrument: instrumentById('cornet'),
    clef: 'treble',
    fifths: 0,
    keySet: [0],
    difficulty: difficultyById(options.difficultyId),
    kind: 'themes',
    drillId: 'major-scale',
    bars: 16,
    themeCount: 4,
    cycles: 4,
    register: 'middle',
    metre: metreFor(options.metre[0], options.metre[1]),
    seed: 3,
    tempo: 96,
    variableTempo: options.variableTempo ?? false,
    collectionId: options.collectionId,
    themeIds: options.themeIds,
  });
}

/** Drives a real session and hands back the clicks and the transport. */
function drive(exercise: Exercise, seconds: number) {
  const clicks: number[] = [];
  const session = new Session({
    context,
    input: new ValveInput(() => audioTime),
    exercise,
    tempo: 96,
    countInBars: 1,
    metronomeEnabled: true,
    playbackMode: 'reference',
    brassVoice: voice,
  });
  const spy = session as unknown as { metronome: { click: (t: number, a: boolean) => void } };
  spy.metronome.click = (time) => clicks.push(time);
  session.start();
  for (let t = 0; t <= seconds; t += 0.025) {
    audioTime = t;
    vi.advanceTimersByTime(25);
  }
  session.stop();
  return { session, clicks };
}

/**
 * The largest gap between when a note was handed to the audio thread and when
 * the clock says its beat falls. Paired by walking the score and skipping tie
 * continuations, which are held rather than sounded — pairing by index shifts
 * one place per tie and reports a fault that is not there.
 */
function worstNoteError(exercise: Exercise, session: Session): number {
  let worst = 0;
  let heard = 0;
  for (let i = 0; i < exercise.notes.length && heard < played.length; i++) {
    if (exercise.notes[i - 1]?.tiedToNext) continue;
    const sound = played[heard++];
    worst = Math.max(
      worst,
      Math.abs(sound.startTime - session.transport.timeForBeat(exercise.notes[i].startBeat)),
    );
  }
  expect(heard).toBeGreaterThan(10);
  return worst;
}

/** The furthest any click sits from a pulse of the metre in force at it. */
function worstClickError(exercise: Exercise, session: Session, clicks: number[]): number {
  let worst = 0;
  let counted = 0;
  for (const time of clicks) {
    const beat = session.transport.beatForTime(time);
    if (beat < 0) continue; // the count-in is asserted separately below
    const barStart = beatOfBar(exercise.metres, barAt(exercise.metres, beat + 1e-6));
    const inBar = beat - barStart;
    const pulses = inBar / metreAt(exercise.metres, barStart).pulseBeats;
    worst = Math.max(worst, Math.abs(pulses - Math.round(pulses)));
    counted++;
  }
  expect(counted).toBeGreaterThan(10);
  return worst;
}

describe('sound against the clock', () => {
  it('holds through a metre change, which the medley made real', () => {
    /*
     * Picked so the run crosses between compound and simple time, not merely
     * between two simple metres. That distinction is what gives the click
     * check teeth: 4/4 and 3/4 both pulse in crotchets, so a walk stuck in
     * the opening metre still lands every click on a legal pulse and the
     * fault is invisible — found by mutation-testing this very test. A 9/8
     * bar walked in 3/4 pulses, or the reverse, is off the grid at once.
     */
    const exercise = themesRun({
      collectionId: 'bach',
      difficultyId: 'easy',
      metre: [4, 4],
      themeIds: ['jesu-joy', 'bwv779-invention'],
    });
    // The scenario only proves anything if the signature actually moves.
    expect(changesMetre(exercise.metres)).toBe(true);
    expect(new Set(exercise.metres.map((m) => m.metre.isCompound)).size).toBe(2);

    const { session, clicks } = drive(exercise, 45);
    expect(worstNoteError(exercise, session)).toBeLessThan(1e-6);
    expect(worstClickError(exercise, session, clicks)).toBeLessThan(1e-6);
  });

  it('holds with a compound opening, where the beat is not the crotchet', () => {
    const exercise = themesRun({
      collectionId: 'bach',
      difficultyId: 'easy',
      metre: [4, 4],
      themeIds: ['jesu-joy'],
    });
    expect(metreAt(exercise.metres, 0).isCompound).toBe(true);

    const { session, clicks } = drive(exercise, 45);
    expect(worstNoteError(exercise, session)).toBeLessThan(1e-6);
    expect(worstClickError(exercise, session, clicks)).toBeLessThan(1e-6);

    // The count-in is measured in the opening metre's own bar: three pulses
    // of a dotted crotchet, from a bar before the music.
    const countIn = clicks
      .map((time) => session.transport.beatForTime(time))
      .filter((beat) => beat < -1e-3)
      .map((beat) => Math.round(beat * 100) / 100);
    expect(countIn).toEqual([-4.5, -3, -1.5]);
  });

  it('holds under a tempo plan, which only themes ever carry', () => {
    const exercise = themesRun({
      collectionId: 'composed',
      difficultyId: 'easy',
      metre: [6, 8],
      variableTempo: true,
    });
    // Same rule: no events, nothing proven.
    expect(exercise.tempo.length).toBeGreaterThan(0);

    const { session, clicks } = drive(exercise, 60);
    expect(worstNoteError(exercise, session)).toBeLessThan(1e-6);
    expect(worstClickError(exercise, session, clicks)).toBeLessThan(1e-6);
  });
});

/*
 * The browser's latency estimate is never applied automatically.
 *
 * For one evening it was — a floor of `context.outputLatency` under the
 * player's measured lead, on the reasoning that compensation should never be
 * less than what the device admits to. On real hardware the report exceeded
 * reality by most of a second and every sound ran ahead of the page by a
 * pulse; and because one pulse is exactly the count-in's number interval, the
 * clicks landed back on the changing numbers and the overshoot looked like a
 * fix. The estimate is wrong in either direction on real devices, so the tap
 * calibration is the only figure the transport takes, and this pins that.
 */
describe('the output latency report', () => {
  const leadInForce = (outputLatency: number | undefined, calibrated: number) => {
    const ctx = {
      get currentTime() {
        return audioTime;
      },
      get destination() {
        return {} as AudioNode;
      },
      createGain: () => ({ gain: { value: 0 }, connect: () => {} }),
      outputLatency,
    } as unknown as AudioContext;
    const exercise = themesRun({ collectionId: 'composed', difficultyId: 'easy', metre: [4, 4] });
    const session = new Session({
      context: ctx,
      input: new ValveInput(() => audioTime),
      exercise,
      tempo: 96,
      countInBars: 0,
      metronomeEnabled: false,
      playbackMode: 'reference',
      brassVoice: voice,
      audioLead: calibrated,
    });
    session.start();
    for (let t = 0; t <= 3; t += 0.025) {
      audioTime = t;
      vi.advanceTimersByTime(25);
    }
    session.stop();
    // How early the first sound was handed over, against the clock's beat —
    // which is the lead actually in force, whatever anyone reported.
    const first = exercise.notes[0];
    return session.transport.timeForBeat(first.startBeat) - played[0].startTime;
  };

  it('uses exactly what the player measured, ignoring the report', () => {
    expect(leadInForce(0.8, 0.15)).toBeCloseTo(0.15, 6);
  });

  it('applies nothing for an uncalibrated output, whatever the browser claims', () => {
    expect(leadInForce(0.8, 0)).toBeCloseTo(0, 6);
  });
});
