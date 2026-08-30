/**
 * Internationalisation: every static string the app puts on screen.
 *
 * ## What changed on 2026-08-28, and why
 *
 * The first cut of this file was scoped to "labels and buttons" and did not
 * reach even that. The player played it in German and found the fault before
 * any test did: **"Back" was a button on six screens and one of them
 * translated.** Same word, same app, English on the next screen along. The
 * pack held 52 keys; six of the twenty-three components on screen called
 * `t()` at all. The per-key English fallback was written to make an
 * incomplete pack "degrade to mixed rather than broken" — at that coverage,
 * mixed *was* the broken thing, and the fallback was quietly excusing the
 * gap rather than covering it.
 *
 * Re-ruled the same day: **all static text that ships with the app**, prose
 * included, not just the chrome. What still cannot change is what the player
 * or the corpus wrote — course content, tune and collection names,
 * instrument names, the editor (an author's tool). Those are authorship, and
 * translating them would mean translating somebody's music.
 *
 * ## The three things that keep it honest
 *
 * 1. **English is the source of truth**, and a pack is a partial map over the
 *    same keys. A missing key falls back rather than blanking.
 * 2. **`i18n/coverage.test.ts` fails by name** — a string on screen that
 *    skipped `t()`, a key a pack lacks, a domain label that has drifted from
 *    its key. The landing page has had this guard since it was built
 *    (`tools/site.mjs` refuses to assemble when the English copy drifts from
 *    a pack); the app had none, which is the whole reason coverage rotted to
 *    a third. A build-time rule needs a build-time check.
 * 3. **Every pack still wants a native brass player's pass.** The ear rule
 *    has a linguistic twin, and the assistant who drafted these is native in
 *    none of them. Corrections are one-line edits.
 *
 * The locale is a module variable set by `App` from settings before children
 * render, not context: every locale change is a settings change, settings
 * changes re-render the tree from `App`, and threading a context through
 * forty components for a value that changes once a year would be ceremony.
 *
 * ## Domain labels
 *
 * Difficulty names, drill names, register and mode labels live in the domain
 * (`exercise/`, `storage/settings.ts`) and are rendered through keys derived
 * from their ids. The English stays in the table — guard tests elsewhere pin
 * those strings against what the generator can actually play — and the
 * coverage test asserts the table and the key still agree, so the two cannot
 * drift apart silently.
 */

import { DE } from './de';
import { NL } from './nl';
import { FR } from './fr';
import { ES } from './es';
import { IT } from './it';
import { PT_PT } from './pt-PT';
import { PT_BR } from './pt-BR';
import { PAID_MY_MUSIC, PAID_RHYTHM, PAID_TEACHER } from './paid';
import type { EN_MY_MUSIC, EN_RHYTHM, EN_TEACHER } from './paid';

