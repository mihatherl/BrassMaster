/**
 * The note editor — a cell's own sheet, without the grid (the player,
 * 2026-09-04: author a note progression from the pattern card, and give
 * every existing one *"a little 'edit' button… which would just open up
 * a note editor, without the grid to edit the rhythm itself"*).
 *
 * The rhythm tool authors both halves at once; this sheet owns the case
 * where the rhythm is settled — a packaged pattern, or a custom one
 * being given another line — so the eye gets only the stave and the
 * hands that move notes on it: the drag, the arrows, the accidentals,
 * the transcriber's key. All shared with the rhythm tool through
 * `RhythmStavePreview`, so the two sheets cannot drift.
 *
 * **The bars are a snapshot, and an edited cell keeps ITS OWN.** A new
 * cell copies its pattern's bars at birth (the parent–child ruling,
 * 2026-09-03); an existing cell opens over the bars it was written on,
 * even when its parent rhythm has since changed — the snapshot is the
 * cell's identity, and editing the notes must not silently rewrite the
 * rhythm underneath them.
 */

import { useState, type ReactElement } from 'react';
import { t } from '../i18n';
import { MAJOR_KEYS } from '../domain/keys';
import {
  attacksIn,
  deleteCell,
  inflectedNote,
  loadCells,
  movedNote,
  rewrittenIn,
  saveCell,
  type AuthoredCell,
  type CellNote,
  type RhythmPattern,
} from '../exercise/rhythm';
import { type Clef } from '../domain/instruments';
import { RhythmStavePreview } from './RhythmStavePreview';

interface CellEditorProps {
  /** The rhythm the notes are written on — the parent, for a new cell's
      snapshot and provenance. */
  pattern: RhythmPattern;
  /** The cell being reopened, or null to write a new one. */
  editing: AuthoredCell | null;
  instrumentId: string;
  clef: Clef;
  onSaved: (id: string) => void;
  onClose: () => void;
}

export function CellEditor({
  pattern,
  editing,
  instrumentId,
  clef,
  onSaved,
  onClose,
}: CellEditorProps): ReactElement {
  /* An existing cell keeps its own snapshot; only a new one copies the
     pattern's bars as they stand today. */
  const bars = editing?.bars ?? pattern.bars;
  const [notes, setNotes] = useState<CellNote[]>(() =>
    editing ? [...editing.notes] : attacksIn(bars).map(() => ({ degree: 1 })),
  );
  const [name, setName] = useState(editing?.name ?? '');
  const [fifths, setFifths] = useState(editing?.fifths ?? 0);
  const [selected, setSelected] = useState<number | null>(null);

  /*
   * The id survives a rename: the cell is addressed by it (the run's
   * `cellId`, the picker's selection), and editing the notes should not
   * silently detach either. Only a NEW cell mints one from its name.
   */
  const id =
    editing?.id ??
    `${pattern.id}-${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cell'}`;
  // English pending the native-review sweep, as the rhythm editor's are.
  const clash =
    !editing && loadCells().some((cell) => cell.id === id)
      ? 'You already have notes by this name.'
      : null;
  const readyError = name.trim() === '' ? 'Name it.' : clash;

  const nudge = (steps: number) => {
    if (selected === null) return;
    setNotes(notes.map((note, i) => (i === selected ? movedNote(note, steps) : note)));
  };
  const inflect = (alter: -1 | 1) => {
    if (selected === null) return;
    setNotes(notes.map((note, i) => (i === selected ? inflectedNote(note, alter) : note)));
  };
  const selectedNote = selected !== null ? notes[selected] : undefined;

  return (
    <div
      className="sheet rhythm-editor"
      role="dialog"
      aria-modal="true"
      aria-label={t('rhythm.cellEditor')}
      onKeyDown={(event) => {
        if (selected === null) return;
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
        <div className="row">
          <label className="field">
            <span className="field__label">{t('rhythm.cellName')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('rhythm.cellPlaceholder')}
            />
          </label>
          <label className="field">
            <span className="field__label">{t('rhythm.cellKey')}</span>
            <select
              value={String(fifths)}
              onChange={(e) => {
                /* The lens keeps the PAGE: every note stays on its stave
                   line, reinterpreted under the new signature — set the
                   key late and nothing you placed moves (the player,
                   2026-09-04). */
                const next = Number(e.target.value);
                setNotes(rewrittenIn(notes, fifths, next));
                setFifths(next);
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

        <RhythmStavePreview
          bars={bars}
          metre={pattern.metre}
          instrumentId={instrumentId}
          clef={clef}
          notes={notes}
          onNotes={setNotes}
          fifths={fifths}
          selected={selected}
          onSelect={setSelected}
        />

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

        {readyError && (
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
              deleteCell(editing.id);
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
            saveCell({
              id,
              name: name.trim(),
              patternId: editing?.patternId ?? pattern.id,
              metre: editing?.metre ?? pattern.metre,
              fifths,
              bars,
              notes,
            });
            onSaved(id);
          }}
        >
          {t('rhythm.save')}
        </button>
      </div>
    </div>
  );
}
