import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { instrumentById } from '../domain/instruments';
import { difficultyById } from '../exercise/difficulty';
import { metreFor } from '../domain/metre';
import { defaultLengthFor, generateExercise, HORIZON_BARS } from '../exercise/generate';
import { collectionOf } from '../exercise/collections';
import { canRekeyKind } from '../exercise/rekey';
import { randomSeed } from '../exercise/rng';
import type { Exercise } from '../exercise/types';
import { wasAttempted, type SessionSummary } from '../engine/judge';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';
import { audioRouteCapability, outputForRoute, routeDeviceName } from '../platform/audio-route';
import {
  loadStats,
  mergeSessionStats,
  noteWeights,
  saveStats,
  type NoteStats,
} from '../storage/stats';
import { attributesFor } from '../exercise/attributes';
import { recordSkills, tallySession } from '../storage/skills';
import { OutputScreen } from './OutputScreen';
import { PlayScreen } from './PlayScreen';
import { ResultsScreen } from './ResultsScreen';
import { SettingsScreen } from './SettingsScreen';
import { recordRun } from '../storage/sessions';
import { PracticeScreen } from './PracticeScreen';
import { setLocale } from '../i18n';
import {
  courseKeyOf,
  isMinorRun,
  keyAnswerChanged,
  runShapeOf,
  type CourseRun,
  type RunShape,
} from './course-run';
import { ProgressScreen } from './ProgressScreen';

/**
 * My Music, in the build that has it.
 *
 * The dynamic import is what makes the paid feature genuinely absent rather
 * than merely unreachable: `__HAS_MY_MUSIC__` is a literal by the time Rollup
 * sees it, so in the web build this whole expression is `false ? … : null`,
 * the `import()` inside it is dead, and `ImportScreen` is dropped along with
 * everything only it reaches — `import/`'s parser and `storage/pieces.ts`.
 *
 * Both halves of that are load-bearing and both have been got wrong once. A
 * *static* import would keep the code whatever the flag said; and reading the
 * flag through an imported constant rather than the injected literal left the
 * chunk in the build, because the substitution happens per use site and does
 * not cross a module boundary. Neither showed on screen — the app behaved
 * correctly and shipped the code anyway. Check the bundle, do not assume:
 * `npm run check:web` is what proves it, and CI runs it every deploy.
 */
const ImportScreen = __HAS_MY_MUSIC__
  ? lazy(() => import('./ImportScreen').then((m) => ({ default: m.ImportScreen })))
  : null;

/**
 * The course's play-screen presence, absent from the free build the same way:
 * it imports the course rules and the fingerprinted store, so it is reached
 * only through this dynamic import behind the literal, and Rollup drops it —
 * and everything only it reaches — from the web bundle. `npm run check:web`
 * proves that on every deploy; see `CoursePlayControls` for what it does.
 */
const CoursePlayControls = __HAS_TEACHER__
  ? lazy(() => import('./CoursePlayControls').then((m) => ({ default: m.CoursePlayControls })))
  : null;


type Screen = 'progress' | 'settings' | 'play' | 'results' | 'import' | 'outputs';

interface Finished {
  summary: SessionSummary;
  exercise: Exercise;
  /**
   * The stats this run *would* leave behind — merged for the chart, not yet
   * saved. Nothing is written until the player leaves the results screen; see
   * `commit`.
   */
  stats: NoteStats;
  /** What the run was played at, captured here because the commit is late. */
  runAt: { tempo: number; levelId?: string };
  fromCourse: boolean;
  /** False when nobody played: see `wasAttempted`. Such a run is never filed. */
  attempted: boolean;
}

