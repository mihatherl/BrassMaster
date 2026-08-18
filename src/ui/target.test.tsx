// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { App } from './App';
import { SettingsScreen } from './SettingsScreen';
import { DEFAULT_SETTINGS } from '../storage/settings';

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
    render(<App />);
    expect(screen.getByRole('button', { name: /my music/i })).toBeTruthy();
  });
});
