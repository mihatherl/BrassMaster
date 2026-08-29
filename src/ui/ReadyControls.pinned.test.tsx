// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ReadyControls } from './ReadyControls';
import { DEFAULT_SETTINGS } from '../storage/settings';

afterEach(cleanup);

describe('gate options a course has pinned', () => {
  it('shows them disabled with a note, rather than hiding them', () => {
    render(
      <ReadyControls
        settings={DEFAULT_SETTINGS}
        onChange={vi.fn()}
        pinned={['metronomeEnabled']}
      />,
    );
    expect(
      (screen.getByRole('checkbox', { name: 'Metronome' }) as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      (screen.getByRole('checkbox', { name: 'Conductor' }) as HTMLInputElement).disabled,
    ).toBe(false);
    expect(screen.getByText(/set by the course/i)).toBeTruthy();
  });

  it('pins nothing when no course is speaking', () => {
    render(<ReadyControls settings={DEFAULT_SETTINGS} onChange={vi.fn()} />);
    expect(
      (screen.getByRole('checkbox', { name: 'Metronome' }) as HTMLInputElement).disabled,
    ).toBe(false);
    expect(screen.queryByText(/set by the course/i)).toBeNull();
  });
});

describe('the values a course put in force', () => {
  /*
   * A pinned control shows the COURSE'S value, not the player's own value
   * merely disabled — until the axes build (2026-08-29) it showed the
   * player's, which was a legible falsehood: the gate said the metronome was
   * on while the session ran without it.
   */
  it('displays the course’s value on a pinned control', () => {
    render(
      <ReadyControls
        settings={{ ...DEFAULT_SETTINGS, metronomeEnabled: true, tempo: 120 }}
        onChange={vi.fn()}
        pinned={['metronomeEnabled', 'tempo']}
        inForce={{ metronomeEnabled: false, tempo: 66 }}
      />,
    );
    expect(
      (screen.getByRole('checkbox', { name: 'Metronome' }) as HTMLInputElement).checked,
    ).toBe(false);
    // The tempo dial is the first slider on the face; the volume and feel
    // sliders follow it.
    expect((screen.getAllByRole('slider')[0] as HTMLInputElement).value).toBe('66');
  });

  it('locks the newly pinnable settings too, each saying who chose', () => {
    render(
      <ReadyControls
        settings={DEFAULT_SETTINGS}
        onChange={vi.fn()}
        pinned={['fingerings', 'playbackMode', 'readingMode']}
        inForce={{ fingerings: 'never', playbackMode: 'off', readingMode: 'paged' }}
      />,
    );
    // Every card in the three pinned sections is disabled; the beat switches are not.
    for (const name of [/read the page/i, /scrolling line/i]) {
      expect((screen.getByRole('button', { name }) as HTMLButtonElement).disabled).toBe(true);
    }
    expect(
      (screen.getByRole('checkbox', { name: 'Metronome' }) as HTMLInputElement).disabled,
    ).toBe(false);
    expect(screen.getAllByText(/set by the course/i).length).toBeGreaterThanOrEqual(3);
  });

  it('leaves the tempo dial live where the course named no tempo', () => {
    render(
      <ReadyControls
        settings={{ ...DEFAULT_SETTINGS, tempo: 96 }}
        onChange={vi.fn()}
        pinned={['metronomeEnabled']}
        inForce={{ metronomeEnabled: true }}
      />,
    );
    const dial = screen.getAllByRole('slider')[0] as HTMLInputElement;
    expect(dial.disabled).toBe(false);
    expect(dial.value).toBe('96');
  });
});
