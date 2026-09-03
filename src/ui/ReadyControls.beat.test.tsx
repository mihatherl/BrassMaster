// @vitest-environment happy-dom

/**
 * The beat-shading checkbox (the player's option, 2026-09-03): one box in
 * the gate's beat section, two memories behind it — rhythm mode's own,
 * on until turned off, and everyone else's, off until asked. The tests
 * pin that the box reads and writes the memory for the run's own kind
 * and never the other's.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ReadyControls } from './ReadyControls';
import { DEFAULT_SETTINGS, type Settings } from '../storage/settings';

afterEach(cleanup);

const open = (settings: Settings) => {
  const onChange = vi.fn();
  const utils = render(<ReadyControls settings={settings} onChange={onChange} />);
  return { ...utils, onChange };
};

describe('the beat shading at the gate', () => {
  it('opens shaded in rhythm mode, and its switch writes rhythm’s own memory', () => {
    const { getByLabelText, onChange } = open({ ...DEFAULT_SETTINGS, kind: 'rhythm' });
    const box = getByLabelText('Beat shading') as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ beatBandsRhythm: false, beatBands: false }),
    );
  });

  it('waits to be asked elsewhere, and never reaches into rhythm’s switch', () => {
    const { getByLabelText, onChange } = open({ ...DEFAULT_SETTINGS, kind: 'phrases' });
    const box = getByLabelText('Beat shading') as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ beatBands: true, beatBandsRhythm: true }),
    );
  });
});
