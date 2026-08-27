/**
 * The play surface: notation, the tempo, and the valve buttons.
 *
 * React mounts the canvas and then stays out of the way — the renderer and the
 * session own the animation and audio loops directly. Nothing in the hot path
 * goes through React state, so a re-render can never cost a frame of timing.
 * The score does re-render, but only once a note has been judged, which is well
 * after anything about it was time-critical.
 *
 * A list of the last few notes played used to sit beside the stave. It is gone,
 * on the player's verdict: *you can never pay enough attention to it to see
 * what the fingering was supposed to be.* Nothing read off to the side survives
 * contact with sight-reading, so the answer moved onto the note itself — see
 * `hints.ts` — and the space went to the tempo, which is the control a player
 * actually reaches for mid-practice.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ensureRunning, getAudioContext, markStuck, unlockAudio } from '../audio/context';
import { FollowingVoice } from '../audio/following-voice';
import { Sampler, type Voice } from '../audio/sampler';
import { barAt, changesMetre, metreAt } from '../domain/metre';
import { keyAt } from '../domain/keys';
import { instrumentById } from '../domain/instruments';
import type { Transport } from '../engine/clock';
import { ValveInput } from '../engine/input';
import { REACTIVE_SOUND_MAX_LEAD, Session } from '../engine/session';
import { ReadyControls } from './ReadyControls';
import { fingeringHints, type Hints } from '../exercise/hints';
import { soundingHeads } from '../exercise/ties';
import { loadStats } from '../storage/stats';
import { SCORE_WINDOW_BARS, type NoteJudgement, type SessionSummary, type Verdict } from '../engine/judge';
import { currentTheme, StaveRenderer } from '../render/surface';
import type { Exercise } from '../exercise/types';
import { audioLeadFor, type Settings } from '../storage/settings';
import { patternFor } from '../render/conductor';
import { barLabel } from '../render/system';
import { ConductorPanel } from './ConductorPanel';
import { KeyDial } from './KeyDial';
import { PressButton } from './PressButton';
import { TempoDial } from './TempoDial';
import { ValvePad } from './ValvePad';

interface PlayScreenProps {
  settings: Settings;
  exercise: Exercise;
  onFinish: (summary: SessionSummary) => void;
  onExit: () => void;
  /**
   * The gate's own settings changes — how this run will go, edited on the
   * Ready screen itself (2026-08-23). The owner decides what a change means:
   * tempo and variable tempo feed generation, so the app regenerates the
   * exercise with the same seed — the same music, re-marked — where this
   * screen could only have played the stale one.
   */
  onSettings?: (settings: Settings) => void;
  /**
   * The speed the player settled on, reported when the run ends.
   *
   * Not while it moves: the whole play surface is rebuilt when `settings`
   * changes, so writing the slider back as it slides would restart the exercise
   * under the player's fingers. At the end it is simply the tempo they were
   * last playing at, which is the one they want next time.
   */
  onTempoSettled?: (bpm: number) => void;
  /**
   * The same exercise this run is playing, generated in another key.
   *
   * The whole of what the key dial needs from outside, and the reason it is a
   * function rather than a key: writing music is the generator's business, and
   * what the generator wants is the settings — which this screen has a copy of
   * but is not the owner of. The caller builds it from the real ones.
   *
   * Absent means no dial: imported music cannot be regenerated at all, and the
   * free tier is entitled to one key.
   */
  inKey?: (fifths: number) => Exercise;
  /** The key the player settled on, reported when the run ends, as with tempo. */
  onKeySettled?: (fifths: number) => void;
  /**
   * Opens the outputs screen, where the lead being applied was measured.
   *
   * Here because an invisible lead is a diagnosis trap: the sound is being
   * deliberately sent early for a device the player may no longer be wearing,
   * and nothing on this screen said so — which cost an evening of hunting a
   * "timing bug" that was a headphone profile, twice, once in each direction.
   * The note this enables names the adjustment and links to where it is set;
   * it also happens to be the only signpost to a screen otherwise buried in
   * the advanced menu.
   */
  onOutputs?: () => void;
  /**
   * Records that the player has settled the output in use at the lead it
   * already has — the "accept" answer to the calibration warning.
   *
   * A separate prop rather than a settings write from here, because this
   * screen holds a copy of the settings and does not own them.
   */
  onAcceptOutput?: () => void;
  /**
   * The course's presence on this screen (2026-08-27), injected rather than
   * imported: the course rules and store are paid and fingerprinted, this
   * screen is in both builds, so `App` hands in an element made behind the
   * `__HAS_TEACHER__` literal and this screen knows only plain data — the
   * accuracy of each completed bar, whether the music is running, and a way
   * to hold and resume it for the countdown's gap. Present also means the
   * tempo dial steps aside: the course owns the tempo, it is the axis.
   */
  courseControls?: (state: {
    barAccuracies: readonly number[];
    /** Start beat of the furthest note judged — how the course sees the join crossed. */
    lastJudgedBeat: number;
    playing: boolean;
    /**
     * Writes a step into the music at the end of the following bar — tempo,
     * fresh material, a label, any of them — and reports where the join
     * landed. A call with no label is a revert. See `Session.courseStep`.
     */
    courseStep: (opts: {
      fresh?: Exercise;
      bpm?: number;
      label?: string;
    }) => { changeBeat: number } | null;
  }) => ReactNode;
  /** Gate options the course pinned, shown disabled there. */
  coursePinned?: readonly string[];
}

