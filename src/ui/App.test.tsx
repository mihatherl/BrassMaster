// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { renderApp } from './render-app';

/**
 * An end-to-end check that the app mounts and the screens wire together.
 *
 * It stops at the "Tap to start" gate — everything past that needs a real
 * AudioContext — but it covers the parts a unit test cannot: that settings
 * changes reach the generator, that starting builds a playable exercise, and
 * that instrument and clef stay consistent with one another.
 */

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('the app', () => {
  it('opens on the settings screen', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /brass master/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('starts an exercise and shows the valve pad', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    // The audio gate comes first, since browsers will not start sound without
    // a gesture.
    expect(screen.getByRole('button', { name: /tap to start/i })).toBeTruthy();
  });

  /** The chip wears the current instrument's name; clicking it opens the sheet. */
  const openInstrument = () => fireEvent.click(screen.getByRole('button', { name: /Tuba|Cornet|Horn|Baritone|Euphonium|Trombone|Bass/ }));

  it('offers bass clef only for the instruments that read it', () => {
    renderApp();
    openInstrument();
    const instrument = screen.getByLabelText<HTMLSelectElement>('Instrument');

    fireEvent.change(instrument, { target: { value: 'cornet' } });
    // The one button left is the whole explanation; there used to be a line of
    // prose beside it saying so, which said nothing the control did not.
    expect(screen.queryByRole('button', { name: 'Bass' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Treble' })).toBeTruthy();

    fireEvent.change(instrument, { target: { value: 'euphonium' } });
    expect(screen.getByRole('button', { name: 'Bass' })).toBeTruthy();
  });

  it('shows a written range that follows the instrument and clef', () => {
    renderApp();
    openInstrument();
    const instrument = screen.getByLabelText<HTMLSelectElement>('Instrument');

    fireEvent.change(instrument, { target: { value: 'cornet' } });
    const cornetRange = screen.getByText(/^Written range/).textContent;

    fireEvent.change(instrument, { target: { value: 'eb-bass' } });
    const ebBassRange = screen.getByText(/^Written range/).textContent;

    // Both read treble clef, but their written compasses differ.
    expect(cornetRange).not.toEqual(ebBassRange);

    fireEvent.click(screen.getByRole('button', { name: 'Bass' }));
    const bassClefRange = screen.getByText(/^Written range/).textContent;
    expect(bassClefRange).toContain('concert pitch');
    expect(bassClefRange).not.toEqual(ebBassRange);
  });

  it('remembers settings across a reload', () => {
    const first = renderApp();
    openInstrument();
    fireEvent.change(screen.getByLabelText<HTMLSelectElement>('Instrument'), {
      target: { value: 'cornet' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Hard' }));
    first.unmount();

    renderApp();
    openInstrument();
    expect(screen.getByLabelText<HTMLSelectElement>('Instrument').value).toBe('cornet');
    expect(screen.getByRole('button', { name: 'Hard' }).className).toContain('is-selected');
  });

  it('starts with every section shut, every time', () => {
    /*
     * The screen is long and collapsing it is the point. What is set shows on
     * each shut section's summary line, so arriving at a screen of headings
     * loses nothing — and coming back from a run no longer means arriving at
     * whatever happened to be open when you left, which was usually all of it.
     */
    renderApp();
    // No accordion wrapper is left on the home at all (2026-08-23 evening):
    // the material boxes sit at the top level, and exactly one — the chosen
    // material — stands open. That box is the whole answer to "what is set".
    expect(document.querySelectorAll('details.panel')).toHaveLength(0);
    expect(document.querySelectorAll('.mode.is-open')).toHaveLength(1);
  });

  it('says what is selected in each collapsed section', () => {
    renderApp();
    // Everything announces itself in place now: the instrument on the chip,
    // the material as the open box, and how-the-run-goes on the Ready gate's
    // own lines (asserted with the gate's tests).
    expect(screen.getByRole('button', { name: 'Eb Bass · Treble' })).toBeTruthy();
    expect(document.querySelector('.mode.is-open strong')?.textContent).toBe('Sight-reading');
  });

  it('keeps the tempo on the Ready gate, where the run it sets is about to start', () => {
    /*
     * The tempo's third home, and the test pins whichever stands. Beside
     * Start from 2026-08-12 (reached every time, must not be two taps down);
     * into the Playing panel on 2026-08-23 morning (the strip was burying
     * the list on a 360-wide phone); onto the Ready gate the same day, when
     * the panel itself dissolved there — the gate is a stop every run
     * already makes, so the tempo is one glance away at the exact moment it
     * matters, and the home screen never mentions it.
     */
    renderApp();
    expect(screen.queryByLabelText(/^Tempo/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    const tempo = screen.getByLabelText(/^Tempo/);
    expect(tempo.closest('.ready-controls')).not.toBeNull();
    // Its fourth move (2026-08-23 evening): out of the gate's accordion onto
    // the face, directly under Start — every other setting is occasional, the
    // tempo is every session.
    expect(tempo.closest('details.panel')).toBeNull();
  });

  it('hides the scroll speed in the mode where it does nothing', () => {
    // Paged reading engraves the music standing still; `layout` returns before
    // the speed is read. A slider that moves nothing is worse than no slider.
    // Both controls live on the Ready gate now — the mode on its face, the
    // speed behind its cog.
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByText('Preferences'));
    expect(screen.getByLabelText(/^Scroll speed/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Read the page/ }));
    expect(screen.queryByLabelText(/^Scroll speed/)).toBeNull();
  });

  it('offers the cushion behind the gate cog, and keeps what is set there', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByText('Preferences'));
    const slider = screen.getByLabelText<HTMLInputElement>(/^Cushion/);
    expect(slider.value).toBe('50');
    fireEvent.change(slider, { target: { value: '25' } });
    expect(screen.getByLabelText<HTMLInputElement>(/^Cushion/).value).toBe('25');
    // The gate writes the same store the settings screen always did: no
    // defaults-and-overrides, one tier, and it sticks for next time.
    expect(JSON.parse(localStorage.getItem('brass-trainer:settings')!).cushionLevel).toBe(0.25);
  });

  it('relabels keys and difficulties as the drill changes', () => {
    /*
     * These assertions used to run through the Exercise panel's summary line;
     * the panel is gone (2026-08-23 evening) and the behaviours it witnessed
     * are asserted on the controls themselves, which is where a player reads
     * them anyway.
     */
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Drills/ }));

    // Choosing drills relabels the difficulty buttons by how far the pattern
    // reaches, so "Hard" is no longer called Hard.
    expect(screen.queryByRole('button', { name: 'Hard' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '2 oct · mixed' }));

    /*
     * A minor drill is chosen the way a book prints it — C minor, not E flat
     * major with the relative minor — so the keys relabel to the minors. The
     * signature underneath is the same three flats.
     */
    fireEvent.click(screen.getByRole('button', { name: 'Harmonic minor scale' }));
    expect(screen.getByRole('button', { name: 'C minor, 3 flats' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Eb major, 3 flats' })).toBeNull();

    // And back to majors for a major drill.
    fireEvent.click(screen.getByRole('button', { name: 'Major scale' }));
    expect(screen.getByRole('button', { name: 'Eb major, 3 flats' })).toBeTruthy();
  });

  it('gives each material its own key and difficulty', () => {
    /*
     * Asked for on 2026-08-15: a player drilling scales in D at two octaves
     * and reading themes in B flat at Beginner should not have to reset both
     * every time they swap. Each box brings its own pair back with it.
     *
     * Witnessed in the store since the panel summary went (2026-08-23): the
     * pair is captured after each box is set up, and swapping must hand back
     * exactly the captured pair — which asserts the behaviour without naming
     * any difficulty id.
     */
    const pair = () => {
      const stored = JSON.parse(localStorage.getItem('brass-trainer:settings')!);
      return { keySet: stored.keySet, difficultyId: stored.difficultyId };
    };
    const first = renderApp();

    fireEvent.click(screen.getByRole('button', { name: /Drills/ }));
    fireEvent.click(screen.getByRole('button', { name: 'D major, 2 sharps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eb major, 3 flats' }));
    fireEvent.click(screen.getByRole('button', { name: '2 oct · mixed' }));
    const drillsPair = pair();

    // Themes carries the pair over the first time, and is then given its own.
    fireEvent.click(screen.getByRole('button', { name: /Themes/ }));
    expect(pair()).toEqual(drillsPair);
    fireEvent.click(screen.getByRole('button', { name: 'Bb major, 2 flats' }));
    fireEvent.click(screen.getByRole('button', { name: 'D major, 2 sharps' }));
    fireEvent.click(screen.getByRole('button', { name: 'Beginner' }));
    const themesPair = pair();
    expect(themesPair).not.toEqual(drillsPair);

    // Back to Drills: D and two octaves, exactly as left; and Themes keeps its own.
    fireEvent.click(screen.getByRole('button', { name: /Drills/ }));
    expect(pair()).toEqual(drillsPair);
    fireEvent.click(screen.getByRole('button', { name: /Themes/ }));
    expect(pair()).toEqual(themesPair);

    // And it survives a reload.
    first.unmount();
    renderApp();
    expect(pair()).toEqual(themesPair);
    fireEvent.click(screen.getByRole('button', { name: /Drills/ }));
    expect(pair()).toEqual(drillsPair);
  });

  it('keeps collapsed sections reachable to assistive technology and search', () => {
    // `<details>` keeps its contents in the document, which is why the controls
    // below are still found even while their section is shut.
    renderApp();
    // The chip reads out as what it is: the instrument in force.
    expect(screen.getByRole('button', { name: /Eb Bass · Treble/ })).toBeTruthy();
    // Inside the shut Exercise panel, but still in the document.
    expect(screen.getByText(/Favour notes I get wrong/)).toBeTruthy();
  });

  /**
   * One box per material, the open one being the material chosen.
   *
   * The point of the accordion is that a box shows only what applies to it: a
   * register is a question about where a scale sits, a range is a question about
   * the pool free material is drawn from, and neither means anything to the
   * other. Shown together they are noise, which is what the player asked to be
   * rid of.
   */
  /**
   * The Ready gate's face, laid out in pairs.
   *
   * The same questions the Playing panel used to carry — a reading mode,
   * sound on or off, two switches for what keeps time, fingerings — moved to
   * the gate on 2026-08-23, compacted: no blurbs, because the face must be
   * readable in the three seconds before a run.
   */
  describe('the ready screen', () => {
    const cardsIn = (label: string) => {
      // Each question is an accordion section now; the cards live in its body.
      const section = [...document.querySelectorAll('.ready-controls details.panel')].find(
        (panel) => panel.querySelector('.panel__title')?.textContent === label,
      );
      return [...(section?.querySelectorAll('.card strong') ?? [])].map((c) => c.textContent);
    };

    it('offers the fingering modes two up, with Every note on its own row', () => {
      renderApp();
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));

      // The two a player lives in share a row; the one chosen deliberately for
      // a piece never seen before takes the row below, which is where the odd
      // card of three lands anyway. Order is layout here, so it is pinned.
      expect(cardsIn('Fingerings')).toEqual(['Where I struggle', 'Never', 'Every note']);
      expect(document.querySelectorAll('.ready-controls .cards--two').length).toBe(3);
    });

    it('puts the two time-keepers on one line', () => {
      renderApp();
      fireEvent.click(screen.getByRole('button', { name: 'Start' }));

      const row = document.querySelector('.ready-controls .field-row');
      const labels = [...(row?.querySelectorAll('label span') ?? [])].map((s) => s.textContent);
      expect(labels).toEqual(['Metronome', 'Conductor']);
    });
  });

  describe('the material boxes', () => {
    const openBox = () => document.querySelector('.mode.is-open .mode__summary strong')?.textContent;
    const fieldsShown = () =>
      Array.from(document.querySelectorAll('.mode.is-open .mode__body .field__label')).map(
        (label) => label.textContent?.trim(),
      );
    const hasRange = () =>
      document.querySelectorAll('.mode.is-open .mode__body input[type=checkbox]').length > 0;

    const choose = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

    it('opens exactly one box, and it is the material chosen', () => {
      renderApp();

      expect(openBox(), 'the stored default').toBe('Sight-reading');
      expect(document.querySelectorAll('.mode__body')).toHaveLength(1);

      choose(/Themes/);
      expect(openBox()).toBe('Themes');
      expect(document.querySelectorAll('.mode__body'), 'the last one closed').toHaveLength(1);
    });

    it('will not close the open box, since an exercise has to be made of something', () => {
      renderApp();

      choose(/Drills/);
      expect(openBox()).toBe('Drills');
      // Pressing the open one again is not a way to choose nothing.
      choose(/Drills/);
      expect(openBox()).toBe('Drills');
    });

    it('shows a material only the settings that apply to it', () => {
      renderApp();

      // A drill is a shape played against a click, so it has no metre to choose
      // and no pool to be drawn from — it asks which shape, and where on the
      // horn to sit.
      choose(/Drills/);
      expect(fieldsShown()).toEqual(['Drill', 'Keys', 'Difficulty', 'Register']);
      expect(hasRange(), 'a drill is placed by its root').toBe(false);

      // Free material is the one thing drawn from a pool, so it is the one
      // thing that asks what the pool is.
      choose(/Sight-reading/);
      expect(fieldsShown()).toEqual(['Keys', 'Difficulty', 'Time signature']);
      expect(hasRange(), 'and it is the only one that asks').toBe(true);

      // A theme is written already: neither a register nor a range to ask
      // about. It does ask where the tunes come from — composed on the spot, or
      // one of the named collections — which is what the box *is*, so it leads
      // the way the drill does.
      choose(/Themes/);
      expect(fieldsShown()).toEqual(['Tunes from', 'Keys', 'Difficulty', 'Time signature']);
      expect(hasRange()).toBe(false);
    });

    it('says which box is open to anyone not looking at it', () => {
      renderApp();
      choose(/Themes/);

      const themes = screen.getByRole('button', { name: /Themes/ });
      const drills = screen.getByRole('button', { name: /Drills/ });
      // Both are true of it and neither implies the other: it is the pressed
      // one, and it is the expanded one.
      expect(themes.getAttribute('aria-pressed')).toBe('true');
      expect(themes.getAttribute('aria-expanded')).toBe('true');
      expect(drills.getAttribute('aria-pressed')).toBe('false');
      expect(drills.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('choosing keys', () => {
    /*
     * One control, not two. There used to be a dropdown naming the starting key
     * beside a grid naming the keys in play, which said the same thing twice —
     * `keySet[0]` is the starting key and always was.
     */
    const key = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name} major`) });

    /**
     * Three rows of five in a window two rows tall, so one row shows whole with
     * half a row above and below and the rest is a swipe away.
     *
     * The arrangement is the point, not decoration: five to a row is what puts
     * B flat, F, C, G and D — two flats to two sharps — in the middle row on
     * their own, which is where nearly all brass band reading lives. Change the
     * row length and that stops being true silently.
     */
    it('lays the keys out five to a row, with the common five in the middle', () => {
      renderApp();

      const rows = [...document.querySelectorAll('.keys__row')].map((row) =>
        [...row.querySelectorAll('.key__name')].map((name) => name.textContent),
      );

      expect(rows).toEqual([
        ['Cb', 'Gb', 'Db', 'Ab', 'Eb'],
        ['Bb', 'F', 'C', 'G', 'D'],
        ['A', 'E', 'B', 'F#', 'C#'],
      ]);
    });

    it('starts in the first key chosen, and says the whole route', () => {
      renderApp();

      // One key: no route to speak of, and none spoken.
      expect(screen.queryByText(/changing key as it goes/)).toBeNull();

      fireEvent.click(key('Bb'));
      fireEvent.click(key('F'));
      // Ordered for playing by closeness from the opening key, not by the order
      // they were tapped — but Eb still leads, because it was chosen first.
      // Said under the grid since the panel summary went (2026-08-23).
      expect(screen.getByText(/Eb → Bb → F/)).toBeTruthy();
    });

    it('will not let the last key be turned off', () => {
      // An exercise has to be in some key. With one chosen there is nothing to
      // deselect, which is the whole of the rule — no separate starting key to
      // protect, as there was when two controls had to be kept agreeing.
      renderApp();
      expect(key('Eb')).toHaveProperty('disabled', true);

      fireEvent.click(key('Bb'));
      expect(key('Eb')).toHaveProperty('disabled', false);
    });

    it('hands the start to the next key when the first is dropped', () => {
      renderApp();

      fireEvent.click(key('Bb'));
      fireEvent.click(key('Eb'));
      // Witnessed in the store since the panel summary went: the head of the
      // key set is the starting key, and always was.
      expect(JSON.parse(localStorage.getItem('brass-trainer:settings')!).keySet[0]).toBe(-2);
    });

    it('stops at four keys, and lets them be swapped', () => {
      // The cap is real: the scrolling header is sized for the widest key in
      // the set and holds that width for the whole exercise.
      renderApp();

      for (const name of ['Bb', 'F', 'Ab']) fireEvent.click(key(name));
      expect(key('C')).toHaveProperty('disabled', true);
      // What is already chosen can still be undone, which is how you change
      // your mind at the cap rather than being stuck.
      expect(key('Ab')).toHaveProperty('disabled', false);

      fireEvent.click(key('Ab'));
      expect(key('C')).toHaveProperty('disabled', false);
    });
  });

  it('lets the player back out of an exercise', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'Start' })).toBeTruthy();
  });

  it('generates an exercise for every instrument and clef it offers', () => {
    renderApp();
    // Coming back from a run remounts the screen, which closes the instrument
    // sheet and detaches the select — so both are (re)acquired per pass. The
    // chip is the one button whose name ends in the clef.
    const ensureSheet = () => {
      if (!screen.queryByText('Clef'))
        fireEvent.click(screen.getByRole('button', { name: / · (Treble|Bass)$/ }));
    };
    const instrumentSelect = () => {
      ensureSheet();
      return screen.getByLabelText<HTMLSelectElement>('Instrument');
    };
    const ids = [...instrumentSelect().options].map((option) => option.value);
    expect(ids.length).toBeGreaterThan(4);

    for (const id of ids) {
      fireEvent.change(instrumentSelect(), { target: { value: id } });

      const clefGroup = screen.getByText('Clef').parentElement!;
      const clefButtons = within(clefGroup).getAllByRole('button');

      for (let i = 0; i < clefButtons.length; i++) {
        // Re-query, since selecting a clef re-renders the group — and reopen
        // the sheet, since coming back from the run below closed it.
        ensureSheet();
        const buttons = within(screen.getByText('Clef').parentElement!).getAllByRole('button');
        fireEvent.click(buttons[i]);

        // Starting is what actually runs the generator; a throw would surface here.
        fireEvent.click(screen.getByRole('button', { name: 'Start' }));
        expect(
          screen.getByRole('button', { name: /tap to start/i }),
          `${id} failed to generate`,
        ).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      }
    }
  });
});

/**
 * The headphones screen: which output is in the ears, and how late it is.
 *
 * Only the list and the choice are driven here — the measurement itself runs a
 * click on a real AudioContext, which the suite has not got. What a unit test
 * cannot see is that the door in Advanced opens the screen, that a saved
 * output can be chosen and forgotten, and that the choice reads back on the
 * settings screen; that is what this covers.
 */
describe('headphones and speakers', () => {
  const stored = (outputs: unknown[], chosen: string | null) =>
    localStorage.setItem(
      'brass-trainer:settings',
      JSON.stringify({ audioOutputs: outputs, audioOutputId: chosen }),
    );

  it('says beside Start when a headset is in use, with the way back to the speaker', () => {
    // A headset left chosen after moving to the phone's speaker sends every
    // note early and nothing else says why — so it is said next to Start,
    // and one tap puts the speaker back in charge.
    stored([{ id: 'z', name: 'Zen Air', leadMs: 231, calibrations: 1 }], 'z');
    renderApp();
    expect(screen.getByText(/Sound brought forward 231 ms for Zen Air/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Using this device/ }));
    expect(screen.queryByText(/Sound brought forward/)).toBeNull();
    expect(JSON.parse(localStorage.getItem('brass-trainer:settings')!).audioOutputId).toBe('device');
    // The headset is still on the list for next time, beside the device itself.
    expect(JSON.parse(localStorage.getItem('brass-trainer:settings')!).audioOutputs).toHaveLength(2);
  });

  it('says nothing beside Start for the phone speaker', () => {
    renderApp();
    expect(screen.queryByText(/Sound brought forward/)).toBeNull();
  });

  /*
   * The same fact on the play screen, where a wrong profile actually hurts.
   *
   * A headset lead left in force on the phone's speaker shifted every sound a
   * quaver against the page, and the run screen gave no hint the app was
   * compensating for hardware nobody was wearing — it cost an evening's
   * diagnosis, twice, once in each direction. The note is also the one
   * signpost from a run to the calibration screen, which otherwise hides in
   * the advanced menu.
   */
  it('names the adjustment at the gate, and leads to where it was set', () => {
    stored([{ id: 'z', name: 'Zen Air', leadMs: 250, calibrations: 1 }], 'z');
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    // The gate's status line names the output and its lead in force…
    expect(screen.getByText(/Zen Air — sound brought forward 250 ms/)).toBeTruthy();
    // …and its link is the signpost to where it was measured.
    fireEvent.click(screen.getByRole('button', { name: 'Outputs' }));
    expect(screen.getByRole('heading', { name: 'Outputs' })).toBeTruthy();
  });

  it('says nothing during a run when no lead is in force', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.queryByText(/Sound brought forward/)).toBeNull();
  });

  it('says on the gate what is in use, with the door beside it', () => {
    stored([{ id: 'b', name: 'Bose', leadMs: 180, calibrations: 1 }], 'b');
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText(/Bose — sound brought forward 180 ms/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Outputs' }));
    expect(screen.getByRole('heading', { name: 'Outputs' })).toBeTruthy();
  });

  it('chooses the phone speaker by default, and lets an output be chosen and forgotten', () => {
    stored(
      [
        { id: 'b', name: 'Bose', leadMs: 180, calibrations: 1 },
        { id: 'z', name: 'Zen', leadMs: 260, calibrations: 1 },
      ],
      null,
    );
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    // The default speaker is unmeasured, so the gate's link says what needs
    // doing rather than where it happens.
    fireEvent.click(screen.getByRole('button', { name: 'Measure it' }));

    const speaker = screen.getByRole('button', { name: /^This device/ });
    const zen = screen.getByRole('button', { name: /^Zen/ });
    expect(speaker.getAttribute('aria-pressed')).toBe('true');
    expect(zen.getAttribute('aria-pressed')).toBe('false');
    expect(zen.textContent).toContain('260 ms');

    fireEvent.click(zen);
    expect(zen.getAttribute('aria-pressed')).toBe('true');
    expect(speaker.getAttribute('aria-pressed')).toBe('false');

    // Forgetting the one in use puts the device's own speaker back in charge.
    fireEvent.click(screen.getByRole('button', { name: 'Forget Zen' }));
    expect(screen.queryByRole('button', { name: /^Zen/ })).toBeNull();
    expect(
      screen.getByRole('button', { name: /^This device/ }).getAttribute('aria-pressed'),
    ).toBe('true');

    // And the way back lands on settings, with the change kept — read back on
    // the gate's status line, which is where the output now announces itself.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(screen.getByText(/This device.s speaker — not measured yet/)).toBeTruthy();
    // Bose and the device itself, which cannot be forgotten.
    expect(JSON.parse(localStorage.getItem('brass-trainer:settings')!).audioOutputs).toHaveLength(2);
  });
});

/*
 * Choosing which written music a run plays.
 *
 * The libraries are a multi-select and the playlist is an ordered thing with
 * repeats — both are easy to regress into the set-and-single they replaced,
 * and neither shows up in a screenshot.
 */
describe('choosing tunes', () => {
  const openThemes = () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /Themes/ }));
  };

  it('composes until a library is chosen, and says so', () => {
    openThemes();
    expect(screen.getByRole('button', { name: /^Composed/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    // No selection control at all: there is nothing yet to select from.
    expect(screen.queryByText('Selection')).toBeNull();
  });

  it('takes more than one library at once', () => {
    openThemes();
    fireEvent.click(screen.getByRole('button', { name: /^Bach/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Nursery/ }));
    // Order in storage is the order they were tapped; `sanitise` normalises it
    // to the corpus's own on the way back in, and nothing downstream reads it
    // either way — `themesOf` walks the corpus, not this list.
    const stored = JSON.parse(localStorage.getItem('brass-trainer:settings')!);
    expect([...stored.collectionIds].sort()).toEqual(['bach', 'traditional']);
    // And Composed lets go, since it is the state of having chosen none.
    expect(screen.getByRole('button', { name: /^Composed/ }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('builds a playlist that keeps its order and its repeats', () => {
    openThemes();
    fireEvent.click(screen.getByRole('button', { name: /^Bach/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Defined/ }));

    // The dialog lists what is available; tapping adds to the right column.
    const dialog = screen.getByRole('dialog');
    const add = (name: RegExp) =>
      fireEvent.click(within(dialog).getAllByRole('button', { name })[0]);
    add(/Invention 8/);
    add(/Jesu/);
    add(/Invention 8/);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    const stored = JSON.parse(localStorage.getItem('brass-trainer:settings')!);
    expect(stored.themeIds).toEqual(['bwv779-invention', 'jesu-joy', 'bwv779-invention']);
    expect(stored.selection).toBe('defined');
  });

  it('drops back to a medley when the last tune is taken out', () => {
    openThemes();
    fireEvent.click(screen.getByRole('button', { name: /^Bach/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Defined/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getAllByRole('button', { name: /Jesu/ })[0]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }));

    const stored = JSON.parse(localStorage.getItem('brass-trainer:settings')!);
    expect(stored.themeIds).toEqual([]);
    expect(stored.selection).toBe('medley');
  });

  it('forgets the playlist when its library is deselected', () => {
    openThemes();
    fireEvent.click(screen.getByRole('button', { name: /^Bach/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Defined/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getAllByRole('button', { name: /Jesu/ })[0]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Done' }));
    fireEvent.click(screen.getByRole('button', { name: /^Bach/ }));

    const stored = JSON.parse(localStorage.getItem('brass-trainer:settings')!);
    expect(stored.collectionIds).toEqual([]);
    expect(stored.themeIds).toEqual([]);
  });
});
