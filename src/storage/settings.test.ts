// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { instrumentById, writtenRange } from '../domain/instruments';
import { COLLECTIONS, playableThemes } from '../exercise/collections';

import {
  AUDIO_LEAD_RANGE,
  audioLeadFor,
  DEFAULT_SETTINGS,
  DEVICE_OUTPUT,
  DEVICE_OUTPUT_ID,
  PLAYBACK_MODES,
  loadSettings,
  sanitise,
  saveSettings,
  switchMaterial,
} from './settings';

const STORAGE_KEY = 'brass-trainer:settings';

afterEach(() => localStorage.clear());

function store(value: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

describe('loading settings', () => {
  it('falls back to the defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('survives corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not json at all');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps stored values and fills the gaps from the defaults', () => {
    store({ tempo: 132, instrumentId: 'cornet' });
    const settings = loadSettings();
    expect(settings.tempo).toBe(132);
    expect(settings.instrumentId).toBe('cornet');
    expect(settings.difficultyId).toBe(DEFAULT_SETTINGS.difficultyId);
  });

  it('round-trips through saving', () => {
    const settings = { ...DEFAULT_SETTINGS, tempo: 96, playbackMode: 'off' as const };
    saveSettings(settings);
    expect(loadSettings()).toEqual(settings);
  });
});

describe('variable tempo, arriving in old settings files', () => {
  it('lands on off for anyone whose stored settings predate it', () => {
    store({ tempo: 96 });
    expect(loadSettings().variableTempo).toBe(false);
  });

  it('keeps an explicit choice', () => {
    store({ variableTempo: true });
    expect(loadSettings().variableTempo).toBe(true);
  });

  it('coerces anything that is not a real boolean to off', () => {
    store({ variableTempo: 'yes' });
    expect(loadSettings().variableTempo).toBe(false);
  });
});

describe('migrating the old playback switch', () => {
  it('keeps playback off for anyone who had turned it off', () => {
    // Playback used to be a boolean. Turning sound back on unasked would be a
    // rude surprise, particularly mid-rehearsal.
    store({ playbackEnabled: false });
    expect(loadSettings().playbackMode).toBe('off');
  });

  it('gives everyone else the reference tone they already had', () => {
    store({ playbackEnabled: true });
    expect(loadSettings().playbackMode).toBe('reference');
  });

  it('does not override an explicit choice', () => {
    store({ playbackEnabled: false, playbackMode: 'reference' });
    expect(loadSettings().playbackMode).toBe('reference');
  });
});

describe('a playback mode that no longer exists', () => {
  it('is not offered', () => {
    expect(PLAYBACK_MODES.map((mode) => mode.id)).toEqual(['reference', 'off']);
  });

  it('falls back for anyone who had it stored', () => {
    // "Play what I finger" was withdrawn. This list is the only thing deciding
    // what can be chosen, so a stored setting naming a mode that has gone must
    // degrade to something valid rather than to nothing at all.
    store({ playbackMode: 'fingered' });
    expect(loadSettings().playbackMode).toBe(DEFAULT_SETTINGS.playbackMode);
  });
});


describe('sanitising', () => {
  it('rejects an instrument that no longer exists', () => {
    expect(sanitise({ ...DEFAULT_SETTINGS, instrumentId: 'sackbut' }).instrumentId).toBe(
      DEFAULT_SETTINGS.instrumentId,
    );
  });

  it('moves to a clef the instrument can actually read', () => {
    // A cornet does not read bass clef, so a stored preference for it must not
    // survive into an exercise.
    const settings = sanitise({ ...DEFAULT_SETTINGS, instrumentId: 'cornet', clef: 'bass' });
    expect(settings.clef).toBe('treble');
  });

  it('leaves a clef the instrument does read', () => {
    const settings = sanitise({ ...DEFAULT_SETTINGS, instrumentId: 'euphonium', clef: 'bass' });
    expect(settings.clef).toBe('bass');
  });

  it('clamps values that are out of range', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      tempo: 10_000,
      scrollSpeed: -5,
      countInBars: 99,
      conductorStyle: -5,
    });
    expect(settings.tempo).toBeLessThanOrEqual(220);
    expect(settings.scrollSpeed).toBeGreaterThanOrEqual(4);
    expect(settings.countInBars).toBeLessThanOrEqual(2);
    // The style is fed straight to the phase warp. Above the range it is
    // harmless — the lag is capped — but below zero the warp inverts and the
    // tip travels backwards through the beat, so the floor is the one with
    // teeth and both ends are held anyway.
    expect(settings.conductorStyle).toBeGreaterThanOrEqual(0);
  });

  it('rejects nonsense numbers rather than passing them on', () => {
    const settings = sanitise({ ...DEFAULT_SETTINGS, tempo: Number.NaN });
    expect(Number.isFinite(settings.tempo)).toBe(true);
  });

  it('rejects unknown modes', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      readingMode: 'sideways' as never,
      playbackMode: 'kazoo' as never,
    });
    expect(settings.readingMode).toBe(DEFAULT_SETTINGS.readingMode);
    expect(settings.playbackMode).toBe(DEFAULT_SETTINGS.playbackMode);
  });

  it('rejects a key signature off the circle of fifths', () => {
    expect(sanitise({ ...DEFAULT_SETTINGS, fifths: 42 }).fifths).toBe(DEFAULT_SETTINGS.fifths);
  });
});

