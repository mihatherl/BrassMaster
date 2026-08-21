/**
 * The tunes, engraved *and playable*, for judging whether they are melodies.
 *
 * `cell-sheet.mts` reviews the composer's raw material by eye. This reviews
 * whole tunes, and eye is not enough: a melody is recognised by ear, and no
 * amount of looking at a stave settles whether eight bars are a tune or eight
 * bars of correct notes. So every theme here plays.
 *
 * It also **measures each tune against the level it claims** — span, largest
 * leap, how often it uses an accidental, how often it rests — beside that
 * level's own targets. That is the measurement that condemned this corpus in
 * v2.20.0, run per tune rather than over the whole set, so a review can tell a
 * good tune wearing the wrong label from a poor one.
 *
 *   npm run themes-sheet
 *   npm run themes-sheet -- --instrument cornet --tempo 84 --out themes.html
 *
 * Verdicts work as they do on the cell sheet: keep or cut with a note, held in
 * the page's own storage, downloaded as JSON for the repository.
 *
 * Self-contained — inline styles, inline SVG, a synthesised voice built from
 * an oscillator. No samples, no network: this is a judgement about the *notes*,
 * and a plain tone is enough to hear whether a tune goes anywhere.
 */

import { writeFileSync } from 'node:fs';
import { instrumentById } from '../src/domain/instruments.ts';
import { metreFor } from '../src/domain/metre.ts';
import { DIFFICULTIES, difficultyById } from '../src/exercise/difficulty.ts';
import { exerciseFromTheme, validateTheme, type Theme } from '../src/exercise/theme.ts';
import { COLLECTIONS } from '../src/exercise/collections.ts';
import type { Exercise } from '../src/exercise/types.ts';
import { exerciseToSvg } from './render-svg.mts';

function arg(name: string, fallback: string): string {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? (process.argv[index + 1] ?? fallback) : fallback;
}

const instrument = instrumentById(arg('instrument', 'eb-bass'));
const clef = arg('clef', 'treble') as 'treble' | 'bass';
const fifths = Number(arg('fifths', '0'));
const width = Number(arg('width', '760'));
const tempo = Number(arg('tempo', '84'));
const onlyLevel = arg('level', '');

/**
 * What a tune actually asks of a reader, beside what its level says it should.
 *
 * The four the original measurement used. Not a verdict — a tune outside its
 * level's figures may be right and the label wrong, which is the whole reason
 * to look.
 */
function measure(exercise: Exercise) {
  const midis = exercise.notes.map((note) => note.writtenMidi);
  const span = midis.length ? Math.max(...midis) - Math.min(...midis) : 0;
  let widest = 0;
  for (let i = 1; i < midis.length; i++) widest = Math.max(widest, Math.abs(midis[i] - midis[i - 1]));
  const accidentals = exercise.notes.filter((note) => note.showAccidental).length;
  return {
    span,
    widest,
    accidental: midis.length ? accidentals / midis.length : 0,
    rest: exercise.notes.length + exercise.rests.length
      ? exercise.rests.length / (exercise.notes.length + exercise.rests.length)
      : 0,
  };
}

/**
 * Note events for the player: midi, start and length in **beats**.
 *
 * Beats rather than seconds so the tempo can be changed on the page. It used
 * to be seconds, baked at one tempo for the whole sheet — which was fine while
 * a theme had no tempo of its own, and stopped being fine the moment they did:
 * hearing the Air at 42 and Invention 13 at 100 is most of how you tell them
 * apart, and one number for the page could not do it.
 */
function voice(exercise: Exercise): Array<[number, number, number]> {
  return exercise.notes.map((note) => [
    note.soundingMidi,
    Number(note.startBeat.toFixed(4)),
    Number(beatsOf(note.duration).toFixed(4)),
  ]);
}

function beatsOf(duration: { value: string; dotted: boolean; tuplet?: number }): number {
  const base: Record<string, number> = { whole: 4, half: 2, quarter: 1, eighth: 0.5, sixteenth: 0.25, thirtySecond: 0.125 };
  const plain = (base[duration.value] ?? 1) * (duration.dotted ? 1.5 : 1);
  return duration.tuplet ? (plain * 2) / duration.tuplet : plain;
}

