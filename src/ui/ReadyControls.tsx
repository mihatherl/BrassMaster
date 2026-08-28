/**
 * The Ready screen's controls: how this run will go.
 *
 * The gate exists because the browser demands a gesture before audio may
 * start, so every player passes through it every run — which makes it free
 * real estate, and the right home for the playback choices that used to live
 * two panels deep on the settings screen (ruled by the player, 2026-08-23).
 * The rule for what may appear on the face: *changed often, and changes the
 * run about to start.* Reading mode, what keeps the beat, whether the notes
 * sound, fingerings, and the tempo. Everything else — the calibrations of
 * feel, set once when their numbers start to mean something — sits behind the
 * cog on the same screen, one tap away rather than a screen away.
 *
 * This is not a defaults-and-overrides system. Everything here is the same
 * settings store the app has always had: what is set on this screen sticks
 * for next time, exactly as it did when it lived on the settings screen. The
 * split is purely about where controls are surfaced, sorted by frequency of
 * touch.
 */

import { type ReactNode } from 'react';
import { metreFor } from '../domain/metre';
import { previewClick } from '../audio/metronome';
import { styleName } from '../render/conductor';
import { toleranceFor } from '../engine/judge';
import { REACTIVE_SOUND_MAX_LEAD } from '../engine/session';
import { corpusSummary } from '../exercise/corpus';
import { t, type StringKey } from '../i18n';
import {
  audioLeadFor,
  CONDUCTOR_STYLE_RANGE,
  CUSHION_RANGE,
  FINGERING_MODES,
  METRONOME_VOLUME_RANGE,
  PLAYBACK_MODES,
  READING_MODES,
  SCROLL_SPEED_RANGE,
  TEMPO_RANGE,
  TIMING_TOLERANCE_RANGE,
  type Settings,
} from '../storage/settings';

const CORPUS = corpusSummary();

interface ReadyControlsProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  /** The outputs room; absent hides the doors to it. */
  onOutputs?: () => void;
  /**
   * Settings keys a course has pinned for this run (2026-08-27). Pinned
   * controls show disabled rather than hidden — a player who cannot find the
   * switch thinks the app is broken; one who sees it locked knows the course
   * chose — and the note beside them says who did the choosing.
   */
  pinned?: readonly string[];
}

/**
 * The home screen's accordion, uncontrolled: each section closed until asked,
 * its summary line reciting what is chosen — so the face of the gate is five
 * short lines that answer at a glance, and any of them is one tap from its
 * controls (asked for by the player, 2026-08-23, when the flat list of cards
 * read as one undifferentiated wall).
 */
function Section({ title, values, children }: { title: string; values: string; children: ReactNode }) {
  return (
    <details className="panel">
      <summary className="panel__summary">
        <span className="panel__heading">
          <span className="panel__title">{title}</span>
          <span className="panel__values">{values}</span>
        </span>
      </summary>
      {children}
    </details>
  );
}

