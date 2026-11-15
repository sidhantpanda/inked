import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { FontTestPage } from './font-test/FontTestPage';
import { WidgetsPage } from './gallery/WidgetsPage';
import { StudioPage } from './studio/StudioPage';
import './styles.css';

const path = window.location.pathname;
const page = path.startsWith('/font-test') ? (
  <FontTestPage />
) : path.startsWith('/widgets') ? (
  <WidgetsPage />
) : (
  <StudioPage />
);

document.title = path.startsWith('/font-test')
  ? 'Font test · Inked'
  : path.startsWith('/widgets')
    ? 'Widget gallery · Inked'
    : 'Inked · Display studio';

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>);
