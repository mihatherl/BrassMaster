// @vitest-environment happy-dom

/*
 * The warning before a session on an output nobody has measured.
 *
 * Zero measurements is not the same as a lead of zero: the first is a player
 * who has never been asked, and until they are, every note is as late as their
 * hardware happens to be. Asked for 2026-08-22, after the calibration screen
 * turned out to say the device's own speaker "needs nothing" — which was one
 * iPhone's behaviour written up as a rule, on the eve of shipping to Android.
 */

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './render-app';
import { DEVICE_OUTPUT_ID } from '../storage/settings';

/*
 * A deliberately stupid `AudioContext`, because these tests go past the gate
 * that every other UI test stops at.
 *
 * `App.test.tsx` says it "stops at the Tap to start gate — everything past
 * that needs a real AudioContext", and this file does not stop there: the
 * warning is answered and the session starts. happy-dom has no Web Audio, so
 * the start path threw inside a promise nobody awaits — which does not fail an
 * assertion, because the dialog under test had already been drawn. It failed
 * the *suite*: five unhandled rejections, `npm test` exiting 1 with 1,340
 * tests passing, and a gate that reads red for a reason no test names.
 *
 * So this answers every call and means none of it. It is not a model of Web
 * Audio and must not be used to test sound — `src/audio/context.test.ts` has a
 * fake with a clock and a state machine for that. This one exists so that
 * starting a run is *possible* in a DOM test, and nothing here should ever be
 * asserted on.
 */
const param = () => ({
  value: 0,
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
  setTargetAtTime() {},
  cancelScheduledValues() {},
});

const node = () => ({
  connect() {},
  disconnect() {},
  start() {},
  stop() {},
  gain: param(),
  frequency: param(),
  detune: param(),
  Q: param(),
  type: 'sine',
  buffer: null as unknown,
  onended: null as unknown,
});

class SilentContext {
  state = 'running';
  currentTime = 0;
  sampleRate = 48000;
  destination = node();
  addEventListener() {}
  removeEventListener() {}
  async resume() {}
  async close() {}
  createGain() { return node(); }
  createOscillator() { return node(); }
  createBufferSource() { return node(); }
  createBiquadFilter() { return node(); }
  createBuffer() { return { getChannelData: () => new Float32Array(1) }; }
  async decodeAudioData() { return { duration: 0, getChannelData: () => new Float32Array(1) }; }
}

/*
 * Installed once for the file and never taken away, which matters more than it
 * looks. `beginRun` awaits `unlockAudio()`, so the construction can land on a
 * timer *after* the test that started it has finished; unstubbing between
 * tests put the global back to undefined underneath that pending call and the
 * rejection came back — intermittently, in three runs out of five, which is
 * the worst way for a gate to fail. Vitest isolates globals per file, so
 * leaving it in place leaks nothing.
 */
beforeAll(() => {
  vi.stubGlobal('AudioContext', SilentContext);
});

const stored = (outputs: unknown[], chosen: string) =>
  localStorage.setItem(
    'brass-trainer:settings',
    JSON.stringify({ audioOutputs: outputs, audioOutputId: chosen }),
  );

const settings = () => JSON.parse(localStorage.getItem('brass-trainer:settings')!);

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function startRun() {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
  fireEvent.click(screen.getByRole('button', { name: /tap to start/i }));
}

describe('starting on an output nobody has measured', () => {
  it('asks, and says where the setting lives', () => {
    startRun();
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Calibration Required' })).toBeTruthy();
    // The one place a player can go back to, named on the warning itself.
    expect(screen.getByText(/Advanced menu/)).toBeTruthy();
  });

  it('does not ask for an output that has been measured', () => {
    stored([{ id: 'z', name: 'Zen', leadMs: 180, calibrations: 1 }], 'z');
    startRun();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not ask for one measured at nought, which is an answer', () => {
    /* The distinction the whole feature rests on: a lead of zero that somebody
       checked is settled, and asking again would be a nag. */
    stored([{ id: DEVICE_OUTPUT_ID, name: 'Speaker', leadMs: 0, calibrations: 1 }], DEVICE_OUTPUT_ID);
    startRun();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('goes to the outputs screen on Calibrate Now', () => {
    startRun();
    fireEvent.click(screen.getByRole('button', { name: 'Calibrate Now' }));
    expect(screen.getByRole('heading', { name: 'Outputs' })).toBeTruthy();
  });

  it('runs on Later, and records nothing', () => {
    /* Seeded, so there is a stored value to read back: "Later" writing nothing
       is the property under test, and an empty store would pass it by
       accident. */
    stored(
      [{ id: DEVICE_OUTPUT_ID, name: 'Speaker', leadMs: 0, calibrations: 0 }],
      DEVICE_OUTPUT_ID,
    );
    startRun();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    const device = settings().audioOutputs.find((o: { id: string }) => o.id === DEVICE_OUTPUT_ID);
    expect(device.calibrations).toBe(0);
  });

  it('counts accepting the current offset as an answer, and does not ask again', () => {
    startRun();
    fireEvent.click(screen.getByRole('button', { name: /Accept current offset/ }));
    const device = settings().audioOutputs.find((o: { id: string }) => o.id === DEVICE_OUTPUT_ID);
    expect(device.calibrations).toBe(1);
    expect(device.leadMs).toBe(0);
  });

  it('asks again at the next session, since Later settles nothing', () => {
    /* Which is the difference between the two answers: "Later" defers and
       "Accept" answers. A warning that never came back after "Later" would be
       a warning nobody ever acts on. */
    startRun();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    cleanup();

    startRun();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
