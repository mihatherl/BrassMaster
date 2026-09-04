/**
 * The rhythm annotation tool, second design — the player's, 2026-09-01:
 *
 * > Break each bar up into some number of divisions per beat… the user
 * > colors those divisions… play or rest… [with] a "rearticulation"
 * > marker. From what the user is drawing, some notes appear to identify
 * > how that would look… The cell designer could work on top of this.
 *
 * A step-sequencer grid over the derived stave. The grid's three states
 * (attack/hold/rest — the rearticulation marker turned out to be the data
 * model) are painted by gesture: **drag to paint a note, tap inside it to
 * split, tap its start to delete** — the player's ruled gesture model, no
 * modes. The stave beneath is the engraved truth of the drawing, every
 * note on one written C, ties shown at every beat the ruling splits at —
 * it replaced the first design's chip row outright, because the notation
 * IS the viewer, and it is the bridge the cell designer will cross when
 * the vertical axis unlocks.
 *
 * The first design's validation is mostly gone because the grid makes it
 * unrepresentable: whole bars by construction, nothing past an edge to
 * write into. What remains (`barsFromGrid`): something must attack.
 */

import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { t } from '../i18n';
import { MAJOR_KEYS } from '../domain/keys';
import {
  attackOnsets,
  attacksIn,
  barsFromGrid,
  beatCountLabels,
  beatsPerBar,
  nextDivision,
  deleteCustomRhythm,
  flattenGrid,
  freshGrid,
  gridFromBars,
  inflectedNote,
  loadCustomRhythms,
  movedNote,
  randomNotesFor,
  rebuildGrid,
  reconcileNotes,
  rewrittenIn,
  saveCell,
  saveCustomRhythm,
  type CellNote,
  type GridBeat,
  type RhythmPattern,
} from '../exercise/rhythm';
import { type Clef } from '../domain/instruments';
import { RhythmStavePreview } from './RhythmStavePreview';

const sameBars = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((bar, i) => bar === b[i]);

const METRES: ReadonlyArray<[number, number]> = [
  [2, 4],
  [3, 4],
  [4, 4],
];

interface RhythmPatternEditorProps {
  editing: RhythmPattern | null;
  instrumentId: string;
  clef: Clef;
  onSaved: (id: string) => void;
  onClose: () => void;
}

