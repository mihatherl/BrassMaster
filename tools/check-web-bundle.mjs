/**
 * Proves the free web build does not contain the paid features.
 *
 * The free/paid line is drawn by `__HAS_MY_MUSIC__`, `__HAS_MICROPHONE__` and
 * `__HAS_TEACHER__` at build time, and the whole value of drawing it there rather than at
 * runtime is that the free bundle does not *hold* what it does not offer —
 * there is nothing to unlock with a developer-tools flag and nothing to
 * download. That property lives in the output of a build, not in any source
 * file, so it is checked here rather than asserted in the suite.
 *
 * It has already been broken twice while being built, both times silently:
 * once with a static import, which keeps the code whatever the flag says, and
 * once by reading the flag through an imported constant, which left the chunk
 * in the bundle because the substitution is per use site and does not cross a
 * module boundary. Neither showed up on screen — the app behaved correctly and
 * shipped the code anyway. That is exactly the failure this exists to catch.
 *
 *     node tools/check-web-bundle.mjs [dist]
 *
 * Expects a *web* build to be sitting in `dist` already: `npm run build:web`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = process.argv[2] ?? 'dist';

/**
 * What must not appear in a free build, by the feature it would belong to.
 *
 * The two groups are not the same kind of check, and the difference is worth
 * knowing before trusting either.
 *
 * **My Music** is matched by name — tag names and function names its code
 * happens to contain. That is a heuristic: it would miss a rewrite that
 * renamed everything, so it is kept honest by choosing strings specific to
 * that code rather than to the domain (`score-partwise` is a tag only a parser
 * cares about; "MusicXML" could legitimately appear in free prose one day).
 *
 * **The microphone** is matched at its chokepoint, which is stronger. A page
 * cannot reach a microphone in any browser without going through
 * `navigator.mediaDevices.getUserMedia`, and property names survive
 * minification, so this catches the feature however it is written or named —
 * including before it exists, which is the state it is in today.
 */
const PAID_ONLY = {
  'My Music': ['score-partwise', 'unfoldRepeats', 'importPart', 'ImportScreen'],
  'the microphone': ['getUserMedia', 'mediaDevices'],
  /*
   * The paid features' *words*, not their code — a leak this file could not
   * see until 2026-08-28, because it was looking only for identifiers.
   *
   * The language packs are plain objects imported unconditionally, so every
   * sentence of My Music and the course screens was shipping to the free web
   * build in eight languages, describing a product it had no code to run.
   * `i18n/paid.ts` moved them behind the same two literals the code uses; one
   * string from each bucket, in a language whose pack has no other route into
   * this build, is what proves the fold still happens.
   *
   * Chosen to be unmistakable: neither is a substring of any core string, and
   * both would survive minification intact because they are string data.
   */
  'the paid language packs': ['Kept in My Music', 'Guardada em Minhas partituras', 'Recent sittings', 'Tenuta in Le mie partiture'],
  // The ladder key became the course key when the ladder became courses
  // (2026-08-26); the fingerprint moved with it, deliberately — the ratified
  // free-taster ruling says these tripwires move on purpose or not at all.
  'teacher mode': ['brass-trainer:course:', 'brass-trainer:sessions:'],
  /*
   * Two strings, two different folds proven. "Dotted pairs" lives only in
   * `exercise/rhythm.ts` — its absence proves the pattern library
   * tree-shakes out with the screens that read it. The blurb sentence lives
   * in `EXERCISE_KINDS`' flag-gated spread AND the paid language packs — its
   * absence proves the `typeof __HAS_RHYTHM__` fold actually eliminates,
   * which this feature uniquely leans on (the guard exists for the tools,
   * which import types.ts with no defines at all).
   */
  'rhythm drills': ['Dotted pairs', 'One rhythm pattern at a time'],
};

/**
 * Directories under the build that are not the app.
 *
 * `spike/` holds throwaway diagnostic pages — the pitch spike among them — and
 * `vite.config.ts` already keeps them out of the precache and the navigation
 * fallback for the same reason: they are not part of the product and are not
 * reachable from it. They *do* use `getUserMedia`, which is the point of the
 * pitch one, so scanning them would fail every build for a page the app never
 * loads.
 *
 * Note what this does and does not say. It says the spike pages are not the
 * app; it does not say they are private. They are published alongside it and
 * anyone with the URL can open them. If that ever matters, the fix is to stop
 * deploying them to the web target — not to widen this list.
 */
const NOT_THE_APP = ['spike'];

function filesUnder(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

let dist;
try {
  dist = filesUnder(root);
} catch {
  console.error(`No build to check at ${root}/ — run \`npm run build:web\` first.`);
  process.exit(2);
}

// The service worker's precache manifest lists every asset by name, so a
// leftover chunk shows up there too — worth checking, since that is also how a
// dropped chunk would still be fetched.
const searched = dist.filter((path) => {
  if (!/\.(js|css|html|json)$/.test(path)) return false;
  const [top] = relative(root, path).split(sep);
  return !NOT_THE_APP.includes(top);
});

if (searched.length === 0) {
  console.error(`Nothing to search in ${root}/ — is this a build?`);
  process.exit(2);
}

const found = [];
for (const path of searched) {
  const text = readFileSync(path, 'utf8');
  for (const [feature, needles] of Object.entries(PAID_ONLY)) {
    for (const needle of needles) {
      if (text.includes(needle)) found.push({ feature, path, needle });
    }
  }
}

if (found.length > 0) {
  const leaked = [...new Set(found.map((hit) => hit.feature))];
  console.error(`The web build contains paid-only code: ${leaked.join(', ')}.\n`);
  for (const { feature, path, needle } of found) {
    console.error(`  ${path}: ${needle}  (${feature})`);
  }
  console.error(
    '\nThe free build must not hold what it does not offer. Check that the' +
      '\nimport is dynamic and that it is guarded by the injected literal' +
      '\n(`__HAS_MY_MUSIC__`, `__HAS_MICROPHONE__`, `__HAS_TEACHER__`) directly' +
      '\n— not by a' +
      '\nconstant imported from anywhere, or assigned to a local first,' +
      '\nneither of which survives the journey to Rollup.',
  );
  process.exit(1);
}

const guarded = Object.keys(PAID_ONLY).join(', ');
console.log(`The web build is clean: ${searched.length} files checked, no ${guarded}.`);
