import { useCallback, useEffect, useRef, useState } from 'react';
import { getAudioContext, unlockAudio } from '../audio/context';
import { Metronome } from '../audio/metronome';
import { CALIBRATION_BPM, estimateLead, MIN_TAPS } from '../engine/calibrate';
import { Transport } from '../engine/clock';
import {
  AUDIO_LEAD_RANGE,
  DEVICE_OUTPUT_ID,
  type AudioOutput,
  type Settings,
} from '../storage/settings';

/**
 * Headphones and speakers: which one is in the player's ears, and how late it
 * is.
 *
 * The observation that asked for this, made on an iPhone against three
 * outputs: the phone's own speaker sounds the note on the beat, a pair of
 * over-ear headphones sounds it a little late, and a pair of earbuds sounds it
 * a lot late. Bluetooth buffers the sound on its way to the ear, each device
 * by its own amount, and nothing the app can read reports how much reliably — so the
 * player measures it, once per device, by tapping along with a click — the
 * browser's own `outputLatency` estimate is shown as a starting point, and
 * deliberately never applied by itself, having been measured wrong by most of
 * a second on real hardware. The
 * measurement is kept under the device's name and the sound is brought
 * forward by that much whenever the device is chosen. See
 * `Transport.audioLead` for what "brought forward" means.
 *
 * Its own screen rather than a slider in Advanced, because a number of
 * milliseconds is not something a player can set by looking at it. The click
 * has to be running while it is set.
 */
interface OutputScreenProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
}

/** What is being measured: an output being added, or one being measured again. */
interface Calibration {
  /** The output's id, or null while it is new and unnamed. */
  id: string | null;
  name: string;
  leadMs: number;
}

/** How long the pulse shows after each beat, as a fraction of the beat. */
const PULSE_FRACTION = 0.12;

