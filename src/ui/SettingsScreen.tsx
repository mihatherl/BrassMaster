import { useEffect, useMemo, useRef, useState, type ReactNode, type ReactElement } from 'react';
import {
  INSTRUMENTS,
  availableClefs,
  instrumentById,
  writtenRange,
  type Clef,
} from '../domain/instruments';
import { keyNameFor, orderByCloseness } from '../domain/keys';
import { formatPitch } from '../domain/pitch';
import { spellInKey } from '../domain/keys';
import { COLLECTIONS, themeById, themesOf } from '../exercise/collections';
import { corpusSummary } from '../exercise/corpus';
import { themesFor } from '../exercise/phrases';
import { realiseTheme, type Theme } from '../exercise/theme';
import { metreFor } from '../domain/metre';
import { DIFFICULTIES } from '../exercise/difficulty';
import { DRILLS, drillById, isPattern, patternSpanFor } from '../exercise/generate';
import { EXERCISE_KINDS } from '../exercise/types';
import {
  type AuthoredCell,
  cellFitsKeys,
  loadCells,
  loadCustomRhythms,
  previewExerciseFromBars,
  RANDOM_CELL,
  RHYTHM_PATTERNS,
  type RhythmPattern,
} from '../exercise/rhythm';
import { currentTheme, StaveRenderer } from '../render/surface';
import { Transport } from '../engine/clock';
import { RhythmPatternEditor } from './RhythmPatternEditor';
import { CellEditor } from './CellEditor';
import { LOCALES, t, tCount, type StringKey } from '../i18n';
import type { ExerciseKind } from '../exercise/types';
import { RangePicker } from './RangePicker';
import { accidentalCount, KeyGrid } from './KeyGrid';
import {
  REGISTERS,
  DEVICE_OUTPUT_ID,
  MAX_KEYS_IN_PLAY,
  sanitise,
  switchMaterial,
  TIME_SIGNATURES,
  type Settings,
} from '../storage/settings';

/* Fixed for a build, so it is read once rather than on every render. */

/**
 * A collapsible settings section.
 *
 * Built on `<details>` rather than hand-rolled state, so it comes with keyboard
 * operation, the right roles for a screen reader and browser find-in-page
 * already working.
 */

/**
 * Keys to a row, which decides what the window opens on.
 *
 * Five, and not an arbitrary five: fifteen keys in rows of five puts B flat, F,
 * C, G and D — two flats to two sharps — in the middle row on their own, which
 * is where nearly all brass band reading lives. The rows either side hold the
 * keys a player goes looking for rather than the ones they land on.
 */
function describeSpan(semitones: number): string {
  if (semitones >= 24) return 'two octaves';
  if (semitones >= 12) return 'one octave';
  // "A fifth" rather than "the first five notes", because the shortened thing
  // may be a chord: a triad squeezed into a fifth plays three notes, not five.
  if (semitones >= 7) return 'a fifth';
  return 'a very short pattern';
}

/**
 * The key set as chips, three rows of five — one grid, drawn wherever keys
 * are nominated: on the home for medleys and free material, and at the top of
 * the defined picker, where the keys chosen are what every tune below offers.
 *
 * Pick keys in the order you want them. The first is where the exercise
 * opens; beyond the cap only what is already chosen can be undone, and the
 * last one standing cannot be — an exercise has to be in some key.
 */
/** The metres a pattern may be written in — the editor's own list. */
const PATTERN_METRES: ReadonlyArray<[number, number]> = [
  [2, 4],
  [3, 4],
  [4, 4],
];

/**
 * A pattern's first bar, engraved on one written C — the card's face.
 * The same static-preview trick the rhythm editor and the course
 * editor's tune picker use: `StaveRenderer` wants a transport for its
 * clock, so it gets one over a context that never starts.
 */
function PatternFigure({
  pattern,
  instrumentId,
  clef,
}: {
  pattern: RhythmPattern;
  instrumentId: string;
  clef: Clef;
}): ReactElement {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const context = new AudioContext();
    void context.suspend();
    const exercise = previewExerciseFromBars(
      pattern.bars.slice(0, 1),
      pattern.metre,
      instrumentById(instrumentId),
      clef,
    );
    const renderer = new StaveRenderer({
      canvas,
      exercise,
      transport: new Transport(context, 80),
      theme: currentTheme(),
      scrollSpeed: 0,
      readingMode: 'paged',
      verdictFor: () => undefined,
    });
    renderer.draw();
    return () => {
      renderer.stop();
      void context.close();
    };
  }, [pattern, instrumentId, clef]);
  return <canvas ref={ref} className="pattern-card__figure" />;
}

function KeysGrid({
  keySet,
  keyName,
  onChange,
}: {
  keySet: readonly number[];
  keyName: (fifths: number, short?: boolean) => string;
  onChange: (next: number[]) => void;
}) {
  const full = keySet.length >= MAX_KEYS_IN_PLAY;
  return (
    <KeyGrid
      keyName={keyName}
      isSelected={(fifths) => keySet.includes(fifths)}
      isStart={(fifths) => keySet[0] === fifths}
      /* Beyond the cap only what is already chosen can be undone, and the last
         one standing cannot be — an exercise has to be in some key. */
      isDisabled={(fifths) => {
        const chosen = keySet.includes(fifths);
        return (chosen && keySet.length === 1) || (!chosen && full);
      }}
      onPick={(fifths) => {
        const next = keySet.includes(fifths)
          ? keySet.filter((f) => f !== fifths)
          : [...keySet, fifths];
        if (next.length === 0) return;
        onChange(next);
      }}
    />
  );
}

