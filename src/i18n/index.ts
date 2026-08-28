/**
 * Partial internationalisation — labels and buttons, deliberately no more.
 *
 * Ruled by the player 2026-08-28: language packs for the landing page and
 * "the various labels and buttons throughout the different forms", with the
 * things that cannot change named as such — course content, theme names, the
 * long teaching prose, the editor (an author's tool), the corpus blurbs
 * (pinned by their own guard tests). "At least we'll make a partial attempt."
 *
 * The mechanism is the smallest honest one. English is the source of truth;
 * a pack is a *partial* map over the same keys, and a key a pack lacks falls
 * back to English — so an incomplete translation degrades to mixed rather
 * than to broken, and adding a string never obliges every pack at once.
 *
 * The locale is a module variable set by `App` from settings before children
 * render, not context: every locale change is a settings change, settings
 * changes re-render the tree from `App`, and threading a context through
 * forty components for a value that changes once a year would be ceremony.
 *
 * **Every pack ships wanting a native speaker's pass.** The strings here are
 * short and the musical loanwords (Tempo, Metronom) travel well, but the ear
 * rule has a linguistic twin, and the assistant who drafted these is native
 * in none of them. Recorded in the roadmap; corrections are one-line edits.
 */

import { DE } from './de';
import { NL } from './nl';
import { FR } from './fr';

export const EN = {
  // The home screen
  'home.structured': 'Structured Learning',
  'home.free': 'Free play',
  'home.start': 'Start',
  'home.myMusic': 'My Music',
  'home.instrument': 'Instrument',
  'home.clef': 'Clef',
  'home.language': 'Language',
  'clef.treble': 'Treble',
  'clef.bass': 'Bass',
  /** The chip's short forms: identity in a space one word wide. */
  'clefShort.treble': 'Treble',
  'clefShort.bass': 'Bass',
  'kind.drills': 'Drills',
  'kind.phrases': 'Sight-reading',
  'kind.themes': 'Themes',

  // The Ready gate
  'gate.tempo': 'Tempo',
  'gate.reading': 'Reading',
  'gate.beat': 'Beat',
  'gate.sound': 'Sound',
  'gate.fingerings': 'Fingerings',
  'gate.preferences': 'Preferences',
  'gate.metronome': 'Metronome',
  'gate.conductor': 'Conductor',
  'gate.metronomeVolume': 'Metronome volume',
  'reading.scrolling': 'Scrolling line',
  'reading.paged': 'Read the page',
  'playback.reference': 'Play the notes',
  'playback.off': 'Silent',

  // The play surface
  'play.tapToStart': 'Tap to start',
  'play.stop': 'Stop',
  'play.continue': 'Continue',
  'play.pause': 'Pause',
  'play.start': 'Start',
  'play.back': 'Back',

  // The course
  'course.back': 'Back',
  'course.forward': 'Forward',
  'course.stayHere': 'Stay here',
  'course.atTheBar': 'at the bar line',
  'course.whereYouAre': 'Where you are',
  'course.suggestion': 'The suggestion',
  'course.aimingFor': 'Aiming for',
  'course.progress': 'Progress',
  'course.import': 'Import course…',
  'course.export': 'Export',
  'course.delete': 'Delete',
  'course.course': 'Course',

  // The results screen
  'results.correct': 'Correct',
  'results.wrongValves': 'Wrong valves',
  'results.missed': 'Missed',
  'results.another': 'Another',
  'results.sameAgain': 'Same again',
  'results.settings': 'Settings',
  'results.dontCount': 'Don’t count this run — I wasn’t really playing',
} as const;

export type StringKey = keyof typeof EN;
export type Pack = Partial<Record<StringKey, string>>;
export type Locale = 'en' | 'de' | 'nl' | 'fr';

/** Offered in their own names: nobody hunts for their language in another. */
export const LOCALES: ReadonlyArray<{ id: Locale; name: string }> = [
  { id: 'en', name: 'English' },
  { id: 'de', name: 'Deutsch' },
  { id: 'nl', name: 'Nederlands' },
  { id: 'fr', name: 'Français' },
];

const PACKS: Record<Locale, Pack> = { en: {}, de: DE, nl: NL, fr: FR };

let current: Locale = 'en';

export function setLocale(locale: string): void {
  current = LOCALES.some((entry) => entry.id === locale) ? (locale as Locale) : 'en';
}

export function t(key: StringKey): string {
  return PACKS[current][key] ?? EN[key];
}
