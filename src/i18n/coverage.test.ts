/**
 * The guard the app did not have, and whose absence is the whole story.
 *
 * The landing page has had one since it was built: `tools/site.mjs` refuses to
 * assemble when the English copy drifts from a translation pack, and names the
 * language and the string it could not find. The app had nothing of the kind,
 * so a label written without `t()` shipped green through 1,386 tests — and by
 * 2026-08-28 six of twenty-three components on screen called `t()` at all,
 * "Back" translated on one screen out of six, and the player found it in an
 * evening's play. The English-fallback design meant to make a partial pack
 * "degrade to mixed rather than broken" was, at that coverage, the thing
 * excusing it.
 *
 * A build-time rule needs a build-time check. Three of them here:
 *
 *   1. every pack answers every key,
 *   2. every domain label still agrees with the key that renders it,
 *   3. no screen puts a string in front of a player without `t()`.
 *
 * The third is a heuristic over the source, not a compiler, and it is meant
 * to be: the alternative was another five weeks of coverage rotting quietly.
 * Its allowlist below is short, and every entry says why it is English.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EN, LOCALES, t, tCount, setLocale, localeFromBrowser, localeFromUrl } from './index';
import { DE } from './de';
import { NL } from './nl';
import { FR } from './fr';
import { DIFFICULTIES } from '../exercise/difficulty';
import { DRILLS } from '../exercise/generate';
import { EXERCISE_KINDS } from '../exercise/types';
import { FINGERING_MODES, PLAYBACK_MODES, READING_MODES, REGISTERS } from '../storage/settings';

const PACKS = { de: DE, nl: NL, fr: FR } as const;

describe('the packs answer every key', () => {
  for (const [lang, pack] of Object.entries(PACKS)) {
    it(`${lang} is complete`, () => {
      const missing = (Object.keys(EN) as Array<keyof typeof EN>).filter((key) => !(key in pack));
      /*
       * Named, not counted. "3 keys missing" sends the next person hunting;
       * `site.mjs` learned this first and prints the string it could not find.
       */
      expect(missing, `${lang} has no translation for: ${missing.join(', ')}`).toEqual([]);
    });

    it(`${lang} invents no keys`, () => {
      const extra = Object.keys(pack).filter((key) => !(key in EN));
      expect(extra, `${lang} translates keys that no longer exist: ${extra.join(', ')}`).toEqual([]);
    });

    it(`${lang} keeps every placeholder its English has`, () => {
      /*
       * A dropped `{n}` is the failure this catches, and it is invisible on
       * screen in a language nobody in the room reads: the sentence still
       * renders, just without the number it was written to carry.
       */
      const wrong: string[] = [];
      for (const [key, english] of Object.entries(EN)) {
        const translated = pack[key as keyof typeof EN];
        if (translated === undefined) continue;
        const want = [...english.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        const got = [...translated.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        if (want.join() !== got.join()) wrong.push(`${key} (wants ${want.join(', ') || 'none'})`);
      }
      expect(wrong, `${lang} placeholders differ from English: ${wrong.join('; ')}`).toEqual([]);
    });
  }
});

describe('the domain labels and their keys have not drifted', () => {
  /*
   * These tables stay English — other guards pin them to what the generator
   * can actually play (`generate.test.ts` reads the drills blurb) — and the
   * screens render them through keys derived from their ids. That is two
   * copies of one string, so this is the test that keeps them one string.
   */
  const pairs: Array<[string, string, string]> = [
    ...DIFFICULTIES.flatMap((d) => [
      [`difficulty.${d.id}`, d.name, 'difficulty name'] as [string, string, string],
      [`difficulty.${d.id}.blurb`, d.blurb, 'difficulty blurb'] as [string, string, string],
      [`difficulty.${d.id}.patterns`, d.patterns.label, 'pattern label'] as [string, string, string],
      [`difficulty.${d.id}.patternsBlurb`, d.patterns.blurb, 'pattern blurb'] as [string, string, string],
    ]),
    ...DRILLS.map((d) => [`drill.${d.id}`, d.name, 'drill name'] as [string, string, string]),
    ...EXERCISE_KINDS.flatMap((k) => [
      [`kind.${k.id}`, k.name, 'material name'] as [string, string, string],
      [`kind.${k.id}.blurb`, k.blurb, 'material blurb'] as [string, string, string],
    ]),
    ...REGISTERS.map((r) => [`register.${r.id}`, r.label, 'register'] as [string, string, string]),
    ...FINGERING_MODES.map((m) => [`fingerings.${m.id}`, m.name, 'fingering mode'] as [string, string, string]),
    ...READING_MODES.map((m) => [`reading.${m.id}`, m.name, 'reading mode'] as [string, string, string]),
    ...PLAYBACK_MODES.map((m) => [`playback.${m.id}`, m.name, 'playback mode'] as [string, string, string]),
  ];

  for (const [key, label, what] of pairs) {
    it(`${what} ${key}`, () => {
      expect(EN[key as keyof typeof EN], `EN['${key}'] has drifted from the ${what} table`).toBe(
        label,
      );
    });
  }
});

/**
 * Strings that are on screen in English on purpose, each with its reason.
 *
 * Kept short deliberately. Anything added here is a decision not to translate
 * something, and it should read as one.
 */
const DELIBERATELY_ENGLISH = new Set([
  // The product's name. Not translated for the same reason a band's name is not.
  'Brass Master',
  // Units and symbols. Written the same in all four languages.
  'bpm',
  'ms',
  // Licence attribution. Legal text, quoted as its licence requires it.
  '. Notation drawn with Bravura by Steinberg, SIL OFL 1.1.',
]);

