// @vitest-environment happy-dom

/**
 * The app rendered in German, which is the check the pack tests cannot make.
 *
 * `coverage.test.ts` proves the packs are complete and that no screen holds a
 * loose English string. Neither proves the two are *joined* — a complete pack
 * and a swept screen still show English if `setLocale` never runs, or if a
 * screen reaches a label by some route that skipped `t()`. This mounts the
 * real app with a stored German locale and reads the screen, which is the
 * only way to catch that.
 *
 * Written because the fault the player found was exactly of this shape: every
 * piece looked right on its own, and the seam between them was where the
 * English came through.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderApp } from './render-app';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function inGerman(): void {
  localStorage.setItem('brass-trainer:settings', JSON.stringify({ locale: 'de' }));
}

describe('the app speaks the language it was asked for', () => {
  it('opens the home screen in German', () => {
    inGerman();
    renderApp();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
    expect(screen.getByText('Schwierigkeit')).toBeTruthy();
    expect(screen.getByText('Tonarten')).toBeTruthy();
  });

  it('names the levels in German rather than by their English ids', () => {
    inGerman();
    renderApp();
    // The one the player named: Easy/Medium/Hard are domain labels, not chrome,
    // and reach the screen through keys rather than through their table.
    expect(screen.getByRole('button', { name: 'Leicht' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mittel' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Schwer' })).toBeTruthy();
  });

  it('carries the language onto the next screen, not just the first', () => {
    /*
     * The fault, in one assertion. "Back" was translated on the course screen
     * and English on five others, so a test that only ever read the home
     * screen would have passed throughout.
     */
    inGerman();
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Bereit' })).toBeTruthy();
  });

  it('takes the language from the landing page that sent the visitor', () => {
    window.history.replaceState({}, '', '/app/?lang=fr');
    renderApp();
    expect(screen.getByText('Niveau')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Démarrer' })).toBeTruthy();
    window.history.replaceState({}, '', '/');
  });

  it('is in English when nothing asks otherwise', () => {
    renderApp();
    expect(screen.getByText('Difficulty')).toBeTruthy();
  });
});
