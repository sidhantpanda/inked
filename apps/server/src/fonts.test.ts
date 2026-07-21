import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { GlobalFonts } from '@napi-rs/canvas';
import { describe, expect, it } from 'vitest';

import { INKED_FONT_FAMILIES, INKED_FONT_PATHS, ensureInkedFontsRegistered } from './fonts.js';

const EXPECTED_FONT_HASHES = {
  sans: '29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031',
  serif: '05a95421961341c5b2556285e8415df9db27dab4f4abe22b446b3c6a8b916c5d'
} as const;

describe('bundled fonts', () => {
  it.each(Object.keys(INKED_FONT_PATHS) as (keyof typeof INKED_FONT_PATHS)[])(
    'ships the pinned $s font file',
    async (family) => {
      const font = await readFile(INKED_FONT_PATHS[family]);
      expect(createHash('sha256').update(font).digest('hex')).toBe(EXPECTED_FONT_HASHES[family]);
    }
  );

  it('registers stable native aliases without relying on system fonts', () => {
    ensureInkedFontsRegistered();
    expect(GlobalFonts.has(INKED_FONT_FAMILIES.sans)).toBe(true);
    expect(GlobalFonts.has(INKED_FONT_FAMILIES.serif)).toBe(true);
  });
});
