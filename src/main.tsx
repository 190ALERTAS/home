import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource/barlow/latin-400.css';
import '@fontsource/barlow/latin-500.css';
import '@fontsource/barlow/latin-600.css';
import '@fontsource/barlow/latin-700.css';
import '@fontsource/barlow-condensed/latin-600.css';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';

import { normalizeInitialUrl } from './lib/router';
import { cleanupLegacyServiceWorker } from './lib/pwa';
import { App } from './app/App';

normalizeInitialUrl();
void cleanupLegacyServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
document.documentElement.setAttribute('data-app', 'ok');
