import { useState } from 'react';
import { unlockAudio } from '../audio/context';
import { CalibrationScreen, type Calibration } from './CalibrationScreen';
import {
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
        settings={settings}
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
