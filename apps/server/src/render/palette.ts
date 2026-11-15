import type { DashboardTheme } from '@inked/commons';

import type { Palette } from './types.js';

export function getPalette(theme: DashboardTheme): Palette {
  const accents = {
    citrus: ['#e0c341', '#241d02'],
    coral: ['#ef6a52', '#2a0f09'],
    cobalt: ['#3f61e8', '#ffffff']
  } as const;
  const backgrounds = {
    paper: {
      page: '#e9e8e1',
      card: '#fbfaf4',
      cardAlt: '#dce4d4',
      ink: '#18211c',
      muted: '#667068',
      line: '#ccd0c9',
      up: '#1b7f3b',
      down: '#c8372d'
    },
    mist: {
      page: '#dce4e7',
      card: '#f5f8f6',
      cardAlt: '#cbd9de',
      ink: '#142127',
      muted: '#607078',
      line: '#becacd',
      up: '#1b7f3b',
      down: '#c8372d'
    },
    night: {
      page: '#111714',
      card: '#1d2621',
      cardAlt: '#26332c',
      ink: '#f4f5ec',
      muted: '#a9b5ab',
      line: '#3a463f',
      up: '#58c27d',
      down: '#ff7b6b'
    }
  } as const;
  const base = backgrounds[theme.background];
  const [accent, accentInk] = accents[theme.accent];
  return { ...base, accent, accentInk };
}