/** Taps landing within this of the click count as in time. */
const IN_TIME_MS = 15;

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function OutputScreen({ settings, onChange, onBack }: OutputScreenProps) {
  const [calibrating, setCalibrating] = useState<Calibration | null>(null);

  const choose = (id: string | null) => onChange({ ...settings, audioOutputId: id });

  /* The device's own speaker cannot be forgotten — it is the one output every
     player certainly has, and the fallback when another is removed. */
  const forget = (id: string) =>
    onChange({
      ...settings,
      audioOutputs: settings.audioOutputs.filter((o) => o.id !== id),
      audioOutputId: settings.audioOutputId === id ? DEVICE_OUTPUT_ID : settings.audioOutputId,
    });

  const begin = (output?: AudioOutput) => {
    // From inside the gesture, so the browser lets the clicks sound.
    void unlockAudio();
    setCalibrating(
      output
        ? { id: output.id, name: output.name, leadMs: output.leadMs }
        : { id: null, name: '', leadMs: 0 },
    );
  };

  const save = (result: Calibration) => {
    const id = result.id ?? newId();
    const existing = settings.audioOutputs.find((o) => o.id === id);
    const saved: AudioOutput = {
      id,
      name: result.name.trim() || existing?.name || 'Headphones',
      leadMs: result.leadMs,
      /* Every visit here counts, including one that settles on the offset
         already in force: the player has been asked and has answered. */
      calibrations: (existing?.calibrations ?? 0) + 1,
    };
    const others = settings.audioOutputs.filter((o) => o.id !== id);
    onChange({
      ...settings,
      audioOutputs: id === DEVICE_OUTPUT_ID ? [saved, ...others] : [...others, saved],
      audioOutputId: id,
    });
    setCalibrating(null);
  };

  if (calibrating) {
    return (
      <CalibrationScreen
        initial={calibrating}
        onSave={save}
        onCancel={() => setCalibrating(null)}
      />
    );
  }

  return (
    <div className="screen">
      <header className="masthead">
        <h1>Outputs</h1>
        <p>
          Every way of hearing the app is a little behind it, and each one by a different amount —
          Bluetooth headphones by a lot, wired ones by less, and this device&apos;s own speaker by
          whatever its hardware costs. Measure each one once, and the app brings the sound forward
          by that much whenever it is chosen.
        </p>
      </header>

      <ul className="library">
        {settings.audioOutputs.map((output) => (
          <li key={output.id} className="library__item">
            <button
              type="button"
              className={`library__open ${settings.audioOutputId === output.id ? 'is-selected' : ''}`}
              aria-pressed={settings.audioOutputId === output.id}
              onClick={() => choose(output.id)}
            >
              <span className="library__title">{output.name}</span>
              <span className="library__detail">
                {output.calibrations === 0
                  ? 'Not measured yet'
                  : `Sound brought forward ${output.leadMs} ms`}
              </span>
            </button>
            <button
              type="button"
              className="button button--quiet library__forget"
              onClick={() => begin(output)}
              aria-label={`Measure ${output.name}${output.calibrations === 0 ? '' : ' again'}`}
            >
              Measure
            </button>
            {/* The device's own speaker is the one output every player
                certainly has, and where the app falls back to. */}
            {output.id !== DEVICE_OUTPUT_ID && (
              <button
                type="button"
                className="button button--quiet library__forget"
                onClick={() => forget(output.id)}
                aria-label={`Forget ${output.name}`}
              >
                Forget
              </button>
            )}
          </li>
        ))}
      </ul>

      <div className="actions">
        <button
          type="button"
          className="button button--primary button--large"
          onClick={() => begin()}
        >
          Add an output
        </button>
        <button type="button" className="button button--quiet" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

interface CalibrationScreenProps {
  initial: Calibration;
  onSave: (result: Calibration) => void;
  onCancel: () => void;
}

/**
 * The measurement.
 *
 * A click every second, and a dot on the screen that pulses when the click
 * is *meant* to be heard. The player taps in time with what they hear; the
 * offset between their taps and the clicks is how late the device is, and it
 * is offered as the lead. Once set, the clicks are sent that much early — so
 * the dot and the click should now land together, and tapping again should
 * come out in time. That check is the whole reason the click keeps running
 * while the number is set: a lead is not something a player can judge by
 * reading it.
 *
 * The slider is there for the last few milliseconds by ear, and for anyone
 * who would rather set it by hand than tap.
 */
function CalibrationScreen({ initial, onSave, onCancel }: CalibrationScreenProps) {
  const [name, setName] = useState(initial.name);
  // Read once: the figure drifts a little between reads, and a hint that
  // twitches invites chasing it with the slider.
  const [reportedMs] = useState(() => {
    const context = getAudioContext();
    const reported = (context as { outputLatency?: number }).outputLatency;
    return typeof reported === 'number' && Number.isFinite(reported) && reported > 0
      ? Math.round(reported * 1000)
      : null;
  });
  const [leadMs, setLeadMs] = useState(initial.leadMs);
  const [taps, setTaps] = useState<number[]>([]);
  const [pulsing, setPulsing] = useState(false);

  const transportRef = useRef<Transport | null>(null);
  const metronomeRef = useRef<Metronome | null>(null);
  /** The clock times the clicks were meant for, for matching taps against. */
  const clicksRef = useRef<number[]>([]);

  /*
   * The click runs on a transport of its own, at the lead being tried, and is
   * rebuilt whenever the lead changes — a transport's lead is fixed at
   * construction, since moving it under scheduled sound would move that sound.
   * The taps are dropped with it: each was made against the lead then in
   * force, and `estimateLead` is told which, so a mixed set would say nothing.
   */
  useEffect(() => {
    const context = getAudioContext();
    const metronome = metronomeRef.current ?? new Metronome(context);
    metronomeRef.current = metronome;

    const transport = new Transport(context, CALIBRATION_BPM, [], 1, leadMs / 1000);
    transportRef.current = transport;
    clicksRef.current = [];
    setTaps([]);

    transport.start((from, to) => {
      for (let beat = Math.ceil(from); beat < to; beat++) {
        clicksRef.current.push(transport.timeForBeat(beat));
        metronome.click(transport.audioTimeForBeat(beat));
      }
    });

    let frame = 0;
    const draw = () => {
      const beat = transport.visualBeat();
      setPulsing(beat >= 0 && beat - Math.floor(beat) < PULSE_FRACTION);
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      transport.stop();
    };
  }, [leadMs]);

  const tap = useCallback(() => {
    const context = getAudioContext();
    setTaps((current) => [...current, context.currentTime]);
  }, []);

  const estimate = estimateLead(taps, clicksRef.current, leadMs / 1000);
  // What the taps say the lead should be, against what it is now.
  const suggested =
    estimate === null
      ? null
      : Math.round(
          Math.min(AUDIO_LEAD_RANGE.max, Math.max(AUDIO_LEAD_RANGE.min, estimate.leadMs)),
        );
  const offsetMs = estimate === null ? null : estimate.leadMs - leadMs;
  const inTime = offsetMs !== null && Math.abs(offsetMs) <= IN_TIME_MS;

  return (
    <div className="screen">
      <header className="masthead">
        <h1>{initial.id ? `Measure ${initial.name}` : 'Add an output'}</h1>
        {/*
          * What the screen is doing, said once and plainly. "How does this
          * work" was the first question asked of it, and it had no answer on
          * it anywhere.
          */}
        <p>
          The app cannot hear itself, so you are the measurement. A click sounds once a second.
          Listen through the output you want to measure and tap the button in time with what you{' '}
          <em>hear</em> — each tap lands as late as the sound does, and the app takes the middle of
          them.
        </p>
      </header>

      <div className="calibrate">
        {/*
          * The dot is the clock: it flashes on the beat the sound is *aiming*
          * at. So it belongs to the checking, not to the tapping — tap along
          * with it and you measure your own eyes rather than the device, which
          * is why the screen used to say "not with the dot" while a note
          * further down said to use it. One job at a time: it appears once
          * there is a reading to check.
          */}
        {estimate !== null && (
          <div className={`calibrate__pulse ${pulsing ? 'is-on' : ''}`} aria-hidden="true" />
        )}

        <button type="button" className="calibrate__tap" onPointerDown={tap}>
          Tap with the click
        </button>

        <p className="calibrate__reading" aria-live="polite">
          {estimate === null
            ? taps.length === 0
              ? 'Waiting for your first tap.'
              : `${taps.length} of ${MIN_TAPS} taps…`
            : inTime
              ? `In time — your taps land within ${IN_TIME_MS} ms of the click. ` +
              `The dot and the click should now land together.`
              : offsetMs! > 0
                ? `Your taps land ${offsetMs} ms after the click.`
                : `Your taps land ${-offsetMs!} ms before the click.`}
        </p>

        {estimate !== null && !inTime && suggested !== null && suggested !== leadMs && (
          <button
            type="button"
            className="button button--primary"
            onClick={() => setLeadMs(suggested)}
          >
            Bring the sound forward {suggested} ms
          </button>
        )}

        <label className="field">
          <span className="field__label">
            Sound brought forward <strong>{leadMs}</strong> ms
          </span>
          <input
            type="range"
            min={AUDIO_LEAD_RANGE.min}
            max={AUDIO_LEAD_RANGE.max}
            step={5}
            value={leadMs}
            onChange={(event) => setLeadMs(Number(event.target.value))}
          />
          <p className="field__note muted">
            The dot flashes where the beat is. Nudge this until the click lands on it.
          </p>
          {/* Guidance only, never applied by itself: for one evening the app
              floored the lead at this figure, and on real hardware the report
              exceeded reality by most of a second — every sound ran ahead of
              the page. What the browser estimates is a place to start tapping
              from; the ear against the click is the measurement. */}
          {reportedMs !== null && (
            <p className="field__note muted">
              This browser estimates its own output delay at about {reportedMs} ms — a starting
              point, not a measurement. Trust your ear over it.
            </p>
          )}
        </label>

        <label className="field">
          <span className="field__label">Name</span>
          <input
            type="text"
            value={name}
            placeholder="Headphones"
            autoCapitalize="words"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
      </div>

      <div className="actions">
        <button
          type="button"
          className="button button--primary button--large"
          onClick={() => onSave({ id: initial.id, name, leadMs })}
        >
          Save
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