export const EN = {
  // Words that appear on more than one screen. One key, so the German for
  // "Back" cannot be right on the course screen and missing on Progress —
  // which is exactly the fault the player found.
  'common.back': 'Back',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.forget': 'Forget',
  'common.done': 'Done',
  'common.clear': 'Clear',

  // The home screen
  'home.structured': 'Structured Learning',
  'home.free': 'Free play',
  'home.start': 'Start',
  'home.myMusic': 'My Music',
  'home.instrument': 'Instrument',
  'home.clef': 'Clef',
  'home.language': 'Language',
  'home.keys': 'Keys',
  'home.drill': 'Drill',
  'home.difficulty': 'Difficulty',
  'home.timeSignature': 'Time signature',
  'home.register': 'Register',
  'home.tunesFrom': 'Tunes from',
  'home.composed': 'Composed',
  'home.selection': 'Selection',
  'home.medley': 'Random medley',
  'home.defined': 'Defined',
  'home.favourWrong': 'Favour notes I get wrong',
  'home.keysRoute': 'Plays {route}, changing key as it goes.',
  'home.doubleSharp':
    'A book writes the raised seventh of {key} as a double sharp. This app never prints one, so it is written as the natural above.',
  'home.composedNote':
    'Fresh tunes written for this run. Choose one or more libraries to play written music instead.',
  'home.nothingAtLevel':
    'Nothing here is written at this level, so composed tunes will play instead. Try another level.',
  'home.medleyNote': 'Whatever is in the chosen libraries, at the chosen level.',
  'home.playingSteps.one': 'Playing {n} step in the order you set it, in its own key.',
  'home.playingSteps.other':
    'Playing {n} steps in the order you set them, each in its own key.',
  'home.shortenedSpan':
    '{instrument} in {key} has only room for {span}, so that is what you will get — the drill’s starting note sits too high for anything further.',
  'home.writtenRange': 'Written range {low} to {high}.',
  'home.writtenRangeConcert': 'Written range {low} to {high} (concert pitch).',

  'clef.treble': 'Treble',
  'clef.bass': 'Bass',
  /** The chip's short forms: identity in a space one word wide. */
  'clefShort.treble': 'Treble',
  'clefShort.bass': 'Bass',

  // The materials. `kind.<id>` and `kind.<id>.blurb` mirror `EXERCISE_KINDS`;
  // the blurb is pinned to what the generator can play by a test in
  // `generate.test.ts`, which reads the English in the table.
  'kind.drills': 'Drills',
  'kind.phrases': 'Sight-reading',
  'kind.themes': 'Themes',
  'kind.drills.blurb': 'Scales and arpeggios.',
  'kind.phrases.blurb': 'Musical phrases with contour, leaps and rests.',
  'kind.themes.blurb': 'Musical melodies you know and enjoy.',

  // Choosing tunes and keys
  'picker.title': 'Choose tunes and keys',
  'picker.available': 'Available',
  'picker.steps':
    'Tap a tune, then one of its keys, to add a step. The same tune may go in twice — in two keys, or the same one.',
  'picker.note':
    'Not every tune fits every key on every instrument. Nominate keys here, and each tune below offers the ones it can play on {instrument}.',

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
  'gate.metronomeVolumeNote':
    'You will hear it as you move it. The click is pitched to carry over an instrument in the room — turn it down when you are reading against the app’s own voice.',
  'gate.key': 'Key',
  'gate.yourChoice': 'Yours to choose for this level',
  'gate.keyRemembered': 'Remembered for the next level that leaves the key to you.',
  'gate.setByCourse': 'Set by the course for this level.',
  'gate.variableTempo': 'Variable tempo',
  'gate.scrollSpeed': 'Scroll speed',
  'gate.scrollSpeedNote': 'How fast the music travels, whatever the tempo. Spacing follows it.',
  'gate.conductorStyle': 'Conductor style',
  'gate.conductorStyleNote':
    'How sharply the beat lands. Smooth is harder to follow, and meant to be.',
  'gate.cushion': 'Cushion',
  'gate.cushionNote':
    'How loud the soft sound behind a note is until you finger it right, against the instrument that takes over when you do.',
  'gate.cushionOff':
    'Off on this output: its sound arrives {ms}ms late, so the instrument taking over would be heard long after the fingering it answers. The judgement shows on the screen instead.',
  'gate.timingTolerance': 'Timing tolerance',
  'gate.countIn': 'Count-in',
  'gate.countIn.none': 'None',
  'gate.countIn.1': '1 bar',
  'gate.countIn.2': '2 bars',
  'gate.compound': 'Dotted crotchets — {n} to the bar, the beat you count.',
  'beat.both': 'Metronome + conductor',
  'beat.none': 'Nothing keeps time',

  'reading.scrolling': 'Scrolling line',
  'reading.paged': 'Read the page',
  'playback.reference': 'Play the notes',
  'playback.off': 'Silent',
  'fingerings.trouble': 'Where I struggle',
  'fingerings.never': 'Never',
  'fingerings.always': 'Every note',
  'register.low': 'Low',
  'register.middle': 'Middle',
  'register.high': 'High',
  'conductorStyle.smooth': 'smooth',
  'conductorStyle.flowing': 'flowing',
  'conductorStyle.lively': 'lively',
  'conductorStyle.crisp': 'crisp',
  'conductorStyle.marcato': 'marcato',

  // The levels. `difficulty.<id>` mirrors `DIFFICULTIES`; the pattern label
  // and blurb are what a drill shows instead, since for a scale the useful
  // fact is how far the shape reaches rather than what the level is called.
  'difficulty.beginner': 'Beginner',
  'difficulty.beginner.blurb': 'Steps and thirds over an octave, crotchets and minims. No accidentals.',
  'difficulty.beginner.patterns': 'Fifth',
  'difficulty.beginner.patternsBlurb': 'The first five notes of the key, up and down, in plain crotchets.',
  'difficulty.easy': 'Easy',
  'difficulty.easy.blurb': 'An octave and a half, quavers, the occasional accidental and tie.',
  'difficulty.easy.patterns': '1 octave',
  'difficulty.easy.patternsBlurb': 'A full octave, up and down, in plain crotchets.',
  'difficulty.medium': 'Medium',
  'difficulty.medium.blurb':
    'Wider leaps, dotted rhythms, ties over the bar line, accidentals in earnest.',
  'difficulty.medium.patterns': '2 octaves',
  'difficulty.medium.patternsBlurb': 'Two octaves, with quavers mixed in. Dotted rhythms wait for Hard.',
  'difficulty.hard': 'Hard',
  'difficulty.hard.blurb': 'Two octaves, semiquaver runs, frequent accidentals.',
  'difficulty.hard.patterns': '2 oct · mixed',
  'difficulty.hard.patternsBlurb': 'Two octaves, with semiquaver runs and the occasional rest.',

  // The drills, mirroring `DRILLS` in `exercise/generate.ts`.
  'drill.major-scale': 'Major scale',
  'drill.harmonic-minor-scale': 'Harmonic minor scale',
  'drill.melodic-minor-scale': 'Melodic minor scale',
  'drill.tonic-arpeggio': 'Tonic arpeggio',
  'drill.subdominant-arpeggio': 'Subdominant arpeggio',
  'drill.dominant-arpeggio': 'Dominant arpeggio',
  'drill.dominant-7th': 'Dominant 7th',
  'drill.relative-minor-arpeggio': 'Minor arpeggio',

  // The play surface
  'play.tapToStart': 'Tap to start',
  'play.loading': 'Loading instrument…',
  'play.starting': 'Starting…',
  'play.tryAgain': 'Try again',
  'play.stop': 'Stop',
  'play.continue': 'Continue',
  'play.pause': 'Pause',
  'play.start': 'Start',
  'play.ready': 'Ready',
  'play.lockStopped': 'The run stopped when the screen went dark — nothing is judged unseen.',
  'play.stalled': 'Audio didn’t start',
  'play.stalledNote':
    'The phone stopped the sound before the exercise got going — it does this after the app has been away — which leaves the count-in stuck. Try again starts the sound afresh.',
  'play.leadNote': 'Sound brought forward {ms} ms for {name}',
  'play.backOneBar': 'Back one bar',
  'play.backFiveBars': 'Back five bars',
  'play.calibrationTitle': 'Calibration Required',
  'play.calibrationBody':
    'Calibrate your speakers or headphones with the beat for best user experience.',
  'play.calibrationWhere': 'You can measure {output} at any time from Outputs, in the Advanced menu.',
  'play.anOutput': 'an output',
  'play.calibrateNow': 'Calibrate Now',
  'play.later': 'Later',
  'play.acceptOffset': 'Accept current offset ({ms}ms)',

  // The course

  // The practice screen

  // The results screen
  'results.correct': 'Correct',
  'results.wrongValves': 'Wrong valves',
  'results.missed': 'Missed',
  'results.another': 'Another',
  'results.sameAgain': 'Same again',
  'results.settings': 'Settings',
  'results.dontCount': 'Don’t count this run — I wasn’t really playing',
  'results.windowed':
    'Over the last {bars} bars — {whole}% across the whole run, longest streak {streak}',
  'results.wholeRun': '{correct} of {total} notes, longest run {streak}',
  'results.beyond.one':
    '{n} bar beyond the length you chose — the music kept going, and so did you.',
  'results.beyond.other':
    '{n} bars beyond the length you chose — the music kept going, and so did you.',
  'results.averageLate': 'Average {ms} ms late on the notes you got right.',
  'results.notCounted': 'Nothing was played, so this run is not counted towards your progress.',
  'results.whatYouPlayed': 'What you played',
  'results.allGreen': 'Every note in green — nothing to correct.',
  'results.fingeringNote': 'The fingering under a note is the one it wanted.',
  'results.worthDrilling': 'Worth drilling',
  'results.drillingNote':
    'Accumulated across sessions on {instrument} in {clef} clef, and spelled in the key you have just played.',

  // The progress report

  // Outputs, and measuring one
  'outputs.title': 'Outputs',
  'outputs.intro':
    'Every way of hearing the app is a little behind it, and each one by a different amount — Bluetooth headphones by a lot, wired ones by less, and this device’s own speaker by whatever its hardware costs. Measure each one once, and the app brings the sound forward by that much whenever it is chosen.',
  'outputs.choosing':
    'Choosing here does not move the sound. Your phone decides where it plays — plug in headphones and it plays through them, whatever is selected below. The choice tells the app which output is actually in your ears, so the right correction is in force; when you switch to another, say so here, because the app cannot notice on its own.',
  'outputs.notMeasured': 'Not measured yet',
  'outputs.lead': 'Sound brought forward {ms} ms',
  'outputs.measure': 'Measure',
  'outputs.measureNamed': 'Measure {name}',
  'outputs.measureNamedAgain': 'Measure {name} again',
  'outputs.forgetNamed': 'Forget {name}',
  'outputs.add': 'Add an output',

  'calibrate.title': 'Measure {name}',
  'calibrate.intro':
    'Listen through the output you want to measure. Each note should sound at the moment its notehead crosses the line — if the sound arrives after what you see, bring it forward until the two land together.',
  'calibrate.late': 'Sound is late — bring it forward',
  'calibrate.early': 'Sound is early — push it back',
  'calibrate.lead': 'Sound brought forward',
  'calibrate.leadAria': 'Sound brought forward, in milliseconds',
  'calibrate.drag':
    'Or drag, if the sound is a long way out. Bluetooth headphones are often a fifth of a second behind.',
  'calibrate.name': 'What is this output called?',
  'calibrate.namePlaceholder': 'Headphones',

  // My Music

  // Choosing bars from a printed part

  // The range picker, and the dials
  'range.choose': 'Choose the range myself',
  'range.lowest': 'Lowest',
  'range.highest': 'Highest',
  'range.stave': 'Range: {low} to {high}',
  'range.note': '{span} — every note in it, not favouring the middle.',
  'dial.key': 'Key',
  'dial.tempo': 'Tempo',
  'dial.tempoValue': '{n} beats per minute',
  'dial.valves': 'Valves',

  // When it breaks
  'error.title': 'Something broke',
  'error.body':
    'The app stopped rather than showing you something wrong. This is a fault worth reporting — the message below is the useful part.',
  'error.version': 'version {version} · built {built}',
  'error.back': 'Back to the start',
} as const;

