/**
 * Proves the free web build does not contain the paid features.
 *
 * The free/paid line is drawn by `__HAS_MY_MUSIC__` at build time, and the
 * whole value of drawing it there rather than at runtime is that the free
 * bundle does not *hold* what it does not offer — there is nothing to unlock
 * with a developer-tools flag and nothing to download. That property lives in
 * the output of a build, not in any source file, so it is checked here rather
 * than asserted in the suite.
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
import { join } from 'node:path';

const root = process.argv[2] ?? 'dist';

/**
 * Strings that only the importer's own code contains.
 *
 * Chosen to be specific to that code rather than to the domain: "MusicXML"
 * appears in user-facing prose the free app may legitimately carry one day,
 * where `score-partwise` is a tag name only a parser cares about.
 */
const PAID_ONLY = ['score-partwise', 'unfoldRepeats', 'importPart', 'ImportScreen'];

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
const searched = dist.filter((path) => /\.(js|css|html|json)$/.test(path));
if (searched.length === 0) {
  console.error(`Nothing to search in ${root}/ — is this a build?`);
  process.exit(2);
}

const found = [];
for (const path of searched) {
  const text = readFileSync(path, 'utf8');
  for (const needle of PAID_ONLY) {
    if (text.includes(needle)) found.push(`${path}: ${needle}`);
  }
}

if (found.length > 0) {
  console.error('The web build contains paid-only code:\n');
  for (const hit of found) console.error(`  ${hit}`);
  console.error(
    '\nThe free build must not hold what it does not offer. Check that the' +
      '\nimport is dynamic and that it is guarded by the injected literal' +
      '\n`__HAS_MY_MUSIC__` directly — not by a constant imported from' +
      '\nanywhere, which does not survive the journey to Rollup.',
  );
  process.exit(1);
}

console.log(`The web build is clean: ${searched.length} files, no paid-only code.`);
