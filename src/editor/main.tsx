/**
 * The course editor: a webpage, because the player insisted and was right.
 *
 * The file route was offered first — author the JSON at a desk, import it on
 * the phone — and refused on 2026-08-28 in terms that settle it: *"I just
 * can't see myself hand-editing the JSON and then debugging it when I try to
 * import."* So this page exists, with the rework risk of an unsettled schema
 * accepted and on record in `course-plan.md`.
 *
 * ## What makes it trustworthy rather than merely convenient
 *
 * It is built from the app's own modules: the drill list is `DRILLS`, the
 * difficulties are `DIFFICULTIES`, the keys are `MAJOR_KEYS`, and — the part
 * that kills the debug-on-import loop outright — **validation is `readCourse`
 * itself**, run on every keystroke. A file this page saves has already been
 * read by the exact code the phone will read it with; the reader's own error
 * sentence shows verbatim while the fault exists.
 *
 * ## Where it runs, and where it will run
 *
 * Shipped only in the paid build (its own Vite entry, added for
 * `VITE_TARGET=app` alone, and kept out of the PWA's precache like the spike
 * pages), so the tailnet copy serves it to a desktop browser today at
 * `/editor.html`. When Phase 5 puts the server on the phone, the phone serves
 * this same page and the file buttons below grow live endpoints — that is the
 * plan, and nothing here assumes otherwise. Until then the loop is: edit
 * here, Save, and import the file on the phone's practice screen.
 */

import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  readCourse,
  courseLength,
  stepsInLevel,
  LENGTH_UNIT_FOR,
  type Course,
  type LevelKind,
} from '../exercise/course';
import { DIFFICULTIES } from '../exercise/difficulty';
import { DRILLS } from '../exercise/generate';
import { MAJOR_KEYS } from '../domain/keys';
import { OFFERED_METRES } from '../domain/metre';
import { Timeline } from './timeline/Timeline';
import { numericDivisions } from './timeline/generators';
import { documentOf } from './document';

/** The working document: plain data, edited loosely, judged by the reader. */
type Doc = Record<string, unknown> & { levels: Record<string, unknown>[] };

const FRESH: Doc = {
  id: 'my-course',
  name: 'My course',
  blurb: '',
  schemaVersion: 1,
  levels: [freshLevel(1)],
};

function freshLevel(n: number): Record<string, unknown> {
  return {
    id: `level-${n}`,
    name: `Level ${n}`,
    base: { kind: 'drills', drillId: 'major-scale', difficultyId: 'easy' },
    // The timeline from the first keystroke: a tempo axis, in the new format.
    axes: [{ axis: 'tempo', divisions: numericDivisions(66, 96, 6) }],
  };
}

/** Which unit each material measures its length in — the reader's own table. */
const LENGTH_UNIT = LENGTH_UNIT_FOR;

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'level';
}

