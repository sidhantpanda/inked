import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { WIDGET_RENDERERS } from '../../render.js';

const WIDGETS_DIR = import.meta.dirname;
const MAX_LINES = 200;

const widgetDirs = readdirSync(WIDGETS_DIR).filter((entry) =>
  statSync(path.join(WIDGETS_DIR, entry)).isDirectory()
);

function sourceFiles(dir: string) {
  return readdirSync(dir).filter((file) => file.endsWith('.ts') && !file.endsWith('.test.ts'));
}

/** Enforces the shared widget directory pattern documented in README.md. */
describe('native widget renderer layout', () => {
  it.each(widgetDirs)('%s exposes only its draw entry through index.ts', (widget) => {
    const dir = path.join(WIDGETS_DIR, widget);
    const files = sourceFiles(dir);
    expect(files).toContain('index.ts');
    expect(files).toContain('draw.ts');
    expect(readFileSync(path.join(dir, 'index.ts'), 'utf8')).toMatch(
      /^export \{ draw[A-Z]\w* \} from '\.\/draw\.js';\n$/
    );
  });

  it.each(widgetDirs)('%s keeps every file under the line budget', (widget) => {
    const dir = path.join(WIDGETS_DIR, widget);
    for (const file of sourceFiles(dir)) {
      const lines = readFileSync(path.join(dir, file), 'utf8').trimEnd().split('\n').length;
      expect(lines, `${widget}/${file}`).toBeLessThanOrEqual(MAX_LINES);
    }
  });

  it.each(widgetDirs)('%s never imports another widget', (widget) => {
    const dir = path.join(WIDGETS_DIR, widget);
    for (const file of sourceFiles(dir)) {
      const source = readFileSync(path.join(dir, file), 'utf8');
      const crossWidget = [...source.matchAll(/from '\.\.\/([\w-]+)\//g)].map((match) => match[1]);
      expect(crossWidget, `${widget}/${file}`).toEqual([]);
    }
  });

  it('registers exactly one renderer per widget directory', async () => {
    const entries = await Promise.all(
      widgetDirs.map(
        async (widget) =>
          Object.values(
            (await import(path.join(WIDGETS_DIR, widget, 'index.js'))) as Record<string, unknown>
          )[0]
      )
    );
    expect(new Set(entries)).toEqual(new Set(Object.values(WIDGET_RENDERERS)));
  });
});
