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
 *
 * ## Reviewing on it
 *
 * Each cell takes a verdict — keep or cut, with a note — held in the page's own
 * storage so a review survives a refresh and can be done in several sittings.
 * **Save verdicts** downloads them as JSON to be handed back to the repository;
 * the page cannot write to it, and deliberately does not pretend to.
 *
 * Candidates are listed first and marked, because they are what a review is
 * for. Accepted cells are shown too: a corpus is judged as a whole, and a
 * figure that has been in for a year can still turn out to be the ugly one.
 *
 * Serve it to a phone over the tailnet rather than deploying it — it is a
 * working document about unreleased material, and it has no business on the
 * product's front door:
 *
 *   npm run cells && tailscale serve --bg --https=8451 "$PWD/cells.html"
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

/** Candidates first: they are what a review is for. */
function inReviewOrder(cells: readonly Cell[]): Cell[] {
  return [...cells].sort((a, b) =>
    a.status === b.status ? 0 : a.status === 'candidate' ? -1 : 1,
  );
}

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
  return `<figure data-cell="${cell.id}" class="${cell.status}">
  <figcaption><code>${cell.id}</code> <span>${cell.status === 'candidate' ? 'candidate · ' : ''}${cell.level}</span></figcaption>
  ${picture}
  <div class="verdict">
    <button type="button" data-verdict="keep">Keep</button>
    <button type="button" data-verdict="cut">Cut</button>
    <input type="text" placeholder="why, if it matters" aria-label="note on ${cell.id}">
  </div>
</figure>`;
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
    return `<h3>${role} <span class="count">${cells.length}</span></h3><div class="grid">${inReviewOrder(
      cells,
    )
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

  figure.candidate { border-color: #c48a2c; background: #fffdf7; }
  figure.is-keep { border-color: #1a7f4b; background: #f6fbf8; }
  figure.is-cut { border-color: #c02b2b; background: #fdf7f7; opacity: 0.7; }

  .verdict { display: flex; gap: 0.35rem; margin-top: 0.4rem; }
  .verdict button { font: inherit; font-size: 0.8rem; padding: 0.25rem 0.6rem; border: 1px solid #ddd; border-radius: 5px; background: #f6f6f4; cursor: pointer; }
  .verdict button[aria-pressed='true'][data-verdict='keep'] { background: #1a7f4b; border-color: #1a7f4b; color: #fff; }
  .verdict button[aria-pressed='true'][data-verdict='cut'] { background: #c02b2b; border-color: #c02b2b; color: #fff; }
  .verdict input { flex: 1 1 auto; min-width: 0; font: inherit; font-size: 0.8rem; padding: 0.25rem 0.4rem; border: 1px solid #ddd; border-radius: 5px; }

  .bar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
         padding: 0.6rem 0.75rem; margin: 0 0 1rem; background: #fff; border-bottom: 1px solid #ddd; }
  .bar button { font: inherit; padding: 0.35rem 0.8rem; border: 1px solid #ddd; border-radius: 6px; background: #f6f6f4; cursor: pointer; }
  .bar .tally { color: #666; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
</style>
<h1>The cells — ${wanted.length} of ${CELLS.length}, ${instrument.name}, anchor ${anchor}</h1>
<p>Shape and rhythm are what these show; the composer chooses its own anchors.</p>
<div class="bar">
  <button type="button" id="save">Save verdicts</button>
  <button type="button" id="clear">Clear</button>
  <span class="tally" id="tally"></span>
</div>
${sections.join('\n')}
<script>
/*
 * Verdicts live in this page's own storage, keyed by cell id, so a review
 * survives a refresh and can be done over several sittings. Nothing is sent
 * anywhere — the page has nowhere to write to and does not pretend otherwise;
 * "Save verdicts" downloads them for the repository.
 */
(function () {
  var KEY = 'brass-master:cell-verdicts';
  var verdicts = {};
  try { verdicts = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { verdicts = {}; }

  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch (e) { /* private browsing */ }
    paint();
  }

  function paint() {
    var kept = 0, cut = 0;
    document.querySelectorAll('figure[data-cell]').forEach(function (figure) {
      var id = figure.getAttribute('data-cell');
      var verdict = verdicts[id] || {};
      figure.classList.toggle('is-keep', verdict.verdict === 'keep');
      figure.classList.toggle('is-cut', verdict.verdict === 'cut');
      figure.querySelectorAll('[data-verdict]').forEach(function (button) {
        button.setAttribute('aria-pressed', String(verdict.verdict === button.getAttribute('data-verdict')));
      });
      var note = figure.querySelector('.verdict input');
      if (note && document.activeElement !== note) note.value = verdict.note || '';
      if (verdict.verdict === 'keep') kept++;
      if (verdict.verdict === 'cut') cut++;
    });
    var total = document.querySelectorAll('figure[data-cell]').length;
    document.getElementById('tally').textContent =
      kept + ' kept · ' + cut + ' cut · ' + (total - kept - cut) + ' undecided';
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-verdict]');
    if (!button) return;
    var id = button.closest('figure[data-cell]').getAttribute('data-cell');
    var choice = button.getAttribute('data-verdict');
    var current = verdicts[id] || {};
    // Clicking the same verdict again undoes it, so a misclick is one tap to fix.
    if (current.verdict === choice) delete current.verdict; else current.verdict = choice;
    if (!current.verdict && !current.note) delete verdicts[id]; else verdicts[id] = current;
    store();
  });

  document.addEventListener('input', function (event) {
    if (!event.target.matches('.verdict input')) return;
    var id = event.target.closest('figure[data-cell]').getAttribute('data-cell');
    var current = verdicts[id] || {};
    current.note = event.target.value;
    if (!current.verdict && !current.note) delete verdicts[id]; else verdicts[id] = current;
    try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch (e) { /* private browsing */ }
  });

  document.getElementById('save').addEventListener('click', function () {
    var out = { reviewedAt: new Date().toISOString(), verdicts: verdicts };
    var blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cell-verdicts.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.getElementById('clear').addEventListener('click', function () {
    if (!confirm('Forget every verdict on this page?')) return;
    verdicts = {};
    store();
  });

  paint();
})();
</script>
`;

const out = arg('out', 'cells.html');
writeFileSync(out, html);
process.stderr.write(`${out} — ${wanted.length} cells\n`);