/**
 * The paid features' strings, present only in the build that has them.
 *
 * Read through the injected literals **directly**, never through a constant:
 * `vite.config.ts` substitutes per use site, and an indirection defeats the
 * elimination — the failure `check-web-bundle.mjs` was written for, twice
 * over. `false ? PAID_… : {}` folds, the binding goes unreferenced, and the
 * module is tree-shaken out. `check:web` fingerprints a string from each
 * bucket so this is proven on every deploy rather than believed.
 *
 * The keys still exist in `StringKey` in both builds: the free build simply
 * has no screen that asks for them, and a type that changed shape with the
 * target would make the two products two codebases.
 */
const MY_MUSIC: Record<string, Pack> = __HAS_MY_MUSIC__ ? PAID_MY_MUSIC : {};
const TEACHER: Record<string, Pack> = __HAS_TEACHER__ ? PAID_TEACHER : {};
const RHYTHM: Record<string, Pack> = __HAS_RHYTHM__ ? PAID_RHYTHM : {};

/**
 * Every key the app can name, English included, for typing and for the
 * coverage guard. The paid entries are typed from `EN_PAID` below rather than
 * from the merged object, so the union does not depend on a build flag.
 */
export type StringKey =
  | keyof typeof EN
  | keyof typeof EN_MY_MUSIC
  | keyof typeof EN_TEACHER
  | keyof typeof EN_RHYTHM;
