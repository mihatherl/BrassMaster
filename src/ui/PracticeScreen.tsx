/**
 * Where the course has got the player to, and the buttons that move them.
 *
 * Teacher mode's one screen for now (`docs/roadmap.md` § 1.4), reshaped for
 * the ratified stepping ruling of 2026-08-26: **the machine never moves the
 * player.** Position is a decimal — level 3, step 2 reads "3.2" — with
 * forward and back buttons that are the player's in both directions, and the
 * old promotion machinery survives only as a *suggestion bar*: the machine's
 * opinion of readiness, visible beside controls it cannot touch. A player who
 * steps back has decided to, which is the system working.
 *
 * The screen still states its reasoning rather than hiding it. "Two runs at
 * 85% or better and the bar will say move on" is the sentence that makes the
 * mechanism legible — it has simply stopped being a threat.
 *
 * ## Why this screen owns the course, and `App` does not
 *
 * Everything about courses — rules, store, types — is paid, and the free
 * build must not contain it. `App` is in both builds, so it may not import
 * any of it: not the store (which carries the bundle check's fingerprint) and
 * not the rules either. The boundary is drawn here: this screen loads and
 * saves the progress, and `App` is told only what it needs in plain data —
 * the run a level prescribes, and afterwards how it went. Nothing crosses the
 * seam that names a position.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  allCourses,
  BUNDLED_DOCUMENTS,
  COURSES,
  courseById,
  distanceTo,
  levelOf,
  masteryFor,
  noteRun,
  positionLabel,
  progressToward,
  readCourse,
  startOf,
  step,
  stepBack,
  stepForward,
  suggestionOn,
  type Position,
} from '../exercise/course';
import {
  deleteCourseDocument,
  loadCourseDocuments,
  loadProgress,
  saveCourseDocument,
  saveProgress,
} from '../storage/course';
import { loadSessions, meanAccuracy } from '../storage/sessions';
import type { Clef } from '../domain/instruments';
import type { CourseRun } from './course-run';

/**
 * When a sitting was, in the words a player would use.
 *
 * Days rather than dates for the recent past: "yesterday" is what someone
 * would say, and a date makes them work out how long ago that was. Beyond a
 * week the day of the week stops meaning anything, so it becomes a count.
 */
