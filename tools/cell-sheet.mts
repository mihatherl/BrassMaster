/**
 * A sheet of every cell, engraved, for reviewing the corpus by eye.
 *
 * `tune-sheet.mts` shows the composer's *output*; this shows its *input*. The
 * cells are written in a compact notation — `0q 2e -1h` — which nobody can
 * judge by reading, so a bad figure is invisible until it turns up inside a
 * tune, by which time it is hard to say which bar was at fault.
 *
 * **The ids are the point.** Every cell is printed with its own, so a review
 * comes back as instructions rather than as impressions: *cut `68-close-4`,
 * the leap at the end is ugly*. That is also why an id must never be reused
 * across an edit — see `Cell.id`.
 *
 *   npm run cells
 *   npm run cells -- --metre 6/8 --role close --level hard --out cells.html
 *
 * Self-contained: inline styles, inline SVG, no network. Anchor-independent by
 * design — what is being judged is the shape and the rhythm, not where the
 * composer would eventually place it.
 */

import { writeFileSync } from 'node:fs';
import { instrumentById } from '../src/domain/instruments.ts';
import { metreFor } from '../src/domain/metre.ts';
import { CELLS, cellAsTheme, type Cell } from '../src/exercise/cells.ts';
import { exerciseFromTheme, type Theme } from '../src/exercise/theme.ts';
import { exerciseToSvg } from './render-svg.mts';

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const instrument = instrumentById(arg('instrument', 'eb-bass'));
const clef = arg('clef', 'treble') as 'treble' | 'bass';
const fifths = Number(arg('fifths', '0'));
const width = Number(arg('width', '340'));
const anchor = Number(arg('anchor', '0'));
const onlyMetre = arg('metre', '');
const onlyRole = arg('role', '');
const onlyLevel = arg('level', '');

const wanted = CELLS.filter(
  (cell) =>
    (!onlyMetre || `${cell.metre[0]}/${cell.metre[1]}` === onlyMetre) &&
    (!onlyRole || cell.role === onlyRole) &&
    (!onlyLevel || cell.level === onlyLevel),
);

function engrave(cell: Cell): string {
  const metre = metreFor(cell.metre[0], cell.metre[1]);
  const theme: Theme = {
    id: cell.id,
    name: cell.id,
    difficulty: cell.level,
    metres: [cell.metre],
    bars: 1,
    events: cellAsTheme(cell, anchor).events,
  };
  const exercise = exerciseFromTheme(theme, { instrument, clef, fifths, metre });
  const picture = exercise
    ? exerciseToSvg(exercise, width)
    : '<p class="none">would not fit the instrument</p>';
  return `<figure><figcaption><code>${cell.id}</code> <span>${cell.level}</span></figcaption>${picture}</figure>`;
}

/** Grouped the way a reviewer reads: one metre at a time, opens before closes. */
const ROLES = ['open', 'move', 'close'] as const;
const metres = [...new Set(wanted.map((cell) => `${cell.metre[0]}/${cell.metre[1]}`))];

const sections = metres.map((metre) => {
  const groups = ROLES.map((role) => {
    const cells = wanted.filter(
      (cell) => `${cell.metre[0]}/${cell.metre[1]}` === metre && cell.role === role,
    );
    if (cells.length === 0) return '';
    return `<h3>${role} <span class="count">${cells.length}</span></h3><div class="grid">${cells
      .map(engrave)
      .join('\n')}</div>`;
  });
  return `<section><h2>${metre}</h2>${groups.join('\n')}</section>`;
});

const html = `<!doctype html>
<meta charset="utf-8">
<title>The cells — ${wanted.length} of ${CELLS.length}</title>
<style>
  body { font: 15px/1.4 system-ui, sans-serif; margin: 2rem auto; max-width: 1200px; padding: 0 1rem; color: #222; background: #fff; }
  h1 { font-size: 1.4rem; }
  h2 { font-size: 1.15rem; margin-top: 2.5rem; border-bottom: 1px solid #ddd; }
  h3 { font-size: 0.95rem; margin: 1.5rem 0 0.5rem; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }
  .count { color: #999; font-weight: 400; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(${width}px, 1fr)); gap: 1rem 1.25rem; }
  figure { margin: 0; padding: 0.5rem; border: 1px solid #eee; border-radius: 6px; }
  figcaption { color: #666; font-size: 0.8rem; display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.25rem; }
  code { color: #222; }
  svg { max-width: 100%; height: auto; display: block; }
  .none { color: #a33; font-size: 0.85rem; }
</style>
<h1>The cells — ${wanted.length} of ${CELLS.length}, ${instrument.name}, anchor ${anchor}</h1>
<p>Shape and rhythm are what these show; the composer chooses its own anchors.</p>
${sections.join('\n')}
`;

const out = arg('out', 'cells.html');
writeFileSync(out, html);
process.stderr.write(`${out} — ${wanted.length} cells\n`);
