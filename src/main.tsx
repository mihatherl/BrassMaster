import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './ui/App';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { keepUpToDate } from './update';

keepUpToDate();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outermost, so nothing can take the screen away without saying why.
        See ErrorBoundary — a white screen is not a failure mode anyone can
        report, and this app is read on phones with no devtools attached. */}
    <ErrorBoundary onReset={() => window.location.reload()}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
