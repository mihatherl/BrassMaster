import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { channelOf, namesFor } from './tools/channel.mjs';

/**
 * The app makes no network requests at runtime — the synth is generated, the
 * music glyphs are baked into the bundle and progress lives in localStorage — so
 * precaching the build outright makes it fully offline with no runtime caching
 * rules to reason about.
 */
/**
 * Vite rejects requests carrying an unrecognised Host header, which would
 * otherwise block serving the dev server over a Tailscale hostname. The leading
 * dot matches the tailnet domain and any machine on it.
 */
const TAILNET = '.tail5a7373.ts.net';

/**
 * Stamped into the build and shown on the settings screen, so there is never any
 * doubt about which version a device is actually running.
 */
const buildTime = new Date().toISOString().replace('T', ' ').slice(0, 16);

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};

/**
 * Which of the two products this build is.
 *
 * One codebase, two things sold through two channels: a free web app at
 * brassmaster.net, and a paid App Store app adding the microphone, the tuner
 * and My Music. The line between them is drawn here, at build time, and
 * nowhere else — see `docs/app-store-plan.md`.
 *
 * A build flag rather than a runtime one, and the difference is the point. The
 * runtime tier this replaced decided the same question by reading a
 * `localStorage` key anyone could set, which meant the free bundle had to
 * *contain* everything it withheld. A paid feature shipped to the build that
 * must not offer it is one developer-tools flag away from being free. Declared
 * through `define` so every use site sees a literal `true` or `false` before
 * Rollup runs: the dead branch, and everything only it reached, is dropped
 * from the bundle rather than merely made unreachable in it.
 *
 * **`web` is the default, and deliberately the safe one.** Forgetting the
 * variable ships the *smaller* product — a free app missing a paid feature is
 * a bug found in a minute, where a paid feature leaking into the free build
 * could go a release unnoticed. `npm run build:app` asks for the other one;
 * `npm test` sets it too, so the suite exercises the whole product.
 */
const target = process.env.VITE_TARGET === 'app' ? 'app' : 'web';

/**
 * The other axis, and it is not this one. See `tools/channel.mjs`: `app` is
 * the paid *release*, so the tailnet copy's name has to come from a signal of
 * its own or "Dev" ends up on the Play listing.
 */
const channel = channelOf();
const names = namesFor();
// Said out loud, because the whole point is that the two builds are otherwise
// indistinguishable — including in the terminal that made them.
if (channel === 'dev') console.log(`building the DEV copy: "${names.name}"`);

/**
 * Where the app will be served from.
 *
 * `VITE_BASE` states it outright and wins when set — the domain cutover to
 * brassmaster.net sets `VITE_BASE=/`, since a custom domain serves from the
 * root. Until then the GitHub Pages default applies: a project site lives
 * under `/<repo>/` rather than at the root, and every asset URL has to agree.
 * Taking that from the environment rather than hard-coding it means the
 * repository can be renamed without touching this file.
 */
const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.VITE_BASE ?? (repository ? `/${repository}/` : '/');

/**
 * Where the build lands, which is no longer the same for both targets.
 *
 * The web build goes to `dist/app` and is served from `/app/`, because the
 * root now holds a landing page — see `tools/site.mjs` for why the app moved.
 * The paid build keeps `dist`, which is Capacitor's `webDir` and the tailnet
 * copy's home, so the Android flow and `npm run preview` are untouched.
 */
const outDir = process.env.VITE_OUT_DIR ?? 'dist';

export default defineConfig({
  base,
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __APP_VERSION__: JSON.stringify(version),
    /*
     * One flag per paid feature, rather than one flag meaning "paid".
     *
     * They are the same expression today and will be for a while, which is
     * exactly when it is cheap to keep them apart: they guard unrelated code,
     * they will be finished at different times, and either could move across
     * the line on its own — the microphone in particular is as good an
     * argument for the free app as it is a reason to buy the paid one, and
     * that decision should be an edit to one line here rather than an
     * untangling. A single `__IS_PAID__` would have to be unpicked at every
     * use site the day the first feature moves.
     */
    __HAS_MY_MUSIC__: JSON.stringify(target === 'app'),
    __HAS_MICROPHONE__: JSON.stringify(target === 'app'),
    __HAS_TEACHER__: JSON.stringify(target === 'app'),
  },
  build: { outDir },
  server: { allowedHosts: [TAILNET] },
  preview: { allowedHosts: [TAILNET] },
  plugins: [
    react(),
    {
      /*
       * `index.html` is static, so the channel's name is put into it here.
       * Both tags matter and for different reasons: `<title>` is the browser
       * tab and what a bookmark takes its name from, and
       * `apple-mobile-web-app-title` is what iOS puts under the icon when a
       * page is added to the home screen — which is the very screen holding
       * two indistinguishable copies today.
       */
      name: 'app-name-for-channel',
      transformIndexHtml(html: string) {
        return html
          .replace(/<title>[^<]*<\/title>/, `<title>${names.name}</title>`)
          .replace(
            /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/,
            `$1${names.name}$2`,
          );
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      // Registered by src/update.ts instead, which also reloads the page when a
      // new worker takes over — the generated script does not.
      injectRegister: null,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      workbox: {
        // The sample set is precached rather than fetched on demand, so every
        // instrument works offline rather than only the ones already tried.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,mp3}'],
        /*
         * The microphone spike is not part of the app.
         *
         * It is a throwaway page for answering one question — whether pitch
         * detection tracks a brass instrument well enough to build on — and it
         * must not be precached or it would go stale like the app does, nor
         * caught by the navigation fallback, which would serve the app shell in
         * its place.
         */
        globIgnores: ['spike/**'],
        navigateFallbackDenylist: [/\/spike\//],
      },
      manifest: {
        name: names.name,
        short_name: names.short,
        description:
          'Practise brass valve fingerings against scrolling notation, on any instrument in either clef.',
        theme_color: '#c48a2c',
        background_color: '#fbfaf7',
        display: 'standalone',
        orientation: 'any',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
