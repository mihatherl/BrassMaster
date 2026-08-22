/**
 * Which copy of the app a build is: the real one, or the tailnet dev copy.
 *
 * There are now two Brass Masters on one phone's home screen and nothing tells
 * them apart. This names the dev one so a tap is deliberate rather than a
 * guess — and it is a *separate* axis from `VITE_TARGET`, which is the trap
 * this file exists to avoid.
 *
 * **`VITE_TARGET=app` is also the paid production build.** Keying the dev name
 * off it would put "Dev" on the Play listing. The channel therefore has a
 * signal of its own, and the default is the one that must never be wrong:
 * forgetting `VITE_CHANNEL` ships the real name, exactly as forgetting
 * `VITE_TARGET` ships the free product. Only whatever builds the tailnet copy
 * sets it, and `tools/check-channel.mjs` proves on every build that a release
 * did not pick it up.
 *
 * Shared with `vite.config.ts` rather than restated there, because the check
 * has to search for the very string the build wrote: two copies of a literal
 * that must agree is how a build-time rule quietly stops holding.
 */

/** 'dev' only when asked for outright; anything else is a release. */
export function channelOf(env = process.env) {
  return env.VITE_CHANNEL === 'dev' ? 'dev' : 'production';
}

/**
 * What the phone shows, per channel.
 *
 * `short_name` is the home-screen label and is truncated at around a dozen
 * characters, so "Brass Master — Dev" would arrive as "Brass Maste…" and tell
 * the player nothing. The dev short name leads with the difference instead.
 */
export const NAMES = {
  production: { name: 'Brass Master', short: 'Brass Master' },
  dev: { name: 'Brass Master — Dev', short: 'BM Dev' },
};

/**
 * The string a release build must not contain, and a dev build must.
 *
 * Deliberately the em-dashed suffix rather than the bare word "Dev": the word
 * alone appears in minified code by chance, and a check that cries wolf gets
 * deleted.
 */
export const DEV_MARK = '— Dev';

export function namesFor(env = process.env) {
  return NAMES[channelOf(env)];
}