describe('a chosen range', () => {
  /*
   * Written pitch, so it moves with the clef and the instrument: a range picked
   * on an Eb bass in treble names different numbers on a euphonium in bass.
   * Clamped rather than cleared, because clearing would silently drop a choice
   * on a mis-tap and the stave beside the control shows where a clamped one
   * ended up.
   */
  const [low, high] = writtenRange(instrumentById('eb-bass'), 'treble');

  it('is left alone when it fits', () => {
    const range = { low: low + 3, high: low + 15 };
    expect(sanitise({ ...DEFAULT_SETTINGS, range }).range).toEqual(range);
  });

  it('is pulled inside the horn when it does not fit', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      range: { low: low - 20, high: high + 20 },
    });
    expect(settings.range).toEqual({ low, high });
  });

  it('is put the right way round', () => {
    // A stored file can say anything, and a backwards range would otherwise
    // reach the generator as an empty pool.
    const settings = sanitise({ ...DEFAULT_SETTINGS, range: { low: low + 12, high: low + 4 } });
    expect(settings.range).toEqual({ low: low + 4, high: low + 12 });
  });

  it('follows the clef, which restates every written pitch', () => {
    // Treble E flat bass and bass-clef euphonium share no written pitches at
    // all; a range kept from one is meaningless in the other, and comes back
    // as the nearest thing the new instrument can play.
    const [bassLow, bassHigh] = writtenRange(instrumentById('euphonium'), 'bass');
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      instrumentId: 'euphonium',
      clef: 'bass',
      range: { low: low + 3, high: low + 15 },
    });
    expect(settings.range!.low).toBeGreaterThanOrEqual(bassLow);
    expect(settings.range!.high).toBeLessThanOrEqual(bassHigh);
  });

  it('is nothing at all where nothing was chosen', () => {
    // Null is the difficulty deciding, which is the default and is not the
    // same as a range of none.
    expect(sanitise({ ...DEFAULT_SETTINGS, range: null }).range).toBeNull();
    expect(sanitise({ ...DEFAULT_SETTINGS, range: { low: NaN, high: 4 } }).range).toBeNull();
    expect(sanitise({ ...DEFAULT_SETTINGS, range: 'wide' as never }).range).toBeNull();
  });
});

describe('the drills, which used to be two materials', () => {
  /*
   * Scales and Arpeggios each had a box of their own until v2.16.0 merged them
   * into Drills with a picker. A stored kind naming either is somebody who
   * chose that material, and they must land on the drill their box played —
   * not on the default material, which is what an unrecognised kind falls to.
   */
  it('reads a stored Scales as the major scale drill', () => {
    const settings = sanitise({ ...DEFAULT_SETTINGS, kind: 'scales' } as never);
    expect(settings.kind).toBe('drills');
    expect(settings.drillId).toBe('major-scale');
  });

  it('reads a stored Arpeggios as the tonic arpeggio drill', () => {
    const settings = sanitise({ ...DEFAULT_SETTINGS, kind: 'arpeggios' } as never);
    expect(settings.kind).toBe('drills');
    expect(settings.drillId).toBe('tonic-arpeggio');
  });

  it('keeps a modern kind and drill as they are', () => {
    const settings = sanitise({ ...DEFAULT_SETTINGS, kind: 'drills', drillId: 'dominant-7th' });
    expect(settings.kind).toBe('drills');
    expect(settings.drillId).toBe('dominant-7th');
  });

  it('still opens an unrecognised kind on the default material', () => {
    // *Random notes* was dropped in v2.14.0; a file naming it predates the
    // drills too, so there is no better answer than the default.
    const settings = sanitise({ ...DEFAULT_SETTINGS, kind: 'random' } as never);
    expect(settings.kind).toBe(DEFAULT_SETTINGS.kind);
  });

  it('falls back to the major scale for a drill that does not exist', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      kind: 'drills',
      drillId: 'whole-tone' as never,
    });
    expect(settings.drillId).toBe('major-scale');
  });
});

