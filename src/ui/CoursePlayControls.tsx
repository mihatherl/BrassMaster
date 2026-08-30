/**
 * The course's presence on the play screen — and since 2026-08-27's second
 * revision, the join is *written into the music* rather than announced over
 * it. The countdown version was built, played by its author, and rejected
 * the same day: "it just stops mid note… freezes and then resets into
 * another page." What replaced it, ruled in `course-plan.md` § *The join is
 * written into the music*:
 *
 * - **Every step — manual or automatic — lands at the end of the following
 *   bar**, where the score gains a label naming what begins there, exactly
 *   as a medley names its next tune. The music never stops; the player reads
 *   the join coming and plays through it.
 * - **Stay here rewrites the future back**: a second step with no label,
 *   continuing the music the player was already in. The veto stays transient.
 * - **Position commits when the playhead crosses the join.** Until then the
 *   step has not happened, which is precisely why it can still be declined.
 *
 * ## Why this file is paid, and how it stays out of the free build
 *
 * It imports the course rules and the course store — both fingerprinted — so
 * `App` reaches it only through a dynamic import behind the `__HAS_TEACHER__`
 * literal, exactly as `ImportScreen` is reached. What crosses the seam is
 * plain data: bar accuracies and the judged beat inward; settings words and
 * a built exercise outward.
 */

import { useEffect, useRef, useState } from 'react';
import {
  levelOf,
  positionLabel,
  ruleFor,
  runFor,
  step,
  stepBack,
  stepForward,
  type Progress,
} from '../exercise/course';
import { loadProgress, saveProgress } from '../storage/course';
import { isVetoed, vetoStep } from './course-vetoes';
import type { Clef } from '../domain/instruments';
import type { Exercise } from '../exercise/types';
import type { CourseRun } from './course-run';
import { t } from '../i18n';

/** A step in flight: offered or asked for, not yet crossed. */
interface PendingStep {
  from: Progress;
  to: Progress;
  joinBeat: number;
  /** Whether the author's rule scheduled it — a Stay then vetoes the step. */
  auto: boolean;
}

interface CoursePlayControlsProps {
  instrumentId: string;
  clef: Clef;
  /** Accuracy per completed bar of the passage, oldest first. */
  barAccuracies: readonly number[];
  /** Start beat of the furthest note judged — how a crossing is seen. */
  lastJudgedBeat: number;
  /** Whether the music is running — the rule only watches live play. */
  playing: boolean;
  /** Writes a step into the music; null means it could not land. */
  courseStep: (opts: {
    fresh?: Exercise;
    bpm?: number;
    label?: string;
  }) => { changeBeat: number } | null;
  /** Builds the exercise a run prescribes — `App`'s generator, on loan. */
  buildRun: (run: CourseRun) => Exercise;
  /**
   * The playhead crossed a join and the step is real: here is the run the
   * new segment prescribes. `App` writes it back into its own `courseRun` so
   * the gate, the pins and the support values track the segment — without
   * this, everything downstream of Start showed the level as it began.
   */
  onRunCommitted?: (run: CourseRun) => void;
}

/**
 * The fields that shape the paper. A step that changes any of these splices
 * fresh material at the join (`continueFrom`); a step that changes none of
 * them — tempo, or a support setting — leaves the music alone and adjusts
 * the clock or the cushion instead. Level identity is in the list because a
 * new level is new material by definition, whatever its base says.
 */
const MUSIC_FIELDS = [
  'levelId',
  'kind',
  'difficultyId',
  'drillId',
  'fifths',
  'register',
  'bars',
  'cycles',
  /* A different tune is different paper by definition (2026-08-30). */
  'themes',
  'range',
  'spanSemitones',
  'metre',
  'intervals',
  'endless',
] as const;

function musicChanged(a: CourseRun, b: CourseRun): boolean {
  return MUSIC_FIELDS.some((field) => JSON.stringify(a[field]) !== JSON.stringify(b[field]));
}

