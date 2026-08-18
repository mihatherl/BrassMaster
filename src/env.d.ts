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
}

// `moduleDetection: force` means the declaration above only reaches the rest of
// the project through an explicit global block, which in turn needs this file to
// be a module.
export {};
