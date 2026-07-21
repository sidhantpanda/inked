import { createRequire } from 'node:module';

import { GlobalFonts } from '@napi-rs/canvas';

export const INKED_FONT_FAMILIES = {
  sans: 'Inked Sans',
  serif: 'Inked Serif'
} as const;

const require = createRequire(import.meta.url);

export const INKED_FONT_PATHS = {
  sans: require.resolve('@inked/commons/fonts/inter/Inter.ttf'),
  serif: require.resolve('@inked/commons/fonts/libre-baskerville/LibreBaskerville.ttf')
} as const;

export function ensureInkedFontsRegistered() {
  for (const family of Object.keys(INKED_FONT_FAMILIES) as (keyof typeof INKED_FONT_FAMILIES)[]) {
    const alias = INKED_FONT_FAMILIES[family];
    if (GlobalFonts.has(alias)) continue;
    const registration = GlobalFonts.registerFromPath(INKED_FONT_PATHS[family], alias);
    if (!registration) {
      throw new Error(`Could not register bundled font ${alias} from ${INKED_FONT_PATHS[family]}`);
    }
  }
}

ensureInkedFontsRegistered();