function describeWhen(at: number, now = Date.now()): string {
  const days = Math.floor((now - at) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Earlier today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'Last week';
  return `${Math.floor(days / 7)} weeks ago`;
}

interface PracticeScreenProps {
  instrumentId: string;
  clef: Clef;
  /**
   * How the last course run went, or null. Applied here rather than in `App`
   * because the course is what a result means: `App` knows an accuracy, this
   * knows what the bar should say about it.
   */
  pendingAccuracy: number | null;
  onAccuracyApplied: () => void;
  /** Plain data on purpose — see the note above about the seam. */
  onStart: (run: CourseRun) => void;
  onProgress: () => void;
  /**
   * Inside the unified home since 2026-08-23: the shell owns the masthead and
   * there is nothing above to go back to, so both are the shell's business.
   * Standalone rendering (with its own masthead and a Back) survives for the
   * tests and for any future screen that wants the course whole.
   */
  embedded?: boolean;
  onBack?: () => void;
}

export function PracticeScreen({
  instrumentId,
  clef,
  pendingAccuracy,
  onAccuracyApplied,
  onStart,
  onProgress,
  embedded = false,
  onBack,
}: PracticeScreenProps) {
  const [progress, setProgress] = useState(() => loadProgress(instrumentId, clef));
  /** The import's verdict — the reader's own sentence, shown verbatim. */
  const [importError, setImportError] = useState<string | null>(null);

  // A finished run, folded into the evidence once and then forgotten. It
  // moves nobody — the suggestion below is the whole of its consequence —
  // and it is saved immediately: a session that ends on the results screen
  // has still been practised.
  useEffect(() => {
    if (pendingAccuracy === null) return;
    setProgress((current) => {
      const { progress: next } = noteRun(current, pendingAccuracy);
      saveProgress(instrumentId, clef, next);
      return next;
    });
    onAccuracyApplied();
  }, [pendingAccuracy, instrumentId, clef, onAccuracyApplied]);

  /*
   * What happened last time, which is the whole of § 1.5's requirement:
   * "focusing a bit on what you achieved last time". Read once — a sitting
   * already under way is the one being added to, so the interesting one is
   * always the sitting before this session's first run.
   */
  const [previous] = useState(() => {
    const sessions = loadSessions(instrumentId, clef);
    return sessions[sessions.length - 1];
  });

  const course = courseById(progress.position.courseId);
  const courses = allCourses();

  const chooseCourse = (id: string) => {
    if (id === course.id) return;
    const next = { position: startOf(courseById(id)), recent: [] };
    setProgress(next);
    saveProgress(instrumentId, clef, next);
  };

  /*
   * The import half of the editor loop: the editor saved a file, this reads
   * it — through the same `readCourse`, so the only errors a player can meet
   * here are from files the editor never saw. The reader's sentence shows
   * verbatim; a summarised error would just send them hunting.
   */
  const importCourse = (file: File) => {
    void file.text().then((text) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportError(`${file.name} is not JSON at all.`);
        return;
      }
      const read = readCourse(parsed);
      if ('error' in read) {
        setImportError(read.error);
        return;
      }
      saveCourseDocument(parsed);
      setImportError(null);
      chooseCourse(read.id);
    });
  };

  const exportCourse = () => {
    const doc =
      loadCourseDocuments().find((d) => (d as { id?: unknown })?.id === course.id) ??
      BUNDLED_DOCUMENTS.find((d) => (d as { id?: unknown })?.id === course.id);
    if (!doc) return;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${course.id}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const bundled = COURSES.some((c) => c.id === course.id);
  const removeCourse = () => {
    if (bundled) return;
    deleteCourseDocument(course.id);
    chooseCourse(COURSES[0].id);
  };
  const level = levelOf(progress.position);
  const mastery = masteryFor(progress.position);
  const goal = progress.goal;

  const distance = useMemo(
    () => (goal ? distanceTo(progress.position, goal) : null),
    [goal, progress.position],
  );
  const along = useMemo(
    () =>
      goal && progress.goalSetAt
        ? progressToward(progress.goalSetAt, progress.position, goal)
        : null,
    [goal, progress.goalSetAt, progress.position],
  );

  const move = (direction: 'forward' | 'back') => {
    setProgress((current) => {
      const next = step(current, direction);
      saveProgress(instrumentId, clef, next);
      return next;
    });
  };

  const setGoal = (next: Position | undefined) => {
    setProgress((current) => {
      const updated = next
        ? { ...current, goal: next, goalSetAt: current.position }
        : { position: current.position, recent: current.recent };
      saveProgress(instrumentId, clef, updated);
      return updated;
    });
  };

  /*
   * Only the levels *above* this one are offered: a target already behind the
   * player is not an ambition, and one they are standing on would report
   * itself reached the moment it was set.
   */
  const above = course.levels.slice(
    course.levels.findIndex((candidate) => candidate.id === level.id) + 1,
  );

  const recent = progress.recent.slice(-mastery.runsToJudge);
  const met = recent.filter((accuracy) => accuracy >= mastery.promoteAbove).length;
  const suggestion = suggestionOn(progress.recent, mastery);
  const atTop = stepForward(progress.position) === null;
  const atBottom = stepBack(progress.position) === null;

  const body = (
    <>
      <header className={embedded ? 'practice__head' : 'masthead'}>
        {/* Standalone, the course announces itself; inside the shell the
            masthead above already carries the name, and saying it twice reads
            as a stutter. */}
        {!embedded && <p className="practice__course">{course.name}</p>}
        {embedded ? <h2 className="practice__level">{level.name}</h2> : <h1>{level.name}</h1>}
        {level.note && <p className="practice__note">{level.note}</p>}
      </header>

      <div className="field field-row practice__courses">
        {courses.length > 1 && (
          <select
            aria-label="Course"
            value={course.id}
            onChange={(event) => chooseCourse(event.target.value)}
          >
            {courses.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        )}
        <label className="button button--quiet">
          Import course…
          <input
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importCourse(file);
              event.target.value = '';
            }}
          />
        </label>
        <button type="button" className="button button--quiet" onClick={exportCourse}>
          Export
        </button>
        {!bundled && (
          <button type="button" className="button button--quiet" onClick={removeCourse}>
            Delete
          </button>
        )}
      </div>
      {importError && (
        <p className="practice__note" role="alert">
          The file was refused: {importError}
        </p>
      )}

      {previous && (
        <p className="practice__last">
          {describeWhen(previous.startedAt)}: {previous.runs.length}{' '}
          {previous.runs.length === 1 ? 'run' : 'runs'}, averaging{' '}
          {Math.round((meanAccuracy(previous) ?? 0) * 100)}%.
        </p>
      )}

      <section className="panel">
        <h2>Where you are</h2>
        <p className="practice__tempo">
          <strong>{positionLabel(progress.position)}</strong> ·{' '}
          {progress.position.tempo} bpm
        </p>
        {/* The player's buttons, both directions, per the ratified stepping
            ruling. Disabled at the ends rather than hidden, so the edge of
            the course is visible rather than a button that vanished. */}
        <div className="field field-row">
          <button
            type="button"
            className="button"
            disabled={atBottom}
            onClick={() => move('back')}
          >
            Back a step
          </button>
          <button
            type="button"
            className="button"
            disabled={atTop}
            onClick={() => move('forward')}
          >
            Forward a step
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>The suggestion</h2>
        <ul className="practice__runs">
          {Array.from({ length: mastery.runsToJudge }, (_, index) => {
            const accuracy = recent[recent.length - mastery.runsToJudge + index];
            const cleared = accuracy !== undefined && accuracy >= mastery.promoteAbove;
            return (
              <li key={index} className={`practice__run ${cleared ? 'is-met' : ''}`}>
                {accuracy === undefined ? '–' : `${Math.round(accuracy * 100)}%`}
              </li>
            );
          })}
        </ul>
        {/* The machine's opinion, moving nothing. It says so, because a coach
            whose advice might be an order is not advice. */}
        <p className="practice__note">
          {suggestion === 'up'
            ? 'On this evidence: ready to move on. The step is yours to take.'
            : suggestion === 'down'
              ? 'On this evidence: this step is a struggle. Easing back is no failure.'
              : `${met} of ${mastery.runsToJudge} runs at ${Math.round(
                  mastery.promoteAbove * 100,
                )}% or better. Clear them all and the bar will suggest moving on.`}
        </p>
      </section>

      <section className="panel">
        <h2>Aiming for</h2>
        {goal && distance ? (
          <>
            <p className="practice__note">
              {distance.reached
                ? `Reached — ${levelOf(goal).name} at ${goal.tempo}.`
                : `${levelOf(goal).name} at ${goal.tempo}, ${distance.steps} ${
                    distance.steps === 1 ? 'step' : 'steps'
                  } away.`}
            </p>
            {along !== null && (
              <div
                className="practice__bar"
                role="progressbar"
                aria-valuenow={Math.round(along * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${Math.round(along * 100)}%` }} />
              </div>
            )}
            <button type="button" className="button" onClick={() => setGoal(undefined)}>
              Clear it
            </button>
          </>
        ) : above.length === 0 ? (
          <p className="practice__note">Nothing further up this course to aim at.</p>
        ) : (
          <>
            <p className="practice__note">Nothing set. Pick somewhere to head for.</p>
            <div className="segmented segmented--wrap">
              {above.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className="segmented__option"
                  onClick={() =>
                    setGoal({
                      courseId: course.id,
                      levelId: candidate.id,
                      tempo: candidate.tempo.floor,
                    })
                  }
                >
                  {candidate.name}
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      <button
        type="button"
        className="button button--primary button--large"
        onClick={() =>
          onStart({
            ...level.base,
            tempo: progress.position.tempo,
            levelId: level.id,
          })
        }
      >
        Start
      </button>
      <button type="button" className="entry practice__door" onClick={onProgress}>
        <span className="entry__title">Progress</span>
        <span className="entry__detail">What has improved, and what to work on</span>
      </button>

      {!embedded && onBack && (
        <button type="button" className="button button--quiet" onClick={onBack}>
          Back
        </button>
      )}
    </>
  );

  return embedded ? <div className="practice-embedded">{body}</div> : <div className="screen">{body}</div>;
}
