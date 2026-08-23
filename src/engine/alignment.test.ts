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
import { COLLECTIONS, playableThemes } from '../exercise/collections';
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
  collectionIds: string[];
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
    collectionIds: options.collectionIds,
    // The run opens in C, so a step per id in C is the old playlist exactly.
    themeSteps: options.themeIds?.map((id) => ({ id, fifths: 0 })),
    selection: options.themeIds?.length ? ('defined' as const) : ('medley' as const),
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

/**
 * A playable compound-time tune and a playable simple-time one, found rather
 * than named.
 *
 * These tests used to name `jesu-joy` and `bwv779-invention`, and that broke
 * for the third time on 2026-08-21 when Invention 8 was taken whole and went
 * back to being unheard — a tune nobody has judged is not offered, so the
 * medley silently became one tune and the metre never changed. The scenario
 * needs *a* pair, not that pair: anything compound against anything simple,
 * from whatever the corpus can currently hand a cornet.
 */
function compoundAndSimple(): { collectionIds: string[]; themeIds: string[] } {
  const playable = COLLECTIONS.flatMap((collection) =>
    playableThemes(collection).map((theme) => ({ collection, theme })),
  );
  const isCompound = (t: (typeof playable)[number]) =>
    metreFor(t.theme.metres[0][0], t.theme.metres[0][1]).isCompound;
  const compound = playable.find(isCompound);
  const simple = playable.find((t) => !isCompound(t));
  if (!compound || !simple) throw new Error('the corpus holds no compound/simple pair');
  return {
    collectionIds: [...new Set([compound.collection.id, simple.collection.id])],
    themeIds: [compound.theme.id, simple.theme.id],
  };
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
      difficultyId: 'easy',
      metre: [4, 4],
      ...compoundAndSimple(),
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
      collectionIds: ['bach'],
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
      collectionIds: [],
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
    const exercise = themesRun({ collectionIds: [], difficultyId: 'easy', metre: [4, 4] });
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

/*
 * The dial's number means the pulse of whatever is playing.
 *
 * Reported by ear: a medley of Jesu Joy (9/8) into Invention 13 (4/4) at 80
 * "seemed a whole lot faster… maybe about 120" once the second tune began —
 * which is 80 x 1.5, the dotted crotchet's worth in crotchets. The transport
 * had been told the conversion once from the opening metre, so it held the
 * *crotchet* rate steady across the join and the pulse sped up by half again.
 *
 * Measured here as a conductor would: how long one pulse lasts, on both sides
 * of the change.
 */
describe('tempo across a change of metre', () => {
  const secondsPerPulse = (session: Session, exercise: Exercise, beat: number) => {
    const pulse = metreAt(exercise.metres, beat).pulseBeats;
    return session.transport.timeForBeat(beat + pulse) - session.transport.timeForBeat(beat);
  };

  it('keeps one pulse the same length either side of the join', () => {
    const exercise = themesRun({
      difficultyId: 'easy',
      metre: [4, 4],
      ...compoundAndSimple(),
    });
    const change = exercise.metres.find((m) => m.fromBeat > 0);
    expect(change, 'the medley must actually change metre').toBeDefined();
    expect(metreAt(exercise.metres, 0).isCompound).toBe(true);
    expect(change!.metre.isCompound).toBe(false);

    const { session } = drive(exercise, 1);
    // 96 bpm in the harness: a pulse lasts 60/96 either side, compound or not.
    const before = secondsPerPulse(session, exercise, 0);
    const after = secondsPerPulse(session, exercise, change!.fromBeat);
    expect(before).toBeCloseTo(60 / 96, 6);
    expect(after).toBeCloseTo(60 / 96, 6);
  });

  it('runs a bar of each metre at its own honest length', () => {
    const exercise = themesRun({
      difficultyId: 'easy',
      metre: [4, 4],
      ...compoundAndSimple(),
    });
    const change = exercise.metres.find((m) => m.fromBeat > 0)!;
    const { session } = drive(exercise, 1);
    const barSeconds = (beat: number) => {
      const m = metreAt(exercise.metres, beat);
      return (
        session.transport.timeForBeat(beat + m.barBeats) - session.transport.timeForBeat(beat)
      );
    };
    /*
     * A bar lasts one pulse times however many pulses it holds — three to a
     * nine-eight bar, three to a three-four one, four to a four-four. The
     * bars may differ in length and that difference is the music; what must
     * not differ is the pulse. Read from the metres rather than written in,
     * because which tunes are playable changes as they are heard.
     */
    const pulses = (beat: number) => metreAt(exercise.metres, beat).pulsesPerBar;
    expect(barSeconds(0)).toBeCloseTo((60 / 96) * pulses(0), 6);
    expect(barSeconds(change.fromBeat)).toBeCloseTo((60 / 96) * pulses(change.fromBeat), 6);
  });
});

/*
 * The same change of metre, read two ways, because it means two things.
 *
 * Within a piece the note value carries across a change — 2/4 into 6/8 is
 * quaver = quaver, so the crotchet holds and the new pulse is half again as
 * long. Between pieces nothing carries: each tune plays at the dial's number.
 * The seam is what tells them apart, and `labels` is where the seams are.
 */
describe('a metre change within a piece, against one between pieces', () => {
  const runWith = (labels: Array<{ atBeat: number; text: string }>) => {
    const exercise: Exercise = {
      ...themesRun({ collectionIds: [], difficultyId: 'easy', metre: [2, 4] }),
      metres: [
        { fromBeat: 0, metre: metreFor(2, 4) },
        { fromBeat: 4, metre: metreFor(6, 8) },
      ],
      labels,
      totalBeats: 16,
      chosenBeats: 16,
      tempo: [],
    };
    const session = new Session({
      context,
      input: new ValveInput(() => audioTime),
      exercise,
      tempo: 60,
      countInBars: 0,
      metronomeEnabled: false,
      playbackMode: 'off',
      brassVoice: voice,
    });
    // One pulse of the 6/8 section, in seconds.
    return (
      session.transport.timeForBeat(4 + metreFor(6, 8).pulseBeats) -
      session.transport.timeForBeat(4)
    );
  };

  it('carries the note value across a change inside one piece', () => {
    // No label at the change: the crotchet stays a second, so the dotted
    // crotchet that follows lasts one and a half.
    expect(runWith([])).toBeCloseTo(1.5, 6);
  });

  it('re-reads the dial where one piece hands over to the next', () => {
    // A label at the change: the new tune plays at 60 of its own pulse.
    expect(runWith([{ atBeat: 4, text: 'The next tune' }])).toBeCloseTo(1, 6);
  });
});
