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
 * The name on the Key section's *closed* summary — the locked case only,
 * since a key the course fixed is a statement and lives in the accordion.
 *
 * Found by its own title rather than by class alone: the gate has five other
 * sections with the same class, so the first match is Reading's.
 */
const summary = (title: string): string => {
  const head = [...document.querySelectorAll('.panel__summary')].find(
    (candidate) => candidate.querySelector('.panel__title')?.textContent === title,
  );
  return head?.querySelector('.panel__values')?.textContent ?? '';
};

/**
 * The key named on the face, where the question is asked — uncollapsed, by the
 * player's instruction of 2026-08-29.
 */
const asked = (): string =>
  [...document.querySelectorAll('.field__label')]
    .map((node) => node.textContent ?? '')
    .find((text) => text.startsWith('Key ')) ?? '';

/** The chip for a key, in the grid on the face. */
const chip = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name},`) });

const gate = (over: Partial<KeyGate> = {}): KeyGate => ({
  fifths: 0,
  setByCourse: false,
  minor: false,
  onChoose: vi.fn(),
  ...over,
});

describe('the key at the gate', () => {
  it('marks the key in force, and only that one', () => {
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: -1 })} />);
    const pressed = [...document.querySelectorAll('.keys .key[aria-pressed="true"]')];
    expect(pressed).toHaveLength(1);
    expect(pressed[0].textContent).toContain('F');
  });

  it('is absent in free play, where the home screen owns the grid', () => {
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(screen.queryByText(/yours to choose/i)).toBeNull();
    // Neither the question on the face nor a section: the home screen owns it.
    expect(asked()).toBe('');
    expect(screen.queryByText('Key')).toBeNull();
  });

  it('names the key the course fixed, and will not let it be changed', () => {
    render(
      <ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: -1, setByCourse: true })} />,
    );
    expect(summary('Key')).toBe('F major');
    expect(screen.getByText(/set by the course/i)).toBeTruthy();
    // No question on the face: there is nothing to answer.
    expect(screen.queryByText(/yours to choose/i)).toBeNull();
    expect(asked()).toBe('');
  });

  it('asks on the face, uncollapsed, when the course left the key open', () => {
    /*
     * The player's instruction, and the point of the whole control: a question
     * the course is asking must not be behind an accordion the player has to
     * know to open. The locked case may sit in one; a question may not.
     */
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: -3 })} />);
    expect(screen.getByText(/yours to choose/i)).toBeTruthy();
    expect(screen.queryByText(/set by the course/i)).toBeNull();
    expect(asked()).toBe('Key Eb major');
    // On the face, not inside any of the accordion's sections.
    expect(summary('Key')).toBe('');
    expect(chip('Eb major').closest('details')).toBeNull();
  });

  it('draws the same grid the home screen does', () => {
    // Three rows of five, one chip per key — the shared `KeyGrid`, so the two
    // screens cannot drift into looking different.
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate()} />);
    expect(document.querySelectorAll('.keys__row')).toHaveLength(3);
    expect(document.querySelectorAll('.keys .key')).toHaveLength(15);
  });

  it('hands back the signature the player picked', () => {
    const onChoose = vi.fn();
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ onChoose })} />);
    fireEvent.click(chip('F major'));
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
    expect(asked()).toBe('Key C major');
    rerender(
      <ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ fifths: 0, minor: true })} />,
    );
    expect(asked()).toBe('Key A minor');
  });

  it('names every chip in the grid as a minor, not just the chosen one', () => {
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} keyGate={gate({ minor: true })} />);
    expect(chip('D minor')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^F major,/ })).toBeNull();
  });
});
