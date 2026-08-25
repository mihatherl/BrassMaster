/**
 * Metronome clicks.
 *
 * A short pitched blip with a fast exponential decay: audible over a synth line
 * without being tiring, and cheap enough to schedule hundreds of.
 */

import { getAudioContext } from './context';

const ACCENT_FREQUENCY = 1800;
const BEAT_FREQUENCY = 1200;
const DECAY = 0.05;

/**
 * The player's own level for the click, where **1 is the level this has always
 * clicked at** — the constructor's 0.25, which `setVolume(1)` reproduces
 * exactly. So the setting arrives changing nothing until somebody moves it.
 *
 * Added 2026-08-24 on the player's report that the metronome is "super loud —
 * louder than the instrument". A click has to be heard *over* an instrument
 * being played into the room, so it was pitched to win that fight; a player
 * reading with the synth voice and no instrument at all is in a different
 * room, and the two cannot be served by one constant.
 *
 * Zero is a real choice and means silence — the same thing as switching the
 * metronome off, reached by a different road, and there is no reason to forbid
 * it. What must never happen is arriving at silence by accident; see
 * `sanitise` in `storage/settings.ts`.
 */
export const METRONOME_VOLUME_RANGE = { min: 0, max: 1 } as const;

/**
 * Least time between two preview clicks. A range input fires on every pixel of
 * a drag, and thirty clicks a second is a buzz rather than a beat — the same
 * problem, and the same answer, as the dial's detent in `tick.ts`.
 */
const PREVIEW_GAP_MS = 180;
/**
 * How far ahead a preview click is scheduled.
 *
 * `setVolume` ramps with a 10 ms time constant, so a click fired immediately
 * after it would sound at about two thirds of the level asked for — and a
 * preview that is quieter than the real thing is worse than no preview, since
 * its whole purpose is judging the level. Eight time constants puts it within
 * a thousandth, and 80 ms is imperceptible under a moving finger.
 */
const PREVIEW_LEAD = 0.08;

let previewMetronome: Metronome | null = null;
/**
 * The context the preview is bound to.
 *
 * Tracked rather than assumed: `getAudioContext` hands out a *fresh* context
 * once the old one is known dead — iOS does this after a call or a lock — and
 * a metronome still wired to the dead one clicks silently onto a clock that
 * never arrives. See `audio/context.ts`.
 */
let previewContext: AudioContext | null = null;
let lastPreview = 0;

/**
 * One click at a level, so the player can hear what they are choosing.
 *
 * The metronome is only ever heard *during* a run, and the control for it sits
 * on the gate before one — so choosing a level meant starting a run, listening,
 * stopping, dragging, and starting again. Nobody's ear survives that loop, and
 * the level is a judgement only an ear can make.
 *
 * Deliberately the real `Metronome`, not a copy of its sound: a preview that
 * drifted from what a run actually plays would be answering a different
 * question. Best-effort throughout, like `detentClick` — a control that threw
 * because it could not click would be worse than a silent one.
 */
export function previewClick(volume: number): void {
  const now = typeof performance === 'undefined' ? Date.now() : performance.now();
  if (now - lastPreview < PREVIEW_GAP_MS) return;
  lastPreview = now;
  try {
    const ctx = getAudioContext();
    // A finger on the slider is the gesture a browser wants; not awaited,
    // because a click that arrives late is worse than none.
    if (ctx.state !== 'running') void ctx.resume().catch(() => undefined);
    if (!previewMetronome || previewContext !== ctx) {
      previewMetronome = new Metronome(ctx);
      previewContext = ctx;
    }
    previewMetronome.setVolume(volume);
    previewMetronome.click(ctx.currentTime + PREVIEW_LEAD);
  } catch {
    // No AudioContext at all — a test environment, or a browser refusing one.
  }
}

export class Metronome {
  private readonly master: GainNode;
  private readonly context: AudioContext;

  constructor(context: AudioContext, destination: AudioNode = context.destination) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0.25;
    this.master.connect(destination);
  }

  setVolume(volume: number): void {
    this.master.gain.setTargetAtTime(volume * 0.25, this.context.currentTime, 0.01);
  }

  /** Schedules a click at an absolute audio-context time. */
  click(time: number, accent = false): void {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(accent ? ACCENT_FREQUENCY : BEAT_FREQUENCY, time);

    gain.gain.setValueAtTime(accent ? 0.9 : 0.55, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + DECAY);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(time);
    osc.stop(time + DECAY + 0.01);
    osc.addEventListener('ended', () => gain.disconnect());
  }
}
