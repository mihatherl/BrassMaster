/**
 * The settings a course or a level pins — one component, both scopes.
 *
 * The course says a thing once and every level that does not say it plays
 * it (`resolveLevelDocument` in `exercise/course.ts` is the rule; this is
 * the face of it). So the same controls serve both, and **inheritance shows
 * in the empty option**: where a level is taking the course's answer, the
 * control reads "Course default: 66" rather than "Player's choice", and
 * picking a real value overrides it for that level alone. Choosing the
 * empty option again hands it back to the course.
 *
 * That is the mechanism for a *scalar*. An inherited **axis** cannot show
 * in a dropdown — it is a shape, not a value — so it shows in the timeline
 * itself, ghosted, with a button to take a copy. Two different things,
 * two different mechanisms, which is what the player asked for.
 *
 * Nothing here is translated: the editor is an author's tool and is
 * deliberately outside the i18n sweep (`i18n/index.ts` says so).
 */

import type { ReactElement } from 'react';
import { LENGTH_UNIT_FOR, type LevelKind } from '../exercise/course';
import { DIFFICULTIES } from '../exercise/difficulty';
import { DRILLS } from '../exercise/generate';
import { MAJOR_KEYS } from '../domain/keys';
import { OFFERED_METRES } from '../domain/metre';

interface PrescriptionProps {
  scope: 'course' | 'level';
  /** The raw record this edits: the document itself, or one level. */
  record: Record<string, unknown>;
  /** What a level would take from the course — its `base` and its fields. */
  inherited?: { base: Record<string, unknown>; fields: Record<string, unknown> };
  /** Parameters this scope moves on the timeline, its own or inherited. */
  onTimeline: ReadonlySet<string>;
  /** Of those, the ones that belong to the course rather than this level. */
  fromCourse?: ReadonlySet<string>;
  onPatch: (changes: Record<string, unknown>) => void;
  onPatchBase: (changes: Record<string, unknown>) => void;
}

const SUPPORT = [
  ['metronomeEnabled', 'Metronome', ['on', 'off']],
  ['conductorEnabled', 'Conductor', ['on', 'off']],
  ['fingerings', 'Fingerings', ['always', 'trouble', 'never']],
  ['playbackMode', 'Sound', ['reference', 'off']],
  ['readingMode', 'Reading', ['scrolling', 'paged']],
] as const;

const REACHES: ReadonlyArray<[number, string]> = [
  [7, 'A fifth'],
  [12, 'One octave'],
  [19, 'An octave and a fifth'],
  [24, 'Two octaves'],
];