/** Comments carry English forever and are not on screen. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * The strings a screen would show a player, found in its source.
 *
 * Two shapes catch nearly everything: JSX text between tags, and the handful
 * of attributes that reach a person — `aria-label` and friends, which are the
 * ones a sweep forgets first because they are invisible until somebody uses a
 * screen reader in German.
 */
export function visibleStrings(src: string): string[] {
  const body = stripComments(src);
  const found: string[] = [];
  /*
   * `[>}]` and not just `>`: a text node's left-hand neighbour is often a
   * closed JSX expression rather than a closed tag, and a stripped `{/* … *\/}`
   * comment leaves exactly that. The first version of this scanner looked for
   * `>` alone and walked straight past a hardcoded "Back" sitting under a
   * comment in `PlayScreen` — found by the render test in `i18n-screen.test`,
   * which is why both exist.
   */
  for (const m of body.matchAll(/[>}]([^<>{}()=;]*?)</g)) {
    const text = m[1].replace(/\s+/g, ' ').trim();
    /*
     * Code caught between two comparisons — `a > 0 && trail[0].at < b` puts a
     * fragment where a text node looks like it should be. Prose never holds
     * these tokens, and a screen's English always does hold three letters in
     * a row, so the two are separable without parsing TypeScript.
     */
    if (/&&|\|\||=>|[[\]]/.test(text)) continue;
    if (/^[\w$]+(\.[\w$]+)+$/.test(text)) continue;
    /*
     * A generic's opening angle bracket looks exactly like a tag's, so a
     * declaration after a closed block reads as a text node: `} … export class
     * ErrorBoundary extends Component<…>`.
     *
     * Anchored to the start on purpose. Matching these words *anywhere* would
     * be simpler and would quietly blind the guard to real prose — "type",
     * "class", "as" and "new" are ordinary English, and a sentence holding one
     * would be skipped rather than flagged. A declaration always leads with
     * its keyword; a sentence a player reads never does.
     */
    if (/^(export|import|const|let|var|class|interface|type|function|return|async)\b/.test(text))
      continue;
    if (/[A-Za-z]{3}/.test(text)) found.push(text);
  }
  const attrs = /\b(aria-label|placeholder|label|title|summary|aria-valuetext)=("([^"]*)"|'([^']*)')/g;
  for (const m of body.matchAll(attrs)) {
    const text = (m[3] ?? m[4]).trim();
    if (/[A-Za-z]{3}/.test(text)) found.push(text);
  }
  return found;
}

describe('no screen shows a string that skipped t()', () => {
  const dir = join(import.meta.dirname, '..', 'ui');
  const screens = readdirSync(dir).filter((f) => f.endsWith('.tsx') && !f.includes('.test.'));

  // If this ever finds nothing to read, the guard has stopped guarding.
  it('has screens to read', () => expect(screens.length).toBeGreaterThan(15));

  for (const file of screens) {
    it(file, () => {
      const loose = visibleStrings(readFileSync(join(dir, file), 'utf8')).filter(
        (text) => !DELIBERATELY_ENGLISH.has(text),
      );
      expect(
        loose,
        `${file} puts English on screen without t():\n  ${loose.join('\n  ')}\n` +
          'Add a key to i18n/index.ts and every pack, or — if it must stay English — ' +
          'say why in DELIBERATELY_ENGLISH.',
      ).toEqual([]);
    });
  }
});

describe('falling back, and filling in', () => {
  it('falls back to English per key rather than per pack', () => {
    setLocale('de');
    expect(t('common.back')).toBe('Zurück');
    setLocale('en');
    expect(t('common.back')).toBe('Back');
  });

  it('fills placeholders', () => {
    setLocale('en');
    expect(t('outputs.lead', { ms: 120 })).toBe('Sound brought forward 120 ms');
  });

  it('leaves a placeholder nobody supplied standing, rather than blanking it', () => {
    setLocale('en');
    // Visible nonsense names its own fault; an empty gap reads as a bug elsewhere.
    expect(t('outputs.lead')).toContain('{ms}');
  });

  it('counts in the language’s own singular and plural', () => {
    setLocale('en');
    expect(tCount('score.practise', 1)).toBe('Practise 1 bar');
    expect(tCount('score.practise', 3)).toBe('Practise 3 bars');
    setLocale('de');
    expect(tCount('score.practise', 1)).toBe('1 Takt üben');
    expect(tCount('score.practise', 3)).toBe('3 Takte üben');
    setLocale('en');
  });

  it('refuses a locale it has no pack for', () => {
    setLocale('kl');
    expect(t('common.back')).toBe('Back');
  });
});

describe('the language a visitor arrives in', () => {
  it('reads the landing page’s handoff', () => {
    expect(localeFromUrl('?lang=de')).toBe('de');
    expect(localeFromUrl('?lang=nl&utm_source=x')).toBe('nl');
  });

  it('ignores a language it does not have', () => {
    expect(localeFromUrl('?lang=eo')).toBeNull();
    expect(localeFromUrl('')).toBeNull();
  });

  it('matches the browser on the primary subtag, so de-AT finds German', () => {
    expect(localeFromBrowser(['de-AT', 'en-GB'])).toBe('de');
    expect(localeFromBrowser(['fr-CA'])).toBe('fr');
  });

  it('takes the first language the browser offers that it can speak', () => {
    expect(localeFromBrowser(['pl', 'nl-BE', 'en'])).toBe('nl');
  });

  it('says nothing when it can speak none of them', () => {
    expect(localeFromBrowser(['pl', 'ja'])).toBeNull();
    expect(localeFromBrowser([])).toBeNull();
  });

  it('offers every locale it has a pack for', () => {
    expect(LOCALES.map((l) => l.id).sort()).toEqual(['de', 'en', 'fr', 'nl']);
  });
});