/*
 * One section per collection, kept apart on the page rather than merged.
 *
 * The sections used to be written here, which put the grouping in the review
 * tool when it is a property of the material — so it now comes from
 * `exercise/collections.ts` and this file only decides how to draw it.
 *
 * Keeping them apart is the point of the page. The traditional tunes are a
 * calibration for the ear: nobody has to adjudicate whether Twinkle is a
 * melody, so what they settle is what the written themes' own "deliberately
 * plain" actually costs. One merged list would lose exactly that comparison.
 *
 * Tunes not yet heard are marked where they sit rather than gathered into a
 * section of their own, so a verdict is given next to the material it belongs
 * with and not in isolation from it.
 */
const sets = COLLECTIONS.map((collection) => ({
  heading: collection.name,
  /* Provenance and version on the page, because the reviewer's question is not
     only "is it a tune" but "what am I looking at and may we use it". */
  meta:
    `${collection.provenance.replace('-', ' ')} · revision ${collection.revision}` +
    `${collection.status === 'candidate' ? ' · under review' : ''}`,
  blurb: collection.blurb,
  themes: collection.themes,
  unjudged: collection.unjudged ?? new Set<string>(),
}));

const chosen = sets.flatMap((set) =>
  onlyLevel ? set.themes.filter((theme) => theme.difficulty === onlyLevel) : set.themes,
);

function panel(theme: Theme): string {
  const [metreSpec] = theme.metres;
  const metre = metreFor(metreSpec[0], metreSpec[1]);
  const exercise = exerciseFromTheme(theme, { instrument, clef, fifths, metre });
  const problems = validateTheme(theme);

  if (!exercise) {
    return `<figure data-theme="${theme.id}" data-tempo="${theme.tempo ?? tempo}" data-sourced="${theme.tempo ? '1' : ''}"><figcaption><code>${theme.id}</code> <b>${theme.name}</b>${unjudgedIds.has(theme.id) ? ' <span class="unheard">not yet heard</span>' : ''}</figcaption>
      <p class="none">would not fit the instrument</p></figure>`;
  }

  const level = DIFFICULTIES.some((d) => d.id === theme.difficulty)
    ? difficultyById(theme.difficulty)
    : null;
  const m = measure(exercise);
  const cell = (actual: string, target: string, off: boolean) =>
    `<td class="${off ? 'off' : ''}">${actual}<span>${target}</span></td>`;

  const table = level
    ? `<table class="measure">
        <tr><th>span</th><th>widest leap</th><th>accidentals</th><th>rests</th></tr>
        <tr>
          ${cell(`${m.span}st`, `${level.rangeSemitones}st`, m.span < level.rangeSemitones - 2)}
          ${cell(`${m.widest}st`, `${level.maxInterval}st`, m.widest < level.maxInterval - 2)}
          ${cell(`${Math.round(m.accidental * 100)}%`, `${Math.round(level.accidentalChance * 100)}%`, level.accidentalChance > 0.02 && m.accidental === 0)}
          ${cell(`${Math.round(m.rest * 100)}%`, `${Math.round(level.restChance * 100)}%`, level.restChance > 0.02 && m.rest === 0)}
        </tr>
      </table>`
    : '';

  return `<figure data-theme="${theme.id}" data-tempo="${theme.tempo ?? tempo}" data-sourced="${theme.tempo ? '1' : ''}">
  <figcaption><code>${theme.id}</code> <b>${theme.name}</b> <span>${theme.difficulty} · ${metreSpec[0]}/${metreSpec[1]} · ${theme.bars} bars</span>${unjudgedIds.has(theme.id) ? '<span class="unheard">not yet heard</span>' : ''}</figcaption>
  ${problems.length ? `<p class="none">${problems.join('; ')}</p>` : ''}
  ${exerciseToSvg(exercise, width)}
  ${table}
  <div class="verdict">
    <button type="button" data-play='${JSON.stringify(voice(exercise))}'>Play</button>
    <label class="tempo">♩=<input type="number" class="tempo__input" min="30" max="220" step="1"
      value="${theme.tempo ?? tempo}" aria-label="tempo for ${theme.name}"><span class="tempo__rate"></span></label>
    <button type="button" data-verdict="keep">Keep</button>
    <button type="button" data-verdict="cut">Cut</button>
    <input type="text" placeholder="is it a tune?" aria-label="note on ${theme.id}">
  </div>
</figure>`;
}