export function App() {
  const [doc, setDoc] = useState<Doc>(FRESH);
  const [fileName, setFileName] = useState('my-course.json');

  // The whole point of the page: the reader's verdict, live.
  const verdict = useMemo(() => readCourse(doc), [doc]);
  const course: Course | null = 'error' in verdict ? null : verdict;

  const patch = (changes: Record<string, unknown>) => setDoc({ ...doc, ...changes });
  const patchLevel = (index: number, changes: Record<string, unknown>) => {
    const levels = doc.levels.slice();
    levels[index] = { ...levels[index], ...changes };
    setDoc({ ...doc, levels });
  };
  const patchIn = (index: number, field: string, changes: Record<string, unknown>) => {
    const current = (doc.levels[index][field] ?? {}) as Record<string, unknown>;
    patchLevel(index, { [field]: { ...current, ...changes } });
  };

  const moveLevel = (index: number, by: number) => {
    const levels = doc.levels.slice();
    const [level] = levels.splice(index, 1);
    levels.splice(index + by, 0, level);
    setDoc({ ...doc, levels });
  };

  const open = (file: File) => {
    file.text().then((text) => {
      try {
        const parsed = JSON.parse(text) as Doc;
        if (!Array.isArray(parsed.levels)) parsed.levels = [];
        /*
         * A file that reads clean is modernised through the reader itself:
         * its read-forward turns tempo bands, `advance` and `pinned` into
         * the axes and header scalars they always meant, and the editor
         * works — and saves — in today's format only. A file that does NOT
         * read clean loads raw, so the verdict line can point at the fault
         * where the author can fix it.
         */
        const read = readCourse(parsed);
        setDoc('error' in read ? parsed : documentOf(read));
        setFileName(file.name);
      } catch {
        alert('That file is not JSON at all — nothing was loaded.');
      }
    });
  };

  const save = () => {
    const name = `${String(doc.id) || 'course'}.json`;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
    setFileName(name);
  };

  return (
    <div className="editor">
      <header>
        <h1>Course editor</h1>
        <span className="file">{fileName}</span>
        <label className="button">
          Open…
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && open(e.target.files[0])}
          />
        </label>
        <button type="button" onClick={save} disabled={!course}>
          Save
        </button>
        <button
          type="button"
          onClick={() => confirm('Start a new course? Unsaved changes are lost.') && setDoc(FRESH)}
        >
          New
        </button>
      </header>

      {/* The reader's verdict, verbatim — the sentence the phone would say. */}
      <p className={course ? 'verdict ok' : 'verdict bad'} role="status">
        {course
          ? `Reads clean: ${course.levels.length} level${course.levels.length === 1 ? '' : 's'}, ` +
            `${courseLength(course)} steps end to end.`
          : (verdict as { error: string }).error}
      </p>

      <section className="meta">
        <label>
          Course name
          <input
            value={String(doc.name ?? '')}
            onChange={(e) => patch({ name: e.target.value, id: slug(e.target.value) })}
          />
        </label>
        <label>
          Blurb
          <input value={String(doc.blurb ?? '')} onChange={(e) => patch({ blurb: e.target.value })} />
        </label>
        <span className="muted">id: {String(doc.id ?? '')}</span>
      </section>

      {doc.levels.map((level, index) => {
        const base = (level.base ?? {}) as Record<string, unknown>;
        const kind = (typeof base.kind === 'string' ? base.kind : 'drills') as LevelKind;
        const read = course?.levels.find((l) => l.id === level.id);
        const readTempos = read?.segments
          .map((segment) => segment.values.tempo)
          .filter((tempo): tempo is number => tempo !== undefined);
        /* Which parameters this level moves on the timeline: their header
           controls lock, because the trichotomy says never both. */
        const axisIds = new Set(
          (Array.isArray(level.axes) ? (level.axes as { axis?: unknown }[]) : []).map((a) =>
            String(a?.axis),
          ),
        );
        return (
          <section className="level" key={index}>
            <header>
              <strong>{index + 1}.</strong>
              <input
                className="level-name"
                value={String(level.name ?? '')}
                onChange={(e) =>
                  patchLevel(index, { name: e.target.value, id: slug(e.target.value) })
                }
              />
              {read && (
                <span className="muted">
                  {stepsInLevel(read)} segment{stepsInLevel(read) === 1 ? '' : 's'}
                  {readTempos && readTempos.length > 0
                    ? ` · ${readTempos[0]}–${readTempos[readTempos.length - 1]} bpm`
                    : ''}
                </span>
              )}
              <span className="spacer" />
              <button type="button" disabled={index === 0} onClick={() => moveLevel(index, -1)}>
                ↑
              </button>
              <button
                type="button"
                disabled={index === doc.levels.length - 1}
                onClick={() => moveLevel(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                disabled={doc.levels.length === 1}
                onClick={() => setDoc({ ...doc, levels: doc.levels.filter((_, i) => i !== index) })}
              >
                Remove
              </button>
            </header>

            <label className="wide">
              Author’s note
              <input
                value={String(level.note ?? '')}
                placeholder="Why this level; what to watch for"
                onChange={(e) =>
                  patchLevel(index, e.target.value ? { note: e.target.value } : { note: undefined })
                }
              />
            </label>

            <div className="row">
              <label>
                Material
                <select
                  value={String(base.kind ?? 'drills')}
                  onChange={(e) => patchIn(index, 'base', { kind: e.target.value })}
                >
                  <option value="drills">Drills</option>
                  <option value="phrases">Sight-reading</option>
                  <option value="themes">Themes</option>
                </select>
              </label>
              {base.kind === 'drills' && (
                <label>
                  Drill
                  <select
                    value={String(base.drillId ?? 'major-scale')}
                    onChange={(e) => patchIn(index, 'base', { drillId: e.target.value })}
                  >
                    {DRILLS.map((drill) => (
                      <option key={drill.id} value={drill.id}>
                        {drill.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Difficulty
                <select
                  value={String(base.difficultyId ?? 'easy')}
                  onChange={(e) => patchIn(index, 'base', { difficultyId: e.target.value })}
                >
                  {DIFFICULTIES.map((difficulty) => (
                    <option key={difficulty.id} value={difficulty.id}>
                      {difficulty.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Key
                <select
                  value={base.fifths === undefined ? '' : String(base.fifths)}
                  disabled={axisIds.has('fifths')}
                  onChange={(e) =>
                    patchIn(index, 'base', {
                      fifths: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                >
                  {/*
                    Says what happens, not what it is not. "Player's own" was
                    accurate and useless: it named a key the author could not
                    predict and — until the gate gained a key control on
                    2026-08-29 — the player could not reach either. Now the
                    label can promise something, so it does.
                  */}
                  <option value="">
                    {axisIds.has('fifths') ? 'On the timeline' : 'Player chooses, at the gate'}
                  </option>
                  {MAJOR_KEYS.map((key) => (
                    <option key={key.fifths} value={key.fifths}>
                      {key.name} major
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Register
                <select
                  value={String(base.register ?? '')}
                  onChange={(e) =>
                    patchIn(index, 'base', {
                      register: e.target.value === '' ? undefined : e.target.value,
                    })
                  }
                >
                  <option value="">Middle</option>
                  <option value="low">Low</option>
                  <option value="high">High</option>
                </select>
              </label>
              {/*
               * How long a run is, in the unit this material measures itself
               * in — so the field is named for the material rather than
               * asking the author to remember which "length" means what. The
               * reader refuses the other two units by name, so the label and
               * the schema cannot disagree.
               *
               * Blank means the material's own default, which is what every
               * level got before 2026-08-29 whether its author wanted it or
               * not: four cycles for a scale, eight for an arpeggio, sixteen
               * bars for sight-reading.
               */}
              <label>
                {base.kind === 'phrases' ? 'Bars' : base.kind === 'themes' ? 'Tunes' : 'Cycles'}
                <input
                  type="number"
                  min={1}
                  step={1}
                  placeholder={axisIds.has(LENGTH_UNIT[kind]) ? 'on the timeline' : 'default'}
                  disabled={axisIds.has(LENGTH_UNIT[kind])}
                  value={String(base[LENGTH_UNIT[kind]] ?? '')}
                  onChange={(e) => {
                    const unit = LENGTH_UNIT[kind];
                    const value = e.target.value === '' ? undefined : Number(e.target.value);
                    /* The other two units are cleared, not left lying: a level
                       switched from drills to sight-reading would otherwise
                       carry a `cycles` the reader now refuses by name. */
                    patchIn(index, 'base', {
                      bars: undefined,
                      cycles: undefined,
                      themeCount: undefined,
                      [unit]: value,
                    });
                  }}
                />
              </label>
              {kind === 'drills' && (
                <label>
                  Reach
                  <select
                    value={String(base.spanSemitones ?? '')}
                    disabled={axisIds.has('span')}
                    onChange={(e) =>
                      patchIn(index, 'base', {
                        spanSemitones:
                          e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  >
                    <option value="">
                      {axisIds.has('span') ? 'On the timeline' : 'Difficulty’s own'}
                    </option>
                    <option value="7">A fifth</option>
                    <option value="12">One octave</option>
                    <option value="19">An octave and a fifth</option>
                    <option value="24">Two octaves</option>
                  </select>
                </label>
              )}
              {kind !== 'drills' && (
                <label>
                  Metre
                  <select
                    value={Array.isArray(base.metre) ? base.metre.join('/') : ''}
                    disabled={axisIds.has('metre')}
                    onChange={(e) =>
                      patchIn(index, 'base', {
                        metre:
                          e.target.value === ''
                            ? undefined
                            : e.target.value.split('/').map(Number),
                      })
                    }
                  >
                    <option value="">
                      {axisIds.has('metre') ? 'On the timeline' : 'Player’s choice'}
                    </option>
                    {OFFERED_METRES.map(([n, d]) => (
                      <option key={`${n}/${d}`} value={`${n}/${d}`}>
                        {n}/{d}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            <div className="row">
              {/*
               * Whether the music carries on past that length, offering
               * "Continue" instead of ending the run. Off unless asked for:
               * the horizon is free play's feature, where the player decides
               * when to stop, and inside a course it took the length of the
               * run back from the author — and quietly changed how much
               * evidence the advance rule saw. Ruled 2026-08-29.
               */}
              <label className="check">
                <input
                  type="checkbox"
                  checked={level.endless === true}
                  onChange={(e) => patchLevel(index, { endless: e.target.checked || undefined })}
                />
                Keep playing past the end (offer “Continue”)
              </label>
            </div>

            {/*
             * The trichotomy's header half (2026-08-29): each of these pins a
             * value for the whole level, shown locked at the gate. The same
             * parameter moved on the timeline below locks the control here —
             * a parameter is pinned or progresses, never both, and choosing
             * it in the add-axis picker unpins it in the same gesture.
             */}
            <div className="row">
              <label>
                Tempo (bpm)
                <input
                  type="number"
                  min={1}
                  placeholder={axisIds.has('tempo') ? 'on the timeline' : 'player’s dial'}
                  disabled={axisIds.has('tempo') || typeof level.tempo === 'object'}
                  value={typeof level.tempo === 'number' ? String(level.tempo) : ''}
                  onChange={(e) =>
                    patchLevel(index, {
                      tempo: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                />
              </label>
              {(
                [
                  ['metronomeEnabled', 'Metronome', ['on', 'off']],
                  ['conductorEnabled', 'Conductor', ['on', 'off']],
                  ['fingerings', 'Fingerings', ['always', 'trouble', 'never']],
                  ['playbackMode', 'Sound', ['reference', 'off']],
                  ['readingMode', 'Reading', ['scrolling', 'paged']],
                ] as const
              ).map(([field, label, choices]) => {
                const onOff = field === 'metronomeEnabled' || field === 'conductorEnabled';
                const current = level[field];
                const shown =
                  current === undefined ? '' : onOff ? (current ? 'on' : 'off') : String(current);
                return (
                  <label key={field}>
                    {label}
                    <select
                      value={shown}
                      disabled={axisIds.has(field)}
                      onChange={(e) =>
                        patchLevel(index, {
                          [field]:
                            e.target.value === ''
                              ? undefined
                              : onOff
                                ? e.target.value === 'on'
                                : e.target.value,
                        })
                      }
                    >
                      <option value="">
                        {axisIds.has(field) ? 'On the timeline' : 'Player’s choice'}
                      </option>
                      {choices.map((choice) => (
                        <option key={choice} value={choice}>
                          {choice}
                        </option>
                      ))}
                    </select>
                  </label>
                );
              })}
            </div>

            <Timeline
              kind={kind}
              level={level}
              onPatch={(changes) => patchLevel(index, changes)}
            />
          </section>
        );
      })}

      <button
        type="button"
        className="add"
        onClick={() => setDoc({ ...doc, levels: [...doc.levels, freshLevel(doc.levels.length + 1)] })}
      >
        Add a level
      </button>

      <footer className="muted">
        Save writes the course as a file; import it on the phone’s practice screen. The
        validation above is the app’s own reader, so a file that reads clean here imports clean
        there.
      </footer>
    </div>
  );
}

const style = document.createElement('style');
style.textContent = `
  :root { color-scheme: light dark; }
  body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: #faf7f1; color: #23201b; }
  @media (prefers-color-scheme: dark) { body { background: #1c1a17; color: #ece7de; } }
  .editor { max-width: 82rem; margin: 0 auto; padding: 1rem 1.5rem 4rem; }
  .editor > header { display: flex; gap: 0.75rem; align-items: baseline; }
  .editor > header h1 { font-size: 1.4rem; margin: 0.5rem 0; }
  .file { opacity: 0.6; flex: 1; }
  button, .button { font: inherit; padding: 0.3rem 0.9rem; border-radius: 6px; border: 1px solid #b8a; background: transparent; color: inherit; cursor: pointer; }
  .verdict { padding: 0.5rem 0.8rem; border-radius: 6px; font-weight: 600; }
  .verdict.ok { background: #2e7d3222; }
  .verdict.bad { background: #c6282822; }
  .meta, .level { border: 1px solid #8886; border-radius: 8px; padding: 0.75rem 1rem; margin: 0.75rem 0; }
  .level > header { display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.4rem; }
  .level-name { font-weight: 700; font-size: 1.05rem; flex: 0 1 22rem; }
  .spacer { flex: 1; }
  .row { display: flex; gap: 1rem; flex-wrap: wrap; margin: 0.4rem 0; align-items: end; }
  label { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.85rem; opacity: 0.95; }
  label.wide { width: 100%; }
  label.check { flex-direction: row; align-items: center; gap: 0.4rem; }
  input, select { font: inherit; padding: 0.25rem 0.4rem; border-radius: 5px; border: 1px solid #8887; background: transparent; color: inherit; }
  input[type=number] { width: 5rem; }
  .muted { opacity: 0.6; font-size: 0.85rem; }
  .add { margin-top: 0.5rem; }
  footer { margin-top: 2rem; }

  /*
   * The timeline as one GRID (player's UAT, 2026-08-29): a panel column at
   * the left with each axis's parameters on a single line, and one shared
   * bar column so every bar starts and ends together — the common timeline
   * the drawing meant. Boundary lines run through the whole graph, and a
   * drag guide runs its full height, lighting up when it snaps onto another
   * axis's divider. Wide by design: the wrapper scrolls sideways on a small
   * screen rather than folding the panels back into three lines.
   */
  .tl { margin-top: 0.75rem; border-top: 1px dashed #8886; padding-top: 0.5rem; }
  .tl__scroll { overflow-x: auto; padding-bottom: 0.25rem; }
  .tl__grid { display: grid; grid-template-columns: max-content minmax(34rem, 1fr); column-gap: 1rem; row-gap: 1.1rem; position: relative; min-width: 56rem; padding-right: 1.5rem; }
  .tl__corner { grid-column: 1; grid-row: 1; font-weight: 700; font-size: 0.9rem; align-self: end; }
  .tl__ruler { grid-column: 2; grid-row: 1; position: relative; height: 1.1rem; opacity: 0.55; font-size: 0.72rem; border-bottom: 1px solid #8886; }
  .tl__ruler span { position: absolute; bottom: 0.1rem; transform: translateX(-50%); }
  .tl__ruler span:first-child { transform: none; }
  .tl__ruler span:last-child { transform: translateX(-100%); }

  .tl-axis__panel { grid-column: 1; display: flex; gap: 0.5rem; align-items: center; white-space: nowrap; border-right: 2px solid #8885; padding-right: 0.75rem; }
  .tl-axis__name { min-width: 5.5rem; }
  .tl-gen { display: flex; gap: 0.4rem; align-items: center; }
  .tl-gen label { flex-direction: row; align-items: center; gap: 0.25rem; }
  .tl-gen input[type=number] { width: 3.2rem; }

  .tl-axis__bar { grid-column: 2; position: relative; min-height: 4.2rem; }
  .tl-axis__line { position: absolute; left: 0; right: 0; top: 0.55rem; height: 4px; background: currentColor; opacity: 0.75; border-radius: 2px; }
  .tl-division { position: absolute; top: 0; transform: translateX(-2px); }
  .tl-handle { position: absolute; top: 0; left: 0; width: 1.4rem; height: 1.4rem; padding: 0; margin-left: -0.7rem; border: none; background: none; cursor: ew-resize; font-weight: 700; color: #c0392b; touch-action: none; z-index: 2; }
  .tl-division__value { position: absolute; top: 1.3rem; left: 0; display: flex; gap: 0.15rem; align-items: start; z-index: 2; }
  .tl-value { width: 3.4rem; font-size: 0.8rem; }
  select.tl-value { width: auto; max-width: 7.5rem; }
  .tl-division__delete { padding: 0 0.3rem; opacity: 0.6; }
  .tl-axis__add { position: absolute; right: -1.4rem; top: 0.1rem; padding: 0 0.5rem; }

  /* The common timeline, made visible. */
  .tl__lines { grid-column: 2; position: relative; pointer-events: none; z-index: 1; }
  .tl__line { position: absolute; top: -0.55rem; bottom: -0.55rem; width: 1px; background: currentColor; opacity: 0.22; }
  .tl__line.is-shared { width: 2px; opacity: 0.3; }
  .tl__guide { position: absolute; top: -1.65rem; bottom: -0.55rem; width: 1px; background: #c0392b; opacity: 0.55; }
  .tl__guide.is-snapped { width: 3px; opacity: 1; box-shadow: 0 0 6px #c0392b88; }

  .tl__controls { display: flex; gap: 1rem; align-items: end; flex-wrap: wrap; margin: 0.5rem 0; }
  .tl-range { display: flex; flex-direction: column; gap: 0.15rem; width: 8rem; }
  .tl-range__figure { width: 8rem; }
  .stave-figure__canvas, .tl-range__figure canvas { display: block; width: 100%; }
  .tl-range__bounds { display: flex; gap: 0.2rem; }
  .tl-range__bounds input { width: 3.4rem; font-size: 0.75rem; }
  .tl-pool { display: flex; flex-direction: column; gap: 0.15rem; font-size: 0.75rem; background: #8881; padding: 0.25rem; border-radius: 5px; }
  .tl-pool__row { display: flex; gap: 0.2rem; align-items: center; }
  .tl-pool input[type=number] { width: 2.6rem; }
  .tl-pool__degrees { display: flex; gap: 0.25rem; }
  .tl-pool__degrees label { flex-direction: row; align-items: center; gap: 0.1rem; }

  .tl-rules__label { grid-column: 1; display: flex; flex-direction: column; gap: 0.1rem; justify-content: center; font-weight: 700; font-size: 0.85rem; border-right: 2px solid #8885; padding-right: 0.75rem; white-space: nowrap; }
  .tl-rules__label .muted { font-weight: 400; }
  .tl-rules__default { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; font-size: 0.85rem; margin: 0.6rem 0 0.3rem; }
  .tl-rules__default label { flex-direction: row; align-items: center; gap: 0.3rem; }
  .tl-rules__default input { width: 3.2rem; }
  .tl-rules__row { grid-column: 2; display: flex; gap: 3px; align-items: center; }
  .tl-chipwrap { position: relative; display: flex; min-width: 0; }
  .tl-chip { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 1px solid #8886; border-radius: 999px; padding: 0.2rem 0.6rem; font-size: 0.75rem; background: #8881; cursor: pointer; }
  .tl-chip.is-default { opacity: 0.65; }
  .tl-chip.is-authored { border-color: #b8a; background: #b8a2; font-weight: 600; }
  /* Downward, into room the scroller opens while it is up: the scroller
     clips vertically whatever it is told (overflow-x forces overflow-y),
     so a callout opening upward loses its head against the ruler. */
  .tl__scroll.has-callout { padding-bottom: 17rem; }
  .tl-callout { position: absolute; top: calc(100% + 0.6rem); left: 0; z-index: 5; min-width: 18rem; background: #faf7f1; border: 1px solid #b8a; border-radius: 8px; padding: 0.6rem 0.8rem; box-shadow: 0 4px 16px #0003; display: flex; flex-direction: column; gap: 0.4rem; font-size: 0.85rem; }
  .tl-callout.is-right { left: auto; right: 0; }
  .tl-callout::after { content: ''; position: absolute; bottom: 100%; left: 1.2rem; border: 0.5rem solid transparent; border-bottom-color: #b8a; }
  .tl-callout.is-right::after { left: auto; right: 1.2rem; }
  @media (prefers-color-scheme: dark) { .tl-callout { background: #262320; } }
  .tl-callout__head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .tl-callout label { flex-direction: row; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
  .tl-callout input[type=number] { width: 3.2rem; }
  .tl-callout p { margin: 0; }
  .tl__corner .muted, .tl-rules__label .muted { font-weight: 400; }
  .tl__estimate-note { margin: 0.4rem 0 0.2rem; }
`;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
