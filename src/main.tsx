import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/app.css';
import './styles/print.css';
import { hydrate, startSync } from './state/store';
import { App } from './ui/App';

hydrate();
startSync();

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