const unjudgedIds = new Set(sets.flatMap((set) => [...set.unjudged]));

const sections = sets.map((set) => {
  const levels = DIFFICULTIES.filter((level) => !onlyLevel || level.id === onlyLevel).map((level) => {
    const tunes = set.themes.filter((theme) => theme.difficulty === level.id);
    if (tunes.length === 0) return '';
    return `<h3>${level.name} <span class="count">${tunes.length}</span></h3>${tunes
      .map(panel)
      .join('\n')}`;
  });
  if (levels.every((level) => level === '')) return '';
  return `<details class="section" open><summary><h2>${set.heading} <span class="count">${set.themes.length}</span></h2>
    <p class="meta">${set.meta}</p></summary>
    <p class="blurb">${set.blurb}</p>${levels.join('\n')}</details>`;
});

const html = `<!doctype html>
<meta charset="utf-8">
<title>The tunes — ${chosen.length} for review</title>
<style>
  body { font: 15px/1.4 system-ui, sans-serif; margin: 0 auto 4rem; max-width: ${width + 60}px; padding: 0 1rem; color: #222; background: #fff; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.25rem; margin-top: 3rem; border-bottom: 2px solid #333; padding-bottom: 0.25rem; }
  h3 { font-size: 1rem; margin: 1.75rem 0 0.5rem; color: #555; text-transform: uppercase; letter-spacing: 0.06em; }
  .blurb { color: #666; font-size: 0.88rem; margin: 0.5rem 0 0; }
  /* Sections collapse, because sixty-seven tunes is a lot of scrolling to
     reach the one collection you came to judge. Open by default: nothing is
     hidden from somebody who has just arrived. */
  details.section > summary { cursor: pointer; list-style: none; padding: 0.3rem 0; border-bottom: 1px solid #e5e5e5; }
  details.section > summary::-webkit-details-marker { display: none; }
  details.section > summary::before { content: '▾ '; color: #999; }
  details.section:not([open]) > summary::before { content: '▸ '; }
  details.section > summary h2 { display: inline; }
  details.section > summary .meta { display: inline; margin-left: 0.5rem; }
  .tempo { font-size: 0.78rem; color: #666; margin-right: 0.6rem; white-space: nowrap; }
  .tempo__input { width: 3.4rem; font: inherit; padding: 0.1rem 0.2rem; }
  .tempo__rate { color: #999; }
  .meta { color: #888; font-size: 0.78rem; margin: 0.2rem 0 0; text-transform: lowercase; letter-spacing: 0.02em; }
  .unheard { background: #fde68a; color: #713f12; font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 3px; margin-left: 0.4rem; }
  .count { color: #999; font-weight: 400; }
  figure { margin: 1.25rem 0; padding: 0.75rem; border: 1px solid #eee; border-radius: 8px; }
  figcaption { color: #666; font-size: 0.85rem; display: flex; align-items: baseline; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.4rem; }
  figcaption b { color: #222; font-size: 1rem; }
  svg { max-width: 100%; height: auto; display: block; }
  .none { color: #a33; font-size: 0.85rem; }

  .measure { border-collapse: collapse; margin-top: 0.5rem; font-size: 0.78rem; }
  .measure th { text-align: left; padding: 0 1.25rem 0.1rem 0; color: #999; font-weight: 500; }
  .measure td { padding: 0 1.25rem 0 0; font-variant-numeric: tabular-nums; }
  .measure td span { color: #999; margin-left: 0.4rem; }
  .measure td.off { color: #b7791f; font-weight: 600; }

  figure.is-keep { border-color: #1a7f4b; background: #f6fbf8; }
  figure.is-cut { border-color: #c02b2b; background: #fdf7f7; opacity: 0.65; }
  .verdict { display: flex; gap: 0.35rem; margin-top: 0.6rem; }
  .verdict button { font: inherit; font-size: 0.85rem; padding: 0.3rem 0.8rem; border: 1px solid #ddd; border-radius: 5px; background: #f6f6f4; cursor: pointer; }
  .verdict button[data-play] { background: #2f6fd0; border-color: #2f6fd0; color: #fff; }
  .verdict button[data-play].playing { background: #b52d2d; border-color: #b52d2d; }
  .verdict button[aria-pressed='true'][data-verdict='keep'] { background: #1a7f4b; border-color: #1a7f4b; color: #fff; }
  .verdict button[aria-pressed='true'][data-verdict='cut'] { background: #c02b2b; border-color: #c02b2b; color: #fff; }
  .verdict input { flex: 1 1 auto; min-width: 0; font: inherit; font-size: 0.85rem; padding: 0.3rem 0.5rem; border: 1px solid #ddd; border-radius: 5px; }

  .bar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
         padding: 0.6rem 0; margin-bottom: 1rem; background: #fff; border-bottom: 1px solid #ddd; }
  .bar button { font: inherit; padding: 0.35rem 0.8rem; border: 1px solid #ddd; border-radius: 6px; background: #f6f6f4; cursor: pointer; }
  .bar .tally { color: #666; font-size: 0.85rem; font-variant-numeric: tabular-nums; }
</style>
<div class="bar">
  <button type="button" id="save">Save verdicts</button>
  <button type="button" id="clear">Clear</button>
  <span class="tally" id="tally"></span>
</div>
<h1>The tunes — ${chosen.length} for review, ${instrument.name} at ${tempo}bpm</h1>
<p>Each plays. The figures under a tune are what it actually asks, against what its level says it should — amber where it falls short.</p>
${sections.join('\n')}
<script>
(function () {
  var KEY = 'brass-master:theme-verdicts';
  var verdicts = {};
  try { verdicts = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { verdicts = {}; }
  var audio = null, stop = null;

  function paint() {
    var kept = 0, cut = 0, total = 0;
    document.querySelectorAll('figure[data-theme]').forEach(function (figure) {
      total++;
      var id = figure.getAttribute('data-theme');
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
    document.getElementById('tally').textContent =
      kept + ' kept · ' + cut + ' cut · ' + (total - kept - cut) + ' undecided';
  }

  function store() {
    try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch (e) {}
    paint();
  }

  /*
   * A plain triangle with a short swell, which is enough to hear whether eight
   * bars go anywhere. Not the app's sampled brass: this is a judgement about
   * the notes, and carrying 1.4MB of samples into a review page to make that
   * judgement would be a worse page for no better answer.
   */
  function tempoOf(figure) {
    return Number(figure.getAttribute('data-tempo')) || 84;
  }

  /*
   * What the tempo actually costs a reader: notes a second at the shortest
   * value the tune substantially uses. This is the number the difficulty model
   * is moving to, so it is the one to show while choosing — a semiquaver at 42
   * and a quaver at 108 are the same reading speed, and no note value says so.
   */
  function showRate(figure) {
    var notes = figure.querySelector('[data-play]');
    var out = figure.querySelector('.tempo__rate');
    if (!notes || !out) return;
    var lengths = JSON.parse(notes.getAttribute('data-play')).map(function (n) { return n[2]; });
    if (!lengths.length) return;
    lengths.sort(function (a, b) { return a - b; });
    var floor = lengths[Math.floor(lengths.length * 0.05)];
    var perSec = 1 / (floor * 60 / tempoOf(figure));
    var sourced = figure.getAttribute('data-sourced');
    out.textContent = ' · ' + perSec.toFixed(1) + '/sec' + (sourced ? '' : ' · guessed');
  }

  function play(button) {
    if (stop) { stop(); if (stop.button === button) { stop = null; return; } }
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    var notes = JSON.parse(button.getAttribute('data-play'));
    // Beats into seconds at whatever tempo this figure is set to, read now
    // rather than baked in — the point of the control beside it.
    var perBeat = 60 / tempoOf(button.closest('figure[data-theme]'));
    var start = audio.currentTime + 0.08;
    var nodes = [];
    notes.forEach(function (note) {
      var osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = 440 * Math.pow(2, (note[0] - 69) / 12);
      var at = start + note[1] * perBeat, until = at + Math.max(0.08, note[2] * perBeat * 0.92);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.22, at + 0.02);
      gain.gain.setValueAtTime(0.22, until - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, until);
      osc.connect(gain); gain.connect(audio.destination);
      osc.start(at); osc.stop(until + 0.02);
      nodes.push(osc);
    });
    button.classList.add('playing');
    button.textContent = 'Stop';
    var last = notes.length ? start + (notes[notes.length - 1][1] + notes[notes.length - 1][2]) * perBeat : start;
    var timer = setTimeout(function () { if (stop) stop(); }, (last - audio.currentTime + 0.2) * 1000);
    stop = function () {
      clearTimeout(timer);
      nodes.forEach(function (osc) { try { osc.stop(); } catch (e) {} });
      button.classList.remove('playing');
      button.textContent = 'Play';
      stop = null;
    };
    stop.button = button;
  }

  document.addEventListener('click', function (event) {
    var playing = event.target.closest('[data-play]');
    if (playing) { play(playing); return; }
    var button = event.target.closest('[data-verdict]');
    if (!button) return;
    var id = button.closest('figure[data-theme]').getAttribute('data-theme');
    var choice = button.getAttribute('data-verdict');
    var current = verdicts[id] || {};
    if (current.verdict === choice) delete current.verdict; else current.verdict = choice;
    if (!current.verdict && !current.note) delete verdicts[id]; else verdicts[id] = current;
    store();
  });

  document.addEventListener('input', function (event) {
    if (event.target.matches('.tempo__input')) {
      var figure = event.target.closest('figure[data-theme]');
      var id = figure.getAttribute('data-theme');
      figure.setAttribute('data-tempo', event.target.value);
      figure.setAttribute('data-sourced', '1');
      showRate(figure);
      var held = verdicts[id] || {};
      held.tempo = Number(event.target.value);
      verdicts[id] = held;
      try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch (e) {}
      return;
    }
    if (!event.target.matches('.verdict input')) return;
    var id = event.target.closest('figure[data-theme]').getAttribute('data-theme');
    var current = verdicts[id] || {};
    current.note = event.target.value;
    if (!current.verdict && !current.note) delete verdicts[id]; else verdicts[id] = current;
    try { localStorage.setItem(KEY, JSON.stringify(verdicts)); } catch (e) {}
  });

  document.getElementById('save').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify({ reviewedAt: new Date().toISOString(), verdicts: verdicts }, null, 2)], { type: 'application/json' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'theme-verdicts.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.getElementById('clear').addEventListener('click', function () {
    if (!confirm('Forget every verdict on this page?')) return;
    verdicts = {};
    store();
  });

  // Any tempo already chosen on a past visit, put back before the rates show.
  Object.keys(verdicts).forEach(function (id) {
    var held = verdicts[id];
    if (!held || !held.tempo) return;
    var figure = document.querySelector('figure[data-theme="' + id + '"]');
    if (!figure) return;
    figure.setAttribute('data-tempo', held.tempo);
    figure.setAttribute('data-sourced', '1');
    var input = figure.querySelector('.tempo__input');
    if (input) input.value = held.tempo;
  });
  document.querySelectorAll('figure[data-theme]').forEach(showRate);

  paint();
})();
</script>
`;

const out = arg('out', 'themes-review.html');
writeFileSync(out, html);
process.stderr.write(`${out} — ${chosen.length} tunes\n`);
