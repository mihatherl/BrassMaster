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
import {
  englishStrings,
  LOCALES,
  packFor,
  t,
  tCount,
  setLocale,
  localeFromBrowser,
  localeFromUrl,
  type StringKey,
} from './index';
import { DIFFICULTIES } from '../exercise/difficulty';
import { DRILLS } from '../exercise/generate';
import { EXERCISE_KINDS } from '../exercise/types';
import { FINGERING_MODES, PLAYBACK_MODES, READING_MODES, REGISTERS } from '../storage/settings';

/*
 * Derived from `LOCALES`, never listed here.
 *
 * The first version of this file hardcoded `{ de, nl, fr }`, which meant the
 * next language added would have been the one language nothing checked — a
 * guard with a hole exactly where the new work goes. Adding a locale now adds
 * its tests, whether or not anybody remembers this file exists.
 */
const PACKS = Object.fromEntries(
  LOCALES.filter((entry) => entry.id !== 'en').map((entry) => [entry.id, packFor(entry.id)]),
);

describe('the packs answer every key', () => {
  for (const [lang, pack] of Object.entries(PACKS)) {
    it(`${lang} is complete`, () => {
      const missing = Object.keys(englishStrings()).filter((key) => !(key in pack));
      /*
       * Named, not counted. "3 keys missing" sends the next person hunting;
       * `site.mjs` learned this first and prints the string it could not find.
       */
      expect(missing, `${lang} has no translation for: ${missing.join(', ')}`).toEqual([]);
    });

    it(`${lang} invents no keys`, () => {
      const extra = Object.keys(pack).filter((key) => !(key in englishStrings()));
      expect(extra, `${lang} translates keys that no longer exist: ${extra.join(', ')}`).toEqual([]);
    });

    it(`${lang} keeps every placeholder its English has`, () => {
      /*
       * A dropped `{n}` is the failure this catches, and it is invisible on
       * screen in a language nobody in the room reads: the sentence still
       * renders, just without the number it was written to carry.
       */
      const wrong: string[] = [];
      for (const [key, english] of Object.entries(englishStrings())) {
        const translated = pack[key as StringKey];
        if (translated === undefined) continue;
        const want = [...english.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        const got = [...translated.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
        if (want.join() !== got.join()) wrong.push(`${key} (wants ${want.join(', ') || 'none'})`);
      }
      expect(wrong, `${lang} placeholders differ from English: ${wrong.join('; ')}`).toEqual([]);
    });
  }
});

/**
 * The mirror of the sweep guard, and just as necessary.
 *
 * That one catches a string on screen that no pack translates. This catches a
 * key eight packs translate that nothing on screen ever asks for — dead
 * weight in every bundle, and worse, dead work: a native reviewer spending
 * their goodwill correcting a sentence no player will read. Two turned up the
 * first time this ran (`common.outputs`, `play.back`), both left behind when
 * their call sites moved to `common.*`.
 *
 * Template call sites (`t(`difficulty.${id}`)`) are counted by prefix, and
 * `tCount` bases by their `.one`/`.other` pair, because neither ever writes a
 * whole key out for grep to find.
 */
describe('every key is asked for by something', () => {
  const sources = ['ui', 'exercise', 'storage', 'render', 'engine', 'domain', 'import']
    .flatMap((area) => {
      const dir = join(import.meta.dirname, '..', area);
      try {
        return readdirSync(dir)
          .filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.'))
          .map((f) => readFileSync(join(dir, f), 'utf8'));
      } catch {
        return [];
      }
    })
    .join('\n');

  /** `t(`kind.${x}`)` can reach any key starting `kind.` */
  const prefixes = [...sources.matchAll(/[`']([\w.]*?)\$\{/g)].map((m) => m[1]);
  /** `tCount('score.practise', n)` reaches `.one` and `.other`. */
  const counted = [...sources.matchAll(/tCount\(\s*'([\w.]+)'/g)].map((m) => m[1]);

  it('has sources to read', () => expect(sources.length).toBeGreaterThan(10000));

  it('leaves no key nothing asks for', () => {
    const dead = Object.keys(englishStrings()).filter((key) => {
      if (sources.includes(`'${key}'`)) return false;
      if (prefixes.some((p) => p.length > 0 && key.startsWith(p))) return false;
      if (counted.some((base) => key === `${base}.one` || key === `${base}.other`)) return false;
      return true;
    });
    expect(
      dead,
      `these keys are translated ${LOCALES.length - 1} times over and never shown:\n  ` +
        `${dead.join('\n  ')}\nDelete them from EN and every pack, or wire them up.`,
    ).toEqual([]);
  });
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
      expect(englishStrings()[key as StringKey], `EN['${key}'] has drifted from the ${what} table`).toBe(
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

/**
 * The two halves of the site, held together.
 *
 * This is the guard for the fault the player found on 2026-08-28, written so
 * it cannot come back by a different road. That fault was a German landing
 * page whose button led to an English app; the fix carried `?lang=` across.
 * But the handoff only works if the app *has* the pack the page names — add
 * `/it/` before `it` exists in `LOCALES` and every Italian reader is handed
 * to an English app again, with the link working perfectly and nothing
 * failing.
 *
 * The reverse is fine and deliberate: the app may speak a language that has
 * no landing page yet. Nobody is misdirected by that — the selector offers it.
 */
describe('the landing pages and the app agree on what is spoken', () => {
  it('never publishes a page in a language the app cannot answer in', async () => {
    const { LANGUAGES } = await import('../../site/translations.mjs');
    const spoken = new Set<string>(LOCALES.map((entry) => entry.id));
    const orphans = LANGUAGES.filter((entry) => !spoken.has(entry.lang)).map((e) => e.lang);
    expect(
      orphans,
      `these landing pages send their readers to an app with no pack: ${orphans.join(', ')}.\n` +
        'Add the pack to LOCALES, or take the page down — a page whose call to action ' +
        'lands in English is the bug this whole guard exists for.',
    ).toEqual([]);
  });

  it('gives each landing page a URL that is not its raw tag when they differ', async () => {
    const { LANGUAGES } = await import('../../site/translations.mjs');
    // `pt-PT` is a correct tag and an ugly path; the two are allowed to differ,
    // and `site.mjs` uses `dir` for the folder and `lang` for `?lang=`.
    const pt = LANGUAGES.filter((e) => e.lang.startsWith('pt'));
    expect(pt.map((e) => [e.lang, e.dir])).toEqual([
      ['pt-PT', 'pt'],
      ['pt-BR', 'pt-br'],
    ]);
  });
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
    expect(LOCALES.map((l) => l.id).sort()).toEqual([
      'de',
      'en',
      'es',
      'fr',
      'it',
      'nl',
      'pt-BR',
      'pt-PT',
    ]);
  });

  it('checks every locale but English, which is the source rather than a pack', () => {
    // Guards the derivation above: if `packFor` ever returned an empty object
    // for a real locale, every completeness test would pass by testing nothing.
    expect(Object.keys(PACKS).sort()).toEqual(['de', 'es', 'fr', 'it', 'nl', 'pt-BR', 'pt-PT']);
    for (const [lang, pack] of Object.entries(PACKS)) {
      expect(Object.keys(pack).length, `${lang} resolved to an empty pack`).toBeGreaterThan(200);
    }
  });

  it('matches a regional tag exactly before falling back to its language', () => {
    expect(localeFromBrowser(['pt-BR'])).toBe('pt-BR');
    expect(localeFromBrowser(['pt-PT'])).toBe('pt-PT');
    // A bare `pt` is the unmarked case and is written down, not left to order.
    expect(localeFromBrowser(['pt'])).toBe('pt-PT');
    expect(localeFromBrowser(['pt-AO'])).toBe('pt-PT');
  });

  it('reads a regional tag from the URL whatever its case', () => {
    expect(localeFromUrl('?lang=pt-br')).toBe('pt-BR');
    expect(localeFromUrl('?lang=pt-BR')).toBe('pt-BR');
    expect(localeFromUrl('?lang=PT-pt')).toBe('pt-PT');
  });
});
