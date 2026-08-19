import { fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';

/**
 * Renders the app and lands on the settings screen, whichever build this is.
 *
 * The paid build opens on a choice of two doors and the free build opens on
 * the settings screen, so a test that wants the controls has to say which door
 * it means. Doing it here rather than in thirty tests keeps them about what
 * they are testing, and means the front door can change again without another
 * sweep through the suite.
 *
 * `queryByRole` rather than `getByRole` on purpose: in the free build there is
 * no chooser to click past, and this must work unchanged in both.
 */
export function renderApp(): ReturnType<typeof render> {
  const result = render(<App />);
  const freePlay = screen.queryByRole('button', { name: /free play/i });
  if (freePlay) fireEvent.click(freePlay);
  return result;
}
