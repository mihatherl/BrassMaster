// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { instrumentById } from '../domain/instruments';
import { barAt, barCount, metreAt } from '../domain/metre';
import { formatPitch } from '../domain/pitch';
import type { Exercise } from '../exercise/types';
import { readScoreFile } from './container';
import { parseMusicXml, partNames } from './musicxml';
import { importPart, measuresFor, type Divisi } from './part';

/**
 * The whole importer, on a file a program actually wrote.
 *
 * Every other test in `import/` builds its MusicXML by hand, which is the right
 * way to test a rule: the document is as small as the case and says exactly
 * what is being asked. But hand-written documents share a blind spot — **they
 * only ever contain the cases somebody had already thought of.** One real
 * MuseScore export found six faults in an importer whose synthetic suite was
 * passing throughout: `<forward>` ignored so two bars came out six beats short,
 * a demisemiquaver dropped, a metre change never drawn, unreached bars never
 * reported, a picker filter that hid the file, and a tied note falling silent.
 *
 * So this one file is committed and read from disk, bytes first, through every
 * stage the app puts it through: unzip, parse, unfold, read, assemble. It is
 * the only test here that would notice a fault living *between* two stages.
 *
 * **The fixture is a MuseScore 3.6.2 export** — `<work-title>Title</work-title>`
 * and `<creator>Composer</creator>`, its placeholder metadata untouched — kept
 * deliberately small and deliberately awkward: 42 written bars holding a segno,
 * a to-coda, a D.S., first- and second-time bars, three nested repeats, two
 * bars written as bare `<forward>`, four key changes, a change of time
 * signature, a chord, and a demisemiquaver. Nothing here is a real piece of
 * music and it is not meant to be.
 *
 * The expected figures below were read off the file rather than off the
 * importer — the measure durations were totalled independently, in a throwaway
 * script, against `<divisions>` and the time signature in force. A test that
 * records whatever the code currently prints would pass just as happily with
 * the bugs above still in it.
 */

/** Read from disk as bytes, because the unzipping is part of what is under test. */
const FIXTURE = 'src/import/__fixtures__/musescore-export.mxl';

/** Written bars in the file, counted from the `<measure>` elements. */
const WRITTEN_BARS = 42;

/**
 * Bars once the repeats are unfolded.
 *
 * Longer than the printed part because that is what unfolding *is*; see the
 * ruling in `docs/musicxml-import-plan.md`. Reads as a strange number until you
 * count the file's structure: nothing here repeats tidily.
 */
const PLAYED_BARS = 61;

/** Ticks per crotchet, from `<divisions>`. Every duration below is a multiple. */
const DIVISIONS = 8;

async function importFixture(divisi?: Divisi): Promise<{
  exercise: Exercise;
  problems: string[];
  names: string[];
}> {
  const bytes = readFileSync(FIXTURE);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

  const opened = await readScoreFile(buffer as ArrayBuffer);
  if ('problem' in opened) throw new Error(`the fixture would not open: ${opened.problem}`);

  const parsed = parseMusicXml(opened.xml);
  if ('problem' in parsed) throw new Error(`the fixture would not parse: ${parsed.problem}`);

  const { exercise, problems } = importPart(parsed.doc, {
    instrument: instrumentById('eb-bass'),
    divisi,
  });
  if (!exercise) throw new Error('the fixture imported to nothing');
  return { exercise, problems, names: partNames(parsed.doc) };
}

/** A note as `E4@0`: what is read, and where it falls. Checkable against the page. */
function reading(exercise: Exercise, from: number, count: number): string {
  return exercise.notes
    .slice(from, from + count)
    .map((note) => `${formatPitch(note.pitch)}@${note.startBeat}`)
    .join(' ');
}

