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
    expect(screen.getByLabelText('Instrument')).toBeTruthy();
  });
});

describe('the two front doors', () => {
  /*
   * The paid build opens on a choice; the free build opens on the settings
   * screen as it always did. `renderApp` papers over the difference for every
   * other test, so this is the one place the difference itself is asserted.
   */
  it('opens on a choice of doors in the build that has two', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /practice/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /free play/i })).toBeTruthy();
  });

  it('leads to the settings screen, unchanged, through free play', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /free play/i }));
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    expect(screen.getByLabelText('Instrument')).toBeTruthy();
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
    fireEvent.click(screen.getByRole('button', { name: /practice/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(loadSettings().tempo).toBe(132);
  });

  it('leads to the course through practice, and back again', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /practice/i }));
    // Asserted on the screen's own furniture rather than a level name, which
    // follows whatever difficulty the settings happen to default to.
    expect(screen.getByRole('heading', { name: /to move on/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: /free play/i })).toBeTruthy();
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
