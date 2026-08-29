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
  resolveLevelDocument,
  type AxisId,
  type Course,
  type LevelKind,
} from '../exercise/course';
import { Prescription } from './Prescription';
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

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'level';
}

export function App() {
  const [doc, setDoc] = useState<Doc>(FRESH);
  const [fileName, setFileName] = useState('my-course.json');
  const [defaultsOpen, setDefaultsOpen] = useState(false);

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

  /** What the course itself states, for locking its own controls. */
  const courseKind = ((doc.base ?? {}) as Record<string, unknown>).kind as
    | LevelKind
    | undefined;
  const courseAxisIds = new Set(
    (Array.isArray(doc.axes) ? (doc.axes as { axis?: unknown }[]) : []).map((a) => String(a?.axis)),
  );

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

      {/*
       * What the course says once, for every level that does not say it.
       * The same controls a level has, because it is the same vocabulary —
       * and the same timeline, because a course may hand its levels a whole
       * progression, not only a value. Per-stage rules are deliberately
       * absent: they are keyed to boundaries that only exist once a level's
       * own axes are counted in, so they belong to the level.
       */}
      <details className="meta defaults" open={defaultsOpen}>
        <summary onClick={(e) => { e.preventDefault(); setDefaultsOpen(!defaultsOpen); }}>
          <strong>Course defaults</strong>
          <span className="muted"> — every level takes these unless it says otherwise</span>
        </summary>
        <Prescription
          scope="course"
          record={doc}
          onTimeline={courseAxisIds}
          onPatch={(changes) => patch(changes)}
          onPatchBase={(changes) =>
            patch({ base: { ...((doc.base ?? {}) as Record<string, unknown>), ...changes } })
          }
        />
        <Timeline
          kind={(courseKind ?? 'any') as LevelKind | 'any'}
          level={doc}
          showSegmentRules={false}
          onPatch={(changes) => patch(changes)}
        />
      </details>

      {doc.levels.map((level, index) => {
        const resolvedForKind = resolveLevelDocument(doc, level);
        const kind = (((resolvedForKind.base as Record<string, unknown>).kind as string) ??
          'drills') as LevelKind;
        const read = course?.levels.find((l) => l.id === level.id);
        const readTempos = read?.segments
          .map((segment) => segment.values.tempo)
          .filter((tempo): tempo is number => tempo !== undefined);
        /*
         * What this level would take from the course — by the reader's own
         * resolution, so the page can never disagree with what plays.
         */
        const resolved = resolvedForKind;
        const inheritedBase = { ...(resolved.base as Record<string, unknown>) };
        const inheritedFields = { ...resolved } as Record<string, unknown>;
        const resolvedAxes = (Array.isArray(resolved.axes) ? resolved.axes : []) as {
          axis: AxisId;
        }[];
        const ownAxisIds = new Set(
          (Array.isArray(level.axes) ? (level.axes as { axis?: unknown }[]) : []).map((a) =>
            String(a?.axis),
          ),
        );
        const inheritedAxisIds = new Set(
          resolvedAxes.map((a) => a.axis).filter((id) => !ownAxisIds.has(id)),
        );
        /* Which parameters this level moves on the timeline, its own or the
           course's: their header controls lock, because the trichotomy says
           never both. */
        const axisIds = new Set([...ownAxisIds, ...inheritedAxisIds]);
        const onTimeline = axisIds;
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

            <Prescription
              scope="level"
              record={level}
              inherited={{ base: inheritedBase, fields: inheritedFields }}
              onTimeline={onTimeline}
              fromCourse={inheritedAxisIds}
              onPatch={(changes) => patchLevel(index, changes)}
              onPatchBase={(changes) => patchIn(index, 'base', changes)}
            />

            <Timeline
              kind={kind}
              /* The RESOLVED level: an inherited axis shapes this level's
                 stages as surely as its own, so the graph must draw it. */
              level={resolved}
              inherited={[...inheritedAxisIds] as AxisId[]}
              ruleFromCourse={level.rules === undefined && doc.rules !== undefined}
              onAdopt={(axisId) =>
                patchLevel(index, {
                  axes: [
                    ...((level.axes as unknown[]) ?? []),
                    (resolvedAxes.find((a) => a.axis === axisId) as unknown),
                  ],
                })
              }
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

  .tl-axis__bar { grid-column: 2; position: relative; min-height: 2.9rem; }
  .tl-axis__line { position: absolute; left: 0; right: 0; top: 0.15rem; bottom: 0.15rem; background: currentColor; opacity: 0.05; border-radius: 8px; }
  /*
   * A stage is a coloured rounded block spanning the bars its value holds
   * for — so it rolls across every boundary that is not its own — and it
   * carries its own controls, which the loose labels under the old line
   * could not do on a narrow stage.
   */
  .tl-span { position: absolute; top: 0.15rem; bottom: 0.15rem; border-radius: 8px; border: 1px solid; box-sizing: border-box; display: flex; align-items: center; gap: 0.15rem; padding: 0 0.15rem 0 0.2rem; overflow: hidden; min-width: 0; container-type: inline-size; }
  /* Squeezed hard, a stage gives up its delete button before its value:
     the number is what the author is reading, and the chip below still
     carries the bars. */
  @container (max-width: 5rem) { .tl-span__delete { display: none; } }
  /* A fieldset, so an inherited axis's controls disable in one stroke —
     which drags in the browser's own padding, border and margin, and put
     the value 16px from the edge until this said otherwise. */
  fieldset.tl-span__body { display: flex; align-items: center; gap: 0.15rem; min-width: 0; flex: 1; border: 0; padding: 0; margin: 0; }
  /* Inherited from the course: drawn, because it shapes this level's
     stages — but not this level's to edit until it takes a copy. */
  .tl-span.is-ghost { opacity: 0.55; border-style: dashed; }
  /* The block's own left edge is the divider: a narrow grab strip over it,
     narrow so the value can sit hard against the edge behind it. */
  .tl-handle { position: absolute; left: -0.3rem; top: 0; bottom: 0; width: 0.6rem; padding: 0; border: none; background: none; color: transparent; cursor: ew-resize; touch-action: none; z-index: 3; }
  .tl-handle:hover, .tl-handle:focus-visible { background: #c0392b44; border-radius: 4px; }
  /* The input[type=number] rule above is (0,1,1), so a bare class loses to
     it — this must match specificity to narrow a spinner inside a block. */
  input.tl-value { width: 3.2rem; min-width: 1.5rem; font-size: 0.8rem; }
  select.tl-value { width: auto; max-width: 7rem; min-width: 0; font-size: 0.8rem; }
  .tl-span__delete { padding: 0 0.2rem; opacity: 0.55; line-height: 1; flex: 0 0 auto; }
  .tl-span__delete:hover { opacity: 1; }
  .tl-axis__add { position: absolute; right: -1.4rem; top: 0.1rem; padding: 0 0.5rem; }

  /* The common timeline, made visible. */
  .tl__lines { grid-column: 2; position: relative; pointer-events: none; z-index: 1; }
  .tl__tick { position: absolute; bottom: 0; width: 1px; height: 0.45rem; background: currentColor; opacity: 0.45; }
  .tl__guide { position: absolute; top: -1.65rem; bottom: -0.55rem; width: 1px; background: #c0392b; opacity: 0.55; }
  .tl__guide.is-snapped { width: 3px; opacity: 1; box-shadow: 0 0 6px #c0392b88; }

  .tl__controls { display: flex; gap: 1rem; align-items: end; flex-wrap: wrap; margin: 0.5rem 0; }
  /* The last row of the grid: a ghost stage that adds an axis, so the way
     to grow the graph sits in the graph rather than below it. */
  .tl-add { grid-column: 2; position: relative; min-height: 2.1rem; }
  .tl-add__ghost { position: absolute; inset: 0.15rem 0; border: 1px dashed #8888; border-radius: 8px; display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.8rem; opacity: 0.75; cursor: pointer; }
  .tl-add__ghost:hover { opacity: 1; border-color: #b8a; }
  .tl-gen__auto { display: inline-flex; align-items: center; gap: 0.3rem; white-space: nowrap; }
  .tl-gen__auto input[type=number] { width: 2.8rem; font-size: 0.8rem; padding: 0.1rem 0.2rem; }
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
