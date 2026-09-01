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
  CELLS_PER_BEAT,
  deleteCustomRhythm,
  gridBarCells,
  gridCount,
  gridFromBars,
  loadCustomRhythms,
  previewExerciseFromBars,
  saveCustomRhythm,
  type GridCell,
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
  const [cells, setCells] = useState<GridCell[]>(() => {
    const loaded = editing ? gridFromBars(editing.bars) : null;
    return loaded ?? Array<GridCell>(gridBarCells(editing?.metre ?? [4, 4])).fill('rest');
  });
  /** While a paint drags, the cell it began at; null between gestures. */
  const painting = useRef<number | null>(null);
  const moved = useRef(false);

  const perBar = gridBarCells(metre);
  const count = useMemo(() => gridCount(metre), [metre]);
  const verdict = useMemo(() => barsFromGrid(cells, metre), [cells, metre]);

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
      painting.current = index;
      setCells(cells.map((cell, i) => (i === index ? 'attack' : cell)));
    } else if (cells[index] === 'hold') {
      // Tap inside a note splits it: the rearticulation gesture.
      setCells(cells.map((cell, i) => (i === index ? 'attack' : cell)));
    } else {
      painting.current = index; // may become a delete on release
    }
  };

  const enter = (index: number) => {
    const from = painting.current;
    if (from === null || index <= from) return;
    moved.current = true;
    // Extending absorbs whatever it crosses — the piano-roll's rule.
    setCells(cells.map((cell, i) => (i > from && i <= index ? 'hold' : i === from ? 'attack' : cell)));
  };

  const release = (index: number) => {
    const from = painting.current;
    painting.current = null;
    if (from === index && !moved.current && cells[index] === 'attack') {
      // A tap on an attack deletes the whole note it begins.
      let end = index + 1;
      while (end < cells.length && cells[end] === 'hold') end++;
      setCells(cells.map((cell, i) => (i >= index && i < end ? 'rest' : cell)));
    }
  };

  const setBars = (bars: number) => {
    const want = bars * perBar;
    setCells(
      cells.length >= want
        ? cells.slice(0, want)
        : [...cells, ...Array<GridCell>(want - cells.length).fill('rest')],
    );
  };
  const barsNow = cells.length / perBar;

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
                  setCells(Array<GridCell>(gridBarCells([n, d]) * barsNow).fill('rest'));
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
            <div
              className="rhythm-grid"
              key={bar}
              data-bar={bar + 1}
              style={{ gridTemplateColumns: `repeat(${perBar}, minmax(0, 1fr))` }}
            >
              {count.map((syllable, column) => (
                <span key={`c${column}`} className="rhythm-grid__count">
                  {syllable ?? ''}
                </span>
              ))}
              {Array.from({ length: perBar }, (_, column) => {
                const index = bar * perBar + column;
                const state = cells[index];
                return (
                  <button
                    key={index}
                    type="button"
                    className={`rhythm-cell is-${state} ${column % CELLS_PER_BEAT === 0 ? 'is-beat' : ''}`}
                    aria-label={`Bar ${bar + 1} cell ${column + 1}: ${state}`}
                    onPointerDown={(e) => {
                      // Released so the paint's pointerenter reaches siblings.
                      e.currentTarget.releasePointerCapture(e.pointerId);
                      press(index);
                    }}
                    onPointerEnter={() => enter(index)}
                    onPointerUp={() => release(index)}
                  />
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