describe('the fingering setting, which used to be a switch', () => {
  /*
   * It was a boolean — "show fingerings for notes I get wrong" — and became
   * three modes, because a fingering trainer is used in three frames of mind:
   * reading something new with the answers in front of you, practising with a
   * prompt where the trouble is, and playing it for real. Anyone updating the
   * app has one of the two old answers stored, and neither may be lost.
   */
  it('reads an old switch as the mode it meant', () => {
    const on = sanitise({ ...DEFAULT_SETTINGS, fingerings: undefined, fingeringHints: true } as never);
    const off = sanitise({ ...DEFAULT_SETTINGS, fingerings: undefined, fingeringHints: false } as never);

    expect(on.fingerings).toBe('trouble');
    expect(off.fingerings).toBe('never');
  });

  it('keeps a mode that is already one of the three', () => {
    expect(sanitise({ ...DEFAULT_SETTINGS, fingerings: 'always' }).fingerings).toBe('always');
    expect(sanitise({ ...DEFAULT_SETTINGS, fingerings: 'never' }).fingerings).toBe('never');
  });

  it('falls back to prompting where the trouble is', () => {
    // Nonsense in storage, or a settings file from before either existed.
    const odd = sanitise({ ...DEFAULT_SETTINGS, fingerings: 'sometimes' } as never);
    expect(odd.fingerings).toBe(DEFAULT_SETTINGS.fingerings);
  });
});

describe('the calibrated outputs', () => {
  /*
   * A list of outputs, each with how far behind the clock it is heard, and
   * which is in use. **The device's own speaker is one of them**, since
   * 2026-08-22: it used to be what "none of these" meant, unmeasurable and
   * described as needing nothing, which was one iPhone's behaviour written up
   * as a rule. Android is where that breaks and Android ships first.
   */
  const bose = { id: 'a', name: 'Bose', leadMs: 180, calibrations: 1 };
  const buds = { id: 'b', name: 'Buds', leadMs: 260, calibrations: 2 };
  const device = { ...DEVICE_OUTPUT };

  it('keeps a well-formed list and the choice from it', () => {
    const settings = sanitise({ ...DEFAULT_SETTINGS, audioOutputs: [bose, buds], audioOutputId: 'b' });
    expect(settings.audioOutputs).toEqual([device, bose, buds]);
    expect(settings.audioOutputId).toBe('b');
    expect(audioLeadFor(settings)).toBeCloseTo(0.26, 9);
  });

  it('always offers the device speaker, and falls back to it', () => {
    const gone = sanitise({ ...DEFAULT_SETTINGS, audioOutputs: [bose], audioOutputId: 'zzz' });
    expect(gone.audioOutputId).toBe(DEVICE_OUTPUT_ID);
    expect(gone.audioOutputs.some((o) => o.id === DEVICE_OUTPUT_ID)).toBe(true);
    // Nought until somebody measures it — which is now something they can do.
    expect(audioLeadFor(gone)).toBe(0);
  });

  it('remembers a measured device speaker rather than assuming it needs nothing', () => {
    const measured = sanitise({
      ...DEFAULT_SETTINGS,
      audioOutputs: [{ ...device, leadMs: 120, calibrations: 1 }],
      audioOutputId: DEVICE_OUTPUT_ID,
    });
    expect(audioLeadFor(measured)).toBeCloseTo(0.12, 9);
  });

  /* The route link is what the shell's automatic profile switch matches
     against, so it must survive storage — and junk must not, because a
     non-name would be matched against real hardware. */
  it('keeps a route name and drops one that is not a name', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      audioOutputs: [
        { ...bose, routeName: 'Bose QC45' },
        { ...buds, routeName: '' as never },
      ],
      audioOutputId: 'a',
    });
    expect(settings.audioOutputs.find((o) => o.id === 'a')?.routeName).toBe('Bose QC45');
    expect('routeName' in settings.audioOutputs.find((o) => o.id === 'b')!).toBe(false);
  });

  it('counts no measurements for an output that predates counting them', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      audioOutputs: [{ id: 'a', name: 'Bose', leadMs: 180 }] as never,
    });
    /* Absent is none, which is true of them: nobody had been asked, and the
       session warning is right to ask. */
    expect(settings.audioOutputs.find((o) => o.id === 'a')!.calibrations).toBe(0);
  });

  it('drops what is not an output and clamps a lead out of range', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      audioOutputs: [
        bose,
        { id: '', name: 'nameless', leadMs: 10 },
        { id: 'c', name: 'Slow', leadMs: 9000 },
        { id: 'a', name: 'Duplicate', leadMs: 1 },
        { id: 'd', name: '  ', leadMs: 50 },
        'not an output',
        null,
      ] as never,
      audioOutputId: 'c',
    });
    expect(settings.audioOutputs).toEqual([
      device,
      bose,
      { id: 'c', name: 'Slow', leadMs: AUDIO_LEAD_RANGE.max, calibrations: 0 },
      { id: 'd', name: 'Headphones', leadMs: 50, calibrations: 0 },
    ]);
    expect(settings.audioOutputId).toBe('c');
  });

  it('gives a settings file that predates outputs the device speaker', () => {
    store({ tempo: 90 });
    const settings = loadSettings();
    expect(settings.audioOutputs).toEqual([device]);
    expect(settings.audioOutputId).toBe(DEVICE_OUTPUT_ID);
  });
});