/**
 * Building a defined run: keys nominated at the top, what is available on the
 * left, what will play on the right.
 *
 * Two columns rather than a list of toggles, because a playlist is an ordered
 * thing with repeats and a toggle list is a set — and the difference is the
 * whole feature. The same tune may be added as often as the player likes, in
 * as many keys as it fits, which is how somebody drills the one that is
 * giving them trouble.
 *
 * **A tune and its key are chosen together, and only real combinations are
 * offered.** Redesigned with the player on 2026-08-23, the day Invention 13
 * exposed the old shape: a key set toured over a playlist could name
 * placements that do not exist — the invention spans thirty semitones and
 * fits one signature on a cornet — and the run then silently truncated or
 * fell back to composed material, *"which will make them think there is a bug
 * (as I did — and I helped design it!)"*. Now the keys are nominated on this
 * sheet, each tune expands (one at a time, the player's call) to chips for
 * exactly the nominated keys whose placement holds it, and a tune that fits
 * none of them is greyed rather than hidden — seeing it disabled is how a
 * player learns the keys are why. Every step built here is a step that will
 * play.
 *
 * The left column is grouped by library only when more than one is in play:
 * one library needs no heading, and a heading over every list makes the
 * grouping look like a setting rather than an answer to "where is this from".
 * Inside a group the order is alphabetical, because a player looking for a
 * tune by name has no other way in — the corpus order means nothing to them.
 *
 * Each entry carries its bars, level and time signature in small type. Those
 * are the three facts that decide whether a tune belongs in the run being
 * built, and all three are properties of the music rather than of the app.
 */
