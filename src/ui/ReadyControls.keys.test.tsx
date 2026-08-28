// @vitest-environment happy-dom

/**
 * The key at the gate: what it says, and who it lets answer.
 *
 * Built 2026-08-29 for a fault the player found while authoring: a level may
 * name no key — the ratified optional-key ruling — and nothing in the
 * structured flow could answer it. The key grid lives on the free-play home
 * screen, so "the player's own key" meant "whatever you last set in the other
 * mode", reachable only by leaving the course. The author could not tell what
 * they were specifying and the player could not tell what they were in.
 *
 * The two cases have to *look different*, which is the whole point and is
 * what these tests hold: locked and named when the course chose, open and
 * asking when it did not.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ReadyControls, type KeyGate } from './ReadyControls';
import { DEFAULT_SETTINGS } from '../storage/settings';

afterEach(cleanup);

/**
 * The name on the Key section's *closed* summary — what a player reads
 * without opening anything.
 *
 * Found by its own title rather than by class alone, for two reasons the
 * first drafts of this file hit in turn: the same key name also appears in
 * the fifteen options below, so a bare text query cannot tell the summary
 * from a choice; and the gate has five other sections with the same class, so
 * the first match is Reading's.
 */
const summary = (title: string): string => {
  const head = [...document.querySelectorAll('.panel__summary')].find(
    (candidate) => candidate.querySelector('.panel__title')?.textContent === title,
  );
  return head?.querySelector('.panel__values')?.textContent ?? '';
};

const gate = (over: Partial<KeyGate> = {}): KeyGate => ({
  fifths: 0,
  setByCourse: false,
  minor: false,
  onChoose: vi.fn(),
  ...over,
});

describe('the key at the gate', () => {
  it('is absent in free play, where the home screen owns the grid', () => {
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.queryByLabelText(/yours to choose/i)).toBeNull();
    // The section itself does not appear at all — not an empty one.
    expect(screen.queryByText('Key')).toBeNull();
  });

  it('names the key the course fixed, and will not let it be changed', () => {
    render(
      <ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: -1, setByCourse: true })} />,
    );
    expect(summary('Key')).toBe('F major');
    expect(screen.getByText(/set by the course/i)).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: /yours to choose/i })).toBeNull();
  });

  it('asks, when the course left the key open', () => {
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: -3 })} />);
    expect(screen.getByRole('combobox', { name: /yours to choose/i })).toBeTruthy();
    expect(screen.queryByText(/set by the course/i)).toBeNull();
    // Named on the closed section too, so it answers without being opened.
    expect(summary('Key')).toBe('Eb major');
  });

  it('hands back the signature the player picked', () => {
    const onChoose = vi.fn();
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ onChoose })} />);
    fireEvent.change(screen.getByRole('combobox', { name: /yours to choose/i }), {
      target: { value: '-1' },
    });
    expect(onChoose).toHaveBeenCalledWith(-1);
  });

  it('names the same signature as a minor when the run is a minor drill', () => {
    /*
     * The carry, seen from the outside. `fifths: 0` is C major over a major
     * drill and A minor over a minor one — one stored number, two names — and
     * that is exactly why a remembered key survives a major level into a minor
     * one without translation (ruled 2026-08-29, over carrying the tonic).
     */
    const { rerender } = render(
      <ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: 0 })} />,
    );
    expect(summary('Key')).toBe('C major');
    rerender(
      <ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: 0, minor: true })} />,
    );
    expect(summary('Key')).toBe('A minor');
    expect(screen.queryByText('C major')).toBeNull();
  });

  it('offers minor names throughout the list, not just on the summary', () => {
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ minor: true })} />);
    const options = screen.getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('D minor');
    expect(options).not.toContain('F major');
  });
});
