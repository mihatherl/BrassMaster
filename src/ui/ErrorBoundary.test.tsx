// @vitest-environment happy-dom

/*
 * The boundary exists so a fault is reportable. These check the two things
 * that makes true: it shows the message, and it does not take the app down
 * with it.
 */

import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

function Boom({ throws }: { throws: boolean }) {
  if (throws) throw new Error('ctx.roundRect is not a function');
  return <p>the app</p>;
}

afterEach(() => vi.restoreAllMocks());

describe('when a screen throws', () => {
  it('shows the message rather than a white screen', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom throws />
      </ErrorBoundary>,
    );
    /* The real fault this was written for, quoted back: a player who can read
       this line to somebody has reported the bug. */
    expect(screen.getByText(/ctx\.roundRect is not a function/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /back to settings/i })).toBeTruthy();
  });

  it('stays out of the way when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Boom throws={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('the app')).toBeTruthy();
  });
});
