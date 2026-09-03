// @vitest-environment happy-dom

/**
 * The note editor without the grid (the player, 2026-09-04): author a
 * line straight from a pattern's card, reopen an existing one from its
 * little ✎. What is pinned: the snapshot rules — a new cell copies its
 * pattern's bars at birth, a reopened cell keeps ITS OWN bars and its
 * id whatever happens to its name — and that deleting really deletes.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { CellEditor } from './CellEditor';
import { saveCell, loadCells, type AuthoredCell, type RhythmPattern } from '../exercise/rhythm';

afterEach(cleanup);

const pattern: RhythmPattern = {
  id: 'four-crotchets',
  name: 'Four crotchets',
  metre: [4, 4],
  stage: 1,
  bars: ['0q 0q 0q 0q'],
};

const open = (editing: AuthoredCell | null) => {
  const onSaved = vi.fn();
  const utils = render(
    <CellEditor
      pattern={pattern}
      editing={editing}
      instrumentId="eb-bass"
      clef="treble"
      onSaved={onSaved}
      onClose={vi.fn()}
    />,
  );
  return { ...utils, onSaved };
};

describe('writing notes on a pattern', () => {
  it('authors a cell on a packaged pattern, bars snapshotted at birth', () => {
    localStorage.clear();
    const utils = open(null);
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'Line' } });
    // Select the first note (happy-dom draws nothing; the hit test falls
    // back to note 0) and raise it a step.
    const canvas = utils.container.querySelector('.rhythm-editor__stave')!;
    fireEvent.pointerDown(canvas, { clientX: 0, clientY: 80 });
    fireEvent.pointerUp(canvas);
    fireEvent.click(utils.getByLabelText('Up a step'));
    fireEvent.click(utils.getByText('Save'));

    const cells = loadCells();
    expect(cells).toHaveLength(1);
    expect(cells[0].patternId).toBe('four-crotchets');
    expect(cells[0].bars).toEqual(['0q 0q 0q 0q']);
    expect(cells[0].notes).toEqual([{ degree: 2 }, { degree: 1 }, { degree: 1 }, { degree: 1 }]);
    expect(utils.onSaved).toHaveBeenCalledWith('four-crotchets-line');
  });

  it('a reopened cell keeps its own bars and its id, whatever its name does', () => {
    localStorage.clear();
    const written: AuthoredCell = {
      id: 'four-crotchets-old',
      name: 'Old',
      patternId: 'four-crotchets',
      metre: [4, 4],
      // The parent rhythm has since changed shape; the cell's snapshot
      // is its identity and must survive the edit untouched.
      bars: ['0h 0h'],
      notes: [{ degree: 3 }, { degree: 5 }],
    };
    saveCell(written);
    const utils = open(written);
    fireEvent.change(utils.container.querySelector('input')!, { target: { value: 'Renamed' } });
    fireEvent.click(utils.getByText('Save'));

    const cells = loadCells();
    expect(cells).toHaveLength(1);
    expect(cells[0].id).toBe('four-crotchets-old');
    expect(cells[0].name).toBe('Renamed');
    expect(cells[0].bars).toEqual(['0h 0h']);
    expect(cells[0].notes).toEqual([{ degree: 3 }, { degree: 5 }]);
  });

  it('deletes from its own sheet', () => {
    localStorage.clear();
    const written: AuthoredCell = {
      id: 'four-crotchets-gone',
      name: 'Gone',
      patternId: 'four-crotchets',
      metre: [4, 4],
      bars: ['0q 0q 0q 0q'],
      notes: [{ degree: 1 }, { degree: 1 }, { degree: 1 }, { degree: 1 }],
    };
    saveCell(written);
    const utils = open(written);
    fireEvent.click(utils.getByText('Delete'));
    expect(loadCells()).toEqual([]);
  });
});