export function RhythmPatternEditor({
  editing,
  instrumentId,
  clef,
  onSaved,
  onClose,
}: RhythmPatternEditorProps): ReactElement {
  const [name, setName] = useState(editing?.name ?? '');
  const [metre, setMetre] = useState<readonly [number, number]>(editing?.metre ?? [4, 4]);
  const [grid, setGrid] = useState<GridBeat[]>(() => {
    const loaded = editing ? gridFromBars(editing.bars) : null;
    return loaded ?? freshGrid(editing?.metre ?? [4, 4]);
  });
  const cells = useMemo(() => flattenGrid(grid), [grid]);
  /**
   * The line, where a cell is being written over this rhythm — the
   * vertical axis of the same stave (the player's bridge, 2026-09-01,
   * built 2026-09-03). Null is rhythm-only; switching to notes fills
   * the line with tonics, so every attack has a note to drag.
   */
  const [line, setLine] = useState<CellNote[] | null>(null);
  const [cellName, setCellName] = useState('');
  /**
   * The note being edited, if any — click to select, then the arrows or
   * the keyboard move it (the player's own suggestion, 2026-09-03: a
   * drag on a canvas is neither discoverable nor precise, and a
   * selection is both). Dragging still works; this is the other hand.
   */
  const [selected, setSelected] = useState<number | null>(null);
  /**
   * The key the line is written in — the transcriber's lens (the player,
   * 2026-09-03: the page being copied has a signature, and the author
   * should see the same picture). The cell stays degrees underneath and
   * plays in any key; this chooses what the stave SHOWS, and is kept on
   * the cell so re-editing shows what was written.
   */
  const [cellFifths, setCellFifths] = useState(0);

  /**
   * The gesture in flight, decided AT THE PRESS — because the press
   * itself changes the cell, release cannot read the cell to know what
   * the press meant. The first cut did exactly that: a tap on a rest
   * painted an attack, and release then saw "an attack under an unmoved
   * pointer" and deleted the note it had just made — so single notes
   * vanished unless dragged (found by the player, 2026-09-01).
   */
  const gesture = useRef<{ kind: 'paint' | 'delete'; from: number } | null>(null);
  const moved = useRef(false);

  const perBar = beatsPerBar(metre);
  const verdict = useMemo(() => barsFromGrid(grid, metre), [grid, metre]);

  /**
   * A note belongs to its onset (ruled 2026-09-03). The line is seeded
   * when notes are added, but the grid stays editable underneath it —
   * and an attack painted after the seeding had no entry in the line, so
   * it drew (the preview falls back to the tonic) yet could not be
   * dragged, selected or nudged at all. Whenever the engraved bars
   * change, the line reconciles: a surviving onset keeps the note
   * written on it, a new onset arrives on the tonic, a deleted onset
   * takes its note with it — and the selection follows its onset by the
   * same rule. `lineBars` remembers which bars the line currently
   * matches, held across any invalid grid states in between.
   */
  const lineBars = useRef<readonly string[] | null>(null);
  useEffect(() => {
    if (!line || !('bars' in verdict)) return;
    const previous = lineBars.current;
    lineBars.current = verdict.bars;
    if (!previous || sameBars(previous, verdict.bars)) return;
    setLine(reconcileNotes(previous, line, verdict.bars));
    if (selected !== null) {
      const onset = attackOnsets(previous)[selected];
      const index =
        onset === undefined
          ? -1
          : attackOnsets(verdict.bars).findIndex((at) => Math.abs(at - onset) < 1e-6);
      setSelected(index >= 0 ? index : null);
    }
  }, [verdict, line, selected]);

  const id =
    editing?.id ??
    `custom-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'rhythm'}`;
  const clash =
    !editing && loadCustomRhythms().some((pattern) => pattern.id === id)
      ? 'You already have a rhythm by this name.'
      : null;
  const readyError = 'error' in verdict ? verdict.error : name.trim() === '' ? 'Name it.' : clash;

  const press = (index: number) => {
    moved.current = false;
    if (cells[index] === 'rest') {
      gesture.current = { kind: 'paint', from: index };
      setGrid(rebuildGrid(grid, cells.map((cell, i) => (i === index ? 'attack' : cell))));
    } else if (cells[index] === 'hold') {
      // Tap inside a note splits it: the rearticulation gesture.
      gesture.current = null;
      setGrid(rebuildGrid(grid, cells.map((cell, i) => (i === index ? 'attack' : cell))));
    } else {
      gesture.current = { kind: 'delete', from: index };
    }
  };

  const enter = (index: number) => {
    const active = gesture.current;
    if (active?.kind !== 'paint' || index <= active.from) return;
    moved.current = true;
    // Extending absorbs whatever it crosses — the piano-roll's rule.
    setGrid(
      rebuildGrid(
        grid,
        cells.map((cell, i) =>
          i > active.from && i <= index ? 'hold' : i === active.from ? 'attack' : cell,
        ),
      ),
    );
  };

  const release = (index: number) => {
    const active = gesture.current;
    gesture.current = null;
    // Only a press that BEGAN on an attack may delete — a paint that ends
    // where it started is a freshly made note, and it stays.
    if (active?.kind === 'delete' && active.from === index && !moved.current) {
      let end = index + 1;
      while (end < cells.length && cells[end] === 'hold') end++;
      setGrid(rebuildGrid(grid, cells.map((cell, i) => (i >= index && i < end ? 'rest' : cell))));
    }
  };

  const barsNow = grid.length / perBar;
  /**
   * Moves the selected note by whole scale steps — the arrows, and the
   * keyboard while the editor has focus. Past the seventh it carries
   * into the next octave, exactly as the drag does.
   */
  const nudge = (steps: number) => {
    if (selected === null || !line) return;
    setLine(line.map((note, i) => (i === selected ? movedNote(note, steps) : note)));
  };
  /**
   * The ♯/♭ buttons — letter first, then accidental, as the printed part
   * states it (ruled 2026-09-03): a half-step increment was rejected
   * because one press up from G is G sharp OR A flat, and which one is
   * right is what the page being copied says. The author states the
   * spelling; no rule ever guesses. Each button toggles its alteration.
   */
  const inflect = (alter: -1 | 1) => {
    if (selected === null || !line) return;
    setLine(line.map((note, i) => (i === selected ? inflectedNote(note, alter) : note)));
  };
  const selectedNote = selected !== null && line ? line[selected] : undefined;

  const setBars = (bars: number) => {
    setGrid(
      bars <= barsNow
        ? grid.slice(0, bars * perBar)
        : [...grid, ...freshGrid(metre, bars - barsNow)],
    );
  };
  /**
   * The numeral owns its beat, so tapping it cycles the beat's division —
   * four to three and back. The beat's cells reset to rests on the flip,
   * because four states cannot map honestly onto three (ruled with the
   * build, 2026-09-01).
   */
  const toggleDivision = (beatIndex: number) =>
    setGrid(
      grid.map((beat, i) =>
        i === beatIndex
          ? {
              division: nextDivision(beat.division),
              cells: Array(nextDivision(beat.division)).fill('rest') as GridBeat['cells'],
            }
          : beat,
      ),
    );

  return (
    <div
      className="sheet rhythm-editor"
      role="dialog"
      aria-modal="true"
      aria-label={t('rhythm.editor')}
      onKeyDown={(event) => {
        if (selected === null || !line) return;
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          nudge(1);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          nudge(-1);
        }
      }}
    >
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
                onClick={() => {
                  if (metre[0] === n && metre[1] === d) return;
                  /* A different bar length re-cuts every boundary, so the
                     drawing cannot survive it honestly: start clean. */
                  setMetre([n, d]);
                  setGrid(freshGrid([n, d], barsNow));
                }}
              >
                {n}/{d}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field__label">{t('rhythm.grid')}</span>
          {Array.from({ length: barsNow }, (_, bar) => (
            <div className="rhythm-grid" key={bar} data-bar={bar + 1}>
              {grid.slice(bar * perBar, (bar + 1) * perBar).map((beat, beatInBar) => {
                const beatIndex = bar * perBar + beatInBar;
                const before = grid
                  .slice(0, beatIndex)
                  .reduce((sum, entry) => sum + entry.division, 0);
                const labels = beatCountLabels(beatInBar, beat.division);
                return (
                  <div
                    key={beatIndex}
                    className="rhythm-beat"
                    style={{ gridTemplateColumns: `repeat(${beat.division}, minmax(0, 1fr))` }}
                  >
                    {/* The toggle spans its beat and names what tapping GIVES
                        you — "triplet" on a straight beat, the count on a
                        triplet one — because "tap the numeral" was not a
                        gesture anyone could guess (the player, 2026-09-01).
                        The count itself moved INTO the cells. */}
                    {/* Named for its state, cycled by a tap — "in 4",
                        "in 3", and whatever GRID_DIVISIONS earns next
                        (the player's generalisation, 2026-09-01). The
                        count in the cells below says what each division
                        means, so the button can afford to be a number. */}
                    <button
                      type="button"
                      className="rhythm-beat__toggle"
                      style={{ gridColumn: '1 / -1' }}
                      aria-label={`Beat ${beatInBar + 1} of bar ${bar + 1}: divided in ${beat.division}. Tap to switch.`}
                      onClick={() => toggleDivision(beatIndex)}
                    >
                      {t('rhythm.division', { n: String(beat.division) })}
                    </button>
                    {beat.cells.map((state, column) => {
                      const index = before + column;
                      return (
                        <button
                          key={index}
                          type="button"
                          className={`rhythm-cell is-${state} ${column === 0 ? 'is-beat' : ''}`}
                          aria-label={`Bar ${bar + 1} beat ${beatInBar + 1} cell ${column + 1}: ${state}`}
                          onPointerDown={(e) => {
                            // Released so the paint's pointerenter reaches siblings.
                            e.currentTarget.releasePointerCapture?.(e.pointerId);
                            press(index);
                          }}
                          onPointerEnter={() => enter(index)}
                          onPointerUp={() => release(index)}
                        >
                          <span className="rhythm-cell__count">{labels[column]}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
          <div className="row">
            <button type="button" className="segmented__option" onClick={() => setBars(barsNow + 1)}>
              {t('rhythm.addBar')}
            </button>
            <button
              type="button"
              className="segmented__option"
              disabled={barsNow <= 1}
              onClick={() => setBars(barsNow - 1)}
            >
              {t('rhythm.removeBar')}
            </button>
          </div>
        </div>

        {'bars' in verdict && (
          <div className="row">
            {/* The vertical axis of the same stave: rhythm alone, or a
                line to drag on it (the player's bridge, 2026-09-01). */}
            <button
              type="button"
              className={`segmented__option ${line === null ? 'is-selected' : ''}`}
              onClick={() => {
                lineBars.current = null;
                setLine(null);
                setSelected(null);
              }}
            >
              {t('rhythm.rhythmOnly')}
            </button>
            <button
              type="button"
              className={`segmented__option ${line !== null ? 'is-selected' : ''}`}
              onClick={() => {
                lineBars.current = verdict.bars;
                setLine(line ?? attacksIn(verdict.bars).map(() => ({ degree: 1 })));
              }}
            >
              {t('rhythm.addNotes')}
            </button>
            {line !== null && (
              <button
                type="button"
                className="segmented__option"
                onClick={() => {
                  lineBars.current = verdict.bars;
                  setLine(randomNotesFor(verdict.bars, Date.now() % 100000));
                }}
              >
                {t('rhythm.randomNotes')}
              </button>
            )}
          </div>
        )}
        {line !== null && (
          <div className="row">
            <label className="field">
              <span className="field__label">{t('rhythm.cellName')}</span>
              <input
                value={cellName}
                onChange={(e) => setCellName(e.target.value)}
                placeholder={t('rhythm.cellPlaceholder')}
              />
            </label>
            <label className="field">
              <span className="field__label">{t('rhythm.cellKey')}</span>
              <select
                value={String(cellFifths)}
                onChange={(e) => {
                  /* The lens keeps the PAGE — see `rewrittenIn`: notes
                     hold their stave lines under the new signature. */
                  const next = Number(e.target.value);
                  if (line) setLine(rewrittenIn(line, cellFifths, next));
                  setCellFifths(next);
                }}
              >
                {MAJOR_KEYS.map((key) => (
                  <option key={key.fifths} value={key.fifths}>
                    {key.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {'bars' in verdict ? (
          <>
          <RhythmStavePreview
            bars={verdict.bars}
            metre={metre}
            instrumentId={instrumentId}
            clef={clef}
            {...(line
              ? {
                  notes: line,
                  onNotes: setLine,
                  fifths: cellFifths,
                  selected,
                  onSelect: setSelected,
                }
              : {})}
          />
          {line !== null && (
            <div className="row rhythm-editor__nudge">
              <span className="muted">
                {selected === null ? t('rhythm.pickNote') : t('rhythm.moveNote')}
              </span>
              <button
                type="button"
                className="segmented__option"
                disabled={selected === null}
                aria-label={t('rhythm.up')}
                onClick={() => nudge(1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="segmented__option"
                disabled={selected === null}
                aria-label={t('rhythm.down')}
                onClick={() => nudge(-1)}
              >
                ↓
              </button>
              <button
                type="button"
                className={`segmented__option ${selectedNote?.alter === 1 ? 'is-selected' : ''}`}
                disabled={selected === null}
                aria-label={t('rhythm.sharp')}
                aria-pressed={selectedNote?.alter === 1}
                onClick={() => inflect(1)}
              >
                ♯
              </button>
              <button
                type="button"
                className={`segmented__option ${selectedNote?.alter === -1 ? 'is-selected' : ''}`}
                disabled={selected === null}
                aria-label={t('rhythm.flat')}
                aria-pressed={selectedNote?.alter === -1}
                onClick={() => inflect(-1)}
              >
                ♭
              </button>
            </div>
          )}
          </>
        ) : (
          <p className="field__note" role="status">
            {verdict.error}
          </p>
        )}
        {readyError && 'bars' in verdict && (
          <p className="field__note" role="status">
            {readyError}
          </p>
        )}
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
            /*
             * A cell is saved BESIDE its rhythm, never instead of it:
             * the pattern is the parent and stays on the shelf, and the
             * cell carries a snapshot of its bars so a later edit to
             * the rhythm cannot break it (the ruling of 2026-09-03).
             */
            if (line && cellName.trim()) {
              saveCell({
                id: `${id}-${cellName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                name: cellName.trim(),
                patternId: id,
                metre,
                fifths: cellFifths,
                bars,
                notes: line,
              });
            }
            onSaved(id);
          }}
        >
          {t('rhythm.save')}
        </button>
      </div>
    </div>
  );
}
