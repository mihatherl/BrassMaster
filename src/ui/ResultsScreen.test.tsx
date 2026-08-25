// @vitest-environment happy-dom

import { metreFor } from '../domain/metre';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { instrumentById } from '../domain/instruments';
import { difficultyById } from '../exercise/difficulty';
import { generateExercise } from '../exercise/generate';
import { summarise } from '../engine/judge';
import type { NoteJudgement, Verdict } from '../engine/judge';
import type { NoteStats } from '../storage/stats';
import { ResultsScreen } from './ResultsScreen';

afterEach(cleanup);

const exercise = generateExercise({
  instrument: instrumentById('eb-bass'),
  clef: 'treble',
  fifths: -3,
  difficulty: difficultyById('easy'),
  kind: 'phrases',
  bars: 4,
  cycles: 2,
  themeCount: 2,
  metre: metreFor(4, 4),
  seed: 3,
});

function summaryFor(pattern: Verdict[], upTo = exercise.notes.length) {
  const judgements: NoteJudgement[] = Array.from({ length: upTo }, (_, index) => ({
    noteIndex: index,
    verdict: pattern[index % pattern.length],
    heldMask: 0,
    timingOffset: null,
  }));
  return summarise(exercise.notes, judgements);
}

const noop = () => undefined;

function renderResults(
  summary: ReturnType<typeof summaryFor>,
  stats: NoteStats = new Map(),
  extra: Partial<{ attempted: boolean; counted: boolean; onCounted: (v: boolean) => void }> = {},
) {
  render(
    <ResultsScreen
      summary={summary}
      exercise={exercise}
      stats={stats}
      attempted={extra.attempted ?? true}
      counted={extra.counted ?? true}
      onCounted={extra.onCounted ?? noop}
      onRepeat={noop}
      onNext={noop}
      onSettings={noop}
    />,
  );
}

describe('the results screen', () => {
  /*
   * happy-dom has no 2D canvas, so `getContext` comes back null. The review
   * still has to mount and size itself — a results screen that threw because
   * the browser would not give it a context would take the whole run's feedback
   * with it.
   */
  it('shows the marked exercise', () => {
    expect(() => renderResults(summaryFor(['correct', 'wrong', 'missed']))).not.toThrow();
    expect(screen.getByRole('heading', { name: 'What you played' })).toBeTruthy();
    expect(screen.getByText(/fingering under a note/i)).toBeTruthy();
  });

  it('says so plainly when there was nothing to correct', () => {
    renderResults(summaryFor(['correct']));
    expect(screen.getByText(/nothing to correct/i)).toBeTruthy();
    expect(screen.queryByText(/fingering under a note/i)).toBeNull();
  });

  it('draws the weak notes rather than naming them', () => {
    // A list of pitch names asks the reader to translate "G flat 3" back into a
    // position on a stave, and the player who needs the practice is the one for
    // whom that translation is the difficulty.
    // Three notes with a poor history behind them, which is what puts anything
    // in the section at all.
    const struggling: NoteStats = new Map(
      exercise.notes.slice(0, 3).map((note) => [note.writtenMidi, { attempts: 10, correct: 2 }]),
    );
    renderResults(summaryFor(['wrong']), struggling);

    expect(screen.getByRole('heading', { name: 'Worth drilling' })).toBeTruthy();
    // The old list rendered one item per note; the chart is a single canvas.
    expect(document.querySelectorAll('.review canvas')).toHaveLength(2);
    expect(screen.queryByText(/^[A-G][#b♯♭]?\d$/)).toBeNull();
  });

  /*
   * The two faces of the honesty ruling. A run nobody played is stated as not
   * counting and offers no choice about it — there is nothing in it to keep,
   * and a checkbox would imply there was. A run that *was* played is filed by
   * default and can be disowned, because stopping half way, demonstrating the
   * app and playing badly are indistinguishable to arithmetic.
   */
  it('says a run nobody played is not counted, and offers no choice about it', () => {
    renderResults(summaryFor(['missed', 'missed']), new Map(), { attempted: false });

    expect(screen.getByText(/not counted towards your progress/i)).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('lets a played run be disowned, and counts it until it is', () => {
    const onCounted = vi.fn();
    renderResults(summaryFor(['correct', 'wrong']), new Map(), { onCounted });

    const box = screen.getByRole('checkbox');
    expect((box as HTMLInputElement).checked).toBe(false);
    fireEvent.click(box);
    expect(onCounted).toHaveBeenCalledWith(false);
  });

  it('copes with a run that stopped part-way', () => {
    // Stopping early leaves later notes unjudged; they draw as unplayed rather
    // than as mistakes.
    expect(() => renderResults(summaryFor(['correct'], 2))).not.toThrow();
    expect(screen.getByRole('heading', { name: 'What you played' })).toBeTruthy();
  });
});