export function ReadyControls({ settings, onChange, onOutputs, pinned }: ReadyControlsProps) {
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });
  const isPinned = (key: keyof Settings) => pinned?.includes(key) ?? false;

  const metre = metreFor(settings.beatsPerBar, settings.beatUnit);
  const output = settings.audioOutputs.find((o) => o.id === settings.audioOutputId);

  /*
   * "Nothing keeps time" doubles as the warning the gate used to spell out in
   * a paragraph: with both time-keepers off in paged reading there is nothing
   * at all to count against, and the summary line now says so at a glance
   * instead of the prose saying it at length.
   */
  const beat =
    settings.metronomeEnabled && settings.conductorEnabled
      ? t('beat.both')
      : settings.metronomeEnabled
        ? t('gate.metronome')
        : settings.conductorEnabled
          ? t('gate.conductor')
          : t('beat.none');

  return (
    <div className="ready-controls">
      {/*
       * The tempo's fourth home, and each move has been the player's ruling:
       * beside Start (2026-08-12), into the Playing panel, onto the gate, and
       * now OUT of the gate's accordion onto its face, directly under Start —
       * "that is one control that needs elevating" (2026-08-23). The pattern
       * across all four: every other setting is occasional, and the tempo is
       * every session, so wherever the Start button lives, the tempo belongs
       * in its shadow.
       */}
      <label className="field tempo">
        <span className="field__label">
          {t('gate.tempo')} <strong>{settings.tempo}</strong> bpm
        </span>
        <input
          type="range"
          min={TEMPO_RANGE.min}
          max={TEMPO_RANGE.max}
          step={1}
          value={settings.tempo}
          onChange={(event) => update('tempo', Number(event.target.value))}
        />
        {metre.isCompound && (
          <p className="field__note muted">
            {t('gate.compound', { n: metre.pulsesPerBar })}
          </p>
        )}
      </label>

      <Section
        title={t('gate.reading')}
        values={t(`reading.${settings.readingMode}` as StringKey)}
      >
        <div className="field">
          <div className="cards cards--two">
            {READING_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`card card--compact ${settings.readingMode === mode.id ? 'is-selected' : ''}`}
                onClick={() => update('readingMode', mode.id)}
              >
                <strong>{t(`reading.${mode.id}` as StringKey)}</strong>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t('gate.beat')} values={beat}>
        {/* Two switches, one line: the pair answers one question. */}
        <div className="field field-row">
          <label className="field field--inline">
            <input
              type="checkbox"
              checked={settings.metronomeEnabled}
              disabled={isPinned('metronomeEnabled')}
              onChange={(event) => update('metronomeEnabled', event.target.checked)}
            />
            <span>{t('gate.metronome')}</span>
          </label>
          <label className="field field--inline">
            <input
              type="checkbox"
              checked={settings.conductorEnabled}
              disabled={isPinned('conductorEnabled')}
              onChange={(event) => update('conductorEnabled', event.target.checked)}
            />
            <span>{t('gate.conductor')}</span>
          </label>
        </div>
        {(isPinned('metronomeEnabled') || isPinned('conductorEnabled')) && (
          <p className="field__note muted">{t('gate.setByCourse')}</p>
        )}

        {/*
         * Under the switch that turns it on, and hidden with it: a level for a
         * click nobody is hearing is a control with nothing to do. Same shape
         * as the conductor's style slider directly below, for the same reason.
         */}
        {settings.metronomeEnabled && (
          <label className="field">
            <span className="field__label">
              {t('gate.metronomeVolume')} <strong>{Math.round(settings.metronomeVolume * 100)}%</strong>
            </span>
            <input
              type="range"
              min={METRONOME_VOLUME_RANGE.min}
              max={METRONOME_VOLUME_RANGE.max}
              step={0.05}
              value={settings.metronomeVolume}
              onChange={(event) => {
                const volume = Number(event.target.value);
                update('metronomeVolume', volume);
                /* Heard as it is chosen. The metronome otherwise only sounds
                   during a run, which made this the one setting a player could
                   not judge without starting one. Throttled inside. */
                previewClick(volume);
              }}
            />
            <p className="field__note muted">{t('gate.metronomeVolumeNote')}</p>
          </label>
        )}
      </Section>

      <Section
        title={t('gate.sound')}
        values={t(`playback.${settings.playbackMode}` as StringKey)}
      >
        <div className="field">
          <div className="cards cards--two">
            {PLAYBACK_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`card card--compact ${settings.playbackMode === mode.id ? 'is-selected' : ''}`}
                onClick={() => update('playbackMode', mode.id)}
              >
                <strong>{t(`playback.${mode.id}` as StringKey)}</strong>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section
        title={t('gate.fingerings')}
        values={t(`fingerings.${settings.fingerings}` as StringKey)}
      >
        <div className="field">
          <div className="cards cards--two">
            {FINGERING_MODES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className={`card card--compact ${settings.fingerings === choice.id ? 'is-selected' : ''}`}
                onClick={() => update('fingerings', choice.id)}
              >
                <strong>{t(`fingerings.${choice.id}` as StringKey)}</strong>
              </button>
            ))}
          </div>
        </div>
      </Section>

      <Section title={t('gate.preferences')} values="">
        <label className="field field--inline">
          <input
            type="checkbox"
            checked={settings.variableTempo}
            onChange={(event) => update('variableTempo', event.target.checked)}
          />
          <span>{t('gate.variableTempo')}</span>
        </label>

        {settings.readingMode === 'scrolling' && (
          <label className="field">
            <span className="field__label">
              {t('gate.scrollSpeed')} <strong>{settings.scrollSpeed}</strong>
            </span>
            <input
              type="range"
              min={SCROLL_SPEED_RANGE.min}
              max={SCROLL_SPEED_RANGE.max}
              step={10}
              value={settings.scrollSpeed}
              onChange={(event) => update('scrollSpeed', Number(event.target.value))}
            />
            <p className="field__note muted">{t('gate.scrollSpeedNote')}</p>
          </label>
        )}

        {settings.conductorEnabled && (
          <label className="field">
            <span className="field__label">
              {t('gate.conductorStyle')}{' '}
              <strong>{t(`conductorStyle.${styleName(settings.conductorStyle)}` as StringKey)}</strong>
            </span>
            <input
              type="range"
              min={CONDUCTOR_STYLE_RANGE.min}
              max={CONDUCTOR_STYLE_RANGE.max}
              step={0.05}
              value={settings.conductorStyle}
              onChange={(event) => update('conductorStyle', Number(event.target.value))}
            />
            <p className="field__note muted">{t('gate.conductorStyleNote')}</p>
          </label>
        )}

        {settings.playbackMode !== 'off' && (
          <label className="field">
            <span className="field__label">
              {t('gate.cushion')} <strong>{Math.round(settings.cushionLevel * 100)}%</strong>
            </span>
            <input
              type="range"
              min={CUSHION_RANGE.min * 100}
              max={CUSHION_RANGE.max * 100}
              step={5}
              value={Math.round(settings.cushionLevel * 100)}
              onChange={(event) => update('cushionLevel', Number(event.target.value) / 100)}
            />
            <p className="field__note muted">{t('gate.cushionNote')}</p>
            {audioLeadFor(settings) > REACTIVE_SOUND_MAX_LEAD && (
              <p className="field__note muted">
                {t('gate.cushionOff', { ms: Math.round(audioLeadFor(settings) * 1000) })}
              </p>
            )}
          </label>
        )}

        <label className="field">
          <span className="field__label">
            {t('gate.timingTolerance')}{' '}
            <strong>
              ±{Math.round(toleranceFor(60 / settings.tempo, settings.timingTolerance) * 1000)}{' '}
              ms
            </strong>
          </span>
          <input
            type="range"
            min={TIMING_TOLERANCE_RANGE.min * 100}
            max={TIMING_TOLERANCE_RANGE.max * 100}
            step={25}
            value={Math.round(settings.timingTolerance * 100)}
            onChange={(event) => update('timingTolerance', Number(event.target.value) / 100)}
          />
        </label>

        <label className="field">
          <span className="field__label">{t('gate.countIn')}</span>
          <select
            value={settings.countInBars}
            onChange={(event) => update('countInBars', Number(event.target.value))}
          >
            <option value={0}>{t('gate.countIn.none')}</option>
            <option value={1}>{t('gate.countIn.1')}</option>
            <option value={2}>{t('gate.countIn.2')}</option>
          </select>
        </label>

        <p className="field__note muted credits">
          Instrument samples from FluidR3_GM by Frank Wen, licensed{' '}
          <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
            CC-BY 3.0
          </a>
          . Notation drawn with Bravura by Steinberg, SIL OFL 1.1.
        </p>
        <p className="field__note muted credits">
          v{__APP_VERSION__} · build {__BUILD_TIME__} · corpus {CORPUS.revision} ({CORPUS.cells}{' '}
          cells)
        </p>
      </Section>

      <p className="field__note muted ready-output">
        {!output
          ? 'No output chosen.'
          : output.calibrations === 0
            ? `${output.name} — not measured yet.`
            : output.leadMs > 0
              ? `${output.name} — sound brought forward ${output.leadMs} ms.`
              : `${output.name} — measured, on the beat.`}{' '}
        {onOutputs && (
          <button type="button" className="button button--quiet ready-output__link" onClick={onOutputs}>
            {output && output.calibrations === 0 ? 'Measure it' : 'Outputs'}
          </button>
        )}
      </p>
    </div>
  );
}
