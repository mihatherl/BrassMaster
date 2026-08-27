// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { renderApp } from './render-app';
import { App } from './App';
import { SettingsScreen } from './SettingsScreen';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../storage/settings';

/**
 * The free/paid line, at the one place a test can see it.
 *
 * The line itself is drawn at build time by `__HAS_MY_MUSIC__`, and what that
 * *removes from the bundle* cannot be checked from in here — a suite running
 * under Vitest is one build, not two. `tools/check-web-bundle.mjs` checks the
 * bundle; this checks the behaviour on either side of the flag, which is the
 * half a build check cannot see.
 *
 * `SettingsScreen` takes the door as an optional callback rather than reading
 * the flag itself, which is what makes both sides testable in one run: the
 * absence of `onImport` *is* the free build, as far as the screen is
 * concerned.
 */

afterEach(() => {
  cleanup();
  localStorage.clear();
});

const props = {
  settings: DEFAULT_SETTINGS,
  onChange: () => {},
  onStart: () => {},
  onOutputs: () => {},
};

describe('the build without My Music', () => {
  it('draws no door to it', () => {
    render(<SettingsScreen {...props} />);
    expect(screen.queryByRole('button', { name: /my music/i })).toBeNull();
  });

  it('still offers everything else, so nothing is gated by accident', () => {
    render(<SettingsScreen {...props} />);
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Eb Bass · Treble/ }));
    expect(screen.getByLabelText('Instrument')).toBeTruthy();
  });
});

describe('the unified home', () => {
  /*
   * One home since 2026-08-23: the interstitial with two doors is gone, and
   * the two ways in sit side by side as segments — the §1.4 ruling ("neither
   * door is the poor relation") honoured as literal equal billing. The free
   * build has no switch at all and simply is the free side, which `renderApp`
   * papers over for every other test; this is the one place the difference
   * itself is asserted.
   */
  it('opens with both ways in, side by side, the free side showing', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Structured Learning' })).toBeTruthy();
    const free = screen.getByRole('button', { name: 'Free play' });
    expect(free.getAttribute('aria-pressed')).toBe('true');
    // And the free side is the settings screen as it always was.
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  /*
   * The ruling in `v2-design.md` § *A course chooses the settings*: a step
   * supplies settings for its run and must never write them back, or one step
   * of a slow course would silently reset a tempo the player had settled on.
   * It had no test until a mutation went unnoticed.
   */
  it('never writes a course’s settings back over the player’s own', () => {
    saveSettings({ ...DEFAULT_SETTINGS, tempo: 132 });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Structured Learning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(loadSettings().tempo).toBe(132);
  });

  it('switches to the course and back, remembering which side was chosen', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Structured Learning' }));
    // Asserted on the screen's own furniture rather than a level name, which
    // is the course's business. "The suggestion" replaced "To move on" when
    // the stepping ruling made the machine advisory (2026-08-26).
    expect(screen.getByRole('heading', { name: /the suggestion/i })).toBeTruthy();
    // The choice is the player's and persists like any other setting.
    expect(loadSettings().homeMode).toBe('structured');
    fireEvent.click(screen.getByRole('button', { name: 'Free play' }));
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    expect(loadSettings().homeMode).toBe('free');
  });
});

describe('the build with My Music', () => {
  it('draws the door', () => {
    render(<SettingsScreen {...props} onImport={() => {}} />);
    expect(screen.getByRole('button', { name: /my music/i })).toBeTruthy();
  });

  /*
   * The suite runs as the paid build (`VITE_TARGET=app` in the test script),
   * so the whole app wired together should show the door. This is the one
   * assertion here that would notice the flag being read wrongly in `App`
   * rather than only in the screen — and it is why the test script sets the
   * variable rather than leaving it to the default.
   */
  it('is what the suite itself runs as', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /my music/i })).toBeTruthy();
  });
});
