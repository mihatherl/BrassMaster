/*
 * What the player sees when something throws.
 *
 * Until 2026-08-22 the answer was **a white screen and a reload**, and it cost
 * a real diagnosis: on a Motorola E32 the notation renderer called
 * `ctx.roundRect`, which that phone's WebView does not have, and the app
 * vanished. Nothing said what had happened, nothing offered a way back, and
 * the same fault looked like three unrelated bugs — frozen notation with the
 * metronome still going, a paged view that drew nothing, and a blank screen on
 * pressing Stop.
 *
 * So this is not decoration. It is the difference between a bug report that
 * says "it went white" and one that carries the message and the line.
 *
 * **It deliberately does not try to recover the screen it crashed on.** A
 * render that threw once will usually throw again, and a retry loop is a worse
 * experience than an honest stop. Settings is always reachable, because
 * settings is where every route starts.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Sends the player somewhere that works, without losing the whole session. */
  onReset?: () => void;
}

interface State {
  message: string | null;
  where: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null, where: null };

  static getDerivedStateFromError(error: unknown): State {
    return {
      message: error instanceof Error ? error.message : String(error),
      /* The first frame of the stack, which on a phone is the only part
         anybody can read out loud — and is usually the whole answer. */
      where:
        error instanceof Error && error.stack
          ? (error.stack.split('\n')[1] ?? '').trim().slice(0, 120)
          : null,
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // The console is still worth writing to: a desktop has devtools, and a
    // phone attached to one over USB does too.
    console.error('Brass Master stopped:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.message === null) return this.props.children;

    return (
      <div className="screen error-screen">
        <h1>Something broke</h1>
        <p>
          The app stopped rather than showing you something wrong. This is a
          fault worth reporting — the message below is the useful part.
        </p>
        <pre className="error-screen__message">{this.state.message}</pre>
        {this.state.where ? <pre className="error-screen__where">{this.state.where}</pre> : null}
        <p className="error-screen__version">
          version {__APP_VERSION__} · built {__BUILD_TIME__}
        </p>
        <button
          type="button"
          onClick={() => {
            this.setState({ message: null, where: null });
            this.props.onReset?.();
          }}
        >
          Back to settings
        </button>
      </div>
    );
  }
}
