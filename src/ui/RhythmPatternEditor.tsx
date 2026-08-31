/**
 * The rhythm annotation tool — the player's spec, 2026-08-31:
 *
 * > Build an annotation tool which allows the user to specify a rhythm…
 * > prepopulate a few. There is no stave, just a note length indicator
 * > and rest length indicator. The rhythm goes for at least one (or
 * > otherwise a whole number) of bars.
 *
 * A sequence of duration chips, appended by tapping a length, removed by
 * tapping the chip. The derived count (the positional 1-e-&-a mapping)
 * prints live above the note chips — the same `syllablesFor` the play
 * screen uses, so the tool can never promise a count the run will not
 * speak. Validation is `barsFromTokens`, which is also where the rules
 * live; this file only shows its verdict.
 *
 * Paid: reached only through the Rhythm tab, whose whole body is behind
 * `__HAS_RHYTHM__`, and `check:web` trips on the custom store's key.
 */

import { useMemo, useState, type ReactElement } from 'react';
import { t } from '../i18n';
import {
  barsFromTokens,
  deleteCustomRhythm,
  loadCustomRhythms,
  parsePatternForCount,
  saveCustomRhythm,
  tokenBeats,
  tokensFromBars,
  type RhythmPattern,
  type RhythmToken,
} from '../exercise/rhythm';

const LENGTHS: ReadonlyArray<{ code: RhythmToken['code']; dotted?: boolean; label: string }> = [
  { code: 'w', label: '𝅝' },
  { code: 'h', label: '𝅗𝅥' },
  { code: 'h', dotted: true, label: '𝅗𝅥·' },
  { code: 'q', label: '♩' },
  { code: 'q', dotted: true, label: '♩·' },
  { code: 'e', label: '♪' },
  { code: 'e', dotted: true, label: '♪·' },
  { code: 's', label: '𝅘𝅥𝅯' },
];
/* Rests offer no dots: a dotted rest is two chips, and fewer buttons is
   more tool. The semiquaver rest is absent because its syllable-silence
   is indistinguishable from "too fast to mean anything" at this stage. */
const REST_LENGTHS: ReadonlyArray<{ code: RhythmToken['code']; dotted?: boolean; label: string }> = [
  { code: 'h', label: '𝄼' },
  { code: 'q', label: '𝄽' },
  { code: 'e', label: '𝄾' },
];

const METRES: ReadonlyArray<[number, number]> = [
  [2, 4],
  [3, 4],
  [4, 4],
];

interface RhythmPatternEditorProps {
  /** The pattern being edited, or null for a fresh one. */
  editing: RhythmPattern | null;
  onSaved: (id: string) => void;
  onClose: () => void;
}

export function RhythmPatternEditor({
  editing,
  onSaved,
  onClose,
}: RhythmPatternEditorProps): ReactElement {
  const [name, setName] = useState(editing?.name ?? '');
  const [metre, setMetre] = useState<readonly [number, number]>(editing?.metre ?? [4, 4]);
  const [tokens, setTokens] = useState<RhythmToken[]>(
    () => (editing ? tokensFromBars(editing.bars) : null) ?? [],
  );

  const verdict = useMemo(() => barsFromTokens(tokens, metre), [tokens, metre]);
  const count = useMemo(() => parsePatternForCount(tokens), [tokens]);

  const id =
    editing?.id ??
    `custom-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rhythm'}`;
  const clash =
    !editing && loadCustomRhythms().some((pattern) => pattern.id === id)
      ? 'You already have a rhythm by this name.'
      : null;
  const readyError = 'error' in verdict ? verdict.error : name.trim() === '' ? 'Name it.' : clash;

  return (
    <div className="sheet rhythm-editor" role="dialog" aria-modal="true" aria-label={t('rhythm.editor')}>
      <div className="sheet__body">
        <label className="field">
          <span className="field__label">{t('rhythm.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('rhythm.namePlaceholder')} />
        </label>

        <div className="field">
          <span className="field__label">{t('rhythm.metre')}</span>
          <div className="row">
            {METRES.map(([n, d]) => (
              <button
                key={`${n}/${d}`}
                type="button"
                className={`segmented__option ${metre[0] === n && metre[1] === d ? 'is-selected' : ''}`}
                aria-pressed={metre[0] === n && metre[1] === d}
                onClick={() => setMetre([n, d])}
              >
                {n}/{d}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">{t('rhythm.chips')}</span>
          <div className="rhythm-editor__chips">
            {tokens.map((token, index) => (
              <button
                key={index}
                type="button"
                className={`rhythm-chip ${token.rest ? 'is-rest' : ''}`}
                onClick={() => setTokens(tokens.filter((_, i) => i !== index))}
              >
                <span className="rhythm-chip__count">{token.rest ? '' : (count[index] ?? '·')}</span>
                <span className="rhythm-chip__glyph">
                  {(token.rest ? REST_LENGTHS : LENGTHS).find(
                    (l) => l.code === token.code && Boolean(l.dotted) === Boolean(token.dotted),
                  )?.label ?? token.code}
                </span>
              </button>
            ))}
            {tokens.length === 0 && <span className="muted">{t('rhythm.empty')}</span>}
          </div>
        </div>

        <div className="field">
          <span className="field__label">{t('rhythm.addNote')}</span>
          <div className="row">
            {LENGTHS.map((length) => (
              <button
                key={length.label}
                type="button"
                className="rhythm-add"
                onClick={() =>
                  setTokens([...tokens, { code: length.code, ...(length.dotted ? { dotted: true } : {}) }])
                }
              >
                {length.label}
              </button>
            ))}
          </div>
          <span className="field__label">{t('rhythm.addRest')}</span>
          <div className="row">
            {REST_LENGTHS.map((length) => (
              <button
                key={length.label}
                type="button"
                className="rhythm-add"
                onClick={() => setTokens([...tokens, { code: length.code, rest: true }])}
              >
                {length.label}
              </button>
            ))}
          </div>
        </div>

        <p className={`field__note ${readyError ? '' : 'muted'}`} role="status">
          {readyError ??
            `${'bars' in verdict ? verdict.bars.length : 0} bar${'bars' in verdict && verdict.bars.length === 1 ? '' : 's'} of ${metre[0]}/${metre[1]}, ${tokens.reduce((sum, token) => sum + tokenBeats(token), 0)} beats — ready.`}
        </p>
      </div>

      <div className="sheet__actions">
        {editing && (
          <button
            type="button"
            className="button button--quiet"
            onClick={() => {
              deleteCustomRhythm(editing.id);
              onClose();
            }}
          >
            {t('rhythm.delete')}
          </button>
        )}
        <button type="button" className="button button--quiet" onClick={onClose}>
          {t('rhythm.cancel')}
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={readyError !== null}
          onClick={() => {
            const bars = (verdict as { bars: string[] }).bars;
            saveCustomRhythm({ id, name: name.trim(), metre, stage: 1, bars });
            onSaved(id);
          }}
        >
          {t('rhythm.save')}
        </button>
      </div>
    </div>
  );
}