describe('a real MuseScore export, end to end', () => {
  let exercise: Exercise;
  let problems: string[];
  let names: string[];

  beforeAll(async () => {
    ({ exercise, problems, names } = await importFixture());
  });

  it('opens, parses and imports from the bytes on disk', () => {
    expect(names).toEqual(['Piano']);
    expect(exercise.notes.length).toBeGreaterThan(0);
  });

  it('reports the divided notes and nothing else', () => {
    /*
     * The one thing this file asks that cannot be honoured in full: it holds a
     * chord, and a chord on a single-line instrument gives up everything but
     * its top note. Countable and located, per the rule every warning here
     * obeys — and the *only* warning, which is the substance of this
     * assertion. A second one appearing means the importer has started
     * failing at something it currently manages.
     */
    expect(problems).toEqual(['9 divided notes read on the upper line']);
  });

  it('reads the opening bars exactly as they are printed', () => {
    /*
     * Bars 1-3, totalled by hand from the file: three crotchets and a crotchet
     * rest; four crotchets; then a quaver, a quaver rest, a crotchet rest and a
     * minim. Written out in full because this is the assertion that would
     * catch a wrong `<divisions>` conversion, and a wrong conversion is
     * invisible in any figure that only counts things.
     */
    expect(reading(exercise, 0, 8)).toBe('E4@0 G4@1 B4@2 F4@4 F4@5 E5@6 E5@7 E5@8');
    expect(exercise.rests.slice(0, 3)).toEqual([
      { startBeat: 3, duration: { value: 'quarter', dotted: false } },
      { startBeat: 8.5, duration: { value: 'eighth', dotted: false } },
      { startBeat: 9, duration: { value: 'quarter', dotted: false } },
    ]);
  });

  it('keeps the demisemiquaver, and puts it where it belongs', () => {
    /*
     * v1.44.0. Bar 4 opens with a 32nd — one tick where `<divisions>` is 8 —
     * and the three rests that fill out its beat are each a different value.
     * The note being present is half the assertion; the other half is that
     * everything after it sits an eighth of a crotchet later, which is what
     * dropping it silently would break.
     */
    const demisemiquaver = exercise.notes.find(
      (note) => note.duration.value === 'thirtySecond',
    );
    expect(demisemiquaver).toBeDefined();
    expect(demisemiquaver?.startBeat).toBe(12);
    expect(exercise.rests.filter((rest) => rest.startBeat > 12 && rest.startBeat < 13)).toEqual([
      { startBeat: 12.125, duration: { value: 'thirtySecond', dotted: false } },
      { startBeat: 12.25, duration: { value: 'sixteenth', dotted: false } },
      { startBeat: 12.5, duration: { value: 'eighth', dotted: false } },
    ]);
  });

  it('changes time signature where the file changes it', () => {
    /*
     * v1.43.0. The file turns from 4/4 into 3/4 at written bar 5, which is beat
     * 16 — four bars of four. Asserted as a beat *and* as a bar, because the
     * two only agree while the metre has not changed, and it has.
     */
    expect(exercise.metres.map((change) => change.fromBeat)).toEqual([0, 16]);
    expect(metreAt(exercise.metres, 0).beatsPerBar).toBe(4);
    expect(metreAt(exercise.metres, 16).beatsPerBar).toBe(3);
    expect(barAt(exercise.metres, 16)).toBe(4);
  });

  it('changes key where the file changes it', () => {
    expect(exercise.keys).toEqual([
      { fromBeat: 0, fifths: 0 },
      { fromBeat: 12, fifths: 2 },
      { fromBeat: 52, fifths: -1 },
      { fromBeat: 181, fifths: -2 },
    ]);
  });

  it('gives a bar written as a bare forward its full length', () => {
    /*
     * v1.43.1, and the fault that makes this whole file worth committing. Two
     * of its bars hold no notes at all — just `<forward>` for 24 ticks, three
     * crotchets, a whole 3/4 bar each. Ignoring them cost exactly the six beats
     * this arithmetic would have caught.
     *
     * Stated as a property rather than as a figure: the part ends on a bar
     * line. A bar swallowed anywhere in it leaves the total short of a whole
     * number of bars, wherever it was lost.
     */
    const bars = barCount(exercise.metres, exercise.totalBeats);
    expect(bars).toBe(PLAYED_BARS);
    expect(exercise.totalBeats).toBe(16 + (PLAYED_BARS - 4) * 3);
  });

  it('unfolds the navigation, reaching every bar', () => {
    /*
     * A segno, a to-coda, a D.S., first- and second-time bars and three nested
     * repeats — resolved to a flat run longer than the printed part. That no
     * bar is left unreached is asserted through `problems` above: an unreached
     * stretch is reported there, and there is nothing there but the divisi.
     */
    expect(barCount(exercise.metres, exercise.totalBeats)).toBeGreaterThan(WRITTEN_BARS);
    expect(barCount(exercise.metres, exercise.totalBeats)).toBe(PLAYED_BARS);
  });

  it('reads the lower line when the player asks for it', async () => {
    /*
     * The file's chord is B3 under B4. Upper takes the top note; lower takes
     * the one underneath — the same bar, the same beat, a different octave, and
     * on a tuba the same three valves. The ruling is in `part.ts`; this is the
     * only test of it against a chord a notation program wrote.
     */
    const upper = exercise.notes.find((note) => note.startBeat === 16);
    expect(upper && formatPitch(upper.pitch)).toBe('B4');

    const lower = await importFixture('lower');
    const taken = lower.exercise.notes.find((note) => note.startBeat === 16);
    expect(taken && formatPitch(taken.pitch)).toBe('B3');
    expect(lower.problems).toEqual(['9 divided notes read on the lower line']);
  });

  it('practises a passage out of the middle, in the key and metre it sits in', async () => {
    /*
     * The case a hand-written document cannot really pose, because a hand-
     * written one states its attributes where the test needs them. A real part
     * declares `<divisions>` once at the top and never again, and changes key
     * and metre where the music does — so a selection starting at bar 6
     * inherits all three from measures it never reads.
     *
     * The failure this guards is not subtle. Read with divisions defaulting to
     * 1 against a file declaring 8, every duration comes out eight times too
     * long; the first version of this did exactly that.
     */
    const bytes = readFileSync(FIXTURE);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const opened = await readScoreFile(buffer as ArrayBuffer);
    if ('problem' in opened) throw new Error(opened.problem);
    const parsed = parseMusicXml(opened.xml);
    if ('problem' in parsed) throw new Error(parsed.problem);

    // Printed bars 6 to 9, which sit after the change into 3/4 at bar 5.
    const { exercise, bars } = importPart(parsed.doc, {
      instrument: instrumentById('eb-bass'),
      reading: { kind: 'passage', spans: [{ from: 5, to: 8 }], times: 1 },
    });

    expect(bars.map((bar) => bar.number)).toEqual(['6', '7', '8', '9']);
    expect(metreAt(exercise!.metres, 0).beatsPerBar).toBe(3);
    // Four bars of three, and not a beat more.
    expect(exercise!.totalBeats).toBe(12);
    expect(barCount(exercise!.metres, exercise!.totalBeats)).toBe(4);
    // The key in force there, inherited from the change at bar 4.
    expect(exercise!.keys[0].fifths).toBe(2);
  });

  it('practises the bars the page names, through both translations', async () => {
    /*
     * The whole path a chosen passage takes, end to end: draw the part, pick a
     * bar off the drawing, and get that bar back.
     *
     * Three things count bars and they are not the same count — the bar as
     * drawn, the measure in the file, and the number on the page. The picker
     * used to hand a drawn index over as a measure index, and on a scanned
     * part that was six bars out. Nothing in the unit tests noticed, because
     * each end was right on its own.
     */
    const bytes = readFileSync(FIXTURE);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const opened = await readScoreFile(buffer as ArrayBuffer);
    if ('problem' in opened) throw new Error(opened.problem);
    const parsed = parseMusicXml(opened.xml);
    if ('problem' in parsed) throw new Error(parsed.problem);

    const instrument = instrumentById('eb-bass');
    const page = importPart(parsed.doc, { instrument, reading: { kind: 'printed' } });

    // Pick the bars the page calls 20 and 21, by finding them where they are
    // drawn — which is what a tap on those bars gives.
    const from = page.bars.findIndex((bar) => bar.number === '20');
    const to = page.bars.findIndex((bar) => bar.number === '21');
    expect(from).toBeGreaterThan(-1);

    const practice = importPart(parsed.doc, {
      instrument,
      reading: {
        kind: 'passage',
        spans: [measuresFor(page.bars, { from, to })],
        times: 1,
      },
    });

    expect(practice.bars.map((bar) => bar.number)).toEqual(['20', '21']);
  });

  it('resolves every duration onto the tick grid the file declares', () => {
    /*
     * Nothing may land between two ticks. A rounding fault in the divisions
     * conversion shows up here as a fraction and nowhere else until the notes
     * are on a stave and a bar is visibly a hair too long.
     */
    const tick = 1 / DIVISIONS;
    for (const note of exercise.notes) {
      const ticks = note.startBeat / tick;
      expect(Math.abs(ticks - Math.round(ticks))).toBeLessThan(1e-9);
    }
  });
});

