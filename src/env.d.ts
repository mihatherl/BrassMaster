/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare global {
  /** Build stamp, injected by vite.config.ts and shown on the settings screen. */
  const __BUILD_TIME__: string;
  /** Version from package.json, likewise injected at build time. */
  const __APP_VERSION__: string;
  /**
   * Whether this build has My Music — parts imported from MusicXML files, and
   * the desktop companion behind them. True in the paid App Store build only.
   *
   * The whole free/paid line, and it is drawn at build time on purpose;
   * `vite.config.ts` explains why, and `docs/v3-library-plan.md` records the
   * ruling. Injected rather than imported from a module so that each use site
   * sees a literal: Rollup then drops the dead branch and everything only it
   * reached, which for the web build is the whole of `import/` — some 2,900
   * lines of parser it has no way to reach. An imported constant does not
   * survive that journey; it was tried, and the chunk was still emitted.
   *
   * So: test it with a plain `if` or a ternary, and never behind an
   * indirection — `const has = __HAS_MY_MUSIC__` defeats the elimination as
   * surely as the imported constant did.
   */
  const __HAS_MY_MUSIC__: boolean;
  /**
   * Whether this build can hear the player: the microphone as a `PlayerInput`
   * in place of the on-screen valves, and the tuner built on the same
   * detector. True in the paid App Store build only.
   *
   * **Nothing reads this yet** — the feature is not built. It exists ahead of
   * the code so that microphone work lands on the right side of the line from
   * its first commit rather than being moved there afterwards, and because the
   * guard that matters is already live without it:
   * `tools/check-web-bundle.mjs` fails the build if `getUserMedia` or
   * `mediaDevices` appear in the free bundle at all. That check is not a
   * name-matching heuristic — a browser cannot reach a microphone by any other
   * route — so the tripwire is complete before there is anything to trip it.
   *
   * Everything in `__HAS_MY_MUSIC__`'s note about *how* to test it applies
   * here unchanged, and for the same reason: read it directly, never through
   * an imported or local constant.
   *
   * Deliberately its own flag rather than a shared "is paid" one; see
   * `vite.config.ts` for why.
   */
  const __HAS_MICROPHONE__: boolean;
  /**
   * Whether this build has teacher mode: goals, a guided session, the ladder
   * that decides what comes next, and the reporting on it. Paid.
   *
   * Like `__HAS_MICROPHONE__`, declared ahead of the screens that will read it
   * so the work lands on the right side of the line from its first commit —
   * and, more usefully, so the tripwire is armed first. The ladder's storage
   * key is unique to the feature and `tools/check-web-bundle.mjs` fails the
   * free build if it appears there, which is what catches the day someone
   * wires a screen up and forgets this flag.
   *
   * Read it directly, never through a constant; see `__HAS_MY_MUSIC__`.
   */
  const __HAS_TEACHER__: boolean;
}

// `moduleDetection: force` means the declaration above only reaches the rest of
// the project through an explicit global block, which in turn needs this file to
// be a module.
export {};
