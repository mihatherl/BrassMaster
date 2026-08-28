/**
 * The keys as chips, three rows of five — one grid, drawn wherever a key is
 * chosen.
 *
 * Extracted from `SettingsScreen` on 2026-08-29, when the Ready gate gained a
 * key control of its own and the player asked for *the same format as is on
 * the settings screen*. Two copies of this layout would have drifted: the row
 * arithmetic, the accidental count and the class names are all shared, and a
 * key chip that looked like a key chip on one screen and not the other is
 * exactly the kind of small wrongness a player notices without being able to
 * say why.
 *
 * **Presentational only, and deliberately so.** The two callers disagree about
 * what a click *means* — the home screen builds an ordered set with a cap and
 * a first-is-the-start rule, the gate answers one question with one key — so
 * the rules stay with them and only the drawing lives here. That is why the
 * selection arrives as predicates rather than as a `keySet`.
 */

import { MAJOR_KEYS, describeFifths } from '../domain/keys';

const KEYS_PER_ROW = 5;

const KEY_ROWS = Array.from(
  { length: Math.ceil(MAJOR_KEYS.length / KEYS_PER_ROW) },
  (_, row) => MAJOR_KEYS.slice(row * KEYS_PER_ROW, row * KEYS_PER_ROW + KEYS_PER_ROW),
);

/**
 * A key's accidentals as a symbol and a count: `3♭`, `2♯`, or nothing for C.
 *
 * Enough for a player to recognise a key they half-know without the sentence
 * the dropdown used to spell out. The full wording is still there for a screen
 * reader, which cannot make anything of a sharp sign on its own.
 */
export function accidentalCount(fifths: number): string {
  if (fifths === 0) return '';
  return `${Math.abs(fifths)}${fifths > 0 ? '♯' : '♭'}`;
}

export interface KeyGridProps {
  /** What to call a signature — major or relative minor, per the caller. */
  keyName: (fifths: number, short?: boolean) => string;
  /** Whether this key is in the selection. */
  isSelected: (fifths: number) => boolean;
  /** Whether it is the key the exercise opens in. Absent means none is. */
  isStart?: (fifths: number) => boolean;
  /** Whether it cannot be pressed, and why the caller says so. */
  isDisabled?: (fifths: number) => boolean;
  onPick: (fifths: number) => void;
}

export function KeyGrid({ keyName, isSelected, isStart, isDisabled, onPick }: KeyGridProps) {
  return (
    <div className="keys">
      {KEY_ROWS.map((row) => (
        <div className="keys__row" key={row[0].fifths}>
          {row.map((key) => {
            const chosen = isSelected(key.fifths);
            return (
              <button
                key={key.fifths}
                type="button"
                disabled={isDisabled?.(key.fifths) ?? false}
                aria-pressed={chosen}
                // The accidentals are shown as "3♭" beside the name, which a
                // screen reader would spell out as a number and a symbol.
                aria-label={`${keyName(key.fifths)}, ${describeFifths(key.fifths)}`}
                className={`segmented__option key ${chosen ? 'is-selected' : ''} ${
                  isStart?.(key.fifths) ? 'is-start' : ''
                }`}
                onClick={() => onPick(key.fifths)}
              >
                <span className="key__name">{keyName(key.fifths, true)}</span>
                <span className="key__accidentals muted">{accidentalCount(key.fifths)}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
