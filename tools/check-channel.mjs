/**
 * Proves a build carries the name its channel asked for — and only that name.
 *
 * The dev copy and the real one are the same app at two addresses, and until
 * 2026-08-22 they were the same *name* too: two identical icons on one home
 * screen, and a tap was a coin toss. `VITE_CHANNEL=dev` renames the tailnet
 * copy. This checks the rename landed where it was meant to and nowhere else.
 *
 * It is checked here rather than in the suite for the reason
 * `check-web-bundle.mjs` gives: the property belongs to the *output of a
 * build*, not to any source file, and the mistake it guards against is one
 * that behaves perfectly on screen.
 *
 * Both directions are checked, and the second is the one with teeth:
 *
 *   - a **release** build must not contain the dev mark. This is the guard.
 *     `VITE_TARGET=app` is both the tailnet copy's target and the paid
 *     release's, so a dev name keyed off the wrong variable would reach the
 *     Play listing — a mistake nobody would see until a stranger did.
 *   - a **dev** build must contain it. Without this the check passes forever
 *     the day the rename silently stops firing, and two identical icons come
 *     back with a green tick over them.
 *
 *     VITE_CHANNEL=dev node tools/check-channel.mjs [dist]
 *
 * Expects a build to be sitting in `dist` already, made with the same
 * `VITE_CHANNEL` this is run with.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { channelOf, DEV_MARK } from './channel.mjs';

const root = process.argv[2] ?? 'dist';
const channel = channelOf();

/** As in `check-web-bundle.mjs`: the spike pages are not the app. */
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
  console.error(`No build to check at ${root}/ — run a build first.`);
  process.exit(2);
}

/*
 * Where a name can reach the player: the HTML `<title>` and the iOS meta tag,
 * the web app manifest, and the service worker's precache manifest, which
 * lists the files by name and would happily serve a stale one.
 */
const searched = dist.filter((path) => {
  if (!/\.(html|json|webmanifest|js)$/.test(path)) return false;
  const [top] = relative(root, path).split(sep);
  return !NOT_THE_APP.includes(top);
});

if (searched.length === 0) {
  console.error(`Nothing to search in ${root}/ — is this a build?`);
  process.exit(2);
}

const hits = searched.filter((path) => readFileSync(path, 'utf8').includes(DEV_MARK));

if (channel === 'dev') {
  if (hits.length === 0) {
    console.error(
      `This is a dev build and nothing in ${root}/ carries "${DEV_MARK}".\n` +
        '\nThe rename has stopped firing, which puts two identically named\n' +
        'copies of the app back on the same home screen. Check the manifest\n' +
        "and the `app-name-for-channel` plugin in `vite.config.ts`.",
    );
    process.exit(1);
  }
  console.log(
    `The dev build is named: "${DEV_MARK}" found in ${hits.length} of ` +
      `${searched.length} files checked.`,
  );
} else {
  if (hits.length > 0) {
    console.error(`A RELEASE build carries the dev name "${DEV_MARK}".\n`);
    for (const path of hits) console.error(`  ${path}`);
    console.error(
      '\nThis would ship "Dev" to the store listing and to brassmaster.net.\n' +
        'The channel must come from `VITE_CHANNEL` and nothing else — in\n' +
        'particular not from `VITE_TARGET`, which is `app` for the paid\n' +
        'release as well as for the tailnet copy.',
    );
    process.exit(1);
  }
  console.log(
    `The release build is clean: ${searched.length} files checked, no "${DEV_MARK}".`,
  );
}
