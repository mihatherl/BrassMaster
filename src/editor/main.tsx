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
import { readCourse, courseLength, stepsInLevel, type Course } from '../exercise/course';
import { DIFFICULTIES } from '../exercise/difficulty';
import { DRILLS } from '../exercise/generate';
import { MAJOR_KEYS } from '../domain/keys';

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
    tempo: { floor: 66, ceiling: 96, step: 6 },
  };
}

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
        setDoc(parsed);
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
        const tempo = (level.tempo ?? {}) as Record<string, unknown>;
        const advance = level.advance as Record<string, unknown> | undefined;
        const pinned = (level.pinned ?? {}) as Record<string, unknown>;
        const read = course?.levels.find((l) => l.id === level.id);
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
                  {stepsInLevel(read)} steps · {String(tempo.floor)}–{String(tempo.ceiling)} bpm
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
                  onChange={(e) =>
                    patchIn(index, 'base', {
                      fifths: e.target.value === '' ? undefined : Number(e.target.value),
                    })
                  }
                >
                  <option value="">Player’s own</option>
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
            </div>

            <div className="row">
              <label>
                Tempo floor
                <input
                  type="number"
                  value={Number(tempo.floor ?? 66)}
                  onChange={(e) => patchIn(index, 'tempo', { floor: Number(e.target.value) })}
                />
              </label>
              <label>
                Ceiling
                <input
                  type="number"
                  value={Number(tempo.ceiling ?? 96)}
                  onChange={(e) => patchIn(index, 'tempo', { ceiling: Number(e.target.value) })}
                />
              </label>
              <label>
                Step
                <input
                  type="number"
                  value={Number(tempo.step ?? 6)}
                  onChange={(e) => patchIn(index, 'tempo', { step: Number(e.target.value) })}
                />
              </label>
              <label>
                Metronome
                <select
                  value={pinned.metronomeEnabled === undefined ? '' : String(pinned.metronomeEnabled)}
                  onChange={(e) =>
                    patchIn(index, 'pinned', {
                      metronomeEnabled:
                        e.target.value === '' ? undefined : e.target.value === 'true',
                    })
                  }
                >
                  <option value="">Player’s choice</option>
                  <option value="true">Pinned on</option>
                  <option value="false">Pinned off</option>
                </select>
              </label>
              <label>
                Conductor
                <select
                  value={pinned.conductorEnabled === undefined ? '' : String(pinned.conductorEnabled)}
                  onChange={(e) =>
                    patchIn(index, 'pinned', {
                      conductorEnabled:
                        e.target.value === '' ? undefined : e.target.value === 'true',
                    })
                  }
                >
                  <option value="">Player’s choice</option>
                  <option value="true">Pinned on</option>
                  <option value="false">Pinned off</option>
                </select>
              </label>
            </div>

            <div className="row">
              <label className="check">
                <input
                  type="checkbox"
                  checked={advance !== undefined}
                  onChange={(e) =>
                    patchLevel(index, {
                      advance: e.target.checked
                        ? { afterBars: 8, windowBars: 4, accuracyAbove: 0.85 }
                        : undefined,
                    })
                  }
                />
                Own progression rule
              </label>
              {advance && (
                <>
                  <label>
                    After bars
                    <input
                      type="number"
                      value={Number(advance.afterBars ?? 8)}
                      onChange={(e) => patchIn(index, 'advance', { afterBars: Number(e.target.value) })}
                    />
                  </label>
                  <label>
                    Window
                    <input
                      type="number"
                      value={Number(advance.windowBars ?? 4)}
                      onChange={(e) =>
                        patchIn(index, 'advance', { windowBars: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label>
                    Accuracy ≥
                    <input
                      type="number"
                      step="0.05"
                      min="0.1"
                      max="1"
                      value={Number(advance.accuracyAbove ?? 0.85)}
                      onChange={(e) =>
                        patchIn(index, 'advance', { accuracyAbove: Number(e.target.value) })
                      }
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={Boolean(advance.carryEvidence)}
                      onChange={(e) =>
                        patchIn(index, 'advance', {
                          carryEvidence: e.target.checked ? true : undefined,
                        })
                      }
                    />
                    Carry evidence across steps
                  </label>
                </>
              )}
            </div>
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
  .editor { max-width: 60rem; margin: 0 auto; padding: 1rem 1.5rem 4rem; }
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
`;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
