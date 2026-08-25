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

import { cpSync, existsSync, readdirSync, rmSync, statSync } from 'node:fs';
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
  cpSync(SITE, DIST, { recursive: true });

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

  const top = readdirSync(DIST).sort().join(', ');
  console.log(`assembled ${DIST}/: ${top}`);
  console.log('  front door at /, app at /app/, CNAME present');
} else {
  console.error('Usage: node tools/site.mjs clear|assemble');
  process.exit(2);
}
