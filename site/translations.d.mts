/**
 * Types for the landing page's packs, so the coverage guard can read them.
 *
 * The packs themselves stay plain `.mjs`: `tools/site.mjs` is a build script
 * run by node before Vite exists, and giving it a TypeScript dependency would
 * mean compiling the assembler to check the pages it assembles. The one thing
 * the app's test suite needs from it is the list of languages — that a page is
 * never published in a language the app has no pack for — and that is what
 * this declares.
 */
export declare const LANGUAGES: ReadonlyArray<{
  /** BCP-47: `<html lang>`, `hreflang`, and the `?lang=` the app reads. */
  lang: string;
  /** The language in its own name, for the nav. */
  name: string;
  /** URL path, when it differs from the tag — `pt-PT` lives at `/pt/`. */
  dir?: string;
  /** `[english, translated]` over the exact prose of `site/index.html`. */
  pairs: ReadonlyArray<readonly [string, string]>;
}>;
