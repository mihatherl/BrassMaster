/**
 * The course's presence on the play screen, revised in from the home screen
 * on 2026-08-27 after the player played phase 2 and named the fault: going
 * home to step is a navigation tax on the thing a course does most often.
 *
 * Three jobs, all ruled in `docs/course-plan.md` § *The play-screen loop*:
 *
 * - **The player's buttons, always.** Forward and back restart immediately at
 *   the new step with a bar's count-in (the new run's own), the partial
 *   passage discarded — the key dial's mid-run contract.
 * - **The author's rule, watching.** After `afterBars` bars with accuracy at
 *   or above the bar over the last `windowBars`, the music *pauses* — a
 *   countdown a player mid-phrase could never answer is not an offer — and
 *   the banner counts down to the next step beside **Stay here**, which
 *   resumes exactly where the pause fell.
 * - **The veto is transient.** Stay here disarms the rule at this step for
 *   this sitting and nothing more — "it isn't expensive for the user to
 *   reset it." Arriving at any step, by any means, re-arms it.
 *
 * ## Why this file is paid, and how it stays out of the free build
 *
 * It imports the course rules and the course store — both fingerprinted —
 * so `App` reaches it only through a dynamic import behind the
 * `__HAS_TEACHER__` literal, exactly as `ImportScreen` is reached. What
 * crosses back is a `CourseRun`: plain settings words, no position.
 */

import { useEffect, useRef, useState } from 'react';
import {
  advanceFor,
  levelOf,
  positionLabel,
  prescribedRun,
  step,
  stepBack,
  stepForward,
  type Progress,
} from '../exercise/course';
import { loadProgress, saveProgress } from '../storage/course';
import type { Clef } from '../domain/instruments';
import type { CourseRun } from './course-run';

/**
 * The transient veto: steps stayed-at this sitting. Module scope on purpose —
 * every passage rebuilds this component, and a veto that a rebuild forgot
 * would nag again two bars later; storage would make it permanent, and the
 * ruling says it is neither: "it isn't expensive for the user to reset it."
 */
const VETOED = new Set<string>();

/** The sitting's vetoes, cleared — a seam for tests, which share the module. */
export function clearVetoes(): void {
  VETOED.clear();
}

function vetoKey(position: { courseId: string; levelId: string; tempo: number }): string {
  return `${position.courseId}:${position.levelId}:${position.tempo}`;
}

/** Seconds the banner counts before the step is taken. */
const COUNTDOWN_SECONDS = 3;

interface CoursePlayControlsProps {
  instrumentId: string;
  clef: Clef;
  /** Accuracy per completed bar of the passage in hand, oldest first. */
  barAccuracies: readonly number[];
  /** Whether the session is running — the rule only watches live play. */
  playing: boolean;
  /** Pause the passage where it stands; the countdown lives in this gap. */
  hold: () => void;
  /** Resume it — the whole of what Stay here does. */
  resume: () => void;
  /** Restart the play screen on a new run. The count-in comes with it. */
  onRun: (run: CourseRun) => void;
}

export function CoursePlayControls({
  instrumentId,
  clef,
  barAccuracies,
  playing,
  hold,
  resume,
  onRun,
}: CoursePlayControlsProps) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(instrumentId, clef));
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const move = (direction: 'forward' | 'back') => {
    clearCountdown();
    const next = step(progress, direction);
    if (next === progress) return;
    setProgress(next);
    saveProgress(instrumentId, clef, next);
    onRun(prescribedRun(next.position));
  };

  const clearCountdown = () => {
    if (timerRef.current !== null) clearInterval(timerRef.current);
    timerRef.current = null;
    setCountdown(null);
  };

  /*
   * The author's rule, evaluated as bars complete. Trigger once per arrival
   * at a step: met → hold the music and start the countdown. The guard order
   * matters — a vetoed step, a step already counting, or a step with nowhere
   * above all decline before the arithmetic runs.
   */
  const advance = advanceFor(progress.position);
  const label = positionLabel(progress.position);
  useEffect(() => {
    if (!playing || countdown !== null) return;
    if (VETOED.has(vetoKey(progress.position))) return;
    if (stepForward(progress.position) === null) return;
    if (barAccuracies.length < advance.afterBars) return;
    const window = barAccuracies.slice(-advance.windowBars);
    if (window.length < advance.windowBars) return;
    if (!window.every((accuracy) => accuracy >= advance.accuracyAbove)) return;
    hold();
    setCountdown(COUNTDOWN_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((current) => (current === null ? null : current - 1));
    }, 1000);
    // The deps are the evidence: each completed bar re-asks the question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barAccuracies, playing]);

  // Zero reached: the step is taken. In an effect rather than the interval
  // callback, because taking it re-renders the world and a timer callback
  // that navigates is a timer callback that races unmount.
  useEffect(() => {
    if (countdown !== 0) return;
    clearCountdown();
    move('forward');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdown]);

  useEffect(() => () => clearCountdown(), []);

  const stay = () => {
    VETOED.add(vetoKey(progress.position));
    clearCountdown();
    resume();
  };

  const next = stepForward(progress.position);
  const level = levelOf(progress.position);

  return (
    <div className="course-play">
      {countdown !== null && next ? (
        /*
         * The banner, in the silence the hold made. Nothing is being judged,
         * so Stay here is pressable with a hand off the valves.
         */
        <div className="course-play__banner" role="alert">
          <p>
            Moving to <strong>{positionLabel(next)}</strong> in {Math.max(countdown, 1)}…
          </p>
          <button type="button" className="button" onClick={stay}>
            Stay here
          </button>
        </div>
      ) : (
        <>
          <p className="course-play__where">
            <strong>{label}</strong> · {level.name}
          </p>
          <div className="course-play__steps">
            <button
              type="button"
              className="button button--quiet"
              disabled={stepBack(progress.position) === null}
              onClick={() => move('back')}
            >
              Back
            </button>
            <button
              type="button"
              className="button button--quiet"
              disabled={next === null}
              onClick={() => move('forward')}
            >
              Forward
            </button>
          </div>
        </>
      )}
    </div>
  );
}
