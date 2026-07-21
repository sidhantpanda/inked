import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { METEOCON_ICON_NAMES } from '@inked/commons';
import { loadImage, type Image } from '@napi-rs/canvas';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);

/** Rasterization width; icons are square and never drawn larger than this. */
const RENDER_WIDTH = 192;

/**
 * Meteocons use `<symbol>`/`<use>` and gradients that @napi-rs/canvas cannot
 * rasterize directly, so each icon is rendered to a PNG with resvg once and
 * cached as a canvas Image. Call `ensureMeteocons()` before the first render.
 */
const icons = new Map<string, Image>();
let loadPromise: Promise<void> | null = null;

async function loadAll(): Promise<void> {
  await Promise.all(
    METEOCON_ICON_NAMES.map(async (name) => {
      try {
        const path = require.resolve(`@inked/commons/icons/meteocons/${name}.svg`);
        const svg = readFileSync(path, 'utf8');
        const png = new Resvg(svg, { fitTo: { mode: 'width', value: RENDER_WIDTH } })
          .render()
          .asPng();
        icons.set(name, await loadImage(png));
      } catch {
        // A missing icon falls back to a drawn glyph in the renderer.
      }
    })
  );
}

/** Loads and caches every bundled icon. Idempotent; safe to await repeatedly. */
export function ensureMeteocons(): Promise<void> {
  loadPromise ??= loadAll();
  return loadPromise;
}

export function getMeteocon(name: string): Image | null {
  return icons.get(name) ?? null;
}