describe('a key and a difficulty per material', () => {
  /*
   * The pair in force stays where everything reads it; each material's own
   * pair waits in `materials`, put away on leaving and taken out on return.
   */
  const inDrills = sanitise({
    ...DEFAULT_SETTINGS,
    kind: 'drills',
    keySet: [2, 4],
    difficultyId: 'hard',
  });

  it('mirrors the pair in force under the material in force', () => {
    expect(inDrills.materials.drills).toEqual({ keySet: [2, 4], difficultyId: 'hard' });
    expect(inDrills.fifths).toBe(2);
  });

  it('carries the pair over to a material never chosen, and puts the old one away', () => {
    const inThemes = switchMaterial(inDrills, 'themes');
    expect(inThemes.kind).toBe('themes');
    expect(inThemes.keySet).toEqual([2, 4]);
    expect(inThemes.difficultyId).toBe('hard');
    expect(inThemes.materials.drills).toEqual({ keySet: [2, 4], difficultyId: 'hard' });
  });

  it('brings a material its own pair back when it is chosen again', () => {
    const inThemes = sanitise({
      ...switchMaterial(inDrills, 'themes'),
      keySet: [-2],
      difficultyId: 'beginner',
    });
    const back = switchMaterial(inThemes, 'drills');
    expect(back.keySet).toEqual([2, 4]);
    expect(back.fifths).toBe(2);
    expect(back.difficultyId).toBe('hard');
    // And themes' own pair is waiting for next time.
    expect(back.materials.themes).toEqual({ keySet: [-2], difficultyId: 'beginner' });
    expect(switchMaterial(back, 'themes').keySet).toEqual([-2]);
  });

  it('changes nothing for the material already chosen, or for imported music', () => {
    expect(switchMaterial(inDrills, 'drills')).toBe(inDrills);
    expect(switchMaterial(inDrills, 'imported')).toBe(inDrills);
  });

  it('drops a remembered pair that names keys or a difficulty that do not exist', () => {
    // Themes is in force here, so its entry is whatever is in force; the
    // other two are what was remembered, kept or dropped on their merits.
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      kind: 'themes',
      materials: {
        drills: { keySet: [1], difficultyId: 'impossible' },
        phrases: { keySet: [1, 1, 3], difficultyId: 'easy' },
      } as never,
    });
    expect(settings.materials.drills).toBeUndefined();
    expect(settings.materials.phrases).toEqual({ keySet: [1, 3], difficultyId: 'easy' });
    expect(settings.materials.themes).toEqual({ keySet: [-3], difficultyId: 'easy' });

    const badKeys = sanitise({
      ...DEFAULT_SETTINGS,
      kind: 'themes',
      materials: { drills: { keySet: [42], difficultyId: 'easy' } },
    });
    expect(badKeys.materials.drills).toBeUndefined();
  });

  it('starts with nothing remembered for a settings file that predates it', () => {
    store({ kind: 'themes', keySet: [1], difficultyId: 'easy' });
    const settings = loadSettings();
    // Only the material in force, mirrored from what was stored.
    expect(settings.materials).toEqual({ themes: { keySet: [1], difficultyId: 'easy' } });
  });
});