export type Pack = Partial<Record<StringKey, string>>;
export type Locale = 'en' | 'de' | 'nl' | 'fr' | 'es' | 'it' | 'pt-PT' | 'pt-BR';

/**
 * Offered in their own names: nobody hunts for their language in another.
 *
 * **Portuguese is two entries, and that is deliberate.** The words this app
 * says most often are exactly the ones that fork — screen (ecrã / tela),
 * phone (telemóvel / celular), headphones (auscultadores / fones de ouvido) —
 * so one "Portuguese" would have been wrong in Lisbon or wrong in São Paulo
 * on every calibration screen. Ruled by the player, 2026-08-28. It is also
 * what forced regional matching in `localeFromBrowser`, a question this file
 * had deferred to the US-English fork; that fork now has its road built.
 */
export const LOCALES: ReadonlyArray<{ id: Locale; name: string }> = [
  { id: 'en', name: 'English' },
  { id: 'de', name: 'Deutsch' },
  { id: 'nl', name: 'Nederlands' },
  { id: 'fr', name: 'Français' },
  { id: 'es', name: 'Español' },
  { id: 'it', name: 'Italiano' },
  { id: 'pt-PT', name: 'Português' },
  { id: 'pt-BR', name: 'Português (Brasil)' },
];

/**
 * Where a bare primary subtag lands when a browser does not say which region.
 *
 * A device set to Brazilian Portuguese sends `pt-BR` and matches exactly; a
 * bare `pt` is the unmarked case and takes European Portuguese. Written down
 * rather than left to whichever pack happens to be first in `LOCALES`, which
 * is how a reordering would silently move every unmarked visitor.
 */
