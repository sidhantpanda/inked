import { describe, expect, it } from 'vitest';

import { FONT_TEST_SIZES, renderFontTest } from './font-test.js';

describe('font test renderer', () => {
  it('defines at least nine increasing calibration sizes', () => {
    expect(FONT_TEST_SIZES.length).toBeGreaterThanOrEqual(9);
    expect([...FONT_TEST_SIZES]).toEqual([...FONT_TEST_SIZES].sort((left, right) => left - right));
    expect(new Set(FONT_TEST_SIZES).size).toBe(FONT_TEST_SIZES.length);
  });

  it('renders the calibration grid as an 800x480 BMP', async () => {
    const bmp = await renderFontTest('bmp');
    expect(bmp.subarray(0, 2).toString('ascii')).toBe('BM');
    expect(bmp.readInt32LE(18)).toBe(800);
    expect(Math.abs(bmp.readInt32LE(22))).toBe(480);
  });
});