export function App() {
  const [chosen, setChosen] = useState<Settings>(loadSettings);
  // Before any child renders: t() reads a module variable, and every locale
  // change is a settings change, which re-renders this whole tree anyway.
  setLocale(chosen.locale);
  // One home since 2026-08-23: the interstitial with two doors is gone, and
  // which side shows is `settings.homeMode`, remembered across launches.
  const [screen, setScreen] = useState<Screen>('settings');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  /*
   * Whether the run in hand came from the course, and how it went.
   *
   * Plain booleans and a number rather than a rung: everything about the ladder
   * is paid, and `App` is in both builds — see the note at the top of
   * `PracticeScreen`, which owns the course and decides what a result means.
   */
  const [fromCourse, setFromCourse] = useState(false);
  /*
   * What the run in hand was actually played at.
   *
   * Not `chosen.tempo`: a course's run is built at its rung's tempo, and
   * filing it under the settings' tempo would put a whole evening's practice in
   * the wrong band of every report drawn from it.
   */
  const [runAt, setRunAt] = useState<{ tempo: number; levelId?: string }>({
    tempo: chosen.tempo,
  });
  const [courseAccuracy, setCourseAccuracy] = useState<number | null>(null);
  /**
   * The run the course prescribed, kept only for what the play screen needs
   * to know in plain words: which gate options the course pinned. Plain data,
   * like everything of the course's that `App` may hold.
   */
  const [courseRun, setCourseRun] = useState<CourseRun | null>(null);
  /**
   * Whether the finished run should be filed when the player leaves.
   *
   * Starts true and the player may turn it off — "I wasn't really playing".
   * A run that `wasAttempted` already rejected is never filed whatever this
   * says, because there is nothing in it to file.
   */
  const [counted, setCounted] = useState(true);
  /** The run already filed, by identity, so no exit can file one twice. */
  const committedRef = useRef<Finished | null>(null);

  /**
   * The exercise the settings describe, from a seed — and optionally in a key
   * other than the one they name.
   *
   * The override is what the play screen's key dial is built on: the same
   * settings, the same length, a different key. It goes here rather than in the
   * dial because writing music is the generator's business and what the
   * generator wants is the settings, which this owns and the play screen only
   * has a copy of.
   */
  const buildFrom = useCallback(
    (chosenSettings: Settings, seed: number, fifths?: number, shape?: RunShape): Exercise => {
      /*
       * The set as well as the key, and this is where a key tour ends.
       *
       * `fifths` is derived from `keySet[0]` everywhere else in the app, so
       * setting one without the other would leave the generator touring the old
       * set from the new key. Ruled by the player on 2026-08-14: naming your own
       * key ends the tour, because a tour is a sequence and re-entering one
       * partway into a key nobody chose would be the app arguing with the dial.
       */
      const settings =
        fifths === undefined ? chosenSettings : { ...chosenSettings, fifths, keySet: [fifths] };
      const instrument = instrumentById(settings.instrumentId);
      // Weak-note weighting reads the same stats the results screen shows, so
      // what the app says needs work is exactly what it then serves up.
      const weights = settings.weakNoteDrilling
        ? noteWeights(loadStats(settings.instrumentId, settings.clef))
        : undefined;

      /*
       * The material's own default, which a course level may override — see
       * `LevelBase`. Free play has no length control, so `shape` is absent
       * there and this is the whole answer, as it always was.
       */
      const length = defaultLengthFor(settings.kind, settings.drillId);
      const courseCollections = shape?.themeSteps
        ? [...new Set(shape.themeSteps.map((step) => collectionOf(step.id)?.id).filter(
            (id): id is string => id !== undefined,
          ))]
        : undefined;
      return generateExercise({
        instrument,
        clef: settings.clef,
        fifths: settings.fifths,
        keySet: settings.keySet,
        difficulty: difficultyById(settings.difficultyId),
        kind: settings.kind,
        drillId: settings.drillId,
        bars: shape?.bars ?? length.bars,
        themeCount: shape?.themeCount ?? length.themeCount,
        /*
         * A named tune brings its own collection (2026-08-30).
         *
         * `themesOf` draws only from the collections listed, and a playlist
         * step outside them is filtered away — so a course naming a Bach
         * invention would play nothing at all for a player who happens not
         * to have Bach selected in free play. The author's choice must not
         * depend on the player's unrelated setting.
         */
        collectionIds: courseCollections ?? settings.collectionIds,
        /*
         * A course's named tune beats the player's own playlist (2026-08-30).
         * The author chose this tune in this key for this segment; the
         * player's list is a free-play preference and is left untouched in
         * their settings, not overwritten.
         */
        themeSteps: shape?.themeSteps ?? settings.themeSteps,
        selection: shape?.themeSteps ? 'defined' : settings.selection,
        rhythmPatternId: settings.rhythmPatternId,
        cycles: shape?.cycles ?? length.cycles,
        register: settings.register,
        range: settings.range ?? undefined,
        metre: metreFor(settings.beatsPerBar, settings.beatUnit),
        seed,
        tempo: settings.tempo,
        variableTempo: settings.variableTempo,
        /*
         * The paper past the committed end, which is what lets a run carry on
         * rather than stopping where the music does. Generated always: it was
         * the paid tier's one lever when the split was a runtime flag, and the
         * split is now between two builds, both of which offer it.
         */
        horizonBars: shape?.horizonBars ?? HORIZON_BARS,
        noteWeights: weights,
        /* A course's generator knobs that are not settings — the span and
           intervals axes ride `RunShape` in, like the lengths above. */
        spanSemitones: shape?.spanSemitones,
        intervals: shape?.intervals,
      });
    },
    [],
  );

  /** The player's own settings, which is what free play plays. */
  const build = useCallback(
    (seed: number, fifths?: number): Exercise => buildFrom(chosen, seed, fifths),
    [buildFrom, chosen],
  );

  const startNew = useCallback(() => {
    setCourseRun(null);
    setFromCourse(false);
    setRunAt({ tempo: chosen.tempo });
    setExercise(build(randomSeed()));
    setScreen('play');
  }, [build, chosen.tempo]);

  /*
   * A course's run, built from the rung rather than from the settings screen.
   *
   * The override is applied to this exercise and **never saved**: a step of a
   * scales course at 60 must not quietly reset a tempo the player settled on
   * for themselves. See *A course chooses the settings* in `v2-design.md`.
   */
  /**
   * The settings a course run is generated from: the player's, with the
   * level's overrides on top, and the key decided by whoever owns it.
   *
   * One function because there are now three callers — starting a run,
   * stepping to the next level mid-stream, and rebuilding when the player
   * answers the key at the gate — and the two that existed had already
   * drifted into a copy with a comment saying "exactly as startCourse uses
   * it". A third copy would have been the one that fell behind.
   *
   * **The key is one key, never a set.** Where the level names one it
   * replaces the set as well, because `fifths` is derived from `keySet[0]`
   * everywhere else and a course level in F must not leave the generator
   * touring the player's own set from F. Where the level names none the
   * player's course key stands — also alone, ruled 2026-08-29: "the player's
   * own key" is singular, and inheriting free play's tour would have a level
   * changing key mid-run because of a setting made on another screen.
   */
  const runSettings = useCallback(
    (run: CourseRun, from: Settings): Settings => {
      const key = courseKeyOf(run, from);
      /*
       * Explicit field by field, not a spread of the run: a `CourseRun` now
       * carries words that are not settings (`spanSemitones`, `intervals`
       * ride `RunShape` into the generator instead), and a spread would put
       * a course's decisions where a player's preferences live the moment
       * the two shapes drifted. Absent means the player's own stands —
       * including the tempo, since a level may now leave it to the dial.
       */
      return {
        ...from,
        kind: run.kind,
        /* Absent means the course said nothing, so the player's own stands —
           the same rule the tempo and the key already follow. */
        ...(run.difficultyId !== undefined ? { difficultyId: run.difficultyId } : {}),
        ...(run.drillId !== undefined ? { drillId: run.drillId } : {}),
        ...(run.register !== undefined ? { register: run.register } : {}),
        ...(run.tempo !== undefined ? { tempo: run.tempo } : {}),
        ...(run.range !== undefined ? { range: run.range } : {}),
        ...(run.metre !== undefined
          ? { beatsPerBar: run.metre[0], beatUnit: run.metre[1] }
          : {}),
        ...(run.metronomeEnabled !== undefined ? { metronomeEnabled: run.metronomeEnabled } : {}),
        ...(run.conductorEnabled !== undefined ? { conductorEnabled: run.conductorEnabled } : {}),
        ...(run.fingerings !== undefined ? { fingerings: run.fingerings } : {}),
        ...(run.playbackMode !== undefined ? { playbackMode: run.playbackMode } : {}),
        ...(run.readingMode !== undefined ? { readingMode: run.readingMode } : {}),
        fifths: key,
        keySet: [key],
      };
    },
    [],
  );

  const startCourse = useCallback(
    (run: CourseRun) => {
      const { levelId } = run;
      setCourseRun(run);
      setFromCourse(true);
      // The tempo the run is filed under is the tempo that will drive the
      // clock: the course's where it set one, the player's dial where the
      // level left it to them.
      setRunAt({ tempo: run.tempo ?? chosen.tempo, levelId });
      setExercise(buildFrom(runSettings(run, chosen), randomSeed(), undefined, runShapeOf(run)));
      setScreen('play');
    },
    [buildFrom, chosen, runSettings],
  );

  const repeat = useCallback(() => {
    /*
     * Imported music is not regenerated. `build` makes an exercise from the
     * settings and a seed, which is the whole story for generated material and
     * none of it for a part that came out of a file — asking for it again would
     * hand back a random exercise wearing the same seed.
     */
    if (finished && finished.exercise.kind === 'imported') setExercise(finished.exercise);
    else if (finished) setExercise(build(finished.exercise.seed));
    setScreen('play');
  }, [build, finished]);

  const playImported = useCallback((imported: Exercise) => {
    setExercise(imported);
    setScreen('play');
  }, []);

  const updateSettings = useCallback((next: Settings) => {
    setChosen(next);
    saveSettings(next);
  }, []);

  /*
   * The audio route, where the shell provides it (roadmap 4.2). One
   * subscription for the app's lifetime doing the capability's two jobs:
   * remembering the current external device's name so the outputs screen can
   * prefill it, and switching the calibration profile when the route changes
   * — a stored output that names this hardware is chosen, the handset's bare
   * route falls back to the device speaker's own entry, and an unknown
   * device changes nothing, because switching to a profile that does not
   * exist would be inventing a measurement.
   *
   * `chosenRef` rather than a dependency on `chosen`: the listener must read
   * the settings in force *when the route changes*, and resubscribing to the
   * OS on every settings write would be churn with a failure mode (a change
   * arriving between teardown and resubscribe is simply lost).
   *
   * Mid-run, the switch lands in the store and takes effect at the next
   * gate: nothing in the engine re-reads the output during a run, which is
   * honest — the run is judged under the calibration it started with.
   */
  const chosenRef = useRef(chosen);
  chosenRef.current = chosen;
  const [routeName, setRouteName] = useState<string | null>(null);
  useEffect(() => {
    const route = audioRouteCapability();
    if (!route) return;
    let disposed = false;
    const apply = (snapshot: Parameters<typeof routeDeviceName>[0]) => {
      if (disposed) return;
      setRouteName(routeDeviceName(snapshot));
      const current = chosenRef.current;
      const id = outputForRoute(snapshot, current.audioOutputs);
      if (id !== null && id !== current.audioOutputId) {
        updateSettings({ ...current, audioOutputId: id });
      }
    };
    /* The initial read syncs too, not only changes: an app *opened* with the
       headphones already on has missed every event there will ever be. */
    void route.outputs().then(apply);
    const off = route.onChange(apply);
    return () => {
      disposed = true;
      off();
    };
  }, [updateSettings]);

  /**
   * Files the run, and is called on the way *out* of the results screen.
   *
   * **Why so late.** The player may disown a run — they stopped half way, they
   * were showing someone the app, they played it through a speaker — and there
   * is no way to take one back once it is filed: `mergeSessionStats` and
   * `mergeSessionSkills` fold a run into a decayed aggregate, and no inverse
   * exists. Recording and then undoing is unimplementable, so the run waits in
   * `finished` and is committed once, when the player leaves.
   *
   * The cost is that a run dies if the app is killed on the results screen.
   * That is the right side of the bargain and the same one this app keeps
   * elsewhere: the screen going dark ends a run because *nothing is judged
   * unseen*, and losing an occasional record is far cheaper than filing one
   * that is not true.
   */
  const commit = useCallback((run: Finished) => {
    const { summary, exercise: ex, stats, runAt: at, fromCourse: viaCourse } = run;
    saveStats(ex.instrumentId, ex.clef, stats);
    /*
     * The same verdicts, tallied a second way: against what made each note
     * hard rather than against which note it was. Nothing reads this yet —
     * teacher mode will — but it is recorded from now so that a player who
     * reaches that feature arrives with a history rather than starting blank.
     *
     * Recorded in every build, not only the paid one. It is a store, not the
     * feature: what is sold is the coach that reads it, and keeping one code
     * path here is worth more than withholding a few kilobytes of tally.
     */
    recordSkills(
      ex.instrumentId,
      ex.clef,
      tallySession(attributesFor(ex, at.tempo), summary.judgements),
    );
    if (viaCourse) setCourseAccuracy(summary.accuracy);
    /*
     * The sitting's record, and the one place free play and the course meet.
     *
     * Every run is filed, not only a course's: a report that quietly omitted
     * half of someone's practice would be worse than no report. Guarded by
     * the literal so the whole store leaves the free build, which has nothing
     * to read it with — checked by `npm run check:web`, not assumed.
     */
    if (__HAS_TEACHER__) {
      recordRun(ex.instrumentId, ex.clef, {
        at: Date.now(),
        accuracy: summary.accuracy,
        ...at,
      });
    }
  }, []);

  /**
   * Leaves the results screen, filing the run unless it was disowned.
   *
   * `finished` is deliberately *not* cleared: `repeat` rebuilds from the
   * exercise held there, and a results screen that erased its own subject on
   * the way out would break the one button most likely to be pressed. The
   * guard is identity instead — each finish makes a new object, and the ref
   * remembers which one has already been filed, so no exit can file twice.
   */
  const leaveResults = useCallback(() => {
    if (!finished || committedRef.current === finished) return;
    committedRef.current = finished;
    if (counted && finished.attempted) commit(finished);
  }, [commit, counted, finished]);

  const onFinish = useCallback(
    (summary: SessionSummary) => {
      if (!exercise) return;
      /*
       * Merged for the weak-note chart, deliberately not saved: the chart shows
       * what this run *would* leave behind, which is what it always showed, and
       * `commit` writes exactly this map if the run is kept.
       */
      const stats = mergeSessionStats(
        loadStats(exercise.instrumentId, exercise.clef),
        summary.byNote,
      );
      setFinished({
        summary,
        exercise,
        stats,
        runAt,
        fromCourse,
        attempted: wasAttempted(summary),
      });
      setCounted(true);
      setScreen('results');
    },
    [exercise, fromCourse, runAt],
  );

  const content = useMemo(() => {
    if (screen === 'play' && exercise) {
      return (
        <PlayScreen
          settings={chosen}
          exercise={exercise}
          onFinish={onFinish}
          onExit={() => setScreen('settings')}
          /*
           * Ready-screen edits. Settings persist as they always did; the two
           * that feed generation — tempo and variable tempo — regenerate the
           * exercise with its own seed, so the music stays the music and only
           * its marking changes. Never for an import (no generator behind it)
           * and never for a course run, whose exercise the course built.
           * runAt follows the tempo so the skill tally records what was
           * actually played.
           *
           * **One exception, and it is the course's own instruction.** A level
           * that names no key delegates the key to the player, and from
           * 2026-08-29 the gate is where they answer. Recording that answer
           * without rebuilding would be the precise failure `course-plan.md`
           * forbids — *a field the app quietly ignores is worse than an absent
           * one*: the player would pick B flat, be told they were in B flat,
           * and read the music the course had already generated in E flat. So
           * a key change on an open-key course level regenerates, with a fresh
           * seed because it is different music, not the same music re-marked.
           * A level that names its key has nothing to answer and never gets
           * here — the control is locked.
           */
          onSettings={(next) => {
            const keyChanged =
              fromCourse && courseRun !== null && keyAnswerChanged(courseRun, chosen, next);
            updateSettings(next);
            setRunAt((at) => ({ ...at, tempo: next.tempo }));
            if (exercise && exercise.kind !== 'imported' && !fromCourse) {
              setExercise(buildFrom(next, exercise.seed));
            } else if (keyChanged && courseRun) {
              setExercise(
                buildFrom(runSettings(courseRun, next), randomSeed(), undefined, runShapeOf(courseRun)),
              );
            }
          }}
          /* Leaving mid-run for the calibration screen unmounts the play
             surface exactly as Exit does, so the session is stopped the same
             way; Back from there lands on Settings, which is where every
             other door out of a run already leads. */
          onOutputs={() => setScreen('outputs')}
          /* "Accept current offset": the output in use is settled at the lead
             it already has, which counts as having been measured and stops the
             warning returning. See `AudioOutput.calibrations`. */
          /* The course on the play surface: injected behind the literal so
             the free build carries none of it, replacing the tempo dial —
             the course owns the tempo, it is the axis. */
          courseControls={
            __HAS_TEACHER__ && fromCourse && CoursePlayControls
              ? (state) => (
                  <Suspense fallback={null}>
                    <CoursePlayControls
                      instrumentId={chosen.instrumentId}
                      clef={chosen.clef}
                      {...state}
                      /* The generator on loan, on exactly the settings
                         `startCourse` built from — see `runSettings`. */
                      buildRun={(run: CourseRun) =>
                        buildFrom(runSettings(run, chosen), randomSeed(), undefined, runShapeOf(run))
                      }
                      /* The crossing writes the segment's run back, so the
                         gate, the pins and the tempo below track where the
                         player actually is — not where the level began. */
                      onRunCommitted={(run: CourseRun) => setCourseRun(run)}
                    />
                  </Suspense>
                )
              : undefined
          }
          coursePinned={
            fromCourse && courseRun
              ? /* Whatever the course decided — in the header or on an axis —
                   shows locked; whatever it left absent stays the player's.
                   The tempo earned its place in this list conditionally on
                   2026-08-29, exactly as the axes plan promised: a level may
                   now leave it out, and then the dial is live. */
                (
                  [
                    'tempo',
                    'metronomeEnabled',
                    'conductorEnabled',
                    'fingerings',
                    'playbackMode',
                    'readingMode',
                  ] as const
                ).filter((key) => courseRun[key] !== undefined)
              : undefined
          }
          /* The course's tempo, driving the clock rather than free play's.
             Not written into settings: see `PlayScreen`'s note. */
          runTempo={fromCourse && courseRun ? courseRun.tempo : undefined}
          /* The support settings the course owns — pinned or on an axis —
             on the same not-into-settings doctrine. Tracks the committed
             segment via `onRunCommitted` above. */
          runSupport={
            fromCourse && courseRun
              ? {
                  ...(courseRun.metronomeEnabled !== undefined
                    ? { metronomeEnabled: courseRun.metronomeEnabled }
                    : {}),
                  ...(courseRun.conductorEnabled !== undefined
                    ? { conductorEnabled: courseRun.conductorEnabled }
                    : {}),
                  ...(courseRun.fingerings !== undefined
                    ? { fingerings: courseRun.fingerings }
                    : {}),
                  ...(courseRun.playbackMode !== undefined
                    ? { playbackMode: courseRun.playbackMode }
                    : {}),
                  ...(courseRun.readingMode !== undefined
                    ? { readingMode: courseRun.readingMode }
                    : {}),
                }
              : undefined
          }
          /*
           * The key, and who chose it — a course run only. Free play has the
           * grid on its home screen and does not need telling.
           *
           * `minor` comes from the drill the *run* is playing, not from the
           * player's settings: the signature is the same number either way
           * and only its name changes, so a minor level must say "D minor"
           * where a major one says "F major" over the identical `fifths`.
           */
          keyGate={
            fromCourse && courseRun
              ? {
                  fifths: courseKeyOf(courseRun, chosen),
                  setByCourse: courseRun.fifths !== undefined,
                  minor: isMinorRun(courseRun),
                  onChoose: (fifths) => updateSettings({ ...chosen, courseFifths: fifths }),
                }
              : undefined
          }
          onAcceptOutput={() =>
            updateSettings({
              ...chosen,
              audioOutputs: chosen.audioOutputs.map((output) =>
                output.id === chosen.audioOutputId
                  ? { ...output, calibrations: output.calibrations + 1 }
                  : output,
              ),
            })
          }
          /* A tempo settled on while playing is the tempo to open with next
             time — written back once the run is over, never during it. */
          onTempoSettled={(tempo) => updateSettings({ ...chosen, tempo })}
          /*
           * The key dial, where the music can be rewritten to answer it.
           *
           * `canRekeyKind` is about the material: a scale's length falls out of
           * how many cycles fit and a stitched theme's out of which tunes were
           * chosen, so in those a change of key is a change of the length of
           * the paper. Imported music has no generator behind it at all —
           * `build` makes an exercise from the settings and a seed, which is
           * the whole story for generated material and none of it for a part
           * that came out of a file.
           *
           * A fresh seed each time, deliberately: a new key played to the same
           * random walk would be the same exercise transposed, which is not
           * what a player turning to a new key is asking to practise.
           *
           * And not for a defined run. Its steps each name their key, chosen
           * in the picker from the ones the tune actually fits — a dial that
           * offers every key would offer placements that do not exist, and
           * rewriting the set underneath the steps would sanitise them away.
           * The absence of the dial is the same statement the absence of the
           * time-signature control makes for a collection: the material has
           * already answered.
           */
          inKey={
            canRekeyKind(exercise.kind) &&
            !(
              chosen.kind === 'themes' &&
              chosen.selection === 'defined' &&
              chosen.collectionIds.length > 0
            )
              ? (fifths) => build(randomSeed(), fifths)
              : undefined
          }
          /*
           * And the key they settled in, the same way — as the set, not just the
           * opening key. `sanitise` derives `fifths` from `keySet[0]` when
           * settings are next loaded, so writing one without the other would
           * quietly hand the dialled key back on the next launch.
           */
          onKeySettled={(fifths) => updateSettings({ ...chosen, fifths, keySet: [fifths] })}
        />
      );
    }

    if (screen === 'outputs') {
      return (
        <OutputScreen
          settings={chosen}
          onChange={updateSettings}
          onBack={() => setScreen('settings')}
          routeName={routeName}
        />
      );
    }

    if (screen === 'import' && ImportScreen) {
      return (
        /* A local chunk the service worker has already precached, so the
           fallback is a frame at most — but React requires one. */
        <Suspense fallback={<div className="screen" />}>
          <ImportScreen
            settings={chosen}
            onPlay={playImported}
            onBack={() => setScreen('settings')}
          />
        </Suspense>
      );
    }

    if (__HAS_TEACHER__ && screen === 'progress') {
      return (
        <ProgressScreen
          instrumentId={chosen.instrumentId}
          clef={chosen.clef}
          onBack={() => setScreen('settings')}
        />
      );
    }

    if (screen === 'results' && finished) {
      return (
        <ResultsScreen
          summary={finished.summary}
          exercise={finished.exercise}
          stats={finished.stats}
          attempted={finished.attempted}
          counted={counted}
          onCounted={setCounted}
          /* Every way out files the run first; see `leaveResults`. */
          onRepeat={() => {
            leaveResults();
            repeat();
          }}
          onNext={() => {
            leaveResults();
            startNew();
          }}
          onSettings={() => {
            leaveResults();
            setScreen('settings');
          }}
        />
      );
    }

    return (
      <SettingsScreen
        settings={chosen}
        onChange={updateSettings}
        onStart={startNew}
        /* Absent rather than disabled in the free build: a door to a screen
           that build has not got is not a door. */
        onImport={__HAS_MY_MUSIC__ ? () => setScreen('import') : undefined}
        mode={__HAS_TEACHER__ ? chosen.homeMode : 'free'}
        onMode={
          __HAS_TEACHER__ ? (homeMode) => updateSettings({ ...chosen, homeMode }) : undefined
        }
        structured={
          __HAS_TEACHER__ ? (
            <PracticeScreen
              embedded
              instrumentId={chosen.instrumentId}
              clef={chosen.clef}
              pendingAccuracy={courseAccuracy}
              onAccuracyApplied={() => setCourseAccuracy(null)}
              onStart={startCourse}
              onProgress={() => setScreen('progress')}
            />
          ) : undefined
        }
      />
    );
    /* `counted` and `leaveResults` are not optional here: without them the
       memo holds the closure from before the player ticked "don't count this",
       and the tick is remembered by the state and ignored by the commit. */
  }, [screen, exercise, finished, chosen, onFinish, repeat, startNew, updateSettings, playImported, build, buildFrom, startCourse, courseAccuracy, fromCourse, courseRun, routeName, counted, leaveResults]);

  return <div className="app">{content}</div>;
}