export function Prescription({
  scope,
  record,
  inherited,
  onTimeline,
  fromCourse,
  onPatch,
  onPatchBase,
}: PrescriptionProps): ReactElement {
  const base = (record.base ?? {}) as Record<string, unknown>;
  const from = inherited ?? { base: {}, fields: {} };

  /** The material in force here — this scope's, or the one it inherits. */
  const kind = (base.kind ?? from.base.kind) as LevelKind | undefined;

  /**
   * What the empty option says. On a level with something to inherit it
   * names the course's answer, so the author can see what they are taking
   * before they decide to leave it.
   */
  const empty = (field: string, home: 'base' | 'level', otherwise: string, show?: (v: unknown) => string) => {
    if (onTimeline.has(field)) {
      return fromCourse?.has(field) ? 'On the course’s timeline' : 'On the timeline';
    }
    const value = home === 'base' ? from.base[field] : from.fields[field];
    if (scope === 'level' && value !== undefined) {
      return `Course default: ${show ? show(value) : String(value)}`;
    }
    return otherwise;
  };

  /** True where this scope is silent and the course is speaking. */
  const inheriting = (field: string, home: 'base' | 'level') => {
    const own = home === 'base' ? base[field] : record[field];
    const above = home === 'base' ? from.base[field] : from.fields[field];
    return scope === 'level' && own === undefined && above !== undefined;
  };
  const mark = (field: string, home: 'base' | 'level') =>
    inheriting(field, home) ? 'is-inherited' : '';

  const locked = (field: string) => onTimeline.has(field);
  const unit = kind ? LENGTH_UNIT_FOR[kind] : undefined;

  return (
    <>
      <div className="row">
        <label className={mark('kind', 'base')}>
          Material
          <select
            value={base.kind === undefined ? '' : String(base.kind)}
            onChange={(e) =>
              onPatchBase({ kind: e.target.value === '' ? undefined : e.target.value })
            }
          >
            <option value="">
              {scope === 'course'
                ? 'Each level says'
                : empty('kind', 'base', 'Drills', (v) =>
                    v === 'phrases' ? 'Sight-reading' : v === 'themes' ? 'Themes' : 'Drills',
                  )}
            </option>
            <option value="drills">Drills</option>
            <option value="phrases">Sight-reading</option>
            <option value="themes">Themes</option>
          </select>
        </label>
        {kind === 'drills' && (
          <label className={mark('drillId', 'base')}>
            Drill
            <select
              value={base.drillId === undefined ? '' : String(base.drillId)}
              onChange={(e) =>
                onPatchBase({ drillId: e.target.value === '' ? undefined : e.target.value })
              }
            >
              <option value="">
                {scope === 'course'
                  ? 'Each level says'
                  : empty('drillId', 'base', 'Major scale', (v) =>
                      String(DRILLS.find((d) => d.id === v)?.name ?? v),
                    )}
              </option>
              {DRILLS.map((drill) => (
                <option key={drill.id} value={drill.id}>
                  {drill.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={mark('difficultyId', 'base')}>
          Difficulty
          <select
            value={base.difficultyId === undefined ? '' : String(base.difficultyId)}
            onChange={(e) =>
              onPatchBase({ difficultyId: e.target.value === '' ? undefined : e.target.value })
            }
          >
            <option value="">
              {scope === 'course'
                ? 'Each level says'
                : empty('difficultyId', 'base', 'Easy', (v) =>
                    String(DIFFICULTIES.find((d) => d.id === v)?.name ?? v),
                  )}
            </option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty.id} value={difficulty.id}>
                {difficulty.name}
              </option>
            ))}
          </select>
        </label>
        <label className={mark('fifths', 'base')}>
          Key
          <select
            value={base.fifths === undefined ? '' : String(base.fifths)}
            disabled={locked('fifths')}
            onChange={(e) =>
              onPatchBase({ fifths: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          >
            {/*
              Says what happens, not what it is not. "Player's own" was
              accurate and useless: it named a key the author could not
              predict and — until the gate gained a key control on
              2026-08-29 — the player could not reach either.
            */}
            <option value="">
              {empty('fifths', 'base', 'Player chooses, at the gate', (v) =>
                String(MAJOR_KEYS.find((k) => k.fifths === v)?.name ?? v),
              )}
            </option>
            {MAJOR_KEYS.map((key) => (
              <option key={key.fifths} value={key.fifths}>
                {key.name} major
              </option>
            ))}
          </select>
        </label>
        {kind === 'drills' && (
          <label className={mark('register', 'base')}>
            Register
            <select
              value={base.register === undefined ? '' : String(base.register)}
              disabled={locked('register')}
              onChange={(e) =>
                onPatchBase({ register: e.target.value === '' ? undefined : e.target.value })
              }
            >
              <option value="">{empty('register', 'base', 'Middle')}</option>
              <option value="low">Low</option>
              <option value="middle">Middle</option>
              <option value="high">High</option>
            </select>
          </label>
        )}
        {unit && (
          <label className={mark(unit, 'base')}>
            {kind === 'phrases' ? 'Bars' : kind === 'themes' ? 'Tunes' : 'Cycles'}
            <input
              type="number"
              min={1}
              step={1}
              placeholder={empty(unit, 'base', 'default')}
              disabled={locked(unit)}
              value={base[unit] === undefined ? '' : String(base[unit])}
              onChange={(e) =>
                /* The other two units are cleared, not left lying: a level
                   switched from drills to sight-reading would otherwise
                   carry a `cycles` the reader refuses by name. */
                onPatchBase({
                  bars: undefined,
                  cycles: undefined,
                  themeCount: undefined,
                  [unit]: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
        )}
        {kind === 'drills' && (
          <label className={mark('spanSemitones', 'base')}>
            Reach
            <select
              value={base.spanSemitones === undefined ? '' : String(base.spanSemitones)}
              disabled={locked('span')}
              onChange={(e) =>
                onPatchBase({
                  spanSemitones: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            >
              <option value="">
                {onTimeline.has('span')
                  ? fromCourse?.has('span')
                    ? 'On the course’s timeline'
                    : 'On the timeline'
                  : empty('spanSemitones', 'base', 'Difficulty’s own', (v) =>
                      String(REACHES.find(([s]) => s === v)?.[1] ?? `${v} semitones`),
                    )}
              </option>
              {REACHES.map(([semitones, name]) => (
                <option key={semitones} value={semitones}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}
        {kind !== undefined && kind !== 'drills' && (
          <label className={mark('metre', 'base')}>
            Metre
            <select
              value={Array.isArray(base.metre) ? base.metre.join('/') : ''}
              disabled={locked('metre')}
              onChange={(e) =>
                onPatchBase({
                  metre: e.target.value === '' ? undefined : e.target.value.split('/').map(Number),
                })
              }
            >
              <option value="">
                {empty('metre', 'base', 'Player’s choice', (v) =>
                  Array.isArray(v) ? v.join('/') : String(v),
                )}
              </option>
              {OFFERED_METRES.map(([n, d]) => (
                <option key={`${n}/${d}`} value={`${n}/${d}`}>
                  {n}/{d}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="row">
        {/*
         * Whether the music carries on past the level's length, offering
         * "Continue" instead of ending the run. Off unless asked for: the
         * horizon is free play's feature, and inside a course it took the
         * length of the run back from the author. Ruled 2026-08-29.
         */}
        <label className="check">
          <input
            type="checkbox"
            checked={record.endless === true || (record.endless === undefined && from.fields.endless === true)}
            onChange={(e) => onPatch({ endless: e.target.checked || undefined })}
          />
          Keep playing past the end (offer “Continue”)
          {inheriting('endless', 'level') && <span className="muted"> — from the course</span>}
        </label>
      </div>

      {/*
       * The trichotomy's header half: each of these pins a value, shown
       * locked at the gate. The same parameter moved on the timeline locks
       * the control here — pinned or progressing, never both — and where
       * the course pins it, the empty option says so.
       */}
      <div className="row">
        <label className={mark('tempo', 'level')}>
          Tempo (bpm)
          <input
            type="number"
            min={1}
            placeholder={empty('tempo', 'level', 'player’s dial')}
            disabled={locked('tempo') || typeof record.tempo === 'object'}
            value={typeof record.tempo === 'number' ? String(record.tempo) : ''}
            onChange={(e) =>
              onPatch({ tempo: e.target.value === '' ? undefined : Number(e.target.value) })
            }
          />
        </label>
        {SUPPORT.map(([field, label, choices]) => {
          const onOff = field === 'metronomeEnabled' || field === 'conductorEnabled';
          const current = record[field];
          const shown = current === undefined ? '' : onOff ? (current ? 'on' : 'off') : String(current);
          return (
            <label key={field} className={mark(field, 'level')}>
              {label}
              <select
                value={shown}
                disabled={locked(field)}
                onChange={(e) =>
                  onPatch({
                    [field]:
                      e.target.value === ''
                        ? undefined
                        : onOff
                          ? e.target.value === 'on'
                          : e.target.value,
                  })
                }
              >
                <option value="">
                  {empty(field, 'level', 'Player’s choice', (v) =>
                    onOff ? (v ? 'on' : 'off') : String(v),
                  )}
                </option>
                {choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </>
  );
}