const UNMARKED: Record<string, Locale> = { pt: 'pt-PT' };

const CORE: Record<Locale, Pack> = {
  en: {},
  de: DE,
  nl: NL,
  fr: FR,
  es: ES,
  it: IT,
  'pt-PT': PT_PT,
  'pt-BR': PT_BR,
};

/**
 * Each language's core strings with whatever paid buckets this build carries
 * folded in, resolved once rather than on every `t()`.
 *
 * In the free build the two spreads are empty objects, so this is the core
 * pack and nothing else — and `paid.ts` has already been dropped from the
 * bundle by then.
 */
const PACKS: Record<Locale, Pack> = Object.fromEntries(
  LOCALES.map((entry) => [
    entry.id,
    { ...CORE[entry.id], ...(MY_MUSIC[entry.id] ?? {}), ...(TEACHER[entry.id] ?? {}), ...(RHYTHM[entry.id] ?? {}) },
  ]),
) as Record<Locale, Pack>;

/**
 * English, likewise: the source of truth is the fallback for every key a pack
 * lacks, so it has to carry the paid strings in the build that shows them.
 */
const ENGLISH: Partial<Record<StringKey, string>> = {
  ...EN,
  ...(MY_MUSIC.en ?? {}),
  ...(TEACHER.en ?? {}),
  ...(RHYTHM.en ?? {}),
};

/**
 * Every English string *this build* carries, core plus whatever paid buckets
 * the flags let through — the coverage guard's source of truth.
 *
 * `EN` alone is no longer that: it is the core half, and a guard that read it
 * directly would quietly stop checking the paid strings the moment they moved
 * to `paid.ts`. The tests run under the paid target, so this is the full set
 * there, which is the set that must be complete in every pack.
 */
export function englishStrings(): Partial<Record<StringKey, string>> {
  return ENGLISH;
}

