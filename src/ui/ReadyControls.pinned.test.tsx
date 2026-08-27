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
