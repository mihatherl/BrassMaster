import { useEffect, useRef, useState, type ReactNode } from 'react';
import { INSTRUMENTS, availableClefs, instrumentById, writtenRange } from '../domain/instruments';
import { describeFifths, MAJOR_KEYS, orderByCloseness } from '../domain/keys';
import { formatPitch } from '../domain/pitch';
import { spellInKey } from '../domain/keys';
import { COLLECTIONS, themeById, themesOf } from '../exercise/collections';
import { themesFor } from '../exercise/phrases';
import type { Theme } from '../exercise/theme';
import { DIFFICULTIES } from '../exercise/difficulty';
import { DRILLS, drillById, isPattern, patternSpanFor } from '../exercise/generate';
import { EXERCISE_KINDS } from '../exercise/types';
import type { ExerciseKind } from '../exercise/types';
import { RangePicker } from './RangePicker';
import {
  REGISTERS,
  DEFAULT_SETTINGS,
  DEVICE_OUTPUT_ID,
  MAX_KEYS_IN_PLAY,
  sanitise,
  switchMaterial,
  PLAYBACK_MODES,
  READING_MODES,
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
interface PanelProps {
  id: string;
  title: string;
  /** What is currently chosen, shown only while the section is shut. */
  values: string;
  open: boolean;
  onToggle: (id: string, open: boolean) => void;
  children: ReactNode;
}

function Panel({ id, title, values, open, onToggle, children }: PanelProps) {
  return (
    <details
      className="panel"
      id={`panel-${id}`}
      open={open}
      onToggle={(event) => onToggle(id, event.currentTarget.open)}
    >
      <summary className="panel__summary">
        <span className="panel__heading">
          <span className="panel__title">{title}</span>
          <span className="panel__values">{values}</span>
        </span>
      </summary>
      {children}
    </details>
  );
}

/**
 * Keys to a row, which decides what the window opens on.
 *
 * Five, and not an arbitrary five: fifteen keys in rows of five puts B flat, F,
 * C, G and D — two flats to two sharps — in the middle row on their own, which
 * is where nearly all brass band reading lives. The rows either side hold the
 * keys a player goes looking for rather than the ones they land on.
 */
const KEYS_PER_ROW = 5;

const KEY_ROWS = Array.from(
  { length: Math.ceil(MAJOR_KEYS.length / KEYS_PER_ROW) },
  (_, row) => MAJOR_KEYS.slice(row * KEYS_PER_ROW, row * KEYS_PER_ROW + KEYS_PER_ROW),
);

/** Joins the parts of a collapsed section's summary line. */
function summarise(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

/**
 * A key's accidentals as a symbol and a count: `3♭`, `2♯`, or nothing for C.
 *
 * Enough for a player to recognise a key they half-know without the sentence
 * the dropdown used to spell out. The full wording is still there for a screen
 * reader, which cannot make anything of a sharp sign on its own.
 */
function accidentalCount(fifths: number): string {
  if (fifths === 0) return '';
  return `${Math.abs(fifths)}${fifths > 0 ? '♯' : '♭'}`;
}

function describeSpan(semitones: number): string {
  if (semitones >= 24) return 'two octaves';
  if (semitones >= 12) return 'one octave';
  // "A fifth" rather than "the first five notes", because the shortened thing
  // may be a chord: a triad squeezed into a fifth plays three notes, not five.
  if (semitones >= 7) return 'a fifth';
  return 'a very short pattern';
}

/**
 * Building a defined run: what is available on the left, what will play on the
 * right.
 *
 * Two columns rather than a list of toggles, because a playlist is an ordered
 * thing with repeats and a toggle list is a set — and the difference is the
 * whole feature. Tapping a tune on the left appends it to the right; tapping
 * one on the right takes that copy out. The same tune may be added as often as
 * the player likes, which is how somebody drills the one that is giving them
 * trouble.
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
  collectionIds,
  picks,
  onChange,
  onClose,
}: {
  collectionIds: readonly string[];
  picks: readonly string[];
  onChange: (picks: string[]) => void;
  onClose: () => void;
}) {
  const groups = COLLECTIONS.filter((collection) => collectionIds.includes(collection.id)).map(
    (collection) => ({
      collection,
      themes: [...collection.themes].sort((a, b) => a.name.localeCompare(b.name)),
    }),
  );
  const named = groups.length > 1;

  const detail = (theme: Theme) =>
    `${theme.bars} bars · ${theme.difficulty} · ${theme.metres.map(([n, d]) => `${n}/${d}`).join(', ')}`;

  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label="Choose the tunes to play">
      <div className="sheet__body picker">
        <div className="picker__column">
          <h3 className="picker__heading">Available</h3>
          <div className="picker__list">
            {groups.map(({ collection, themes }) => (
              <div key={collection.id}>
                {named && <p className="picker__group">{collection.name}</p>}
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className="picker__tune"
                    onClick={() => onChange([...picks, theme.id])}
                  >
                    <span className="picker__name">{theme.name}</span>
                    <span className="picker__detail">{detail(theme)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="picker__column">
          <h3 className="picker__heading">
            Playing {picks.length > 0 && <span className="chip__count">{picks.length}</span>}
          </h3>
          <div className="picker__list">
            {picks.length === 0 && (
              <p className="field__note muted">
                Tap a tune on the left to add it. Add one twice to play it twice.
              </p>
            )}
            {picks.map((id, at) => {
              const theme = themeById(id);
              if (!theme) return null;
              return (
                <button
                  /* Position, not id: the same tune may be here more than once,
                     and removing the third copy must not remove the first. */
                  key={`${id}-${at}`}
                  type="button"
                  className="picker__tune picker__tune--chosen"
                  onClick={() => onChange(picks.filter((_, i) => i !== at))}
                >
                  <span className="picker__name">
                    {at + 1}. {theme.name}
                  </span>
                  <span className="picker__detail">{detail(theme)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="sheet__actions">
        <button type="button" className="button button--quiet" onClick={() => onChange([])}>
          Clear
        </button>
        <button type="button" className="button button--primary" onClick={onClose}>
          Done
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
  const keyName = (fifths: number, short = false): string => {
    const key = MAJOR_KEYS.find((k) => k.fifths === fifths);
    if (!key) return '';
    if (minorKeys) return short ? `${key.relativeMinor}m` : `${key.relativeMinor} minor`;
    return short ? key.name : `${key.name} major`;
  };
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
   * compass alone. With tunes picked by hand the level stops filtering too —
   * naming the tunes has already answered that question — so what remains is
   * only whether the picks fit the instrument at all.
   */
  const chosenIds = settings.collectionIds;
  const picks = settings.themeIds;
  const defined = settings.selection === 'defined';
  const fitsOf = (corpus: readonly Theme[], level?: string) =>
    themesFor({
      instrument,
      clef: settings.clef,
      fifths: settings.fifths,
      difficulty: level,
      corpus,
    }).length;
  /* What a run would actually be handed, which is what the note has to report:
     a playlist ignores the level, a medley does not. */
  const playable = defined
    ? fitsOf(picks.map((id) => themeById(id)).filter((t): t is Theme => t !== undefined))
    : fitsOf(themesOf(chosenIds), settings.difficultyId);

  // Enough of each section to see at a glance what is set, without reproducing
  // the whole screen in miniature — the long sections show only what matters.
  const keySignature = MAJOR_KEYS.find((k) => k.fifths === settings.fifths);
  const material = EXERCISE_KINDS.find((k) => k.id === settings.kind);
  const reading = READING_MODES.find((m) => m.id === settings.readingMode);
  const sound = PLAYBACK_MODES.find((m) => m.id === settings.playbackMode);
  const output = settings.audioOutputs.find((o) => o.id === settings.audioOutputId);

  const panelValues = {
    exercise: summarise(
      // Every key in play, opening one first, since a summary that named only
      // the first would hide the whole of a modulating exercise.
      settings.keySet.length > 1
        ? orderByCloseness(settings.fifths, settings.keySet)
            .map((f) => keyName(f, true))
            .filter(Boolean)
            .join(' → ')
        : keySignature && keyName(settings.fifths),
      // The drill's name says more than the box's: "Dominant 7th" is what will
      // be practised, where "Drills" only says where to look for it.
      patternKind ? drill.name : material?.name,
      // Which music, when the player has said: the collection, and how much of
      // it they narrowed to. The same reason the drill's name is worth more
      // than "Drills" — a summary should recite the choices, not the defaults.
      settings.kind === 'themes' && chosenIds.length > 0
        ? summarise(
            COLLECTIONS.filter((c) => chosenIds.includes(c.id))
              .map((c) => c.name)
              .join(' + '),
            defined ? `${picks.length} chosen` : undefined,
          )
        : undefined,
      patternKind ? difficulty.patterns.label : difficulty.name,
      // Only when it has been asked for. Left to the difficulty it is not a
      // choice the player made, and a summary should not recite the defaults.
      !patternKind && settings.kind !== 'themes' && settings.range
        ? `${formatPitch(spellInKey(settings.range.low, settings.fifths))}–${formatPitch(
            spellInKey(settings.range.high, settings.fifths),
          )}`
        : undefined,
    ),
    playing: summarise(
      // The tempo leads, because it left the Start strip (see the note at the
      // strip) and this line is what keeps it one glance away regardless.
      `${settings.tempo} bpm`,
      reading?.name,
      sound?.name,
      settings.conductorEnabled ? 'conductor' : settings.metronomeEnabled ? 'metronome' : undefined,
    ),
    // Only what has been moved off its default, so a section nobody has opened
    // says nothing rather than reciting the settings it came with.
    advanced: summarise(
      settings.variableTempo ? 'variable tempo' : undefined,
      settings.countInBars !== DEFAULT_SETTINGS.countInBars
        ? settings.countInBars === 0
          ? 'no count-in'
          : `${settings.countInBars}-bar count-in`
        : undefined,
      settings.timingTolerance !== DEFAULT_SETTINGS.timingTolerance ? 'timing' : undefined,
      settings.scrollSpeed !== DEFAULT_SETTINGS.scrollSpeed ? 'scroll speed' : undefined,
      settings.conductorStyle !== DEFAULT_SETTINGS.conductorStyle ? 'conductor style' : undefined,
      settings.cushionLevel !== DEFAULT_SETTINGS.cushionLevel ? 'cushion' : undefined,
      settings.weakNoteDrilling !== DEFAULT_SETTINGS.weakNoteDrilling ? 'weak notes' : undefined,
      // The phone's own speaker is the default and says nothing; a headset in
      // use is worth a word, since it changes when every sound is sent.
      output ? output.name : undefined,
    ),
  };

  /*
   * Every section shut on arrival, every time.
   *
   * The state used to be remembered, which meant coming back from a run to
   * whatever had been left open — usually everything, since opening a section
   * is how you change anything. Shut, the whole screen is six lines saying
   * what is set and a Start button, which is what someone returning for
   * another go actually wants to see.
   */
  const [openPanels, setOpenPanels] = useState<string[]>([]);

  /*
   * Whether the screen's content overflows its viewport, which decides if the
   * Start strip may stick. Re-measured on every render (settings change what
   * is drawn), on resize (the observer), and on a panel opening or closing —
   * `toggle` does not bubble, so it is caught in the capture phase.
   */
  const screenRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const measure = () => setOverflowing(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    el.addEventListener('toggle', measure, true);
    return () => {
      observer?.disconnect();
      el.removeEventListener('toggle', measure, true);
    };
  });
  const isOpen = (id: string) => openPanels.includes(id);
  const setOpen = (id: string, open: boolean) => {
    setOpenPanels((current) =>
      open ? [...new Set([...current, id])] : current.filter((panel) => panel !== id),
    );
    /*
     * An opened section comes to the top of the screen.
     *
     * Without it, opening *Exercise* leaves its contents starting most of a
     * screen down — behind the title, My Music, the instrument and two collapsed
     * material boxes — so a section that fits the window comfortably still
     * cannot be seen in it. The player's report is that people get lost in here,
     * and being shown the top half of a thing you have just asked for is most of
     * how that happens.
     *
     * After a frame, because the section has to have grown before there is
     * anything to scroll to.
     */
    if (!open) return;
    requestAnimationFrame(() => {
      document.getElementById(`panel-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  };

  /*
   * Which row of keys the window rests on.
   *
   * The window is two rows tall and the rows are three, so it shows one row
   * whole with half of a row above and below — enough to say *there is more this
   * way* without a scrollbar having to say it, and enough that a thumb knows
   * which way to move.
   *
   * It opens on the row holding the key the exercise starts in, rather than
   * always on the middle one. Nearly always they are the same row: two flats to
   * two sharps is the middle five by construction, and that is where brass band
   * reading lives. When they are not — an Eb player, which is the default — a
   * control that opened with the current choice half out of sight would be
   * hiding the one thing it most has to say.
   *
   * Set when the section opens rather than on mount: a shut `<details>` hides
   * its children outright, and an element with no box has no scroll to set.
   */
  const keysWindow = useRef<HTMLDivElement>(null);
  const exerciseOpen = isOpen('exercise');
  const startingKey = settings.keySet[0];

  useEffect(() => {
    const window_ = keysWindow.current;
    if (!window_ || !exerciseOpen) return;
    const row = window_.children[
      Math.floor(MAJOR_KEYS.findIndex((k) => k.fifths === startingKey) / KEYS_PER_ROW)
    ] as HTMLElement | undefined;
    if (!row) return;
    // Centred by hand rather than by `scrollIntoView`, which would also scroll
    // the page to bring the window itself into view — and the player has just
    // opened the section, so the page is already where they put it.
    window_.scrollTop = row.offsetTop - (window_.clientHeight - row.offsetHeight) / 2;
  }, [exerciseOpen, startingKey]);

  /*
   * The drill window, kept the same way as the keys above and for the same
   * reason: it is a window onto a longer list — six entries now, ten once the
   * named minors land, which is what ruled out a row of chips — and the one
   * thing it most has to say is which drill is chosen. Centring on the choice
   * also shows half a row of what lies beyond, which is the scrollbar's job
   * done without a scrollbar.
   */
  const drillsWindow = useRef<HTMLDivElement>(null);
  const drillChosen = isOpen('exercise') && patternKind;
  const chosenDrillId = drill.id;

  useEffect(() => {
    const window_ = drillsWindow.current;
    if (!window_ || !drillChosen) return;
    const row = window_.children[DRILLS.findIndex((d) => d.id === chosenDrillId)] as
      | HTMLElement
      | undefined;
    if (!row) return;
    window_.scrollTop = row.offsetTop - (window_.clientHeight - row.offsetHeight) / 2;
  }, [drillChosen, chosenDrillId]);


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
      <span className="field__label">Keys</span>
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
      <div className="keys" ref={keysWindow}>
        {KEY_ROWS.map((row) => (
          <div className="keys__row" key={row[0].fifths}>
            {row.map((key) => {
              const chosen = settings.keySet.includes(key.fifths);
              const start = settings.keySet[0] === key.fifths;
              const full = settings.keySet.length >= MAX_KEYS_IN_PLAY;
              const only = chosen && settings.keySet.length === 1;
              return (
                <button
                  key={key.fifths}
                  type="button"
                  /*
                   * Beyond the cap only what is already chosen can be undone,
                   * and the last one standing cannot be — an exercise has to be
                   * in some key.
                   */
                  disabled={only || (!chosen && full)}
                  aria-pressed={chosen}
                  // The accidentals are shown as "3♭" beside the name, which a
                  // screen reader would spell out as a number and a symbol.
                  aria-label={`${keyName(key.fifths)}, ${describeFifths(key.fifths)}`}
                  className={`segmented__option key ${chosen ? 'is-selected' : ''} ${
                    start ? 'is-start' : ''
                  }`}
                  onClick={() => {
                    const next = chosen
                      ? settings.keySet.filter((f) => f !== key.fifths)
                      : [...settings.keySet, key.fifths];
                    if (next.length === 0) return;
                    onChange(sanitise({ ...settings, keySet: next }));
                  }}
                >
                  <span className="key__name">{keyName(key.fifths, true)}</span>
                  <span className="key__accidentals muted">{accidentalCount(key.fifths)}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {settings.keySet.length > 1 && (
        <p className="field__note muted">
          Starts in {keyName(settings.keySet[0], true)}, and changes key as it goes.
        </p>
      )}
      {naturalForDoubleSharp && (
        <p className="field__note muted">
          A book writes the raised seventh of {keyName(settings.fifths)} as a double sharp. This app
          never prints one, so it is written as the natural above.
        </p>
      )}
    </div>
  );

  const drillField = (
    <div className="field">
      <span className="field__label">Drill</span>
      <div className="drills" ref={drillsWindow}>
        {DRILLS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={settings.drillId === option.id}
            className={`segmented__option drill ${settings.drillId === option.id ? 'is-selected' : ''}`}
            onClick={() => update('drillId', option.id)}
          >
            {option.name}
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
    onChange({ ...settings, collectionIds: next, themeIds: [], selection: 'medley' });
  };

  const sourceField = (
    <div className="field">
      <span className="field__label">Tunes from</span>
      <div className="chips">
        <button
          type="button"
          aria-pressed={chosenIds.length === 0}
          className={`chip ${chosenIds.length === 0 ? 'is-selected' : ''}`}
          onClick={() =>
            onChange({ ...settings, collectionIds: [], themeIds: [], selection: 'medley' })
          }
        >
          Composed
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
        <p className="field__note muted">
          Fresh tunes written for this run. Choose one or more libraries to play written music
          instead.
        </p>
      ) : (
        playable === 0 && (
          <p className="field__note muted">
            {defined
              ? 'None of the tunes you chose fit this instrument in this key, so composed tunes will play instead.'
              : 'Nothing here is written at this level, so composed tunes will play instead. Try another level.'}
          </p>
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
      <span className="field__label">Selection</span>
      <div className="chips">
        <button
          type="button"
          aria-pressed={!defined}
          className={`chip ${!defined ? 'is-selected' : ''}`}
          onClick={() => onChange({ ...settings, selection: 'medley' })}
        >
          Random medley
        </button>
        <button
          type="button"
          aria-pressed={defined}
          className={`chip ${defined ? 'is-selected' : ''}`}
          onClick={() => setPicking(true)}
        >
          Defined
          {picks.length > 0 && <span className="chip__count">{picks.length}</span>}
        </button>
      </div>
      <p className="field__note muted">
        {defined
          ? `Playing ${picks.length} ${picks.length === 1 ? 'tune' : 'tunes'} in the order you set them.`
          : 'Whatever is in the chosen libraries, at the chosen level.'}
      </p>
    </div>
  ) : null;

  const difficultyField = (
        <div className="field">
          <span className="field__label">Difficulty</span>
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
                {patternKind ? option.patterns.label : option.name}
              </button>
            ))}
          </div>
          <p className="field__note muted">
            {patternKind ? difficulty.patterns.blurb : difficulty.blurb}
          </p>
          {patternKind && shortenedSpan && (
            <p className="field__note muted">
              {instrument.name} in {keyName(settings.fifths)} has only room for {shortenedSpan}, so
              that is what you will get — the drill&apos;s starting note sits too high for
              anything further.
            </p>
          )}
        </div>
  );

  const timeSignatureField = (
    <label className="field field--beside">
      <span className="field__label">Time signature</span>
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
      <span className="field__label">Register</span>
      <div className="segmented">
        {REGISTERS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`segmented__option ${settings.register === option.id ? 'is-selected' : ''}`}
            onClick={() => update('register', option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="screen screen--settings" ref={screenRef}>
      {/* Over the screen rather than inside the panel: choosing a run's tunes
          wants the whole width, and the panel it is launched from is a column
          on a phone. Closing it settles the mode — a list left empty is a
          medley, which `sanitise` also enforces. */}
      {picking && (
        <DefinedPicker
          collectionIds={chosenIds}
          picks={picks}
          onChange={(next) =>
            onChange({
              ...settings,
              themeIds: next,
              selection: next.length > 0 ? 'defined' : 'medley',
            })
          }
          onClose={() => setPicking(false)}
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
          {settings.clef === 'treble' ? 'Treble' : 'Bass'}
        </button>
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
            Structured Learning
          </button>
          <button
            type="button"
            className={`segmented__option ${mode === 'free' ? 'is-selected' : ''}`}
            aria-pressed={mode === 'free'}
            onClick={() => onMode('free')}
          >
            Free play
          </button>
        </div>
      )}

      {showInstrument && (
        <div className="instrument-sheet">
          <label className="field">
            <span className="field__label">Instrument</span>
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
            <span className="field__label">Clef</span>
            <div className="segmented">
              {clefs.map((clef) => (
                <button
                  key={clef}
                  type="button"
                  className={`segmented__option ${settings.clef === clef ? 'is-selected' : ''}`}
                  onClick={() => update('clef', clef)}
                >
                  {clef === 'treble' ? 'Treble' : 'Bass'}
                </button>
              ))}
            </div>
          </div>

          <p className="field__note muted">
            Written range {formatPitch(spellInKey(low, settings.fifths))} to{' '}
            {formatPitch(spellInKey(high, settings.fifths))}
            {settings.clef === 'bass' ? ' (concert pitch)' : ''}.
          </p>
        </div>
      )}

      {mode === 'structured' && structured}

      {mode === 'free' && (
        <>

      {/*
        My Music sits at the top, beside the settings rather than under them.
        It was in the footer beneath the licence credits to begin with, where
        the player who asked for it could not find it — credits read as the end
        of a page, so anything below them reads as furniture. This is not a
        setting for the exercise about to be generated; it is the other door out
        of this screen, and it belongs where a door goes.
      */}
      {onImport && (
        <button type="button" className="entry" onClick={onImport}>
          <span className="entry__title">My Music</span>
          <span className="entry__detail">Open a part you have imported, or add one</span>
        </button>
      )}

      <Panel id="exercise" title="Exercise" values={panelValues.exercise} open={isOpen('exercise')} onToggle={setOpen}>

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
        <div className="modes">
          {EXERCISE_KINDS.map((kind) => {
            const chosen = settings.kind === kind.id;
            const bodyId = `mode-${kind.id}`;
            return (
              <div
                key={kind.id}
                className={`mode ${chosen ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  className="mode__summary"
                  aria-pressed={chosen}
                  aria-expanded={chosen}
                  aria-controls={bodyId}
                  // Each material brings its own key and difficulty with it;
                  // see `switchMaterial`.
                  onClick={() => onChange(switchMaterial(settings, kind.id as ExerciseKind))}
                >
                  <strong>{kind.name}</strong>
                  <span className="muted">{kind.blurb}</span>
                </button>
                {chosen && (
                  <div className="mode__body" id={bodyId}>
                    {/* Which shape, before which key: the drill is what the
                        box *is*, and everything under it qualifies it. */}
                    {isPattern(kind.id) && drillField}
                    {/* Where the tunes come from is what this box *is*, so it
                        sits where the drill does and above what qualifies it. */}
                    {kind.id === 'themes' && sourceField}
                    {keysField}
                    {difficultyField}
                    {/* A scale is a shape played against a click rather than a
                        piece with a metre, so it is always four-four and asks
                        instead which end of the horn to sit at. A collection
                        asks nothing: each tune plays in its own signature, and
                        the control it gets instead is which tunes. */}
                    {isPattern(kind.id)
                      ? registerField
                      : kind.id === 'themes' && chosenIds.length > 0
                        ? selectionField
                        : timeSignatureField}
                    {/* The pool free material is drawn from. A pattern is placed
                        by its tonic and a theme is written already, so neither
                        has a pool to ask about. */}
                    {kind.id === 'phrases' && rangeField}
                    {/* Moved from Advanced, 2026-08-23: it biases what the
                        generator writes, so it belongs with the material it
                        biases — and it only ever applied to sight-reading. */}
                    {kind.id === 'phrases' && (
                      <label className="field field--inline">
                        <input
                          type="checkbox"
                          checked={settings.weakNoteDrilling}
                          onChange={(event) => update('weakNoteDrilling', event.target.checked)}
                        />
                        <span>Favour notes I get wrong</span>
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/*
        No Playing panel and no Advanced panel, since 2026-08-23. This screen
        answers *what to play*; how the run will go — reading mode, the beat,
        the sound, fingerings, the tempo — is chosen on the Ready screen, the
        gate every run already passes through, with the rarer preferences
        behind its cog. See `ReadyControls` for the admission rule. The
        credits and the version stamp travelled with them.
      */}

      {/*
        Start stands alone, and only sticks where the whole screen fits.

        The tempo lived here from 2026-08-12 to 2026-08-23, on the ruling that
        it is the one setting a player reaches for every single time and must
        not be two taps down. The ruling was reversed by the player when the
        strip's height became the visible fault on a 360-wide phone: sticky
        pins the strip over the tail of the list the moment the content
        overflows, and the taller the strip, the more it buries — the Advanced
        panel sliced in half, the credits gone. The tempo now leads the Playing
        panel and its summary line, so it stays one glance away collapsed; and
        the strip stops sticking at all when the content overflows, because a
        strip drawn over fields it pretends are not there is a lie, where
        "scroll to Start" is merely how every long form on a phone behaves.
      */}
      <div className={`actions${overflowing ? '' : ' actions--sticky'}`}>
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
          Start
        </button>
      </div>
        </>
      )}
    </div>
  );
}
