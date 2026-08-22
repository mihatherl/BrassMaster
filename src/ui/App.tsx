import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { instrumentById } from '../domain/instruments';
import { difficultyById } from '../exercise/difficulty';
import { metreFor } from '../domain/metre';
import { defaultLengthFor, generateExercise, HORIZON_BARS } from '../exercise/generate';
import { canRekeyKind } from '../exercise/rekey';
import { randomSeed } from '../exercise/rng';
import type { Exercise } from '../exercise/types';
import type { SessionSummary } from '../engine/judge';
import { loadSettings, saveSettings, type Settings } from '../storage/settings';
import { loadStats, noteWeights, recordSession, type NoteStats } from '../storage/stats';
import { attributesFor } from '../exercise/attributes';
import { recordSkills, tallySession } from '../storage/skills';
import { OutputScreen } from './OutputScreen';
import { PlayScreen } from './PlayScreen';
import { ResultsScreen } from './ResultsScreen';
import { SettingsScreen } from './SettingsScreen';
import { HomeScreen } from './HomeScreen';
import { recordRun } from '../storage/sessions';
import { PracticeScreen } from './PracticeScreen';
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


type Screen = 'home' | 'practice' | 'progress' | 'settings' | 'play' | 'results' | 'import' | 'outputs';

interface Finished {
  summary: SessionSummary;
  exercise: Exercise;
  stats: NoteStats;
}

export function App() {
  const [chosen, setChosen] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>(__HAS_TEACHER__ ? 'home' : 'settings');
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
    (chosenSettings: Settings, seed: number, fifths?: number): Exercise => {
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

    const length = defaultLengthFor(settings.kind, settings.drillId);
      return generateExercise({
        instrument,
        clef: settings.clef,
        fifths: settings.fifths,
        keySet: settings.keySet,
        difficulty: difficultyById(settings.difficultyId),
        kind: settings.kind,
        drillId: settings.drillId,
        bars: length.bars,
        themeCount: length.themeCount,
        collectionIds: settings.collectionIds,
        themeIds: settings.themeIds,
        selection: settings.selection,
        cycles: length.cycles,
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
        horizonBars: HORIZON_BARS,
        noteWeights: weights,
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
  const startCourse = useCallback(
    (from: { difficultyId: string; tempo: number; levelId: string }) => {
      setFromCourse(true);
      setRunAt({ tempo: from.tempo, levelId: from.levelId });
      setExercise(buildFrom({ ...chosen, ...from }, randomSeed()));
      setScreen('play');
    },
    [buildFrom, chosen],
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

  const onFinish = useCallback(
    (summary: SessionSummary) => {
      if (!exercise) return;
      const stats = recordSession(exercise.instrumentId, exercise.clef, summary.byNote);
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
        exercise.instrumentId,
        exercise.clef,
        tallySession(attributesFor(exercise, runAt.tempo), summary.judgements),
      );
      if (fromCourse) setCourseAccuracy(summary.accuracy);
      /*
       * The sitting's record, and the one place free play and the course meet.
       *
       * Every run is filed, not only a course's: a report that quietly omitted
       * half of someone's practice would be worse than no report. Guarded by
       * the literal so the whole store leaves the free build, which has nothing
       * to read it with — checked by `npm run check:web`, not assumed.
       */
      if (__HAS_TEACHER__) {
        recordRun(exercise.instrumentId, exercise.clef, {
          at: Date.now(),
          accuracy: summary.accuracy,
          ...runAt,
        });
      }
      setFinished({ summary, exercise, stats });
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
          /* Leaving mid-run for the calibration screen unmounts the play
             surface exactly as Exit does, so the session is stopped the same
             way; Back from there lands on Settings, which is where every
             other door out of a run already leads. */
          onOutputs={() => setScreen('outputs')}
          /* "Accept current offset": the output in use is settled at the lead
             it already has, which counts as having been measured and stops the
             warning returning. See `AudioOutput.calibrations`. */
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
           */
          inKey={
            canRekeyKind(exercise.kind) ? (fifths) => build(randomSeed(), fifths) : undefined
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

    if (__HAS_TEACHER__ && screen === 'home') {
      return (
        <>
          <HomeScreen
            practising="Follow a course, at the level it has you on"
            onPractice={() => setScreen('practice')}
            onFreePlay={() => setScreen('settings')}
          />
        </>
      );
    }

    if (__HAS_TEACHER__ && screen === 'practice') {
      return (
        <>
          <PracticeScreen
            instrumentId={chosen.instrumentId}
            clef={chosen.clef}
            /* Where a first session opens: what the player already practises,
               rather than the bottom of the ladder. */
            fallback={{ difficultyId: chosen.difficultyId, tempo: chosen.tempo }}
            pendingAccuracy={courseAccuracy}
            onAccuracyApplied={() => setCourseAccuracy(null)}
            onStart={startCourse}
            onProgress={() => setScreen('progress')}
            onBack={() => setScreen('home')}
          />
        </>
      );
    }

    if (__HAS_TEACHER__ && screen === 'progress') {
      return (
        <ProgressScreen
          instrumentId={chosen.instrumentId}
          clef={chosen.clef}
          onBack={() => setScreen('practice')}
        />
      );
    }

    if (screen === 'results' && finished) {
      return (
        <ResultsScreen
          summary={finished.summary}
          exercise={finished.exercise}
          stats={finished.stats}
          onRepeat={repeat}
          onNext={startNew}
          onSettings={() => setScreen(fromCourse ? 'practice' : 'settings')}
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
        onBack={__HAS_TEACHER__ ? () => setScreen('home') : undefined}
        onOutputs={() => setScreen('outputs')}
      />
    );
  }, [screen, exercise, finished, chosen, onFinish, repeat, startNew, updateSettings, playImported, build, startCourse, courseAccuracy, fromCourse]);

  return <div className="app">{content}</div>;
}
