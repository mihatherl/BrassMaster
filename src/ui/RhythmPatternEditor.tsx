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
import {
  barsFromGrid,
  beatCountLabels,
  beatsPerBar,
  nextDivision,
  deleteCustomRhythm,
  flattenGrid,
  freshGrid,
  gridFromBars,
  loadCustomRhythms,
  previewExerciseFromBars,
  rebuildGrid,
  saveCustomRhythm,
  type GridBeat,
  type RhythmPattern,
} from '../exercise/rhythm';
import { instrumentById, type Clef } from '../domain/instruments';
import { currentTheme, StaveRenderer } from '../render/surface';
import { Transport } from '../engine/clock';

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

        {'bars' in verdict ? (
          <RhythmStavePreview bars={verdict.bars} metre={metre} instrumentId={instrumentId} clef={clef} />
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
            saveCustomRhythm({ id, name: name.trim(), metre, stage: 1, bars: (verdict as { bars: string[] }).bars });
            onSaved(id);
          }}
        >
          {t('rhythm.save')}
        </button>
      </div>
    </div>
  );
}

/**
 * The drawing, engraved — a static stave on one written C, ties and all,
 * with the count above it. The same suspended-transport trick the course
 * editor's tune preview proved: `StaveRenderer` wants a Transport for its
 * clock, so it gets one over a context that never starts.
 */
function RhythmStavePreview({
  bars,
  metre,
  instrumentId,
  clef,
}: {
  bars: readonly string[];
  metre: readonly [number, number];
  instrumentId: string;
  clef: Clef;
}): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = new AudioContext();
    void context.suspend();
    const exercise = previewExerciseFromBars(bars, metre, instrumentById(instrumentId), clef);
    const renderer = new StaveRenderer({
      canvas,
      exercise,
      transport: new Transport(context, 80),
      theme: currentTheme(),
      scrollSpeed: 0,
      readingMode: 'paged',
      verdictFor: () => undefined,
    });
    renderer.draw();
    return () => {
      renderer.stop();
      void context.close();
    };
  }, [bars, metre, instrumentId, clef]);
  return <canvas ref={ref} className="rhythm-editor__stave" />;
}