/*
 * A real multi-part score, at last — the plan carried "the part chooser has
 * not met a real multi-part score" since v1.41.0. This one is Harriett
 * Abrams' *Crazy Jane* from OpenScore Lieder (CC0, a genuine MuseScore
 * export): two parts, Voice and "Piano (or Harp)" across two lines, 69
 * written measures of which five are implicit — the pickup, and four "X"
 * continuation measures where MuseScore split a bar at a mid-bar section
 * break — so the page holds 65 numbered bars, no repeats, one tempo mark in
 * the voice part only, and a piano part whose chords and second staff are
 * everything the importer warns about. Every figure below was counted off
 * the file with a throwaway script, not read back from the importer.
 *
 * This file has already earned its place twice over: its split bars were
 * the first correct file to draw the fullness warning (now exempted — see
 * the check's comment), and its part name was the first with a line break
 * in it.
 */
describe('a real two-part score', () => {
  const LIEDER = 'src/import/__fixtures__/openscore-lieder.mxl';

  async function importLieder(partIndex: number) {
    const bytes = readFileSync(LIEDER);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const opened = await readScoreFile(buffer as ArrayBuffer);
    if ('problem' in opened) throw new Error(`the fixture would not open: ${opened.problem}`);
    const parsed = parseMusicXml(opened.xml);
    if ('problem' in parsed) throw new Error(`the fixture would not parse: ${parsed.problem}`);
    return {
      ...importPart(parsed.doc, { instrument: instrumentById('eb-bass'), partIndex }),
      names: partNames(parsed.doc),
    };
  }

  it('offers both parts by name, on one line each', async () => {
    const { names } = await importLieder(0);
    // The file writes "Piano\n(or Harp)"; a chooser row is one line.
    expect(names).toEqual(['Voice', 'Piano (or Harp)']);
  });

  it('reads the voice part whole: every bar, the opening line, the stated tempo', async () => {
    const { exercise, problems, tempos } = await importLieder(0);
    expect(exercise).not.toBeNull();
    // 65 numbered bars: 69 measures less the four mid-bar splits, whose two
    // halves are one printed bar between them, exactly as the pickup pair is.
    expect(barCount(exercise!.metres, exercise!.totalBeats)).toBe(65);
    // The singer's opening phrase, as printed.
    const opening = exercise!.notes.slice(0, 4).map((note) => formatPitch(note.pitch));
    expect(opening).toEqual(['F4', 'Bb4', 'Bb4', 'A4']);
    // One mark, 92 quarter notes a minute through 3/4 — the pulse unchanged.
    expect(tempos).toEqual([{ atBeat: 0, bpm: 92 }]);
    // And no complaint about the split bars: the one warning left is real —
    // the file genuinely carries 27 grace notes. Pinned exactly, because the
    // split-bar exemption is a guard against warning on correct files.
    expect(problems).toEqual(['27 grace notes left out']);
  });

  it('reads the piano part as one line, and says what that cost', async () => {
    const { exercise, problems, tempos } = await importLieder(1);
    expect(exercise).not.toBeNull();
    // A piano part is chords on two staves. The importer reads the upper
    // line of each divide and drops the second voice, and says so, counted.
    expect(problems.some((line) => line.includes('divided note'))).toBe(true);
    expect(problems.some((line) => line.includes('second voice'))).toBe(true);
    // The file's one tempo mark lives in the voice part — choosing the piano
    // genuinely loses it, which is the file's truth, not a fault.
    expect(tempos).toEqual([]);
  });
});