function DefinedPicker({
  settings,
  keyName,
  onChange,
  onClose,
}: {
  settings: Settings;
  keyName: (fifths: number, short?: boolean) => string;
  onChange: (settings: Settings) => void;
  onClose: () => void;
}) {
  const instrument = instrumentById(settings.instrumentId);
  const steps = settings.themeSteps;
  const groups = COLLECTIONS.filter((collection) =>
    settings.collectionIds.includes(collection.id),
  ).map((collection) => ({
    collection,
    themes: [...collection.themes].sort((a, b) => a.name.localeCompare(b.name)),
  }));
  const named = groups.length > 1;

  /* One tune open at a time (the player's ruling): the open row is where the
     key chips live, and two open rows are two questions at once. */
  const [openId, setOpenId] = useState<string | null>(null);

  /*
   * Put the window's scroll back when the sheet opens and when it closes.
   *
   * On the installed iPhone app, scrolling this sheet's lists could leave the
   * *window* scrolled — the whole app a status-bar too high, a dead band at
   * the bottom, and only a relaunch curing it. `overscroll-behavior` on the
   * lists stops the cause (see `.picker__list`); this heals whatever slips
   * past it, and heals a shift that was already in force when the sheet
   * opened. A no-op everywhere the window is where it belongs.
   */
  useEffect(() => {
    window.scrollTo(0, 0);
    return () => window.scrollTo(0, 0);
  }, []);

  const detail = (theme: Theme) =>
    `${theme.bars} bars · ${theme.difficulty} · ${theme.metres.map(([n, d]) => `${n}/${d}`).join(', ')}`;

  /* Which of the nominated keys hold this tune, asked of the real placement —
     the same question `sanitise` asks of every stored step, so a chip offered
     here is a step that survives being stored. */
  const fitsFor = (theme: Theme) =>
    settings.keySet.filter((fifths) => {
      const [n, d] = theme.metres[0];
      return (
        realiseTheme(theme, {
          instrument,
          clef: settings.clef,
          fifths,
          metre: metreFor(n, d),
        }) !== null
      );
    });

  /* Every edit goes through `sanitise`, which is what keeps the sheet honest
     as it is used: deselecting a key up top takes its steps out of the right
     column in the same render, because steps live and die with their keys. */
  const edit = (changes: Partial<Settings>) => onChange(sanitise({ ...settings, ...changes }));

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={t('picker.title')}>
      <div className="picker__head">
        <p className="field__note muted">
          {t('picker.note', { instrument: instrument.name })}
        </p>
        <KeysGrid
          keySet={settings.keySet}
          keyName={keyName}
          onChange={(next) => edit({ keySet: next })}
        />
      </div>

      <div className="sheet__body picker">
        <div className="picker__column">
          <h3 className="picker__heading">{t('picker.available')}</h3>
          <div className="picker__list">
            {groups.map(({ collection, themes }) => (
              <div key={collection.id}>
                {named && <p className="picker__group">{collection.name}</p>}
                {themes.map((theme) => {
                  const fits = fitsFor(theme);
                  if (fits.length === 0) {
                    /* Present and plainly unavailable, never hidden: a player
                       who can see the tune greyed can see that the keys are
                       why, where a missing row is just a mystery. */
                    return (
                      <div key={theme.id} className="picker__tune picker__tune--unfit">
                        <span className="picker__name">{theme.name}</span>
                        <span className="picker__detail">{detail(theme)}</span>
                        <span className="picker__detail">
                          Doesn&apos;t fit{' '}
                          {settings.keySet.map((f) => keyName(f, true)).join(' or ')} on{' '}
                          {instrument.name}
                        </span>
                      </div>
                    );
                  }
                  const open = openId === theme.id;
                  return (
                    <div
                      key={theme.id}
                      className={`picker__tune ${open ? 'picker__tune--open' : ''}`}
                    >
                      <button
                        type="button"
                        className="picker__toggle"
                        aria-expanded={open}
                        onClick={() => setOpenId(open ? null : theme.id)}
                      >
                        <span className="picker__name">{theme.name}</span>
                        <span className="picker__detail">{detail(theme)}</span>
                      </button>
                      {open && (
                        <span className="picker__keys">
                          {fits.map((fifths) => (
                            <button
                              key={fifths}
                              type="button"
                              className="picker__key"
                              aria-label={`Add ${theme.name} in ${keyName(fifths)}`}
                              onClick={() =>
                                edit({
                                  selection: 'defined',
                                  themeSteps: [...steps, { id: theme.id, fifths }],
                                })
                              }
                            >
                              <span className="key__name">{keyName(fifths, true)}</span>
                              <span className="key__accidentals muted">
                                {accidentalCount(fifths)}
                              </span>
                            </button>
                          ))}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="picker__column">
          <h3 className="picker__heading">
            Playing {steps.length > 0 && <span className="chip__count">{steps.length}</span>}
          </h3>
          <div className="picker__list">
            {steps.length === 0 && (
              <p className="field__note muted">{t('picker.steps')}</p>
            )}
            {steps.map((step, at) => {
              const theme = themeById(step.id);
              if (!theme) return null;
              return (
                <button
                  /* Position, not id: the same tune may be here more than once,
                     and removing the third copy must not remove the first. */
                  key={`${step.id}-${step.fifths}-${at}`}
                  type="button"
                  className="picker__tune picker__tune--chosen"
                  onClick={() =>
                    edit({ themeSteps: steps.filter((_, i) => i !== at) })
                  }
                >
                  <span className="picker__name">
                    {at + 1}. {theme.name}{' '}
                    <span className="picker__inkey">· in {keyName(step.fifths, true)}</span>
                  </span>
                  <span className="picker__detail">{detail(theme)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sheet__actions">
        <button
          type="button"
          className="button button--quiet"
          onClick={() => edit({ themeSteps: [] })}
        >
          {t('common.clear')}
        </button>
        <button type="button" className="button button--primary" onClick={onClose}>
          {t('common.done')}
        </button>
      </div>
    </div>
  );
}

interface SettingsScreenProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onStart: () => void;
  /**
   * Opens My Music, where a part is read out of a file rather than generated.
   *
   * Optional because the free web build has no importer to open: the line
   * between the two products is `__HAS_MY_MUSIC__`, and `App` passes this only
   * in the build that has it. The screen takes the absence as the whole
   * instruction and leaves the door out rather than drawing a dead one — which
   * also makes both sides testable in one run; see `target.test.tsx`.
   */
  onImport?: () => void;
  /**
   * The other side of the unified home: the course, rendered by the owner of
   * course state and slotted in here so this screen stays ignorant of ladder
   * logic. Present only in the build with teacher mode — the screen is told
   * what exists rather than which build it is in, as with `onImport`.
   */
  structured?: ReactNode;
  /** Which side is showing, and the switch. Absent hides the segments. */
  mode?: 'structured' | 'free';
  onMode?: (mode: 'structured' | 'free') => void;
}

const CORPUS = corpusSummary();

export function SettingsScreen({
  settings,
  onChange,
  onStart,
  onImport,
  structured,
  mode = 'free',
  onMode,
}: SettingsScreenProps) {
  const instrument = instrumentById(settings.instrumentId);
  const [showInstrument, setShowInstrument] = useState(false);
  const clefs = availableClefs(instrument);
  const [low, high] = writtenRange(instrument, settings.clef);
  const difficulty = DIFFICULTIES.find((d) => d.id === settings.difficultyId)!;

  // Scales and arpeggios are described by their reach rather than by a level
  // name, and that reach depends on whether the drill's root leaves room for it.
  const patternKind = isPattern(settings.kind);
  const drill = drillById(settings.drillId);
  const actualSpan = patternSpanFor(instrument, settings.clef, settings.fifths, difficulty, drill);

  /*
   * How a key is named to the player, which follows the drill.
   *
   * A minor drill — the harmonic and melodic minor scales, the minor arpeggio
   * — is chosen the way a book prints it: *D minor*, not *F major with the
   * relative minor*. The signature underneath is the same either way, and so
   * is the control; only its labels change. Everywhere else a key is the major
   * it always was.
   */
  const minorKeys = patternKind && drill.minor === true;
  // Shared with the Ready gate since 2026-08-29 — see `keyNameFor`. Two
  // screens naming the same signature differently would be a bug nobody
  // would think to look for.
  const keyName = (fifths: number, short = false): string =>
    keyNameFor(fifths, minorKeys, short);
  /*
   * The raised seventh of G sharp, D sharp and A sharp minor is a double sharp
   * in a book, and this app never prints one — it writes the natural above
   * instead, which is what `spellInKey` does with that sound. Said beside the
   * keys where it applies, since a player who knows the scale will notice.
   */
  const naturalForDoubleSharp =
    minorKeys && drill.up.length === 7 && settings.fifths >= 5;
  const shortenedSpan =
    patternKind && actualSpan < difficulty.patterns.spanSemitones ? describeSpan(actualSpan) : null;

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  /* Whether the two-column picker is open. Local: it is a way of editing a
     setting, not a setting of its own. */
  const [picking, setPicking] = useState(false);

  /*
   * The chosen collection, where one is chosen, and how much of it currently
   * fits — so the note under the control can name it.
   *
   * No metre in the question, because a collection plays each tune in its own
   * time signature: what can fit is a fact about the level, the key and the
   * compass alone. A defined run needs no such question asked at all: its
   * steps were built in the picker against the real placement and `sanitise`
   * keeps them true, so every step counts.
   */
  const chosenIds = settings.collectionIds;
  const steps = settings.themeSteps;
  const defined = settings.selection === 'defined';
  const fitsOf = (corpus: readonly Theme[], level?: string) =>
    themesFor({
      instrument,
      clef: settings.clef,
      fifths: settings.fifths,
      difficulty: level,
      corpus,
    }).length;
  const playable = defined ? steps.length : fitsOf(themesOf(chosenIds), settings.difficultyId);

  // What the chosen tab is, for the blurb line beneath the tabs.
  const material = EXERCISE_KINDS.find((k) => k.id === settings.kind)!;
  /* The rhythm tool's sheet, and a counter that re-reads the player's own
     shelf after a save — the store is the truth, this only asks again. */
  const [rhythmEditing, setRhythmEditing] = useState<RhythmPattern | null | 'closed'>('closed');
  /** The note editor's sheet: a pattern and, when reopening, its cell. */
  const [cellEditing, setCellEditing] = useState<
    { pattern: RhythmPattern; cell: AuthoredCell | null } | 'closed'
  >('closed');
  const [rhythmShelf, setRhythmShelf] = useState(0);
  /** Which pattern card is expanded, showing its ways of being played. */
  const [openPattern, setOpenPattern] = useState<string | null>(null);
  const customRhythms = useMemo(
    () => (__HAS_RHYTHM__ && settings.kind === 'rhythm' ? loadCustomRhythms() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.kind, rhythmShelf],
  );
  const patternCells = useMemo(
    () => (__HAS_RHYTHM__ && settings.kind === 'rhythm' ? loadCells() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.kind, rhythmShelf],
  );
  /* Packaged first, then the player's own; filtered by the metre chosen,
     or all of them where no metre is. */
  const shownPatterns = useMemo(() => {
    /* The literal, not just the kind: this module is in both builds, so
       an unguarded reference keeps the pattern library alive through the
       bundle — the leak `check:web` caught the day the tab was built,
       and again the day it grew a card grid. */
    if (!__HAS_RHYTHM__) return [];
    const all = [...RHYTHM_PATTERNS, ...customRhythms];
    const metre = settings.patternMetre;
    return metre ? all.filter((p) => p.metre[0] === metre[0] && p.metre[1] === metre[1]) : all;
  }, [customRhythms, settings.patternMetre]);
  // The one summary the screen still writes itself: which output the strip's
  // note names. Everything else announces itself in place now — the chip, the
  // open material box, the gate's accordion lines.
  const output = settings.audioOutputs.find((o) => o.id === settings.audioOutputId);


  /*
   * The clearance under the content follows the strip's measured height,
   * because the strip's height is not a constant: it carries the
   * output-lead note only when a lead is in force, and it grows with the
   * device's font scale. A guessed clearance was 50px short on the E32 —
   * whose strip holds a two-line "brought forward 750 ms" note that no
   * desktop test browser ever has — and the last drills controls could not
   * scroll out from under it, found by measuring the live phone over CDP.
   * Re-measured every render (the note comes and goes with settings) and on
   * resize.
   */
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = stripRef.current;
    const screen = strip?.closest('.screen--settings');
    if (!strip || !(screen instanceof HTMLElement)) return;
    const set = () =>
      screen.style.setProperty('--strip-clearance', `${strip.offsetHeight + 12}px`);
    set();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(set) : null;
    observer?.observe(strip);
    return () => observer?.disconnect();
  });

  /*
   * No windows over the keys or the drills any more (the player, 2026-08-23
   * evening): both lists show whole on the flattened home — the page scrolls
   * as itself, and a pane inside a scrolling page was double-scrolling. The
   * refs and the scroll-centring that used to bring the chosen row into a
   * half-open box went with the boxes; see `.keys` and `.drills` in
   * index.css for the arithmetic of what the flattening costs and buys.
   */


  /*
   * The fields a material's box holds, built here and placed by the accordion
   * below rather than laid out in one fixed column.
   *
   * Every one of them applies to some materials and not to others, which is the
   * whole reason the boxes exist: a register is a question about where a scale
   * sits and means nothing to a written tune, a range is a question about the
   * pool free material is drawn from and means nothing to either.
   *
   * Values rather than components, so they close over `settings`, `shown`,
   * `locked` and `update` exactly as they did when they were written inline —
   * and so that each is plainly the same one control wherever it is settings.
   */
  const keysField = (
    <div className="field">
      <span className="field__label">{t('home.keys')}</span>
      {/*
        One control for keys, not two.

        There used to be a dropdown naming the starting key and a grid naming the
        keys in play, which said the same thing twice: `keySet[0]` *is* the
        starting key and always was. The pair also needed a rule to keep them
        agreeing — the starting key's chip could not be deselected — which is a
        rule that only existed because there were two controls.

        Pick keys in the order you want them. The first is where the exercise
        opens; the collapsed summary spells the whole route out, so the order is
        never a secret you have to remember choosing.
      */}
      <KeysGrid
        keySet={settings.keySet}
        keyName={keyName}
        onChange={(next) => onChange(sanitise({ ...settings, keySet: next }))}
      />
      {settings.keySet.length > 1 && (
        <p className="field__note muted">
          {/* The whole route, ordered for playing by closeness from the
              opening key — this used to live on the panel's summary line, and
              when the panel went (2026-08-23) it was the one thing the summary
              said that nothing else did. */}
          {t('home.keysRoute', {
            route: orderByCloseness(settings.fifths, settings.keySet)
              .map((f) => keyName(f, true))
              .join(' → '),
          })}
        </p>
      )}
      {naturalForDoubleSharp && (
        <p className="field__note muted">
          {t('home.doubleSharp', { key: keyName(settings.fifths) })}
        </p>
      )}
    </div>
  );

  const drillField = (
    <div className="field">
      <span className="field__label">{t('home.drill')}</span>
      <div className="drills">
        {DRILLS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={settings.drillId === option.id}
            className={`segmented__option drill ${settings.drillId === option.id ? 'is-selected' : ''}`}
            onClick={() => update('drillId', option.id)}
          >
            {t(`drill.${option.id}` as StringKey)}
          </button>
        ))}
      </div>
    </div>
  );

  /*
   * Where the Themes material gets its tunes: any number of collections, or
   * none.
   *
   * **None is not an empty choice, it is composed material** — tunes built
   * from cells for this run, endlessly fresh. "Composed" was briefly an id
   * alongside the collections and read as a collection with nothing in it,
   * which is the one question it cannot answer: it has no tunes to count
   * because it has not written them yet. So it is the state of having chosen
   * no collection, and the chip that says so is pressed when the list is
   * empty.
   *
   * The count beside each collection is not decoration. A collection holds
   * written tunes at fixed levels, so one with nothing at the chosen level
   * falls back to composed material — correct behaviour, and indistinguishable
   * on screen from being given Bach, which is the problem. It is counted
   * against the real placement, so an instrument whose compass will not hold a
   * tune is counted out here too.
   */
  const toggleCollection = (id: string) => {
    const next = chosenIds.includes(id)
      ? chosenIds.filter((have) => have !== id)
      : [...chosenIds, id];
    /* Picks are dropped with the collection that held them; `sanitise` would
       do it anyway, and doing it here keeps the modal's list honest as it is
       being edited. */
    onChange({ ...settings, collectionIds: next, themeSteps: [], selection: 'medley' });
  };

  /*
   * Rhythm's own leading control, where the drill picker sits for drills:
   * which pattern, ordered by the spine's stages. Paid — the tab that
   * reaches this exists only where `EXERCISE_KINDS` grew the rhythm entry,
   * which is behind `__HAS_RHYTHM__` — but reachability does not tree-shake:
   * this JSX evaluates on every render whether rendered or not, and shipped
   * the pattern library to the free bundle until `check:web`'s "Dotted
   * pairs" tripwire caught it on its first run. The literal here is what
   * folds the expression away and lets `rhythm.ts` shake out.
   */
  /*
   * The Pattern tab (the player's structure, 2026-09-03): a metre filter,
   * then a grid of cards — each a pattern's name and its first bar
   * engraved — and a card EXPANDS in place (not a popup, ruled the same
   * day) to offer the ways of playing it: random notes, or one of the
   * cells authored on it. The key selector beside the metre is a
   * CHOICE, not a filter: a cell is degrees, so it plays in any key its
   * instrument can hold — and the ones it cannot are shown disabled with
   * the reason, exactly as the themes picker greys a tune.
   */
  const patternField = __HAS_RHYTHM__ ? (
    <>
      <div className="field">
        <span className="field__label">{t('rhythm.metre')}</span>
        <div className="row">
          {PATTERN_METRES.map(([n, d]) => {
            const chosen = settings.patternMetre?.[0] === n && settings.patternMetre?.[1] === d;
            return (
              <button
                key={`${n}/${d}`}
                type="button"
                className={`segmented__option ${chosen ? 'is-selected' : ''}`}
                aria-pressed={chosen}
                onClick={() => update('patternMetre', chosen ? undefined : [n, d])}
              >
                {n}/{d}
              </button>
            );
          })}
        </div>
      </div>

      {/*
        The key the pattern PLAYS in — the plan's own ruling made real
        (2026-09-04, the player: "how can I select the key to play in?"):
        key is a CHOICE, not a filter, because a cell is degrees and
        plays anywhere its instrument can hold it. This grid was ruled
        with the Pattern tab (2026-09-03) and never wired: the run
        silently inherited whatever key another tab last chose. One key,
        not a set — a rhythm run holds one signature — remembered per
        material like every keySet. A bare rhythm stays keyless by the
        standing ruling and simply ignores it.
      */}
      <div className="field">
        <span className="field__label">{t('rhythm.playIn')}</span>
        <KeyGrid
          keyName={(fifths, short) => keyName(fifths, short)}
          isSelected={(fifths) => fifths === settings.fifths}
          onPick={(fifths) => onChange(sanitise({ ...settings, keySet: [fifths] }))}
        />
        <p className="field__note muted">{t('rhythm.playInNote')}</p>
      </div>

      <div className="field">
        <span className="field__label">{t('rhythm.pattern')}</span>
        <div className="pattern-grid">
          {shownPatterns.map((option) => {
            const open = openPattern === option.id;
            const cells = patternCells.filter((cell) => cell.patternId === option.id);
            return (
              <div key={option.id} className={`pattern-card ${open ? 'is-open' : ''}`}>
                <button
                  type="button"
                  className="pattern-card__head"
                  aria-expanded={open}
                  onClick={() => setOpenPattern(open ? null : option.id)}
                >
                  <span className="pattern-card__name">{option.name}</span>
                  <PatternFigure
                    pattern={option}
                    instrumentId={settings.instrumentId}
                    clef={settings.clef}
                  />
                </button>
                {open && (
                  <div className="pattern-card__ways">
                    <button
                      type="button"
                      className={`segmented__option ${
                        settings.rhythmPatternId === option.id && !settings.cellId
                          ? 'is-selected'
                          : ''
                      }`}
                      onClick={() =>
                        onChange(
                          sanitise({
                            ...settings,
                            rhythmPatternId: option.id,
                            cellId: undefined,
                          }),
                        )
                      }
                    >
                      {t('rhythm.rhythmOnly')}
                    </button>
                    <button
                      type="button"
                      className={`segmented__option ${
                        settings.rhythmPatternId === option.id && settings.cellId === RANDOM_CELL
                          ? 'is-selected'
                          : ''
                      }`}
                      onClick={() =>
                        onChange(
                          sanitise({
                            ...settings,
                            rhythmPatternId: option.id,
                            cellId: RANDOM_CELL,
                          }),
                        )
                      }
                    >
                      {t('rhythm.randomNotes')}
                    </button>
                    {cells.map((cell) => {
                      const fits = cellFitsKeys(
                        cell,
                        instrument,
                        settings.clef,
                        settings.keySet.length > 0 ? settings.keySet : [settings.fifths],
                      );
                      const unfit = fits.length === 0;
                      return (
                        <span key={cell.id} className="pattern-card__cell">
                          <button
                            type="button"
                            disabled={unfit}
                            title={
                              unfit
                                ? t('rhythm.unfit', { instrument: instrument.name })
                                : undefined
                            }
                            className={`segmented__option ${
                              settings.cellId === cell.id ? 'is-selected' : ''
                            }`}
                            onClick={() =>
                              onChange(
                                sanitise({
                                  ...settings,
                                  rhythmPatternId: option.id,
                                  cellId: cell.id,
                                }),
                              )
                            }
                          >
                            {cell.name}
                          </button>
                          {/* The little edit the player asked for (2026-09-04):
                              straight into the note editor, no grid. */}
                          <button
                            type="button"
                            className="segmented__option pattern-card__edit"
                            aria-label={`Edit ${cell.name}`}
                            onClick={() => setCellEditing({ pattern: option, cell })}
                          >
                            ✎
                          </button>
                        </span>
                      );
                    })}
                    {/* Author a note progression on THIS pattern — packaged or
                        custom alike; the cell snapshots the bars at birth. */}
                    <button
                      type="button"
                      className="segmented__option"
                      onClick={() => setCellEditing({ pattern: option, cell: null })}
                    >
                      {t('rhythm.newCell')}
                    </button>
                    {/* A custom rhythm is edited from its own card now — the
                        ✎-chip shelf beside "+ New rhythm" is gone (the player
                        disliked the labels it grew per authored line). */}
                    {customRhythms.some((custom) => custom.id === option.id) && (
                      <button
                        type="button"
                        className="segmented__option"
                        onClick={() =>
                          setRhythmEditing(customRhythms.find((c) => c.id === option.id) ?? null)
                        }
                      >
                        ✎ {t('rhythm.editRhythm')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="row">
          <button
            type="button"
            className="segmented__option"
            onClick={() => setRhythmEditing(null)}
          >
            {t('rhythm.new')}
          </button>
        </div>
      </div>

      {rhythmEditing !== 'closed' && (
        <RhythmPatternEditor
          editing={rhythmEditing}
          instrumentId={settings.instrumentId}
          clef={settings.clef}
          onSaved={(id) => {
            update('rhythmPatternId', id);
            setRhythmShelf((n) => n + 1);
            setRhythmEditing('closed');
          }}
          onClose={() => {
            setRhythmShelf((n) => n + 1);
            setRhythmEditing('closed');
          }}
        />
      )}

      {cellEditing !== 'closed' && (
        <CellEditor
          pattern={cellEditing.pattern}
          editing={cellEditing.cell}
          instrumentId={settings.instrumentId}
          clef={settings.clef}
          onSaved={(id) => {
            /* The freshly written line becomes the selection, as a saved
               rhythm does — the tool hands you the thing it made. */
            onChange(
              sanitise({ ...settings, rhythmPatternId: cellEditing.pattern.id, cellId: id }),
            );
            setRhythmShelf((n) => n + 1);
            setCellEditing('closed');
          }}
          onClose={() => {
            setRhythmShelf((n) => n + 1);
            setCellEditing('closed');
          }}
        />
      )}
    </>
  ) : null;

  const sourceField = (
    <div className="field">
      <span className="field__label">{t('home.tunesFrom')}</span>
      <div className="chips">
        <button
          type="button"
          aria-pressed={chosenIds.length === 0}
          className={`chip ${chosenIds.length === 0 ? 'is-selected' : ''}`}
          onClick={() =>
            onChange({ ...settings, collectionIds: [], themeSteps: [], selection: 'medley' })
          }
        >
          {t('home.composed')}
        </button>
        {COLLECTIONS.map((collection) => {
          const on = chosenIds.includes(collection.id);
          return (
            <button
              key={collection.id}
              type="button"
              aria-pressed={on}
              className={`chip ${on ? 'is-selected' : ''}`}
              onClick={() => toggleCollection(collection.id)}
            >
              {collection.name}
              <span className="chip__count">{fitsOf(collection.themes, settings.difficultyId)}</span>
            </button>
          );
        })}
      </div>
      {chosenIds.length === 0 ? (
        <p className="field__note muted">{t('home.composedNote')}</p>
      ) : (
        /* Only the medley can come up empty here — a defined run with no
           steps left is a medley again by `sanitise`'s rule, and a step
           cannot be built that will not play. */
        playable === 0 && (
          <p className="field__note muted">{t('home.nothingAtLevel')}</p>
        )
      )}
    </div>
  );

  /*
   * Medley or playlist, and the door to building one.
   *
   * Two states rather than an implicit one: an empty list of picks used to
   * mean "everything", which is a control that looks broken until somebody
   * explains it. Saying which of the two is in force costs one row and answers
   * the question before it is asked.
   */
  const selectionField = chosenIds.length > 0 ? (
    <div className="field">
      <span className="field__label">{t('home.selection')}</span>
      <div className="chips">
        <button
          type="button"
          aria-pressed={!defined}
          className={`chip ${!defined ? 'is-selected' : ''}`}
          onClick={() => onChange({ ...settings, selection: 'medley' })}
        >
          {t('home.medley')}
        </button>
        <button
          type="button"
          aria-pressed={defined}
          className={`chip ${defined ? 'is-selected' : ''}`}
          onClick={() => setPicking(true)}
        >
          {t('home.defined')}
          {steps.length > 0 && <span className="chip__count">{steps.length}</span>}
        </button>
      </div>
      <p className="field__note muted">
        {defined ? tCount('home.playingSteps', steps.length) : t('home.medleyNote')}
      </p>
    </div>
  ) : null;

  const difficultyField = (
        <div className="field">
          <span className="field__label">{t('home.difficulty')}</span>
          <div className="segmented segmented--row">
            {DIFFICULTIES.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`segmented__option ${
                  settings.difficultyId === option.id ? 'is-selected' : ''
                }`}
                onClick={() => update('difficultyId', option.id)}
              >
                {/* For scales and arpeggios the useful thing to know is how far
                    the pattern reaches, not what the level is called. */}
                {t(
                  `difficulty.${option.id}${patternKind ? '.patterns' : ''}` as StringKey,
                )}
              </button>
            ))}
          </div>
          <p className="field__note muted">
            {t(
              `difficulty.${difficulty.id}${patternKind ? '.patternsBlurb' : '.blurb'}` as StringKey,
            )}
          </p>
          {patternKind && shortenedSpan && (
            <p className="field__note muted">
              {t('home.shortenedSpan', {
                instrument: instrument.name,
                key: keyName(settings.fifths),
                span: shortenedSpan,
              })}
            </p>
          )}
        </div>
  );

  const timeSignatureField = (
    <label className="field field--beside">
      <span className="field__label">{t('home.timeSignature')}</span>
      <select
        value={`${settings.beatsPerBar}/${settings.beatUnit}`}
        onChange={(event) => {
          const [beatsPerBar, beatUnit] = event.target.value.split('/').map(Number);
          onChange({ ...settings, beatsPerBar, beatUnit });
        }}
      >
        {TIME_SIGNATURES.map((time) => (
          <option key={time.label} value={`${time.beatsPerBar}/${time.beatUnit}`}>
            {time.label}
          </option>
        ))}
      </select>
    </label>
  );

  const rangeField = (
    <RangePicker
      instrument={instrument}
      clef={settings.clef}
      fifths={settings.fifths}
      range={settings.range}
      onChange={(range) => update('range', range)}
    />
  );

  const registerField = (
    <div className="field">
      <span className="field__label">{t('home.register')}</span>
      <div className="segmented">
        {REGISTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`segmented__option ${settings.register === option.id ? 'is-selected' : ''}`}
            onClick={() => update('register', option.id)}
          >
            {t(`register.${option.id}` as StringKey)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="screen screen--settings">
      {/* Over the screen rather than inside the panel: choosing a run's tunes
          wants the whole width, and the panel it is launched from is a column
          on a phone. Closing it settles the mode — steps in the list mean a
          defined run, a list left empty is a medley, and `sanitise` enforces
          the empty half of that rule everywhere else too. */}
      {picking && (
        <DefinedPicker
          settings={settings}
          keyName={keyName}
          onChange={onChange}
          onClose={() => {
            setPicking(false);
            if (settings.themeSteps.length > 0 && !defined) {
              onChange(sanitise({ ...settings, selection: 'defined' }));
            }
          }}
        />
      )}
      <header className="masthead masthead--home">
        <h1>Brass Master</h1>
        {/*
          The instrument as identity, not a panel: chosen once — the player
          owns a tuba — and true in both modes, so it lives beside the title
          as a chip that says what you are and opens where to change it
          (ruled by the player, 2026-08-23).
        */}
        <button
          type="button"
          className="button button--quiet instrument-chip"
          aria-expanded={showInstrument}
          onClick={() => setShowInstrument((open) => !open)}
        >
          {/* Without the parenthetical: the chip is identity, and on a
              360-wide phone "Eb Bass (Tuba) · Treble" truncated mid-word,
              which read worse than saying less. The full name is one tap
              away, on the sheet this opens. */}
          {instrument.name.replace(/\s*\(.*\)/, '')} ·{' '}
          {settings.clef === 'treble' ? t('clefShort.treble') : t('clefShort.bass')}
        </button>
        {/* "A little setting up the top" — the player's own words for where
            the language belongs (2026-08-28). Its own names, because nobody
            hunts for their language in another. */}
        <select
          className="locale-select"
          aria-label={t('home.language')}
          value={settings.locale}
          onChange={(event) => onChange({ ...settings, locale: event.target.value })}
        >
          {LOCALES.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
      </header>

      {/* The two ways in, side by side with literally equal billing — the
          §1.4 ruling honoured harder than two doors on an interstitial
          nobody wanted to be on. The choice is remembered, so each kind of
          returning player opens one tap from Start. */}
      {onMode && (
        <div className="segmented home-mode">
          <button
            type="button"
            className={`segmented__option ${mode === 'structured' ? 'is-selected' : ''}`}
            aria-pressed={mode === 'structured'}
            onClick={() => onMode('structured')}
          >
            {t('home.structured')}
          </button>
          <button
            type="button"
            className={`segmented__option ${mode === 'free' ? 'is-selected' : ''}`}
            aria-pressed={mode === 'free'}
            onClick={() => onMode('free')}
          >
            {t('home.free')}
          </button>
        </div>
      )}

      {showInstrument && (
        <div className="instrument-sheet">
          <label className="field">
            <span className="field__label">{t('home.instrument')}</span>
            <select
              value={settings.instrumentId}
              onChange={(event) => {
                const next = instrumentById(event.target.value);
                const clef = availableClefs(next).includes(settings.clef)
                  ? settings.clef
                  : availableClefs(next)[0];
                onChange({ ...settings, instrumentId: next.id, clef });
              }}
            >
              {INSTRUMENTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span className="field__label">{t('home.clef')}</span>
            <div className="segmented">
              {clefs.map((clef) => (
                <button
                  key={clef}
                  type="button"
                  className={`segmented__option ${settings.clef === clef ? 'is-selected' : ''}`}
                  onClick={() => update('clef', clef)}
                >
                  {clef === 'treble' ? t('clef.treble') : t('clef.bass')}
                </button>
              ))}
            </div>
          </div>

          <p className="field__note muted">
            {t(settings.clef === 'bass' ? 'home.writtenRangeConcert' : 'home.writtenRange', {
              low: formatPitch(spellInKey(low, settings.fifths)),
              high: formatPitch(spellInKey(high, settings.fifths)),
            })}
          </p>
        </div>
      )}

      {mode === 'structured' && structured}

      {mode === 'free' && (
        <>

      {/*
        No Exercise panel around the materials any more (the player,
        2026-08-23 evening): once Playing, Advanced and the instrument had
        moved out, the panel was one accordion wrapping another — a box of
        boxes. The material boxes ARE the accordion now, at the top level,
        with the open one showing what is chosen.
      */}

        {/*
          One box per material, and the open one is the material.

          Chosen over a chooser with the settings underneath it, on the player's
          call and for the reason they gave: presented with too many options at
          once, attention snaps. Most of what used to be on this screen applies
          to one material and is noise beside the others — a register is a
          question about where a scale sits and means nothing to a written tune,
          a range is a question about the pool free material is drawn from and
          means nothing to either.

          **Opening a box is choosing that material.** Deliberately not two
          separate things: a selected box and an expanded box are two states
          saying almost the same thing, and two states saying almost the same
          thing can disagree — the screen would then have to answer what it means
          to expand Themes while Scales is selected, and there is no good answer.
          So there is one state, `settings.kind`, and the open box shows it.

          Which is also why the open box does not close. Closing it would leave
          no material chosen, and an exercise has to be made of something. The
          button carries both `aria-pressed` and `aria-expanded` because both are
          true of it and neither implies the other to a screen reader.
        */}
        {/*
          Four modes, four tabs, always in view (the player, 2026-08-23
          evening): the accordion said "there are others" only at its edges,
          and someone deep in the drills grid had no edges on screen. The tabs
          are sticky, so however far the page scrolls, the four answers to
          what-am-I-playing stay one glance and one tap away.

          My Music keeps its door nature — a part is opened from a library,
          not configured in place — so its tab navigates rather than selects,
          and never shows as the current one.
        */}
        <div className="mode-tabs">
          {onImport && (
            <button type="button" className="mode-tab" onClick={onImport}>
              <strong>{t('home.myMusic')}</strong>
            </button>
          )}
          {EXERCISE_KINDS.map((kind) => (
            <button
              key={kind.id}
              type="button"
              className={`mode-tab ${settings.kind === kind.id ? 'is-selected' : ''}`}
              aria-pressed={settings.kind === kind.id}
              // Each material brings its own key and difficulty with it;
              // see `switchMaterial`.
              onClick={() => onChange(switchMaterial(settings, kind.id as ExerciseKind))}
            >
              <strong>{t(`kind.${kind.id}` as StringKey)}</strong>
            </button>
          ))}
        </div>

        <p className="muted mode-blurb">{t(`kind.${material.id}.blurb` as StringKey)}</p>

        <div className="mode__body">
          {/* Which shape, before which key: the drill is what the tab *is*,
              and everything under it qualifies it. */}
          {isPattern(settings.kind) && drillField}
          {/* Which pattern is what the rhythm tab *is* — and the whole of
              what it asks: no key (the run is keyless by rhythm-plan.md's
              own constraint), no difficulty (the spine grades the patterns),
              no signature (the pattern brings its own metre). */}
          {settings.kind === 'rhythm' && patternField}
          {/* Where the tunes come from is what this tab *is*, so it sits
              where the drill does and above what qualifies it. */}
          {settings.kind === 'themes' && sourceField}
          {/* A defined run's keys live on its steps, nominated in the picker
              tune by tune — the grid here would be a second control saying
              less than the first. The same statement the missing
              time-signature control makes for a collection: the material has
              already answered. */}
          {!(settings.kind === 'themes' && defined) && settings.kind !== 'rhythm' && keysField}
          {settings.kind !== 'rhythm' && difficultyField}
          {/* A scale is a shape played against a click rather than a piece
              with a metre, so it is always four-four and asks instead which
              end of the horn to sit at. A collection asks nothing: each tune
              plays in its own signature, and the control it gets instead is
              which tunes. */}
          {isPattern(settings.kind)
            ? registerField
            : settings.kind === 'rhythm'
              ? null
              : settings.kind === 'themes' && chosenIds.length > 0
                ? selectionField
                : timeSignatureField}
          {/* The pool free material is drawn from. A pattern is placed by its
              tonic and a theme is written already, so neither has a pool to
              ask about. */}
          {settings.kind === 'phrases' && rangeField}
          {/* Moved from Advanced, 2026-08-23: it biases what the generator
              writes, so it belongs with the material it biases — and it only
              ever applied to sight-reading. */}
          {settings.kind === 'phrases' && (
            <label className="field field--inline">
              <input
                type="checkbox"
                checked={settings.weakNoteDrilling}
                onChange={(event) => update('weakNoteDrilling', event.target.checked)}
              />
              <span>{t('home.favourWrong')}</span>
            </label>
          )}
        </div>


      {/*
        No Playing panel and no Advanced panel, since 2026-08-23. This screen
        answers *what to play*; how the run will go — reading mode, the beat,
        the sound, fingerings, the tempo — is chosen on the Ready screen, the
        gate every run already passes through, with the rarer preferences
        behind its cog. See `ReadyControls` for the admission rule. The
        credits and the version stamp travelled with them.
      */}

      {/*
        Start, pinned again — the third ruling on this strip, and each one
        answered a different disease. It sat over the list translucent and
        tall (tempo, output note and all) and buried the panels on a 360-wide
        phone; then it unstuck when content overflowed, which cured the lie
        but let Start wander off-screen. What changed tonight (the player,
        2026-08-23 evening) is the frame around it: the mode tabs stick to the
        top, the strip sticks to the bottom, and between them the one page
        scrolls — so the strip is now short (Start and a version line), solid,
        and the content below gets clearance to scroll fully out from under
        it. The overlap lie is cured structurally rather than conditionally,
        and the conditional machinery went with it.

        Fixed, not sticky, after the first build of this frame: sticky never
        leaves the flow, so the scroll clearance meant for the content ended
        up *beneath* the strip, and at full scroll the page slid out under it
        — "coming out the other end" (the player, same evening). Fixed takes
        the strip out of the flow entirely; the clearance on the screen is
        then genuinely the end of the page.

        The version and corpus line rides with Start (asked for, same evening)
        so a stale cached copy announces itself on the first screen; the full
        credits stay behind the gate's Preferences.
      */}
      <div className="actions actions--pinned" ref={stripRef}>
        {/*
          Which output the sound is being sent early for, where it cannot be
          missed. The choice does not follow the device — the browser cannot
          say what is in the player's ears — so a headset left chosen after
          moving back to the phone's speaker sends every note a fifth of a
          second early, and nothing on the play screen says why. Said here,
          beside Start, only when a headset is chosen, with the way back.
        */}
        {/* Only where an adjustment is actually in force. A lead of nought is
            not news, and this note exists to catch a headset left chosen after
            the headset came off — which sent every note a fifth of a second
            early and cost an evening's diagnosis, twice. */}
        {output && output.leadMs > 0 && (
          <p className="field__note muted output-in-use">
            Sound brought forward {output.leadMs} ms for {output.name}.{' '}
            <button
              type="button"
              className="button button--quiet output-in-use__switch"
              onClick={() => update('audioOutputId', DEVICE_OUTPUT_ID)}
            >
              Using this device&apos;s speaker
            </button>
          </p>
        )}

        <button type="button" className="button button--primary button--large" onClick={onStart}>
          {t('home.start')}
        </button>
        <p className="field__note muted strip-version">
          v{__APP_VERSION__} · corpus {CORPUS.revision} ({CORPUS.cells} cells)
        </p>
      </div>
        </>
      )}
    </div>
  );
}