/** The pack behind a locale, for the coverage guard to enumerate. */
export function packFor(locale: Locale): Pack {
  return PACKS[locale];
}

let current: Locale = 'en';

export function setLocale(locale: string): void {
  current = LOCALES.find((entry) => entry.id.toLowerCase() === locale.toLowerCase())?.id ?? 'en';
}

/**
 * What language the app is speaking, for `Intl` — dates in Progress, mostly.
 *
 * The ids are BCP-47 tags already (`pt-BR`, not `ptBR`), chosen that way so
 * this needs no translation layer and `toLocaleDateString` gets Brazilian
 * month names on a Brazilian device.
 */
export function localeTag(): string {
  return current;
}

/**
 * A string in the current language, with `{name}` placeholders filled.
 *
 * Placeholders rather than concatenation because word order is the first
 * thing a translation changes: "2 bars" is "2 Takte" but "bar 2" is "Takt 2",
 * and a sentence assembled from fragments in English order cannot become
 * either. The pack author moves `{n}` where their language wants it.
 *
 * A placeholder the caller did not supply is left standing rather than
 * blanked — a visible `{n}` names its own fault, where an empty gap reads as
 * a rendering bug somewhere else entirely.
 */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  /*
   * The key itself as the last resort, never an empty string. In the free
   * build a paid key resolves to nothing — no screen asks for one, but if a
   * refactor ever wires one up, `import.playIt` on screen names its own fault
   * where a blank space would read as a broken layout somewhere else.
   */
  const source: string = PACKS[current][key] ?? ENGLISH[key] ?? key;
  if (!vars) return source;
  return source.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/**
 * The singular or plural form of a counted phrase.
 *
 * Two forms, which is what English, German, Dutch and French all need and no
 * more. A language wanting a third (Polish, Russian) will need `Intl.
 * PluralRules` and a `.few`/`.many` convention here; the call sites will not
 * change, which is why the count goes through this rather than through a
 * ternary at each of them — there were four of those, all English-shaped.
 */
export function tCount(base: string, n: number, vars?: Record<string, string | number>): string {
  const key = `${base}.${n === 1 ? 'one' : 'other'}` as StringKey;
  return t(key, { n, ...vars });
}

/**
 * The language a visitor *arrives* in, from the landing page that sent them.
 *
 * The site is two halves and they were deaf to each other: `/de/` is a whole
 * German page whose call to action pointed at a bare `/app/`, so a German
 * reader pressed a German button and landed in an English app, every time.
 * Nothing was lost in transit — nothing was ever sent. `site.mjs` now writes
 * `?lang=de` into the translated pages' links, and this reads it.
 *
 * An explicit arrival outranks a stored choice: following a link from a page
 * written in one language is the freshest thing the visitor has said about
 * which they want, fresher than a selection made on some earlier visit.
 */
export function localeFromUrl(search: string): Locale | null {
  const asked = new URLSearchParams(search).get('lang');
  if (asked === null) return null;
  // Case-insensitively: a URL says `pt-br`, the locale id is `pt-BR`, and a
  // link that worked in one case and not the other would be a cruel bug.
  return LOCALES.find((entry) => entry.id.toLowerCase() === asked.toLowerCase())?.id ?? null;
}

/**
 * The browser's own preference, used only when the visitor has said nothing:
 * first run, no stored settings, no language in the URL.
 *
 * Matched on the primary subtag, so `de-AT` and `fr-CA` find their packs. The
 * region is dropped because no pack is regional yet — when the US-English
 * fork lands (crotchet → quarter note) this is the function that learns to
 * tell `en-GB` from `en-US`, and it is the only one that has to.
 */
export function localeFromBrowser(languages: readonly string[]): Locale | null {
  for (const tag of languages) {
    const exact = LOCALES.find((entry) => entry.id.toLowerCase() === tag.toLowerCase());
    if (exact) return exact.id;

    const primary = tag.toLowerCase().split('-')[0];
    if (primary in UNMARKED) return UNMARKED[primary];
    const match = LOCALES.find((entry) => entry.id === primary);
    if (match) return match.id;
  }
  return null;
}
