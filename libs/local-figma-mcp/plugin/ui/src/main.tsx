import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { logExportError } from '../../src/exportError.js';
import { App } from './App';
import './index.css';

window.addEventListener('unhandledrejection', (event) => {
  logExportError('ui/unhandledRejection', event.reason);
});

window.addEventListener('error', (event) => {
  logExportError('ui/uncaughtError', event.error ?? event.message);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