export function CoursePlayControls({
  instrumentId,
  clef,
  barAccuracies,
  lastJudgedBeat,
  playing,
  courseStep,
  buildRun,
  onRunCommitted,
}: CoursePlayControlsProps) {
  const [progress, setProgress] = useState<Progress>(() => loadProgress(instrumentId, clef));
  const [pending, setPending] = useState<PendingStep | null>(null);
  /**
   * Where this step's evidence begins in the passage's bar history. Moved to
   * the crossing on every committed step — the rule always counts afresh
   * there, found by the player on the day the join shipped: carrying the old
   * bars offered him a new step every two bars, since eight clean bars from
   * the step before still satisfied the rule. The timeline made this
   * unconditional: evidence is about a segment, and the segment just
   * changed. (`carryEvidence`, which used to soften this, is gone — an
   * author whose steps are trivial writes a trivial rule instead.)
   */
  const evidenceFromRef = useRef(0);

  /**
   * Asks the session to write a step into the music.
   *
   * The two runs are compared, not the two levels: a step that changes what
   * the paper says — a new level, but also a key, range or length division
   * inside one — splices fresh material from the bar line; a step that moves
   * only the clock or a support setting continues the music the player is
   * already reading. Either way nothing is saved yet — the step has not
   * happened until the playhead crosses it.
   */
  const schedule = (direction: 'forward' | 'back', auto: boolean) => {
    const to = step(progress, direction);
    if (to === progress) return;
    const from = runFor(progress.position);
    const run = runFor(to.position);
    const sameLevel = to.position.levelId === progress.position.levelId;
    const label = sameLevel
      ? positionLabel(to.position)
      : `${positionLabel(to.position)} · ${levelOf(to.position).name}`;
    const landed = courseStep({
      ...(musicChanged(from, run) ? { fresh: buildRun(run) } : {}),
      ...(run.tempo !== undefined ? { bpm: run.tempo } : {}),
      label,
    });
    if (!landed) return;
    setPending({ from: progress, to, joinBeat: landed.changeBeat, auto });
  };

  /** Stay here: the future rewritten back to the music already in hand. */
  const stay = () => {
    if (!pending) return;
    if (pending.auto) vetoStep(pending.from.position);
    const abandoned = runFor(pending.to.position);
    const run = runFor(pending.from.position);
    courseStep({
      ...(musicChanged(abandoned, run) ? { fresh: buildRun(run) } : {}),
      ...(run.tempo !== undefined ? { bpm: run.tempo } : {}),
    });
    setPending(null);
  };

  // The crossing: the join is behind the playhead, so the step has happened.
  // Committed here — position, cleared evidence, storage, and the run handed
  // back to `App` — and not before, which is what made Stay here free of
  // consequences.
  useEffect(() => {
    if (!pending || lastJudgedBeat < pending.joinBeat - 1e-9) return;
    setProgress(pending.to);
    saveProgress(instrumentId, clef, pending.to);
    evidenceFromRef.current = barAccuracies.length;
    onRunCommitted?.(runFor(pending.to.position));
    setPending(null);
    // barAccuracies is read, not depended on: the crossing is decided by the
    // judged beat, and the length is simply where the new evidence starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastJudgedBeat, pending, instrumentId, clef]);

  /*
   * The author's rule, watching completed bars. It asks only while nothing is
   * pending, only below the top, and never at a vetoed step; met, it
   * schedules the same step a finger would have. The rule is the segment's
   * own — an override where the author placed one, the level default
   * everywhere else — and a rule with no score asks only for time served.
   */
  const rule = ruleFor(progress.position);
  useEffect(() => {
    if (!playing || pending) return;
    if (isVetoed(progress.position)) return;
    if (stepForward(progress.position) === null) return;
    const evidence = barAccuracies.slice(evidenceFromRef.current);
    if (evidence.length < rule.minBars) return;
    if (rule.score) {
      const window = evidence.slice(-rule.score.overBars);
      if (window.length < rule.score.overBars) return;
      if (!window.every((accuracy) => accuracy >= rule.score!.atLeast)) return;
    }
    schedule('forward', true);
    // Each completed bar re-asks; everything else it reads is stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barAccuracies, playing]);

  const level = levelOf(progress.position);

  return (
    <div className="course-play">
      {pending ? (
        <div className="course-play__banner" role="status">
          <p>
            <strong>{positionLabel(pending.to.position)}</strong> {t('course.atTheBar')}
          </p>
          <button type="button" className="button" onClick={stay}>
            {t('course.stayHere')}
          </button>
        </div>
      ) : (
        <>
          <p className="course-play__where">
            <strong>{positionLabel(progress.position)}</strong> · {level.name}
          </p>
          <div className="course-play__steps">
            <button
              type="button"
              className="button button--quiet"
              disabled={stepBack(progress.position) === null}
              onClick={() => schedule('back', false)}
            >
              {t('course.back')}
            </button>
            <button
              type="button"
              className="button button--quiet"
              disabled={stepForward(progress.position) === null}
              onClick={() => schedule('forward', false)}
            >
              {t('course.forward')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
