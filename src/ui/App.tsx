import { useCallback, useMemo, useState } from 'react';
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
import { ImportScreen } from './ImportScreen';
import { OutputScreen } from './OutputScreen';
import { PlayScreen } from './PlayScreen';
import { ResultsScreen } from './ResultsScreen';
import { SettingsScreen } from './SettingsScreen';

type Screen = 'settings' | 'play' | 'results' | 'import' | 'outputs';

interface Finished {
  summary: SessionSummary;
  exercise: Exercise;
  stats: NoteStats;
}

export function App() {
  const [chosen, setChosen] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>('settings');
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);

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
  const build = useCallback(
    (seed: number, fifths?: number): Exercise => {
      /*
       * The set as well as the key, and this is where a key tour ends.
       *
       * `fifths` is derived from `keySet[0]` everywhere else in the app, so
       * setting one without the other would leave the generator touring the old
       * set from the new key. Ruled by the player on 2026-08-14: naming your own
       * key ends the tour, because a tour is a sequence and re-entering one
       * partway into a key nobody chose would be the app arguing with the dial.
       */
      const settings = fifths === undefined ? chosen : { ...chosen, fifths, keySet: [fifths] };
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
    [chosen],
  );

  const startNew = useCallback(() => {
    setExercise(build(randomSeed()));
    setScreen('play');
  }, [build]);

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
      setFinished({ summary, exercise, stats });
      setScreen('results');
    },
    [exercise],
  );

  const content = useMemo(() => {
    if (screen === 'play' && exercise) {
      return (
        <PlayScreen
          settings={chosen}
          exercise={exercise}
          onFinish={onFinish}
          onExit={() => setScreen('settings')}
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

    if (screen === 'import') {
      return (
        <ImportScreen
          settings={chosen}
          onPlay={playImported}
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
          onRepeat={repeat}
          onNext={startNew}
          onSettings={() => setScreen('settings')}
        />
      );
    }

    return (
      <SettingsScreen
        settings={chosen}
        onChange={updateSettings}
        onStart={startNew}
        onImport={() => setScreen('import')}
        onOutputs={() => setScreen('outputs')}
      />
    );
  }, [screen, exercise, finished, chosen, onFinish, repeat, startNew, updateSettings, playImported, build]);

  return <div className="app">{content}</div>;
}