describe('the metronome volume', () => {
  it('is the level it always was by default, and is held between silent and that', () => {
    expect(DEFAULT_SETTINGS.metronomeVolume).toBe(1);
    expect(sanitise({ ...DEFAULT_SETTINGS, metronomeVolume: 3 }).metronomeVolume).toBe(1);
    expect(sanitise({ ...DEFAULT_SETTINGS, metronomeVolume: -1 }).metronomeVolume).toBe(0);
    expect(sanitise({ ...DEFAULT_SETTINGS, metronomeVolume: 0.4 }).metronomeVolume).toBe(0.4);
  });

  /*
   * The one that matters, and the reason this does not simply use `clamp`.
   * Every other clamped setting answers an unreadable value with its minimum;
   * here the minimum is silence, and a player cannot tell a silent metronome
   * from a broken one. A corrupt value must come back loud.
   */
  it('comes back loud from a value nobody can read, never silent', () => {
    expect(sanitise({ ...DEFAULT_SETTINGS, metronomeVolume: Number.NaN }).metronomeVolume).toBe(1);
    expect(
      sanitise({ ...DEFAULT_SETTINGS, metronomeVolume: undefined as unknown as number })
        .metronomeVolume,
    ).toBe(1);
  });

  it('is full for a settings file that predates it', () => {
    store({ tempo: 90 });
    expect(loadSettings().metronomeVolume).toBe(1);
  });
});

describe('the cushion', () => {
  it('sits at half the instrument by default, and is held between silent and as loud', () => {
    expect(DEFAULT_SETTINGS.cushionLevel).toBe(0.5);
    expect(sanitise({ ...DEFAULT_SETTINGS, cushionLevel: 3 }).cushionLevel).toBe(1);
    expect(sanitise({ ...DEFAULT_SETTINGS, cushionLevel: -1 }).cushionLevel).toBe(0);
    expect(sanitise({ ...DEFAULT_SETTINGS, cushionLevel: Number.NaN }).cushionLevel).toBe(0);
    expect(sanitise({ ...DEFAULT_SETTINGS, cushionLevel: 0.25 }).cushionLevel).toBe(0.25);
  });

  it('is half for a settings file that predates it', () => {
    store({ tempo: 90 });
    expect(loadSettings().cushionLevel).toBe(0.5);
  });
});

