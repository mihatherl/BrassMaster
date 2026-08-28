import { useState } from 'react';
import { unlockAudio } from '../audio/context';
import { CalibrationScreen, type Calibration } from './CalibrationScreen';
import { t } from '../i18n';
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
 *
 * **What this screen is not, and cannot be: a routing picker.** Reported
 * 2026-08-23 — a player chose the device's speaker while wearing headphones
 * and the sound stayed in the headphones, which read as a bug. It is the
 * platform: `AudioContext.setSinkId` exists on desktop Chrome and nowhere the
 * app actually runs — not Android Chrome, not any WebView, not iOS — so the
 * phone alone decides where sound goes, and this list only declares which
 * output is in the player's ears so the right lead is in force. The copy
 * below now says so outright, because a selectable list of device names looks
 * exactly like the routing pickers every phone has, and the reader will
 * assume routing until told otherwise.
 *
 * Nor can the names be filled in for the player: `enumerateDevices` hides
 * labels until the microphone permission is granted (a paid feature this
 * build may not even contain), and Android Chrome does not list audio
 * *outputs* at all. The native shell can read the connected route's name from
 * the OS — recorded in the roadmap under Phase 4, along with the better prize
 * it unlocks: switching the profile automatically when the route changes,
 * which retires the "forgot to switch" failure entirely rather than
 * documenting it.
 */
interface OutputScreenProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onBack: () => void;
  /**
   * The OS's name for whatever external hardware the sound is going to, or
   * null when it stays in the handset — provided only where the native shell
   * can read the route, absent on the web, in the same composition-root style
   * as every capability. It prefills the name of a new output (a prefill,
   * never a lock) and is recorded on the output as `routeName`, which is what
   * the automatic profile switch later matches against.
   */
  routeName?: string | null;
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function OutputScreen({ settings, onChange, onBack, routeName }: OutputScreenProps) {
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
        : /* The shell knows what is in the ears and offers its name; the box
             stays the player's to edit. On the web the name starts empty, as
             it always has. */
          { id: null, name: routeName ?? '', leadMs: 0 },
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
      /* The hardware the measurement was made against, where the shell can
         name it. Kept from before when the route has since fallen back to
         the handset: recalibrating an output does not unlink it from the
         device it exists for. Never on the device's own speaker — it is
         matched by its id, and linking it to whatever headphones happened to
         be attached would teach the auto-switch exactly the wrong thing. */
      ...(id !== DEVICE_OUTPUT_ID && (routeName || existing?.routeName)
        ? { routeName: routeName ?? existing?.routeName }
        : {}),
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
        <h1>{t('outputs.title')}</h1>
        <p>{t('outputs.intro')}</p>
        <p>{t('outputs.choosing')}</p>
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
                  ? t('outputs.notMeasured')
                  : t('outputs.lead', { ms: output.leadMs })}
              </span>
            </button>
            <button
              type="button"
              className="button button--quiet library__forget"
              onClick={() => begin(output)}
              aria-label={t(
                output.calibrations === 0 ? 'outputs.measureNamed' : 'outputs.measureNamedAgain',
                { name: output.name },
              )}
            >
              {t('outputs.measure')}
            </button>
            {/* The device's own speaker is the one output every player
                certainly has, and where the app falls back to. */}
            {output.id !== DEVICE_OUTPUT_ID && (
              <button
                type="button"
                className="button button--quiet library__forget"
                onClick={() => forget(output.id)}
                aria-label={t('outputs.forgetNamed', { name: output.name })}
              >
                {t('common.forget')}
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
          {t('outputs.add')}
        </button>
        <button type="button" className="button button--quiet" onClick={onBack}>
          {t('common.back')}
        </button>
      </div>
    </div>
  );
}
