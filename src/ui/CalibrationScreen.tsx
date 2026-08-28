/*
 * Measuring an output's latency by eye and ear rather than by finger.
 *
 * **This replaced tapping on 2026-08-22, and the reason is that tapping
 * measured the wrong thing.** The player tapped along with a click and the
 * offsets said how late the sound was — except that a tap's time is taken when
 * the pointer event runs, not when the finger met the glass, so the touch
 * screen's own latency was folded into the answer and attributed to the audio
 * output. On a budget Android that is tens of milliseconds of pure bias, all
 * of it in the same direction, and the app compensated by that much too much.
 * Tapping to a beat also anticipates it, by a few tens of milliseconds that
 * vary from person to person. Two confounds, one of them systematic, and the
 * reviewer's verdict was simply that he *"can't get a good read on it"*.
 *
 * So the player judges instead of taps: a scale scrolls past the strike line,
 * each note sounds as its notehead crosses, and a dial moves the sound until
 * the two coincide.
 *
 * **What makes this the *right* measurement, and not merely a nicer one, is
 * that the display's own lag cancels.** The app is not trying to learn a
 * physical truth; it is trying to make what a player sees and what they hear
 * arrive together *on the screen they will be reading from*. Both terms are
 * present here and both are present in play, so the relationship is what gets
 * calibrated. There is no motor path at all, so neither touch latency nor
 * anticipation can get in.
 *
 * What it costs: this is a null point rather than a number, so two sittings
 * may land tens of milliseconds apart — which is about the width of the window
 * being aimed at anyway. And audiovisual simultaneity is asymmetric, sound
 * after vision being far more tolerable than before it, so a player creeping
 * up from one side will settle late. Hence two nudges rather than one dial:
 * the null is easier to find from both sides than from either.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAudioContext } from '../audio/context';
import { Sampler, type Voice } from '../audio/sampler';
import { BrassSynth } from '../audio/synth';
import { instrumentById } from '../domain/instruments';
import { metreFor } from '../domain/metre';
import { difficultyById } from '../exercise/difficulty';
import { generateExercise } from '../exercise/generate';
import { Transport } from '../engine/clock';
import { currentTheme, StaveRenderer } from '../render/surface';
import { AUDIO_LEAD_RANGE, type Settings } from '../storage/settings';
import { t } from '../i18n';

/**
 * Crotchets a minute while calibrating.
 *
 * One note a second: slow enough that each notehead meets the line on its own,
 * and slow enough that a player has time to attend to the coincidence rather
 * than to keeping up.
 */
export const CALIBRATION_BPM = 60;

/** What one nudge moves the sound by. Fine enough to find a null, coarse
 *  enough to get somewhere. */
const NUDGE_MS = 10;

export interface Calibration {
  /** The output's id, or null while it is new and unnamed. */
  id: string | null;
  name: string;
  leadMs: number;
}

interface CalibrationScreenProps {
  initial: Calibration;
  settings: Settings;
  onSave: (result: Calibration) => void;
  onCancel: () => void;
}