describe('picked tunes', () => {
  /* The default key set is [-3], so a step in E flat is one every filter
     below lets through — what each test then varies is the thing it is about. */
  const step = (id: string, fifths = -3) => ({ id, fifths });

  it('keeps only steps whose tune the chosen collections hold', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      collectionIds: ['bach'],
      selection: 'defined',
      themeSteps: [step('jesu-joy'), step('trad-twinkle'), step('retired-tune')],
    });
    expect(settings.themeSteps).toEqual([step('jesu-joy')]);
  });

  /* A playlist is ordered and may repeat: both are the player's decision, and
     a sanitiser that tidied either away would be overruling them. */
  it('keeps order and duplicates', () => {
    /* Two tunes the corpus can currently hand a player, rather than two named
       ones: a named tune goes back to being unheard the moment it changes, and
       the sanitiser is right to drop it — which broke this test rather than the
       code, twice. */
    const heard = COLLECTIONS.flatMap((collection) => [...playableThemes(collection)]);
    const steps = [step(heard[0].id), step(heard[1].id), step(heard[0].id)];
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      collectionIds: [...new Set(COLLECTIONS.filter((c) => playableThemes(c).length).map((c) => c.id))],
      selection: 'defined',
      themeSteps: steps,
    });
    expect(settings.themeSteps).toEqual(steps);
  });

  it('draws from every chosen collection at once', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      collectionIds: ['bach', 'traditional'],
      selection: 'defined',
      themeSteps: [step('jesu-joy'), step('trad-twinkle')],
    });
    expect(settings.themeSteps).toEqual([step('jesu-joy'), step('trad-twinkle')]);
  });

  it('drops every pick when the collections go', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      collectionIds: [],
      selection: 'defined',
      themeSteps: [step('jesu-joy')],
    });
    expect(settings.themeSteps).toEqual([]);
    // And a defined run with nothing in it is a medley in all but name.
    expect(settings.selection).toBe('medley');
  });

  /* Steps live and die with their keys, exactly as picks live and die with
     their collections: the picker offers only nominated keys, so a key
     deselected takes its steps with it. */
  it('drops a step whose key has left the set', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      collectionIds: ['bach'],
      keySet: [0, 1],
      selection: 'defined',
      themeSteps: [step('jesu-joy', 0), step('jesu-joy', -3), step('jesu-joy', 1)],
    });
    expect(settings.themeSteps).toEqual([step('jesu-joy', 0), step('jesu-joy', 1)]);
  });

  /* A step built on one instrument can name a placement another does not
     have: Invention 13 spans thirty semitones and fits a cornet in exactly
     one key, which is the fact that forced steps to carry keys at all. */
  it('drops a step the instrument cannot hold in that key', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      instrumentId: 'cornet',
      collectionIds: ['bach'],
      keySet: [0, 1],
      selection: 'defined',
      themeSteps: [step('bwv784-invention', 0), step('bwv784-invention', 1)],
    });
    expect(settings.themeSteps).toEqual([step('bwv784-invention', 0)]);
  });

  /* A settings file from before steps carried keys holds `themeIds`; each
     becomes a step in the opening key, which is where the old tour began. */
  it('migrates a stored themeIds list to steps in the opening key', () => {
    store({
      collectionIds: ['bach'],
      selection: 'defined',
      themeIds: ['jesu-joy', 'jesu-joy'],
    });
    const settings = loadSettings();
    expect(settings.themeSteps).toEqual([step('jesu-joy'), step('jesu-joy')]);
    expect(settings.selection).toBe('defined');
  });

  it('forgets a collection that no longer exists', () => {
    const settings = sanitise({
      ...DEFAULT_SETTINGS,
      collectionIds: ['bach', 'retired-collection'],
    });
    expect(settings.collectionIds).toEqual(['bach']);
  });

  it('composes by default', () => {
    expect(DEFAULT_SETTINGS.collectionIds).toEqual([]);
    expect(DEFAULT_SETTINGS.selection).toBe('medley');
  });
});

/**
 * The seam the player found on 2026-08-28: brassmaster.net serves a whole
 * German landing page at `/de/`, and its call to action dropped the reader
 * into an English app. Nothing was lost in transit — the two halves of the
 * site had never been joined, and no amount of pack coverage would have
 * joined them. `site.mjs` writes `?lang=` into the translated pages' links;
 * these are the rules for reading it.
 */
describe('the language a visitor arrives in', () => {
  const at = (search: string) => {
    // happy-dom keeps `location.search` writable through the URL.
    window.history.replaceState({}, '', `/app/${search}`);
  };

  afterEach(() => at(''));

  it('takes the language the landing page sent, on a first visit', () => {
    at('?lang=de');
    expect(loadSettings().locale).toBe('de');
  });

  it('lets that outrank a choice made on an earlier visit', () => {
    /*
     * Freshness, not stubbornness: following a link from a page written in
     * one language is the most recent thing the visitor has said about which
     * language they want, and it is said by pressing a button.
     */
    store({ locale: 'en', tempo: 96 });
    at('?lang=fr');
    expect(loadSettings().locale).toBe('fr');
  });

  it('ignores a language it has no pack for, rather than blanking the app', () => {
    store({ locale: 'de' });
    at('?lang=eo');
    expect(loadSettings().locale).toBe('de');
  });

  it('keeps a returning player’s language when the URL says nothing', () => {
    store({ locale: 'nl' });
    expect(loadSettings().locale).toBe('nl');
  });

  it('leaves a settings file written before locales existed in English', () => {
    /*
     * The browser gets a vote only on a genuine first run. Somebody who has
     * used the app in English for weeks and updates it should not find it in
     * German because their phone is set to `de-AT` — weeks of use is a choice
     * too, and this is the app overruling them if it fires here.
     */
    store({ tempo: 96 });
    expect(loadSettings().locale).toBe('en');
  });
});
