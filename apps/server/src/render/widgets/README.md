# Native widget renderers

Each widget's canvas renderer lives in its own directory with the same shape:

```text
widgets/<widget>/
  index.ts      Public surface: re-exports only the entry renderer.
  draw.ts       Entry renderer `draw<Widget>`: header, layout decision, delegation.
  <part>.ts     Optional pieces, named for what they draw (e.g. `forecast.ts`, `rows.ts`).
```

Rules:

- `index.ts` contains exactly `export { draw<Widget> } from './draw.js';`. Code outside the
  directory imports only from `index.ts`; part files are private to the widget.
- `draw.ts` exports the entry renderer, typed as `CanvasWidgetRenderer<K>` by its registration
  in `WIDGET_RENDERERS` (`src/render.ts`). Keep it to orchestration; move sizable sub-layouts
  into part files.
- Part files may import from each other and from the shared modules one level up:
  `../../text.js` (typography and text fitting), `../../primitives.js` (labels, lines, cards,
  dates), and `../../types.js` (`Rect`, `Palette`). Widgets never import from other widgets;
  promote shared helpers to those modules instead.
- Keep every file under 200 lines; split by what is drawn when one grows past that.

To add a widget: create the directory following this shape, then register its entry renderer in
`WIDGET_RENDERERS`. `structure.test.ts` enforces these rules.
