/**
 * Will this theme play, and on what?
 *
 * A theme is a fixed shape and `realiseTheme` declines rather than compresses,
 * so a tune that spans too much is simply never offered — silently, and per
 * instrument and key. That is correct behaviour and a terrible way to find out,
 * which is what this prints: for every theme in the corpus, whether it
 * validates, how much of the band can take it, and in how many of the twelve
 * keys.
 *
 *   npx tsx tools/theme-fit.mts
 *   npx tsx tools/theme-fit.mts --id bwv784-invention
 *
 * Written 2026-08-21, when completing the inventions turned "eight bars" into
 * "thirty-four" and the question stopped being whether the notes are right.
 */

import { INSTRUMENTS, supportsClef } from '../src/domain/instruments.ts';
import { metreFor } from '../src/domain/metre.ts';
import { COLLECTIONS } from '../src/exercise/collections.ts';
import { realiseTheme, validateTheme, type Theme } from '../src/exercise/theme.ts';

function arg(name: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? (process.argv[i + 1] ?? '') : '';
}

const only = arg('id');
/* A module exporting `CANDIDATES`, so a converted theme can be checked before
   it is pasted into the corpus rather than after. */
const from = arg('from');

/* The keys a player can be handed, which is every one the dial offers. */
const FIFTHS = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

function report(theme: Theme, unheard: boolean) {
  const [spec] = theme.metres;
  const metre = metreFor(spec[0], spec[1]);
  const problems = validateTheme(theme);

  const per = INSTRUMENTS.map((instrument) => {
    const keys = FIFTHS.filter((fifths) =>
      (['treble', 'bass'] as const).some(
        (clef) =>
          supportsClef(instrument, clef) &&
          realiseTheme(theme, { instrument, clef, fifths, metre }) !== null,
      ),
    );
    return { instrument, keys: keys.length };
  });

  const playable = per.filter((p) => p.keys > 0);
  const flag = problems.length ? '✗' : playable.length === 0 ? '∅' : playable.length < INSTRUMENTS.length ? '~' : '✓';

  process.stdout.write(
    `${flag} ${(unheard ? '·' : ' ') + theme.id.padEnd(22)}${theme.difficulty.padEnd(9)}` +
      `${String(theme.bars).padStart(3)} bars  ` +
      `${String(playable.length).padStart(2)}/${INSTRUMENTS.length} instruments  ` +
      `${per.map((p) => `${p.instrument.id.split('-')[0].slice(0, 4)}:${p.keys}`).join(' ')}\n`,
  );
  for (const problem of problems) process.stdout.write(`    ${problem}\n`);
}

process.stdout.write(
  `\n✓ every instrument   ~ some   ∅ none   ✗ fails validation\n` +
    `The number after each instrument is how many of the twelve keys it can take.\n\n`,
);

if (from) {
  const module = (await import(from)) as { CANDIDATES: readonly Theme[] };
  process.stdout.write(`Candidates — ${from}\n`);
  for (const theme of module.CANDIDATES) report(theme, true);
  process.exit(0);
}

for (const collection of COLLECTIONS) {
  const themes = collection.themes.filter((theme) => !only || theme.id === only);
  if (themes.length === 0) continue;
  process.stdout.write(`${collection.name}\n`);
  for (const theme of themes) report(theme, collection.unjudged?.has(theme.id) ?? false);
  process.stdout.write('\n');
}