export function PlayScreen({
  settings,
  exercise,
  onFinish,
  onExit,
  onSettings,
  onTempoSettled,
  inKey,
  onKeySettled,
  onOutputs,
  onAcceptOutput,
  courseControls,
  coursePinned,
}: PlayScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<Session | null>(null);
  /**
   * The buttons, held here rather than inside the session.
   *
   * They are pressed by this screen and read by the session, and the session is
   * written to take *an* input rather than to make this one — so that a
   * microphone can be put in its place without the run knowing. See
   * `engine/player-input.ts`.
   */
  const valvesRef = useRef<ValveInput | null>(null);
  const rendererRef = useRef<StaveRenderer | null>(null);
  const verdictsRef = useRef<Array<Verdict | undefined>>([]);
  const hintsRef = useRef<Hints | null>(null);
  const headsRef = useRef<number[]>([]);

  const [started, setStarted] = useState(false);
  /**
   * Accuracy per *completed* bar of this passage, for the course's rule. A
   * bar is complete once a later bar has been judged — the playhead is past
   * it — and its accuracy counts judged notes only, which is the same honesty
   * the totals keep. Recomputed from the verdicts on every judgement, and
   * cheap at exercise scale.
   */
  const [barAccuracies, setBarAccuracies] = useState<readonly number[]>([]);
  const [lastJudgedBeat, setLastJudgedBeat] = useState(-1);
  /*
   * Both reached from inside the session effect through refs, deliberately:
   * `courseControls` is a render prop whose identity changes with every App
   * render, and putting it in that effect's dependencies would tear the
   * session down mid-run for a re-render that changed nothing audible.
   */
  const courseControlsRef = useRef(courseControls);
  courseControlsRef.current = courseControls;
  const reportBars = () => {
    const { notes, metres } = exercise;
    let inFlight = -1;
    verdictsRef.current.forEach((verdict, index) => {
      if (verdict !== undefined) inFlight = Math.max(inFlight, barAt(metres, notes[index].startBeat));
    });
    const totals: Array<{ total: number; correct: number } | undefined> = [];
    verdictsRef.current.forEach((verdict, index) => {
      if (verdict === undefined) return;
      const bar = barAt(metres, notes[index].startBeat);
      if (bar >= inFlight) return; // the bar under the playhead is not evidence yet
      const entry = (totals[bar] ??= { total: 0, correct: 0 });
      entry.total++;
      if (verdict === 'correct') entry.correct++;
    });
    setBarAccuracies(totals.filter((t) => t !== undefined).map((t) => t!.correct / t!.total));
  };
  const reportBarsRef = useRef(reportBars);
  reportBarsRef.current = reportBars;
  /** Why the gate is being shown again; see the visibility effect below. */
  const [lockStopped, setLockStopped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stalled, setStalled] = useState(false);
  /** Whether the calibration warning is on screen, and whether it has been. */
  const [asking, setAsking] = useState(false);
  const [asked, setAsked] = useState(false);
  /**
   * Which go at starting this is. Bumped by "Try again", so the play surface
   * is torn down and built again against a context that has been replaced —
   * `started` alone would not move, since it is already true.
   */
  const [attempt, setAttempt] = useState(0);
  const [mask, setMask] = useState(0);
  const [progress, setProgress] = useState({ done: 0, accuracy: 0 });
  /**
   * The speed this run is being played at, which the player can move.
   *
   * Deliberately *not* `settings.tempo`: the effect below is keyed on the
   * settings object, so a change there tears the session down and starts the
   * exercise again. This is the run's own tempo, reported back once at the end.
   */
  const [tempo, setTempo] = useState(settings.tempo);
  /**
   * The key the dial is pointing at, which is not the same as the key of the
   * music while a finger is on it.
   *
   * The dial's own state: it moves at every detent so the face and the callout
   * follow the finger, and the music is rewritten only when the finger comes
   * off. Opens on the key the exercise opens in — the settings key, honoured
   * until the dial is touched.
   */
  const [dialKey, setDialKey] = useState(() => keyAt(exercise.keys, 0));
  /** Which bar a change would land in, read off the session while turning. */
  const [changeBar, setChangeBar] = useState<string | null>(null);
  /*
   * State rather than a ref, unlike the session and renderer beside it.
   * Those are only ever reached from callbacks; the conductor is a child that
   * has to be *rendered* with it, and a ref assigned inside the effect would
   * never trigger the render that mounts it.
   */
  const [transport, setTransport] = useState<Transport | null>(null);
  /*
   * The metre the music has reached, for the tempo dial's unit.
   *
   * The dial's number is pulses per minute, so what a pulse *is* decides
   * whether it reads "bpm" or "dotted" — and in a medley that changes at the
   * joins. Polled rather than read per frame: the answer only moves a handful
   * of times in a run, and `metreAt` hands back the very object the list
   * holds, so reference equality keeps React out of it in between. The
   * conductor tracks the same thing the same way.
   */
  const [metreNow, setMetreNow] = useState(() => metreAt(exercise.metres, 0));
  /** Whether the music is about to run out and more may be asked for. */
  const [offering, setOffering] = useState(false);
  /** Whether the run is being held, which is what the second button says. */
  const [paused, setPaused] = useState(false);
  /** How much music this run is committed to, which Continue extends. */
  const [committedBeats, setCommittedBeats] = useState(exercise.chosenBeats);
  // Held across the gate so the session can be handed the loaded voice.
  const voiceRef = useRef<Voice | undefined>(undefined);

  // Kept in refs so the callbacks the session holds never go stale.
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;
  const tempoRef = useRef(tempo);
  tempoRef.current = tempo;
  const settledRef = useRef(onTempoSettled);
  settledRef.current = onTempoSettled;
  const keySettledRef = useRef(onKeySettled);
  keySettledRef.current = onKeySettled;
  const dialKeyRef = useRef(dialKey);
  dialKeyRef.current = dialKey;

  useEffect(() => {
    // Nothing to follow where the music holds one metre, which is most of it.
    if (!transport || !changesMetre(exercise.metres)) return;
    const id = window.setInterval(() => {
      const inForce = metreAt(exercise.metres, transport.visualBeat());
      setMetreNow((was) => (was === inForce ? was : inForce));
    }, 200);
    return () => window.clearInterval(id);
  }, [transport, exercise]);

  /*
   * The screen going dark ends the run (reported from the E32, 2026-08-23):
   * the app judges what is played against a screen being read, so a run with
   * no reader is the metronome marching on while the judge fails every note
   * in the dark. The wake lock keeps the screen from dozing off on its own;
   * this handles the deliberate power button, and app-switching with it.
   *
   * Stopped rather than paused, deliberately. Resuming audio after a lock
   * needs a fresh gesture on most of these platforms anyway, and a player
   * mid-exercise has lost their place the moment the page vanished — the
   * honest offer is the gate, with a line saying why it is being offered.
   * Dropping `started` runs the same teardown as leaving the screen: session
   * stopped, renderer stopped, wake lock released.
   */
  useEffect(() => {
    if (!started) return;
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return;
      setLockStopped(true);
      setStalled(false);
      setStarted(false);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    setOffering(false);
    setPaused(false);
    setCommittedBeats(exercise.chosenBeats);
    verdictsRef.current = new Array(exercise.notes.length).fill(undefined);
    setBarAccuracies([]);
    setLastJudgedBeat(-1);
    /*
     * Which note actually sounds each written one, so the renderer can look a
     * verdict up through a tie. Walked once rather than on every note of every
     * frame — and in a ref rather than a const, because a key change rewrites
     * the note list and its ties with it.
     */
    headsRef.current = soundingHeads(exercise.notes);
    setTempo(settings.tempo);
    /*
     * The key this run opens in, kept for the whole run.
     *
     * Read now rather than at the end, because a key change lands at beat 0
     * when it is asked for during the count-in — which rewrites the opening key
     * itself, and would leave nothing to compare the dial against.
     */
    const openedIn = keyAt(exercise.keys, 0);
    setDialKey(openedIn);

    /*
     * The counter and the live percentage, recomputed from the verdicts.
     *
     * The percentage reads the scoring window rather than the whole run: a bad
     * patch scrolls out of it, which is what makes the figure worth glancing at
     * late in a long session. One pass per note judged, nowhere near a frame —
     * and the same pass after a rewind, which takes verdicts away again.
     */
    const report = () => {
      const { metres, notes } = exercise;
      let done = 0;
      let lastBar = 0;
      verdictsRef.current.forEach((verdict, index) => {
        if (!verdict) return;
        done++;
        lastBar = Math.max(lastBar, barAt(metres, notes[index].startBeat));
      });
      let inWindow = 0;
      let correct = 0;
      verdictsRef.current.forEach((verdict, index) => {
        if (!verdict) return;
        if (barAt(metres, notes[index].startBeat) <= lastBar - SCORE_WINDOW_BARS) return;
        inWindow++;
        if (verdict === 'correct') correct++;
      });
      setProgress({ done, accuracy: inWindow === 0 ? 0 : correct / inWindow });
    };

    // The very same context `unlockAudio` resumed — a second one would stay
    // suspended and the exercise would run in silence.
    const context = getAudioContext();
    // Timestamped off the same clock the notes are scheduled against, so a
    // press and a beat are directly comparable.
    const valves = new ValveInput(() => context.currentTime);
    valvesRef.current = valves;
    const session = new Session({
      context,
      input: valves,
      exercise,
      tempo: settings.tempo,
      countInBars: settings.countInBars,
      metronomeEnabled: settings.metronomeEnabled,
      metronomeVolume: settings.metronomeVolume,
      /*
       * Where the conductor has no pattern for a metre it draws nothing, and
       * the comment on `patternFor` has always said the metronome carries on.
       * It only does if the player left it on — so with it off, an imported bar
       * of five would have had the gesture stop and nothing take its place.
       *
       * Only worth asking when the conductor is the thing keeping time. With it
       * switched off too, the player is counting for themselves everywhere and
       * a bar that suddenly clicked would be the surprise.
       *
       * No tempo passed: whether a metre has a pattern at all does not depend
       * on the speed, only which of its patterns is chosen does.
       */
      needsBeatSounded: settings.conductorEnabled
        ? (metre) => patternFor(metre) === null
        : undefined,
      playbackMode: settings.playbackMode,
      brassVoice: voiceRef.current,
      timingTolerance: settings.timingTolerance,
      // The output in the player's ears, and how far behind the clock it is
      // heard — measured for every output, the phone's own speaker included,
      // which is ~330ms on an E32 and ~20ms on an iPhone 15.
      audioLead: audioLeadFor(settings),
      // Fires as the fingers arrive, not when the note is finally judged, so
      // the green reads as confirmation of what was just played.
      onCorrect: () => rendererRef.current?.flashCorrect(),
      onJudgement: (judgement: NoteJudgement) => {
        verdictsRef.current[judgement.noteIndex] = judgement.verdict;
        report();
        if (courseControlsRef.current) {
          reportBarsRef.current();
          setLastJudgedBeat((furthest) =>
            Math.max(furthest, exercise.notes[judgement.noteIndex].startBeat),
          );
        }

        /*
         * Every verdict, not only the bad ones: a mistake is answered on the
         * note immediately, and two right in a row take the prompting away
         * again. This is the whole reason the hints stopped being settled once
         * from stored history — an answer that arrives next session is not
         * teaching anybody anything, and a prompt that never stops is not
         * either.
         */
        hintsRef.current?.judged(judgement.noteIndex, judgement.verdict);
      },
      /*
       * A rewind takes its bars back out of the score.
       *
       * The session has already dropped their judgements — a bar gone back to
       * is a bar to be played again, and scoring both attempts would score the
       * one the player went back to disown. The colours on the page are this
       * screen's copy of the same thing, so they go with them, and the counter
       * is recomputed from what is left.
       */
      onRewind: (from: number) => {
        for (let index = from; index < verdictsRef.current.length; index++) {
          verdictsRef.current[index] = undefined;
        }
        report();
      },
      onFinish: (summary) => {
        // The speed they ended up playing at is the one they want next time, and
        // the key they ended up in for the same reason: the dial is what the
        // player has said about this practice, and saying it once is enough.
        if (tempoRef.current !== settings.tempo) settledRef.current?.(tempoRef.current);
        if (dialKeyRef.current !== openedIn) keySettledRef.current?.(dialKeyRef.current);
        finishRef.current(summary);
      },
      /*
       * The offer opening and closing is also when the committed length can
       * have moved — the player may have taken it by playing on rather than
       * by pressing, and the counter has to follow either way.
       */
      onOffer: (open) => {
        setOffering(open);
        setCommittedBeats(session.endBeat);
      },
      /*
       * The paper past the change has been rewritten, so everything this screen
       * keeps *about* the paper by note index has to be rewritten with it.
       *
       * The exercise object is the same one — it was spliced in place, which is
       * exactly why each of these has to be told rather than simply re-read.
       * Below `fromNoteIndex` nothing has moved and nothing here is touched:
       * that is the invariant the splice point is chosen to guarantee, and the
       * reason a run can change key without losing what the player has played.
       */
      onKeyChange: ({ fromNoteIndex }) => {
        const verdicts = verdictsRef.current;
        verdicts.length = exercise.notes.length;
        for (let index = fromNoteIndex; index < verdicts.length; index++) {
          verdicts[index] = undefined;
        }
        headsRef.current = soundingHeads(exercise.notes);
        // Which notes may carry a hint at all is read off the note list; what the
        // run has learned is filed under the written pitch and survives untouched.
        hintsRef.current?.reread();
        rendererRef.current?.rekeyed();
        report();
      },
    });
    sessionRef.current = session;
    setTransport(session.transport);

    /*
     * Which notes get their fingering printed.
     *
     * Opened from the history the player brings and added to as the run goes:
     * the object is live, so a note that goes wrong in bar three is answered in
     * bar three. Asked after the session exists so that how much time a note
     * has is answered by the transport, which is the one thing that knows —
     * rather than by dividing the tempo here and hoping the two agree.
     */
    hintsRef.current = fingeringHints({
      exercise,
      stats: loadStats(exercise.instrumentId, exercise.clef),
      mode: settings.fingerings,
      secondsBetween: (from, to) => session.transport.secondsBetween(from, to),
    });

    const renderer = new StaveRenderer({
      canvas,
      exercise,
      transport: session.transport,
      theme: currentTheme(),
      scrollSpeed: settings.scrollSpeed,
      readingMode: settings.readingMode,
      // Through the tie: its far end is never judged, so it wears the verdict of
      // the note it is tied from rather than staying unmarked beside it.
      verdictFor: (index) => verdictsRef.current[headsRef.current[index]],
      hintFor: (index) => hintsRef.current?.for(index),
      // White as far as the run is committed, and grey beyond — read per
      // frame, so accepting the offer turns the next block white at once.
      whiteUntil: () => session.endBeat,
      /*
       * The notation's own scale, handed to the stylesheet so the conductor
       * and the tempo slider can be measured in it too — see
       * `--stave-unit` in `index.css`. Without this they were sized by an
       * unrelated rule of their own, and on a tablet the notation grew past
       * them until the conductor looked like an afterthought.
       */
      onLayout: (staveUnit) =>
        screenRef.current?.style.setProperty('--stave-unit', `${staveUnit}px`),
    });
    rendererRef.current = renderer;

    const unsubscribe = valves.subscribe(setMask);
    const detachKeyboard = valves.attachKeyboard();

    const resizeObserver = new ResizeObserver(() => renderer.resize());
    resizeObserver.observe(canvas);

    const colourScheme = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSchemeChange = () => renderer.setTheme(currentTheme());
    colourScheme?.addEventListener('change', onSchemeChange);

    renderer.start();
    session.start();

    /*
     * A last line of defence.
     *
     * If the context is stopped despite everything above, the clock never moves
     * and the exercise freezes on the first count with no error anywhere. That
     * is far worse than an honest failure, so the clock is checked once shortly
     * after starting and the player is offered a way out.
     *
     * **The run's own context, both times.** `getAudioContext()` is not a
     * reader — it hands out a *fresh* context once anything has marked the old
     * one stuck — so asking it twice could compare a new context's clock
     * against the old one's reading, find them different, and pronounce a run
     * healthy that is playing through something nobody can hear. The context
     * this session was built on is the only one whose clock is evidence about
     * it, and it is held in `context` a few lines above.
     */
    const startedAt = context.currentTime;
    const stallCheck = window.setTimeout(() => {
      if (context.currentTime === startedAt) {
        // A clock that has not moved is a dead context; the next asker —
        // "Try again" — gets a fresh one rather than this one resumed. Named,
        // so that a context already replaced under us is not condemned twice
        // and a healthy replacement is not condemned at all.
        markStuck(context);
        setStalled(true);
      }
    }, 600);

    // Keeps the screen awake mid-exercise; unsupported browsers simply carry on.
    let wakeLock: WakeLockSentinel | null = null;
    navigator.wakeLock
      ?.request('screen')
      .then((lock) => {
        wakeLock = lock;
      })
      .catch(() => undefined);

    return () => {
      window.clearTimeout(stallCheck);
      session.stop();
      renderer.stop();
      unsubscribe();
      detachKeyboard();
      resizeObserver.disconnect();
      colourScheme?.removeEventListener('change', onSchemeChange);
      wakeLock?.release().catch(() => undefined);
      hintsRef.current = null;
      sessionRef.current = null;
      valvesRef.current = null;
      rendererRef.current = null;
      setTransport(null);
    };
  }, [started, attempt, exercise, settings]);

  /**
   * Brings the audio up and starts the run — from the gate, and again from
   * "Try again", where it is the whole of the cure: a context that has been
   * found dead is replaced by `unlockAudio`, the voice is loaded afresh for
   * it (a voice holds the context it was made in, and one made for the dead
   * context is silent in the live one), and the play surface is built again
   * against the moving clock.
   */
  const beginRun = () => {
    setLockStopped(false);
    setLoading(true);
    void (async () => {
      const context = await unlockAudio();
      try {
        // Decoding mid-exercise would drop notes, so the recorded
        // instrument is loaded here or not at all.
        const set = instrumentById(exercise.instrumentId).sampleSet;
        // A soft pad until the fingers are right, the instrument
        // once they are — see `FollowingVoice`. `?voice=plain` is
        // the instrument alone, for comparing. And plain too on an
        // output too late for the swap to be honest: the session
        // would never tell such a voice to swap (its rule, in
        // `REACTIVE_SOUND_MAX_LEAD`), so building the pad would only
        // spend audio graph on a sound never heard.
        const plainVoice =
          new URLSearchParams(window.location.search).get('voice') === 'plain' ||
          audioLeadFor(settings) > REACTIVE_SOUND_MAX_LEAD;
        voiceRef.current = plainVoice
          ? await Sampler.load(context, set)
          : await FollowingVoice.load(context, set, settings.cushionLevel);
      } catch {
        // Offline before the samples were ever cached, or a bad
        // response. Synthesis still works, so play on.
        voiceRef.current = undefined;
      }

      // Loading the samples takes long enough that the context can
      // have been suspended again since the tap, and a suspended
      // context has a clock that never advances — which would start
      // the exercise against a frozen count-in and no metronome.
      const alive = await ensureRunning();
      setLoading(false);
      if (!alive) {
        /*
         * It died while the samples were coming down, and the answer is not
         * to start anyway.
         *
         * `ensureRunning` has already marked it, so the next tap gets a fresh
         * context — but the voice just built belongs to this one and would be
         * silent in any other, and the run would play on a clock that never
         * arrives. Saying so is the whole point of this screen; starting into
         * it would produce exactly the silence it exists to explain. "Try
         * again" is a gesture, which is the one thing a new context needs.
         */
        voiceRef.current = undefined;
        setStalled(true);
        setStarted(true);
        return;
      }
      setStalled(false);
      setAttempt((n) => n + 1);
      setStarted(true);
    })();
  };

  /* The output whose measured lead the transport is applying; see settings. */
  const activeOutput = settings.audioOutputs.find((o) => o.id === settings.audioOutputId);
  /*
   * Names the adjustment in force and leads to where it was set.
   *
   * Only while there is one: a zero lead is not news, and a standing label
   * would bury the one time it matters. On the gate as well as beside the
   * music, because the gate is where a player reads — and switching back to
   * the speaker is cheapest before the count-in, not three bars into a run
   * that already sounds wrong. It is also the one signpost from playing to
   * the calibration screen, which otherwise hides in the advanced menu.
   */
  const leadNote =
    activeOutput && activeOutput.leadMs > 0 && onOutputs ? (
      <button type="button" className="play-lead" onClick={onOutputs}>
        Sound brought forward {activeOutput.leadMs} ms for {activeOutput.name}
      </button>
    ) : null;

  /*
   * The warning before a first session on an output nobody has measured.
   *
   * Zero measurements is not the same as a lead of zero: the first is a player
   * who has never been asked, and until they are, every note the app plays is
   * as late as their hardware happens to be. Asked at the gate rather than in
   * settings, because this is the moment it costs something — and asked once,
   * since a warning that returns after "Later" is a nag rather than a warning.
   */
  const needsCalibration = activeOutput !== undefined && activeOutput.calibrations === 0;
  const start = () => {
    if (needsCalibration && !asked) {
      setAsked(true);
      setAsking(true);
      return;
    }
    beginRun();
  };

  if (!started) {
    return (
      <div className="screen screen--centred">
        {asking && (
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="calibration-warning"
          >
            <div className="modal__box">
              <h2 id="calibration-warning">Calibration Required</h2>
              <p>Calibrate your speakers or headphones with the beat for best user experience.</p>
              <p className="muted">
                You can measure {activeOutput?.name ?? 'an output'} at any time from{' '}
                <strong>Outputs</strong>, in the Advanced menu.
              </p>
              <div className="modal__actions">
                {onOutputs && (
                  <button
                    type="button"
                    className="button button--primary"
                    onClick={() => {
                      setAsking(false);
                      onOutputs();
                    }}
                  >
                    Calibrate Now
                  </button>
                )}
                <button
                  type="button"
                  className="button"
                  onClick={() => {
                    setAsking(false);
                    beginRun();
                  }}
                >
                  Later
                </button>
                {/* Accepting counts as a measurement, so it is not asked again:
                    the player has been asked and has answered. */}
                <button
                  type="button"
                  className="button button--quiet"
                  onClick={() => {
                    setAsking(false);
                    onAcceptOutput?.();
                    beginRun();
                  }}
                >
                  Accept current offset ({activeOutput?.leadMs ?? 0}ms)
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="start-gate">
          <h2>Ready</h2>
          {lockStopped && (
            <p className="muted">
              The run stopped when the screen went dark — nothing is judged unseen.
            </p>
          )}
          {/*
           * Start first, settings under it (asked for by the player,
           * 2026-08-23): the returning player who changes nothing should meet
           * the button where their thumb already is, and the sections below
           * are for the run that wants something different. The two
           * paragraphs of how-to-play prose that used to sit here went the
           * same day — the accordion summaries say the same things in five
           * short lines, and "Nothing keeps time" on the Beat line carries
           * the one warning the prose existed for.
           */}
          <button
            type="button"
            className="button button--primary button--large"
            disabled={loading}
            onClick={start}
          >
            {loading ? 'Loading instrument…' : 'Tap to start'}
          </button>
          {/* How this run will go, editable at the door — see ReadyControls
              for the admission rule that keeps this face short. */}
          {onSettings && (
            <ReadyControls
              settings={settings}
              onChange={onSettings}
              onOutputs={onOutputs}
              pinned={coursePinned}
            />
          )}
          <button
            type="button"
            className="button button--quiet"
            disabled={loading}
            onClick={onExit}
          >
            {/* Not "Back to settings" any more: these are the settings. */}
            Back
          </button>
          {/* The lead note used to sit here too; the ReadyControls status line
              says the same thing with the unmeasured case besides. It remains
              beside the music, where it still has no substitute. */}
          {!onSettings && leadNote}
        </div>
      </div>
    );
  }

  if (stalled) {
    return (
      <div className="screen screen--centred">
        <div className="start-gate">
          <h2>Audio didn’t start</h2>
          <p className="muted">
            The phone stopped the sound before the exercise got going — it does this after the app
            has been away — which leaves the count-in stuck. Try again starts the sound afresh.
          </p>
          <button
            type="button"
            className="button button--primary button--large"
            disabled={loading}
            onClick={beginRun}
          >
            {loading ? 'Starting…' : 'Try again'}
          </button>
          <button type="button" className="button button--quiet" onClick={onExit}>
            Back
          </button>
        </div>
      </div>
    );
  }

  const accuracy = Math.round(progress.accuracy * 100);

  /*
   * Stopping ends the run and reports it, rather than discarding it.
   *
   * It used to walk back to the settings screen with the score in its
   * pocket, which was a small loss when an exercise always ran to a fixed
   * end and is a real one now that stopping is how a session of any length
   * is meant to finish. A run with nothing judged in it has nothing to
   * report, so that one still simply leaves.
   */
  /**
   * What the one button does, whichever job it is currently doing.
   *
   * Safe to call twice: `continuePlaying` withdraws the offer as it takes it
   * and `finishNow` returns once finished, so a browser that manages to fire
   * both a pointer press and a click buys one block and ends one run.
   */
  const press = () => {
    const session = sessionRef.current;
    if (!offering || !session) {
      stopNow();
      return;
    }
    session.continuePlaying();
    setCommittedBeats(session.endBeat);
  };

  const stopNow = () => {
    const session = sessionRef.current;
    if (!session || session.judgements.length === 0) {
      onExit();
      return;
    }
    session.finishNow();
  };

  /*
   * The three transport buttons, all pressed the same way as the big one and
   * for the same reason: a touchscreen raises `click` only for the first
   * finger down, and every one of these is reached for with a second.
   */
  const holdOrPlay = () => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.isPaused) session.resume();
    else session.pause();
    setPaused(session.isPaused);
  };

  const goBack = (bars: number) => {
    const session = sessionRef.current;
    session?.rewind(bars);
  };

  /*
   * Turning the key dial: the face moves now, the music moves on release.
   *
   * Every detent updates the shown key and asks the session where a change made
   * at this moment would land, so the callout can say which bar. Asking per
   * detent rather than once at the start because the playhead is moving while
   * the finger is: a slow turn through five keys can cross the bar the first
   * detent would have landed in.
   */
  const turnKey = (fifths: number) => {
    setDialKey(fifths);
    const session = sessionRef.current;
    setChangeBar(session ? barLabel(exercise, barAt(exercise.metres, session.keyChangeBeat)) : null);
  };

  const commitKey = (fifths: number) => {
    const session = sessionRef.current;
    if (!session || !inKey) return;
    /*
     * The music is rewritten from a bar line ahead of the playhead, or not at
     * all — `changeKey` refuses a change that would land past the end of the
     * paper, and the dial is left showing the key the player chose either way.
     * Putting the face back would be arguing with them about a choice that was
     * theirs, over an outcome they cannot see.
     */
    session.changeKey(inKey(fifths));
  };
  // Against what this run has committed to rather than what was first asked
  // for: taking the offer moves the target, and a target is the point of one.
  const targetNotes = exercise.notes.filter((n) => n.startBeat < committedBeats - 1e-9).length;

  return (
    <div className="screen screen--play" ref={screenRef}>
      <div className="play-bar">
        {/*
          One button, thumb-sized, doing whatever the moment asks of it: red
          to finish, and green to carry on in the last beats before the music
          runs out. There is no third state and no way to be caught out —
          letting the green one pass simply ends the run, which is what not
          answering an offer means.
        */}
        <PressButton
          className={`button play-action ${offering ? 'play-action--continue' : 'play-action--stop'}`}
          onPress={press}
        >
          {offering ? 'Continue' : 'Stop'}
        </PressButton>

        {/*
          Hold it, and take it from a bar or five back — the two things said
          most often in a practice room, and neither of them possible until now
          without ending the run and generating a different exercise.
        */}
        <div className="play-transport">
          <PressButton className="button play-step" onPress={holdOrPlay}>
            {paused ? 'Start' : 'Pause'}
          </PressButton>
          <PressButton
            className="button play-step play-step--back"
            onPress={() => goBack(1)}
            label="Back one bar"
          >
            <span aria-hidden="true">◀1</span>
          </PressButton>
          <PressButton
            className="button play-step play-step--back"
            onPress={() => goBack(5)}
            label="Back five bars"
          >
            <span aria-hidden="true">◀5</span>
          </PressButton>
        </div>
        <div className="play-stats">
          <span>
            {progress.done} / {targetNotes}
          </span>
          <span className="play-stats__accuracy">{accuracy}%</span>
        </div>
        {leadNote}
      </div>

      <div className="play-aside">
        {courseControls ? (
          courseControls({
            barAccuracies,
            lastJudgedBeat,
            playing: started && !paused,
            courseStep: (opts) => sessionRef.current?.courseStep(opts) ?? null,
          })
        ) : (
        <TempoDial
          tempo={tempo}
          /* The metre in force, not the settings' and not the opening one: the
             dial's number is pulses per minute, and a medley changes what a
             pulse is at every join. */
          compound={metreNow.isCompound}
          onChange={(bpm) => {
            setTempo(bpm);
            // The clock takes it at the next beat it has not committed to;
            // the hints re-measure, since what there is time to read is a
            // question about seconds and the seconds have just changed.
            sessionRef.current?.transport.changeTempo(bpm);
            hintsRef.current?.retime();
          }}
        />
        )}
        {/* Only where the music can be rewritten: not for an imported part,
            which has no generator behind it, and not on the free tier, which is
            entitled to one key. */}
        {inKey && (
          <KeyDial
            fifths={dialKey}
            onChange={turnKey}
            onCommit={commitKey}
            fromBar={changeBar}
          />
        )}
        {settings.conductorEnabled && transport && (
          <ConductorPanel
            transport={transport}
            metres={exercise.metres}
            style={settings.conductorStyle}
            /* The live one: the conductor chooses its pattern by tempo, and a
               hand still beating the speed the player has just left would be
               the one thing on screen disagreeing with the clock. */
            tempo={tempo}
            tempoEvents={exercise.tempo}
          />
        )}
      </div>

      {/* The canvas is positioned inside a frame rather than being the grid
          item itself; see `.stave-frame`. */}
      <div className="stave-frame">
        <canvas ref={canvasRef} className="stave-canvas" />
      </div>

      <ValvePad
        mask={mask}
        onPress={(pointerId, valve) => valvesRef.current?.pointerDown(pointerId, valve)}
        onRelease={(pointerId) => valvesRef.current?.pointerUp(pointerId)}
      />
    </div>
  );
}
