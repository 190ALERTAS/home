import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '@fontsource/ibm-plex-mono/latin-600.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

import { normalizeInitialUrl } from './lib/router';
import { cleanupLegacyServiceWorker } from './lib/pwa';
import { App } from './app/App';

normalizeInitialUrl();
void cleanupLegacyServiceWorker();

// iPhone/iPad ignoram "user-scalable=no": bloqueia o gesto de pinça do Safari.
// (O croqui e o mapa tratam o próprio zoom com eventos de ponteiro, sem depender disto.)
for (const evento of ['gesturestart', 'gesturechange']) {
  document.addEventListener(evento, (e) => e.preventDefault(), { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
document.documentElement.setAttribute('data-app', 'ok');
