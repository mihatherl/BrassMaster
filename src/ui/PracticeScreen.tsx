/**
 * Where the course has got the player to, and what happens next.
 *
 * Teacher mode's one screen for now (`docs/roadmap.md` § 1.4). Deliberately
 * small: it shows the rung, the evidence for moving off it, and a goal if one
 * is set. **Arranging a course belongs on the served page of § 5.2** — a
 * keyboard and a whole course in view — so nothing here edits one.
 *
 * The screen states the ladder's reasoning rather than hiding it. A coach that
 * silently moves a player up and down is indistinguishable from an app with a
 * bug in it, and "one more like that and you move up" is the sentence that
 * makes the whole mechanism legible.
 *
 * ## Why this screen owns the course, and `App` does not
 *
 * Everything about the ladder — its rules, its store, its types — is paid, and
 * the free build must not contain it. `App` is in both builds, so it may not
 * import any of it: not the store (which carries the bundle check's
 * fingerprint) and not the rules either, which would leak just as surely while
 * being invisible to the check.
 *
 * So the boundary is drawn here. This screen loads and saves the progress, and
 * `App` is told only what it needs in plain data: a difficulty and a tempo to
 * build a run from, and — afterwards — how that run went. Nothing crosses the
 * seam that names a rung.
 */

import { useEffect, useMemo, useState } from 'react';
import {
  afterRun,
  distanceTo,
  ladderById,
  levelOf,
  masteryFor,
  nextRung,
  progressToward,
  type Rung,
} from '../exercise/ladder';
import { loadProgress, saveProgress } from '../storage/ladder';
import { loadSessions, meanAccuracy } from '../storage/sessions';
import type { Clef } from '../domain/instruments';

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
  /** Where the player practises when no course has spoken yet. */
  fallback: { difficultyId: string; tempo: number };
  /**
   * How the last course run went, or null.
   *
   * Applied here rather than in `App` because the ladder is what a result
   * means: `App` knows an accuracy, this knows whether it moves anyone.
   */
  pendingAccuracy: number | null;
  onAccuracyApplied: () => void;
  /** Plain data on purpose — see the note above about the seam. */
  onStart: (from: { difficultyId: string; tempo: number; levelId: string }) => void;
  onProgress: () => void;
  onBack: () => void;
}

export function PracticeScreen({
  instrumentId,
  clef,
  fallback,
  pendingAccuracy,
  onAccuracyApplied,
  onStart,
  onProgress,
  onBack,
}: PracticeScreenProps) {
  const [progress, setProgress] = useState(() => loadProgress(instrumentId, clef, fallback));

  // A finished run, folded in once and then forgotten. Recorded here so the
  // move happens where the rules are, and saved immediately: a session that
  // ends on the results screen has still been practised.
  useEffect(() => {
    if (pendingAccuracy === null) return;
    setProgress((current) => {
      const { progress: next } = afterRun(current, pendingAccuracy);
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

  const ladder = ladderById(progress.rung.ladderId);
  const level = levelOf(progress.rung);
  const mastery = masteryFor(progress.rung);
  const band = level.tempo;
  const goal = progress.goal;

  const distance = useMemo(
    () => (goal ? distanceTo(progress.rung, goal) : null),
    [goal, progress.rung],
  );
  const along = useMemo(
    () =>
      goal && progress.goalSetAt ? progressToward(progress.goalSetAt, progress.rung, goal) : null,
    [goal, progress.goalSetAt, progress.rung],
  );

  const setGoal = (next: Rung | undefined) => {
    setProgress((current) => {
      const updated = next
        ? { ...current, goal: next, goalSetAt: current.rung }
        : { rung: current.rung, recent: current.recent };
      saveProgress(instrumentId, clef, updated);
      return updated;
    });
  };

  /*
   * Only the levels *above* this one are offered: a target already behind the
   * player is not an ambition, and one they are standing on would report itself
   * reached the moment it was set.
   */
  const above = ladder.levels.slice(
    ladder.levels.findIndex((candidate) => candidate.id === level.id) + 1,
  );

  const recent = progress.recent.slice(-mastery.runsToJudge);
  const met = recent.filter((accuracy) => accuracy >= mastery.promoteAbove).length;
  const atTop = nextRung(progress.rung) === null;

  return (
    <div className="screen">
      <header className="masthead">
        <p className="practice__course">{ladder.name}</p>
        <h1>{level.name}</h1>
      </header>

      {previous && (
        <p className="practice__last">
          {describeWhen(previous.startedAt)}: {previous.runs.length}{' '}
          {previous.runs.length === 1 ? 'run' : 'runs'}, averaging{' '}
          {Math.round((meanAccuracy(previous) ?? 0) * 100)}%.
        </p>
      )}

      <section className="panel">
        <h2>Today</h2>
        <p className="practice__tempo">
          <strong>{progress.rung.tempo}</strong> bpm
        </p>
        <p className="practice__note">
          {band.floor} to {band.ceiling} on this level, in steps of {band.step}
        </p>
      </section>

      <section className="panel">
        <h2>To move on</h2>
        {atTop ? (
          <p className="practice__note">
            The top of {ladder.name}. There is nothing above this one.
          </p>
        ) : (
          <>
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
            <p className="practice__note">
              {met} of {mastery.runsToJudge} at {Math.round(mastery.promoteAbove * 100)}% or better.
              Clear them all and the tempo rises.
            </p>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Aiming for</h2>
        {goal && distance ? (
          <>
            <p className="practice__note">
              {distance.reached
                ? `Reached — ${levelOf(goal).name} at ${goal.tempo}.`
                : `${levelOf(goal).name} at ${goal.tempo}, ${distance.rungs} ${
                    distance.rungs === 1 ? 'step' : 'steps'
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
                      ladderId: ladder.id,
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
        onClick={() => onStart({
            difficultyId: level.difficultyId,
            tempo: progress.rung.tempo,
            levelId: level.id,
          })}
      >
        Start
      </button>
      <button type="button" className="entry practice__door" onClick={onProgress}>
        <span className="entry__title">Progress</span>
        <span className="entry__detail">What has improved, and what to work on</span>
      </button>

      <button type="button" className="button button--quiet" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