export function CalibrationScreen({ initial, settings, onSave, onCancel }: CalibrationScreenProps) {
  const [leadMs, setLeadMs] = useState(initial.leadMs);
  const [name, setName] = useState(initial.name);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const transportRef = useRef<Transport | null>(null);

  /*
   * A plain scale in crotchets, on the player's own instrument.
   *
   * Beginner deliberately: its scale setting is plain crotchets end to end,
   * and an even pulse is what makes a coincidence easy to judge. Built once —
   * the music must not change under a player who is comparing two moments.
   */
  const exercise = useMemo(
    () =>
      generateExercise({
        instrument: instrumentById(settings.instrumentId),
        clef: settings.clef,
        fifths: 0,
        keySet: [0],
        difficulty: difficultyById('beginner'),
        kind: 'drills',
        drillId: 'major-scale',
        bars: 40,
        cycles: 12,
        // Required of every caller, and meaningless for a drill.
        themeCount: 0,
        metre: metreFor(4, 4),
        seed: 1,
        tempo: CALIBRATION_BPM,
      }),
    [settings.instrumentId, settings.clef],
  );

  /*
   * The dial, moving the sound under the running music.
   *
   * Nothing else moves with it: the clock, the scrolling and the notation are
   * untouched, and only notes not yet handed to the audio thread land
   * anywhere new. See `Transport.audioLead`.
   */
  useEffect(() => {
    if (transportRef.current) transportRef.current.audioLead = leadMs / 1000;
  }, [leadMs]);

  useEffect(() => {
    if (!exercise) return;
    const context = getAudioContext();
    const transport = new Transport(context, CALIBRATION_BPM, [], 1, leadMs / 1000);
    transportRef.current = transport;

    let renderer: StaveRenderer | undefined;
    let voice: Voice | undefined;
    let stopped = false;

    void (async () => {
      try {
        voice = await Sampler.load(context, instrumentById(settings.instrumentId).sampleSet);
      } catch {
        // Offline before the samples were ever cached. Synthesis still sounds,
        // and a synthesised note crosses the line at the same instant.
        voice = new BrassSynth(context);
      }
      if (stopped) return;

      const canvas = canvasRef.current;
      if (canvas) {
        renderer = new StaveRenderer({
          canvas,
          exercise,
          transport,
          theme: currentTheme(),
          scrollSpeed: settings.scrollSpeed,
          // Always scrolling, whatever the player reads with: a strike line is
          // the thing being calibrated against, and a page has none.
          readingMode: 'scrolling',
          verdictFor: () => undefined,
        });
        renderer.start();
      }

      transport.start((from, to) => {
        for (const note of exercise.notes) {
          if (note.startBeat < from || note.startBeat >= to) continue;
          voice?.play(
            note.soundingMidi,
            transport.audioTimeForBeat(note.startBeat),
            /* Shorter than the gap, so each note stops before the next begins
               and the coincidence being judged is an attack rather than a
               change of pitch inside one long sound. */
            0.6 * (60 / CALIBRATION_BPM),
          );
        }
      });
    })();

    return () => {
      stopped = true;
      transport.stop();
      renderer?.stop();
      voice?.stop();
      transportRef.current = null;
    };
    // Built once: the music and the clock must not restart under a judgement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise]);

  const nudge = (by: number) =>
    setLeadMs((ms) =>
      Math.round(Math.min(AUDIO_LEAD_RANGE.max, Math.max(AUDIO_LEAD_RANGE.min, ms + by))),
    );

  return (
    <div className="screen">
      <header className="masthead">
        <h1>{initial.id ? t('calibrate.title', { name: initial.name }) : t('outputs.add')}</h1>
        <p>{t('calibrate.intro')}</p>
      </header>

      <div className="calibrate">
        <canvas ref={canvasRef} className="calibrate__stave" />

        {/* Two nudges rather than one, so the null can be approached from
            either side: sound after vision is far more tolerable than sound
            before it, and a player creeping up from one direction alone will
            settle late. */}
        <div className="calibrate__nudges">
          <button type="button" className="button" onClick={() => nudge(NUDGE_MS)}>
            {t('calibrate.late')}
          </button>
          <button type="button" className="button" onClick={() => nudge(-NUDGE_MS)}>
            {t('calibrate.early')}
          </button>
        </div>

        <label className="field">
          <span className="field__label">
            {t('calibrate.lead')} <strong>{leadMs}</strong> ms
          </span>
          <input
            type="range"
            min={AUDIO_LEAD_RANGE.min}
            max={AUDIO_LEAD_RANGE.max}
            step={5}
            value={leadMs}
            onChange={(event) => setLeadMs(Number(event.target.value))}
            aria-label={t('calibrate.leadAria')}
          />
          <p className="field__note muted">{t('calibrate.drag')}</p>
        </label>

        {!initial.id && (
          <label className="field">
            <span className="field__label">{t('calibrate.name')}</span>
            <input
              type="text"
              value={name}
              placeholder={t('calibrate.namePlaceholder')}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
        )}
      </div>

      <div className="actions">
        <button
          type="button"
          className="button button--primary button--large"
          onClick={() => onSave({ id: initial.id, name, leadMs })}
        >
          {t('common.save')}
        </button>
        <button type="button" className="button button--quiet" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}
