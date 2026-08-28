/**
 * Assembles what GitHub Pages publishes: a front door at `/`, the app at `/app/`.
 *
 *     node tools/site.mjs clear      before the web build
 *     node tools/site.mjs assemble   after it
 *
 * ## Why the app moved off the root
 *
 * Until 2026-08-25 brassmaster.net *was* the app: `<div id="root"></div>` and
 * nothing else. A crawler saw an empty body, there was no robots.txt and no
 * sitemap, and the only words on the whole site were the title and one meta
 * description — so the single thing it could rank for was "Brass Master",
 * which nobody types. Learners search for a fingering chart, or for sight
 * reading practice, or for their instrument by name.
 *
 * A landing page needs the root, so the app takes `/app/`. That was only
 * affordable because there were no installed copies to break: the band is on
 * the legacy app, and the player's own PWAs were uninstalled during 4.2's
 * device work. **It would not be affordable again** — moving `start_url` under
 * an installed PWA orphans it.
 *
 * ## Why `clear` exists, and why it is not paranoia
 *
 * `deploy.yml` builds the paid app first, to prove that path still compiles,
 * and its own comment names the hazard: *"both write to dist/, and the last
 * one to run is the one that gets published. Reversing the order would quietly
 * deploy the paid app to the free site."*
 *
 * Splitting the outputs makes that hazard worse rather than better. The paid
 * build still writes `dist/` (Capacitor's `webDir`, and the tailnet copy's
 * home), while the web build now writes `dist/app/` — so a paid `index.html`
 * left at the root would be *published as the site* while every check passed,
 * because the checks read `dist/app`. `clear` removes the directory outright
 * before the web build, so there is nothing to inherit.
 */

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';
const APP = join(DIST, 'app');
const SITE = 'site';

const mode = process.argv[2];

if (mode === 'clear') {
  rmSync(DIST, { recursive: true, force: true });
  console.log(`cleared ${DIST}/ — the web build starts from nothing`);
} else if (mode === 'assemble') {
  if (!existsSync(join(APP, 'index.html'))) {
    console.error(`No app at ${APP}/ — run the web build before assembling.`);
    process.exit(2);
  }
  cpSync(SITE, DIST, {
    recursive: true,
    // The packs are build input, not site content.
    filter: (src) => !src.endsWith('translations.mjs'),
  });

  /*
   * The custom domain lives or dies by this file, and it is the one mistake
   * this restructure could make invisibly: CNAME used to sit in `public/`, so
   * it would now be copied to `dist/app/CNAME` where Pages never looks, and
   * brassmaster.net would resolve to nothing on the next deploy. It moved to
   * `site/`, and this asserts it arrived.
   */
  const cname = join(DIST, 'CNAME');
  if (!existsSync(cname) || !statSync(cname).isFile()) {
    console.error(
      `No CNAME at ${cname}. The custom domain would break on deploy — it belongs in ${SITE}/.`,
    );
    process.exit(2);
  }

  /*
   * The translated landing pages, generated from the English one. Every
   * source string must be FOUND — a pack whose English has drifted from the
   * page fails the build by name, because a translation that silently stopped
   * matching would ship half a page in each language and nothing would say
   * so. Replacement is all-occurrences ("Start practising" appears twice, by
   * design, and must translate twice).
   */
  const { LANGUAGES } = await import('../site/translations.mjs');
  const english = readFileSync(join(DIST, 'index.html'), 'utf8');
  for (const { lang, pairs } of LANGUAGES) {
    let page = english;
    for (const [source, translated] of pairs) {
      if (!page.includes(source)) {
        console.error(`translations.mjs (${lang}): source string no longer on the page:\n  ${source}`);
        process.exit(2);
      }
      page = page.split(source).join(translated);
    }
    page = page.replace('<html lang="en">', `<html lang="${lang}">`);
    page = page.replace(
      '<link rel="canonical" href="https://brassmaster.net/" />',
      `<link rel="canonical" href="https://brassmaster.net/${lang}/" />`,
    );
    page = page.replace(
      'property="og:url" content="https://brassmaster.net/"',
      `property="og:url" content="https://brassmaster.net/${lang}/"`,
    );
    page = page.replace(' href="/" class="active"', ' href="/"');
    page = page.replace(`<a href="/${lang}/">`, `<a href="/${lang}/" class="active">`);
    mkdirSync(join(DIST, lang), { recursive: true });
    writeFileSync(join(DIST, lang, 'index.html'), page);
  }
  console.log(`landing pages: en + ${LANGUAGES.map((l) => l.lang).join(', ')}`);

  const top = readdirSync(DIST).sort().join(', ');
  console.log(`assembled ${DIST}/: ${top}`);
  console.log('  front door at /, app at /app/, CNAME present');
} else {
  console.error('Usage: node tools/site.mjs clear|assemble');
  process.exit(2);
}
