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

  it('opens in Spanish and Italian from their landing pages', () => {
    window.history.replaceState({}, '', '/app/?lang=es');
    renderApp();
    expect(screen.getByText('Dificultad')).toBeTruthy();
    cleanup();
    window.history.replaceState({}, '', '/app/?lang=it');
    renderApp();
    expect(screen.getByText('Difficoltà')).toBeTruthy();
    window.history.replaceState({}, '', '/');
  });

  it('tells the two Portuguese apart, which is the whole point of splitting them', () => {
    /*
     * Not a formality. If the two packs ever collapse into one, this is what
     * says so: `registo`/`registro` and `Definições`/`Configurações` are the
     * everyday words that forked, and they sit on the home screen — the first
     * thing anybody sees.
     */
    window.history.replaceState({}, '', '/app/?lang=pt-PT');
    renderApp();
    expect(screen.getByText('Compasso')).toBeTruthy();
    expect(screen.getByText('Primeira vista')).toBeTruthy();
    cleanup();
    window.history.replaceState({}, '', '/app/?lang=pt-BR');
    renderApp();
    expect(screen.getByText('Fórmula de compasso')).toBeTruthy();
    expect(screen.getByText('Leitura à primeira vista')).toBeTruthy();
    window.history.replaceState({}, '', '/');
  });

  it('takes a regional tag from the browser on a first run', () => {
    // `pt-BR` must not be answered with European Portuguese, and vice versa.
    const real = Object.getOwnPropertyDescriptor(window.navigator, 'languages');
    Object.defineProperty(window.navigator, 'languages', {
      value: ['pt-BR', 'en'],
      configurable: true,
    });
    try {
      renderApp();
      expect(screen.getByText('Fórmula de compasso')).toBeTruthy();
    } finally {
      /*
       * Removed, not "restored". `languages` lives on the prototype, so there
       * is no own descriptor to put back — `getOwnPropertyDescriptor` returns
       * undefined and a conditional restore silently does nothing, leaving
       * every later test running in Brazilian Portuguese. That is how the
       * English test below failed the first time this was written.
       */
      if (real) Object.defineProperty(window.navigator, 'languages', real);
      else Reflect.deleteProperty(window.navigator, 'languages');
    }
  });

  it('is in English when nothing asks otherwise', () => {
    renderApp();
    expect(screen.getByText('Difficulty')).toBeTruthy();
  });
});
